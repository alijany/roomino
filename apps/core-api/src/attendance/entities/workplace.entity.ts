import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';

/**
 * محل کار — a site people check in at. Check-in is accepted within
 * `radiusMeters` of the coordinates.
 */
@Entity()
export class WorkplaceEntity extends BaseEntity {
  @Property()
  name: string;

  @Property({ nullable: true })
  city?: string;

  @Property({ nullable: true })
  address?: string;

  @Property({ type: 'double' })
  lat: number;

  @Property({ type: 'double' })
  lng: number;

  @Property({ default: 100 })
  radiusMeters: number = 100;

  @Property({ default: true })
  active: boolean = true;
}
