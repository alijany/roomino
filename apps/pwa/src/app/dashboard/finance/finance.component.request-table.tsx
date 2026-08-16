'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { Table, TableColumn } from '@/ui/molecules';
import { useRouter } from 'next/navigation';
import { FINANCE_ROUTES } from './finance.constants';
import { StatusBadge } from './finance.component.status-badge';
import { PaymentRequest } from './finance.types';
import { describeDueDate, formatRequestAmount, isOverdue } from './finance.util';

interface RequestTableProps {
  requests: PaymentRequest[];
  /** Drop columns that repeat information already implied by the screen. */
  hide?: Array<'requester' | 'status'>;
}

/**
 * The list view shared by every finance queue. Ordering is decided by the API
 * (soonest deadline first) — this only renders.
 */
export function RequestTable({ requests, hide = [] }: RequestTableProps) {
  const router = useRouter();

  const columns: TableColumn<PaymentRequest>[] = [
    {
      key: 'title',
      header: 'عنوان',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-slate-800">{row.title}</span>
          <span className="text-xs text-slate-500">{row.category?.name}</span>
        </div>
      ),
    },
    {
      key: 'payee',
      header: 'طرف‌حساب',
      render: (row) => <span className="text-slate-600">{row.payeeName}</span>,
    },
    {
      key: 'amount',
      header: 'مبلغ',
      numeric: true,
      render: (row) => (
        <span className="font-semibold text-slate-800">
          {formatRequestAmount(row)}
        </span>
      ),
    },
    {
      key: 'due',
      header: 'مهلت پرداخت',
      numeric: true,
      render: (row) => (
        <span
          className={cn(
            'text-sm',
            isOverdue(row) ? 'text-rose-600 font-medium' : 'text-slate-600'
          )}
        >
          {describeDueDate(row)}
        </span>
      ),
    },
  ];

  if (!hide.includes('requester')) {
    columns.splice(2, 0, {
      key: 'requester',
      header: 'ثبت‌کننده',
      render: (row) => (
        <span className="text-slate-600">{row.requester?.name || '—'}</span>
      ),
    });
  }

  if (!hide.includes('status')) {
    columns.push({
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} />,
    });
  }

  return (
    <Table
      columns={columns}
      rows={requests}
      rowKey={(row) => row.id}
      onRowClick={(row) => router.push(FINANCE_ROUTES.request(row.id))}
    />
  );
}
