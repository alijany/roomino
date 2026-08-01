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
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../roles/roles.constants';
import { CreateRoomDto } from '../dtos/create-room.dto';
import { ListQueryDto } from '../dtos/list-query.dto';
import { UpdateRoomDto } from '../dtos/update-room.dto';
import { MeetingRoomService } from '../services/meeting-room.service';

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class RoomController {
  constructor(private readonly roomService: MeetingRoomService) {}

  @Get()
  @Roles(Role.ADMIN)
  async list(@Query() query: ListQueryDto) {
    const { page = 0, limit = 10 } = query;
    const [items, total] = await this.roomService.listPaginated(page, limit);
    return {
      items,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateRoomDto) {
    return this.roomService.create({
      name: dto.name,
      description: dto.description,
      capacity: dto.capacity,
      location: dto.location,
      active: dto.active ?? true,
    });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto) {
    return this.roomService.updateOne({ id }, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.roomService.remove({ id });
    return { success: true };
  }
}
