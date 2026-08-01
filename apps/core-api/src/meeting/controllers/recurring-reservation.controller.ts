import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../roles/roles.constants';
import { CreateRecurringDto } from '../dtos/create-recurring.dto';
import { ListQueryDto } from '../dtos/list-query.dto';
import { RecurringReservationService } from '../services/recurring-reservation.service';

@Controller('recurring-reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class RecurringReservationController {
  constructor(private readonly recurringService: RecurringReservationService) {}

  @Get()
  @Roles(Role.ADMIN)
  async list(@Query() query: ListQueryDto) {
    const { page = 0, limit = 50 } = query;
    const [items, total] = await this.recurringService.listPaginated(
      page,
      limit,
    );
    return {
      items,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateRecurringDto) {
    return this.recurringService.createChecked(dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.recurringService.remove({ id });
    return { success: true };
  }
}
