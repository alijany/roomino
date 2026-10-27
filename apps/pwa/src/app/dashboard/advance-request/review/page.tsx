'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Dropdown } from '@/ui/atoms';
import { DataView, Pagination } from '@/ui/molecules';
import { IconChecklist } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAdvanceRequests } from '../advance-request.api';
import { DateFilterControls } from '../advance-request.component.date-filter';
import { RequestTable } from '../advance-request.component.request-table';
import { ADVANCE_REQUEST_ROUTES, STATUS_META } from '../advance-request.constants';
import { useDateFilter } from '../advance-request.hook.use-date-filter';
import { AdvanceRequestFilterDto, AdvanceRequestScope, AdvanceRequestStatus } from '../advance-request.types';

const STATUS_OPTIONS = Object.values(AdvanceRequestStatus).map((value) => ({
  label: STATUS_META[value].label,
  value,
}));

/**
 * مساعده‌ها — the management review queue. Where the manager and finance
 * manager actually decide: approve/reject happens from the detail page
 * reached by clicking a row here, never on the personnel-facing مساعده page.
 */
export default function AdvanceRequestReviewPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AdvanceRequestStatus | null>(null);
  const [page, setPage] = useState(0);
  const dateFilter = useDateFilter();

  const filters: AdvanceRequestFilterDto = {
    scope: AdvanceRequestScope.REVIEW,
    page,
    status: status ? [status] : undefined,
    from: dateFilter.range.from,
    to: dateFilter.range.to,
  };

  const { data, error, isLoading, refresh } = useAdvanceRequests(filters);

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.advanceRequestReview.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-hidden">
          <div className="ui-page-header">
            <div className="ui-page-icon">
              <IconChecklist className="size-6" />
            </div>
            <div className="min-w-0 flex-1 basis-48">
              <h1>مساعده‌ها</h1>
              <p>برای تأیید یا رد، روی هر درخواست بزنید.</p>
            </div>
          </div>

          <div className="flex grow flex-col overflow-hidden ui-surface p-2">
            <div className="flex flex-wrap items-start gap-2 p-2">
              <div className="sm:w-56">
                <Dropdown
                  items={[{ label: 'همه وضعیت‌ها', value: null }, ...STATUS_OPTIONS]}
                  value={status}
                  onChange={(value) => {
                    setStatus(value);
                    setPage(0);
                  }}
                  placeholder="همه وضعیت‌ها"
                  variant="outline"
                />
              </div>
              <DateFilterControls filter={dateFilter} onChange={() => setPage(0)} />
            </div>

            <div className="overflow-auto p-2 lg:p-3">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage="درخواست مساعده‌ای یافت نشد."
                onRetry={refresh}
              >
                <RequestTable
                  requests={data?.items ?? []}
                  onViewDetails={(row) => router.push(ADVANCE_REQUEST_ROUTES.request(row.id))}
                />

                {data?.meta && data.meta.pageCount > 1 && (
                  <div className="pt-6">
                    <Pagination
                      itemPerPage={data.meta.limit || 10}
                      page={page + 1}
                      totalCount={data.meta.total}
                      onNavigate={(nextPage) => {
                        setPage(nextPage - 1);
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
