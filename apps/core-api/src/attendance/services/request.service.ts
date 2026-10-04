import { EntityManager, FilterQuery, QueryOrder } from '@mikro-orm/core';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserEntity } from '../../user/user.entity';
import {
  AttendanceSource,
  AttendanceStatus,
  GRANT_TYPES,
  LeaveType,
  ManualDirection,
  MINUTES_PER_WORKDAY,
  PolicyRequestType,
  RequestCategory,
  RequestStatus,
  RequestType,
  WorkMode,
} from '../attendance.constants';
import { CreateRequestDto, ListRequestsDto } from '../dtos/request.dto';
import { AttendanceRequestEntity } from '../entities/attendance-request.entity';
import { AttendanceEntity } from '../entities/attendance.entity';
import { EmployeeProfileEntity } from '../entities/employee-profile.entity';
import { LeaveBalanceEntity } from '../entities/leave-balance.entity';
import { WorkPolicyRuleEntity } from '../entities/work-policy-rule.entity';
import {
  categoryOf,
  isHourly,
  leaveTypeOf,
  periodOf,
  policyTypeOf,
  shapeOf,
  typesForPolicy,
} from '../utils/attendance-request.util';
import {
  clockToMinutes,
  composeInstant,
  dateToJalali,
  daysInclusive,
  eachDate,
  jalaliMonthRange,
} from '../utils/attendance-time.util';
import { AttendanceNotificationService } from './attendance-notification.service';
import { WorkPolicyService } from './work-policy.service';

const REQUEST_POPULATE = ['employee.user', 'reviewedBy'] as const;

/** Request fields the type does not use are dropped, never stored. */
type RequestFields = Pick<
  AttendanceRequestEntity,
  | 'type'
  | 'dateFrom'
  | 'dateTo'
  | 'date'
  | 'timeFrom'
  | 'timeTo'
  | 'manualTime'
  | 'manualDirection'
  | 'description'
>;

const formatHours = (minutes: number) =>
  `${Math.round((minutes / 60) * 10) / 10} ساعت`;

@Injectable()
export class RequestService {
  constructor(
    private readonly em: EntityManager,
    private readonly policies: WorkPolicyService,
    private readonly notifications: AttendanceNotificationService,
  ) {}

  // --- shape & duration -----------------------------------------------------------

  /** Validate the fields a type needs and keep only those. */
  normalize(dto: CreateRequestDto): RequestFields {
    const description = dto.description?.trim() || null;
    const base = {
      type: dto.type,
      dateFrom: null,
      dateTo: null,
      date: null,
      timeFrom: null,
      timeTo: null,
      manualTime: null,
      manualDirection: null,
      description,
    };

    switch (shapeOf(dto.type)) {
      case 'range':
        if (!dto.dateFrom)
          throw new BadRequestException('تاریخ شروع را وارد کنید');
        if (!dto.dateTo)
          throw new BadRequestException('تاریخ پایان را وارد کنید');
        if (dto.dateTo < dto.dateFrom) {
          throw new BadRequestException(
            'تاریخ پایان باید بعد از تاریخ شروع باشد',
          );
        }
        return { ...base, dateFrom: dto.dateFrom, dateTo: dto.dateTo };

      case 'timed':
        if (!dto.date) throw new BadRequestException('تاریخ را وارد کنید');
        if (!dto.timeFrom || !dto.timeTo) {
          throw new BadRequestException('ساعت شروع و پایان را وارد کنید');
        }
        if (clockToMinutes(dto.timeTo) <= clockToMinutes(dto.timeFrom)) {
          throw new BadRequestException(
            'ساعت پایان باید بعد از ساعت شروع باشد',
          );
        }
        return {
          ...base,
          date: dto.date,
          timeFrom: dto.timeFrom,
          timeTo: dto.timeTo,
        };

      case 'manual':
        if (!dto.date) throw new BadRequestException('تاریخ را وارد کنید');
        if (!dto.manualTime)
          throw new BadRequestException('ساعت تردد را وارد کنید');
        if (!dto.manualDirection) {
          throw new BadRequestException('ورود یا خروج بودن تردد را مشخص کنید');
        }
        return {
          ...base,
          date: dto.date,
          manualTime: dto.manualTime,
          manualDirection: dto.manualDirection,
        };

      default:
        if (!description) {
          throw new BadRequestException('توضیحات درخواست را وارد کنید');
        }
        return base;
    }
  }

  /** Duration in minutes, for reporting and caps. */
  durationOf(fields: RequestFields): number | null {
    const shape = shapeOf(fields.type);

    if (shape === 'timed' && fields.timeFrom && fields.timeTo) {
      return Math.max(
        0,
        clockToMinutes(fields.timeTo) - clockToMinutes(fields.timeFrom),
      );
    }

    const category = categoryOf(fields.type);
    if (
      shape === 'range' &&
      fields.dateFrom &&
      [
        RequestCategory.LEAVE,
        RequestCategory.MISSION,
        RequestCategory.REMOTE,
      ].includes(category)
    ) {
      return (
        daysInclusive(fields.dateFrom, fields.dateTo ?? fields.dateFrom) *
        MINUTES_PER_WORKDAY
      );
    }

    return null;
  }

  private referenceDate(fields: Pick<RequestFields, 'dateFrom' | 'date'>) {
    return fields.dateFrom ?? fields.date;
  }

  // --- policy caps -------------------------------------------------------------------

  /** Minutes already requested (approved or pending) of the types a rule covers. */
  private async usedMinutes(
    profileId: number,
    rule: WorkPolicyRuleEntity,
    from: string,
    to: string,
  ): Promise<number> {
    const types = typesForPolicy(rule.requestType, rule.period);
    const requests = await this.em.find(AttendanceRequestEntity, {
      employee: profileId,
      type: { $in: types },
      status: { $in: [RequestStatus.APPROVED, RequestStatus.PENDING] },
      $or: [
        { dateFrom: { $gte: from, $lte: to } },
        { date: { $gte: from, $lte: to } },
      ],
    });
    return requests.reduce((sum, r) => sum + (r.durationMinutes ?? 0), 0);
  }

  /**
   * Enforce the person's work-policy caps. Returns an error message, or null
   * when allowed (no policy, no rule, or within the cap / over-cap allowed).
   *
   * Tesmino only checked leave against a balance nothing ever filled; here
   * every capped type is checked against the rule itself, counting pending
   * requests so two submissions can't each slip under the cap.
   */
  async checkPolicyCap(
    profile: EmployeeProfileEntity,
    fields: RequestFields,
    duration: number | null,
  ): Promise<string | null> {
    const policyType = policyTypeOf(fields.type);
    const reference = this.referenceDate(fields);
    if (!profile.workPolicy || !policyType || !duration || !reference)
      return null;

    const { year, month } = dateToJalali(reference);
    const rule = await this.policies.ruleFor(
      profile.workPolicy.id,
      policyType,
      periodOf(fields.type),
      year,
    );
    if (!rule) return null;

    if (
      rule.monthlyCapMinutes !== null &&
      rule.monthlyCapMinutes !== undefined &&
      !rule.allowOverMonthlyCap
    ) {
      const { from, to } = jalaliMonthRange(year, month);
      const used = await this.usedMinutes(profile.id, rule, from, to);
      if (used + duration > rule.monthlyCapMinutes) {
        return `سقف ماهانه این نوع درخواست (${formatHours(
          rule.monthlyCapMinutes,
        )}) کافی نیست؛ تاکنون ${formatHours(used)} ثبت شده است.`;
      }
    }

    if (
      rule.yearlyCapMinutes !== null &&
      rule.yearlyCapMinutes !== undefined &&
      !rule.allowOverYearlyCap
    ) {
      const from = jalaliMonthRange(year, 1).from;
      const to = jalaliMonthRange(year, 12).to;
      const used = await this.usedMinutes(profile.id, rule, from, to);
      const leaveType = leaveTypeOf(fields.type);
      const carried = leaveType
        ? (
            await this.em.findOne(LeaveBalanceEntity, {
              employee: profile.id,
              leaveType,
              year,
            })
          )?.carriedOverMinutes ?? 0
        : 0;
      const allowance = rule.yearlyCapMinutes + carried;

      if (used + duration > allowance) {
        return `سقف سالانه این نوع درخواست (${formatHours(
          allowance,
        )}) کافی نیست؛ تاکنون ${formatHours(used)} ثبت شده است.`;
      }
    }

    return null;
  }

  // --- reads ---------------------------------------------------------------------------

  async getOrFail(id: number) {
    const request = await this.em.findOne(
      AttendanceRequestEntity,
      { id },
      { populate: REQUEST_POPULATE },
    );
    if (!request) throw new NotFoundException('درخواست یافت نشد');
    return request;
  }

  private categoryFilter(category?: RequestCategory): Record<string, unknown> {
    if (!category) return {};
    const types = Object.values(RequestType).filter(
      (t) => categoryOf(t) === category,
    );
    return { type: { $in: types } };
  }

  /**
   * Paginated list with per-status counts. `scope` limits it to some
   * profiles (one person's own, or an approver's team).
   */
  async list(query: ListRequestsDto, scope?: number[]) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 15;
    const status = query.status ?? RequestStatus.PENDING;
    const like = query.text?.trim()
      ? { $ilike: `%${query.text.trim()}%` }
      : null;

    // One person's requests, but never outside the caller's scope.
    const employees = query.employeeId
      ? (scope ?? [query.employeeId]).filter((id) => id === query.employeeId)
      : scope;

    const base = {
      ...this.categoryFilter(query.category),
      ...(employees ? { employee: { $in: employees } } : {}),
      ...(like
        ? {
            $or: [
              { employee: { personnelCode: like } },
              { employee: { user: { firstName: like } } },
              { employee: { user: { lastName: like } } },
            ],
          }
        : {}),
    };

    const [[items, total], ...counts] = await Promise.all([
      this.em.findAndCount(
        AttendanceRequestEntity,
        { ...base, status } as FilterQuery<AttendanceRequestEntity>,
        {
          populate: REQUEST_POPULATE,
          orderBy:
            status === RequestStatus.PENDING
              ? { created_at: QueryOrder.DESC }
              : { updated_at: QueryOrder.DESC },
          limit,
          offset: page * limit,
        },
      ),
      ...Object.values(RequestStatus).map((s) =>
        this.em.count(AttendanceRequestEntity, {
          ...base,
          status: s,
        } as FilterQuery<AttendanceRequestEntity>),
      ),
    ]);

    return {
      items,
      counts: Object.fromEntries(
        Object.values(RequestStatus).map((s, i) => [s, counts[i]]),
      ) as Record<RequestStatus, number>,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  /** Requests touching a date range — the report's input. */
  async inRange(
    profileIds: number[],
    from: string,
    to: string,
    statuses: RequestStatus[],
  ) {
    if (!profileIds.length) return [];
    return this.em.find(
      AttendanceRequestEntity,
      {
        employee: { $in: profileIds },
        status: { $in: statuses },
        $or: [
          { date: { $gte: from, $lte: to } },
          {
            dateFrom: { $lte: to },
            $or: [{ dateTo: null }, { dateTo: { $gte: from } }],
          },
        ],
      },
      { populate: ['reviewedBy'], orderBy: { created_at: QueryOrder.ASC } },
    );
  }

  async pendingCountByEmployee(profileIds?: number[]) {
    const rows = await this.em.find(
      AttendanceRequestEntity,
      {
        status: RequestStatus.PENDING,
        ...(profileIds ? { employee: { $in: profileIds } } : {}),
      },
      { fields: ['employee'] },
    );
    const counts = new Map<number, number>();
    rows.forEach((r) =>
      counts.set(r.employee.id, (counts.get(r.employee.id) ?? 0) + 1),
    );
    return counts;
  }

  // --- writes ----------------------------------------------------------------------------

  /** A person's own request — validated, capped, then sent for review. */
  async submit(profile: EmployeeProfileEntity, dto: CreateRequestDto) {
    const fields = this.normalize(dto);
    const duration = this.durationOf(fields);

    const capError = await this.checkPolicyCap(profile, fields, duration);
    if (capError) throw new BadRequestException(capError);

    const request = this.em.create(AttendanceRequestEntity, {
      ...fields,
      employee: profile,
      workplace:
        fields.type === RequestType.MANUAL_ATTENDANCE
          ? profile.workplace ?? null
          : null,
      status: RequestStatus.PENDING,
      durationMinutes: duration,
    });
    await this.em.persistAndFlush(request);

    await this.notifications.requestSubmitted(request, profile);
    return request;
  }

  /** The requester withdraws a request nobody has decided on yet. */
  async cancelOwn(profile: EmployeeProfileEntity, id: number) {
    const request = await this.getOrFail(id);
    if (request.employee.id !== profile.id) {
      throw new NotFoundException('درخواست یافت نشد');
    }
    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException(
        'فقط درخواست‌های در دست بررسی قابل لغو هستند',
      );
    }
    await this.em.removeAndFlush(request);
  }

  private assertReviewable(
    request: AttendanceRequestEntity,
    reviewer: UserEntity,
  ) {
    if (request.status !== RequestStatus.PENDING) {
      throw new ConflictException('این درخواست قبلاً بررسی شده است');
    }
    // A unified identity means HR and approvers also file requests; nobody
    // decides on their own.
    if (request.employee.user.id === reviewer.id) {
      throw new ForbiddenException('درخواست خودتان را نمی‌توانید بررسی کنید');
    }
  }

  async approve(id: number, reviewer: UserEntity) {
    const request = await this.getOrFail(id);
    this.assertReviewable(request, reviewer);

    await this.em.transactional(async (em) => {
      const target = await em.findOneOrFail(
        AttendanceRequestEntity,
        { id },
        { populate: ['employee.workplace', 'employee.workPolicy'] },
      );
      target.durationMinutes = this.durationOf(target);
      target.status = RequestStatus.APPROVED;
      target.reviewedAt = new Date();
      target.reviewedBy = em.getReference(UserEntity, reviewer.id);
      await this.applyApproval(em, target);
      await em.flush();
    });

    const approved = await this.getOrFail(id);
    await this.notifications.requestDecided(
      approved,
      approved.employee.user.id,
    );
    return approved;
  }

  async reject(id: number, reviewer: UserEntity, note?: string) {
    const request = await this.getOrFail(id);
    this.assertReviewable(request, reviewer);

    request.status = RequestStatus.REJECTED;
    request.reviewNote = note?.trim() || null;
    request.reviewedAt = new Date();
    request.reviewedBy = this.em.getReference(UserEntity, reviewer.id);
    await this.em.flush();

    await this.notifications.requestDecided(request, request.employee.user.id);
    return request;
  }

  /**
   * Grant leave or remote work directly, already approved — an admin or
   * approver override that, as in Tesmino, skips the policy cap.
   */
  async grant(
    profile: EmployeeProfileEntity,
    dto: CreateRequestDto,
    reviewer: UserEntity,
  ) {
    if (!GRANT_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        'این نوع درخواست را نمی‌توان مستقیم ثبت کرد',
      );
    }
    if (profile.user.id === reviewer.id) {
      throw new ForbiddenException(
        'برای خودتان نمی‌توانید مرخصی یا دورکاری ثبت کنید',
      );
    }

    const fields = this.normalize(dto);
    const id = await this.em.transactional(async (em) => {
      const request = em.create(AttendanceRequestEntity, {
        ...fields,
        employee: em.getReference(EmployeeProfileEntity, profile.id),
        status: RequestStatus.APPROVED,
        durationMinutes: this.durationOf(fields),
        reviewedBy: em.getReference(UserEntity, reviewer.id),
        reviewedAt: new Date(),
      });
      await em.persistAndFlush(request);
      await em.populate(request, ['employee.workplace', 'employee.workPolicy']);
      await this.applyApproval(em, request);
      await em.flush();
      return request.id;
    });

    const granted = await this.getOrFail(id);
    await this.notifications.requestDecided(granted, profile.user.id);
    return granted;
  }

  async remove(id: number) {
    const request = await this.getOrFail(id);
    await this.em.removeAndFlush(request);
  }

  /**
   * Effects of an approval:
   *  - leave draws down the balance; full-day leave marks its days on leave
   *    (hourly leave doesn't — Tesmino marked the whole day, which hid the
   *    rest of that day's attendance);
   *  - manual attendance writes the check-in or check-out it asked for.
   */
  private async applyApproval(
    em: EntityManager,
    request: AttendanceRequestEntity,
  ) {
    const profile = request.employee;
    const leaveType = leaveTypeOf(request.type);

    if (leaveType) {
      const reference = this.referenceDate(request);
      const { year } = dateToJalali(reference);
      const balance = await this.ensureBalance(em, profile, leaveType, year);
      balance.usedMinutes += request.durationMinutes ?? 0;

      if (!isHourly(request.type) && request.dateFrom) {
        for (const date of eachDate(
          request.dateFrom,
          request.dateTo ?? request.dateFrom,
        )) {
          const row =
            (await em.findOne(AttendanceEntity, {
              employee: profile.id,
              date,
            })) ??
            em.create(AttendanceEntity, {
              employee: profile,
              date,
              workplace: profile.workplace ?? null,
              status: AttendanceStatus.ON_LEAVE,
              workMode: WorkMode.OFFICE,
            });
          row.status = AttendanceStatus.ON_LEAVE;
          em.persist(row);
        }
      }
    }

    if (
      request.type === RequestType.MANUAL_ATTENDANCE &&
      request.date &&
      request.manualTime
    ) {
      const row =
        (await em.findOne(AttendanceEntity, {
          employee: profile.id,
          date: request.date,
        })) ??
        em.create(AttendanceEntity, {
          employee: profile,
          date: request.date,
          workplace: request.workplace ?? profile.workplace ?? null,
          status: AttendanceStatus.PRESENT,
          workMode: WorkMode.OFFICE,
        });

      const instant = composeInstant(request.date, request.manualTime);
      if (request.manualDirection === ManualDirection.IN) {
        row.checkInAt = instant;
        row.checkInSource = AttendanceSource.MANUAL;
      } else {
        row.checkOutAt = instant;
        row.checkOutSource = AttendanceSource.MANUAL;
      }
      row.status = AttendanceStatus.PRESENT;
      em.persist(row);
    }
  }

  /**
   * A person's leave ledger for a year, created on first use with the
   * policy's yearly cap as the entitlement.
   */
  async ensureBalance(
    em: EntityManager,
    profile: EmployeeProfileEntity,
    leaveType: LeaveType,
    year: number,
  ) {
    const existing = await em.findOne(LeaveBalanceEntity, {
      employee: profile.id,
      leaveType,
      year,
    });
    if (existing) return existing;

    const policyId = profile.workPolicy?.id;
    const rule = policyId
      ? await this.policies.ruleFor(
          policyId,
          `leave_${leaveType}` as PolicyRequestType,
          null,
          year,
        )
      : null;

    const balance = em.create(LeaveBalanceEntity, {
      employee: profile,
      leaveType,
      year,
      accruedMinutes: rule?.yearlyCapMinutes ?? 0,
      usedMinutes: 0,
      carriedOverMinutes: 0,
    });
    em.persist(balance);
    return balance;
  }

  balances(profileId: number) {
    return this.em.find(
      LeaveBalanceEntity,
      { employee: profileId },
      { orderBy: { year: QueryOrder.DESC, leaveType: QueryOrder.ASC } },
    );
  }
}
