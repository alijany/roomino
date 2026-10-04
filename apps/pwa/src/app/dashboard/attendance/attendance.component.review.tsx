'use client';

import { Button, Input } from '@/ui/atoms';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { ReviewBase, useApproveRequest, useCorrectAttendance, CorrectionBase, useRejectRequest } from './attendance.api';
import { FormModal, RequestStatusBadge, TimeField } from './attendance.component.layout';
import { AttendanceRequest, RequestStatus } from './attendance.types';
import { durationLabel, errorMessage, fa, jalaliDateTime, jalaliLabel } from './attendance.util';

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
      await reject.submit({ id: request.id, note: note.trim() || undefined });
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
        تایید
      </Button>
      <Button
        size={size}
        variant="outline"
        className="text-rose-600"
        onClick={() => {
          setNote('');
          setRejecting(true);
        }}
      >
        رد
      </Button>

      <FormModal
        isOpen={rejecting}
        onClose={() => setRejecting(false)}
        title="رد درخواست"
        footer={
          <>
            <Button className="flex-1 !bg-rose-600" disabled={reject.isLoading} onClick={handleReject}>
              {reject.isLoading ? 'در حال ثبت...' : 'رد درخواست'}
            </Button>
            <Button variant="ghost" className="flex-1 bg-slate-100" onClick={() => setRejecting(false)}>
              بازگشت
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {request.typeLabel} {request.employee?.name ? `${request.employee.name} — ` : ''}
          {fa(request.periodLabel)}
        </p>
        <Input
          textarea
          label="دلیل رد (اختیاری)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </FormModal>
    </div>
  );
}

/** Full detail of a request. */
export function RequestDetailModal({
  request,
  onClose,
  actions,
}: {
  request: AttendanceRequest | null;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  const rows: Array<[string, React.ReactNode]> = request
    ? [
        ['نوع', request.typeLabel],
        ['پرسنل', request.employee ? `${request.employee.name ?? ''} (${fa(request.employee.personnelCode)})` : null],
        ['تاریخ', fa(request.periodLabel)],
        ['مدت', durationLabel(request.durationMinutes)],
        ['وضعیت', <RequestStatusBadge key="s" status={request.status} />],
        ['ثبت', jalaliDateTime(request.createdAt)],
        ['توضیحات', request.description],
        ['بررسی‌کننده', request.reviewedBy?.name],
        ['زمان بررسی', request.reviewedAt ? jalaliDateTime(request.reviewedAt) : null],
        ['یادداشت بررسی', request.reviewNote],
      ]
    : [];

  return (
    <FormModal
      isOpen={request !== null}
      onClose={onClose}
      title="جزئیات درخواست"
      footer={actions}
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
  const [note, setNote] = useState('');

  const handleSave = async () => {
    if (!target) return;
    try {
      await correct.submit({
        id: target.employeeId,
        data: { date: target.date, checkIn, checkOut: checkOut || undefined, note: note.trim() },
      });
      toast.success(`تردد ${target.name ?? ''} ثبت شد`);
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
      title={`ثبت / اصلاح تردد — ${target ? jalaliLabel(target.date) : ''}`}
      footer={
        <>
          <Button className="flex-1" disabled={!checkIn || !note.trim() || correct.isLoading} onClick={handleSave}>
            {correct.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
          </Button>
          <Button variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
            لغو
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <TimeField label="ساعت ورود" value={checkIn} onChange={setCheckIn} />
        <TimeField label="ساعت خروج (اختیاری)" value={checkOut} onChange={setCheckOut} />
      </div>
      <Input
        textarea
        label="دلیل اصلاح"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="مثلاً فراموشی ثبت خروج"
      />
      <p className="text-xs text-slate-400">نام شما و دلیل اصلاح کنار این روز ثبت می‌شود.</p>
    </FormModal>
  );
}
