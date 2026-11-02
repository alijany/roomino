import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../libs/orm/orm.entity.base';
import { UserEntity } from '../user/user.entity';

/**
 * One term of a person's fixed-term contract. A renewal is a new row, so the
 * history stays; the one that ends last is the current one. The signed paper
 * is kept by the manager — this only tracks the dates and whether it is signed.
 */
@Entity()
export class ContractEntity extends BaseEntity {
  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  user: UserEntity;

  /** First day of the term, civil date `"YYYY-MM-DD"`. */
  @Property({ type: 'date' })
  startDate: string;

  /** Last day of the term, civil date. */
  @Property({ type: 'date' })
  endDate: string;

  @Property({ default: false })
  signed: boolean = false;

  @Property({ length: 500, nullable: true })
  note?: string;
}
