'use client';

import { FormModal } from '@/app/dashboard/attendance/attendance.component.layout';
import { fromCivilDate, jalaliLabel, tehranToday, toCivilDate } from '@/app/dashboard/attendance/attendance.util';
import { useAuth } from '@/components/auth/auth.context.provider';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { Role } from '@/components/auth/auth.constants.roles';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Input } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, DatePickerField, PersonLabel, Table } from '@/ui/molecules';
import { IconCalendarOff, IconPlus, IconSearch } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { CopyAmount } from '../financial.component.copy-amount';
import { useCreateSettlement, useSettlementCandidates, useSettlements } from './final-settlement.api';
import { SettlementCandidate } from './final-settlement.types';

/** Final settlements: what is still owed when someone leaves. Admin and finance manager make them; the CEO sees them. */
export default function FinalSettlementsPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.finalSettlement.roles}>
      <DashbaordLayout>
        <SettlementsContent />
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function SettlementsContent() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const canMake = hasRole(Role.ADMIN) || hasRole(Role.FINANCE_MANAGER);
  const { data, error, isLoading, refresh } = useSettlements();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex grow flex-col gap-4 overflow-auto pb-6">
      <div className="ui-page-header">
        <div className="ui-page-icon">
          <IconCalendarOff className="size-6" />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <h1>تسویه حساب نهایی</h1>
          <p>سنوات، مانده‌ی مرخصی و باقی‌مانده‌ی عیدی کسانی که همکاری‌شان تمام می‌شود</p>
        </div>
        {canMake && (
          <Button className="gap-1" onClick={() => setCreating(true)}>
            <IconPlus className="size-4" />
            تسویه‌ی جدید
          </Button>
        )}
      </div>

      <div className="ui-surface p-2 lg:p-3">
        <DataView
          data={data}
          error={error}
          isLoading={isLoading}
          isEmpty={(d) => !d?.items.length}
          emptyMessage="هنوز تسویه‌ای ثبت نشده است."
          onRetry={refresh}
        >
          <Table
            rows={data?.items ?? []}
            rowKey={(s) => s.id}
            onRowClick={(s) => router.push(`/dashboard/admin/financial/final-settlement/${s.id}`)}
            columns={[
              {
                key: 'user',
                header: 'فرد',
                render: (s) => (
                  <PersonLabel
                    name={s.user.name}
                    picture={s.user.profilePicture}
                    detail={s.user.personnelCode ? <bdi dir="ltr">{s.user.personnelCode}</bdi> : undefined}
                  />
                ),
              },
              { key: 'date', header: 'تاریخ تسویه', numeric: true, render: (s) => jalaliLabel(s.date) },
              {
                key: 'service',
                header: 'سابقه',
                hideOnMobile: true,
                render: (s) => `${s.serviceYears.toLocaleString('fa-IR')} سال`,
              },
              {
                key: 'net',
                header: (
                  <>
                    قابل پرداخت <span className="text-[10px] font-normal text-slate-400">(ریال)</span>
                  </>
                ),
                numeric: true,
                render: (s) => (
                  <strong className={s.net < 0 ? 'text-rose-600' : undefined}>
                    <CopyAmount value={s.net} />
                  </strong>
                ),
              },
              {
                key: 'status',
                header: 'وضعیت',
                render: (s) => <Badge tone={s.status === 'final' ? 'success' : 'warning'}>{s.status === 'final' ? 'قطعی' : 'پیش‌نویس'}</Badge>,
              },
            ]}
          />
        </DataView>
      </div>

      {creating && <CreateSettlement onClose={() => setCreating(false)} onCreated={(id) => router.push(`/dashboard/admin/financial/final-settlement/${id}`)} />}
    </div>
  );
}

/** Pick the person (those with no settlement yet) and the day, then open the settlement. */
function CreateSettlement({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [text, setText] = useState('');
  const [person, setPerson] = useState<SettlementCandidate | null>(null);
  const [date, setDate] = useState(tehranToday());
  const candidates = useSettlementCandidates(text, !person);
  const create = useCreateSettlement();

  const handleCreate = async () => {
    if (!person) return;
    try {
      const s = await create.submit({ userId: person.id, date });
      toast.success('تسویه ساخته شد');
      onCreated(s.id);
    } catch (e) {
      toast.error((e as Error)?.message ?? 'ساخت تسویه انجام نشد');
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title="تسویه‌ی جدید"
      footer={
        <>
          <Button className="flex-1" disabled={!person || create.isLoading} onClick={handleCreate}>
            {create.isLoading ? 'در حال ساخت...' : 'ساخت و محاسبه'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <div className="text-sm font-medium text-slate-700">فرد</div>
        {person ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2">
            <PersonLabel name={person.name} picture={person.profilePicture} detail={person.jobTitle ?? undefined} />
            <Button variant="ghost" size="sm" onClick={() => setPerson(null)}>
              تغییر
            </Button>
          </div>
        ) : (
          <>
            <Input
              icon={<IconSearch className="size-4 text-slate-400" />}
              placeholder="نام، کد پرسنلی یا عنوان را بنویسید"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {candidates.data?.items.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setPerson(u)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-start hover:border-slate-300 hover:bg-slate-50"
                >
                  <PersonLabel name={u.name} picture={u.profilePicture} detail={u.personnelCode ? <bdi dir="ltr">{u.personnelCode}</bdi> : undefined} />
                </button>
              ))}
              {candidates.data && !candidates.data.items.length && (
                <p className="py-2 text-center text-xs text-slate-400">کسی پیدا نشد (یا برایش تسویه ثبت شده).</p>
              )}
            </div>
          </>
        )}
      </div>
      <DatePickerField label="تاریخ تسویه" value={fromCivilDate(date)} onSelect={(d) => setDate(toCivilDate(d))} minSelectableDate={new Date('2000-01-01')} />
    </FormModal>
  );
}
