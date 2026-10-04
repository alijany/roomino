import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { PolicyPeriod, PolicyRequestType } from '../attendance.constants';
import { WorkPolicyEntity } from './work-policy.entity';

/**
 * A cap for one request type in one Jalali year. `period` narrows it to
 * daily or hourly requests; null covers both.
 *
 * For leave, `yearlyCapMinutes` is also the year's entitlement: the balance
 * starts there (plus anything carried over) and approvals draw it down.
 */
@Entity()
@Unique({ properties: ['policy', 'requestType', 'period', 'year'] })
export class WorkPolicyRuleEntity extends BaseEntity {
  @ManyToOne(() => WorkPolicyEntity, { deleteRule: 'cascade' })
  policy: WorkPolicyEntity;

  @Enum({ items: () => PolicyRequestType })
  requestType: PolicyRequestType;

  @Enum({ items: () => PolicyPeriod, nullable: true })
  period?: PolicyPeriod;

  @Property()
  year: number;

  @Property({ nullable: true })
  monthlyCapMinutes?: number;

  @Property({ nullable: true })
  yearlyCapMinutes?: number;

  @Property({ default: true })
  allowOverMonthlyCap: boolean = true;

  @Property({ default: true })
  allowOverYearlyCap: boolean = true;

  @Property({ nullable: true })
  carryoverCapMinutes?: number;
}
