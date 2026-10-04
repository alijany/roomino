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
import { SaveJobGroupDto } from '../dtos/setup.dto';
import { JobGroupService } from '../services/job-group.service';
import { toJobGroupView } from '../utils/attendance-view.util';

/** گروه‌های شغلی and their approvers — admin and HR. */
@Controller('attendance/job-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class JobGroupController {
  constructor(private readonly groups: JobGroupService) {}

  @Get()
  @Roles(Role.ADMIN, Role.HR)
  async list(@Query() query: PageQueryDto) {
    const rows = await this.groups.list(query.text);
    return {
      items: rows.map(({ group, count }) => toJobGroupView(group, count)),
    };
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  async create(@Body(NormalizeNumbersPipe) dto: SaveJobGroupDto) {
    return toJobGroupView(await this.groups.create(dto));
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: SaveJobGroupDto,
  ) {
    return toJobGroupView(await this.groups.update(id, dto));
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.groups.remove(id);
    return { success: true };
  }
}
