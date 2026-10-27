import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';

/**
 * Module-wide switches an admin sets from «نگهداری». A single row (id 1),
 * read through `AttendanceSettingsService`; until it is first saved, the
 * defaults apply. A reset never touches it.
 */
@Entity()
export class AttendanceSettingsEntity extends BaseEntity {
  /**
   * Self-declared check-in (خوداظهاری): check-in, check-out and «امروز هستم»
   * take no position and skip the workplace radius — the person's word is
   * taken. Times are recorded as usual, with `AttendanceSource.SELF`.
   *
   * A flag rather than periods like schedule mode: it changes how a day is
   * recorded, not how it is measured, and each row keeps its source.
   */
  @Property({ default: false })
  selfDeclared: boolean = false;

  /** When it was last switched, and by whom — shown beside the switch. */
  @Property({ columnType: 'timestamptz', nullable: true })
  selfDeclaredChangedAt?: Date;

  @ManyToOne(() => UserEntity, { nullable: true, deleteRule: 'set null' })
  selfDeclaredChangedBy?: UserEntity;
}
