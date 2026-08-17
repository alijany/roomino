import { cn } from '@/libs/style/style.util.helpers';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import { ReactNode } from 'react';

export interface StatTileProps {
  label: string;
  value: string;
  /** One line under the value — a count, a rate, a qualifier. */
  sub?: string;
  /** Percent change vs the previous period. Null means "no baseline". */
  changePercent?: number | null;
  /** Higher is worse for this metric — flips the delta colouring. */
  invertChange?: boolean;
  /** Turns the tile red when the value is non-zero and needs attention. */
  alert?: boolean;
  icon?: ReactNode;
}

/**
 * A headline number. Eight of these beat one crowded chart — the dashboard's
 * job is "what needs attention", answered at a glance.
 *
 * State is encoded in form as well as colour: an alerting tile gets a border and
 * a label change, not just a red number.
 */
export function StatTile({
  label,
  value,
  sub,
  changePercent,
  invertChange = false,
  alert = false,
  icon,
}: StatTileProps) {
  const hasChange = changePercent !== undefined && changePercent !== null;
  const rising = hasChange && (changePercent as number) > 0;
  // "Spend went up" is bad; "count of overdue went down" is good. The metric
  // decides, not the sign.
  const good = hasChange ? (invertChange ? !rising : rising) : false;

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-2xl border bg-white p-4',
        alert ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500">{label}</span>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>

      <span
        className={cn(
          'text-xl font-bold tabular-nums',
          alert ? 'text-rose-600' : 'text-slate-900'
        )}
      >
        {value}
      </span>

      <div className="flex items-center gap-2">
        {sub && <span className="text-xs text-slate-500">{sub}</span>}

        {hasChange && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
              good ? 'text-emerald-600' : 'text-amber-600'
            )}
          >
            {rising ? (
              <IconArrowUpRight className="size-3.5" />
            ) : (
              <IconArrowDownRight className="size-3.5" />
            )}
            {Math.abs(changePercent as number).toLocaleString('fa-IR')}٪
          </span>
        )}
      </div>
    </div>
  );
}
