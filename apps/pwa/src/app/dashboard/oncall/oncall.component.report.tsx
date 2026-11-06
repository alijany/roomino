'use client';

import { Button } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconFileSpreadsheet } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { downloadFile } from '@/app/admin/financial/financial.util';
import { FormModal } from '../attendance/attendance.component.layout';
import { formatMoney } from '@/libs/format/format.util';
import { errorMessage, fa, jalaliLabel } from '../attendance/attendance.util';
import { useOnCallReport } from './oncall.api';

/** Minutes as `۲:۱۳` — compact enough for a table; nothing is `—`. */
const clock = (minutes: number) => (minutes ? fa(`${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`) : '—');

/** Hours on call per person for the period shown, with an Excel export; admin and HR. */
export function OnCallReport({ year, month, onClose }: { year: number; month: number; onClose: () => void }) {
  const { data, error, isLoading, refresh } = useOnCallReport(year, month);
  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    setExporting(true);
    try {
      await downloadFile(`/oncall/report/export?year=${year}&month=${month}`, `oncall-report-${year}-${month}.xlsx`);
    } catch (e) {
      toast.error(errorMessage(e, 'دریافت فایل انجام نشد'));
    } finally {
      setExporting(false);
    }
  };

  const total = data?.items.reduce((sum, i) => sum + i.totalMinutes, 0) ?? 0;
  const totalAmount = data?.items.reduce((sum, i) => sum + i.amount, 0) ?? 0;

  return (
    <FormModal
      isOpen
      onClose={onClose}
      wide
      title={data ? `گزارش کشیک ${jalaliLabel(data.period.start)} تا ${jalaliLabel(data.period.end)}` : 'گزارش کشیک'}
      footer={
        <>
          <Button className="flex-1 gap-1" disabled={exporting || !data?.items.length} onClick={exportExcel}>
            <IconFileSpreadsheet className="size-4" />
            {exporting ? 'در حال آماده‌سازی...' : 'خروجی اکسل'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            بستن
          </Button>
        </>
      }
    >
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => d.items.length === 0}
        emptyMessage="افرادی برای کشیک انتخاب نشده‌اند."
        onRetry={refresh}
      >
        {data && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400">
                  <th className="py-2 text-start font-medium">نام</th>
                  <th className="py-2 font-medium">روز</th>
                  <th className="py-2 font-medium">سپری‌شده</th>
                  <th className="py-2 font-medium">باقی‌مانده</th>
                  <th className="py-2 font-medium">جمع</th>
                  <th className="py-2 font-medium">مبلغ (تومان)</th>
                  <th className="py-2 text-start font-medium">جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.user.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 text-slate-800">{item.user.name ?? fa(item.user.phone)}</td>
                    <td className="py-2 text-center text-slate-600">{fa(item.days)}</td>
                    <td className="py-2 text-center text-slate-600">{clock(item.doneMinutes)}</td>
                    <td className="py-2 text-center text-slate-600">{clock(item.remainingMinutes)}</td>
                    <td className="py-2 text-center font-semibold text-slate-800">{clock(item.totalMinutes)}</td>
                    <td className="py-2 text-center text-slate-700">{formatMoney(item.amount, { withUnit: false, emptyText: '—' })}</td>
                    <td className="py-2 text-xs text-slate-400">
                      {([
                        ['عادی', item.byType.normal],
                        ['پنج‌شنبه', item.byType.thursday],
                        ['جمعه', item.byType.friday],
                        ['تعطیل', item.byType.holiday],
                      ] as const)
                        .filter(([, minutes]) => minutes > 0)
                        .map(([label, minutes]) => `${label} ${clock(minutes)}`)
                        .join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 text-xs text-slate-500">
                  <td className="py-2" colSpan={4}>
                    جمع کل
                  </td>
                  <td className="py-2 text-center font-semibold text-slate-700">{clock(total)}</td>
                  <td className="py-2 text-center font-semibold text-slate-700">{formatMoney(totalAmount, { withUnit: false })}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </DataView>
    </FormModal>
  );
}
