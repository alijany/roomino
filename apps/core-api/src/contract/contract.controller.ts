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
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StaffGuard } from '../auth/guards/staff.guard';
import { Role } from '../roles/roles.constants';
import { ContractService } from './contract.service';
import {
  CreateContractDto,
  SetNdaDto,
  UpdateContractDto,
} from './dtos/contract.dto';

/** Contract terms and NDAs: admin and HR keep them. */
@Controller('admin/contracts')
@UseGuards(JwtAuthGuard, StaffGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ContractController {
  constructor(private readonly contracts: ContractService) {}

  @Get('status')
  @Roles(Role.ADMIN, Role.HR)
  async statuses() {
    return { items: await this.contracts.statuses() };
  }

  @Get('users/:userId')
  @Roles(Role.ADMIN, Role.HR)
  forUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.contracts.forUser(userId);
  }

  @Post('users/:userId')
  @Roles(Role.ADMIN, Role.HR)
  create(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: CreateContractDto,
  ) {
    return this.contracts.create(userId, dto);
  }

  @Put('users/:userId/nda')
  @Roles(Role.ADMIN, Role.HR)
  setNda(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: SetNdaDto,
  ) {
    return this.contracts.setNda(userId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.HR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contracts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(Role.ADMIN, Role.HR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contracts.remove(id);
  }
}
