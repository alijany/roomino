import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BaseNotificationChannel } from './base-notification.channel';
import { NotificationEntity } from '../notification.entity';
import { NotificationType } from '../notification.constants';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class TelegramNotificationChannel extends BaseNotificationChannel {
  // Type getter for better type inference
  get type(): NotificationType {
    return NotificationType.TELEGRAM_BOT;
  }

  constructor(
    protected notificationRepository: NotificationRepository,
    private configService: ConfigService,
  ) {
    super(notificationRepository);
  }

  canHandle(notification: NotificationEntity): boolean {
    const telegramTypes = [NotificationType.TELEGRAM_BOT];

    return (
      telegramTypes.includes(notification.type) &&
      !!notification.recipientChatId
    );
  }

  async send(notification: NotificationEntity): Promise<void> {
    if (!notification.recipientChatId) {
      throw new Error('Telegram notification missing recipient chat ID');
    }

    const botToken = this.getBotToken(notification.type);
    if (!botToken) {
      throw new Error(`No bot token configured for ${notification.type}`);
    }

    const base =
      this.configService.get<string>('TELEGRAM_API_BASE') ||
      'https://api.telegram.org';
    await axios.post(`${base}/bot${botToken}/sendMessage`, {
      chat_id: notification.recipientChatId,
      text: notification.message,
    });
  }

  private getBotToken(type: NotificationType): string | null {
    switch (type) {
      case NotificationType.TELEGRAM_BOT:
        return this.configService.get<string>('TELEGRAM_BOT_TOKEN');
      default:
        return null;
    }
  }

  getPriority(): number {
    return 3; // High priority for Telegram
  }
}
