'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input, ToggleSwitch } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, DatePickerField, Pagination, Table } from '@/ui/molecules';
import { IconId, IconPencil, IconPlus, IconReportSearch, IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useEmployeeCandidates,
  useEmployees,
  useJobGroups,
  useSaveEmployee,
  useShifts,
  useWorkPolicies,
  useWorkplaces,
} from '../attendance.api';
import { Field, FormModal, PageHeader, Panel } from '../attendance.component.layout';
import { WeekdayPicker } from '../attendance.component.weekday-picker';
import { WEEKDAY_LABELS } from '../attendance.constants';
import { Employee, EmployeeFilterDto, EmployeeInput } from '../attendance.types';
import { errorMessage, fa, fromCivilDate, tehranToday, toCivilDate } from '../attendance.util';

/**
 * پرسنل — attendance profiles. A profile is added to an existing Roomino
 * user (invite them from «کاربران» first); name and phone come from there.
 */
export default function EmployeesPage() {
  const [filters, setFilters] = useState<EmployeeFilterDto>({ limit: 20 });
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const { data, error, isLoading, refresh } = useEmployees(filters);

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.attendanceEmployees.roles}>
      <DashbaordLayout>
        <div className="flex grow flex-col gap-3 overflow-hidden">
          <PageHeader
            icon={<IconId className="size-6" />}
            title="پرسنل"
            subtitle="پروفایل حضور و غیاب کاربران: محل کار، شیفت، گروه و روزهای دورکاری"
            actions={
              <Button className="gap-2" onClick={() => setEditing('new')}>
                <IconPlus className="size-4" />
                پرسنل جدید
              </Button>
            }
          />

          <Panel className="grow gap-3 overflow-hidden">
            <div className="sm:w-72">
              <Input
                icon={<IconSearch className="size-4 text-slate-400" />}
                placeholder="نام، موبایل یا کد پرسنلی"
                value={filters.text ?? ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, text: e.target.value || undefined, page: 0 }))}
              />
            </div>
            <div className="overflow-auto">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                isEmpty={(d) => !d?.items.length}
                emptyMessage="هنوز پرسنلی تعریف نشده است. ابتدا محل کار و شیفت را در تنظیمات بسازید."
                onRetry={refresh}
              >
                <Table
                  rows={data?.items ?? []}
                  rowKey={(e) => e.id}
                  columns={[
                    {
                      key: 'name',
                      header: 'نام',
                      render: (e) => (
                        <div>
                          <div className="font-medium text-slate-800">{e.user.name ?? '—'}</div>
                          <div className="text-xs text-slate-400">{e.jobTitle ?? ''}</div>
                        </div>
                      ),
                    },
                    { key: 'code', header: 'کد پرسنلی', render: (e) => fa(e.personnelCode) },
                    { key: 'workplace', header: 'محل کار', render: (e) => e.workplace?.name ?? '—', hideOnMobile: true },
                    { key: 'group', header: 'گروه شغلی', render: (e) => e.jobGroup?.name ?? '—' },
                    { key: 'shift', header: 'شیفت', render: (e) => e.currentShift?.name ?? '—', hideOnMobile: true },
                    {
                      key: 'remote',
                      header: 'دورکاری ثابت',
                      hideOnMobile: true,
                      render: (e) => (e.remoteDays.length ? e.remoteDays.map((d) => WEEKDAY_LABELS[d]).join('، ') : '—'),
                    },
                    {
                      key: 'active',
                      header: 'وضعیت',
                      render: (e) => (
                        <Badge tone={e.active ? 'success' : 'muted'}>{e.active ? 'فعال' : 'غیرفعال'}</Badge>
                      ),
                    },
                    {
                      key: 'actions',
                      header: '',
                      render: (e) => (
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="!px-2" onClick={() => setEditing(e)} aria-label="ویرایش">
                            <IconPencil className="size-4" />
                          </Button>
                          <Link href={`/dashboard/attendance/performance/${e.id}`}>
                            <Button variant="outline" size="sm" className="!px-2" aria-label="گزارش کارکرد">
                              <IconReportSearch className="size-4" />
                            </Button>
                          </Link>
                        </div>
                      ),
                    },
                  ]}
                />
                {data?.meta && data.meta.pageCount > 1 && (
                  <div className="pt-6">
                    <Pagination
                      itemPerPage={filters.limit || 20}
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

        {editing && (
          <EmployeeForm
            key={editing === 'new' ? 'new' : editing.id}
            employee={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={refresh}
          />
        )}
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function EmployeeForm({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const save = useSaveEmployee();
  const { data: workplaces } = useWorkplaces();
  const { data: groups } = useJobGroups();
  const { data: policies } = useWorkPolicies();
  const { data: shifts } = useShifts();

  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const candidates = useEmployeeCandidates(search, !employee);

  const [form, setForm] = useState<EmployeeInput>({
    personnelCode: employee?.personnelCode ?? '',
    jobTitle: employee?.jobTitle ?? '',
    workplaceId: employee?.workplace?.id,
    jobGroupId: employee?.jobGroup?.id ?? null,
    workPolicyId: employee?.workPolicy?.id ?? undefined,
    shiftId: employee?.currentShift?.id,
    shiftStartDate: employee?.currentShift?.startDate ?? tehranToday(),
    useGps: employee?.useGps ?? true,
    remoteDays: employee?.remoteDays ?? [],
    active: employee?.active ?? true,
  });
  const set = (patch: Partial<EmployeeInput>) => setForm((prev) => ({ ...prev, ...patch }));

  const ready =
    (employee || userId) && form.personnelCode?.trim() && form.workplaceId && form.shiftId && form.shiftStartDate;

  const handleSave = async () => {
    try {
      await save.submit({
        id: employee?.id,
        data: {
          ...form,
          ...(employee ? {} : { userId: userId ?? undefined }),
          personnelCode: form.personnelCode?.trim(),
          jobTitle: form.jobTitle?.trim() || undefined,
          // A new profile with no policy chosen gets the default one.
          workPolicyId: form.workPolicyId ?? (employee ? null : undefined),
        },
      });
      toast.success(employee ? 'اطلاعات پرسنل ذخیره شد' : 'پرسنل اضافه شد');
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'ذخیره انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      wide
      title={employee ? `ویرایش ${employee.user.name ?? ''}` : 'پرسنل جدید'}
      footer={
        <>
          <Button className="flex-1" disabled={!ready || save.isLoading} onClick={handleSave}>
            {save.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      {!employee && (
        <Field label="کاربر" hint="کاربرانی که هنوز پروفایل پرسنلی ندارند. کاربر جدید را از صفحه «کاربران» دعوت کنید.">
          <Input
            icon={<IconSearch className="size-4 text-slate-400" />}
            placeholder="جستجوی نام یا موبایل"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {candidates.data?.items.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setUserId(u.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                  userId === u.id ? 'border-slate-800 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <span>{u.name ?? 'بدون نام'}</span>
                <span dir="ltr" className="text-xs text-slate-400">{fa(u.phone)}</span>
              </button>
            ))}
            {candidates.data && !candidates.data.items.length && (
              <p className="py-2 text-center text-xs text-slate-400">کاربری پیدا نشد.</p>
            )}
          </div>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="کد پرسنلی" value={form.personnelCode ?? ''} onChange={(e) => set({ personnelCode: e.target.value })} />
        <Input label="عنوان شغلی (اختیاری)" value={form.jobTitle ?? ''} onChange={(e) => set({ jobTitle: e.target.value })} />

        <Field label="محل کار">
          <Dropdown
            items={(workplaces?.items ?? []).map((w) => ({ label: w.name, value: w.id }))}
            value={form.workplaceId ?? null}
            onChange={(value) => set({ workplaceId: value ?? undefined })}
            placeholder="انتخاب کنید"
            variant="outline"
          />
        </Field>
        <Field label="گروه شغلی">
          <Dropdown
            items={[{ label: 'بدون گروه', value: null }, ...(groups?.items ?? []).map((g) => ({ label: g.name, value: g.id }))]}
            value={form.jobGroupId ?? null}
            onChange={(value) => set({ jobGroupId: value })}
            placeholder="بدون گروه"
            variant="outline"
          />
        </Field>
        <Field label="سیاست کاری">
          <Dropdown
            items={[
              { label: employee ? 'بدون سیاست' : 'سیاست پیش‌فرض', value: null },
              ...(policies?.items ?? []).map((p) => ({ label: p.name + (p.isDefault ? ' (پیش‌فرض)' : ''), value: p.id })),
            ]}
            value={form.workPolicyId ?? null}
            onChange={(value) => set({ workPolicyId: value ?? undefined })}
            placeholder={employee ? 'بدون سیاست' : 'سیاست پیش‌فرض'}
            variant="outline"
          />
        </Field>
        <Field label="شیفت">
          <Dropdown
            items={(shifts?.items ?? []).map((s) => ({ label: s.name, value: s.id }))}
            value={form.shiftId ?? null}
            onChange={(value) => set({ shiftId: value ?? undefined })}
            placeholder="انتخاب کنید"
            variant="outline"
          />
        </Field>
      </div>

      <Field label="شروع شیفت" hint="تغییر شیفت از این تاریخ اعمال می‌شود و روزهای قبل با شیفت قبلی محاسبه می‌مانند.">
        <DatePickerField
          label="از تاریخ"
          value={fromCivilDate(form.shiftStartDate ?? tehranToday())}
          onSelect={(d) => set({ shiftStartDate: toCivilDate(d) })}
        />
      </Field>

      <Field label="روزهای دورکاری ثابت" hint="در این روزها ورود و خروج از هر جایی پذیرفته و کل موظفی شیفت کارکرد حساب می‌شود.">
        <WeekdayPicker value={form.remoteDays ?? []} onChange={(remoteDays) => set({ remoteDays })} />
      </Field>

      <div className="flex flex-wrap gap-6">
        <ToggleSwitch
          label="ثبت تردد فقط در محدوده محل کار (GPS)"
          checked={form.useGps}
          onChange={(useGps) => set({ useGps })}
        />
        <ToggleSwitch label="فعال" checked={form.active} onChange={(active) => set({ active })} />
      </div>
    </FormModal>
  );
}
