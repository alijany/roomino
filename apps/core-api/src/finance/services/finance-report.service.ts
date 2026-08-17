import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { PaymentRequestEntity } from '../entities/payment-request.entity';
import { RecurringExpenseEntity } from '../entities/recurring-expense.entity';
import {
  Currency,
  PaymentRequestStatus,
  PaymentStatus,
  TERMINAL_STATUSES,
} from '../finance.constants';
import { readBigint } from '../utils/money.util';

/**
 * Every figure this service returns is in **rial**, summed from
 * `payment_entity.settled_amount_rial` — what actually left the account, not
 * what was asked for. Requested-vs-settled variance is reported separately
 * rather than being silently averaged away.
 *
 * Aggregation is single-pass SQL. Walking requests in JS would be an N+1 that
 * gets slower every month the company operates.
 */
@Injectable()
export class FinanceReportService {
  constructor(private readonly em: EntityManager) {}

  private num(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  /** Start of a month, and the start of the next — a half-open [from, to) range. */
  private monthRange(year: number, month: number): { from: Date; to: Date } {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));
    return { from, to };
  }

  // ---------------------------------------------------------------------------
  // dashboard
  // ---------------------------------------------------------------------------

  async dashboard(from: Date, to: Date) {
    const knex = this.em.getConnection();

    // Paid in the window, and in the equivalent window before it, so the
    // headline can carry a comparison rather than a bare number.
    const span = to.getTime() - from.getTime();
    const previousFrom = new Date(from.getTime() - span);

    const [
      paidNow,
      paidPrevious,
      pending,
      payable,
      overdue,
      upcoming,
      recurring,
      approvalTime,
      foreign,
    ] = await Promise.all([
      knex.execute(
        `select coalesce(sum(p.settled_amount_rial), 0) as total, count(*)::int as count
         from payment_entity p
         where p.status = ? and p.paid_at >= ? and p.paid_at < ?`,
        [PaymentStatus.SUCCEEDED, from, to],
      ),
      knex.execute(
        `select coalesce(sum(p.settled_amount_rial), 0) as total
         from payment_entity p
         where p.status = ? and p.paid_at >= ? and p.paid_at < ?`,
        [PaymentStatus.SUCCEEDED, previousFrom, from],
      ),
      knex.execute(
        `select count(*)::int as count,
                coalesce(sum(case when r.currency = ? then r.amount_minor else 0 end), 0) as total
         from payment_request_entity r
         where r.status = ?`,
        [Currency.IRR, PaymentRequestStatus.PENDING_APPROVAL],
      ),
      knex.execute(
        `select count(*)::int as count,
                coalesce(sum(case when r.currency = ? then r.amount_minor else 0 end), 0) as total
         from payment_request_entity r
         where r.status in (?, ?, ?)`,
        [
          Currency.IRR,
          PaymentRequestStatus.APPROVED,
          PaymentRequestStatus.SCHEDULED,
          PaymentRequestStatus.FAILED,
        ],
      ),
      knex.execute(
        `select count(*)::int as count
         from payment_request_entity r
         where r.due_date < now() and r.status not in (?, ?, ?)`,
        [...TERMINAL_STATUSES],
      ),
      knex.execute(
        `select coalesce(sum(case when r.currency = ? then r.amount_minor else 0 end), 0) as total
         from payment_request_entity r
         where r.status in (?, ?) and r.due_date >= now() and r.due_date < now() + interval '30 days'`,
        [
          Currency.IRR,
          PaymentRequestStatus.APPROVED,
          PaymentRequestStatus.SCHEDULED,
        ],
      ),
      knex.execute(
        `select count(*)::int as count,
                coalesce(sum(case when e.currency = ? then
                  case e.cycle
                    when 'monthly' then e.amount_minor
                    when 'quarterly' then e.amount_minor / 3
                    when 'yearly' then e.amount_minor / 12
                    else e.amount_minor * 30 / greatest(coalesce(e.cycle_days, 30), 1)
                  end
                else 0 end), 0) as monthly_run_rate
         from recurring_expense_entity e
         where e.active = true`,
        [Currency.IRR],
      ),
      knex.execute(
        `select coalesce(avg(extract(epoch from (r.decided_at - r.submitted_at)) / 86400), 0) as days
         from payment_request_entity r
         where r.submitted_at is not null and r.decided_at is not null
           and r.decided_at >= ? and r.decided_at < ?`,
        [from, to],
      ),
      knex.execute(
        `select coalesce(sum(p.settled_amount_rial), 0) as total,
                coalesce(sum(p.fee_rial), 0) as fees,
                count(*)::int as count
         from payment_entity p
         join payment_request_entity r on r.id = p.request_id
         where p.status = ? and p.paid_at >= ? and p.paid_at < ? and r.currency <> ?`,
        [PaymentStatus.SUCCEEDED, from, to, Currency.IRR],
      ),
    ]);

    const paidTotal = this.num(paidNow[0]?.total);
    const previousTotal = this.num(paidPrevious[0]?.total);

    return {
      range: { from, to },
      paid: {
        totalRial: paidTotal,
        count: this.num(paidNow[0]?.count),
        previousTotalRial: previousTotal,
        // Null rather than 0% when there is nothing to compare against —
        // "+100%" off a zero baseline is a lie.
        changePercent:
          previousTotal > 0
            ? Math.round(((paidTotal - previousTotal) / previousTotal) * 100)
            : null,
      },
      pendingApproval: {
        count: this.num(pending[0]?.count),
        totalRial: this.num(pending[0]?.total),
      },
      readyToPay: {
        count: this.num(payable[0]?.count),
        totalRial: this.num(payable[0]?.total),
      },
      overdueCount: this.num(overdue[0]?.count),
      upcoming30DaysRial: this.num(upcoming[0]?.total),
      recurring: {
        activeCount: this.num(recurring[0]?.count),
        monthlyRunRateRial: this.num(recurring[0]?.monthly_run_rate),
      },
      averageApprovalDays:
        Math.round(this.num(approvalTime[0]?.days) * 10) / 10,
      foreignSpend: {
        totalRial: this.num(foreign[0]?.total),
        feesRial: this.num(foreign[0]?.fees),
        count: this.num(foreign[0]?.count),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // breakdowns
  // ---------------------------------------------------------------------------

  async byCategory(from: Date, to: Date) {
    const rows = await this.em.getConnection().execute(
      `select c.id, c.name, coalesce(sum(p.settled_amount_rial), 0) as total, count(*)::int as count
       from payment_entity p
       join payment_request_entity r on r.id = p.request_id
       join expense_category_entity c on c.id = r.category_id
       where p.status = ? and p.paid_at >= ? and p.paid_at < ?
       group by c.id, c.name
       order by total desc`,
      [PaymentStatus.SUCCEEDED, from, to],
    );

    return rows.map((row) => ({
      id: this.num(row.id),
      name: row.name as string,
      totalRial: this.num(row.total),
      count: this.num(row.count),
    }));
  }

  async byVendor(from: Date, to: Date, limit = 10) {
    const rows = await this.em.getConnection().execute(
      `select coalesce(v.name, r.payee_name) as name,
              coalesce(sum(p.settled_amount_rial), 0) as total,
              count(*)::int as count
       from payment_entity p
       join payment_request_entity r on r.id = p.request_id
       left join vendor_entity v on v.id = r.vendor_id
       where p.status = ? and p.paid_at >= ? and p.paid_at < ?
       group by coalesce(v.name, r.payee_name)
       order by total desc
       limit ?`,
      [PaymentStatus.SUCCEEDED, from, to, limit],
    );

    return rows.map((row) => ({
      name: row.name as string,
      totalRial: this.num(row.total),
      count: this.num(row.count),
    }));
  }

  async bySource(from: Date, to: Date) {
    const rows = await this.em.getConnection().execute(
      `select s.label as name, coalesce(sum(p.settled_amount_rial), 0) as total, count(*)::int as count
       from payment_entity p
       join payment_source_entity s on s.id = p.payment_source_id
       where p.status = ? and p.paid_at >= ? and p.paid_at < ?
       group by s.label
       order by total desc`,
      [PaymentStatus.SUCCEEDED, from, to],
    );

    return rows.map((row) => ({
      name: row.name as string,
      totalRial: this.num(row.total),
      count: this.num(row.count),
    }));
  }

  /** Monthly totals for the trend chart, domestic and foreign split out. */
  async trend(months = 12) {
    const rows = await this.em.getConnection().execute(
      `select to_char(date_trunc('month', p.paid_at), 'YYYY-MM') as month,
              coalesce(sum(p.settled_amount_rial), 0) as total,
              coalesce(sum(case when r.currency <> ? then p.settled_amount_rial else 0 end), 0) as foreign_total,
              count(*)::int as count
       from payment_entity p
       join payment_request_entity r on r.id = p.request_id
       where p.status = ? and p.paid_at >= date_trunc('month', now()) - make_interval(months => ?)
       group by 1
       order by 1`,
      [Currency.IRR, PaymentStatus.SUCCEEDED, months - 1],
    );

    return rows.map((row) => ({
      month: row.month as string,
      totalRial: this.num(row.total),
      foreignRial: this.num(row.foreign_total),
      domesticRial: this.num(row.total) - this.num(row.foreign_total),
      count: this.num(row.count),
    }));
  }

  /** Everything committed but not yet paid, inside the horizon. */
  async upcoming(days = 30) {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + days);

    const [requests, schedules] = await Promise.all([
      this.em.find(
        PaymentRequestEntity,
        {
          status: {
            $in: [
              PaymentRequestStatus.APPROVED,
              PaymentRequestStatus.SCHEDULED,
              PaymentRequestStatus.PENDING_APPROVAL,
            ],
          },
          dueDate: { $lte: horizon },
        },
        {
          orderBy: { dueDate: 'ASC' },
          populate: ['category', 'vendor'] as never,
        },
      ),
      this.em.find(
        RecurringExpenseEntity,
        { active: true, nextDueDate: { $lte: horizon } },
        { orderBy: { nextDueDate: 'ASC' }, populate: ['vendor'] as never },
      ),
    ]);

    return {
      requests: requests.map((request) => ({
        id: request.id,
        title: request.title,
        dueDate: request.dueDate,
        status: request.status,
        amountMinor: readBigint(request.amountMinor),
        currency: request.currency,
        vendorName: request.vendor?.name ?? request.payeeName,
      })),
      schedules: schedules
        // A schedule that already produced this cycle's request would otherwise
        // be counted twice in the same horizon.
        .filter(
          (schedule) =>
            !requests.some((r) => r.recurringSource?.id === schedule.id),
        )
        .map((schedule) => ({
          id: schedule.id,
          title: schedule.title,
          nextDueDate: schedule.nextDueDate,
          amountMinor: readBigint(schedule.amountMinor),
          currency: schedule.currency,
          vendorName: schedule.vendor?.name,
        })),
    };
  }

  // ---------------------------------------------------------------------------
  // monthly close
  // ---------------------------------------------------------------------------

  async monthly(year: number, month: number) {
    const { from, to } = this.monthRange(year, month);

    const [summary, categories, vendors, sources, variance, unpaid, foreign] =
      await Promise.all([
        this.em.getConnection().execute(
          `select coalesce(sum(p.settled_amount_rial), 0) as total,
                  coalesce(sum(p.fee_rial), 0) as fees,
                  count(*)::int as count
           from payment_entity p
           where p.status = ? and p.paid_at >= ? and p.paid_at < ?`,
          [PaymentStatus.SUCCEEDED, from, to],
        ),
        this.byCategory(from, to),
        this.byVendor(from, to, 50),
        this.bySource(from, to),
        // Where the settled amount differed from what was requested — FX moved,
        // or the vendor billed differently. This is the line Finance reads.
        this.em.getConnection().execute(
          `select r.id, r.title, r.amount_minor, r.currency,
                  p.settled_amount_rial, p.fx_rate_rial_per_unit, p.fee_rial, p.intermediary
           from payment_entity p
           join payment_request_entity r on r.id = p.request_id
           where p.status = ? and p.paid_at >= ? and p.paid_at < ?
             and (r.currency <> ? or p.settled_amount_rial <> r.amount_minor)
           order by abs(p.settled_amount_rial - case when r.currency = ? then r.amount_minor else 0 end) desc`,
          [PaymentStatus.SUCCEEDED, from, to, Currency.IRR, Currency.IRR],
        ),
        this.em.getConnection().execute(
          `select count(*)::int as count,
                  coalesce(sum(case when r.currency = ? then r.amount_minor else 0 end), 0) as total
           from payment_request_entity r
           where r.created_at < ? and r.status not in (?, ?, ?)`,
          [Currency.IRR, to, ...TERMINAL_STATUSES],
        ),
        this.em.getConnection().execute(
          `select coalesce(sum(p.settled_amount_rial), 0) as total,
                  coalesce(sum(p.fee_rial), 0) as fees,
                  count(*)::int as count,
                  coalesce(avg(p.fx_rate_rial_per_unit), 0) as avg_rate
           from payment_entity p
           join payment_request_entity r on r.id = p.request_id
           where p.status = ? and p.paid_at >= ? and p.paid_at < ? and r.currency <> ?`,
          [PaymentStatus.SUCCEEDED, from, to, Currency.IRR],
        ),
      ]);

    return {
      period: { year, month, from, to },
      summary: {
        totalRial: this.num(summary[0]?.total),
        feesRial: this.num(summary[0]?.fees),
        count: this.num(summary[0]?.count),
      },
      byCategory: categories,
      byVendor: vendors,
      bySource: sources,
      foreign: {
        totalRial: this.num(foreign[0]?.total),
        feesRial: this.num(foreign[0]?.fees),
        count: this.num(foreign[0]?.count),
        averageRateRial: Math.round(this.num(foreign[0]?.avg_rate)),
      },
      variance: variance.map((row) => ({
        id: this.num(row.id),
        title: row.title as string,
        requestedMinor: this.num(row.amount_minor),
        currency: row.currency as Currency,
        settledRial: this.num(row.settled_amount_rial),
        fxRateRialPerUnit: this.num(row.fx_rate_rial_per_unit) || undefined,
        feeRial: this.num(row.fee_rial) || undefined,
        intermediary: (row.intermediary as string) ?? undefined,
      })),
      stillUnpaid: {
        count: this.num(unpaid[0]?.count),
        totalRial: this.num(unpaid[0]?.total),
      },
    };
  }

  /**
   * One row per recorded payment, for export.
   *
   * Deliberately flat and denormalised — this feeds a spreadsheet the
   * accountant opens, not another query.
   */
  async exportRows(from: Date, to: Date) {
    const rows = await this.em.getConnection().execute(
      `select r.id as request_id,
              r.title,
              c.name as category,
              coalesce(v.name, r.payee_name) as payee,
              r.amount_minor,
              r.currency,
              p.settled_amount_rial,
              p.fx_rate_rial_per_unit,
              p.fee_rial,
              p.intermediary,
              p.reference_number,
              p.paid_at,
              s.label as payment_source,
              requester.first_name || ' ' || coalesce(requester.last_name, '') as requester,
              payer.first_name || ' ' || coalesce(payer.last_name, '') as paid_by
       from payment_entity p
       join payment_request_entity r on r.id = p.request_id
       join expense_category_entity c on c.id = r.category_id
       join payment_source_entity s on s.id = p.payment_source_id
       left join vendor_entity v on v.id = r.vendor_id
       left join user_entity requester on requester.id = r.requester_id
       left join user_entity payer on payer.id = p.paid_by_id
       where p.status = ? and p.paid_at >= ? and p.paid_at < ?
       order by p.paid_at`,
      [PaymentStatus.SUCCEEDED, from, to],
    );

    return rows;
  }
}
