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

/** Telegram bot and SMS credentials. Secrets come back only as «is set» and a hint. */
export interface IntegrationSettings {
  telegram: { botUsername: string; apiBase: string; webhookUrl: string; tokenSet: boolean; tokenHint: string | null };
  sms: { provider: 'asanak' | 'smsir'; smsirLine: string; smsirOtpTemplate: string; smsirOtpParam: string; smsirKeySet: boolean; smsirKeyHint: string | null; apiUrl: string; username: string; source: string; passwordSet: boolean; passwordHint: string | null };
}

export interface IntegrationChanges {
  telegram?: { botToken?: string; botUsername?: string; apiBase?: string; webhookUrl?: string };
  sms?: { provider?: 'asanak' | 'smsir'; smsirApiKey?: string; smsirLine?: string; smsirOtpTemplate?: string; smsirOtpParam?: string; apiUrl?: string; username?: string; password?: string; source?: string };
}

export const useIntegrationSettings = () =>
  useSwrHelper(useSWR<IntegrationSettings>('/admin/settings/integrations', fetcher));

export const useUpdateIntegrationSettings = () =>
  useSwrMutationHelper(
    useSWRMutation('/admin/settings/integrations/update', (_k: string, { arg }: { arg: IntegrationChanges }) =>
      patchFetcher<IntegrationChanges, IntegrationSettings>('/admin/settings/integrations', { arg }),
    ),
  );
