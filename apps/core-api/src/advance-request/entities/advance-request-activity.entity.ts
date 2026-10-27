import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import {
  AdvanceActivityAction,
  AdvanceRequestStatus,
} from '../advance-request.constants';
import { AdvanceRequestEntity } from './advance-request.entity';

/**
 * Append-only audit trail. Every state transition writes one row; nothing
 * ever updates or deletes one.
 */
@Entity()
@Index({ properties: ['request', 'created_at'] })
export class AdvanceRequestActivityEntity extends BaseEntity {
  @ManyToOne(() => AdvanceRequestEntity)
  request: AdvanceRequestEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  actor?: UserEntity;

  @Enum({ items: () => AdvanceActivityAction })
  action: AdvanceActivityAction;

  @Enum({ items: () => AdvanceRequestStatus, nullable: true })
  fromStatus?: AdvanceRequestStatus;

  @Enum({ items: () => AdvanceRequestStatus, nullable: true })
  toStatus?: AdvanceRequestStatus;

  @Property({ nullable: true })
  comment?: string;
}
