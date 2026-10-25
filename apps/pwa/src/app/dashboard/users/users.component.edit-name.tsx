'use client';

import { Role, Roles, getRoleName } from '@/components/auth/auth.constants.roles';
import { Button, Input } from '@/ui/atoms';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { Modal } from '@/ui/atoms/ui.modal';
import { IconPlus, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useAddUserRole, useRemoveUserRole, useUpdateUserName } from './users.api';
import { User, UserRole } from './users.types';

interface EditUserNameModalProps {
    user: User;
    onClose: () => void;
    onSaved: () => void;
}

/** Admin-only: edit a user's name, personnel code and job title. Mount it only while open so the fields start from the current name. */
export function EditUserNameModal({ user, onClose, onSaved }: EditUserNameModalProps) {
    const [firstName, setFirstName] = useState(user.firstName ?? '');
    const [lastName, setLastName] = useState(user.lastName ?? '');
    const [personnelCode, setPersonnelCode] = useState(user.personnelCode ?? '');
    const [jobTitle, setJobTitle] = useState(user.jobTitle ?? '');
    const { submit, isLoading, error } = useUpdateUserName();

    const unchanged =
        firstName.trim() === (user.firstName ?? '') &&
        lastName.trim() === (user.lastName ?? '') &&
        personnelCode.trim() === (user.personnelCode ?? '') &&
        jobTitle.trim() === (user.jobTitle ?? '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await submit({ id: user.id, data: {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    personnelCode: personnelCode.trim() || undefined,
                    jobTitle: jobTitle.trim(),
                },
            });
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
                        <div className="font-bold text-lg text-slate-700 lg:text-xl">ویرایش کاربر</div>
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

                    <Input
                        id="edit-personnel-code"
                        packageId="edit-personnel-code"
                        label="کد پرسنلی"
                        dir="ltr"
                        className="text-left"
                        value={personnelCode}
                        onChange={(e) => setPersonnelCode(e.target.value)}
                        maxLength={50}
                        required
                    />
                    <Input
                        id="edit-job-title"
                        packageId="edit-job-title"
                        label="عنوان شغلی (اختیاری)"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        maxLength={100}
                    />

                    <RolesEditor user={user} onChanged={onSaved} />

                    {error && (
                        <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600" role="alert">
                            {error.message || 'ذخیره انجام نشد'}
                        </p>
                    )}

                    <div className="flex gap-4 pt-2">
                        <Button type="submit" className="flex-1" disabled={isLoading || !firstName.trim() || !personnelCode.trim() || unchanged}>
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

/** Roles take effect at once, apart from the Save button, and keep at least one. */
function RolesEditor({ user, onChanged }: { user: User; onChanged: () => void }) {
    const addRole = useAddUserRole();
    const removeRole = useRemoveUserRole();
    const [error, setError] = useState<string | null>(null);
    const busy = addRole.isLoading || removeRole.isLoading;

    const run = async (action: () => Promise<unknown>) => {
        setError(null);
        try {
            await action();
            onChanged();
        } catch (e) {
            setError((e as Error)?.message || 'تغییر نقش انجام نشد');
        }
    };

    const addable = Roles.filter((role) => !user.roles.some((r) => r.role === role)).map((role) => ({
        value: role,
        label: getRoleName(role),
    }));

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">نقش‌ها</div>
            <div className="flex flex-wrap items-center gap-1.5">
                {user.roles.map((role: UserRole) => (
                    <span
                        key={role.id}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600"
                    >
                        {getRoleName(role.role)}
                        {user.roles.length > 1 && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => run(() => removeRole.submit({ id: user.id, roleId: role.id }))}
                                className="text-slate-400 hover:text-rose-500"
                                aria-label={`حذف نقش ${getRoleName(role.role)}`}
                            >
                                <IconX size={13} />
                            </button>
                        )}
                    </span>
                ))}
                {addable.length > 0 && (
                    <Dropdown
                        items={addable}
                        value={null}
                        onChange={async (role: Role | null) => {
                            if (role) await run(() => addRole.submit({ id: user.id, data: { role } }));
                        }}
                        disabled={busy}
                        renderButton={() => (
                            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-1 text-xs font-medium text-slate-500 hover:border-primary/50 hover:text-primary">
                                <IconPlus size={13} />
                                نقش جدید
                            </span>
                        )}
                    />
                )}
            </div>
            {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
        </div>
    );
}
