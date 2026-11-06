import { EntityManager, RequestContext } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationService } from '../../notification/services/notification.service';
import { TEHRAN_TZ } from '../attendance.constants';
import {
  OnCallPeriodEntity,
  OnCallPeriodStatus,
  OnCallSettingsEntity,
  OnCallShiftEntity,
} from '../entities/oncall.entities';
import { fa } from '../utils/oncall-message.util';
import {
  addDays,
  composeInstant,
  formatJalaliDate,
  jalaliWeekdayName,
  tehranToday,
} from '../utils/attendance-time.util';

/** How long before a shift starts the person is reminded. */
const LEAD_MINUTES = 120;

/** «۲ ساعت دیگر» / «۱ ساعت و ۳۰ دقیقه دیگر» / «۴۰ دقیقه دیگر». */
function untilText(minutes: number): string {
  if (minutes >= LEAD_MINUTES - 10) return `${fa(2)} ساعت دیگر`;
  const rounded = Math.max(5, Math.round(minutes / 5) * 5);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${fa(m)} دقیقه دیگر`;
  return m === 0 ? `${fa(h)} ساعت دیگر` : `${fa(h)} ساعت و ${fa(m)} دقیقه دیگر`;
}

/**
 * Reminds each person shortly before an on-call slot starts. Every slot is
 * reminded once (`reminderSentAt`), only for published periods, and a slot
 * handed over after its reminder went out reminds the new person in turn.
 */
@Injectable()
export class OnCallReminderService {
  private readonly logger = new Logger(OnCallReminderService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly notifications: NotificationService,
  ) {}

  @Cron('*/5 * * * *', { name: 'oncall-reminders', timeZone: TEHRAN_TZ })
  async run(): Promise<void> {
    try {
      // A fresh context: the notification services expect one, as in a request.
      await RequestContext.create(this.em, () => this.sendDue(new Date()));
    } catch (error) {
      this.logger.error(`یادآوری کشیک ناموفق بود: ${error?.message}`);
    }
  }

  async sendDue(now: Date): Promise<number> {
    const em = this.em.fork();
    const today = tehranToday(now);
    const settings = await em.findOne(OnCallSettingsEntity, { id: { $gt: 0 } });
    const eligible = new Set(settings?.memberOrder ?? []);

    const rows = await em.find(
      OnCallShiftEntity,
      {
        date: { $in: [today, addDays(today, 1)] },
        reminderSentAt: null,
      },
      { populate: ['user'] },
    );

    const published = new Map<string, boolean>();
    let sent = 0;

    for (const row of rows) {
      const minutes = Math.ceil(
        (composeInstant(row.date, row.startTime).getTime() - now.getTime()) /
          60000,
      );
      if (minutes <= 0 || minutes > LEAD_MINUTES) continue;
      if (!eligible.has(row.user.id)) continue;

      if (!published.has(row.date)) {
        const period = await em.findOne(
          OnCallPeriodEntity,
          { startDate: { $lte: row.date } },
          { orderBy: { startDate: 'DESC' } },
        );
        published.set(
          row.date,
          period?.status === OnCallPeriodStatus.PUBLISHED,
        );
      }
      if (!published.get(row.date)) continue;

      // Marked first: a failed send is logged, never repeated every five minutes.
      row.reminderSentAt = now;
      await em.flush();

      const { text, sms } = this.compose(row, today, minutes);
      try {
        await this.notifications.sendToUser(row.user.id, text, {
          priority: 'high',
          smsMessage: sms,
          sms: true,
          metadata: { module: 'attendance', link: '/dashboard/oncall' },
        });
        sent++;
      } catch (error) {
        this.logger.warn(
          `یادآوری کشیک برای ${row.user.id} ارسال نشد: ${error?.message}`,
        );
      }
    }
    return sent;
  }

  /** The message: a full one for the bot and the panel, a one-liner for SMS. */
  compose(row: OnCallShiftEntity, today: string, minutes: number) {
    const day = row.date === today ? 'امروز' : 'فردا';
    const when = untilText(minutes);
    const hours = `${fa(row.startTime)} تا ${fa(row.endTime)}`;
    const name = row.user.firstName?.trim() || row.user.name;
    const greeting = name ? `${name} عزیز` : 'همکار گرامی';
    const date = `${jalaliWeekdayName(row.date)} ${fa(
      formatJalaliDate(row.date),
    )}`;

    return {
      text: [
        '⏰ یادآوری کشیک',
        '',
        `${greeting}، کشیک شما ${when} شروع می‌شود.`,
        '',
        `📅 ${day}، ${date}`,
        `🕐 ساعت ${hours}`,
        '',
        'موفق باشید 🌿',
      ].join('\n'),
      sms: `یادآوری کشیک: کشیک شما ${day} ساعت ${hours} است و ${when} شروع می‌شود.`,
    };
  }
}
