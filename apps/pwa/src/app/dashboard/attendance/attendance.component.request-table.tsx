'use client';

import { PersonLabel, Table, TableColumn } from '@/ui/molecules';
import { ReactNode } from 'react';
import { Badge } from '@/ui/atoms/ui.badge';
import { RequestStatusBadge } from './attendance.component.layout';
import { AttendanceRequest, RequestStatus } from './attendance.types';
import { requestDurationLabel, fa, jalaliDateTime } from './attendance.util';

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
              <PersonLabel
                name={r.employee?.name}
                picture={r.employee?.profilePicture}
                fallback="—"
                detail={fa(r.employee?.personnelCode)}
              />
            ),
          },
        ]
      : []),
    {
      key: 'type',
      header: 'نوع',
      render: (r) => (
        <span className="flex flex-wrap items-center gap-1.5">
          {r.typeLabel}
          {r.autoSuggested && (
            <Badge tone="info" withDot={false}>
              {r.status === RequestStatus.APPROVED ? 'ثبت خودکار' : 'پیشنهاد خودکار'}
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'تاریخ',
      render: (r) => <span className="tabular-nums">{fa(r.periodLabel)}</span>,
    },
    { key: 'duration', header: 'مدت', render: (r) => requestDurationLabel(r), hideOnMobile: true },
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
