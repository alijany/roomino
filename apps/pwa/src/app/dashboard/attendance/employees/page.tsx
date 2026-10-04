'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input, ToggleSwitch } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, DatePickerField, Pagination, Table } from '@/ui/molecules';
import { IconCheck, IconId, IconPencil, IconPlus, IconReportSearch, IconSearch, IconUsersPlus, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  useBatchCreateEmployees,
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
import { Employee, EmployeeFilterDto, EmployeeInput, UserBrief } from '../attendance.types';
import { errorMessage, fa, fromCivilDate, latin, tehranToday, toCivilDate } from '../attendance.util';

/**
 * پرسنل — attendance profiles. A profile is added to an existing Roomino
 * user (invite them from «کاربران» first); name and phone come from there.
 */
export default function EmployeesPage() {
  const [filters, setFilters] = useState<EmployeeFilterDto>({ limit: 20 });
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
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
              <>
                <Button variant="outline" className="gap-2" onClick={() => setBatchOpen(true)}>
                  <IconUsersPlus className="size-4" />
                  افزودن گروهی
                </Button>
                <Button className="gap-2" onClick={() => setEditing('new')}>
                  <IconPlus className="size-4" />
                  پرسنل جدید
                </Button>
              </>
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
        {batchOpen && <BatchEmployeeForm onClose={() => setBatchOpen(false)} onSaved={refresh} />}
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

type Assignment = Omit<EmployeeInput, 'userId' | 'personnelCode' | 'jobTitle'>;
type Candidate = UserBrief & { nationalId: string | null };

/** Where, when and how someone works — the part the single and batch forms share. */
function AssignmentFields({
  value,
  onChange,
  isNew,
}: {
  value: Assignment;
  onChange: (patch: Partial<Assignment>) => void;
  isNew: boolean;
}) {
  const { data: workplaces } = useWorkplaces();
  const { data: groups } = useJobGroups();
  const { data: policies } = useWorkPolicies();
  const { data: shifts } = useShifts();
  const noPolicy = isNew ? 'سیاست پیش‌فرض' : 'بدون سیاست';

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="محل کار">
          <Dropdown
            items={(workplaces?.items ?? []).map((w) => ({ label: w.name, value: w.id }))}
            value={value.workplaceId ?? null}
            onChange={(id) => onChange({ workplaceId: id ?? undefined })}
            placeholder="انتخاب کنید"
            variant="outline"
          />
        </Field>
        <Field label="شیفت">
          <Dropdown
            items={(shifts?.items ?? []).map((s) => ({ label: s.name, value: s.id }))}
            value={value.shiftId ?? null}
            onChange={(id) => onChange({ shiftId: id ?? undefined })}
            placeholder="انتخاب کنید"
            variant="outline"
          />
        </Field>
        <Field label="گروه شغلی">
          <Dropdown
            items={[{ label: 'بدون گروه', value: null }, ...(groups?.items ?? []).map((g) => ({ label: g.name, value: g.id }))]}
            value={value.jobGroupId ?? null}
            onChange={(id) => onChange({ jobGroupId: id })}
            placeholder="بدون گروه"
            variant="outline"
          />
        </Field>
        <Field label="سیاست کاری">
          <Dropdown
            items={[
              { label: noPolicy, value: null },
              ...(policies?.items ?? []).map((p) => ({ label: p.name + (p.isDefault ? ' (پیش‌فرض)' : ''), value: p.id })),
            ]}
            value={value.workPolicyId ?? null}
            onChange={(id) => onChange({ workPolicyId: id ?? undefined })}
            placeholder={noPolicy}
            variant="outline"
          />
        </Field>
      </div>

      <Field label="شروع شیفت" hint="تغییر شیفت از این تاریخ اعمال می‌شود و روزهای قبل با شیفت قبلی محاسبه می‌مانند.">
        <DatePickerField
          label="از تاریخ"
          value={fromCivilDate(value.shiftStartDate ?? tehranToday())}
          onSelect={(d) => onChange({ shiftStartDate: toCivilDate(d) })}
        />
      </Field>

      <Field label="روزهای دورکاری ثابت" hint="در این روزها ورود و خروج از هر جایی پذیرفته و کل موظفی شیفت کارکرد حساب می‌شود.">
        <WeekdayPicker value={value.remoteDays ?? []} onChange={(remoteDays) => onChange({ remoteDays })} />
      </Field>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <ToggleSwitch
          label="ثبت تردد فقط در محدوده محل کار (GPS)"
          checked={value.useGps}
          onChange={(useGps) => onChange({ useGps })}
        />
        <ToggleSwitch label="فعال" checked={value.active} onChange={(active) => onChange({ active })} />
      </div>
    </>
  );
}

const assignmentReady = (a: Assignment) => Boolean(a.workplaceId && a.shiftId && a.shiftStartDate);

const newAssignment = (): Assignment => ({
  jobGroupId: null,
  shiftStartDate: tehranToday(),
  useGps: true,
  remoteDays: [],
  active: true,
});

/** One row of the user picker; `selected` shows a check, otherwise a plus. */
function CandidateButton({ user, selected, onClick }: { user: Candidate; selected?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
        selected ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {selected ? (
          <IconCheck className="size-4 shrink-0 text-slate-800" />
        ) : (
          <IconPlus className="size-4 shrink-0 text-slate-400" />
        )}
        <span className="truncate">{user.name ?? 'بدون نام'}</span>
      </span>
      <span dir="ltr" className="shrink-0 text-xs text-slate-400">{fa(user.phone)}</span>
    </button>
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
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<Candidate | null>(null);
  const candidates = useEmployeeCandidates(search, !employee);

  const [personnelCode, setPersonnelCode] = useState(employee?.personnelCode ?? '');
  const [jobTitle, setJobTitle] = useState(employee?.jobTitle ?? '');
  const [assignment, setAssignment] = useState<Assignment>(
    employee
      ? {
          workplaceId: employee.workplace?.id,
          jobGroupId: employee.jobGroup?.id ?? null,
          workPolicyId: employee.workPolicy?.id ?? undefined,
          shiftId: employee.currentShift?.id,
          shiftStartDate: employee.currentShift?.startDate ?? tehranToday(),
          useGps: employee.useGps,
          remoteDays: employee.remoteDays,
          active: employee.active,
        }
      : newAssignment(),
  );

  const ready = (employee || user) && personnelCode.trim() && assignmentReady(assignment);

  const handleSave = async () => {
    try {
      await save.submit({
        id: employee?.id,
        data: {
          ...assignment,
          ...(employee ? {} : { userId: user?.id }),
          personnelCode: latin(personnelCode.trim()),
          jobTitle: jobTitle.trim() || undefined,
          // A new profile with no policy chosen gets the default one.
          workPolicyId: assignment.workPolicyId ?? (employee ? null : undefined),
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
          {user && (
            <div className="mb-2">
              <CandidateButton user={user} selected onClick={() => setUser(null)} />
            </div>
          )}
          <Input
            icon={<IconSearch className="size-4 text-slate-400" />}
            placeholder="جستجوی نام یا موبایل"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {candidates.data?.items
              .filter((u) => u.id !== user?.id)
              .map((u) => (
                <CandidateButton key={u.id} user={u} onClick={() => setUser(u)} />
              ))}
            {candidates.data && !candidates.data.items.length && (
              <p className="py-2 text-center text-xs text-slate-400">کاربری پیدا نشد.</p>
            )}
          </div>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="کد پرسنلی" dir="ltr" className="text-left" value={personnelCode} onChange={(e) => setPersonnelCode(e.target.value)} />
        <Input label="عنوان شغلی (اختیاری)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
      </div>

      <AssignmentFields value={assignment} onChange={(patch) => setAssignment((prev) => ({ ...prev, ...patch }))} isNew={!employee} />
    </FormModal>
  );
}

type BatchRow = { user: Candidate; personnelCode: string; jobTitle: string };

/**
 * Several users at once: pick them, give each a personnel code (or number
 * them in order), and set one shared workplace/shift/group for all.
 * The server adds all of them or none.
 */
function BatchEmployeeForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const batch = useBatchCreateEmployees();
  const [search, setSearch] = useState('');
  const candidates = useEmployeeCandidates(search, true, 100);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [startCode, setStartCode] = useState('');
  const [assignment, setAssignment] = useState<Assignment>(newAssignment);

  const chosen = new Set(rows.map((r) => r.user.id));
  const available = (candidates.data?.items ?? []).filter((u) => !chosen.has(u.id));

  const add = (users: Candidate[]) =>
    setRows((prev) => [...prev, ...users.map((user) => ({ user, personnelCode: '', jobTitle: '' }))]);
  const setRow = (id: number, patch: Partial<BatchRow>) =>
    setRows((prev) => prev.map((r) => (r.user.id === id ? { ...r, ...patch } : r)));

  const start = latin(startCode.trim());
  /** `0045` → `0045, 0046, …` — the width of the first code is kept. */
  const numberRows = () =>
    setRows((prev) =>
      prev.map((r, i) => ({ ...r, personnelCode: String(Number(start) + i).padStart(start.length, '0') })),
    );

  const codes = rows.map((r) => latin(r.personnelCode.trim()));
  const isDuplicate = (code: string) => Boolean(code) && codes.indexOf(code) !== codes.lastIndexOf(code);
  const missing = codes.filter((c) => !c).length;
  const duplicates = codes.some(isDuplicate);
  const ready = rows.length > 0 && !missing && !duplicates && assignmentReady(assignment);

  const handleSave = async () => {
    try {
      const result = await batch.submit({
        ...assignment,
        items: rows.map((r, i) => ({
          userId: r.user.id,
          personnelCode: codes[i],
          jobTitle: r.jobTitle.trim() || undefined,
        })),
      });
      toast.success(`${fa(result.created)} نفر به پرسنل اضافه شدند`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'افزودن گروهی انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      wide
      title="افزودن گروهی پرسنل"
      footer={
        <>
          <Button className="flex-1" disabled={!ready || batch.isLoading} onClick={handleSave}>
            {batch.isLoading ? 'در حال ثبت...' : rows.length ? `افزودن ${fa(rows.length)} نفر` : 'افزودن'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-medium text-slate-700">۱. انتخاب کاربران</h4>
          {available.length > 1 && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => add(available)}>
              <IconPlus className="size-4" />
              انتخاب همه ({fa(available.length)})
            </Button>
          )}
        </div>
        <Input
          icon={<IconSearch className="size-4 text-slate-400" />}
          placeholder="جستجوی نام یا موبایل"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {available.map((u) => (
            <CandidateButton key={u.id} user={u} onClick={() => add([u])} />
          ))}
          {candidates.isLoading && <p className="py-2 text-center text-xs text-slate-400">در حال جستجو...</p>}
          {candidates.data && !available.length && (
            <p className="py-2 text-center text-xs text-slate-400">
              {candidates.data.items.length ? 'همه نتایج انتخاب شده‌اند.' : 'کاربری بدون پروفایل پرسنلی پیدا نشد.'}
            </p>
          )}
        </div>
        <p className="text-xs text-slate-400">کاربرانی که هنوز پروفایل پرسنلی ندارند. کاربر جدید را از صفحه «کاربران» دعوت کنید.</p>
      </section>

      <section className="space-y-2 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h4 className="font-medium text-slate-700">
            ۲. کد پرسنلی {rows.length > 0 && <span className="text-sm font-normal text-slate-400">({fa(rows.length)} نفر)</span>}
          </h4>
          {rows.length > 1 && (
            <div className="flex items-center gap-2">
              <div className="w-32">
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  className="text-left"
                  placeholder="1001"
                  aria-label="شروع شماره‌گذاری"
                  value={startCode}
                  onChange={(e) => setStartCode(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" disabled={!/^\d+$/.test(start)} onClick={numberRows}>
                شماره‌گذاری به ترتیب
              </Button>
            </div>
          )}
        </div>

        {rows.length ? (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {rows.map((row, i) => (
              <div key={row.user.id} className="flex flex-wrap items-start gap-2 p-3">
                <div className="min-w-0 basis-full sm:basis-40 sm:pt-2.5">
                  <div className="truncate text-sm font-medium text-slate-800">{row.user.name ?? 'بدون نام'}</div>
                  <div dir="ltr" className="text-right text-xs text-slate-400">{fa(row.user.phone)}</div>
                </div>
                <div className="w-32">
                  <Input
                    dir="ltr"
                    className="text-left"
                    placeholder="کد پرسنلی"
                    aria-label={`کد پرسنلی ${row.user.name ?? ''}`}
                    value={row.personnelCode}
                    onChange={(e) => setRow(row.user.id, { personnelCode: e.target.value })}
                    error={isDuplicate(codes[i]) ? 'تکراری' : undefined}
                  />
                </div>
                <div className="min-w-0 grow sm:basis-40">
                  <Input
                    placeholder="عنوان شغلی (اختیاری)"
                    aria-label={`عنوان شغلی ${row.user.name ?? ''}`}
                    value={row.jobTitle}
                    onChange={(e) => setRow(row.user.id, { jobTitle: e.target.value })}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1.5 !px-2 border-none text-rose-500"
                  onClick={() => setRows((prev) => prev.filter((r) => r.user.id !== row.user.id))}
                  aria-label={`حذف ${row.user.name ?? ''} از فهرست`}
                >
                  <IconX className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
            هنوز کسی انتخاب نشده است.
          </p>
        )}
        {missing > 0 && rows.length > 0 && (
          <p className="text-xs text-amber-600">کد پرسنلی {fa(missing)} نفر خالی است.</p>
        )}
      </section>

      <section className="space-y-4 border-t border-slate-100 pt-4">
        <div>
          <h4 className="font-medium text-slate-700">۳. محل کار و شیفت</h4>
          <p className="text-xs text-slate-400">برای همه افراد انتخاب‌شده یکسان ثبت می‌شود و بعداً برای هر نفر قابل ویرایش است.</p>
        </div>
        <AssignmentFields value={assignment} onChange={(patch) => setAssignment((prev) => ({ ...prev, ...patch }))} isNew />
      </section>
    </FormModal>
  );
}
