'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { FormModal } from '@/app/dashboard/attendance/attendance.component.layout';
import { IconPlus, IconReceiptTax } from '@tabler/icons-react';
import { getYear } from 'date-fns-jalali';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { usePayrollYear, usePayrollYears, useSavePayrollYear, useStartPayrollYear } from './payroll-settings.api';
import { Draft, GroupPanel, InclusionPanel, YearSetup } from './payroll-settings.component.panels';
import { PayrollInclusion } from './payroll-settings.types';

const yearLabel = (year: number) => year.toLocaleString('fa-IR', { useGrouping: false });
const latin = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** The legal payroll parameters, one set per Jalali year. Admin-only. */
export default function PayrollSettingsPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.payrollSettings.roles}>
      <DashbaordLayout>
        <Suspense fallback={<DataView isLoading />}>
          <PayrollSettingsContent />
        </Suspense>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function PayrollSettingsContent() {
  const years = usePayrollYears();
  // The chosen year lives in the address (`?year=1404`), so a refresh or a shared link keeps it.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = Number(searchParams.get('year'));
  const picked = Number.isInteger(fromUrl) && fromUrl > 0 ? fromUrl : null;
  const setPicked = (value: number) => router.replace(`${pathname}?year=${value}`);
  const [newYearOpen, setNewYearOpen] = useState(false);
  const [newYear, setNewYear] = useState('');

  // The current Jalali year if it is known, otherwise the newest one.
  const year = useMemo(() => {
    if (picked) return picked;
    const list = years.data?.years ?? [];
    const current = getYear(new Date());
    return list.includes(current) ? current : (list[0] ?? null);
  }, [picked, years.data]);

  const data = usePayrollYear(year);
  const start = useStartPayrollYear();
  const save = useSavePayrollYear();

  const [draft, setDraft] = useState<Draft>({});
  const [inclusion, setInclusion] = useState<Record<string, PayrollInclusion>>({});

  // Start the edits from what the server holds, whenever that changes.
  useEffect(() => {
    setDraft({});
    setInclusion(Object.fromEntries((data.data?.inclusion ?? []).map((row) => [row.key, row])));
  }, [data.data]);

  const items = data.data?.items ?? [];
  const changedValues = Object.fromEntries(
    Object.entries(draft).filter(([key, value]) => items.find((i) => i.key === key)?.value !== value),
  );
  const changedInclusion = Object.fromEntries(
    (data.data?.inclusion ?? [])
      .filter((row) => {
        const now = inclusion[row.key];
        return now && (now.insurable !== row.insurable || now.taxable !== row.taxable);
      })
      .map((row) => [row.key, { insurable: inclusion[row.key].insurable, taxable: inclusion[row.key].taxable }]),
  );
  const dirty = Object.keys(changedValues).length > 0 || Object.keys(changedInclusion).length > 0;

  const handleSave = async () => {
    if (!year) return;
    try {
      await save.submit({ year, data: { values: changedValues, inclusion: changedInclusion } });
      toast.success(`تنظیمات سال ${yearLabel(year)} ذخیره شد`);
      data.refresh();
    } catch (error) {
      toast.error((error as Error)?.message ?? 'ذخیره انجام نشد');
    }
  };

  const handleStart = async (copyFrom?: number) => {
    if (!year) return;
    try {
      await start.submit({ year, copyFrom });
      toast.success(`سال ${yearLabel(year)} ساخته شد`);
      data.refresh();
      years.refresh();
    } catch (error) {
      toast.error((error as Error)?.message ?? 'ساخت سال انجام نشد');
    }
  };

  const openNewYear = () => {
    const known = years.data?.years ?? [];
    setNewYear(String((known[0] ?? getYear(new Date())) + 1));
    setNewYearOpen(true);
  };

  const confirmNewYear = () => {
    const value = Number(latin(newYear));
    if (!Number.isInteger(value) || value < 1300 || value > 1500) {
      toast.error('سال نامعتبر است');
      return;
    }
    setPicked(value);
    setNewYearOpen(false);
  };

  const yearItems = [...new Set([...(years.data?.years ?? []), ...(year ? [year] : [])])]
    .sort((a, b) => b - a)
    .map((y) => ({ value: y, label: yearLabel(y) }));

  return (
    <div className="flex grow flex-col space-y-3 overflow-auto pb-6">
      <div className="ui-page-header">
        <div className="ui-page-icon">
          <IconReceiptTax className="size-6" />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <h1>تنظیمات حقوق و دستمزد</h1>
          <p>پارامترهای قانونی هر سال: حداقل مزد، مزایا، بیمه، مالیات و نرخ‌ها</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-28">
            <Dropdown
              items={yearItems}
              value={year}
              onChange={(value) => {
                if (value) setPicked(Number(value));
              }}
              variant="outline"
              placeholder="سال"
            />
          </div>
          <Button variant="outline" className="gap-1" onClick={openNewYear}>
            <IconPlus className="size-4" />
            سال جدید
          </Button>
          {dirty && (
            <Button disabled={save.isLoading} onClick={handleSave}>
              {save.isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          )}
        </div>
      </div>

      <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700" role="note">
        همه‌ی مبالغ این صفحه به «ریال» هستند.
      </p>

      <DataView
        data={year ? data.data : years.data}
        error={year ? data.error : years.error}
        isLoading={years.isLoading || (Boolean(year) && data.isLoading)}
        variant="inline"
        onRetry={() => {
          years.refresh();
          data.refresh();
        }}
      >
        {year && data.data && !data.data.exists && (
          <YearSetup
            year={year}
            hasOfficial={data.data.hasOfficial}
            savedYears={(years.data?.years ?? []).filter((y) => y !== year)}
            busy={start.isLoading}
            onStart={handleStart}
          />
        )}

        {year && data.data?.exists && (
          <div className="space-y-3">
            {data.data.groups.map((group) => (
              <GroupPanel
                key={group}
                title={group}
                items={items.filter((i) => i.group === group)}
                draft={draft}
                onChange={(key, value) => setDraft((prev) => ({ ...prev, [key]: value }))}
              />
            ))}
            <InclusionPanel
              rows={Object.values(inclusion)}
              onChange={(key, change) => setInclusion((prev) => ({ ...prev, [key]: { ...prev[key], ...change } }))}
            />
          </div>
        )}
      </DataView>

      <FormModal
        isOpen={newYearOpen}
        onClose={() => setNewYearOpen(false)}
        title="سال جدید"
        footer={
          <>
            <Button className="flex-1" onClick={confirmNewYear}>
              ادامه
            </Button>
            <Button variant="ghost" className="flex-1 bg-slate-100" onClick={() => setNewYearOpen(false)}>
              لغو
            </Button>
          </>
        }
      >
        <Input label="سال شمسی" dir="ltr" className="text-left" inputMode="numeric" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
        <p className="text-xs text-slate-400">در مرحله‌ی بعد انتخاب می‌کنید از مقادیر رسمی شروع شود یا از سالی که ذخیره کرده‌اید.</p>
      </FormModal>
    </div>
  );
}
