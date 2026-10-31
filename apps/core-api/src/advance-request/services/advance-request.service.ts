import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { Role } from '../../roles/roles.constants';
import { UserEntity } from '../../user/user.entity';
import {
  ADVANCE_APPROVAL_CHAIN,
  ADVANCE_DECIDABLE_ROLES,
  AdvanceActivityAction,
  AdvanceApprovalStepStatus,
  AdvanceRequestStatus,
  TERMINAL_ADVANCE_STATUSES,
} from '../advance-request.constants';
import {
  AdvanceRequestPermissions,
  AdvanceSettlement,
} from '../advance-request.types';
import {
  AdvanceRequestScope,
  CreateAdvanceRequestDto,
  ListAdvanceRequestsDto,
} from '../dtos/advance-request.dto';
import { AdvanceApprovalStepEntity } from '../entities/advance-approval-step.entity';
import { AdvanceDeductionEntity } from '../../finance/entities/advance-deduction.entity';
import { AdvanceRequestEntity } from '../entities/advance-request.entity';
import { assertSafeAmount, readBigint } from '../utils/money.util';
import { AdvanceRequestActivityService } from './advance-request-activity.service';
import { AdvanceRequestNotificationService } from './advance-request-notification.service';

/** Roles that may see every advance request in the system. */
const OVERSIGHT_ROLES: readonly Role[] = [Role.ADMIN];

@Injectable()
export class AdvanceRequestService extends BaseRepositoryService<AdvanceRequestEntity> {
  constructor(
    @InjectRepository(AdvanceRequestEntity)
    protected repository: EntityRepository<AdvanceRequestEntity>,
    private readonly activity: AdvanceRequestActivityService,
    private readonly notifications: AdvanceRequestNotificationService,
  ) {
    super(repository);
  }

  /**
   * How far each approved request has been taken off pay: nothing, part, or
   * all of it. Worked out from the payroll deductions, so giving a piece back
   * or deleting a payroll line is reflected at once.
   */
  async settlementsFor(requests: AdvanceRequestEntity[]) {
    const approved = requests.filter(
      (r) => r.status === AdvanceRequestStatus.APPROVED,
    );
    const result = new Map<number, AdvanceSettlement>();
    if (!approved.length) return result;

    const rows = await this.em.find(
      AdvanceDeductionEntity,
      { request: { $in: approved.map((r) => r.id) } },
      {
        populate: ['line', 'recordedBy'],
        orderBy: { created_at: QueryOrder.ASC },
      },
    );
    for (const request of approved) {
      const mine = rows.filter((d) => d.request.id === request.id);
      const deducted = mine.reduce((sum, d) => sum + Number(d.amount), 0);
      const remaining = Math.max(readBigint(request.amountRial) - deducted, 0);
      result.set(request.id, {
        status: !mine.length
          ? 'unsettled'
          : remaining > 0
          ? 'partial'
          : 'settled',
        deducted,
        remaining,
        settledAt:
          mine.length && remaining === 0
            ? mine[mine.length - 1].paidOn ?? mine[mine.length - 1].created_at
            : null,
        deductions: mine.map((d) => ({
          id: d.id,
          kind: d.line ? ('payroll' as const) : ('manual' as const),
          period: d.line?.period ?? null,
          amount: Number(d.amount),
          at: d.paidOn ?? d.created_at,
          note: d.note ?? null,
          recordedBy: d.recordedBy?.name ?? null,
        })),
      });
    }
    return result;
  }

  /** Record money paid back by hand against an approved advance. */
  async addSettlement(
    id: number,
    user: UserEntity,
    dto: { amount: number; paidOn?: string; note?: string },
  ) {
    if (!this.canSettle(user)) {
      throw new ForbiddenException('ثبت تسویه فقط برای مدیر مالی و ادمین است');
    }
    const request = await this.loadFullOrFail(id);
    if (request.status !== AdvanceRequestStatus.APPROVED) {
      throw new ConflictException('فقط مساعده‌ی تأییدشده تسویه می‌شود');
    }
    const { remaining } = (await this.settlementsFor([request])).get(
      request.id,
    )!;
    if (remaining <= 0) {
      throw new ConflictException('این مساعده کامل تسویه شده است');
    }
    if (dto.amount > remaining) {
      throw new BadRequestException(
        `مبلغ نباید از مانده‌ی مساعده (${remaining.toLocaleString(
          'fa-IR',
        )} ریال) بیشتر باشد`,
      );
    }
    this.em.create(AdvanceDeductionEntity, {
      request,
      amount: dto.amount,
      paidOn: dto.paidOn ?? new Date().toISOString().slice(0, 10),
      recordedBy: user,
      note: dto.note?.trim() || undefined,
    });
    await this.em.flush();
    return request;
  }

  /** Take back a manual settlement recorded by mistake; payroll ones go from the payroll line. */
  async removeSettlement(id: number, settlementId: number, user: UserEntity) {
    if (!this.canSettle(user)) {
      throw new ForbiddenException('حذف تسویه فقط برای مدیر مالی و ادمین است');
    }
    const piece = await this.em.findOne(AdvanceDeductionEntity, {
      id: settlementId,
      request: id,
    });
    if (!piece) throw new NotFoundException('تسویه پیدا نشد');
    if (piece.line) {
      throw new ConflictException(
        'این مبلغ از حقوق کسر شده؛ از صفحه‌ی حقوق برگردانده می‌شود',
      );
    }
    await this.em.removeAndFlush(piece);
    return this.loadFullOrFail(id);
  }

  // ---------------------------------------------------------------------------
  // role helpers
  // ---------------------------------------------------------------------------

  rolesOf(user: UserEntity): Role[] {
    return user.roles?.getItems().map((entry) => entry.role) ?? [];
  }

  hasRole(user: UserEntity, role: Role): boolean {
    return this.rolesOf(user).includes(role);
  }

  /** Finance (the finance manager) and the admin record settlements. */
  canSettle(user: UserEntity): boolean {
    return (
      this.hasRole(user, Role.FINANCE_MANAGER) || this.hasRole(user, Role.ADMIN)
    );
  }

  private hasOversight(user: UserEntity): boolean {
    return this.rolesOf(user).some((role) => OVERSIGHT_ROLES.includes(role));
  }

  // ---------------------------------------------------------------------------
  // reads
  // ---------------------------------------------------------------------------

  /**
   * What this user is allowed to see at all: everyone sees their own
   * requests; admin sees every request; a manager/finance-manager
   * additionally sees anything routed through their role, so they can check
   * the outcome of a decision they made.
   */
  private visibilityFilter(
    user: UserEntity,
  ): FilterQuery<AdvanceRequestEntity> {
    if (this.hasOversight(user)) {
      return {} as FilterQuery<AdvanceRequestEntity>;
    }

    const reviewRoles = this.rolesOf(user).filter((role) =>
      ADVANCE_DECIDABLE_ROLES.includes(role),
    );

    if (reviewRoles.length > 0) {
      return {
        $or: [
          { requester: user.id },
          { approvalSteps: { requiredRole: { $in: reviewRoles } } },
        ],
      } as FilterQuery<AdvanceRequestEntity>;
    }

    return { requester: user.id } as FilterQuery<AdvanceRequestEntity>;
  }

  async listForUser(user: UserEntity, query: ListAdvanceRequestsDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 20;

    const filters: FilterQuery<AdvanceRequestEntity>[] = [
      this.visibilityFilter(user),
    ];

    switch (query.scope) {
      case AdvanceRequestScope.MINE:
        filters.push({
          requester: user.id,
        } as FilterQuery<AdvanceRequestEntity>);
        break;

      case AdvanceRequestScope.AWAITING_ME: {
        const roles = this.rolesOf(user).filter((role) =>
          ADVANCE_DECIDABLE_ROLES.includes(role),
        );

        filters.push({
          status: AdvanceRequestStatus.PENDING_APPROVAL,
          pendingRole: { $in: roles.length > 0 ? roles : [null] },
          // Nobody approves their own request, so those never appear here.
          requester: { $ne: user.id },
        } as FilterQuery<AdvanceRequestEntity>);
        break;
      }

      // The management review queue: every request the caller has oversight
      // or a decision role on. visibilityFilter already computes exactly
      // that, so REVIEW adds nothing on top of it — including the caller's
      // own submissions is deliberate, so the list is a complete record, not
      // a personal inbox. Self-approval stays blocked at decision time.
      case AdvanceRequestScope.REVIEW:
        break;

      default:
        break;
    }

    if (query.status?.length) {
      filters.push({
        status: { $in: query.status },
      } as FilterQuery<AdvanceRequestEntity>);
    }

    if (query.from) {
      filters.push({
        created_at: { $gte: new Date(query.from) },
      } as FilterQuery<AdvanceRequestEntity>);
    }

    if (query.to) {
      filters.push({
        created_at: { $lte: new Date(query.to) },
      } as FilterQuery<AdvanceRequestEntity>);
    }

    const [items, total] = await this.findAll(
      { $and: filters } as FilterQuery<AdvanceRequestEntity>,
      {
        orderBy: { id: QueryOrder.DESC },
        limit,
        offset: page * limit,
        populate: ['requester'] as never,
      },
    );

    return {
      items,
      total,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  private async loadFullOrFail(id: number): Promise<AdvanceRequestEntity> {
    const request = await this.findOne(
      { id },
      {
        populate: [
          'requester',
          'approvalSteps',
          'approvalSteps.actor',
        ] as never,
      },
    );

    if (!request) {
      throw new NotFoundException('درخواست مساعده یافت نشد');
    }

    return request;
  }

  async getDetailOrFail(id: number, user: UserEntity) {
    const request = await this.loadFullOrFail(id);

    if (!this.canView(request, user)) {
      throw new ForbiddenException('شما به این درخواست دسترسی ندارید');
    }

    return request;
  }

  private canView(request: AdvanceRequestEntity, user: UserEntity): boolean {
    if (request.requester.id === user.id) {
      return true;
    }

    if (this.hasOversight(user)) {
      return true;
    }

    const reviewRoles = this.rolesOf(user).filter((role) =>
      ADVANCE_DECIDABLE_ROLES.includes(role),
    );

    return request.approvalSteps
      .getItems()
      .some((step) => reviewRoles.includes(step.requiredRole));
  }

  /**
   * What the viewer can do right now. The UI reads this instead of
   * re-deriving the rules, so the button set and the API can't disagree.
   */
  permissionsFor(
    request: AdvanceRequestEntity,
    user: UserEntity,
  ): AdvanceRequestPermissions {
    const isOwner = request.requester.id === user.id;

    const decidableRoles = this.rolesOf(user).filter((role) =>
      ADVANCE_DECIDABLE_ROLES.includes(role),
    );

    // Everyone else is blocked from deciding their own request — except the
    // CEO, who sits above the chain anyway and signs off on every request
    // regardless of who raised it, their own included.
    const canDecide =
      (!isOwner || this.hasRole(user, Role.CEO)) &&
      request.status === AdvanceRequestStatus.PENDING_APPROVAL &&
      Boolean(request.pendingRole) &&
      decidableRoles.includes(request.pendingRole);

    // Management can void a request outright — not just the step they'd
    // decide, the whole thing — same as the requester withdrawing it
    // themselves. Either way it only applies while something is still open.
    const canManage = this.hasOversight(user) || decidableRoles.length > 0;

    return {
      canDecide,
      canReject: canDecide,
      canSettle:
        request.status === AdvanceRequestStatus.APPROVED &&
        this.canSettle(user),
      canCancel:
        (isOwner || canManage) &&
        request.status === AdvanceRequestStatus.PENDING_APPROVAL,
    };
  }

  // ---------------------------------------------------------------------------
  // writes
  // ---------------------------------------------------------------------------

  async createRequest(
    user: UserEntity,
    dto: CreateAdvanceRequestDto,
  ): Promise<AdvanceRequestEntity> {
    assertSafeAmount(dto.amountRial);

    const chain = ADVANCE_APPROVAL_CHAIN;
    let createdId: number;

    await this.withTransaction(async (em) => {
      const request = em.create(AdvanceRequestEntity, {
        requester: em.getReference(UserEntity, user.id),
        amountRial: dto.amountRial,
        reason: dto.reason,
        status: AdvanceRequestStatus.PENDING_APPROVAL,
        pendingRole: chain[0],
        pendingSequence: 0,
      } as never);

      await em.persistAndFlush(request);
      createdId = request.id;

      const steps = chain.map((role, index) =>
        em.create(AdvanceApprovalStepEntity, {
          request: em.getReference(AdvanceRequestEntity, request.id),
          sequence: index,
          requiredRole: role,
          status: AdvanceApprovalStepStatus.PENDING,
        } as never),
      );

      await em.persistAndFlush(steps);
    });

    await this.activity.record({
      requestId: createdId,
      actorId: user.id,
      action: AdvanceActivityAction.SUBMITTED,
      toStatus: AdvanceRequestStatus.PENDING_APPROVAL,
    });

    const created = await this.loadFullOrFail(createdId);
    await this.notifications.notifyApprovalNeeded(created, chain[0]);

    return created;
  }

  /**
   * The single place the "nobody approves their own request" rule lives —
   * except the CEO, who is above the chain and signs off on every request
   * regardless of who raised it, their own included.
   * Everything else about approval routing flows through the pending step.
   */
  private assertCanDecide(
    request: AdvanceRequestEntity,
    user: UserEntity,
  ): AdvanceApprovalStepEntity {
    if (request.status !== AdvanceRequestStatus.PENDING_APPROVAL) {
      throw new ConflictException('این درخواست در انتظار تأیید نیست');
    }

    if (request.requester.id === user.id && !this.hasRole(user, Role.CEO)) {
      throw new ForbiddenException('تأیید درخواست خودتان مجاز نیست');
    }

    const step = request.approvalSteps
      .getItems()
      .filter((s) => s.status === AdvanceApprovalStepStatus.PENDING)
      .sort((a, b) => a.sequence - b.sequence)[0];

    if (!step) {
      throw new ConflictException(
        'مرحله تأیید باز برای این درخواست وجود ندارد',
      );
    }

    if (!this.hasRole(user, step.requiredRole)) {
      throw new ForbiddenException('تأیید این مرحله در اختیار نقش دیگری است');
    }

    return step;
  }

  /**
   * Approves the outstanding step. When it was the last one the request
   * becomes fully approved; otherwise the next approver is notified.
   */
  async approve(
    id: number,
    user: UserEntity,
    comment?: string,
  ): Promise<AdvanceRequestEntity> {
    const request = await this.getDetailOrFail(id, user);
    const step = this.assertCanDecide(request, user);

    const remaining = request.approvalSteps
      .getItems()
      .filter((s) => s.sequence > step.sequence)
      .sort((a, b) => a.sequence - b.sequence);

    const nextStep = remaining.find(
      (s) => s.status === AdvanceApprovalStepStatus.PENDING,
    );

    await this.withTransaction(async (em) => {
      const target = await em.findOne(AdvanceApprovalStepEntity, {
        id: step.id,
      });
      em.assign(target, {
        status: AdvanceApprovalStepStatus.APPROVED,
        actor: em.getReference(UserEntity, user.id),
        decidedAt: new Date(),
        comment,
      });

      const parent = await em.findOne(AdvanceRequestEntity, { id });
      em.assign(parent, {
        status: nextStep
          ? AdvanceRequestStatus.PENDING_APPROVAL
          : AdvanceRequestStatus.APPROVED,
        pendingRole: nextStep ? nextStep.requiredRole : null,
        pendingSequence: nextStep ? nextStep.sequence : null,
        decidedAt: nextStep ? null : new Date(),
      });

      await em.persistAndFlush([target, parent]);
    });

    const updated = await this.loadFullOrFail(id);

    await this.activity.record({
      requestId: id,
      actorId: user.id,
      action: AdvanceActivityAction.APPROVED,
      fromStatus: AdvanceRequestStatus.PENDING_APPROVAL,
      toStatus: updated.status,
      comment,
    });

    if (nextStep) {
      await this.notifications.notifyStepApproved(updated);
      await this.notifications.notifyApprovalNeeded(
        updated,
        nextStep.requiredRole,
      );
    } else {
      await this.notifications.notifyApproved(updated);
    }

    return updated;
  }

  async reject(
    id: number,
    user: UserEntity,
    comment: string,
  ): Promise<AdvanceRequestEntity> {
    const request = await this.getDetailOrFail(id, user);
    const step = this.assertCanDecide(request, user);
    const fromStatus = request.status;

    await this.withTransaction(async (em) => {
      const target = await em.findOne(AdvanceApprovalStepEntity, {
        id: step.id,
      });
      em.assign(target, {
        status: AdvanceApprovalStepStatus.REJECTED,
        actor: em.getReference(UserEntity, user.id),
        decidedAt: new Date(),
        comment,
      });

      await em.nativeUpdate(
        AdvanceApprovalStepEntity,
        { request: id, status: AdvanceApprovalStepStatus.PENDING },
        { status: AdvanceApprovalStepStatus.SKIPPED },
      );

      const parent = await em.findOne(AdvanceRequestEntity, { id });
      em.assign(parent, {
        status: AdvanceRequestStatus.REJECTED,
        pendingRole: null,
        pendingSequence: null,
        decidedAt: new Date(),
        lastDecisionComment: comment,
      });

      await em.persistAndFlush([target, parent]);
    });

    const updated = await this.loadFullOrFail(id);

    await this.activity.record({
      requestId: id,
      actorId: user.id,
      action: AdvanceActivityAction.REJECTED,
      fromStatus,
      toStatus: AdvanceRequestStatus.REJECTED,
      comment,
    });

    await this.notifications.notifyRejected(updated, comment);
    return updated;
  }

  async cancel(id: number, user: UserEntity): Promise<AdvanceRequestEntity> {
    const request = await this.getDetailOrFail(id, user);

    if (!this.permissionsFor(request, user).canCancel) {
      throw new ForbiddenException('شما اجازه لغو این درخواست را ندارید');
    }

    if (TERMINAL_ADVANCE_STATUSES.includes(request.status)) {
      throw new ConflictException('این درخواست قابل لغو نیست');
    }

    const fromStatus = request.status;

    await this.withTransaction(async (em) => {
      await em.nativeUpdate(
        AdvanceApprovalStepEntity,
        { request: id, status: AdvanceApprovalStepStatus.PENDING },
        { status: AdvanceApprovalStepStatus.SKIPPED },
      );

      const parent = await em.findOne(AdvanceRequestEntity, { id });
      em.assign(parent, {
        status: AdvanceRequestStatus.CANCELLED,
        pendingRole: null,
        pendingSequence: null,
        decidedAt: new Date(),
      });

      await em.persistAndFlush(parent);
    });

    await this.activity.record({
      requestId: id,
      actorId: user.id,
      action: AdvanceActivityAction.CANCELLED,
      fromStatus,
      toStatus: AdvanceRequestStatus.CANCELLED,
    });

    return this.loadFullOrFail(id);
  }
}
