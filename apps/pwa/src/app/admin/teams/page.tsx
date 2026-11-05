'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { PageHeader } from '@/app/dashboard/attendance/attendance.component.layout';
import { JobGroup } from '@/app/dashboard/attendance/attendance.types';
import { errorMessage, fa } from '@/app/dashboard/attendance/attendance.util';
import { Avatar, Button } from '@/ui/atoms';
import { DataView, Table } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconCornerDownLeft, IconPencil, IconPlus, IconSitemap, IconTrash, IconUsersGroup } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteTeam, useTeams } from './teams.api';
import { TeamForm } from './teams.component.form';
import { teamTree } from './teams.util';

/** تیم‌ها — the organisation's teams, parent teams first with their sub-teams indented beneath. */
export default function TeamsPage() {
  const { data, error, isLoading, refresh } = useTeams();
  const remove = useDeleteTeam();
  const [editing, setEditing] = useState<JobGroup | 'new' | null>(null);
  const [deleting, setDeleting] = useState<JobGroup | null>(null);
  const nodes = useMemo(() => teamTree(data?.items ?? []), [data]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove.submit(deleting.id);
      toast.success('تیم حذف شد');
      refresh();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'حذف انجام نشد'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.teams.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
          <PageHeader
            icon={<IconSitemap className="size-6" />}
            title="تیم‌ها"
            subtitle="ساختار تیم‌های سازمان، مدیران و اعضا؛ حضور و غیاب از همین تیم‌ها استفاده می‌کند"
            actions={
              <Button className="gap-2" onClick={() => setEditing('new')}>
                <IconPlus className="size-4" />
                تیم جدید
              </Button>
            }
          />

          <div className="ui-surface overflow-hidden p-2 lg:p-3">
            <DataView
              data={data}
              error={error}
              isLoading={isLoading}
              isEmpty={(d) => !d?.items.length}
              emptyMessage="هنوز تیمی تعریف نشده است."
              onRetry={refresh}
            >
              <Table
                rows={nodes}
                rowKey={(node) => node.team.id}
                onRowClick={(node) => setEditing(node.team)}
                columns={[
                  {
                    key: 'team',
                    header: 'تیم',
                    render: ({ team, depth }) => (
                      <div className="flex items-center gap-2" style={{ paddingInlineStart: depth * 20 }}>
                        {depth > 0 && <IconCornerDownLeft className="size-4 shrink-0 text-slate-300" aria-hidden="true" />}
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <IconUsersGroup className="size-4" />
                        </span>
                        <span className="font-medium text-slate-800">{team.name}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'managers',
                    header: 'مدیران',
                    render: ({ team }) =>
                      team.approvers.length ? (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2 rtl:space-x-reverse">
                            {team.approvers.slice(0, 3).map((m) => (
                              <Avatar key={m.id} src={m.profilePicture} name={m.name} className="size-7 ring-2 ring-white" />
                            ))}
                          </div>
                          <span className="text-sm text-slate-600">
                            {team.approvers[0].name ?? fa(team.approvers[0].phone)}
                            {team.approvers.length > 1 && ` و ${fa(team.approvers.length - 1)} نفر دیگر`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600">بدون مدیر</span>
                      ),
                  },
                  {
                    key: 'members',
                    header: 'اعضا',
                    numeric: true,
                    render: ({ team }) => <span className="tabular-nums">{fa(team.employeeCount ?? 0)} نفر</span>,
                  },
                  {
                    key: 'parent',
                    header: 'تیم مادر',
                    hideOnMobile: true,
                    render: ({ team }) => team.parentName ?? '—',
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: ({ team }) => (
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="!px-2" onClick={() => setEditing(team)} aria-label="ویرایش">
                          <IconPencil className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="!px-2 border-none text-rose-500"
                          onClick={() => setDeleting(team)}
                          aria-label={`حذف ${team.name}`}
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </DataView>
          </div>
        </div>

        {editing && (
          <TeamForm
            key={editing === 'new' ? 'new' : editing.id}
            team={editing === 'new' ? null : editing}
            teams={data?.items ?? []}
            onClose={() => setEditing(null)}
            onSaved={refresh}
          />
        )}
        <ConfirmModal
          isOpen={deleting !== null}
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
          title="حذف تیم"
          message={`«${deleting?.name ?? ''}» حذف شود؟ اعضای آن بدون تیم می‌مانند و زیرتیم‌هایش یک سطح بالا می‌روند.`}
          confirmButtonText="حذف"
          cancelButtonText="بازگشت"
          isLoading={remove.isLoading}
        />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
