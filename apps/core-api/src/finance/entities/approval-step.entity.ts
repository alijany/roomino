import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import { ApprovalStepStatus } from '../finance.constants';
import { PaymentRequestEntity } from './payment-request.entity';

/**
 * One rung of a request's approval ladder, materialised at submit time from the
 * approval matrix in force at that moment.
 *
 * Steps are sequential, not parallel: the second approver only sees the request
 * after the first decides, so an approval carries real signal.
 */
@Entity()
@Index({ properties: ['request', 'sequence'] })
export class ApprovalStepEntity extends BaseEntity {
  @ManyToOne(() => PaymentRequestEntity)
  request: PaymentRequestEntity;

  /** 0-based position in the chain. */
  @Property()
  sequence: number;

  /** Any user holding this role may decide this step. */
  @Enum({ items: () => Role })
  requiredRole: Role;

  @Enum({
    items: () => ApprovalStepStatus,
    default: ApprovalStepStatus.PENDING,
  })
  status: ApprovalStepStatus = ApprovalStepStatus.PENDING;

  /** Who actually decided. Null while pending. */
  @ManyToOne(() => UserEntity, { nullable: true })
  actor?: UserEntity;

  @Property({ columnType: 'timestamptz', nullable: true })
  decidedAt?: Date;

  @Property({ nullable: true })
  comment?: string;
}
