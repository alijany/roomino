import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserEntity } from '../user/user.entity';
import {
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
} from './dtos/notification-preference.dto';
import { NotificationGetDto } from './dtos/notification.get.dto';
import { NotificationCategory } from './notification.constants';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationService } from './services/notification.service';
import { TelegramBotService } from './services/telegram-bot.service';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationPreferenceService: NotificationPreferenceService,
    private readonly telegram: TelegramBotService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @Get()
  async getNotifications(
    @Query() filterDto: NotificationGetDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.notificationService.getPaginatedNotifications(
      filterDto,
      user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: UserEntity) {
    return this.notificationService.getUnreadCount(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/unread')
  async markAsUnread(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    return this.notificationService.markAsUnread(id, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mark-all-read')
  async markAllAsRead(@CurrentUser() user: UserEntity) {
    return this.notificationService.markAllAsRead(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('telegram')
  telegramStatus(@CurrentUser() user: UserEntity) {
    return this.telegram.status(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('telegram/link')
  telegramLink(@CurrentUser() user: UserEntity) {
    return { url: this.telegram.createLinkUrl(user.id) };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('telegram')
  telegramDisconnect(@CurrentUser() user: UserEntity) {
    return this.telegram.disconnect(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  async getPreferences(@CurrentUser() user: UserEntity) {
    return this.notificationPreferenceService.getUserPreferences(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('preferences')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createPreference(
    @Body() dto: CreateNotificationPreferenceDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.notificationPreferenceService.createPreference(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences/:category')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updatePreference(
    @Param('category') category: NotificationCategory,
    @Body() dto: UpdateNotificationPreferenceDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.notificationPreferenceService.updatePreference(
      user.id,
      category,
      dto,
    );
  }
}
