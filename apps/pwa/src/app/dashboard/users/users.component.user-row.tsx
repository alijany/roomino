'use client';

import { Role, Roles, getRoleName } from '@/components/auth/auth.constants.roles';
import { cn } from '@/libs/style/style.util.helpers';
import { Avatar, Button } from '@/ui/atoms';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconCheck, IconPlus, IconTrash, IconUser, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useApproveUser, useAddUserRole, useDeleteUser, useRemoveUserRole } from './users.api';
import { User, UserRole } from './users.types';

interface UserRowProps {
    user: User;
    onChanged?: () => void;
}

function RoleBadge({ role, onRemove, removable }: { role: UserRole; onRemove?: () => void; removable: boolean }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
            {getRoleName(role.role)}
            {removable && onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-slate-400 hover:text-rose-500"
                    aria-label={`حذف نقش ${getRoleName(role.role)}`}
                >
                    <IconX size={13} />
                </button>
            )}
        </span>
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
            <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-primary/30 hover:shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)]">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                            icon={IconUser}
                            className="size-11 shrink-0 bg-primary/10"
                            iconClassName="size-6 text-primary"
                        />
                        <div className="min-w-0">
                            <h3 className="font-semibold text-slate-800 truncate">{user.name ?? 'بدون نام'}</h3>
                            <p className="text-xs text-slate-400 truncate" dir="ltr">{user.phone ?? 'بدون شماره'}</p>
                        </div>
                    </div>
                    <span
                        className={cn(
                            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            user.isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        )}
                    >
                        <span className={cn('size-1.5 rounded-full', user.isApproved ? 'bg-emerald-500' : 'bg-amber-500')} />
                        {user.isApproved ? 'تایید شده' : 'در انتظار تایید'}
                    </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
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
                            disabled={addRole.isLoading}
                            renderButton={() => (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs font-medium transition-colors',
                                        addRole.isLoading
                                            ? 'border-slate-200 text-slate-300'
                                            : 'border-slate-300 text-slate-500 hover:border-primary/50 hover:text-primary'
                                    )}
                                >
                                    <IconPlus size={13} />
                                    نقش جدید
                                </span>
                            )}
                        />
                    )}
                </div>

                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-50">
                    <div className="flex-1">
                        {!user.isApproved && (
                            <Button
                                variant="outline"
                                className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={handleApprove}
                                disabled={approve.isLoading}
                            >
                                <IconCheck className="size-4" />
                                <span>{approve.isLoading ? 'در حال تایید...' : 'تایید کاربر'}</span>
                            </Button>
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
