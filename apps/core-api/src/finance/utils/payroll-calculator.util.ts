import { PayrollInclusion } from '../entities/payroll-setting.entity';
import { PayrollValues } from '../payroll-setting.catalog';

/**
 * One person's pay for one month, from the year's legal parameters and that
 * month's inputs. Pure: no database, no clock, so every figure can be checked
 * against the sheet this was ported from. Money is in rial, rates are real
 * percents (`7` is 7%).
 */

export type Agreement = 'gross' | 'net';
export type InsuranceType = 'worker' | 'board';

export interface PayrollInput {
  /** The agreed monthly salary: the base wage if `gross`, the take-home if `net`. */
  agreed: number;
  agreement: Agreement;
  /** Days worked ÷ 30; `1` for a full month. */
  fraction: number;
  married: boolean;
  children: number;
  /** Whole years of service, for the seniority base. */
  seniorityYears: number;
  insured: boolean;
  /** Board members pay no unemployment insurance. */
  insuranceType: InsuranceType;
  /** Exempt from income tax altogether. */
  taxExempt: boolean;

  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  deficitHours: number;
  missionDays: number;
  bonus: number;
  advance: number;
  loan: number;
  otherDeductions: number;

  /** Pay the year's eidi and severance this month. */
  payEidi: boolean;
  /** Final settlement: eidi, severance and unused leave. */
  settle: boolean;
  /** Months of the year worked ÷ 12, for the eidi and severance share. */
  yearFraction: number;
  /** The severance share when it differs from `yearFraction`. */
  severanceFraction?: number;
  /** Unused leave in days, bought out on settlement. */
  leaveRemainDays: number;
  /**
   * A hybrid salary: only the year's legal minimum wage, with its allowances,
   * goes through the rules; whatever the agreed salary has beyond that
   * package is paid apart, net — no insurance, no tax. With a gross agreement
   * the extras are the agreed salary less the package's gross (ignored if the
   * salary is at or under the minimum wage); with a net agreement the agreed
   * salary is the take-home and the extras are what the package's net lacks.
   */
  hybrid?: boolean;
}

export interface PayrollResult {
  base: number;
  housing: number;
  bon: number;
  marriage: number;
  child: number;
  seniority: number;
  overtime: number;
  mission: number;
  eidi: number;
  severance: number;
  leaveBuyout: number;
  /** A hybrid salary's part beyond the legal package, paid net and apart from `gross`; zero otherwise. */
  extras: number;
  /** The legal part's gross, without `extras`. */
  gross: number;
  deficit: number;
  workerInsurance: number;
  tax: number;
  totalDeductions: number;
  /** Take-home: the legal part's net plus `extras`. */
  net: number;
  employerInsurance: number;
  /** The month's share of next year's eidi and severance. */
  accrual: number;
  /** Gross, extras, employer insurance and accrual, without the one-off eidi and severance. */
  totalCost: number;
  /** The base wage is at least the legal minimum for the days worked. */
  meetsMinimum: boolean;
}

const rate = (percent: number) => percent / 100;

/** Progressive tax: 0 up to the exemption, then each band at its rate. */
function bracketTax(taxable: number, s: PayrollValues): number {
  const limits = [
    s.taxExempt,
    s.taxLimit1,
    s.taxLimit2,
    s.taxLimit3,
    s.taxLimit4,
  ];
  const rates = [
    0,
    s.taxRate1,
    s.taxRate2,
    s.taxRate3,
    s.taxRate4,
    s.taxRate5,
  ].map(rate);
  let tax = 0;
  let low = 0;
  for (let i = 0; i < rates.length; i++) {
    const high = i < limits.length ? limits[i] : Infinity;
    if (taxable > low) tax += (Math.min(taxable, high) - low) * rates[i];
    if (high === Infinity) break;
    low = high;
  }
  return Math.max(tax, 0);
}

type Parts = {
  base: number;
  housing: number;
  bon: number;
  marriage: number;
  child: number;
  seniority: number;
  overtime: number;
  night: number;
  holiday: number;
  mission: number;
};

/** The figures that follow from a full base wage. */
function compute(
  s: PayrollValues,
  flags: Record<string, PayrollInclusion>,
  x: PayrollInput,
  fullBase: number,
  withExtras: boolean,
) {
  const f = x.fraction;
  const wageHours = s.wageHours || 220;
  const hourly = fullBase / wageHours;
  const daily = fullBase / 30;
  const seniorityDaily =
    x.seniorityYears > 0 ? s.seniorityDaily * x.seniorityYears : 0;

  const parts: Parts = {
    base: fullBase * f,
    housing: s.housing * f,
    bon: s.bon * f,
    marriage: x.married ? s.marriage * f : 0,
    child: s.child * x.children * f,
    seniority: seniorityDaily * 30 * f,
    overtime: withExtras
      ? hourly * (1 + rate(s.overtimeRate)) * x.overtimeHours
      : 0,
    night: withExtras ? hourly * rate(s.nightRate) * x.nightHours : 0,
    holiday: withExtras
      ? hourly * (1 + rate(s.holidayRate)) * x.holidayHours
      : 0,
    mission: withExtras ? daily * rate(s.missionRate) * x.missionDays : 0,
  };

  const bonus = withExtras ? x.bonus : 0;
  const deficit = withExtras ? hourly * x.deficitHours : 0;

  // Eidi, severance and unused leave.
  const eidiFull = Math.min(
    s.eidiDays * daily,
    s.eidiCap > 0 ? s.eidiCap : Infinity,
  );
  const severanceFull = s.severanceDays * (daily + seniorityDaily);
  const pays = withExtras && (x.payEidi || x.settle);
  const eidi = pays ? eidiFull * x.yearFraction : 0;
  const severance = pays
    ? severanceFull * (x.severanceFraction ?? x.yearFraction)
    : 0;
  const leaveDaily =
    (fullBase +
      s.housing +
      s.bon +
      seniorityDaily * 30 +
      s.child * x.children) /
    30;
  const leaveBuyout =
    withExtras && x.settle ? Math.max(x.leaveRemainDays, 0) * leaveDaily : 0;

  const flag = (key: string, which: 'insurable' | 'taxable', fallback = true) =>
    flags[key]?.[which] ?? fallback;
  const itemFlags: Record<keyof Parts, string> = {
    base: 'baseWage',
    housing: 'housing',
    bon: 'bon',
    marriage: 'marriage',
    child: 'child',
    seniority: 'seniority',
    overtime: 'overtime',
    night: 'night',
    holiday: 'holiday',
    mission: 'mission',
  };
  const partKeys = Object.keys(parts) as Array<keyof Parts>;

  const gross =
    partKeys.reduce((sum, k) => sum + parts[k], 0) +
    bonus +
    eidi +
    severance +
    leaveBuyout;

  // Insurance.
  let insurable =
    bonus -
    (flag('baseWage', 'insurable') ? deficit : 0) +
    (flag('leavePay', 'insurable') ? leaveBuyout : 0);
  partKeys.forEach((k) => {
    if (flag(itemFlags[k], 'insurable', k !== 'mission')) insurable += parts[k];
  });
  const ceiling = s.insCeiling > 0 ? s.insCeiling : Infinity;
  const insuranceBase = Math.max(Math.min(insurable, ceiling), 0);
  const workerInsurance = x.insured ? insuranceBase * rate(s.insWorker) : 0;
  const employerInsurance = x.insured
    ? insuranceBase *
      (rate(s.insEmployer) +
        (x.insuranceType === 'board' ? 0 : rate(s.insUnemployment)))
    : 0;

  // Income tax: overtime pay is taxed apart at a fixed rate when that rate is set.
  const overtimeApart = s.taxOvertimeRate > 0;
  const overtimeKeys: Array<keyof Parts> = ['overtime', 'night', 'holiday'];
  let taxable =
    bonus -
    workerInsurance * rate(s.taxInsuranceFraction) -
    (flag('baseWage', 'taxable') ? deficit : 0) +
    (flag('leavePay', 'taxable') ? leaveBuyout : 0);
  let overtimeTax = 0;
  partKeys.forEach((k) => {
    if (!flag(itemFlags[k], 'taxable', k !== 'mission')) return;
    if (overtimeApart && overtimeKeys.includes(k)) {
      overtimeTax += parts[k] * rate(s.taxOvertimeRate);
      return;
    }
    taxable += parts[k];
  });
  const eidiExempt = s.taxEidiExempt > 0 ? s.taxEidiExempt : s.taxExempt;
  const eidiTax = Math.max(eidi - eidiExempt, 0) * rate(s.taxRate1);
  const tax = x.taxExempt ? 0 : bracketTax(taxable, s) + overtimeTax + eidiTax;

  const other = withExtras ? x.advance + x.loan + x.otherDeductions : 0;
  const totalDeductions = deficit + workerInsurance + tax + other;
  const net = gross - totalDeductions;
  const accrual = ((eidiFull + severanceFull) * f) / 12;

  return {
    parts,
    bonus,
    eidi,
    severance,
    leaveBuyout,
    deficit,
    gross,
    workerInsurance,
    employerInsurance,
    tax,
    totalDeductions,
    net,
    accrual,
  };
}

export function calculatePayroll(
  settings: PayrollValues,
  inclusion: Record<string, PayrollInclusion>,
  input: PayrollInput,
): PayrollResult {
  let fullBase = input.agreed;
  let extras = 0;

  // A hybrid salary: a net agreement is always split (the minimum-wage package
  // is the floor); a gross one only when it is above the minimum wage.
  const hybrid =
    input.hybrid &&
    (input.agreement === 'net' || input.agreed > settings.minMonthly);

  if (hybrid) {
    // The legal package at the minimum wage — base, allowances, seniority —
    // is what the rules see; what the agreed salary has beyond it is paid apart.
    fullBase = settings.minMonthly;
    const fixed = compute(settings, inclusion, input, fullBase, false);
    const target = input.agreed * input.fraction;
    if (input.agreement === 'net') {
      // The agreed salary is the take-home: the extras make up what the
      // package's own net lacks, so the employer carries the insurance and tax.
      extras = Math.max(target - fixed.net, 0);
    } else {
      const { parts } = fixed;
      const packageAmount =
        parts.base +
        parts.housing +
        parts.bon +
        parts.marriage +
        parts.child +
        parts.seniority;
      extras = Math.max(target - packageAmount, 0);
    }
  } else if (input.agreement === 'net') {
    // A net agreement fixes the take-home; find the base wage that gives it.
    const target = input.agreed * input.fraction;
    let low = 0;
    let high = Math.max(input.agreed, 1) * 3;
    for (let i = 0; i < 70; i++) {
      const mid = (low + high) / 2;
      if (compute(settings, inclusion, input, mid, false).net < target)
        low = mid;
      else high = mid;
    }
    fullBase = high;
  }

  const r = compute(settings, inclusion, input, fullBase, true);
  const R = Math.round;
  const overtime = r.parts.overtime + r.parts.night + r.parts.holiday;

  return {
    base: R(r.parts.base),
    housing: R(r.parts.housing),
    bon: R(r.parts.bon),
    marriage: R(r.parts.marriage),
    child: R(r.parts.child),
    seniority: R(r.parts.seniority),
    overtime: R(overtime),
    mission: R(r.parts.mission),
    eidi: R(r.eidi),
    severance: R(r.severance),
    leaveBuyout: R(r.leaveBuyout),
    extras: R(extras),
    gross: R(r.gross),
    deficit: R(r.deficit),
    workerInsurance: R(r.workerInsurance),
    tax: R(r.tax),
    totalDeductions: R(r.totalDeductions),
    net: R(r.net + extras),
    employerInsurance: R(r.employerInsurance),
    accrual: R(r.accrual),
    totalCost: R(
      r.gross + extras + r.employerInsurance + r.accrual - r.eidi - r.severance,
    ),
    meetsMinimum: r.parts.base + 1 >= settings.minMonthly * input.fraction,
  };
}
