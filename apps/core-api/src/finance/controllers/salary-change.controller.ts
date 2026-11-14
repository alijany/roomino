import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { StaffGuard } from '../../auth/guards/staff.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import {
  BulkSalaryRaiseDto,
  ConfirmSalaryChangesDto,
  CreateSalaryChangeDto,
  UpdateSalaryProposalDto,
} from '../dtos/salary-change.dto';
import { SalaryChangeStatus, SalaryChangeType } from '../finance.constants';
import { SalaryChangeService } from '../services/salary-change.service';

/** Who can look at payroll; changing it stays with the admin. */
const PAYROLL_ROLES = [
  Role.ADMIN,
  Role.CEO,
  Role.FINANCE_MANAGER,
  Role.PERSONNEL,
];

/** Salary history of everyone. Admin-only: this is the most sensitive data in the system. */
@Controller('admin/finance/salary-changes')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SalaryChangeController {
  constructor(private readonly salaries: SalaryChangeService) {}

  @Get()
  @Roles(...PAYROLL_ROLES)
  async list(
    @Query('userId') userId?: string,
    @Query('text') text?: string,
    @Query('type') type?: SalaryChangeType,
    @Query('status') status?: SalaryChangeStatus,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('onlyLatest') onlyLatest?: string,
  ) {
    const num = (v?: string) => (v ? Number(v) : undefined);
    return {
      items: await this.salaries.list({
        userId: num(userId),
        text,
        type,
        status,
        year: num(year),
        month: num(month),
        onlyLatest: onlyLatest === 'true',
      }),
    };
  }

  @Get('overview')
  @Roles(...PAYROLL_ROLES)
  async overview(@Query('period', ParseIntPipe) period: number) {
    return { items: await this.salaries.overview(period) };
  }

  @Post()
  @Roles(...PAYROLL_ROLES)
  create(
    @Body(NormalizeNumbersPipe) dto: CreateSalaryChangeDto,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.salaries.record(dto, admin.id);
  }

  @Post('bulk')
  @Roles(...PAYROLL_ROLES)
  bulk(
    @Body(NormalizeNumbersPipe) dto: BulkSalaryRaiseDto,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.salaries.bulkRaise(dto, admin.id);
  }

  /** Edit an open proposal. */
  @Patch(':id')
  @Roles(...PAYROLL_ROLES)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdateSalaryProposalDto,
  ) {
    return this.salaries.updateProposal(id, dto);
  }

  /** Confirm proposals, all or nothing. */
  @Post('confirm')
  @Roles(...PAYROLL_ROLES)
  confirm(@Body() dto: ConfirmSalaryChangesDto) {
    return this.salaries.confirm(dto.ids);
  }

  @Delete(':id')
  @Roles(...PAYROLL_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salaries.removeChange(id);
  }
}
