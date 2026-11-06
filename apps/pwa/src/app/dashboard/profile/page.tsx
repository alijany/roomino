'use client';

import {
  uploadProfilePicture,
  useRequestOtpMutation,
  useUpdatePhoneMutation,
  useUpdateProfileMutation,
} from '@/components/auth/auth.api.client';
import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { useAuth } from '@/components/auth/auth.context.provider';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Avatar, Button, Input } from '@/ui/atoms';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconCamera, IconCheck, IconPhone, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { PhoneChangeModal } from './profile.modal.phone-change';
import { TelegramConnectCard } from '../notifications/notifications.component.telegram';
import { prepareAvatar } from '@/libs/image/image.util.avatar';

/** Editing name and phone is switched off for now (the photo can still change); set to true to bring it back. */
const EDITING_ENABLED = false;

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { updateProfile, isLoading: isUpdating } = useUpdateProfileMutation();
  const { requestOtp } = useRequestOtpMutation();
  const { updatePhone } = useUpdatePhoneMutation();

  // ---------------------------------------------------------------------------
  // Form setup using react-hook-form + zod (validate simple requirements)
  // ---------------------------------------------------------------------------
  const profileSchema = z.object({
    firstName: z.string().min(1, 'نام را وارد کنید'),
    lastName: z.string().optional().or(z.literal('')),
    displayName: z.string().max(60, 'نام نمایشی حداکثر ۶۰ نویسه است').optional().or(z.literal('')),
  });

  type ProfileFormData = z.infer<typeof profileSchema>;

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      displayName: user?.displayName || '',
    }
  });

  useEffect(() => {
    reset({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      displayName: user?.displayName || '',
    });
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName ?? '',
      });
      await refreshProfile();
      reset(data);
      toast.success('تغییرات ذخیره شد');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('خطا در ذخیره تغییرات');
    }
  };

  const handleCancel = () => {
    reset({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      displayName: user?.displayName || '',
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Cleared so picking the same file again still fires a change.
    e.target.value = '';
    if (!file) return;

    setIsUploadingImage(true);
    try {
      await uploadProfilePicture(await prepareAvatar(file));
      await refreshProfile();
      toast.success('عکس پروفایل به‌روز شد');
    } catch (error) {
      toast.error((error as Error).message || 'آپلود عکس انجام نشد');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePhoneChange = async (phoneNumber: string, otp: string) => {
    await updatePhone({ phoneNumber, otp });
    await refreshProfile();
  };

  return (
    <ProtectedRoute>
      <DashbaordLayout>
        <div className="grow overflow-auto">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <form onSubmit={handleSubmit(onSubmit)} className="contents">
              {/* Header */}
              <div className="flex items-center justify-between lg:col-span-2">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">پروفایل کاربری</h1>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {EDITING_ENABLED ? 'اطلاعات حساب کاربری خود را مدیریت کنید' : 'ویرایش نام و شماره تلفن فعلاً غیرفعال است؛ عکس پروفایل را می‌توانید تغییر دهید'}
                  </p>
                </div>
                {EDITING_ENABLED && <div className="flex items-center gap-2">
                  {isDirty && <Button variant="outline" onClick={handleCancel} size="sm" disabled={isUpdating} type="button">
                    <IconX className="size-4" />
                    لغو
                  </Button>}
                  <Button type="submit" size="sm" disabled={!isDirty || isUpdating}>
                    <IconCheck className="size-4" />
                    {isUpdating ? 'در حال ذخیره...' : 'ذخیره'}
                  </Button>
                </div>}
              </div>

              {/* Personal information */}
              <section className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-2">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="size-16 overflow-hidden rounded-2xl border-2 border-white bg-primary/5 shadow">
                      <Avatar src={user?.profilePicture} name={user?.name} className="size-full rounded-none" labelled />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="absolute -bottom-1 -right-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow hover:bg-slate-50"
                      aria-label="تغییر عکس"
                    >
                      <IconCamera className="size-4 text-primary" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900">اطلاعات شخصی</h2>
                    <p className="text-xs text-slate-500">{isUploadingImage ? 'در حال آپلود عکس...' : user?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">نام</label>
                    <Input placeholder="نام" disabled={!EDITING_ENABLED} {...register('firstName')} error={errors.firstName?.message} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">نام خانوادگی</label>
                    <Input placeholder="نام خانوادگی" disabled={!EDITING_ENABLED} {...register('lastName')} error={errors.lastName?.message} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">نام نمایشی (اختیاری)</label>
                    <Input
                      placeholder="نامی که همکاران می‌بینند"
                      disabled={!EDITING_ENABLED}
                      {...register('displayName')}
                      error={errors.displayName?.message}
                    />
                    <p className="mt-1 text-xs text-slate-400">در فیش حقوقی و اسناد رسمی همچنان نام و نام خانوادگی ثبت‌شده می‌آید.</p>
                  </div>
                </div>
              </section>

              {/* Phone */}
              <section className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">شماره تلفن</h2>
                <div className="flex gap-2">
                  <Input disabled placeholder="شماره تلفن" value={user?.phone || ''} dir="ltr" className="flex-1 text-left font-mono" />
                  {EDITING_ENABLED && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsPhoneModalOpen(true)} className="shrink-0">
                      <IconPhone className="size-4" />
                      تغییر
                    </Button>
                  )}
                </div>
              </section>
            </form>

            {/* Notification settings */}
            <TelegramConnectCard />
          </div>
        </div>

        {/* Phone Change Modal */}
        <PhoneChangeModal
          isOpen={isPhoneModalOpen}
          onClose={() => setIsPhoneModalOpen(false)}
          currentPhone={user?.phone || ''}
          onSubmit={handlePhoneChange}
          onSendOtp={async (phoneNumber) => {
            await requestOtp({ phoneNumber });
          }}
        />
      </DashbaordLayout>
    </ProtectedRoute>
  );
}
