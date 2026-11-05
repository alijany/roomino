import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsInt, IsOptional, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { StaffGuard } from '../../auth/guards/staff.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { PageQueryDto } from '../dtos/common.dto';
import { SaveJobGroupDto } from '../dtos/setup.dto';
import { JobGroupService } from '../services/job-group.service';
import { toJobGroupView, toUserBrief } from '../utils/attendance-view.util';

class SetUserTeamDto {
  /** `null` takes the person out of their team. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  teamId: number | null;
}

/**
 * تیم‌ها — the organisation's teams: name, parent team, managers and members.
 * Attendance settings (mode, fixed remote days) of a team are edited from
 * the attendance settings and live on the same record.
 */
@Controller('admin/teams')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TeamsController {
  constructor(private readonly teams: JobGroupService) {}

  @Get()
  @Roles(Role.ADMIN, Role.HR)
  async list(@Query() query: PageQueryDto) {
    const rows = await this.teams.list(query.text);
    return {
      items: rows.map(({ group, count }) => toJobGroupView(group, count)),
    };
  }

  @Get('manager-candidates')
  @Roles(Role.ADMIN, Role.HR)
  async managerCandidates(@Query() query: PageQueryDto) {
    const users = await this.teams.searchUsers(query.text);
    return { items: users.map(toUserBrief) };
  }

  @Get(':id/members')
  @Roles(Role.ADMIN, Role.HR)
  async members(@Param('id', ParseIntPipe) id: number) {
    await this.teams.getOrFail(id);
    const users = await this.teams.members(id);
    return { items: users.map(toUserBrief) };
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  async create(@Body(NormalizeNumbersPipe) dto: SaveJobGroupDto) {
    return toJobGroupView(await this.teams.create(dto));
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: SaveJobGroupDto,
  ) {
    return toJobGroupView(await this.teams.update(id, dto));
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.teams.remove(id);
    return { success: true };
  }

  /** Put a person in a team, or take them out. */
  @Put('users/:userId')
  @Roles(Role.ADMIN, Role.HR)
  async setUserTeam(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SetUserTeamDto,
  ) {
    await this.teams.setUserTeam(userId, dto.teamId);
    return { success: true };
  }
}
