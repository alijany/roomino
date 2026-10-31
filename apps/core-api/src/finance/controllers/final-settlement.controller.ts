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
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NormalizeNumbersPipe } from '../../libs/utils/pipe.normalizeNumbers';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import {
  CreateFinalSettlementDto,
  UpdateFinalSettlementDto,
} from '../dtos/final-settlement.dto';
import { FinalSettlementService } from '../services/final-settlement.service';

/**
 * Final settlements. The admin and the finance manager make them; the CEO
 * can see them.
 */
@Controller('finance/final-settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class FinalSettlementController {
  constructor(private readonly settlements: FinalSettlementService) {}

  @Get()
  @Roles(Role.ADMIN, Role.FINANCE_MANAGER, Role.CEO)
  list() {
    return this.settlements.list();
  }

  /** People who have no settlement yet, for the picker. */
  @Get('candidates')
  @Roles(Role.ADMIN, Role.FINANCE_MANAGER)
  candidates(@Query('text') text?: string) {
    return this.settlements.candidates(text);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.FINANCE_MANAGER, Role.CEO)
  get(@Param('id', ParseIntPipe) id: number) {
    return this.settlements.get(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.FINANCE_MANAGER)
  create(
    @Body(NormalizeNumbersPipe) dto: CreateFinalSettlementDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.settlements.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.FINANCE_MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdateFinalSettlementDto,
  ) {
    return this.settlements.update(id, dto);
  }

  @Post(':id/finalize')
  @Roles(Role.ADMIN, Role.FINANCE_MANAGER)
  finalize(@Param('id', ParseIntPipe) id: number) {
    return this.settlements.finalize(id);
  }

  @Post(':id/reopen')
  @Roles(Role.ADMIN, Role.FINANCE_MANAGER)
  reopen(@Param('id', ParseIntPipe) id: number) {
    return this.settlements.reopen(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.FINANCE_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.settlements.remove(id);
  }
}
