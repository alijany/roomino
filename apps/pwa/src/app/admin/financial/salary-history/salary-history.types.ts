export type SalaryChangeType = 'start' | 'raise' | 'decrease';

/** A proposal is a draft for a meeting: it counts for nothing until confirmed. */
export type SalaryChangeStatus = 'proposed' | 'confirmed';

export interface SalaryUser {
  id: number;
  name: string | null;
  personnelCode: string | null;
  jobTitle: string | null;
  profilePicture: string | null;
}

/** One change of a person's monthly salary. Amounts are in rial; `period` is `140507`. */
export interface SalaryChange {
  id: number;
  user: SalaryUser;
  period: number;
  salary: number;
  previous: number | null;
  /** Against the previous salary; null for the first. */
  percent: number | null;
  /** Null while a proposal; set when it is confirmed. */
  type: SalaryChangeType | null;
  status: SalaryChangeStatus;
  note: string | null;
  createdBy: string | null;
  /** The person's latest confirmed change — the only confirmed one that can be deleted. */
  isLatest: boolean;
}

export interface SalaryOverviewRow {
  user: SalaryUser;
  hireDate: string | null;
  endDate: string | null;
  /** The salary that applies in the asked month; null before any entry. */
  salary: number | null;
  since: number | null;
  /** The person's open proposal, if any. */
  proposal: { id: number; period: number; salary: number } | null;
}

export interface SalaryFilters {
  text?: string;
  type?: SalaryChangeType;
  status?: SalaryChangeStatus;
  year?: number;
  month?: number;
  /** Only each person's latest change, i.e. the salary in force. */
  onlyLatest?: boolean;
}

export interface RecordSalaryDto {
  userId: number;
  period: number;
  salary: number;
  /** Record it as a proposal instead of a confirmed change. */
  propose?: boolean;
  note?: string;
}

export interface UpdateProposalDto {
  period?: number;
  salary?: number;
  note?: string;
}

export interface BulkRaiseDto {
  userIds: number[];
  period: number;
  percent: number;
  roundTo?: number;
  propose?: boolean;
  note?: string;
}
