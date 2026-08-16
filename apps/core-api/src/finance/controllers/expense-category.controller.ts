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
import { Role } from '../../roles/roles.constants';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from '../dtos/finance-settings.dto';
import { ExpenseCategoryService } from '../services/expense-category.service';

/**
 * Expense categories. Readable by every authenticated user — the request form
 * needs them — but only admins may change the taxonomy.
 */
@Controller('finance/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ExpenseCategoryController {
  constructor(private readonly categories: ExpenseCategoryService) {}

  @Get()
  async list(@Query('activeOnly') activeOnly?: string) {
    const [items] = await this.categories.listAll(activeOnly === 'true');

    return {
      items: items.map((category) => ({
        id: category.id,
        name: category.name,
        code: category.code,
        requiresInvoice: category.requiresInvoice,
        active: category.active,
        parentId: category.parent?.id,
      })),
    };
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateExpenseCategoryDto) {
    return this.categories.createCategory(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.categories.updateCategory(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categories.removeCategory(id);
    return { success: true };
  }
}
