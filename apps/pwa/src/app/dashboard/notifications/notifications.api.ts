import { fetcher } from "@/libs/api/api.util.fetcher";
import { useSwrHelper } from "@/libs/api/api.hook.use-swr-helper";
import useSWR from "swr";
import {
  GetNotificationsResponse,
  NotificationsFilters,
} from "./notifications.types";

function buildNotificationsQueryString(filters: NotificationsFilters): string {
    const params = new URLSearchParams(
        Object.entries(filters).reduce((acc, [key, value]) => ({
            ...acc,
            [key]: value?.toString() || ''
        }), {})
    );
    return params.toString();
}

export function useNotifications(filters: NotificationsFilters) {
    const query = buildNotificationsQueryString(filters);
    const swr = useSWR<GetNotificationsResponse>(`/notifications?${query}`, fetcher);
    return useSwrHelper(swr);
}

export function useUnreadCount() {
    const swr = useSWR<{ count: number }>('/notifications/unread-count', fetcher);
    return useSwrHelper(swr);
}

export async function markAsRead(notificationId: number) {
    return fetcher(`/notifications/${notificationId}/read`, {
        method: 'PATCH',
    });
}

export async function markAsUnread(notificationId: number) {
    return fetcher(`/notifications/${notificationId}/unread`, {
        method: 'PATCH',
    });
}

export async function markAllAsRead() {
    return fetcher('/notifications/mark-all-read', {
        method: 'POST',
    });
}

// Helper to build notification cache key for SWR mutations
export function getNotificationsCacheKey(filters: NotificationsFilters): string {
    return `/notifications?${buildNotificationsQueryString(filters)}`;
}

