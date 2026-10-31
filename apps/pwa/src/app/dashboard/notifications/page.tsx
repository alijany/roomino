'use client';

import ProtectedRoute from '@/components/auth/auth.component.protected-route';
import { DashbaordLayout } from '@/components/dashboard/dashboard.layout';
import { Dropdown, Input } from '@/ui/atoms';
import { Pagination } from '@/ui/molecules';
import { DataView } from '@/ui/molecules/dataView/ui.data-view';
import {
    IconBellRinging,
    IconCheck,
    IconFilter,
    IconSearch
} from '@tabler/icons-react';
import { debounce } from 'lodash';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { mutate } from 'swr';
import {
    getNotificationsCacheKey,
    markAllAsRead,
    markAsRead,
    markAsUnread,
    useNotifications,
} from './notifications.api';
import {
    NotificationCategory,
    NotificationResponse,
    NotificationStatus,
    NotificationsFilters,
} from './notifications.types';

const CATEGORY_FILTERS: { id: 'all' | NotificationCategory; label: string }[] = [
    { id: 'all', label: 'همه' },
    { id: NotificationCategory.SYSTEM, label: 'سیستم' },
    { id: NotificationCategory.GENERAL, label: 'عمومی' }
];

export default function NotificationsPage() {
    const [searchText, setSearchText] = useState<string | undefined>();
    const [selectedCategory, setSelectedCategory] = useState<'all' | NotificationCategory>('all');

    const [filters, setFilters] = useState<NotificationsFilters>({
        limit: 20,
        page: 0,
        text: searchText,
    });

    const debouncedSearch = useCallback(
        debounce((text: string | undefined) => {
            setFilters(prev => ({ ...prev, text, page: 0 }));
        }, 500),
        []
    );

    const { data, error, isLoading } = useNotifications(filters);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value || undefined;
        setSearchText(value);
        debouncedSearch(value);
    };

    const handlePageChange = (page: number) => {
        setFilters(prev => ({ ...prev, page: page - 1 }));
    };

    const handleMarkAsRead = async (notificationId: number, isRead: boolean) => {
        try {
            if (isRead) {
                await markAsUnread(notificationId);
            } else {
                await markAsRead(notificationId);
            }
            mutate(getNotificationsCacheKey(filters));
            mutate('/notifications/unread-count');
        } catch (error) {
            console.error('Failed to update notification:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            mutate(getNotificationsCacheKey(filters));
            mutate('/notifications/unread-count');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'sms':
                return '📱';
            case 'email':
                return '📧';
            case 'app_push':
                return '📲';
            case 'telegram_bot':
                return '📬';
            case 'system':
                return '🔔';
            default:
                return '📌';
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

    const categoryFilteredItems = useMemo(() => {
        if (!data?.items) return [];
        if (selectedCategory === 'all') return data.items;
        return data.items.filter(item => item.category === selectedCategory);
    }, [data?.items, selectedCategory]);

    const unreadCount = useMemo(
        () => categoryFilteredItems.filter(item => !item.isRead).length,
        [categoryFilteredItems]
    );

    return (
        <ProtectedRoute>
            <DashbaordLayout>
                <div className='flex flex-col gap-4 grow overflow-hidden'>
                    {/* Header */}
                    <div className='rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-4 py-3 lg:px-6 lg:py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between shadow-[0_18px_45px_rgba(15,23,42,0.06)]'>
                        <div className='flex items-center gap-3'>
                            <div className='mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-slate-50 shadow-sm'>
                                <IconBellRinging size={18} />
                            </div>

                            <div className='flex flex-wrap items-center gap-2'>
                                <h1 className='text-sm font-semibold text-slate-900 lg:text-base'>مرکز اعلان‌ها</h1>
                                {typeof unreadCount === 'number' && unreadCount > 0 && (
                                    <span className='rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white/90'>
                                        {unreadCount.toLocaleString('fa-IR')} جدید
                                    </span>
                                )}
                            </div>

                        </div>
                        <div className='flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end'>
                            <button
                                onClick={handleMarkAllAsRead}
                                className='inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100'
                            >
                                <IconCheck size={14} className='text-emerald-500' />
                                همه خوانده شده
                            </button>
                            <Link
                                href='/dashboard/notifications/preferences'
                                className='inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-50 shadow-sm transition hover:bg-black'
                            >
                                تنظیمات کانال‌ها و ترجیحات
                            </Link>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className='flex flex-col gap-2.5 rounded-2xl border z-10 border-slate-200/80 bg-white/80 px-3 py-2.5 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between lg:px-4 lg:py-3'>
                        <div className='w-full lg:max-w-sm'>
                            <Input
                                placeholder='جستجو در متن، وضعیت یا دسته‌بندی اعلان‌ها'
                                icon={<IconSearch size={18} />}
                                value={searchText || ''}
                                onChange={handleSearchChange}
                            />
                        </div>
                        <div className='flex items-center justify-between gap-2 lg:justify-end'>
                            <div className='w-40 sm:w-48'>
                                <Dropdown<'all' | NotificationCategory>
                                    items={CATEGORY_FILTERS.map(item => ({
                                        label: item.label,
                                        value: item.id,
                                    }))}
                                    value={selectedCategory}
                                    onChange={value => setSelectedCategory(value ?? 'all')}
                                    placeholder='همه دسته‌بندی‌ها'
                                    variant='outline'
                                    size='sm'
                                    renderButton={(label, disabled) => (
                                        <button
                                            type='button'
                                            disabled={disabled}
                                            className='flex w-full items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                                        >
                                            <span className='truncate'>{label}</span>
                                            <IconFilter size={14} className='shrink-0 text-slate-400' />
                                        </button>
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className='relative flex min-h-0 grow flex-col rounded-2xl border border-slate-200/80 bg-white/90 p-0.5 shadow-[0_22px_65px_rgba(15,23,42,0.06)]'>
                        <div className='flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-[11px] text-slate-400'>
                            <span>لیست اعلان‌ها</span>
                            <span className='hidden gap-1 sm:inline-flex'>
                                <span>مرتب‌سازی جدیدترین</span>
                                <span className='h-1 w-1 rounded-full bg-slate-300' />
                                <span>
                                    {data?.meta?.total
                                        ? `${data.meta.total.toLocaleString('fa-IR')} رویداد`
                                        : 'بدون داده'}
                                </span>
                            </span>
                        </div>

                        <DataView
                            data={categoryFilteredItems}
                            error={error}
                            isLoading={isLoading}
                            className='flex grow flex-col overflow-hidden'
                            isEmpty={items => !items || items.length === 0}
                            emptyMessage='اعلانی در این بازه وجود ندارد. به‌محض رخ دادن رویدادهای جدید در حساب، اینجا نمایش داده می‌شود.'
                            variant='inline'
                        >
                            <div className='flex grow flex-col overflow-hidden'>
                                <div className='hidden border-b border-slate-100 px-4 py-2 text-[11px] text-slate-400 md:grid md:grid-cols-[minmax(0,1.9fr)_minmax(0,1.1fr)_90px] md:items-center'>
                                    <span className='pr-9'>اعلان</span>
                                    <span>کانال و زمان‌بندی</span>
                                    <span className='text-left'>وضعیت</span>
                                </div>

                                <div className='flex min-h-0 grow flex-col gap-1.5 overflow-auto px-2 py-2.5 lg:px-3 lg:py-3'>
                                    {categoryFilteredItems.map((notification: NotificationResponse) => {
                                        const created = new Date(notification.created_at);
                                        const dateLabel = created.toLocaleDateString('fa-IR');
                                        const timeLabel = created.toLocaleTimeString('fa-IR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        });

                                        return (
                                            <article
                                                key={notification.id}
                                                className={`group rounded-2xl border px-3 py-2.5 text-[13px] transition-all md:grid md:grid-cols-[minmax(0,1.9fr)_minmax(0,1.1fr)_90px] md:items-center md:gap-3 ${notification.isRead
                                                    ? 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/60'
                                                    : 'border-slate-900/10 bg-slate-900/[0.01] hover:border-slate-900/20 hover:bg-slate-900/[0.03]'
                                                    }`}
                                            >
                                                {/* Message & meta */}
                                                <div className='flex items-start gap-3 pr-0.5 md:pr-2'>
                                                    <button
                                                        onClick={() => handleMarkAsRead(notification.id, notification.isRead)}
                                                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-slate-400 transition ${notification.isRead
                                                            ? 'border-slate-200 bg-white hover:border-slate-300 hover:text-slate-600'
                                                            : 'border-slate-900/20 bg-slate-900 text-white hover:border-slate-900 hover:bg-black'
                                                            }`}
                                                        title={
                                                            notification.isRead
                                                                ? 'علامت‌گذاری به عنوان خوانده نشده'
                                                                : 'علامت‌گذاری به عنوان خوانده شده'
                                                        }
                                                    >

                                                    </button>

                                                    <div className='flex-1 space-y-1.5'>
                                                        <div className='flex flex-wrap items-center gap-1.5'>
                                                            <span className='text-lg leading-none'>{getNotificationIcon(notification.type)}</span>
                                                            <span
                                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${notification.isRead
                                                                    ? 'bg-slate-50 text-slate-600'
                                                                    : 'bg-slate-900 text-slate-50'
                                                                    }`}
                                                            >
                                                                {getCategoryText(notification.category)}
                                                                {!notification.isRead && (
                                                                    <span className='h-1 w-1 rounded-full bg-emerald-400' />
                                                                )}
                                                            </span>
                                                            {!notification.isRead && (
                                                                <span className='inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700'>
                                                                    تازه
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div
                                                            className={`leading-snug ${notification.isRead
                                                                ? 'font-normal text-slate-700'
                                                                : 'font-medium text-slate-900'
                                                                }`}
                                                        >
                                                            {notification.link ? (
                                                                <Link
                                                                    href={notification.link}
                                                                    className='transition-colors hover:text-slate-900 hover:underline hover:underline-offset-4'
                                                                >
                                                                    {notification.message}
                                                                </Link>
                                                            ) : (
                                                                notification.message
                                                            )}
                                                        </div>

                                                        {notification.errorMessage && (
                                                            <div className='text-[11px] text-rose-500'>
                                                                {notification.errorMessage}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Channel & time */}
                                                <div className='mt-2 flex items-baseline justify-between gap-2 text-[11px] text-slate-500 md:mt-0 md:justify-start'>
                                                    <div className='inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5'>
                                                        <span className='text-xs'>کانال</span>
                                                        <span className='h-1 w-1 rounded-full bg-slate-300' />
                                                        <span className='font-medium'>{notification.type}</span>
                                                    </div>
                                                    <div className='flex items-center gap-1.5 text-[11px] text-slate-400'>
                                                        <span>{dateLabel}</span>
                                                        <span className='h-1 w-1 rounded-full bg-slate-300' />
                                                        <span>{timeLabel}</span>
                                                    </div>
                                                </div>

                                                {/* Status */}
                                                <div className='mt-2 flex items-center justify-end text-left text-[11px] md:mt-0'>
                                                    <StatusPill status={notification.status} />
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>

                            {data?.meta && data.meta.total > (filters.limit || 20) && (
                                <div className='border-t border-slate-100 px-3 py-2.5 lg:px-4 lg:py-3'>
                                    <Pagination
                                        itemPerPage={filters.limit || 20}
                                        page={(filters.page || 0) + 1}
                                        totalCount={data.meta.total}
                                        onNavigate={page => {
                                            handlePageChange(page);
                                            return '#';
                                        }}
                                    />
                                </div>
                            )}
                        </DataView>
                    </div>
                </div>
            </DashbaordLayout>
        </ProtectedRoute>
    );
}

function StatusPill({ status }: { status: NotificationStatus }) {
    const label = getStatusText(status);

    const tone = (() => {
        switch (status) {
            case NotificationStatus.DELIVERED:
                return {
                    bg: 'bg-emerald-50',
                    text: 'text-emerald-700',
                    dot: 'bg-emerald-500',
                };
            case NotificationStatus.SENT:
                return {
                    bg: 'bg-sky-50',
                    text: 'text-sky-700',
                    dot: 'bg-sky-500',
                };
            case NotificationStatus.PENDING:
                return {
                    bg: 'bg-amber-50',
                    text: 'text-amber-700',
                    dot: 'bg-amber-400',
                };
            case NotificationStatus.FAILED:
                return {
                    bg: 'bg-rose-50',
                    text: 'text-rose-700',
                    dot: 'bg-rose-500',
                };
            case NotificationStatus.CANCELED:
            default:
                return {
                    bg: 'bg-slate-50',
                    text: 'text-slate-600',
                    dot: 'bg-slate-400',
                };
        }
    })();

    return (
        <span
            className={`inline-flex items-center justify-end gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.bg} ${tone.text}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {label}
        </span>
    );
}

function getStatusText(status: NotificationStatus) {
    switch (status) {
        case NotificationStatus.PENDING:
            return 'در انتظار';
        case NotificationStatus.SENT:
            return 'ارسال شده';
        case NotificationStatus.DELIVERED:
            return 'دریافت شده';
        case NotificationStatus.FAILED:
            return 'ناموفق';
        case NotificationStatus.CANCELED:
            return 'لغو شده';
        default:
            return status;
    }
}

