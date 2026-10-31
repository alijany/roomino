import { EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getMonth, getYear } from 'date-fns-jalali';
import {
  LeaveType,
  MINUTES_PER_WORKDAY,
} from '../../attendance/attendance.constants';
import { EmployeeProfileEntity } from '../../attendance/entities/employee-profile.entity';
import { LeaveBalanceEntity } from '../../attendance/entities/leave-balance.entity';
import { UserEntity } from '../../user/user.entity';
import {
  CreateFinalSettlementDto,
  UpdateFinalSettlementDto,
} from '../dtos/final-settlement.dto';
import { FinalSettlementEntity } from '../entities/final-settlement.entity';
import { SalaryChangeEntity } from '../entities/salary-change.entity';
import { PayrollLineStatus, SalaryChangeStatus } from '../finance.constants';
import { calculatePayroll } from '../utils/payroll-calculator.util';
import { readBigint } from '../utils/money.util';
import { PayrollSettingService } from './payroll-setting.service';

const MONEY = [
  'eidiPaid',
  'adjustment',
  'advance',
  'loan',
  'otherDeductions',
  'severance',
  'leaveBuyout',
  'eidi',
  'gross',
  'workerInsurance',
  'tax',
  'totalDeductions',
  'net',
] as const;

/** A civil date `YYYY-MM-DD` as Jalali `{ year, month }`. */
function jalaliOf(civil: string) {
  const date = new Date(`${civil}T12:00:00+03:30`);
  return { year: getYear(date), month: getMonth(date) + 1 };
}

/** The final settlement: what is still owed when someone leaves. */
@Injectable()
export class FinalSettlementService {
  constructor(
    private readonly em: EntityManager,
    private readonly settings: PayrollSettingService,
  ) {}

  private view(s: FinalSettlementEntity) {
    const money = Object.fromEntries(
      MONEY.map((k) => [k, readBigint(s[k])]),
    ) as Record<(typeof MONEY)[number], number>;
    const u = s.user;
    return {
      id: s.id,
      status: s.status,
      date: s.date,
      user: {
        id: u.id,
        name: u.name ?? null,
        personnelCode: u.personnelCode ?? null,
        jobTitle: u.jobTitle ?? null,
        profilePicture: u.profilePicture ?? null,
        hireDate: u.hireDate ?? null,
        endDate: u.endDate ?? null,
        sheba: u.sheba ?? null,
      },
      leaveRemainDays: Number(s.leaveRemainDays),
      severanceProRata: s.severanceProRata,
      severanceFrom: s.severanceFrom ?? u.hireDate ?? null,
      severanceTo: s.severanceTo ?? s.date,
      severanceCustom: !!(s.severanceFrom || s.severanceTo),
      eidiMonths: s.eidiMonths != null ? Number(s.eidiMonths) : null,
      note: s.note ?? null,
      serviceYears: s.serviceYears,
      yearMonths: Number(s.yearMonths),
      warnings: s.warnings,
      createdAt: s.created_at,
      ...money,
    };
  }

  async list() {
    const rows = await this.em.find(
      FinalSettlementEntity,
      {},
      { populate: ['user'], orderBy: { date: 'DESC' } },
    );
    return { items: rows.map((s) => this.view(s)) };
  }

  /** People who can still be settled: no settlement yet; found by name, code or title. */
  async candidates(text?: string) {
    const like = text?.trim() ? { $ilike: `%${text.trim()}%` } : null;
    const taken = (await this.em.find(FinalSettlementEntity, {})).map(
      (s) => s.user.id,
    );
    const users = await this.em.find(
      UserEntity,
      {
        ...(taken.length ? { id: { $nin: taken } } : {}),
        ...(like
          ? {
              $or: [
                { firstName: like },
                { lastName: like },
                { personnelCode: like },
                { jobTitle: like },
              ],
            }
          : {}),
      } as never,
      { orderBy: { lastName: 'ASC' }, limit: 8 },
    );
    return {
      items: users.map((u) => ({
        id: u.id,
        name: u.name ?? null,
        personnelCode: u.personnelCode ?? null,
        jobTitle: u.jobTitle ?? null,
        profilePicture: u.profilePicture ?? null,
      })),
    };
  }

  async get(id: number) {
    const s = await this.load(id);
    return {
      ...this.view(s),
      leaveFromAttendance: await this.attendanceLeaveDays(s.user, s.date),
    };
  }

  /**
   * The entitled leave still unused in attendance for the settlement's year, in
   * days (480 minutes each) rounded to two places; null when the person has no
   * attendance profile or ledger for that year.
   */
  private async attendanceLeaveDays(user: UserEntity, date: string) {
    const employee = await this.em.findOne(EmployeeProfileEntity, { user });
    if (!employee) return null;
    const balance = await this.em.findOne(LeaveBalanceEntity, {
      employee,
      leaveType: LeaveType.ENTITLED,
      year: jalaliOf(date).year,
    });
    if (!balance) return null;
    const minutes = Math.max(
      balance.accruedMinutes + balance.carriedOverMinutes - balance.usedMinutes,
      0,
    );
    return Math.round((minutes / MINUTES_PER_WORKDAY) * 100) / 100;
  }

  private async load(id: number) {
    const s = await this.em.findOne(
      FinalSettlementEntity,
      { id },
      { populate: ['user'] },
    );
    if (!s) throw new NotFoundException('تسویه حساب پیدا نشد');
    return s;
  }

  async create(dto: CreateFinalSettlementDto, by: UserEntity) {
    const user = await this.em.findOne(UserEntity, { id: dto.userId });
    if (!user) throw new NotFoundException('کاربر پیدا نشد');
    const clash = await this.em.findOne(FinalSettlementEntity, { user });
    if (clash) {
      throw new ConflictException('برای این فرد تسویه حساب نهایی ثبت شده است');
    }
    const s = this.em.create(FinalSettlementEntity, {
      user,
      date: dto.date,
      createdBy: by,
    } as never);
    // Start from what attendance says is left; it can be changed by hand.
    s.leaveRemainDays =
      (await this.attendanceLeaveDays(user, dto.date)) ?? s.leaveRemainDays;
    await this.compute(s);
    await this.em.persistAndFlush(s);
    return this.view(s);
  }

  async update(id: number, dto: UpdateFinalSettlementDto) {
    const s = await this.load(id);
    this.assertDraft(s);
    Object.assign(
      s,
      Object.fromEntries(
        Object.entries(dto).filter(([k, v]) => v !== undefined && k !== 'note'),
      ),
    );
    if (dto.note !== undefined) s.note = dto.note.trim() || undefined;
    await this.compute(s);
    await this.em.flush();
    return this.view(s);
  }

  /** Freezes the settlement, and records the end of cooperation if the person has none. */
  async finalize(id: number) {
    const s = await this.load(id);
    this.assertDraft(s);
    await this.compute(s);
    s.status = PayrollLineStatus.FINAL;
    if (!s.user.endDate) s.user.endDate = s.date;
    await this.em.flush();
    return this.view(s);
  }

  /** Opens a final settlement again to correct it. */
  async reopen(id: number) {
    const s = await this.load(id);
    if (s.status !== PayrollLineStatus.FINAL) {
      throw new ConflictException('این تسویه قطعی نیست');
    }
    s.status = PayrollLineStatus.DRAFT;
    await this.em.flush();
    return this.view(s);
  }

  async remove(id: number) {
    const s = await this.load(id);
    this.assertDraft(s);
    await this.em.removeAndFlush(s);
    return { success: true };
  }

  private assertDraft(s: FinalSettlementEntity) {
    if (s.status !== PayrollLineStatus.DRAFT) {
      throw new ConflictException(
        'تسویه قطعی‌شده تغییر نمی‌کند؛ ابتدا آن را دوباره باز کنید',
      );
    }
  }

  /** Fills the results from the inputs, the person, the salary and the year's rules. */
  private async compute(s: FinalSettlementEntity) {
    const user = s.user;
    const warnings: string[] = [];
    if (!user.hireDate) {
      throw new BadRequestException(
        'برای محاسبه‌ی سنوات تاریخ شروع همکاری فرد را ثبت کنید',
      );
    }
    if (s.date < user.hireDate) {
      throw new BadRequestException(
        'تاریخ تسویه نمی‌تواند قبل از شروع همکاری باشد',
      );
    }

    const end = jalaliOf(s.date);
    const start = jalaliOf(user.hireDate);
    const period = end.year * 100 + end.month;
    const set = await this.settings.forYear(end.year);
    if (!set) {
      throw new BadRequestException(
        `تنظیمات سال ${end.year} ساخته نشده؛ ابتدا از «تنظیمات حقوق و دستمزد» بسازید`,
      );
    }
    const change = await this.em.findOne(
      SalaryChangeEntity,
      {
        user,
        period: { $lte: period },
        status: SalaryChangeStatus.CONFIRMED,
      },
      { orderBy: { period: 'DESC' } },
    );
    if (!change) {
      throw new BadRequestException('حقوقی برای این فرد ثبت نشده است');
    }
    const agreed = readBigint(change.salary);

    // Service: whole years for severance and seniority, the months of this year for eidi.
    const totalMonths =
      (end.year - start.year) * 12 + (end.month - start.month);
    const serviceYears = Math.max(Math.floor(totalMonths / 12), 0);
    // Severance runs over its own span: hire date to settlement unless set.
    const sevFrom = s.severanceFrom ?? user.hireDate;
    const sevTo = s.severanceTo ?? s.date;
    if (sevFrom > sevTo) {
      throw new BadRequestException(
        'تاریخ شروع سنوات نمی‌تواند بعد از پایان آن باشد',
      );
    }
    const sf = jalaliOf(sevFrom);
    const st = jalaliOf(sevTo);
    const severanceMonths = Math.max(
      (st.year - sf.year) * 12 + (st.month - sf.month),
      0,
    );
    const counted = Math.min(
      start.year === end.year ? end.month - start.month + 1 : end.month,
      12,
    );
    const yearMonths = s.eidiMonths != null ? Number(s.eidiMonths) : counted;

    const base = {
      married: user.married,
      children: user.childrenCount,
      seniorityYears: serviceYears,
      insured: user.insured,
      insuranceType: (user.insuranceType === 'board' ? 'board' : 'worker') as
        | 'board'
        | 'worker',
      taxExempt: user.taxExempt,
      overtimeHours: 0,
      nightHours: 0,
      holidayHours: 0,
      deficitHours: 0,
      missionDays: 0,
      bonus: 0,
    };
    // The full base wage (a net agreement is solved back to it), then a
    // settlement-only run: no month's pay, just eidi, severance and leave.
    const month = calculatePayroll(set.values, set.inclusion, {
      ...base,
      agreed,
      agreement: user.agreementType === 'net' ? 'net' : 'gross',
      fraction: 1,
      advance: 0,
      loan: 0,
      otherDeductions: 0,
      payEidi: false,
      settle: false,
      yearFraction: 0,
      leaveRemainDays: 0,
    });
    const r = calculatePayroll(set.values, set.inclusion, {
      ...base,
      agreed: month.base,
      agreement: 'gross',
      fraction: 0,
      advance: readBigint(s.advance),
      loan: readBigint(s.loan),
      otherDeductions: readBigint(s.otherDeductions),
      payEidi: false,
      settle: true,
      yearFraction: yearMonths / 12,
      // Severance is for the whole service, not the eidi's months of this year.
      severanceFraction:
        severanceMonths < 12 && !s.severanceProRata ? 0 : severanceMonths / 12,
      leaveRemainDays: Number(s.leaveRemainDays),
    });

    if (severanceMonths < 12) {
      warnings.push(
        s.severanceProRata
          ? 'بازه‌ی سنوات کمتر از یک سال است؛ به نسبت مدت حساب شد'
          : 'بازه‌ی سنوات کمتر از یک سال است؛ سنوات حساب نشد',
      );
    }
    if (user.probationEndDate && s.date <= user.probationEndDate) {
      warnings.push(
        'تسویه در دوره‌ی آزمایشی است؛ حق سنوات و عیدی را بررسی کنید',
      );
    }
    const net = r.net + readBigint(s.adjustment) - readBigint(s.eidiPaid);
    if (net < 0) warnings.push('مانده منفی است؛ فرد بدهکار می‌شود');
    if (!user.sheba) warnings.push('شماره شبا ثبت نشده است');

    Object.assign(s, {
      serviceYears,
      yearMonths,
      severance: Math.round(r.severance),
      leaveBuyout: Math.round(r.leaveBuyout),
      eidi: Math.round(r.eidi),
      gross: Math.round(r.gross),
      workerInsurance: Math.round(r.workerInsurance),
      tax: Math.round(r.tax),
      totalDeductions: Math.round(r.totalDeductions),
      net: Math.round(net),
      warnings,
    });
  }
}
