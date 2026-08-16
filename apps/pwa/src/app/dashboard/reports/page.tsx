'use client';

import { RoleProtectedRoute } from '@/components/auth/auth.component.role-protected-route';
import { RouteItems } from '@/components/dashboard/dashboard.constants.route-groups';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { tehranDateString } from '@/libs/meeting/meeting.time';
import { cn } from '@/libs/style/style.util.helpers';
import { Dropdown } from '@/ui/atoms/ui.dropdown';
import { DataView } from '@/ui/molecules';
import { TZDate } from '@date-fns/tz';
import { IconReportAnalytics } from '@tabler/icons-react';
import { subDays } from 'date-fns-jalali';
import { useMemo, useState } from 'react';
import { useRooms } from '../rooms/rooms.api';
import { useRoomUsageHeatmap } from './reports.api';
import { DateRangePicker } from '@/ui/molecules';
import { RoomUsageHeatmap } from './reports.component.heatmap';

const TEHRAN_TZ = 'Asia/Tehran';

const PRESETS = [
  { label: '۷ روز اخیر', days: 7 },
  { label: '۳۰ روز اخیر', days: 30 },
  { label: '۹۰ روز اخیر', days: 90 },
];

export default function ReportsPage() {
  const today = useMemo(() => TZDate.tz(TEHRAN_TZ, new Date()), []);
  const [range, setRange] = useState<{ from: Date; to: Date }>(() => ({
    from: subDays(today, 29),
    to: today,
  }));
  const [roomId, setRoomId] = useState<number | null>(null);

  const rooms = useRooms({ limit: 100 });
  const roomItems = [
    { label: 'همه اتاق‌ها', value: null },
    ...(rooms.data?.items ?? []).map((room) => ({ label: room.name, value: room.id })),
  ];

  const { data, error, isLoading, refresh } = useRoomUsageHeatmap({
    from: tehranDateString(range.from),
    to: tehranDateString(range.to),
    roomIds: roomId ? [roomId] : undefined,
  });

  const isActivePreset = (days: number) =>
    tehranDateString(range.from) === tehranDateString(subDays(today, days - 1)) &&
    tehranDateString(range.to) === tehranDateString(today);

  return (
    <RoleProtectedRoute allowedRoles={RouteItems.reports.roles}>
      <DashbaordLayout>
        <div className="space-y-3 grow flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
              <IconReportAnalytics className="size-6" />
            </div>
            <div className="grow">
              <h1 className="font-bold text-slate-800">گزارش استفاده از اتاق‌ها</h1>
              <p className="text-sm text-slate-500">
                {data ? `${data.totalReservations} رزرو` : 'نقشه حرارتی رزروها'} در بازه زمانی
                انتخاب‌شده، بر اساس ساعت روز
              </p>
            </div>
          </div>

          {/* Filters + heatmap */}
          <div className="p-2 rounded-2xl bg-white grow flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-2 py-3 lg:px-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setRange({ from: subDays(today, preset.days - 1), to: today })}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                      isActivePreset(preset.days)
                        ? 'bg-primary text-white'
                        : 'text-slate-500 hover:bg-slate-100',
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <DateRangePicker
                from={range.from}
                to={range.to}
                onChange={(next) => setRange(next)}
              />

              <div className="w-full sm:w-48">
                <Dropdown
                  items={roomItems}
                  value={roomId}
                  onChange={(value) => setRoomId(value)}
                  variant="outline"
                  size="sm"
                  placeholder="همه اتاق‌ها"
                />
              </div>
            </div>

            <div className="overflow-auto p-2 lg:p-3">
              <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                emptyMessage="اتاق فعالی برای نمایش وجود ندارد"
                isEmpty={(data) => !data?.rooms.length}
                onRetry={refresh}
              >
                {data && <RoomUsageHeatmap data={data} />}
              </DataView>
            </div>
          </div>
        </div>
      </DashbaordLayout>
    </RoleProtectedRoute>
  );
}
