import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  Property,
  types,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import {
  BillingCalendar,
  Currency,
  RecurrenceCycle,
} from '../finance.constants';
import { ExpenseCategoryEntity } from './expense-category.entity';
import { PayeeAccountEntity } from './payee-account.entity';
import { PaymentSourceEntity } from './payment-source.entity';
import { VendorEntity } from './vendor.entity';

/**
 * A هزینه دوره‌ای — a subscription, bill or contract that comes round again:
 * Figma, the office internet, the rent.
 *
 * This is a *schedule*, not a payment. On each cycle it materialises a real
 * PaymentRequestEntity, which then follows the ordinary approval and payment
 * path. Nothing is ever paid straight off a recurring row.
 */
@Entity()
@Index({ properties: ['nextDueDate', 'active'] })
export class RecurringExpenseEntity extends BaseEntity {
  @Property()
  title: string;

  @ManyToOne(() => VendorEntity)
  vendor: VendorEntity;

  @ManyToOne(() => ExpenseCategoryEntity)
  category: ExpenseCategoryEntity;

  @ManyToOne(() => PayeeAccountEntity, { nullable: true })
  payeeAccount?: PayeeAccountEntity;

  @ManyToOne(() => PaymentSourceEntity, { nullable: true })
  defaultPaymentSource?: PaymentSourceEntity;

  /** Integer, minor unit of `currency` — same convention as everywhere else. */
  @Property({ type: types.bigint })
  amountMinor: number;

  @Enum({ items: () => Currency, default: Currency.IRR })
  currency: Currency = Currency.IRR;

  @Enum({ items: () => RecurrenceCycle, default: RecurrenceCycle.MONTHLY })
  cycle: RecurrenceCycle = RecurrenceCycle.MONTHLY;

  /** Only used when `cycle` is CUSTOM_DAYS. */
  @Property({ nullable: true })
  cycleDays?: number;

  /**
   * Which calendar the cycle advances on.
   *
   * Not cosmetic: a SaaS vendor bills on Gregorian months, while rent and most
   * local services in Iran fall on Jalali months. Advancing rent by a Gregorian
   * month drifts off the agreed day within a year.
   */
  @Enum({ items: () => BillingCalendar, default: BillingCalendar.GREGORIAN })
  calendar: BillingCalendar = BillingCalendar.GREGORIAN;

  @Property({ columnType: 'timestamptz' })
  nextDueDate: Date;

  /** Stop recurring after this date. Null means indefinitely. */
  @Property({ columnType: 'timestamptz', nullable: true })
  endDate?: Date;

  /**
   * Days before the due date to warn the owner, descending.
   * The first (largest) window is the one that asks for a renew/cancel decision.
   */
  @Property({ type: 'json' })
  reminderDays: number[] = [30, 14, 7, 1];

  /** How many days before the due date the payment request is created. */
  @Property({ default: 7 })
  leadDays: number = 7;

  /**
   * The internal owner — who decides whether to renew. Reminders go to them,
   * not to Finance: Finance can pay it, but only the owner knows if we still
   * want it.
   */
  @ManyToOne(() => UserEntity)
  owner: UserEntity;

  /** When false, the schedule only reminds; nothing is created automatically. */
  @Property({ default: true })
  autoGenerate: boolean = true;

  @Property({ nullable: true })
  notes?: string;

  @Property({ default: true })
  active: boolean = true;

  /**
   * Largest reminder window already sent for the current cycle, so a daily job
   * doesn't re-send the same warning every morning. Reset when the cycle rolls.
   */
  @Property({ nullable: true })
  lastReminderDaysSent?: number;
}
