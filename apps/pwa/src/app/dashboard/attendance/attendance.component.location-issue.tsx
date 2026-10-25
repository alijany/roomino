'use client';

import { Button } from '@/ui/atoms';
import { IconMapPinOff, IconRefresh } from '@tabler/icons-react';
import { LocationError } from './attendance.util';

const HELP: Partial<Record<LocationError['kind'], string>> = {
  blocked:
    'اگر پنجره‌ی اجازه نمایش داده نشد: در سافاری روی «aA» کنار آدرس بزنید ← «تنظیمات وب‌سایت» ← «موقعیت مکانی» را روی «اجازه» یا «پرسیدن» بگذارید. در آیفون، «تنظیمات ← حریم خصوصی ← خدمات مکان‌یاب ← وب‌سایت‌های سافاری» هم باید فعال باشد. بعد «تلاش دوباره» را بزنید.',
  insecure: 'این صفحه را از آدرس امن (HTTPS) باز کنید؛ مرورگر روی آدرس ناامن اجازه‌ی موقعیت نمی‌دهد.',
  unavailable:
    'مطمئن شوید GPS گوشی روشن است و به اینترنت وصل هستید. روی مک یا آیفون، «تنظیمات سیستم ← حریم خصوصی و امنیت ← خدمات مکان‌یاب» باید روشن باشد و «وب‌سایت‌های سافاری» اجازه داشته باشد؛ سپس دوباره تلاش کنید.',
  timeout: 'کمی بیرون‌تر یا نزدیک پنجره بروید و دوباره تلاش کنید.',
};

/**
 * Shown when a check-in/out couldn't read the position. A denied permission
 * can't be re-asked from code once the browser has blocked it, so this says
 * how to allow it again and offers a retry — which prompts afresh wherever
 * the browser's setting is «ask».
 */
export function LocationIssueNotice({
  issue,
  busy,
  onRetry,
}: {
  issue: LocationError;
  busy?: boolean;
  onRetry: () => void;
}) {
  const canRetry = issue.kind !== 'unsupported' && issue.kind !== 'insecure';

  return (
    <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800" role="alert">
      <p className="flex items-center gap-2 font-medium">
        <IconMapPinOff className="size-4 shrink-0" aria-hidden="true" />
        {issue.message}
      </p>
      {HELP[issue.kind] && <p className="mt-2 text-xs leading-6 text-amber-700">{HELP[issue.kind]}</p>}
      {issue.detail && (
        <p dir="ltr" className="mt-2 text-left text-[11px] text-amber-600/80">{issue.detail}</p>
      )}
      {canRetry && (
        <Button size="sm" className="mt-3 w-full gap-1 sm:w-auto" disabled={busy} onClick={onRetry}>
          <IconRefresh className="size-4" aria-hidden="true" />
          تلاش دوباره
        </Button>
      )}
    </div>
  );
}
