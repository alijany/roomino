import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { UserEntity } from '../../user/user.entity';
import { FinanceActivityEntity } from '../entities/finance-activity.entity';
import { PaymentRequestEntity } from '../entities/payment-request.entity';
import {
  FinanceActivityAction,
  PaymentRequestStatus,
} from '../finance.constants';

export interface RecordActivityInput {
  requestId: number;
  actorId?: number;
  action: FinanceActivityAction;
  fromStatus?: PaymentRequestStatus;
  toStatus?: PaymentRequestStatus;
  comment?: string;
  meta?: Record<string, unknown>;
}

/**
 * Append-only writer for the request timeline. Nothing in this service updates
 * or deletes — if it did, the trail would stop being evidence.
 */
@Injectable()
export class FinanceActivityService extends BaseRepositoryService<FinanceActivityEntity> {
  constructor(
    @InjectRepository(FinanceActivityEntity)
    protected repository: EntityRepository<FinanceActivityEntity>,
  ) {
    super(repository);
  }

  /**
   * Writes one entry. Pass `em` when inside a transaction so the audit row
   * commits or rolls back with the transition it describes.
   */
  async record(input: RecordActivityInput, em?: EntityManager): Promise<void> {
    const manager = em ?? this.em;

    const entry = manager.create(FinanceActivityEntity, {
      request: manager.getReference(PaymentRequestEntity, input.requestId),
      actor: input.actorId
        ? manager.getReference(UserEntity, input.actorId)
        : null,
      action: input.action,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      comment: input.comment,
      meta: input.meta,
    } as never);

    await manager.persistAndFlush(entry);
  }

  listForRequest(requestId: number) {
    return this.findAll(
      { request: requestId },
      { orderBy: { created_at: 'ASC' }, populate: ['actor'] as never },
    );
  }
}
