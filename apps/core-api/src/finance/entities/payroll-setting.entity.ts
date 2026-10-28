import { Entity, Property, types, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';

/** Whether an item counts toward insurance and income tax. */
export interface PayrollInclusion {
  insurable: boolean;
  taxable: boolean;
}

/**
 * The legal payroll parameters of one Jalali year — one row per year.
 *
 * Units: money is in rial (the canonical unit, a bigint that reads back as a
 * string — use `readBigint`); percentages are real percents (`7` is 7%) in a
 * `numeric(5,2)` that also reads back as a string; days and hours are plain
 * integers. `PAYROLL_PARAMETERS` in `payroll-setting.catalog.ts` carries the
 * label, group and official value of each column.
 */
@Entity()
@Unique({ properties: ['year'] })
export class PayrollSettingEntity extends BaseEntity {
  /** Jalali year, e.g. 1405. */
  @Property()
  year: number;

  // --- base wage and allowances (rial) ---
  @Property({ type: types.bigint })
  minDaily: number;

  @Property({ type: types.bigint })
  minMonthly: number;

  @Property({ type: types.bigint })
  seniorityDaily: number;

  @Property({ type: types.bigint })
  housing: number;

  @Property({ type: types.bigint })
  bon: number;

  @Property({ type: types.bigint })
  marriage: number;

  @Property({ type: types.bigint })
  child: number;

  @Property({ type: types.bigint })
  insCeiling: number;

  @Property({ type: types.bigint })
  taxExempt: number;

  @Property({ type: types.bigint })
  taxLimit1: number;

  @Property({ type: types.bigint })
  taxLimit2: number;

  @Property({ type: types.bigint })
  taxLimit3: number;

  @Property({ type: types.bigint })
  taxLimit4: number;

  @Property({ type: types.bigint })
  taxEidiExempt: number;

  @Property({ type: types.bigint })
  eidiCap: number;

  // --- percentages ---
  @Property({ columnType: 'numeric(5,2)' })
  insWorker: number;

  @Property({ columnType: 'numeric(5,2)' })
  insEmployer: number;

  @Property({ columnType: 'numeric(5,2)' })
  insUnemployment: number;

  @Property({ columnType: 'numeric(5,2)' })
  taxRate1: number;

  @Property({ columnType: 'numeric(5,2)' })
  taxRate2: number;

  @Property({ columnType: 'numeric(5,2)' })
  taxRate3: number;

  @Property({ columnType: 'numeric(5,2)' })
  taxRate4: number;

  @Property({ columnType: 'numeric(5,2)' })
  taxRate5: number;

  @Property({ columnType: 'numeric(5,2)' })
  taxOvertimeRate: number;

  @Property({ columnType: 'numeric(5,2)' })
  taxInsuranceFraction: number;

  @Property({ columnType: 'numeric(5,2)' })
  taxNoncash: number;

  @Property({ columnType: 'numeric(5,2)' })
  overtimeRate: number;

  @Property({ columnType: 'numeric(5,2)' })
  nightRate: number;

  @Property({ columnType: 'numeric(5,2)' })
  holidayRate: number;

  @Property({ columnType: 'numeric(5,2)' })
  missionRate: number;

  // --- days and hours ---
  @Property()
  eidiDays: number;

  @Property()
  severanceDays: number;

  @Property()
  leaveDays: number;

  @Property()
  leaveCarryDays: number;

  @Property()
  weekHours: number;

  @Property()
  wageHours: number;

  /** Insurance and tax treatment per item, keyed as in the catalog. */
  @Property({ type: 'json' })
  inclusion: Record<string, PayrollInclusion> = {};
}
