import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { EmployeeProfileEntity } from './employee-profile.entity';

/**
 * A day a person in «بدون ثبت» counts as present. They say so themselves —
 * «امروز هستم», today only, no time recorded — or a reviewer confirms it
 * afterwards («حاضر بود»), which is how a forgotten day is put right at the
 * month's end. A past scheduled day with neither, and no leave or mission, is
 * absent.
 */
@Entity()
@Unique({ properties: ['employee', 'date'] })
export class PresenceDeclarationEntity extends BaseEntity {
  @ManyToOne(() => EmployeeProfileEntity, { deleteRule: 'cascade' })
  employee: EmployeeProfileEntity;

  /** Tehran civil date, `"YYYY-MM-DD"`. */
  @Property({ type: 'date' })
  date: string;

  @Property({ columnType: 'timestamptz' })
  declaredAt: Date = new Date();

  /** The reviewer who confirmed the day; null when the person declared it. */
  @ManyToOne(() => UserEntity, { nullable: true, deleteRule: 'set null' })
  declaredBy?: UserEntity;

  @Property({ length: 500, nullable: true })
  note?: string;
}
