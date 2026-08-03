'use client';

import { Role, Roles, getRoleName } from '@/components/auth/auth.constants.roles';
import { Button } from '@/ui/atoms';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconCheck, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useApproveUser, useAddUserRole, useDeleteUser, useRemoveUserRole } from './users.api';
import { User, UserRole } from './users.types';

interface UserRowProps {
    user: User;
    onChanged?: () => void;
}

function RoleBadge({ role, onRemove, removable }: { role: UserRole; onRemove?: () => void; removable: boolean }) {
    return (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            {getRoleName(role.role)}
            {removable && onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-slate-400 hover:text-rose-500"
                    aria-label={`حذف نقش ${getRoleName(role.role)}`}
                >
                    <IconX size={14} />
                </button>
            )}
        </div>
    );
}

export function UserRow({ user, onChanged }: UserRowProps) {
    const approve = useApproveUser();
    const addRole = useAddUserRole();
    const removeRole = useRemoveUserRole();
    const deleteUser = useDeleteUser();
    const [result, setResult] = useState<{ status: 'success' | 'error'; message?: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleApprove = async () => {
        try {
            await approve.submit(user.id);
            setResult({ status: 'success' });
            onChanged?.();
        } catch {
            setResult({ status: 'error', message: approve.error?.message });
        }
    };

    const handleAddRole = async (role: Role | null) => {
        if (!role) return;
        try {
            await addRole.submit({ id: user.id, data: { role } });
            setResult({ status: 'success' });
            onChanged?.();
        } catch {
            setResult({ status: 'error', message: addRole.error?.message });
        }
    };

    const handleRemoveRole = async (role: UserRole) => {
        try {
            await removeRole.submit({ id: user.id, roleId: role.id });
            setResult({ status: 'success' });
            onChanged?.();
        } catch {
            setResult({ status: 'error', message: removeRole.error?.message });
        }
    };

    const handleDelete = async () => {
        setConfirmDelete(false);
        try {
            await deleteUser.submit(user.id);
            setResult({ status: 'success' });
            onChanged?.();
        } catch {
            setResult({ status: 'error', message: deleteUser.error?.message });
        }
    };

    const addableRoles = Roles.filter((role) => !user.roles.some((r) => r.role === role))
        .map((role) => ({ value: role, label: getRoleName(role) }));

    return (
        <>
            <div
                className="px-3 py-2.5 rounded-2xl border border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start"
            >
                <div className="space-y-1">
                    <h3 className="text-slate-400">{user.name ?? 'بدون نام'}</h3>
                    <div className="font-semibold text-slate-500">{user.phone ?? 'بدون شماره'}</div>
                    {user.isApproved ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-600 text-xs font-semibold">
                            <IconCheck size={14} />
                            تایید شده
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="inline-flex px-2 py-1 rounded-full bg-amber-100 text-amber-600 text-xs font-semibold">
                                در انتظار تایید
                            </div>
                            <Button
                                variant="secondary"
                                className="!px-3 !py-1.5 text-xs"
                                onClick={handleApprove}
                                disabled={approve.isLoading}
                            >
                                {approve.isLoading ? 'در حال تایید...' : 'تایید کاربر'}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-start flex-wrap justify-end gap-2">
                    <div className="flex items-center flex-wrap justify-end gap-2 grow">
                        {user.roles.map((role) => (
                            <RoleBadge
                                key={role.id}
                                role={role}
                                removable={user.roles.length > 1}
                                onRemove={() => handleRemoveRole(role)}
                            />
                        ))}

                        {addableRoles.length > 0 && (
                            <Dropdown
                                items={addableRoles}
                                value={null}
                                onChange={handleAddRole}
                                placeholder="+ افزودن نقش"
                                variant="outline"
                                size="sm"
                                className="w-auto min-w-[130px]"
                                disabled={addRole.isLoading}
                            />
                        )}
                    </div>

                    <Button
                        variant="outline"
                        className="!px-2.5 text-rose-500 hover:bg-rose-50"
                        onClick={() => setConfirmDelete(true)}
                        aria-label="حذف کاربر"
                    >
                        <IconTrash className="size-5" />
                    </Button>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
                title="حذف کاربر"
                message={`آیا از حذف «${user.name || user.phone}» مطمئن هستید؟ نقش‌ها و رزروهای این کاربر نیز حذف خواهند شد.`}
                confirmButtonText="حذف"
            />

            <ResultModal
                isOpen={result !== null}
                onClose={() => {
                    setResult(null);
                    approve.reset();
                    addRole.reset();
                    removeRole.reset();
                    deleteUser.reset();
                }}
                status={result?.status || 'success'}
                title="مدیریت کاربر"
                successMessage="تغییرات با موفقیت اعمال شد"
                errorMessage={result?.message || 'خطا در اعمال تغییرات'}
            />
        </>
    );
}
