export enum NotificationType {
  SMS = 'sms',
  EMAIL = 'email',
  APP_PUSH = 'app_push',
  TELEGRAM_BOT = 'telegram_bot',
  SYSTEM = 'system',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum NotificationTemplate {
  LEAD_ASSIGNED = 'lead_assigned',
  AD_ENDED = 'ad_ended',
  PAYMENT_RECEIVED = 'payment_received',
  WELCOME = 'welcome',
  OTP = 'otp',
}

export enum NotificationCategory {
  SYSTEM = 'system',
  GENERAL = 'general',
  /**
   * Finance & external payments. Only *advisory* finance notifications honour
   * a mute here — renewal reminders and the monthly report. Approval requests
   * and payment failures are always delivered.
   */
  FINANCE = 'finance',
}
