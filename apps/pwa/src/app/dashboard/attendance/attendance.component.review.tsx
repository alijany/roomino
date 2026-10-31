'use client';

import { Button, Input, ToggleSwitch } from '@/ui/atoms';
import { DatePickerField } from '@/ui/molecules';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ReviewBase, useApproveRequest, useEditRequest, useCorrectAttendance, CorrectionBase, useRejectRequest } from './attendance.api';
import { RequestAttachments } from './attendance.component.attachments';
import { FormModal, RequestStatusBadge, TimeField } from './attendance.component.layout';
import { AttendanceRequest, RequestStatus } from './attendance.types';
import { requestDurationLabel, errorMessage, fa, fromCivilDate, jalaliDateTime, jalaliLabel, shapeOf, toCivilDate } from './attendance.util';
import { PersonLabel } from '@/ui/molecules';

/** Approve/reject buttons for one pending request, with the reject note modal. */
export function ReviewActions({
  request,
  base,
  onDone,
  size = 'sm',
}: {
  request: AttendanceRequest;
  base: ReviewBase;
  onDone: () => void;
  size?: 'sm' | 'md';
}) {
  const approve = useApproveRequest(base);
  const reject = useRejectRequest(base);
  const [rejecting, setRejecting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');

  if (request.status !== RequestStatus.PENDING) return null;

  const handleApprove = async () => {
    try {
      await approve.submit(request.id);
      toast.success(`درخواست ${request.typeLabel} تایید شد`);
      onDone();
    } catch (error) {
      toast.error(errorMessage(error, 'تایید درخواست انجام نشد'));
    }
  };

  const handleReject = async () => {
    try {
      await reject.submit({ id: request.id, note: note.trim() });
      toast.warning('درخواست رد شد');
      setRejecting(false);
      onDone();
    } catch (error) {
      toast.error(errorMessage(error, 'رد درخواست انجام نشد'));
    }
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <Button size={size} disabled={approve.isLoading} onClick={handleApprove}>
        {approve.isLoading ? 'در حال تایید...' : 'تایید'}
      </Button>
      {['range', 'timed', 'manual'].includes(shapeOf(request.type) ?? '') && (
        <Button size={size} variant="outline" disabled={approve.isLoading} onClick={() => setEditing(true)}>
          ویرایش
        </Button>
      )}
      <Button
        size={size}
        variant="outline"
        className="text-rose-600"
        disabled={approve.isLoading}
        onClick={() => {
          setNote('');
          setRejecting(true);
        }}
      >
        رد
      </Button>

      <EditRequestModal
        request={editing ? request : null}
        base={base}
        onClose={() => setEditing(false)}
        onDone={() => {
          setEditing(false);
          onDone();
        }}
      />

      <FormModal
        isOpen={rejecting}
        onClose={() => setRejecting(false)}
        title="رد درخواست"
        footer={
          <>
            <Button className="flex-1 !bg-rose-600" disabled={reject.isLoading || !note.trim()} onClick={handleReject}>
              {reject.isLoading ? 'در حال ثبت...' : 'رد درخواست'}
            </Button>
            <Button variant="ghost" className="flex-1 bg-slate-100" onClick={() => setRejecting(false)}>
              بازگشت
            </Button>
          </>
        }
      >
        <RequestSummary request={request} />
        <Input
          textarea
          label="دلیل و توضیحات رد"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </FormModal>
    </div>
  );
}

/** A reviewer corrects the date or time of a pending request before deciding. */
function EditRequestModal({
  request,
  base,
  onClose,
  onDone,
}: {
  request: AttendanceRequest | null;
  base: ReviewBase;
  onClose: () => void;
  onDone: () => void;
}) {
  const edit = useEditRequest(base);
  // The caller opens it by passing the request; keep the last one while it fades out.
  const last = useRef(request);
  if (request) last.current = request;
  const r = last.current;

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [loadedId, setLoadedId] = useState<number | null>(null);

  // Start from the request's own values each time it is opened.
  if (request && loadedId !== request.id) {
    setLoadedId(request.id);
    setDateFrom(request.dateFrom ?? '');
    setDateTo(request.dateTo ?? request.dateFrom ?? '');
    setDate(request.date ?? '');
    setTimeFrom(request.timeFrom ?? '');
    setTimeTo(request.timeTo ?? '');
    setManualTime(request.manualTime ?? '');
  }
  if (!request && loadedId !== null) setLoadedId(null);

  if (!r) return null;
  const shape = shapeOf(r.type);
  const rangeInvalid = shape === 'range' && dateTo < dateFrom;
  const timeInvalid = shape === 'timed' && (!timeFrom || !timeTo || timeTo <= timeFrom);

  const handleSave = async () => {
    const data =
      shape === 'range'
        ? { dateFrom, dateTo }
        : shape === 'timed'
          ? { date, timeFrom, timeTo }
          : { date, manualTime };
    try {
      await edit.submit({ id: r.id, data });
      toast.success('تاریخ و ساعت درخواست اصلاح شد');
      onDone();
    } catch (error) {
      toast.error(errorMessage(error, 'ویرایش انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen={request !== null}
      onClose={onClose}
      title="ویرایش تاریخ و ساعت"
      footer={
        <>
          <Button className="flex-1" disabled={edit.isLoading || rangeInvalid || timeInvalid} onClick={handleSave}>
            {edit.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            بازگشت
          </Button>
        </>
      }
    >
      <RequestSummary request={r} />

      {shape === 'range' && (
        <div className="flex flex-wrap gap-3">
          <DatePickerField
            label="از تاریخ"
            value={fromCivilDate(dateFrom)}
            onSelect={(d) => {
              const next = toCivilDate(d);
              setDateFrom(next);
              if (dateTo < next) setDateTo(next);
            }}
          />
          <DatePickerField label="تا تاریخ" value={fromCivilDate(dateTo)} onSelect={(d) => setDateTo(toCivilDate(d))} />
          {rangeInvalid && <p className="w-full text-xs text-rose-500">«تا تاریخ» نباید پیش از «از تاریخ» باشد.</p>}
        </div>
      )}

      {(shape === 'timed' || shape === 'manual') && (
        <DatePickerField label="تاریخ" value={fromCivilDate(date)} onSelect={(d) => setDate(toCivilDate(d))} />
      )}

      {shape === 'timed' && (
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="از ساعت" value={timeFrom} onChange={setTimeFrom} />
          <TimeField label="تا ساعت" value={timeTo} onChange={setTimeTo} />
          {timeInvalid && timeFrom && timeTo && <p className="col-span-2 text-xs text-rose-500">ساعت پایان باید بعد از ساعت شروع باشد.</p>}
        </div>
      )}

      {shape === 'manual' && <TimeField label="ساعت" value={manualTime} onChange={setManualTime} />}
    </FormModal>
  );
}

/** Who, what and when — the line a reviewer confirms before deciding. */
function RequestSummary({ request }: { request: AttendanceRequest }) {
  return (
    <div className="space-y-1 rounded-xl bg-slate-50 px-4 py-3 text-sm">
      {request.employee?.name && (
        <PersonLabel name={request.employee.name} picture={request.employee.profilePicture} avatarClassName="size-7" />
      )}
      <div className="text-slate-600">
        {request.typeLabel} · {fa(request.periodLabel)}
      </div>
    </div>
  );
}

/** Full detail of a request. */
export function RequestDetailModal({
  request,
  onClose,
  actions,
  canEditAttachments = false,
}: {
  request: AttendanceRequest | null;
  onClose: () => void;
  actions?: React.ReactNode;
  /** The caller's own pending request: they may add and remove documents. */
  canEditAttachments?: boolean;
}) {
  // The caller clears `request` to close; keep showing the last one while
  // the modal fades out instead of collapsing to an empty sheet.
  const last = useRef({ request, actions });
  if (request) last.current = { request, actions };
  const shown = last.current.request;

  const rows: Array<[string, React.ReactNode]> = shown
    ? [
        ['نوع', shown.typeLabel],
        ['پرسنل', shown.employee ? `${shown.employee.name ?? ''} (${fa(shown.employee.personnelCode)})` : null],
        ['تاریخ', fa(shown.periodLabel)],
        ['مدت', requestDurationLabel(shown)],
        ['وضعیت', <RequestStatusBadge key="s" status={shown.status} />],
        ['ثبت', jalaliDateTime(shown.createdAt)],
        [
          'منبع',
          shown.autoSuggested
            ? shown.status === RequestStatus.APPROVED
              ? 'ثبت خودکار بر اساس ساعت خروج (۳۰ تا ۶۰ دقیقه بعد از پایان شیفت)'
              : 'پیشنهاد خودکار بر اساس ساعت خروج، برای تایید مدیر'
            : null,
        ],
        ['توضیحات', shown.description],
        ['بررسی‌کننده', shown.reviewedBy?.name],
        ['زمان بررسی', shown.reviewedAt ? jalaliDateTime(shown.reviewedAt) : null],
        ['یادداشت بررسی', shown.reviewNote],
      ]
    : [];

  return (
    <FormModal
      isOpen={request !== null}
      onClose={onClose}
      title="جزئیات درخواست"
      footer={last.current.actions}
    >
      <dl className="divide-y divide-slate-100 text-sm">
        {rows
          .filter(([, value]) => value !== null && value !== undefined && value !== '')
          .map(([label, value]) => (
            <div key={label} className="flex gap-4 py-2">
              <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
              <dd className="min-w-0 grow whitespace-pre-wrap break-words text-slate-800">{value}</dd>
            </div>
          ))}
      </dl>
      {shown && <RequestAttachments requestId={shown.id} canEdit={canEditAttachments} />}
    </FormModal>
  );
}

/** Record or correct one day's check-in/out, with a required reason. */
export function CorrectionModal({
  target,
  base,
  onClose,
  onDone,
}: {
  target: { employeeId: number; name: string | null; date: string; checkIn: string | null; checkOut: string | null } | null;
  base: CorrectionBase;
  onClose: () => void;
  onDone: () => void;
}) {
  const correct = useCorrectAttendance(base);
  const [checkIn, setCheckIn] = useState(target?.checkIn ?? '');
  const [checkOut, setCheckOut] = useState(target?.checkOut ?? '');
  // The way to record an absence — in schedule mode a day with nothing
  // recorded counts as worked.
  const [absent, setAbsent] = useState(false);
  const [note, setNote] = useState('');

  const handleSave = async () => {
    if (!target) return;
    try {
      await correct.submit({
        id: target.employeeId,
        data: absent
          ? { date: target.date, absent: true, note: note.trim() }
          : { date: target.date, checkIn, checkOut: checkOut || undefined, note: note.trim() },
      });
      toast.success(absent ? `غیبت ${target.name ?? ''} ثبت شد` : `تردد ${target.name ?? ''} ثبت شد`);
      onDone();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, 'ثبت تردد انجام نشد'));
    }
  };

  return (
    <FormModal
      isOpen={target !== null}
      onClose={onClose}
      title="ثبت / اصلاح تردد"
      footer={
        <>
          <Button className="flex-1" disabled={(!absent && !checkIn) || !note.trim() || correct.isLoading} onClick={handleSave}>
            {correct.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      {target && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <span className="font-medium text-slate-800">{target.name ?? 'پرسنل'}</span>
          <span className="text-slate-500">{jalaliLabel(target.date)}</span>
        </div>
      )}
      <ToggleSwitch label="غایب بود" checked={absent} onChange={setAbsent} />
      {absent ? (
        <p className="rounded-xl bg-rose-50 p-3 text-xs leading-5 text-rose-700">
          ورود و خروج این روز پاک و روز غیبت ثبت می‌شود — حتی در حالت «حضور طبق شیفت».
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="ساعت ورود" value={checkIn} onChange={setCheckIn} />
          <TimeField label="ساعت خروج (اختیاری)" value={checkOut} onChange={setCheckOut} />
        </div>
      )}
      <Input
        textarea
        label="دلیل اصلاح"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={absent ? 'مثلاً غیبت بدون اطلاع' : 'مثلاً فراموشی ثبت خروج'}
      />
      <p className="text-xs text-slate-400">نام شما و دلیل اصلاح کنار این روز ثبت می‌شود.</p>
    </FormModal>
  );
}
