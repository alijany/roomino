'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { DataView } from '@/ui/molecules';
import { useRequestActivity } from './finance.api';
import { ACTIVITY_LABELS } from './finance.constants';
import { formatJalaliDateTime } from './finance.util';

/** Actions that changed the money or ended the request get a stronger marker. */
const EMPHASISED = new Set(['paid', 'rejected', 'payment_failed', 'cancelled']);

export function RequestTimeline({ requestId }: { requestId: number }) {
  const { data, error, isLoading, refresh } = useRequestActivity(requestId);

  return (
    <DataView
      data={data}
      error={error}
      isLoading={isLoading}
      variant="inline"
      isEmpty={(d) => !d?.items?.length}
      emptyMessage="رویدادی ثبت نشده است"
      onRetry={refresh}
    >
      <ol className="relative space-y-4 border-r border-slate-200 pr-4">
        {data?.items?.map((entry) => (
          <li key={entry.id} className="relative">
            <span
              className={cn(
                'absolute -right-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-white',
                EMPHASISED.has(entry.action) ? 'bg-slate-800' : 'bg-slate-300'
              )}
            />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium text-slate-800">
                {ACTIVITY_LABELS[entry.action] ?? entry.action}
              </span>
              {entry.actor?.name && (
                <span className="text-xs text-slate-500">توسط {entry.actor.name}</span>
              )}
              <span className="text-xs text-slate-400 tabular-nums">
                {formatJalaliDateTime(entry.created_at)}
              </span>
            </div>
            {entry.comment && (
              <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {entry.comment}
              </p>
            )}
          </li>
        ))}
      </ol>
    </DataView>
  );
}
