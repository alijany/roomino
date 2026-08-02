'use client';

import { Button, Dropdown } from "@/ui/atoms";
import { IconLogout, IconPhone, IconReplace, IconUserFilled } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { getRoleName } from "../auth/auth.constants.roles";
import { useAuth } from "../auth/auth.context.provider";
import { routeGroups } from "./dashboard.constants.route-groups";

interface MenuItemsProps {
  className?: string;
  itemClassName?: string;
  onClose?: () => void;
}

export function MenuItems({ className, itemClassName, onClose }: MenuItemsProps) {
  const pathname = usePathname();
  const { logout, hasAnyRole, user, selectedRole, setSelectedRole } = useAuth();

  // Get user roles for dropdown
  const userRoles = user?.roles?.map(r => ({
    label: getRoleName(r.role),
    value: r
  })) || [];

  if (!selectedRole)
    return null;

  return (
    <nav className={className}>
      <Dropdown
        items={userRoles}
        value={selectedRole}
        getKey={(item, index) => item?.id ?? index}
        onChange={(value) => setSelectedRole(value)}
        renderButton={() => (
          <div className="flex items-center gap-3 cursor-pointer w-full p-3 rounded-2xl border-neutral-100 border">
            <div className="p-2.5 bg-slate-50 rounded-2xl">
              <IconUserFilled className="text-slate-700 size-6" />
            </div>
            <div className="flex flex-col items-start grow">
              <div dir="ltr">{user?.phone}</div>
              <div className="text-xs text-neutral-400 max-w-28 truncate">
                {`${getRoleName(selectedRole.role)}`}
              </div>
            </div>
            <Button variant="white" className="!px-2">
              <IconReplace size={20} />
            </Button>
          </div>
        )}
        placeholder="انتخاب نقش"
        variant="outline"
        className="w-full"
        buttonClassName="text-right"
      />

      <div className="flex flex-col overflow-auto  my-6">
        {routeGroups.map((group, index) => {
          // Filter routes based on user roles and selected role
          const filteredRoutes = group.routes.filter(route =>
            !route.roles ||
            (selectedRole ? route.roles.some(role => role === selectedRole.role) : hasAnyRole(route.roles))
          );

          // Only show group if it has at least one route the user can access
          if (filteredRoutes.length === 0) return null;

          return (
            <React.Fragment key={index}>
              <div className="mb-4">
                {/* <div className="text-gray-500 text-sm font-medium mb-2">{group.label}</div> */}
                {filteredRoutes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={onClose}
                    className={`${itemClassName} flex gap-2 items-center p-2 rounded-lg mb-1 ${pathname === route.href ? "bg-sky-50 text-orange-500 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    {route.icon && route.icon}
                    <div>{route.label}</div>
                  </Link>
                ))}
              </div>
              <div className="border-b border-b-neutral-100 mb-4" />
            </React.Fragment>
          );
        })}

        <button
          onClick={() => {
            logout();
            onClose?.();
          }}
          className={`${itemClassName} flex gap-2 items-center text-red-500 p-2 rounded-lg w-full text-right hover:bg-slate-50`}
        >
          <IconLogout className="size-5" />
          <div>خروج</div>
        </button>
      </div>
    </nav>
  );
}