'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { formatMoney } from '@/libs/format/format.util';
import { Button, Input } from '@/ui/atoms';
import { DataView, Pagination } from '@/ui/molecules';
import { Tabs } from '@/ui/molecules/tabs';
import { IconCashBanknote, IconPlus, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { usePaymentRequests } from '../finance.api';
import { RequestForm } from '../finance.component.request-form';
import { RequestTable } from '../finance.component.request-table';
import {
  Currency,
  PaymentRequestStatus,
  RequestFilterDto,
  RequestOrigin,
  RequestScope,
} from '../finance.types';
import { isOverdue } from '../finance.util';

const TABS = [
  { id: 'payable', label: 'آماده پرداخت' },
  { id: 'pending', label: 'در انتظار تأیید' },
  { id: 'paid', label: 'پرداخت‌شده' },
  { id: 'all', label: 'همه' },
];

/**
 * The Finance work queue — the daily driver.
 *
 * Ordered by deadline with overdue first (the API decides this), because the
 * only question this screen answers is "what has to happen today".
 */
export default function PaymentQueuePage() {
  const [tab, setTab] = useState('payable');
  const [text, setText] = useState('');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  const filters = useMemo<RequestFilterDto>(() => {
    const base: RequestFilterDto = { page, limit: 10, text: text || undefined };

    switch (tab) {
      case 'payable':
        return { ...base, scope: RequestScope.PAYABLE };
      case 'pending':
        return { ...base, status: [PaymentRequestStatus.PENDING_APPROVAL] };
      case 'paid':
        return { ...base, status: [PaymentRequestStatus.PAID] };
      default:
        return base;
    }
  }, [tab, text, page]);

  const { data, error, isLoading, refresh } = usePaymentRequests(filters);

  // Only meaningful for the payable tab — a total across mixed currencies would
  // be a made-up number, so foreign requests are excluded and called out.
  const { totalRial, foreignCount, overdueCount } = useMemo(() => {
    const items = data?.items ?? [];
    return {
      totalRial: items
        .filter((item) => item.currency === Currency.IRR)
        .reduce((sum, item) => sum + (item.amountRial ?? item.amountMinor), 0),
      foreignCount: items.filter((item) => item.currency !== Currency.IRR).length,
      overdueCount: items.filter(isOverdue).length,
    };
  }, [data]);

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.financeQueue.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconCashBanknote className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">صف پرداخت</h1>
              <p className="text-sm text-slate-500">
                {tab === 'payable' && data?.meta
                  ? `${data.meta.total.toLocaleString('fa-IR')} درخواست${
                      overdueCount > 0
                        ? ` — ${overdueCount.toLocaleString('fa-IR')} مورد سررسید گذشته`
                        : ''
                    }`
                  : 'همه درخواست‌های پرداخت شرکت'}
              </p>
            </div>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <IconPlus className="size-4" />
              پرداخت شرکتی
            </Button>
          </div>

          {tab === 'payable' && totalRial > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                جمع این صفحه: {formatMoney(totalRial)}
              </span>
              {foreignCount > 0 && (
                <span className="mr-2 text-slate-500">
                  ({foreignCount.toLocaleString('fa-IR')} درخواست ارزی در این جمع نیست)
                </span>
              )}
            </div>
          )}

          <div className="flex grow flex-col overflow-hidden rounded-2xl bg-white p-2">
            <div className="flex flex-wrap items-center gap-3 px-2 pt-1">
              <div className="grow">
                <Tabs
                  tabs={TABS}
                  defaultTab="payable"
                  onTabChange={(id) => {
                    setTab(id);
                    setPage(0);
                  }}
                />
              </div>
              <div className="w-full sm:w-64">
                <Input
                  icon={<IconSearch className="size-4 text-slate-400" />}
                  placeholder="جستجو در عنوان یا طرف‌حساب"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setPage(0);
                  }}
                />
              </div>
            </div>

            <div className="overflow-auto p-2 lg:p-3">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage={
                  tab === 'payable'
                    ? 'صف پرداخت خالی است. همه درخواست‌های تأییدشده پرداخت شده‌اند.'
                    : 'درخواستی یافت نشد'
                }
                onRetry={refresh}
              >
                <RequestTable requests={data?.items ?? []} />

                {data?.meta && data.meta.pageCount > 1 && (
                  <div className="pt-6">
                    <Pagination
                      itemPerPage={10}
                      page={page + 1}
                      totalCount={data.meta.total}
                      onNavigate={(next) => {
                        setPage(next - 1);
                        return '#';
                      }}
                    />
                  </div>
                )}
              </DataView>
            </div>
          </div>
        </div>

        <RequestForm
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={refresh}
          origin={RequestOrigin.FINANCE}
        />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
