import {
  Body,
  Controller,
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
import {
  CreateEmployeeDto,
  ListEmployeesDto,
  UpdateEmployeeDto,
} from '../dtos/employee.dto';
import { EmployeeService } from '../services/employee.service';
import { RequestService } from '../services/request.service';
import {
  toEmployeeView,
  toLeaveBalanceView,
  toUserBrief,
} from '../utils/attendance-view.util';

/** پرسنل — attendance profiles of Roomino users. Admin and HR. */
@Controller('attendance/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class EmployeeController {
  constructor(
    private readonly employees: EmployeeService,
    private readonly requests: RequestService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.HR)
  async list(@Query() query: ListEmployeesDto) {
    const { items, meta } = await this.employees.list(query);
    const assignments = await this.employees.assignmentsFor(
      items.map((p) => p.id),
    );
    return {
      items: items.map((p) => toEmployeeView(p, assignments.get(p.id)?.[0])),
      meta,
    };
  }

  /** Users without a profile yet. */
  @Get('candidates')
  @Roles(Role.ADMIN, Role.HR)
  async candidates(@Query() query: PageQueryDto) {
    const users = await this.employees.candidates(query.text);
    return {
      items: users.map((u) => ({
        ...toUserBrief(u),
        nationalId: u.nationalId ?? null,
      })),
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR)
  async detail(@Param('id', ParseIntPipe) id: number) {
    const profile = await this.employees.getOrFail(id);
    const [history, balances] = await Promise.all([
      this.employees.history(id),
      this.requests.balances(id),
    ]);
    return {
      ...toEmployeeView(profile, history[0]),
      shiftHistory: history.map((h) => ({
        id: h.id,
        shift: { id: h.shift.id, name: h.shift.name },
        startDate: h.startDate,
        endDate: h.endDate ?? null,
      })),
      leaveBalances: balances.map(toLeaveBalanceView),
    };
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  async create(@Body(NormalizeNumbersPipe) dto: CreateEmployeeDto) {
    const profile = await this.employees.create(dto);
    return toEmployeeView(
      profile,
      await this.employees.currentAssignment(profile.id),
    );
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdateEmployeeDto,
  ) {
    const profile = await this.employees.update(id, dto);
    return toEmployeeView(profile, await this.employees.currentAssignment(id));
  }
}
