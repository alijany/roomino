'use client';

import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { fetcher, postFetcher, patchFetcher, uploadFileFetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { RoleType } from './auth.constants.roles';

export interface OtpRequest {
  phoneNumber: string;
}

export interface OtpVerify {
  phoneNumber: string;
  otp: string;
  deviceId?: string;
  firstName?: string;
  lastName?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
  deviceId?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  isNewUser?: boolean;
  user: {
    id: number;
    name?: string;
    firstName?: string;
    lastName?: string;
    nationalId: string;
    phone: string;
    profilePicture?: string;
    roles: RoleType[];
    createdAt: string;
  };
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName?: string;
}

export interface UpdatePhoneRequest {
  phoneNumber: string;
  otp: string;
}

export interface OtpSendResponse {
  message: string;
  isNewUser?: boolean;
}

export class AuthError extends Error {
  constructor(message: string, public code: number) {
    super(message);
    this.name = 'AuthError';
  }
}

export function useRequestOtpMutation() {
  const { submit, data, error, isLoading, reset } = useSwrMutationHelper<
    OtpSendResponse, 
    Error, 
    { phoneNumber: string }
  >(useSWRMutation('/auth/otp/send', postFetcher<OtpRequest,OtpSendResponse>));
  
  return {
    requestOtp: submit,
    data,
    error,
    isLoading,
    reset
  };
}

export function useVerifyOtpMutation() {
  const { submit, data, error, isLoading, reset } = useSwrMutationHelper<
    AuthResponse,
    Error,
    OtpVerify
  >(useSWRMutation('/auth/otp/verify', postFetcher<OtpVerify, AuthResponse>));
  
  return {
    verifyOtp: submit,
    data,
    error,
    isLoading,
    reset
  };
}

export function useRefreshTokenMutation() {
  const { submit, data, error, isLoading, reset } = useSwrMutationHelper<
    AuthResponse, 
    Error, 
    { refresh_token: string; deviceId?: string }
  >(useSWRMutation('/auth/refresh', postFetcher<RefreshTokenRequest, AuthResponse>));
  
  return {
    refreshToken: submit,
    data,
    error,
    isLoading,
    reset
  };
}

export function useProfile() {
  const { data, error, isLoading, reset, mutate } = useSwrHelper(
    useSWR<AuthResponse['user'], Error>(
      '/auth/profile',
      fetcher,
      {
        shouldRetryOnError: false,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
      }
    )
  );
  
  return {
    data,
    error,
    isLoading,
    mutate,
    reset
  };
}

export function useUpdateProfileMutation() {
  const { submit, data, error, isLoading, reset } = useSwrMutationHelper<
    AuthResponse['user'],
    Error,
    UpdateProfileRequest
  >(useSWRMutation('/users/profile', patchFetcher<UpdateProfileRequest, AuthResponse['user']>));

  return {
    updateProfile: submit,
    data,
    error,
    isLoading,
    reset
  };
}

export function useUpdatePhoneMutation() {
  const { submit, data, error, isLoading, reset } = useSwrMutationHelper<
    AuthResponse['user'],
    Error,
    UpdatePhoneRequest
  >(useSWRMutation('/auth/profile/phone', patchFetcher<UpdatePhoneRequest, AuthResponse['user']>));

  return {
    updatePhone: submit,
    data,
    error,
    isLoading,
    reset
  };
}

export async function uploadProfilePicture(file: File): Promise<{ profilePicture: string }> {
  return uploadFileFetcher<{ profilePicture: string }>('/users/profile/picture', file);
}