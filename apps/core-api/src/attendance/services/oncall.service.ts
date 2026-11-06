import { EntityManager, QueryOrder } from '@mikro-orm/core';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { NotificationService } from '../../notification/services/notification.service';
import { RolesEntity } from '../../roles/roles.entity';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import {
  DEFAULT_ONCALL_RATES,
  DEFAULT_ONCALL_TEMPLATES,
  OnCallDayType,
  OnCallChangeEntity,
  OnCallPeriodEntity,
  OnCallPeriodStatus,
  OnCallSettingsEntity,
  OnCallShiftEntity,
  OnCallSlot,
  OnCallTemplates,
} from '../entities/oncall.entities';
import { OnCallEntryDto, SaveOnCallSettingsDto } from '../dtos/oncall.dto';
import {
  addDays,
  clockToMinutes,
  dateToJalali,
  eachDate,
  formatJalaliDate,
  iranWeekday,
  jalaliToDate,
  tehranClock,
  tehranToday,
} from '../utils/attendance-time.util';
import { toUserBrief } from '../utils/attendance-view.util';
import { dayLabel, fa, slotsLabel } from '../utils/oncall-message.util';
import { HolidayService } from './holiday.service';

type Entry = { userId: number; start: string; end: string };

@Injectable()
export class OnCallService {
  private readonly logger = new Logger(OnCallService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly holidays: HolidayService,
    private readonly notifications: NotificationService,
  ) {}

  // --- access ------------------------------------------------------------------

  /** Admin, HR and the on-call manager lay the list out; everyone else only reads published periods. */
  async canManage(user: UserEntity) {
    const roles = await this.em.find(RolesEntity, { user: user.id });
    return roles.some(
      (r) =>
        r.role === Role.ADMIN ||
        r.role === Role.HR ||
        r.role === Role.ONCALL_MANAGER,
    );
  }

  async requireManage(user: UserEntity) {
    if (!(await this.canManage(user))) {
      throw new ForbiddenException('دسترسی کافی ندارید');
    }
  }

  // --- settings ----------------------------------------------------------------

  private async settingsRow() {
    let settings = await this.em.findOne(OnCallSettingsEntity, {
      id: { $gt: 0 },
    });
    if (!settings) {
      settings = this.em.create(OnCallSettingsEntity, {
        templates: DEFAULT_ONCALL_TEMPLATES,
        periodStartDay: 26,
        memberOrder: [],
      });
      await this.em.persistAndFlush(settings);
    }
    return settings;
  }

  private async usersByIds(ids: number[]) {
    const users = ids.length
      ? await this.em.find(UserEntity, { id: { $in: ids } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as UserEntity[];
  }

  async getSettings(user: UserEntity) {
    await this.requireManage(user);
    const settings = await this.settingsRow();
    const eligible = await this.usersByIds(settings.memberOrder);
    const listed = new Set(settings.memberOrder);
    // Anyone still working here, from the whole organisation, can be added.
    const everyone = await this.em.find(
      UserEntity,
      { cooperationEnded: false },
      { orderBy: { lastName: QueryOrder.ASC, firstName: QueryOrder.ASC } },
    );
    return {
      templates: settings.templates,
      periodStartDay: settings.periodStartDay,
      hourlyRates: settings.hourlyRates ?? DEFAULT_ONCALL_RATES,
      eligible: eligible.map(toUserBrief),
      candidates: everyone.filter((u) => !listed.has(u.id)).map(toUserBrief),
    };
  }

  private validateSlots(templates: OnCallTemplates) {
    for (const slots of Object.values(templates)) {
      for (const slot of slots) {
        if (clockToMinutes(slot.start) >= clockToMinutes(slot.end)) {
          throw new BadRequestException('ساعت شروع باید پیش از پایان باشد');
        }
      }
    }
  }

  async saveSettings(user: UserEntity, dto: SaveOnCallSettingsDto) {
    await this.requireManage(user);
    const settings = await this.settingsRow();
    const oldOrder = settings.memberOrder;
    if (dto.templates) {
      this.validateSlots(dto.templates as OnCallTemplates);
      settings.templates = dto.templates as OnCallTemplates;
    }
    if (dto.periodStartDay !== undefined) {
      settings.periodStartDay = dto.periodStartDay;
    }
    if (dto.hourlyRates) {
      settings.hourlyRates = { ...dto.hourlyRates };
    }
    let replaced = 0;
    if (dto.memberOrder) {
      const order = [...new Set(dto.memberOrder)];
      const found = await this.em.count(UserEntity, {
        id: { $in: order },
        cooperationEnded: false,
      });
      if (found !== order.length) {
        throw new BadRequestException('کاربر انتخاب‌شده فعال نیست');
      }
      settings.memberOrder = order;
      replaced = await this.replaceRemoved(oldOrder, order);
    }
    await this.em.flush();
    return { ...(await this.getSettings(user)), replaced };
  }

  /**
   * People taken off the list hand their coming days to the next person on it
   * (after them in the old order, wrapping round). Days already gone stay.
   */
  private async replaceRemoved(oldOrder: number[], newOrder: number[]) {
    const removed = oldOrder.filter((id) => !newOrder.includes(id));
    const today = tehranToday();
    let changed = 0;
    for (const gone of removed) {
      const rows = await this.em.find(OnCallShiftEntity, {
        user: gone,
        date: { $gt: today },
      });
      if (!rows.length) continue;
      let next: number | null = null;
      const at = oldOrder.indexOf(gone);
      for (let step = 1; step <= oldOrder.length; step++) {
        const candidate = oldOrder[(at + step) % oldOrder.length];
        if (newOrder.includes(candidate)) {
          next = candidate;
          break;
        }
      }
      for (const row of rows) {
        if (next === null) this.em.remove(row);
        else row.user = this.em.getReference(UserEntity, next);
        changed++;
      }
    }
    return changed;
  }

  // --- periods and days ----------------------------------------------------------

  /** The civil dates a period starting in Jalali (year, month) covers. */
  private periodRange(year: number, month: number, startDay: number) {
    const start = jalaliToDate(year, month, startDay);
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const end = addDays(jalaliToDate(nextYear, nextMonth, startDay), -1);
    return { start, end };
  }

  private dayType(date: string, holidays: Map<string, unknown>): OnCallDayType {
    if (holidays.has(date)) return 'holiday';
    const weekday = iranWeekday(date);
    if (weekday === 6) return 'friday';
    if (weekday === 5) return 'thursday';
    return 'normal';
  }

  private minutes(rows: { startTime: string; endTime: string }[]) {
    return rows.reduce(
      (sum, r) => sum + clockToMinutes(r.endTime) - clockToMinutes(r.startTime),
      0,
    );
  }

  async schedule(
    user: UserEntity,
    year: number,
    month: number,
    memberView = false,
  ) {
    // The member's own view never shows a draft, whatever role they hold.
    const manage = !memberView && (await this.canManage(user));
    const settings = await this.settingsRow();
    const { start, end } = this.periodRange(
      year,
      month,
      settings.periodStartDay,
    );

    const period = await this.em.findOne(OnCallPeriodEntity, {
      startDate: start,
    });
    const status = period?.status ?? OnCallPeriodStatus.DRAFT;
    const hidden = !manage && status !== OnCallPeriodStatus.PUBLISHED;
    if (hidden && !memberView) {
      throw new ForbiddenException('برنامهٔ کشیک هنوز منتشر نشده است');
    }

    const rows = await this.em.find(
      OnCallShiftEntity,
      hidden ? { id: 0 } : { date: { $gte: start, $lte: end } },
      { populate: ['user'], orderBy: { date: 1, startTime: 1 } },
    );
    const holidays = await this.holidays.between(start, end);
    const byDate = new Map<string, OnCallShiftEntity[]>();
    for (const row of rows) {
      byDate.set(row.date, [...(byDate.get(row.date) ?? []), row]);
    }

    const days = eachDate(start, end).map((date) => {
      const type = this.dayType(date, holidays);
      const { month: jm, day: jd } = dateToJalali(date);
      return {
        date,
        jalaliMonth: jm,
        jalaliDay: jd,
        weekday: iranWeekday(date),
        type,
        holidayTitle: holidays.get(date)?.title ?? null,
        defaultSlots: settings.templates[type] as OnCallSlot[],
        entries: (byDate.get(date) ?? []).map((r) => ({
          id: r.id,
          user: toUserBrief(r.user),
          start: r.startTime,
          end: r.endTime,
        })),
      };
    });

    const totals = new Map<number, number>();
    for (const row of rows) {
      totals.set(
        row.user.id,
        (totals.get(row.user.id) ?? 0) + this.minutes([row]),
      );
    }
    const eligible = manage ? await this.usersByIds(settings.memberOrder) : [];

    return {
      canManage: manage,
      period: { start, end, status, year, month },
      days,
      eligible: eligible.map(toUserBrief),
      totals: [...totals.entries()].map(([userId, minutesTotal]) => ({
        userId,
        minutes: minutesTotal,
      })),
    };
  }

  /**
   * Hours on call per person for a period: the total, how much of it has gone
   * by, and the split by kind of day. Everyone on the eligible list appears,
   * even with nothing yet.
   */
  async report(user: UserEntity, year: number, month: number) {
    await this.requireManage(user);
    const settings = await this.settingsRow();
    const { start, end } = this.periodRange(
      year,
      month,
      settings.periodStartDay,
    );
    const period = await this.em.findOne(OnCallPeriodEntity, {
      startDate: start,
    });
    const rows = await this.em.find(
      OnCallShiftEntity,
      { date: { $gte: start, $lte: end } },
      { populate: ['user'] },
    );
    const holidays = await this.holidays.between(start, end);
    const today = tehranToday();
    const now = clockToMinutes(tehranClock(new Date()) ?? '00:00');

    const empty = () => ({
      days: new Set<string>(),
      total: 0,
      done: 0,
      byType: { normal: 0, thursday: 0, friday: 0, holiday: 0 },
    });
    const stats = new Map<number, ReturnType<typeof empty>>();
    for (const id of settings.memberOrder) stats.set(id, empty());

    for (const row of rows) {
      const stat = stats.get(row.user.id) ?? empty();
      stats.set(row.user.id, stat);
      const from = clockToMinutes(row.startTime);
      const to = clockToMinutes(row.endTime);
      const length = to - from;
      stat.days.add(row.date);
      stat.total += length;
      stat.byType[this.dayType(row.date, holidays)] += length;
      if (row.date < today) stat.done += length;
      else if (row.date === today) {
        stat.done += Math.max(0, Math.min(now, to) - from);
      }
    }

    const rates = settings.hourlyRates ?? DEFAULT_ONCALL_RATES;
    // Rial for the minutes at the hourly rate.
    const pay = (minutes: number, rate: number) =>
      Math.round((minutes * rate) / 60);
    const users = await this.usersByIds([...stats.keys()]);
    const items = users
      .map((person) => {
        const stat = stats.get(person.id)!;
        const amountByType = {
          normal: pay(stat.byType.normal, rates.normal),
          thursday: pay(stat.byType.thursday, rates.thursday),
          friday: pay(stat.byType.friday, rates.friday),
          holiday: pay(stat.byType.holiday, rates.holiday),
        };
        return {
          user: toUserBrief(person),
          personnelCode: person.personnelCode ?? null,
          days: stat.days.size,
          totalMinutes: stat.total,
          doneMinutes: stat.done,
          remainingMinutes: stat.total - stat.done,
          byType: stat.byType,
          amountByType,
          amount: Object.values(amountByType).reduce((a, b) => a + b, 0),
        };
      })
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    return {
      period: {
        start,
        end,
        status: period?.status ?? OnCallPeriodStatus.DRAFT,
        year,
        month,
      },
      rates,
      items,
    };
  }

  private async checkEntries(entries: Entry[]) {
    const settings = await this.settingsRow();
    entries.forEach((a, i) => {
      const clash = entries.some(
        (b, j) =>
          j > i && a.userId === b.userId && a.start < b.end && b.start < a.end,
      );
      if (clash) {
        throw new BadRequestException(
          'یک نفر را نمی‌توان دو بار در یک بازهٔ زمانی گذاشت',
        );
      }
    });
    for (const entry of entries) {
      if (!settings.memberOrder.includes(entry.userId)) {
        throw new BadRequestException('این فرد در لیست واجد شرایط کشیک نیست');
      }
      if (clockToMinutes(entry.start) >= clockToMinutes(entry.end)) {
        throw new BadRequestException('ساعت شروع باید پیش از پایان باشد');
      }
    }
  }

  private async writeDay(date: string, entries: Entry[]) {
    const existing = await this.em.find(OnCallShiftEntity, { date });
    // A slot that stays as it was keeps its reminder state, so it is not reminded twice.
    const reminded = new Map(
      existing.map((row) => [
        `${row.user.id}|${row.startTime}|${row.endTime}`,
        row.reminderSentAt,
      ]),
    );
    existing.forEach((row) => this.em.remove(row));
    for (const entry of entries) {
      this.em.persist(
        this.em.create(OnCallShiftEntity, {
          date,
          user: this.em.getReference(UserEntity, entry.userId),
          startTime: entry.start,
          endTime: entry.end,
          reminderSentAt: reminded.get(
            `${entry.userId}|${entry.start}|${entry.end}`,
          ),
        }),
      );
    }
  }

  async saveDay(user: UserEntity, date: string, entries: OnCallEntryDto[]) {
    await this.requireManage(user);
    await this.checkEntries(entries);
    const before = await this.slotsByUser(date);
    await this.writeDay(date, entries);
    await this.em.flush();
    await this.recordDayChange(date, before, await this.slotsByUser(date));
    return { success: true };
  }

  private async slotsByUser(date: string) {
    const rows = await this.em.find(OnCallShiftEntity, { date });
    const byUser = new Map<number, { start: string; end: string }[]>();
    for (const row of rows) {
      byUser.set(row.user.id, [
        ...(byUser.get(row.user.id) ?? []),
        { start: row.startTime, end: row.endTime },
      ]);
    }
    return byUser;
  }

  private labelOf(slots?: { start: string; end: string }[] | null) {
    return slots?.length ? slotsLabel(slots) : '';
  }

  /**
   * Remember what a manager's edit changed for each person, so they can later
   * choose whether to announce it. Only a published period and a day within the
   * coming week count; earlier planning is nobody's business yet. Edits to the
   * same person and day merge, and one that ends where it began cancels out.
   */
  private async recordDayChange(
    date: string,
    before: Map<number, { start: string; end: string }[]>,
    after: Map<number, { start: string; end: string }[]>,
  ) {
    const today = tehranToday();
    if (date < today || date > addDays(today, 7)) return;
    const period = await this.em.findOne(
      OnCallPeriodEntity,
      { startDate: { $lte: date } },
      { orderBy: { startDate: QueryOrder.DESC } },
    );
    if (period?.status !== OnCallPeriodStatus.PUBLISHED) return;

    const ids = new Set([...before.keys(), ...after.keys()]);
    for (const id of ids) {
      const was = before.get(id);
      const now = after.get(id);
      const existing = await this.em.findOne(OnCallChangeEntity, {
        date,
        user: id,
      });
      if (existing) {
        existing.after = now ?? [];
        if (this.labelOf(existing.before) === this.labelOf(existing.after)) {
          this.em.remove(existing);
        }
      } else if (this.labelOf(was) !== this.labelOf(now)) {
        this.em.persist(
          this.em.create(OnCallChangeEntity, {
            date,
            user: this.em.getReference(UserEntity, id),
            before: was ?? [],
            after: now ?? [],
          }),
        );
      }
    }
    await this.em.flush();
  }

  /** Changes made to the published schedule that nobody has been told about yet. */
  async pendingChanges(user: UserEntity) {
    await this.requireManage(user);
    const rows = await this.em.find(
      OnCallChangeEntity,
      { date: { $gte: tehranToday() } },
      { populate: ['user'], orderBy: { date: QueryOrder.ASC } },
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        date: row.date,
        user: toUserBrief(row.user),
        kind: !row.before?.length
          ? 'added'
          : !row.after?.length
          ? 'removed'
          : 'changed',
        before: this.labelOf(row.before),
        after: this.labelOf(row.after),
      })),
    };
  }

  /** Send the pending changes to the people they touch, or drop them unannounced. */
  async resolveChanges(user: UserEntity, notify: boolean) {
    await this.requireManage(user);
    const rows = await this.em.find(
      OnCallChangeEntity,
      {},
      { populate: ['user'] },
    );
    const today = tehranToday();
    let sent = 0;
    if (notify) {
      for (const row of rows) {
        if (row.date < today) continue;
        await this.sendChangeNotice(
          row.user.id,
          row.date,
          row.before,
          row.after,
        );
        sent++;
      }
    }
    rows.forEach((row) => this.em.remove(row));
    await this.em.flush();
    return { sent };
  }

  private async sendChangeNotice(
    id: number,
    date: string,
    was?: { start: string; end: string }[] | null,
    now?: { start: string; end: string }[] | null,
  ) {
    const label = (slots: { start: string; end: string }[]) =>
      slotsLabel(slots);
    const day = dayLabel(date);
    let text: string;
    let sms: string;
    if (!was?.length && now?.length) {
      text = [
        '📌 کشیک جدید',
        '',
        'برنامهٔ کشیک تغییر کرد و کشیکی برای شما ثبت شد.',
        '',
        `📅 ${day}`,
        `🕐 ساعت ${label(now)}`,
      ].join('\n');
      sms = `کشیک جدید برای شما ثبت شد: ${day} ساعت ${label(now)}.`;
    } else if (was?.length && !now?.length) {
      text = [
        '❌ حذف کشیک',
        '',
        'برنامهٔ کشیک تغییر کرد و این کشیک از شما برداشته شد.',
        '',
        `📅 ${day}`,
        `🕐 ساعت ${label(was)}`,
      ].join('\n');
      sms = `کشیک شما برداشته شد: ${day} ساعت ${label(was)}.`;
    } else if (was?.length && now?.length) {
      text = [
        '🔄 تغییر ساعت کشیک',
        '',
        'ساعت کشیک شما در برنامه تغییر کرد.',
        '',
        `📅 ${day}`,
        `🕐 قبلاً: ${label(was)}`,
        `🕐 حالا: ${label(now)}`,
      ].join('\n');
      sms = `ساعت کشیک شما ${day} از ${label(was)} به ${label(now)} تغییر کرد.`;
    } else {
      return;
    }
    try {
      await this.notifications.sendToUser(id, text, {
        priority: 'high',
        smsMessage: sms,
        metadata: { module: 'attendance', link: '/dashboard/oncall' },
      });
    } catch (error) {
      this.logger.warn(
        `اعلان تغییر کشیک برای ${id} ارسال نشد: ${error?.message}`,
      );
    }
  }

  /**
   * Repeat what the manager has laid out — the first run of filled days, which
   * need not start on the period's first day — over the days after it, in the
   * same order, round and round. Days before the run are left alone. A day with one person gets that person for the target
   * day's own default hours; a day with several keeps their hours.
   */
  async repeat(
    user: UserEntity,
    year: number,
    month: number,
    replace: boolean,
  ) {
    await this.requireManage(user);
    const settings = await this.settingsRow();
    const { start, end } = this.periodRange(
      year,
      month,
      settings.periodStartDay,
    );
    const dates = eachDate(start, end);
    const rows = await this.em.find(OnCallShiftEntity, {
      date: { $gte: start, $lte: end },
    });
    const byDate = new Map<string, OnCallShiftEntity[]>();
    for (const row of rows) {
      byDate.set(row.date, [...(byDate.get(row.date) ?? []), row]);
    }

    const first = dates.findIndex((date) => byDate.get(date)?.length);
    const pattern: OnCallShiftEntity[][] = [];
    if (first >= 0) {
      for (const date of dates.slice(first)) {
        const day = byDate.get(date);
        if (!day?.length) break;
        pattern.push(day);
      }
    }
    if (!pattern.length) {
      throw new BadRequestException('ابتدا چند روز پشت‌سرهم را بچینید');
    }

    const holidays = await this.holidays.between(start, end);
    let next = 0;
    let filled = 0;
    for (const date of dates.slice(first + pattern.length)) {
      if (byDate.get(date)?.length && !replace) continue;
      const source = pattern[next % pattern.length];
      next++;
      const people = [...new Set(source.map((r) => r.user.id))];
      const type = this.dayType(date, holidays);
      const entries: Entry[] =
        people.length === 1
          ? settings.templates[type].map((slot) => ({
              userId: people[0],
              ...slot,
            }))
          : source.map((r) => ({
              userId: r.user.id,
              start: r.startTime,
              end: r.endTime,
            }));
      await this.writeDay(date, entries);
      filled++;
    }
    await this.em.flush();
    return { filled };
  }

  /**
   * Lay out a period from the one before it. The pattern is the previous
   * period's opening run of filled days (as in `repeat`). `continue` picks the
   * rotation up where the previous period left off; `restart` begins again at
   * the first of the pattern. Days that already have someone stay unless
   * `replace`; people no longer eligible are skipped.
   */
  async copyFromPrevious(
    user: UserEntity,
    year: number,
    month: number,
    mode: 'continue' | 'restart',
    replace: boolean,
  ) {
    await this.requireManage(user);
    const settings = await this.settingsRow();
    const prev =
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    const before = this.periodRange(
      prev.year,
      prev.month,
      settings.periodStartDay,
    );
    const { start, end } = this.periodRange(
      year,
      month,
      settings.periodStartDay,
    );

    const prevRows = await this.em.find(
      OnCallShiftEntity,
      { date: { $gte: before.start, $lte: before.end } },
      { populate: ['user'], orderBy: { date: 1, startTime: 1 } },
    );
    const prevByDate = new Map<string, OnCallShiftEntity[]>();
    for (const row of prevRows) {
      prevByDate.set(row.date, [...(prevByDate.get(row.date) ?? []), row]);
    }
    const prevDates = eachDate(before.start, before.end);
    const pattern: OnCallShiftEntity[][] = [];
    for (const date of prevDates) {
      const day = prevByDate.get(date);
      if (!day?.length) break;
      pattern.push(day);
    }
    if (!pattern.length) {
      throw new BadRequestException('دورهٔ قبل الگویی برای کپی ندارد');
    }

    const dates = eachDate(start, end);
    const existing = await this.em.find(OnCallShiftEntity, {
      date: { $gte: start, $lte: end },
    });
    const taken = new Set(existing.map((r) => r.date));
    const holidays = await this.holidays.between(start, end);
    const eligible = new Set(settings.memberOrder);

    // The previous period's days ran through pattern index (days % length) next.
    let next = mode === 'continue' ? prevDates.length % pattern.length : 0;
    let filled = 0;
    for (const date of dates) {
      let people: number[] = [];
      let source = pattern[next % pattern.length];
      for (let tries = 0; tries < pattern.length; tries++) {
        source = pattern[next % pattern.length];
        next++;
        people = [...new Set(source.map((r) => r.user.id))].filter((id) =>
          eligible.has(id),
        );
        if (people.length) break;
      }
      if (!people.length) continue;
      if (taken.has(date) && !replace) continue;
      const type = this.dayType(date, holidays);
      const entries: Entry[] =
        people.length > 1
          ? source
              .filter((r) => eligible.has(r.user.id))
              .map((r) => ({
                userId: r.user.id,
                start: r.startTime,
                end: r.endTime,
              }))
          : settings.templates[type].map((slot) => ({
              userId: people[0],
              ...slot,
            }));
      await this.writeDay(date, entries);
      filled++;
    }
    await this.em.flush();
    return { filled };
  }

  async setStatus(
    user: UserEntity,
    year: number,
    month: number,
    status: OnCallPeriodStatus,
    notify = true,
  ) {
    await this.requireManage(user);
    const settings = await this.settingsRow();
    const { start, end } = this.periodRange(
      year,
      month,
      settings.periodStartDay,
    );
    let period = await this.em.findOne(OnCallPeriodEntity, {
      startDate: start,
    });
    if (!period) {
      period = this.em.create(OnCallPeriodEntity, { startDate: start });
    }
    const justPublished =
      status === OnCallPeriodStatus.PUBLISHED &&
      period.status !== OnCallPeriodStatus.PUBLISHED;
    period.status = status;
    await this.em.persistAndFlush(period);
    if (justPublished && notify) await this.notifyPublished(start, end);
    return { status };
  }

  /** Everyone with a slot in a period that has just been published hears about their days. */
  private async notifyPublished(start: string, end: string) {
    const rows = await this.em.find(
      OnCallShiftEntity,
      { date: { $gte: start, $lte: end } },
      { populate: ['user'], orderBy: { date: QueryOrder.ASC } },
    );
    const byUser = new Map<number, OnCallShiftEntity[]>();
    for (const row of rows) {
      byUser.set(row.user.id, [...(byUser.get(row.user.id) ?? []), row]);
    }
    const range = `${fa(formatJalaliDate(start))} تا ${fa(
      formatJalaliDate(end),
    )}`;

    for (const [id, mine] of byUser) {
      const days = new Map<string, { start: string; end: string }[]>();
      for (const row of mine) {
        days.set(row.date, [
          ...(days.get(row.date) ?? []),
          { start: row.startTime, end: row.endTime },
        ]);
      }
      const person = mine[0].user;
      const name = person.firstName?.trim() || person.name;
      const text = [
        '📋 برنامهٔ کشیک منتشر شد',
        '',
        `${
          name ? `${name} عزیز` : 'همکار گرامی'
        }، برنامهٔ کشیک ${range} منتشر شد.`,
        `شما ${fa(days.size)} روز کشیک دارید:`,
        ...[...days].map(
          ([date, slots]) => `• ${dayLabel(date)} — ${slotsLabel(slots)}`,
        ),
        '',
        'برای مشاهده جزئیات و تغییرات به «کشیک من» مراجعه کنید.',
      ].join('\n');
      const sms = `برنامهٔ کشیک ${range} منتشر شد؛ شما ${fa(
        days.size,
      )} روز کشیک دارید. برای جزئیات و تغییرات به «کشیک من» مراجعه کنید.`;
      try {
        await this.notifications.sendToUser(id, text, {
          priority: 'high',
          smsMessage: sms,
          metadata: { module: 'attendance', link: '/dashboard/oncall' },
        });
      } catch (error) {
        this.logger.warn(
          `اعلان انتشار کشیک برای ${id} ارسال نشد: ${error?.message}`,
        );
      }
    }
  }
}
