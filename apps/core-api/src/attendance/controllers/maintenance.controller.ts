import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import { RESET_CONFIRMATION } from '../attendance.constants';
import {
  ResetAttendanceDto,
  UpdateScheduleModeDto,
  UpdateSelfDeclaredDto,
} from '../dtos/setup.dto';
import { AttendanceMaintenanceService } from '../services/attendance-maintenance.service';
import { AttendanceSettingsService } from '../services/attendance-settings.service';
import { ScheduleModeService } from '../services/schedule-mode.service';
import {
  toScheduleModePeriodView,
  toUserBrief,
} from '../utils/attendance-view.util';

/**
 * Module-wide controls: schedule mode, self-declared check-in and wiping
 * data. Admin only — not HR, who run attendance day to day: these change it
 * for everyone, and a reset can't be undone.
 */
@Controller('attendance/maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class MaintenanceController {
  constructor(
    private readonly maintenance: AttendanceMaintenanceService,
    private readonly scheduleMode: ScheduleModeService,
    private readonly settings: AttendanceSettingsService,
  ) {}

  @Get()
  @Roles(Role.ADMIN)
  async summary() {
    return {
      counts: await this.maintenance.summary(),
      confirmation: RESET_CONFIRMATION,
      scheduleMode: await this.scheduleModeView(),
      selfDeclared: await this.selfDeclaredView(),
    };
  }

  @Patch('self-declared')
  @Roles(Role.ADMIN)
  async updateSelfDeclared(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateSelfDeclaredDto,
  ) {
    await this.settings.updateSelfDeclared(dto, user);
    return this.selfDeclaredView();
  }

  private async selfDeclaredView() {
    const row = await this.settings.find();
    return {
      enabled: row?.selfDeclared ?? false,
      changedAt: row?.selfDeclaredChangedAt ?? null,
      changedBy: toUserBrief(row?.selfDeclaredChangedBy) ?? null,
    };
  }

  @Patch('schedule-mode')
  @Roles(Role.ADMIN)
  async updateScheduleMode(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateScheduleModeDto,
  ) {
    await this.scheduleMode.update(dto, user);
    return this.scheduleModeView();
  }

  private async scheduleModeView() {
    const [open, today, history] = await Promise.all([
      this.scheduleMode.open(),
      this.scheduleMode.on(),
      this.scheduleMode.history(),
    ]);
    return {
      enabled: Boolean(open),
      /** Still true on the day it's switched off — that takes effect tomorrow. */
      coversToday: Boolean(today),
      current: open ? toScheduleModePeriodView(open) : null,
      history: history.map(toScheduleModePeriodView),
    };
  }

  @Post('reset')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  reset(@CurrentUser() user: UserEntity, @Body() dto: ResetAttendanceDto) {
    return this.maintenance.reset(dto.scope, dto.confirm, user);
  }
}
