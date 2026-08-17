import { Injectable, Logger } from '@nestjs/common';
import { NotificationCategory } from '../../notification/notification.constants';
import { NotificationPreferenceService } from '../../notification/services/notification-preference.service';
import { NotificationService } from '../../notification/services/notification.service';
import { Role } from '../../roles/roles.constants';
import { RolesService } from '../../roles/roles.service';
import { PaymentRequestEntity } from '../entities/payment-request.entity';
import { Currency } from '../finance.constants';
import { formatTomanFa, readBigint, toRial } from '../utils/money.util';

/**
 * Turns lifecycle transitions into Persian notifications, on top of the
 * existing multi-channel NotificationService (SMS / Telegram, auto-detected
 * from the user's profile).
 *
 * Notification failures never fail the transition that triggered them — a
 * payment that was approved stays approved even if the SMS gateway is down.
 */
@Injectable()
export class FinanceNotificationService {
  private readonly logger = new Logger(FinanceNotificationService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly rolesService: RolesService,
    private readonly preferences: NotificationPreferenceService,
  ) {}

  /**
   * Whether the user has explicitly muted the finance category.
   *
   * Deliberately *not* `NotificationPreferenceService.isNotificationEnabled()`:
   * that returns false when no preference row exists, which would silence
   * everyone who has never opened the settings page. Absence of a preference
   * means "not muted".
   *
   * Only advisory notifications consult this. An approval request or a payment
   * failure is not something a person gets to opt out of — a silently ignored
   * approval is how a deadline gets missed.
   */
  private async isMuted(userId: number): Promise<boolean> {
    try {
      const preference = await this.preferences.getPreferenceByCategory(
        userId,
        NotificationCategory.FINANCE,
      );

      return preference ? !preference.enabled : false;
    } catch {
      return false;
    }
  }

  /** Human-readable amount for a notification body. */
  private amountText(request: PaymentRequestEntity): string {
    const amount = readBigint(request.amountMinor);

    if (request.currency === Currency.IRR) {
      return formatTomanFa(toRial(amount, Currency.IRR));
    }

    const major = amount / 100;
    return `${major.toLocaleString('fa-IR')} ${request.currency}`;
  }

  private link(request: PaymentRequestEntity): string {
    return `/dashboard/finance/requests/${request.id}`;
  }

  private async safeSend(
    userId: number,
    message: string,
    priority: 'low' | 'normal' | 'high',
    metadata: Record<string, unknown>,
  ) {
    try {
      await this.notificationService.sendToUser(userId, message, {
        priority,
        metadata,
      });
    } catch (error) {
      this.logger.warn(
        `ارسال اعلان مالی برای کاربر ${userId} ناموفق بود: ${error?.message}`,
      );
    }
  }

  /** Everyone currently holding a role, used to reach "the approvers". */
  private async usersWithRole(role: Role): Promise<number[]> {
    const [roles] = await this.rolesService.findAll(
      { role },
      { populate: ['user'] as never },
    );

    return roles
      .map((entry) => entry.user?.id)
      .filter((id): id is number => Boolean(id));
  }

  /** Submitted → the role that owns the next outstanding approval step. */
  async notifyApprovalNeeded(request: PaymentRequestEntity, role: Role) {
    const message =
      `درخواست پرداخت ${this.amountText(request)} از ${
        request.requester?.name ?? 'یکی از همکاران'
      } ` + `در انتظار تأیید شماست: ${request.title}`;

    const userIds = await this.usersWithRole(role);

    await Promise.all(
      userIds.map((id) =>
        this.safeSend(id, message, 'high', {
          requestId: request.id,
          link: this.link(request),
        }),
      ),
    );
  }

  /** A step passed but the chain continues. */
  async notifyStepApproved(request: PaymentRequestEntity) {
    await this.safeSend(
      request.requester.id,
      `یک مرحله از تأیید درخواست «${request.title}» انجام شد.`,
      'normal',
      { requestId: request.id, link: this.link(request) },
    );
  }

  /** Fully approved → the Finance queue. */
  async notifyReadyToPay(request: PaymentRequestEntity) {
    const message = `درخواست پرداخت «${
      request.title
    }» به مبلغ ${this.amountText(request)} تأیید شد و آماده پرداخت است.`;

    const financeUsers = await this.usersWithRole(Role.FINANCE);

    await Promise.all(
      financeUsers.map((id) =>
        this.safeSend(id, message, 'high', {
          requestId: request.id,
          link: this.link(request),
        }),
      ),
    );

    await this.safeSend(
      request.requester.id,
      'درخواست شما تأیید شد و به مالی رفت.',
      'normal',
      { requestId: request.id, link: this.link(request) },
    );
  }

  async notifyNeedsInfo(request: PaymentRequestEntity, reason: string) {
    await this.safeSend(
      request.requester.id,
      `درخواست «${request.title}» نیازمند اصلاح است: ${reason}`,
      'high',
      { requestId: request.id, link: this.link(request) },
    );
  }

  async notifyRejected(request: PaymentRequestEntity, reason: string) {
    await this.safeSend(
      request.requester.id,
      `درخواست «${request.title}» رد شد. دلیل: ${reason}`,
      'high',
      { requestId: request.id, link: this.link(request) },
    );
  }

  async notifyPaid(request: PaymentRequestEntity, referenceNumber?: string) {
    const reference = referenceNumber ? ` شماره پیگیری ${referenceNumber}` : '';

    await this.safeSend(
      request.requester.id,
      `درخواست «${request.title}» پرداخت شد.${reference}`,
      'normal',
      { requestId: request.id, link: this.link(request) },
    );
  }

  /**
   * A subscription is coming up for renewal.
   *
   * Addressed to the schedule's owner, not Finance, and phrased as a decision
   * rather than an FYI — converting a passive notice into a spend decision is
   * the entire value of renewal tracking. Silenceable: unlike an approval, this
   * is advisory.
   */
  async notifyRenewalDue(
    ownerId: number,
    schedule: {
      id: number;
      title: string;
      vendorName: string;
      amountMinor: number;
      currency: Currency;
    },
    daysRemaining: number,
  ) {
    if (await this.isMuted(ownerId)) {
      return;
    }

    const amount =
      schedule.currency === Currency.IRR
        ? formatTomanFa(toRial(schedule.amountMinor, Currency.IRR))
        : `${(schedule.amountMinor / 100).toLocaleString('fa-IR')} ${
            schedule.currency
          }`;

    const when =
      daysRemaining <= 1
        ? 'فردا'
        : `تا ${daysRemaining.toLocaleString('fa-IR')} روز دیگر`;

    await this.safeSend(
      ownerId,
      `«${schedule.title}» (${schedule.vendorName}) ${when} تمدید می‌شود — ${amount}. ادامه می‌دهیم؟`,
      daysRemaining <= 7 ? 'high' : 'normal',
      {
        recurringExpenseId: schedule.id,
        link: '/dashboard/finance/recurring',
      },
    );
  }

  /** A payment is past its deadline and still sitting in the queue. */
  async notifyOverdue(requests: PaymentRequestEntity[]) {
    if (requests.length === 0) {
      return;
    }

    const message =
      `${requests.length.toLocaleString(
        'fa-IR',
      )} درخواست پرداخت از مهلت خود گذشته‌اند. ` +
      `نزدیک‌ترین: «${requests[0].title}».`;

    const financeUsers = await this.usersWithRole(Role.FINANCE);

    await Promise.all(
      financeUsers.map((id) =>
        this.safeSend(id, message, 'high', {
          link: '/dashboard/finance/queue',
        }),
      ),
    );
  }

  /**
   * An approval has been sitting untouched. Nudges the role that owns it; the
   * escalation to admin is what stops a request dying in someone's inbox.
   */
  async notifyStaleApprovals(
    byRole: Map<Role, PaymentRequestEntity[]>,
    escalateToAdmin: boolean,
  ) {
    for (const [role, requests] of byRole) {
      if (requests.length === 0) continue;

      const message = `${requests.length.toLocaleString(
        'fa-IR',
      )} درخواست پرداخت بیش از سه روز است در انتظار تأیید شماست.`;

      const targets = await this.usersWithRole(role);

      await Promise.all(
        targets.map((id) =>
          this.safeSend(id, message, 'normal', {
            link: '/dashboard/finance/approvals',
          }),
        ),
      );

      if (escalateToAdmin && role !== Role.ADMIN) {
        const admins = await this.usersWithRole(Role.ADMIN);
        await Promise.all(
          admins.map((id) =>
            this.safeSend(
              id,
              `${requests.length.toLocaleString(
                'fa-IR',
              )} درخواست پرداخت بیش از سه روز بدون تأیید مانده است.`,
              'normal',
              { link: '/dashboard/finance/approvals' },
            ),
          ),
        );
      }
    }
  }

  /** Monthly close is ready to look at. Advisory, so silenceable. */
  async notifyMonthlyReport(userIds: number[], label: string) {
    await Promise.all(
      userIds.map(async (id) => {
        if (await this.isMuted(id)) return;

        await this.safeSend(id, `گزارش مالی ${label} آماده است.`, 'low', {
          link: '/dashboard/finance/reports',
        });
      }),
    );
  }

  async notifyPaymentFailed(request: PaymentRequestEntity, reason: string) {
    const message = `پرداخت درخواست «${request.title}» انجام نشد و به صف پرداخت برگشت. دلیل: ${reason}`;

    const financeUsers = await this.usersWithRole(Role.FINANCE);

    await Promise.all([
      ...financeUsers.map((id) =>
        this.safeSend(id, message, 'high', {
          requestId: request.id,
          link: this.link(request),
        }),
      ),
      this.safeSend(request.requester.id, message, 'high', {
        requestId: request.id,
        link: this.link(request),
      }),
    ]);
  }
}
