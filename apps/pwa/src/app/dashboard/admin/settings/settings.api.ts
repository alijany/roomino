import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { fetcher, patchFetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

/** Site-wide settings. */
export interface SiteSettings {
  /** New people cannot sign up; people with an account still log in. */
  registrationClosed: boolean;
}

export const useSiteSettings = () => useSwrHelper(useSWR<SiteSettings>('/settings', fetcher));

export const useUpdateSiteSettings = () =>
  useSwrMutationHelper(
    useSWRMutation('/settings/update', (_k: string, { arg }: { arg: Partial<SiteSettings> }) =>
      patchFetcher<Partial<SiteSettings>, SiteSettings>('/settings', { arg }),
    ),
  );
