import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../../auth/guards/staff.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { UserEntity } from '../../user/user.entity';
import {
  CopyPreviousOnCallDto,
  OnCallPeriodQueryDto,
  PublishOnCallDto,
  RepeatOnCallDto,
  ResolveOnCallChangesDto,
  SaveOnCallDayDto,
  SaveOnCallSettingsDto,
} from '../dtos/oncall.dto';
import { OnCallPeriodStatus } from '../entities/oncall.entities';
import { onCallReportWorkbook } from '../utils/oncall-report.util';
import { OnCallService } from '../services/oncall.service';
import { OnCallSwapService } from '../services/oncall-swap.service';

/**
 * کشیک — the organisation's single on-call list. Admin and HR lay it out;
 * everyone else sees a period once it is published.
 */
@Controller('oncall')
@UseGuards(JwtAuthGuard, StaffGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class OnCallController {
  constructor(
    private readonly oncall: OnCallService,
    private readonly swaps: OnCallSwapService,
  ) {}

  /** The swap log; admin and HR only. */
  @Get('swaps')
  async swapLog(@CurrentUser() user: UserEntity) {
    await this.oncall.requireManage(user);
    return this.swaps.log(200);
  }

  /** Hours on call per person for a period; admin and HR only. */
  @Get('report')
  report(
    @CurrentUser() user: UserEntity,
    @Query() query: OnCallPeriodQueryDto,
  ) {
    return this.oncall.report(user, query.year, query.month);
  }

  @Get('report/export')
  async exportReport(
    @CurrentUser() user: UserEntity,
    @Query() query: OnCallPeriodQueryDto,
    @Res() res: Response,
  ) {
    const { period, rates, items } = await this.oncall.report(
      user,
      query.year,
      query.month,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="oncall-report.xlsx"',
    );
    res.send(await onCallReportWorkbook(period, rates, items));
  }

  /** Edits to the published schedule not yet announced. */
  @Get('changes')
  changes(@CurrentUser() user: UserEntity) {
    return this.oncall.pendingChanges(user);
  }

  @Post('changes/resolve')
  resolveChanges(
    @CurrentUser() user: UserEntity,
    @Body() dto: ResolveOnCallChangesDto,
  ) {
    return this.oncall.resolveChanges(user, dto.notify);
  }

  @Get('settings')
  settings(@CurrentUser() user: UserEntity) {
    return this.oncall.getSettings(user);
  }

  @Put('settings')
  saveSettings(
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: SaveOnCallSettingsDto,
  ) {
    return this.oncall.saveSettings(user, dto);
  }

  @Get('schedule')
  schedule(
    @CurrentUser() user: UserEntity,
    @Query() query: OnCallPeriodQueryDto,
  ) {
    return this.oncall.schedule(user, query.year, query.month);
  }

  @Put('days/:date')
  saveDay(
    @CurrentUser() user: UserEntity,
    @Param('date') date: string,
    @Body(NormalizeNumbersPipe) dto: SaveOnCallDayDto,
  ) {
    return this.oncall.saveDay(user, date, dto.entries);
  }

  @Post('repeat')
  repeat(
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: RepeatOnCallDto,
  ) {
    return this.oncall.repeat(user, dto.year, dto.month, dto.replace ?? false);
  }

  @Post('copy-previous')
  copyPrevious(
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: CopyPreviousOnCallDto,
  ) {
    return this.oncall.copyFromPrevious(
      user,
      dto.year,
      dto.month,
      dto.mode,
      dto.replace ?? false,
    );
  }

  @Post('publish')
  publish(
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: PublishOnCallDto,
  ) {
    return this.oncall.setStatus(
      user,
      dto.year,
      dto.month,
      OnCallPeriodStatus.PUBLISHED,
      dto.notify ?? true,
    );
  }

  @Post('unpublish')
  unpublish(
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: OnCallPeriodQueryDto,
  ) {
    return this.oncall.setStatus(
      user,
      dto.year,
      dto.month,
      OnCallPeriodStatus.DRAFT,
    );
  }
}
