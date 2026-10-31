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
  CreateRecurringDto,
  CreateRoomDto,
  GetRecurringResponse,
  GetRoomsResponse,
  Recurring,
  Room,
  RoomFilterDto,
  UpdateRoomDto,
} from './rooms.types';

// ── Rooms ───────────────────────────────────────────────────────────────────

export function useRooms(filters?: RoomFilterDto) {
  const query = new URLSearchParams(
    Object.entries(filters || {})
      .filter(([, value]) => value !== undefined && value !== null)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: String(value) }), {}),
  ).toString();

  const swr = useSWR<GetRoomsResponse>(`/rooms?${query}`, fetcher);
  return useSwrHelper(swr);
}

export function useAddRoom() {
  return useSwrMutationHelper(
    useSWRMutation('/rooms', postFetcher<CreateRoomDto, Room>),
  );
}

export function useUpdateRoom() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/rooms',
      (_key: string, { arg }: { arg: { id: number; data: UpdateRoomDto } }) =>
        patchFetcher<UpdateRoomDto, Room>(`/rooms/${arg.id}`, { arg: arg.data }),
    ),
  );
}

export function useDeleteRoom() {
  return useSwrMutationHelper(
    useSWRMutation('/rooms', (_key: string, { arg }: { arg: number }) =>
      deleteFetcher<{ success: boolean }>(`/rooms/${arg}`),
    ),
  );
}

// ── Recurring locks ───────────────────────────────────────────────────────────

export function useRecurring() {
  const swr = useSWR<GetRecurringResponse>('/recurring-reservations', fetcher);
  return useSwrHelper(swr);
}

export function useAddRecurring() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/recurring-reservations',
      postFetcher<CreateRecurringDto, Recurring>,
    ),
  );
}

export function useDeleteRecurring() {
  return useSwrMutationHelper(
    useSWRMutation(
      '/recurring-reservations',
      (_key: string, { arg }: { arg: number }) =>
        deleteFetcher<{ success: boolean }>(`/recurring-reservations/${arg}`),
    ),
  );
}
