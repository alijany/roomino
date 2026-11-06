'use client';

import { Button } from '@/ui/atoms';
import { IconBellRinging } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { FormModal } from '../attendance/attendance.component.layout';
import { errorMessage, fa, jalaliLabel } from '../attendance/attendance.util';
import { resolveOnCallChanges, useOnCallChanges } from './oncall.api';

const KIND: Record<string, string> = { added: 'اضافه شد', removed: 'برداشته شد', changed: 'تغییر کرد' };

/**
 * Edits made to a published period are not announced as they happen: they
 * collect here until the manager chooses to tell people, or to let it be.
 */
export function OnCallChanges({ onResolved }: { onResolved: () => void }) {
  const { data, refresh } = useOnCallChanges();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const items = data?.items ?? [];
  if (!items.length) return null;

  const resolve = async (notify: boolean) => {
    setBusy(true);
    try {
      const result = await resolveOnCallChanges(notify);
      toast.success(notify ? `اعلان برای ${fa(result.sent)} مورد ارسال شد` : 'بدون ارسال اعلان بسته شد');
      await refresh();
      onResolved();
      setOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, 'انجام نشد'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <IconBellRinging className="size-5 shrink-0 text-amber-600" />
        <p className="min-w-0 flex-1 basis-56 text-sm text-amber-800">
          {fa(items.length)} تغییر در برنامهٔ منتشرشده هنوز به افراد اعلام نشده است.
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          بررسی و ارسال اعلان
        </Button>
      </div>

      {open && (
        <FormModal
          isOpen
          onClose={() => setOpen(false)}
          wide
          title="تغییرات اعلام‌نشده"
          footer={
            <>
              <Button className="flex-1" disabled={busy} onClick={() => resolve(true)}>
                ارسال اعلان
              </Button>
              <Button variant="ghost" className="flex-1 bg-slate-100" disabled={busy} onClick={() => resolve(false)}>
                بدون اعلان
              </Button>
            </>
          }
        >
          <p className="text-sm leading-7 text-slate-600">
            با «ارسال اعلان» به هر نفرِ این فهرست خبر می‌رسد؛ «بدون اعلان» تغییرات را بی‌صدا می‌بندد.
          </p>
          <ul className="space-y-2">
            {items.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-slate-800">{c.user.name ?? fa(c.user.phone)}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{jalaliLabel(c.date)}</span>
                  <span className="ms-auto rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{KIND[c.kind]}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {c.kind === 'changed' && `${c.before}  ←  ${c.after}`}
                  {c.kind === 'added' && c.after}
                  {c.kind === 'removed' && c.before}
                </div>
              </li>
            ))}
          </ul>
        </FormModal>
      )}
    </>
  );
}
