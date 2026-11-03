import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../libs/orm/orm.entity.base';
import { UserEntity } from '../user/user.entity';

/**
 * What one person did with a newcomer's introduction: said welcome, and/or
 * closed it. No row means they have not seen it yet. The newcomer's own row
 * (viewer = newcomer) records closing their own card.
 */
@Entity()
@Unique({ properties: ['newcomer', 'viewer'] })
export class WelcomeEntity extends BaseEntity {
  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  newcomer: UserEntity;

  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  viewer: UserEntity;

  @Property({ default: false })
  greeted: boolean = false;

  @Property({ default: false })
  dismissed: boolean = false;
}
