import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getMonth, getYear } from 'date-fns-jalali';
import { BaseRepositoryService } from '../../libs/orm/orm.repository.service.base';
import { UserEntity } from '../../user/user.entity';
import { UpdatePayrollLineDto } from '../dtos/payroll-line.dto';
import { AdvanceDeductionEntity } from '../entities/advance-deduction.entity';
import { AdvanceRequestEntity } from '../../advance-request/entities/advance-request.entity';
import { AdvanceRequestStatus } from '../../advance-request/advance-request.constants';
import {
  PayrollFacts,
  PayrollLineEntity,
} from '../entities/payroll-line.entity';
import { PayrollInclusion } from '../entities/payroll-setting.entity';
import { SalaryChangeEntity } from '../entities/salary-change.entity';
import { PayrollLineStatus, SalaryChangeStatus } from '../finance.constants';
import { PayrollValues } from '../payroll-setting.catalog';
import {
  Agreement,
  InsuranceType,
  calculatePayroll,
} from '../utils/payroll-calculator.util';
import { readBigint } from '../utils/money.util';
import { BankRow, periodName } from '../utils/payroll-bank.util';
import { PayrollSettingService } from './payroll-setting.service';

const MONEY_FIELDS = [
  'agreed',
  'base',
  'housing',
  'bon',
  'marriage',
  'child',
  'seniority',
  'overtime',
  'mission',
  'eidi',
  'severance',
  'leaveBuyout',
  'extras',
  'gross',
  'deficit',
  'workerInsurance',
  'tax',
  'totalDeductions',
  'net',
  'employerInsurance',
  'accrual',
  'totalCost',
  'bonus',
  'advance',
  'loan',
  'otherDeductions',
] as const;
const COUNT_FIELDS = [
  'days',
  'overtimeHours',
  'nightHours',
  'holidayHours',
  'deficitHours',
  'missionDays',
  'leaveRemainDays',
] as const;

function assertPeriod(period: number) {
  const year = Math.floor(period / 100);
  const month = period % 100;
  if (
    !Number.isInteger(period) ||
    month < 1 ||
    month > 12 ||
    year < 1300 ||
    year > 1500
  ) {
    throw new BadRequestException('ماه حقوق نامعتبر است');
  }
}

/** A civil date `YYYY-MM-DD` as a Jalali `140201`. */
function jalaliPeriod(civil: string): number {
  const date = new Date(`${civil}T12:00:00+03:30`);
  return getYear(date) * 100 + getMonth(date) + 1;
}

interface Context {
  year: number;
  values: PayrollValues;
  inclusion: Record<string, PayrollInclusion>;
  /** The latest confirmed salary at or before the period, per user. */
  salaries: Map<number, number>;
}

@Injectable()
export class PayrollService extends BaseRepositoryService<PayrollLineEntity> {
  constructor(
    @InjectRepository(PayrollLineEntity)
    protected repository: EntityRepository<PayrollLineEntity>,
    private readonly settings: PayrollSettingService,
  ) {
    super(repository);
  }

  /** One month: every line, the totals, and who could still be added. */
  async view(period: number) {
    assertPeriod(period);
    const lines = await this.repository.find(
      { period },
      { populate: ['user'], orderBy: { user: 'ASC' } },
    );
    const owed = await this.owedAdvances(
      lines
        .filter((l) => l.status === PayrollLineStatus.DRAFT)
        .map((l) => l.user.id),
    );
    const items = lines.map((l) => {
      const item = this.toItem(l);
      const amount = owed.get(l.user.id) ?? 0;
      return l.status === PayrollLineStatus.DRAFT && amount
        ? {
            ...item,
            warnings: [
              ...item.warnings,
              `مساعده‌ی تأییدشده‌ای هنوز اعمال نشده: ${amount.toLocaleString(
                'fa-IR',
              )} ریال`,
            ],
          }
        : item;
    });

    const total = (key: (typeof MONEY_FIELDS)[number]) =>
      items.reduce((sum, i) => sum + (i[key] as number), 0);
    const drafts = items.filter(
      (i) => i.status === PayrollLineStatus.DRAFT,
    ).length;

    const salaries = await this.salariesAt(period);
    const have = new Set(lines.map((l) => l.user.id));
    const people = await this.em.find(UserEntity, {});
    const missing = people.filter(
      (u) =>
        !have.has(u.id) && salaries.has(u.id) && this.employedIn(u, period),
    ).length;

    return {
      period,
      /** `final` once every line is final and there is at least one. */
      status:
        items.length && !drafts
          ? PayrollLineStatus.FINAL
          : PayrollLineStatus.DRAFT,
      drafts,
      missing,
      totals: {
        count: items.length,
        gross: total('gross'),
        deductions: total('totalDeductions'),
        net: total('net'),
        employerInsurance: total('employerInsurance'),
        accrual: total('accrual'),
        totalCost: total('totalCost'),
      },
      items,
    };
  }

  /** Add a draft line for everyone who works in `period` and has none yet. */
  async generate(period: number) {
    assertPeriod(period);
    const ctx = await this.contextFor(period);

    const have = new Set(
      (await this.repository.find({ period }, { fields: ['user'] })).map(
        (l) => l.user.id,
      ),
    );
    const people = await this.em.find(UserEntity, {});
    const eligible = people.filter(
      (u) =>
        !have.has(u.id) && ctx.salaries.has(u.id) && this.employedIn(u, period),
    );

    for (const user of eligible) {
      const line = this.repository.create({ user, period } as never);
      this.compute(line, user, ctx);
      this.em.persist(line);
    }
    await this.em.flush();
    return { created: eligible.length, existing: have.size };
  }

  /** Compute every draft line again — after settings, salaries or people changed. */
  async recalculate(period: number) {
    assertPeriod(period);
    const ctx = await this.contextFor(period);
    const drafts = await this.repository.find(
      { period, status: PayrollLineStatus.DRAFT },
      { populate: ['user'] },
    );
    drafts.forEach((line) => this.compute(line, line.user, ctx));
    await this.em.flush();
    return { recalculated: drafts.length };
  }

  /** Change one draft line's inputs; the figures follow. */
  async updateLine(id: number, dto: UpdatePayrollLineDto) {
    const line = await this.repository.findOne({ id }, { populate: ['user'] });
    if (!line) throw new NotFoundException('ردیف حقوق پیدا نشد');
    this.assertDraft(line);

    const ctx = await this.contextFor(line.period);
    Object.assign(
      line,
      Object.fromEntries(
        Object.entries(dto).filter(([, v]) => v !== undefined),
      ),
    );
    if (dto.note !== undefined) line.note = dto.note.trim() || undefined;
    this.compute(line, line.user, ctx);
    await this.em.flush();
    return this.toItem(line);
  }

  /** What is left of each request: its amount less everything taken off so far. */
  private async remainingOf(requests: AdvanceRequestEntity[]) {
    const taken = new Map<number, number>();
    if (requests.length) {
      const rows = await this.em.find(AdvanceDeductionEntity, {
        request: { $in: requests.map((r) => r.id) },
      });
      rows.forEach((d) =>
        taken.set(
          d.request.id,
          (taken.get(d.request.id) ?? 0) + readBigint(d.amount),
        ),
      );
    }
    return new Map(
      requests.map((r) => [
        r.id,
        Math.max(readBigint(r.amountRial) - (taken.get(r.id) ?? 0), 0),
      ]),
    );
  }

  /** What each person still has in approved advances, after what was taken off. */
  private async owedAdvances(userIds: number[]) {
    const owed = new Map<number, number>();
    if (!userIds.length) return owed;
    const requests = await this.em.find(AdvanceRequestEntity, {
      requester: { $in: userIds },
      status: AdvanceRequestStatus.APPROVED,
    });
    const remaining = await this.remainingOf(requests);
    requests.forEach((r) =>
      owed.set(
        r.requester.id,
        (owed.get(r.requester.id) ?? 0) + (remaining.get(r.id) ?? 0),
      ),
    );
    return owed;
  }

  private advanceView(
    r: AdvanceRequestEntity,
    remaining: number,
    taken?: number,
  ) {
    return {
      id: r.id,
      amount: readBigint(r.amountRial),
      remaining,
      taken: taken ?? 0,
      reason: r.reason ?? null,
      decidedAt: r.decidedAt ?? null,
    };
  }

  /** A person's approved advances for this line: what is still owed, and what this line took. */
  async advances(lineId: number) {
    const line = await this.repository.findOne(
      { id: lineId },
      { populate: ['user'] },
    );
    if (!line) throw new NotFoundException('ردیف حقوق پیدا نشد');
    const requests = await this.em.find(
      AdvanceRequestEntity,
      { requester: line.user.id, status: AdvanceRequestStatus.APPROVED },
      { orderBy: { decidedAt: 'ASC' } },
    );
    const remaining = await this.remainingOf(requests);
    const mine = await this.em.find(AdvanceDeductionEntity, { line: line.id });
    const takenHere = new Map<number, number>();
    mine.forEach((d) =>
      takenHere.set(
        d.request.id,
        (takenHere.get(d.request.id) ?? 0) + readBigint(d.amount),
      ),
    );
    return {
      available: requests
        .filter((r) => (remaining.get(r.id) ?? 0) > 0)
        .map((r) => this.advanceView(r, remaining.get(r.id) ?? 0)),
      applied: requests
        .filter((r) => takenHere.has(r.id))
        .map((r) =>
          this.advanceView(r, remaining.get(r.id) ?? 0, takenHere.get(r.id)),
        ),
    };
  }

  /**
   * Take an approved advance off this line, all of what is left or a part of it:
   * the amount joins «advance», and the rest stays owed for a later month.
   */
  async applyAdvance(lineId: number, requestId: number, amount?: number) {
    const line = await this.repository.findOne(
      { id: lineId },
      { populate: ['user'] },
    );
    if (!line) throw new NotFoundException('ردیف حقوق پیدا نشد');
    this.assertDraft(line);
    const request = await this.em.findOne(AdvanceRequestEntity, {
      id: requestId,
      requester: line.user.id,
      status: AdvanceRequestStatus.APPROVED,
    });
    if (!request) {
      throw new NotFoundException('مساعده‌ی تأییدشده‌ای برای این فرد پیدا نشد');
    }
    const left = (await this.remainingOf([request])).get(request.id) ?? 0;
    const take = amount ?? left;
    if (left <= 0) {
      throw new ConflictException('همه‌ی این مساعده قبلاً کسر شده است');
    }
    if (take <= 0 || take > left) {
      throw new BadRequestException(
        `مبلغ باید بین ۱ و ${left.toLocaleString('fa-IR')} ریال باشد`,
      );
    }

    const here = await this.em.findOne(AdvanceDeductionEntity, {
      request: request.id,
      line: line.id,
    });
    if (here) here.amount = readBigint(here.amount) + take;
    else
      this.em.create(AdvanceDeductionEntity, { request, line, amount: take });
    line.advance = readBigint(line.advance) + take;
    this.compute(line, line.user, await this.contextFor(line.period));
    await this.em.flush();
    return this.toItem(line);
  }

  /** Give back what this line took of an advance: it is owed again. */
  async unapplyAdvance(lineId: number, requestId: number) {
    const line = await this.repository.findOne(
      { id: lineId },
      { populate: ['user'] },
    );
    if (!line) throw new NotFoundException('ردیف حقوق پیدا نشد');
    this.assertDraft(line);
    const taken = await this.em.find(AdvanceDeductionEntity, {
      request: requestId,
      line: line.id,
    });
    if (!taken.length) {
      throw new NotFoundException('این مساعده روی این ردیف اعمال نشده است');
    }
    const sum = taken.reduce((s, d) => s + readBigint(d.amount), 0);
    taken.forEach((d) => this.em.remove(d));
    line.advance = Math.max(readBigint(line.advance) - sum, 0);
    this.compute(line, line.user, await this.contextFor(line.period));
    await this.em.flush();
    return this.toItem(line);
  }

  /** Freeze the month: every draft line becomes final, together. */
  async finalize(period: number) {
    assertPeriod(period);
    const drafts = await this.repository.find(
      { period, status: PayrollLineStatus.DRAFT },
      { populate: ['user'] },
    );
    if (!drafts.length) {
      throw new BadRequestException('ردیف پیش‌نویسی برای قطعی کردن نیست');
    }
    drafts.forEach((l) => {
      this.settleRevision(l);
      l.facts = this.factsOf(l.user, l.period);
      l.status = PayrollLineStatus.FINAL;
    });
    await this.em.flush();
    return { finalized: drafts.length };
  }

  /**
   * The month's bank transfers: for each person one for the salary (what the
   * legal part nets) and, if there are any, one for the extras. Every line is
   * included, drafts too, and marked; a person with no sheba still gets rows.
   */
  async bank(period: number, lineId?: number) {
    assertPeriod(period);
    const lines = await this.repository.find(
      { period, ...(lineId ? { id: lineId } : {}) },
      { populate: ['user'], orderBy: { user: 'ASC' } },
    );
    const label = periodName(period);
    const rows: BankRow[] = [];
    for (const line of lines) {
      const net = readBigint(line.net);
      const extras = readBigint(line.extras);
      const base = {
        lineId: line.id,
        name: line.user.name ?? null,
        personnelCode: line.user.personnelCode ?? null,
        sheba: line.user.sheba ?? '',
        status: line.status,
      };
      const note = line.status === PayrollLineStatus.DRAFT ? ' (پیش‌نویس)' : '';
      const salary = net - extras;
      if (salary > 0) {
        rows.push({
          ...base,
          no: 0,
          kind: 'salary',
          amount: salary,
          description: `حقوق ${label}${note}`,
        });
      }
      if (extras > 0) {
        rows.push({
          ...base,
          no: 0,
          kind: 'extras',
          amount: extras,
          description: `اضافات ${label}${note}`,
        });
      }
    }
    rows.forEach((r, i) => (r.no = i + 1));

    const sum = (kind?: BankRow['kind']) =>
      rows
        .filter((r) => !kind || r.kind === kind)
        .reduce((t, r) => t + r.amount, 0);
    return {
      period,
      rows,
      totals: {
        count: rows.length,
        salary: sum('salary'),
        extras: sum('extras'),
        total: sum(),
      },
      missingSheba: new Set(rows.filter((r) => !r.sheba).map((r) => r.lineId))
        .size,
      drafts: new Set(
        rows.filter((r) => r.status === 'draft').map((r) => r.lineId),
      ).size,
    };
  }

  /** Whether the period lies between the start of cooperation and the end of the trial. */
  private inProbation(user: UserEntity, period: number) {
    if (!user.probationEndDate || !user.hireDate) return false;
    return (
      jalaliPeriod(user.hireDate) <= period &&
      period <= jalaliPeriod(user.probationEndDate)
    );
  }

  /** The person's facts that move their pay, as they are now. */
  private factsOf(user: UserEntity, period: number): PayrollFacts {
    return {
      hireDate: user.hireDate ?? null,
      endDate: user.endDate ?? null,
      probationEndDate: user.probationEndDate ?? null,
      married: user.married,
      childrenCount: user.childrenCount,
      insured: user.insured,
      insuranceType: user.insuranceType,
      taxExempt: user.taxExempt,
      agreementType: user.agreementType,
      salaryMode: user.salaryMode,
      seniorityYears: this.seniorityYears(user, period),
    };
  }

  /** Whole years of service at the period, as the calculation counts them. */
  private seniorityYears(user: UserEntity, period: number) {
    if (!user.hireDate) return 0;
    const start = jalaliPeriod(user.hireDate);
    const months =
      (Math.floor(period / 100) - Math.floor(start / 100)) * 12 +
      ((period % 100) - (start % 100));
    return Math.max(Math.floor(months / 12), 0);
  }

  /** One line with the person's identity, for the payslip. */
  async payslip(id: number) {
    const line = await this.repository.findOne({ id }, { populate: ['user'] });
    if (!line) throw new NotFoundException('ردیف حقوق پیدا نشد');
    const user = line.user;
    return {
      ...this.toItem(line),
      identity: {
        nationalId: user.nationalId ?? null,
        insuranceNumber: user.insuranceNumber ?? null,
        sheba: user.sheba ?? null,
        // A final line keeps the facts it was worked out from.
        ...(line.facts ?? this.factsOf(user, line.period)),
      },
    };
  }

  /** Freeze one person's month; the rest of the month stays open. */
  async finalizeLine(id: number) {
    const line = await this.repository.findOne({ id }, { populate: ['user'] });
    if (!line) throw new NotFoundException('ردیف حقوق پیدا نشد');
    this.assertDraft(line);
    this.settleRevision(line);
    line.facts = this.factsOf(line.user, line.period);
    line.status = PayrollLineStatus.FINAL;
    await this.em.flush();
    return this.toItem(line);
  }

  /** Open a final line again, for a correction; the reason stays with it. */
  async reopenLine(id: number, reason: string, adminName: string | null) {
    const line = await this.repository.findOne({ id }, { populate: ['user'] });
    if (!line) throw new NotFoundException('ردیف حقوق پیدا نشد');
    if (line.status !== PayrollLineStatus.FINAL) {
      throw new ConflictException('این ردیف قطعی نیست');
    }
    this.reopen(line, reason, adminName);
    await this.em.flush();
    return this.toItem(line);
  }

  /** Open every final line of a month again. */
  async reopenMonth(period: number, reason: string, adminName: string | null) {
    assertPeriod(period);
    const lines = await this.repository.find({
      period,
      status: PayrollLineStatus.FINAL,
    });
    if (!lines.length) {
      throw new BadRequestException('ردیف قطعی‌ای برای بازکردن نیست');
    }
    lines.forEach((line) => this.reopen(line, reason, adminName));
    await this.em.flush();
    return { reopened: lines.length };
  }

  /** The line's money figures, as numbers. */
  private figures(line: PayrollLineEntity): Record<string, number> {
    return Object.fromEntries(
      MONEY_FIELDS.map((k) => [k, readBigint(line[k])]),
    );
  }

  /** Final again: note whether the last reopening actually changed anything. */
  private settleRevision(line: PayrollLineEntity) {
    const revisions = line.revisions ?? [];
    const last = revisions[revisions.length - 1];
    if (!last || last.changed !== undefined) return;
    const now = this.figures(line);
    const changed = Object.keys(now).some((k) => now[k] !== last.before?.[k]);
    line.revisions = [...revisions.slice(0, -1), { ...last, changed }];
  }

  private reopen(
    line: PayrollLineEntity,
    reason: string,
    adminName: string | null,
  ) {
    line.status = PayrollLineStatus.DRAFT;
    line.facts = null;
    line.revisions = [
      ...(line.revisions ?? []),
      {
        at: new Date().toISOString(),
        by: adminName,
        reason: reason.trim(),
        before: this.figures(line),
      },
    ];
  }

  async removeLine(id: number) {
    const line = await this.repository.findOne({ id });
    if (!line) throw new NotFoundException('ردیف حقوق پیدا نشد');
    this.assertDraft(line);
    await this.em.removeAndFlush(line);
    return { success: true };
  }

  // --- computing -------------------------------------------------------------

  private assertDraft(line: PayrollLineEntity) {
    if (line.status !== PayrollLineStatus.DRAFT) {
      throw new ConflictException('این ماه قطعی شده و قابل تغییر نیست');
    }
  }

  /** The year's parameters and everyone's salary at the period. */
  private async contextFor(period: number): Promise<Context> {
    const year = Math.floor(period / 100);
    const set = await this.settings.forYear(year);
    if (!set) {
      throw new BadRequestException(
        `تنظیمات سال ${year} ساخته نشده؛ ابتدا از «تنظیمات حقوق و دستمزد» بسازید`,
      );
    }
    return {
      year,
      values: set.values,
      inclusion: set.inclusion,
      salaries: await this.salariesAt(period),
    };
  }

  private async salariesAt(period: number) {
    const changes = await this.em.find(
      SalaryChangeEntity,
      { period: { $lte: period }, status: SalaryChangeStatus.CONFIRMED },
      { orderBy: { period: 'ASC' } },
    );
    const latest = new Map<number, number>();
    changes.forEach((c) => latest.set(c.user.id, readBigint(c.salary)));
    return latest;
  }

  /** Hired by the period and not gone before it. */
  private employedIn(user: UserEntity, period: number) {
    if (user.hireDate && jalaliPeriod(user.hireDate) > period) return false;
    if (user.endDate && jalaliPeriod(user.endDate) < period) return false;
    return true;
  }

  /** Fill a line's results from its inputs, the person, the salary and the year. */
  private compute(line: PayrollLineEntity, user: UserEntity, ctx: Context) {
    const year = Math.floor(line.period / 100);
    const month = line.period % 100;
    const agreed = ctx.salaries.get(user.id);
    const warnings: string[] = [];

    if (agreed === undefined) {
      line.warnings = ['حقوقی برای این ماه ثبت نشده است'];
      return;
    }

    // Service: whole years for the seniority base, months of this year for eidi and severance.
    let seniorityYears = 0;
    let monthsInYear = month;
    if (user.hireDate) {
      const start = jalaliPeriod(user.hireDate);
      const [sy, sm] = [Math.floor(start / 100), start % 100];
      seniorityYears = Math.max(
        Math.floor(((year - sy) * 12 + (month - sm)) / 12),
        0,
      );
      monthsInYear = sy === year ? month - sm + 1 : month;
    } else {
      warnings.push('تاریخ شروع همکاری ثبت نشده؛ سنوات صفر حساب شد');
    }

    // A flat salary has no legal basis: the agreed figure (by the days worked)
    // and the bonus are paid as they are, with no insurance, tax, eidi or
    // severance. Advance, loan, other deductions and a work deficit come off.
    if (user.salaryMode === 'flat') {
      this.computeFlat(line, agreed, ctx);
      return;
    }

    // A hybrid salary: the minimum wage with its allowances goes through the
    // rules and the agreed salary beyond that package is paid apart. A gross
    // salary at or under the minimum wage is simply ordinary.
    const net = user.agreementType === 'net';
    const hybrid =
      user.salaryMode === 'hybrid' && (net || agreed > ctx.values.minMonthly);

    const num = (v: number | string) => Number(v) || 0;
    const result = calculatePayroll(ctx.values, ctx.inclusion, {
      agreed,
      hybrid,
      agreement: (net ? 'net' : 'gross') as Agreement,
      fraction: num(line.days) / 30,
      married: user.married,
      children: user.childrenCount,
      seniorityYears,
      insured: user.insured,
      insuranceType: (user.insuranceType === 'board'
        ? 'board'
        : 'worker') as InsuranceType,
      taxExempt: user.taxExempt,
      overtimeHours: num(line.overtimeHours),
      nightHours: num(line.nightHours),
      holidayHours: num(line.holidayHours),
      deficitHours: num(line.deficitHours),
      missionDays: num(line.missionDays),
      bonus: readBigint(line.bonus),
      advance: readBigint(line.advance),
      loan: readBigint(line.loan),
      otherDeductions: readBigint(line.otherDeductions),
      payEidi: line.payEidi,
      settle: line.settle,
      yearFraction: Math.min(Math.max(monthsInYear, 0), 12) / 12,
      leaveRemainDays: num(line.leaveRemainDays),
    });

    if (!result.meetsMinimum) warnings.push('مزد پایه کمتر از حداقل مزد است');
    if (hybrid && result.extras === 0) {
      warnings.push('حقوق توافقی به بسته‌ی قانونی نمی‌رسد؛ فقط بسته پرداخت شد');
    }
    if (result.net < 0) warnings.push('خالص پرداختی منفی است');
    if (user.endDate && jalaliPeriod(user.endDate) < line.period) {
      warnings.push('بعد از پایان همکاری است');
    }
    if (line.payEidi && month !== 12)
      warnings.push('عیدی معمولاً در اسفند پرداخت می‌شود');
    if (
      line.settle &&
      !(user.endDate && jalaliPeriod(user.endDate) === line.period)
    ) {
      warnings.push('تسویه در ماهی غیر از ماه پایان همکاری است');
    }

    line.agreed = agreed;
    line.agreement = hybrid ? 'hybrid' : user.agreementType;
    Object.assign(line, {
      base: result.base,
      housing: result.housing,
      bon: result.bon,
      marriage: result.marriage,
      child: result.child,
      seniority: result.seniority,
      overtime: result.overtime,
      mission: result.mission,
      eidi: result.eidi,
      severance: result.severance,
      leaveBuyout: result.leaveBuyout,
      extras: result.extras,
      gross: result.gross,
      deficit: result.deficit,
      workerInsurance: result.workerInsurance,
      tax: result.tax,
      totalDeductions: result.totalDeductions,
      net: result.net,
      employerInsurance: result.employerInsurance,
      accrual: result.accrual,
      totalCost: result.totalCost,
    });
    line.warnings = warnings;
  }

  /** A flat salary's line: the agreed figure and the bonus, less the plain deductions. */
  private computeFlat(line: PayrollLineEntity, agreed: number, ctx: Context) {
    const num = (v: number | string) => Number(v) || 0;
    const base = Math.round((agreed * num(line.days)) / 30);
    const bonus = readBigint(line.bonus);
    const hourly = agreed / (ctx.values.wageHours || 220);
    const deficit = Math.round(hourly * num(line.deficitHours));
    const other =
      readBigint(line.advance) +
      readBigint(line.loan) +
      readBigint(line.otherDeductions);
    const gross = base + bonus;
    const warnings: string[] = [];
    if (
      num(line.overtimeHours) ||
      num(line.nightHours) ||
      num(line.holidayHours) ||
      num(line.missionDays) ||
      line.payEidi ||
      line.settle
    ) {
      warnings.push(
        'در حقوق ساده اضافه‌کار، مأموریت، عیدی و تسویه حساب حساب نمی‌شود',
      );
    }
    if (gross - deficit - other < 0) warnings.push('خالص پرداختی منفی است');

    line.agreed = agreed;
    line.agreement = 'flat';
    Object.assign(line, {
      base,
      housing: 0,
      bon: 0,
      marriage: 0,
      child: 0,
      seniority: 0,
      overtime: 0,
      mission: 0,
      eidi: 0,
      severance: 0,
      leaveBuyout: 0,
      extras: 0,
      gross,
      deficit,
      workerInsurance: 0,
      tax: 0,
      totalDeductions: deficit + other,
      net: gross - deficit - other,
      employerInsurance: 0,
      accrual: 0,
      totalCost: gross,
    });
    line.warnings = warnings;
  }

  private toItem(line: PayrollLineEntity) {
    const money = Object.fromEntries(
      MONEY_FIELDS.map((k) => [k, readBigint(line[k])]),
    ) as Record<(typeof MONEY_FIELDS)[number], number>;
    const counts = Object.fromEntries(
      COUNT_FIELDS.map((k) => [k, Number(line[k])]),
    ) as Record<(typeof COUNT_FIELDS)[number], number>;
    const user = line.user;
    return {
      id: line.id,
      period: line.period,
      status: line.status,
      user: {
        id: user.id,
        name: user.name ?? null,
        personnelCode: user.personnelCode ?? null,
        jobTitle: user.jobTitle ?? null,
        profilePicture: user.profilePicture ?? null,
        probationEndDate: user.probationEndDate ?? null,
      },
      /** This month falls in the person's trial period. */
      probation: this.inProbation(user, line.period),
      agreement: line.agreement,
      payEidi: line.payEidi,
      settle: line.settle,
      note: line.note ?? null,
      warnings: line.warnings,
      revisions: (line.revisions ?? []).map(({ at, by, reason, changed }) => ({
        at,
        by,
        reason,
        changed: changed ?? null,
      })),
      /** Reopened and then actually changed — what a payslip marks. */
      revised: (line.revisions ?? []).some((r) => r.changed),
      ...money,
      ...counts,
    };
  }
}
