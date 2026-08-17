import { EntityManager, QueryOrder } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Role } from '../../roles/roles.constants';
import { RolesEntity } from '../../roles/roles.entity';
import { PaymentRequestEntity } from '../entities/payment-request.entity';
import {
  PaymentRequestStatus,
  TERMINAL_STATUSES,
  TEHRAN_TZ,
} from '../finance.constants';
import { FinanceNotificationService } from './finance-notification.service';
import { RecurringExpenseService } from './recurring-expense.service';

/** An approval untouched for this long gets a nudge, then an escalation. */
const STALE_APPROVAL_DAYS = 3;

/**
 * The module's scheduled work. These are the first `@Cron` jobs in the
 * codebase — `ScheduleModule` was registered but unused before this.
 *
 * Every job:
 *  - runs on Tehran civil time, because "8am" means 8am in the office;
 *  - is safe to run twice (nothing here is the only guard against duplicates);
 *  - swallows its own errors, so a bad night never stops the API.
 */
@Injectable()
export class FinanceScheduleService {
  private readonly logger = new Logger(FinanceScheduleService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly recurring: RecurringExpenseService,
    private readonly notifications: FinanceNotificationService,
  ) {}

  /**
   * 08:00 Tehran — renewal reminders, and materialising requests that have
   * reached their lead time.
   */
  @Cron('0 8 * * *', { name: 'finance-recurring', timeZone: TEHRAN_TZ })
  async handleRecurring(): Promise<void> {
    try {
      const { reminded, generated } = await this.recurring.runDailyCycle();

      if (reminded || generated) {
        this.logger.log(
          `هزینه‌های دوره‌ای: ${reminded} یادآور ارسال شد، ${generated} درخواست ساخته شد`,
        );
      }
    } catch (error) {
      this.logger.error(
        `اجرای هزینه‌های دوره‌ای ناموفق بود: ${error?.message}`,
      );
    }
  }

  /**
   * 09:00 Tehran — chase what has stalled: payments past their deadline, and
   * approvals nobody has touched.
   */
  @Cron('0 9 * * *', { name: 'finance-nudges', timeZone: TEHRAN_TZ })
  async handleNudges(): Promise<void> {
    try {
      await this.nudgeOverdue();
      await this.nudgeStaleApprovals();
    } catch (error) {
      this.logger.error(`ارسال یادآورهای مالی ناموفق بود: ${error?.message}`);
    }
  }

  private async nudgeOverdue(): Promise<void> {
    const em = this.em.fork();

    const overdue = await em.find(
      PaymentRequestEntity,
      {
        dueDate: { $lt: new Date() },
        status: { $nin: [...TERMINAL_STATUSES] },
      },
      { orderBy: { dueDate: QueryOrder.ASC }, limit: 50 },
    );

    await this.notifications.notifyOverdue(overdue);
  }

  private async nudgeStaleApprovals(): Promise<void> {
    const em = this.em.fork();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_APPROVAL_DAYS);

    const stale = await em.find(
      PaymentRequestEntity,
      {
        status: PaymentRequestStatus.PENDING_APPROVAL,
        submittedAt: { $lt: cutoff },
      },
      { orderBy: { submittedAt: QueryOrder.ASC }, limit: 100 },
    );

    if (stale.length === 0) {
      return;
    }

    const byRole = new Map<Role, PaymentRequestEntity[]>();

    for (const request of stale) {
      if (!request.pendingRole) continue;
      const bucket = byRole.get(request.pendingRole) ?? [];
      bucket.push(request);
      byRole.set(request.pendingRole, bucket);
    }

    await this.notifications.notifyStaleApprovals(byRole, true);
  }

  /**
   * 08:00 Tehran on the 1st — tell Finance and admins last month's numbers are
   * ready. The report itself is computed on demand; this is only the pointer.
   */
  @Cron('0 8 1 * *', { name: 'finance-monthly-report', timeZone: TEHRAN_TZ })
  async handleMonthlyReport(): Promise<void> {
    try {
      const em = this.em.fork();

      const recipients = await em.find(
        RolesEntity,
        { role: { $in: [Role.FINANCE, Role.ADMIN] } },
        { populate: ['user'] as never },
      );

      const userIds = [
        ...new Set(
          recipients
            .map((entry) => entry.user?.id)
            .filter((id): id is number => Boolean(id)),
        ),
      ];

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      await this.notifications.notifyMonthlyReport(
        userIds,
        new Intl.DateTimeFormat('fa-IR', {
          month: 'long',
          year: 'numeric',
        }).format(lastMonth),
      );
    } catch (error) {
      this.logger.error(`اعلام گزارش ماهانه ناموفق بود: ${error?.message}`);
    }
  }
}
