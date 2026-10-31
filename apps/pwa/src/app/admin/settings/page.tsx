'use client';

import { PageHeader } from '@/app/dashboard/attendance/attendance.component.layout';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { ToggleSwitch } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconSettings } from '@tabler/icons-react';
import { ReactNode, useState } from 'react';
import { toast } from 'react-toastify';
import { useSiteSettings, useUpdateSiteSettings } from './settings.api';

/** Site-wide settings. Admin and CEO only. */
export default function SiteSettingsPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.siteSettings.roles}>
      <DashbaordLayout>
        <SettingsContent />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function SettingsContent() {
  const { data, error, isLoading, refresh } = useSiteSettings();
  const update = useUpdateSiteSettings();
  // Closing registration asks first; opening it again does not.
  const [confirmClose, setConfirmClose] = useState(false);

  const setClosed = async (registrationClosed: boolean) => {
    try {
      await update.submit({ registrationClosed });
      toast.success(registrationClosed ? 'ثبت‌نام بسته شد' : 'ثبت‌نام باز شد');
      setConfirmClose(false);
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'ذخیره نشد');
    }
  };

  return (
    <div className="flex grow flex-col gap-4 overflow-auto pb-6">
      <PageHeader icon={<IconSettings className="size-6" />} title="تنظیمات سایت" subtitle="تنظیمات کل سیستم" />

      <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
        {data && (
          <Section title="ثبت‌نام" hint="کنترل ورود کاربران جدید به سیستم">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-slate-800">بستن ثبت‌نام</div>
                <p className="mt-0.5 text-xs leading-5 text-slate-400">
                  کسی که حساب ندارد نمی‌تواند وارد شود یا ثبت‌نام کند و پیام «ثبت‌نام بسته است» می‌بیند. کاربران فعلی مثل همیشه وارد می‌شوند.
                </p>
              </div>
              <ToggleSwitch
                aria-label="بستن ثبت‌نام"
                checked={data.registrationClosed}
                disabled={update.isLoading}
                onChange={(on) => (on ? setConfirmClose(true) : void setClosed(false))}
              />
            </div>
          </Section>
        )}
      </DataView>

      <ConfirmModal
        isOpen={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => setClosed(true)}
        title="بستن ثبت‌نام"
        message="از این لحظه کاربر جدید نمی‌تواند ثبت‌نام کند. کاربران فعلی تأثیری نمی‌بینند. ادامه می‌دهید؟"
        confirmButtonText="بستن ثبت‌نام"
        cancelButtonText="بازگشت"
        isLoading={update.isLoading}
      />
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="ui-surface space-y-4 p-4 lg:p-5">
      <div>
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
