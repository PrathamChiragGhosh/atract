"use client";

import EmployerSideBar from "@/components/SideBar/EmployerSideBar";
import { usePathname } from 'next/navigation';

// Configuration: Routes where employer sidebar should be hidden
const ROUTES_WITH_HIDDEN_EMPLOYER_SIDEBAR = [
    '/employer/smart-select/analyze',
    // Add more routes here in the future as needed
    // Example: '/employer/smart-select/other-route',
];

export default function EmployerMainScreenLayout({ children }) {
    const pathname = usePathname();
    
    // Check if current route should have hidden sidebar
    const shouldHideSidebar = pathname 
        ? ROUTES_WITH_HIDDEN_EMPLOYER_SIDEBAR.some(route => 
            pathname === route || pathname.startsWith(route + '/')
          )
        : false;

    return (
        <div style={{ display: "flex" }}>
            {!shouldHideSidebar && <EmployerSideBar />}
            <main style={{ flex: 1, backgroundColor: "#eeeeee" }}>
                {children}
            </main>
        </div>
    );
}
