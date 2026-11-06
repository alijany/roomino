import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { Role } from '../../roles/roles.constants';
import { RolesService } from '../../roles/roles.service';
import { UserEntity } from '../../user/user.entity';
import { NotificationType } from '../notification.constants';
import { IUserResolver } from '../types/user-resolver.interface';

@Injectable()
export class UserResolverService implements IUserResolver {
  constructor(
    private rolesService: RolesService,
    private readonly userService: UserService,
  ) {}

  async getUserById(userId: number): Promise<UserEntity | null> {
    return this.userService.findOne({ id: userId });
  }

  async getAdminUsers(): Promise<UserEntity[]> {
    try {
      const adminRoles = await this.rolesService.findAll(
        { role: Role.ADMIN },
        { populate: ['user'] as never },
      );

      return adminRoles[0].map((role) => role.user);
    } catch (error) {
      console.error('Failed to fetch admin users:', error);
      return [];
    }
  }

  async getAvailableChannels(user: UserEntity): Promise<NotificationType[]> {
    const channels: NotificationType[] = [];

    // Telegram first: once a user has connected the bot, notifications go
    // only there; SMS is the fallback for people who have not.
    if (user.chatId) {
      channels.push(NotificationType.TELEGRAM_BOT);
    } else if (user.phone) {
      channels.push(NotificationType.SMS);
    }

    return channels;
  }

  async hasChannel(
    user: UserEntity,
    channel: NotificationType,
  ): Promise<boolean> {
    const availableChannels = await this.getAvailableChannels(user);
    return availableChannels.includes(channel);
  }
}
