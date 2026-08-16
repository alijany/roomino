import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';

/**
 * A bucket a payment request is filed under (SaaS, internet, rent, …).
 * Managed by admins; seeded on first boot by FinanceBootstrapService.
 */
@Entity()
export class ExpenseCategoryEntity extends BaseEntity {
  @Property()
  name: string;

  /** Stable machine key — safe to reference from seeds and reports. */
  @Property()
  @Unique()
  code: string;

  /** Optional one level of nesting. Not used by the seed, available to admins. */
  @ManyToOne(() => ExpenseCategoryEntity, { nullable: true })
  parent?: ExpenseCategoryEntity;

  /**
   * When true, the request form asks for an invoice before it will submit.
   * Rent and salaries typically don't have one; SaaS always does.
   */
  @Property({ default: true })
  requiresInvoice: boolean = true;

  @Property({ default: true })
  active: boolean = true;
}
