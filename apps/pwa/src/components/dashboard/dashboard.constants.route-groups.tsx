'use client';

import {
  IconBuildingBank,
  IconCashBanknote,
  IconChecklist,
  IconDashboard,
  IconDoor,
  IconNotification,
  IconReceipt,
  IconReportAnalytics,
  IconSettings,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { Role } from "../auth/auth.constants.roles";

export interface RouteItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  /** `false` means every authenticated user; an array restricts to those roles. */
  roles: Role[] | false;
}

export interface RouteGroup {
  label: string;
  routes: RouteItem[];
}

export const RouteItems = {
  rooms: {
    href: "/dashboard/rooms",
    label: "مدیریت اتاق‌ها",
    roles: [Role.ADMIN],
    icon: <IconDoor className="size-5" />
  },
  users: {
    href: "/dashboard/users",
    label: "کاربران",
    roles: [Role.ADMIN],
    icon: <IconUsers className="size-5" />
  },
  reports: {
    href: "/dashboard/reports",
    label: "گزارش‌ها",
    roles: [Role.ADMIN],
    icon: <IconReportAnalytics className="size-5" />
  },
  notifications: {
    href: "/dashboard/notifications",
    label: "اعلان ها",
    roles: false as const,
    icon: <IconNotification className="size-5" />
  },
  profile: {
    href: "/dashboard/profile",
    label: "حساب کاربری",
    roles: false as const,
    icon: <IconUser className="size-5" />
  },
  dashboard: {
    href: "/dashboard",
    label: "پیشخوان",
    roles: false as const,
    icon: <IconDashboard className="size-5" />
  },

  // --- Finance & External Payments -----------------------------------------
  financeMyRequests: {
    href: "/dashboard/finance/my-requests",
    label: "درخواست‌های پرداخت من",
    roles: false as const,
    icon: <IconReceipt className="size-5" />
  },
  financeApprovals: {
    href: "/dashboard/finance/approvals",
    label: "در انتظار تأیید من",
    roles: [Role.APPROVER, Role.ADMIN],
    icon: <IconChecklist className="size-5" />
  },
  financeQueue: {
    href: "/dashboard/finance/queue",
    label: "صف پرداخت",
    roles: [Role.FINANCE, Role.ADMIN],
    icon: <IconCashBanknote className="size-5" />
  },
  financeSources: {
    href: "/dashboard/finance/sources",
    // Holds the company's own banking details — Finance only, enforced server-side too.
    label: "منابع پرداخت",
    roles: [Role.FINANCE],
    icon: <IconBuildingBank className="size-5" />
  },
  financeSettings: {
    href: "/dashboard/finance/settings",
    label: "تنظیمات مالی",
    roles: [Role.ADMIN],
    icon: <IconSettings className="size-5" />
  },
};

// Define routes with role requirements
export const routeGroups: RouteGroup[] = [
  {
    label: "پیشخوان",
    routes: [
      RouteItems.dashboard,
      RouteItems.rooms,
      RouteItems.users,
      RouteItems.reports,
      RouteItems.profile,
      RouteItems.notifications,
    ]
  },
  {
    label: "مالی",
    routes: [
      RouteItems.financeMyRequests,
      RouteItems.financeApprovals,
      RouteItems.financeQueue,
      RouteItems.financeSources,
      RouteItems.financeSettings,
    ]
  }
];
