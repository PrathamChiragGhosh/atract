"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircularProgress } from "@mui/material";
import {
    FaBriefcase,
    FaClock,
    FaCheckCircle,
    FaTimesCircle,
    FaPlusCircle,
    FaArrowRight,
    FaEye,
    FaFilePdf,
    FaRegEnvelopeOpen,
    FaBuilding,
    FaMapMarkerAlt,
    FaUser,
    FaUsers,
    FaShieldAlt
} from "react-icons/fa";
import axios from "axios";
import Cookies from "js-cookie";
import { useEmployerApplications } from "@/hooks/useEmployerApplications";
import { useEmployerJobs } from "@/hooks/useEmployerJobs";
import { useEmployerProfile } from "@/hooks/useEmployerProfile";
import { useEmployerJobCounts } from "@/hooks/useEmployerJobCounts";
import "./page.css";

const EmployerHomeScreen = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    // Fetch data
    const { data: applicationsData, isLoading: loadingApplications } = useEmployerApplications({
        page: 1,
        limit: 5,
        sort: "recent"
    });

    const { data: jobsData, isLoading: loadingJobs } = useEmployerJobs({
        page: 1,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc"
    });

    const { data: profileData, isLoading: loadingProfile } = useEmployerProfile();
    const { data: jobCounts, isLoading: loadingJobCounts } = useEmployerJobCounts();

    const applications = applicationsData?.data || [];
    const applicationsSummary = applicationsData?.summary || {
        totalApplications: 0,
        statusBreakdown: []
    };

    const jobs = jobsData?.data || [];
    // Use cached counts if available, otherwise fallback to pagination data
    const totalJobs = jobCounts?.totalJobs ?? jobsData?.pagination?.totalJobs ?? jobsData?.counts?.totalJobs ?? 0;
    const activeJobs = jobCounts?.activeJobs ?? jobsData?.counts?.activeJobs ?? jobs.filter(job => job.status?.toLowerCase() === 'active').length;

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

    // Get candidate initial
    const getCandidateInitial = (name) => {
        if (!name) return "?";
        return name.charAt(0).toUpperCase();
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

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'shortlisted':
                return 'employee-homescreen-status-shortlisted';
            case 'reviewed':
                return 'employee-homescreen-status-reviewed';
            case 'rejected':
                return 'employee-homescreen-status-rejected';
            default:
                return 'employee-homescreen-status-pending';
        }
    };

    // Format submission type
    const formatSubmissionType = (type) => {
        if (!type) return "Direct";
        return type === "basic_test" ? "Basic Test" : type === "video_proctored_test" ? "Video Proctored" : "Direct";
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    const isLoading = loadingApplications || loadingJobs || loadingProfile || loadingJobCounts;
    // Use consistent default to avoid hydration mismatch
    const employerName = (!mounted || isLoading) ? "Employer" : (profileData?.fullName || profileData?.companyName || "Employer");
    const showSkeleton = !mounted || isLoading;

    const [emailAlertOnLogin, setEmailAlertOnLogin] = useState(null);
    const [emailAlertChecked, setEmailAlertChecked] = useState(false);

    useEffect(() => {
        const fetchEmailAlert = async () => {
            const token = Cookies.get("emp_token");
            if (!token) {
                setEmailAlertChecked(true);
                return;
            }
            try {
                const resp = await axios.get(`${process.env.NEXT_PUBLIC_EMPLOYER_URL}/settings/email-alert`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const serverValue = resp?.data?.data?.emailAlertOnLogin ?? resp?.data?.emailAlertOnLogin ?? false;
                setEmailAlertOnLogin(Boolean(serverValue));
            } catch (err) {
                // silently ignore, we won't show banner on error
                setEmailAlertOnLogin(true);
            } finally {
                setEmailAlertChecked(true);
            }
        };
        fetchEmailAlert();
    }, []);

    const showSecurityBanner = emailAlertChecked && emailAlertOnLogin === false;

    return (
        <div className="employee-homescreen-page">
            <div className="employee-homescreen-container">
                {/* Welcome Section */}
                <div className="employee-homescreen-welcome">
                    <h1 className="employee-homescreen-title">
                        Welcome back, {employerName.split(' ')[0]}!
                    </h1>
                    <p className="employee-homescreen-subtitle">
                        Here's an overview of your hiring activity
                    </p>
                </div>

                    {showSecurityBanner && (
                        <div className="employee-homescreen-security-banner">
                            <div className="employee-homescreen-security-icon">
                                <FaShieldAlt />
                            </div>
                            <div className="employee-homescreen-security-text">
                                <h3>Protect your account with login email alerts</h3>
                                <p>
                                    Email alerts on login are currently disabled. Turn them on to get notified whenever someone signs in.
                                    You can enable this from Settings &rarr; Email preferences.
                                </p>
                            </div>
                            <button
                                className="employee-homescreen-security-btn"
                                onClick={() => router.push("/employer/settings")}
                            >
                                Enable in Settings
                            </button>
                        </div>
                    )}

                {showSkeleton ? (
                    <div className="employee-homescreen-loading">
                        <CircularProgress />
                        <p>Loading your dashboard...</p>
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div className="employee-homescreen-stats">
                            <div className="employee-homescreen-stat-card">
                                <div className="employee-homescreen-stat-icon employee-homescreen-stat-icon-primary">
                                    <FaBriefcase />
                                </div>
                                <div className="employee-homescreen-stat-content">
                                    <p className="employee-homescreen-stat-label">Total Jobs</p>
                                    <p className="employee-homescreen-stat-value">{totalJobs}</p>
                                </div>
                            </div>

                            <div className="employee-homescreen-stat-card">
                                <div className="employee-homescreen-stat-icon employee-homescreen-stat-icon-success">
                                    <FaCheckCircle />
                                </div>
                                <div className="employee-homescreen-stat-content">
                                    <p className="employee-homescreen-stat-label">Active Jobs</p>
                                    <p className="employee-homescreen-stat-value">{activeJobs}</p>
                                </div>
                            </div>

                            <div className="employee-homescreen-stat-card">
                                <div className="employee-homescreen-stat-icon employee-homescreen-stat-icon-info">
                                    <FaUsers />
                                </div>
                                <div className="employee-homescreen-stat-content">
                                    <p className="employee-homescreen-stat-label">Total Applications</p>
                                    <p className="employee-homescreen-stat-value">{applicationsSummary.totalApplications || 0}</p>
                                </div>
                            </div>

                            <div className="employee-homescreen-stat-card">
                                <div className="employee-homescreen-stat-icon employee-homescreen-stat-icon-warning">
                                    <FaClock />
                                </div>
                                <div className="employee-homescreen-stat-content">
                                    <p className="employee-homescreen-stat-label">Pending Review</p>
                                    <p className="employee-homescreen-stat-value">{statusCounts.pending}</p>
                                </div>
                            </div>

                            <div className="employee-homescreen-stat-card">
                                <div className="employee-homescreen-stat-icon employee-homescreen-stat-icon-success">
                                    <FaCheckCircle />
                                </div>
                                <div className="employee-homescreen-stat-content">
                                    <p className="employee-homescreen-stat-label">Shortlisted</p>
                                    <p className="employee-homescreen-stat-value">{statusCounts.shortlisted}</p>
                                </div>
                            </div>

                            <div className="employee-homescreen-stat-card">
                                <div className="employee-homescreen-stat-icon employee-homescreen-stat-icon-danger">
                                    <FaTimesCircle />
                                </div>
                                <div className="employee-homescreen-stat-content">
                                    <p className="employee-homescreen-stat-label">Rejected</p>
                                    <p className="employee-homescreen-stat-value">{statusCounts.rejected}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="employee-homescreen-actions">
                            <Link href="/employer/post-job" className="employee-homescreen-action-btn employee-homescreen-action-primary">
                                <FaPlusCircle />
                                <span>Post New Job</span>
                            </Link>
                            <Link href="/employer/applications" className="employee-homescreen-action-btn employee-homescreen-action-secondary">
                                <FaUsers />
                                <span>View Applications</span>
                            </Link>
                            <Link href="/employer/jobs" className="employee-homescreen-action-btn employee-homescreen-action-secondary">
                                <FaBriefcase />
                                <span>View All Jobs</span>
                            </Link>
                        </div>

                        {/* Recent Applications */}
                        {applications.length > 0 && (
                            <div className="employee-homescreen-card">
                                <div className="employee-homescreen-card-header">
                                    <h3>Recent Applications</h3>
                                    <Link href="/employer/applications" className="employee-homescreen-card-link">
                                        View All <FaArrowRight />
                                    </Link>
                                </div>
                                <div className="employee-homescreen-applications-list">
                                    {applications.slice(0, 5).map((application) => {
                                        const timeline = [...(application.statusTimeline || [])].sort(
                                            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                                        );
                                        const latestEvent = timeline[timeline.length - 1];

                                        return (
                                            <div
                                                key={application.applicationId}
                                                className="employee-homescreen-application-item"
                                                onClick={() => router.push(`/employer/applications?jobId=${application.jobId}`)}
                                            >
                                                <div className="employee-homescreen-application-header">
                                                    <div className="employee-homescreen-application-candidate">
                                                        <div className="employee-homescreen-candidate-avatar">
                                                            {getCandidateInitial(application.candidateName)}
                                                        </div>
                                                        <div className="employee-homescreen-application-info">
                                                            <h4 className="employee-homescreen-application-name">{application.candidateName}</h4>
                                                            <p className="employee-homescreen-application-email">{application.candidateEmail}</p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`employee-homescreen-application-status ${getStatusBadgeClass(application.status)}`}
                                                    >
                                                        {application.status ? application.status.charAt(0).toUpperCase() + application.status.slice(1) : "Pending"}
                                                    </span>
                                                </div>
                                                <div className="employee-homescreen-application-job">
                                                    <h5 className="employee-homescreen-job-title">{application.jobTitle}</h5>
                                                    <div className="employee-homescreen-job-meta">
                                                        <span className="employee-homescreen-job-location">
                                                            <FaMapMarkerAlt /> {application.location}
                                                        </span>
                                                        <span className="employee-homescreen-job-type">
                                                            {application.workMode} • {application.jobType}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="employee-homescreen-application-meta">
                                                    <span className="employee-homescreen-application-date">
                                                        Applied {formatDate(application.appliedAt)}
                                                    </span>
                                                    <span className="employee-homescreen-application-type">
                                                        {formatSubmissionType(application.submissionType)}
                                                    </span>
                                                    {latestEvent && (
                                                        <span className="employee-homescreen-application-update">
                                                            Last update {formatRelativeTime(latestEvent.createdAt)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Recent Jobs */}
                        {jobs.length > 0 && (
                            <div className="employee-homescreen-card">
                                <div className="employee-homescreen-card-header">
                                    <h3>Recent Jobs</h3>
                                    <Link href="/employer/jobs" className="employee-homescreen-card-link">
                                        View All <FaArrowRight />
                                    </Link>
                                </div>
                                <div className="employee-homescreen-jobs-list">
                                    {jobs.slice(0, 5).map((job) => (
                                        <div
                                            key={job._id}
                                            className="employee-homescreen-job-item"
                                            onClick={() => router.push(`/employer/jobs`)}
                                        >
                                            <div className="employee-homescreen-job-header">
                                                <div className="employee-homescreen-job-info-main">
                                                    <h4 className="employee-homescreen-job-item-title">{job.jobTitle}</h4>
                                                    <div className="employee-homescreen-job-item-meta">
                                                        <span className="employee-homescreen-job-item-location">
                                                            <FaMapMarkerAlt /> {job.location}
                                                        </span>
                                                        <span className="employee-homescreen-job-item-type">
                                                            {job.workMode} • {job.jobType}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`employee-homescreen-job-item-status employee-homescreen-job-status-${job.status?.toLowerCase() || 'draft'}`}>
                                                    {job.status ? job.status.charAt(0).toUpperCase() + job.status.slice(1) : "Draft"}
                                                </span>
                                            </div>
                                            <div className="employee-homescreen-job-footer">
                                                <span className="employee-homescreen-job-item-date">
                                                    Posted {formatDate(job.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Activity Summary */}
                        {applicationsSummary.totalApplications > 0 && (
                            <div className="employee-homescreen-card employee-homescreen-activity-card">
                                <div className="employee-homescreen-card-header">
                                    <h3>Activity Summary</h3>
                                </div>
                                <div className="employee-homescreen-activity-content">
                                    <div className="employee-homescreen-activity-stats">
                                        <div className="employee-homescreen-activity-stat">
                                            <FaUsers className="employee-homescreen-activity-icon" />
                                            <div>
                                                <p className="employee-homescreen-activity-value">{applicationsSummary.totalApplications}</p>
                                                <p className="employee-homescreen-activity-label">Total Applications</p>
                                            </div>
                                        </div>
                                        <div className="employee-homescreen-activity-stat">
                                            <FaClock className="employee-homescreen-activity-icon" />
                                            <div>
                                                <p className="employee-homescreen-activity-value">{statusCounts.pending}</p>
                                                <p className="employee-homescreen-activity-label">Pending Review</p>
                                            </div>
                                        </div>
                                        <div className="employee-homescreen-activity-stat">
                                            <FaCheckCircle className="employee-homescreen-activity-icon" />
                                            <div>
                                                <p className="employee-homescreen-activity-value">{statusCounts.shortlisted}</p>
                                                <p className="employee-homescreen-activity-label">Shortlisted</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="employee-homescreen-activity-text">
                                        You have {statusCounts.pending} application{statusCounts.pending !== 1 ? 's' : ''} pending review. Review them to find the best candidates for your open positions.
                                    </p>
                                    <Link href="/employer/applications" className="employee-homescreen-activity-link">
                                        Review Applications <FaArrowRight />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Empty States */}
                        {totalJobs === 0 && applications.length === 0 && (
                            <div className="employee-homescreen-empty">
                                <div className="employee-homescreen-empty-icon">
                                    <FaBriefcase />
                                </div>
                                <h3>Get Started with Hiring</h3>
                                <p>You haven't posted any jobs yet. Start by creating your first job posting to attract talented candidates.</p>
                                <Link href="/employer/post-job" className="employee-homescreen-empty-btn">
                                    <FaPlusCircle />
                                    Post Your First Job
                                </Link>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default EmployerHomeScreen;
