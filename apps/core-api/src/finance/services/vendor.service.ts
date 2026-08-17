import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import {
  CreatePayeeAccountDto,
  CreateVendorDto,
  ListVendorsDto,
  UpdatePayeeAccountDto,
  UpdateVendorDto,
} from '../dtos/vendor.dto';
import { PayeeAccountEntity } from '../entities/payee-account.entity';
import { PaymentRequestEntity } from '../entities/payment-request.entity';
import { RecurringExpenseEntity } from '../entities/recurring-expense.entity';
import { VendorEntity } from '../entities/vendor.entity';
import { Currency, VendorKind } from '../finance.constants';

@Injectable()
export class VendorService extends BaseRepositoryService<VendorEntity> {
  constructor(
    @InjectRepository(VendorEntity)
    protected repository: EntityRepository<VendorEntity>,
    @InjectRepository(PayeeAccountEntity)
    private readonly accountRepository: EntityRepository<PayeeAccountEntity>,
  ) {
    super(repository);
  }

  async listPaginated(query: ListVendorsDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 20;

    const where: FilterQuery<VendorEntity> = {
      ...(query.activeOnly ? { active: true } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.text
        ? {
            $or: [
              { name: { $ilike: `%${query.text}%` } },
              { nameEn: { $ilike: `%${query.text}%` } },
            ],
          }
        : {}),
    } as FilterQuery<VendorEntity>;

    const [items, total] = await this.findAll(where, {
      orderBy: { name: QueryOrder.ASC },
      limit,
      offset: page * limit,
      populate: ['accounts'] as never,
    });

    return {
      items,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  async getOrFail(id: number): Promise<VendorEntity> {
    const vendor = await this.findOne(
      { id },
      { populate: ['accounts'] as never },
    );

    if (!vendor) {
      throw new NotFoundException('طرف‌حساب یافت نشد');
    }

    return vendor;
  }

  createVendor(dto: CreateVendorDto) {
    return this.create({
      name: dto.name,
      nameEn: dto.nameEn,
      kind: dto.kind ?? VendorKind.DOMESTIC,
      economicCode: dto.economicCode,
      nationalId: dto.nationalId,
      website: dto.website,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      defaultCurrency: dto.defaultCurrency ?? Currency.IRR,
      notes: dto.notes,
      active: dto.active ?? true,
    });
  }

  async updateVendor(id: number, dto: UpdateVendorDto) {
    await this.getOrFail(id);
    return this.updateOne({ id }, dto);
  }

  /**
   * Vendors are referenced by historical requests and payments, so one that has
   * ever been used is deactivated rather than deleted — deleting it would leave
   * a paid request pointing at nothing.
   */
  async removeVendor(id: number): Promise<{ deactivated: boolean }> {
    await this.getOrFail(id);

    const [requests, schedules] = await Promise.all([
      this.em.count(PaymentRequestEntity, { vendor: id }),
      this.em.count(RecurringExpenseEntity, { vendor: id }),
    ]);

    if (requests > 0 || schedules > 0) {
      await this.updateOne({ id }, { active: false });
      return { deactivated: true };
    }

    await this.withTransaction(async (em) => {
      await em.nativeDelete(PayeeAccountEntity, { vendor: id });
      await em.nativeDelete(VendorEntity, { id });
    });

    return { deactivated: false };
  }

  // --- payee accounts -------------------------------------------------------

  listAccounts(vendorId: number) {
    return this.accountRepository.find(
      { vendor: vendorId },
      { orderBy: { isDefault: QueryOrder.DESC, label: QueryOrder.ASC } },
    );
  }

  async getAccountOrFail(id: number): Promise<PayeeAccountEntity> {
    const account = await this.accountRepository.findOne(
      { id },
      { populate: ['vendor'] as never },
    );

    if (!account) {
      throw new NotFoundException('حساب مقصد یافت نشد');
    }

    return account;
  }

  async addAccount(vendorId: number, dto: CreatePayeeAccountDto) {
    await this.getOrFail(vendorId);

    return this.withTransaction(async (em) => {
      if (dto.isDefault) {
        await em.nativeUpdate(
          PayeeAccountEntity,
          { vendor: vendorId },
          { isDefault: false },
        );
      }

      const account = em.create(PayeeAccountEntity, {
        vendor: em.getReference(VendorEntity, vendorId),
        label: dto.label,
        type: dto.type,
        holderName: dto.holderName,
        sheba: dto.sheba,
        cardNumber: dto.cardNumber,
        iban: dto.iban,
        swift: dto.swift,
        details: dto.details,
        isDefault: dto.isDefault ?? false,
        active: dto.active ?? true,
      } as never);

      await em.persistAndFlush(account);
      return account;
    });
  }

  async updateAccount(id: number, dto: UpdatePayeeAccountDto) {
    const account = await this.getAccountOrFail(id);

    return this.withTransaction(async (em) => {
      if (dto.isDefault) {
        await em.nativeUpdate(
          PayeeAccountEntity,
          { vendor: account.vendor.id },
          { isDefault: false },
        );
      }

      const target = await em.findOne(PayeeAccountEntity, { id });
      em.assign(target, dto);
      await em.persistAndFlush(target);
      return target;
    });
  }

  /**
   * Payee accounts are snapshot onto the request at creation time, so deleting
   * one never rewrites history — the request keeps the Sheba it was paid to.
   */
  async removeAccount(id: number): Promise<void> {
    await this.getAccountOrFail(id);
    await this.em.nativeUpdate(
      PaymentRequestEntity,
      { payeeAccount: id },
      { payeeAccount: null },
    );
    await this.em.nativeUpdate(
      RecurringExpenseEntity,
      { payeeAccount: id },
      { payeeAccount: null },
    );
    await this.em.nativeDelete(PayeeAccountEntity, { id });
  }
}
