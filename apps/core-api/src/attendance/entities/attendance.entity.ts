import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import {
  AttendanceSource,
  AttendanceStatus,
  WorkMode,
} from '../attendance.constants';
import { EmployeeProfileEntity } from './employee-profile.entity';
import { WorkplaceEntity } from './workplace.entity';

/**
 * One person's attendance on one civil day: check-in/out instants, where
 * they were, and who corrected it if anyone did.
 */
@Entity()
@Unique({ properties: ['employee', 'date'] })
export class AttendanceEntity extends BaseEntity {
  @ManyToOne(() => EmployeeProfileEntity, { deleteRule: 'cascade' })
  employee: EmployeeProfileEntity;

  @ManyToOne(() => WorkplaceEntity, { nullable: true, deleteRule: 'set null' })
  workplace?: WorkplaceEntity;

  /** Tehran civil date, `"YYYY-MM-DD"`. */
  @Property({ type: 'date' })
  date: string;

  @Property({ columnType: 'timestamptz', nullable: true })
  checkInAt?: Date;

  @Property({ type: 'double', nullable: true })
  checkInLat?: number;

  @Property({ type: 'double', nullable: true })
  checkInLng?: number;

  @Property({ nullable: true })
  checkInDistanceM?: number;

  @Enum({ items: () => AttendanceSource, nullable: true })
  checkInSource?: AttendanceSource;

  @Property({ columnType: 'timestamptz', nullable: true })
  checkOutAt?: Date;

  @Property({ type: 'double', nullable: true })
  checkOutLat?: number;

  @Property({ type: 'double', nullable: true })
  checkOutLng?: number;

  @Property({ nullable: true })
  checkOutDistanceM?: number;

  @Enum({ items: () => AttendanceSource, nullable: true })
  checkOutSource?: AttendanceSource;

  @Enum({ items: () => AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus = AttendanceStatus.PRESENT;

  @Enum({ items: () => WorkMode, default: WorkMode.OFFICE })
  workMode: WorkMode = WorkMode.OFFICE;

  /** Admin, HR or team approver who last recorded/corrected the day. */
  @ManyToOne(() => UserEntity, { nullable: true, deleteRule: 'set null' })
  editedBy?: UserEntity;

  @Property({ columnType: 'timestamptz', nullable: true })
  editedAt?: Date;

  @Property({ length: 500, nullable: true })
  editNote?: string;
}
