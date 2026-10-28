import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import {
  CreatePayrollSettingDto,
  UpdatePayrollSettingDto,
} from '../dtos/payroll-setting.dto';
import { PayrollSettingService } from '../services/payroll-setting.service';

/**
 * The legal payroll parameters, one set per Jalali year. Admin-only: these
 * figures decide everyone's pay.
 */
@Controller('finance/payroll-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PayrollSettingController {
  constructor(private readonly settings: PayrollSettingService) {}

  @Get()
  @Roles(Role.ADMIN)
  async years() {
    return { years: await this.settings.years() };
  }

  @Get(':year')
  @Roles(Role.ADMIN)
  view(@Param('year', ParseIntPipe) year: number) {
    return this.settings.view(year);
  }

  @Post(':year')
  @Roles(Role.ADMIN)
  create(
    @Param('year', ParseIntPipe) year: number,
    @Body(NormalizeNumbersPipe) dto: CreatePayrollSettingDto,
  ) {
    return this.settings.startYear(year, dto.copyFrom);
  }

  @Put(':year')
  @Roles(Role.ADMIN)
  update(
    @Param('year', ParseIntPipe) year: number,
    @Body(NormalizeNumbersPipe) dto: UpdatePayrollSettingDto,
  ) {
    return this.settings.saveYear(year, dto);
  }
}
