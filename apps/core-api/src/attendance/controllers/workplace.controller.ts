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
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { PageQueryDto } from '../dtos/common.dto';
import { CreateWorkplaceDto, UpdateWorkplaceDto } from '../dtos/setup.dto';
import { WorkplaceService } from '../services/workplace.service';
import { toWorkplaceView } from '../utils/attendance-view.util';

/** محل‌های کار — admin and HR. */
@Controller('attendance/workplaces')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkplaceController {
  constructor(private readonly workplaces: WorkplaceService) {}

  @Get()
  @Roles(Role.ADMIN, Role.HR)
  async list(@Query() query: PageQueryDto) {
    const items = await this.workplaces.list(query.text);
    return { items: items.map(toWorkplaceView) };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR)
  async detail(@Param('id', ParseIntPipe) id: number) {
    return toWorkplaceView(await this.workplaces.getOrFail(id));
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  async create(@Body(NormalizeNumbersPipe) dto: CreateWorkplaceDto) {
    return toWorkplaceView(await this.workplaces.create(dto));
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdateWorkplaceDto,
  ) {
    return toWorkplaceView(await this.workplaces.update(id, dto));
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const { deactivated } = await this.workplaces.remove(id);
    return { success: true, deactivated };
  }
}
