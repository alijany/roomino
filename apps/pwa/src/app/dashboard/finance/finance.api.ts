import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { withQuery } from '@/libs/api/api.util.query';
import {
  deleteFetcher,
  fetcher,
  patchFetcher,
  postFetcher,
  putFetcher,
} from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  ActivityEntry,
  ApprovalPreview,
  ApprovalRule,
  ApprovalRuleInput,
  CreatePaymentSourceDto,
  CreateRequestDto,
  Currency,
  ExpenseCategory,
  FinanceBadges,
  GetRequestsResponse,
  PaymentRequest,
  PaymentRequestDetail,
  PaymentSource,
  RecordPaymentDto,
  RequestAttachment,
  RequestFilterDto,
  UpdateRequestDto,
} from './finance.types';

// --- requests ---------------------------------------------------------------

export function usePaymentRequests(filters?: RequestFilterDto) {
  return useSwrHelper(
    useSWR<GetRequestsResponse>(
      withQuery('/finance/requests', filters as Record<string, never>),
      fetcher
    )
  );
}

export function usePaymentRequest(id?: number) {
  return useSwrHelper(
    useSWR<PaymentRequestDetail>(id ? `/finance/requests/${id}` : null, fetcher)
  );
}

export function useRequestActivity(id?: number) {
  return useSwrHelper(
    useSWR<{ items: ActivityEntry[] }>(
      id ? `/finance/requests/${id}/activity` : null,
      fetcher
    )
  );
}

export function useFinanceBadges() {
  return useSwrHelper(
    useSWR<FinanceBadges>('/finance/requests/meta/badges', fetcher)
  );
}

export function useCreateRequest() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/finance/requests',
      postFetcher<CreateRequestDto, PaymentRequest>
    )
  );
}

export function useUpdateRequest(id: number) {
  return useSwrMutationHelper(
    useSWRMutation(
      `/finance/requests/${id}`,
      patchFetcher<UpdateRequestDto, PaymentRequest>
    )
  );
}

/**
 * The lifecycle transitions. Each takes the request id as its argument so a
 * single hook instance can act on any row in a list.
 */
function useRequestAction<TBody = Record<string, never>>(action: string) {
  return useSwrMutationHelper(
    useSWRMutation(
      `/finance/requests/${action}`,
      (_key: string, { arg }: { arg: { id: number; data?: TBody } }) =>
        postFetcher<TBody | Record<string, never>, PaymentRequest>(
          `/finance/requests/${arg.id}/${action}`,
          { arg: arg.data ?? {} }
        )
    )
  );
}

export const useSubmitRequest = () => useRequestAction('submit');
export const useApproveRequest = () => useRequestAction<{ comment?: string }>('approve');
export const useRejectRequest = () => useRequestAction<{ comment: string }>('reject');
export const useRequestInfo = () => useRequestAction<{ comment: string }>('request-info');
export const useCancelRequest = () => useRequestAction('cancel');
export const useRecordPayment = () => useRequestAction<RecordPaymentDto>('pay');
export const useFailPayment = () => useRequestAction<{ comment: string }>('fail');

/**
 * Which approvers an amount would need. Called from the form as the user types,
 * so they see the consequence before investing effort in the rest of it.
 */
export function useApprovalPreview() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/finance/requests/approval-preview',
      postFetcher<
        { amountMinor: number; currency: Currency; categoryId?: number },
        ApprovalPreview
      >
    )
  );
}

// --- attachments ------------------------------------------------------------

export function useUploadAttachment(requestId: number) {
  return useSwrMutationHelper(
    useSWRMutation(
      `/finance/requests/${requestId}/attachments`,
      (url: string, { arg }: { arg: { file: File; kind?: string } }) => {
        const formData = new FormData();
        formData.append('file', arg.file);
        if (arg.kind) formData.append('kind', arg.kind);

        // Not postFetcher: multipart must not carry a JSON content-type header.
        return fetcher<RequestAttachment>(url, {
          method: 'POST',
          body: formData,
        });
      }
    )
  );
}

export function useDeleteAttachment() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/finance/requests/attachments',
      (_key: string, { arg }: { arg: number }) =>
        deleteFetcher<{ success: boolean }>(`/finance/requests/attachments/${arg}`)
    )
  );
}

// --- reference data ---------------------------------------------------------

export function useExpenseCategories(activeOnly = true) {
  return useSwrHelper(
    useSWR<{ items: ExpenseCategory[] }>(
      withQuery('/finance/categories', { activeOnly }),
      fetcher
    )
  );
}

export function usePaymentSources(activeOnly = true) {
  return useSwrHelper(
    useSWR<{ items: PaymentSource[] }>(
      withQuery('/finance/payment-sources', { activeOnly }),
      fetcher
    )
  );
}

export function useCreatePaymentSource() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/finance/payment-sources',
      postFetcher<CreatePaymentSourceDto, PaymentSource>
    )
  );
}

export function useUpdatePaymentSource() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/finance/payment-sources',
      (
        _key: string,
        { arg }: { arg: { id: number; data: Partial<CreatePaymentSourceDto> } }
      ) =>
        patchFetcher<Partial<CreatePaymentSourceDto>, PaymentSource>(
          `/finance/payment-sources/${arg.id}`,
          { arg: arg.data }
        )
    )
  );
}

export function useDeletePaymentSource() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/finance/payment-sources',
      (_key: string, { arg }: { arg: number }) =>
        deleteFetcher<{ success: boolean }>(`/finance/payment-sources/${arg}`)
    )
  );
}

export function useApprovalRules() {
  return useSwrHelper(
    useSWR<{ items: ApprovalRule[] }>('/finance/approval-rules', fetcher)
  );
}

export function useReplaceApprovalRules() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/finance/approval-rules',
      putFetcher<{ rules: ApprovalRuleInput[] }, { items: ApprovalRule[] }>
    )
  );
}
