'use client';

import { Button, Input, Modal } from '@/ui/atoms';
import { IconTrash, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useDeleteUser } from './users.api';
import { User } from './users.types';

/** The word to type before a user can be deleted. */
const WORD = 'حذف';

/**
 * The one place a user is deleted: a card at the foot of their page, and a
 * dialog that only goes ahead once «حذف» is typed. A person with payroll,
 * finance or attendance history is refused by the server; the reason shows
 * in the dialog.
 */
export function DeleteUserCard({ user }: { user: User }) {
    const router = useRouter();
    const deleteUser = useDeleteUser();
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState('');
    const [error, setError] = useState<string | null>(null);
    const ready = typed.trim() === WORD;

    const close = () => {
        setOpen(false);
        setTyped('');
        setError(null);
    };

    const handleDelete = async () => {
        setError(null);
        try {
            await deleteUser.submit(user.id);
            toast.success('کاربر حذف شد');
            router.push('/dashboard/users');
        } catch (e) {
            setError((e as Error)?.message || 'حذف انجام نشد');
        }
    };

    return (
        <>
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 lg:p-5">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-rose-700">حذف کاربر</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        نقش‌ها و رزروهای این کاربر هم حذف می‌شود و قابل بازگشت نیست. کاربری که سابقه‌ی مالی یا حقوقی دارد حذف نمی‌شود.
                    </p>
                </div>
                <Button variant="outline" className="gap-1 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setOpen(true)}>
                    <IconTrash className="size-4" />
                    حذف کاربر
                </Button>
            </section>

            <Modal isOpen={open} onClose={close} className="bg-white lg:min-w-[440px]">
                <div className="flex min-h-0 flex-col">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
                        <h3 className="text-lg font-bold text-slate-800">حذف «{user.name || user.phone}»</h3>
                        <Button variant="outline" className="shrink-0 !px-2" onClick={close} aria-label="بستن">
                            <IconX className="size-5" />
                        </Button>
                    </div>
                    <div className="space-y-3 p-5">
                        <p className="text-sm leading-7 text-slate-600">
                            این کاربر برای همیشه حذف می‌شود. برای تأیید، کلمه‌ی <strong className="text-rose-600">{WORD}</strong> را در کادر زیر بنویسید.
                        </p>
                        <Input
                            autoFocus
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder={WORD}
                            aria-label="تایپ کلمه‌ی حذف"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && ready && !deleteUser.isLoading) void handleDelete();
                            }}
                        />
                        {error && (
                            <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600" role="alert">
                                {error}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3 border-t border-slate-100 p-5">
                        <Button
                            className="flex-1 !bg-rose-600 hover:!bg-rose-700"
                            disabled={!ready || deleteUser.isLoading}
                            onClick={handleDelete}
                        >
                            {deleteUser.isLoading ? 'در حال حذف...' : 'حذف کاربر'}
                        </Button>
                        <Button variant="ghost" className="flex-1 bg-slate-100" onClick={close}>
                            لغو
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
