export enum NotificationStatus {
    PENDING = 'pending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    CANCELED = 'canceled',
}

export enum NotificationType {
    SMS = 'sms',
    EMAIL = 'email',
    APP_PUSH = 'app_push',
    TELEGRAM_BOT = 'telegram_bot',
    SYSTEM = 'system',
}

export enum NotificationCategory {
    SYSTEM = 'system',
    GENERAL = 'general',
}

export interface NotificationResponse {
    id: number;
    created_at: string;
    updated_at: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    status: NotificationStatus;
    priority: 'low' | 'normal' | 'high';
    metadata: Record<string, unknown>;
    sentAt?: string;
    errorMessage?: string;
    isRead: boolean;
    readAt?: string | null;
    user?: number;
    recipientPhone?: string | null;
    recipientChatId?: string | null;
    link?: string;
}

export interface NotificationsFilters {
    page?: number;
    limit?: number;
    text?: string;
    status?: NotificationStatus;
    type?: NotificationType;
    category?: NotificationCategory;
    isRead?: boolean;
}

export interface GetNotificationsResponse {
    items: NotificationResponse[];
    meta: {
        page: number;
        limit: number;
        total: number;
        pageCount: number;
    };
}
