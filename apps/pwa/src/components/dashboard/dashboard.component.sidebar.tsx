"use client";

import React from "react";
import { MenuItems } from "./dashboard.component.menu-items"
import { cn } from "@/libs/style/style.util.helpers";


type SidebarProps = React.HTMLAttributes<HTMLDivElement>

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    return <MenuItems
        className={cn("flex w-72 shrink-0 flex-col gap-4 overflow-hidden rounded-2xl bg-white px-4 py-5", className)}
        itemClassName="text-slate-600 hover:text-slate-800"
    />
}
