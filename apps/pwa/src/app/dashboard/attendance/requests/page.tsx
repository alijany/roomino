'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input } from '@/ui/atoms';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { DataView, Pagination } from '@/ui/molecules';
import { Tabs } from '@/ui/molecules/tabs';
import { IconClipboardList, IconSearch, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteRequest, useRequests } from '../attendance.api';
import { PageHeader, Panel } from '../attendance.component.layout';
import { RequestTable } from '../attendance.component.request-table';
import { RequestDetailModal, ReviewActions } from '../attendance.component.review';
import { CATEGORY_LABELS } from '../attendance.constants';
import { AttendanceRequest, RequestCategory, RequestFilterDto, RequestStatus } from '../attendance.types';
import { errorMessage } from '../attendance.util';

/**
 * بررسی درخواست‌ها — every request, for admin and HR. Team approvers decide
 * on their own groups from «تیم من»; this queue covers everyone.
 */
export default function RequestQueuePage() {
  const [filters, setFilters] = useState<RequestFilterDto>({ status: RequestStatus.PENDING, limit: 15 });
  const [viewing, setViewing] = useState<AttendanceRequest | null>(null);
  const [deleting, setDeleting] = useState<AttendanceRequest | null>(null);
  const { data, error, isLoading, refresh } = useRequests(filters);
  const remove = useDeleteRequest();

  const done = () => {
    setViewing(null);
    refresh();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove.submit(deleting.id);
      toast.success('درخواست حذف شد');
      done();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'حذف انجام نشد'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendanceRequests.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-hidden">
          <PageHeader
            icon={<IconClipboardList className="size-6" />}
            title="بررسی درخواست‌ها"
            subtitle="مرخصی، ماموریت، دورکاری، اضافه کار و تردد دستی همه پرسنل"
          />

          <Panel className="grow gap-2 overflow-hidden">
            <Tabs
              tabs={[
                { id: RequestStatus.PENDING, label: 'در دست بررسی', count: data?.counts.pending },
                { id: RequestStatus.APPROVED, label: 'تایید شده', count: data?.counts.approved },
                { id: RequestStatus.REJECTED, label: 'رد شده', count: data?.counts.rejected },
              ]}
              defaultTab={RequestStatus.PENDING}
              onTabChange={(id) => setFilters((prev) => ({ ...prev, status: id as RequestStatus, page: 0 }))}
            />
            <div className="flex flex-wrap gap-2">
              <div className="sm:w-72">
                <Input
                  icon={<IconSearch className="size-4 text-slate-400" />}
                  placeholder="نام یا کد پرسنلی"
                  value={filters.text ?? ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, text: e.target.value || undefined, page: 0 }))}
                />
              </div>
              <div className="sm:w-48">
                <Dropdown
                  items={[
                    { label: 'همه انواع', value: null },
                    ...Object.values(RequestCategory).map((value) => ({ label: CATEGORY_LABELS[value], value })),
                  ]}
                  value={filters.category ?? null}
                  onChange={(value) => setFilters((prev) => ({ ...prev, category: value ?? undefined, page: 0 }))}
                  placeholder="همه انواع"
                  variant="outline"
                />
              </div>
            </div>

            <div className="overflow-auto">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage="درخواستی در این وضعیت نیست."
                onRetry={refresh}
              >
                <RequestTable
                  requests={data?.items ?? []}
                  showEmployee
                  onOpen={setViewing}
                  actions={(r) => <ReviewActions request={r} base="/attendance/requests" onDone={done} />}
                />
                {data?.meta && data.meta.pageCount > 1 && (
                  <div className="pt-6">
                    <Pagination
                      itemPerPage={filters.limit || 15}
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

        <RequestDetailModal
          request={viewing}
          onClose={() => setViewing(null)}
          actions={
            viewing && (
              <>
                <ReviewActions request={viewing} base="/attendance/requests" onDone={done} size="md" />
                <Button
                  variant="outline"
                  className="mr-auto gap-1 text-rose-500"
                  onClick={() => setDeleting(viewing)}
                >
                  <IconTrash className="size-4" />
                  حذف
                </Button>
              </>
            )
          }
        />
        <ConfirmModal
          isOpen={deleting !== null}
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
          title="حذف درخواست"
          message="درخواست برای همیشه حذف شود؟ اثر تایید قبلی (مانده مرخصی، تردد ثبت‌شده) برنمی‌گردد."
          confirmButtonText="حذف"
          cancelButtonText="بازگشت"
          isLoading={remove.isLoading}
        />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
