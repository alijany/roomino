"use client";

import React, { useState } from "react";
import { cn } from "@/libs/style/style.util.helpers";

export interface TabItem {
    id: string;
    label: string;
    count?: number;
}

interface TabsProps {
    tabs: TabItem[];
    defaultTab?: string;
    onTabChange?: (tabId: string) => void;
    className?: string;
    variant?: "pills" | "underline";
}

export function Tabs({
    tabs,
    defaultTab,
    onTabChange,
    className,
    variant = "pills",
}: TabsProps) {
    const [activeTab, setActiveTab] = useState<string>(
        defaultTab || (tabs.length > 0 ? tabs[0].id : "")
    );

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        if (onTabChange) {
            onTabChange(tabId);
        }
    };

    return (
        <div className={cn("w-full", className)}>
            <div
                role="tablist"
                className={cn(
                    "no-scrollbar flex items-center overflow-x-auto",
                    variant === "pills"
                        ? "gap-1 rounded-xl bg-slate-100 p-1"
                        : "gap-1 border-b border-slate-200"
                )}
            >
                {tabs.map((tab) => (
                    <TabButton
                        key={tab.id}
                        isActive={activeTab === tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        count={tab.count}
                        variant={variant}
                    >
                        {tab.label}
                    </TabButton>
                ))}
            </div>
        </div>
    );
}

interface TabButtonProps {
    children: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    count?: number;
    variant: "pills" | "underline";
}

function TabButton({
    children,
    isActive,
    onClick,
    count,
    variant,
}: TabButtonProps) {
    if (variant === "pills") {
        return (
            <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={onClick}
                className={cn(
                    "flex min-h-10 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none lg:min-h-9",
                    isActive
                        ? "bg-white text-slate-900 shadow-card"
                        : "text-slate-500 hover:text-slate-800"
                )}
            >
                <span>{children}</span>
                {typeof count !== "undefined" && (
                    <span
                        className={cn(
                            "min-w-5 rounded-full px-1.5 text-center text-xs leading-5 tabular-nums",
                            isActive ? "bg-brand-50 text-brand-700" : "bg-slate-200/70 text-slate-500"
                        )}
                    >
                        {count}
                    </span>
                )}
            </button>
        );
    }

    return (
        <button
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={onClick}
            className={cn(
                "-mb-px flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
                isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
            )}
        >
            <span>{children}</span>
            {typeof count !== "undefined" && (
                <span
                    className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-muted-foreground/10 text-muted-foreground"
                    )}
                >
                    {count}
                </span>
            )}
        </button>
    );
}