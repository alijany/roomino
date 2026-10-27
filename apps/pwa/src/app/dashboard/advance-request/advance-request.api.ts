import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { fetcher, postFetcher } from '@/libs/api/api.util.fetcher';
import { withQuery } from '@/libs/api/api.util.query';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  AdvanceRequest,
  AdvanceRequestDetail,
  AdvanceRequestFilterDto,
  CreateAdvanceRequestDto,
  GetAdvanceRequestsResponse,
} from './advance-request.types';

export function useAdvanceRequests(filters?: AdvanceRequestFilterDto) {
  return useSwrHelper(
    useSWR<GetAdvanceRequestsResponse>(
      withQuery('/advance-requests', filters as Record<string, never>),
      fetcher
    )
  );
}

export function useAdvanceRequest(id?: number) {
  return useSwrHelper(
    useSWR<AdvanceRequestDetail>(id ? `/advance-requests/${id}` : null, fetcher)
  );
}

export function useCreateAdvanceRequest() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/advance-requests',
      postFetcher<CreateAdvanceRequestDto, AdvanceRequest>
    )
  );
}

/**
 * The lifecycle transitions. Each takes the request id as its argument so a
 * single hook instance can act on any row in a list.
 */
function useAdvanceRequestAction<TBody = Record<string, never>>(action: string) {
  return useSwrMutationHelper(
    useSWRMutation(
      `/advance-requests/${action}`,
      (_key: string, { arg }: { arg: { id: number; data?: TBody } }) =>
        postFetcher<TBody | Record<string, never>, AdvanceRequest>(
          `/advance-requests/${arg.id}/${action}`,
          { arg: arg.data ?? {} }
        )
    )
  );
}

export const useApproveAdvanceRequest = () =>
  useAdvanceRequestAction<{ comment?: string }>('approve');
export const useRejectAdvanceRequest = () =>
  useAdvanceRequestAction<{ comment: string }>('reject');
export const useCancelAdvanceRequest = () => useAdvanceRequestAction('cancel');
