'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { useAuth } from '@/components/auth/auth.context.provider';
import { RouteItems, routeGroups } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { IconArrowLeft, IconSettings } from '@tabler/icons-react';
import Link from 'next/link';

export default function ManagementPage() {
  const { hasAnyRole } = useAuth();
  const groups = routeGroups
    .filter(group => group.workspace === 'management')
    .map(group => ({
      ...group,
      routes: group.routes.filter(route => !route.roles || hasAnyRole(route.roles)),
    }))
    .filter(group => group.routes.length > 0);

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.management.roles}>
      <DashbaordLayout>
        <div className="flex min-h-0 grow flex-col gap-4 overflow-y-auto pb-6">
          <div className="ui-page-header">
            <div className="ui-page-icon">
              <IconSettings className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">مرکز مدیریت</h1>
              <p className="mt-1 text-sm text-slate-500">
                برای مدیریت سازمان، بخش مورد نظر را انتخاب کنید.
              </p>
            </div>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-3">
            {groups.map(group => (
              <section key={group.id} aria-labelledby={`management-${group.id}`} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-xl bg-brand-50 p-2.5 text-brand-700" aria-hidden="true">{group.icon}</span>
                  <h2 id={`management-${group.id}`} className="font-semibold text-slate-800">{group.label}</h2>
                </div>
                <p className="mb-4 text-sm leading-6 text-slate-500">{group.description}</p>
                <ul className="space-y-1 border-t border-slate-100 pt-3">
                  {group.routes.map(route => (
                    <li key={route.href}>
                      <Link
                        href={route.href}
                        className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        <span className="shrink-0 text-slate-400" aria-hidden="true">{route.icon}</span>
                        <span className="grow">{route.label}</span>
                        <IconArrowLeft className="size-4 shrink-0" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
