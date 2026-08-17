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
  CreatePayeeAccountDto,
  CreateVendorDto,
  ListVendorsDto,
  UpdatePayeeAccountDto,
  UpdateVendorDto,
} from '../dtos/vendor.dto';
import { VendorService } from '../services/vendor.service';
import { toPayeeAccountView, toVendorView } from '../utils/finance-view.util';

/**
 * The طرف‌حساب directory.
 *
 * Readable by any authenticated user — the request form needs to offer vendors
 * to pick from — but only finance and admin may change the directory or see
 * account details in full.
 */
@Controller('finance/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class VendorController {
  constructor(private readonly vendors: VendorService) {}

  @Get()
  async list(@Query() query: ListVendorsDto) {
    const { items, meta } = await this.vendors.listPaginated(query);
    return { items: items.map(toVendorView), meta };
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const vendor = await this.vendors.getOrFail(id);
    return toVendorView(vendor);
  }

  @Post()
  @Roles(Role.FINANCE, Role.ADMIN)
  async create(@Body(NormalizeNumbersPipe) dto: CreateVendorDto) {
    return toVendorView(await this.vendors.createVendor(dto));
  }

  @Patch(':id')
  @Roles(Role.FINANCE, Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: UpdateVendorDto,
  ) {
    return toVendorView(await this.vendors.updateVendor(id, dto));
  }

  @Delete(':id')
  @Roles(Role.FINANCE, Role.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const { deactivated } = await this.vendors.removeVendor(id);
    // The caller needs to know which happened — "deleted" and "hidden from new
    // requests but kept for history" are different outcomes to report.
    return { success: true, deactivated };
  }

  // --- payee accounts -------------------------------------------------------

  @Get(':id/accounts')
  async listAccounts(@Param('id', ParseIntPipe) id: number) {
    const accounts = await this.vendors.listAccounts(id);
    return { items: accounts.map(toPayeeAccountView) };
  }

  @Post(':id/accounts')
  @Roles(Role.FINANCE, Role.ADMIN)
  async addAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body(NormalizeNumbersPipe) dto: CreatePayeeAccountDto,
  ) {
    return toPayeeAccountView(await this.vendors.addAccount(id, dto));
  }

  @Patch('accounts/:accountId')
  @Roles(Role.FINANCE, Role.ADMIN)
  async updateAccount(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Body(NormalizeNumbersPipe) dto: UpdatePayeeAccountDto,
  ) {
    return toPayeeAccountView(await this.vendors.updateAccount(accountId, dto));
  }

  @Delete('accounts/:accountId')
  @Roles(Role.FINANCE, Role.ADMIN)
  async removeAccount(@Param('accountId', ParseIntPipe) accountId: number) {
    await this.vendors.removeAccount(accountId);
    return { success: true };
  }
}
