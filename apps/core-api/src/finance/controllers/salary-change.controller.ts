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
const VIEWERS = [Role.ADMIN, Role.CEO, Role.FINANCE_MANAGER];

/** Salary history of everyone. Admin-only: this is the most sensitive data in the system. */
@Controller('finance/salary-changes')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SalaryChangeController {
  constructor(private readonly salaries: SalaryChangeService) {}

  @Get()
  @Roles(...VIEWERS)
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
  @Roles(...VIEWERS)
  async overview(@Query('period', ParseIntPipe) period: number) {
    return { items: await this.salaries.overview(period) };
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body(NormalizeNumbersPipe) dto: CreateSalaryChangeDto,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.salaries.record(dto, admin.id);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  bulk(
    @Body(NormalizeNumbersPipe) dto: BulkSalaryRaiseDto,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.salaries.bulkRaise(dto, admin.id);
  }

  /** Edit an open proposal. */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdateSalaryProposalDto,
  ) {
    return this.salaries.updateProposal(id, dto);
  }

  /** Confirm proposals, all or nothing. */
  @Post('confirm')
  @Roles(Role.ADMIN)
  confirm(@Body() dto: ConfirmSalaryChangesDto) {
    return this.salaries.confirm(dto.ids);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salaries.removeChange(id);
  }
}
