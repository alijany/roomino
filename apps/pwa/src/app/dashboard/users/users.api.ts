import { fetcher, patchFetcher, postFetcher } from "@/libs/api/api.util.fetcher";
import { useSwrHelper, useSwrMutationHelper } from "@/libs/api/api.hook.use-swr-helper";
import useSWR from "swr";
import { AddUserDto, GetUsersResponse, UpdateUserRoleDto, User, UserFilterDto, UserRole } from "./users.types";
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

export function useUpdateUserRole() {
  const swrMutation = useSWRMutation(
    '/users/role',
    (_key: string, { arg }: { arg: { id: number; data: UpdateUserRoleDto } }) =>
      patchFetcher<UpdateUserRoleDto, UserRole>(`/users/${arg.id}/role`, { arg: arg.data })
  );
  return useSwrMutationHelper(swrMutation);
}