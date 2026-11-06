import { Entity, Enum, ManyToOne, Property, types } from '@mikro-orm/core';
import { BaseEntity } from '../libs/orm/orm.entity.base';
import { UserEntity } from '../user/user.entity';
import {
  NotificationType,
  NotificationStatus,
  NotificationCategory,
} from './notification.constants';

@Entity()
export class NotificationEntity extends BaseEntity {
  @ManyToOne(() => UserEntity, { nullable: true })
  user?: UserEntity;

  @Property({ nullable: true })
  recipientPhone?: string;

  @Property({ nullable: true, type: types.bigint })
  recipientChatId?: number;

  @Enum({ items: () => NotificationType })
  type: NotificationType;

  @Enum({
    items: () => NotificationCategory,
    default: NotificationCategory.GENERAL,
  })
  category: NotificationCategory;

  /** Long on purpose: a published on-call period lists every day of a person's. */
  @Property({ type: 'text' })
  message: string;

  @Property({ nullable: true })
  link?: string;

  @Property({ type: 'json' })
  metadata: Record<string, any>;

  @Enum({
    items: () => NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Property({ default: 'normal' })
  priority: 'low' | 'normal' | 'high';

  @Property({ default: false })
  isRead: boolean;

  @Property({ nullable: true })
  readAt?: Date;

  @Property({ nullable: true })
  sentAt?: Date;

  @Property({ nullable: true })
  errorMessage?: string;
}
