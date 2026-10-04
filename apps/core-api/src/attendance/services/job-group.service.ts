import { EntityManager, QueryOrder } from '@mikro-orm/core';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserEntity } from '../../user/user.entity';
import { SaveJobGroupDto } from '../dtos/setup.dto';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { JobGroupEntity } from '../entities/job-group.entity';

@Injectable()
export class JobGroupService {
  constructor(private readonly em: EntityManager) {}

  async list(text?: string) {
    const groups = await this.em.find(
      JobGroupEntity,
      text ? { name: { $ilike: `%${text}%` } } : {},
      { populate: ['approvers'], orderBy: { name: QueryOrder.ASC } },
    );

    const counts = new Map<number, number>();
    if (groups.length) {
      const members = await this.em.find(
        EmployeeProfileEntity,
        { jobGroup: { $in: groups.map((g) => g.id) } },
        { fields: ['jobGroup'] },
      );
      for (const member of members) {
        const id = member.jobGroup.id;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }

    return groups.map((group) => ({ group, count: counts.get(group.id) ?? 0 }));
  }

  async getOrFail(id: number) {
    const group = await this.em.findOne(
      JobGroupEntity,
      { id },
      { populate: ['approvers'] },
    );
    if (!group) throw new NotFoundException('گروه شغلی یافت نشد');
    return group;
  }

  private async assertNameFree(name: string, exceptId?: number) {
    const clash = await this.em.findOne(JobGroupEntity, {
      name,
      ...(exceptId ? { id: { $ne: exceptId } } : {}),
    });
    if (clash) throw new ConflictException('گروه شغلی با این نام وجود دارد');
  }

  private async approvers(ids: number[] = []) {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const users = await this.em.find(UserEntity, { id: { $in: unique } });
    if (users.length !== unique.length) {
      throw new BadRequestException('یکی از تاییدکنندگان انتخاب‌شده یافت نشد');
    }
    return users;
  }

  async create(dto: SaveJobGroupDto) {
    await this.assertNameFree(dto.name);
    const group = this.em.create(JobGroupEntity, { name: dto.name });
    group.approvers.set(await this.approvers(dto.approverIds));
    await this.em.persistAndFlush(group);
    return group;
  }

  async update(id: number, dto: SaveJobGroupDto) {
    const group = await this.getOrFail(id);
    await this.assertNameFree(dto.name, id);
    group.name = dto.name;
    if (dto.approverIds) {
      group.approvers.set(await this.approvers(dto.approverIds));
    }
    await this.em.flush();
    return group;
  }

  /** Members are left without a group, as in Tesmino. */
  async remove(id: number) {
    const group = await this.getOrFail(id);
    await this.em.nativeUpdate(
      EmployeeProfileEntity,
      { jobGroup: id },
      { jobGroup: null },
    );
    group.approvers.removeAll();
    await this.em.removeAndFlush(group);
  }
}
