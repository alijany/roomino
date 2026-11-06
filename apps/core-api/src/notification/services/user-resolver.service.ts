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

  /**
   * Telegram once the person has connected the bot. SMS only when the caller
   * asks for it (`options.sms`) and only for someone without Telegram; everything
   * else stays in Telegram and the panel.
   */
  async getAvailableChannels(
    user: UserEntity,
    options?: { sms?: boolean },
  ): Promise<NotificationType[]> {
    const channels: NotificationType[] = [];
    if (user.chatId) channels.push(NotificationType.TELEGRAM_BOT);
    else if (options?.sms && user.phone) channels.push(NotificationType.SMS);
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
