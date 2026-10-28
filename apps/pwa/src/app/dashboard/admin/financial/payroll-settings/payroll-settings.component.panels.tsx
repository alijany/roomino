'use client';

import { Button, CurrencyInput, Input, ToggleSwitch } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { IconArrowBackUp } from '@tabler/icons-react';
import { PayrollInclusion, PayrollItem } from './payroll-settings.types';

/** The edits of the page: a number per changed parameter, and the inclusion flags. */
export type Draft = Record<string, number>;

/** One group of parameters, each with its own input. */
export function GroupPanel({
  title,
  items,
  draft,
  onChange,
}: {
  title: string;
  items: PayrollItem[];
  draft: Draft;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <section className="ui-surface space-y-4 p-4 lg:p-5">
      <h2 className="font-semibold text-slate-700">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Field key={item.key} item={item} value={draft[item.key] ?? item.value ?? 0} onChange={(v) => onChange(item.key, v)} />
        ))}
      </div>
    </section>
  );
}

function Field({ item, value, onChange }: { item: PayrollItem; value: number; onChange: (value: number) => void }) {
  const differs = item.official != null && value !== item.official;

  return (
    <div className="space-y-1.5">
      {item.kind === 'money' && (
        <CurrencyInput label={item.label} unit="toman" value={value} onValueChange={(v) => onChange(v ?? 0)} />
      )}
      {item.kind !== 'money' && (
        <Input
          label={item.kind === 'percent' ? `${item.label} (٪)` : item.label}
          type="number"
          dir="ltr"
          className="text-left"
          inputMode="decimal"
          min={0}
          max={item.kind === 'percent' ? 100 : undefined}
          step={item.kind === 'percent' ? 0.01 : 1}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}

      <div className="flex min-h-5 flex-wrap items-center gap-1.5 text-xs text-slate-400">
        {item.derived && <span>خودکار: {item.derived}</span>}
        {!item.derived && item.hint && <span>{item.hint}</span>}
        {item.needsReview && <Badge tone="warning">با حسابدار تأیید شود</Badge>}
        {differs && (
          <>
            <Badge tone="info">ویرایش‌شده</Badge>
            <button
              type="button"
              onClick={() => onChange(item.official as number)}
              className="inline-flex items-center gap-0.5 text-slate-500 hover:text-slate-800"
            >
              <IconArrowBackUp className="size-3.5" aria-hidden="true" />
              مقدار رسمی
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Which items count toward insurance and income tax. */
export function InclusionPanel({
  rows,
  onChange,
}: {
  rows: PayrollInclusion[];
  onChange: (key: string, change: Partial<Pick<PayrollInclusion, 'insurable' | 'taxable'>>) => void;
}) {
  return (
    <section className="ui-surface space-y-3 p-4 lg:p-5">
      <h2 className="font-semibold text-slate-700">مشمولیت بیمه و مالیات</h2>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              {row.label}
              {row.needsReview && <Badge tone="warning">با حسابدار تأیید شود</Badge>}
            </div>
            <div className="flex items-center gap-5">
              <ToggleSwitch
                label="بیمه"
                size="sm"
                checked={row.insurable}
                onChange={(checked) => onChange(row.key, { insurable: checked })}
              />
              <ToggleSwitch
                label="مالیات"
                size="sm"
                checked={row.taxable}
                onChange={(checked) => onChange(row.key, { taxable: checked })}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** For a year nobody saved yet: start from the official figures or another year. */
export function YearSetup({
  year,
  hasOfficial,
  savedYears,
  busy,
  onStart,
}: {
  year: number;
  hasOfficial: boolean;
  savedYears: number[];
  busy: boolean;
  onStart: (copyFrom?: number) => void;
}) {
  const label = (y: number) => y.toLocaleString('fa-IR', { useGrouping: false });
  return (
    <section className="ui-surface space-y-4 p-5">
      <p className="text-sm text-slate-600">
        برای سال {label(year)} هنوز تنظیماتی ذخیره نشده است.
        {hasOfficial
          ? ' می‌توانید از مقادیر رسمی شروع کنید.'
          : ' برای این سال مقدار رسمی ثبت نشده؛ از یکی از سال‌های ذخیره‌شده کپی کنید و مقدارها را به‌روز کنید.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {hasOfficial && (
          <Button disabled={busy} onClick={() => onStart()}>
            ساخت از مقادیر رسمی
          </Button>
        )}
        {savedYears.map((y) => (
          <Button key={y} variant="outline" disabled={busy} onClick={() => onStart(y)}>
            کپی از سال {label(y)}
          </Button>
        ))}
      </div>
    </section>
  );
}
