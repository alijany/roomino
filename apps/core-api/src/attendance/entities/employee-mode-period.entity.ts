import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { AttendanceMode } from '../attendance.constants';
import { EmployeeProfileEntity } from './employee-profile.entity';

/**
 * Attendance-mode history of a person. A change of mode opens a new period
 * from its start date, so earlier days keep being measured the way they were
 * — switching someone to «بدون ثبت» doesn't turn last month's absences into
 * presumed presence. No rows means `tracked` throughout.
 */
@Entity()
@Index({ properties: ['employee', 'startDate'] })
export class EmployeeModePeriodEntity extends BaseEntity {
  @ManyToOne(() => EmployeeProfileEntity, { deleteRule: 'cascade' })
  employee: EmployeeProfileEntity;

  @Enum({ items: () => AttendanceMode })
  mode: AttendanceMode;

  /** First civil day in this mode, `"YYYY-MM-DD"`. */
  @Property({ type: 'date' })
  startDate: string;
}
