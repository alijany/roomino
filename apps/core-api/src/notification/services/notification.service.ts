import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventTypes } from '../../events/types';
import { NotificationGetDto } from '../dtos/notification.get.dto';
import {
  NotificationStatus,
  NotificationType,
} from '../notification.constants';
import { NotificationEntity } from '../notification.entity';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  AdminNotificationRequest,
  DirectNotificationRequest,
  LogNotificationRequest,
  NotificationChannelRequest,
  NotificationRequest,
  UserNotificationRequest,
} from '../types/notification-request.types';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Injectable()
export class NotificationService {
  constructor(
    private notificationRepository: NotificationRepository,
    private notificationDispatcher: NotificationDispatcherService,
  ) {}

  @OnEvent(EventTypes.SEND_NOTIFICATION, { async: true })
  async handleSendNotification(
    eventData: NotificationRequest | NotificationRequest[],
  ): Promise<NotificationEntity[]> {
    const events = Array.isArray(eventData) ? eventData : [eventData];
    const allNotifications: NotificationEntity[] = [];

    for (const event of events) {
      try {
        const notifications = await this.notificationDispatcher.dispatch(event);
        allNotifications.push(...notifications);
      } catch (error) {
        console.error('Error processing notification event:', error);
      }
    }

    return allNotifications;
  }

  async sendNotification(
    request: NotificationRequest,
  ): Promise<NotificationEntity[]> {
    return this.notificationDispatcher.dispatch(request);
  }

  async sendToUser(
    userId: number,
    message: string,
    options?: {
      priority?: 'low' | 'normal' | 'high';
      metadata?: Record<string, any>;
      smsMessage?: string;
      preferredChannels?: NotificationType[];
    },
  ): Promise<NotificationEntity[]> {
    const request: UserNotificationRequest = {
      userId,
      message,
      autoDetectChannels: true,
      priority: options?.priority,
      metadata: options?.metadata,
      smsMessage: options?.smsMessage,
    };

    return this.notificationDispatcher.dispatch(request);
  }

  async sendToAdmins(
    message: string,
    options?: {
      priority?: 'low' | 'normal' | 'high';
      metadata?: Record<string, any>;
    },
  ): Promise<NotificationEntity[]> {
    const request: AdminNotificationRequest = {
      sendToAdmins: true,
      message,
      priority: options?.priority,
      metadata: options?.metadata,
    };

    return this.notificationDispatcher.dispatch(request);
  }

  async sendToLog(
    message: string,
    logLevel: 'info' | 'warn' | 'error',
    options?: {
      metadata?: Record<string, any>;
    },
  ): Promise<NotificationEntity[]> {
    const request: LogNotificationRequest = {
      message,
      logLevel,
      metadata: options?.metadata,
    };

    return this.notificationDispatcher.dispatch(request);
  }

  async sendToChannels(
    message: string,
    channels: NotificationChannelRequest[],
    options?: {
      priority?: 'low' | 'normal' | 'high';
      metadata?: Record<string, any>;
    },
  ): Promise<NotificationEntity[]> {
    const request: DirectNotificationRequest = {
      message,
      channels,
      priority: options?.priority,
      metadata: options?.metadata,
    };

    return this.notificationDispatcher.dispatch(request);
  }

  async getPaginatedNotifications(
    filterDto: NotificationGetDto,
    userId: number,
  ): Promise<{
    items: NotificationEntity[];
    meta: {
      page: number;
      limit: number;
      total: number;
      pageCount: number;
    };
  }> {
    return this.notificationRepository.findPaginated(filterDto, userId);
  }

  async getNotificationById(id: number): Promise<NotificationEntity | null> {
    return this.notificationRepository.findById(id);
  }

  async getUnreadCount(userId: number): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      user: userId,
      isRead: false,
    });
    return { count };
  }

  async markAsRead(
    notificationId: number,
    userId: number,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOne({
      id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new Error(
        `Notification with ID ${notificationId} not found for user ${userId}`,
      );
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await this.notificationRepository.persistAndFlush(notification);

    return notification;
  }

  async markAsUnread(
    notificationId: number,
    userId: number,
  ): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOne({
      id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new Error(
        `Notification with ID ${notificationId} not found for user ${userId}`,
      );
    }

    notification.isRead = false;
    notification.readAt = undefined;
    await this.notificationRepository.persistAndFlush(notification);

    return notification;
  }

  async markAllAsRead(userId: number): Promise<{ updated: number }> {
    const [notifications] = await this.notificationRepository.findAll(
      { user: userId, isRead: false },
      {},
    );

    const now = new Date();
    notifications.forEach((notification) => {
      notification.isRead = true;
      notification.readAt = now;
    });

    await this.notificationRepository.persistAndFlush(notifications);

    return { updated: notifications.length };
  }

  async updateStatus(
    id: number,
    status: NotificationStatus,
    sentAt?: Date,
    errorMessage?: string,
  ): Promise<void> {
    return this.notificationRepository.updateStatus(
      id,
      status,
      sentAt,
      errorMessage,
    );
  }
}
