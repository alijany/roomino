import { NotificationType } from '../notification.constants';

/**
 * Base interface for notification requests
 */
export interface BaseNotificationRequest {
  message: string;
  userId?: number; // Optional user ID for direct notifications
  metadata?: Record<string, any>;
  link?: string; // Optional link for the notification
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Direct notification request with specific channels
 */
export interface DirectNotificationRequest extends BaseNotificationRequest {
  channels: NotificationChannelRequest[];
}

/**
 * User-targeted notification request
 */
export interface UserNotificationRequest extends BaseNotificationRequest {
  userId: number;
  autoDetectChannels?: boolean;
  preferredChannels?: NotificationType[];
  smsMessage?: string; // Optional shorter message for SMS
  /** SMS for a person without Telegram who has a phone. Off by default: only Telegram and the panel. */
  sms?: boolean;
}

/**
 * Admin notification request
 */
export interface AdminNotificationRequest extends BaseNotificationRequest {
  sendToAdmins: true;
}

/**
 * Log notification request for monitoring and logging systems
 */
export interface LogNotificationRequest extends BaseNotificationRequest {
  logLevel: 'info' | 'warn' | 'error';
}

/**
 * Channel-specific request data
 */
export interface NotificationChannelRequest {
  type: NotificationType;
  recipientPhone?: string;
  recipientChatId?: number;
  message?: string; // Optional override for channel-specific message
}

/**
 * Union type for all notification request types
 */
export type NotificationRequest =
  | DirectNotificationRequest
  | UserNotificationRequest
  | AdminNotificationRequest
  | LogNotificationRequest;
/**
 * Type guards for notification requests
 */
export const isDirectNotificationRequest = (
  req: NotificationRequest,
): req is DirectNotificationRequest => {
  return 'channels' in req && Array.isArray(req.channels);
};

export const isUserNotificationRequest = (
  req: NotificationRequest,
): req is UserNotificationRequest => {
  return 'userId' in req && !('sendToAdmins' in req) && !('template' in req);
};

export const isAdminNotificationRequest = (
  req: NotificationRequest,
): req is AdminNotificationRequest => {
  return 'sendToAdmins' in req && req.sendToAdmins === true;
};

export const isLogNotificationRequest = (
  req: NotificationRequest,
): req is LogNotificationRequest => {
  return 'logLevel' in req && ['info', 'warn', 'error'].includes(req.logLevel);
};
