"use client";

import AdminSideBar from "@/components/SideBar/AdminSideBar";
import { usePathname } from 'next/navigation';

export default function AdminMainScreenLayout({ children }) {
    const pathname = usePathname();

    return (
        <div style={{ display: "flex" }}>
            <AdminSideBar />
            <main style={{ flex: 1, backgroundColor: "#eeeeee" }}>
                {children}
            </main>
        </div>
    );
}

