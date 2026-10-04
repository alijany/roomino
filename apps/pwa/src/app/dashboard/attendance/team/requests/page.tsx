'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button } from '@/ui/atoms';
import { DataView, Pagination } from '@/ui/molecules';
import { Tabs } from '@/ui/molecules/tabs';
import { IconArrowRight, IconClipboardList } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTeamRequests } from '../../attendance.api';
import { PageHeader, Panel } from '../../attendance.component.layout';
import { RequestTable } from '../../attendance.component.request-table';
import { RequestDetailModal, ReviewActions } from '../../attendance.component.review';
import { AttendanceRequest, RequestFilterDto, RequestStatus } from '../../attendance.types';

/** درخواست‌های تیم — the approver's queue. Decisions here are final. */
export default function TeamRequestsPage() {
  const [filters, setFilters] = useState<RequestFilterDto>({ status: RequestStatus.PENDING, limit: 15 });
  const [viewing, setViewing] = useState<AttendanceRequest | null>(null);
  const { data, error, isLoading, refresh } = useTeamRequests(filters);

  const done = () => {
    setViewing(null);
    refresh();
  };

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-hidden">
          <PageHeader
            icon={<IconClipboardList className="size-6" />}
            title="درخواست‌های تیم"
            subtitle="تایید یا رد شما نهایی است و اثر آن (مانده مرخصی، تردد) بلافاصله اعمال می‌شود."
            actions={
              <Link href="/dashboard/attendance/team">
                <Button variant="outline" size="sm" className="gap-1">
                  <IconArrowRight className="size-4" />
                  تیم من
                </Button>
              </Link>
            }
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
                  actions={(r) => <ReviewActions request={r} base="/attendance/team/requests" onDone={done} />}
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
          actions={viewing && <ReviewActions request={viewing} base="/attendance/team/requests" onDone={done} size="md" />}
        />
      </DashbaordLayout>
    </ProtectedRoute>
  );
}
