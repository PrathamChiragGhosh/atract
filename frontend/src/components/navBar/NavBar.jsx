"use client";

import "./NavBar.css";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { HiOutlineMenuAlt3, HiX } from "react-icons/hi";
import { HiHome, HiOutlineHome, HiPlusCircle, HiOutlinePlusCircle, HiBriefcase, HiOutlineBriefcase, HiDocumentText, HiOutlineDocumentText, HiCog6Tooth, HiOutlineCog6Tooth, HiUser, HiOutlineUser, HiBookmark, HiOutlineBookmark, HiMagnifyingGlass, HiOutlineMagnifyingGlass, HiSparkles, HiOutlineSparkles, HiWrenchScrewdriver, HiOutlineWrenchScrewdriver, HiOutlineShoppingBag } from "react-icons/hi2";
import { PiSignOutBold } from "react-icons/pi";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useQueryClient } from "@tanstack/react-query";
import { savedJobsKeys } from "@/hooks/useSavedJobs";
import { jobApplicationsKeys } from "@/hooks/useJobApplications";
import { jobSeekerProfileKeys } from "@/hooks/useJobSeekerProfile";
import { employerApplicationsKeys } from "@/hooks/useEmployerApplications";
import { employerJobsKeys } from "@/hooks/useEmployerJobs";
import { employerProfileKeys } from "@/hooks/useEmployerProfile";
import coreLogo from "@/assets/core-logo.png";
import atractLogo from "@/assets/atract-logo.jpeg";

const NavBar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const [mobileOpen, setMobileOpen] = useState(false);

    const [authUser, setAuthUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // All tokens platform supports
    const TOKEN_KEYS = ["js_token", "emp_token", "admin_token"];

    // ============================
    // ROLE CONFIG (SCALABLE)
    // ============================
    const ROLE_CONFIG = {
        js_token: {
            label: "Job Seeker",
            greeting: "Hi Job Seeker",
            dashboard: "/jobseeker/home",
            desktopLinks: [
                { label: "Explore Jobs", route: "/jobs" },
                { label: "Home", route: "/jobseeker/home" },
                { label: "My Applications", route: "/jobseeker/my-applications" },
                { label: "Free Tools", route: "/free-tools" },
            ],
            mobileLinks: [
                { label: "Explore Jobs", route: "/jobs", icon: "search" },
                { label: "Home", route: "/jobseeker/home", icon: "home" },
                { label: "My Applications", route: "/jobseeker/my-applications", icon: "document" },
                { label: "Free Tools", route: "/free-tools", icon: "tools" },
                { label: "Saved Jobs", route: "/jobseeker/saved-jobs", icon: "bookmark" },
                { label: "Settings", route: "/jobseeker/settings", icon: "settings" },
                { label: "Profile", route: "/jobseeker/profile", icon: "user" },
            ],
        },

        emp_token: {
            label: "Employer",
            greeting: "Hi Employer",
            dashboard: "/employer/home",
            desktopLinks: [
                { label: "Home", route: "/employer/home" },
                { label: "Post Job", route: "/employer/post-job" },
                { label: "Free Tools", route: "/free-tools" },
            ],
            mobileLinks: [
                { label: "Home", route: "/employer/home", icon: "home" },
                { label: "Post Job", route: "/employer/post-job", icon: "plus" },
                { label: "My Jobs", route: "/employer/jobs", icon: "briefcase" },
                { label: "Applications", route: "/employer/applications", icon: "document" },
                { label: "Smart Select", route: "/employer/smart-select", icon: "sparkles" },
                { label: "Free Tools", route: "/free-tools", icon: "tools" },
                { label: "Settings", route: "/employer/settings", icon: "settings" },
                { label: "Profile", route: "/employer/profile", icon: "user" },
            ]
        },

        admin_token: {
            label: "Admin",
            greeting: "Admin Panel",
            dashboard: "/admin",
            desktopLinks: [],
            mobileLinks: [],
        },
    };

    // ============================
    // Load user from any valid token
    // ============================
    useEffect(() => {
        const loadAuthUser = () => {
            let found = null;

            for (const key of TOKEN_KEYS) {
                const token = Cookies.get(key);
                if (token) {
                    try {
                        const decoded = jwtDecode(token);
                        found = { roleKey: key, ...decoded };
                        break;
                    } catch (err) {
                        Cookies.remove(key);
                    }
                }
            }

            setAuthUser(found);
            setAuthLoading(false);
        };

        // Load on first mount
        loadAuthUser();

        // 🔥 Listen for login/logout events
        window.addEventListener("auth-updated", loadAuthUser);

        // 🔥 Listen for route changes
        const interval = setInterval(() => {
            loadAuthUser();
        }, 400); // small interval avoids Next router issue

        return () => {
            window.removeEventListener("auth-updated", loadAuthUser);
            clearInterval(interval);
        };
    }, []);

    // Prevent body scroll when mobile drawer is open
    useEffect(() => {
        if (mobileOpen) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        return () => {
            // Cleanup on unmount
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [mobileOpen]);


    // Logout clears all role tokens and cache
    const handleLogout = () => {
        if (!authUser) return;

        const redirectMap = {
            js_token: "/signin/jobseeker",
            emp_token: "/signin/employer",
            admin_token: "/admin/login",
        };

        // Find redirect URL for the role that was logged in
        const redirectTo = redirectMap[authUser.roleKey] || "/";

        // Clear all React Query cache based on role
        try {
            if (authUser.roleKey === 'js_token') {
                // Clear job seeker caches
                queryClient.invalidateQueries({ queryKey: savedJobsKeys.all });
                queryClient.invalidateQueries({ queryKey: jobApplicationsKeys.all });
                queryClient.invalidateQueries({ queryKey: jobSeekerProfileKeys.all });
                
                queryClient.removeQueries({ queryKey: savedJobsKeys.all });
                queryClient.removeQueries({ queryKey: jobApplicationsKeys.all });
                queryClient.removeQueries({ queryKey: jobSeekerProfileKeys.all });
                
                queryClient.resetQueries({ queryKey: savedJobsKeys.all });
                queryClient.resetQueries({ queryKey: jobApplicationsKeys.all });
                queryClient.resetQueries({ queryKey: jobSeekerProfileKeys.all });
            } else if (authUser.roleKey === 'emp_token') {
                // Clear employer caches
                queryClient.invalidateQueries({ queryKey: employerApplicationsKeys.all });
                queryClient.invalidateQueries({ queryKey: employerJobsKeys.all });
                queryClient.invalidateQueries({ queryKey: employerProfileKeys.all });
                
                queryClient.removeQueries({ queryKey: employerApplicationsKeys.all });
                queryClient.removeQueries({ queryKey: employerJobsKeys.all });
                queryClient.removeQueries({ queryKey: employerProfileKeys.all });
                
                queryClient.resetQueries({ queryKey: employerApplicationsKeys.all });
                queryClient.resetQueries({ queryKey: employerJobsKeys.all });
                queryClient.resetQueries({ queryKey: employerProfileKeys.all });
            }

            // Clear all queries (fallback to ensure everything is cleared)
            queryClient.clear();
        } catch (error) {
            console.error("Error clearing cache:", error);
            // Still proceed with logout even if cache clearing fails
            queryClient.clear();
        }

        // Remove ALL tokens (global logout)
        TOKEN_KEYS.forEach((k) => Cookies.remove(k));

        // Clear state
        setAuthUser(null);
        window.dispatchEvent(new Event("auth-updated"));
        // Redirect to respective login page
        router.push(redirectTo);
        setMobileOpen(false)
    };


    const goToJobSeeker = () => router.push("/signin/jobseeker");
    const goToEmployer = () => router.push("/signin/employer");

    const goToDashboard = () => {
        if (!authUser) return;
        const role = ROLE_CONFIG[authUser.roleKey];
        if (role) router.push(role.dashboard);
    };

    // If logged in, fetch menu for that role
    const activeRole = authUser?.roleKey ? ROLE_CONFIG[authUser.roleKey] : null;

    return (
        <div className="navBar-root">
            <div className="navBar-inner">

                {/* LOGO */}
                <div className="navBar-logo" onClick={() => router.push("/")}>
                    <div className="navBar-logo-text-container">
                        <div className="navBar-brand-name">
                            <Image 
                                src={atractLogo} 
                                alt="Atract Logo" 
                                className="navBar-atract-logo-inline"
                                width={28}
                                height={28}
                                priority
                            />
                            <span className="navBar-logo-text">tract</span>
                        </div>
                        <div className="navBar-logo-subtitle">
                            <Image 
                                src={coreLogo} 
                                alt="Core Company Logo" 
                                className="navBar-core-logo-small"
                                width={24}
                                height={24}
                            />
                            <span className="navBar-logo-subtitle-text">A Core Company</span>
                        </div>
                    </div>
                </div>

                {/* DESKTOP RIGHT SIDE */}
                <div className="navBar-right navBar-desktopOnly">
                    {!authLoading && authUser && (
                        <div className="navBar-roleMenu">
                            {/* CLICKABLE GREETING */}
                            <span
                                className="navBar-username"
                                onClick={goToDashboard}
                                style={{ cursor: "pointer" }}
                            >
                                {authUser?.userName ? `Hi, ${authUser.userName.split(" ")[0]}` : (activeRole?.greeting || "Hi User")}
                            </span>

                            {/* ROLE-BASED LINKS */}
                            <div className="navBar-roleLinks">
                                {activeRole?.desktopLinks?.map((link, i) => (
                                    <span
                                        key={i}
                                        className="navBar-roleItem"
                                        onClick={() => router.push(link.route)}
                                    >
                                        {link.label}
                                    </span>
                                ))}
                                <span
                                    className="navBar-roleItem"
                                    onClick={() => router.push("/store")}
                                >
                                    Store
                                </span>
                                <span
                                    className="navBar-roleItem"
                                    onClick={() => router.push("/blogs")}
                                >
                                    Blogs
                                </span>
                            </div>

                            <button className="navBar-logoutBtn" onClick={handleLogout}>
                                Logout
                            </button>
                        </div>
                    )}

                    {/* NOT LOGGED IN */}
                    {!authLoading && !authUser && (
                        <>
                            <div className="navBar-roleLinks">
                                <span
                                    className="navBar-roleItem"
                                    onClick={() => router.push("/jobs")}
                                >
                                    Explore Jobs
                                </span>
                                <span
                                    className="navBar-roleItem"
                                    onClick={() => router.push("/blogs")}
                                >
                                    Blogs
                                </span>
                                <span
                                    className="navBar-roleItem"
                                    onClick={() => router.push("/free-tools")}
                                >
                                    Free Tools
                                </span>
                                <span
                                    className="navBar-roleItem"
                                    onClick={() => router.push("/store")}
                                >
                                    Store
                                </span>
                            </div>
                            <button className="navBar-btn" onClick={goToJobSeeker}>
                                Job Seeker
                            </button>
                            <button className="navBar-btn" onClick={goToEmployer}>
                                Employer
                            </button>
                        </>
                    )}
                    
                    {/* BETA TAG */}
                    <span className="navBar-beta-tag">Beta</span>
                </div>

                {/* MOBILE MENU ICON */}
                <div className="navBar-mobileOnly navBar-mobileMenuWrapper">
                    <span className="navBar-beta-tag navBar-beta-tag-mobile">Beta</span>
                    <div
                        className="navBar-mobileMenuIcon"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <HiX size={28} /> : <HiOutlineMenuAlt3 size={28} />}
                    </div>
                </div>
            </div>

            {/* MOBILE BACKDROP */}
            {!authLoading && mobileOpen && (
                <div 
                    className="navBar-mobileBackdrop"
                    onClick={() => setMobileOpen(false)}
                ></div>
            )}

            {/* MOBILE DRAWER */}
            {!authLoading && mobileOpen && (
                <div className={`navBar-mobileDrawer ${authUser?.roleKey === 'emp_token' ? 'navBar-mobileDrawer-employer' : authUser?.roleKey === 'js_token' ? 'navBar-mobileDrawer-jobseeker' : 'navBar-mobileDrawer-guest'}`}>
                    {/* Logged-in role */}
                    {authUser ? (
                        <>
                            {/* Header */}
                            <div className="navBar-mobileDrawer-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                        className="navBar-username navBar-mobileDrawer-username"
                                        onClick={() => {
                                            goToDashboard();
                                            setMobileOpen(false);
                                        }}
                                    >
                                        {authUser?.userName
                                            ? `Hi, ${authUser.userName.split(" ")[0]}`
                                            : activeRole?.greeting || "Hi User"}
                                    </span>
                                    <span className="navBar-beta-tag navBar-beta-tag-mobile">Beta</span>
                                </div>
                                <button
                                    className="navBar-mobileDrawer-close"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <HiX size={24} />
                                </button>
                            </div>

                            {/* Drawer with icons for both employer and job seeker */}
                            <div className="navBar-mobileDrawer-content">
                                {activeRole?.mobileLinks?.map((link, i) => {
                                    const isActive = typeof window !== 'undefined' && window.location.pathname === link.route;
                                    let IconComponent = HiOutlineHome;
                                    
                                    if (link.icon) {
                                        if (link.icon === 'home') {
                                            IconComponent = isActive ? HiHome : HiOutlineHome;
                                        } else if (link.icon === 'plus') {
                                            IconComponent = isActive ? HiPlusCircle : HiOutlinePlusCircle;
                                        } else if (link.icon === 'briefcase') {
                                            IconComponent = isActive ? HiBriefcase : HiOutlineBriefcase;
                                        } else if (link.icon === 'document') {
                                            IconComponent = isActive ? HiDocumentText : HiOutlineDocumentText;
                                        } else if (link.icon === 'settings') {
                                            IconComponent = isActive ? HiCog6Tooth : HiOutlineCog6Tooth;
                                        } else if (link.icon === 'user') {
                                            IconComponent = isActive ? HiUser : HiOutlineUser;
                                        } else if (link.icon === 'bookmark') {
                                            IconComponent = isActive ? HiBookmark : HiOutlineBookmark;
                                        } else if (link.icon === 'search') {
                                            IconComponent = isActive ? HiMagnifyingGlass : HiOutlineMagnifyingGlass;
                                        } else if (link.icon === 'sparkles') {
                                            IconComponent = isActive ? HiSparkles : HiOutlineSparkles;
                                        } else if (link.icon === 'tools') {
                                            IconComponent = isActive ? HiWrenchScrewdriver : HiOutlineWrenchScrewdriver;
                                        }
                                    }

                                    return (
                                        <button
                                            key={i}
                                            className={`navBar-mobileDrawer-item ${isActive ? 'active' : ''}`}
                                            onClick={() => {
                                                router.push(link.route);
                                                setMobileOpen(false);
                                            }}
                                        >
                                            {link.icon && <IconComponent className="navBar-mobileDrawer-item-icon" />}
                                            <span>{link.label}</span>
                                        </button>
                                    );
                                })}

                                <button 
                                    className={`navBar-mobileDrawer-item ${pathname === "/blogs" ? 'active' : ''}`}
                                    onClick={() => {
                                        router.push("/blogs");
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiDocumentText className="navBar-mobileDrawer-item-icon" />
                                    <span>Blogs</span>
                                </button>

                                <button 
                                    className={`navBar-mobileDrawer-item ${pathname === "/free-tools" ? 'active' : ''}`}
                                    onClick={() => {
                                        router.push("/free-tools");
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiWrenchScrewdriver className="navBar-mobileDrawer-item-icon" />
                                    <span>Free Tools</span>
                                </button>

                                <button
                                    className={`navBar-mobileDrawer-item ${pathname?.startsWith("/store") ? "active" : ""}`}
                                    onClick={() => {
                                        router.push("/store");
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiOutlineShoppingBag className="navBar-mobileDrawer-item-icon" />
                                    <span>Store</span>
                                </button>

                                <button 
                                    className="navBar-mobileDrawer-item navBar-mobileDrawer-item-logout" 
                                    onClick={handleLogout}
                                >
                                    <PiSignOutBold className="navBar-mobileDrawer-item-icon" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="navBar-mobileDrawer-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="navBar-mobileDrawer-title">Menu</span>
                                    <span className="navBar-beta-tag navBar-beta-tag-mobile">Beta</span>
                                </div>
                                <button
                                    className="navBar-mobileDrawer-close"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    <HiX size={24} />
                                </button>
                            </div>
                            <div className="navBar-mobileDrawer-content">
                                <button 
                                    className={`navBar-mobileDrawer-item ${pathname === "/" ? 'active' : ''}`}
                                    onClick={() => {
                                        router.push("/");
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiHome className="navBar-mobileDrawer-item-icon" />
                                    <span>Home</span>
                                </button>
                                <button 
                                    className={`navBar-mobileDrawer-item ${pathname === "/jobs" ? 'active' : ''}`}
                                    onClick={() => {
                                        router.push("/jobs");
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiMagnifyingGlass className="navBar-mobileDrawer-item-icon" />
                                    <span>Explore Jobs</span>
                                </button>
                                <button 
                                    className={`navBar-mobileDrawer-item ${pathname === "/blogs" ? 'active' : ''}`}
                                    onClick={() => {
                                        router.push("/blogs");
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiDocumentText className="navBar-mobileDrawer-item-icon" />
                                    <span>Blogs</span>
                                </button>
                                <button 
                                    className={`navBar-mobileDrawer-item ${pathname === "/free-tools" ? 'active' : ''}`}
                                    onClick={() => {
                                        router.push("/free-tools");
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiWrenchScrewdriver className="navBar-mobileDrawer-item-icon" />
                                    <span>Free Tools</span>
                                </button>
                                <button
                                    className={`navBar-mobileDrawer-item ${pathname?.startsWith("/store") ? "active" : ""}`}
                                    onClick={() => {
                                        router.push("/store");
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiOutlineShoppingBag className="navBar-mobileDrawer-item-icon" />
                                    <span>Store</span>
                                </button>
                                <button 
                                    className={`navBar-mobileDrawer-item ${pathname?.startsWith("/signin/jobseeker") ? 'active' : ''}`}
                                    onClick={() => {
                                        goToJobSeeker();
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiUser className="navBar-mobileDrawer-item-icon" />
                                    <span>Job Seeker</span>
                                </button>
                                <button 
                                    className={`navBar-mobileDrawer-item ${pathname?.startsWith("/signin/employer") ? 'active' : ''}`}
                                    onClick={() => {
                                        goToEmployer();
                                        setMobileOpen(false);
                                    }}
                                >
                                    <HiBriefcase className="navBar-mobileDrawer-item-icon" />
                                    <span>Employer</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default NavBar;
