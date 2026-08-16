import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import {
  CreatePaymentSourceDto,
  UpdatePaymentSourceDto,
} from '../dtos/finance-settings.dto';
import { Currency, PaymentSourceType } from '../finance.constants';
import { PaymentEntity } from '../entities/payment.entity';
import { PaymentSourceEntity } from '../entities/payment-source.entity';

@Injectable()
export class PaymentSourceService extends BaseRepositoryService<PaymentSourceEntity> {
  constructor(
    @InjectRepository(PaymentSourceEntity)
    protected repository: EntityRepository<PaymentSourceEntity>,
  ) {
    super(repository);
  }

  listAll(onlyActive = false) {
    return this.findAll(onlyActive ? { active: true } : {}, {
      orderBy: { label: 'ASC' },
    });
  }

  async getOrFail(id: number): Promise<PaymentSourceEntity> {
    const source = await this.findOne({ id });

    if (!source) {
      throw new NotFoundException('منبع پرداخت یافت نشد');
    }

    return source;
  }

  createSource(dto: CreatePaymentSourceDto) {
    return this.create({
      label: dto.label,
      type: dto.type ?? PaymentSourceType.BANK_ACCOUNT,
      bankName: dto.bankName,
      sheba: dto.sheba,
      cardLast4: dto.cardLast4,
      accountHolder: dto.accountHolder,
      currency: dto.currency ?? Currency.IRR,
      notes: dto.notes,
      active: dto.active ?? true,
    });
  }

  async updateSource(id: number, dto: UpdatePaymentSourceDto) {
    await this.getOrFail(id);
    return this.updateOne({ id }, dto);
  }

  /**
   * A source that has paid something is part of the audit trail, so it is
   * deactivated rather than deleted.
   */
  async removeSource(id: number): Promise<void> {
    await this.getOrFail(id);

    const used = await this.em.count(PaymentEntity, { paymentSource: id });

    if (used > 0) {
      await this.updateOne({ id }, { active: false });
      return;
    }

    await this.em.nativeDelete(PaymentSourceEntity, { id });
  }
}
