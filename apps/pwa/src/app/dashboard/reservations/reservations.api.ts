import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import {
  deleteFetcher,
  fetcher,
  patchFetcher,
  postFetcher,
} from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  AvailabilityResponse,
  CreateReservationDto,
  GetMyReservationsResponse,
  UpdateReservationDto,
} from './reservations.types';

export function useAvailability(date: string, roomIds?: number[]) {
  const params = new URLSearchParams({ date });
  if (roomIds?.length) params.set('roomIds', roomIds.join(','));
  const swr = useSWR<AvailabilityResponse>(
    date ? `/reservations/availability?${params.toString()}` : null,
    fetcher,
  );
  return useSwrHelper(swr);
}

export function useMyReservations() {
  const swr = useSWR<GetMyReservationsResponse>('/reservations/mine', fetcher);
  return useSwrHelper(swr);
}

export function useBookSlot() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/reservations',
      postFetcher<CreateReservationDto, { id: number }>,
    ),
  );
}

export function useUpdateReservation() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/reservations',
      (
        _key: string,
        { arg }: { arg: { id: number; data: UpdateReservationDto } },
      ) =>
        patchFetcher<UpdateReservationDto, { id: number }>(
          `/reservations/${arg.id}`,
          { arg: arg.data },
        ),
    ),
  );
}

export function useCancelReservation() {
  return useSwrMutationHelper(
    useSWRMutation('/reservations', (_key: string, { arg }: { arg: number }) =>
      deleteFetcher<{ success: boolean }>(`/reservations/${arg}`),
    ),
  );
}
