'use client';

import { useAuth } from '@/components/auth/auth.context.provider';
import { Role } from '@/components/auth/auth.constants.roles';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input, ToggleSwitch } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, PersonLabel, Table } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconCheck, IconFilterOff, IconPencil, IconPlus, IconSearch, IconTrash, IconTrendingUp, IconUsersGroup } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import { useDebouncedFilterText, useUrlFilters } from '@/libs/url/url.hook.use-url-filters';
import { toast } from 'react-toastify';
import { useConfirmSalaryChanges, useDeleteSalaryChange, useSalaryChanges } from './salary-history.api';
import { BulkForm } from './salary-history.component.bulk-form';
import { ChangeForm } from './salary-history.component.change-form';
import { SalaryChange, SalaryChangeStatus, SalaryChangeType, SalaryFilters } from './salary-history.types';
import { MONTHS, currentPeriod, percentLabel, periodLabel, rial, yearOf } from '../financial.util';

const TYPE_ITEMS = [
  { value: 'all', label: 'همه‌ی انواع' },
  { value: 'start', label: 'شروع همکاری' },
  { value: 'raise', label: 'افزایش دوره‌ای' },
  { value: 'decrease', label: 'کاهش حقوق' },
];

const STATUS_ITEMS = [
  { value: 'all', label: 'همه‌ی وضعیت‌ها' },
  { value: 'confirmed', label: 'قطعی' },
  { value: 'proposed', label: 'پیشنهادی' },
];

const MONTH_ITEMS = [{ value: 0, label: 'همه‌ی ماه‌ها' }, ...MONTHS.map((name, i) => ({ value: i + 1, label: name }))];
const yearItems = () => [
  { value: 0, label: 'همه‌ی سال‌ها' },
  ...Array.from({ length: 8 }, (_, i) => yearOf(currentPeriod()) + 1 - i).map((y) => ({
    value: y,
    label: y.toLocaleString('fa-IR', { useGrouping: false }),
  })),
];

const TYPE_META: Record<SalaryChangeType, { label: string; tone: 'info' | 'success' | 'warning' }> = {
  start: { label: 'شروع همکاری', tone: 'info' },
  raise: { label: 'افزایش دوره‌ای', tone: 'success' },
  decrease: { label: 'کاهش حقوق', tone: 'warning' },
};

/** A column title with the unit small beside it. */
function WithUnit({ children }: { children: string }) {
  return (
    <>
      {children} <span className="text-[10px] font-normal text-slate-400">(ریال)</span>
    </>
  );
}

/** Every change of every person's salary, newest first. Admin-only. */
export default function SalaryHistoryPage() {
  return (
    <RoleProtectedRoute allowedRoles={RouteItems.salaryHistory.roles}>
      <DashbaordLayout>
        <Suspense fallback={<DataView isLoading />}>
          <SalaryHistoryContent />
        </Suspense>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}

function SalaryHistoryContent() {
  // The filters live in the address, so a refresh keeps them.
  const [filters, setFilters] = useUrlFilters<SalaryFilters>({
    text: 'string',
    type: 'string',
    status: 'string',
    year: 'number',
    month: 'number',
    onlyLatest: 'boolean',
  });
  // The CEO and the finance manager look; the admin changes.
  const canEdit = useAuth().hasRole(Role.ADMIN);
  const [form, setForm] = useState<'change' | 'bulk' | null>(null);
  const [removing, setRemoving] = useState<SalaryChange | null>(null);
  const [editing, setEditing] = useState<SalaryChange | null>(null);
  const [confirming, setConfirming] = useState<SalaryChange[] | null>(null);
  const { data, error, isLoading, refresh } = useSalaryChanges(filters);
  const remove = useDeleteSalaryChange();
  const confirm = useConfirmSalaryChanges();
  const proposals = (data?.items ?? []).filter((c) => c.status === 'proposed');
  const setFilter = (change: Partial<SalaryFilters>) => setFilters((prev) => ({ ...prev, ...change }));
  const [text, setText] = useDebouncedFilterText(filters.text, (value) => setFilter({ text: value || undefined }));
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== false);

  const handleRemove = async () => {
    if (!removing) return;
    try {
      await remove.submit(removing.id);
      toast.success('تغییر حذف شد');
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'حذف انجام نشد');
    } finally {
      setRemoving(null);
    }
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    try {
      await confirm.submit({ ids: confirming.map((c) => c.id) });
      toast.success(`${confirming.length.toLocaleString('fa-IR')} پیشنهاد قطعی شد`);
      refresh();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'قطعی کردن انجام نشد');
    } finally {
      setConfirming(null);
    }
  };

  return (
    <div className="flex grow flex-col space-y-3 overflow-hidden">
      <div className="ui-page-header">
        <div className="ui-page-icon">
          <IconTrendingUp className="size-6" />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <h1>تاریخچه‌ی حقوق</h1>
          <p>هر تغییر حقوق از یک ماه به بعد؛ حقوق هر ماه آخرین تغییر تا همان ماه است</p>
        </div>
        {canEdit && <div className="flex flex-wrap gap-2">
          {proposals.length > 0 && (
            <Button variant="outline" className="gap-1 border-sky-200 text-sky-700" onClick={() => setConfirming(proposals)}>
              <IconCheck className="size-4" />
              قطعی کردن پیشنهادها ({proposals.length.toLocaleString('fa-IR')})
            </Button>
          )}
          <Button variant="outline" className="gap-1" onClick={() => setForm('bulk')}>
            <IconUsersGroup className="size-4" />
            افزایش گروهی
          </Button>
          <Button className="gap-1" onClick={() => setForm('change')}>
            <IconPlus className="size-4" />
            ثبت تغییر
          </Button>
        </div>}
      </div>

      <div className="ui-surface flex grow flex-col gap-3 overflow-hidden p-2 lg:p-3">
        <div className="flex flex-wrap items-end gap-2 px-1">
          <div className="w-full sm:w-64">
            <Input
              icon={<IconSearch className="size-4 text-slate-400" />}
              placeholder="نام، کد پرسنلی یا توضیحات"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Dropdown
              items={TYPE_ITEMS}
              value={filters.type ?? 'all'}
              onChange={(value) => setFilter({ type: value && value !== 'all' ? (value as SalaryChangeType) : undefined })}
              variant="outline"
            />
          </div>
          <div className="w-40">
            <Dropdown
              items={STATUS_ITEMS}
              value={filters.status ?? 'all'}
              onChange={(value) => setFilter({ status: value && value !== 'all' ? (value as SalaryChangeStatus) : undefined })}
              variant="outline"
            />
          </div>
          <div className="w-36">
            <Dropdown
              items={yearItems()}
              value={filters.year ?? 0}
              onChange={(value) => setFilter({ year: Number(value) || undefined })}
              variant="outline"
            />
          </div>
          <div className="w-36">
            <Dropdown
              items={MONTH_ITEMS}
              value={filters.month ?? 0}
              onChange={(value) => setFilter({ month: Number(value) || undefined })}
              variant="outline"
            />
          </div>
          <ToggleSwitch
            label="فقط آخرین تغییر هر نفر"
            size="sm"
            checked={Boolean(filters.onlyLatest)}
            onChange={(checked) => setFilter({ onlyLatest: checked || undefined })}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500" onClick={() => {
                setFilters({});
                setText('');
              }}>
              <IconFilterOff className="size-4" />
              پاک کردن فیلترها
            </Button>
          )}
          {data && (
            <span className="ms-auto text-xs text-slate-400">{data.items.length.toLocaleString('fa-IR')} مورد</span>
          )}
        </div>

        <div className="overflow-auto">
          <DataView
            data={data}
            error={error}
            isLoading={isLoading}
            isEmpty={(d) => !d?.items.length}
            emptyMessage="تغییر حقوقی ثبت نشده است."
            onRetry={refresh}
          >
            <Table
              rows={data?.items ?? []}
              rowKey={(c) => c.id}
              columns={[
                {
                  key: 'user',
                  header: 'کاربر',
                  render: (c) => (
                    <PersonLabel
                      name={c.user.name}
                      picture={c.user.profilePicture}
                      detail={c.user.personnelCode ? <bdi dir="ltr">{c.user.personnelCode}</bdi> : undefined}
                    />
                  ),
                },
                { key: 'period', header: 'از ماه', render: (c) => periodLabel(c.period) },
                {
                  key: 'type',
                  header: 'نوع',
                  render: (c) =>
                    c.status === 'proposed' ? (
                      <Badge tone="warning">پیشنهادی</Badge>
                    ) : c.type ? (
                      <Badge tone={TYPE_META[c.type].tone}>{TYPE_META[c.type].label}</Badge>
                    ) : (
                      '—'
                    ),
                },
                { key: 'previous', header: <WithUnit>حقوق قبلی</WithUnit>, numeric: true, hideOnMobile: true, render: (c) => rial(c.previous) },
                { key: 'salary', header: <WithUnit>حقوق جدید</WithUnit>, numeric: true, render: (c) => <strong>{rial(c.salary)}</strong> },
                {
                  key: 'percent',
                  header: 'تغییر',
                  numeric: true,
                  render: (c) => (
                    <span dir="ltr" className={c.percent && c.percent < 0 ? 'text-rose-600' : c.percent ? 'text-emerald-600' : ''}>
                      {percentLabel(c.percent)}
                    </span>
                  ),
                },
                { key: 'note', header: 'توضیحات', hideOnMobile: true, render: (c) => c.note ?? '—' },
                { key: 'by', header: 'ثبت‌کننده', hideOnMobile: true, render: (c) => c.createdBy ?? '—' },
                {
                  key: 'actions',
                  header: '',
                  render: (c) => !canEdit ? null : (
                    <div className="flex gap-1">
                      {c.status === 'proposed' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="!px-2 border-none text-emerald-600"
                            aria-label="قطعی کردن"
                            onClick={() => setConfirming([c])}
                          >
                            <IconCheck className="size-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="!px-2 border-none" aria-label="ویرایش پیشنهاد" onClick={() => setEditing(c)}>
                            <IconPencil className="size-4" />
                          </Button>
                        </>
                      )}
                      {(c.status === 'proposed' || c.isLatest) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="!px-2 border-none text-rose-500"
                          aria-label={c.status === 'proposed' ? 'حذف پیشنهاد' : 'حذف آخرین تغییر'}
                          onClick={() => setRemoving(c)}
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </DataView>
        </div>
      </div>

      {form === 'change' && <ChangeForm onClose={() => setForm(null)} onSaved={refresh} />}
      {editing && <ChangeForm editing={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {form === 'bulk' && <BulkForm onClose={() => setForm(null)} onSaved={refresh} />}

      <ConfirmModal
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        onConfirm={handleConfirm}
        title="قطعی کردن پیشنهاد"
        message={
          confirming && confirming.length === 1
            ? `پیشنهاد ${periodLabel(confirming[0].period)} برای «${confirming[0].user.name ?? ''}» (${rial(confirming[0].salary)} ریال) قطعی شود؟ از آن ماه در حقوق اثر می‌کند.`
            : `${(confirming?.length ?? 0).toLocaleString('fa-IR')} پیشنهاد قطعی شود؟ همه یا هیچ‌کدام اعمال می‌شوند و از ماه خودشان در حقوق اثر می‌کنند.`
        }
        confirmButtonText="قطعی کردن"
        isLoading={confirm.isLoading}
      />

      <ConfirmModal
        isOpen={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
        title={removing?.status === 'proposed' ? 'حذف پیشنهاد' : 'حذف تغییر حقوق'}
        message={
          removing?.status === 'proposed'
            ? `پیشنهاد ${periodLabel(removing?.period)} برای «${removing?.user.name ?? ''}» حذف شود؟`
            : `تغییر ${periodLabel(removing?.period)} برای «${removing?.user.name ?? ''}» حذف شود؟ حقوق قبلی دوباره معتبر می‌شود.`
        }
        confirmButtonText="حذف"
        isLoading={remove.isLoading}
      />
    </div>
  );
}
