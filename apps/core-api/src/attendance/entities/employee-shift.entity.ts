import { Entity, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { EmployeeProfileEntity } from './employee-profile.entity';
import { ShiftEntity } from './shift.entity';

/**
 * Shift assignment history. A change of shift opens a new period from its
 * start date, so earlier days keep being measured against the old schedule.
 */
@Entity()
@Index({ properties: ['employee', 'startDate'] })
export class EmployeeShiftEntity extends BaseEntity {
  @ManyToOne(() => EmployeeProfileEntity, { deleteRule: 'cascade' })
  employee: EmployeeProfileEntity;

  @ManyToOne(() => ShiftEntity)
  shift: ShiftEntity;

  /** Civil date, `"YYYY-MM-DD"`. */
  @Property({ type: 'date' })
  startDate: string;

  @Property({ type: 'date', nullable: true })
  endDate?: string;
}
