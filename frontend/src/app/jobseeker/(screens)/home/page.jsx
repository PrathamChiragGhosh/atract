"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircularProgress } from "@mui/material";
import axios from "axios";
import Cookies from "js-cookie";
import { Toaster, toast } from "react-hot-toast";
import {
    FaBell,
    FaBriefcase,
    FaBookmark,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaUser,
    FaSearch,
    FaArrowRight,
    FaEye,
    FaFilePdf,
    FaRegEnvelopeOpen,
    FaBuilding
} from "react-icons/fa";
import { useJobApplications } from "@/hooks/useJobApplications";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useJobSeekerProfile } from "@/hooks/useJobSeekerProfile";
import { useJobSeekerAuth } from "@/hooks/useJobSeekerAuth";
import "./page.css";

const JobSeekerHomeScreen = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    // Check authentication and redirect if not logged in
    useJobSeekerAuth();

    // Fetch data
    const { data: applicationsData, isLoading: loadingApplications } = useJobApplications({
        page: 1,
        limit: 5,
        sort: "recent"
    });

    const { data: savedJobsData, isLoading: loadingSavedJobs } = useSavedJobs({
        page: 1,
        limit: 1
    });

    const { data: profileData, isLoading: loadingProfile } = useJobSeekerProfile();

    const applications = applicationsData?.data || [];
    const applicationsSummary = applicationsData?.summary || {
        totalApplications: 0,
        totalUpdates: 0,
        statusBreakdown: []
    };

    const savedJobsCount = savedJobsData?.pagination?.totalJobs || 0;
    const [jobMatchAlertEnabled, setJobMatchAlertEnabled] = useState(null);
    const [jobMatchAlertLoading, setJobMatchAlertLoading] = useState(false);
    const [instantPlan, setInstantPlan] = useState(null);
    const [instantPlanLoading, setInstantPlanLoading] = useState(false);

    // Calculate profile completion
    const profileCompletion = useMemo(() => {
        if (!profileData) return 0;

        const fields = [
            { value: profileData.fullName, weight: 10 },
            { value: profileData.mobileNumber, weight: 8 },
            { value: profileData.gender, weight: 5 },
            { value: profileData.dateOfBirth, weight: 5 },
            { value: profileData.address, weight: 8 },
            { value: profileData.highestQualification, weight: 10 },
            { value: profileData.passoutYear, weight: 5 },
            { value: profileData.experienceInYears !== "" && profileData.experienceInYears !== null ? profileData.experienceInYears : null, weight: 5 },
            { value: profileData.noticePeriod !== "" && profileData.noticePeriod !== null ? profileData.noticePeriod : null, weight: 5 },
            { value: profileData.linkedinUrl, weight: 8 },
            { value: profileData.githubUrl, weight: 8 },
            { value: Array.isArray(profileData.skills) && profileData.skills.length > 0 ? profileData.skills : null, weight: 12 },
            { value: Array.isArray(profileData.languages) && profileData.languages.length > 0 ? profileData.languages : null, weight: 8 },
            { value: profileData.profilePicture, weight: 8 },
            { value: profileData.resume, weight: 8 }
        ];

        let completed = 0;
        let total = 0;

        fields.forEach(field => {
            total += field.weight;
            if (field.value && field.value !== "" && field.value !== null) {
                if (Array.isArray(field.value)) {
                    if (field.value.length > 0) {
                        completed += field.weight;
                    }
                } else {
                    completed += field.weight;
                }
            }
        });

        return Math.round((completed / total) * 100);
    }, [profileData]);

    // Get status counts
    const statusCounts = useMemo(() => {
        const breakdown = applicationsSummary.statusBreakdown || [];
        return {
            pending: breakdown.find(s => s.status === 'pending')?.count || 0,
            reviewed: breakdown.find(s => s.status === 'reviewed')?.count || 0,
            shortlisted: breakdown.find(s => s.status === 'shortlisted')?.count || 0,
            rejected: breakdown.find(s => s.status === 'rejected')?.count || 0
        };
    }, [applicationsSummary]);

    // Format relative time
    const formatRelativeTime = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins}min${diffMins > 1 ? "s" : ""} ago`;
        if (diffHours < 24) return `${diffHours}hr${diffHours > 1 ? "s" : ""} ago`;
        if (diffDays === 1) return "1 day ago";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
        }
        if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? "s" : ""} ago`;
        }
        const years = Math.floor(diffDays / 365);
        return `${years} year${years > 1 ? "s" : ""} ago`;
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Get company initial
    const getCompanyInitial = (companyName) => {
        if (!companyName) return "?";
        return companyName.charAt(0).toUpperCase();
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'shortlisted':
                return '#10b981';
            case 'reviewed':
                return '#3b82f6';
            case 'rejected':
                return '#ef4444';
            default:
                return '#f59e0b';
        }
    };

    // Sync job alert toggle with profile data if available
    useEffect(() => {
        if (jobMatchAlertEnabled === null && typeof profileData?.jobAlertOnResumeMatch !== "undefined") {
            setJobMatchAlertEnabled(Boolean(profileData.jobAlertOnResumeMatch));
        }
    }, [jobMatchAlertEnabled, profileData]);

    // Fetch job alert setting
    useEffect(() => {
        const fetchJobAlertSetting = async () => {
            const token = Cookies.get("js_token");
            if (!token) {
                setJobMatchAlertEnabled(false);
                return;
            }
            try {
                const resp = await axios.get(`${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/settings/job-alert`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const serverValue = resp?.data?.data?.jobAlertOnResumeMatch ?? resp?.data?.jobAlertOnResumeMatch ?? false;
                setJobMatchAlertEnabled(Boolean(serverValue));
            } catch (error) {
                // fall back to profile data or false
                setJobMatchAlertEnabled(Boolean(profileData?.jobAlertOnResumeMatch ?? false));
            }
        };

        fetchJobAlertSetting();
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchPlan = async () => {
            const token = Cookies.get("js_token");
            if (!token) return;
            setInstantPlanLoading(true);
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/instant-alerts/plan`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.success && res.data.hasPlan) {
                    setInstantPlan(res.data.plan);
                } else {
                    setInstantPlan(null);
                }
            } catch (err) {
                // silent
            } finally {
                setInstantPlanLoading(false);
            }
        };
        fetchPlan();
    }, []);

    const isLoading = loadingApplications || loadingSavedJobs || loadingProfile;
    const userName = profileData?.fullName || "User";
    const showSkeleton = !mounted || isLoading;
    const hasResume = Boolean(profileData?.resume);
    const hasInstantPlan = Boolean(instantPlan?.status === "active" && instantPlan?.endDate);
    const remainingInstantDays = hasInstantPlan
        ? Math.max(0, Math.ceil((new Date(instantPlan.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
        : 0;
    const isInstantPlanExpired = hasInstantPlan && new Date(instantPlan.endDate) < new Date();

    const handleEnableJobAlerts = async () => {
        if (jobMatchAlertLoading || jobMatchAlertEnabled) return;

        const token = Cookies.get("js_token");
        if (!token) {
            toast.error("Please sign in to manage alerts.");
            router.push("/signin/jobseeker");
            return;
        }

        setJobMatchAlertLoading(true);
        try {
            await axios.patch(`${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/settings/job-alert`, {
                jobAlertOnResumeMatch: true
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setJobMatchAlertEnabled(true);
            toast.success("Email alerts enabled for jobs matching your resume.");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to update alert preference.");
        } finally {
            setJobMatchAlertLoading(false);
        }
    };

    return (
        <div className="jobseeker-home-page">
            <div className="jobseeker-home-container">
                <Toaster position="top-right" />
                {!hasInstantPlan && (
                    <div
                        className="jobseeker-home-alert-banner"
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push("/jobseeker/profile")}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push("/jobseeker/profile");
                            }
                        }}
                    >
                        <div className="jobseeker-home-alert-left">
                            <div className="jobseeker-home-alert-eyebrow">Stay ahead</div>
                            <div className="jobseeker-home-alert-title">Instant job alerts. Be first to apply.</div>
                            <div className="jobseeker-home-alert-desc">
                                When a matching job is posted, we’ll send you an alert right away.
                            </div>
                            <div className="jobseeker-home-alert-sub">
                                <span className="jobseeker-home-alert-pill">Lightning-fast alerts</span>
                                <span className="jobseeker-home-alert-pill">AI-matched to your resume</span>
                                <span className="jobseeker-home-alert-pill jobseeker-home-alert-price">Only ₹200/mo</span>
                            </div>
                        </div>
                        <span className="jobseeker-home-alert-arrow" aria-hidden="true">
                            <FaArrowRight />
                        </span>
                    </div>
                )}

                {hasInstantPlan && !isInstantPlanExpired && (
                    <div className="jobseeker-home-active-plan-banner">
                        <div>
                            <div className="jobseeker-home-active-plan-title">Instant Alerts is active</div>
                            <div className="jobseeker-home-active-plan-desc">
                                {remainingInstantDays} days remaining · Renew before {new Date(instantPlan.endDate).toLocaleDateString()}
                            </div>
                        </div>
                        <div className="jobseeker-home-active-plan-chip">Active</div>
                    </div>
                )}

                {hasInstantPlan && isInstantPlanExpired && (
                    <div className="jobseeker-home-expired-plan-banner">
                        <div>
                            <div className="jobseeker-home-expired-plan-title">Instant Alerts expired</div>
                            <div className="jobseeker-home-expired-plan-desc">
                                Your plan expired on {new Date(instantPlan.endDate).toLocaleDateString()}. Renew to continue receiving instant alerts.
                            </div>
                        </div>
                        <button
                            type="button"
                            className="jobseeker-home-renew-btn"
                            onClick={() => router.push("/jobseeker/profile")}
                        >
                            Renew for ₹200
                        </button>
                    </div>
                )}
                {/* Welcome Section */}
                <div className="jobseeker-home-welcome">
                    <h1 className="jobseeker-home-title">
                        Welcome back, {userName.split(' ')[0]}!
                    </h1>
                    <p className="jobseeker-home-subtitle">
                        Here's what's happening with your job search
                    </p>
                </div>

                {showSkeleton ? (
                    <div className="jobseeker-home-loading">
                        <CircularProgress />
                        <p>Loading your dashboard...</p>
                    </div>
                ) : (
                    <>
                        {/* Resume status & job alerts */}
                        <div className="jobseeker-home-status-card">
                            <div className="jobseeker-home-status-left">
                                <div className={`jobseeker-home-status-dot ${hasResume ? "success" : "warning"}`} />
                                <div>
                                    <p className="jobseeker-home-status-eyebrow">Resume</p>
                                    <h3 className="jobseeker-home-status-title">
                                        {hasResume ? "Resume added" : "No resume uploaded yet"}
                                    </h3>
                                    <p className="jobseeker-home-status-text">
                                        {hasResume
                                            ? "We'll notify you when new jobs match your resume."
                                            : "Upload your resume to receive alerts for roles that fit your profile."}
                                    </p>
                                </div>
                            </div>
                            <div className="jobseeker-home-status-actions">
                                {hasResume ? (
                                    <span className="jobseeker-home-status-chip">Resume added</span>
                                ) : (
                                    <Link href="/jobseeker/profile" className="jobseeker-home-status-link">
                                        Add resume
                                    </Link>
                                )}
                                <button
                                    className={`jobseeker-home-status-btn ${jobMatchAlertEnabled ? "enabled" : ""}`}
                                    onClick={handleEnableJobAlerts}
                                    disabled={jobMatchAlertEnabled || jobMatchAlertLoading || !hasResume}
                                >
                                    <FaBell />
                                    {jobMatchAlertEnabled ? "Job alerts enabled" : jobMatchAlertLoading ? "Enabling..." : "Enable job alerts"}
                                </button>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="jobseeker-home-stats">
                            <div className="jobseeker-home-stat-card">
                                <div className="jobseeker-home-stat-icon jobseeker-home-stat-icon-primary">
                                    <FaBriefcase />
                                </div>
                                <div className="jobseeker-home-stat-content">
                                    <p className="jobseeker-home-stat-label">Total Applications</p>
                                    <p className="jobseeker-home-stat-value">{applicationsSummary.totalApplications || 0}</p>
                                </div>
                            </div>

                            <div className="jobseeker-home-stat-card">
                                <div className="jobseeker-home-stat-icon jobseeker-home-stat-icon-warning">
                                    <FaClock />
                                </div>
                                <div className="jobseeker-home-stat-content">
                                    <p className="jobseeker-home-stat-label">Pending Review</p>
                                    <p className="jobseeker-home-stat-value">{statusCounts.pending}</p>
                                </div>
                            </div>

                            <div className="jobseeker-home-stat-card">
                                <div className="jobseeker-home-stat-icon jobseeker-home-stat-icon-success">
                                    <FaCheckCircle />
                                </div>
                                <div className="jobseeker-home-stat-content">
                                    <p className="jobseeker-home-stat-label">Shortlisted</p>
                                    <p className="jobseeker-home-stat-value">{statusCounts.shortlisted}</p>
                                </div>
                            </div>

                            <div className="jobseeker-home-stat-card">
                                <div className="jobseeker-home-stat-icon jobseeker-home-stat-icon-info">
                                    <FaBookmark />
                                </div>
                                <div className="jobseeker-home-stat-content">
                                    <p className="jobseeker-home-stat-label">Saved Jobs</p>
                                    <p className="jobseeker-home-stat-value">{savedJobsCount}</p>
                                </div>
                            </div>

                            <div className="jobseeker-home-stat-card">
                                <div className="jobseeker-home-stat-icon jobseeker-home-stat-icon-secondary">
                                    <FaUser />
                                </div>
                                <div className="jobseeker-home-stat-content">
                                    <p className="jobseeker-home-stat-label">Profile Complete</p>
                                    <p className="jobseeker-home-stat-value">{profileCompletion}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="jobseeker-home-actions">
                            <Link href="/jobs" className="jobseeker-home-action-btn jobseeker-home-action-primary">
                                <FaSearch />
                                <span>Search Jobs</span>
                            </Link>
                            <Link href="/jobseeker/my-applications" className="jobseeker-home-action-btn jobseeker-home-action-secondary">
                                <FaBriefcase />
                                <span>My Applications</span>
                            </Link>
                            <Link href="/jobseeker/saved-jobs" className="jobseeker-home-action-btn jobseeker-home-action-secondary">
                                <FaBookmark />
                                <span>Saved Jobs</span>
                            </Link>
                            {profileCompletion < 100 && (
                                <Link href="/jobseeker/profile" className="jobseeker-home-action-btn jobseeker-home-action-warning">
                                    <FaUser />
                                    <span>Complete Profile</span>
                                </Link>
                            )}
                        </div>

                        {/* Profile Completion Card */}
                        {profileCompletion < 100 && (
                            <div className="jobseeker-home-card jobseeker-home-profile-card">
                                <div className="jobseeker-home-card-header">
                                    <h3>Complete Your Profile</h3>
                                    <span className="jobseeker-home-profile-percent">{profileCompletion}%</span>
                                </div>
                                <div className="jobseeker-home-profile-progress">
                                    <div
                                        className="jobseeker-home-profile-progress-bar"
                                        style={{
                                            width: `${profileCompletion}%`,
                                            backgroundColor: profileCompletion >= 80 ? '#10b981' : profileCompletion >= 50 ? '#f59e0b' : '#ef4444'
                                        }}
                                    />
                                </div>
                                <p className="jobseeker-home-profile-text">
                                    Complete your profile to increase your chances of getting hired. Add missing information to reach 100%.
                                </p>
                                <Link href="/jobseeker/profile" className="jobseeker-home-profile-link">
                                    Update Profile <FaArrowRight />
                                </Link>
                            </div>
                        )}

                        {/* Recent Applications */}
                        {applications.length > 0 && (
                            <div className="jobseeker-home-card">
                                <div className="jobseeker-home-card-header">
                                    <h3>Recent Applications</h3>
                                    <Link href="/jobseeker/my-applications" className="jobseeker-home-card-link">
                                        View All <FaArrowRight />
                                    </Link>
                                </div>
                                <div className="jobseeker-home-applications-list">
                                    {applications.slice(0, 5).map((application) => {
                                        const timeline = [...(application.statusTimeline || [])].sort(
                                            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                                        );
                                        const latestEvent = timeline[timeline.length - 1];
                                        const employerActions = [
                                            application.employerEngagement?.viewedAt && {
                                                label: `Viewed ${formatRelativeTime(application.employerEngagement.viewedAt)}`,
                                                icon: <FaEye />
                                            },
                                            application.employerEngagement?.resumeDownloadedAt && {
                                                label: `Resume downloaded ${formatRelativeTime(application.employerEngagement.resumeDownloadedAt)}`,
                                                icon: <FaFilePdf />
                                            }
                                        ].filter(Boolean);

                                        return (
                                            <Link
                                                key={application.applicationId}
                                                href={`/${application.shortId}`}
                                                className="jobseeker-home-application-item"
                                            >
                                                <div className="jobseeker-home-application-header">
                                                    <div className="jobseeker-home-application-company">
                                                        {application.companyLogo ? (
                                                            <img
                                                                src={application.companyLogo}
                                                                alt={application.companyName || "Company logo"}
                                                                className="jobseeker-home-company-logo"
                                                                loading="lazy"
                                                            />
                                                        ) : (
                                                            <div className="jobseeker-home-company-placeholder">
                                                                {getCompanyInitial(application.companyName)}
                                                            </div>
                                                        )}
                                                        <div className="jobseeker-home-application-info">
                                                            <h4 className="jobseeker-home-application-title">{application.jobTitle}</h4>
                                                            <p className="jobseeker-home-application-company-name">{application.companyName}</p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className="jobseeker-home-application-status"
                                                        style={{ color: getStatusColor(application.status) }}
                                                    >
                                                        {application.status ? application.status.charAt(0).toUpperCase() + application.status.slice(1) : "Pending"}
                                                    </span>
                                                </div>
                                                <div className="jobseeker-home-application-meta">
                                                    <span className="jobseeker-home-application-date">
                                                        Applied {formatDate(application.appliedAt)}
                                                    </span>
                                                    {latestEvent && (
                                                        <span className="jobseeker-home-application-update">
                                                            {latestEvent.label} {formatRelativeTime(latestEvent.createdAt)}
                                                        </span>
                                                    )}
                                                </div>
                                                {employerActions.length > 0 && (
                                                    <div className="jobseeker-home-application-actions">
                                                        {employerActions.map((action, index) => (
                                                            <span key={index} className="jobseeker-home-application-action-chip">
                                                                {action.icon}
                                                                {action.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Activity Summary */}
                        {applicationsSummary.totalUpdates > 0 && (
                            <div className="jobseeker-home-card jobseeker-home-activity-card">
                                <div className="jobseeker-home-card-header">
                                    <h3>Recent Activity</h3>
                                </div>
                                <div className="jobseeker-home-activity-content">
                                    <div className="jobseeker-home-activity-stat">
                                        <FaRegEnvelopeOpen className="jobseeker-home-activity-icon" />
                                        <div>
                                            <p className="jobseeker-home-activity-value">{applicationsSummary.totalUpdates}</p>
                                            <p className="jobseeker-home-activity-label">Application Updates</p>
                                        </div>
                                    </div>
                                    <p className="jobseeker-home-activity-text">
                                        You have {applicationsSummary.totalUpdates} update{applicationsSummary.totalUpdates > 1 ? 's' : ''} on your applications. Check your applications page for details.
                                    </p>
                                    <Link href="/jobseeker/my-applications" className="jobseeker-home-activity-link">
                                        View Updates <FaArrowRight />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Empty States */}
                        {applications.length === 0 && savedJobsCount === 0 && (
                            <div className="jobseeker-home-empty">
                                <div className="jobseeker-home-empty-icon">
                                    <FaBriefcase />
                                </div>
                                <h3>Start Your Job Search</h3>
                                <p>You haven't applied to any jobs yet. Start exploring opportunities and apply to jobs that match your skills.</p>
                                <Link href="/jobs" className="jobseeker-home-empty-btn">
                                    <FaSearch />
                                    Browse Jobs
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default JobSeekerHomeScreen;
