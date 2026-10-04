'use client';

import { Button, Dropdown, Input, ToggleSwitch } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteWorkPolicy, useSaveWorkPolicy, useWorkPolicies } from './attendance.api';
import { Field, FormModal } from './attendance.component.layout';
import { POLICY_PERIOD_LABELS, POLICY_TYPE_LABELS } from './attendance.constants';
import { PolicyPeriod, PolicyRequestType, WorkPolicy } from './attendance.types';
import { currentJalaliMonth, errorMessage, fa, latin } from './attendance.util';

/** Caps are entered in hours and stored in minutes, as in Tesmino. */
type RuleDraft = {
  requestType: PolicyRequestType;
  period: PolicyPeriod | '';
  year: string;
  monthlyHours: string;
  yearlyHours: string;
  carryoverHours: string;
  allowOverMonthlyCap: boolean;
  allowOverYearlyCap: boolean;
};

const toHours = (minutes: number | null) => (minutes === null ? '' : String(Math.round((minutes / 60) * 100) / 100));
const toMinutes = (hours: string) => (hours.trim() === '' ? undefined : Math.round(Number(hours) * 60));
const hoursValid = (hours: string) => hours.trim() === '' || (Number.isFinite(Number(hours)) && Number(hours) >= 0);
const ruleValid = (r: RuleDraft) =>
  /^\d{4}$/.test(r.year.trim()) && hoursValid(r.monthlyHours) && hoursValid(r.yearlyHours) && hoursValid(r.carryoverHours);
const capLabel = (minutes: number | null) => (minutes === null ? '—' : `${fa(toHours(minutes))} ساعت`);

export function PoliciesSettings() {
  const { data, error, isLoading, refresh } = useWorkPolicies();
  const remove = useDeleteWorkPolicy();
  const [editing, setEditing] = useState<WorkPolicy | 'new' | null>(null);
  const [deleting, setDeleting] = useState<WorkPolicy | null>(null);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove.submit(deleting.id);
      toast.success('سیاست کاری حذف شد');
      refresh();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError, 'حذف انجام نشد'));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          سقف سالانه مرخصی همان سهمیه سال است. سقفی که «مجاز به عبور» نباشد، درخواست بیش از آن را نمی‌پذیرد.
        </p>
        <Button className="gap-2" onClick={() => setEditing('new')}>
          <IconPlus className="size-4" />
          سیاست جدید
        </Button>
      </div>
      <DataView
        data={data}
        error={error}
        isLoading={isLoading}
        isEmpty={(d) => !d?.items.length}
        emptyMessage="هنوز سیاست کاری تعریف نشده است. بدون سیاست، سقفی اعمال نمی‌شود."
        onRetry={refresh}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {data?.items.map((policy) => (
            <div key={policy.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    {policy.name}
                    {policy.isDefault && <Badge tone="success">پیش‌فرض</Badge>}
                  </div>
                  {policy.description && <div className="text-xs text-slate-500">{policy.description}</div>}
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="!px-2" onClick={() => setEditing(policy)} aria-label="ویرایش">
                    <IconPencil className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="!px-2 border-none text-rose-500"
                    onClick={() => setDeleting(policy)}
                    aria-label={`حذف ${policy.name}`}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
              </div>
              {policy.rules.length > 0 ? (
                <table className="mt-3 w-full text-xs">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="text-right font-normal">نوع</th>
                      <th className="font-normal">سال</th>
                      <th className="font-normal">ماهانه</th>
                      <th className="font-normal">سالانه</th>
                    </tr>
                  </thead>
                  <tbody className="text-center tabular-nums text-slate-600">
                    {policy.rules.map((rule, i) => (
                      <tr key={i}>
                        <td className="text-right">
                          {POLICY_TYPE_LABELS[rule.requestType]}
                          {rule.period ? ` (${POLICY_PERIOD_LABELS[rule.period]})` : ''}
                        </td>
                        <td>{fa(rule.year)}</td>
                        <td>
                          {capLabel(rule.monthlyCapMinutes)}
                          {rule.monthlyCapMinutes !== null && !rule.allowOverMonthlyCap && ' 🔒'}
                        </td>
                        <td>
                          {capLabel(rule.yearlyCapMinutes)}
                          {rule.yearlyCapMinutes !== null && !rule.allowOverYearlyCap && ' 🔒'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="mt-3 text-xs text-slate-400">بدون قانون</p>
              )}
            </div>
          ))}
        </div>
      </DataView>

      {editing && (
        <PolicyForm
          key={editing === 'new' ? 'new' : editing.id}
          policy={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
      <ConfirmModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="حذف سیاست کاری"
        message={`«${deleting?.name ?? ''}» حذف شود؟ پرسنل این سیاست بدون سقف می‌مانند.`}
        confirmButtonText="حذف"
        cancelButtonText="بازگشت"
        isLoading={remove.isLoading}
      />
    </div>
  );
}

function PolicyForm({ policy, onClose, onSaved }: { policy: WorkPolicy | null; onClose: () => void; onSaved: () => void }) {
  const save = useSaveWorkPolicy();
  const [name, setName] = useState(policy?.name ?? '');
  const [description, setDescription] = useState(policy?.description ?? '');
  const [isDefault, setIsDefault] = useState(policy?.isDefault ?? false);
  const [rules, setRules] = useState<RuleDraft[]>(
    (policy?.rules ?? []).map((r) => ({
      requestType: r.requestType,
      period: r.period ?? '',
      year: String(r.year),
      monthlyHours: toHours(r.monthlyCapMinutes),
      yearlyHours: toHours(r.yearlyCapMinutes),
      carryoverHours: toHours(r.carryoverCapMinutes),
      allowOverMonthlyCap: r.allowOverMonthlyCap,
      allowOverYearlyCap: r.allowOverYearlyCap,
    })),
  );

  const ready = name.trim() && rules.every(ruleValid);

  const setRule = (i: number, patch: Partial<RuleDraft>) =>
    setRules((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const addRule = () =>
    setRules((prev) => [
      ...prev,
      {
        requestType: PolicyRequestType.LEAVE_ENTITLED,
        period: '',
        year: String(currentJalaliMonth().y),
        monthlyHours: '',
        yearlyHours: '',
        carryoverHours: '',
        allowOverMonthlyCap: true,
        allowOverYearlyCap: false,
      },
    ]);

  const handleSave = async () => {
    try {
      await save.submit({
        id: policy?.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          isDefault,
          rules: rules.map((r) => ({
            requestType: r.requestType,
            period: r.period || undefined,
            year: Number(r.year),
            monthlyCapMinutes: toMinutes(r.monthlyHours),
            yearlyCapMinutes: toMinutes(r.yearlyHours),
            carryoverCapMinutes: toMinutes(r.carryoverHours),
            allowOverMonthlyCap: r.allowOverMonthlyCap,
            allowOverYearlyCap: r.allowOverYearlyCap,
          })),
        },
      });
      toast.success(policy ? 'سیاست کاری ویرایش شد' : 'سیاست کاری ایجاد شد');
      onSaved();
      onClose();
    } catch (saveError) {
      toast.error(errorMessage(saveError, 'ذخیره انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      wide
      title={policy ? 'ویرایش سیاست کاری' : 'سیاست کاری جدید'}
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
      <Input label="نام سیاست" value={name} onChange={(e) => setName(e.target.value)} />
      <Input textarea label="توضیحات (اختیاری)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <ToggleSwitch label="سیاست پیش‌فرض پرسنل جدید" checked={isDefault} onChange={setIsDefault} />

      <div className="space-y-3">
        <div className="font-medium text-slate-700">قوانین</div>
        {!rules.length && (
          <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">
            بدون قانون، سقفی روی مرخصی و اضافه کار اعمال نمی‌شود.
          </p>
        )}
        {rules.map((rule, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-44">
                <Field label="نوع">
                  <Dropdown
                    items={Object.values(PolicyRequestType).map((value) => ({ label: POLICY_TYPE_LABELS[value], value }))}
                    value={rule.requestType}
                    onChange={(value) => {
                      if (value) setRule(i, { requestType: value });
                    }}
                    variant="outline"
                  />
                </Field>
              </div>
              <div className="w-36">
                <Field label="بازه">
                  <Dropdown
                    items={[
                      { label: 'روزانه و ساعتی', value: '' as const },
                      { label: 'روزانه', value: PolicyPeriod.DAILY },
                      { label: 'ساعتی', value: PolicyPeriod.HOURLY },
                    ]}
                    value={rule.period}
                    onChange={(value) => setRule(i, { period: (value ?? '') as PolicyPeriod | '' })}
                    variant="outline"
                  />
                </Field>
              </div>
              <div className="w-24">
                <Input label="سال" dir="ltr" inputMode="numeric" className="text-left" value={rule.year} onChange={(e) => setRule(i, { year: latin(e.target.value) })} />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mr-auto mb-1.5 !px-2 border-none text-rose-500"
                onClick={() => setRules(rules.filter((_, j) => j !== i))}
                aria-label="حذف قانون"
              >
                <IconTrash className="size-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="سقف ماهانه (ساعت)" dir="ltr" inputMode="decimal" className="text-left" placeholder="بدون سقف" value={rule.monthlyHours} onChange={(e) => setRule(i, { monthlyHours: latin(e.target.value) })} />
              <Input label="سقف سالانه (ساعت)" dir="ltr" inputMode="decimal" className="text-left" placeholder="بدون سقف" value={rule.yearlyHours} onChange={(e) => setRule(i, { yearlyHours: latin(e.target.value) })} />
              <Input label="سقف انتقال (ساعت)" dir="ltr" inputMode="decimal" className="text-left" placeholder="بدون سقف" value={rule.carryoverHours} onChange={(e) => setRule(i, { carryoverHours: latin(e.target.value) })} />
            </div>
            {!ruleValid(rule) && (
              <p className="text-xs text-rose-500">سال باید چهاررقمی و سقف‌ها عدد نامنفی (یا خالی) باشند.</p>
            )}
            <div className="flex flex-wrap gap-6">
              <ToggleSwitch size="sm" label="مجاز به عبور از سقف ماهانه" checked={rule.allowOverMonthlyCap} onChange={(v) => setRule(i, { allowOverMonthlyCap: v })} />
              <ToggleSwitch size="sm" label="مجاز به عبور از سقف سالانه" checked={rule.allowOverYearlyCap} onChange={(v) => setRule(i, { allowOverYearlyCap: v })} />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" className="gap-1" onClick={addRule}>
          <IconPlus className="size-4" />
          افزودن قانون
        </Button>
      </div>
    </FormModal>
  );
}
