import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { ResetAttendanceDto } from '../dtos/setup.dto';
import { AttendanceMaintenanceService } from '../services/attendance-maintenance.service';

/**
 * Wiping attendance data. Admin only — not HR, who run attendance day to
 * day: a reset can't be undone.
 */
@Controller('attendance/maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class MaintenanceController {
  constructor(private readonly maintenance: AttendanceMaintenanceService) {}

  @Get()
  @Roles(Role.ADMIN)
  async summary() {
    return {
      counts: await this.maintenance.summary(),
      confirmation: RESET_CONFIRMATION,
    };
  }

  @Post('reset')
  @HttpCode(200)
  @Roles(Role.ADMIN)
  reset(@CurrentUser() user: UserEntity, @Body() dto: ResetAttendanceDto) {
    return this.maintenance.reset(dto.scope, dto.confirm, user);
  }
}
