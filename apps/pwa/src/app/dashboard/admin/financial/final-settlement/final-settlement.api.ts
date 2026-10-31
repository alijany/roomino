import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { deleteFetcher, fetcher, patchFetcher, postFetcher } from '@/libs/api/api.util.fetcher';
import { withQuery } from '@/libs/api/api.util.query';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { FinalSettlement, SettlementCandidate, UpdateSettlementDto } from './final-settlement.types';

export const useSettlements = () =>
  useSwrHelper(useSWR<{ items: FinalSettlement[] }>('/finance/final-settlements', fetcher));

export const useSettlement = (id: number | null) =>
  useSwrHelper(useSWR<FinalSettlement>(id ? `/finance/final-settlements/${id}` : null, fetcher));

/** People with no settlement yet, found as you type. */
export const useSettlementCandidates = (text: string, enabled: boolean) =>
  useSwrHelper(
    useSWR<{ items: SettlementCandidate[] }>(
      enabled ? withQuery('/finance/final-settlements/candidates', { text }) : null,
      fetcher,
    ),
  );

export const useCreateSettlement = () =>
  useSwrMutationHelper(
    useSWRMutation(
      '/finance/final-settlements/create',
      (_k: string, { arg }: { arg: { userId: number; date: string } }) =>
        postFetcher<{ userId: number; date: string }, FinalSettlement>('/finance/final-settlements', { arg }),
    ),
  );

export const useUpdateSettlement = () =>
  useSwrMutationHelper(
    useSWRMutation(
      '/finance/final-settlements/update',
      (_k: string, { arg }: { arg: { id: number; data: UpdateSettlementDto } }) =>
        patchFetcher<UpdateSettlementDto, FinalSettlement>(`/finance/final-settlements/${arg.id}`, { arg: arg.data }),
    ),
  );

function useSettlementAction(action: 'finalize' | 'reopen') {
  return useSwrMutationHelper(
    useSWRMutation(
      `/finance/final-settlements/${action}`,
      (_k: string, { arg }: { arg: number }) =>
        postFetcher<Record<string, never>, FinalSettlement>(`/finance/final-settlements/${arg}/${action}`, { arg: {} }),
    ),
  );
}
export const useFinalizeSettlement = () => useSettlementAction('finalize');
export const useReopenSettlement = () => useSettlementAction('reopen');

export const useDeleteSettlement = () =>
  useSwrMutationHelper(
    useSWRMutation(
      '/finance/final-settlements/delete',
      (_k: string, { arg }: { arg: number }) =>
        deleteFetcher<{ success: boolean }>(`/finance/final-settlements/${arg}`),
    ),
  );
