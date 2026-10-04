import { EntityManager, FilterQuery, QueryOrder } from '@mikro-orm/core';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HolidaySource } from '../attendance.constants';
import { ListHolidaysDto, SaveHolidayDto } from '../dtos/holiday.dto';
import { HolidayEntity } from '../entities/holiday.entity';
import {
  iranWeekday,
  jalaliMonthRange,
  jalaliToDate,
  tehranToday,
} from '../utils/attendance-time.util';

const DEFAULT_API_URL = 'https://pnldev.com/api/calender';

/**
 * Fixed-date official holidays. If the calendar service is unreachable at
 * least these get stored; lunar holidays move every year and only come from
 * the service (or are entered by hand).
 */
const FIXED_SOLAR: Array<[number, number, string]> = [
  [1, 1, 'عید نوروز'],
  [1, 2, 'عید نوروز'],
  [1, 3, 'عید نوروز'],
  [1, 4, 'عید نوروز'],
  [1, 12, 'روز جمهوری اسلامی'],
  [1, 13, 'روز طبیعت'],
  [3, 14, 'رحلت امام خمینی'],
  [3, 15, 'قیام ۱۵ خرداد'],
  [11, 22, 'پیروزی انقلاب اسلامی'],
  [12, 29, 'روز ملی شدن صنعت نفت'],
];

/** Occasions that are the reason for a holiday; the API sometimes lists another first. */
const HOLIDAY_KEYWORDS =
  /عید|تعطیل|نوروز|سیزده|طبیعت|جمهوری|خمینی|خرداد|انقلاب|نفت|تاسوعا|عاشورا|اربعین|شهادت|رحلت|ولادت|میلاد|مبعث|غدیر|قربان|فطر|نیمه شعبان|قائم/u;

const FRIDAY = 6;

interface HolidayItem {
  date: string;
  title: string;
}

export interface SyncResult {
  added: number;
  updated: number;
  source: 'api' | 'fallback';
  error: string | null;
}

@Injectable()
export class HolidayService {
  private readonly logger = new Logger(HolidayService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
  ) {}

  /** Active holidays in a range, keyed by civil date. */
  async between(from: string, to: string, em: EntityManager = this.em) {
    const holidays = await em.find(HolidayEntity, {
      active: true,
      date: { $gte: from, $lte: to },
    });
    return new Map(holidays.map((h) => [h.date, h]));
  }

  isHoliday(date: string) {
    return this.em.findOne(HolidayEntity, { active: true, date });
  }

  list(query: ListHolidaysDto) {
    if (query.upcoming) {
      return this.em.find(
        HolidayEntity,
        { active: true, date: { $gte: tehranToday() } },
        { orderBy: { date: QueryOrder.ASC }, limit: query.upcoming },
      );
    }

    const where: FilterQuery<HolidayEntity> = {};
    if (query.year) {
      const { from, to } = query.month
        ? jalaliMonthRange(query.year, query.month)
        : {
            from: jalaliMonthRange(query.year, 1).from,
            to: jalaliMonthRange(query.year, 12).to,
          };
      where.date = { $gte: from, $lte: to };
    }
    if (query.source) where.source = query.source;

    return this.em.find(HolidayEntity, where, {
      orderBy: { date: QueryOrder.ASC },
    });
  }

  async getOrFail(id: number) {
    const holiday = await this.em.findOne(HolidayEntity, { id });
    if (!holiday) throw new NotFoundException('تعطیلی یافت نشد');
    return holiday;
  }

  private async assertDateFree(date: string, exceptId?: number) {
    const clash = await this.em.findOne(HolidayEntity, {
      date,
      ...(exceptId ? { id: { $ne: exceptId } } : {}),
    });
    if (clash) {
      throw new ConflictException('برای این تاریخ قبلاً تعطیلی ثبت شده است');
    }
  }

  async create(dto: SaveHolidayDto) {
    await this.assertDateFree(dto.date);
    const holiday = this.em.create(HolidayEntity, {
      date: dto.date,
      title: dto.title,
      source: HolidaySource.MANUAL,
      active: dto.active ?? true,
    });
    await this.em.persistAndFlush(holiday);
    return holiday;
  }

  async update(id: number, dto: SaveHolidayDto) {
    const holiday = await this.getOrFail(id);
    await this.assertDateFree(dto.date, id);
    this.em.assign(holiday, {
      date: dto.date,
      title: dto.title,
      active: dto.active ?? holiday.active,
    });
    await this.em.flush();
    return holiday;
  }

  async toggle(id: number) {
    const holiday = await this.getOrFail(id);
    holiday.active = !holiday.active;
    await this.em.flush();
    return holiday;
  }

  /** Official holidays come back on the next sync, so only manual ones are deleted. */
  async remove(id: number) {
    const holiday = await this.getOrFail(id);
    if (holiday.source !== HolidaySource.MANUAL) {
      throw new ConflictException(
        'تعطیلات رسمی حذف نمی‌شوند؛ به جای حذف آن را غیرفعال کنید',
      );
    }
    await this.em.removeAndFlush(holiday);
  }

  // --- official calendar ------------------------------------------------------------

  /**
   * Fetch and store the official holidays of a Jalali year. Manual holidays
   * and the active flag of existing rows are left alone.
   */
  async syncOfficial(
    jalaliYear: number,
    em: EntityManager = this.em,
  ): Promise<SyncResult> {
    let items: HolidayItem[];
    let source: SyncResult['source'] = 'api';
    let error: string | null = null;

    try {
      items = await this.fetchFromApi(jalaliYear);
    } catch (e) {
      this.logger.warn(
        `دریافت تعطیلات ${jalaliYear} از سرویس تقویم ناموفق بود: ${e?.message}`,
      );
      items = this.fixedSolar(jalaliYear);
      source = 'fallback';
      error =
        'سرویس تقویم در دسترس نبود؛ فقط تعطیلات ثابت شمسی ثبت شد و تعطیلات قمری باید بعداً دریافت یا دستی ثبت شوند.';
    }

    let added = 0;
    let updated = 0;

    for (const item of items) {
      const existing = await em.findOne(HolidayEntity, { date: item.date });
      if (!existing) {
        em.persist(
          em.create(HolidayEntity, {
            date: item.date,
            title: item.title,
            source: HolidaySource.OFFICIAL,
            active: true,
          }),
        );
        added++;
      } else if (
        existing.source === HolidaySource.OFFICIAL &&
        existing.title !== item.title
      ) {
        existing.title = item.title;
        updated++;
      }
    }

    await em.flush();
    return { added, updated, source, error };
  }

  private async fetchFromApi(jalaliYear: number): Promise<HolidayItem[]> {
    const base =
      this.config.get<string>('ATTENDANCE_HOLIDAYS_API_URL') || DEFAULT_API_URL;
    const url = `${base}?year=${jalaliYear}&holiday=true`;

    let body: { status?: boolean; result?: unknown } | null = null;
    let lastError: unknown;

    for (let attempt = 0; attempt < 3 && !body; attempt++) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        body = await response.json();
      } catch (e) {
        lastError = e;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (!body) throw lastError;

    if (!body.status || !body.result) {
      throw new Error('Unexpected holiday API response');
    }

    const months = Object.values(body.result as Record<string, unknown>);
    const items: HolidayItem[] = [];

    for (const month of months) {
      for (const day of Object.values(month as Record<string, any>)) {
        // Fridays are the weekly day off and belong to shifts.
        if (!day?.holiday || day?.solar?.dayWeek === 'ج') continue;
        const g = day.gregorian;
        items.push({
          date: `${String(g.year).padStart(4, '0')}-${String(g.month).padStart(
            2,
            '0',
          )}-${String(g.day).padStart(2, '0')}`,
          title: this.cleanTitle(day.event ?? []),
        });
      }
    }

    if (items.length < FIXED_SOLAR.length / 2) {
      throw new Error('Holiday API returned too few holidays');
    }
    return items;
  }

  private fixedSolar(jalaliYear: number): HolidayItem[] {
    return FIXED_SOLAR.map(([month, day, title]) => ({
      date: jalaliToDate(jalaliYear, month, day),
      title,
    })).filter((item) => iranWeekday(item.date) !== FRIDAY);
  }

  /** Main occasion of the day, without the bracketed lunar/Gregorian date. */
  private cleanTitle(events: unknown[]): string {
    const list = (Array.isArray(events) ? events : Object.values(events ?? {}))
      .map(String)
      .filter(Boolean);
    const main = list.find((e) => HOLIDAY_KEYWORDS.test(e)) ?? list[0] ?? '';
    const title = main
      .replace(/\s*\[[^\]]*\]\s*/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim();
    return (title || 'تعطیل رسمی').slice(0, 250);
  }
}
