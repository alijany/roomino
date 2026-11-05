import {
  Collection,
  Entity,
  Enum,
  ManyToMany,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { AttendanceMode } from '../attendance.constants';

/**
 * تیم — an organisation-wide team (the table kept its old job-group name).
 * Its managers (`approvers`) run the "my team" area for the members of the
 * team and of every team beneath it: they review requests, correct
 * attendance and adjust shifts. A team may sit under a parent team.
 *
 * Being a manager is this assignment alone — it is unrelated to the
 * finance `approver` role.
 *
 * Membership lives on `UserEntity.team`; `attendanceMode` and `remoteDays`
 * are this team's attendance settings.
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

  /** The team this one belongs to; none for a top-level team. */
  @ManyToOne(() => JobGroupEntity, { nullable: true, deleteRule: 'set null' })
  parent?: JobGroupEntity;

  @ManyToMany(() => UserEntity, undefined, {
    pivotTable: 'attendance_job_group_approver',
    joinColumn: 'job_group_id',
    inverseJoinColumn: 'user_id',
  })
  approvers = new Collection<UserEntity>(this);
}
