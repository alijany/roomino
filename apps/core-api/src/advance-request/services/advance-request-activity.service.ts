import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { UserEntity } from '../../user/user.entity';
import {
  AdvanceActivityAction,
  AdvanceRequestStatus,
} from '../advance-request.constants';
import { AdvanceRequestActivityEntity } from '../entities/advance-request-activity.entity';
import { AdvanceRequestEntity } from '../entities/advance-request.entity';

export interface RecordActivityInput {
  requestId: number;
  actorId?: number;
  action: AdvanceActivityAction;
  fromStatus?: AdvanceRequestStatus;
  toStatus?: AdvanceRequestStatus;
  comment?: string;
}

/**
 * Append-only writer for the advance-request timeline. Nothing in this
 * service updates or deletes — if it did, the trail would stop being
 * evidence.
 */
@Injectable()
export class AdvanceRequestActivityService extends BaseRepositoryService<AdvanceRequestActivityEntity> {
  constructor(
    @InjectRepository(AdvanceRequestActivityEntity)
    protected repository: EntityRepository<AdvanceRequestActivityEntity>,
  ) {
    super(repository);
  }

  async record(input: RecordActivityInput, em?: EntityManager): Promise<void> {
    const manager = em ?? this.em;

    const entry = manager.create(AdvanceRequestActivityEntity, {
      request: manager.getReference(AdvanceRequestEntity, input.requestId),
      actor: input.actorId
        ? manager.getReference(UserEntity, input.actorId)
        : null,
      action: input.action,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      comment: input.comment,
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
