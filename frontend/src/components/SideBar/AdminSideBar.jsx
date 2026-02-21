"use client";

import './AdminSideBar.css'
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PiSignOutBold } from "react-icons/pi";
import Cookies from 'js-cookie';
import CircularProgress from '@mui/material/CircularProgress';
import { HiChartBar, HiOutlineChartBar } from "react-icons/hi2";
import { HiAdjustmentsHorizontal, HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";
import { HiUsers, HiOutlineUsers } from "react-icons/hi2";
import { HiBriefcase, HiOutlineBriefcase } from "react-icons/hi2";

const AdminSideBar = () => {

    const router = useRouter();
    const pathname = usePathname();
    const [selectedRoute, setSelectedRoute] = useState(pathname || "");
    const [signingOut, setSigningOut] = useState(false)
    const [navigating, setNavigating] = useState(false)
    const [navigatingTo, setNavigatingTo] = useState(null)

    useEffect(() => {
        setSelectedRoute(pathname);
    }, [pathname])

    const handleScreeNav = (route) => {
        // Only show loading if navigating to a different route
        if (pathname !== route) {
            setNavigating(true);
            setNavigatingTo(route);
        } else {
            setNavigating(false);
            setNavigatingTo(null);
        }
        setSelectedRoute(route);
        router.push(route);
    }

    const handleSignOutClick = () => {
        setSigningOut(true);

        // Remove token
        Cookies.remove("admin_token");

        window.dispatchEvent(new Event("auth-updated"));

        // Navigate to home
        router.push("/");
    };

    useEffect(() => {
        if (!signingOut) return;
        setSigningOut(false);
    }, [pathname]);

    useEffect(() => {
        if (!navigating) return;
        setNavigating(false);
        setNavigatingTo(null);
    }, [pathname]);

    return (
        <div className="admin-sidebar">
            <div className="admin-sidebar-nav">

                <div
                    className={`admin-nav-item ${selectedRoute === "/admin/dashboard" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/admin/dashboard")}
                >
                    <div className="admin-nav-icon">
                        {selectedRoute === "/admin/dashboard" ? <HiChartBar /> : <HiOutlineChartBar />}
                    </div>
                    <span>Dashboard</span>

                    {navigating && navigatingTo === "/admin/dashboard" && (
                        <CircularProgress size={16} thickness={4} className="admin-loader" />
                    )}
                </div>

                <div
                    className={`admin-nav-item ${selectedRoute === "/admin/smart-filter" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/admin/smart-filter")}
                >
                    <div className="admin-nav-icon">
                        {selectedRoute === "/admin/smart-filter" ? <HiAdjustmentsHorizontal /> : <HiOutlineAdjustmentsHorizontal />}
                    </div>
                    <span>Smart Filter</span>

                    {navigating && navigatingTo === "/admin/smart-filter" && (
                        <CircularProgress size={16} thickness={4} className="admin-loader" />
                    )}
                </div>

                <div
                    className={`admin-nav-item ${selectedRoute === "/admin/clients" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/admin/clients")}
                >
                    <div className="admin-nav-icon">
                        {selectedRoute === "/admin/clients" ? <HiUsers /> : <HiOutlineUsers />}
                    </div>
                    <span>Client</span>

                    {navigating && navigatingTo === "/admin/clients" && (
                        <CircularProgress size={16} thickness={4} className="admin-loader" />
                    )}
                </div>

                <div
                    className={`admin-nav-item ${selectedRoute === "/admin/service-jobs" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/admin/service-jobs")}
                >
                    <div className="admin-nav-icon">
                        {selectedRoute === "/admin/service-jobs" ? <HiBriefcase /> : <HiOutlineBriefcase />}
                    </div>
                    <span>Job</span>

                    {navigating && navigatingTo === "/admin/service-jobs" && (
                        <CircularProgress size={16} thickness={4} className="admin-loader" />
                    )}
                </div>

            </div>

            <div className="admin-sidebar-footer">
                <div
                    className="admin-logout-btn"
                    onClick={() => !signingOut && handleSignOutClick()}
                >
                    {signingOut ? (
                        <CircularProgress size={22} thickness={5} sx={{ color: "white" }} />
                    ) : (
                        <>
                            <PiSignOutBold className="admin-logout-icon" />
                            <span>Logout</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
};

export default AdminSideBar;

