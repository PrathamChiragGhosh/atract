"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import {
    FaSearch, FaFilter, FaSort, FaBriefcase, FaBuilding, FaMapMarkerAlt,
    FaMoneyBillAlt, FaCalendarAlt, FaBookmark, FaRegBookmark, FaTimes,
    FaChevronLeft, FaChevronRight, FaCheck, FaCheckCircle
} from "react-icons/fa";
import { HiChevronDown } from "react-icons/hi2";
import { useSavedJobs, useToggleSaveJob, savedJobsKeys } from "@/hooks/useSavedJobs";
import { useQueryClient } from "@tanstack/react-query";
import { useJobApplications } from "@/hooks/useJobApplications";
import axios from "axios";
import Cookies from "js-cookie";
import { useJobSeekerAuth } from "@/hooks/useJobSeekerAuth";
import "./page.css";

const SavedJobsScreen = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [mounted, setMounted] = useState(false);

    // Check authentication and redirect if not logged in
    useJobSeekerAuth();

    // Filters and pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [jobTypeFilter, setJobTypeFilter] = useState("");
    const [workModeFilter, setWorkModeFilter] = useState("");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [currentPage, setCurrentPage] = useState(1);

    // UI states
    const [showFilters, setShowFilters] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Refs
    const sortDropdownRef = useRef(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Check mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Mount check
    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent body scroll when filter drawer is open
    useEffect(() => {
        if (showFilters) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [showFilters]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setShowSortDropdown(false);
            }
        };

        if (showSortDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSortDropdown]);

    // Fetch jobs with filters
    const filters = {
        page: currentPage,
        limit: 20,
        search: debouncedSearch,
        status: statusFilter,
        jobType: jobTypeFilter,
        workMode: workModeFilter,
        sortBy,
        sortOrder,
    };

    const { data: jobsData, isLoading, error, refetch } = useSavedJobs(filters);
    const toggleSaveMutation = useToggleSaveJob();

    const jobs = jobsData?.data || [];
    const pagination = jobsData?.pagination || {};

    // Fetch all applications to check applied status
    const { data: applicationsData } = useJobApplications({ page: 1, limit: 1000 });
    const applications = applicationsData?.data || [];

    // Create a map of jobId to application status
    const applicationStatusMap = new Map();
    applications.forEach((app) => {
        if (app.jobId) {
            const timeline = [...(app.statusTimeline || [])].sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
            const latestEvent = timeline[timeline.length - 1];
            applicationStatusMap.set(app.jobId, {
                status: app.status,
                latestEvent: latestEvent,
                appliedAt: app.appliedAt
            });
        }
    });

    // Sort options
    const sortOptions = [
        { value: "createdAt", label: "Posted Date" },
        { value: "applicationOpeningDate", label: "Opening Date" },
        { value: "applicationClosingDate", label: "Closing Date" },
        { value: "jobTitle", label: "Job Title" },
        { value: "status", label: "Status" },
    ];

    // Status options
    const statusOptions = ["", "Draft", "Active", "Inactive", "Closed"];

    // Job type options
    const jobTypeOptions = ["", "Full-time", "Part-time", "Internship", "Freelance", "Contract", "Temporary"];

    // Work mode options
    const workModeOptions = ["", "Onsite", "Hybrid", "Remote"];

    // Handle save/unsave
    const handleToggleSave = async (jobId, e) => {
        e.stopPropagation();
        try {
            await toggleSaveMutation.mutateAsync({ jobId });
        } catch (err) {
            console.error("Failed to toggle save:", err);
        }
    };

    // Handle job click
    const handleJobClick = (shortId) => {
        router.push(`/${shortId}`);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "1 day ago";
        if (diffDays === 2) return "2 days ago";
        if (diffDays === 3) return "3 days ago";
        if (diffDays <= 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

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

    // Format salary
    const formatSalary = (min, max) => {
        if (!min && !max) return "Not disclosed";
        if (min && max) return `₹${(min / 100000).toFixed(1)}L - ₹${(max / 100000).toFixed(1)}L`;
        if (min) return `₹${(min / 100000).toFixed(1)}L+`;
        if (max) return `Up to ₹${(max / 100000).toFixed(1)}L`;
        return "Not disclosed";
    };

    // Truncate text
    const truncateText = (text, maxLength) => {
        if (!text) return "";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    };

    // Get company initial
    const getCompanyInitial = (companyName) => {
        if (!companyName) return "C";
        return companyName.charAt(0).toUpperCase();
    };

    // Count active filters
    const activeFiltersCount = [statusFilter, jobTypeFilter, workModeFilter].filter(Boolean).length;

    const filterSelectConfig = [
        {
            key: "status",
            label: "Status",
            value: statusFilter,
            options: statusOptions,
            setter: setStatusFilter,
        },
        {
            key: "job-type",
            label: "Job Type",
            value: jobTypeFilter,
            options: jobTypeOptions,
            setter: setJobTypeFilter,
        },
        {
            key: "work-mode",
            label: "Work Mode",
            value: workModeFilter,
            options: workModeOptions,
            setter: setWorkModeFilter,
        },
    ];

    const FilterDropdown = ({ id, label, value, options, onChange, variant }) => {
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                    setIsOpen(false);
                }
            };

            if (isOpen) {
                document.addEventListener("mousedown", handleClickOutside);
            }

            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }, [isOpen]);

        const selectedLabel = value || "All";

        return (
            <div className={`saved-jobs-filter-group saved-jobs-filter-group-${variant}`} ref={dropdownRef}>
                <button
                    type="button"
                    className={`saved-jobs-filter-toggle ${isOpen ? "open" : ""}`}
                    onClick={() => setIsOpen((prev) => !prev)}
                >
                    <div className="saved-jobs-filter-toggle-text">
                        <span className="saved-jobs-filter-toggle-label">{label}</span>
                        <span className="saved-jobs-filter-toggle-value">{selectedLabel}</span>
                    </div>
                    <HiChevronDown className={`saved-jobs-filter-arrow ${isOpen ? "open" : ""}`} />
                </button>
                {isOpen && (
                    <div className="saved-jobs-filter-menu">
                        {options.map((option) => {
                            const optionLabel = option || "All";
                            const isActive = value === option;

                            return (
                                <button
                                    type="button"
                                    key={`${id}-${option || "all"}`}
                                    className={`saved-jobs-filter-menu-item ${isActive ? "active" : ""}`}
                                    onClick={() => {
                                        onChange(option);
                                        setIsOpen(false);
                                    }}
                                >
                                    <span>{optionLabel}</span>
                                    {isActive && <FaCheck className="saved-jobs-filter-check" />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderFilterDropdowns = (variant) => (
        <div className={`saved-jobs-filter-selects saved-jobs-filter-selects-${variant}`}>
            {filterSelectConfig.map(({ key, label, value, options, setter }) => (
                <FilterDropdown
                    key={`${key}-${variant}`}
                    id={`${key}-${variant}`}
                    label={label}
                    value={value}
                    options={options}
                    onChange={(nextValue) => {
                        setter(nextValue);
                        setCurrentPage(1);
                    }}
                    variant={variant}
                />
            ))}
            {activeFiltersCount > 0 && (
                <button
                    type="button"
                    className="saved-jobs-clear-filters"
                    onClick={() => {
                        setStatusFilter("");
                        setJobTypeFilter("");
                        setWorkModeFilter("");
                        setCurrentPage(1);
                    }}
                >
                    Clear Filters
                </button>
            )}
        </div>
    );

    if (!mounted) {
        return (
            <div className="saved-jobs-loading">
                <CircularProgress />
            </div>
        );
    }

    return (
        <div className="saved-jobs-container">
            {/* Header */}
            <div className="saved-jobs-header">
                <div className="saved-jobs-header-left">
                    <h1 className="saved-jobs-title">Saved Jobs</h1>
                    {pagination.totalJobs !== undefined && (
                        <p className="saved-jobs-count">
                            {pagination.totalJobs} {pagination.totalJobs === 1 ? 'job' : 'jobs'} saved
                        </p>
                    )}
                </div>
                <div className="saved-jobs-header-right">
                    {/* Search Bar */}
                    <div className="saved-jobs-search">
                        <button
                            type="button"
                            className="saved-jobs-search-icon-btn"
                            aria-label="Search saved jobs"
                            onClick={() => setDebouncedSearch(searchQuery)}
                        >
                            <FaSearch />
                        </button>
                        <input
                            className="saved-jobs-search-input"
                            type="text"
                            placeholder="Search saved jobs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="saved-jobs-actions-row">
                        {/* Filter Button - Mobile */}
                        <button
                            className="saved-jobs-filter-btn mobile-only"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <FaFilter />
                            <span>Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="saved-jobs-filter-badge">{activeFiltersCount}</span>
                            )}
                        </button>

                        {/* Sort Dropdown */}
                        <div className="saved-jobs-sort" ref={sortDropdownRef}>
                            <button
                                className="saved-jobs-sort-btn"
                                onClick={() => setShowSortDropdown(!showSortDropdown)}
                            >
                                <FaSort />
                                <span>Sort</span>
                                <HiChevronDown className={`saved-jobs-sort-arrow ${showSortDropdown ? 'open' : ''}`} />
                            </button>
                            {showSortDropdown && (
                                <div className="saved-jobs-sort-dropdown">
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            className={`saved-jobs-sort-option ${sortBy === option.value ? 'active' : ''}`}
                                            onClick={() => {
                                                setSortBy(option.value);
                                                setSortOrder(sortBy === option.value && sortOrder === 'desc' ? 'asc' : 'desc');
                                                setShowSortDropdown(false);
                                            }}
                                        >
                                            {option.label}
                                            {sortBy === option.value && (
                                                <span className="saved-jobs-sort-order">
                                                    {sortOrder === 'desc' ? '↓' : '↑'}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Section - Desktop */}
            <div className="saved-jobs-filters desktop-only">
                {renderFilterDropdowns("desktop")}
            </div>

            {/* Mobile Filter Drawer */}
            {showFilters && (
                <>
                    <div className="saved-jobs-mobile-overlay" onClick={() => setShowFilters(false)}></div>
                    <div className="saved-jobs-mobile-drawer">
                        <div className="saved-jobs-drawer-header">
                            <h3>Filters</h3>
                            <button onClick={() => setShowFilters(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="saved-jobs-drawer-content">
                            {renderFilterDropdowns("mobile")}
                        </div>
                    </div>
                </>
            )}

            {/* Jobs List */}
            <div className="saved-jobs-content">
                {isLoading ? (
                    <div className="saved-jobs-loading">
                        <CircularProgress />
                        <p>Loading saved jobs...</p>
                    </div>
                ) : error ? (
                    <div className="saved-jobs-error">
                        <p>{error.message || "Failed to load saved jobs"}</p>
                        <button onClick={() => refetch()}>Retry</button>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="saved-jobs-empty">
                        <FaBookmark className="saved-jobs-empty-icon" />
                        <h2>No saved jobs</h2>
                        <p>Start saving jobs to see them here</p>
                        <button onClick={() => router.push("/jobs")}>Explore Jobs</button>
                    </div>
                ) : (
                    <>
                        <div className="saved-jobs-list">
                            {jobs.map((job) => {
                                const companyLogo = job.employerId?.companyLogo;
                                const companyName = job.employerId?.companyName || job.companyName;
                                const visibleSkills = Array.isArray(job.skills) && job.skills.length > 0
                                    ? job.skills.slice(0, 5)
                                    : [];
                                const hasMoreSkills = Array.isArray(job.skills) && job.skills.length > 5;
                                const applicationStatus = applicationStatusMap.get(job._id);
                                const hasApplied = !!applicationStatus;

                                return (
                                    <div
                                        key={job._id}
                                        className="saved-jobs-card"
                                        onClick={() => handleJobClick(job.shortId)}
                                    >
                                        <div className="saved-jobs-card-header">
                                            <div className="saved-jobs-card-logo">
                                                {companyLogo ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={companyLogo} alt={companyName || "Company"} />
                                                ) : (
                                                    <span>{getCompanyInitial(companyName)}</span>
                                                )}
                                            </div>
                                            <div className="saved-jobs-card-info">
                                                <h3 className="saved-jobs-card-title">{job.jobTitle}</h3>
                                                <p className="saved-jobs-card-company">{companyName}</p>
                                                <div className="saved-jobs-card-meta">
                                                    <span>
                                                        <FaMapMarkerAlt className="saved-jobs-meta-icon" />
                                                        {job.location}
                                                    </span>
                                                    {job.experience && (
                                                        <span>
                                                            <FaBriefcase className="saved-jobs-meta-icon" />
                                                            {job.experience}
                                                        </span>
                                                    )}
                                                    <span>
                                                        <FaMoneyBillAlt className="saved-jobs-meta-icon" />
                                                        {formatSalary(job.minSalary, job.maxSalary)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="saved-jobs-card-description">
                                            <p>{truncateText(job.jobDescription, 150)}</p>
                                        </div>

                                        {visibleSkills.length > 0 && (
                                            <div className="saved-jobs-card-skills">
                                                {visibleSkills.map((skill, idx) => (
                                                    <span key={`${job._id}-skill-${idx}`} className="saved-jobs-skill-tag">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {hasMoreSkills && (
                                                    <span className="saved-jobs-skill-tag saved-jobs-skill-tag-more">
                                                        & {job.skills.length - 5} more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="saved-jobs-card-footer">
                                            <div className="saved-jobs-card-footer-left">
                                                {hasApplied && applicationStatus.latestEvent ? (
                                                    <span className="saved-jobs-applied-status">
                                                        <FaCheckCircle className="saved-jobs-applied-icon" />
                                                        {applicationStatus.latestEvent.label} on {formatRelativeTime(applicationStatus.latestEvent.createdAt)}
                                                    </span>
                                                ) : hasApplied ? (
                                                    <span className="saved-jobs-applied-status">
                                                        <FaCheckCircle className="saved-jobs-applied-icon" />
                                                        Applied on {formatRelativeTime(applicationStatus.appliedAt)}
                                                    </span>
                                                ) : (
                                                    <span className="saved-jobs-card-date">
                                                        <FaCalendarAlt className="saved-jobs-date-icon" />
                                                        {formatDate(job.createdAt)}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                className="saved-jobs-unsave-btn"
                                                onClick={(e) => handleToggleSave(job._id, e)}
                                                disabled={toggleSaveMutation.isPending}
                                            >
                                                <FaBookmark />
                                                <span>Saved</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="saved-jobs-pagination">
                                <button
                                    className="saved-jobs-pagination-btn"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={!pagination.hasPrevPage || isLoading}
                                >
                                    <FaChevronLeft />
                                    Previous
                                </button>
                                <div className="saved-jobs-pagination-info">
                                    Page {pagination.currentPage} of {pagination.totalPages}
                                </div>
                                <button
                                    className="saved-jobs-pagination-btn"
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    disabled={!pagination.hasNextPage || isLoading}
                                >
                                    Next
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SavedJobsScreen;

