'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Input } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconClipboardList, IconSearch, IconUsersGroup } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/libs/api/api.types.error';
import { useState } from 'react';
import { useTeamBoard } from '../attendance.api';
import { BoardTable } from '../attendance.component.board';
import { PageHeader, Panel, StatTile } from '../attendance.component.layout';
import { fa, jalaliLabel } from '../attendance.util';

/**
 * تیم من — for job-group approvers. Access is the approver assignment, not a
 * role, so the server decides; a non-approver gets its 403 message here.
 */
export default function TeamPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const { data, error, isLoading, refresh } = useTeamBoard(text || undefined);
  // 403 means "not an approver" — say so, and don't offer a pointless retry.
  const forbidden = (error as ApiError | undefined)?.status === 403;

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconUsersGroup className="size-6" />}
            title="تیم من"
            subtitle={data ? `${jalaliLabel(data.date)}${data.holiday ? ` — تعطیل: ${data.holiday}` : ''}` : 'اعضای گروه‌هایی که تاییدکننده آن‌ها هستید'}
            actions={
              !forbidden && <Link href="/dashboard/attendance/team/requests">
                <Button className="gap-2">
                  <IconClipboardList className="size-4" />
                  درخواست‌های تیم
                  {data?.stats.pending ? (
                    <span className="rounded-full bg-white/25 px-2 text-xs">{fa(data.stats.pending)}</span>
                  ) : null}
                </Button>
              </Link>
            }
          />

          <DataView
            data={data}
            error={error}
            isLoading={isLoading}
            onRetry={forbidden ? undefined : refresh}
            errorTitle={forbidden ? 'تیمی برای شما تعریف نشده است' : undefined}
            errorMessage={forbidden ? (error as ApiError).message : undefined}
          >
            {data && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatTile label="اعضای فعال" value={fa(data.stats.employees)} />
                  <StatTile label="حاضر" value={fa(data.stats.present)} tone="success" />
                  <StatTile label="ورود ثبت نشده" value={fa(data.stats.missing)} tone={data.stats.missing ? 'danger' : 'neutral'} />
                  <StatTile label="مرخصی" value={fa(data.stats.onLeave)} />
                </div>
                <Panel className="gap-3">
                  <div className="sm:w-72">
                    <Input
                      icon={<IconSearch className="size-4 text-slate-400" />}
                      placeholder="نام یا کد پرسنلی"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>
                  {data.rows.length ? (
                    <BoardTable
                      rows={data.rows}
                      groupLabel="گروه شغلی"
                      onOpen={(row) => router.push(`/dashboard/attendance/team/${row.employee.id}`)}
                    />
                  ) : (
                    <p className="py-10 text-center text-sm text-slate-400">عضو فعالی در گروه‌های شما نیست.</p>
                  )}
                </Panel>
              </div>
            )}
          </DataView>
        </div>
      </DashbaordLayout>
    </ProtectedRoute>
  );
}
