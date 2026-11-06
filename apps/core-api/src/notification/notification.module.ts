import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { NotificationEntity } from './notification.entity';
import { NotificationPreferenceEntity } from './notification-preference.entity';
import { NotificationService } from './services/notification.service';
import { SmsModule } from '../sms/sms.module';
import { SettingsModule } from '../settings/settings.module';
import { NotificationController } from './notification.controller';
import { RolesModule } from '../roles/roles.module';

// New services and repositories
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationPreferenceRepository } from './repositories/notification-preference.repository';
import { UserResolverService } from './services/user-resolver.service';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramController } from './telegram.controller';

// Notification channels
import { SmsNotificationChannel } from './channels/sms-notification.channel';
import { TelegramNotificationChannel } from './channels/telegram-notification.channel';
import { EmailNotificationChannel } from './channels/email-notification.channel';
import { AppPushNotificationChannel } from './channels/app-push-notification.channel';

// Factory
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      NotificationEntity,
      NotificationPreferenceEntity,
    ]),
    SmsModule,
    SettingsModule,
    RolesModule,
    UserModule,
  ],
  controllers: [NotificationController, TelegramController],
  providers: [
    // Core services
    NotificationService,
    NotificationPreferenceService,
    TelegramBotService,

    // Repository
    NotificationRepository,
    NotificationPreferenceRepository,

    // Business logic services
    UserResolverService,
    NotificationDispatcherService,

    // Channel implementations
    SmsNotificationChannel,
    TelegramNotificationChannel,
    EmailNotificationChannel,
    AppPushNotificationChannel,

    // Delivery service with channel injection
    NotificationDeliveryService,
  ],
  exports: [
    NotificationService,
    NotificationRepository,
    UserResolverService,
    NotificationPreferenceService,
  ],
})
export class NotificationModule {}
