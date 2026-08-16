import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import {
  FinanceActivityAction,
  PaymentRequestStatus,
} from '../finance.constants';
import { PaymentRequestEntity } from './payment-request.entity';

/**
 * Append-only audit trail. Every state transition writes one row; nothing ever
 * updates or deletes one. This is the record that makes the approval controls
 * meaningful after the fact.
 */
@Entity()
@Index({ properties: ['request', 'created_at'] })
export class FinanceActivityEntity extends BaseEntity {
  @ManyToOne(() => PaymentRequestEntity)
  request: PaymentRequestEntity;

  /** Null for system-generated entries (cron jobs, recurring materialisation). */
  @ManyToOne(() => UserEntity, { nullable: true })
  actor?: UserEntity;

  @Enum({ items: () => FinanceActivityAction })
  action: FinanceActivityAction;

  @Enum({ items: () => PaymentRequestStatus, nullable: true })
  fromStatus?: PaymentRequestStatus;

  @Enum({ items: () => PaymentRequestStatus, nullable: true })
  toStatus?: PaymentRequestStatus;

  @Property({ nullable: true })
  comment?: string;

  @Property({ type: 'json', nullable: true })
  meta?: Record<string, unknown>;
}
