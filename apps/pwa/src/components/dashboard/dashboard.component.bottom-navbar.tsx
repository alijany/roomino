'use client';

import { cn } from "@/libs/style/style.util.helpers";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Role } from "../auth/auth.constants.roles";
import { useAuth } from "../auth/auth.context.provider";
import { RouteItem, RouteItems, routeGroups } from "./dashboard.constants.route-groups";
import { getActiveRoute } from "./dashboard.util.navigation";

/**
 * One-word labels for the bottom bar — the full names wrap to two lines at
 * phone width. The full label stays as the accessible name.
 */
const SHORT_LABELS: Record<string, string> = {
  [RouteItems.dashboard.href]: "پیشخوان",
  [RouteItems.attendanceHome.href]: "حضور",
  [RouteItems.attendanceMyRequests.href]: "درخواست‌ها",
  [RouteItems.financeApprovals.href]: "تأییدها",
  [RouteItems.financeQueue.href]: "صف پرداخت",
  [RouteItems.management.href]: "مدیریت",
  [RouteItems.profile.href]: "حساب من",
};

/**
 * Mobile Bottom Navigation Bar Component
 * Displays key navigation items at the bottom of the screen on mobile devices
 * Hidden on desktop (lg+ screens)
 */
export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();
  const { hasAnyRole } = useAuth();

  // Approvers and Finance keep a finance slot — approving and paying are
  // designed to happen on a phone. Everyone else gets their leave and
  // attendance requests there instead: filing leave is the phone task people
  // actually have, and payment requests stay a tap away in the menu.
  const requestsSlot: RouteItem = hasAnyRole([Role.APPROVER])
    ? RouteItems.financeApprovals
    : hasAnyRole([Role.FINANCE])
      ? RouteItems.financeQueue
      : RouteItems.attendanceMyRequests;

  // Checking in happens on a phone, so attendance gets a slot; notifications
  // give theirs up because the header's bell already reaches them.
  const bottomNavItems: RouteItem[] = [
    RouteItems.dashboard,
    RouteItems.attendanceHome,
    requestsSlot,
    RouteItems.management,
    RouteItems.profile,
  ];

  // Filtered against every role the user holds, matching the sidebar and the
  // route guards. Filtering by the selected role hid work people were
  // responsible for.
  const visibleItems = bottomNavItems.filter(
    item => !item.roles || hasAnyRole(item.roles)
  );
  const accessibleGroups = routeGroups.map(group => ({
    ...group,
    routes: group.routes.filter(route => !route.roles || hasAnyRole(route.roles)),
  }));
  const activeRoute = getActiveRoute(pathname, [
    ...visibleItems,
    ...accessibleGroups.flatMap(group => group.routes),
  ]);
  const isManagementPage = activeRoute?.href === RouteItems.management.href ||
    accessibleGroups.some(group => group.workspace === "management" &&
      group.routes.some(route => route.href === activeRoute?.href));
  const activeBottomRoute = getActiveRoute(pathname, visibleItems);

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 pb-safe shadow-pop backdrop-blur-md supports-[backdrop-filter]:bg-white/75 lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-1 pt-1.5">
        {visibleItems.map((item) => {
          const isActive = isManagementPage
            ? item.href === RouteItems.management.href
            : item.href === activeBottomRoute?.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className="group flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors motion-reduce:transition-none",
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-500 group-active:bg-slate-100"
                )}
              >
                {item.icon}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "max-w-full truncate text-[11px] leading-4",
                  isActive ? "font-semibold text-brand-700" : "font-medium text-slate-500"
                )}
              >
                {SHORT_LABELS[item.href] ?? item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
