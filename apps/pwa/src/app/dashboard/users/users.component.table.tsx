'use client';

import { getRoleName } from '@/components/auth/auth.constants.roles';
import { Button } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { PersonLabel, Table } from '@/ui/molecules';
import { ConfirmModal } from '@/ui/molecules/confirm-modal';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconCheck, IconPencil, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useApproveUser, useDeleteUser } from './users.api';
import { EditUserNameModal } from './users.component.edit-name';
import { User, UserRole } from './users.types';

interface UsersTableProps {
    users: User[];
    onChanged: () => void;
    /** Editing (with roles) and delete are admin-only; HR can only confirm registrations. */
    canManageRoles: boolean;
}

/** Every user as a table row: who (code under the name), title, roles, status and the actions. Roles are changed in the edit dialog. */
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
                            detail={user.personnelCode ? <bdi dir="ltr">{user.personnelCode}</bdi> : undefined}
                        />
                    ),
                },
                { key: 'title', header: 'عنوان شغلی', render: (user) => user.jobTitle ?? '—', hideOnMobile: true },
                {
                    key: 'roles',
                    header: 'نقش‌ها',
                    render: (user) => (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {user.roles.map((role) => (
                                <RoleBadge key={role.id} role={role} />
                            ))}
                        </div>
                    ),
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

function RoleBadge({ role }: { role: UserRole }) {
    return (
        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
            {getRoleName(role.role)}
        </span>
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
