import {
  Collection,
  Entity,
  Enum,
  Index,
  ManyToOne,
  OneToMany,
  Property,
  types,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import { AdvanceRequestStatus } from '../advance-request.constants';
import { AdvanceApprovalStepEntity } from './advance-approval-step.entity';

/**
 * A personnel request for a salary/financial advance (مساعده مالی).
 *
 * Deliberately independent from the `finance` module's PaymentRequestEntity,
 * which is shaped for company-to-external-vendor payments (bank/online
 * destinations, vendor snapshotting). An advance is paid to the employee
 * themselves, has no destination/vendor concept, and goes through its own
 * fixed two-step approval chain (manager, then finance manager).
 */
@Entity()
@Index({ properties: ['status'] })
@Index({ properties: ['requester', 'status'] })
export class AdvanceRequestEntity extends BaseEntity {
  @ManyToOne(() => UserEntity)
  requester: UserEntity;

  /** Requested amount, integer, in rial. */
  @Property({ type: types.bigint })
  amountRial: number;

  @Property({ nullable: true, type: 'text' })
  reason?: string;

  @Enum({
    items: () => AdvanceRequestStatus,
    default: AdvanceRequestStatus.PENDING_APPROVAL,
  })
  status: AdvanceRequestStatus = AdvanceRequestStatus.PENDING_APPROVAL;

  /**
   * Denormalised pointer to the approval step currently outstanding, kept in
   * step with `approvalSteps` by AdvanceRequestService and nothing else — so
   * "what is waiting on me?" is one indexed query.
   */
  @Enum({ items: () => Role, nullable: true })
  pendingRole?: Role;

  @Property({ nullable: true })
  pendingSequence?: number;

  /** Reason attached to the most recent rejection. */
  @Property({ nullable: true })
  lastDecisionComment?: string;

  @Property({ columnType: 'timestamptz', nullable: true })
  decidedAt?: Date;

  @OneToMany(() => AdvanceApprovalStepEntity, (step) => step.request)
  approvalSteps = new Collection<AdvanceApprovalStepEntity>(this);
}
