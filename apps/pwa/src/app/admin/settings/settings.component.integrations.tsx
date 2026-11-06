'use client';

import { Button, Input } from '@/ui/atoms';
import { IconBrandTelegram, IconMessage } from '@tabler/icons-react';
import { ReactNode, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { IntegrationSettings, useIntegrationSettings, useUpdateIntegrationSettings } from './settings.api';

/** Cards for the outside services: the Telegram bot and the SMS (Asanak) API. */
export function IntegrationCards({ Section }: { Section: (p: { title: string; hint?: string; children: ReactNode }) => ReactNode }) {
  const { data, refresh } = useIntegrationSettings();
  if (!data) return null;
  return (
    <>
      <TelegramCard Section={Section} value={data.telegram} onSaved={refresh} />
      <SmsCard Section={Section} value={data.sms} onSaved={refresh} />
    </>
  );
}

type SectionType = Parameters<typeof IntegrationCards>[0]['Section'];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function TelegramCard({ Section, value, onSaved }: { Section: SectionType; value: IntegrationSettings['telegram']; onSaved: () => void }) {
  const update = useUpdateIntegrationSettings();
  const [form, setForm] = useState({ botToken: '', botUsername: '' });
  useEffect(() => {
    setForm({ botToken: '', botUsername: value.botUsername });
  }, [value]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    try {
      await update.submit({ telegram: form });
      toast.success('تنظیمات تلگرام ذخیره شد و ربات با آن دوباره راه‌اندازی شد');
      onSaved();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'ذخیره نشد');
    }
  };

  return (
    <Section title="ربات تلگرام" hint="اعلان‌ها از طریق این ربات برای کاربران می‌روند؛ با ذخیره، ربات بلافاصله با مقادیر جدید شروع به کار می‌کند">
      <div className="flex items-center gap-2 text-xs">
        <IconBrandTelegram className="size-4 text-sky-500" />
        {value.tokenSet && value.botUsername ? (
          <span className="text-emerald-600">فعال — @{value.botUsername}</span>
        ) : (
          <span className="text-amber-600">غیرفعال؛ توکن و نام کاربری ربات را وارد کنید</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="توکن ربات" hint={value.tokenSet ? `ذخیره شده (${value.tokenHint}) — برای تغییر، توکن جدید را بنویسید` : 'از BotFather دریافت می‌شود'}>
          <Input dir="ltr" autoComplete="off" placeholder={value.tokenSet ? '••••••••' : '123456:ABC…'} value={form.botToken} onChange={set('botToken')} />
        </Field>
        <Field label="نام کاربری ربات" hint="بدون @">
          <Input dir="ltr" placeholder="my_company_bot" value={form.botUsername} onChange={set('botUsername')} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={update.isLoading}>
          {update.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
        </Button>
      </div>
    </Section>
  );
}

function SmsCard({ Section, value, onSaved }: { Section: SectionType; value: IntegrationSettings['sms']; onSaved: () => void }) {
  const update = useUpdateIntegrationSettings();
  const [form, setForm] = useState({ provider: 'asanak' as 'asanak' | 'smsir', smsirApiKey: '', smsirLine: '', smsirOtpTemplate: '', smsirOtpParam: 'CODE', apiUrl: '', username: '', password: '', source: '' });
  useEffect(() => {
    setForm({ provider: value.provider, smsirApiKey: '', smsirLine: value.smsirLine, smsirOtpTemplate: value.smsirOtpTemplate, smsirOtpParam: value.smsirOtpParam, apiUrl: value.apiUrl, username: value.username, password: '', source: value.source });
  }, [value]);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    try {
      await update.submit({ sms: form });
      toast.success('تنظیمات پیامک ذخیره شد');
      onSaved();
    } catch (e) {
      toast.error((e as Error)?.message ?? 'ذخیره نشد');
    }
  };

  return (
    <Section title="سرویس پیامک" hint="برای ارسال کد ورود و اعلان‌ها به کاربرانی که تلگرام را وصل نکرده‌اند">
      <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm" role="group" aria-label="سرویس پیامک">
        {([['asanak', 'آسانک'], ['smsir', 'sms.ir']] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={form.provider === v}
            onClick={() => setForm((f) => ({ ...f, provider: v }))}
            className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${form.provider === v ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <IconMessage className="size-4 text-slate-500" />
        {(value.provider === 'smsir' ? value.smsirKeySet && value.smsirLine : value.apiUrl && value.username && value.passwordSet) ? (
          <span className="text-emerald-600">پیکربندی شده (سرویس فعال ذخیره‌شده: {value.provider === 'smsir' ? 'sms.ir' : 'آسانک'})</span>
        ) : (
          <span className="text-amber-600">ناقص؛ اطلاعات سرویس انتخاب‌شده را وارد کنید</span>
        )}
      </div>
      {form.provider === 'smsir' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="کلید API" hint={value.smsirKeySet ? `ذخیره شده (${value.smsirKeyHint}) — برای تغییر، کلید جدید را بنویسید` : 'از بخش API پنل sms.ir'}>
            <Input dir="ltr" autoComplete="off" placeholder={value.smsirKeySet ? '••••••••' : ''} value={form.smsirApiKey} onChange={set('smsirApiKey')} />
          </Field>
          <Field label="شمارهٔ خط ارسال‌کننده">
            <Input dir="ltr" placeholder="30007732000000" value={form.smsirLine} onChange={set('smsirLine')} />
          </Field>
          <Field label="شناسهٔ قالب کد ورود" hint="خالی باشد، کد ورود به‌صورت پیام معمولی فرستاده می‌شود">
            <Input dir="ltr" inputMode="numeric" placeholder="123456" value={form.smsirOtpTemplate} onChange={set('smsirOtpTemplate')} />
          </Field>
          <Field label="نام پارامتر کد در قالب" hint="همان نامی که در متن قالب برای کد نوشته‌اید">
            <Input dir="ltr" placeholder="CODE" value={form.smsirOtpParam} onChange={set('smsirOtpParam')} />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="آدرس API">
            <Input dir="ltr" placeholder="https://sms.asanak.com/webservice/v1rest/sendsms" value={form.apiUrl} onChange={set('apiUrl')} />
          </Field>
          <Field label="شمارهٔ فرستنده">
            <Input dir="ltr" placeholder="989982003670" value={form.source} onChange={set('source')} />
          </Field>
          <Field label="نام کاربری">
            <Input dir="ltr" autoComplete="off" value={form.username} onChange={set('username')} />
          </Field>
          <Field label="رمز عبور" hint={value.passwordSet ? `ذخیره شده (${value.passwordHint}) — برای تغییر، رمز جدید را بنویسید` : undefined}>
            <Input dir="ltr" type="password" autoComplete="new-password" placeholder={value.passwordSet ? '••••••••' : ''} value={form.password} onChange={set('password')} />
          </Field>
        </div>
      )}
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={update.isLoading}>
          {update.isLoading ? 'در حال ذخیره...' : 'ذخیره'}
        </Button>
      </div>
    </Section>
  );
}
