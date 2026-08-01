import { Navbar } from "./dashboard.component.navbar";
import { Sidebar } from "./dashboard.component.sidebar";
import { BottomNavBar } from "./dashboard.component.bottom-navbar";

interface RootLayoutProps {
    children: React.ReactNode;
    showSidebar?: boolean;
}

export function DashbaordLayout({ children, showSidebar = true }: RootLayoutProps) {
    return (
        <div className="bg-slate-100 p-4 gap-6 h-screen flex flex-col mx-auto overflow-hidden relative">
            <Navbar />
            <div className="grow gap-6 flex flex-col lg:flex-row overflow-hidden pb-20 lg:pb-0">
                {showSidebar && <Sidebar className="hidden lg:flex col-span-1" />}
                <main className="col-span-4 flex flex-col grow overflow-hidden">
                    {children}
                </main>
            </div>
            <BottomNavBar />
        </div>
    );
}
