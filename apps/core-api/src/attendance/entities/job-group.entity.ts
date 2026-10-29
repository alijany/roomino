import {
  Collection,
  Entity,
  Enum,
  ManyToMany,
  Property,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { AttendanceMode } from '../attendance.constants';

/**
 * گروه شغلی. Its approvers run the "my team" area for the group's members:
 * they review requests, correct attendance and adjust shifts.
 *
 * Being an approver is this assignment alone — it is unrelated to the
 * finance `approver` role.
 */
@Entity()
export class JobGroupEntity extends BaseEntity {
  @Property()
  @Unique()
  name: string;

  /** How the group's members check in — a person may override it. */
  @Enum({ items: () => AttendanceMode, default: AttendanceMode.TRACKED })
  attendanceMode: AttendanceMode = AttendanceMode.TRACKED;

  /**
   * Fixed weekly remote days for every member, 0 = شنبه … 6 = جمعه. They add to
   * a member's own `remoteDays`; neither replaces the other.
   */
  @Property({ type: 'json', nullable: true })
  remoteDays?: number[];

  @ManyToMany(() => UserEntity, undefined, {
    pivotTable: 'attendance_job_group_approver',
    joinColumn: 'job_group_id',
    inverseJoinColumn: 'user_id',
  })
  approvers = new Collection<UserEntity>(this);
}
