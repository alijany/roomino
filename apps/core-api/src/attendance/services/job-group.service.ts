import { EntityManager, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { nameWords } from '../../libs/utils/name-search.util';
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

/** Weekdays once each, in order; none is stored as null. */
function normalizeRemoteDays(days?: number[]): number[] | undefined {
  if (!days) return undefined;
  const unique = [...new Set(days.map(Number))].sort((a, b) => a - b);
  return unique.length ? unique : undefined;
}

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
      { populate: ['approvers', 'parent'], orderBy: { name: QueryOrder.ASC } },
    );

    const counts = new Map<number, number>();
    if (groups.length) {
      const members = await this.em.find(
        UserEntity,
        { team: { $in: groups.map((g) => g.id) } },
        { fields: ['team'] },
      );
      for (const member of members) {
        const id = member.team!.id;
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
        ? {
            $or: [
              { $and: nameWords(text as string) },
              { displayName: like },
              { firstName: like },
              { lastName: like },
              { phone: like },
            ],
          }
        : {}) as FilterQuery<UserEntity>,
      { orderBy: { lastName: QueryOrder.ASC }, limit: 20 },
    );
  }

  async getOrFail(id: number) {
    const group = await this.em.findOne(
      JobGroupEntity,
      { id },
      { populate: ['approvers', 'parent'] },
    );
    if (!group) throw new NotFoundException('تیم یافت نشد');
    return group;
  }

  /** Every team id beneath `id`, at any depth. */
  async descendantIds(id: number): Promise<number[]> {
    const all = await this.em.find(
      JobGroupEntity,
      {},
      { fields: ['id', 'parent'] },
    );
    const children = new Map<number, number[]>();
    for (const team of all) {
      if (!team.parent) continue;
      children.set(team.parent.id, [
        ...(children.get(team.parent.id) ?? []),
        team.id,
      ]);
    }
    const found: number[] = [];
    const queue = [...(children.get(id) ?? [])];
    while (queue.length) {
      const next = queue.shift()!;
      if (found.includes(next)) continue;
      found.push(next);
      queue.push(...(children.get(next) ?? []));
    }
    return found;
  }

  /** The parent to set, or an error when it would put a team under itself. */
  private async parentFor(id: number | undefined, parentId: number | null) {
    if (parentId === null) return null;
    if (id !== undefined) {
      if (
        parentId === id ||
        (await this.descendantIds(id)).includes(parentId)
      ) {
        throw new BadRequestException(
          'تیم نمی‌تواند زیرمجموعهٔ خودش یا زیرتیم‌هایش باشد',
        );
      }
    }
    const parent = await this.em.findOne(JobGroupEntity, { id: parentId });
    if (!parent) throw new NotFoundException('تیم مادر یافت نشد');
    return parent;
  }

  /** The people whose team is `id`. */
  members(id: number) {
    return this.em.find(
      UserEntity,
      { team: id },
      { orderBy: { lastName: QueryOrder.ASC } },
    );
  }

  /**
   * Put a person in a team, or take them out. Their attendance profile, when
   * they have one, follows — and with it the mode in force.
   */
  async setUserTeam(userId: number, teamId: number | null) {
    const user = await this.em.findOne(UserEntity, { id: userId });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    const team = teamId
      ? await this.em.findOne(JobGroupEntity, { id: teamId })
      : null;
    if (teamId && !team) throw new NotFoundException('تیم یافت نشد');

    user.team = team ?? undefined;
    const profile = await this.em.findOne(EmployeeProfileEntity, {
      user: userId,
    });
    if (profile) profile.jobGroup = team ?? undefined;
    await this.em.flush();
    if (profile) await this.modes.sync([profile.id]);
  }

  private async assertNameFree(name: string, exceptId?: number) {
    const clash = await this.em.findOne(JobGroupEntity, {
      name,
      ...(exceptId ? { id: { $ne: exceptId } } : {}),
    });
    if (clash) throw new ConflictException('تیمی با این نام وجود دارد');
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
      remoteDays: normalizeRemoteDays(dto.remoteDays),
    });
    if (dto.parentId)
      group.parent =
        (await this.parentFor(undefined, dto.parentId)) ?? undefined;
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
    if (dto.parentId !== undefined) {
      group.parent = (await this.parentFor(id, dto.parentId)) ?? undefined;
    }
    if (dto.attendanceMode !== undefined)
      group.attendanceMode = dto.attendanceMode;
    if (dto.remoteDays !== undefined)
      group.remoteDays = normalizeRemoteDays(dto.remoteDays);
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

  /** Members are left without a team. */
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
    // Its sub-teams move up to the parent of the deleted one.
    await this.em.nativeUpdate(
      JobGroupEntity,
      { parent: id },
      { parent: group.parent?.id ?? null },
    );
    group.approvers.removeAll();
    await this.em.removeAndFlush(group);
    // Without a group they follow the default again, or their own override.
    this.em.clear();
    await this.modes.sync(members.map((m) => m.id));
  }
}
