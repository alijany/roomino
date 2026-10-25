'use client';

import { cn } from "@/libs/style/style.util.helpers";
import { Avatar, Dropdown } from "@/ui/atoms";
import { IconChevronDown, IconLogout, IconReplace, IconUserFilled } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useMyToday } from "@/app/dashboard/attendance/attendance.api";
import { getRoleName } from "../auth/auth.constants.roles";
import { useAuth } from "../auth/auth.context.provider";
import { RouteItems, routeGroups } from "./dashboard.constants.route-groups";
import type { RouteItem } from "./dashboard.constants.route-groups";
import { getActiveRoute } from "./dashboard.util.navigation";

interface MenuItemsProps {
  className?: string;
  itemClassName?: string;
  onClose?: () => void;
}

const accountRoutes = [RouteItems.profile, RouteItems.notifications];

export function MenuItems({ className, itemClassName, onClose }: MenuItemsProps) {
  const pathname = usePathname();
  const { logout, hasAnyRole, user, selectedRole, setSelectedRole } = useAuth();
  const { data: attendance } = useMyToday();
  const [expandedGroup, setExpandedGroup] = React.useState<{
    pathname: string;
    id: string | null;
  } | null>(null);
  const menuId = React.useId();
  const canManage = hasAnyRole(RouteItems.management.roles);
  const primaryRoutes = [RouteItems.dashboard, ...(canManage ? [RouteItems.management] : [])];

  // Check every role the user holds, just like route guards and the API.
  // Switching the displayed role must not hide an approvals inbox or other work.
  const accessibleGroups = routeGroups
    .map(group => ({
      ...group,
      routes: [
        ...group.routes.filter(route => !route.roles || hasAnyRole(route.roles)),
        // "My team" is an approver assignment, not a role — the server knows.
        ...(group.id === "attendance" && attendance?.isApprover ? [RouteItems.attendanceTeam] : []),
      ],
    }))
    .filter(group => group.routes.length > 0);
  const activeRoute = getActiveRoute(pathname, [
    ...primaryRoutes,
    ...accountRoutes,
    ...accessibleGroups.flatMap(group => group.routes),
  ]);
  const activeGroup = accessibleGroups.find(group =>
    group.routes.some(route => route.href === activeRoute?.href)
  );
  const workspace = activeGroup?.workspace ??
    (activeRoute?.href === RouteItems.management.href ? "management" : "personal");
  // Open the current section after navigation; allow it to be closed manually.
  const expandedGroupId = expandedGroup?.pathname === pathname
    ? expandedGroup.id
    : activeGroup?.id ?? null;
  const visiblePrimaryRoutes = primaryRoutes.filter(route =>
    route.href === (workspace === "management" ? RouteItems.management.href : RouteItems.dashboard.href)
  );
  const visibleGroups = accessibleGroups.filter(group => group.workspace === workspace);

  const userRoles = user?.roles?.map(r => ({
    label: getRoleName(r.role),
    value: r,
  })) || [];

  if (!selectedRole) return null;

  const renderRoute = (route: RouteItem) => {
    const isActive = activeRoute?.href === route.href;
    return (
      <Link
        key={route.href}
        href={route.href}
        onClick={onClose}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          itemClassName,
          "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
          isActive
            ? "bg-brand-50 text-brand-700 font-semibold"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <span className="shrink-0" aria-hidden="true">{route.icon}</span>
        <span className="min-w-0">{route.label}</span>
      </Link>
    );
  };

  return (
    <nav className={cn("min-h-0", className)} aria-label="منوی پیشخوان">
      <div className="shrink-0">
        <Dropdown
          items={userRoles}
          value={selectedRole}
          getKey={(item, index) => item?.id ?? index}
          onChange={(value) => setSelectedRole(value)}
          renderButton={() => (
            <button
              type="button"
              aria-label={`انتخاب نقش، ${getRoleName(selectedRole.role)}`}
              className="flex w-full items-center gap-3 rounded-2xl border border-neutral-100 p-3 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Avatar src={user?.profilePicture} name={user?.name} className="size-10 rounded-xl" />
              <span className="flex min-w-0 grow flex-col items-start gap-1">
                {user?.name?.trim() ? (
                  <span className="max-w-full truncate text-sm text-slate-700">{user.name}</span>
                ) : (
                  <span dir="ltr" className="text-sm text-slate-700">{user?.phone}</span>
                )}
                <span className="max-w-full truncate text-xs text-slate-500">
                  {getRoleName(selectedRole.role)}
                </span>
              </span>
              <IconReplace size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
            </button>
          )}
          placeholder="انتخاب نقش"
          variant="outline"
          className="w-full"
          buttonClassName="text-right"
        />
      </div>

      {canManage && (
        <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="انتخاب فضای کاری">
          {[
            { id: "personal", label: "کارهای من", route: RouteItems.dashboard },
            { id: "management", label: "مدیریت", route: RouteItems.management },
          ].map(item => (
            <Link
              key={item.id}
              href={item.route.href}
              onClick={onClose}
              aria-current={workspace === item.id ? "true" : undefined}
              className={cn(
                "flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                workspace === item.id ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <span aria-hidden="true">{item.id === "personal" ? <IconUserFilled className="size-4" /> : item.route.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-1">
          {visiblePrimaryRoutes.map(renderRoute)}
          {visibleGroups.map(group => {
            const isExpanded = expandedGroupId === group.id;
            const isActiveGroup = activeGroup?.id === group.id;
            const panelId = `${menuId}-${group.id}`;
            const headingId = `${panelId}-heading`;

            return (
              <div key={group.id}>
                <button
                  id={headingId}
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => setExpandedGroup({
                    pathname,
                    id: isExpanded ? null : group.id,
                  })}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    isActiveGroup ? "text-brand-700 bg-brand-50/60" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="shrink-0" aria-hidden="true">{group.icon}</span>
                  <span className="grow">{group.label}</span>
                  <IconChevronDown
                    className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", isExpanded && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
                <div id={panelId} aria-labelledby={headingId} hidden={!isExpanded} className="mr-5 my-1 space-y-1 border-r border-slate-100 pr-2">
                  {group.routes.map(renderRoute)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 space-y-1 border-t border-neutral-100 pt-3">
        {accountRoutes.map(renderRoute)}
        <button
          type="button"
          onClick={() => {
            logout();
            onClose?.();
          }}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-right text-sm text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <IconLogout className="size-5 shrink-0" aria-hidden="true" />
          <span>خروج</span>
        </button>
      </div>
    </nav>
  );
}
