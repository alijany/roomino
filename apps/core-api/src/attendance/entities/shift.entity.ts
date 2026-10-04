import {
  Cascade,
  Collection,
  Entity,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { ShiftDayEntity } from './shift-day.entity';

/** A weekly work schedule: one row per weekday in `days`. */
@Entity()
export class ShiftEntity extends BaseEntity {
  @Property()
  name: string;

  /** Jalali year the schedule was drawn up for — informational. */
  @Property()
  year: number;

  /** Tolerated lateness, in minutes. Informational, as in Tesmino. */
  @Property({ default: 0 })
  flexMinutes: number = 0;

  @Property({ nullable: true })
  dailyOvertimeCapMinutes?: number;

  @OneToMany(() => ShiftDayEntity, (day) => day.shift, {
    cascade: [Cascade.ALL],
    orphanRemoval: true,
    orderBy: { dayOfWeek: 'asc' },
  })
  days = new Collection<ShiftDayEntity>(this);
}
