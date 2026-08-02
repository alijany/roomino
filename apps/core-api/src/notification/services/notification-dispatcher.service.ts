import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventTypes } from '../../events/types';
import { NotificationType } from '../notification.constants';
import { NotificationEntity } from '../notification.entity';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  AdminNotificationRequest,
  DirectNotificationRequest,
  isAdminNotificationRequest,
  isDirectNotificationRequest,
  isLogNotificationRequest,
  isUserNotificationRequest,
  LogNotificationRequest,
  NotificationChannelRequest,
  NotificationRequest,
  UserNotificationRequest,
} from '../types/notification-request.types';
import { UserResolverService } from './user-resolver.service';
import { ConfigService } from '@nestjs/config';

/**
 * Service responsible for dispatching notifications based on different request types
 * This service handles the business logic of determining how and where to send notifications
 */
@Injectable()
export class NotificationDispatcherService {
  constructor(
    private notificationRepository: NotificationRepository,
    private userResolver: UserResolverService,
    private readonly configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Main entry point for sending notifications
   * Routes to appropriate handler based on request type
   */
  async dispatch(request: NotificationRequest): Promise<NotificationEntity[]> {
    try {
      if (isDirectNotificationRequest(request)) {
        return this.handleDirectRequest(request);
      }

      if (isUserNotificationRequest(request)) {
        return this.handleUserRequest(request);
      }

      if (isAdminNotificationRequest(request)) {
        return this.handleAdminRequest(request);
      }

      if (isLogNotificationRequest(request)) {
        return this.handleLogNotification(request);
      }

      throw new Error('Invalid notification request type');
    } catch (error) {
      console.error('Failed to dispatch notification:', error);
      throw error;
    }
  }

  /**
   * Handle direct channel notifications
   */
  private async handleDirectRequest(
    request: DirectNotificationRequest,
  ): Promise<NotificationEntity[]> {
    const notifications: NotificationEntity[] = [];

    for (const channel of request.channels) {
      const notification = await this.createNotification({
        type: channel.type,
        user: request.userId,
        message: channel.message || request.message,
        recipientPhone: channel.recipientPhone,
        recipientChatId: channel.recipientChatId,
        link: request.link,
        metadata: request.metadata || {},
        priority: request.priority || 'normal',
      });

      notifications.push(notification);
      await this.emitForDelivery(notification);
    }

    return notifications;
  }

  /**
   * Handle user-targeted notifications with channel auto-detection
   */
  private async handleUserRequest(
    request: UserNotificationRequest,
  ): Promise<NotificationEntity[]> {
    const user = await this.userResolver.getUserById(request.userId);

    if (!user) {
      throw new Error(`User with ID ${request.userId} not found`);
    }

    // Auto-detect channels if requested
    if (request.autoDetectChannels) {
      const availableChannels = await this.userResolver.getAvailableChannels(
        user,
      );
      const channels = this.buildChannelsFromTypes(
        availableChannels,
        user,
        request,
      );

      if (channels.length === 0) {
        console.warn(`No available channels found for user ${request.userId}`);
        return [];
      }

      return this.handleDirectRequest({
        ...request,
        channels,
      });
    }

    // Use preferred channels if specified
    if (request.preferredChannels) {
      const channels = this.buildChannelsFromTypes(
        request.preferredChannels,
        user,
        request,
      );
      return this.handleDirectRequest({
        ...request,
        channels,
      });
    }

    // Fallback: create single notification with user reference
    const notification = await this.createNotification({
      type: NotificationType.SYSTEM,
      message: request.message,
      user: user.id,
      link: request.link,
      metadata: request.metadata || {},
      priority: request.priority || 'normal',
    });

    await this.emitForDelivery(notification);
    return [notification];
  }

  /**
   * Handle admin notifications
   */
  private async handleAdminRequest(
    request: AdminNotificationRequest,
  ): Promise<NotificationEntity[]> {
    const adminUsers = await this.userResolver.getAdminUsers();

    if (adminUsers.length === 0) {
      console.warn('No admin users found for admin notification');
      return [];
    }

    const allNotifications: NotificationEntity[] = [];

    for (const admin of adminUsers) {
      try {
        const userRequest: UserNotificationRequest = {
          userId: admin.id,
          message: request.message,
          metadata: request.metadata,
          priority: request.priority,
          autoDetectChannels: true,
        };

        const notifications = await this.handleUserRequest(userRequest);
        allNotifications.push(...notifications);
      } catch (error) {
        console.error(
          `Failed to send notification to admin ${admin.id}:`,
          error,
        );
        // Continue with other admins
      }
    }

    return allNotifications;
  }

  /**
   * Handle log notifications
   */
  private async handleLogNotification(
    request: LogNotificationRequest,
  ): Promise<NotificationEntity[]> {
    const logChatId = this.configService.get<number>('BACKUP_CHAT_ID');
    if (!logChatId) {
      console.warn('No backup chat ID configured for log notifications');
      return [];
    }
    const notification = await this.createNotification({
      type: NotificationType.TELEGRAM_BOT,
      message: request.message,
      user: request.userId,
      metadata: request.metadata ?? {},
      recipientChatId: logChatId,
      priority: request.priority ?? 'normal',
    });
    await this.emitForDelivery(notification);
    return [notification];
  }

  /**
   * Build channel requests from notification types and user data
   */
  private buildChannelsFromTypes(
    types: NotificationType[],
    user: any,
    request: UserNotificationRequest,
  ): NotificationChannelRequest[] {
    const channels: NotificationChannelRequest[] = [];

    for (const type of types) {
      const channel: NotificationChannelRequest = { type };

      // Set recipient information based on channel type
      switch (type) {
        case NotificationType.SMS:
          if (user.phone) {
            channel.recipientPhone = user.phone;
            // Use SMS-specific message if provided
            if (request.smsMessage) {
              channel.message = request.smsMessage;
            }
          }
          break;

        case NotificationType.TELEGRAM_BOT:
          if (user.chatId) {
            channel.recipientChatId = user.chatId;
          }
          break;

        // Add other channel types as needed
      }

      channels.push(channel);
    }

    return channels;
  }

  /**
   * Create a notification entity
   */
  private async createNotification(data: {
    type: NotificationType;
    message: string;
    user?: number;
    recipientPhone?: string;
    link?: string;
    recipientChatId?: number;
    metadata: Record<string, any>;
    priority: 'low' | 'normal' | 'high';
  }): Promise<NotificationEntity> {
    return this.notificationRepository.create(data);
  }

  /**
   * Emit notification for delivery by channel providers
   */
  private async emitForDelivery(
    notification: NotificationEntity,
  ): Promise<void> {
    await this.eventEmitter.emitAsync(
      EventTypes.NOTIFICATION_CREATED,
      notification,
    );
  }
}
