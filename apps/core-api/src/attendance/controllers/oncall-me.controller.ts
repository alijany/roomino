import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { UserEntity } from '../../user/user.entity';
import { CreateOnCallSwapDto, OnCallPeriodQueryDto } from '../dtos/oncall.dto';
import { OnCallService } from '../services/oncall.service';
import { OnCallSwapService } from '../services/oncall-swap.service';

/**
 * کشیک من — the caller's own coming days and swap requests. Any signed-in
 * person; no role needed.
 */
@Controller('oncall/me')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class OnCallMeController {
  constructor(
    private readonly swaps: OnCallSwapService,
    private readonly oncall: OnCallService,
  ) {}

  /** The whole period as colleagues see it: published only. */
  @Get('schedule')
  schedule(
    @CurrentUser() user: UserEntity,
    @Query() query: OnCallPeriodQueryDto,
  ) {
    return this.oncall.schedule(user, query.year, query.month, true);
  }

  @Get('summary')
  summary(@CurrentUser() user: UserEntity) {
    return this.swaps.summary(user);
  }

  @Get('shifts')
  shifts(@CurrentUser() user: UserEntity) {
    return this.swaps.upcomingShifts(user.id).then((items) => ({ items }));
  }

  @Get('colleagues')
  colleagues(@CurrentUser() user: UserEntity) {
    return this.swaps.colleagues(user).then((items) => ({ items }));
  }

  @Get('colleagues/:id/shifts')
  colleagueShifts(@Param('id', ParseIntPipe) id: number) {
    return this.swaps.upcomingShifts(id).then((items) => ({ items }));
  }

  @Get('swaps')
  mine(@CurrentUser() user: UserEntity) {
    return this.swaps.mine(user);
  }

  @Post('swaps')
  create(
    @CurrentUser() user: UserEntity,
    @Body(NormalizeNumbersPipe) dto: CreateOnCallSwapDto,
  ) {
    return this.swaps.create(user, dto);
  }

  @Post('swaps/:id/accept')
  accept(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.swaps.accept(user, id);
  }

  @Post('swaps/:id/decline')
  decline(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.swaps.decline(user, id);
  }

  @Post('swaps/:id/cancel')
  cancel(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.swaps.cancel(user, id);
  }
}
