'use client';

import { Button, Dropdown, Input } from '@/ui/atoms';
import { DatePickerField } from '@/ui/molecules';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useGrant, useMyToday, useSubmitRequest, useUploadRequestAttachment } from './attendance.api';
import { AttachmentPicker } from './attendance.component.attachments';
import { Field, FormModal, TimeField } from './attendance.component.layout';
import { GRANT_TYPES, REQUEST_TYPE_LABELS } from './attendance.constants';
import { AttendanceMode, RequestInput, RequestType } from './attendance.types';
import {
  errorMessage,
  fromCivilDate,
  shapeOf,
  tehranToday,
  toCivilDate,
} from './attendance.util';

export interface RequestPrefill {
  type?: RequestType;
  date?: string;
  direction?: 'in' | 'out';
  /** Manual attendance: `"HH:mm"`. */
  time?: string;
}

/**
 * New request — the caller's own, or (with `grantFor`) a grant an admin/HR
 * records for someone, created already approved. The fields follow the type:
 * daily types take a date range, hourly types and overtime a day and two
 * times, manual attendance a day, a time and a direction.
 */
export function RequestForm({
  isOpen,
  onClose,
  onSuccess,
  prefill,
  grantFor,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefill?: RequestPrefill;
  grantFor?: { id: number; name: string | null };
}) {
  const submit = useSubmitRequest();
  const grant = useGrant();
  const uploadAttachment = useUploadRequestAttachment();
  const start = prefill?.date ?? tehranToday();

  const [type, setType] = useState<RequestType | ''>(prefill?.type ?? '');
  const [dateFrom, setDateFrom] = useState(start);
  const [dateTo, setDateTo] = useState(start);
  const [date, setDate] = useState(start);
  const [timeFrom, setTimeFrom] = useState('');
  // Our working day ends at 17:00, which is when hourly requests usually stop.
  const [timeTo, setTimeTo] = useState('17:00');
  const [manualTime, setManualTime] = useState(prefill?.time ?? '');
  const [direction, setDirection] = useState<'in' | 'out'>(prefill?.direction ?? 'in');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const shape = shapeOf(type);
  // Someone in «بدون ثبت» doesn't check in, so there's no hourly remote work
  // and no late arrival to report; a remote day, leave and missions stay.
  const { data: me } = useMyToday();
  const untracked = !grantFor && me?.attendanceMode === AttendanceMode.UNTRACKED;
  const types = grantFor
    ? GRANT_TYPES
    : Object.values(RequestType).filter(
        (value) =>
          !untracked ||
          (value !== RequestType.REMOTE_HOURLY && value !== RequestType.MANUAL_ATTENDANCE),
      );
  const busy = submit.isLoading || grant.isLoading || uploadAttachment.isLoading;

  const rangeInvalid = shape === 'range' && dateTo < dateFrom;
  const ready =
    Boolean(type) &&
    !rangeInvalid &&
    (shape !== 'timed' || (timeFrom && timeTo)) &&
    (shape !== 'manual' || manualTime) &&
    (shape !== 'free' || description.trim());

  const handleSubmit = async () => {
    if (!type) return;
    const body: RequestInput = { type, description: description.trim() || undefined };

    if (shape === 'range') Object.assign(body, { dateFrom, dateTo });
    if (shape === 'timed') Object.assign(body, { date, timeFrom, timeTo });
    if (shape === 'manual') Object.assign(body, { date, manualTime, manualDirection: direction });

    try {
      if (grantFor) {
        await grant.submit({ id: grantFor.id, data: body });
        toast.success(`${REQUEST_TYPE_LABELS[type]} برای ${grantFor.name ?? 'پرسنل'} ثبت شد`);
      } else {
        const created = await submit.submit(body);
        // The request exists now; a failed file shouldn't undo it.
        const failed: string[] = [];
        for (const file of files) {
          try {
            await uploadAttachment.submit({ requestId: created.id, file });
          } catch {
            failed.push(file.name);
          }
        }
        toast.success('درخواست شما ثبت شد و در انتظار بررسی است');
        if (failed.length) {
          toast.warn(`بارگذاری پیوست ناموفق بود: ${failed.join('، ')} — از جزئیات درخواست دوباره اضافه کنید`);
        }
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'ثبت درخواست انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={grantFor ? `ثبت مستقیم برای ${grantFor.name ?? ''}` : 'درخواست جدید'}
      footer={
        <>
          <Button className="flex-1" disabled={!ready || busy} onClick={handleSubmit}>
            {busy ? 'در حال ثبت...' : grantFor ? 'ثبت و تایید' : 'ثبت درخواست'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      {grantFor && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
          این مورد مستقیماً تاییدشده ثبت می‌شود و سقف سیاست کاری روی آن اعمال نمی‌شود.
        </p>
      )}

      <Field label="نوع درخواست">
        <Dropdown
          items={types.map((value) => ({ label: REQUEST_TYPE_LABELS[value], value }))}
          value={type || null}
          onChange={(value) => setType((value as RequestType) ?? '')}
          placeholder="انتخاب کنید"
          variant="outline"
        />
      </Field>

      {shape === 'range' && (
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerField
            label="از تاریخ"
            value={fromCivilDate(dateFrom)}
            onSelect={(d) => {
              const next = toCivilDate(d);
              setDateFrom(next);
              if (dateTo < next) setDateTo(next);
            }}
          />
          <DatePickerField
            label="تا تاریخ"
            value={fromCivilDate(dateTo)}
            onSelect={(d) => setDateTo(toCivilDate(d))}
          />
          {rangeInvalid && <p className="w-full text-xs text-rose-500">«تا تاریخ» نباید پیش از «از تاریخ» باشد.</p>}
        </div>
      )}

      {(shape === 'timed' || shape === 'manual') && (
        <DatePickerField
          label="تاریخ"
          value={fromCivilDate(date)}
          onSelect={(d) => setDate(toCivilDate(d))}
        />
      )}

      {shape === 'timed' && (
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="از ساعت" value={timeFrom} onChange={setTimeFrom} />
          <TimeField label="تا ساعت" value={timeTo} onChange={setTimeTo} />
        </div>
      )}

      {shape === 'manual' && (
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="ساعت" value={manualTime} onChange={setManualTime} />
          <Field label="نوع تردد">
            <Dropdown
              items={[
                { label: 'ورود', value: 'in' as const },
                { label: 'خروج', value: 'out' as const },
              ]}
              value={direction}
              onChange={(value) => setDirection(value ?? 'in')}
              variant="outline"
            />
          </Field>
        </div>
      )}

      {shape && (
        <Input
          textarea
          label={shape === 'free' ? 'توضیحات' : 'توضیحات (اختیاری)'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      )}

      {shape && !grantFor && <AttachmentPicker files={files} onChange={setFiles} disabled={busy} />}
    </FormModal>
  );
}
