'use client';

import { Table, TableColumn } from '@/ui/molecules';
import { ReactNode } from 'react';
import { RequestStatusBadge } from './attendance.component.layout';
import { AttendanceRequest } from './attendance.types';
import { durationLabel, fa, jalaliDateTime } from './attendance.util';

/** Requests as a table; the employee column is for review queues. */
export function RequestTable({
  requests,
  showEmployee = false,
  onOpen,
  actions,
}: {
  requests: AttendanceRequest[];
  showEmployee?: boolean;
  onOpen?: (request: AttendanceRequest) => void;
  actions?: (request: AttendanceRequest) => ReactNode;
}) {
  const columns: TableColumn<AttendanceRequest>[] = [
    ...(showEmployee
      ? [
          {
            key: 'employee',
            header: 'پرسنل',
            render: (r: AttendanceRequest) => (
              <div>
                <div className="font-medium text-slate-800">{r.employee?.name ?? '—'}</div>
                <div className="text-xs text-slate-400">{fa(r.employee?.personnelCode)}</div>
              </div>
            ),
          },
        ]
      : []),
    { key: 'type', header: 'نوع', render: (r) => r.typeLabel },
    {
      key: 'period',
      header: 'تاریخ',
      render: (r) => <span className="tabular-nums">{fa(r.periodLabel)}</span>,
    },
    { key: 'duration', header: 'مدت', render: (r) => durationLabel(r.durationMinutes), hideOnMobile: true },
    { key: 'status', header: 'وضعیت', render: (r) => <RequestStatusBadge status={r.status} /> },
    {
      key: 'created',
      header: 'ثبت',
      render: (r) => <span className="text-xs text-slate-500">{jalaliDateTime(r.createdAt)}</span>,
      hideOnMobile: true,
    },
    ...(actions ? [{ key: 'actions', header: '', render: (r: AttendanceRequest) => actions(r) }] : []),
  ];

  return <Table columns={columns} rows={requests} rowKey={(r) => r.id} onRowClick={onOpen} />;
}
