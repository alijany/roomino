import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { EmployeeController } from './controllers/employee.controller';
import { HolidayController } from './controllers/holiday.controller';
import { JobGroupController } from './controllers/job-group.controller';
import { MeController } from './controllers/me.controller';
import { ReportController } from './controllers/report.controller';
import { RequestController } from './controllers/request.controller';
import { ShiftController } from './controllers/shift.controller';
import { TeamController } from './controllers/team.controller';
import { WorkPolicyController } from './controllers/work-policy.controller';
import { WorkplaceController } from './controllers/workplace.controller';
import { AttendanceRequestEntity } from './entities/attendance-request.entity';
import { AttendanceEntity } from './entities/attendance.entity';
import { EmployeeProfileEntity } from './entities/employee-profile.entity';
import { EmployeeShiftEntity } from './entities/employee-shift.entity';
import { HolidayEntity } from './entities/holiday.entity';
import { JobGroupEntity } from './entities/job-group.entity';
import { LeaveBalanceEntity } from './entities/leave-balance.entity';
import { ShiftDayEntity } from './entities/shift-day.entity';
import { ShiftEntity } from './entities/shift.entity';
import { WorkPolicyRuleEntity } from './entities/work-policy-rule.entity';
import { WorkPolicyEntity } from './entities/work-policy.entity';
import { WorkplaceEntity } from './entities/workplace.entity';
import { AttendanceExportService } from './services/attendance-export.service';
import { AttendanceNotificationService } from './services/attendance-notification.service';
import { AttendanceScheduleService } from './services/attendance-schedule.service';
import { AttendanceService } from './services/attendance.service';
import { EmployeeService } from './services/employee.service';
import { HolidayService } from './services/holiday.service';
import { JobGroupService } from './services/job-group.service';
import { ReportService } from './services/report.service';
import { RequestService } from './services/request.service';
import { ShiftService } from './services/shift.service';
import { WorkPolicyService } from './services/work-policy.service';
import { WorkplaceService } from './services/workplace.service';

/**
 * Attendance & leave — ported from the Tesmino attendance app (Laravel).
 *
 * People are Roomino users with an `EmployeeProfileEntity`; admin and HR
 * run the setup data and company reports, job-group approvers run "my
 * team", and everyone with a profile checks in and files requests.
 *
 * See README.md in this folder.
 */
@Module({
  imports: [
    MikroOrmModule.forFeature([
      WorkplaceEntity,
      ShiftEntity,
      ShiftDayEntity,
      JobGroupEntity,
      WorkPolicyEntity,
      WorkPolicyRuleEntity,
      EmployeeProfileEntity,
      EmployeeShiftEntity,
      AttendanceEntity,
      AttendanceRequestEntity,
      HolidayEntity,
      LeaveBalanceEntity,
    ]),
    NotificationModule,
  ],
  providers: [
    WorkplaceService,
    ShiftService,
    JobGroupService,
    WorkPolicyService,
    EmployeeService,
    HolidayService,
    AttendanceNotificationService,
    AttendanceService,
    RequestService,
    ReportService,
    AttendanceExportService,
    AttendanceScheduleService,
  ],
  controllers: [
    WorkplaceController,
    ShiftController,
    JobGroupController,
    WorkPolicyController,
    EmployeeController,
    MeController,
    RequestController,
    HolidayController,
    ReportController,
    TeamController,
  ],
})
export class AttendanceModule {}
