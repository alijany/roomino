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
import {
  CreatePaymentSourceDto,
  UpdatePaymentSourceDto,
} from '../dtos/finance-settings.dto';
import { PaymentSourceService } from '../services/payment-source.service';

/**
 * Payment sources hold the company's own banking details, so every endpoint is
 * restricted to Role.FINANCE at the controller — not merely hidden in the UI.
 */
@Controller('finance/payment-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PaymentSourceController {
  constructor(private readonly sources: PaymentSourceService) {}

  @Get()
  @Roles(Role.FINANCE)
  async list(@Query('activeOnly') activeOnly?: string) {
    const [items] = await this.sources.listAll(activeOnly === 'true');
    return { items };
  }

  @Post()
  @Roles(Role.FINANCE)
  create(@Body(NormalizeNumbersPipe) dto: CreatePaymentSourceDto) {
    return this.sources.createSource(dto);
  }

  @Patch(':id')
  @Roles(Role.FINANCE)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdatePaymentSourceDto,
  ) {
    return this.sources.updateSource(id, dto);
  }

  @Delete(':id')
  @Roles(Role.FINANCE)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.sources.removeSource(id);
    return { success: true };
  }
}
