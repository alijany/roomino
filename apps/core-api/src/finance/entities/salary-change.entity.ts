import {
  Entity,
  Enum,
  ManyToOne,
  Property,
  Unique,
  types,
} from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { SalaryChangeStatus, SalaryChangeType } from '../finance.constants';

/**
 * One change of a person's monthly salary, effective from the start of a
 * Jalali month. The salary of any month is the latest change at or before it.
 *
 * Append-only by design: a confirmed change must come after the person's
 * latest confirmed one, so the type (start / raise / decrease) and the
 * percentage stay true, and only the latest confirmed change can be deleted.
 *
 * A change may first be a *proposal* — a figure for a meeting. It affects
 * nothing (not the salary of any month, not the overview), can be edited or
 * deleted freely, has no type yet, and a person has at most one open
 * proposal. Confirming it applies the append-only rules and sets the type.
 */
@Entity()
@Unique({ properties: ['user', 'period'] })
export class SalaryChangeEntity extends BaseEntity {
  @ManyToOne(() => UserEntity)
  user: UserEntity;

  /** Jalali year and month as one number, `140507` for مهر ۱۴۰۵ — sorts in time order. */
  @Property()
  period: number;

  /** The new monthly salary, in rial. */
  @Property({ type: types.bigint })
  salary: number;

  /** Null while a proposal; set when it is confirmed. */
  @Enum({ items: () => SalaryChangeType, nullable: true })
  type?: SalaryChangeType;

  @Enum({
    items: () => SalaryChangeStatus,
    default: SalaryChangeStatus.CONFIRMED,
  })
  status: SalaryChangeStatus = SalaryChangeStatus.CONFIRMED;

  @Property({ nullable: true })
  note?: string;

  @ManyToOne(() => UserEntity, { nullable: true, deleteRule: 'set null' })
  createdBy?: UserEntity;
}
