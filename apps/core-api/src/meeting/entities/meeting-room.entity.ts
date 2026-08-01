import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';

/**
 * A bookable meeting room / workspace. Managed by admins only.
 */
@Entity()
export class MeetingRoomEntity extends BaseEntity {
  @Property()
  name: string;

  @Property({ nullable: true })
  description?: string;

  @Property({ nullable: true })
  capacity?: number;

  /** Floor / physical location label. */
  @Property({ nullable: true })
  location?: string;

  /** Inactive rooms are hidden from the availability board and cannot be booked. */
  @Property({ default: true })
  active: boolean = true;
}
