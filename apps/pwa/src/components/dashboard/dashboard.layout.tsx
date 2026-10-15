'use client';

import { useAuth } from "@/components/auth/auth.context.provider";
import OnboardingModal from "@/components/auth/auth.component.onboarding-modal";
import { Navbar } from "./dashboard.component.navbar";
import { Sidebar } from "./dashboard.component.sidebar";
import { BottomNavBar } from "./dashboard.component.bottom-navbar";

interface RootLayoutProps {
    children: React.ReactNode;
    showSidebar?: boolean;
}

/**
 * The authenticated shell. Desktop: a full-height sidebar (with the brand)
 * beside a slim top bar and the page. Phone: a sticky top bar, the page, and
 * the bottom navigation — the page area reserves room for it and for the
 * iPhone home indicator.
 *
 * Pages own their scrolling: `main` is a flex column that never scrolls
 * itself, as before.
 */
export function DashbaordLayout({ children, showSidebar = true }: RootLayoutProps) {
    const { needsOnboarding } = useAuth();

    return (
        <div className="relative flex h-dvh overflow-hidden bg-background">
            {showSidebar && <Sidebar className="hidden lg:flex" />}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <Navbar />
                <main className="mx-auto flex min-h-0 w-full max-w-[1400px] grow flex-col overflow-hidden px-3 pt-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-6 lg:pt-1">
                    {children}
                </main>
            </div>
            <BottomNavBar />
            <OnboardingModal isOpen={needsOnboarding} />
        </div>
    );
}
