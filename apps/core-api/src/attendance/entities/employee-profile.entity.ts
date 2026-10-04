import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  OneToOne,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { DeviceType } from '../attendance.constants';
import { EmployeeShiftEntity } from './employee-shift.entity';
import { JobGroupEntity } from './job-group.entity';
import { WorkplaceEntity } from './workplace.entity';
import { WorkPolicyEntity } from './work-policy.entity';

/**
 * Attendance profile of a Roomino user. Tesmino had a separate `employees`
 * table with its own login; here the person *is* a `UserEntity` (name,
 * phone, national id, OTP login) and this row adds what attendance needs.
 *
 * A user without a profile simply doesn't track attendance.
 */
@Entity()
export class EmployeeProfileEntity extends BaseEntity {
  @OneToOne(() => UserEntity, { owner: true, unique: true })
  user: UserEntity;

  @Property({ unique: true })
  personnelCode: string;

  @Property({ nullable: true })
  jobTitle?: string;

  @ManyToOne(() => WorkplaceEntity)
  workplace: WorkplaceEntity;

  @ManyToOne(() => JobGroupEntity, { nullable: true, deleteRule: 'set null' })
  jobGroup?: JobGroupEntity;

  @ManyToOne(() => WorkPolicyEntity, { nullable: true, deleteRule: 'set null' })
  workPolicy?: WorkPolicyEntity;

  /** When false, check-in is accepted anywhere (no radius check). */
  @Property({ default: true })
  useGps: boolean = true;

  @Property({ default: false })
  useWifi: boolean = false;

  @Enum({ items: () => DeviceType, default: DeviceType.ANY })
  allowedDeviceType: DeviceType = DeviceType.ANY;

  @Property({ default: false })
  trackingEnabled: boolean = false;

  /** Fixed weekly remote days, 0 = شنبه … 6 = جمعه. */
  @Property({ type: 'json', nullable: true })
  remoteDays?: number[];

  /** Inactive profiles cannot check in and drop out of boards and reports. */
  @Property({ default: true })
  active: boolean = true;

  @OneToMany(() => EmployeeShiftEntity, (shift) => shift.employee)
  shifts = new Collection<EmployeeShiftEntity>(this);
}
