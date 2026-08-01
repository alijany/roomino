import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { MeetingRoomEntity } from './meeting-room.entity';

/**
 * A recurring weekly lock created by an admin (e.g. "every Saturday 09:00–10:00").
 * Repeats indefinitely on the given Jalali weekday until deactivated/deleted.
 */
@Entity()
export class RecurringReservationEntity extends BaseEntity {
  @ManyToOne(() => MeetingRoomEntity)
  room: MeetingRoomEntity;

  /**
   * Jalali weekday index: 0=شنبه (Saturday) … 6=جمعه (Friday).
   * Derived from an instant via `(TZDate('Asia/Tehran', d).getDay() + 1) % 7`.
   */
  @Property()
  weekday: number;

  /** Start time as minutes-from-midnight (Tehran civil time). 09:00 = 540. */
  @Property()
  startMinutes: number;

  /** End time as minutes-from-midnight (Tehran civil time). 18:00 = 1080. */
  @Property()
  endMinutes: number;

  @Property()
  title: string;

  @Property({ default: true })
  active: boolean = true;
}
