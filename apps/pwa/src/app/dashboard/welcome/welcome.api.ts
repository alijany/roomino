import { useSwrHelper } from '@/libs/api/api.hook.use-swr-helper';
import { fetcher, postFetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import { WelcomeData } from './welcome.types';

export function useWelcome() {
  return useSwrHelper(useSWR<WelcomeData>('/welcome', fetcher));
}

export const greetNewcomer = (id: number) =>
  postFetcher<Record<string, never>, void>(`/welcome/${id}/greet`, { arg: {} });

export const dismissWelcome = (userIds: number[]) =>
  postFetcher<{ userIds: number[] }, void>('/welcome/dismiss', { arg: { userIds } });
