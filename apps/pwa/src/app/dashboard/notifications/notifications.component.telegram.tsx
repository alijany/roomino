'use client';

import { Button } from '@/ui/atoms';
import { IconBrandTelegram } from '@tabler/icons-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import { fetcher } from '@/libs/api/api.util.fetcher';

interface TelegramStatus {
  enabled: boolean;
  connected: boolean;
  botUsername: string | null;
}

export function useTelegramStatus() {
  return useSWR<TelegramStatus>('/notifications/telegram', fetcher, {
    // After the user presses Start in Telegram, pick the change up when they come back.
    refreshInterval: 5000,
  });
}

/** Opens the bot with a one-time link for the signed-in user. */
export async function openTelegramLink() {
  try {
    const { url } = await fetcher<{ url: string }>('/notifications/telegram/link', { method: 'POST' });
    window.open(url, '_blank', 'noopener');
    toast.info('در تلگرام دکمهٔ Start را بزنید؛ اتصال خودکار تکمیل می‌شود');
  } catch {
    toast.error('ساخت لینک اتصال انجام نشد');
  }
}

/** «اتصال تلگرام» — opens the bot with a one-time link; notifications then arrive in Telegram. */
export function TelegramConnectCard() {
  const { data, mutate } = useTelegramStatus();
  const [busy, setBusy] = useState(false);

  if (!data?.enabled) return null;

  const connect = async () => {
    setBusy(true);
    await openTelegramLink();
    setBusy(false);
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetcher('/notifications/telegram', { method: 'DELETE' });
      await mutate();
      toast.success('اتصال تلگرام قطع شد');
    } catch {
      toast.error('قطع اتصال انجام نشد');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-slate-900">تنظیمات اعلان</h2>
        <p className="text-xs text-slate-500">کانال دریافت اعلان‌ها</p>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <IconBrandTelegram className="size-7 shrink-0 text-sky-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800">تلگرام</p>
          <p className={`text-xs ${data.connected ? 'text-emerald-600' : 'text-slate-400'}`}>
            {data.connected ? 'فعال' : 'غیرفعال'}
          </p>
        </div>
        {data.connected ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={disconnect}>
            غیرفعال‌سازی
          </Button>
        ) : (
          <Button size="sm" disabled={busy} onClick={connect}>
            فعال‌سازی
          </Button>
        )}
      </div>
    </section>
  );
}
