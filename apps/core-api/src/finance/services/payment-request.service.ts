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
  CreatePaymentRequestDto,
  ListPaymentRequestsDto,
  RecordPaymentDto,
  RequestScope,
  UpdatePaymentRequestDto,
} from '../dtos/payment-request.dto';
import { ApprovalStepEntity } from '../entities/approval-step.entity';
import { ExpenseCategoryEntity } from '../entities/expense-category.entity';
import { PayeeAccountEntity } from '../entities/payee-account.entity';
import { PaymentRequestEntity } from '../entities/payment-request.entity';
import { PaymentSourceEntity } from '../entities/payment-source.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { RecurringExpenseEntity } from '../entities/recurring-expense.entity';
import { RequestAttachmentEntity } from '../entities/request-attachment.entity';
import { VendorEntity } from '../entities/vendor.entity';
import {
  ApprovalStepStatus,
  AttachmentKind,
  Currency,
  PayeeAccountType,
  EDITABLE_STATUSES,
  FinanceActivityAction,
  PAYABLE_STATUSES,
  PaymentRequestStatus,
  PaymentStatus,
  RequestOrigin,
  TERMINAL_STATUSES,
} from '../finance.constants';
import { RequestPermissions } from '../finance.types';
import { assertSafeAmount, readBigint, toRial } from '../utils/money.util';
import { ApprovalRuleService } from './approval-rule.service';
import { ExpenseCategoryService } from './expense-category.service';
import { FinanceActivityService } from './finance-activity.service';
import { FinanceAttachmentService } from './finance-attachment.service';
import { FinanceNotificationService } from './finance-notification.service';

/** Roles that may see every request in the system. */
const OVERSIGHT_ROLES: readonly Role[] = [Role.FINANCE, Role.ADMIN];

@Injectable()
export class PaymentRequestService extends BaseRepositoryService<PaymentRequestEntity> {
  constructor(
    @InjectRepository(PaymentRequestEntity)
    protected repository: EntityRepository<PaymentRequestEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: EntityRepository<PaymentEntity>,
    private readonly approvalRules: ApprovalRuleService,
    private readonly categories: ExpenseCategoryService,
    private readonly activity: FinanceActivityService,
    private readonly attachments: FinanceAttachmentService,
    private readonly notifications: FinanceNotificationService,
  ) {
    super(repository);
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

  private hasOversight(user: UserEntity): boolean {
    return this.rolesOf(user).some((role) => OVERSIGHT_ROLES.includes(role));
  }

  /**
   * Applies the two rules that override an empty approval chain.
   *
   * A foreign amount has no rial value until Finance sets a rate at payment
   * time, so `toRial` returns 0 for it and the matrix lands it in the lowest
   * band — meaning a USD 50,000 invoice would otherwise skip approval entirely
   * for the same reason a USD 5 one does. When the thresholds cannot be applied,
   * a human looks instead.
   *
   * A company-level payment likewise always gets one approver: without it,
   * Finance could raise a below-threshold request and pay it with no second
   * pair of eyes anywhere in the trail.
   */
  private enforceMinimumApproval(
    chain: Role[],
    currency: Currency,
    origin: RequestOrigin,
  ): Role[] {
    if (chain.length > 0) {
      return chain;
    }

    // Checked first, and with the stronger reviewer: "Finance must not approve
    // its own payment" is an integrity rule, while "we cannot price this yet"
    // is only a measurement problem. When both apply, integrity wins.
    if (origin === RequestOrigin.FINANCE) {
      return [Role.ADMIN];
    }

    if (currency !== Currency.IRR) {
      return [Role.APPROVER];
    }

    return chain;
  }

  /**
   * The same rule, for the pre-submit preview — where origin is not settled yet,
   * so the caller says whether this would be a company-level payment.
   */
  previewMinimumApproval(
    chain: Role[],
    currency: Currency,
    asFinance: boolean,
  ): Role[] {
    return this.enforceMinimumApproval(
      chain,
      currency,
      asFinance ? RequestOrigin.FINANCE : RequestOrigin.EMPLOYEE,
    );
  }

  // ---------------------------------------------------------------------------
  // reads
  // ---------------------------------------------------------------------------

  /**
   * What this user is allowed to see at all:
   *  - everyone sees their own requests, drafts included;
   *  - finance and admin see every submitted request;
   *  - an approver additionally sees anything routed through their role, so
   *    they can check the outcome of a decision they made.
   */
  private visibilityFilter(
    user: UserEntity,
  ): FilterQuery<PaymentRequestEntity> {
    if (this.hasOversight(user)) {
      return {
        $or: [
          { requester: user.id },
          { status: { $ne: PaymentRequestStatus.DRAFT } },
        ],
      } as FilterQuery<PaymentRequestEntity>;
    }

    const approverRoles = this.rolesOf(user).filter(
      (role) => role === Role.APPROVER,
    );

    if (approverRoles.length > 0) {
      return {
        $or: [
          { requester: user.id },
          {
            status: { $ne: PaymentRequestStatus.DRAFT },
            approvalSteps: { requiredRole: { $in: approverRoles } },
          },
        ],
      } as FilterQuery<PaymentRequestEntity>;
    }

    return { requester: user.id } as FilterQuery<PaymentRequestEntity>;
  }

  async listForUser(user: UserEntity, query: ListPaymentRequestsDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;

    const filters: FilterQuery<PaymentRequestEntity>[] = [
      this.visibilityFilter(user),
    ];

    switch (query.scope) {
      case RequestScope.MINE:
        filters.push({
          requester: user.id,
        } as FilterQuery<PaymentRequestEntity>);
        break;

      case RequestScope.AWAITING_ME: {
        const roles = this.rolesOf(user).filter(
          (role) => role === Role.APPROVER || role === Role.ADMIN,
        );

        filters.push({
          status: PaymentRequestStatus.PENDING_APPROVAL,
          pendingRole: { $in: roles.length > 0 ? roles : [null] },
          // Nobody approves their own request, so those never appear here.
          requester: { $ne: user.id },
        } as FilterQuery<PaymentRequestEntity>);
        break;
      }

      case RequestScope.PAYABLE:
        filters.push({
          status: { $in: [...PAYABLE_STATUSES] },
        } as FilterQuery<PaymentRequestEntity>);
        break;

      default:
        break;
    }

    if (query.status?.length) {
      filters.push({
        status: { $in: query.status },
      } as FilterQuery<PaymentRequestEntity>);
    }

    if (query.categoryId) {
      filters.push({
        category: query.categoryId,
      } as FilterQuery<PaymentRequestEntity>);
    }

    if (query.text) {
      filters.push({
        $or: [
          { title: { $ilike: `%${query.text}%` } },
          { payeeName: { $ilike: `%${query.text}%` } },
        ],
      } as FilterQuery<PaymentRequestEntity>);
    }

    if (query.from) {
      filters.push({
        dueDate: { $gte: new Date(query.from) },
      } as FilterQuery<PaymentRequestEntity>);
    }

    if (query.to) {
      filters.push({
        dueDate: { $lte: new Date(query.to) },
      } as FilterQuery<PaymentRequestEntity>);
    }

    if (query.overdue) {
      filters.push({
        dueDate: { $lt: new Date() },
        status: { $nin: [...TERMINAL_STATUSES] },
      } as FilterQuery<PaymentRequestEntity>);
    }

    const [items, total] = await this.findAll(
      { $and: filters } as FilterQuery<PaymentRequestEntity>,
      {
        // Overdue and soonest-due first: the queue is ordered by urgency, and
        // creation order is a tiebreaker, never the primary sort.
        orderBy: { dueDate: QueryOrder.ASC, id: QueryOrder.DESC },
        limit,
        offset: page * limit,
        populate: ['requester', 'category', 'vendor'] as never,
      },
    );

    return {
      items,
      total,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  /**
   * Loads a request with its whole tree, no permission check.
   *
   * Used to re-read a request *after* a transition the caller was already
   * authorised to make. Re-running the view check there would be wrong as well
   * as redundant: a decision can legitimately change who can see the request.
   */
  private async loadFullOrFail(id: number): Promise<PaymentRequestEntity> {
    const request = await this.findOne(
      { id },
      {
        populate: [
          'requester',
          'category',
          'vendor',
          'payeeAccount',
          'recurringSource',
          'approvalSteps',
          'approvalSteps.actor',
          'attachments',
          'attachments.uploadedBy',
        ] as never,
      },
    );

    if (!request) {
      throw new NotFoundException('درخواست پرداخت یافت نشد');
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

  private canView(request: PaymentRequestEntity, user: UserEntity): boolean {
    if (request.requester.id === user.id) {
      return true;
    }

    if (request.status === PaymentRequestStatus.DRAFT) {
      // A draft belongs to its author until they submit it.
      return false;
    }

    if (this.hasOversight(user)) {
      return true;
    }

    if (this.hasRole(user, Role.APPROVER)) {
      return request.approvalSteps
        .getItems()
        .some((step) => step.requiredRole === Role.APPROVER);
    }

    return false;
  }

  listPayments(requestId: number) {
    return this.paymentRepository.find(
      { request: requestId },
      {
        orderBy: { paidAt: QueryOrder.DESC },
        populate: ['paidBy', 'paymentSource'] as never,
      },
    );
  }

  /**
   * What the viewer can do right now. The UI reads this instead of
   * re-deriving the rules, so the button set and the API can't disagree.
   */
  permissionsFor(
    request: PaymentRequestEntity,
    user: UserEntity,
  ): RequestPermissions {
    const isOwner = request.requester.id === user.id;
    const isFinance = this.hasRole(user, Role.FINANCE);
    const editable = EDITABLE_STATUSES.includes(request.status);

    const decidableRoles: Role[] = this.rolesOf(user).filter(
      (role) => role === Role.APPROVER || role === Role.ADMIN,
    );

    const canDecide =
      !isOwner &&
      request.status === PaymentRequestStatus.PENDING_APPROVAL &&
      Boolean(request.pendingRole) &&
      decidableRoles.includes(request.pendingRole);

    return {
      canEdit: isOwner && editable,
      canSubmit: isOwner && request.status === PaymentRequestStatus.DRAFT,
      canDecide,
      canPay: isFinance && PAYABLE_STATUSES.includes(request.status),
      canCancel: isOwner && !TERMINAL_STATUSES.includes(request.status),
      canAttach:
        (isOwner && editable) ||
        (isFinance && !TERMINAL_STATUSES.includes(request.status)),
    };
  }

  // ---------------------------------------------------------------------------
  // writes
  // ---------------------------------------------------------------------------

  async createRequest(
    user: UserEntity,
    dto: CreatePaymentRequestDto,
  ): Promise<PaymentRequestEntity> {
    assertSafeAmount(dto.amountMinor);
    const category = await this.categories.getOrFail(dto.categoryId);

    if (!category.active) {
      throw new BadRequestException('این دسته هزینه غیرفعال است');
    }

    // Only Finance may raise a company-level payment; anyone else is an employee
    // regardless of what the client sent.
    const origin =
      dto.origin === RequestOrigin.FINANCE && this.hasRole(user, Role.FINANCE)
        ? RequestOrigin.FINANCE
        : RequestOrigin.EMPLOYEE;

    const request = await this.create({
      requester: this.em.getReference(UserEntity, user.id),
      origin,
      title: dto.title,
      description: dto.description,
      category: this.em.getReference(ExpenseCategoryEntity, category.id),
      vendor: dto.vendorId
        ? this.em.getReference(VendorEntity, dto.vendorId)
        : undefined,
      payeeAccount: dto.payeeAccountId
        ? this.em.getReference(PayeeAccountEntity, dto.payeeAccountId)
        : undefined,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      payeeName: dto.payeeName,
      payeeAccountType: dto.payeeAccountType,
      payeeAccountHolder: dto.payeeAccountHolder,
      payeeSheba: dto.payeeSheba,
      payeeCardNumber: dto.payeeCardNumber,
      payeeAccountDetails: dto.payeeAccountDetails,
      dueDate: new Date(dto.dueDate),
      costCenter: dto.costCenter,
      status: PaymentRequestStatus.DRAFT,
    });

    await this.activity.record({
      requestId: request.id,
      actorId: user.id,
      action: FinanceActivityAction.CREATED,
      toStatus: PaymentRequestStatus.DRAFT,
    });

    if (dto.submit) {
      return this.submit(request.id, user);
    }

    return request;
  }

  /**
   * Creates and submits the request for one cycle of a recurring expense.
   *
   * Runs with no acting user — the schedule's owner becomes the requester, and
   * the audit entry records a null actor, which the timeline renders as a
   * system event. Everything else is the ordinary path: the same approval
   * matrix, the same statuses, the same trail. Nothing is ever paid straight
   * off a schedule.
   *
   * Idempotent by the unique (recurringSource, dueDate) pair — a second run on
   * the same day returns the existing request instead of creating a duplicate.
   */
  async createFromSchedule(
    schedule: RecurringExpenseEntity,
    dueDate: Date,
  ): Promise<PaymentRequestEntity> {
    const existing = await this.findOne({
      recurringSource: schedule.id,
      dueDate,
    } as FilterQuery<PaymentRequestEntity>);

    if (existing) {
      return existing;
    }

    const account = schedule.payeeAccount;

    const request = await this.create({
      requester: this.em.getReference(UserEntity, schedule.owner.id),
      origin: RequestOrigin.RECURRING,
      title: schedule.title,
      description: schedule.notes,
      category: this.em.getReference(
        ExpenseCategoryEntity,
        schedule.category.id,
      ),
      vendor: this.em.getReference(VendorEntity, schedule.vendor.id),
      payeeAccount: account
        ? this.em.getReference(PayeeAccountEntity, account.id)
        : undefined,
      amountMinor: readBigint(schedule.amountMinor),
      currency: schedule.currency,
      // Snapshot, not a lookup: if the vendor changes bank details later, the
      // record of where this money was sent must not change with them.
      payeeName: schedule.vendor.name,
      payeeAccountType: account?.type ?? PayeeAccountType.SHEBA,
      payeeAccountHolder: account?.holderName,
      payeeSheba: account?.sheba,
      payeeCardNumber: account?.cardNumber,
      payeeAccountDetails:
        account?.details ??
        [account?.iban, account?.swift].filter(Boolean).join(' / ') ??
        undefined,
      dueDate,
      recurringSource: this.em.getReference(
        RecurringExpenseEntity,
        schedule.id,
      ),
      status: PaymentRequestStatus.DRAFT,
    });

    await this.activity.record({
      requestId: request.id,
      action: FinanceActivityAction.CREATED,
      toStatus: PaymentRequestStatus.DRAFT,
      comment: 'به‌صورت خودکار از هزینه دوره‌ای ساخته شد',
      meta: { recurringExpenseId: schedule.id },
    });

    return this.submitAsSystem(request.id);
  }

  /**
   * Submit path for a request nobody clicked submit on.
   *
   * Skips the ownership check (there is no acting user) but keeps every other
   * rule: the invoice requirement is deliberately *not* enforced, because a
   * subscription renewal has no invoice until the vendor issues one.
   */
  private async submitAsSystem(id: number): Promise<PaymentRequestEntity> {
    const request = await this.loadFullOrFail(id);

    const amountRial = toRial(
      readBigint(request.amountMinor),
      request.currency,
    );
    const chain = this.enforceMinimumApproval(
      await this.approvalRules.resolveChain(amountRial, request.category.id),
      request.currency,
      request.origin,
    );

    await this.withTransaction(async (em) => {
      const steps = chain.map((role, index) =>
        em.create(ApprovalStepEntity, {
          request: em.getReference(PaymentRequestEntity, id),
          sequence: index,
          requiredRole: role,
          status: ApprovalStepStatus.PENDING,
        } as never),
      );

      if (steps.length > 0) {
        await em.persistAndFlush(steps);
      }

      const target = await em.findOne(PaymentRequestEntity, { id });
      em.assign(target, {
        // No approver needed → SCHEDULED, i.e. approved with a future payment
        // date, so it sits in the queue ordered by deadline rather than
        // pretending to be due today.
        status:
          chain.length > 0
            ? PaymentRequestStatus.PENDING_APPROVAL
            : PaymentRequestStatus.SCHEDULED,
        pendingRole: chain.length > 0 ? chain[0] : null,
        pendingSequence: chain.length > 0 ? 0 : null,
        submittedAt: new Date(),
      });
      await em.persistAndFlush(target);
    });

    const updated = await this.loadFullOrFail(id);

    await this.activity.record({
      requestId: id,
      action: FinanceActivityAction.SUBMITTED,
      fromStatus: PaymentRequestStatus.DRAFT,
      toStatus: updated.status,
      meta: { chain, system: true },
    });

    if (updated.status === PaymentRequestStatus.PENDING_APPROVAL) {
      await this.notifications.notifyApprovalNeeded(updated, chain[0]);
    } else {
      await this.notifications.notifyReadyToPay(updated);
    }

    return updated;
  }

  async updateRequest(
    id: number,
    user: UserEntity,
    dto: UpdatePaymentRequestDto,
  ): Promise<PaymentRequestEntity> {
    const request = await this.getDetailOrFail(id, user);

    if (request.requester.id !== user.id) {
      throw new ForbiddenException(
        'فقط ثبت‌کننده درخواست می‌تواند آن را ویرایش کند',
      );
    }

    if (!EDITABLE_STATUSES.includes(request.status)) {
      throw new ConflictException(
        'این درخواست در وضعیتی نیست که قابل ویرایش باشد',
      );
    }

    if (dto.amountMinor !== undefined) {
      assertSafeAmount(dto.amountMinor);
    }

    const { categoryId, vendorId, payeeAccountId, dueDate, ...rest } = dto;

    await this.updateOne(
      { id },
      {
        ...rest,
        ...(categoryId
          ? {
              category: this.em.getReference(ExpenseCategoryEntity, categoryId),
            }
          : {}),
        ...(vendorId !== undefined
          ? {
              vendor: vendorId
                ? this.em.getReference(VendorEntity, vendorId)
                : null,
            }
          : {}),
        ...(payeeAccountId !== undefined
          ? {
              payeeAccount: payeeAccountId
                ? this.em.getReference(PayeeAccountEntity, payeeAccountId)
                : null,
            }
          : {}),
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      },
    );

    await this.activity.record({
      requestId: id,
      actorId: user.id,
      action: FinanceActivityAction.UPDATED,
    });

    return this.loadFullOrFail(id);
  }

  /**
   * Materialises the approval chain from the matrix in force right now and
   * moves the request into the flow. Re-submitting after a needs-info round
   * rebuilds the chain, because the amount may have changed.
   */
  async submit(id: number, user: UserEntity): Promise<PaymentRequestEntity> {
    const request = await this.getDetailOrFail(id, user);

    if (request.requester.id !== user.id) {
      throw new ForbiddenException(
        'فقط ثبت‌کننده درخواست می‌تواند آن را ارسال کند',
      );
    }

    if (!EDITABLE_STATUSES.includes(request.status)) {
      throw new ConflictException('این درخواست قبلاً ارسال شده است');
    }

    if (request.category.requiresInvoice) {
      const invoiceCount = await this.attachments.countForRequest(id, [
        AttachmentKind.INVOICE,
        AttachmentKind.QUOTE,
        AttachmentKind.CONTRACT,
      ]);

      if (invoiceCount === 0) {
        throw new BadRequestException(
          'برای این دسته هزینه، پیوست فاکتور یا پیش‌فاکتور الزامی است',
        );
      }
    }

    const amountRial = toRial(
      readBigint(request.amountMinor),
      request.currency,
    );
    const chain = this.enforceMinimumApproval(
      await this.approvalRules.resolveChain(amountRial, request.category.id),
      request.currency,
      request.origin,
    );

    const fromStatus = request.status;

    // Steps from an earlier round are retired, not deleted, so the trail shows
    // that this request went round more than once. New steps continue the
    // numbering, which keeps "lowest pending sequence" the current step.
    const previousSteps = request.approvalSteps.getItems();
    const startSequence =
      previousSteps.length > 0
        ? Math.max(...previousSteps.map((step) => step.sequence)) + 1
        : 0;

    await this.withTransaction(async (em) => {
      await em.nativeUpdate(
        ApprovalStepEntity,
        { request: id, status: ApprovalStepStatus.PENDING },
        { status: ApprovalStepStatus.SKIPPED },
      );

      const steps = chain.map((role, index) =>
        em.create(ApprovalStepEntity, {
          request: em.getReference(PaymentRequestEntity, id),
          sequence: startSequence + index,
          requiredRole: role,
          status: ApprovalStepStatus.PENDING,
        } as never),
      );

      if (steps.length > 0) {
        await em.persistAndFlush(steps);
      }

      const target = await em.findOne(PaymentRequestEntity, { id });
      em.assign(target, {
        status:
          chain.length > 0
            ? PaymentRequestStatus.PENDING_APPROVAL
            : PaymentRequestStatus.APPROVED,
        pendingRole: chain.length > 0 ? chain[0] : null,
        pendingSequence: chain.length > 0 ? startSequence : null,
        submittedAt: new Date(),
        lastDecisionComment: null,
      });
      await em.persistAndFlush(target);
    });

    const updated = await this.loadFullOrFail(id);

    await this.activity.record({
      requestId: id,
      actorId: user.id,
      action: FinanceActivityAction.SUBMITTED,
      fromStatus,
      toStatus: updated.status,
      meta: { chain },
    });

    if (updated.status === PaymentRequestStatus.PENDING_APPROVAL) {
      await this.notifications.notifyApprovalNeeded(updated, chain[0]);
    } else {
      await this.notifications.notifyReadyToPay(updated);
    }

    return updated;
  }

  /**
   * Approves the outstanding step. When it was the last one the request drops
   * into the Finance queue; otherwise the next approver is notified.
   */
  async approve(
    id: number,
    user: UserEntity,
    comment?: string,
  ): Promise<PaymentRequestEntity> {
    const request = await this.getDetailOrFail(id, user);
    const step = this.assertCanDecide(request, user);

    const remaining = request.approvalSteps
      .getItems()
      .filter((s) => s.sequence > step.sequence)
      .sort((a, b) => a.sequence - b.sequence);

    const nextStep = remaining.find(
      (s) => s.status === ApprovalStepStatus.PENDING,
    );

    await this.withTransaction(async (em) => {
      const target = await em.findOne(ApprovalStepEntity, { id: step.id });
      em.assign(target, {
        status: ApprovalStepStatus.APPROVED,
        actor: em.getReference(UserEntity, user.id),
        decidedAt: new Date(),
        comment,
      });

      const parent = await em.findOne(PaymentRequestEntity, { id });
      em.assign(parent, {
        status: nextStep
          ? PaymentRequestStatus.PENDING_APPROVAL
          : PaymentRequestStatus.APPROVED,
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
      action: FinanceActivityAction.APPROVED,
      fromStatus: PaymentRequestStatus.PENDING_APPROVAL,
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
      await this.notifications.notifyReadyToPay(updated);
    }

    return updated;
  }

  async reject(
    id: number,
    user: UserEntity,
    comment: string,
  ): Promise<PaymentRequestEntity> {
    const request = await this.getDetailOrFail(id, user);
    const step = this.assertCanDecide(request, user);

    await this.withTransaction(async (em) => {
      const target = await em.findOne(ApprovalStepEntity, { id: step.id });
      em.assign(target, {
        status: ApprovalStepStatus.REJECTED,
        actor: em.getReference(UserEntity, user.id),
        decidedAt: new Date(),
        comment,
      });

      const parent = await em.findOne(PaymentRequestEntity, { id });
      em.assign(parent, {
        status: PaymentRequestStatus.REJECTED,
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
      action: FinanceActivityAction.REJECTED,
      fromStatus: PaymentRequestStatus.PENDING_APPROVAL,
      toStatus: PaymentRequestStatus.REJECTED,
      comment,
    });

    await this.notifications.notifyRejected(updated, comment);
    return updated;
  }

  /**
   * Sends the request back for correction. Edit rights return to the requester
   * and the outstanding chain is retired — the next submit builds a fresh one,
   * because the amount may well change in between.
   *
   * Steps are marked SKIPPED rather than deleted. Deleting them would erase the
   * record that this request went round once, and would also cut the approver's
   * only link to it, hiding a request they themselves returned.
   */
  async requestInfo(
    id: number,
    user: UserEntity,
    comment: string,
  ): Promise<PaymentRequestEntity> {
    const request = await this.getDetailOrFail(id, user);
    const step = this.assertCanDecide(request, user);

    await this.withTransaction(async (em) => {
      const decided = await em.findOne(ApprovalStepEntity, { id: step.id });
      em.assign(decided, {
        status: ApprovalStepStatus.SKIPPED,
        actor: em.getReference(UserEntity, user.id),
        decidedAt: new Date(),
        comment,
      });

      await em.nativeUpdate(
        ApprovalStepEntity,
        { request: id, status: ApprovalStepStatus.PENDING },
        { status: ApprovalStepStatus.SKIPPED },
      );

      const parent = await em.findOne(PaymentRequestEntity, { id });
      em.assign(parent, {
        status: PaymentRequestStatus.NEEDS_INFO,
        pendingRole: null,
        pendingSequence: null,
        lastDecisionComment: comment,
      });

      await em.persistAndFlush([decided, parent]);
    });

    await this.activity.record({
      requestId: id,
      actorId: user.id,
      action: FinanceActivityAction.INFO_REQUESTED,
      fromStatus: PaymentRequestStatus.PENDING_APPROVAL,
      toStatus: PaymentRequestStatus.NEEDS_INFO,
      comment,
    });

    const updated = await this.loadFullOrFail(id);
    await this.notifications.notifyNeedsInfo(updated, comment);
    return updated;
  }

  async cancel(id: number, user: UserEntity): Promise<PaymentRequestEntity> {
    const request = await this.getDetailOrFail(id, user);

    if (request.requester.id !== user.id) {
      throw new ForbiddenException(
        'فقط ثبت‌کننده درخواست می‌تواند آن را لغو کند',
      );
    }

    if (TERMINAL_STATUSES.includes(request.status)) {
      throw new ConflictException('این درخواست قابل لغو نیست');
    }

    const fromStatus = request.status;

    await this.withTransaction(async (em) => {
      await em.nativeUpdate(
        ApprovalStepEntity,
        { request: id, status: ApprovalStepStatus.PENDING },
        { status: ApprovalStepStatus.SKIPPED },
      );

      const parent = await em.findOne(PaymentRequestEntity, { id });
      em.assign(parent, {
        status: PaymentRequestStatus.CANCELLED,
        pendingRole: null,
        pendingSequence: null,
        decidedAt: new Date(),
      });

      await em.persistAndFlush(parent);
    });

    await this.activity.record({
      requestId: id,
      actorId: user.id,
      action: FinanceActivityAction.CANCELLED,
      fromStatus,
      toStatus: PaymentRequestStatus.CANCELLED,
    });

    return this.loadFullOrFail(id);
  }

  /**
   * Records that a transfer happened. The system never infers this — the money
   * moves in a banking app and a human asserts it here, with a reference number
   * as evidence.
   */
  async recordPayment(
    id: number,
    user: UserEntity,
    dto: RecordPaymentDto,
  ): Promise<PaymentRequestEntity> {
    const request = await this.getDetailOrFail(id, user);

    if (!this.hasRole(user, Role.FINANCE)) {
      throw new ForbiddenException('فقط تیم مالی می‌تواند پرداخت را ثبت کند');
    }

    if (!PAYABLE_STATUSES.includes(request.status)) {
      throw new ConflictException('فقط درخواست‌های تأییدشده قابل پرداخت هستند');
    }

    // Requester and payer may be the same person only when someone else
    // approved along the way. A request with no approval step at all has no
    // second pair of eyes, so paying your own is refused.
    const approvedByOthers = request.approvalSteps
      .getItems()
      .some((step) => step.status === ApprovalStepStatus.APPROVED);

    if (request.requester.id === user.id && !approvedByOthers) {
      throw new ForbiddenException(
        'پرداخت درخواستی که خودتان ثبت کرده‌اید و تأییدکننده‌ای نداشته مجاز نیست',
      );
    }

    const source = await this.em.findOne(PaymentSourceEntity, {
      id: dto.paymentSourceId,
    });

    if (!source) {
      throw new NotFoundException('منبع پرداخت یافت نشد');
    }

    if (request.currency !== Currency.IRR && !dto.fxRateRialPerUnit) {
      throw new BadRequestException(
        'برای پرداخت ارزی، وارد کردن نرخ تبدیل الزامی است',
      );
    }

    const fromStatus = request.status;

    await this.withTransaction(async (em) => {
      const payment = em.create(PaymentEntity, {
        request: em.getReference(PaymentRequestEntity, id),
        paymentSource: em.getReference(PaymentSourceEntity, source.id),
        paidAt: new Date(dto.paidAt),
        settledAmountRial: dto.settledAmountRial,
        fxRateRialPerUnit: dto.fxRateRialPerUnit ?? null,
        feeRial: dto.feeRial ?? null,
        intermediary: dto.intermediary,
        referenceNumber: dto.referenceNumber,
        receipt: dto.receiptAttachmentId
          ? em.getReference(RequestAttachmentEntity, dto.receiptAttachmentId)
          : null,
        paidBy: em.getReference(UserEntity, user.id),
        status: PaymentStatus.SUCCEEDED,
        notes: dto.notes,
      } as never);

      const parent = await em.findOne(PaymentRequestEntity, { id });
      em.assign(parent, {
        status: PaymentRequestStatus.PAID,
        paidAt: new Date(dto.paidAt),
        pendingRole: null,
        pendingSequence: null,
      });

      await em.persistAndFlush([payment, parent]);
    });

    await this.activity.record({
      requestId: id,
      actorId: user.id,
      action: FinanceActivityAction.PAID,
      fromStatus,
      toStatus: PaymentRequestStatus.PAID,
      comment: dto.notes,
      meta: {
        settledAmountRial: dto.settledAmountRial,
        referenceNumber: dto.referenceNumber,
        paymentSource: source.label,
      },
    });

    const updated = await this.loadFullOrFail(id);
    await this.notifications.notifyPaid(updated, dto.referenceNumber);
    return updated;
  }

  /**
   * A transfer that bounced. The request goes back into the queue with the
   * reason visible — a failed payment that disappears is how a vendor goes
   * unpaid for a month.
   */
  async failPayment(
    id: number,
    user: UserEntity,
    reason: string,
  ): Promise<PaymentRequestEntity> {
    const request = await this.getDetailOrFail(id, user);

    if (!this.hasRole(user, Role.FINANCE)) {
      throw new ForbiddenException(
        'فقط تیم مالی می‌تواند پرداخت ناموفق را ثبت کند',
      );
    }

    if (!PAYABLE_STATUSES.includes(request.status)) {
      throw new ConflictException('این درخواست در صف پرداخت نیست');
    }

    const fromStatus = request.status;

    await this.updateOne(
      { id },
      { status: PaymentRequestStatus.FAILED, lastDecisionComment: reason },
    );

    await this.activity.record({
      requestId: id,
      actorId: user.id,
      action: FinanceActivityAction.PAYMENT_FAILED,
      fromStatus,
      toStatus: PaymentRequestStatus.FAILED,
      comment: reason,
    });

    const updated = await this.loadFullOrFail(id);
    await this.notifications.notifyPaymentFailed(updated, reason);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // guards
  // ---------------------------------------------------------------------------

  /**
   * The single place the "nobody approves their own request" rule lives.
   * Everything else about approval routing flows through the pending step.
   */
  private assertCanDecide(
    request: PaymentRequestEntity,
    user: UserEntity,
  ): ApprovalStepEntity {
    if (request.status !== PaymentRequestStatus.PENDING_APPROVAL) {
      throw new ConflictException('این درخواست در انتظار تأیید نیست');
    }

    if (request.requester.id === user.id) {
      throw new ForbiddenException('تأیید درخواست خودتان مجاز نیست');
    }

    const step = request.approvalSteps
      .getItems()
      .filter((s) => s.status === ApprovalStepStatus.PENDING)
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

  /** Used by the attachment endpoints, which need the request but not its tree. */
  async assertCanAttach(
    id: number,
    user: UserEntity,
  ): Promise<PaymentRequestEntity> {
    const request = await this.getDetailOrFail(id, user);

    if (!this.permissionsFor(request, user).canAttach) {
      throw new ForbiddenException(
        'امکان افزودن پیوست به این درخواست وجود ندارد',
      );
    }

    return request;
  }
}
