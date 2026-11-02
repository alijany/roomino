'use client';

import { fromCivilDate, jalaliLabel, tehranToday, toCivilDate } from '@/app/dashboard/attendance/attendance.util';
import { Button, Input, Modal, ToggleSwitch } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { DataView, DatePickerField } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { IconCheck, IconPencil, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAddContract, useDeleteContract, useSetNda, useUpdateContract, useUserContracts } from './contracts.api';
import { Contract, ContractState, SaveContractDto } from './contracts.types';

const STATE_BADGE: Record<ContractState, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
    none: { label: 'بدون قرارداد', tone: 'neutral' },
    active: { label: 'قرارداد فعال', tone: 'success' },
    ending: { label: 'رو به پایان', tone: 'warning' },
    expired: { label: 'منقضی شده', tone: 'danger' },
};

/** Civil date `n` days after `date`. */
function addDays(date: string, n: number): string {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div className="min-w-0">
            <div className="mb-1.5 text-sm font-medium text-slate-700">{label}</div>
            <DatePickerField
                hideLabel
                className="w-full justify-start gap-2 !px-3"
                label={label}
                value={fromCivilDate(value)}
                minSelectableDate={new Date('2000-01-01')}
                onSelect={(d) => onChange(toCivilDate(d))}
            />
        </div>
    );
}

/** A person's contract terms and NDA: the current term, the history, and a renewal. */
export function ContractsCard({ userId }: { userId: number }) {
    const { data, error, isLoading, refresh } = useUserContracts(userId);
    const add = useAddContract(userId);
    const update = useUpdateContract();
    const remove = useDeleteContract();
    const nda = useSetNda(userId);
    const [toDelete, setToDelete] = useState<number | null>(null);

    const latest = data?.contracts[0];
    // Listed by when a term starts, newest first.
    const sorted = [...(data?.contracts ?? [])].sort((x, y) => y.startDate.localeCompare(x.startDate) || y.id - x.id);
    // A renewal starts the day after the last term ends — or today, when there is none or it is long over.
    const suggestedStart = latest && latest.endDate >= tehranToday() ? addDays(latest.endDate, 1) : tehranToday();
    const [start, setStart] = useState<string | null>(null);
    const [end, setEnd] = useState<string | null>(null);
    const [signed, setSigned] = useState(false);
    const [note, setNote] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    /** Opens the form on a fresh term: after the last one, a year long, unsigned. */
    const openForm = () => {
        setStart(null);
        setEnd(null);
        setSigned(false);
        setNote('');
        setFormOpen(true);
    };
    const startValue = start ?? suggestedStart;
    const endValue = end ?? addDays(startValue, 364);

    /** Runs the action and reports whether it went through; a failure shows its reason. */
    const run = async (action: () => Promise<unknown>, done?: string): Promise<boolean> => {
        try {
            await action();
            if (done) toast.success(done);
            refresh();
            return true;
        } catch (e) {
            toast.error((e as Error)?.message || 'انجام نشد');
            return false;
        }
    };

    return (
        <DataView data={data} error={error} isLoading={isLoading} onRetry={refresh}>
            {data && (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                        <Badge tone={STATE_BADGE[data.current.state].tone}>{STATE_BADGE[data.current.state].label}</Badge>
                        {latest && (
                            <span>
                                پایان قرارداد فعلی: {jalaliLabel(latest.endDate)}
                                {data.current.daysLeft !== null && data.current.daysLeft >= 0 && ` (${data.current.daysLeft.toLocaleString('fa-IR')} روز مانده)`}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3">
                        <ToggleSwitch
                            size="sm"
                            aria-label="NDA امضا شده"
                            checked={data.nda.signed}
                            disabled={nda.isLoading}
                            onChange={(checked) =>
                                run(() => nda.submit({ signed: checked, signedDate: checked ? tehranToday() : undefined }), checked ? 'NDA امضاشده ثبت شد' : 'NDA برداشته شد')
                            }
                        />
                        <span className="text-sm font-medium text-slate-700">NDA امضا شده (تا پایان همکاری معتبر است)</span>
                        {data.nda.signed && data.nda.signedDate && <span className="text-xs text-slate-500">از {jalaliLabel(data.nda.signedDate)}</span>}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-800">قراردادها</h3>
                        <Button type="button" size="sm" className="gap-1" onClick={openForm}>
                            <IconPlus className="size-4" />
                            قرارداد جدید
                        </Button>
                    </div>

                    <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} className="bg-white lg:min-w-[520px]">
                        <div className="flex min-h-0 flex-col">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
                                <h3 className="text-lg font-bold text-slate-800">{latest ? 'تمدید / ثبت قرارداد جدید' : 'ثبت قرارداد'}</h3>
                                <Button variant="outline" className="shrink-0 !px-2" onClick={() => setFormOpen(false)} aria-label="بستن">
                                    <IconX className="size-5" />
                                </Button>
                            </div>
                            <div className="space-y-4 p-5">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <DateField label="شروع قرارداد" value={startValue} onChange={setStart} />
                                    <DateField label="پایان قرارداد" value={endValue} onChange={setEnd} />
                                </div>
                                <Input
                                    id="contract-note"
                                    packageId="contract-note"
                                    label="توضیحات"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    maxLength={500}
                                />
                                <label className="flex items-center gap-3 text-sm text-slate-700">
                                    <ToggleSwitch size="sm" aria-label="امضا شده" checked={signed} onChange={setSigned} />
                                    امضا شده
                                </label>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
                                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                                    انصراف
                                </Button>
                                <Button
                                    type="button"
                                    disabled={add.isLoading}
                                    onClick={async () => {
                                        const ok = await run(
                                            () => add.submit({ startDate: startValue, endDate: endValue, signed, note: note.trim() || undefined }),
                                            'قرارداد ثبت شد',
                                        );
                                        if (ok) setFormOpen(false);
                                    }}
                                >
                                    {add.isLoading ? 'در حال ثبت...' : 'ثبت'}
                                </Button>
                            </div>
                        </div>
                    </Modal>

                    {sorted.length > 0 && (
                        <ul className="space-y-2">
                            {sorted.map((c) => (
                                <ContractRow
                                    key={c.id}
                                    contract={c}
                                    onSave={(data) => run(() => update.submit({ id: c.id, data }), 'تغییرات ذخیره شد')}
                                    saving={update.isLoading}
                                    onDelete={() => setToDelete(c.id)}
                                />
                            ))}
                        </ul>
                    )}
                    <ConfirmModal
                        isOpen={toDelete !== null}
                        onClose={() => setToDelete(null)}
                        title="حذف قرارداد"
                        message="این قرارداد حذف شود؟"
                        confirmButtonText="حذف"
                        isLoading={remove.isLoading}
                        onConfirm={() =>
                            toDelete !== null &&
                            run(async () => {
                                await remove.submit(toDelete);
                                setToDelete(null);
                            }, 'قرارداد حذف شد')
                        }
                    />
                </div>
            )}
        </DataView>
    );
}

/** One term: «dates | note» with signed and the edit and delete actions; editing opens the fields in place. */
function ContractRow({
    contract,
    onSave,
    saving,
    onDelete,
}: {
    contract: Contract;
    onSave: (data: Partial<SaveContractDto>) => Promise<boolean>;
    saving: boolean;
    onDelete: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [start, setStart] = useState(contract.startDate);
    const [end, setEnd] = useState(contract.endDate);
    const [note, setNote] = useState(contract.note ?? '');

    const open = () => {
        setStart(contract.startDate);
        setEnd(contract.endDate);
        setNote(contract.note ?? '');
        setEditing(true);
    };

    if (editing) {
        return (
            <li className="space-y-3 rounded-xl border border-slate-300 bg-white p-3 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                    <DateField label="شروع قرارداد" value={start} onChange={setStart} />
                    <DateField label="پایان قرارداد" value={end} onChange={setEnd} />
                </div>
                <Input id={`contract-note-${contract.id}`} packageId={`contract-note-${contract.id}`} label="توضیحات" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => setEditing(false)}>
                        <IconX className="size-4" />
                        انصراف
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="gap-1"
                        disabled={saving || !start || !end}
                        onClick={async () => {
                            if (await onSave({ startDate: start, endDate: end, note: note.trim() })) setEditing(false);
                        }}
                    >
                        <IconCheck className="size-4" />
                        ذخیره
                    </Button>
                </div>
            </li>
        );
    }

    return (
        <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 text-sm">
            <span className="min-w-0 flex-1 text-slate-700">
                <span className="tabular-nums font-medium">
                    {jalaliLabel(contract.startDate)} تا {jalaliLabel(contract.endDate)}
                </span>
                {contract.note && (
                    <>
                        <span className="px-2 text-slate-300">|</span>
                        <span className="text-slate-500">{contract.note}</span>
                    </>
                )}
            </span>
            <label className="flex items-center gap-2 text-xs text-slate-500">
                <ToggleSwitch size="sm" aria-label="امضا شده" checked={contract.signed} onChange={(checked) => onSave({ signed: checked })} />
                {contract.signed ? 'امضا شده' : 'امضا نشده'}
            </label>
            <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" className="!px-2 text-slate-400 hover:text-slate-700" aria-label="ویرایش قرارداد" onClick={open}>
                    <IconPencil className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="!px-2 text-slate-400 hover:text-rose-600" aria-label="حذف قرارداد" onClick={onDelete}>
                    <IconTrash className="size-4" />
                </Button>
            </div>
        </li>
    );
}
