"use client";

import './JobSeekerSideBar.css'
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PiSignOutBold } from "react-icons/pi";
import Cookies from 'js-cookie';
import CircularProgress from '@mui/material/CircularProgress';
import { HiHome, HiOutlineHome } from "react-icons/hi2";
import { HiBriefcase, HiOutlineBriefcase } from "react-icons/hi2";
import { HiBookmark, HiOutlineBookmark } from "react-icons/hi2";
import { HiUser, HiOutlineUser } from "react-icons/hi2";
import { HiCog6Tooth, HiOutlineCog6Tooth } from "react-icons/hi2";
import { HiDocumentDuplicate, HiOutlineDocumentDuplicate } from "react-icons/hi2";
import { useQueryClient } from "@tanstack/react-query";
import { savedJobsKeys } from "@/hooks/useSavedJobs";
import { jobApplicationsKeys } from "@/hooks/useJobApplications";
import { jobSeekerProfileKeys } from "@/hooks/useJobSeekerProfile";



const JobSeekerSideBar = () => {

    const router = useRouter();
    const queryClient = useQueryClient();
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

        // 1. Clear all React Query caches for job seeker
        try {
            // Remove specific job seeker caches
            queryClient.removeQueries({ queryKey: savedJobsKeys.all });
            queryClient.removeQueries({ queryKey: jobApplicationsKeys.all });
            queryClient.removeQueries({ queryKey: jobSeekerProfileKeys.all });
            
            // Also reset queries to ensure they're fully cleared
            queryClient.resetQueries({ queryKey: savedJobsKeys.all });
            queryClient.resetQueries({ queryKey: jobApplicationsKeys.all });
            queryClient.resetQueries({ queryKey: jobSeekerProfileKeys.all });
            
            // Clear all queries as fallback
            queryClient.clear();
        } catch (error) {
            console.error("Error clearing cache:", error);
            // Still proceed with logout even if cache clearing fails
            queryClient.clear();
        }

        // 2. Remove token
        Cookies.remove("js_token");

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

    // console.log(selectedRoute)

    return (
        <div className="js-sidebar">
            <div className="js-sidebar-nav">

                <div
                    className={`js-nav-item ${selectedRoute === "/jobseeker/home" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/jobseeker/home")}
                >
                    <div className="js-nav-icon">
                        {selectedRoute === "/jobseeker/home" ? <HiHome /> : <HiOutlineHome />}
                    </div>
                    <span>Home</span>

                    {navigating && navigatingTo === "/jobseeker/home" && (
                        <CircularProgress size={16} thickness={4} className="js-loader" />
                    )}
                </div>

                <div
                    className={`js-nav-item ${selectedRoute === "/jobseeker/my-applications" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/jobseeker/my-applications")}
                >
                    <div className="js-nav-icon">
                        {selectedRoute === "/jobseeker/my-applications" ? <HiBriefcase /> : <HiOutlineBriefcase />}
                    </div>
                    <span>My Applications</span>

                    {navigating && navigatingTo === "/jobseeker/my-applications" && (
                        <CircularProgress size={16} thickness={4} className="js-loader" />
                    )}
                </div>

                <div
                    className={`js-nav-item ${selectedRoute === "/jobseeker/saved-jobs" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/jobseeker/saved-jobs")}
                >
                    <div className="js-nav-icon">
                        {selectedRoute === "/jobseeker/saved-jobs" ? <HiBookmark /> : <HiOutlineBookmark />}
                    </div>
                    <span>Saved Jobs</span>

                    {navigating && navigatingTo === "/jobseeker/saved-jobs" && (
                        <CircularProgress size={16} thickness={4} className="js-loader" />
                    )}
                </div>

                <div
                    className={`js-nav-item ${selectedRoute === "/jobseeker/resume-builder" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/jobseeker/resume-builder")}
                >
                    <div className="js-nav-icon">
                        {selectedRoute === "/jobseeker/resume-builder" ? <HiDocumentDuplicate /> : <HiOutlineDocumentDuplicate />}
                    </div>
                    <span>Resume Builder</span>

                    {navigating && navigatingTo === "/jobseeker/resume-builder" && (
                        <CircularProgress size={16} thickness={4} className="js-loader" />
                    )}
                </div>

                <div
                    className={`js-nav-item ${selectedRoute === "/jobseeker/settings" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/jobseeker/settings")}
                >
                    <div className="js-nav-icon">
                        {selectedRoute === "/jobseeker/settings" ? <HiCog6Tooth /> : <HiOutlineCog6Tooth />}
                    </div>
                    <span>Settings</span>

                    {navigating && navigatingTo === "/jobseeker/settings" && (
                        <CircularProgress size={16} thickness={4} className="js-loader" />
                    )}
                </div>

                <div
                    className={`js-nav-item ${selectedRoute === "/jobseeker/profile" ? "active" : ""}`}
                    onClick={() => handleScreeNav("/jobseeker/profile")}
                >
                    <div className="js-nav-icon">
                        {selectedRoute === "/jobseeker/profile" ? <HiUser /> : <HiOutlineUser />}
                    </div>
                    <span>Profile</span>

                    {navigating && navigatingTo === "/jobseeker/profile" && (
                        <CircularProgress size={16} thickness={4} className="js-loader" />
                    )}
                </div>

            </div>

            <div className="js-sidebar-footer">
                <div
                    className="js-logout-btn"
                    onClick={() => !signingOut && handleSignOutClick()}
                >
                    {signingOut ? (
                        <CircularProgress size={22} thickness={5} sx={{ color: "white" }} />
                    ) : (
                        <>
                            <PiSignOutBold className="js-logout-icon" />
                            <span>Logout</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
};

export default JobSeekerSideBar;