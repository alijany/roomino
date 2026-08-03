'use client';

import { Role, Roles, getRoleName } from '@/components/auth/auth.constants.roles';
import { Button } from '@/ui/atoms';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { ResultModal } from '@/ui/molecules/result-modal';
import { useState } from 'react';
import { useApproveUser, useUpdateUserRole } from './users.api';
import { User, UserRole } from './users.types';

interface UserRowProps {
    user: User;
    onChanged?: () => void;
}

const roleOptions = Roles.map((role) => ({ value: role, label: getRoleName(role) }));

export function UserRow({ user, onChanged }: UserRowProps) {
    const approve = useApproveUser();
    const updateRole = useUpdateUserRole();
    const [result, setResult] = useState<{ status: 'success' | 'error'; message?: string } | null>(null);

    const handleApprove = async () => {
        try {
            await approve.submit(user.id);
            setResult({ status: 'success' });
            onChanged?.();
        } catch {
            setResult({ status: 'error', message: approve.error?.message });
        }
    };

    const handleRoleChange = async (role: UserRole, newRole: Role | null) => {
        if (!newRole || newRole === role.role) return;
        try {
            await updateRole.submit({ id: user.id, data: { roleId: role.id, role: newRole } });
            setResult({ status: 'success' });
            onChanged?.();
        } catch {
            setResult({ status: 'error', message: updateRole.error?.message });
        }
    };

    return (
        <>
            <div
                className="px-3 py-2.5 rounded-2xl border border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4 items-center"
            >
                <div className="space-y-1">
                    <h3 className="text-slate-400">{user.name ?? 'بدون نام'}</h3>
                    <div className="font-semibold text-slate-500">{user.phone ?? 'بدون شماره'}</div>
                    {!user.isApproved && (
                        <div className="inline-flex px-2 py-1 rounded-full bg-amber-100 text-amber-600 text-xs font-semibold">
                            در انتظار تایید
                        </div>
                    )}
                </div>

                <div className="flex items-center flex-wrap justify-end gap-2">
                    {!user.isApproved && (
                        <Button
                            variant="secondary"
                            className="!px-3 !py-1.5 text-xs"
                            onClick={handleApprove}
                            disabled={approve.isLoading}
                        >
                            {approve.isLoading ? 'در حال تایید...' : 'تایید کاربر'}
                        </Button>
                    )}

                    {user.roles.map((role) => (
                        <Dropdown
                            key={role.id}
                            items={roleOptions}
                            value={role.role}
                            onChange={(value) => handleRoleChange(role, value as Role | null)}
                            variant="outline"
                            size="sm"
                            className="w-auto min-w-[120px]"
                            disabled={updateRole.isLoading}
                        />
                    ))}
                </div>
            </div>

            <ResultModal
                isOpen={result !== null}
                onClose={() => {
                    setResult(null);
                    approve.reset();
                    updateRole.reset();
                }}
                status={result?.status || 'success'}
                title="مدیریت کاربر"
                successMessage="تغییرات با موفقیت اعمال شد"
                errorMessage={result?.message || 'خطا در اعمال تغییرات'}
            />
        </>
    );
}
