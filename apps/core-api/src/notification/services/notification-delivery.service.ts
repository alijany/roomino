import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventTypes } from '../../events/types';
import { NotificationEntity } from '../notification.entity';
import { INotificationChannel } from '../types/notification-channel.interface';
import { SmsNotificationChannel } from '../channels/sms-notification.channel';
import { TelegramNotificationChannel } from '../channels/telegram-notification.channel';
import { EmailNotificationChannel } from '../channels/email-notification.channel';
import { AppPushNotificationChannel } from '../channels/app-push-notification.channel';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  NotificationStatus,
  NotificationType,
} from '../notification.constants';

/**
 * Service responsible for delivering notifications through appropriate channels
 * Uses the Strategy pattern to delegate delivery to specific channel implementations
 */
@Injectable()
export class NotificationDeliveryService {
  private channels: Map<string, INotificationChannel[]> = new Map();

  constructor(
    private smsChannel: SmsNotificationChannel,
    private telegramChannel: TelegramNotificationChannel,
    private emailChannel: EmailNotificationChannel,
    private appPushChannel: AppPushNotificationChannel,
    private readonly notificationRepository: NotificationRepository,
  ) {
    const allChannels: INotificationChannel[] = [
      this.smsChannel,
      this.telegramChannel,
      this.emailChannel,
      this.appPushChannel,
    ];

    // Group channels by type for efficient lookup
    for (const channel of allChannels) {
      const type = channel.type;
      if (!this.channels.has(type)) {
        this.channels.set(type, []);
      }
      this.channels.get(type).push(channel);
    }

    // Sort channels by priority (highest first)
    for (const [, channelList] of this.channels.entries()) {
      channelList.sort((a, b) => b.getPriority() - a.getPriority());
    }
  }

  /**
   * Handle notification created event and deliver through appropriate channel
   */
  @OnEvent(EventTypes.NOTIFICATION_CREATED)
  async handleNotificationCreated(
    notification: NotificationEntity,
  ): Promise<void> {
    try {
      await this.deliverNotification(notification);
      await this.notificationRepository.updateStatus(
        notification.id,
        NotificationStatus.SENT,
        new Date(),
      );
    } catch (error) {
      await this.notificationRepository.updateStatus(
        notification.id,
        NotificationStatus.FAILED,
        undefined,
        error?.message || 'Unknown error',
      );
      console.error(
        `Failed to deliver notification ${notification.id}:`,
        error,
      );
    }
  }

  /**
   * Deliver notification through the appropriate channel
   */
  async deliverNotification(notification: NotificationEntity): Promise<void> {
    // In-panel only: the row itself is the notification.
    if (notification.type === NotificationType.SYSTEM) return;
    const channels = this.channels.get(notification.type) || [];

    for (const channel of channels) {
      if (channel.canHandle(notification)) {
        // Development only simulates what costs money (SMS, email); the Telegram bot is free
        // and only reaches people who started it themselves, so it is really sent.
        if (
          process.env.NODE_ENV === 'development' &&
          notification.type !== NotificationType.TELEGRAM_BOT
        ) {
          console.log(
            `[DEV MODE] Notification delivery simulated for notification ID: ${notification.id} via ${channel.type}.`,
          );
          // Log the notification instead of sending
          console.log(
            `Notification details: ${JSON.stringify(notification, null, 2)}`,
          );
          // In development mode, we skip actual sending
          return;
        }
        await channel.send(notification);
        return; // Successfully sent through this channel
      }
    }

    throw new Error(
      `No suitable channel found for notification type: ${notification.type}`,
    );
  }

  /**
   * Get available channels for a notification type
   */
  getChannelsForType(type: string): INotificationChannel[] {
    return this.channels.get(type) || [];
  }

  /**
   * Check if a notification type is supported
   */
  isTypeSupported(type: string): boolean {
    return this.channels.has(type) && this.channels.get(type).length > 0;
  }
}
