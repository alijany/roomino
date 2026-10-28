export type PayrollKind = 'money' | 'percent' | 'int';

/** One parameter of a year. Money is in rial, percents are real percents. */
export interface PayrollItem {
  key: string;
  group: string;
  label: string;
  kind: PayrollKind;
  value: number | null;
  /** The official figure for this year, if there is one. */
  official: number | null;
  /** Differs from the official figure. */
  edited: boolean;
  /** How it is computed when left alone, e.g. «۳۰ × مزد روزانه». */
  derived: string | null;
  /** Set by hand instead of following its formula. */
  overridden: boolean;
  needsReview: boolean;
  hint: string | null;
}

export interface PayrollInclusion {
  key: string;
  label: string;
  needsReview: boolean;
  insurable: boolean;
  taxable: boolean;
}

export interface PayrollYear {
  year: number;
  /** Saved for this organisation; otherwise the page shows the official figures read-only. */
  exists: boolean;
  hasOfficial: boolean;
  groups: string[];
  items: PayrollItem[];
  inclusion: PayrollInclusion[];
}

export interface UpdatePayrollYearDto {
  values?: Record<string, number>;
  inclusion?: Record<string, { insurable: boolean; taxable: boolean }>;
}
