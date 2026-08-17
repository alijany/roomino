'use client';

import {
  IconBuildingBank,
  IconBuildingStore,
  IconCashBanknote,
  IconChartPie,
  IconChecklist,
  IconDashboard,
  IconDoor,
  IconNotification,
  IconReceipt,
  IconReportAnalytics,
  IconReportMoney,
  IconRepeat,
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
    roles: [Role.ADMIN, Role.HR],
    icon: <IconDoor className="size-5" />
  },
  users: {
    href: "/dashboard/users",
    label: "کاربران",
    roles: [Role.ADMIN, Role.HR],
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
  financeDashboard: {
    href: "/dashboard/finance",
    label: "پیشخوان مالی",
    roles: [Role.FINANCE, Role.ADMIN],
    icon: <IconChartPie className="size-5" />
  },
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
  financeVendors: {
    href: "/dashboard/finance/vendors",
    label: "طرف‌حساب‌ها",
    roles: [Role.FINANCE, Role.ADMIN],
    icon: <IconBuildingStore className="size-5" />
  },
  financeRecurring: {
    href: "/dashboard/finance/recurring",
    label: "هزینه‌های دوره‌ای",
    roles: [Role.FINANCE, Role.ADMIN],
    icon: <IconRepeat className="size-5" />
  },
  financeReports: {
    href: "/dashboard/finance/reports",
    label: "گزارش‌های مالی",
    roles: [Role.FINANCE, Role.ADMIN],
    icon: <IconReportMoney className="size-5" />
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
      RouteItems.financeDashboard,
      RouteItems.financeMyRequests,
      RouteItems.financeApprovals,
      RouteItems.financeQueue,
      RouteItems.financeVendors,
      RouteItems.financeRecurring,
      RouteItems.financeReports,
      RouteItems.financeSources,
      RouteItems.financeSettings,
    ]
  }
];
