import { Injectable, Logger } from '@nestjs/common';
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
  ) {}

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
