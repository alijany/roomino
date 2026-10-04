import { EntityManager, QueryOrder } from '@mikro-orm/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkplaceDto, UpdateWorkplaceDto } from '../dtos/setup.dto';
import { AttendanceEntity } from '../entities/attendance.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { WorkplaceEntity } from '../entities/workplace.entity';

@Injectable()
export class WorkplaceService {
  constructor(private readonly em: EntityManager) {}

  list(text?: string) {
    return this.em.find(
      WorkplaceEntity,
      text ? { name: { $ilike: `%${text}%` } } : {},
      { orderBy: { name: QueryOrder.ASC } },
    );
  }

  async getOrFail(id: number) {
    const workplace = await this.em.findOne(WorkplaceEntity, { id });
    if (!workplace) throw new NotFoundException('محل کار یافت نشد');
    return workplace;
  }

  async create(dto: CreateWorkplaceDto) {
    const workplace = this.em.create(WorkplaceEntity, {
      name: dto.name,
      city: dto.city,
      address: dto.address,
      lat: dto.lat,
      lng: dto.lng,
      radiusMeters: dto.radiusMeters ?? 100,
      active: dto.active ?? true,
    });
    await this.em.persistAndFlush(workplace);
    return workplace;
  }

  async update(id: number, dto: UpdateWorkplaceDto) {
    const workplace = await this.getOrFail(id);
    this.em.assign(workplace, dto);
    await this.em.flush();
    return workplace;
  }

  /**
   * A workplace people are assigned to, or that past attendance points at,
   * is deactivated rather than deleted.
   */
  async remove(id: number): Promise<{ deactivated: boolean }> {
    const workplace = await this.getOrFail(id);
    const [profiles, attendances] = await Promise.all([
      this.em.count(EmployeeProfileEntity, { workplace: id }),
      this.em.count(AttendanceEntity, { workplace: id }),
    ]);

    if (profiles > 0 || attendances > 0) {
      workplace.active = false;
      await this.em.flush();
      return { deactivated: true };
    }

    await this.em.removeAndFlush(workplace);
    return { deactivated: false };
  }
}
