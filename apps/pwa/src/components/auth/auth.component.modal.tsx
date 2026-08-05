'use client';

import { useAuth } from '@/components/auth/auth.context.provider';
import { ApiError } from '@/libs/api/api.types.error';
import { Button, Input, Modal } from '@/ui/atoms';
import { ResultModal } from '@/ui/molecules/result-modal';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Form validation schema for phone number
const phoneFormSchema = z.object({
    phoneNumber: z
        .string()
        .min(11, { message: 'شماره تلفن باید حداقل ۱۱ رقم باشد' })
        .regex(/^۰۹[۰-۹]{9}$|^09\d{9}$/, { message: 'فرمت شماره تلفن صحیح نیست' }),
});

// Form validation schema for OTP
const otpFormSchema = z.object({
    otp: z
        .string()
        .min(4, { message: 'کد تایید باید حداقل ۴ رقم باشد' })
        .regex(/^[۰-۹\d]+$/, { message: 'کد تایید باید عدد باشد' }),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
});

type PhoneFormData = z.infer<typeof phoneFormSchema>;
type OtpFormData = z.infer<typeof otpFormSchema>;

export default function LoginModal(props: { onClose?: () => void, onLoginSuccess?: () => void, isOpen?: boolean, hasBackdrop?: boolean }) {
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [success, setSuccess] = useState<string | null>(null);
    const [pendingApproval, setPendingApproval] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);
    const router = useRouter();
    const { sendOtp, verifyOtpAndLogin, isLoading: authLoading, isAuthenticated, error, clearError } = useAuth();

    const {
        register: registerPhone,
        handleSubmit: handlePhoneSubmit,
        formState: { errors: phoneErrors },
    } = useForm<PhoneFormData>({
        resolver: zodResolver(phoneFormSchema),
    });

    // Form handling for OTP
    const {
        register: registerOtp,
        handleSubmit: handleOtpSubmit,
        setError: setOtpFormError,
        formState: { errors: otpErrors },
    } = useForm<OtpFormData>({
        resolver: zodResolver(otpFormSchema),
    });

    // Handle successful verification
    useEffect(() => {
        if (isAuthenticated) {
            if (props.onLoginSuccess) {
                props.onLoginSuccess();
            } else {
                // Check URL for redirect parameter
                const urlParams = new URLSearchParams(window.location.search);
                const redirectPath = urlParams.get('redirect');

                if (redirectPath) {
                    // Decode and redirect to the saved route with all query params
                    router.push(decodeURIComponent(redirectPath));
                } else {
                    router.push('/dashboard');
                }
            }
        }
    }, [isAuthenticated, props, router]);

    // Handle phone form submission
    const onPhoneSubmit = async (data: PhoneFormData) => {
        setPhoneNumber(data.phoneNumber);

        try {
            const result = await sendOtp(data.phoneNumber);
            setIsNewUser(Boolean(result?.isNewUser));
            setStep('otp');
        } catch {
            // Error is surfaced via useAuth().error, rendered below
        }
    };

    // Handle OTP form submission
    const onOtpSubmit = async (data: OtpFormData) => {
        if (isNewUser && !data.firstName?.trim()) {
            setOtpFormError('firstName', { message: 'نام را وارد کنید' });
            return;
        }

        try {
            await verifyOtpAndLogin(
                phoneNumber,
                data.otp,
                isNewUser ? data.firstName?.trim() : undefined,
                isNewUser ? data.lastName?.trim() || undefined : undefined,
            );
            // Result handling is done in the useEffect above
        } catch (err) {
            if ((err as ApiError)?.info?.errorCode === 'PENDING_APPROVAL') {
                setPendingApproval(true);
            }
            // Other errors are surfaced via useAuth().error, rendered below
        }
    };

    const handleBackToPhone = () => {
        setStep('phone');
        setSuccess(null);
        setIsNewUser(false);
        clearError();
    };

    const handleResendOtp = async () => {
        try {
            const result = await sendOtp(phoneNumber);
            setSuccess(result?.message || 'کد تایید مجدداً ارسال شد');
        } catch {
            // Error is handled by the useEffect above
        }
    };

    return (
        <>
            <Modal
                isOpen={props.isOpen ?? true}
                hasBackdrop={props.hasBackdrop ?? false}
                className='px-4 py-6 lg:px-6 bg-white lg:rounded-2xl flex flex-col gap-8 lg:min-w-[768px]'
                onClose={() => { }}
            >
                <div className='flex justify-between items-center'>
                    <div className='font-bold text-lg lg:text-xl text-slate-700'>
                        ورود به حساب کاربری
                    </div>
                    <Button onClick={() => {
                        if (props.onClose) {
                            props.onClose();
                        } else {
                            router.push('/');
                        }
                    }} variant='outline' className='!px-2'>
                        <IconX className='size-5' />
                    </Button>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                    {step === 'phone' ? (
                        <div className='lg:p-6 rounded-2xl lg:bg-white space-y-4'>
                            <div className='font-semibold text-lg text-slate-700'>شماره موبایل خود را وارد کنید</div>
                            <div className='text-sm text-slate-500'>
                                برای استفاده از امکانات هم‌اوا، لطفاً شمارهٔ موبایل خود را وارد کنید. کد تأیید به این شماره پیامک خواهد شد.
                            </div>
                            <br />
                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                    {error}
                                </div>
                            )}
                            <Input
                                placeholder='شماره موبایل'
                                className='text-left'
                                dir='ltr'
                                {...registerPhone('phoneNumber')}
                                error={phoneErrors.phoneNumber?.message}
                                disabled={authLoading}
                            />
                            <div className='flex items-center gap-2.5'>
                                <Button
                                    variant='secondary'
                                    onClick={() => {
                                        if (props.onClose) {
                                            props.onClose();
                                        } else {
                                            router.push('/')
                                        }
                                    }}
                                >
                                    بازگشت
                                </Button>
                                <Button
                                    variant='primary'
                                    type='button'
                                    className='grow'
                                    onClick={handlePhoneSubmit(onPhoneSubmit)}
                                    disabled={authLoading}
                                >
                                    {authLoading ? 'در حال بررسی...' : 'ارسال کد تایید'}
                                </Button>
                            </div>
                            <br />
                        </div>
                    ) : (
                        <div className='lg:p-6 rounded-2xl lg:bg-white space-y-4'>
                            <div className='font-semibold text-lg text-slate-700'>کد تأیید را وارد کنید</div>
                            <div className='text-sm text-slate-500'>
                                کد پیامک‌شده به شمارۀ «{phoneNumber}» را وارد کنید.
                            </div>
                            <br />
                            {error && !pendingApproval && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                                    {success}
                                </div>
                            )}
                            <Input
                                placeholder='کد تایید 4 رقمی'
                                className='text-left'
                                dir='ltr'
                                {...registerOtp('otp')}
                                error={otpErrors.otp?.message}
                                disabled={authLoading}
                            />
                            {isNewUser && (
                                <div className='space-y-3 pt-1'>
                                    <Input
                                        placeholder='نام'
                                        {...registerOtp('firstName')}
                                        error={otpErrors.firstName?.message}
                                        disabled={authLoading}
                                    />
                                    <Input
                                        placeholder='نام خانوادگی (اختیاری)'
                                        {...registerOtp('lastName')}
                                        disabled={authLoading}
                                    />
                                </div>
                            )}
                            <div className='flex items-center gap-2.5'>
                                <Button
                                    variant='ghost'
                                    onClick={handleBackToPhone}
                                    disabled={authLoading}
                                >
                                    بازگشت
                                </Button>
                                <Button
                                    variant='secondary'
                                    className='grow'
                                    onClick={handleOtpSubmit(onOtpSubmit)}
                                    disabled={authLoading}
                                >
                                    {authLoading ? 'در حال بررسی...' : 'ورود'}
                                </Button>
                            </div>
                            <br />
                            <div className='text-xs text-blue-600 flex justify-between'>
                                <div onClick={handleBackToPhone} className="cursor-pointer">ویرایش شماره</div>
                                <div
                                    onClick={handleResendOtp}
                                    className={`cursor-pointer ${authLoading ? 'opacity-50' : ''}`}
                                    style={{ pointerEvents: authLoading ? 'none' : 'auto' }}
                                >
                                    ارسال مجدد
                                </div>
                            </div>
                        </div>
                    )}
                    <div className='lg:flex items-center hidden'>
                        <img src="/images/Login.png" className='w-full h-auto max-h-72 object-contain' alt="Login" />
                    </div>
                </div>
            </Modal>

            <ResultModal
                isOpen={pendingApproval}
                onClose={() => {
                    setPendingApproval(false);
                    handleBackToPhone();
                }}
                status="info"
                title="درخواست ورود"
                infoTitle="در انتظار تایید مدیر"
                infoMessage="درخواست ورود شما برای مدیر ارسال شد. پس از تایید می‌توانید وارد حساب کاربری خود شوید."
                closeButtonText="متوجه شدم"
            />
        </>
    );
}