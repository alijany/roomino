import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import {
  ListHolidaysDto,
  SaveHolidayDto,
  SyncHolidaysDto,
} from '../dtos/holiday.dto';
import { HolidayService } from '../services/holiday.service';
import { toHolidayView } from '../utils/attendance-view.util';

/** Holidays: anyone signed in reads them; admin and HR maintain them. */
@Controller('attendance/holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HolidayController {
  constructor(private readonly holidays: HolidayService) {}

  @Get()
  async list(@Query() query: ListHolidaysDto) {
    return { items: (await this.holidays.list(query)).map(toHolidayView) };
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  async create(@Body(NormalizeNumbersPipe) dto: SaveHolidayDto) {
    return toHolidayView(await this.holidays.create(dto));
  }

  @Post('sync')
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.HR)
  async sync(@Body(NormalizeNumbersPipe) dto: SyncHolidaysDto) {
    return this.holidays.syncOfficial(dto.year);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: SaveHolidayDto,
  ) {
    return toHolidayView(await this.holidays.update(id, dto));
  }

  @Post(':id/toggle')
  @HttpCode(200)
  @Roles(Role.ADMIN, Role.HR)
  async toggle(@Param('id', ParseIntPipe) id: number) {
    return toHolidayView(await this.holidays.toggle(id));
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.holidays.remove(id);
    return { success: true };
  }
}
