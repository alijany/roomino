import {
  Entity,
  Enum,
  ManyToOne,
  Property,
  Unique,
  types,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { PayrollLineStatus } from '../finance.constants';

/**
 * A person's final settlement (تسویه حساب نهایی), made apart from the monthly
 * payroll: the months were paid when they were closed, and this is what is
 * still owed at the end — severance, unused leave, the rest of the eidi —
 * less what they owe back. One per person. Money is rial (`bigint`).
 *
 * A draft is recomputed whenever it changes; once final the figures are a
 * snapshot, and finalising also records the end of cooperation on the person
 * if it was empty.
 */
@Entity()
@Unique({ properties: ['user'] })
export class FinalSettlementEntity extends BaseEntity {
  @ManyToOne(() => UserEntity)
  user: UserEntity;

  /** The day of settlement, civil `YYYY-MM-DD`; service is counted up to it. */
  @Property({ type: 'date' })
  date: string;

  @Enum({ items: () => PayrollLineStatus, default: PayrollLineStatus.DRAFT })
  status: PayrollLineStatus = PayrollLineStatus.DRAFT;

  // --- inputs ---------------------------------------------------------------

  /** Unused leave in days, bought out. */
  @Property({ columnType: 'numeric(5,2)', default: 0 })
  leaveRemainDays: number = 0;

  /** Months of this year the eidi covers; empty means counted from the dates. */
  @Property({ columnType: 'numeric(5,2)', nullable: true })
  eidiMonths?: number | null;

  /** The span severance is counted over; empty means hire date / settlement date. */
  @Property({ type: 'date', nullable: true })
  severanceFrom?: string | null;

  @Property({ type: 'date', nullable: true })
  severanceTo?: string | null;

  /** Under a year of service severance is not owed unless this says to pay its share. */
  @Property({ default: false })
  severanceProRata: boolean = false;

  /** Eidi already paid this year, taken off the eidi share. */
  @Property({ type: types.bigint, default: 0 })
  eidiPaid: number = 0;

  /** A correction to the last month's pay, plus or minus. */
  @Property({ type: types.bigint, default: 0 })
  adjustment: number = 0;

  @Property({ type: types.bigint, default: 0 })
  advance: number = 0;

  @Property({ type: types.bigint, default: 0 })
  loan: number = 0;

  @Property({ type: types.bigint, default: 0 })
  otherDeductions: number = 0;

  @Property({ nullable: true })
  note?: string;

  // --- results --------------------------------------------------------------

  /** Whole years and the months of the settlement year, as they were counted. */
  @Property({ default: 0 })
  serviceYears: number = 0;

  @Property({ columnType: 'numeric(5,2)', default: 0 })
  yearMonths: number = 0;

  @Property({ type: types.bigint, default: 0 }) severance: number = 0;
  @Property({ type: types.bigint, default: 0 }) leaveBuyout: number = 0;
  @Property({ type: types.bigint, default: 0 }) eidi: number = 0;
  @Property({ type: types.bigint, default: 0 }) gross: number = 0;
  @Property({ type: types.bigint, default: 0 }) workerInsurance: number = 0;
  @Property({ type: types.bigint, default: 0 }) tax: number = 0;
  @Property({ type: types.bigint, default: 0 }) totalDeductions: number = 0;
  /** What is left to pay (negative: the person owes). */
  @Property({ type: types.bigint, default: 0 }) net: number = 0;

  @Property({ type: 'json' })
  warnings: string[] = [];

  @ManyToOne(() => UserEntity, { nullable: true, deleteRule: 'set null' })
  createdBy?: UserEntity;
}
