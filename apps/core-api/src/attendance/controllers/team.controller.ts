import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
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
import { CorrectAttendanceDto } from '../dtos/attendance.dto';
import { PeriodQueryDto } from '../dtos/common.dto';
import { UpdateTeamMemberDto } from '../dtos/employee.dto';
import { ListRequestsDto, RejectRequestDto } from '../dtos/request.dto';
import { AttendanceExportService } from '../services/attendance-export.service';
import { AttendanceService } from '../services/attendance.service';
import { EmployeeService } from '../services/employee.service';
import { ReportService } from '../services/report.service';
import { RequestService } from '../services/request.service';
import {
  toAttendanceView,
  toEmployeeBrief,
  toEmployeeView,
  toRequestView,
} from '../utils/attendance-view.util';
import { sendCsv } from '../utils/attendance-csv.util';

/**
 * "My team" — for job-group approvers. No role is required: access is the
 * approver assignment, checked on every call, and only ever reaches members
 * of the caller's groups, never the caller.
 */
@Controller('attendance/team')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TeamController {
  constructor(
    private readonly employees: EmployeeService,
    private readonly reports: ReportService,
    private readonly requests: RequestService,
    private readonly attendance: AttendanceService,
    private readonly exports: AttendanceExportService,
  ) {}

  @Get('board')
  async board(@CurrentUser() user: UserEntity, @Query('text') text?: string) {
    await this.employees.requireApprover(user.id);
    const ids = await this.employees.teamIds(user.id, true);
    const profiles = ids.length
      ? await this.employees.findActive({ ids, text })
      : [];
    const board = await this.reports.board(profiles);
    const pending = await this.requests.pendingCountByEmployee(ids);

    return {
      ...board,
      rows: board.rows.map(({ profile, ...row }) => ({
        ...row,
        employee: toEmployeeBrief(profile),
        jobGroup: profile.jobGroup?.name ?? null,
      })),
      stats: {
        ...board.stats,
        pending: [...pending.values()].reduce((a, b) => a + b, 0),
      },
    };
  }

  @Get('requests')
  async requestList(
    @CurrentUser() user: UserEntity,
    @Query() query: ListRequestsDto,
  ) {
    await this.employees.requireApprover(user.id);
    const ids = await this.employees.teamIds(user.id);
    const { items, counts, meta } = await this.requests.list(query, ids);
    return { items: items.map(toRequestView), counts, meta };
  }

  /** A pending request of a team member, or 404. */
  private async teamRequest(userId: number, id: number) {
    await this.employees.requireApprover(userId);
    const request = await this.requests.getOrFail(id);
    await this.employees.teamMemberOrFail(userId, request.employee.id);
    return request;
  }

  @Post('requests/:id/approve')
  @HttpCode(200)
  async approve(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.teamRequest(user.id, id);
    return toRequestView(await this.requests.approve(id, user));
  }

  @Post('requests/:id/reject')
  @HttpCode(200)
  async reject(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: RejectRequestDto,
  ) {
    await this.teamRequest(user.id, id);
    return toRequestView(await this.requests.reject(id, user, dto.note));
  }

  @Get('members/:id')
  async member(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.employees.requireApprover(user.id);
    const profile = await this.employees.teamMemberOrFail(user.id, id);
    return toEmployeeView(profile, await this.employees.currentAssignment(id));
  }

  @Get('members/:id/report')
  async memberReport(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PeriodQueryDto,
  ) {
    await this.employees.requireApprover(user.id);
    const profile = await this.employees.teamMemberOrFail(user.id, id);
    return this.reports.report(profile, this.reports.periodOf(query));
  }

  @Get('members/:id/export')
  async memberExport(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PeriodQueryDto,
    @Res() res: Response,
  ) {
    await this.employees.requireApprover(user.id);
    const profile = await this.employees.teamMemberOrFail(user.id, id);
    const period = this.reports.periodOf(query);
    sendCsv(
      res,
      `attendance-${profile.personnelCode}-${period.from}-${period.to}.csv`,
      await this.exports.employeeCsv(profile, period),
    );
  }

  @Patch('members/:id')
  async updateMember(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdateTeamMemberDto,
  ) {
    await this.employees.requireApprover(user.id);
    const profile = await this.employees.updateTeamMember(user.id, id, dto);
    return toEmployeeView(profile, await this.employees.currentAssignment(id));
  }

  @Post('members/:id/attendance')
  async correct(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: CorrectAttendanceDto,
  ) {
    await this.employees.requireApprover(user.id);
    const profile = await this.employees.teamMemberOrFail(user.id, id);
    return toAttendanceView(await this.attendance.correct(profile, dto, user));
  }
}
