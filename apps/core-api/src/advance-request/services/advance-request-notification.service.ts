import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../../notification/services/notification.service';
import { Role } from '../../roles/roles.constants';
import { RolesService } from '../../roles/roles.service';
import { AdvanceRequestEntity } from '../entities/advance-request.entity';
import { formatTomanFa, readBigint } from '../utils/money.util';

/**
 * Turns advance-request lifecycle transitions into Persian notifications, on
 * top of the existing multi-channel NotificationService (SMS / Telegram,
 * auto-detected from the user's profile).
 *
 * Notification failures never fail the transition that triggered them.
 * Nothing here is advisory/muteable — an approval request or a rejection is
 * not something a person gets to opt out of.
 */
@Injectable()
export class AdvanceRequestNotificationService {
  private readonly logger = new Logger(AdvanceRequestNotificationService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly rolesService: RolesService,
  ) {}

  private amountText(request: AdvanceRequestEntity): string {
    return formatTomanFa(readBigint(request.amountRial));
  }

  /** For the requester — they have no access to the management detail page. */
  private personalLink(): string {
    return '/dashboard/advance-request';
  }

  /** For CEO/finance-manager — the management review queue's detail page. */
  private reviewLink(request: AdvanceRequestEntity): string {
    return `/dashboard/advance-request/review/${request.id}`;
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
        `ارسال اعلان مساعده برای کاربر ${userId} ناموفق بود: ${error?.message}`,
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

  /** Submitted, or a step passed — the role that owns the next step. */
  async notifyApprovalNeeded(request: AdvanceRequestEntity, role: Role) {
    const message = `درخواست مساعده ${this.amountText(request)} از ${
      request.requester?.name ?? 'یکی از همکاران'
    } در انتظار تأیید شماست.`;

    const userIds = await this.usersWithRole(role);

    await Promise.all(
      userIds.map((id) =>
        this.safeSend(id, message, 'high', {
          requestId: request.id,
          link: this.reviewLink(request),
        }),
      ),
    );
  }

  /** The CEO's step passed; moving on to the finance manager. */
  async notifyStepApproved(request: AdvanceRequestEntity) {
    await this.safeSend(
      request.requester.id,
      'درخواست مساعده شما توسط مدیرعامل تأیید شد و برای تأیید نهایی نزد مدیر مالی ارسال شد.',
      'normal',
      { requestId: request.id, link: this.personalLink() },
    );
  }

  /** Both steps passed. */
  async notifyApproved(request: AdvanceRequestEntity) {
    await this.safeSend(
      request.requester.id,
      `درخواست مساعده شما به مبلغ ${this.amountText(request)} تأیید شد.`,
      'normal',
      { requestId: request.id, link: this.personalLink() },
    );
  }

  async notifyRejected(request: AdvanceRequestEntity, reason: string) {
    await this.safeSend(
      request.requester.id,
      `درخواست مساعده شما رد شد. دلیل: ${reason}`,
      'high',
      { requestId: request.id, link: this.personalLink() },
    );
  }
}
