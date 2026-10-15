'use client';

import { useAuth } from '@/components/auth/auth.context.provider';
import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { Role } from '@/components/auth/auth.constants.roles';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { DataView, Pagination } from '@/ui/molecules';
import { Tabs } from '@/ui/molecules/tabs';
import { IconUsers } from '@tabler/icons-react';
import { useState } from 'react';
import { useUsers } from './users.api';
import { AddUserForm } from './users.component.add-user';
import { UserRow } from './users.component.user-row';
import { UserFilterDto } from './users.types';

const USER_TABS = [
    { id: 'all', label: 'همه' },
    { id: 'pending', label: 'در انتظار تایید' },
];

export default function UsersPage() {
    const [filters, setFilters] = useState<UserFilterDto>({});
    const { hasRole } = useAuth();
    const isAdmin = hasRole(Role.ADMIN);

    const { data, error, isLoading, refresh } = useUsers(filters);

    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page: page - 1 }));
    };

    const count = data?.meta?.total ?? 0;

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

                    {/* Tabs + content */}
                    <div className="p-2 ui-surface grow flex flex-col overflow-hidden">
                        <div className="px-2 pt-1">
                            <Tabs
                                tabs={USER_TABS}
                                defaultTab={filters.isApproved === false ? 'pending' : 'all'}
                                onTabChange={(id) => setFilters(prev => ({ ...prev, isApproved: id === 'pending' ? false : undefined, page: 0 }))}
                            />
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {data?.items?.map((user) => (
                                        <UserRow key={user.id} user={user} onChanged={refresh} canManageRoles={isAdmin} />
                                    ))}
                                </div>

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
