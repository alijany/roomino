import { deleteFetcher, fetcher, patchFetcher, postFetcher } from "@/libs/api/api.util.fetcher";
import { useSwrHelper, useSwrMutationHelper } from "@/libs/api/api.hook.use-swr-helper";
import useSWR from "swr";
import { AddUserDto, AddUserRoleDto, GetUsersResponse, UpdateUserNameDto, User, UserFilterDto, UserRole } from "./users.types";
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

  const swr = useSWR<GetUsersResponse>(`/admin/users?${query}`, fetcher);
  return useSwrHelper(swr);
}

export function useUser(id: number) {
  const swr = useSWR<User>(Number.isFinite(id) ? `/admin/users/${id}` : null, fetcher);
  return useSwrHelper(swr);
}

export function useAddUser() {
  const swrMutation = useSWRMutation(
    '/admin/users',
    postFetcher<AddUserDto, User>
  );
  return useSwrMutationHelper(swrMutation);
}

export function useApproveUser() {
  const swrMutation = useSWRMutation(
    '/admin/users/approve',
    (_key: string, { arg }: { arg: number }) =>
      patchFetcher<Record<string, never>, User>(`/admin/users/${arg}/approve`, { arg: {} })
  );
  return useSwrMutationHelper(swrMutation);
}

export function useAddUserRole() {
  const swrMutation = useSWRMutation(
    '/admin/users/roles',
    (_key: string, { arg }: { arg: { id: number; data: AddUserRoleDto } }) =>
      postFetcher<AddUserRoleDto, UserRole>(`/admin/users/${arg.id}/roles`, { arg: arg.data })
  );
  return useSwrMutationHelper(swrMutation);
}

export function useRemoveUserRole() {
  const swrMutation = useSWRMutation(
    '/admin/users/roles',
    (_key: string, { arg }: { arg: { id: number; roleId: number } }) =>
      deleteFetcher<{ success: boolean }>(`/admin/users/${arg.id}/roles/${arg.roleId}`)
  );
  return useSwrMutationHelper(swrMutation);
}

export function useDeleteUser() {
  const swrMutation = useSWRMutation(
    '/admin/users',
    (_key: string, { arg }: { arg: number }) =>
      deleteFetcher<{ success: boolean }>(`/admin/users/${arg}`)
  );
  return useSwrMutationHelper(swrMutation);
}

export function useUpdateUserName() {
  const swrMutation = useSWRMutation(
    '/users/name',
    (_key: string, { arg }: { arg: { id: number; data: UpdateUserNameDto } }) =>
      patchFetcher<UpdateUserNameDto, Pick<User, 'id' | 'name' | 'firstName' | 'lastName' | 'phone' | 'nationalId' | 'personnelCode' | 'jobTitle' | 'hireDate' | 'endDate' | 'insuranceNumber' | 'sheba' | 'email'>>(`/admin/users/${arg.id}`, { arg: arg.data })
  );
  return useSwrMutationHelper(swrMutation);
}
