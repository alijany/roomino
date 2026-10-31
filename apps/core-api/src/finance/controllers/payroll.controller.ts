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
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { Response } from 'express';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import {
  ApplyAdvanceDto,
  ReopenPayrollDto,
  UpdatePayrollLineDto,
} from '../dtos/payroll-line.dto';
import { PayrollService } from '../services/payroll.service';
import { bankWorkbook } from '../utils/payroll-bank.util';

/** Who can look at payroll; changing it stays with the admin. */
const VIEWERS = [Role.ADMIN, Role.CEO, Role.FINANCE_MANAGER];

/**
 * Monthly payroll. Admin-only. A month is its lines: `generate` adds a draft
 * for everyone who works in it, `PATCH lines/:id` enters a person's inputs,
 * `recalculate` follows changes elsewhere, and `finalize` freezes the month
 * (or `lines/:id/finalize` just one person's line).
 */
@Controller('finance/payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PayrollController {
  constructor(private readonly payroll: PayrollService) {}

  @Get(':period')
  @Roles(...VIEWERS)
  view(@Param('period', ParseIntPipe) period: number) {
    return this.payroll.view(period);
  }

  /** The month's bank transfers, as rows. */
  @Get(':period/bank')
  @Roles(...VIEWERS)
  bank(
    @Param('period', ParseIntPipe) period: number,
    @Query('lineId') lineId?: string,
  ) {
    return this.payroll.bank(period, lineId ? Number(lineId) : undefined);
  }

  /** The same, as an Excel file; `rows` limits it to chosen transfers (`lineId:kind`, comma-separated). */
  @Get(':period/bank/xlsx')
  @Roles(...VIEWERS)
  async bankXlsx(
    @Param('period', ParseIntPipe) period: number,
    @Res() res: Response,
    @Query('lineId') lineId?: string,
    @Query('rows') chosen?: string,
  ) {
    const all = (
      await this.payroll.bank(period, lineId ? Number(lineId) : undefined)
    ).rows;
    // `rows=12:salary,12:extras,15:salary` keeps just those transfers.
    const keep = chosen ? new Set(chosen.split(',')) : null;
    const rows = (
      keep ? all.filter((r) => keep.has(`${r.lineId}:${r.kind}`)) : all
    ).map((r, i) => ({ ...r, no: i + 1 }));
    const file = await bankWorkbook(period, rows);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payroll-${period}-bank.xlsx"`,
    );
    res.send(file);
  }

  @Post(':period/generate')
  @Roles(Role.ADMIN)
  generate(@Param('period', ParseIntPipe) period: number) {
    return this.payroll.generate(period);
  }

  @Post(':period/recalculate')
  @Roles(Role.ADMIN)
  recalculate(@Param('period', ParseIntPipe) period: number) {
    return this.payroll.recalculate(period);
  }

  @Post(':period/finalize')
  @Roles(Role.ADMIN)
  finalize(@Param('period', ParseIntPipe) period: number) {
    return this.payroll.finalize(period);
  }

  /** Open every final line of the month again, with a reason. */
  @Post(':period/reopen')
  @Roles(Role.ADMIN)
  reopenMonth(
    @Param('period', ParseIntPipe) period: number,
    @Body() dto: ReopenPayrollDto,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.payroll.reopenMonth(period, dto.reason, admin.name ?? null);
  }

  /** Open one final line again, with a reason. */
  @Post('lines/:id/reopen')
  @Roles(Role.ADMIN)
  reopenLine(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReopenPayrollDto,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.payroll.reopenLine(id, dto.reason, admin.name ?? null);
  }

  @Patch('lines/:id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdatePayrollLineDto,
  ) {
    return this.payroll.updateLine(id, dto);
  }

  /** One line with the person's identity, for the payslip. */
  @Get('lines/:id')
  @Roles(...VIEWERS)
  payslip(@Param('id', ParseIntPipe) id: number) {
    return this.payroll.payslip(id);
  }

  /** Finalise one person's line only. */
  @Post('lines/:id/finalize')
  @Roles(Role.ADMIN)
  finalizeLine(@Param('id', ParseIntPipe) id: number) {
    return this.payroll.finalizeLine(id);
  }

  /** A person's approved advances: still owed, and those already taken off this line. */
  @Get('lines/:id/advances')
  @Roles(...VIEWERS)
  advances(@Param('id', ParseIntPipe) id: number) {
    return this.payroll.advances(id);
  }

  @Post('lines/:id/advances/:requestId/apply')
  @Roles(Role.ADMIN)
  applyAdvance(
    @Param('id', ParseIntPipe) id: number,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body(NormalizeNumbersPipe) dto: ApplyAdvanceDto,
  ) {
    return this.payroll.applyAdvance(id, requestId, dto.amount);
  }

  @Post('lines/:id/advances/:requestId/unapply')
  @Roles(Role.ADMIN)
  unapplyAdvance(
    @Param('id', ParseIntPipe) id: number,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.payroll.unapplyAdvance(id, requestId);
  }

  @Delete('lines/:id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.payroll.removeLine(id);
  }
}
