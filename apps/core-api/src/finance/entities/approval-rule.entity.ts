import { Entity, ManyToOne, Property, types } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { Role } from '../../roles/roles.constants';
import { ExpenseCategoryEntity } from './expense-category.entity';

/**
 * One row of the approval matrix: "a request worth between X and Y rial needs
 * these approvers, in this order".
 *
 * Rules are evaluated at submit time and the resulting chain is materialised
 * into ApprovalStepEntity rows, so editing the matrix later never retroactively
 * changes an in-flight request.
 */
@Entity()
export class ApprovalRuleEntity extends BaseEntity {
  /** Inclusive lower bound, in rial (the canonical storage unit). */
  @Property({ type: types.bigint })
  minAmountRial: number;

  /** Exclusive upper bound, in rial. Null means unbounded. */
  @Property({ type: types.bigint, nullable: true })
  maxAmountRial?: number;

  /** Optional narrowing to a single category. Null matches every category. */
  @ManyToOne(() => ExpenseCategoryEntity, { nullable: true })
  category?: ExpenseCategoryEntity;

  /**
   * Ordered list of roles that must approve, in sequence. An empty array means
   * no business approval is needed and the request goes straight to Finance.
   *
   * Finance is deliberately not part of this chain — they verify and pay, which
   * is a separate act. That separation is what makes the audit trail worth having.
   */
  @Property({ type: 'json' })
  approverChain: Role[] = [];

  /** Higher wins when two rules overlap. */
  @Property({ default: 0 })
  priority: number = 0;

  @Property({ nullable: true })
  description?: string;

  @Property({ default: true })
  active: boolean = true;
}
