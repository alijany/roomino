'use client';

import { Button, Input, Modal } from '@/ui/atoms';
import { IconPhone, IconX } from '@tabler/icons-react';
import { useState } from 'react';

interface PhoneChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhone: string;
  onSubmit: (phoneNumber: string, otp: string) => Promise<void>;
  onSendOtp: (phoneNumber: string) => Promise<void>;
}

export function PhoneChangeModal({
  isOpen,
  onClose,
  currentPhone,
  onSubmit,
  onSendOtp
}: PhoneChangeModalProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      await onSendOtp(phoneNumber);
      setStep('otp');
    } catch (err: unknown) {
      setError((err as Error).message || 'خطا در ارسال کد تایید');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      await onSubmit(phoneNumber, otp);
      handleClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'کد تایید نادرست است');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('phone');
    setPhoneNumber('');
    setOtp('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-3xl p-6 lg:p-8 w-full max-w-md mx-auto relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute left-4 top-4 p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <IconX className="size-5 text-slate-600" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 rounded-2xl bg-primary/10 mb-4">
            <IconPhone className="size-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">تغییر شماره تلفن</h2>
          <p className="text-slate-600 mt-2 text-center">
            {step === 'phone'
              ? 'شماره تلفن جدید خود را وارد کنید'
              : 'کد تایید ارسال شده را وارد کنید'}
          </p>
        </div>

        {/* Current phone display */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-50">
          <div className="text-sm text-slate-600 mb-1">شماره تلفن فعلی</div>
          <div className="font-semibold text-slate-900 font-mono">{currentPhone}</div>
        </div>

        {/* Form */}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 'phone') void handleSendOtp();
            else void handleVerifyOtp();
          }}
        >
          {step === 'phone' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  شماره تلفن جدید
                </label>
                <Input
                  type="tel"
                  placeholder="09123456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="font-mono"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={!phoneNumber || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'در حال ارسال...' : 'ارسال کد تایید'}
              </Button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  کد تایید
                </label>
                <Input
                  type="text"
                  placeholder="******"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="font-mono text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setStep('phone')}
                  className="flex-1"
                >
                  بازگشت
                </Button>
                <Button
                  type="submit"
                  disabled={!otp || isLoading}
                  className="flex-1"
                  size="lg"
                >
                  {isLoading ? 'در حال تایید...' : 'تایید'}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </Modal>
  );
}
