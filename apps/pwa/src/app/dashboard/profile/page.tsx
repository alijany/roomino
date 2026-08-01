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
import { Button, Input } from '@/ui/atoms';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconCamera, IconCheck, IconPhone, IconUserFilled, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { PhoneChangeModal } from './profile.modal.phone-change';

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
  });

  type ProfileFormData = z.infer<typeof profileSchema>;

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    }
  });

  useEffect(() => {
    reset({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    });
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
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
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      await uploadProfilePicture(file);
      await refreshProfile();
    } catch (error) {
      console.error('Error uploading image:', error);
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
        <div className="space-y-6 grow flex flex-col overflow-auto">
          {/* Main Card */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 lg:p-6 rounded-3xl bg-white shadow-sm border border-slate-100 grow flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 py-4 bg-white z-10 sticky top-0">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">پروفایل کاربری</h1>
                <p className="text-slate-600 mt-1">اطلاعات حساب کاربری خود را مدیریت کنید</p>
              </div>
              <div className="flex gap-2 items-center">
                {isDirty && <Button variant="outline" onClick={handleCancel} size="sm" disabled={isUpdating} type="button">
                  <IconX className="size-4" />
                  لغو
                </Button>}
                <Button type="submit" size="sm" disabled={!isDirty || isUpdating}>
                  <IconCheck className="size-4" />
                  {isUpdating ? 'در حال ذخیره...' : 'ذخیره'}
                </Button>
              </div>
            </div>

            {/* Profile Picture Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <IconUserFilled className="size-16 text-primary/60" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute bottom-0 right-0 p-3 rounded-2xl bg-white shadow-lg border border-slate-200 hover:bg-slate-50 transition-all group-hover:scale-110"
                >
                  <IconCamera className="size-5 text-primary" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              {isUploadingImage && (
                <p className="text-sm text-slate-600 mt-3">در حال آپلود...</p>
              )}
            </div>

            {/* Personal Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">اطلاعات شخصی</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    نام
                  </label>
                  <Input
                    placeholder="نام خود را وارد کنید"
                    {...register('firstName')}
                    error={errors.firstName?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    نام خانوادگی
                  </label>
                  <Input
                    placeholder="نام خانوادگی خود را وارد کنید"
                    {...register('lastName')}
                    error={errors.lastName?.message}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  شماره تلفن
                </label>
                <div className="flex gap-3">
                  <Input
                    disabled
                    placeholder="شماره تلفن"
                    value={user?.phone || ''}
                    className="flex-1 font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setIsPhoneModalOpen(true)}
                    className="shrink-0"
                  >
                    <IconPhone className="size-4" />
                    تغییر
                  </Button>
                </div>
              </div>
            </div>
          </form>
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
