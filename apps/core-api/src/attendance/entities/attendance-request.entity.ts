import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from '../../libs/orm/orm.entity.base';
import { UserEntity } from '../../user/user.entity';
import {
  ManualDirection,
  RequestStatus,
  RequestType,
} from '../attendance.constants';
import { EmployeeProfileEntity } from './employee-profile.entity';
import { WorkplaceEntity } from './workplace.entity';

/**
 * Leave, mission, remote work, overtime or a manual check-in/out awaiting a
 * decision.
 *
 * The shape depends on the type:
 *  - daily types use `dateFrom`..`dateTo`;
 *  - hourly types and overtime use `date` + `timeFrom`..`timeTo`;
 *  - manual attendance uses `date` + `manualTime` + `manualDirection`.
 */
@Entity()
@Index({ properties: ['employee', 'status'] })
@Index({ properties: ['type', 'status'] })
export class AttendanceRequestEntity extends BaseEntity {
  @ManyToOne(() => EmployeeProfileEntity, { deleteRule: 'cascade' })
  employee: EmployeeProfileEntity;

  @ManyToOne(() => WorkplaceEntity, { nullable: true, deleteRule: 'set null' })
  workplace?: WorkplaceEntity;

  @Enum({ items: () => RequestType })
  type: RequestType;

  @Property({ type: 'date', nullable: true })
  dateFrom?: string;

  @Property({ type: 'date', nullable: true })
  dateTo?: string;

  @Property({ type: 'date', nullable: true })
  date?: string;

  @Property({ length: 5, nullable: true })
  timeFrom?: string;

  @Property({ length: 5, nullable: true })
  timeTo?: string;

  @Property({ length: 5, nullable: true })
  manualTime?: string;

  @Enum({ items: () => ManualDirection, nullable: true })
  manualDirection?: ManualDirection;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Enum({ items: () => RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus = RequestStatus.PENDING;

  @ManyToOne(() => UserEntity, { nullable: true, deleteRule: 'set null' })
  reviewedBy?: UserEntity;

  @Property({ columnType: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Property({ type: 'text', nullable: true })
  reviewNote?: string;

  @Property({ nullable: true })
  durationMinutes?: number;
}
