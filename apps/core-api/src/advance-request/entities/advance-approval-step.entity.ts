import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import { AdvanceApprovalStepStatus } from '../advance-request.constants';
import { AdvanceRequestEntity } from './advance-request.entity';

/**
 * One rung of an advance request's approval ladder: sequence 0 is the
 * manager, sequence 1 is the finance manager. Steps are sequential — the
 * finance manager only sees the request after the manager decides.
 */
@Entity()
@Index({ properties: ['request', 'sequence'] })
export class AdvanceApprovalStepEntity extends BaseEntity {
  @ManyToOne(() => AdvanceRequestEntity)
  request: AdvanceRequestEntity;

  /** 0-based position in the chain. */
  @Property()
  sequence: number;

  /** Any user holding this role may decide this step. */
  @Enum({ items: () => Role })
  requiredRole: Role;

  @Enum({
    items: () => AdvanceApprovalStepStatus,
    default: AdvanceApprovalStepStatus.PENDING,
  })
  status: AdvanceApprovalStepStatus = AdvanceApprovalStepStatus.PENDING;

  /** Who actually decided. Null while pending. */
  @ManyToOne(() => UserEntity, { nullable: true })
  actor?: UserEntity;

  @Property({ columnType: 'timestamptz', nullable: true })
  decidedAt?: Date;

  @Property({ nullable: true })
  comment?: string;
}
