'use client';

import { Button, Input, Modal } from '@/ui/atoms';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconCamera, IconUserFilled } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { uploadProfilePicture, useUpdateProfileMutation } from './auth.api.client';
import { useAuth } from './auth.context.provider';

const onboardingFormSchema = z.object({
    firstName: z.string().min(1, { message: 'نام را وارد کنید' }),
    lastName: z.string().optional().or(z.literal('')),
});

type OnboardingFormData = z.infer<typeof onboardingFormSchema>;

export default function OnboardingModal({ isOpen }: { isOpen: boolean }) {
    const { user, refreshProfile } = useAuth();
    const { updateProfile, isLoading: isSaving } = useUpdateProfileMutation();
    const [error, setError] = useState<string | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<OnboardingFormData>({
        resolver: zodResolver(onboardingFormSchema),
    });

    const handlePictureSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const onSubmit = async (data: OnboardingFormData) => {
        setError(null);
        try {
            await updateProfile({
                firstName: data.firstName,
                lastName: data.lastName || undefined,
            });

            if (pendingFile) {
                setIsUploadingImage(true);
                try {
                    await uploadProfilePicture(pendingFile);
                } finally {
                    setIsUploadingImage(false);
                }
            }

            await refreshProfile();
        } catch {
            setError('ثبت اطلاعات با خطا مواجه شد. دوباره تلاش کنید.');
        }
    };

    const isBusy = isSaving || isUploadingImage;

    return (
        <Modal
            isOpen={isOpen}
            hasBackdrop
            onClose={() => { }}
            className='px-4 py-6 lg:px-6 bg-white lg:rounded-2xl flex flex-col gap-6 lg:min-w-[480px]'
        >
            <div>
                <div className='font-bold text-lg lg:text-xl text-slate-700'>
                    تکمیل اطلاعات حساب کاربری
                </div>
                <div className='text-sm text-slate-500 mt-1'>
                    برای ادامه، لطفاً نام خود را وارد کنید. افزودن عکس پروفایل اختیاری است.
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className='flex flex-col items-center'>
                <div className='relative group'>
                    <div className='w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg'>
                        {previewUrl || user?.profilePicture ? (
                            <img
                                src={previewUrl || user?.profilePicture}
                                alt="Profile"
                                className='w-full h-full object-cover'
                            />
                        ) : (
                            <IconUserFilled className='size-12 text-primary/60' />
                        )}
                    </div>
                    <button
                        type='button'
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBusy}
                        className='absolute bottom-0 right-0 p-2.5 rounded-2xl bg-white shadow-lg border border-slate-200 hover:bg-slate-50 transition-all group-hover:scale-110'
                    >
                        <IconCamera className='size-4 text-primary' />
                    </button>
                    <input
                        ref={fileInputRef}
                        type='file'
                        accept='image/*'
                        onChange={handlePictureSelected}
                        className='hidden'
                    />
                </div>
                <div className='text-xs text-slate-400 mt-2'>عکس پروفایل (اختیاری)</div>
            </div>

            <div className='space-y-4'>
                <Input
                    placeholder='نام'
                    {...register('firstName')}
                    error={errors.firstName?.message}
                    disabled={isBusy}
                />
                <Input
                    placeholder='نام خانوادگی (اختیاری)'
                    {...register('lastName')}
                    error={errors.lastName?.message}
                    disabled={isBusy}
                />
            </div>

            <Button
                variant='primary'
                type='button'
                onClick={handleSubmit(onSubmit)}
                disabled={isBusy}
            >
                {isBusy ? 'در حال ذخیره...' : 'ذخیره و ادامه'}
            </Button>
        </Modal>
    );
}
