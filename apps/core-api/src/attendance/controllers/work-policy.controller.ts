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
import { SaveWorkPolicyDto } from '../dtos/setup.dto';
import { WorkPolicyService } from '../services/work-policy.service';
import { toWorkPolicyView } from '../utils/attendance-view.util';

/** سیاست‌های کاری — admin and HR. */
@Controller('attendance/work-policies')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WorkPolicyController {
  constructor(private readonly policies: WorkPolicyService) {}

  @Get()
  @Roles(Role.ADMIN, Role.HR)
  async list() {
    return { items: (await this.policies.list()).map(toWorkPolicyView) };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR)
  async detail(@Param('id', ParseIntPipe) id: number) {
    return toWorkPolicyView(await this.policies.getOrFail(id));
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  async create(@Body(NormalizeNumbersPipe) dto: SaveWorkPolicyDto) {
    return toWorkPolicyView(await this.policies.save(null, dto));
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: SaveWorkPolicyDto,
  ) {
    await this.policies.getOrFail(id);
    return toWorkPolicyView(await this.policies.save(id, dto));
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.policies.remove(id);
    return { success: true };
  }
}
