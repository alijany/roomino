'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { jalaliLabel } from '@/app/dashboard/attendance/attendance.util';
import { useMyPayslips } from '@/app/admin/financial/payroll/payroll.api';
import { periodLabel, rial, yearOf } from '@/app/admin/financial/financial.util';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView } from '@/ui/molecules';
import { IconChevronLeft, IconReceipt2 } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';

/** The signed-in person's own payslips, one card for each finalized month. */
export default function MyPayslipsPage() {
  const { data, error, isLoading, refresh } = useMyPayslips();
  const [picked, setPicked] = useState<number | null>(null);
  // Newest year first; a chosen year that has no months (or none chosen yet) falls back to the newest.
  const years = Array.from(new Set((data ?? []).map((m) => yearOf(m.period))));
  const year = picked !== null && years.includes(picked) ? picked : years[0];
  // Oldest month first, so in the right-to-left grid the year reads from the right: شهریور، مهر، آبان.
  const shown = (data ?? []).filter((m) => yearOf(m.period) === year).sort((a, b) => a.period - b.period);

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-auto pb-6">
          <div className="ui-page-header">
            <div className="ui-page-icon">
              <IconReceipt2 className="size-6" />
            </div>
            <div className="min-w-0 flex-1 basis-48">
              <h1>فیش حقوقی من</h1>
              <p>فیش هر ماه بعد از قطعی شدن حقوق اینجا دیده می‌شود.</p>
            </div>
          </div>

          <DataView
            data={data}
            error={error}
            isLoading={isLoading}
            isEmpty={(d) => !d?.length}
            emptyMessage="هنوز فیش حقوقی‌ای برای شما ثبت نشده است."
            onRetry={refresh}
          >
            {years.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="سال">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    aria-pressed={y === year}
                    onClick={() => setPicked(y)}
                    className={`rounded-xl border px-3 py-1.5 text-sm ${y === year ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {y.toLocaleString('fa-IR', { useGrouping: false })}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((m) => {
                const paid = (m.salary <= 0 || m.salaryPaidOn) && (m.extras <= 0 || m.extrasPaidOn);
                const paidOn = m.salaryPaidOn ?? m.extrasPaidOn;
                return (
                  <Link key={m.id} href={`/dashboard/payslips/${m.id}`} className="ui-surface flex items-center gap-3 p-3 hover:border-slate-300">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-semibold text-slate-800">{periodLabel(m.period)}</div>
                      <div className="text-sm tabular-nums text-slate-600">
                        {rial(m.net)} <span className="text-[10px] text-slate-400">ریال</span>
                      </div>
                    </div>
                    {paid && paidOn ? <Badge tone="success">پرداخت شد · {jalaliLabel(paidOn)}</Badge> : <Badge tone="neutral">در انتظار پرداخت</Badge>}
                    <IconChevronLeft className="size-4 text-slate-300" />
                  </Link>
                );
              })}
            </div>
          </DataView>
        </div>
      </DashbaordLayout>
    </ProtectedRoute>
  );
}
