import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { CreateShiftDto, UpdateShiftDto } from '../dtos/setup.dto';
import { ShiftService } from '../services/shift.service';
import { toShiftView } from '../utils/attendance-view.util';

/**
 * Shifts. Reading is open to any signed-in user — team approvers pick a
 * shift for their members — but only admin and HR change them.
 */
@Controller('attendance/shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ShiftController {
  constructor(private readonly shifts: ShiftService) {}

  @Get()
  async list() {
    return { items: (await this.shifts.list()).map(toShiftView) };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    return toShiftView(await this.shifts.getOrFail(id));
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  async create(@Body(NormalizeNumbersPipe) dto: CreateShiftDto) {
    return toShiftView(await this.shifts.create(dto));
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdateShiftDto,
  ) {
    return toShiftView(await this.shifts.update(id, dto));
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.shifts.remove(id);
    return { success: true };
  }
}
