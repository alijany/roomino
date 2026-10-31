'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { DataView } from '@/ui/molecules';
import { IconLayoutDashboard } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useBoard } from '../attendance.api';
import { BoardOverview } from '../attendance.component.board-overview';
import { PageHeader } from '../attendance.component.layout';
import { jalaliLabel } from '../attendance.util';

/** وضعیت امروز — who is in, remote, on leave or a mission, and what is waiting. Refreshes every minute. */
export default function BoardPage() {
  const router = useRouter();
  const { data, error, isLoading, refresh } = useBoard();

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendanceBoard.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconLayoutDashboard className="size-6" />}
            title="وضعیت امروز پرسنل"
            subtitle={data ? `${jalaliLabel(data.date)}${data.holiday ? ` — تعطیل: ${data.holiday}` : ''}` : undefined}
          />

          <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
            {data && (
              <BoardOverview
                data={data}
                onOpenRow={(row) => router.push(`/dashboard/attendance/performance/${row.employee.id}`)}
                requests={{ base: '/attendance/requests', href: '/dashboard/attendance/requests' }}
                onChanged={refresh}
                emptyMessage="هنوز پرسنلی تعریف نشده است."
              />
            )}
          </DataView>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
