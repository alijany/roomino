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
 * Mobile Bottom Navigation Bar Component
 * Displays key navigation items at the bottom of the screen on mobile devices
 * Hidden on desktop (lg+ screens)
 */
export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();
  const { hasAnyRole } = useAuth();

  // One finance slot, filled with whichever finance surface this person acts
  // on. Approving is designed to happen on a phone, so an approver who could
  // only reach their inbox through the hamburger menu was a real gap; Finance
  // gets the payment queue for the same reason.
  const financeSlot: RouteItem | null = hasAnyRole([Role.APPROVER])
    ? RouteItems.financeApprovals
    : hasAnyRole([Role.FINANCE])
      ? RouteItems.financeQueue
      : RouteItems.financeMyRequests;

  // Checking in happens on a phone, so attendance gets a slot; notifications
  // give theirs up because the header's bell already reaches them.
  const bottomNavItems: RouteItem[] = [
    RouteItems.dashboard,
    RouteItems.attendanceHome,
    financeSlot,
    RouteItems.management,
    RouteItems.profile,
  ].filter(Boolean) as RouteItem[];

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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
      <div className="mx-auto px-2 py-2">
        <div className="flex justify-around items-center">
          {visibleItems.map((item) => {
            const isActive = isManagementPage
              ? item.href === RouteItems.management.href
              : item.href === activeBottomRoute?.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[4rem]",
                  isActive
                    ? "bg-orange-50 text-orange-500"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "transition-transform",
                  isActive && "scale-110"
                )}>
                  {item.icon}
                </div>
                <span className={cn(
                  "text-xs font-medium",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
