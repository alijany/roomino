'use client';

import { formatMoney } from '@/libs/format/format.util';
import { Button } from '@/ui/atoms';
import { PersonLabel, Table, TableColumn } from '@/ui/molecules';
import { IconEye } from '@tabler/icons-react';
import { StatusBadge } from './advance-request.component.status-badge';
import { AdvanceRequest } from './advance-request.types';
import { formatJalali } from './advance-request.util';

interface RequestTableProps {
  requests: AdvanceRequest[];
  /** Hide on a screen where every row is already known to be the viewer's own. */
  showRequester?: boolean;
  onViewDetails: (row: AdvanceRequest) => void;
}

export function RequestTable({ requests, showRequester = true, onViewDetails }: RequestTableProps) {
  const columns: TableColumn<AdvanceRequest>[] = [];

  if (showRequester) {
    columns.push({
      key: 'requester',
      header: 'درخواست‌دهنده',
      render: (row) => (
        <PersonLabel name={row.requester?.name} picture={row.requester?.profilePicture} fallback="—" avatarClassName="size-7" />
      ),
    });
  }

  columns.push(
    {
      key: 'amount',
      header: 'مبلغ',
      render: (row) => (
        <span className="font-semibold text-slate-800">
          {formatMoney(row.amountRial)}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'توضیح',
      render: (row) => (
        <span className="text-slate-600">{row.reason || '—'}</span>
      ),
    },
    {
      key: 'created',
      header: 'تاریخ درخواست',
      numeric: true,
      render: (row) => (
        <span className="text-sm text-slate-600">{formatJalali(row.created_at)}</span>
      ),
    },
    {
      key: 'decided',
      header: 'تاریخ تأیید',
      numeric: true,
      render: (row) => (
        <span className="text-sm text-slate-600">{formatJalali(row.decidedAt)}</span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'view',
      header: '',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={(event) => {
            event.stopPropagation();
            onViewDetails(row);
          }}
        >
          <IconEye className="size-4" />
          مشاهده جزئیات
        </Button>
      ),
    },
  );

  return (
    <Table
      columns={columns}
      rows={requests}
      rowKey={(row) => row.id}
      onRowClick={onViewDetails}
    />
  );
}
