import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { deleteFetcher, fetcher, patchFetcher, postFetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { BankMonth, LineAdvances, Payslip, PayrollLine, PayrollMonth, UpdatePayrollLineDto } from './payroll.types';

export function usePayrollMonth(period: number | null) {
  return useSwrHelper(useSWR<PayrollMonth>(period ? `/admin/finance/payroll/${period}` : null, fetcher));
}

/** A month-level action: generate, recalculate or finalize. */
function useMonthAction<T>(action: 'generate' | 'recalculate' | 'finalize') {
  return useSwrMutationHelper(
    useSWRMutation(
      `/admin/finance/payroll/${action}`,
      (_key: string, { arg }: { arg: number }) => postFetcher<Record<string, never>, T>(`/admin/finance/payroll/${arg}/${action}`, { arg: {} }),
    ),
  );
}

export const useGeneratePayroll = () => useMonthAction<{ created: number; existing: number }>('generate');
export const useRecalculatePayroll = () => useMonthAction<{ recalculated: number }>('recalculate');
export const useFinalizePayroll = () => useMonthAction<{ finalized: number }>('finalize');

export function useUpdatePayrollLine() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/admin/finance/payroll/lines/update',
      (_key: string, { arg }: { arg: { id: number; data: UpdatePayrollLineDto } }) =>
        patchFetcher<UpdatePayrollLineDto, PayrollLine>(`/admin/finance/payroll/lines/${arg.id}`, { arg: arg.data }),
    ),
  );
}

export function useDeletePayrollLine() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/admin/finance/payroll/lines/delete',
      (_key: string, { arg }: { arg: number }) => deleteFetcher<{ success: boolean }>(`/admin/finance/payroll/lines/${arg}`),
    ),
  );
}

/** Freezes one person's line; the rest of the month stays open. */
export function useFinalizePayrollLine() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/admin/finance/payroll/lines/finalize',
      (_key: string, { arg }: { arg: number }) =>
        postFetcher<Record<string, never>, PayrollLine>(`/admin/finance/payroll/lines/${arg}/finalize`, { arg: {} }),
    ),
  );
}

export function usePayslip(id: number | null) {
  return useSwrHelper(useSWR<Payslip>(id ? `/admin/finance/payroll/lines/${id}` : null, fetcher));
}

/** Opens a final line again, with the reason kept on it. */
export function useReopenPayrollLine() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/admin/finance/payroll/lines/reopen',
      (_key: string, { arg }: { arg: { id: number; reason: string } }) =>
        postFetcher<{ reason: string }, PayrollLine>(`/admin/finance/payroll/lines/${arg.id}/reopen`, { arg: { reason: arg.reason } }),
    ),
  );
}

/** Opens every final line of a month again. */
export function useReopenPayrollMonth() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/admin/finance/payroll/reopen',
      (_key: string, { arg }: { arg: { period: number; reason: string } }) =>
        postFetcher<{ reason: string }, { reopened: number }>(`/admin/finance/payroll/${arg.period}/reopen`, { arg: { reason: arg.reason } }),
    ),
  );
}

/** The month's bank transfers; fetched only while the dialog is open. */
export function useBankMonth(period: number | null) {
  return useSwrHelper(useSWR<BankMonth>(period ? `/admin/finance/payroll/${period}/bank` : null, fetcher));
}

/** A person's approved advances to take off one line. */
export function useLineAdvances(id: number | null) {
  return useSwrHelper(useSWR<LineAdvances>(id ? `/admin/finance/payroll/lines/${id}/advances` : null, fetcher));
}

/** Takes an approved advance (all that is left, or `amount` of it) off a line. */
export function useApplyAdvance() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/admin/finance/payroll/lines/advances/apply',
      (_key: string, { arg }: { arg: { lineId: number; requestId: number; amount?: number } }) =>
        postFetcher<{ amount?: number }, PayrollLine>(
          `/admin/finance/payroll/lines/${arg.lineId}/advances/${arg.requestId}/apply`,
          { arg: arg.amount ? { amount: arg.amount } : {} },
        ),
    ),
  );
}

/** Gives back what a line took of an advance. */
export function useUnapplyAdvance() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/admin/finance/payroll/lines/advances/unapply',
      (_key: string, { arg }: { arg: { lineId: number; requestId: number } }) =>
        postFetcher<Record<string, never>, PayrollLine>(
          `/admin/finance/payroll/lines/${arg.lineId}/advances/${arg.requestId}/unapply`,
          { arg: {} },
        ),
    ),
  );
}
