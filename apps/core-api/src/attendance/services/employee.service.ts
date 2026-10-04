import { EntityManager, FilterQuery, QueryOrder } from '@mikro-orm/core';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserEntity } from '../../user/user.entity';
import {
  CreateEmployeeDto,
  ListEmployeesDto,
  UpdateEmployeeDto,
  UpdateTeamMemberDto,
} from '../dtos/employee.dto';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { EmployeeShiftEntity } from '../entities/employee-shift.entity';
import { JobGroupEntity } from '../entities/job-group.entity';
import { ShiftEntity } from '../entities/shift.entity';
import { WorkplaceEntity } from '../entities/workplace.entity';
import { WorkPolicyEntity } from '../entities/work-policy.entity';
import { tehranToday } from '../utils/attendance-time.util';

const PROFILE_POPULATE = [
  'user',
  'workplace',
  'jobGroup',
  'workPolicy',
] as const;

function normalizeRemoteDays(days?: number[]): number[] | null {
  if (!days) return null;
  const unique = [...new Set(days.map(Number))].sort((a, b) => a - b);
  return unique.length ? unique : null;
}

/**
 * Attendance profiles, their shift history, and who may see whom.
 *
 * Team access is the job-group approver assignment, checked on every call:
 * an approver reaches active-or-not profiles of the groups they approve for,
 * and never their own.
 */
@Injectable()
export class EmployeeService {
  constructor(private readonly em: EntityManager) {}

  // --- lookups -----------------------------------------------------------------

  findByUser(userId: number) {
    return this.em.findOne(
      EmployeeProfileEntity,
      { user: userId },
      { populate: PROFILE_POPULATE },
    );
  }

  /** The caller's own active profile, or a 403 explaining why not. */
  async requireOwn(user: UserEntity) {
    const profile = await this.findByUser(user.id);
    if (!profile) {
      throw new ForbiddenException(
        'پروفایل حضور و غیاب برای شما تعریف نشده است. با منابع انسانی تماس بگیرید.',
      );
    }
    if (!profile.active) {
      throw new ForbiddenException('پروفایل حضور و غیاب شما غیرفعال است.');
    }
    return profile;
  }

  async getOrFail(id: number) {
    const profile = await this.em.findOne(
      EmployeeProfileEntity,
      { id },
      { populate: PROFILE_POPULATE },
    );
    if (!profile) throw new NotFoundException('پرسنل یافت نشد');
    return profile;
  }

  private textFilter(text?: string): Record<string, unknown> {
    if (!text?.trim()) return {};
    const like = { $ilike: `%${text.trim()}%` };
    return {
      $or: [
        { personnelCode: like },
        { user: { firstName: like } },
        { user: { lastName: like } },
        { user: { phone: like } },
      ],
    };
  }

  async list(query: ListEmployeesDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 20;
    const where = {
      ...this.textFilter(query.text),
      ...(query.workplaceId ? { workplace: query.workplaceId } : {}),
      ...(query.jobGroupId ? { jobGroup: query.jobGroupId } : {}),
      ...(query.activeOnly ? { active: true } : {}),
    } as FilterQuery<EmployeeProfileEntity>;

    const [items, total] = await this.em.findAndCount(
      EmployeeProfileEntity,
      where,
      {
        populate: PROFILE_POPULATE,
        orderBy: { user: { lastName: QueryOrder.ASC }, id: QueryOrder.ASC },
        limit,
        offset: page * limit,
      },
    );

    return {
      items,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  /** Every active profile matching the filters — for boards and reports. */
  findActive(
    filters: {
      workplaceId?: number;
      jobGroupId?: number;
      text?: string;
      ids?: number[];
    } = {},
  ) {
    return this.em.find(
      EmployeeProfileEntity,
      {
        active: true,
        ...this.textFilter(filters.text),
        ...(filters.workplaceId ? { workplace: filters.workplaceId } : {}),
        ...(filters.jobGroupId ? { jobGroup: filters.jobGroupId } : {}),
        ...(filters.ids ? { id: { $in: filters.ids } } : {}),
      } as FilterQuery<EmployeeProfileEntity>,
      {
        populate: PROFILE_POPULATE,
        orderBy: { user: { lastName: QueryOrder.ASC }, id: QueryOrder.ASC },
      },
    );
  }

  /** Users who don't have a profile yet — the picker on "new employee". */
  async candidates(text?: string) {
    const taken = await this.em.find(
      EmployeeProfileEntity,
      {},
      { fields: ['user'] },
    );
    const like = text?.trim() ? { $ilike: `%${text.trim()}%` } : null;

    return this.em.find(
      UserEntity,
      {
        ...(taken.length ? { id: { $nin: taken.map((p) => p.user.id) } } : {}),
        ...(like
          ? { $or: [{ firstName: like }, { lastName: like }, { phone: like }] }
          : {}),
      } as FilterQuery<UserEntity>,
      { orderBy: { lastName: QueryOrder.ASC }, limit: 20 },
    );
  }

  // --- shift history ------------------------------------------------------------

  /** Assignments with `shift.days` loaded, keyed by profile id. */
  async assignmentsFor(profileIds: number[]) {
    const map = new Map<number, EmployeeShiftEntity[]>();
    if (!profileIds.length) return map;

    const rows = await this.em.find(
      EmployeeShiftEntity,
      { employee: { $in: profileIds } },
      { populate: ['shift.days'], orderBy: { startDate: QueryOrder.DESC } },
    );
    for (const row of rows) {
      const list = map.get(row.employee.id) ?? [];
      list.push(row);
      map.set(row.employee.id, list);
    }
    return map;
  }

  async history(profileId: number) {
    return this.em.find(
      EmployeeShiftEntity,
      { employee: profileId },
      { populate: ['shift'], orderBy: { startDate: QueryOrder.DESC } },
    );
  }

  async currentAssignment(profileId: number) {
    return this.em.findOne(
      EmployeeShiftEntity,
      { employee: profileId },
      { populate: ['shift'], orderBy: { startDate: QueryOrder.DESC } },
    );
  }

  /**
   * Assign a shift from a date. Changing the shift opens a new period so
   * earlier days keep their schedule; re-saving the same shift only moves
   * the current period's start.
   */
  async assignShift(
    em: EntityManager,
    profile: EmployeeProfileEntity,
    shiftId: number,
    startDate: string,
  ) {
    const shift = await em.findOne(ShiftEntity, { id: shiftId });
    if (!shift) throw new NotFoundException('شیفت یافت نشد');

    const current = await em.findOne(
      EmployeeShiftEntity,
      { employee: profile.id },
      { orderBy: { startDate: QueryOrder.DESC } },
    );

    if (!current) {
      em.persist(
        em.create(EmployeeShiftEntity, { employee: profile, shift, startDate }),
      );
    } else if (current.shift.id !== shiftId) {
      if (current.startDate === startDate) {
        current.shift = shift;
      } else {
        em.persist(
          em.create(EmployeeShiftEntity, {
            employee: profile,
            shift,
            startDate,
          }),
        );
      }
    } else if (current.startDate !== startDate) {
      current.startDate = startDate;
    }
  }

  // --- create / update ---------------------------------------------------------

  private async assertPersonnelCodeFree(code: string, exceptId?: number) {
    const clash = await this.em.findOne(EmployeeProfileEntity, {
      personnelCode: code,
      ...(exceptId ? { id: { $ne: exceptId } } : {}),
    });
    if (clash) throw new ConflictException('این کد پرسنلی قبلاً ثبت شده است');
  }

  private async relations(
    em: EntityManager,
    dto: {
      workplaceId?: number;
      jobGroupId?: number | null;
      workPolicyId?: number | null;
    },
  ) {
    const result: Partial<{
      workplace: WorkplaceEntity;
      jobGroup: JobGroupEntity | null;
      workPolicy: WorkPolicyEntity | null;
    }> = {};

    if (dto.workplaceId !== undefined) {
      const workplace = await em.findOne(WorkplaceEntity, {
        id: dto.workplaceId,
      });
      if (!workplace) throw new NotFoundException('محل کار یافت نشد');
      result.workplace = workplace;
    }
    if (dto.jobGroupId !== undefined) {
      result.jobGroup = dto.jobGroupId
        ? await em.findOne(JobGroupEntity, { id: dto.jobGroupId })
        : null;
      if (dto.jobGroupId && !result.jobGroup) {
        throw new NotFoundException('گروه شغلی یافت نشد');
      }
    }
    if (dto.workPolicyId !== undefined) {
      result.workPolicy = dto.workPolicyId
        ? await em.findOne(WorkPolicyEntity, { id: dto.workPolicyId })
        : null;
      if (dto.workPolicyId && !result.workPolicy) {
        throw new NotFoundException('سیاست کاری یافت نشد');
      }
    }
    return result;
  }

  async create(dto: CreateEmployeeDto) {
    const user = await this.em.findOne(UserEntity, { id: dto.userId });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    if (await this.em.count(EmployeeProfileEntity, { user: dto.userId })) {
      throw new ConflictException('این کاربر قبلاً پروفایل پرسنلی دارد');
    }
    await this.assertPersonnelCodeFree(dto.personnelCode);

    const id = await this.em.transactional(async (em) => {
      const relations = await this.relations(em, dto);
      const workPolicy =
        dto.workPolicyId === undefined
          ? await em.findOne(WorkPolicyEntity, { isDefault: true })
          : relations.workPolicy;

      const profile = em.create(EmployeeProfileEntity, {
        user,
        personnelCode: dto.personnelCode,
        jobTitle: dto.jobTitle,
        workplace: relations.workplace,
        jobGroup: relations.jobGroup ?? null,
        workPolicy: workPolicy ?? null,
        useGps: dto.useGps ?? true,
        useWifi: dto.useWifi ?? false,
        allowedDeviceType: dto.allowedDeviceType,
        trackingEnabled: dto.trackingEnabled ?? false,
        remoteDays: normalizeRemoteDays(dto.remoteDays),
        active: dto.active ?? true,
      });
      await em.persistAndFlush(profile);
      await this.assignShift(em, profile, dto.shiftId, dto.shiftStartDate);
      await em.flush();
      return profile.id;
    });

    return this.getOrFail(id);
  }

  async update(id: number, dto: UpdateEmployeeDto) {
    const profile = await this.getOrFail(id);
    if (dto.personnelCode && dto.personnelCode !== profile.personnelCode) {
      await this.assertPersonnelCodeFree(dto.personnelCode, id);
    }

    await this.em.transactional(async (em) => {
      const target = await em.findOneOrFail(EmployeeProfileEntity, { id });
      const relations = await this.relations(em, dto);

      em.assign(target, {
        ...(dto.personnelCode !== undefined
          ? { personnelCode: dto.personnelCode }
          : {}),
        ...(dto.jobTitle !== undefined
          ? { jobTitle: dto.jobTitle || null }
          : {}),
        ...(dto.useGps !== undefined ? { useGps: dto.useGps } : {}),
        ...(dto.useWifi !== undefined ? { useWifi: dto.useWifi } : {}),
        ...(dto.allowedDeviceType !== undefined
          ? { allowedDeviceType: dto.allowedDeviceType }
          : {}),
        ...(dto.trackingEnabled !== undefined
          ? { trackingEnabled: dto.trackingEnabled }
          : {}),
        ...(dto.remoteDays !== undefined
          ? { remoteDays: normalizeRemoteDays(dto.remoteDays) }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...relations,
      });

      if (dto.shiftId) {
        await this.assignShift(
          em,
          target,
          dto.shiftId,
          dto.shiftStartDate ?? tehranToday(),
        );
      }
      await em.flush();
    });

    this.em.clear();
    return this.getOrFail(id);
  }

  // --- team access ---------------------------------------------------------------

  async approvedGroupIds(userId: number): Promise<number[]> {
    const groups = await this.em.find(
      JobGroupEntity,
      { approvers: userId },
      { fields: ['id'] },
    );
    return groups.map((g) => g.id);
  }

  async isApprover(userId: number) {
    return (await this.approvedGroupIds(userId)).length > 0;
  }

  /** Profile ids an approver manages; empty for a non-approver. */
  async teamIds(userId: number, activeOnly = false): Promise<number[]> {
    const groupIds = await this.approvedGroupIds(userId);
    if (!groupIds.length) return [];

    const members = await this.em.find(
      EmployeeProfileEntity,
      {
        jobGroup: { $in: groupIds },
        user: { $ne: userId },
        ...(activeOnly ? { active: true } : {}),
      },
      { fields: ['id'] },
    );
    return members.map((m) => m.id);
  }

  async requireApprover(userId: number) {
    if (!(await this.isApprover(userId))) {
      throw new ForbiddenException('شما تاییدکننده هیچ گروه شغلی نیستید.');
    }
  }

  /** A team member, or 404 — a stranger's id must not be distinguishable. */
  async teamMemberOrFail(approverUserId: number, profileId: number) {
    const ids = await this.teamIds(approverUserId);
    if (!ids.includes(profileId)) {
      throw new NotFoundException('این فرد عضو تیم شما نیست');
    }
    return this.getOrFail(profileId);
  }

  /** What an approver may change on a member: schedule and status only. */
  async updateTeamMember(
    approverUserId: number,
    profileId: number,
    dto: UpdateTeamMemberDto,
  ) {
    await this.teamMemberOrFail(approverUserId, profileId);
    return this.update(profileId, {
      shiftId: dto.shiftId,
      shiftStartDate: dto.shiftStartDate,
      remoteDays: dto.remoteDays,
      active: dto.active,
    });
  }
}
