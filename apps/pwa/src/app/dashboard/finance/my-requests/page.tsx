'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button } from '@/ui/atoms';
import { DataView, Pagination } from '@/ui/molecules';
import { Tabs } from '@/ui/molecules/tabs';
import { IconPlus, IconReceipt } from '@tabler/icons-react';
import { useState } from 'react';
import { usePaymentRequests } from '../finance.api';
import { RequestForm } from '../finance.component.request-form';
import { RequestTable } from '../finance.component.request-table';
import { PaymentRequestStatus, RequestFilterDto, RequestScope } from '../finance.types';

const TABS = [
  { id: 'open', label: 'در جریان' },
  { id: 'all', label: 'همه' },
  { id: 'paid', label: 'پرداخت‌شده' },
];

const OPEN_STATUSES = [
  PaymentRequestStatus.DRAFT,
  PaymentRequestStatus.PENDING_APPROVAL,
  PaymentRequestStatus.NEEDS_INFO,
  PaymentRequestStatus.APPROVED,
  PaymentRequestStatus.SCHEDULED,
  PaymentRequestStatus.FAILED,
];

/**
 * The employee surface: a short list of my own requests and one way in.
 * Deliberately not the Finance queue — different job, different screen.
 */
export default function MyRequestsPage() {
  const [filters, setFilters] = useState<RequestFilterDto>({
    scope: RequestScope.MINE,
    status: OPEN_STATUSES,
  });
  const [formOpen, setFormOpen] = useState(false);

  const { data, error, isLoading, refresh } = usePaymentRequests(filters);

  const handleTab = (id: string) => {
    setFilters({
      scope: RequestScope.MINE,
      page: 0,
      status:
        id === 'open'
          ? OPEN_STATUSES
          : id === 'paid'
            ? [PaymentRequestStatus.PAID]
            : undefined,
    });
  };

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-hidden">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconReceipt className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">درخواست‌های پرداخت من</h1>
              <p className="text-sm text-slate-500">
                خرید یا پرداختی که شرکت باید انجام دهد را اینجا ثبت کنید.
              </p>
            </div>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <IconPlus className="size-4" />
              درخواست جدید
            </Button>
          </div>

          <div className="flex grow flex-col overflow-hidden rounded-2xl bg-white p-2">
            <div className="px-2 pt-1">
              <Tabs tabs={TABS} defaultTab="open" onTabChange={handleTab} />
            </div>

            <div className="overflow-auto p-2 lg:p-3">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage="هنوز درخواستی ثبت نکرده‌اید. برای خرید یا پرداختی که شرکت باید انجام دهد، درخواست جدید بسازید."
                onRetry={refresh}
              >
                <RequestTable requests={data?.items ?? []} hide={['requester']} />

                {data?.meta && data.meta.pageCount > 1 && (
                  <div className="pt-6">
                    <Pagination
                      itemPerPage={filters.limit || 10}
                      page={(filters.page || 0) + 1}
                      totalCount={data.meta.total}
                      onNavigate={(page) => {
                        setFilters((prev) => ({ ...prev, page: page - 1 }));
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
        />
      </DashbaordLayout>
    </ProtectedRoute>
  );
}
