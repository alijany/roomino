import { EntityManager } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../../notification/services/notification.service';
import { Role } from '../../roles/roles.constants';
import { RolesEntity } from '../../roles/roles.entity';
import { RequestStatus, RequestTypeLabels } from '../attendance.constants';
import { AttendanceRequestEntity } from '../entities/attendance-request.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { JobGroupEntity } from '../entities/job-group.entity';
import { periodLabel } from '../utils/attendance-view.util';

/**
 * Persian notifications for the request lifecycle, over the shared
 * multi-channel NotificationService. A failed SMS never fails the request
 * it is about.
 */
@Injectable()
export class AttendanceNotificationService {
  private readonly logger = new Logger(AttendanceNotificationService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly notificationService: NotificationService,
  ) {}

  private async safeSend(userId: number, message: string, link: string) {
    try {
      await this.notificationService.sendToUser(userId, message, {
        priority: 'normal',
        metadata: { module: 'attendance', link },
      });
    } catch (error) {
      this.logger.warn(
        `ارسال اعلان حضور و غیاب برای کاربر ${userId} ناموفق بود: ${error?.message}`,
      );
    }
  }

  /**
   * Who should decide on a person's request: the approvers of their job
   * group, else HR, else admins. Never the requester.
   */
  private async reviewersFor(
    profile: EmployeeProfileEntity,
  ): Promise<number[]> {
    const requesterId = profile.user.id;
    let ids: number[] = [];

    if (profile.jobGroup) {
      const group = await this.em.findOne(
        JobGroupEntity,
        { id: profile.jobGroup.id },
        { populate: ['approvers'] },
      );
      ids = group?.approvers.getItems().map((u) => u.id) ?? [];
    }

    for (const role of [Role.HR, Role.ADMIN]) {
      if (ids.filter((id) => id !== requesterId).length) break;
      const holders = await this.em.find(RolesEntity, { role });
      ids = holders.map((r) => r.user.id);
    }

    return [...new Set(ids)].filter((id) => id !== requesterId);
  }

  async requestSubmitted(
    request: AttendanceRequestEntity,
    profile: EmployeeProfileEntity,
  ) {
    try {
      const reviewers = await this.reviewersFor(profile);
      const message = `درخواست ${RequestTypeLabels[request.type]} ${
        profile.user.name ?? 'یکی از همکاران'
      } (${periodLabel(request)}) در انتظار بررسی شماست.`;

      await Promise.all(
        reviewers.map((id) =>
          this.safeSend(id, message, '/dashboard/attendance/requests'),
        ),
      );
    } catch (error) {
      this.logger.warn(`اعلان ثبت درخواست ارسال نشد: ${error?.message}`);
    }
  }

  async requestDecided(request: AttendanceRequestEntity, userId: number) {
    const verdict =
      request.status === RequestStatus.APPROVED ? 'تایید شد' : 'رد شد';
    const note =
      request.status === RequestStatus.REJECTED && request.reviewNote
        ? ` — ${request.reviewNote}`
        : '';

    await this.safeSend(
      userId,
      `درخواست ${RequestTypeLabels[request.type]} شما (${periodLabel(
        request,
      )}) ${verdict}${note}`,
      '/dashboard/attendance/my-requests',
    );
  }
}
