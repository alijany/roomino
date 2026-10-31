import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { fetcher, postFetcher, putFetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { PayrollYear, UpdatePayrollYearDto } from './payroll-settings.types';

export function usePayrollYears() {
  return useSwrHelper(useSWR<{ years: number[] }>('/admin/finance/payroll-settings', fetcher));
}

export function usePayrollYear(year: number | null) {
  return useSwrHelper(
    useSWR<PayrollYear>(year ? `/admin/finance/payroll-settings/${year}` : null, fetcher),
  );
}

/** Starts a year from the official figures, or from another saved year. */
export function useStartPayrollYear() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/admin/finance/payroll-settings/start',
      (_key: string, { arg }: { arg: { year: number; copyFrom?: number } }) =>
        postFetcher<{ copyFrom?: number }, PayrollYear>(`/admin/finance/payroll-settings/${arg.year}`, {
          arg: { copyFrom: arg.copyFrom },
        }),
    ),
  );
}

export function useSavePayrollYear() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/admin/finance/payroll-settings/save',
      (_key: string, { arg }: { arg: { year: number; data: UpdatePayrollYearDto } }) =>
        putFetcher<UpdatePayrollYearDto, PayrollYear>(`/admin/finance/payroll-settings/${arg.year}`, {
          arg: arg.data,
        }),
    ),
  );
}
