'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { DataView } from '@/ui/molecules/dataView/ui.data-view';
import { useNotificationPreferences, updateNotificationPreference } from '../notifications.api';
import { NotificationCategory } from '../notifications.types';
import { mutate } from 'swr';
import { useState } from 'react';

export default function NotificationPreferencesPage() {
    const { data, error, isLoading } = useNotificationPreferences();
    const [updating, setUpdating] = useState<string | null>(null);

    const handleToggle = async (
        category: NotificationCategory,
        field: 'enabled' | 'smsEnabled' | 'emailEnabled' | 'appPushEnabled' | 'telegramEnabled',
        currentValue: boolean
    ) => {
        setUpdating(`${category}-${field}`);
        try {
            await updateNotificationPreference(category, {
                [field]: !currentValue,
            });
            mutate('/notifications/preferences');
        } catch (error) {
            console.error('Failed to update preference:', error);
        } finally {
            setUpdating(null);
        }
    };

    const getCategoryText = (category: NotificationCategory) => {
        switch (category) {
            case NotificationCategory.SYSTEM:
                return 'سیستم';
            case NotificationCategory.GENERAL:
                return 'عمومی';
            default:
                return category;
        }
    };

    const getCategoryDescription = (category: NotificationCategory) => {
        switch (category) {
            case NotificationCategory.SYSTEM:
                return 'اعلان‌های سیستمی و به‌روزرسانی‌ها';
            case NotificationCategory.GENERAL:
                return 'اعلان‌های عمومی و اطلاعیه‌ها';
            default:
                return '';
        }
    };

    const getChannelText = (channel: string) => {
        switch (channel) {
            case 'smsEnabled':
                return 'پیامک';
            case 'emailEnabled':
                return 'ایمیل';
            case 'appPushEnabled':
                return 'نوتیفیکیشن اپلیکیشن';
            case 'telegramEnabled':
                return 'تلگرام';
            default:
                return channel;
        }
    };

    return (
        <ProtectedRoute>
            <DashbaordLayout>
                <div className='space-y-3 grow flex flex-col overflow-hidden'>
                    <div className='p-4 ui-surface flex items-center gap-4 justify-between'>
                        <div>
                            <h1 className='font-bold text-lg'>تنظیمات اعلان‌ها</h1>
                            <p className='text-sm text-gray-500 mt-1'>
                                مدیریت نحوه دریافت اعلان‌های مختلف
                            </p>
                        </div>
                    </div>
                    <DataView
                        data={data}
                        error={error}
                        isLoading={isLoading}
                        className='p-4 ui-surface grow flex flex-col gap-4 overflow-auto'
                        isEmpty={(data) => !data || data.length === 0}
                        emptyMessage='هیچ تنظیماتی برای اعلان‌ها وجود ندارد.'
                        variant='inline'
                    >
                        <div className="space-y-4">
                            {data?.map((preference) => (
                                <div
                                    key={preference.id}
                                    className="border rounded-lg p-4 space-y-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg">
                                                {getCategoryText(preference.category)}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {getCategoryDescription(preference.category)}
                                            </p>
                                        </div>
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={preference.enabled}
                                                onChange={() =>
                                                    handleToggle(
                                                        preference.category,
                                                        'enabled',
                                                        preference.enabled
                                                    )
                                                }
                                                disabled={updating === `${preference.category}-enabled`}
                                                className="sr-only peer"
                                            />
                                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {preference.enabled && (
                                        <div className="space-y-3 pt-3 border-t">
                                            <p className="text-sm font-medium text-gray-700">
                                                کانال‌های دریافت اعلان:
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {(['smsEnabled', 'emailEnabled', 'appPushEnabled', 'telegramEnabled'] as const).map(
                                                    (channel) => (
                                                        <label
                                                            key={channel}
                                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                                        >
                                                            <span className="text-sm">
                                                                {getChannelText(channel)}
                                                            </span>
                                                            <input
                                                                type="checkbox"
                                                                checked={preference[channel]}
                                                                onChange={() =>
                                                                    handleToggle(
                                                                        preference.category,
                                                                        channel,
                                                                        preference[channel]
                                                                    )
                                                                }
                                                                disabled={updating === `${preference.category}-${channel}`}
                                                                className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                            />
                                                        </label>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </DataView>
                </div>
            </DashbaordLayout>
        </ProtectedRoute>
    );
}
