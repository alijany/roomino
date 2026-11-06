import { UserEntity } from '../../user/user.entity';
import { NotificationType } from '../notification.constants';

/**
 * Interface for resolving user information and channels
 */
export interface IUserResolver {
  /**
   * Get user by ID
   */
  getUserById(userId: number): Promise<UserEntity | null>;

  /**
   * Get all admin users
   */
  getAdminUsers(): Promise<UserEntity[]>;

  /**
   * Get available notification channels for a user
   */
  getAvailableChannels(
    user: UserEntity,
    options?: { sms?: boolean },
  ): Promise<NotificationType[]>;

  /**
   * Check if user has a specific notification channel available
   */
  hasChannel(user: UserEntity, channel: NotificationType): Promise<boolean>;
}
