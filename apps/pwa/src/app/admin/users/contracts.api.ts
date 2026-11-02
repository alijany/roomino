import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { deleteFetcher, fetcher, patchFetcher, postFetcher, putFetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { ContractStatus, SaveContractDto, UserContracts } from './contracts.types';

/** Where each person's current contract stands — the users table's badge. */
export function useContractStatuses() {
  const swr = useSWR<{ items: ContractStatus[] }>('/admin/contracts/status', fetcher);
  return useSwrHelper(swr);
}

export function useUserContracts(userId: number) {
  const swr = useSWR<UserContracts>(`/admin/contracts/users/${userId}`, fetcher);
  return useSwrHelper(swr);
}

export function useAddContract(userId: number) {
  const swrMutation = useSWRMutation(
    `/admin/contracts/users/${userId}`,
    (_key: string, { arg }: { arg: SaveContractDto }) =>
      postFetcher<SaveContractDto, unknown>(`/admin/contracts/users/${userId}`, { arg }),
  );
  return useSwrMutationHelper(swrMutation);
}

export function useUpdateContract() {
  const swrMutation = useSWRMutation(
    '/admin/contracts/update',
    (_key: string, { arg }: { arg: { id: number; data: Partial<SaveContractDto> } }) =>
      patchFetcher<Partial<SaveContractDto>, unknown>(`/admin/contracts/${arg.id}`, { arg: arg.data }),
  );
  return useSwrMutationHelper(swrMutation);
}

export function useDeleteContract() {
  const swrMutation = useSWRMutation(
    '/admin/contracts/delete',
    (_key: string, { arg }: { arg: number }) => deleteFetcher<unknown>(`/admin/contracts/${arg}`),
  );
  return useSwrMutationHelper(swrMutation);
}

export function useSetNda(userId: number) {
  const swrMutation = useSWRMutation(
    `/admin/contracts/users/${userId}/nda`,
    (_key: string, { arg }: { arg: { signed: boolean; signedDate?: string } }) =>
      putFetcher<{ signed: boolean; signedDate?: string }, unknown>(`/admin/contracts/users/${userId}/nda`, { arg }),
  );
  return useSwrMutationHelper(swrMutation);
}
