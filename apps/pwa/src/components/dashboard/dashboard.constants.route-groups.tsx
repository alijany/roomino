'use client';

import { IconCalendarEvent, IconDashboard, IconDoor, IconNotification, IconUser, IconUsers } from "@tabler/icons-react";
import { Role } from "../auth/auth.constants.roles";

export interface RouteItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  roles: Role[] | false;
}

export interface RouteGroup {
  label: string;
  routes: RouteItem[];
}

export const RouteItems = {
  reservations: {
    href: "/dashboard/reservations",
    label: "رزرو اتاق",
    roles: false as const,
    icon: <IconCalendarEvent className="size-5" />
  },
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
  }
};

// Define routes with role requirements
export const routeGroups: RouteGroup[] = [
  {
    label: "پیشخوان",
    routes: [
      RouteItems.reservations,
      RouteItems.rooms,
      RouteItems.users,
      RouteItems.profile,
      RouteItems.notifications,
    ]
  }
];
