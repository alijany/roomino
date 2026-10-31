import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { withQuery } from '@/libs/api/api.util.query';
import { deleteFetcher, fetcher, patchFetcher, postFetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  BulkRaiseDto,
  RecordSalaryDto,
  SalaryChange,
  SalaryFilters,
  SalaryOverviewRow,
  UpdateProposalDto,
} from './salary-history.types';

export function useSalaryChanges(filters: SalaryFilters) {
  return useSwrHelper(
    useSWR<{ items: SalaryChange[] }>(withQuery('/finance/salary-changes', { ...filters }), fetcher),
  );
}

/** Everyone with the salary that applies in a month. */
export function useSalaryOverview(period: number | null) {
  return useSwrHelper(
    useSWR<{ items: SalaryOverviewRow[] }>(
      period ? `/finance/salary-changes/overview?period=${period}` : null,
      fetcher,
    ),
  );
}

export function useRecordSalaryChange() {
  return useSwrMutationHelper(
    useSWRMutation('/finance/salary-changes', postFetcher<RecordSalaryDto, { ok: boolean }>),
  );
}

export function useBulkSalaryRaise() {
  return useSwrMutationHelper(
    useSWRMutation('/finance/salary-changes/bulk', postFetcher<BulkRaiseDto, { created: number }>),
  );
}

export function useDeleteSalaryChange() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/finance/salary-changes/delete',
      (_key: string, { arg }: { arg: number }) =>
        deleteFetcher<{ success: boolean }>(`/finance/salary-changes/${arg}`),
    ),
  );
}

export function useUpdateSalaryProposal() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/finance/salary-changes/update',
      (_key: string, { arg }: { arg: { id: number; data: UpdateProposalDto } }) =>
        patchFetcher<UpdateProposalDto, { ok: boolean }>(`/finance/salary-changes/${arg.id}`, { arg: arg.data }),
    ),
  );
}

/** Turns proposals into confirmed changes, all or nothing. */
export function useConfirmSalaryChanges() {
  return useSwrMutationHelper(
    useSWRMutation('/finance/salary-changes/confirm', postFetcher<{ ids: number[] }, { confirmed: number }>),
  );
}
