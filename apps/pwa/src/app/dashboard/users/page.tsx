'use client';

import { useAuth } from '@/components/auth/auth.context.provider';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { Role, Roles, getRoleName } from '@/components/auth/auth.constants.roles';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Button, Dropdown, Input } from '@/ui/atoms';
import { DataView, Pagination } from '@/ui/molecules';
import { IconFilterOff, IconSearch, IconUsers } from '@tabler/icons-react';
import { useDebouncedFilterText, useUrlFilters } from '@/libs/url/url.hook.use-url-filters';
import { Suspense } from 'react';
import { useUsers } from './users.api';
import { AddUserForm } from './users.component.add-user';
import { UsersTable } from './users.component.table';
import { UserFilterDto, UserStatusFilter } from './users.types';

const STATUS_ITEMS = [
    { value: 'all', label: 'همه وضعیت‌ها' },
    { value: 'active', label: 'فعال' },
    { value: 'probation', label: 'آزمایشی' },
    { value: 'pending', label: 'در انتظار تایید' },
    { value: 'ended', label: 'پایان همکاری' },
];

const ROLE_ITEMS = [
    { value: 'all', label: 'همه نقش‌ها' },
    ...Roles.map((role) => ({ value: role as string, label: getRoleName(role) })),
];

export default function UsersPage() {
    return (
        <Suspense fallback={<DataView isLoading />}>
            <UsersContent />
        </Suspense>
    );
}

function UsersContent() {
    // The filters and the page live in the address, so a refresh keeps them.
    const [filters, setFilters] = useUrlFilters<UserFilterDto>({
        text: 'string',
        role: 'string',
        status: 'string',
        page: 'number',
        limit: 'number',
    });
    const [text, setText] = useDebouncedFilterText(filters.text, (value) =>
        setFilters(prev => ({ ...prev, text: value || undefined, page: undefined })),
    );
    const { hasRole } = useAuth();
    const isAdmin = hasRole(Role.ADMIN);

    const { data, error, isLoading, refresh } = useUsers(filters);

    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page: page - 1 }));
    };

    const count = data?.meta?.total ?? 0;
    const hasFilters = Boolean(filters.text || filters.role || filters.status);

    return (
        <RoleProtectedRoute allowedRoles={RouteItems.users.roles}>
            <DashbaordLayout>
                <div className="space-y-3 grow flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="ui-page-header">
                        <div className="ui-page-icon">
                            <IconUsers className="size-6" />
                        </div>
                        <div className="min-w-0 flex-1 basis-48">
                            <h1>مدیریت کاربران</h1>
                            <p>
                                {count > 0 ? `${count} کاربر` : 'کاربران'} و درخواست‌های تایید را مدیریت کنید
                            </p>
                        </div>
                        {isAdmin && <AddUserForm onSuccess={refresh} />}
                    </div>

                    {/* Filters + table */}
                    <div className="p-2 ui-surface grow flex flex-col overflow-hidden">
                        <div className="flex flex-wrap items-center gap-2 px-2 pt-1">
                            <div className="w-full sm:w-72">
                                <Input
                                    icon={<IconSearch className="size-4 text-slate-400" />}
                                    placeholder="نام، موبایل، کد پرسنلی یا عنوان"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                            </div>
                            <div className="w-40">
                                <Dropdown
                                    items={ROLE_ITEMS}
                                    value={filters.role ?? 'all'}
                                    onChange={(value) => setFilters(prev => ({ ...prev, role: value && value !== 'all' ? (value as Role) : undefined, page: undefined }))}
                                    variant="outline"
                                />
                            </div>
                            <div className="w-40">
                                <Dropdown
                                    items={STATUS_ITEMS}
                                    value={filters.status ?? 'all'}
                                    onChange={(value) => setFilters(prev => ({ ...prev, status: value && value !== 'all' ? (value as UserStatusFilter) : undefined, page: undefined }))}
                                    variant="outline"
                                />
                            </div>
                            {hasFilters && (
                                <Button variant="ghost" size="sm" className="gap-1 text-slate-500" onClick={() => {
                                    setFilters({});
                                    setText('');
                                }}>
                                    <IconFilterOff className="size-4" />
                                    پاک کردن فیلترها
                                </Button>
                            )}
                        </div>
                        <div className="overflow-auto p-2 lg:p-3">
                            <DataView
                                data={data}
                                error={error}
                                isLoading={isLoading}
                                emptyMessage="هیچ کاربری یافت نشد"
                                isEmpty={(data) => !data?.items.length}
                                onRetry={refresh}
                            >
                                <UsersTable users={data?.items ?? []} onChanged={refresh} canManageRoles={isAdmin} />

                                {data?.meta && (
                                    <div className="pt-6">
                                        <Pagination
                                            itemPerPage={filters.limit || 10}
                                            page={(filters.page || 0) + 1}
                                            totalCount={data.meta.total}
                                            onNavigate={(page) => {
                                                handlePageChange(page);
                                                return '#';
                                            }}
                                        />
                                    </div>
                                )}
                            </DataView>
                        </div>
                    </div>
                </div>
            </DashbaordLayout>
        </RoleProtectedRoute>
    );
}
