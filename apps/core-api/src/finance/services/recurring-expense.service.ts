import { EntityRepository, FilterQuery, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { UserEntity } from '../../user/user.entity';
import {
  CreateRecurringExpenseDto,
  ListRecurringDto,
  UpdateRecurringExpenseDto,
} from '../dtos/vendor.dto';
import { ExpenseCategoryEntity } from '../entities/expense-category.entity';
import { PayeeAccountEntity } from '../entities/payee-account.entity';
import { PaymentSourceEntity } from '../entities/payment-source.entity';
import { RecurringExpenseEntity } from '../entities/recurring-expense.entity';
import { VendorEntity } from '../entities/vendor.entity';
import { BillingCalendar } from '../finance.constants';
import {
  advanceDueDate,
  daysUntil,
  dueReminderWindow,
} from '../utils/recurrence.util';
import { readBigint } from '../utils/money.util';
import { FinanceNotificationService } from './finance-notification.service';
import { PaymentRequestService } from './payment-request.service';

@Injectable()
export class RecurringExpenseService extends BaseRepositoryService<RecurringExpenseEntity> {
  private readonly logger = new Logger(RecurringExpenseService.name);

  constructor(
    @InjectRepository(RecurringExpenseEntity)
    protected repository: EntityRepository<RecurringExpenseEntity>,
    private readonly requests: PaymentRequestService,
    private readonly notifications: FinanceNotificationService,
  ) {
    super(repository);
  }

  // --- reads ----------------------------------------------------------------

  async listPaginated(query: ListRecurringDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 20;

    const filters: FilterQuery<RecurringExpenseEntity>[] = [];

    if (query.activeOnly) {
      filters.push({ active: true } as FilterQuery<RecurringExpenseEntity>);
    }

    if (query.vendorId) {
      filters.push({
        vendor: query.vendorId,
      } as FilterQuery<RecurringExpenseEntity>);
    }

    if (query.text) {
      filters.push({
        title: { $ilike: `%${query.text}%` },
      } as FilterQuery<RecurringExpenseEntity>);
    }

    if (query.dueWithinDays) {
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + query.dueWithinDays);
      filters.push({
        nextDueDate: { $lte: horizon },
        active: true,
      } as FilterQuery<RecurringExpenseEntity>);
    }

    const [items, total] = await this.findAll(
      filters.length > 0
        ? ({ $and: filters } as FilterQuery<RecurringExpenseEntity>)
        : {},
      {
        orderBy: { nextDueDate: QueryOrder.ASC },
        limit,
        offset: page * limit,
        populate: [
          'vendor',
          'category',
          'owner',
          'payeeAccount',
          'defaultPaymentSource',
        ] as never,
      },
    );

    return {
      items,
      meta: { page, limit, total, pageCount: Math.ceil(total / limit) },
    };
  }

  async getOrFail(id: number): Promise<RecurringExpenseEntity> {
    const schedule = await this.findOne(
      { id },
      {
        populate: [
          'vendor',
          'category',
          'owner',
          'payeeAccount',
          'defaultPaymentSource',
        ] as never,
      },
    );

    if (!schedule) {
      throw new NotFoundException('هزینه دوره‌ای یافت نشد');
    }

    return schedule;
  }

  // --- writes ---------------------------------------------------------------

  async createSchedule(dto: CreateRecurringExpenseDto, callerId: number) {
    return this.create({
      title: dto.title,
      vendor: this.em.getReference(VendorEntity, dto.vendorId),
      category: this.em.getReference(ExpenseCategoryEntity, dto.categoryId),
      payeeAccount: dto.payeeAccountId
        ? this.em.getReference(PayeeAccountEntity, dto.payeeAccountId)
        : undefined,
      defaultPaymentSource: dto.defaultPaymentSourceId
        ? this.em.getReference(PaymentSourceEntity, dto.defaultPaymentSourceId)
        : undefined,
      amountMinor: dto.amountMinor,
      currency: dto.currency,
      cycle: dto.cycle,
      cycleDays: dto.cycleDays,
      calendar: dto.calendar ?? BillingCalendar.GREGORIAN,
      nextDueDate: new Date(dto.nextDueDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      reminderDays: dto.reminderDays ?? [30, 14, 7, 1],
      leadDays: dto.leadDays ?? 7,
      // Whoever registers it usually owns it; an admin can reassign later.
      owner: this.em.getReference(UserEntity, dto.ownerId ?? callerId),
      autoGenerate: dto.autoGenerate ?? true,
      notes: dto.notes,
      active: dto.active ?? true,
    });
  }

  async updateSchedule(id: number, dto: UpdateRecurringExpenseDto) {
    await this.getOrFail(id);

    const {
      vendorId,
      categoryId,
      payeeAccountId,
      defaultPaymentSourceId,
      ownerId,
      nextDueDate,
      endDate,
      ...rest
    } = dto;

    return this.updateOne(
      { id },
      {
        ...rest,
        ...(vendorId
          ? { vendor: this.em.getReference(VendorEntity, vendorId) }
          : {}),
        ...(categoryId
          ? {
              category: this.em.getReference(ExpenseCategoryEntity, categoryId),
            }
          : {}),
        ...(payeeAccountId !== undefined
          ? {
              payeeAccount: payeeAccountId
                ? this.em.getReference(PayeeAccountEntity, payeeAccountId)
                : null,
            }
          : {}),
        ...(defaultPaymentSourceId !== undefined
          ? {
              defaultPaymentSource: defaultPaymentSourceId
                ? this.em.getReference(
                    PaymentSourceEntity,
                    defaultPaymentSourceId,
                  )
                : null,
            }
          : {}),
        ...(ownerId
          ? { owner: this.em.getReference(UserEntity, ownerId) }
          : {}),
        ...(nextDueDate ? { nextDueDate: new Date(nextDueDate) } : {}),
        ...(endDate !== undefined
          ? { endDate: endDate ? new Date(endDate) : null }
          : {}),
        // Any edit to timing invalidates which reminder was last sent.
        ...(nextDueDate ? { lastReminderDaysSent: null } : {}),
      },
    );
  }

  /**
   * Schedules are referenced by the requests they produced, so one that has
   * generated anything is deactivated rather than deleted.
   */
  async removeSchedule(id: number): Promise<{ deactivated: boolean }> {
    await this.getOrFail(id);

    const generated = await this.requests.count({
      recurringSource: id,
    } as never);

    if (generated > 0) {
      await this.updateOne({ id }, { active: false });
      return { deactivated: true };
    }

    await this.em.nativeDelete(RecurringExpenseEntity, { id });
    return { deactivated: false };
  }

  /** Roll forward one cycle without generating anything — "not this month". */
  async skipCycle(id: number): Promise<RecurringExpenseEntity> {
    const schedule = await this.getOrFail(id);

    return this.updateOne(
      { id },
      {
        nextDueDate: advanceDueDate(
          schedule.nextDueDate,
          schedule.cycle,
          schedule.calendar,
          schedule.cycleDays,
        ),
        lastReminderDaysSent: null,
      },
    );
  }

  /**
   * Creates the request for the current cycle now, ahead of the job, and rolls
   * the schedule forward. Used by the "generate now" action and by the daily
   * materialiser.
   */
  async generateNow(id: number) {
    const schedule = await this.getOrFail(id);
    const dueDate = schedule.nextDueDate;

    const request = await this.requests.createFromSchedule(schedule, dueDate);
    await this.rollForward(schedule);

    return request;
  }

  private async rollForward(schedule: RecurringExpenseEntity): Promise<void> {
    const next = advanceDueDate(
      schedule.nextDueDate,
      schedule.cycle,
      schedule.calendar,
      schedule.cycleDays,
    );

    const ended = schedule.endDate && next > schedule.endDate;

    await this.updateOne(
      { id: schedule.id },
      {
        nextDueDate: next,
        lastReminderDaysSent: null,
        // A schedule past its end date stops on its own rather than needing
        // someone to remember to turn it off.
        ...(ended ? { active: false } : {}),
      },
    );
  }

  // --- the daily job --------------------------------------------------------

  /**
   * One pass over every active schedule: warn the owner when a reminder window
   * opens, and create the payment request once the lead time is reached.
   *
   * Safe to run more than once a day — reminders are gated on
   * `lastReminderDaysSent` and request creation on the unique
   * (recurringSource, dueDate) pair.
   */
  async runDailyCycle(now: Date = new Date()): Promise<{
    reminded: number;
    generated: number;
  }> {
    const [schedules] = await this.findAll(
      { active: true } as FilterQuery<RecurringExpenseEntity>,
      {
        populate: ['vendor', 'category', 'owner', 'payeeAccount'] as never,
      },
    );

    let reminded = 0;
    let generated = 0;

    for (const schedule of schedules) {
      try {
        if (await this.sendDueReminder(schedule, now)) {
          reminded += 1;
        }

        if (
          schedule.autoGenerate &&
          daysUntil(schedule.nextDueDate, now) <= schedule.leadDays
        ) {
          await this.requests.createFromSchedule(
            schedule,
            schedule.nextDueDate,
          );
          await this.rollForward(schedule);
          generated += 1;
        }
      } catch (error) {
        // One broken schedule must not stop the rest of the run.
        this.logger.error(
          `پردازش هزینه دوره‌ای ${schedule.id} ناموفق بود: ${error?.message}`,
        );
      }
    }

    return { reminded, generated };
  }

  private async sendDueReminder(
    schedule: RecurringExpenseEntity,
    now: Date,
  ): Promise<boolean> {
    const window = dueReminderWindow(
      schedule.nextDueDate,
      schedule.reminderDays,
      schedule.lastReminderDaysSent ?? undefined,
      now,
    );

    if (window === null) {
      return false;
    }

    await this.notifications.notifyRenewalDue(
      schedule.owner.id,
      {
        id: schedule.id,
        title: schedule.title,
        vendorName: schedule.vendor.name,
        amountMinor: readBigint(schedule.amountMinor),
        currency: schedule.currency,
      },
      window,
    );

    await this.updateOne({ id: schedule.id }, { lastReminderDaysSent: window });

    return true;
  }
}
