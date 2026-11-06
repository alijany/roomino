import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationService } from '../../notification/services/notification.service';
import { UserEntity } from '../../user/user.entity';
import {
  OnCallPeriodEntity,
  OnCallPeriodStatus,
  OnCallSettingsEntity,
  OnCallShiftEntity,
  OnCallSwapEntity,
  OnCallSwapKind,
  OnCallSwapStatus,
} from '../entities/oncall.entities';
import { CreateOnCallSwapDto } from '../dtos/oncall.dto';
import {
  addDays,
  dateToJalali,
  formatJalaliDate,
  jalaliToDate,
  tehranToday,
} from '../utils/attendance-time.util';
import { toUserBrief } from '../utils/attendance-view.util';

/**
 * Swapping and handing over کشیک days between two people. Only the other
 * person has to agree; managers can read the log but are not asked.
 */
@Injectable()
export class OnCallSwapService {
  private readonly logger = new Logger(OnCallSwapService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly notifications: NotificationService,
  ) {}

  private async notify(userId: number, message: string) {
    try {
      await this.notifications.sendToUser(userId, message, {
        priority: 'normal',
        metadata: { module: 'attendance', link: '/dashboard/oncall' },
      });
    } catch (error) {
      this.logger.warn(
        `ارسال اعلان کشیک برای ${userId} ناموفق بود: ${error?.message}`,
      );
    }
  }

  private async eligibleIds() {
    return (
      (await this.em.findOne(OnCallSettingsEntity, { id: { $gt: 0 } }))
        ?.memberOrder ?? []
    );
  }

  /** Whether a civil date falls in a published period. */
  private async publishedDates(from: string, to: string) {
    const periods = await this.em.find(OnCallPeriodEntity, {
      status: OnCallPeriodStatus.PUBLISHED,
    });
    const settings = await this.em.findOne(OnCallSettingsEntity, {
      id: { $gt: 0 },
    });
    const startDay = settings?.periodStartDay ?? 26;
    return (date: string) =>
      date >= from &&
      date <= to &&
      periods.some((p) => {
        const { year, month } = dateToJalali(p.startDate);
        const nextYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const end = addDays(jalaliToDate(nextYear, nextMonth, startDay), -1);
        return date >= p.startDate && date <= end;
      });
  }

  // --- reading -------------------------------------------------------------------

  /** A person's coming days in published periods, with the hours of each. */
  async upcomingShifts(userId: number) {
    const today = tehranToday();
    // Back a while too: a swap agreed by phone may be recorded afterwards.
    const since = addDays(today, -90);
    const horizon = addDays(today, 120);
    const published = await this.publishedDates(since, horizon);
    const rows = await this.em.find(
      OnCallShiftEntity,
      { user: userId, date: { $gte: since, $lte: horizon } },
      { orderBy: { date: 1, startTime: 1 } },
    );
    const byDate = new Map<string, { start: string; end: string }[]>();
    for (const row of rows.filter((r) => published(r.date))) {
      byDate.set(row.date, [
        ...(byDate.get(row.date) ?? []),
        { start: row.startTime, end: row.endTime },
      ]);
    }
    const pending = await this.em.find(OnCallSwapEntity, {
      status: OnCallSwapStatus.PENDING,
      $or: [{ requester: userId }, { target: userId }],
    });
    return [...byDate.entries()].map(([date, entries]) => ({
      date,
      jalali: formatJalaliDate(date),
      entries,
      past: date <= today,
      movable: true,
      pending: pending.some(
        (s) =>
          (s.requester.id === userId && s.requesterDate === date) ||
          (s.target.id === userId && s.targetDate === date),
      ),
    }));
  }

  /** For the menu and the dashboard card: can they be on call, and what is next. */
  async summary(user: UserEntity) {
    if (!(await this.eligibleIds()).includes(user.id)) {
      return {
        eligible: false,
        today: null,
        next: null,
        requests: [],
        incoming: 0,
      };
    }
    const today = tehranToday();
    const days = (await this.upcomingShifts(user.id)).filter(
      (d) => d.date >= today,
    );
    const requests = (await this.mine(user)).incoming;
    const coming = days.filter((d) => d.date > today);
    return {
      eligible: true,
      today: days.find((d) => d.date === today) ?? null,
      next: coming[0] ?? null,
      requests: requests.slice(0, 2),
      incoming: requests.length,
    };
  }

  /** Everyone who can be on call, except the caller. */
  async colleagues(user: UserEntity) {
    const ids = (await this.eligibleIds()).filter((id) => id !== user.id);
    const users = ids.length
      ? await this.em.find(UserEntity, {
          id: { $in: ids },
          cooperationEnded: false,
        })
      : [];
    return users.map(toUserBrief);
  }

  private view(s: OnCallSwapEntity) {
    return {
      id: s.id,
      kind: s.kind,
      status: s.status,
      requester: toUserBrief(s.requester),
      target: toUserBrief(s.target),
      requesterDate: s.requesterDate,
      requesterJalali: formatJalaliDate(s.requesterDate),
      targetDate: s.targetDate ?? null,
      targetJalali: s.targetDate ? formatJalaliDate(s.targetDate) : null,
      startTime: s.startTime ?? null,
      endTime: s.endTime ?? null,
      coordinated: s.coordinated,
      createdAt: s.created_at,
      respondedAt: s.respondedAt ?? null,
    };
  }

  async mine(user: UserEntity) {
    const rows = await this.em.find(
      OnCallSwapEntity,
      { $or: [{ requester: user.id }, { target: user.id }] },
      { populate: ['requester', 'target'], orderBy: { id: 'DESC' }, limit: 50 },
    );
    const views = rows.map((s) => this.view(s));
    return {
      incoming: views.filter(
        (v) => v.status === 'pending' && v.target?.id === user.id,
      ),
      outgoing: views.filter(
        (v) => v.status === 'pending' && v.requester?.id === user.id,
      ),
      history: views.filter((v) => v.status !== 'pending'),
    };
  }

  /** The log for admin and HR. */
  async log(limit: number) {
    const rows = await this.em.find(
      OnCallSwapEntity,
      {},
      { populate: ['requester', 'target'], orderBy: { id: 'DESC' }, limit },
    );
    return { items: rows.map((s) => this.view(s)) };
  }

  // --- rules ---------------------------------------------------------------------

  private async shiftsOn(userId: number, date: string) {
    return this.em.find(OnCallShiftEntity, { user: userId, date });
  }

  private async busy(userId: number, date: string, exceptId?: number) {
    const rows = await this.em.find(OnCallSwapEntity, {
      status: OnCallSwapStatus.PENDING,
      ...(exceptId ? { id: { $ne: exceptId } } : {}),
      $or: [
        { requester: userId, requesterDate: date },
        { target: userId, targetDate: date },
      ],
    });
    return rows.length > 0;
  }

  /** Throws a Persian message when the request cannot stand as it is. */
  private async check(p: {
    requesterId: number;
    targetId: number;
    kind: OnCallSwapKind;
    requesterDate: string;
    targetDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    exceptId?: number;
    coordinated?: boolean;
  }) {
    const { requesterId, targetId, kind, requesterDate, exceptId } = p;
    const targetDate = p.targetDate ?? undefined;
    const today = tehranToday();
    if (requesterId === targetId) {
      throw new BadRequestException('جابه‌جایی با خودتان ممکن نیست');
    }
    if (kind === OnCallSwapKind.SWAP && !targetDate) {
      throw new BadRequestException('روز همکار را انتخاب کنید');
    }
    const dates =
      kind === OnCallSwapKind.SWAP
        ? [requesterDate, targetDate]
        : [requesterDate];
    const horizon = addDays(today, 120);
    const published = await this.publishedDates(addDays(today, -90), horizon);
    for (const date of dates) {
      if (!date) {
        throw new BadRequestException('روز را انتخاب کنید');
      }
      // Nobody can be asked about a day gone by; it can only be recorded.
      if (date <= today && !p.coordinated) {
        throw new BadRequestException(
          'برای روزهای گذشته فقط ثبت جابه‌جایی هماهنگ‌شده ممکن است',
        );
      }
      if (!published(date)) {
        throw new BadRequestException('برنامهٔ این روز هنوز منتشر نشده است');
      }
    }

    const ids = await this.eligibleIds();
    if (!ids.includes(targetId)) {
      throw new BadRequestException('این همکار در لیست کشیک نیست');
    }
    const target = await this.em.findOne(UserEntity, { id: targetId });
    if (!target || target.cooperationEnded) {
      throw new BadRequestException('این همکار فعال نیست');
    }

    const mine = await this.shiftsOn(requesterId, requesterDate);
    if (!mine.length) {
      throw new BadRequestException('شما در این روز کشیک ندارید');
    }
    const theirs = await this.shiftsOn(targetId, requesterDate);
    if (kind === OnCallSwapKind.PARTIAL) {
      const { startTime: from, endTime: to } = p;
      if (!from || !to || from >= to) {
        throw new BadRequestException('ساعت شروع باید پیش از پایان باشد');
      }
      if (!mine.some((r) => r.startTime <= from && to <= r.endTime)) {
        throw new BadRequestException('این ساعت‌ها داخل کشیک شما نیست');
      }
      if (theirs.some((r) => r.startTime < to && from < r.endTime)) {
        throw new BadRequestException('همکار در این ساعت‌ها کشیک دارد');
      }
    } else if (theirs.length) {
      throw new BadRequestException('همکار در آن روز خودش کشیک دارد');
    }
    if (await this.busy(requesterId, requesterDate, exceptId)) {
      throw new BadRequestException('برای این روز درخواستی در انتظار است');
    }
    if (kind === OnCallSwapKind.SWAP && targetDate) {
      if (!(await this.shiftsOn(targetId, targetDate)).length) {
        throw new BadRequestException('همکار در روز انتخاب‌شده کشیک ندارد');
      }
      if ((await this.shiftsOn(requesterId, targetDate)).length) {
        throw new BadRequestException('شما در روز همکار خودتان کشیک دارید');
      }
      if (await this.busy(targetId, targetDate, exceptId)) {
        throw new BadRequestException('برای روز همکار درخواستی در انتظار است');
      }
    }
  }

  private checkOf(swap: OnCallSwapEntity) {
    return this.check({
      requesterId: swap.requester.id,
      targetId: swap.target.id,
      kind: swap.kind,
      requesterDate: swap.requesterDate,
      targetDate: swap.targetDate,
      startTime: swap.startTime,
      endTime: swap.endTime,
      exceptId: swap.id,
    });
  }

  // --- actions -------------------------------------------------------------------

  private describe(kind: OnCallSwapKind, swap: OnCallSwapEntity) {
    const day = formatJalaliDate(swap.requesterDate);
    if (kind === OnCallSwapKind.SWAP) {
      return `کشیک ${day} با کشیک ${formatJalaliDate(swap.targetDate!)}`;
    }
    if (kind === OnCallSwapKind.PARTIAL) {
      return `کشیک ${day} (ساعت ${swap.startTime} تا ${swap.endTime})`;
    }
    return `کشیک ${day}`;
  }

  async create(user: UserEntity, dto: CreateOnCallSwapDto) {
    const kind = dto.kind as OnCallSwapKind;
    await this.check({
      requesterId: user.id,
      targetId: dto.targetId,
      kind,
      requesterDate: dto.requesterDate,
      targetDate: dto.targetDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      coordinated: dto.coordinated ?? false,
    });
    const swap = this.em.create(OnCallSwapEntity, {
      requester: user,
      target: this.em.getReference(UserEntity, dto.targetId),
      kind,
      requesterDate: dto.requesterDate,
      targetDate: kind === OnCallSwapKind.SWAP ? dto.targetDate : undefined,
      startTime: kind === OnCallSwapKind.PARTIAL ? dto.startTime : undefined,
      endTime: kind === OnCallSwapKind.PARTIAL ? dto.endTime : undefined,
      coordinated: dto.coordinated ?? false,
    });
    const who = user.name ?? 'یکی از همکاران';
    const what = this.describe(kind, swap);

    if (swap.coordinated) {
      // Agreed beforehand: it is only being recorded, so apply it now.
      await this.apply(swap);
      swap.status = OnCallSwapStatus.ACCEPTED;
      swap.respondedAt = new Date();
      await this.em.persistAndFlush(swap);
      await this.notify(
        dto.targetId,
        kind === OnCallSwapKind.SWAP
          ? `${who} جابه‌جایی ${what} را که با شما هماهنگ کرده بود، ثبت کرد.`
          : `${who} واگذاری ${what} به شما را که هماهنگ کرده بود، ثبت کرد.`,
      );
      return { id: swap.id };
    }

    await this.em.persistAndFlush(swap);
    await this.notify(
      dto.targetId,
      kind === OnCallSwapKind.SWAP
        ? `${who} می‌خواهد ${what} را عوض کند.`
        : `${who} از شما می‌خواهد ${what} را بگیرید.`,
    );
    return { id: swap.id };
  }

  private async pending(id: number) {
    const swap = await this.em.findOne(
      OnCallSwapEntity,
      { id },
      { populate: ['requester', 'target'] },
    );
    if (!swap) throw new NotFoundException('درخواست یافت نشد');
    if (swap.status !== OnCallSwapStatus.PENDING) {
      throw new BadRequestException('این درخواست دیگر در انتظار نیست');
    }
    return swap;
  }

  private async move(date: string, fromId: number, toId: number) {
    const rows = await this.shiftsOn(fromId, date);
    rows.forEach((r) => (r.user = this.em.getReference(UserEntity, toId)));
  }

  /** Carve the hours out of the giver's row and hand them to the other person. */
  private async movePart(
    date: string,
    fromId: number,
    toId: number,
    from: string,
    to: string,
  ) {
    const rows = await this.shiftsOn(fromId, date);
    const row = rows.find((r) => r.startTime <= from && to <= r.endTime);
    if (!row) throw new BadRequestException('این ساعت‌ها داخل کشیک شما نیست');
    const toUser = this.em.getReference(UserEntity, toId);
    const tail = row.endTime;
    if (row.startTime === from && tail === to) {
      row.user = toUser;
      return;
    }
    if (row.startTime === from) {
      row.startTime = to;
    } else {
      row.endTime = from;
      if (to < tail) {
        this.em.persist(
          this.em.create(OnCallShiftEntity, {
            date,
            user: this.em.getReference(UserEntity, fromId),
            startTime: to,
            endTime: tail,
            // Still the same person's slot: already reminded stays reminded.
            reminderSentAt: row.reminderSentAt,
          }),
        );
      }
    }
    this.em.persist(
      this.em.create(OnCallShiftEntity, {
        date,
        user: toUser,
        startTime: from,
        endTime: to,
      }),
    );
  }

  private async apply(swap: OnCallSwapEntity) {
    const from = swap.requester.id;
    const to = swap.target.id;
    if (swap.kind === OnCallSwapKind.PARTIAL) {
      await this.movePart(
        swap.requesterDate,
        from,
        to,
        swap.startTime!,
        swap.endTime!,
      );
      return;
    }
    await this.move(swap.requesterDate, from, to);
    if (swap.kind === OnCallSwapKind.SWAP && swap.targetDate) {
      await this.move(swap.targetDate, to, from);
    }
  }

  async accept(user: UserEntity, id: number) {
    const swap = await this.pending(id);
    if (swap.target.id !== user.id) {
      throw new ForbiddenException('این درخواست برای شما نیست');
    }
    // Things may have moved since it was asked: check it all again.
    await this.checkOf(swap);
    await this.apply(swap);
    swap.status = OnCallSwapStatus.ACCEPTED;
    swap.respondedAt = new Date();
    await this.em.flush();
    await this.notify(
      swap.requester.id,
      `${user.name ?? 'همکارتان'} درخواست جابه‌جایی کشیک را پذیرفت.`,
    );
    return { status: swap.status };
  }

  async decline(user: UserEntity, id: number) {
    const swap = await this.pending(id);
    if (swap.target.id !== user.id) {
      throw new ForbiddenException('این درخواست برای شما نیست');
    }
    swap.status = OnCallSwapStatus.DECLINED;
    swap.respondedAt = new Date();
    await this.em.flush();
    await this.notify(
      swap.requester.id,
      `${user.name ?? 'همکارتان'} درخواست جابه‌جایی کشیک را نپذیرفت.`,
    );
    return { status: swap.status };
  }

  async cancel(user: UserEntity, id: number) {
    const swap = await this.pending(id);
    if (swap.requester.id !== user.id) {
      throw new ForbiddenException('این درخواست مال شما نیست');
    }
    swap.status = OnCallSwapStatus.CANCELLED;
    swap.respondedAt = new Date();
    await this.em.flush();
    return { status: swap.status };
  }
}
