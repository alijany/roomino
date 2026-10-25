import {
  EntityManager,
  FilterQuery,
  LockMode,
  QueryOrder,
  raw,
  UniqueConstraintViolationException,
} from '@mikro-orm/core';
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
  RequestTypeLabels,
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
import { periodLabel } from '../utils/attendance-view.util';
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
        {
          ...base,
          ...(status === 'all' ? {} : { status }),
        } as FilterQuery<AttendanceRequestEntity>,
        {
          populate: REQUEST_POPULATE,
          orderBy:
            status === RequestStatus.PENDING || status === 'all'
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

  /**
   * A person's manual check-in/out requests for one day that haven't taken
   * effect: pending, or rejected so they know to file again. Approved ones
   * are already in the day's attendance.
   */
  manualOn(profileId: number, date: string) {
    return this.em.find(
      AttendanceRequestEntity,
      {
        employee: profileId,
        type: RequestType.MANUAL_ATTENDANCE,
        date,
        status: { $in: [RequestStatus.PENDING, RequestStatus.REJECTED] },
      },
      { orderBy: { id: 'asc' } },
    );
  }

  // --- writes ----------------------------------------------------------------------------

  /**
   * Refuse a request that covers the same time as a pending or approved one
   * of the same kind — approving both would count the leave (or mission,
   * overtime, …) twice. Two timed requests on one day only clash when their
   * hours overlap; two manual punches only when they're the same direction.
   */
  private async assertNoOverlap(profileId: number, fields: RequestFields) {
    const category = categoryOf(fields.type);
    if (category === RequestCategory.OTHER) return;

    const from = fields.dateFrom ?? fields.date;
    const to = fields.dateTo ?? fields.date;
    if (!from || !to) return;

    const types = Object.values(RequestType).filter(
      (t) => categoryOf(t) === category,
    );
    const candidates = await this.em.find(AttendanceRequestEntity, {
      employee: profileId,
      type: { $in: types },
      status: { $in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
      $or: [
        { date: { $gte: from, $lte: to } },
        {
          dateFrom: { $lte: to },
          $or: [{ dateTo: null }, { dateTo: { $gte: from } }],
        },
      ],
    });

    const clash = candidates.find((other) => {
      if (fields.manualDirection && other.manualDirection) {
        return fields.manualDirection === other.manualDirection;
      }
      if (fields.timeFrom && fields.timeTo && other.timeFrom && other.timeTo) {
        return fields.timeFrom < other.timeTo && other.timeFrom < fields.timeTo;
      }
      return true;
    });

    if (clash) {
      throw new ConflictException(
        `برای این زمان قبلاً درخواست ${
          RequestTypeLabels[clash.type]
        } (${periodLabel(clash)}) ثبت شده است.`,
      );
    }
  }

  /**
   * Hold a person's profile row for the rest of the transaction. The cap and
   * overlap checks read what's already filed, then insert; without this two
   * submissions at the same moment (a double tap) both pass them.
   */
  private lockPerson(em: EntityManager, profileId: number) {
    return em.findOneOrFail(EmployeeProfileEntity, profileId, {
      lockMode: LockMode.PESSIMISTIC_WRITE,
    });
  }

  /** A person's own request — validated, capped, then sent for review. */
  async submit(profile: EmployeeProfileEntity, dto: CreateRequestDto) {
    const fields = this.normalize(dto);
    const duration = this.durationOf(fields);

    const request = await this.em.transactional(async (em) => {
      await this.lockPerson(em, profile.id);

      const capError = await this.checkPolicyCap(profile, fields, duration);
      if (capError) throw new BadRequestException(capError);
      await this.assertNoOverlap(profile.id, fields);

      const created = em.create(AttendanceRequestEntity, {
        ...fields,
        employee: profile,
        workplace:
          fields.type === RequestType.MANUAL_ATTENDANCE
            ? profile.workplace ?? null
            : null,
        status: RequestStatus.PENDING,
        durationMinutes: duration,
      });
      await em.persistAndFlush(created);
      return created;
    });

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

  /**
   * Move a request out of pending in one conditional UPDATE. Two reviewers
   * deciding at the same moment both pass `assertReviewable`; only one of
   * them can win this, so a request is never applied twice.
   */
  private async claim(
    em: EntityManager,
    id: number,
    decision: Partial<AttendanceRequestEntity>,
  ) {
    const won = await em.nativeUpdate(
      AttendanceRequestEntity,
      { id, status: RequestStatus.PENDING },
      decision,
    );
    if (!won) {
      throw new ConflictException('این درخواست قبلاً بررسی شده است');
    }
  }

  /** The request as stored now — not a copy cached before a native update. */
  private reload(id: number) {
    return this.em.findOneOrFail(
      AttendanceRequestEntity,
      { id },
      { populate: REQUEST_POPULATE, refresh: true },
    );
  }

  /**
   * Run an approval's transaction, once more if it lost a race to create a
   * shared row (an attendance day, a leave ledger). The retry starts
   * clean: the failed attempt rolled back, its claim included.
   */
  private async withRetry<T>(work: (em: EntityManager) => Promise<T>) {
    try {
      return await this.em.transactional(work);
    } catch (error) {
      if (!(error instanceof UniqueConstraintViolationException)) throw error;
      return this.em.transactional(work);
    }
  }

  async approve(id: number, reviewer: UserEntity) {
    const request = await this.getOrFail(id);
    this.assertReviewable(request, reviewer);

    await this.withRetry(async (em) => {
      await this.claim(em, id, {
        status: RequestStatus.APPROVED,
        durationMinutes: this.durationOf(request),
        reviewedAt: new Date(),
        reviewedBy: em.getReference(UserEntity, reviewer.id),
      });
      const target = await em.findOneOrFail(
        AttendanceRequestEntity,
        { id },
        {
          populate: ['employee.workplace', 'employee.workPolicy'],
          refresh: true,
        },
      );
      await this.applyApproval(em, target);
      await em.flush();
    });

    const approved = await this.reload(id);
    await this.notifications.requestDecided(
      approved,
      approved.employee.user.id,
    );
    return approved;
  }

  async reject(id: number, reviewer: UserEntity, note?: string) {
    const request = await this.getOrFail(id);
    this.assertReviewable(request, reviewer);

    await this.claim(this.em, id, {
      status: RequestStatus.REJECTED,
      reviewNote: note?.trim() || null,
      reviewedAt: new Date(),
      reviewedBy: this.em.getReference(UserEntity, reviewer.id),
    });

    const rejected = await this.reload(id);
    await this.notifications.requestDecided(
      rejected,
      rejected.employee.user.id,
    );
    return rejected;
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
    const id = await this.withRetry(async (em) => {
      await this.lockPerson(em, profile.id);
      await this.assertNoOverlap(profile.id, fields);

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

    const granted = await this.reload(id);
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
      await this.drawLeave(
        em,
        profile,
        leaveType,
        year,
        request.durationMinutes ?? 0,
      );

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
   * Add approved leave to a person's ledger for a year, creating the ledger
   * on first use with the policy's yearly cap as the entitlement.
   *
   * The addition happens in SQL: reading the balance, adding in memory and
   * writing it back lost one of two approvals made at the same moment.
   */
  private async drawLeave(
    em: EntityManager,
    profile: EmployeeProfileEntity,
    leaveType: LeaveType,
    year: number,
    minutes: number,
  ) {
    const policyId = profile.workPolicy?.id;
    const rule = policyId
      ? await this.policies.ruleFor(
          policyId,
          `leave_${leaveType}` as PolicyRequestType,
          null,
          year,
        )
      : null;
    const now = new Date();
    const key = { employee: profile.id, leaveType, year };

    const drawn = await em.nativeUpdate(LeaveBalanceEntity, key, {
      usedMinutes: raw('used_minutes + ?', [minutes]),
      updated_at: now,
    });
    if (drawn) return;

    // First leave of the year. If another approval creates the ledger at the
    // same moment this insert fails, and `withRetry` runs the approval again.
    await em.insert(LeaveBalanceEntity, {
      ...key,
      accruedMinutes: rule?.yearlyCapMinutes ?? 0,
      usedMinutes: minutes,
      carriedOverMinutes: 0,
      created_at: now,
      updated_at: now,
    });
  }

  balances(profileId: number) {
    return this.em.find(
      LeaveBalanceEntity,
      { employee: profileId },
      { orderBy: { year: QueryOrder.DESC, leaveType: QueryOrder.ASC } },
    );
  }
}
