'use client';

import { Badge } from '@/ui/atoms/ui.badge';
import { PersonLabel, Table } from '@/ui/molecules';
import { AttendanceModeBadge, BoardStatusBadge } from './attendance.component.layout';
import { AttendanceMode, BoardRow, BoardStatus } from './attendance.types';
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
            <PersonLabel name={r.employee.name} picture={r.employee.profilePicture} detail={fa(r.employee.personnelCode)} />
          ),
        },
        {
          key: 'group',
          header: groupLabel,
          render: (r) => r.workplace ?? r.jobGroup ?? '—',
          hideOnMobile: true,
        },
        {
          key: 'mode',
          header: 'نوع حضور',
          hideOnMobile: true,
          render: (r) => (r.mode === AttendanceMode.TRACKED ? <span className="text-xs text-slate-300">—</span> : <AttendanceModeBadge mode={r.mode} />),
        },
        {
          key: 'status',
          header: 'وضعیت',
          render: (r) =>
            // «بدون ثبت» who said they're in: say so, rather than «طبق شیفت».
            r.presence === 'declared' && r.status === BoardStatus.BY_SCHEDULE ? (
              <Badge tone="success" className="whitespace-nowrap">اعلام حضور شد</Badge>
            ) : (
              <BoardStatusBadge status={r.status} />
            ),
        },
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
