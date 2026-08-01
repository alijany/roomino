'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Tabs } from '@/ui/molecules/tabs';
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
          <div className="p-4 rounded-2xl bg-white flex items-center gap-4 justify-between">
            <div className="font-bold grow">مدیریت اتاق‌ها</div>
          </div>

          <div className="p-4 rounded-2xl bg-white grow flex flex-col overflow-hidden gap-4">
            <Tabs tabs={TABS} defaultTab={activeTab} onTabChange={setActiveTab} />
            <div className="overflow-auto">
              {activeTab === 'rooms' ? <RoomList /> : <RecurringManager />}
            </div>
          </div>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
