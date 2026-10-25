'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { Role } from '@/components/auth/auth.constants.roles';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Avatar, Button, Input } from '@/ui/atoms';
import { DataView } from '@/ui/molecules';
import { IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useUpdateUserName, useUser } from '../users.api';
import { RolesEditor } from '../users.component.roles-editor';
import { User } from '../users.types';

/** One user for the admin: the basic facts and the roles. More sections will follow here. */
export default function EditUserPage() {
    return (
        <RoleProtectedRoute allowedRoles={[Role.ADMIN]}>
            <DashbaordLayout>
                <EditUserContent />
            </DashbaordLayout>
        </RoleProtectedRoute>
    );
}

function EditUserContent() {
    const { id } = useParams<{ id: string }>();
    const { data: user, error, isLoading, refresh } = useUser(Number(id));

    return (
        <div className="flex grow flex-col gap-3 overflow-auto pb-6">
            <div className="ui-page-header">
                <div className="ui-page-icon">
                    <Avatar src={user?.profilePicture} name={user?.name} className="size-full rounded-[inherit]" />
                </div>
                <div className="min-w-0 flex-1 basis-48">
                    <h1>{user?.name ?? 'ویرایش کاربر'}</h1>
                    {user && (
                        <p>
                            <bdi dir="ltr">{user.phone}</bdi>
                        </p>
                    )}
                </div>
                <Link href="/dashboard/users">
                    <Button variant="outline" className="gap-1">
                        <IconArrowRight className="size-4" />
                        بازگشت به کاربران
                    </Button>
                </Link>
            </div>

            <DataView data={user} error={error} isLoading={isLoading} onRetry={refresh}>
                {user && (
                    <div className="grid gap-3 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            {/* Keyed by what the server holds, so a save starts the fields from it. */}
                            <BasicInfoForm key={`${user.firstName}|${user.lastName}|${user.personnelCode}|${user.jobTitle}`} user={user} onSaved={refresh} />
                        </div>
                        <section className="ui-surface space-y-3 p-4 lg:p-5">
                            <h2 className="font-semibold text-slate-700">دسترسی‌ها</h2>
                            <RolesEditor user={user} onChanged={refresh} />
                        </section>
                    </div>
                )}
            </DataView>
        </div>
    );
}

/** Name, personnel code and job title — saved together with the button. */
function BasicInfoForm({ user, onSaved }: { user: User; onSaved: () => void }) {
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
            await submit({
                id: user.id,
                data: {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    personnelCode: personnelCode.trim() || undefined,
                    jobTitle: jobTitle.trim(),
                },
            });
            toast.success('تغییرات ذخیره شد');
            onSaved();
        } catch {
            // `error` is shown under the fields.
        }
    };

    return (
        <form onSubmit={handleSubmit} className="ui-surface space-y-4 p-4 lg:p-5">
            <h2 className="font-semibold text-slate-700">اطلاعات پایه</h2>
            <div className="grid gap-4 sm:grid-cols-2">
                <Input
                    id="edit-first-name"
                    packageId="edit-first-name"
                    label="نام"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={50}
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
            </div>

            {error && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600" role="alert">
                    {error.message || 'ذخیره انجام نشد'}
                </p>
            )}

            <div className="flex gap-3">
                <Button type="submit" disabled={isLoading || !firstName.trim() || !personnelCode.trim() || unchanged}>
                    {isLoading ? 'در حال ذخیره...' : 'ذخیره'}
                </Button>
            </div>
        </form>
    );
}
