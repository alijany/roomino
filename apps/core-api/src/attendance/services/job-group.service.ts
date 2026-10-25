import { EntityManager, FilterQuery, QueryOrder } from '@mikro-orm/core';
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
import { AttendanceModeService } from './attendance-mode.service';

@Injectable()
export class JobGroupService {
  constructor(
    private readonly em: EntityManager,
    private readonly modes: AttendanceModeService,
  ) {}

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

  /** Any user can approve for a group; search them by name or phone. */
  searchUsers(text?: string) {
    const like = text?.trim() ? { $ilike: `%${text.trim()}%` } : null;
    return this.em.find(
      UserEntity,
      (like
        ? { $or: [{ firstName: like }, { lastName: like }, { phone: like }] }
        : {}) as FilterQuery<UserEntity>,
      { orderBy: { lastName: QueryOrder.ASC }, limit: 20 },
    );
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
    const group = this.em.create(JobGroupEntity, {
      name: dto.name,
      ...(dto.attendanceMode ? { attendanceMode: dto.attendanceMode } : {}),
    });
    group.approvers.set(await this.approvers(dto.approverIds));
    await this.em.persistAndFlush(group);
    return group;
  }

  async update(id: number, dto: SaveJobGroupDto) {
    const group = await this.getOrFail(id);
    await this.assertNameFree(dto.name, id);
    const modeChanged =
      dto.attendanceMode !== undefined &&
      dto.attendanceMode !== group.attendanceMode;
    group.name = dto.name;
    if (dto.attendanceMode !== undefined)
      group.attendanceMode = dto.attendanceMode;
    if (dto.approverIds) {
      group.approvers.set(await this.approvers(dto.approverIds));
    }
    await this.em.flush();

    // Members who follow the group move with it; those with their own
    // override are untouched, which `sync` works out from the profile.
    if (modeChanged) await this.syncMembers(id);
    return group;
  }

  private async syncMembers(groupId: number) {
    const members = await this.em.find(
      EmployeeProfileEntity,
      { jobGroup: groupId },
      { fields: ['id'] },
    );
    await this.modes.sync(members.map((m) => m.id));
  }

  /** Members are left without a group, as in Tesmino. */
  async remove(id: number) {
    const group = await this.getOrFail(id);
    const members = await this.em.find(
      EmployeeProfileEntity,
      { jobGroup: id },
      { fields: ['id'] },
    );
    await this.em.nativeUpdate(
      EmployeeProfileEntity,
      { jobGroup: id },
      { jobGroup: null },
    );
    group.approvers.removeAll();
    await this.em.removeAndFlush(group);
    // Without a group they follow the default again, or their own override.
    this.em.clear();
    await this.modes.sync(members.map((m) => m.id));
  }
}
