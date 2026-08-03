import { deleteFetcher, fetcher, patchFetcher, postFetcher } from "@/libs/api/api.util.fetcher";
import { useSwrHelper, useSwrMutationHelper } from "@/libs/api/api.hook.use-swr-helper";
import useSWR from "swr";
import { AddUserDto, AddUserRoleDto, GetUsersResponse, User, UserFilterDto, UserRole } from "./users.types";
import useSWRMutation from "swr/mutation";


export function useUsers(filters?: UserFilterDto) {
const query = new URLSearchParams(
    Object.entries(filters || {})
      .filter(([, value]) => value !== undefined && value !== null)
      .reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value?.toString() || ''
      }), {})
  ).toString();

  const swr = useSWR<GetUsersResponse>(`/users?${query}`, fetcher);
  return useSwrHelper(swr);
}

export function useAddUser() {
  const swrMutation = useSWRMutation(
    '/users',
    postFetcher<AddUserDto, User>
  );
  return useSwrMutationHelper(swrMutation);
}

export function useApproveUser() {
  const swrMutation = useSWRMutation(
    '/users/approve',
    (_key: string, { arg }: { arg: number }) =>
      patchFetcher<Record<string, never>, User>(`/users/${arg}/approve`, { arg: {} })
  );
  return useSwrMutationHelper(swrMutation);
}

export function useAddUserRole() {
  const swrMutation = useSWRMutation(
    '/users/roles',
    (_key: string, { arg }: { arg: { id: number; data: AddUserRoleDto } }) =>
      postFetcher<AddUserRoleDto, UserRole>(`/users/${arg.id}/roles`, { arg: arg.data })
  );
  return useSwrMutationHelper(swrMutation);
}

export function useRemoveUserRole() {
  const swrMutation = useSWRMutation(
    '/users/roles',
    (_key: string, { arg }: { arg: { id: number; roleId: number } }) =>
      deleteFetcher<{ success: boolean }>(`/users/${arg.id}/roles/${arg.roleId}`)
  );
  return useSwrMutationHelper(swrMutation);
}

export function useDeleteUser() {
  const swrMutation = useSWRMutation(
    '/users',
    (_key: string, { arg }: { arg: number }) =>
      deleteFetcher<{ success: boolean }>(`/users/${arg}`)
  );
  return useSwrMutationHelper(swrMutation);
}