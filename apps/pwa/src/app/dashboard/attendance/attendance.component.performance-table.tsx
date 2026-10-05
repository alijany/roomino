'use client';

import { Badge } from '@/ui/atoms/ui.badge';
import { Table } from '@/ui/molecules';
import type { TableColumn } from '@/ui/molecules/table/ui.table';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import { PerformanceQuery, PerformanceRow } from './attendance.types';
import { fa, hm } from './attendance.util';
import { performanceHref, PerformanceView } from './attendance.util.performance';

const duration = (minutes: number) => <bdi dir="ltr">{hm(minutes)}</bdi>;

export function PerformanceTable({
  rows,
  query,
  view,
}: {
  rows: PerformanceRow[];
  query: PerformanceQuery;
  view: PerformanceView;
}) {
  const { detailed } = view;
  const columns: TableColumn<PerformanceRow>[] = [
    {
      key: 'name',
      header: 'پرسنل',
      render: (row) => (
        <div className="min-w-36 text-right">
          <Link
            href={performanceHref(query, row.employee.id, view)}
            className="rounded font-semibold text-slate-800 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {row.employee.name ?? 'بدون نام'}
          </Link>
          <div className="mt-1 text-xs text-slate-500">کد {fa(row.employee.personnelCode)}</div>
          <div className="mt-1 text-xs text-slate-400">
            {row.workplace ?? 'بدون محل کار'}
            {row.jobGroup && ` · ${row.jobGroup}`}
          </div>
        </div>
      ),
    },
    {
      key: 'worked',
      header: 'کارکرد / موظفی',
      numeric: true,
      render: (row) => (
        <div className="whitespace-nowrap">
          <span className="font-semibold">{duration(row.summary.worked)}</span>
          <div className="mt-1 text-xs text-slate-400">موظفی {duration(row.summary.required)}</div>
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'تراز کارکرد',
      numeric: true,
      render: (row) => (
        <div
          className={`whitespace-nowrap font-semibold ${
            row.summary.balance < 0 ? 'text-rose-600' : row.summary.balance > 0 ? 'text-emerald-600' : 'text-slate-500'
          }`}
        >
          {duration(row.summary.balance)}
          <div className="mt-1 text-[11px] font-normal">
            {row.summary.balance < 0 ? 'کسری' : row.summary.balance > 0 ? 'مازاد' : 'متوازن'}
          </div>
        </div>
      ),
    },
    {
      key: 'absent',
      header: 'غیبت / ناقص',
      numeric: true,
      render: (row) => (
        <div className="whitespace-nowrap">
          <span className={row.summary.absentDays ? 'font-semibold text-rose-600' : 'text-slate-400'}>
            {fa(row.summary.absentDays)} روز غیبت
          </span>
          {row.summary.incompleteDays > 0 && (
            <div className="mt-1 text-xs text-amber-700">{fa(row.summary.incompleteDays)} روز ناقص</div>
          )}
        </div>
      ),
    },
    {
      key: 'delay',
      header: 'تاخیر',
      numeric: true,
      hideOnMobile: !detailed,
      render: (row) => duration(row.summary.delayMinutes),
    },
    {
      key: 'pending',
      header: 'در انتظار',
      numeric: true,
      render: (row) =>
        row.pending ? (
          <Badge tone="warning">{fa(row.pending)} درخواست</Badge>
        ) : (
          <span className="text-xs text-slate-400">ندارد</span>
        ),
    },
  ];
  if (detailed)
    columns.push(
      { key: 'present', header: 'روز حضور', numeric: true, render: (row) => `${fa(row.summary.presentDays)} روز` },
      { key: 'early', header: 'تعجیل', numeric: true, render: (row) => duration(row.summary.earlyMinutes) },
      { key: 'leave', header: 'مرخصی', numeric: true, render: (row) => duration(row.summary.leaveMinutes) },
      { key: 'remote', header: 'دورکاری', numeric: true, render: (row) => duration(row.summary.remoteMinutes) },
      { key: 'overtime', header: 'اضافه کار', numeric: true, render: (row) => duration(row.summary.overtime) },
    );
  columns.push({
    key: 'report',
    header: 'گزارش فردی',
    render: (row) => (
      <Link
        href={performanceHref(query, row.employee.id, view)}
        aria-label={`گزارش کارکرد ${row.employee.name ?? row.employee.personnelCode}`}
        className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
      >
        مشاهده گزارش <IconArrowLeft className="size-4" aria-hidden="true" />
      </Link>
    ),
  });
  return <Table rows={rows} rowKey={(row) => row.employee.id} columns={columns} />;
}
