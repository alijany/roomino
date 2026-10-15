'use client';

import { useState, useRef, useEffect } from 'react';
import { IconBell, IconCircle } from '@tabler/icons-react';
import { Button } from '@/ui/atoms/ui.button';
import { Card, CardHeader, CardContent } from '@/ui/atoms/ui.card';
// Avatar intentionally not used for now: emojis are rendered directly; remove Avatar if unused in future
import { Spinner } from '@/ui/atoms/ui.atoms.spinner';
import Link from 'next/link';
import { useNotifications, useUnreadCount, markAsRead, getNotificationsCacheKey } from '@/app/dashboard/notifications/notifications.api';
import { NotificationResponse, NotificationCategory } from '@/app/dashboard/notifications/notifications.types';
import { mutate } from 'swr';

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { data: unreadData } = useUnreadCount();
    const notificationFilters = { limit: 5, page: 0, isRead: false };
    const { data: notificationsData, isLoading: isNotificationsLoading } = useNotifications(notificationFilters);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleNotificationClick = async (notificationId: number, isRead: boolean) => {
        if (!isRead) {
            try {
                await markAsRead(notificationId);
                mutate('/notifications/unread-count');
                mutate(getNotificationsCacheKey(notificationFilters));
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        }
        setIsOpen(false);
    };

    const getCategoryIcon = (category: NotificationCategory) => {
        switch (category) {
            case NotificationCategory.SYSTEM:
                return '🔔';
            case NotificationCategory.GENERAL:
                return '📢';
            default:
                return '📌';
        }
    };

    const unreadCount = unreadData?.count || 0;

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                variant="outline"
                className="relative !min-h-10 !px-2.5"
                aria-label={unreadCount > 0 ? `اعلان‌ها، ${unreadCount} خوانده‌نشده` : 'اعلان‌ها'}
                aria-expanded={isOpen}
            >
                <IconBell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 z-50">
                    <Card className="flex max-h-[min(500px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-pop">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-4">
                            <h3 className="font-semibold">اعلان‌ها</h3>
                            <Link
                                href="/dashboard/notifications"
                                className="text-sm text-brand-700 hover:text-brand-800"
                                onClick={() => setIsOpen(false)}
                            >
                                مشاهده همه
                            </Link>
                        </CardHeader>

                        <CardContent className="overflow-y-auto flex-1 p-0">
                            {notificationsData?.items && notificationsData.items.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {notificationsData.items.map((notification: NotificationResponse) => (
                                        <Link
                                            key={notification.id}
                                            href={notification.link || '/dashboard/notifications'}
                                            onClick={() => handleNotificationClick(notification.id, notification.isRead)}
                                            className="block p-4 transition-colors hover:bg-slate-50"
                                        >
                                            <div className="flex gap-3">
                                                <div className="text-2xl flex-shrink-0">
                                                    <div className="rounded-full w-10 h-10 bg-slate-100 flex items-center justify-center text-lg">{getCategoryIcon(notification.category)}</div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="text-sm font-medium line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        {!notification.isRead && (
                                                            <IconCircle size={12} fill="currentColor" className="text-blue-600 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {new Date(notification.created_at).toLocaleDateString('fa-IR', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                isNotificationsLoading ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <Spinner size="md" className="mx-auto mb-2" />
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        <IconBell size={48} className="mx-auto mb-2 opacity-50" />
                                        <p>اعلان جدیدی وجود ندارد</p>
                                    </div>
                                )
                            )}


                            {notificationsData?.items && notificationsData.items.length > 0 && (
                                <div className="p-3 border-t bg-gray-50">
                                    <Link
                                        href="/dashboard/notifications"
                                        className="block text-center text-sm text-blue-600 hover:text-blue-700"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        مشاهده تمام اعلان‌ها
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
