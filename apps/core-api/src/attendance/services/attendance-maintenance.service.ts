import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { S3StorageService } from '../../storage/s3-storage.service';
import { UserEntity } from '../../user/user.entity';
import { RESET_CONFIRMATION, ResetScope } from '../attendance.constants';
import { AttendanceRequestEntity } from '../entities/attendance-request.entity';
import { AttendanceRequestAttachmentEntity } from '../entities/attendance-request-attachment.entity';
import { AttendanceEntity } from '../entities/attendance.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { EmployeeShiftEntity } from '../entities/employee-shift.entity';
import { HolidayEntity } from '../entities/holiday.entity';
import { JobGroupEntity } from '../entities/job-group.entity';
import { LeaveBalanceEntity } from '../entities/leave-balance.entity';
import { ShiftDayEntity } from '../entities/shift-day.entity';
import { ShiftEntity } from '../entities/shift.entity';
import { WorkPolicyRuleEntity } from '../entities/work-policy-rule.entity';
import { WorkPolicyEntity } from '../entities/work-policy.entity';
import { WorkplaceEntity } from '../entities/workplace.entity';

const RECORD_ENTITIES = {
  requestAttachments: AttendanceRequestAttachmentEntity,
  attendance: AttendanceEntity,
  requests: AttendanceRequestEntity,
  leaveBalances: LeaveBalanceEntity,
};

const SETUP_ENTITIES = {
  employees: EmployeeProfileEntity,
  employeeShifts: EmployeeShiftEntity,
  jobGroups: JobGroupEntity,
  workPolicies: WorkPolicyEntity,
  workPolicyRules: WorkPolicyRuleEntity,
  shifts: ShiftEntity,
  shiftDays: ShiftDayEntity,
  workplaces: WorkplaceEntity,
  holidays: HolidayEntity,
};

const ENTITIES = { ...RECORD_ENTITIES, ...SETUP_ENTITIES };
export type AttendanceTable = keyof typeof ENTITIES;

/** Pivot of job-group approvers — has no entity of its own. */
const APPROVER_PIVOT = 'attendance_job_group_approver';

const normalize = (value: string) =>
  value
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\s‌‍]+/g, '');

/** Wipes attendance data for a fresh start. Admin only, see the controller. */
@Injectable()
export class AttendanceMaintenanceService {
  private readonly logger = new Logger(AttendanceMaintenanceService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly storage: S3StorageService,
  ) {}

  private tableOf(key: AttendanceTable) {
    return this.em.getMetadata().get(ENTITIES[key].name).tableName;
  }

  /** Row count of every attendance table, keyed like `ENTITIES`. */
  async summary(em: EntityManager = this.em) {
    const keys = Object.keys(ENTITIES) as AttendanceTable[];
    const counts = await Promise.all(
      keys.map((key) => em.count(ENTITIES[key], {})),
    );
    return Object.fromEntries(keys.map((key, i) => [key, counts[i]])) as Record<
      AttendanceTable,
      number
    >;
  }

  /**
   * One `TRUNCATE` in one transaction: all or nothing. No `CASCADE`, so a
   * table outside the module that ever comes to reference these makes the
   * reset fail loudly instead of silently emptying that table too.
   */
  async reset(scope: ResetScope, confirm: string, by: UserEntity) {
    // The documents attached to requests live in storage, not the database.
    const files = await this.em.find(
      AttendanceRequestAttachmentEntity,
      {},
      { fields: ['storageKey'] },
    );

    if (normalize(confirm ?? '') !== normalize(RESET_CONFIRMATION)) {
      throw new BadRequestException(
        `برای تایید، عبارت «${RESET_CONFIRMATION}» را وارد کنید`,
      );
    }

    const keys = Object.keys(
      scope === ResetScope.ALL ? ENTITIES : RECORD_ENTITIES,
    ) as AttendanceTable[];
    const tables = keys.map((key) => this.tableOf(key));
    if (scope === ResetScope.ALL) tables.push(APPROVER_PIVOT);

    // The rows are gone for good; a file that can't be removed only costs
    // storage, so it is logged and left.
    for (const { storageKey } of files) {
      try {
        await this.storage.deleteObject(storageKey);
      } catch (error) {
        this.logger.warn(
          `حذف فایل ${storageKey} از فضای ذخیره‌سازی ناموفق بود: ${error?.message}`,
        );
      }
    }

    const deleted = await this.em.transactional(async (em) => {
      const before = await this.summary(em);
      await em.execute(
        `truncate table ${tables
          .map((t) => `"${t}"`)
          .join(', ')} restart identity`,
      );
      return Object.fromEntries(keys.map((key) => [key, before[key]]));
    });

    // Anything already loaded in this context is gone from the database.
    this.em.clear();
    this.logger.warn(
      `داده‌های حضور و غیاب (${scope}) توسط کاربر ${
        by.id
      } پاک شد: ${JSON.stringify(deleted)}`,
    );

    return { scope, deleted };
  }
}
