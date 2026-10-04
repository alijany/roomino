'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button } from '@/ui/atoms';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { DataView, Pagination } from '@/ui/molecules';
import { Tabs } from '@/ui/molecules/tabs';
import { IconMailbox, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useCancelRequest, useMyRequests } from '../attendance.api';
import { PageHeader, Panel } from '../attendance.component.layout';
import { RequestForm } from '../attendance.component.request-form';
import { RequestTable } from '../attendance.component.request-table';
import { RequestDetailModal } from '../attendance.component.review';
import { AttendanceRequest, RequestFilterDto, RequestStatus } from '../attendance.types';
import { errorMessage } from '../attendance.util';

/** درخواست‌های من — leave, mission, remote work, overtime and manual check-ins. */
export default function MyRequestsPage() {
  const [filters, setFilters] = useState<RequestFilterDto>({ status: RequestStatus.PENDING, limit: 10 });
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<AttendanceRequest | null>(null);
  const [cancelling, setCancelling] = useState<AttendanceRequest | null>(null);

  const { data, error, isLoading, refresh } = useMyRequests(filters);
  const cancel = useCancelRequest();

  const handleCancel = async () => {
    if (!cancelling) return;
    try {
      await cancel.submit(cancelling.id);
      toast.success('درخواست لغو شد');
      setViewing(null);
      refresh();
    } catch (cancelError) {
      toast.error(errorMessage(cancelError, 'لغو درخواست انجام نشد'));
    } finally {
      setCancelling(null);
    }
  };

  const tabs = [
    { id: RequestStatus.PENDING, label: 'در دست بررسی', count: data?.counts.pending },
    { id: RequestStatus.APPROVED, label: 'تایید شده', count: data?.counts.approved },
    { id: RequestStatus.REJECTED, label: 'رد شده', count: data?.counts.rejected },
  ];

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-hidden">
          <PageHeader
            icon={<IconMailbox className="size-6" />}
            title="درخواست‌های مرخصی و تردد"
            subtitle="مرخصی، ماموریت، دورکاری، اضافه کار یا ثبت ورود و خروج جاافتاده"
            actions={
              <Button className="gap-2" onClick={() => setFormOpen(true)}>
                <IconPlus className="size-4" />
                درخواست جدید
              </Button>
            }
          />

          <Panel className="grow overflow-hidden">
            <Tabs
              tabs={tabs}
              defaultTab={RequestStatus.PENDING}
              onTabChange={(id) => setFilters((prev) => ({ ...prev, status: id as RequestStatus, page: 0 }))}
            />
            <div className="overflow-auto pt-2">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage="درخواستی در این وضعیت ندارید."
                onRetry={refresh}
              >
                <RequestTable
                  requests={data?.items ?? []}
                  onOpen={setViewing}
                  actions={(r) =>
                    r.status === RequestStatus.PENDING ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="!px-2 border-none text-rose-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelling(r);
                        }}
                        aria-label="لغو درخواست"
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    ) : null
                  }
                />
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
          </Panel>
        </div>

        <RequestForm key={String(formOpen)} isOpen={formOpen} onClose={() => setFormOpen(false)} onSuccess={refresh} />
        <RequestDetailModal request={viewing} onClose={() => setViewing(null)} />
        <ConfirmModal
          isOpen={cancelling !== null}
          onClose={() => setCancelling(null)}
          onConfirm={handleCancel}
          title="لغو درخواست"
          message={`درخواست «${cancelling?.typeLabel ?? ''}» لغو شود؟`}
          confirmButtonText="لغو درخواست"
          cancelButtonText="بازگشت"
          isLoading={cancel.isLoading}
        />
      </DashbaordLayout>
    </ProtectedRoute>
  );
}
