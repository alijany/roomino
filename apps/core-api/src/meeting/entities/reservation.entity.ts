import { Entity, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { MeetingRoomEntity } from './meeting-room.entity';

/**
 * A one-off room booking owned by the user who created it.
 * `startAt`/`endAt` are absolute instants (stored as timestamptz); the civil
 * time is always interpreted in Iran Standard Time (Asia/Tehran, fixed +03:30).
 */
@Entity()
@Index({ properties: ['room', 'startAt'] })
export class ReservationEntity extends BaseEntity {
  @ManyToOne(() => MeetingRoomEntity)
  room: MeetingRoomEntity;

  /** The user who owns (created) the booking. */
  @ManyToOne(() => UserEntity)
  user: UserEntity;

  @Property({ columnType: 'timestamptz' })
  startAt: Date;

  @Property({ columnType: 'timestamptz' })
  endAt: Date;

  @Property({ nullable: true })
  title?: string;

  @Property({ nullable: true })
  purpose?: string;
}
