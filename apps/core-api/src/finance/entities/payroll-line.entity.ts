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

/** One reopening of a final payroll line. */
/** What moves a person's pay, frozen on a final line. */
export interface PayrollFacts {
  hireDate: string | null;
  endDate: string | null;
  probationEndDate: string | null;
  married: boolean;
  childrenCount: number;
  insured: boolean;
  insuranceType: string;
  taxExempt: boolean;
  agreementType: string;
  salaryMode: string;
  seniorityYears: number;
}

export interface PayrollRevision {
  at: string;
  by: string | null;
  reason: string;
  /** The line's money figures when it was opened, to see later whether anything changed. */
  before: Record<string, number>;
  /** Set when the line is final again: did any figure differ from `before`? */
  changed?: boolean;
}

/**
 * One person's pay for one Jalali month: what was entered (days, hours,
 * bonus, deductions) and what came out of it. A draft is recomputed whenever
 * its inputs, the person, the salary or the year's parameters change; once
 * the month is finalised the figures are a snapshot that nothing touches.
 *
 * Money is rial (`bigint`, read with `readBigint`); hours and days are
 * `numeric` (read back as strings).
 */
@Entity()
@Unique({ properties: ['user', 'period'] })
export class PayrollLineEntity extends BaseEntity {
  @ManyToOne(() => UserEntity)
  user: UserEntity;

  /** Jalali year and month as one number: `140507`. */
  @Property()
  period: number;

  @Enum({ items: () => PayrollLineStatus, default: PayrollLineStatus.DRAFT })
  status: PayrollLineStatus = PayrollLineStatus.DRAFT;

  // --- inputs ---------------------------------------------------------------

  /** Days worked in the month, out of 30. */
  @Property({ columnType: 'numeric(5,2)', default: 30 })
  days: number = 30;

  @Property({ columnType: 'numeric(7,2)', default: 0 })
  overtimeHours: number = 0;

  @Property({ columnType: 'numeric(7,2)', default: 0 })
  nightHours: number = 0;

  @Property({ columnType: 'numeric(7,2)', default: 0 })
  holidayHours: number = 0;

  @Property({ columnType: 'numeric(7,2)', default: 0 })
  deficitHours: number = 0;

  @Property({ columnType: 'numeric(5,2)', default: 0 })
  missionDays: number = 0;

  /** Unused leave in days, bought out on settlement. */
  @Property({ columnType: 'numeric(5,2)', default: 0 })
  leaveRemainDays: number = 0;

  @Property({ type: types.bigint, default: 0 })
  bonus: number = 0;

  @Property({ type: types.bigint, default: 0 })
  advance: number = 0;

  @Property({ type: types.bigint, default: 0 })
  loan: number = 0;

  @Property({ type: types.bigint, default: 0 })
  otherDeductions: number = 0;

  /** Pay the year's eidi and severance in this month (Esfand). */
  @Property({ default: false })
  payEidi: boolean = false;

  /** Final settlement, in the month the person leaves. */
  @Property({ default: false })
  settle: boolean = false;

  @Property({ nullable: true })
  note?: string;

  // --- results (rial) --------------------------------------------------------

  /** The agreed salary this month was computed from. */
  @Property({ type: types.bigint, default: 0 })
  agreed: number = 0;

  @Property({ default: 'gross' })
  agreement: string = 'gross';

  @Property({ type: types.bigint, default: 0 }) base: number = 0;
  @Property({ type: types.bigint, default: 0 }) housing: number = 0;
  @Property({ type: types.bigint, default: 0 }) bon: number = 0;
  @Property({ type: types.bigint, default: 0 }) marriage: number = 0;
  @Property({ type: types.bigint, default: 0 }) child: number = 0;
  @Property({ type: types.bigint, default: 0 }) seniority: number = 0;
  @Property({ type: types.bigint, default: 0 }) overtime: number = 0;
  @Property({ type: types.bigint, default: 0 }) mission: number = 0;
  @Property({ type: types.bigint, default: 0 }) eidi: number = 0;
  @Property({ type: types.bigint, default: 0 }) severance: number = 0;
  @Property({ type: types.bigint, default: 0 }) leaveBuyout: number = 0;
  /** A hybrid salary's part above its base: paid net, outside insurance and tax. */
  @Property({ type: types.bigint, default: 0 }) extras: number = 0;
  @Property({ type: types.bigint, default: 0 }) gross: number = 0;
  @Property({ type: types.bigint, default: 0 }) deficit: number = 0;
  @Property({ type: types.bigint, default: 0 }) workerInsurance: number = 0;
  @Property({ type: types.bigint, default: 0 }) tax: number = 0;
  @Property({ type: types.bigint, default: 0 }) totalDeductions: number = 0;
  @Property({ type: types.bigint, default: 0 }) net: number = 0;
  @Property({ type: types.bigint, default: 0 }) employerInsurance: number = 0;
  @Property({ type: types.bigint, default: 0 }) accrual: number = 0;
  @Property({ type: types.bigint, default: 0 }) totalCost: number = 0;

  /**
   * Every time a final line was opened again: when, by whom and why, the
   * figures it had then (`before`), and — once it is final again — whether
   * they changed. A payslip says «بازنگری‌شده» only for a change that happened.
   */
  @Property({ type: 'json', default: '[]' })
  revisions: PayrollRevision[] = [];

  /**
   * The person's facts as they were when the line was finalised, so the
   * payslip keeps saying what the figures were worked out from. Empty while the
   * line is a draft, when the live facts are read instead.
   */
  @Property({ type: 'json', nullable: true })
  facts?: PayrollFacts | null;

  /** What a reader should look at before trusting this line. */
  @Property({ type: 'json' })
  warnings: string[] = [];
}
