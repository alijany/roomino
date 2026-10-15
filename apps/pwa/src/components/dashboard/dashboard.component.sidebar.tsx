"use client";

import { brand } from "@/config/brand.config";
import { cn } from "@/libs/style/style.util.helpers";
import Link from "next/link";
import React from "react";
import { MenuItems } from "./dashboard.component.menu-items";

type SidebarProps = React.HTMLAttributes<HTMLDivElement>

/** Desktop navigation: full height, brand on top, the menu below. */
export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    return (
        <aside
            className={cn(
                "w-72 shrink-0 flex-col border-l border-slate-200/70 bg-white",
                className
            )}
        >
            <Link
                href="/dashboard"
                className="flex h-16 shrink-0 items-center gap-2 px-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
            >
                <img src="/images/logo.svg" alt="" className="h-7" />
                <span className="text-base font-bold text-slate-900">{brand.name}</span>
            </Link>
            <MenuItems className="flex min-h-0 grow flex-col gap-4 overflow-hidden px-4 pb-5 pt-1" />
        </aside>
    );
}
