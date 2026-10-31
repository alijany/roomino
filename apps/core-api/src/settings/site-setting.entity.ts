import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../libs/orm/orm.entity.base';

/** One site-wide setting: a key and its JSON value. Keys live in `SITE_SETTING_DEFAULTS`. */
@Entity()
@Unique({ properties: ['key'] })
export class SiteSettingEntity extends BaseEntity {
  @Property()
  key: string;

  @Property({ type: 'json' })
  value: unknown;
}
