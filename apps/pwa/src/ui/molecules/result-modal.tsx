'use client';

import React from 'react';
import { Button } from '@/ui/atoms/ui.button';
import { Modal } from '@/ui/atoms/ui.modal';
import { IconCheck, IconClock, IconX } from '@tabler/icons-react';
import { cn } from '@/libs/style/style.util.helpers';

export interface ResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    status: 'success' | 'error' | 'info';
    successTitle?: string;
    successMessage?: string;
    errorTitle?: string;
    errorMessage?: string;
    infoTitle?: string;
    infoMessage?: string;
    closeButtonText?: string;
    className?: string;
}

export function ResultModal({
    isOpen,
    onClose,
    title = 'نتیجه درخواست',
    status,
    successTitle = 'انجام شد',
    successMessage = 'درخواست شما با موفقیت ارسال شد',
    errorTitle = 'خطا',
    errorMessage = 'متاسفانه در ارسال درخواست شما خطایی رخ داده است',
    infoTitle = 'توجه',
    infoMessage,
    closeButtonText = 'بازگشت',
    className,
}: ResultModalProps): React.ReactElement {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className={cn("w-full bg-white p-6 flex flex-col gap-8 lg:min-w-[600px]", className)}
        >
            <div className='flex justify-between items-center pb-4'>
                <div className='font-bold text-lg lg:text-xl text-slate-700'>
                    {title}
                </div>

                <Button variant='outline' className='!px-2' onClick={onClose}>
                    <IconX className='size-5' />
                </Button>
            </div>

            {status === 'success' && (
                <div className="space-y-8 flex flex-col items-center">
                    <div className="bg-emerald-400/10 text-emerald-500 rounded-full p-5">
                        <IconCheck size={48} />
                    </div>

                    <div className="space-y-3 text-center">
                        <div className="text-2xl font-bold">{successTitle}</div>
                        <div>{successMessage}</div>
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="space-y-8 flex flex-col items-center">
                    <div className="bg-red-400/10 text-red-500 rounded-full p-5">
                        <IconX size={48} />
                    </div>

                    <div className="space-y-3 text-center">
                        <div className="text-2xl font-bold">{errorTitle}</div>
                        <div>{errorMessage}</div>
                    </div>
                </div>
            )}

            {status === 'info' && (
                <div className="space-y-8 flex flex-col items-center">
                    <div className="bg-sky-400/10 text-sky-500 rounded-full p-5">
                        <IconClock size={48} />
                    </div>

                    <div className="space-y-3 text-center">
                        <div className="text-2xl font-bold">{infoTitle}</div>
                        <div>{infoMessage}</div>
                    </div>
                </div>
            )}

            <Button variant='ghost' className="bg-slate-100 w-full" onClick={onClose}>
                {closeButtonText}
            </Button>
        </Modal>
    );
}