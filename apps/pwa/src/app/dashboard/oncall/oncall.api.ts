import { useSwrHelper } from '@/libs/api/api.hook.use-swr-helper';
import { fetcher, postFetcher, putFetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import { UserBrief } from '../attendance/attendance.types';
import {
  MyOnCallDay,
  MyOnCallSwaps,
  OnCallEntryInput,
  OnCallSchedule,
  OnCallSettings,
  OnCallSettingsInput,
  OnCallSwap,
  OnCallSwapKind,
} from './oncall.types';

export function useOnCallSchedule(year: number, month: number) {
  return useSwrHelper(useSWR<OnCallSchedule>(`/oncall/schedule?year=${year}&month=${month}`, fetcher));
}

export function useOnCallSettings() {
  return useSwrHelper(useSWR<OnCallSettings>('/oncall/settings', fetcher));
}

export const saveOnCallSettings = (data: OnCallSettingsInput) =>
  putFetcher<OnCallSettingsInput, OnCallSettings>('/oncall/settings', { arg: data });

export const saveOnCallDay = (date: string, entries: OnCallEntryInput[]) =>
  putFetcher<{ entries: OnCallEntryInput[] }, { success: boolean }>(`/oncall/days/${date}`, { arg: { entries } });

export const repeatOnCall = (year: number, month: number, replace: boolean) =>
  postFetcher<{ year: number; month: number; replace: boolean }, { filled: number }>('/oncall/repeat', {
    arg: { year, month, replace },
  });

export const setOnCallPublished = (year: number, month: number, published: boolean, notify = true) =>
  postFetcher<{ year: number; month: number; notify?: boolean }, { status: string }>(
    `/oncall/${published ? 'publish' : 'unpublish'}`,
    { arg: published ? { year, month, notify } : { year, month } },
  );

export const copyPreviousOnCall = (year: number, month: number, mode: 'continue' | 'restart', replace: boolean) =>
  postFetcher<{ year: number; month: number; mode: string; replace: boolean }, { filled: number }>('/oncall/copy-previous', {
    arg: { year, month, mode, replace },
  });

export function useMyOnCallShifts() {
  return useSwrHelper(useSWR<{ items: MyOnCallDay[] }>('/oncall/me/shifts', fetcher));
}

export function useOnCallColleagues() {
  return useSwrHelper(useSWR<{ items: UserBrief[] }>('/oncall/me/colleagues', fetcher));
}

export function useColleagueShifts(id: number | null) {
  return useSwrHelper(useSWR<{ items: MyOnCallDay[] }>(id ? `/oncall/me/colleagues/${id}/shifts` : null, fetcher));
}

export function useMyOnCallSwaps() {
  return useSwrHelper(useSWR<MyOnCallSwaps>('/oncall/me/swaps', fetcher));
}

export interface OnCallReportItem {
  user: UserBrief;
  personnelCode: string | null;
  days: number;
  totalMinutes: number;
  doneMinutes: number;
  remainingMinutes: number;
  byType: { normal: number; thursday: number; friday: number; holiday: number };
  /** Rial. */
  amount: number;
}

export function useOnCallReport(year: number, month: number) {
  return useSwrHelper(
    useSWR<{ period: { start: string; end: string }; items: OnCallReportItem[] }>(
      `/oncall/report?year=${year}&month=${month}`,
      fetcher,
    ),
  );
}

export interface OnCallPendingChange {
  id: number;
  date: string;
  user: UserBrief;
  kind: 'added' | 'removed' | 'changed';
  /** Hours before / after, `۱۷:۳۰ تا ۲۳:۰۰`; empty when the person was not on that day / was taken off. */
  before: string;
  after: string;
}

export function useOnCallChanges() {
  return useSwrHelper(useSWR<{ items: OnCallPendingChange[] }>('/oncall/changes', fetcher));
}

export const resolveOnCallChanges = (notify: boolean) =>
  postFetcher<{ notify: boolean }, { sent: number }>('/oncall/changes/resolve', { arg: { notify } });

export function useOnCallSwapLog() {
  return useSwrHelper(useSWR<{ items: OnCallSwap[] }>('/oncall/swaps', fetcher));
}

export const createOnCallSwap = (data: {
  kind: OnCallSwapKind;
  targetId: number;
  requesterDate: string;
  targetDate?: string;
  startTime?: string;
  endTime?: string;
  coordinated?: boolean;
}) => postFetcher<typeof data, { id: number }>('/oncall/me/swaps', { arg: data });

export const answerOnCallSwap = (id: number, action: 'accept' | 'decline' | 'cancel') =>
  postFetcher<Record<string, never>, { status: string }>(`/oncall/me/swaps/${id}/${action}`, { arg: {} });

export function useMyOnCallSchedule(year: number, month: number) {
  return useSwrHelper(useSWR<OnCallSchedule>(`/oncall/me/schedule?year=${year}&month=${month}`, fetcher));
}

export interface OnCallSummary {
  eligible: boolean;
  today: MyOnCallDay | null;
  next: MyOnCallDay | null;
  /** Swap requests waiting for my answer (the first couple). */
  requests: OnCallSwap[];
  /** How many are waiting in all. */
  incoming: number;
}

export function useMyOnCallSummary() {
  return useSwrHelper(useSWR<OnCallSummary>('/oncall/me/summary', fetcher));
}
