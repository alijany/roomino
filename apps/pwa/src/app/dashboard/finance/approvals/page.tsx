'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { DataView, Pagination } from '@/ui/molecules';
import { IconChecklist } from '@tabler/icons-react';
import { useState } from 'react';
import { usePaymentRequests } from '../finance.api';
import { RequestTable } from '../finance.component.request-table';
import { RequestFilterDto, RequestScope } from '../finance.types';

/**
 * The approver's inbox — only what is waiting on them right now.
 *
 * Nothing else appears here: a request two steps down the chain is not
 * actionable yet, and showing it would train people to ignore the list.
 */
export default function ApprovalsPage() {
  const [filters, setFilters] = useState<RequestFilterDto>({
    scope: RequestScope.AWAITING_ME,
  });

  const { data, error, isLoading, refresh } = usePaymentRequests(filters);

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.financeApprovals.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-hidden">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconChecklist className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">در انتظار تأیید من</h1>
              <p className="text-sm text-slate-500">
                برای دیدن جزئیات و تصمیم‌گیری، روی هر درخواست بزنید.
              </p>
            </div>
          </div>

          <div className="flex grow flex-col overflow-hidden rounded-2xl bg-white p-2">
            <div className="overflow-auto p-2 lg:p-3">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage="درخواستی در انتظار تأیید شما نیست."
                onRetry={refresh}
              >
                <RequestTable requests={data?.items ?? []} hide={['status']} />

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
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
