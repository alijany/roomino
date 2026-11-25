import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { NotificationService } from '../../notification/services/notification.service';
import {
  AttendanceMode,
  BoardStatus,
  RequestCategory,
  RequestStatus,
  TEHRAN_TZ,
} from '../attendance.constants';
import { AttendanceRequestEntity } from '../entities/attendance-request.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { categoryOf, isHourly } from '../utils/attendance-request.util';
import {
  clockToMinutes,
  tehranClock,
  tehranToday,
} from '../utils/attendance-time.util';
import { checkinButtonData } from './checkin-action.service';
import { AttendanceSettingsService } from './attendance-settings.service';
import { EmployeeService } from './employee.service';
import { ReportService } from './report.service';
import { RequestService } from './request.service';

/** The panel's address unless `APP_PUBLIC_URL` says otherwise. */
const DEFAULT_APP_URL = 'https://life.tesmino.com';

/** Leave, a mission or remote work asked for the whole day. */
const DAY_CATEGORIES = [
  RequestCategory.LEAVE,
  RequestCategory.MISSION,
  RequestCategory.REMOTE,
];

/**
 * Reminds people who should check in today and haven't. Off until an admin
 * switches it on in the attendance settings; from the chosen time on it looks
 * every five minutes and tells each such person once a day.
 *
 * Who is reminded follows today's board: «ورود ثبت نشده» (their shift has
 * begun) and, for «بدون ثبت», those who haven't said «امروز هستم». Holidays,
 * approved leave, missions and remote days, schedule mode and anyone already in
 * never appear there. On top of that, a day-long request still awaiting a
 * decision, or hourly leave approved for this very moment, holds the reminder
 * back (the next run looks again).
 */
@Injectable()
export class CheckinReminderService {
  private readonly logger = new Logger(CheckinReminderService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly settings: AttendanceSettingsService,
    private readonly employees: EmployeeService,
    private readonly reports: ReportService,
    private readonly requests: RequestService,
    private readonly notifications: NotificationService,
    private readonly config: ConfigService,
  ) {}

  @Cron('*/5 * * * *', { name: 'checkin-reminders', timeZone: TEHRAN_TZ })
  async run(): Promise<void> {
    try {
      // A fresh context: the services expect one, as in a request.
      await RequestContext.create(this.em, () => this.sendDue(new Date()));
    } catch (error) {
      this.logger.error(`یادآوری ثبت ورود ناموفق بود: ${error?.message}`);
    }
  }

  async sendDue(now: Date): Promise<number> {
    const settings = await this.settings.find();
    if (!settings?.checkinReminderEnabled) return 0;

    const clock = tehranClock(now) ?? '00:00';
    const minutes = clockToMinutes(clock);
    if (minutes < clockToMinutes(settings.checkinReminderTime)) return 0;

    const today = tehranToday(now);
    const profiles = (await this.employees.findActive()).filter(
      (p) => p.checkinReminderSentOn !== today,
    );
    if (!profiles.length) return 0;

    const board = await this.reports.board(profiles);
    const due = board.rows.filter((r) =>
      [BoardStatus.MISSING, BoardStatus.AWAITING].includes(r.status),
    );
    if (!due.length) return 0;

    const held = await this.heldBack(
      due.map((r) => r.profile.id),
      today,
      minutes,
    );

    // One tap without a position is only possible when none is checked.
    const selfDeclared = await this.settings.selfDeclared();

    let sent = 0;
    for (const row of due) {
      if (held.has(row.profile.id)) continue;

      // Marked first: a failed send is logged, never repeated every five minutes.
      await this.em.nativeUpdate(
        EmployeeProfileEntity,
        { id: row.profile.id },
        { checkinReminderSentOn: today },
      );

      const untracked = row.mode === AttendanceMode.UNTRACKED;
      const { text, sms } = this.compose(row.profile, untracked);
      const noPosition =
        selfDeclared || (Boolean(row.profile.workplace) && !row.profile.useGps);
      try {
        await this.notifications.sendToUser(row.profile.user.id, text, {
          priority: 'high',
          smsMessage: sms,
          sms: false,
          metadata: {
            module: 'attendance',
            link: '/dashboard/attendance',
            telegramButtons: this.buttons(today, untracked, noPosition),
          },
        });
        sent++;
      } catch (error) {
        this.logger.warn(
          `یادآوری ثبت ورود برای ${row.profile.user.id} ارسال نشد: ${error?.message}`,
        );
      }
    }
    return sent;
  }

  /**
   * Under the Telegram message: a one-tap check-in («امروز هستم» for
   * «بدون ثبت») where no position is needed, «دورکاری هستم», «مرخصی
   * استعلاجی» for today, and a link to the panel for everything else, at `APP_PUBLIC_URL` (HTTPS — Telegram
   * refuses other buttons).
   */
  buttons(today: string, untracked: boolean, noPosition: boolean) {
    const tap = [
      ...(noPosition
        ? [
            {
              text: untracked ? 'امروز هستم' : 'ثبت ورود',
              data: checkinButtonData('p', today),
            },
          ]
        : []),
      { text: 'دورکاری هستم', data: checkinButtonData('r', today) },
    ];
    const base = (
      this.config.get<string>('APP_PUBLIC_URL') || DEFAULT_APP_URL
    ).replace(/\/+$/, '');
    const link =
      base && base.startsWith('https://')
        ? [{ text: 'باز کردن پنل', url: `${base}/dashboard/attendance` }]
        : [];
    const sick = [
      { text: 'مرخصی استعلاجی', data: checkinButtonData('s', today) },
    ];
    return [tap, sick, ...(link.length ? [link] : [])];
  }

  /** People with a request that settles today for the moment: no reminder yet. */
  private async heldBack(ids: number[], today: string, minutes: number) {
    const rows: AttendanceRequestEntity[] = await this.requests.inRange(
      ids,
      today,
      today,
      [RequestStatus.PENDING, RequestStatus.APPROVED],
    );
    const held = new Set<number>();
    for (const request of rows) {
      const category = categoryOf(request.type);
      if (isHourly(request.type)) {
        // Approved hourly leave, a mission or remote work that covers now.
        if (
          request.status === RequestStatus.APPROVED &&
          request.timeFrom &&
          request.timeTo &&
          clockToMinutes(request.timeFrom) <= minutes &&
          minutes < clockToMinutes(request.timeTo)
        ) {
          held.add(request.employee.id);
        }
        continue;
      }
      // Asked for the whole day and not decided yet: they have said so.
      if (
        request.status === RequestStatus.PENDING &&
        DAY_CATEGORIES.includes(category)
      ) {
        held.add(request.employee.id);
      }
    }
    return held;
  }

  /** A full message for the bot and the panel, a one-liner for SMS. */
  compose(profile: EmployeeProfileEntity, untracked: boolean) {
    const name = profile.user.firstName?.trim() || profile.user.name;
    const greeting = name ? `${name} عزیز` : 'همکار گرامی';
    const line = untracked
      ? 'هنوز اعلام نکرده‌اید که امروز سر کار هستید. لطفاً «امروز هستم» را بزنید.'
      : 'ورود امروز شما هنوز ثبت نشده است. لطفاً ورود خود را ثبت کنید.';
    return {
      text: [
        '⏰ یادآوری ثبت ورود',
        '',
        `${greeting}،`,
        line,
        '',
        'ممنون 🌿',
      ].join('\n'),
      sms: `یادآوری: ${line}`,
    };
  }
}
