'use client';

import { cn } from "@/libs/style/style.util.helpers";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useAuth } from "../auth/auth.context.provider";
import { RouteItem, RouteItems } from "./dashboard.constants.route-groups";

/**
 * Mobile Bottom Navigation Bar Component
 * Displays key navigation items at the bottom of the screen on mobile devices
 * Hidden on desktop (lg+ screens)
 */
export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();
  const { hasAnyRole, selectedRole } = useAuth();

  // Priority navigation items for mobile - based on UX analysis
  // Build bottom nav items with a conditional replacement: if the user is the
  // organization owner, show the `organization` route instead of `profile`.
  const bottomNavItems: RouteItem[] = [
    RouteItems.dashboard,
    RouteItems.users,
    RouteItems.profile,
    RouteItems.notifications,
  ];

  // Filter items based on user roles
  const visibleItems = bottomNavItems.filter(item => {
    // If roles not defined or explicitly false, item is visible to everyone
    if (!item.roles) return true;

    // If a specific role is selected, check if the item includes that role
    if (selectedRole) return item.roles.some(role => role === selectedRole.role);

    // Otherwise, check whether the user has any of the allowed roles
    return hasAnyRole(item.roles);
  });

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
      <div className="mx-auto px-2 py-2">
        <div className="flex justify-around items-center">
          {visibleItems.map((item) => {
            // Match exact path or check if current path is a sub-path (except for dashboard root)
            const isActive = pathname === item.href ||
              (item.href !== RouteItems.dashboard.href && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
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
