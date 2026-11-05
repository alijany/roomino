import { deleteFetcher, fetcher, patchFetcher, postFetcher, putFetcher } from '@/libs/api/api.util.fetcher';
import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { JobGroup, JobGroupInput, UserBrief } from '@/app/dashboard/attendance/attendance.types';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

export function useTeams() {
  return useSwrHelper(useSWR<{ items: JobGroup[] }>('/admin/teams', fetcher));
}

export function useTeamMembers(id: number | null) {
  return useSwrHelper(useSWR<{ items: UserBrief[] }>(id ? `/admin/teams/${id}/members` : null, fetcher));
}

export function useManagerCandidates(text: string, enabled: boolean) {
  return useSwrHelper(
    useSWR<{ items: UserBrief[] }>(
      enabled ? `/admin/teams/manager-candidates?text=${encodeURIComponent(text)}` : null,
      fetcher,
    ),
  );
}

export function useSaveTeam() {
  return useSwrMutationHelper(
    useSWRMutation('/admin/teams/save', (_key: string, { arg }: { arg: { id?: number; data: JobGroupInput } }) =>
      arg.id
        ? patchFetcher<JobGroupInput, JobGroup>(`/admin/teams/${arg.id}`, { arg: arg.data })
        : postFetcher<JobGroupInput, JobGroup>('/admin/teams', { arg: arg.data }),
    ),
  );
}

export function useDeleteTeam() {
  return useSwrMutationHelper(
    useSWRMutation('/admin/teams/delete', (_key: string, { arg }: { arg: number }) =>
      deleteFetcher<{ success: boolean }>(`/admin/teams/${arg}`),
    ),
  );
}

/** Put a person in a team, or take them out (`teamId` null). */
export function setUserTeam(userId: number, teamId: number | null) {
  return putFetcher<{ teamId: number | null }, { success: boolean }>(`/admin/teams/users/${userId}`, { arg: { teamId } });
}
