import {
  Collection,
  Entity,
  ManyToMany,
  Property,
  Unique,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';

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

  @ManyToMany(() => UserEntity, undefined, {
    pivotTable: 'attendance_job_group_approver',
    joinColumn: 'job_group_id',
    inverseJoinColumn: 'user_id',
  })
  approvers = new Collection<UserEntity>(this);
}
