'use client';

import {
  IconAdjustmentsHorizontal,
  IconBuildingBank,
  IconBuildingStore,
  IconCashBanknote,
  IconChartPie,
  IconCalendarStats,
  IconChecklist,
  IconClipboardList,
  IconDashboard,
  IconDoor,
  IconFingerprint,
  IconId,
  IconLayoutDashboard,
  IconMailbox,
  IconNotification,
  IconReceipt,
  IconReportAnalytics,
  IconReportMoney,
  IconReportSearch,
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
  // --- Attendance & leave ------------------------------------------------------
  attendanceHome: {
    href: "/dashboard/attendance",
    label: "ورود و خروج",
    roles: false as const,
    icon: <IconFingerprint className="size-5" />
  },
  attendanceMyReport: {
    href: "/dashboard/attendance/my-report",
    label: "کارکرد من",
    roles: false as const,
    icon: <IconCalendarStats className="size-5" />
  },
  attendanceMyRequests: {
    href: "/dashboard/attendance/my-requests",
    label: "درخواست‌های مرخصی و تردد",
    roles: false as const,
    icon: <IconMailbox className="size-5" />
  },
  // "My team" is not listed: it belongs to job-group approvers, which is an
  // assignment rather than a role — the attendance home links to it instead.
  attendanceTeam: {
    href: "/dashboard/attendance/team",
    label: "تیم من",
    roles: false as const,
  },
  attendanceBoard: {
    href: "/dashboard/attendance/board",
    label: "وضعیت امروز پرسنل",
    roles: [Role.ADMIN, Role.HR],
    icon: <IconLayoutDashboard className="size-5" />
  },
  attendanceRequests: {
    href: "/dashboard/attendance/requests",
    label: "بررسی درخواست‌ها",
    roles: [Role.ADMIN, Role.HR],
    icon: <IconClipboardList className="size-5" />
  },
  attendancePerformance: {
    href: "/dashboard/attendance/performance",
    label: "گزارش کارکرد پرسنل",
    roles: [Role.ADMIN, Role.HR],
    icon: <IconReportSearch className="size-5" />
  },
  attendanceEmployees: {
    href: "/dashboard/attendance/employees",
    label: "پرسنل",
    roles: [Role.ADMIN, Role.HR],
    icon: <IconId className="size-5" />
  },
  attendanceSettings: {
    href: "/dashboard/attendance/settings",
    label: "تنظیمات حضور و غیاب",
    roles: [Role.ADMIN, Role.HR],
    icon: <IconAdjustmentsHorizontal className="size-5" />
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
    label: "حضور و غیاب",
    routes: [
      RouteItems.attendanceHome,
      RouteItems.attendanceMyReport,
      RouteItems.attendanceMyRequests,
      RouteItems.attendanceBoard,
      RouteItems.attendanceRequests,
      RouteItems.attendancePerformance,
      RouteItems.attendanceEmployees,
      RouteItems.attendanceSettings,
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
