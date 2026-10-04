import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { ShiftEntity } from './shift.entity';

/**
 * One weekday of a shift. Times are Tehran wall-clock `"HH:mm"`. A split
 * shift (e.g. 08–12 and 16–19) uses the second part.
 */
@Entity()
@Unique({ properties: ['shift', 'dayOfWeek'] })
export class ShiftDayEntity extends BaseEntity {
  @ManyToOne(() => ShiftEntity, { deleteRule: 'cascade' })
  shift: ShiftEntity;

  /** 0 = شنبه … 6 = جمعه. */
  @Property()
  dayOfWeek: number;

  @Property({ default: false })
  isActive: boolean = false;

  @Property({ length: 5, nullable: true })
  startTime?: string;

  @Property({ length: 5, nullable: true })
  endTime?: string;

  @Property({ default: false })
  hasSecondPart: boolean = false;

  @Property({ length: 5, nullable: true })
  secondStartTime?: string;

  @Property({ length: 5, nullable: true })
  secondEndTime?: string;
}
