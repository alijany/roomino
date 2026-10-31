'use client';

import { Role, getRoleName } from '@/components/auth/auth.constants.roles';
import { Button } from '@/ui/atoms';
import { Badge } from '@/ui/atoms/ui.badge';
import { PersonLabel, Table } from '@/ui/molecules';
import { ResultModal } from '@/ui/molecules/result-modal';
import { IconCheck, IconPencil } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { jalaliLabel, tehranToday } from '../attendance/attendance.util';
import { useApproveUser } from './users.api';
import { User } from './users.types';

interface UsersTableProps {
    users: User[];
    onChanged: () => void;
    /** Editing (with roles) is admin-only; HR can only confirm registrations. */
    canManageRoles: boolean;
}

/** Where a person stands today, in one badge. */
function StatusBadge({ user }: { user: User }) {
    const today = tehranToday();
    if (!user.isApproved) return <Badge tone="warning">در انتظار تایید</Badge>;
    if (user.endDate && user.endDate < today) return <Badge tone="danger">پایان همکاری</Badge>;
    if (user.probationEndDate && user.probationEndDate >= today) return <Badge tone="warning">آزمایشی</Badge>;
    return <Badge tone="success">فعال</Badge>;
}

/**
 * Every user as a table row: who (code and any role beyond «کاربر» under the
 * name), title, how long they have been here, where they stand, and the
 * actions. Everything else — and deleting — is on the user's own page.
 */
export function UsersTable({ users, onChanged, canManageRoles }: UsersTableProps) {
    const router = useRouter();
    return (
        <Table
            rows={users}
            rowKey={(user) => user.id}
            onRowClick={canManageRoles ? (user) => router.push(`/dashboard/users/${user.id}`) : undefined}
            columns={[
                {
                    key: 'user',
                    header: 'کاربر',
                    render: (user) => (
                        <PersonLabel
                            name={user.name}
                            picture={user.profilePicture}
                            fallback="بدون نام"
                            detail={<UserDetail user={user} />}
                        />
                    ),
                },
                { key: 'title', header: 'عنوان شغلی', render: (user) => user.jobTitle ?? '—', hideOnMobile: true },
                {
                    key: 'hire',
                    header: 'شروع همکاری',
                    numeric: true,
                    hideOnMobile: true,
                    render: (user) => (user.hireDate ? jalaliLabel(user.hireDate) : '—'),
                },
                { key: 'status', header: 'وضعیت', render: (user) => <StatusBadge user={user} /> },
                {
                    key: 'actions',
                    header: '',
                    render: (user) => <ActionsCell user={user} onChanged={onChanged} canManage={canManageRoles} />,
                },
            ]}
        />
    );
}

/** `T01 | ادمین، تأییدکننده` — every user is a «کاربر», so only the other roles are named. */
function UserDetail({ user }: { user: User }) {
    const others = user.roles.filter((r) => r.role !== Role.USER).map((r) => getRoleName(r.role));
    if (!user.personnelCode && !others.length) return null;
    return (
        <span>
            {user.personnelCode && <bdi dir="ltr">{user.personnelCode}</bdi>}
            {user.personnelCode && others.length > 0 && <span className="px-1.5 text-slate-300">|</span>}
            {others.join('، ')}
        </span>
    );
}

function ActionsCell({ user, onChanged, canManage }: { user: User; onChanged: () => void; canManage: boolean }) {
    const approve = useApproveUser();
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

    return (
        <>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                    <Link href={`/dashboard/users/${user.id}`} aria-label={`ویرایش ${user.name ?? user.phone}`}>
                        <Button variant="outline" size="sm" className="!px-2" tabIndex={-1}>
                            <IconPencil className="size-4" />
                        </Button>
                    </Link>
                )}
            </div>

            <ResultModal
                isOpen={result !== null}
                onClose={() => {
                    setResult(null);
                    approve.reset();
                }}
                status={result?.status || 'success'}
                title="مدیریت کاربر"
                successMessage="تغییرات با موفقیت اعمال شد"
                errorMessage={result?.message || 'خطا در اعمال تغییرات'}
            />
        </>
    );
}
