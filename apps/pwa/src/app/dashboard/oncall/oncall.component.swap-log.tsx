'use client';

import { DataView } from '@/ui/molecules';
import { FormModal } from '../attendance/attendance.component.layout';
import { jalaliLabel } from '../attendance/attendance.util';
import { useOnCallSwapLog } from './oncall.api';
import { StatusBadge, swapSentence } from './oncall.component.swap-card';

/** What colleagues swapped between themselves; read-only for admin and HR. */
export function OnCallSwapLog({ onClose }: { onClose: () => void }) {
  const { data, error, isLoading, refresh } = useOnCallSwapLog();
  return (
    <FormModal isOpen onClose={onClose} wide title="گزارش جابه‌جایی‌های کشیک">
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => d.items.length === 0}
        emptyMessage="هنوز جابه‌جایی‌ای ثبت نشده است."
        onRetry={refresh}
      >
        {data && (
          <ul className="space-y-2">
            {data.items.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                <span className="w-24 shrink-0 text-xs text-slate-400">{jalaliLabel(s.createdAt.slice(0, 10))}</span>
                <span className="min-w-0 flex-1 basis-56 text-slate-700">{swapSentence(s)}</span>
                <StatusBadge status={s.status} coordinated={s.coordinated} />
              </li>
            ))}
          </ul>
        )}
      </DataView>
    </FormModal>
  );
}
