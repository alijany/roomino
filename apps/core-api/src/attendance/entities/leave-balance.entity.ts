import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { LeaveType } from '../attendance.constants';
import { EmployeeProfileEntity } from './employee-profile.entity';

/** Leave ledger of one person, per leave type and Jalali year. */
@Entity()
@Unique({ properties: ['employee', 'leaveType', 'year'] })
export class LeaveBalanceEntity extends BaseEntity {
  @ManyToOne(() => EmployeeProfileEntity, { deleteRule: 'cascade' })
  employee: EmployeeProfileEntity;

  @Enum({ items: () => LeaveType })
  leaveType: LeaveType;

  @Property()
  year: number;

  /** Entitlement for the year, seeded from the policy's yearly cap. */
  @Property({ default: 0 })
  accruedMinutes: number = 0;

  @Property({ default: 0 })
  usedMinutes: number = 0;

  @Property({ default: 0 })
  carriedOverMinutes: number = 0;
}
