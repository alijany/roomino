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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import { AvailabilityQueryDto } from '../dtos/availability-query.dto';
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { ListQueryDto } from '../dtos/list-query.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import { ReservationService } from '../services/reservation.service';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  private isAdmin(user: UserEntity): boolean {
    return user.roles.exists((r) => r.role === Role.ADMIN);
  }

  @Get('availability')
  getAvailability(
    @Query() query: AvailabilityQueryDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.reservationService.getAvailability(
      query.date,
      query.roomIds,
      user.id,
    );
  }

  @Get('mine')
  async listMine(
    @Query() query: ListQueryDto,
    @CurrentUser() user: UserEntity,
  ) {
    const { page = 0, limit = 20 } = query;
    const [items, total] = await this.reservationService.listMine(
      user.id,
      page,
      limit,
    );
    return {
      items,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  @Post()
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: UserEntity) {
    return this.reservationService.createBooking(user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.reservationService.updateOwn(
      id,
      user.id,
      this.isAdmin(user),
      dto,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
  ) {
    await this.reservationService.removeOwn(id, user.id, this.isAdmin(user));
    return { success: true };
  }
}
