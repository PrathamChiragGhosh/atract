"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
    FaSearch,
    FaFilter,
    FaSort,
    FaChevronDown,
    FaChevronLeft,
    FaChevronRight,
    FaBuilding,
    FaBriefcase,
    FaClock,
    FaRegEye,
    FaFilePdf,
    FaRegEnvelopeOpen,
    FaExternalLinkAlt,
    FaTimes,
    FaBookmark,
    FaRegBookmark
} from "react-icons/fa";
import { useJobApplications } from "@/hooks/useJobApplications";
import { useQueryClient } from "@tanstack/react-query";
import { savedJobsKeys } from "@/hooks/useSavedJobs";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { useJobSeekerAuth } from "@/hooks/useJobSeekerAuth";
import "./page.css";

const STATUS_OPTIONS = [
    { label: "All statuses", value: "" },
    { label: "Pending review", value: "pending" },
    { label: "Reviewed", value: "reviewed" },
    { label: "Shortlisted", value: "shortlisted" },
    { label: "Rejected", value: "rejected" }
];

const SUBMISSION_OPTIONS = [
    { label: "All submission types", value: "" },
    { label: "Direct application", value: "direct" },
    { label: "Basic test", value: "basic-test" },
    { label: "Video test", value: "video-test" },
    { label: "Basic + video", value: "basic+video" }
];

const JOB_TYPE_OPTIONS = [
    { label: "Any job type", value: "" },
    { label: "Full-time", value: "Full-time" },
    { label: "Part-time", value: "Part-time" },
    { label: "Internship", value: "Internship" },
    { label: "Freelance", value: "Freelance" },
    { label: "Contract", value: "Contract" },
    { label: "Temporary", value: "Temporary" }
];

const WORK_MODE_OPTIONS = [
    { label: "All work modes", value: "" },
    { label: "Onsite", value: "Onsite" },
    { label: "Hybrid", value: "Hybrid" },
    { label: "Remote", value: "Remote" }
];

const SORT_OPTIONS = [
    { label: "Recent updates", value: "recent" },
    { label: "Oldest first", value: "oldest" },
    { label: "Company A-Z", value: "company_az" },
    { label: "Status", value: "status" }
];

const APPLICATIONS_PER_PAGE = 20;

const MyApplicationsFilterDropdown = ({ id, label, value, options, onChange, variant = "default", isOpen, onToggle }) => {
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onToggle(null, false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen, onToggle]);

    const activeOption = options.find((option) => option.value === value);

    const dropdownClass = [
        "myapplications-filter-dropdown",
        variant === "sort" ? "myapplications-filter-dropdown-sort" : ""
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={dropdownClass} data-open={isOpen} ref={dropdownRef}>
            <button
                type="button"
                className="myapplications-filter-trigger"
                onClick={() => onToggle(id, !isOpen)}
            >
                <div className="myapplications-filter-trigger-text">
                    <span>{label}</span>
                    <strong>{activeOption?.label || options[0]?.label}</strong>
                </div>
                <FaChevronDown className="myapplications-filter-trigger-icon" />
            </button>
            {isOpen && (
                <div className="myapplications-filter-menu">
                    {options.map((option) => (
                        <button
                            type="button"
                            key={`${label}-${option.value || "all"}`}
                            className={`myapplications-filter-menu-item ${option.value === value ? "active" : ""}`}
                            onClick={() => {
                                onChange(option.value);
                                onToggle(null, false);
                            }}
                        >
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const formatDate = (value) => {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    } catch {
        return "—";
    }
};

const formatRelativeTime = (value) => {
    if (!value) return "";
    const eventDate = new Date(value);
    const diffMs = Date.now() - eventDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours <= 0) {
            const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
            return `${diffMinutes}m ago`;
        }
        return `${diffHours}h ago`;
    }
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays}d ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mo ago`;
};

const formatSubmissionType = (value) => {
    switch (value) {
        case "basic-test":
            return "Basic assessment";
        case "video-test":
            return "Video proctoring";
        case "basic+video":
            return "Basic + video";
        case "direct":
        default:
            return "Direct application";
    }
};

const buildStatusClass = (status) => {
    if (!status) return "pending";
    return status.toLowerCase();
};

const JobSeekerMyApplicationsScreen = () => {
    const queryClient = useQueryClient();
    
    // Check authentication and redirect if not logged in
    useJobSeekerAuth();
    
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        status: "",
        submissionType: "",
        jobType: "",
        workMode: "",
        sort: "recent"
    });
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [savedJobs, setSavedJobs] = useState(new Set());
    const [savingJobId, setSavingJobId] = useState(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters.status, filters.submissionType, filters.jobType, filters.workMode, filters.sort]);

    useEffect(() => {
        const handleResize = () => {
            if (typeof window === "undefined") return;
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!showMobileFilters) {
            return;
        }
        const scrollY = window.scrollY;
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = "100%";
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.width = "";
            document.body.style.overflow = "";
            window.scrollTo(0, scrollY);
        };
    }, [showMobileFilters]);

    const [openDropdownId, setOpenDropdownId] = useState(null);

    const queryFilters = useMemo(() => ({
        page: currentPage,
        limit: APPLICATIONS_PER_PAGE,
        search: debouncedSearch,
        status: filters.status,
        submissionType: filters.submissionType,
        jobType: filters.jobType,
        workMode: filters.workMode,
        sort: filters.sort
    }), [currentPage, debouncedSearch, filters]);

    const { data, isLoading, isFetching, error } = useJobApplications(queryFilters);

    const applications = data?.data || [];
    const pagination = data?.pagination || {
        currentPage,
        totalPages: 0,
        totalRecords: 0,
        limit: APPLICATIONS_PER_PAGE,
        hasNextPage: false,
        hasPrevPage: false
    };

    const summary = data?.summary || {
        totalApplications: 0,
        totalUpdates: 0,
        statusBreakdown: []
    };

    const handleDropdownToggle = useCallback((dropdownId, nextOpen) => {
        setOpenDropdownId(nextOpen ? dropdownId : null);
    }, []);

    const closeMobileFilters = useCallback(() => {
        setShowMobileFilters(false);
        setOpenDropdownId(null);
    }, []);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: key === "sort" ? value : (prev[key] === value ? "" : value)
        }));
    };

    const handleClearFilters = () => {
        setFilters({
            status: "",
            submissionType: "",
            jobType: "",
            workMode: "",
            sort: "recent"
        });
        setSearchQuery("");
        setOpenDropdownId(null);
        setShowMobileFilters(false);
    };

    // Check saved status for applications
    useEffect(() => {
        if (applications.length === 0) return;

        const token = Cookies.get("js_token");
        if (!token) return;

        const checkSavedStatus = async () => {
            try {
                const savedChecks = await Promise.all(
                    applications.map((app) =>
                        axios
                            .get(`${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/check-saved/${app.jobId}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            })
                            .then((res) => ({ jobId: app.jobId, isSaved: res.data.isSaved }))
                            .catch(() => ({ jobId: app.jobId, isSaved: false }))
                    )
                );

                setSavedJobs((prev) => {
                    const newSet = new Set(prev);
                    savedChecks.forEach(({ jobId, isSaved }) => {
                        if (isSaved) {
                            newSet.add(jobId);
                        } else {
                            newSet.delete(jobId);
                        }
                    });
                    return newSet;
                });
            } catch (error) {
                console.error("Failed to check saved status:", error);
            }
        };

        checkSavedStatus();
    }, [applications]);

    const isJobSaved = (jobId) => {
        return savedJobs.has(jobId);
    };

    const checkJobMatchesFilters = (jobData, filters) => {
        if (!jobData || !filters) return true;

        if (filters.search && filters.search.trim()) {
            const searchLower = filters.search.trim().toLowerCase();
            const matchesSearch =
                jobData.jobTitle?.toLowerCase().includes(searchLower) ||
                jobData.companyName?.toLowerCase().includes(searchLower) ||
                jobData.location?.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
        }

        if (filters.status && filters.status.trim()) {
            if (jobData.status !== filters.status.trim()) return false;
        }

        if (filters.jobType && filters.jobType.trim()) {
            if (jobData.jobType !== filters.jobType.trim()) return false;
        }

        if (filters.workMode && filters.workMode.trim()) {
            if (jobData.workMode !== filters.workMode.trim()) return false;
        }

        return true;
    };

    const handleSaveJob = async (jobId) => {
        if (!jobId) return;

        const token = Cookies.get("js_token");
        if (!token) {
            toast.error("Please log in to save jobs");
            return;
        }

        if (savingJobId) return;

        setSavingJobId(jobId);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/save-job`,
                { jobId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                setSavedJobs((prev) => {
                    const newSet = new Set(prev);
                    if (response.data.isSaved) {
                        newSet.add(jobId);
                    } else {
                        newSet.delete(jobId);
                    }
                    return newSet;
                });

                const jobFromResponse = response.data.job;
                if (jobFromResponse) {
                    const cachedQueries = queryClient.getQueriesData({
                        queryKey: savedJobsKeys.lists()
                    });

                    if (cachedQueries.length > 0) {
                        cachedQueries.forEach(([queryKey, cachedData]) => {
                            if (!cachedData) return;

                            const [, , , { filters: savedFilters }] = queryKey;
                            const currentData = { ...cachedData };
                            const currentJobs = currentData.data || [];
                            const currentPagination = currentData.pagination || {};

                            if (response.data.isSaved) {
                                const matchesFilters = checkJobMatchesFilters(jobFromResponse, savedFilters);
                                if (matchesFilters) {
                                    const jobExists = currentJobs.some((j) => j._id === jobId);
                                    if (!jobExists) {
                                        if (savedFilters.page === 1 || !savedFilters.page) {
                                            const updatedJobs = [jobFromResponse, ...currentJobs];
                                            const jobsForPage = updatedJobs.slice(0, savedFilters.limit || 20);

                                            queryClient.setQueryData(queryKey, {
                                                ...currentData,
                                                data: jobsForPage,
                                                pagination: {
                                                    ...currentPagination,
                                                    totalJobs: (currentPagination.totalJobs || 0) + 1,
                                                    totalPages: Math.ceil(
                                                        ((currentPagination.totalJobs || 0) + 1) / (savedFilters.limit || 20)
                                                    ),
                                                    hasNextPage:
                                                        (savedFilters.page || 1) <
                                                        Math.ceil(((currentPagination.totalJobs || 0) + 1) / (savedFilters.limit || 20))
                                                }
                                            });
                                        }
                                    }
                                }
                            } else {
                                const updatedJobs = currentJobs.filter((j) => j._id !== jobId);
                                const removed = currentJobs.length !== updatedJobs.length;
                                if (removed) {
                                    const newTotalJobs = Math.max(0, (currentPagination.totalJobs || 0) - 1);
                                    const newTotalPages = Math.max(1, Math.ceil(newTotalJobs / (savedFilters.limit || 20)));

                                    queryClient.setQueryData(queryKey, {
                                        ...currentData,
                                        data: updatedJobs,
                                        pagination: {
                                            ...currentPagination,
                                            totalJobs: newTotalJobs,
                                            totalPages: newTotalPages,
                                            hasNextPage: (savedFilters.page || 1) < newTotalPages,
                                            hasPrevPage: (savedFilters.page || 1) > 1
                                        }
                                    });
                                }
                            }
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Failed to save/unsave job:", err);
            if (err.response?.status === 401) {
                toast.error("Please log in to save jobs");
            } else {
                toast.error(err?.response?.data?.message || "Failed to save job");
            }
        } finally {
            setSavingJobId(null);
        }
    };

    const statusChips =
        summary.statusBreakdown
            ?.filter((item) => item?.status)
            .map((item) => ({
                status: item.status,
                label: item.status.charAt(0).toUpperCase() + item.status.slice(1),
                count: item.count
            })) || [];

    const showSkeleton = isLoading || !data;
    const activeFiltersCount = [filters.status, filters.submissionType, filters.jobType, filters.workMode].filter(Boolean).length;

    const renderFilterControls = (variant = "desktop") => (
        <div className={`myapplications-filters ${variant === "mobile" ? "myapplications-filters-mobile" : ""}`}>
            <MyApplicationsFilterDropdown
                id="status"
                label="Status"
                value={filters.status}
                options={STATUS_OPTIONS}
                onChange={(value) => handleFilterChange("status", value)}
                isOpen={openDropdownId === "status"}
                onToggle={handleDropdownToggle}
            />
            <MyApplicationsFilterDropdown
                id="submission"
                label="Submission"
                value={filters.submissionType}
                options={SUBMISSION_OPTIONS}
                onChange={(value) => handleFilterChange("submissionType", value)}
                isOpen={openDropdownId === "submission"}
                onToggle={handleDropdownToggle}
            />
            <MyApplicationsFilterDropdown
                id="jobType"
                label="Job type"
                value={filters.jobType}
                options={JOB_TYPE_OPTIONS}
                onChange={(value) => handleFilterChange("jobType", value)}
                isOpen={openDropdownId === "jobType"}
                onToggle={handleDropdownToggle}
            />
            <MyApplicationsFilterDropdown
                id="workMode"
                label="Work mode"
                value={filters.workMode}
                options={WORK_MODE_OPTIONS}
                onChange={(value) => handleFilterChange("workMode", value)}
                isOpen={openDropdownId === "workMode"}
                onToggle={handleDropdownToggle}
            />
        </div>
    );

    return (
        <div className="myapplications-page">
            <div className="myapplications-page-inner">
                <header className="myapplications-header">
                    <div>
                        <p className="myapplications-eyebrow">My applications</p>
                        <h1>Track every role you’ve applied for</h1>
                        <p>
                            Monitor employer activity, keep tabs on status changes, and jump back into any job post instantly.
                        </p>
                    </div>
                    <button type="button" className="myapplications-reset-btn" onClick={handleClearFilters}>
                        Reset filters
                    </button>
                </header>

                <section className="myapplications-summary-grid">
                    <article className="myapplications-summary-card">
                        <span>Total applications</span>
                        <strong>{summary.totalApplications}</strong>
                    </article>
                    <article className="myapplications-summary-card">
                        <span>Application updates</span>
                        <strong>{summary.totalUpdates}</strong>
                    </article>
                    <article className="myapplications-summary-card myapplications-summary-card-status">
                        <span>Statuses</span>
                        <div className="myapplications-status-chip-row">
                            {statusChips.length > 0 ? (
                                statusChips.map((chip) => (
                                    <span
                                        key={chip.label}
                                        className={`myapplications-status-chip myapplications-status-chip-${buildStatusClass(chip.status)}`}
                                    >
                                        {chip.label}: {chip.count}
                                    </span>
                                ))
                            ) : (
                                <span className="myapplications-status-chip myapplications-status-chip-muted">
                                    No status updates yet
                                </span>
                            )}
                        </div>
                    </article>
                </section>

                <section className="myapplications-toolbar">
                    <div className="myapplications-search">
                        <FaSearch className="myapplications-search-icon" />
                        <input
                            type="text"
                            className="myapplications-search-input"
                            placeholder="Search by company, title, or location"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>
                    {!isMobile && (
                        <div className="myapplications-toolbar-controls">
                            {renderFilterControls("desktop")}
                            <MyApplicationsFilterDropdown
                                id="sort"
                                label="Sort"
                                value={filters.sort}
                                options={SORT_OPTIONS}
                                onChange={(value) => handleFilterChange("sort", value)}
                                variant="sort"
                                isOpen={openDropdownId === "sort"}
                                onToggle={handleDropdownToggle}
                            />
                        </div>
                    )}
                    {isMobile && (
                        <div className="myapplications-mobile-bar">
                            <button
                                type="button"
                                className="myapplications-mobile-filter-btn"
                                onClick={() => {
                                    setShowMobileFilters(true);
                                    setOpenDropdownId(null);
                                }}
                            >
                                <FaFilter />
                                <span>Filters</span>
                                {activeFiltersCount > 0 && (
                                    <span className="myapplications-filter-badge">{activeFiltersCount}</span>
                                )}
                            </button>
                            <div className="myapplications-mobile-sort">
                                <button
                                    type="button"
                                    className="myapplications-mobile-sort-btn"
                                    onClick={() => handleDropdownToggle("sort", openDropdownId !== "sort")}
                                >
                                    <FaSort />
                                    <span>Sort</span>
                                    <FaChevronDown className={openDropdownId === "sort" ? "open" : ""} />
                                </button>
                                {openDropdownId === "sort" && (
                                    <div className="myapplications-mobile-sort-menu">
                                        {SORT_OPTIONS.map((option) => (
                                            <button
                                                type="button"
                                                key={option.value}
                                                className={`myapplications-mobile-sort-option ${filters.sort === option.value ? "active" : ""}`}
                                                onClick={() => {
                                                    handleFilterChange("sort", option.value);
                                                    setOpenDropdownId(null);
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {isMobile && showMobileFilters && (
                    <>
                        <div className="myapplications-mobile-overlay" onClick={closeMobileFilters} />
                        <div className="myapplications-mobile-drawer">
                            <div className="myapplications-mobile-drawer-header">
                                <h3>Filters</h3>
                                <button type="button" onClick={closeMobileFilters}>
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="myapplications-mobile-drawer-body">
                                {renderFilterControls("mobile")}
                                <div className="myapplications-mobile-drawer-actions">
                                    <button type="button" className="secondary" onClick={handleClearFilters}>
                                        Clear filters
                                    </button>
                                    <button type="button" onClick={closeMobileFilters}>
                                        Apply filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {error && (
                    <div className="myapplications-error">
                        {error.message || "Unable to load applications. Please try again."}
                    </div>
                )}

                <section className="myapplications-list-section">
                    {showSkeleton ? (
                        <div className="myapplications-skeleton-grid">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={`skeleton-${index}`} className="myapplications-card myapplications-card-skeleton" />
                            ))}
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="myapplications-empty-state">
                            <h3>No applications yet</h3>
                            <p>Once you apply to roles, you’ll see live status updates, employer activity, and timelines here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="myapplications-grid">
                                {applications.map((application) => {
                                    const timeline = [...(application.statusTimeline || [])].sort(
                                        (eventA, eventB) => new Date(eventA.createdAt) - new Date(eventB.createdAt)
                                    );
                                    const latestTimelineEvent = timeline[timeline.length - 1];
                                    const employerActions = [
                                        application.employerEngagement?.viewedAt && {
                                            label: `Viewed ${formatRelativeTime(application.employerEngagement.viewedAt)}`,
                                            icon: <FaRegEye />
                                        },
                                        application.employerEngagement?.resumeDownloadedAt && {
                                            label: `Resume downloaded ${formatRelativeTime(application.employerEngagement.resumeDownloadedAt)}`,
                                            icon: <FaFilePdf />
                                        },
                                        application.employerUpdates > 0 && {
                                            label: `${application.employerUpdates} employer update${application.employerUpdates > 1 ? "s" : ""}`,
                                            icon: <FaRegEnvelopeOpen />
                                        }
                                    ].filter(Boolean);

                                    return (
                                        <article key={application.applicationId} className="myapplications-card">
                                            <header className="myapplications-card-header">
                                                <div className="myapplications-company">
                                                    {application.companyLogo ? (
                                                        <img
                                                            src={application.companyLogo}
                                                            alt={application.companyName || "Company logo"}
                                                            className="myapplications-company-logo"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="myapplications-company-placeholder">
                                                            {application.companyInitial}
                                                        </div>
                                                    )}
        <div>
                                                        <p className="myapplications-company-name">{application.companyName}</p>
                                                        <p className="myapplications-job-title">{application.jobTitle}</p>
                                                    </div>
                                                </div>
                                                <span className={`myapplications-status-badge myapplications-status-badge-${buildStatusClass(application.status)}`}>
                                                    {application.status ? application.status.charAt(0).toUpperCase() + application.status.slice(1) : "Pending"}
                                                </span>
                                            </header>

                                            <div className="myapplications-card-meta">
                                                <span>
                                                    <FaClock />
                                                    Applied {formatDate(application.appliedAt)}
                                                </span>
                                                <span>
                                                    <FaBriefcase />
                                                    {application.jobType}
                                                </span>
                                                <span>
                                                    <FaBuilding />
                                                    {application.location}
                                                </span>
                                            </div>

                                            <div className="myapplications-card-meta myapplications-card-meta-secondary">
                                                <span>Submission: {formatSubmissionType(application.submissionType)}</span>
                                                <span>
                                                    Mode: {application.workMode}
                                                </span>
                                                <span>
                                                    Updates: {application.totalUpdates}
                                                </span>
                                            </div>

                                            <div className="myapplications-timeline">
                                                {timeline.map((event, index) => (
                                                    <div key={`${application.applicationId}-event-${index}`} className="myapplications-timeline-item">
                                                        <div className="myapplications-timeline-left">
                                                            <div className={`myapplications-timeline-dot myapplications-timeline-dot-${event.source || "system"}`} />
                                                            <span className="myapplications-timeline-date">
                                                                {formatDate(event.createdAt)}
                                                            </span>
                                                        </div>
                                                        <div className="myapplications-timeline-right">
                                                            <p>{event.label}</p>
                                                            {event.description && <small>{event.description}</small>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="myapplications-employer-actions">
                                                {employerActions.length > 0 ? (
                                                    employerActions.map((action, index) => (
                                                        <span key={`${application.applicationId}-action-${index}`} className="myapplications-employer-chip">
                                                            {action.icon}
                                                            {action.label}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="myapplications-employer-chip myapplications-employer-chip-muted">
                                                        No employer actions yet
                                                    </span>
                                                )}
                                            </div>

                                            <footer className="myapplications-card-footer">
                                                <div className="myapplications-card-footer-text">
                                                    {latestTimelineEvent
                                                        ? `${latestTimelineEvent.label} on ${formatRelativeTime(latestTimelineEvent.createdAt)}`
                                                        : `Last update ${formatRelativeTime(application.latestUpdateAt)}`}
                                                </div>
                                                <div className="myapplications-card-footer-actions">
                                                    {application.jobId && (
                                                        <button
                                                            type="button"
                                                            className={`myapplications-save-btn ${isJobSaved(application.jobId) ? "saved" : ""} ${savingJobId === application.jobId ? "saving" : ""}`}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleSaveJob(application.jobId);
                                                            }}
                                                            disabled={savingJobId === application.jobId}
                                                            aria-label={isJobSaved(application.jobId) ? "Unsave job" : "Save job"}
                                                        >
                                                            {isJobSaved(application.jobId) ? <FaBookmark /> : <FaRegBookmark />}
                                                        </button>
                                                    )}
                                                    {application.shortId && (
                                                        <Link href={`/${application.shortId}`} className="myapplications-card-link">
                                                            View job
                                                            <FaExternalLinkAlt />
                                                        </Link>
                                                    )}
                                                </div>
                                            </footer>
                                        </article>
                                    );
                                })}
                            </div>

                            {pagination.totalPages > 1 && (
                                <div className="myapplications-pagination">
                                    <button
                                        type="button"
                                        className="myapplications-pagination-btn"
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={!pagination.hasPrevPage || isFetching}
                                    >
                                        <FaChevronLeft />
                                        Previous
                                    </button>
                                    <div className="myapplications-pagination-info">
                                        Page {pagination.currentPage} of {pagination.totalPages}
                                    </div>
                                    <button
                                        type="button"
                                        className="myapplications-pagination-btn"
                                        onClick={() => setCurrentPage((prev) => prev + 1)}
                                        disabled={!pagination.hasNextPage || isFetching}
                                    >
                                        Next
                                        <FaChevronRight />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
};

export default JobSeekerMyApplicationsScreen;