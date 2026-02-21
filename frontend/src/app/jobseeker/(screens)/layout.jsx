"use client";

import JobSeekerSideBar from "@/components/SideBar/JobSeekerSideBar";
import { usePathname } from "next/navigation";

export default function MainScreenLayout({ children }) {
    const pathname = usePathname();
    const shouldHideSidebar = pathname === "/jobseeker/resume-builder/create/form";

    return (
        <div style={{ display: "flex", overflow: "visible" }}>
            {!shouldHideSidebar && <JobSeekerSideBar />}
            <main style={{ flex: 1, backgroundColor: "#eeeeee", overflow: "visible" }}>
                {children}
            </main>
        </div>
    );
}
