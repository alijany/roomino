import {
  Collection,
  Entity,
  OneToMany,
  Property,
  Unique,
  types,
} from '@mikro-orm/core';
import { BaseEntity } from 'src/libs/orm/orm.entity.base';
import { RolesEntity } from 'src/roles/roles.entity';

@Entity()
export class UserEntity extends BaseEntity {
  @Property({ nullable: true })
  firstName?: string;

  @Property({ nullable: true })
  lastName?: string;

  // Virtual property for full name
  get name(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || undefined;
  }

  @Property({ nullable: true })
  nationalId?: string;

  @Property({ nullable: true, type: types.bigint })
  @Unique()
  chatId?: number;

  @Property({ nullable: true })
  @Unique()
  phone?: string;

  @Property({ nullable: true })
  profilePicture?: string;

  @Property({ default: true })
  isApproved: boolean = true;

  @OneToMany(() => RolesEntity, (role) => role.user)
  roles = new Collection<RolesEntity>(this);
}
