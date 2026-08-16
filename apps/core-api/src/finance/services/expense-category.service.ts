import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from '../dtos/finance-settings.dto';
import { ExpenseCategoryEntity } from '../entities/expense-category.entity';
import { PaymentRequestEntity } from '../entities/payment-request.entity';

@Injectable()
export class ExpenseCategoryService extends BaseRepositoryService<ExpenseCategoryEntity> {
  constructor(
    @InjectRepository(ExpenseCategoryEntity)
    protected repository: EntityRepository<ExpenseCategoryEntity>,
  ) {
    super(repository);
  }

  listAll(onlyActive = false) {
    return this.findAll(onlyActive ? { active: true } : {}, {
      orderBy: { name: 'ASC' },
      populate: ['parent'] as never,
    });
  }

  async getOrFail(id: number): Promise<ExpenseCategoryEntity> {
    const category = await this.findOne({ id });

    if (!category) {
      throw new NotFoundException('دسته هزینه یافت نشد');
    }

    return category;
  }

  async createCategory(dto: CreateExpenseCategoryDto) {
    const existing = await this.findOne({ code: dto.code });

    if (existing) {
      throw new ConflictException('دسته‌ای با این کد از قبل وجود دارد');
    }

    return this.create({
      name: dto.name,
      code: dto.code,
      parent: dto.parentId ? this.getReference(dto.parentId) : undefined,
      requiresInvoice: dto.requiresInvoice ?? true,
      active: dto.active ?? true,
    });
  }

  async updateCategory(id: number, dto: UpdateExpenseCategoryDto) {
    await this.getOrFail(id);

    if (dto.parentId === id) {
      throw new ConflictException('یک دسته نمی‌تواند والد خودش باشد');
    }

    const { parentId, ...rest } = dto;

    return this.updateOne(
      { id },
      {
        ...rest,
        ...(parentId !== undefined
          ? { parent: parentId ? this.getReference(parentId) : null }
          : {}),
      },
    );
  }

  /**
   * Categories are referenced by historical requests, so they are deactivated
   * rather than deleted once anything has used them.
   */
  async removeCategory(id: number): Promise<void> {
    await this.getOrFail(id);

    const inUse = await this.em.count(PaymentRequestEntity, { category: id });

    if (inUse > 0) {
      await this.updateOne({ id }, { active: false });
      return;
    }

    await this.em.nativeDelete(ExpenseCategoryEntity, { id });
  }
}
