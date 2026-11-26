import { Injectable, OnModuleInit } from '@nestjs/common';
import { TelegramBotService } from '../../notification/services/telegram-bot.service';
import { AttendanceMode, RequestType } from '../attendance.constants';
import { tehranToday } from '../utils/attendance-time.util';
import { AttendanceModeService } from './attendance-mode.service';
import { AttendanceService } from './attendance.service';
import { EmployeeService } from './employee.service';
import { PresenceService } from './presence.service';
import { RequestService } from './request.service';

/** Button data of the check-in reminder: `ci:<p|r>:<date>`. */
export const CHECKIN_BUTTON_PREFIX = 'ci';
/** p: here today · r: remote today · e: entitled leave today · s: sick leave today (old messages). */
export type CheckinButtonAction = 'p' | 'r' | 'e' | 's';

export const checkinButtonData = (action: CheckinButtonAction, date: string) =>
  `${CHECKIN_BUTTON_PREFIX}:${action}:${date}`;

/**
 * The buttons under the check-in reminder in Telegram. «ثبت ورود / امروز
 * هستم», «دورکاری هستم» and «مرخصی استحقاقی» do in one tap what the panel
 * does — with no position, as Telegram sends none — through the same
 * services, so every rule (radius, self-declared mode, approvals, leave caps)
 * is the panel's own.
 */
@Injectable()
export class CheckinActionService implements OnModuleInit {
  constructor(
    private readonly bot: TelegramBotService,
    private readonly employees: EmployeeService,
    private readonly modes: AttendanceModeService,
    private readonly presence: PresenceService,
    private readonly attendance: AttendanceService,
    private readonly requests: RequestService,
  ) {}

  onModuleInit() {
    this.bot.registerCallbackHandler(CHECKIN_BUTTON_PREFIX, (userId, data) =>
      this.handle(userId, data),
    );
  }

  async handle(userId: number, data: string) {
    const [, action, date] = data.split(':');
    if (date !== tehranToday()) {
      return { text: 'این یادآوری مربوط به روز دیگری است.', done: true };
    }

    const profile = await this.employees.findByUser(userId);
    if (!profile?.active) {
      return { text: 'پروفایل حضور و غیاب شما فعال نیست.', done: true };
    }

    const remote = action === 'r';
    try {
      if (action === 'e' || action === 's') {
        // A day of leave, sent to the approver like one filed in the panel.
        // `s` (sick) stays for reminders sent before the button became «e».
        const sick = action === 's';
        await this.requests.submit(profile, {
          type: sick
            ? RequestType.LEAVE_SICK_DAILY
            : RequestType.LEAVE_ENTITLED_DAILY,
          dateFrom: date,
          dateTo: date,
          description: 'ثبت از تلگرام',
        });
        const name = profile.user.firstName?.trim() || profile.user.name;
        const greeting = name ? `${name} عزیز` : 'همکار گرامی';
        return {
          text: sick
            ? 'مرخصی استعلاجی امروز ثبت و برای تأیید ارسال شد.'
            : 'مرخصی استحقاقی امروز ثبت و برای تأیید ارسال شد.',
          done: true,
          followUp: sick
            ? [
                `${greeting}، امیدواریم هرچه زودتر حالتان بهتر شود.`,
                'امروز استراحت کنید و به خودتان برسید؛ کارها می‌توانند منتظر بمانند.',
                '',
                'برایتان آرزوی سلامتی داریم 🤍',
              ].join('\n')
            : undefined,
        };
      }

      const untracked =
        (await this.modes.on(profile.id)) === AttendanceMode.UNTRACKED;
      const result = untracked
        ? await this.presence.declare(profile, { remote })
        : await this.attendance.checkIn(profile, { remote });
      if (result.success) return { text: result.message, done: true };
      return {
        text: `${result.message} لطفاً از پنل ثبت کنید.`,
        done: false,
      };
    } catch (error) {
      // The services explain themselves in Persian (not a working day, on leave…).
      const message = (error as { message?: string }).message;
      return {
        text: message || 'انجام نشد. لطفاً از پنل اقدام کنید.',
        done: false,
      };
    }
  }
}
