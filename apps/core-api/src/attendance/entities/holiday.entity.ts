import { Entity, Enum, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { HolidaySource } from '../attendance.constants';

/**
 * A day with no scheduled work for anyone. Official holidays are
 * deactivated rather than deleted, so the next calendar sync doesn't bring
 * them back.
 */
@Entity()
export class HolidayEntity extends BaseEntity {
  @Property({ type: 'date', unique: true })
  date: string;

  @Property({ length: 250 })
  title: string;

  @Enum({ items: () => HolidaySource, default: HolidaySource.MANUAL })
  source: HolidaySource = HolidaySource.MANUAL;

  @Property({ default: true })
  active: boolean = true;
}
