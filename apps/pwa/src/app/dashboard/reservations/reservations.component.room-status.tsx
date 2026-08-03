'use client';

import { cn } from '@/libs/style/style.util.helpers';
import { BOARD_END, BOARD_START, minutesToHHmm, tehranDateString } from '@/libs/meeting/meeting.time';
import { DataView } from '@/ui/molecules';
import { TZDate } from '@date-fns/tz';
import { IconClock, IconDoor, IconLock, IconUser } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAvailability } from './reservations.api';
import { AvailabilityRoom, SlotStatus } from './reservations.types';

function nowMinutesTehran(): number {
  const z = TZDate.tz('Asia/Tehran', new Date());
  return z.getHours() * 60 + z.getMinutes();
}

interface RoomNowStatus {
  status: SlotStatus | 'closed';
  until: number | null;
  ownerLabel?: string;
  isOwn?: boolean;
  lockTitle?: string;
}

function computeNowStatus(room: AvailabilityRoom, nowMinutes: number, outsideHours: boolean): RoomNowStatus {
  if (outsideHours) return { status: 'closed', until: null };

  const idx = room.slots.findIndex((s) => nowMinutes >= s.startMinutes && nowMinutes < s.endMinutes);
  if (idx === -1) return { status: 'closed', until: null };

  const current = room.slots[idx];
  let until = current.endMinutes;
  for (let i = idx + 1; i < room.slots.length; i++) {
    const s = room.slots[i];
    if (s.startMinutes !== until || s.status !== current.status) break;
    if (current.status === 'reserved' && s.reservation?.id !== current.reservation?.id) break;
    until = s.endMinutes;
  }

  return {
    status: current.status,
    until,
    ownerLabel: current.reservation?.isOwn ? 'شما' : current.reservation?.ownerName,
    isOwn: current.reservation?.isOwn,
    lockTitle: current.lockTitle,
  };
}

const STATUS_STYLES: Record<RoomNowStatus['status'], { dot: string; badge: string; label: string }> = {
  available: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-600', label: 'آزاد' },
  reserved: { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-600', label: 'رزرو شده' },
  locked: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-600', label: 'قفل شده' },
  closed: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-500', label: 'خارج از ساعت کاری' },
};

function RoomStatusCard({ room, nowMinutes, outsideHours }: { room: AvailabilityRoom; nowMinutes: number; outsideHours: boolean }) {
    const now = computeNowStatus(room, nowMinutes, outsideHours);
    const style = STATUS_STYLES[now.status];
    const badgeLabel = now.status === 'reserved' && now.isOwn ? 'رزرو شما' : style.label;

    return (
        <div className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-primary/30 hover:shadow-[0_18px_45px_-24px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <IconDoor className="size-5" />
                </div>
                <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{room.roomName}</h3>
                    {room.capacity != null && (
                        <p className="text-xs text-slate-400">ظرفیت {room.capacity} نفر</p>
                    )}
                </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-50 pt-3">
                <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', style.badge)}>
                    <span className={cn('size-1.5 rounded-full', style.dot)} />
                    {badgeLabel}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    {now.status === 'reserved' && (
                        <>
                            <IconUser className="size-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{now.ownerLabel || 'رزرو'}</span>
                        </>
                    )}
                    {now.status === 'locked' && (
                        <>
                            <IconLock className="size-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{now.lockTitle || 'قفل هفتگی'}</span>
                        </>
                    )}
                    {now.status === 'available' && now.until != null && (
                        <>
                            <IconClock className="size-3.5 shrink-0 text-slate-400" />
                            <span className="tabular-nums">
                                {now.until >= BOARD_END ? 'تا پایان ساعات کاری آزاد است' : `تا ${minutesToHHmm(now.until)} آزاد است`}
                            </span>
                        </>
                    )}
                    {now.status === 'closed' && (
                        <>
                            <IconClock className="size-3.5 shrink-0 text-slate-400" />
                            <span className="tabular-nums">
                                ساعات کاری {minutesToHHmm(BOARD_START)} تا {minutesToHHmm(BOARD_END)}
                            </span>
                        </>
                    )}
                    {now.status === 'reserved' && now.until != null && (
                        <span className="tabular-nums text-slate-400">تا {minutesToHHmm(now.until)}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export function RoomStatusGrid() {
    const [today, setToday] = useState(() => tehranDateString(new Date()));
    const [nowMinutes, setNowMinutes] = useState(() => nowMinutesTehran());

    const { data, error, isLoading, refresh } = useAvailability(today, undefined, { refreshInterval: 60000 });

    useEffect(() => {
        const id = setInterval(() => {
            setToday(tehranDateString(new Date()));
            setNowMinutes(nowMinutesTehran());
        }, 30000);
        return () => clearInterval(id);
    }, []);

    const outsideHours = nowMinutes < BOARD_START || nowMinutes >= BOARD_END;

    return (
        <div className="p-4 rounded-2xl bg-white space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="font-bold">وضعیت اتاق‌ها هم‌اکنون</div>
                <div className="text-xs text-slate-400 tabular-nums">ساعت {minutesToHHmm(nowMinutes)}</div>
            </div>

            <DataView
                data={data}
                error={error}
                isLoading={isLoading}
                emptyMessage="اتاقی برای نمایش وجود ندارد"
                isEmpty={(d) => !d?.rooms.length}
                onRetry={refresh}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {data?.rooms.map((room) => (
                        <RoomStatusCard key={room.roomId} room={room} nowMinutes={nowMinutes} outsideHours={outsideHours} />
                    ))}
                </div>
            </DataView>
        </div>
    );
}
