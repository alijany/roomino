import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import { CorrectAttendanceDto } from '../dtos/attendance.dto';
import { PeriodQueryDto } from '../dtos/common.dto';
import { PerformanceQueryDto } from '../dtos/report.dto';
import { GrantRequestDto } from '../dtos/request.dto';
import { AttendanceExportService } from '../services/attendance-export.service';
import { AttendanceService } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { ReportService } from '../services/report.service';
import { RequestService } from '../services/request.service';
import {
  toAttendanceView,
  toEmployeeBrief,
  toRequestView,
} from '../utils/attendance-view.util';
import { sendCsv } from '../utils/attendance-csv.util';

/** Company-wide boards and reports, plus admin/HR corrections and grants. */
@Controller('attendance/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ReportController {
  constructor(
    private readonly employees: EmployeeService,
    private readonly reports: ReportService,
    private readonly requests: RequestService,
    private readonly attendance: AttendanceService,
    private readonly exports: AttendanceExportService,
  ) {}

  /** Today's board for every active person. */
  @Get('board')
  @Roles(Role.ADMIN, Role.HR)
  async board() {
    const profiles = await this.employees.findActive();
    const board = await this.reports.board(profiles);
    const pending = await this.requests.list({ limit: 5 });

    return {
      ...board,
      rows: board.rows.map(({ profile, ...row }) => ({
        ...row,
        employee: toEmployeeBrief(profile),
        workplace: profile.workplace?.name ?? null,
      })),
      stats: { ...board.stats, pending: pending.counts.pending },
      pendingRequests: pending.items.map(toRequestView),
    };
  }

  @Get('performance')
  @Roles(Role.ADMIN, Role.HR)
  async performance(@Query() query: PerformanceQueryDto) {
    const period = this.reports.periodOf(query);
    const profiles = await this.employees.findActive(query);
    const [rows, pending] = await Promise.all([
      this.reports.summaries(profiles, period),
      this.requests.pendingCountByEmployee(),
    ]);

    return {
      period,
      items: rows.map(({ profile, summary }) => ({
        employee: toEmployeeBrief(profile),
        workplace: profile.workplace?.name ?? null,
        jobGroup: profile.jobGroup?.name ?? null,
        summary,
        pending: pending.get(profile.id) ?? 0,
      })),
    };
  }

  @Get('performance/export')
  @Roles(Role.ADMIN, Role.HR)
  async performanceExport(
    @Query() query: PerformanceQueryDto,
    @Res() res: Response,
  ) {
    const period = this.reports.periodOf(query);
    const profiles = await this.employees.findActive(query);
    const pending = await this.requests.pendingCountByEmployee();
    sendCsv(
      res,
      `performance-${period.from}-${period.to}.csv`,
      await this.exports.performanceCsv(profiles, period, pending),
    );
  }

  @Get('employees/:id')
  @Roles(Role.ADMIN, Role.HR)
  async employee(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PeriodQueryDto,
  ) {
    const profile = await this.employees.getOrFail(id);
    return this.reports.report(profile, this.reports.periodOf(query));
  }

  @Get('employees/:id/export')
  @Roles(Role.ADMIN, Role.HR)
  async employeeExport(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PeriodQueryDto,
    @Res() res: Response,
  ) {
    const profile = await this.employees.getOrFail(id);
    const period = this.reports.periodOf(query);
    sendCsv(
      res,
      `attendance-${profile.personnelCode}-${period.from}-${period.to}.csv`,
      await this.exports.employeeCsv(profile, period),
    );
  }

  @Post('employees/:id/attendance')
  @Roles(Role.ADMIN, Role.HR)
  async correct(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: CorrectAttendanceDto,
    @CurrentUser() user: UserEntity,
  ) {
    const profile = await this.employees.getOrFail(id);
    return toAttendanceView(await this.attendance.correct(profile, dto, user));
  }

  /** Grant leave or remote work, created already approved. */
  @Post('employees/:id/grants')
  @Roles(Role.ADMIN, Role.HR)
  async grant(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: GrantRequestDto,
    @CurrentUser() user: UserEntity,
  ) {
    const profile = await this.employees.getOrFail(id);
    return toRequestView(await this.requests.grant(profile, dto, user));
  }
}
