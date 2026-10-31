'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown } from '@/ui/atoms';
import { DataView, Pagination } from '@/ui/molecules';
import { IconCashBanknote, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useAdvanceRequests } from './advance-request.api';
import { DateFilterControls } from './advance-request.component.date-filter';
import { RequestDetailModal } from './advance-request.component.detail-modal';
import { RequestForm } from './advance-request.component.request-form';
import { RequestTable } from './advance-request.component.request-table';
import { useDateFilter } from './advance-request.hook.use-date-filter';
import { STATUS_META } from './advance-request.constants';
import { AdvanceRequestFilterDto, AdvanceRequestScope, AdvanceRequestStatus } from './advance-request.types';

const STATUS_OPTIONS = Object.values(AdvanceRequestStatus).map((value) => ({
  label: STATUS_META[value].label,
  value,
}));

/**
 * مساعده — personnel self-service: submit a new advance request and track
 * my own, nothing else. Approve/reject happens from the management review
 * queue, not here — این فقط بخش پرسنل است.
 */
export default function AdvanceRequestPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [status, setStatus] = useState<AdvanceRequestStatus | null>(null);
  const [page, setPage] = useState(0);
  const dateFilter = useDateFilter();

  const filters: AdvanceRequestFilterDto = {
    scope: AdvanceRequestScope.MINE,
    page,
    status: status ? [status] : undefined,
    from: dateFilter.range.from,
    to: dateFilter.range.to,
  };

  const { data, error, isLoading, refresh } = useAdvanceRequests(filters);

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="flex grow flex-col space-y-3 overflow-hidden">
          <div className="ui-page-header">
            <div className="ui-page-icon">
              <IconCashBanknote className="size-6" />
            </div>
            <div className="min-w-0 flex-1 basis-48">
              <h1>مساعده</h1>
              <p>درخواست مساعده جدید بدهید یا وضعیت درخواست‌های قبلی را ببینید.</p>
            </div>
            <Button className="gap-2" onClick={() => setFormOpen(true)}>
              <IconPlus className="size-4" />
              درخواست مساعده جدید
            </Button>
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
                emptyMessage="هنوز درخواست مساعده‌ای ثبت نکرده‌اید."
                onRetry={refresh}
              >
                <RequestTable
                  requests={data?.items ?? []}
                  showRequester={false}
                  onViewDetails={(row) => setSelectedId(row.id)}
                />

                {data?.meta && data.meta.pageCount > 1 && (
                  <div className="pt-6">
                    <Pagination
                      itemPerPage={data.meta.limit || 20}
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

        <RequestForm
          key={String(formOpen)}
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={refresh}
        />

        <RequestDetailModal
          requestId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={refresh}
        />
      </DashbaordLayout>
    </ProtectedRoute>
  );
}
