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
  CreateRecurringExpenseDto,
  ListRecurringDto,
  UpdateRecurringExpenseDto,
} from '../dtos/vendor.dto';
import { RecurringExpenseService } from '../services/recurring-expense.service';
import { toListItem, toRecurringView } from '../utils/finance-view.util';

/**
 * هزینه‌های دوره‌ای — subscriptions, bills and contracts that come round again.
 *
 * Finance and admin only: these schedules commit the company to future spend,
 * and the amounts on them are the run-rate.
 */
@Controller('finance/recurring')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RecurringExpenseController {
  constructor(private readonly recurring: RecurringExpenseService) {}

  @Get()
  @Roles(Role.FINANCE, Role.ADMIN)
  async list(@Query() query: ListRecurringDto) {
    const { items, meta } = await this.recurring.listPaginated(query);
    return { items: items.map(toRecurringView), meta };
  }

  @Get(':id')
  @Roles(Role.FINANCE, Role.ADMIN)
  async detail(@Param('id', ParseIntPipe) id: number) {
    return toRecurringView(await this.recurring.getOrFail(id));
  }

  @Post()
  @Roles(Role.FINANCE, Role.ADMIN)
  async create(
    @Body(NormalizeNumbersPipe) dto: CreateRecurringExpenseDto,
    @CurrentUser() user: UserEntity,
  ) {
    const schedule = await this.recurring.createSchedule(dto, user.id);
    return toRecurringView(await this.recurring.getOrFail(schedule.id));
  }

  @Patch(':id')
  @Roles(Role.FINANCE, Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdateRecurringExpenseDto,
  ) {
    await this.recurring.updateSchedule(id, dto);
    return toRecurringView(await this.recurring.getOrFail(id));
  }

  @Delete(':id')
  @Roles(Role.FINANCE, Role.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const { deactivated } = await this.recurring.removeSchedule(id);
    return { success: true, deactivated };
  }

  /** Create this cycle's request now rather than waiting for the lead time. */
  @Post(':id/generate')
  @Roles(Role.FINANCE, Role.ADMIN)
  async generate(@Param('id', ParseIntPipe) id: number) {
    return toListItem(await this.recurring.generateNow(id));
  }

  /** Roll forward one cycle without creating anything — "not this month". */
  @Post(':id/skip')
  @Roles(Role.FINANCE, Role.ADMIN)
  async skip(@Param('id', ParseIntPipe) id: number) {
    await this.recurring.skipCycle(id);
    return toRecurringView(await this.recurring.getOrFail(id));
  }

  /**
   * Runs the daily cycle immediately. Exposed so the scheduled job can be
   * exercised without waiting until 08:00 — admin only, since it sends real
   * notifications.
   */
  @Post('run-daily-cycle')
  @Roles(Role.ADMIN)
  runDailyCycle() {
    return this.recurring.runDailyCycle();
  }
}
