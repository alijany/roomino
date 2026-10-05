'use client';

import { Button, Input } from '@/ui/atoms';
import { Modal } from '@/ui/atoms/ui.modal';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useUpdateUserName } from './users.api';
import { User } from './users.types';

interface EditUserNameModalProps {
    user: User;
    onClose: () => void;
    onSaved: () => void;
}

/** Admin-only: rename a user. Mount it only while open so the fields start from the current name. */
export function EditUserNameModal({ user, onClose, onSaved }: EditUserNameModalProps) {
    const [firstName, setFirstName] = useState(user.firstName ?? '');
    const [lastName, setLastName] = useState(user.lastName ?? '');
    const { submit, isLoading, error } = useUpdateUserName();

    const unchanged = firstName.trim() === (user.firstName ?? '') && lastName.trim() === (user.lastName ?? '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await submit({ id: user.id, data: { firstName: firstName.trim(), lastName: lastName.trim() } });
            onSaved();
            onClose();
        } catch {
            // `error` is shown under the fields.
        }
    };

    return (
        <Modal isOpen onClose={onClose} className="rounded-t-2xl bg-white lg:min-w-[500px]">
            <div className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="font-bold text-lg text-slate-700 lg:text-xl">ویرایش نام کاربر</div>
                        <div className="text-xs text-slate-400" dir="ltr">{user.phone}</div>
                    </div>
                    <Button variant="outline" className="shrink-0 !px-2" onClick={onClose} aria-label="بستن">
                        <IconX className="size-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        id="edit-first-name"
                        packageId="edit-first-name"
                        label="نام"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        maxLength={50}
                        autoFocus
                        required
                    />
                    <Input
                        id="edit-last-name"
                        packageId="edit-last-name"
                        label="نام خانوادگی (اختیاری)"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        maxLength={50}
                    />

                    {error && (
                        <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600" role="alert">
                            {error.message || 'ذخیره نام انجام نشد'}
                        </p>
                    )}

                    <div className="flex gap-4 pt-2">
                        <Button type="submit" className="flex-1" disabled={isLoading || !firstName.trim() || unchanged}>
                            {isLoading ? 'در حال ذخیره...' : 'ذخیره'}
                        </Button>
                        <Button type="button" variant="ghost" className="flex-1 bg-slate-100" onClick={onClose}>
                            لغو
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
