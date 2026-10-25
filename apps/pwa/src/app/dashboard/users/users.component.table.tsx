'use client';

import { Role, Roles, getRoleName } from '@/components/auth/auth.constants.roles';
import { cn } from '@/libs/style/style.util.helpers';
import { Button } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { PersonLabel, Table } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconCheck, IconPencil, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useAddUserRole, useApproveUser, useDeleteUser, useRemoveUserRole } from './users.api';
import { EditUserNameModal } from './users.component.edit-name';
import { User, UserRole } from './users.types';

interface UsersTableProps {
    users: User[];
    onChanged: () => void;
    /** Editing, role add/remove and delete are admin-only; HR can only confirm registrations. */
    canManageRoles: boolean;
}

/** Every user as a table row: who, code and title, roles, status and the actions. */
export function UsersTable({ users, onChanged, canManageRoles }: UsersTableProps) {
    return (
        <Table
            rows={users}
            rowKey={(user) => user.id}
            columns={[
                {
                    key: 'user',
                    header: 'کاربر',
                    render: (user) => (
                        <PersonLabel
                            name={user.name}
                            picture={user.profilePicture}
                            fallback="بدون نام"
                            detail={<bdi dir="ltr">{user.phone ?? 'بدون شماره'}</bdi>}
                        />
                    ),
                },
                {
                    key: 'code',
                    header: 'کد پرسنلی',
                    render: (user) => (user.personnelCode ? <bdi dir="ltr">{user.personnelCode}</bdi> : '—'),
                },
                { key: 'title', header: 'عنوان شغلی', render: (user) => user.jobTitle ?? '—', hideOnMobile: true },
                {
                    key: 'roles',
                    header: 'نقش‌ها',
                    render: (user) => <RolesCell user={user} onChanged={onChanged} canManage={canManageRoles} />,
                },
                {
                    key: 'status',
                    header: 'وضعیت',
                    render: (user) => (
                        <Badge tone={user.isApproved ? 'success' : 'warning'}>
                            {user.isApproved ? 'تایید شده' : 'در انتظار تایید'}
                        </Badge>
                    ),
                },
                {
                    key: 'actions',
                    header: '',
                    render: (user) => <ActionsCell user={user} onChanged={onChanged} canManage={canManageRoles} />,
                },
            ]}
        />
    );
}

function RoleBadge({ role, onRemove, removable }: { role: UserRole; onRemove: () => void; removable: boolean }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
            {getRoleName(role.role)}
            {removable && (
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

function RolesCell({ user, onChanged, canManage }: { user: User; onChanged: () => void; canManage: boolean }) {
    const addRole = useAddUserRole();
    const removeRole = useRemoveUserRole();
    const [result, setResult] = useState<{ status: 'success' | 'error'; message?: string } | null>(null);

    const handleAdd = async (role: Role | null) => {
        if (!role) return;
        try {
            await addRole.submit({ id: user.id, data: { role } });
            onChanged();
        } catch (error) {
            setResult({ status: 'error', message: (error as Error)?.message });
        }
    };

    const handleRemove = async (role: UserRole) => {
        try {
            await removeRole.submit({ id: user.id, roleId: role.id });
            onChanged();
        } catch (error) {
            setResult({ status: 'error', message: (error as Error)?.message });
        }
    };

    const addable = Roles.filter((role) => !user.roles.some((r) => r.role === role)).map((role) => ({
        value: role,
        label: getRoleName(role),
    }));

    return (
        <>
            <div className="flex flex-wrap items-center gap-1.5">
                {user.roles.map((role) => (
                    <RoleBadge
                        key={role.id}
                        role={role}
                        removable={canManage && user.roles.length > 1}
                        onRemove={() => handleRemove(role)}
                    />
                ))}
                {canManage && addable.length > 0 && (
                    <Dropdown
                        items={addable}
                        value={null}
                        onChange={handleAdd}
                        disabled={addRole.isLoading}
                        renderButton={() => (
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-1 text-xs font-medium transition-colors',
                                    addRole.isLoading
                                        ? 'border-slate-200 text-slate-300'
                                        : 'border-slate-300 text-slate-500 hover:border-primary/50 hover:text-primary',
                                )}
                            >
                                <IconPlus size={13} />
                                نقش جدید
                            </span>
                        )}
                    />
                )}
            </div>
            <ResultModal
                isOpen={result !== null}
                onClose={() => {
                    setResult(null);
                    addRole.reset();
                    removeRole.reset();
                }}
                status={result?.status || 'error'}
                title="مدیریت نقش"
                successMessage="تغییرات با موفقیت اعمال شد"
                errorMessage={result?.message || 'خطا در اعمال تغییرات'}
            />
        </>
    );
}

function ActionsCell({ user, onChanged, canManage }: { user: User; onChanged: () => void; canManage: boolean }) {
    const approve = useApproveUser();
    const deleteUser = useDeleteUser();
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [result, setResult] = useState<{ status: 'success' | 'error'; message?: string } | null>(null);

    const handleApprove = async () => {
        try {
            await approve.submit(user.id);
            setResult({ status: 'success' });
            onChanged();
        } catch (error) {
            setResult({ status: 'error', message: (error as Error)?.message });
        }
    };

    const handleDelete = async () => {
        setConfirmDelete(false);
        try {
            await deleteUser.submit(user.id);
            setResult({ status: 'success' });
            onChanged();
        } catch (error) {
            setResult({ status: 'error', message: (error as Error)?.message });
        }
    };

    return (
        <>
            <div className="flex items-center gap-1">
                {!user.isApproved && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        onClick={handleApprove}
                        disabled={approve.isLoading}
                    >
                        <IconCheck className="size-4" />
                        {approve.isLoading ? 'در حال تایید...' : 'تایید'}
                    </Button>
                )}
                {canManage && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="!px-2"
                            onClick={() => setEditing(true)}
                            aria-label={`ویرایش ${user.name ?? user.phone}`}
                        >
                            <IconPencil className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="!px-2 text-rose-500 hover:bg-rose-50"
                            onClick={() => setConfirmDelete(true)}
                            aria-label="حذف کاربر"
                        >
                            <IconTrash className="size-4" />
                        </Button>
                    </>
                )}
            </div>

            {editing && <EditUserNameModal user={user} onClose={() => setEditing(false)} onSaved={onChanged} />}

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
