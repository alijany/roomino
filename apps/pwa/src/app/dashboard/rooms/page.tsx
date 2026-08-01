'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Tabs } from '@/ui/molecules/tabs';
import { IconCalendarRepeat, IconDoor } from '@tabler/icons-react';
import { useState } from 'react';
import { RecurringManager } from './rooms.component.recurring';
import { RoomList } from './rooms.component.room-list';

const TABS = [
  { id: 'rooms', label: 'اتاق‌ها' },
  { id: 'recurring', label: 'قفل‌های تکرارشونده' },
];

export default function RoomsPage() {
  const [activeTab, setActiveTab] = useState('rooms');

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.rooms.roles}>
      <DashbaordLayout>
        <div className="space-y-3 grow flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconDoor className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">مدیریت اتاق‌ها</h1>
              <p className="text-sm text-slate-500">
                اتاق‌های جلسه و قفل‌های تکرارشونده را مدیریت کنید
              </p>
            </div>
            <div className="hidden sm:flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconCalendarRepeat className="size-6" />
            </div>
          </div>

          {/* Tabs + content */}
          <div className="p-2 rounded-2xl bg-white grow flex flex-col overflow-hidden">
            <div className="px-2 pt-1">
              <Tabs tabs={TABS} defaultTab={activeTab} onTabChange={setActiveTab} />
            </div>
            <div className="overflow-auto p-2 lg:p-3">
              {activeTab === 'rooms' ? <RoomList /> : <RecurringManager />}
            </div>
          </div>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
