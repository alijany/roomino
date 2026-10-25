'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import Link from 'next/link';
import { ReactNode, useMemo, useState } from 'react';
import { ReviewBase } from './attendance.api';
import { BoardTable } from './attendance.component.board';
import { Panel, RequestStatusBadge } from './attendance.component.layout';
import { RequestDetailModal, ReviewActions } from './attendance.component.review';
import { ScheduleModeBoardNotice } from './attendance.component.schedule-mode';
import { AttendanceRequest, Board, BoardRow, BoardStatus } from './attendance.types';
import { fa } from './attendance.util';

type Group = 'office' | 'remote' | 'leave' | 'waiting' | 'missing';
type Filter = Group | 'all';

/** Which board statuses make up each tile. */
const GROUPS: Record<Group, BoardStatus[]> = {
  office: [BoardStatus.WORKING, BoardStatus.DONE, BoardStatus.BY_SCHEDULE],
  remote: [BoardStatus.REMOTE, BoardStatus.REMOTE_DONE],
  leave: [BoardStatus.ON_LEAVE],
  waiting: [BoardStatus.NOT_YET, BoardStatus.AWAITING],
  missing: [BoardStatus.MISSING],
};

const TILES: Array<{ id: Group; label: string; accent: string; always: boolean }> = [
  { id: 'office', label: 'در محل کار', accent: 'text-emerald-600', always: true },
  { id: 'remote', label: 'دورکاری', accent: 'text-sky-600', always: true },
  { id: 'leave', label: 'مرخصی', accent: 'text-violet-600', always: true },
  { id: 'waiting', label: 'هنوز نیامده', accent: 'text-slate-600', always: false },
  { id: 'missing', label: 'ورود ثبت نشده', accent: 'text-rose-600', always: false },
];

function Tile({
  label,
  value,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'ui-surface flex min-h-20 flex-col items-start gap-1 p-3 text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:p-4',
        active ? 'ring-2 ring-brand-500' : 'hover:bg-slate-50',
      )}
    >
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className={cn('text-xl font-bold tabular-nums', value ? accent : 'text-slate-300')}>{fa(value)}</span>
    </button>
  );
}

/** The newest pending requests, each opening its details with approve/reject. */
function PendingRequestsPanel({
  requests,
  total,
  href,
  onOpen,
}: {
  requests: AttendanceRequest[];
  total: number;
  href: string;
  onOpen: (request: AttendanceRequest) => void;
}) {
  return (
    <Panel className="gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold text-slate-700">
          درخواست‌های در انتظار
          {total > 0 && (
            <span className="rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-700">{fa(total)}</span>
          )}
        </span>
        <Link href={href} className="text-xs text-sky-600">
          همه
        </Link>
      </div>
      {requests.length ? (
        <ul className="divide-y divide-slate-100 text-sm">
          {requests.map((request) => (
            <li key={request.id}>
              <button
                type="button"
                onClick={() => onOpen(request)}
                className="flex w-full items-center justify-between gap-2 rounded-lg py-2 text-right transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-700">{request.employee?.name}</div>
                  <div className="text-xs text-slate-500">
                    {request.typeLabel} · <span className="tabular-nums">{fa(request.periodLabel)}</span>
                  </div>
                </div>
                <RequestStatusBadge status={request.status} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">درخواستی در انتظار نیست.</p>
      )}
    </Panel>
  );
}

/**
 * Today at a glance, for admin/HR (everyone) and for approvers (their team):
 * tiles that count who is at work, working remotely or on leave
 * — each filters the table below — and the newest pending requests, which open
 * with approve/reject right here.
 */
export function BoardOverview({
  data,
  onOpenRow,
  groupLabel,
  requests,
  onChanged,
  toolbar,
  emptyMessage,
}: {
  data: Board;
  onOpenRow: (row: BoardRow) => void;
  groupLabel?: string;
  /** Where the pending requests are decided, and the full list. */
  requests: { base: ReviewBase; href: string };
  onChanged: () => void;
  /** Above the table — a search box. */
  toolbar?: ReactNode;
  emptyMessage: string;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [viewing, setViewing] = useState<AttendanceRequest | null>(null);

  const counts = useMemo(() => {
    const result = {} as Record<Group, number>;
    for (const group of Object.keys(GROUPS) as Group[]) {
      result[group] = data.rows.filter((row) => GROUPS[group].includes(row.status)).length;
    }
    return result;
  }, [data.rows]);

  const rows = filter === 'all' ? data.rows : data.rows.filter((row) => GROUPS[filter].includes(row.status));

  return (
    <div className="space-y-3">
      {data.scheduleMode && <ScheduleModeBoardNotice />}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-3" role="group" aria-label="فیلتر وضعیت امروز">
        <Tile
          label="همه‌ی پرسنل"
          value={data.rows.length}
          accent="text-slate-800"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        {TILES.filter((tile) => tile.always || counts[tile.id] > 0).map((tile) => (
          <Tile
            key={tile.id}
            label={tile.label}
            value={counts[tile.id]}
            accent={tile.accent}
            active={filter === tile.id}
            onClick={() => setFilter(filter === tile.id ? 'all' : tile.id)}
          />
        ))}
        <Link
          href={requests.href}
          className="ui-surface flex min-h-20 flex-col items-start gap-1 p-3 text-right transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:p-4"
        >
          <span className="text-xs font-medium text-slate-500">درخواست در انتظار</span>
          <span className={cn('text-xl font-bold tabular-nums', data.stats.pending ? 'text-amber-600' : 'text-slate-300')}>
            {fa(data.stats.pending)}
          </span>
        </Link>
      </div>

      {data.stats.notDeclared > 0 && !data.scheduleMode && (
        <p className="rounded-2xl bg-slate-50 px-4 py-2.5 text-xs leading-6 text-slate-600">
          {fa(data.stats.notDeclared)} نفر از پرسنلِ «بدون ثبت» هنوز حضور امروز را اعلام نکرده‌اند. امروز هنوز تمام
          نشده است؛ روزی که تا پایانش اعلام نشود غیبت حساب می‌شود و در بازبینی آخر ماه از گزارش فرد می‌توانید حاضر
          بودنش را تایید کنید.
        </p>
      )}

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel className="gap-3 xl:col-span-2">
          {toolbar}
          {rows.length ? (
            <BoardTable rows={rows} groupLabel={groupLabel} onOpen={onOpenRow} />
          ) : data.rows.length ? (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-slate-400">
              کسی در این وضعیت نیست.
              <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                نمایش همه
              </Button>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">{emptyMessage}</p>
          )}
        </Panel>

        <PendingRequestsPanel
          requests={data.pendingRequests ?? []}
          total={data.stats.pending}
          href={requests.href}
          onOpen={setViewing}
        />
      </div>

      <RequestDetailModal
        request={viewing}
        onClose={() => setViewing(null)}
        actions={
          viewing && (
            <ReviewActions
              request={viewing}
              base={requests.base}
              size="md"
              onDone={() => {
                setViewing(null);
                onChanged();
              }}
            />
          )
        }
      />
    </div>
  );
}
