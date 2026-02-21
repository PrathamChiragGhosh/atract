"use client";

import './EmployerSideBar.css'
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PiSignOutBold } from "react-icons/pi";
import Cookies from 'js-cookie';
import CircularProgress from '@mui/material/CircularProgress';
import { HiHome, HiOutlineHome } from "react-icons/hi2";
import { HiBriefcase, HiOutlineBriefcase } from "react-icons/hi2";
import { HiPlusCircle, HiOutlinePlusCircle } from "react-icons/hi2";
import { HiUser, HiOutlineUser } from "react-icons/hi2";
import { HiDocumentText, HiOutlineDocumentText } from "react-icons/hi2";
import { HiUsers, HiOutlineUsers } from "react-icons/hi2";
import { HiCog6Tooth, HiOutlineCog6Tooth } from "react-icons/hi2";
import { HiSparkles, HiOutlineSparkles } from "react-icons/hi2";
import { HiPhone, HiOutlinePhone } from "react-icons/hi2";
import { HiBolt, HiOutlineBolt } from "react-icons/hi2";
import { HiDocumentDuplicate, HiOutlineDocumentDuplicate } from "react-icons/hi2";
import { HiChartBar, HiOutlineChartBar } from "react-icons/hi2";
import { useQueryClient } from "@tanstack/react-query";
import { employerApplicationsKeys } from "@/hooks/useEmployerApplications";
import { employerJobsKeys } from "@/hooks/useEmployerJobs";
import { employerProfileKeys, useEmployerProfile } from "@/hooks/useEmployerProfile";



const EmployerSideBar = () => {

    const router = useRouter();
    const queryClient = useQueryClient();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selectedRoute, setSelectedRoute] = useState(pathname || "");
    const [signingOut, setSigningOut] = useState(false)
    const [navigating, setNavigating] = useState(false)
    const [navigatingTo, setNavigatingTo] = useState(null)
    
    const isAiPostActive = pathname === "/employer/smart-post";
    
    // Get employer profile to check email access
    const { data: employerProfile } = useEmployerProfile();
    const employerEmail = employerProfile?.email?.toLowerCase();
    
    // Check if employer has blog publisher access
    // This will be checked against allowed emails from API response
    const [hasBlogAccess, setHasBlogAccess] = useState(false);
    const [hasReferralStatsAccess, setHasReferralStatsAccess] = useState(false);
    
    useEffect(() => {
        // Check access by trying to fetch blog publisher settings
        // If allowed, the API will return data; if not, it will return 403
        const checkBlogAccess = async () => {
            const token = Cookies.get('emp_token');
            if (!token || !employerEmail) {
                setHasBlogAccess(false);
                return;
            }
            
            try {
                const baseUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL?.includes('/employer') 
                    ? process.env.NEXT_PUBLIC_EMPLOYER_URL.replace('/employer', '') 
                    : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
                const response = await fetch(`${baseUrl}/api/blog-publisher/settings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                setHasBlogAccess(response.ok);
            } catch (error) {
                setHasBlogAccess(false);
            }
        };
        
        // Check referral stats access
        const checkReferralStatsAccess = async () => {
            const token = Cookies.get('emp_token');
            if (!token || !employerEmail) {
                setHasReferralStatsAccess(false);
                return;
            }
            
            try {
                const baseUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL?.includes('/employer') 
                    ? process.env.NEXT_PUBLIC_EMPLOYER_URL.replace('/employer', '') 
                    : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
                const response = await fetch(`${baseUrl}/api/referral-stats/access`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                setHasReferralStatsAccess(response.ok);
            } catch (error) {
                setHasReferralStatsAccess(false);
            }
        };
        
        if (employerEmail) {
            checkBlogAccess();
            checkReferralStatsAccess();
        }
    }, [employerEmail]);

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

        // 1. Clear all React Query caches for employer
        try {
            console.log("Clearing employer caches from sidebar...");
            
            // Invalidate and remove specific employer caches
            queryClient.invalidateQueries({ queryKey: employerApplicationsKeys.all });
            queryClient.invalidateQueries({ queryKey: employerJobsKeys.all });
            queryClient.invalidateQueries({ queryKey: employerProfileKeys.all });
            
            queryClient.removeQueries({ queryKey: employerApplicationsKeys.all });
            queryClient.removeQueries({ queryKey: employerJobsKeys.all });
            queryClient.removeQueries({ queryKey: employerProfileKeys.all });
            
            // Also reset queries to ensure they're fully cleared
            queryClient.resetQueries({ queryKey: employerApplicationsKeys.all });
            queryClient.resetQueries({ queryKey: employerJobsKeys.all });
            queryClient.resetQueries({ queryKey: employerProfileKeys.all });
            
            // Clear all queries as fallback
            queryClient.clear();
            
            console.log("Cache cleared successfully");
        } catch (error) {
            console.error("Error clearing cache:", error);
            // Still proceed with logout even if cache clearing fails
            queryClient.clear();
        }

        // 2. Remove token
        Cookies.remove("emp_token");

        window.dispatchEvent(new Event("auth-updated"));

        // 3. Navigate to home
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
        <div className="emp-sidebar">
            <div className="emp-sidebar-nav">

                <div
                    className={`emp-nav-item ${selectedRoute === "/employer/home" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/home")}
                >
                    <div className="emp-nav-icon">
                        {selectedRoute === "/employer/home" ? <HiHome /> : <HiOutlineHome />}
                    </div>
                    <span>Home</span>

                    {navigating && navigatingTo === "/employer/home" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div>

                <div
                    className={`emp-nav-item ${selectedRoute === "/employer/post-job" && !isAiPostActive ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/post-job")}
                >
                    <div className="emp-nav-icon">
                        {selectedRoute === "/employer/post-job" && !isAiPostActive ? <HiPlusCircle /> : <HiOutlinePlusCircle />}
                    </div>
                    <span>Post Job</span>

                    {navigating && navigatingTo === "/employer/post-job" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div>

                <div
                    className={`emp-nav-item ${isAiPostActive ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/smart-post")}
                >
                    <div className="emp-nav-icon">
                        {isAiPostActive ? <HiBolt /> : <HiOutlineBolt />}
                    </div>
                    <span>Smart Post</span>

                    {navigating && navigatingTo === "/employer/smart-post" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div>

                <div
                    className={`emp-nav-item ${selectedRoute === "/employer/jobs" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/jobs")}
                >
                    <div className="emp-nav-icon">
                        {selectedRoute === "/employer/jobs" ? <HiBriefcase /> : <HiOutlineBriefcase />}
                    </div>
                    <span>My Jobs</span>

                    {navigating && navigatingTo === "/employer/jobs" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div>

                <div
                    className={`emp-nav-item ${selectedRoute === "/employer/applications" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/applications")}
                >
                    <div className="emp-nav-icon">
                        {selectedRoute === "/employer/applications" ? <HiDocumentText /> : <HiOutlineDocumentText />}
                    </div>
                    <span>Applications</span>

                    {navigating && navigatingTo === "/employer/applications" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div>

                <div
                    className={`emp-nav-item ${selectedRoute === "/employer/smart-select" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/smart-select")}
                >
                    <div className="emp-nav-icon">
                        {selectedRoute === "/employer/smart-select" ? <HiSparkles /> : <HiOutlineSparkles />}
                    </div>
                    <span>Smart Select</span>

                    {navigating && navigatingTo === "/employer/smart-select" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div>

                <div
                    className={`emp-nav-item ${selectedRoute === "/employer/voice-agent" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/voice-agent")}
                >
                    <div className="emp-nav-icon">
                        {selectedRoute === "/employer/voice-agent" ? <HiPhone /> : <HiOutlinePhone />}
                    </div>
                    <span>Voice Agent</span>

                    {navigating && navigatingTo === "/employer/voice-agent" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div>

                {hasBlogAccess && (
                    <div
                        className={`emp-nav-item ${selectedRoute === "/employer/blog-agent" ? "active" : ""}`}
                        onClick={() => handleScreeNav("/employer/blog-agent")}
                    >
                        <div className="emp-nav-icon">
                            {selectedRoute === "/employer/blog-agent" ? <HiDocumentDuplicate /> : <HiOutlineDocumentDuplicate />}
                        </div>
                        <span>Blog Agent</span>

                        {navigating && navigatingTo === "/employer/blog-agent" && (
                            <CircularProgress size={16} thickness={4} className="emp-loader" />
                        )}
                    </div>
                )}

                {hasReferralStatsAccess && (
                    <div
                        className={`emp-nav-item ${selectedRoute === "/employer/referral-stats" ? "active" : ""}`}
                        onClick={() => handleScreeNav("/employer/referral-stats")}
                    >
                        <div className="emp-nav-icon">
                            {selectedRoute === "/employer/referral-stats" ? <HiChartBar /> : <HiOutlineChartBar />}
                        </div>
                        <span>Referral Stats</span>

                        {navigating && navigatingTo === "/employer/referral-stats" && (
                            <CircularProgress size={16} thickness={4} className="emp-loader" />
                        )}
                    </div>
                )}

                {/* <div
                    className={`emp-nav-item ${selectedRoute === "/employer/candidates" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/candidates")}
                >
                    <div className="emp-nav-icon">
                        {selectedRoute === "/employer/candidates" ? <HiUsers /> : <HiOutlineUsers />}
                    </div>
                    <span>Candidates</span>

                    {navigating && selectedRoute === "/employer/candidates" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div> */}

                <div
                    className={`emp-nav-item ${selectedRoute === "/employer/settings" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/settings")}
                >
                    <div className="emp-nav-icon">
                        {selectedRoute === "/employer/settings" ? <HiCog6Tooth /> : <HiOutlineCog6Tooth />}
                    </div>
                    <span>Settings</span>

                    {navigating && navigatingTo === "/employer/settings" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div>

                <div
                    className={`emp-nav-item ${selectedRoute === "/employer/profile" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/employer/profile")}
                >
                    <div className="emp-nav-icon">
                        {selectedRoute === "/employer/profile" ? <HiUser /> : <HiOutlineUser />}
                    </div>
                    <span>Profile</span>

                    {navigating && navigatingTo === "/employer/profile" && (
                        <CircularProgress size={16} thickness={4} className="emp-loader" />
                    )}
                </div>

            </div>

            <div className="emp-sidebar-footer">
                <div
                    className="emp-logout-btn"
                    onClick={() => !signingOut && handleSignOutClick()}
                >
                    {signingOut ? (
                        <CircularProgress size={22} thickness={5} sx={{ color: "white" }} />
                    ) : (
                        <>
                            <PiSignOutBold className="emp-logout-icon" />
                            <span>Logout</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
};

export default EmployerSideBar;

