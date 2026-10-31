export type PayrollStatus = 'draft' | 'final';

export interface PayrollUser {
  id: number;
  name: string | null;
  personnelCode: string | null;
  jobTitle: string | null;
  profilePicture: string | null;
  probationEndDate: string | null;
}

/** One person's pay for a month. Money is in rial; hours and days are plain numbers. */
export interface PayrollLine {
  id: number;
  period: number;
  status: PayrollStatus;
  user: PayrollUser;
  /** This month falls in the person's trial period. */
  probation: boolean;
  agreement: 'gross' | 'net' | 'hybrid' | 'flat';
  payEidi: boolean;
  settle: boolean;
  note: string | null;
  warnings: string[];
  /** Each time a final line was opened again: when, by whom and why. */
  revisions: Array<{ at: string; by: string | null; reason: string; changed: boolean | null }>;
  /** Reopened and then actually changed — what a payslip marks. */
  revised: boolean;

  // inputs
  days: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  deficitHours: number;
  missionDays: number;
  leaveRemainDays: number;
  bonus: number;
  advance: number;
  loan: number;
  otherDeductions: number;

  // results
  agreed: number;
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
  /** A hybrid salary's part above its base: paid net, outside insurance and tax. */
  extras: number;
  gross: number;
  deficit: number;
  workerInsurance: number;
  tax: number;
  totalDeductions: number;
  net: number;
  employerInsurance: number;
  accrual: number;
  totalCost: number;
}

export interface PayrollMonth {
  period: number;
  status: PayrollStatus;
  /** Lines still in draft. */
  drafts: number;
  /** People who work this month and have no line yet. */
  missing: number;
  totals: {
    count: number;
    gross: number;
    deductions: number;
    net: number;
    employerInsurance: number;
    accrual: number;
    totalCost: number;
  };
  items: PayrollLine[];
}

/** The inputs of a line; send only what changes. */
export type UpdatePayrollLineDto = Partial<
  Pick<
    PayrollLine,
    | 'days'
    | 'overtimeHours'
    | 'nightHours'
    | 'holidayHours'
    | 'deficitHours'
    | 'missionDays'
    | 'leaveRemainDays'
    | 'bonus'
    | 'advance'
    | 'loan'
    | 'otherDeductions'
    | 'payEidi'
    | 'settle'
  >
> & { note?: string };

/** A line with the person's identity, for the payslip. */
export interface Payslip extends PayrollLine {
  identity: {
    nationalId: string | null;
    insuranceNumber: string | null;
    sheba: string | null;
    hireDate: string | null;
    married: boolean;
    childrenCount: number;
    /** Gross or net, whatever the line's own agreement says (a hybrid line reads «hybrid»). */
    agreementType: 'gross' | 'net';
    endDate: string | null;
    probationEndDate: string | null;
    insured: boolean;
    insuranceType: 'worker' | 'board';
    taxExempt: boolean;
    salaryMode: 'regular' | 'hybrid' | 'flat';
    /** Whole years of service at the line's month. */
    seniorityYears: number;
  };
}

/** One bank transfer: a person's salary, or their extras. Rial. */
export interface BankRow {
  no: number;
  lineId: number;
  name: string | null;
  personnelCode: string | null;
  /** Empty when the person has none on file. */
  sheba: string;
  kind: 'salary' | 'extras';
  amount: number;
  description: string;
  status: PayrollStatus;
}

export interface BankMonth {
  period: number;
  rows: BankRow[];
  totals: { count: number; salary: number; extras: number; total: number };
  missingSheba: number;
  drafts: number;
}

/** An approved advance (مساعده) of a person, in rial. */
export interface AdvanceItem {
  id: number;
  /** The whole advance. */
  amount: number;
  /** What is still owed after everything taken off so far. */
  remaining: number;
  /** What this line took of it. */
  taken: number;
  reason: string | null;
  decidedAt: string | null;
}

/** A person's approved advances: still owed, and already taken off this line. */
export interface LineAdvances {
  available: AdvanceItem[];
  applied: AdvanceItem[];
}
