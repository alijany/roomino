import { Entity, Index, ManyToOne, Property, types } from '@mikro-orm/core';
import { AdvanceRequestEntity } from '../../advance-request/entities/advance-request.entity';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import { PayrollLineEntity } from './payroll-line.entity';

/**
 * Part (or all) of an approved advance settled: taken off one payroll line, or
 * (no line) paid back by hand. An advance can be settled in pieces over several
 * months; what is still owed is its amount less these. Deleting a payroll line
 * frees what it had taken.
 */
@Entity()
@Index({ properties: ['request'] })
export class AdvanceDeductionEntity extends BaseEntity {
  @ManyToOne(() => AdvanceRequestEntity)
  request: AdvanceRequestEntity;

  /** The pay it came off; empty for a settlement made by hand. */
  @ManyToOne(() => PayrollLineEntity, { deleteRule: 'cascade', nullable: true })
  line?: PayrollLineEntity;

  /** The day a manual settlement was made, as `YYYY-MM-DD`. */
  @Property({ columnType: 'date', nullable: true })
  paidOn?: string;

  /** Who recorded a manual settlement. */
  @ManyToOne(() => UserEntity, { nullable: true })
  recordedBy?: UserEntity;

  @Property({ nullable: true })
  note?: string;

  /** Rial. */
  @Property({ type: types.bigint })
  amount: number;
}
