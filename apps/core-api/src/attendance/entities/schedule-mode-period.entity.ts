import { Entity, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';

/**
 * A stretch of days in schedule mode: nobody checks in or out, and a shift
 * day with nothing recorded counts as worked in full. Only exceptions are
 * filed — leave, mission, overtime, a late arrival or early departure.
 *
 * Kept as periods, not a flag, so switching the mode off doesn't turn the
 * days it covered into absences. `endDate` null means it's still on.
 */
@Entity()
@Index({ properties: ['startDate', 'endDate'] })
export class ScheduleModePeriodEntity extends BaseEntity {
  /** First civil day covered, `"YYYY-MM-DD"`. */
  @Property({ type: 'date' })
  startDate: string;

  /** Last civil day covered; null while the mode is on. */
  @Property({ type: 'date', nullable: true })
  endDate?: string;

  /** Shown to staff while the mode is on — why, and until when. */
  @Property({ length: 500, nullable: true })
  note?: string;

  @ManyToOne(() => UserEntity, { nullable: true, deleteRule: 'set null' })
  startedBy?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, deleteRule: 'set null' })
  endedBy?: UserEntity;
}
