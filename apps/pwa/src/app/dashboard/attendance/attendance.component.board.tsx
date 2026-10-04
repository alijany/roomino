'use client';

import { Table } from '@/ui/molecules';
import { BoardStatusBadge } from './attendance.component.layout';
import { BoardRow } from './attendance.types';
import { fa } from './attendance.util';

/** Today's status of each person — the admin dashboard and "my team". */
export function BoardTable({
  rows,
  onOpen,
  groupLabel = 'محل کار',
}: {
  rows: BoardRow[];
  onOpen?: (row: BoardRow) => void;
  groupLabel?: string;
}) {
  return (
    <Table
      rows={rows}
      rowKey={(r) => r.employee.id}
      onRowClick={onOpen}
      columns={[
        {
          key: 'name',
          header: 'پرسنل',
          render: (r) => (
            <div>
              <div className="font-medium text-slate-800">{r.employee.name}</div>
              <div className="text-xs text-slate-400">{fa(r.employee.personnelCode)}</div>
            </div>
          ),
        },
        {
          key: 'group',
          header: groupLabel,
          render: (r) => r.workplace ?? r.jobGroup ?? '—',
          hideOnMobile: true,
        },
        { key: 'status', header: 'وضعیت', render: (r) => <BoardStatusBadge status={r.status} /> },
        {
          key: 'shift',
          header: 'شروع شیفت',
          render: (r) => <span className="tabular-nums">{fa(r.shiftStart) || '—'}</span>,
          hideOnMobile: true,
        },
        { key: 'in', header: 'ورود', render: (r) => <span className="tabular-nums">{fa(r.checkIn) || '—'}</span> },
        { key: 'out', header: 'خروج', render: (r) => <span className="tabular-nums">{fa(r.checkOut) || '—'}</span> },
      ]}
    />
  );
}
