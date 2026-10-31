import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, FilterQuery } from '@mikro-orm/core';
import { NotificationEntity } from '../notification.entity';
import { NotificationGetDto } from '../dtos/notification.get.dto';
import { NotificationStatus } from '../notification.constants';
import { INotificationRepository } from '../types/notification-repository.interface';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';

@Injectable()
export class NotificationRepository
  extends BaseRepositoryService<NotificationEntity>
  implements INotificationRepository
{
  constructor(
    @InjectRepository(NotificationEntity)
    protected repository: EntityRepository<NotificationEntity>,
  ) {
    super(repository);
  }

  async updateStatus(
    id: number,
    status: NotificationStatus,
    sentAt?: Date,
    errorMessage?: string,
  ): Promise<void> {
    const em = this.em; // repository-backed EntityManager
    const notification = await em.findOne(NotificationEntity, { id });

    if (!notification) {
      throw new Error(`Notification with ID ${id} not found`);
    }

    notification.status = status;

    if (sentAt) {
      notification.sentAt = sentAt;
    }

    if (errorMessage) {
      notification.errorMessage = errorMessage;
    }

    await em.flush();
  }

  async findPaginated(
    filterDto: NotificationGetDto,
    userId: number,
  ): Promise<{
    items: NotificationEntity[];
    meta: {
      page: number;
      limit: number;
      total: number;
      pageCount: number;
    };
  }> {
    const {
      page = 0,
      limit = 20,
      text,
      status,
      type,
      category,
      isRead,
    } = filterDto;

    const where: FilterQuery<NotificationEntity> = {
      user: userId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (text) {
      where.message = { $ilike: `%${text}%` };
    }

    const [items, total] = await this.findAll(where, {
      orderBy: { created_at: 'DESC' },
      limit,
      offset: page * limit,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number): Promise<NotificationEntity | null> {
    return this.findOne({ id });
  }
}
