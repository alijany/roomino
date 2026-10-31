export type SettlementStatus = 'draft' | 'final';

/** A person's final settlement. Money is rial. */
export interface FinalSettlement {
  id: number;
  status: SettlementStatus;
  /** Civil `YYYY-MM-DD`. */
  date: string;
  user: {
    id: number;
    name: string | null;
    personnelCode: string | null;
    jobTitle: string | null;
    profilePicture: string | null;
    hireDate: string | null;
    endDate: string | null;
    sheba: string | null;
  };
  leaveRemainDays: number;
  /** Unused entitled leave per attendance, in days; null without a ledger. */
  leaveFromAttendance?: number | null;
  /** Set by hand; null when counted from the dates. */
  eidiMonths: number | null;
  /** The span severance is counted over (defaults: hire date, settlement date). */
  severanceFrom: string | null;
  severanceTo: string | null;
  severanceCustom: boolean;
  /** Under a year of service: pay severance in proportion. */
  severanceProRata: boolean;
  note: string | null;
  serviceYears: number;
  yearMonths: number;
  warnings: string[];
  eidiPaid: number;
  adjustment: number;
  advance: number;
  loan: number;
  otherDeductions: number;
  severance: number;
  leaveBuyout: number;
  eidi: number;
  gross: number;
  workerInsurance: number;
  tax: number;
  totalDeductions: number;
  /** What is left to pay; negative when the person owes. */
  net: number;
}

export interface SettlementCandidate {
  id: number;
  name: string | null;
  personnelCode: string | null;
  jobTitle: string | null;
  profilePicture: string | null;
}

export type UpdateSettlementDto = Partial<
  Pick<FinalSettlement, 'leaveRemainDays' | 'eidiPaid' | 'adjustment' | 'advance' | 'loan' | 'otherDeductions'>
> & { date?: string; note?: string; eidiMonths?: number | null; severanceProRata?: boolean; severanceFrom?: string | null; severanceTo?: string | null };
