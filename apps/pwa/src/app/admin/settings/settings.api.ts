import { useSwrHelper, useSwrMutationHelper } from '@/libs/api/api.hook.use-swr-helper';
import { fetcher, patchFetcher } from '@/libs/api/api.util.fetcher';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

/** Site-wide settings. */
export interface SiteSettings {
  /** New people cannot sign up; people with an account still log in. */
  registrationClosed: boolean;
}

/** What is switched on, for pages that show or hide fields by it. */
export const useFeatures = () => useSwrHelper(useSWR<{ supplementaryInsurance: boolean }>('/admin/settings/features', fetcher));

export const useSiteSettings = () => useSwrHelper(useSWR<SiteSettings>('/admin/settings', fetcher));

export const useUpdateSiteSettings = () =>
  useSwrMutationHelper(
    useSWRMutation('/admin/settings/update', (_k: string, { arg }: { arg: Partial<SiteSettings> }) =>
      patchFetcher<Partial<SiteSettings>, SiteSettings>('/admin/settings', { arg }),
    ),
  );
