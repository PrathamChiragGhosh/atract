"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircularProgress } from "@mui/material";
import {
    FaSearch, FaFilter, FaSort, FaBriefcase, FaBuilding, FaMapMarkerAlt,
    FaCalendarAlt, FaTimes, FaChevronLeft, FaChevronRight, FaUser,
    FaEnvelope, FaGraduationCap, FaCode, FaFilePdf, FaEye, FaEdit, FaTimesCircle,
    FaCheckCircle, FaExclamationTriangle, FaChartLine, FaChartBar, FaClock
} from "react-icons/fa";
import { HiChevronDown } from "react-icons/hi2";
import { useEmployerApplications, employerApplicationsKeys } from "@/hooks/useEmployerApplications";
import { useEmployerJobs } from "@/hooks/useEmployerJobs";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import Cookies from "js-cookie";
import { Toaster, toast } from "react-hot-toast";
import "./page.css";

const APPLICATIONS_PER_PAGE = 20;

const ApplicationsPageClient = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const [mounted, setMounted] = useState(false);

    // Get jobId from URL query params
    // Safely handle searchParams which may be null during SSR
    const jobIdFromUrl = searchParams ? searchParams.get('jobId') : null;

    // Filters and pagination
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        submissionType: "",
        jobIds: jobIdFromUrl ? [jobIdFromUrl] : [], // Initialize with jobId from URL if present
        sort: "recent"
    });
    const [currentPage, setCurrentPage] = useState(1);

    // UI states
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    
    // Job filter drawer states
    const [showJobFilterDrawer, setShowJobFilterDrawer] = useState(false);
    const [jobSearchQuery, setJobSearchQuery] = useState("");
    const [debouncedJobSearch, setDebouncedJobSearch] = useState("");
    const [jobFilterPage, setJobFilterPage] = useState(1);
    const [selectedJobIds, setSelectedJobIds] = useState([]);
    
    // Status update modal states
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [sendEmailNotification, setSendEmailNotification] = useState(true);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
    const [showBackwardStatusConfirmation, setShowBackwardStatusConfirmation] = useState(false);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
    
    // Test summary modal states
    const [showTestSummaryModal, setShowTestSummaryModal] = useState(false);
    const [testSummaryData, setTestSummaryData] = useState(null);
    const [testSummaryLoading, setTestSummaryLoading] = useState(false);

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

    // Debounce job search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedJobSearch(jobSearchQuery);
            setJobFilterPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [jobSearchQuery]);

    // Sync selectedJobIds with filters.jobIds when drawer opens or filters change
    useEffect(() => {
        if (showJobFilterDrawer) {
            setSelectedJobIds([...filters.jobIds]);
        } else {
            // Also sync when drawer is closed to ensure consistency
            setSelectedJobIds([...filters.jobIds]);
        }
    }, [showJobFilterDrawer, filters.jobIds]);

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

    // Handle jobId from URL query parameter
    useEffect(() => {
        if (jobIdFromUrl && mounted) {
            // Set the job ID in filters
            setFilters(prev => ({
                ...prev,
                jobIds: [jobIdFromUrl]
            }));
            // Select the job in the drawer (but don't open it)
            setSelectedJobIds([jobIdFromUrl]);
            // Remove the query parameter from URL to clean it up
            router.replace('/employer/applications', { scroll: false });
        }
    }, [jobIdFromUrl, mounted, router]);

    // Prevent body scroll when filter drawer is open
    useEffect(() => {
        if (showMobileFilters) {
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
    }, [showMobileFilters]);

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

    const queryFilters = useMemo(() => ({
        page: currentPage,
        limit: APPLICATIONS_PER_PAGE,
        search: debouncedSearch,
        status: filters.status,
        submissionType: filters.submissionType,
        jobIds: filters.jobIds && filters.jobIds.length > 0 ? filters.jobIds : [],
        sort: filters.sort
    }), [currentPage, debouncedSearch, filters]);

    const { data, isLoading, isFetching, error } = useEmployerApplications(queryFilters);

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
        statusBreakdown: []
    };

    const handleDropdownToggle = useCallback((dropdownId, nextOpen) => {
        setOpenDropdownId(nextOpen ? dropdownId : null);
        // Close sort dropdown when opening a filter dropdown
        if (nextOpen) {
            setShowSortDropdown(false);
        }
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
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilters({
            status: "",
            submissionType: "",
            jobIds: [],
            sort: "recent"
        });
        setSearchQuery("");
        setOpenDropdownId(null);
        setShowMobileFilters(false);
        setShowJobFilterDrawer(false);
        setSelectedJobIds([]); // Clear selected jobs in drawer
        setCurrentPage(1);
    };

    // Handle job selection toggle
    const handleJobToggle = (jobId) => {
        setSelectedJobIds(prev => {
            if (prev.includes(jobId)) {
                return prev.filter(id => id !== jobId);
            } else {
                return [...prev, jobId];
            }
        });
    };

    // Handle apply job filter
    const handleApplyJobFilter = () => {
        setFilters(prev => ({
            ...prev,
            jobIds: selectedJobIds
        }));
        setCurrentPage(1);
        setShowJobFilterDrawer(false);
        setOpenDropdownId(null);
    };

    // Handle discard job filter
    const handleDiscardJobFilter = () => {
        setSelectedJobIds([...filters.jobIds]);
        setShowJobFilterDrawer(false);
        setOpenDropdownId(null);
    };

    // Update application status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ applicationId, status, sendEmail }) => {
            const token = Cookies.get('emp_token');
            if (!token) {
                throw new Error('No authentication token');
            }

            const response = await axios.patch(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/applications/${applicationId}/status`,
                { status, sendEmail },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                return response.data;
            }
            throw new Error(response.data.message || 'Failed to update status');
        },
        onSuccess: (data, variables) => {
            // Invalidate and refetch applications
            queryClient.invalidateQueries({ queryKey: employerApplicationsKeys.lists() });
            toast.success('Application status updated successfully');
            setShowStatusModal(false);
            setSelectedApplication(null);
            setSelectedStatus("");
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || error.message || 'Failed to update status');
        }
    });

    // Handle open status modal
    const handleOpenStatusModal = (application) => {
        setSelectedApplication(application);
        setSelectedStatus(application.status || "pending");
        setSendEmailNotification(true);
        setShowStatusModal(true);
        setShowCloseConfirmation(false);
    };

    // Handle close status modal
    const handleCloseStatusModal = () => {
        if (updateStatusMutation.isPending) {
            setShowCloseConfirmation(true);
        } else {
            setShowStatusModal(false);
            setSelectedApplication(null);
            setSelectedStatus("");
            setShowCloseConfirmation(false);
        }
    };

    // Handle confirm close
    const handleConfirmClose = () => {
        setShowStatusModal(false);
        setSelectedApplication(null);
        setSelectedStatus("");
        setShowCloseConfirmation(false);
        // Note: The mutation will continue in background, but we're closing the modal
    };

    // Status hierarchy (forward progression order)
    const statusOrder = {
        'pending': 1,
        'reviewed': 2,
        'shortlisted': 3,
        'rejected': 4 // Rejected is considered a final state
    };

    // Check if moving to an earlier status
    const isBackwardStatusChange = (currentStatus, newStatus) => {
        // If current status is rejected, any change is not backward
        if (currentStatus === 'rejected') return false;
        
        // If new status is rejected, it's not backward (rejection can happen from any state)
        if (newStatus === 'rejected') return false;
        
        // If current status is pending, no backward movement possible
        if (currentStatus === 'pending') return false;
        
        const currentOrder = statusOrder[currentStatus] || 0;
        const newOrder = statusOrder[newStatus] || 0;
        
        return newOrder < currentOrder;
    };

    // Get status label
    const getStatusLabel = (status) => {
        const labels = {
            'pending': 'Pending Review',
            'reviewed': 'Reviewed',
            'shortlisted': 'Shortlisted',
            'rejected': 'Rejected'
        };
        return labels[status] || status;
    };

    // Handle update status
    const handleUpdateStatus = () => {
        if (!selectedApplication || !selectedStatus) return;
        
        const currentStatus = selectedApplication.status || 'pending';
        
        // Check if this is a backward status change
        if (isBackwardStatusChange(currentStatus, selectedStatus)) {
            // Show confirmation modal
            setPendingStatusUpdate({
                applicationId: selectedApplication.applicationId,
                status: selectedStatus,
                sendEmail: sendEmailNotification
            });
            setShowBackwardStatusConfirmation(true);
        } else {
            // Proceed with update directly
            updateStatusMutation.mutate({
                applicationId: selectedApplication.applicationId,
                status: selectedStatus,
                sendEmail: sendEmailNotification
            });
        }
    };

    // Handle confirm backward status change
    const handleConfirmBackwardStatus = () => {
        if (pendingStatusUpdate) {
            updateStatusMutation.mutate(pendingStatusUpdate);
            setShowBackwardStatusConfirmation(false);
            setPendingStatusUpdate(null);
        }
    };

    // Handle cancel backward status change
    const handleCancelBackwardStatus = () => {
        setShowBackwardStatusConfirmation(false);
        setPendingStatusUpdate(null);
    };

    // Handle view resume
    const handleViewResume = (application) => {
        const token = Cookies.get('emp_token');
        if (!token) {
            toast.error('Please login to view resume');
            return;
        }

        // Open resume in new tab with authentication
        const viewUrl = `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/applications/${application.applicationId}/resume`;
        const newWindow = window.open('', '_blank');
        
        // Fetch resume with token and display in new window
        axios.get(viewUrl, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
        }).then(response => {
            const blob = new Blob([response.data], { 
                type: response.headers['content-type'] || 'application/pdf' 
            });
            const url = window.URL.createObjectURL(blob);
            newWindow.location.href = url;
            
            // Invalidate cache to refresh timeline with "Resume viewed" event
            queryClient.invalidateQueries({ queryKey: employerApplicationsKeys.lists() });
        }).catch(err => {
            if (newWindow) {
                newWindow.close();
            }
            if (err.response?.status === 401) {
                Cookies.remove("emp_token");
                toast.error('Session expired. Please login again.');
                router.push("/signin/employer");
            } else {
                toast.error(err.response?.data?.message || "Failed to view resume. Please try again.");
            }
        });
    };

    // Handle view test summary
    const handleViewTestSummary = async (application) => {
        const token = Cookies.get('emp_token');
        if (!token) {
            toast.error('Please login to view summary');
            return;
        }

        setShowTestSummaryModal(true);
        setTestSummaryLoading(true);
        setTestSummaryData(null);

        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/applications/${application.applicationId}/test-summary`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                setTestSummaryData(response.data.data);
            } else {
                toast.error(response.data.message || 'Failed to load test summary');
                setShowTestSummaryModal(false);
            }
        } catch (error) {
            console.error("Fetch test summary error:", error);
            toast.error(error.response?.data?.message || 'Failed to load test summary');
            setShowTestSummaryModal(false);
        } finally {
            setTestSummaryLoading(false);
        }
    };

    // Handle close test summary modal
    const handleCloseTestSummaryModal = () => {
        setShowTestSummaryModal(false);
        setTestSummaryData(null);
    };

    // Filter options
    const statusOptions = ["", "pending", "reviewed", "shortlisted", "rejected"];
    const submissionTypeOptions = ["", "direct", "basic-test", "video-test", "basic+video"];
    const sortOptions = [
        { value: "recent", label: "Most Recent" },
        { value: "oldest", label: "Oldest First" },
        { value: "name_az", label: "Name (A-Z)" },
        { value: "status", label: "Status" },
    ];

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

    // Format submission type
    const formatSubmissionType = (type) => {
        const map = {
            "direct": "Direct Application",
            "basic-test": "Basic Test",
            "video-test": "Video Test",
            "basic+video": "Basic + Video Test"
        };
        return map[type] || type;
    };

    // Build status class
    const buildStatusClass = (status) => {
        const map = {
            "pending": "employee-applications-status-pending",
            "reviewed": "employee-applications-status-reviewed",
            "shortlisted": "employee-applications-status-shortlisted",
            "rejected": "employee-applications-status-rejected"
        };
        return map[status] || "";
    };

    // Count active filters
    const activeFiltersCount = [
        filters.status, 
        filters.submissionType, 
        ...(filters.jobIds && filters.jobIds.length > 0 ? filters.jobIds : [])
    ].filter(Boolean).length;

    // Fetch jobs for job filter drawer
    const { data: jobsData, isLoading: isLoadingJobs } = useEmployerJobs({
        page: jobFilterPage,
        limit: 10,
        search: debouncedJobSearch,
        status: "Active" // Only show active jobs
    });

    const jobs = jobsData?.data || [];
    const jobsPagination = jobsData?.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalJobs: 0,
        hasNextPage: false,
        hasPrevPage: false
    };

    // Filter dropdown component
    const FilterDropdown = ({ id, label, value, options, onChange }) => {
        const isOpen = openDropdownId === id;

        return (
            <div className="employee-applications-filter-group">
                <button
                    type="button"
                    className={`employee-applications-filter-toggle ${isOpen ? "open" : ""}`}
                    onClick={() => handleDropdownToggle(id, !isOpen)}
                >
                    <div className="employee-applications-filter-toggle-text">
                        <span className="employee-applications-filter-label">{label}</span>
                        <span className="employee-applications-filter-value">{value || "All"}</span>
                    </div>
                    <HiChevronDown className={`employee-applications-filter-arrow ${isOpen ? 'open' : ''}`} />
                </button>
                {isOpen && (
                    <div className="employee-applications-filter-menu">
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                className={`employee-applications-filter-option ${value === option ? "active" : ""}`}
                                onClick={() => {
                                    onChange(option);
                                    handleDropdownToggle(id, false);
                                }}
                            >
                                {option || "All"}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Get job filter display value
    const getJobFilterValue = () => {
        if (!filters.jobIds || filters.jobIds.length === 0) return "";
        if (filters.jobIds.length === 1) {
            // Try to find job in current jobs list
            const job = jobs.find(j => j._id === filters.jobIds[0]);
            return job?.jobTitle || "1 job";
        }
        return `${filters.jobIds.length} jobs`;
    };

    // Render filter controls
    const renderFilterControls = (variant) => {
        const hasActiveFilters = activeFiltersCount > 0;
        
        return (
            <div className={`employee-applications-filters ${variant === "mobile" ? "employee-applications-filters-mobile" : ""}`}>
                <FilterDropdown
                    id="status"
                    label="Status"
                    value={filters.status}
                    options={statusOptions}
                    onChange={(value) => handleFilterChange("status", value)}
                />
                <FilterDropdown
                    id="submission-type"
                    label="Submission Type"
                    value={filters.submissionType}
                    options={submissionTypeOptions}
                    onChange={(value) => handleFilterChange("submissionType", value)}
                />
                <div className="employee-applications-filter-group">
                    <button
                        type="button"
                        className={`employee-applications-filter-toggle ${openDropdownId === "job" ? "open" : ""}`}
                        onClick={() => {
                            if (openDropdownId === "job") {
                                setOpenDropdownId(null);
                                setShowJobFilterDrawer(false);
                            } else {
                                setOpenDropdownId("job");
                                setShowJobFilterDrawer(true);
                            }
                        }}
                    >
                        <div className="employee-applications-filter-toggle-text">
                            <span className="employee-applications-filter-label">Job</span>
                            <span className="employee-applications-filter-value">{getJobFilterValue() || "All"}</span>
                        </div>
                        <HiChevronDown className={`employee-applications-filter-arrow ${openDropdownId === "job" ? 'open' : ''}`} />
                    </button>
                </div>
                {hasActiveFilters && (
                    <button
                        type="button"
                        className={`employee-applications-clear-filters-btn ${variant === "mobile" ? "employee-applications-clear-filters-btn-mobile" : ""}`}
                        onClick={handleClearFilters}
                    >
                        <FaTimesCircle />
                        <span>Clear Filters</span>
                    </button>
                )}
            </div>
        );
    };

    if (!mounted) {
        return (
            <div className="employee-applications-container">
                <div className="employee-applications-loading">
                    <CircularProgress />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const showSkeleton = isLoading || !data;

    return (
        <div className="employee-applications-container">
            <Toaster position="top-right" />
            <div className="employee-applications-wrapper">
                {/* Header */}
                <div className="employee-applications-header">
                    <div>
                        <h1 className="employee-applications-title">Applications</h1>
                        <p className="employee-applications-subtitle">
                            Manage and review job applications
                        </p>
                    </div>
                    <div className="employee-applications-summary">
                        <div className="employee-applications-summary-card">
                            <span className="employee-applications-summary-label">Total Applications</span>
                            <span className="employee-applications-summary-value">{summary.totalApplications || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Search and Actions */}
                <div className="employee-applications-toolbar">
                    <div className="employee-applications-search-wrapper">
                        <FaSearch className="employee-applications-search-icon" />
                        <input
                            type="text"
                            className="employee-applications-search-input"
                            placeholder="Search by candidate name, email, job title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="employee-applications-actions-row">
                        {/* Filter Button - Mobile */}
                        <button
                            type="button"
                            className="employee-applications-filter-btn mobile-only"
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                        >
                            <FaFilter />
                            <span>Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="employee-applications-filter-badge">{activeFiltersCount}</span>
                            )}
                        </button>

                        {/* Desktop Filters */}
                        <div className="employee-applications-filters desktop-only">
                            {renderFilterControls("desktop")}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="employee-applications-sort" ref={sortDropdownRef}>
                            <button
                                type="button"
                                className="employee-applications-sort-btn"
                                onClick={() => {
                                    setShowSortDropdown(!showSortDropdown);
                                    // Close any open filter dropdowns
                                    if (!showSortDropdown) {
                                        setOpenDropdownId(null);
                                    }
                                }}
                            >
                                <FaSort />
                                <span>Sort</span>
                                <HiChevronDown className={`employee-applications-sort-arrow ${showSortDropdown ? 'open' : ''}`} />
                            </button>
                            {showSortDropdown && (
                                <div className="employee-applications-sort-dropdown">
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            className={`employee-applications-sort-option ${filters.sort === option.value ? 'active' : ''}`}
                                            onClick={() => {
                                                handleFilterChange("sort", option.value);
                                                setShowSortDropdown(false);
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Filter Drawer */}
                {showMobileFilters && (
                    <>
                        <div className="employee-applications-mobile-overlay" onClick={closeMobileFilters}></div>
                        <div className="employee-applications-mobile-drawer">
                            <div className="employee-applications-drawer-header">
                                <h3>Filters</h3>
                                <button 
                                    type="button"
                                    className="employee-applications-drawer-close-btn"
                                    onClick={closeMobileFilters}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="employee-applications-drawer-content">
                                {renderFilterControls("mobile")}
                            </div>
                        </div>
                    </>
                )}

                {/* Applications List */}
                <div className="employee-applications-content">
                    {showSkeleton ? (
                        <div className="employee-applications-loading">
                            <CircularProgress />
                            <p>Loading applications...</p>
                        </div>
                    ) : error ? (
                        <div className="employee-applications-error">
                            <p>{error.message || "Failed to load applications"}</p>
                            <button 
                                type="button"
                                className="employee-applications-error-retry-btn"
                                onClick={() => queryClient.invalidateQueries({ queryKey: employerApplicationsKeys.lists() })}
                            >
                                Retry
                            </button>
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="employee-applications-empty">
                            <FaUser className="employee-applications-empty-icon" />
                            <h2>No applications found</h2>
                            <p>Applications will appear here when candidates apply to your jobs</p>
                        </div>
                    ) : (
                        <>
                            <div className="employee-applications-list">
                                {applications.map((application) => {
                                    const visibleSkills = Array.isArray(application.candidateSkills) && application.candidateSkills.length > 0
                                        ? application.candidateSkills.slice(0, 5)
                                        : [];
                                    const hasMoreSkills = Array.isArray(application.candidateSkills) && application.candidateSkills.length > 5;

                                    return (
                                        <div
                                            key={application.applicationId}
                                            className="employee-applications-card"
                                        >
                                            {/* Job Details Section - Top */}
                                            <div className="employee-applications-card-job-section">
                                                <div className="employee-applications-card-job-header">
        <div>
                                                        <h3 className="employee-applications-card-job-title">{application.jobTitle}</h3>
                                                        <p className="employee-applications-card-job-company">{application.companyName}</p>
                                                    </div>
                                                    <span className={`employee-applications-status-badge ${buildStatusClass(application.status)}`}>
                                                        {application.status || "pending"}
                                                    </span>
                                                </div>
                                                <div className="employee-applications-card-job-meta">
                                                    <span>
                                                        <FaMapMarkerAlt className="employee-applications-meta-icon" />
                                                        {application.location}
                                                    </span>
                                                    <span>
                                                        <FaBriefcase className="employee-applications-meta-icon" />
                                                        {application.jobType}
                                                    </span>
                                                    <span>
                                                        <FaBuilding className="employee-applications-meta-icon" />
                                                        {application.workMode}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Candidate Details Section */}
                                            <div className="employee-applications-card-candidate-section">
                                                <div className="employee-applications-card-candidate-header">
                                                    <div className="employee-applications-card-candidate-avatar">
                                                        <span>{application.candidateInitial}</span>
                                                    </div>
                                                    <div className="employee-applications-card-candidate-info">
                                                        <h4 className="employee-applications-card-candidate-name">{application.candidateName || "Candidate"}</h4>
                                                        <div className="employee-applications-card-candidate-details">
                                                            <span>
                                                                <FaEnvelope className="employee-applications-detail-icon" />
                                                                {application.candidateEmail || "N/A"}
                                                            </span>
                                                            {application.candidateExperience !== null && application.candidateExperience !== undefined && (
                                                                <span>
                                                                    <FaBriefcase className="employee-applications-detail-icon" />
                                                                    {application.candidateExperience} {application.candidateExperience === 1 ? "year" : "years"} exp.
                                                                </span>
                                                            )}
                                                            {application.candidateQualification && (
                                                                <span>
                                                                    <FaGraduationCap className="employee-applications-detail-icon" />
                                                                    {application.candidateQualification}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {visibleSkills.length > 0 && (
                                                    <div className="employee-applications-card-candidate-skills">
                                                        <FaCode className="employee-applications-skills-icon" />
                                                        <div className="employee-applications-skills-list">
                                                            {visibleSkills.map((skill, idx) => (
                                                                <span key={`${application.applicationId}-skill-${idx}`} className="employee-applications-skill-tag">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {hasMoreSkills && (
                                                                <span className="employee-applications-skill-tag employee-applications-skill-tag-more">
                                                                    & {application.candidateSkills.length - 5} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="employee-applications-card-candidate-footer">
                                                    <div className="employee-applications-card-candidate-meta">
                                                        <span className="employee-applications-card-date">
                                                            <FaCalendarAlt className="employee-applications-date-icon" />
                                                            Applied {formatRelativeTime(application.appliedAt)}
                                                        </span>
                                                        <span className="employee-applications-card-submission">
                                                            {formatSubmissionType(application.submissionType)}
                                                        </span>
                                                    </div>
                                                    <div className="employee-applications-card-actions">
                                                        <button
                                                            type="button"
                                                            className="employee-applications-update-status-btn"
                                                            onClick={() => handleOpenStatusModal(application)}
                                                        >
                                                            <FaEdit />
                                                            <span>Update Status</span>
                                                        </button>
                                                        {((application.hasBasicTest || application.hasVideoTest) || 
                                                          (application.submissionType === 'basic-test' || 
                                                           application.submissionType === 'video-test' || 
                                                           application.submissionType === 'basic+video')) && (
                                                            <button
                                                                type="button"
                                                                className="employee-applications-summary-btn"
                                                                onClick={() => handleViewTestSummary(application)}
                                                            >
                                                                <FaEye />
                                                                <span>View Summary</span>
                                                            </button>
                                                        )}
                                                        {application.candidateResume && (
                                                            <button
                                                                type="button"
                                                                className="employee-applications-resume-btn"
                                                                onClick={() => handleViewResume(application)}
                                                            >
                                                                <FaFilePdf />
                                                                <span>View Resume</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="employee-applications-pagination">
                                    <button
                                        type="button"
                                        className="employee-applications-pagination-btn"
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={!pagination.hasPrevPage || isLoading}
                                    >
                                        <FaChevronLeft />
                                        Previous
                                    </button>
                                    <div className="employee-applications-pagination-info">
                                        Page {pagination.currentPage} of {pagination.totalPages}
                                    </div>
                                    <button
                                        type="button"
                                        className="employee-applications-pagination-btn"
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

            {/* Status Update Modal */}
            {showStatusModal && selectedApplication && (
                <>
                    <div 
                        className="employee-applications-modal-overlay"
                        onClick={handleCloseStatusModal}
                    ></div>
                    <div className="employee-applications-status-modal">
                        <div className="employee-applications-status-modal-header">
                            <h3>Update Application Status</h3>
                            <button
                                type="button"
                                className="employee-applications-status-modal-close-btn"
                                onClick={handleCloseStatusModal}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="employee-applications-status-modal-body">
                            <div className="employee-applications-status-modal-info">
                                <p><strong>Candidate:</strong> {selectedApplication.candidateName || "N/A"}</p>
                                <p><strong>Job:</strong> {selectedApplication.jobTitle}</p>
                                <p><strong>Current Status:</strong> <span className={`employee-applications-status-badge ${buildStatusClass(selectedApplication.status)}`}>{selectedApplication.status || "pending"}</span></p>
                            </div>

                            <div className="employee-applications-status-options">
                                <label className="employee-applications-status-modal-label">Select New Status</label>
                                <div className="employee-applications-status-options-grid">
                                    {[
                                        { value: "pending", label: "Pending Review", color: "#f59e0b" },
                                        { value: "reviewed", label: "Reviewed", color: "#3b82f6" },
                                        { value: "shortlisted", label: "Shortlisted", color: "#10b981" },
                                        { value: "rejected", label: "Rejected", color: "#ef4444" }
                                    ].map((statusOption) => (
                                        <button
                                            key={statusOption.value}
                                            type="button"
                                            className={`employee-applications-status-option ${selectedStatus === statusOption.value ? "selected" : ""}`}
                                            onClick={() => setSelectedStatus(statusOption.value)}
                                            style={{
                                                borderColor: selectedStatus === statusOption.value ? statusOption.color : "#e5e7eb",
                                                backgroundColor: selectedStatus === statusOption.value ? `${statusOption.color}15` : "white"
                                            }}
                                        >
                                            <div 
                                                className="employee-applications-status-option-indicator"
                                                style={{ backgroundColor: statusOption.color }}
                                            ></div>
                                            <span>{statusOption.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="employee-applications-status-email-option">
                                <label className="employee-applications-status-email-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={sendEmailNotification}
                                        onChange={(e) => setSendEmailNotification(e.target.checked)}
                                        disabled={updateStatusMutation.isPending}
                                    />
                                    <span>Send email notification to candidate</span>
                                </label>
                            </div>
                        </div>
                        <div className="employee-applications-status-modal-footer">
                            <button
                                type="button"
                                className="employee-applications-status-modal-cancel-btn"
                                onClick={handleCloseStatusModal}
                                disabled={updateStatusMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="employee-applications-status-modal-update-btn"
                                onClick={handleUpdateStatus}
                                disabled={updateStatusMutation.isPending || !selectedStatus || selectedStatus === selectedApplication.status}
                            >
                                {updateStatusMutation.isPending ? (
                                    <>
                                        <CircularProgress size={16} sx={{ color: "white", mr: 1 }} />
                                        Updating...
                                    </>
                                ) : (
                                    "Update Status"
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Close Confirmation Modal */}
                    {showCloseConfirmation && (
                        <>
                            <div 
                                className="employee-applications-modal-overlay"
                                style={{ zIndex: 3002 }}
                                onClick={() => setShowCloseConfirmation(false)}
                            ></div>
                            <div className="employee-applications-close-confirmation-modal">
                                <div className="employee-applications-close-confirmation-header">
                                    <h3>Exit Status Update?</h3>
                                    <button
                                        type="button"
                                        className="employee-applications-close-confirmation-close-btn"
                                        onClick={() => setShowCloseConfirmation(false)}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                                <div className="employee-applications-close-confirmation-body">
                                    <p className="employee-applications-close-confirmation-text">
                                        The status update is in progress. Are you sure you want to exit? The update will continue in the background.
                                    </p>
                                    <div className="employee-applications-close-confirmation-actions">
                                        <button
                                            type="button"
                                            className="employee-applications-close-confirmation-btn-secondary"
                                            onClick={() => setShowCloseConfirmation(false)}
                                        >
                                            Continue Updating
                                        </button>
                                        <button
                                            type="button"
                                            className="employee-applications-close-confirmation-btn-primary"
                                            onClick={handleConfirmClose}
                                        >
                                            Exit Update
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Backward Status Change Confirmation Modal */}
                    {showBackwardStatusConfirmation && selectedApplication && pendingStatusUpdate && (
                        <>
                            <div 
                                className="employee-applications-modal-overlay"
                                style={{ zIndex: 3002 }}
                                onClick={handleCancelBackwardStatus}
                            ></div>
                            <div className="employee-applications-backward-status-confirmation-modal">
                                <div className="employee-applications-backward-status-confirmation-header">
                                    <h3>Move to Earlier Status?</h3>
                                    <button
                                        type="button"
                                        className="employee-applications-backward-status-confirmation-close-btn"
                                        onClick={handleCancelBackwardStatus}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                                <div className="employee-applications-backward-status-confirmation-body">
                                    <p className="employee-applications-backward-status-confirmation-text">
                                        You are about to change the status from <strong>{getStatusLabel(selectedApplication.status || 'pending')}</strong> to <strong>{getStatusLabel(pendingStatusUpdate.status)}</strong>.
                                    </p>
                                    <p className="employee-applications-backward-status-confirmation-text">
                                        This will move the application to an earlier stage in the hiring process. Are you sure you want to proceed?
                                    </p>
                                    <div className="employee-applications-backward-status-confirmation-actions">
                                        <button
                                            type="button"
                                            className="employee-applications-backward-status-confirmation-btn-secondary"
                                            onClick={handleCancelBackwardStatus}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="employee-applications-backward-status-confirmation-btn-primary"
                                            onClick={handleConfirmBackwardStatus}
                                        >
                                            Yes, Update Status
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Job Filter Drawer */}
            {showJobFilterDrawer && (
                <>
                    <div 
                        className="employee-applications-job-filter-overlay"
                        onClick={handleDiscardJobFilter}
                    ></div>
                    <div className="employee-applications-job-filter-drawer">
                        <div className="employee-applications-job-filter-header">
                            <h3>Filter by Job</h3>
                            <button
                                type="button"
                                className="employee-applications-job-filter-close-btn"
                                onClick={handleDiscardJobFilter}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="employee-applications-job-filter-search">
                            <FaSearch className="employee-applications-job-filter-search-icon" />
                            <input
                                type="text"
                                className="employee-applications-job-filter-search-input"
                                placeholder="Search jobs by title, company, location..."
                                value={jobSearchQuery}
                                onChange={(e) => setJobSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="employee-applications-job-filter-content">
                            {isLoadingJobs ? (
                                <div className="employee-applications-job-filter-loading">
                                    <CircularProgress />
                                    <p>Loading jobs...</p>
                                </div>
                            ) : jobs.length === 0 ? (
                                <div className="employee-applications-job-filter-empty">
                                    <FaBriefcase />
                                    <p>No jobs found</p>
                                </div>
                            ) : (
                                <>
                                    <div className="employee-applications-job-filter-list">
                                        {jobs.map((job) => (
                                            <div
                                                key={job._id}
                                                className={`employee-applications-job-filter-item ${selectedJobIds.includes(job._id) ? "selected" : ""}`}
                                                onClick={() => handleJobToggle(job._id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedJobIds.includes(job._id)}
                                                    onChange={() => handleJobToggle(job._id)}
                                                    className="employee-applications-job-filter-checkbox"
                                                />
                                                <div className="employee-applications-job-filter-item-content">
                                                    <h4 className="employee-applications-job-filter-item-title">{job.jobTitle}</h4>
                                                    <div className="employee-applications-job-filter-item-meta">
                                                        <span>
                                                            <FaBuilding className="employee-applications-job-filter-meta-icon" />
                                                            {job.companyName}
                                                        </span>
                                                        {job.location && (
                                                            <span>
                                                                <FaMapMarkerAlt className="employee-applications-job-filter-meta-icon" />
                                                                {job.location}
                                                            </span>
                                                        )}
                                                        {job.jobType && (
                                                            <span>
                                                                <FaBriefcase className="employee-applications-job-filter-meta-icon" />
                                                                {job.jobType}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {jobsPagination.totalPages > 1 && (
                                        <div className="employee-applications-job-filter-pagination">
                                            <button
                                                type="button"
                                                className="employee-applications-job-filter-pagination-btn"
                                                onClick={() => setJobFilterPage(prev => Math.max(1, prev - 1))}
                                                disabled={!jobsPagination.hasPrevPage || isLoadingJobs}
                                            >
                                                <FaChevronLeft />
                                                Previous
                                            </button>
                                            <div className="employee-applications-job-filter-pagination-info">
                                                Page {jobsPagination.currentPage} of {jobsPagination.totalPages}
                                            </div>
                                            <button
                                                type="button"
                                                className="employee-applications-job-filter-pagination-btn"
                                                onClick={() => setJobFilterPage(prev => prev + 1)}
                                                disabled={!jobsPagination.hasNextPage || isLoadingJobs}
                                            >
                                                Next
                                                <FaChevronRight />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="employee-applications-job-filter-footer">
                            <button
                                type="button"
                                className="employee-applications-job-filter-discard-btn"
                                onClick={handleDiscardJobFilter}
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                className="employee-applications-job-filter-apply-btn"
                                onClick={handleApplyJobFilter}
                            >
                                Apply ({selectedJobIds.length})
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Test Summary Modal */}
            {showTestSummaryModal && (
                <>
                    <div 
                        className="employee-applications-modal-overlay"
                        onClick={handleCloseTestSummaryModal}
                        style={{ zIndex: 3000 }}
                    ></div>
                    <div className="employee-applications-test-summary-modal" style={{ zIndex: 3001 }}>
                        <div className="employee-applications-test-summary-modal-header">
                            <h3>Test Assessment Summary</h3>
                            <button
                                type="button"
                                className="employee-applications-test-summary-modal-close-btn"
                                onClick={handleCloseTestSummaryModal}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="employee-applications-test-summary-modal-body">
                            {testSummaryLoading ? (
                                <div className="employee-applications-test-summary-loading">
                                    <CircularProgress size={40} />
                                    <p>Loading test summary...</p>
                                </div>
                            ) : testSummaryData ? (
                                <>
                                    {/* Candidate Info */}
                                    <div className="employee-applications-test-summary-candidate">
                                        <div className="employee-applications-test-summary-candidate-avatar">
                                            <span>{testSummaryData.candidateName?.[0]?.toUpperCase() || "C"}</span>
                                        </div>
                                        <div className="employee-applications-test-summary-candidate-info">
                                            <h4>{testSummaryData.candidateName || "Candidate"}</h4>
                                            <p>{testSummaryData.candidateEmail || "N/A"}</p>
                                            <div className="employee-applications-test-summary-candidate-meta">
                                                {testSummaryData.candidateExperience !== null && (
                                                    <span>{testSummaryData.candidateExperience} {testSummaryData.candidateExperience === 1 ? "year" : "years"} exp.</span>
                                                )}
                                                {testSummaryData.candidateQualification && (
                                                    <span>{testSummaryData.candidateQualification}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Job Info */}
                                    <div className="employee-applications-test-summary-job">
                                        <h4>{testSummaryData.jobTitle}</h4>
                                        <p>{testSummaryData.companyName}</p>
                                    </div>

                                    {/* Basic Test Section */}
                                    {testSummaryData.basicTest && (
                                        <div className="employee-applications-test-summary-section">
                                            <div className="employee-applications-test-summary-section-header">
                                                <h3>Basic Assessment</h3>
                                                <span className="employee-applications-test-summary-badge passed">
                                                    <FaCheckCircle /> Passed
                                                </span>
                                            </div>
                                            
                                            {testSummaryData.basicTest.currentAttempt && (
                                                <>
                                                    {/* Score Chart */}
                                                    <div className="employee-applications-test-summary-score-card">
                                                        <div className="employee-applications-test-summary-score-donut">
                                                            <div className="employee-applications-test-summary-score-value">
                                                                {testSummaryData.basicTest.currentAttempt.score}
                                                                <span>/100</span>
                                                            </div>
                                                        </div>
                                                        <div className="employee-applications-test-summary-score-details">
                                                            <div className="employee-applications-test-summary-score-item">
                                                                <span className="employee-applications-test-summary-score-indicator correct"></span>
                                                                <span>Correct: {testSummaryData.basicTest.currentAttempt.technicalSummary.correctAnswers}/{testSummaryData.basicTest.currentAttempt.technicalSummary.totalQuestions}</span>
                                                            </div>
                                                            <div className="employee-applications-test-summary-score-item">
                                                                <span className="employee-applications-test-summary-score-indicator incorrect"></span>
                                                                <span>Incorrect: {testSummaryData.basicTest.currentAttempt.technicalSummary.incorrectAnswers}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Readiness Review */}
                                                    {testSummaryData.basicTest.currentAttempt.readinessReview && (
                                                        <div className="employee-applications-test-summary-review">
                                                            <h4>Readiness Assessment</h4>
                                                            <p className="employee-applications-test-summary-review-summary">
                                                                {testSummaryData.basicTest.currentAttempt.readinessReview.summary}
                                                            </p>
                                                            <div className="employee-applications-test-summary-review-verdict">
                                                                <strong>Fit Verdict:</strong> {testSummaryData.basicTest.currentAttempt.readinessReview.fitVerdict}
                                                            </div>
                                                            
                                                            {testSummaryData.basicTest.currentAttempt.readinessReview.highlights && testSummaryData.basicTest.currentAttempt.readinessReview.highlights.length > 0 && (
                                                                <div className="employee-applications-test-summary-review-section">
                                                                    <h5>Highlights</h5>
                                                                    <ul>
                                                                        {testSummaryData.basicTest.currentAttempt.readinessReview.highlights.map((item, idx) => (
                                                                            <li key={idx}>{item}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            
                                                            {testSummaryData.basicTest.currentAttempt.readinessReview.concerns && testSummaryData.basicTest.currentAttempt.readinessReview.concerns.length > 0 && (
                                                                <div className="employee-applications-test-summary-review-section">
                                                                    <h5>Concerns</h5>
                                                                    <ul>
                                                                        {testSummaryData.basicTest.currentAttempt.readinessReview.concerns.map((item, idx) => (
                                                                            <li key={idx}>{item}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            
                                                            {testSummaryData.basicTest.currentAttempt.readinessReview.recommendations && testSummaryData.basicTest.currentAttempt.readinessReview.recommendations.length > 0 && (
                                                                <div className="employee-applications-test-summary-review-section">
                                                                    <h5>Recommendations</h5>
                                                                    <ul>
                                                                        {testSummaryData.basicTest.currentAttempt.readinessReview.recommendations.map((item, idx) => (
                                                                            <li key={idx}>{item}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Readiness Responses */}
                                                    {testSummaryData.basicTest.currentAttempt.readinessPairs && testSummaryData.basicTest.currentAttempt.readinessPairs.length > 0 && (
                                                        <div className="employee-applications-test-summary-readiness">
                                                            <h4>Readiness Responses</h4>
                                                            <ol>
                                                                {testSummaryData.basicTest.currentAttempt.readinessPairs.map((pair, idx) => (
                                                                    <li key={idx}>
                                                                        <strong>{pair.question}</strong>
                                                                        <p>{pair.answer || "Not answered"}</p>
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    )}

                                                    {/* Attempt History */}
                                                    {testSummaryData.basicTest.allAttempts && testSummaryData.basicTest.allAttempts.length > 1 && (
                                                        <div className="employee-applications-test-summary-attempts">
                                                            <h4>Attempt History</h4>
                                                            <div className="employee-applications-test-summary-attempts-chart">
                                                                {testSummaryData.basicTest.allAttempts.map((attempt, idx) => (
                                                                    <div key={idx} className="employee-applications-test-summary-attempt-item">
                                                                        <div className="employee-applications-test-summary-attempt-bar">
                                                                            <div 
                                                                                className="employee-applications-test-summary-attempt-bar-fill"
                                                                                style={{ 
                                                                                    width: `${attempt.score || 0}%`,
                                                                                    backgroundColor: attempt.status === 'passed' ? '#10b981' : '#ef4444'
                                                                                }}
                                                                            ></div>
                                                                        </div>
                                                                        <div className="employee-applications-test-summary-attempt-info">
                                                                            <span>Attempt #{attempt.attemptNumber}</span>
                                                                            <strong>{attempt.score || 0}/100</strong>
                                                                            <span className={`employee-applications-test-summary-attempt-status ${attempt.status}`}>
                                                                                {attempt.status}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Video Test Section */}
                                    {testSummaryData.videoTest && (
                                        <div className="employee-applications-test-summary-section">
                                            <div className="employee-applications-test-summary-section-header">
                                                <h3>Video Proctoring Assessment</h3>
                                                <span className={`employee-applications-test-summary-badge ${testSummaryData.videoTest.attempt.hasPassed ? 'passed' : 'failed'}`}>
                                                    {testSummaryData.videoTest.attempt.hasPassed ? (
                                                        <> <FaCheckCircle /> Passed</>
                                                    ) : (
                                                        <> <FaExclamationTriangle /> Failed</>
                                                    )}
                                                </span>
                                            </div>
                                            
                                            {testSummaryData.videoTest.attempt && (
                                                <>
                                                    {/* Score Card */}
                                                    <div className="employee-applications-test-summary-score-card">
                                                        <div className="employee-applications-test-summary-score-donut">
                                                            <div className="employee-applications-test-summary-score-value">
                                                                {testSummaryData.videoTest.attempt.finalScore || 0}
                                                                <span>/100</span>
                                                            </div>
                                                        </div>
                                                        <div className="employee-applications-test-summary-score-details">
                                                            <div className="employee-applications-test-summary-score-item">
                                                                <span className="employee-applications-test-summary-score-indicator correct"></span>
                                                                <span>Correct: {testSummaryData.videoTest.attempt.correctAnswers}/{testSummaryData.videoTest.attempt.totalQuestions}</span>
                                                            </div>
                                                            <div className="employee-applications-test-summary-score-item">
                                                                <span className="employee-applications-test-summary-score-indicator incorrect"></span>
                                                                <span>Incorrect: {testSummaryData.videoTest.attempt.incorrectAnswers}</span>
                                                            </div>
                                                            {testSummaryData.videoTest.attempt.unanswered > 0 && (
                                                                <div className="employee-applications-test-summary-score-item">
                                                                    <span className="employee-applications-test-summary-score-indicator unanswered"></span>
                                                                    <span>Unanswered: {testSummaryData.videoTest.attempt.unanswered}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* AI Summary */}
                                                    {testSummaryData.videoTest.attempt.aiSummary && (
                                                        <div className="employee-applications-test-summary-review">
                                                            <h4>AI Assessment Summary</h4>
                                                            <p className="employee-applications-test-summary-review-summary">
                                                                {testSummaryData.videoTest.attempt.aiSummary.summary}
                                                            </p>
                                                            
                                                            {testSummaryData.videoTest.attempt.aiSummary.highlights && testSummaryData.videoTest.attempt.aiSummary.highlights.length > 0 && (
                                                                <div className="employee-applications-test-summary-review-section">
                                                                    <h5>Highlights</h5>
                                                                    <ul>
                                                                        {testSummaryData.videoTest.attempt.aiSummary.highlights.map((item, idx) => (
                                                                            <li key={idx}>{item}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            
                                                            {testSummaryData.videoTest.attempt.aiSummary.concerns && testSummaryData.videoTest.attempt.aiSummary.concerns.length > 0 && (
                                                                <div className="employee-applications-test-summary-review-section">
                                                                    <h5>Concerns</h5>
                                                                    <ul>
                                                                        {testSummaryData.videoTest.attempt.aiSummary.concerns.map((item, idx) => (
                                                                            <li key={idx}>{item}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            
                                                            {testSummaryData.videoTest.attempt.aiSummary.riskScore !== null && testSummaryData.videoTest.attempt.aiSummary.riskScore !== undefined && (
                                                                <div className="employee-applications-test-summary-risk-score">
                                                                    <strong>Risk Score:</strong> {testSummaryData.videoTest.attempt.aiSummary.riskScore} / 100
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Video Link */}
                                                    {testSummaryData.videoTest.attempt.videoUrl && (
                                                        <div className="employee-applications-test-summary-video">
                                                            <h4>Recording</h4>
                                                            <a 
                                                                href={testSummaryData.videoTest.attempt.videoUrl} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="employee-applications-test-summary-video-link"
                                                            >
                                                                View Video Recording
                                                            </a>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="employee-applications-test-summary-empty">
                                    <p>No test summary available</p>
                                </div>
                            )}
                        </div>
                        <div className="employee-applications-test-summary-modal-footer">
                            <button
                                type="button"
                                className="employee-applications-test-summary-modal-close-footer-btn"
                                onClick={handleCloseTestSummaryModal}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ApplicationsPageClient;
