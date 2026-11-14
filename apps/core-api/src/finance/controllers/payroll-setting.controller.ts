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
import { StaffGuard } from '../../auth/guards/staff.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import {
  CreatePayrollSettingDto,
  SupplementaryEnabledDto,
  SupplementaryPolicyDto,
  UpdatePayrollSettingDto,
} from '../dtos/payroll-setting.dto';
import { SiteSettingsService } from '../../settings/site-settings.service';
import { PayrollSettingService } from '../services/payroll-setting.service';

/** Who can look at payroll; changing it stays with the admin. */
const PAYROLL_ROLES = [
  Role.ADMIN,
  Role.CEO,
  Role.FINANCE_MANAGER,
  Role.PERSONNEL,
];

/**
 * The legal payroll parameters, one set per Jalali year. Admin-only: these
 * figures decide everyone's pay.
 */
@Controller('admin/finance/payroll-settings')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PayrollSettingController {
  constructor(
    private readonly settings: PayrollSettingService,
    private readonly siteSettings: SiteSettingsService,
  ) {}

  @Get()
  @Roles(...PAYROLL_ROLES)
  async years() {
    return { years: await this.settings.years() };
  }

  /** The switch for the whole supplementary insurance, apart from any year. */
  @Put('supplementary-insurance/enabled')
  @Roles(...PAYROLL_ROLES)
  async setSupplementaryEnabled(@Body() dto: SupplementaryEnabledDto) {
    await this.siteSettings.update({
      supplementaryInsuranceEnabled: dto.enabled,
    });
    return { enabled: dto.enabled };
  }

  @Get(':year')
  @Roles(...PAYROLL_ROLES)
  view(@Param('year', ParseIntPipe) year: number) {
    return this.settings.view(year);
  }

  @Post(':year')
  @Roles(...PAYROLL_ROLES)
  create(
    @Param('year', ParseIntPipe) year: number,
    @Body(NormalizeNumbersPipe) dto: CreatePayrollSettingDto,
  ) {
    return this.settings.startYear(year, dto.copyFrom);
  }

  @Put(':year/supplementary')
  @Roles(...PAYROLL_ROLES)
  saveSupplementary(
    @Param('year', ParseIntPipe) year: number,
    @Body(NormalizeNumbersPipe) dto: SupplementaryPolicyDto,
  ) {
    return this.settings.saveSupplementary(year, dto);
  }

  @Put(':year')
  @Roles(...PAYROLL_ROLES)
  update(
    @Param('year', ParseIntPipe) year: number,
    @Body(NormalizeNumbersPipe) dto: UpdatePayrollSettingDto,
  ) {
    return this.settings.saveYear(year, dto);
  }
}
