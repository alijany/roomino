import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { BaseNotificationChannel } from './base-notification.channel';
import { NotificationEntity } from '../notification.entity';
import { NotificationType } from '../notification.constants';
import { IntegrationSettingsService } from '../../settings/integration-settings.service';
import { NotificationRepository } from '../repositories/notification.repository';

@Injectable()
export class TelegramNotificationChannel extends BaseNotificationChannel {
  // Type getter for better type inference
  get type(): NotificationType {
    return NotificationType.TELEGRAM_BOT;
  }

  constructor(
    protected notificationRepository: NotificationRepository,
    private integrations: IntegrationSettingsService,
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

    const { token, apiBase } = await this.integrations.telegram();
    if (!token) {
      throw new Error(`No bot token configured for ${notification.type}`);
    }

    await axios.post(`${apiBase}/bot${token}/sendMessage`, {
      chat_id: notification.recipientChatId,
      text: notification.message,
    });
  }

  getPriority(): number {
    return 3; // High priority for Telegram
  }
}
