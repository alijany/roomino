import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { UserEntity } from '../../user/user.entity';
import { CheckInDto, CheckOutDto } from '../dtos/attendance.dto';
import { PeriodQueryDto } from '../dtos/common.dto';
import { CreateRequestDto, ListRequestsDto } from '../dtos/request.dto';
import { AttendanceExportService } from '../services/attendance-export.service';
import { AttendanceService } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { HolidayService } from '../services/holiday.service';
import { ReportService } from '../services/report.service';
import { RequestService } from '../services/request.service';
import { tehranToday } from '../utils/attendance-time.util';
import {
  toAttendanceView,
  toEmployeeView,
  toLeaveBalanceView,
  toRequestView,
  toWorkplaceView,
} from '../utils/attendance-view.util';
import { sendCsv } from '../utils/attendance-csv.util';

/**
 * Self-service: the caller's own day, check-in/out, report and requests.
 * Any signed-in user with an active profile; no role needed.
 */
@Controller('attendance/me')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class MeController {
  constructor(
    private readonly employees: EmployeeService,
    private readonly attendance: AttendanceService,
    private readonly holidays: HolidayService,
    private readonly reports: ReportService,
    private readonly requests: RequestService,
    private readonly exports: AttendanceExportService,
  ) {}

  /**
   * Everything the attendance home screen needs. A user without a profile
   * gets `{ hasProfile: false }` rather than a 403, so the UI can explain.
   */
  @Get()
  async today(@CurrentUser() user: UserEntity) {
    const [profile, isApprover] = await Promise.all([
      this.employees.findByUser(user.id),
      this.employees.isApprover(user.id),
    ]);

    if (!profile || !profile.active) {
      return {
        hasProfile: false,
        active: profile?.active ?? false,
        isApprover,
      };
    }

    const today = tehranToday();
    const [day, holiday, remoteStatus, report, current, pending] =
      await Promise.all([
        this.attendance.findDay(profile.id, today),
        this.holidays.isHoliday(today),
        this.attendance.remoteStatus(profile, today),
        this.reports.report(profile, this.reports.periodOf({})),
        this.employees.currentAssignment(profile.id),
        this.requests.pendingCountByEmployee([profile.id]),
      ]);
    const todayRow = report.days.find((d) => d.date === today);

    return {
      hasProfile: true,
      isApprover,
      date: today,
      profile: toEmployeeView(profile, current),
      workplace: profile.workplace ? toWorkplaceView(profile.workplace) : null,
      attendance: day ? toAttendanceView(day) : null,
      holiday: holiday?.title ?? null,
      remoteStatus,
      shiftStart: todayRow?.shiftStart ?? null,
      shiftEnd: todayRow?.shiftEnd ?? null,
      month: {
        label: report.period.label,
        worked: report.summary.worked,
        overtime: report.summary.overtime,
        absence: report.summary.absentMinutes,
        leave: report.summary.leaveMinutes,
        balance: report.summary.balance,
      },
      pendingRequests: pending.get(profile.id) ?? 0,
    };
  }

  @Post('check-in')
  @HttpCode(200)
  async checkIn(
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: CheckInDto,
  ) {
    const profile = await this.employees.requireOwn(user);
    const result = await this.attendance.checkIn(profile, dto);
    return {
      ...result,
      attendance: result.attendance
        ? toAttendanceView(result.attendance)
        : null,
    };
  }

  @Post('check-out')
  @HttpCode(200)
  async checkOut(
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: CheckOutDto,
  ) {
    const profile = await this.employees.requireOwn(user);
    const result = await this.attendance.checkOut(profile, dto);
    return {
      ...result,
      attendance: result.attendance
        ? toAttendanceView(result.attendance)
        : null,
    };
  }

  @Get('report')
  async report(
    @CurrentUser() user: UserEntity,
    @Query() query: PeriodQueryDto,
  ) {
    const profile = await this.employees.requireOwn(user);
    return this.reports.report(profile, this.reports.periodOf(query));
  }

  @Get('report/export')
  async export(
    @CurrentUser() user: UserEntity,
    @Query() query: PeriodQueryDto,
    @Res() res: Response,
  ) {
    const profile = await this.employees.requireOwn(user);
    const period = this.reports.periodOf(query);
    sendCsv(
      res,
      `attendance-${period.from}-${period.to}.csv`,
      await this.exports.employeeCsv(profile, period),
    );
  }

  @Get('balances')
  async balances(@CurrentUser() user: UserEntity) {
    const profile = await this.employees.requireOwn(user);
    return {
      items: (await this.requests.balances(profile.id)).map(toLeaveBalanceView),
    };
  }

  // --- my requests ------------------------------------------------------------------------

  @Get('requests')
  async myRequests(
    @CurrentUser() user: UserEntity,
    @Query() query: ListRequestsDto,
  ) {
    const profile = await this.employees.requireOwn(user);
    const { items, counts, meta } = await this.requests.list(
      { ...query, text: undefined, employeeId: undefined },
      [profile.id],
    );
    return { items: items.map(toRequestView), counts, meta };
  }

  @Post('requests')
  async submit(
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: CreateRequestDto,
  ) {
    const profile = await this.employees.requireOwn(user);
    return toRequestView(await this.requests.submit(profile, dto));
  }

  @Delete('requests/:id')
  async cancel(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profile = await this.employees.requireOwn(user);
    await this.requests.cancelOwn(profile, id);
    return { success: true };
  }
}
