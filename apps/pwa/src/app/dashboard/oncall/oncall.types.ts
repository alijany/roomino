import { UserBrief } from '../attendance/attendance.types';

export type OnCallDayType = 'normal' | 'thursday' | 'friday' | 'holiday';

export interface OnCallSlot {
  start: string;
  end: string;
}

export type OnCallTemplates = Record<OnCallDayType, OnCallSlot[]>;

/** Pay per hour by kind of day, in rial. */
export type OnCallRates = Record<OnCallDayType, number>;

export interface OnCallEntry {
  id?: number;
  user: UserBrief;
  start: string;
  end: string;
}

export interface OnCallDay {
  date: string;
  jalaliMonth: number;
  jalaliDay: number;
  /** 0 = شنبه … 6 = جمعه. */
  weekday: number;
  type: OnCallDayType;
  holidayTitle: string | null;
  defaultSlots: OnCallSlot[];
  entries: OnCallEntry[];
}

export interface OnCallSchedule {
  canManage: boolean;
  period: { start: string; end: string; status: 'draft' | 'published'; year: number; month: number };
  days: OnCallDay[];
  eligible: UserBrief[];
  totals: Array<{ userId: number; minutes: number }>;
}

export interface OnCallSettings {
  templates: OnCallTemplates;
  hourlyRates: OnCallRates;
  periodStartDay: number;
  eligible: UserBrief[];
  /** Everyone else still working here, who can be added. */
  candidates: UserBrief[];
  /** Days handed to the next person when someone left the list; only on save. */
  replaced?: number;
}

export interface OnCallEntryInput {
  userId: number;
  start: string;
  end: string;
}

export interface OnCallSettingsInput {
  templates?: OnCallTemplates;
  hourlyRates?: OnCallRates;
  periodStartDay?: number;
  memberOrder?: number[];
}

export interface MyOnCallDay {
  date: string;
  /** Latin-digit Jalali, `1405/08/05`. */
  jalali: string;
  entries: Array<{ start: string; end: string }>;
  /** Today or earlier: it can only be recorded, not asked. */
  past: boolean;
  movable: boolean;
  pending: boolean;
}

export type OnCallSwapKind = 'swap' | 'handover' | 'partial';
export type OnCallSwapStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface OnCallSwap {
  id: number;
  kind: OnCallSwapKind;
  status: OnCallSwapStatus;
  requester?: UserBrief;
  target?: UserBrief;
  requesterDate: string;
  requesterJalali: string;
  targetDate: string | null;
  targetJalali: string | null;
  startTime: string | null;
  endTime: string | null;
  /** Agreed beforehand and only logged. */
  coordinated: boolean;
  createdAt: string;
  respondedAt: string | null;
}

export interface MyOnCallSwaps {
  incoming: OnCallSwap[];
  outgoing: OnCallSwap[];
  history: OnCallSwap[];
}
