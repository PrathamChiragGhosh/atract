"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { 
    FaSearch, FaFilter, FaSort, FaEye, FaEdit, FaTrash, FaBriefcase, 
    FaBuilding, FaMapMarkerAlt, FaCalendarAlt, FaDollarSign, FaUsers,
    FaTimes, FaChevronLeft, FaChevronRight, FaCheckCircle, FaClock, 
    FaStopCircle, FaCheck, FaSync, FaShare, FaUserCheck, FaShareAlt, FaUpload
} from "react-icons/fa";
import { HiChevronDown } from "react-icons/hi2";
import { useEmployerJobs, useDeleteJob, useUpdateJob, employerJobsKeys } from "@/hooks/useEmployerJobs";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "react-hot-toast";
import Cookies from "js-cookie";
import EditJobModal from "@/components/editJobModal/EditJobModal";
import SocialShareModal from "@/components/socialShareModal/SocialShareModal";
import SingleJobSocialShareModal from "@/components/singleJobSocialShareModal/SingleJobSocialShareModal";
import BulkSocialShareProgressIndicator from "@/components/bulkSocialShareProgressIndicator/BulkSocialShareProgressIndicator";
import CandidateUploadModal from "@/components/candidateUploadModal/CandidateUploadModal";
import { useBackgroundGeneration } from "@/contexts/BackgroundGenerationContext";
import "./page.css";

const MyJobsScreen = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [mounted, setMounted] = useState(false);
    
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
    const [showStatusFilter, setShowStatusFilter] = useState(false);
    const [showJobTypeFilter, setShowJobTypeFilter] = useState(false);
    const [showWorkModeFilter, setShowWorkModeFilter] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [jobToDelete, setJobToDelete] = useState(null);
    const [jobToEdit, setJobToEdit] = useState(null);
    const [jobToUpdateStatus, setJobToUpdateStatus] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [showSocialShareModal, setShowSocialShareModal] = useState(false);
    const [showSingleJobSocialShareModal, setShowSingleJobSocialShareModal] = useState(false);
    const [selectedJobForSocialShare, setSelectedJobForSocialShare] = useState(null);
    const [showCandidateUploadModal, setShowCandidateUploadModal] = useState(false);
    const [selectedJobForUpload, setSelectedJobForUpload] = useState(null);
    
    // Bulk social share progress state
    const [bulkProgress, setBulkProgress] = useState(0);
    const [isBulkActive, setIsBulkActive] = useState(false);
    const [isBulkCompleted, setIsBulkCompleted] = useState(false);
    const [isBulkError, setIsBulkError] = useState(false);
    const [bulkErrorMessage, setBulkErrorMessage] = useState('');
    const progressIntervalRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    
    const { activeTasks } = useBackgroundGeneration();
    
    // Refs
    const sortDropdownRef = useRef(null);
    const statusFilterRef = useRef(null);
    const jobTypeFilterRef = useRef(null);
    const workModeFilterRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);
    const [viewers, setViewers] = useState([]);
    const [viewersLoading, setViewersLoading] = useState(false);
    const [viewerSearch, setViewerSearch] = useState("");
    const [viewerSource, setViewerSource] = useState("all"); // all | login | prompt
    const [activeViewTab, setActiveViewTab] = useState("details"); // details | viewers
    const [downloadingViewers, setDownloadingViewers] = useState(false);
    const [viewerFilterOpen, setViewerFilterOpen] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to first page on search
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

    // Cleanup intervals on unmount
    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);
    
    // Handle bulk social share generation start
    const handleBulkGenerationStart = (initialPendingCount) => {
        // Initialize progress state
        setBulkProgress(0);
        setIsBulkActive(true);
        setIsBulkCompleted(false);
        setIsBulkError(false);
        setBulkErrorMessage('');

        // Start progress simulation (0-90%)
        let simulatedProgress = 0;
        const isActiveRef = { current: true };
        progressIntervalRef.current = setInterval(() => {
            if (simulatedProgress < 90 && isActiveRef.current) {
                simulatedProgress = Math.min(simulatedProgress + 2, 90);
                setBulkProgress(simulatedProgress);
            } else if (!isActiveRef.current) {
                if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current);
                    progressIntervalRef.current = null;
                }
            }
        }, 300);

        // Start polling for completion
        const pollForCompletion = async () => {
            const maxAttempts = 180; // 180 attempts = 90 seconds max
            const pollInterval = 500; // Poll every 500ms
            
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    // Refetch pending count to check progress
                    await queryClient.invalidateQueries({ queryKey: ['socialShare', 'pendingCount'] });
                    
                    // Wait a bit for the query to update
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Get the updated pending count from cache
                    const pendingCountData = queryClient.getQueryData(['socialShare', 'pendingCount']);
                    const currentPendingCount = pendingCountData?.pendingCount ?? initialPendingCount;
                    
                    // Calculate actual progress based on completed jobs
                    const completed = initialPendingCount - currentPendingCount;
                    const actualProgress = initialPendingCount > 0 
                        ? Math.min(Math.floor((completed / initialPendingCount) * 90), 90)
                        : 0;
                    
                    // Update progress (use actual progress if higher than simulated)
                    if (actualProgress > simulatedProgress) {
                        simulatedProgress = actualProgress;
                        setBulkProgress(actualProgress);
                    }
                    
                    // If pending count is 0, all jobs have been processed
                    if (currentPendingCount === 0) {
                        // Stop progress simulation
                        isActiveRef.current = false;
                        
                        // Clear progress interval
                        if (progressIntervalRef.current) {
                            clearInterval(progressIntervalRef.current);
                            progressIntervalRef.current = null;
                        }
                        
                        // Set to 100%
                        setBulkProgress(100);
                        
                        // Wait a bit to show 100%
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Refresh jobs list to get updated social share content
                        await queryClient.invalidateQueries({ queryKey: employerJobsKeys.lists() });
                        
                        // Mark as completed
                        setIsBulkActive(false);
                        setIsBulkCompleted(true);
                        
                        toast.success(`Social share generated successfully for ${initialPendingCount} job(s)!`);
                        return;
                    }
                    
                    // Wait before next poll
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                } catch (pollError) {
                    console.error('Polling error:', pollError);
                    // Continue polling
                }
            }
            
            // If we reach here, polling timed out
            // Check final status
            await queryClient.invalidateQueries({ queryKey: ['socialShare', 'pendingCount'] });
            await new Promise(resolve => setTimeout(resolve, 200));
            const finalPendingData = queryClient.getQueryData(['socialShare', 'pendingCount']);
            const finalPendingCount = finalPendingData?.pendingCount || 0;
            const completed = initialPendingCount - finalPendingCount;
            
            // Stop progress simulation
            isActiveRef.current = false;
            
            // Clear progress interval
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            
            if (completed > 0) {
                setBulkProgress(100);
                setIsBulkActive(false);
                setIsBulkCompleted(true);
                toast.success(`Social share generated for ${completed} out of ${initialPendingCount} job(s). ${finalPendingCount} job(s) may still be processing.`);
            } else {
                setIsBulkActive(false);
                setIsBulkError(true);
                setBulkErrorMessage('Generation timed out. Please check back later or refresh the page.');
                toast.error('Generation timed out. Please check back later or refresh the page.');
            }
        };

        // Start polling
        pollForCompletion().catch((error) => {
            console.error('Background generation error:', error);
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
            setIsBulkActive(false);
            setIsBulkError(true);
            setBulkErrorMessage(error.message || 'Failed to generate social share. Please try again.');
            toast.error(error.message || 'Failed to generate social share. Please try again.');
        });
    };
    
    const handleDismissBulkProgress = () => {
        setIsBulkActive(false);
        setIsBulkCompleted(false);
        setIsBulkError(false);
        setBulkProgress(0);
        setBulkErrorMessage('');
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    // Prevent body scroll when status modal is open
    useEffect(() => {
        if (showStatusModal) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';

            return () => {
                // Restore scroll position when modal closes
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [showStatusModal]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setShowSortDropdown(false);
            }
            if (statusFilterRef.current && !statusFilterRef.current.contains(event.target)) {
                setShowStatusFilter(false);
            }
            if (jobTypeFilterRef.current && !jobTypeFilterRef.current.contains(event.target)) {
                setShowJobTypeFilter(false);
            }
            if (workModeFilterRef.current && !workModeFilterRef.current.contains(event.target)) {
                setShowWorkModeFilter(false);
            }
        };

        if (showSortDropdown || showStatusFilter || showJobTypeFilter || showWorkModeFilter) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSortDropdown, showStatusFilter, showJobTypeFilter, showWorkModeFilter]);

    // Close dropdowns on scroll (mobile only)
    useEffect(() => {
        if (!isMobile) return;

        const handleScroll = () => {
            setShowSortDropdown(false);
            setShowStatusFilter(false);
            setShowJobTypeFilter(false);
            setShowWorkModeFilter(false);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isMobile]);

    // Update dropdown positions on mobile when opened
    useEffect(() => {
        if (!isMobile) return;

        const updateDropdownPositions = () => {
            if (showStatusFilter && statusFilterRef.current) {
                const rect = statusFilterRef.current.querySelector('.custom-dropdown-select')?.getBoundingClientRect();
                if (rect) {
                    const menu = statusFilterRef.current.querySelector('.custom-dropdown-menu');
                    if (menu) {
                        menu.style.top = rect.bottom + 4 + 'px';
                        menu.style.left = rect.left + 'px';
                        menu.style.width = rect.width + 'px';
                    }
                }
            }
            if (showJobTypeFilter && jobTypeFilterRef.current) {
                const rect = jobTypeFilterRef.current.querySelector('.custom-dropdown-select')?.getBoundingClientRect();
                if (rect) {
                    const menu = jobTypeFilterRef.current.querySelector('.custom-dropdown-menu');
                    if (menu) {
                        menu.style.top = rect.bottom + 4 + 'px';
                        menu.style.left = rect.left + 'px';
                        menu.style.width = rect.width + 'px';
                    }
                }
            }
            if (showWorkModeFilter && workModeFilterRef.current) {
                const rect = workModeFilterRef.current.querySelector('.custom-dropdown-select')?.getBoundingClientRect();
                if (rect) {
                    const menu = workModeFilterRef.current.querySelector('.custom-dropdown-menu');
                    if (menu) {
                        menu.style.top = rect.bottom + 4 + 'px';
                        menu.style.left = rect.left + 'px';
                        menu.style.width = rect.width + 'px';
                    }
                }
            }
            if (showSortDropdown && sortDropdownRef.current) {
                const rect = sortDropdownRef.current.querySelector('.sort-btn')?.getBoundingClientRect();
                if (rect) {
                    const menu = sortDropdownRef.current.querySelector('.sort-dropdown-menu');
                    if (menu) {
                        const menuWidth = 220; // min-width from CSS
                        const viewportWidth = window.innerWidth;
                        const spaceOnRight = viewportWidth - rect.right;
                        const spaceOnLeft = rect.left;
                        
                        // Position from left edge
                        let left = rect.left;
                        
                        // If menu would overflow on right, align to right edge of button
                        if (spaceOnRight < menuWidth) {
                            left = rect.right - menuWidth;
                            // If still overflows on left, align to left edge of screen
                            if (left < 0) {
                                left = 16; // Add some padding from screen edge
                                // Constrain width to fit screen
                                menu.style.width = (viewportWidth - 32) + 'px';
                            } else {
                                menu.style.width = menuWidth + 'px';
                            }
                        } else {
                            menu.style.width = menuWidth + 'px';
                        }
                        
                        menu.style.top = rect.bottom + 8 + 'px';
                        menu.style.left = left + 'px';
                    }
                }
            }
        };

        if (showStatusFilter || showJobTypeFilter || showWorkModeFilter || showSortDropdown) {
            updateDropdownPositions();
        }
    }, [isMobile, showStatusFilter, showJobTypeFilter, showWorkModeFilter, showSortDropdown]);

    // Fetch jobs with filters
    const filters = {
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        status: statusFilter,
        jobType: jobTypeFilter,
        workMode: workModeFilter,
        sortBy,
        sortOrder,
    };

    const { data: jobsData, isLoading, error, refetch } = useEmployerJobs(filters);
    const deleteJobMutation = useDeleteJob();
    const updateJobMutation = useUpdateJob();

    // Fetch total jobs count without filters
    const totalJobsFilters = {
        page: 1,
        limit: 1,
        search: "",
        status: "",
        jobType: "",
        workMode: "",
        sortBy: "createdAt",
        sortOrder: "desc"
    };
    const { data: totalJobsData } = useEmployerJobs(totalJobsFilters);

    const jobs = jobsData?.data || [];
    const pagination = jobsData?.pagination || {};
    const totalJobsCount = totalJobsData?.pagination?.totalJobs || 0;
    const filteredJobsCount = pagination.totalJobs || 0;

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

    // Handle view job
    const handleViewJob = (job) => {
        setSelectedJob(job);
        setShowViewModal(true);
        setActiveViewTab("details");
        setViewers([]);
        setViewerSearch("");
    };

    // Handle edit job (open edit modal)
    const handleEditJob = (job) => {
        setJobToEdit(job);
        setShowEditModal(true);
    };

    // Handle edit success
    const handleEditSuccess = () => {
        refetch(); // Refetch jobs after successful update
        setShowEditModal(false);
        setJobToEdit(null);
    };

    // Handle delete job
    const handleDeleteJob = async () => {
        if (!jobToDelete) return;

        try {
            await deleteJobMutation.mutateAsync(jobToDelete._id);
            setShowDeleteModal(false);
            setJobToDelete(null);
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    // Handle update status
    const handleUpdateStatus = async () => {
        if (!jobToUpdateStatus || !selectedStatus) return;

        try {
            await updateJobMutation.mutateAsync({
                jobId: jobToUpdateStatus._id,
                data: { status: selectedStatus }
            });
            setShowStatusModal(false);
            setJobToUpdateStatus(null);
            setSelectedStatus("");
            refetch(); // Refetch jobs after successful update
        } catch (error) {
            console.error("Update status error:", error);
        }
    };

    // Handle open status modal
    const handleOpenStatusModal = (job) => {
        setJobToUpdateStatus(job);
        setSelectedStatus(job.status);
        setShowStatusModal(true);
    };

    // Handle share job (copy link to clipboard)
    const handleShareJob = async (job) => {
        if (!job.shortId) {
            toast.error("Job link is not available. Please try again later.");
            return;
        }

        const jobUrl = `${window.location.origin}/${job.shortId}`;
        
        try {
            await navigator.clipboard.writeText(jobUrl);
            toast.success("Job link copied to clipboard!");
        } catch (error) {
            console.error("Failed to copy link:", error);
            // Fallback: select text in a temporary input
            const input = document.createElement('input');
            input.value = jobUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            toast.success("Job link copied to clipboard!");
        }
    };

    const fetchViewers = async (jobId, query = "", source = "all") => {
        const token = Cookies.get("emp_token");
        if (!token) return;
        setViewersLoading(true);
        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_JOB_URL}/${jobId}/viewers`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        ...(query ? { q: query } : {}),
                        ...(source && source !== "all" ? { source } : {})
                    }
                }
            );
            if (response.data.success) {
                setViewers(response.data.data || []);
            } else {
                setViewers([]);
            }
        } catch (err) {
            console.error("Failed to load viewers", err);
            setViewers([]);
        } finally {
            setViewersLoading(false);
        }
    };

    // Load viewers when tab active or search changes
    useEffect(() => {
        if (activeViewTab !== "viewers" || !selectedJob?._id) return;
        const timer = setTimeout(() => {
            fetchViewers(selectedJob._id, viewerSearch, viewerSource);
        }, 300);
        return () => clearTimeout(timer);
    }, [activeViewTab, selectedJob?._id, viewerSearch, viewerSource]);

    const handleDownloadViewers = () => {
        if (!viewers.length) {
            toast.error("No viewer data to download.");
            return;
        }
        setDownloadingViewers(true);
        try {
            const header = ["Email", "Viewed At"];
            const rows = viewers.map(v => [
                v.email || "",
                v.viewedAt ? new Date(v.viewedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""
            ]);
            const csvContent = [header, ...rows]
                .map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
                .join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const safeName = (selectedJob?.jobTitle || "job")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
            link.setAttribute("download", `job-viewers-${safeName || "export"}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download viewers failed", err);
            toast.error("Failed to download viewers.");
        } finally {
            setDownloadingViewers(false);
        }
    };

    // Handle generate social share
    const handleGenerateSocialShare = () => {
        setShowSocialShareModal(true);
    };

    // Handle social share for individual job
    const handleSocialShareJob = (job) => {
        setSelectedJobForSocialShare(job);
        setShowSingleJobSocialShareModal(true);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    // Format salary
    const formatSalary = (min, max) => {
        if (!min && !max) return "Not specified";
        if (min && max) return `₹${(min / 100000).toFixed(1)}L - ₹${(max / 100000).toFixed(1)}L`;
        if (min) return `₹${(min / 100000).toFixed(1)}L+`;
        if (max) return `Up to ₹${(max / 100000).toFixed(1)}L`;
        return "Not specified";
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case "Active":
                return "status-badge status-active";
            case "Draft":
                return "status-badge status-draft";
            case "Inactive":
                return "status-badge status-inactive";
            case "Closed":
                return "status-badge status-closed";
            default:
                return "status-badge";
        }
    };

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case "Active":
                return <FaCheckCircle />;
            case "Draft":
                return <FaClock />;
            case "Inactive":
                return <FaStopCircle />;
            case "Closed":
                return <FaStopCircle />;
            default:
                return null;
        }
    };

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter("");
        setJobTypeFilter("");
        setWorkModeFilter("");
        setSortBy("createdAt");
        setSortOrder("desc");
        setCurrentPage(1);
    };

    // Count active filters
    const activeFiltersCount = [
        debouncedSearch,
        statusFilter,
        jobTypeFilter,
        workModeFilter,
    ].filter(Boolean).length;

    if (!mounted) {
        return (
            <div className="my-jobs-container">
                <div className="my-jobs-loading">
                    <CircularProgress />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="my-jobs-container">
            <Toaster position="top-right" />
            {/* Header */}
            <div className="my-jobs-header">
                <div className="header-content">
                    <div className="header-title-row">
                        <div>
                            <h1 className="page-title">
                                <FaBriefcase className="title-icon" />
                                My Jobs
                            </h1>
                            <p className="page-subtitle">
                                Manage and track all your job postings
                            </p>
                            <div className="jobs-count-info">
                                <span className="count-item">
                                    Total Jobs: <strong>{totalJobsCount}</strong>
                                </span>
                                {(activeFiltersCount > 0 || debouncedSearch) && (
                                    <span className="count-item">
                                        Filtered: <strong>{filteredJobsCount}</strong>
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            className="generate-social-share-btn"
                            onClick={handleGenerateSocialShare}
                            title="Generate Social Share"
                        >
                            <FaShareAlt />
                            Generate Social Share
                        </button>
                    </div>
                </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="search-filters-bar">
                {/* Search */}
                <div className="search-container">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search jobs by title, company, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                {/* Filters Toggle */}
                <div className="filters-actions">
                    <button
                        className={`filters-toggle-btn ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FaFilter />
                        Filters
                        {activeFiltersCount > 0 && (
                            <span className="filter-count">{activeFiltersCount}</span>
                        )}
                    </button>

                    {/* Sort Dropdown */}
                    <div className={`sort-dropdown-wrapper ${showSortDropdown ? 'dropdown-open' : ''}`} ref={sortDropdownRef}>
                        <button
                            className="sort-btn"
                            onClick={() => {
                                setShowSortDropdown(!showSortDropdown);
                                // Close filter panel and filter dropdowns when opening sort
                                if (!showSortDropdown) {
                                    setShowFilters(false);
                                    setShowStatusFilter(false);
                                    setShowJobTypeFilter(false);
                                    setShowWorkModeFilter(false);
                                }
                            }}
                        >
                            <FaSort />
                            Sort
                            <HiChevronDown className={`sort-arrow ${showSortDropdown ? 'open' : ''}`} />
                        </button>
                        {showSortDropdown && (
                            <div className="sort-dropdown-menu">
                                <div className="sort-option-group">
                                    <label>Sort By</label>
                                    {sortOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            className={`sort-option ${sortBy === option.value ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSortBy(option.value);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {option.label}
                                            {sortBy === option.value && <FaCheck className="check-icon" />}
                                        </div>
                                    ))}
                                </div>
                                <div className="sort-option-group">
                                    <label>Order</label>
                                    <div
                                        className={`sort-option ${sortOrder === 'desc' ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSortOrder('desc');
                                            setCurrentPage(1);
                                        }}
                                    >
                                        Descending
                                        {sortOrder === 'desc' && <FaCheck className="check-icon" />}
                                    </div>
                                    <div
                                        className={`sort-option ${sortOrder === 'asc' ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSortOrder('asc');
                                            setCurrentPage(1);
                                        }}
                                    >
                                        Ascending
                                        {sortOrder === 'asc' && <FaCheck className="check-icon" />}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="filters-panel">
                        <div className={`filter-group ${showStatusFilter ? 'dropdown-open' : ''}`}>
                        <label>Status</label>
                        <div className={`custom-dropdown-wrapper ${showStatusFilter ? 'dropdown-open' : ''}`} ref={statusFilterRef}>
                            <div
                                className="custom-dropdown-select"
                                onClick={() => {
                                    setShowStatusFilter(!showStatusFilter);
                                    setShowJobTypeFilter(false);
                                    setShowWorkModeFilter(false);
                                }}
                            >
                                <span>{statusFilter || "All Statuses"}</span>
                                <HiChevronDown className={`dropdown-arrow ${showStatusFilter ? 'open' : ''}`} />
                            </div>
                            {showStatusFilter && (
                                <div className="custom-dropdown-menu">
                                    {statusOptions.map((status) => (
                                        <div
                                            key={status || "all"}
                                            className={`custom-dropdown-item ${statusFilter === status ? 'selected' : ''}`}
                                            onClick={() => {
                                                setStatusFilter(status);
                                                setShowStatusFilter(false);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {status || "All Statuses"}
                                            {statusFilter === status && <FaCheck className="check-icon" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`filter-group ${showJobTypeFilter ? 'dropdown-open' : ''}`}>
                        <label>Job Type</label>
                        <div className={`custom-dropdown-wrapper ${showJobTypeFilter ? 'dropdown-open' : ''}`} ref={jobTypeFilterRef}>
                            <div
                                className="custom-dropdown-select"
                                onClick={() => {
                                    setShowJobTypeFilter(!showJobTypeFilter);
                                    setShowStatusFilter(false);
                                    setShowWorkModeFilter(false);
                                }}
                            >
                                <span>{jobTypeFilter || "All Types"}</span>
                                <HiChevronDown className={`dropdown-arrow ${showJobTypeFilter ? 'open' : ''}`} />
                            </div>
                            {showJobTypeFilter && (
                                <div className="custom-dropdown-menu">
                                    {jobTypeOptions.map((type) => (
                                        <div
                                            key={type || "all"}
                                            className={`custom-dropdown-item ${jobTypeFilter === type ? 'selected' : ''}`}
                                            onClick={() => {
                                                setJobTypeFilter(type);
                                                setShowJobTypeFilter(false);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {type || "All Types"}
                                            {jobTypeFilter === type && <FaCheck className="check-icon" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={`filter-group ${showWorkModeFilter ? 'dropdown-open' : ''}`}>
                        <label>Work Mode</label>
                        <div className={`custom-dropdown-wrapper ${showWorkModeFilter ? 'dropdown-open' : ''}`} ref={workModeFilterRef}>
                            <div
                                className="custom-dropdown-select"
                                onClick={() => {
                                    setShowWorkModeFilter(!showWorkModeFilter);
                                    setShowStatusFilter(false);
                                    setShowJobTypeFilter(false);
                                }}
                            >
                                <span>{workModeFilter || "All Modes"}</span>
                                <HiChevronDown className={`dropdown-arrow ${showWorkModeFilter ? 'open' : ''}`} />
                            </div>
                            {showWorkModeFilter && (
                                <div className="custom-dropdown-menu">
                                    {workModeOptions.map((mode) => (
                                        <div
                                            key={mode || "all"}
                                            className={`custom-dropdown-item ${workModeFilter === mode ? 'selected' : ''}`}
                                            onClick={() => {
                                                setWorkModeFilter(mode);
                                                setShowWorkModeFilter(false);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {mode || "All Modes"}
                                            {workModeFilter === mode && <FaCheck className="check-icon" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {activeFiltersCount > 0 && (
                        <button className="clear-filters-btn" onClick={clearFilters}>
                            Clear All Filters
                        </button>
                    )}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="my-jobs-error">
                    {error.message || "Failed to load jobs. Please try again."}
                </div>
            )}

            {/* Jobs List */}
            {isLoading ? (
                <div className="my-jobs-loading">
                    <CircularProgress />
                    <p>Loading jobs...</p>
                </div>
            ) : jobs.length === 0 ? (
                <div className="my-jobs-empty">
                    <FaBriefcase className="empty-icon" />
                    <h3>No jobs found</h3>
                    <p>
                        {activeFiltersCount > 0
                            ? "Try adjusting your filters or search query"
                            : "Start by posting your first job"}
                    </p>
                    {activeFiltersCount === 0 && (
                        <button
                            className="post-job-btn"
                            onClick={() => router.push("/employer/post-job")}
                        >
                            Post a Job
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Jobs Grid */}
                    <div className="jobs-grid">
                        {jobs.map((job) => {
                            const skillHighlights = Array.isArray(job.skills) && job.skills.length > 0
                                ? job.skills.slice(0, 5)
                                : [];
                            const hasMoreSkills = Array.isArray(job.skills) && job.skills.length > 5;

                            return (
                                <div
                                    key={job._id}
                                    className="job-card"
                                    onClick={() => handleViewJob(job)}
                                >
                                    <div className="job-card-header">
                                        <div className="job-title-section">
                                            <h3 className="job-title">{job.jobTitle}</h3>
                                            <div className={getStatusBadgeClass(job.status)}>
                                                {getStatusIcon(job.status)}
                                                <span>{job.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="job-card-body">
                                        <div className="job-info-row">
                                            <FaBuilding className="info-icon" />
                                            <span>{job.companyName}</span>
                                        </div>
                                        <div className="job-info-row">
                                            <FaMapMarkerAlt className="info-icon" />
                                            <span>{job.location}</span>
                                        </div>
                                        <div className="job-info-row">
                                            <FaBriefcase className="info-icon" />
                                            <span>{job.jobType}</span>
                                            <span className="separator">•</span>
                                            <span>{job.workMode}</span>
                                            {job.numberOfOpenings && (
                                                <>
                                                    <span className="separator">•</span>
                                                    <span>{job.numberOfOpenings} openings</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="job-info-row">
                                            <FaDollarSign className="info-icon" />
                                            <span>{formatSalary(job.minSalary, job.maxSalary)}</span>
                                        </div>
                                        <div className="job-info-row">
                                            <FaCalendarAlt className="info-icon" />
                                            <span>
                                                Opens: {formatDate(job.applicationOpeningDate)}
                                            </span>
                                        </div>
                                        <div className="job-info-row">
                                            <FaCalendarAlt className="info-icon" />
                                            <span>
                                                Closes: {formatDate(job.applicationClosingDate)}
                                            </span>
                                        </div>

                                        {skillHighlights.length > 0 && (
                                            <div className="job-card-skills">
                                                {skillHighlights.map((skill, idx) => (
                                                    <span key={`${job._id}-skill-${idx}`} className="job-skill-tag">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {hasMoreSkills && (
                                                    <span className="job-skill-tag job-skill-tag-more">
                                                        & more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="job-card-footer">
                                        <div className="job-stats">
                                            <span className="stat-item">
                                                <FaUsers className="stat-icon" />
                                                {job.applicationsCount || 0} Applications
                                            </span>
                                            <span className="stat-item">
                                                <FaEye className="stat-icon" />
                                                {job.views || 0} Views
                                            </span>
                                            <span className="posted-date">
                                                Posted {formatDate(job.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="job-card-actions">
                                        <button
                                            className="action-btn share-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleShareJob(job);
                                            }}
                                            title="Share Job"
                                        >
                                            <FaShare />
                                        </button>
                                        <button
                                            className={`action-btn social-share-btn ${job.socialShareContent ? "has-share" : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSocialShareJob(job);
                                            }}
                                            title="Generate Social Share"
                                        >
                                            <FaShareAlt />
                                            {job.socialShareContent && <FaCheckCircle className="social-share-check" />}
                                        </button>
                                        <button
                                            className="action-btn applications-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/employer/applications?jobId=${job._id}`);
                                            }}
                                            title="View Applications"
                                        >
                                            <FaUserCheck />
                                        </button>
                                        <button
                                            className="action-btn upload-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedJobForUpload(job);
                                                setShowCandidateUploadModal(true);
                                            }}
                                            title="Upload Candidates"
                                        >
                                            <FaUpload />
                                        </button>
                                        <div className="action-buttons-right">
                                            <button
                                                className="action-btn status-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenStatusModal(job);
                                                }}
                                                title="Update Status"
                                            >
                                                <FaSync />
                                            </button>
                                            <button
                                                className="action-btn edit-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditJob(job);
                                                }}
                                                title="Edit Job"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                className="action-btn delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setJobToDelete(job);
                                                    setShowDeleteModal(true);
                                                }}
                                                title="Delete Job"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={!pagination.hasPrevPage || isLoading}
                            >
                                <FaChevronLeft />
                                Previous
                            </button>

                            <div className="pagination-info">
                                Page {pagination.currentPage} of {pagination.totalPages}
                                <span className="total-jobs">
                                    ({pagination.totalJobs} total jobs)
                                </span>
                            </div>

                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={!pagination.hasNextPage || isLoading}
                            >
                                Next
                                <FaChevronRight />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* View Job Modal */}
            {showViewModal && selectedJob && (
                <>
                    <div className="view-modal-overlay" onClick={() => setShowViewModal(false)}></div>
                    <div className="job-details-modal">
                        <div className="modal-header">
                            <h2>Job Details</h2>
                            <button
                                className="modal-close-btn"
                                onClick={() => setShowViewModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="job-view-tabs">
                                <button
                                    className={`job-view-tab ${activeViewTab === "details" ? "active" : ""}`}
                                    onClick={() => setActiveViewTab("details")}
                                >
                                    Details
                                </button>
                                <button
                                    className={`job-view-tab ${activeViewTab === "viewers" ? "active" : ""}`}
                                    onClick={() => {
                                        setViewerSearch("");
                                        setViewerSource("all");
                                        setActiveViewTab("viewers");
                                        if (selectedJob?._id) {
                                            fetchViewers(selectedJob._id, "", "all");
                                        }
                                    }}
                                >
                                    Viewers
                                </button>
                            </div>

                            {activeViewTab === "details" && (
                                <>
                                    <div className="detail-section">
                                        <h3>{selectedJob.jobTitle}</h3>
                                        <div className={getStatusBadgeClass(selectedJob.status)}>
                                            {getStatusIcon(selectedJob.status)}
                                            <span>{selectedJob.status}</span>
                                        </div>
                                    </div>

                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <label>Company Name</label>
                                            <span>{selectedJob.companyName}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Job Type</label>
                                            <span>{selectedJob.jobType}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Department</label>
                                            <span>{selectedJob.department || "N/A"}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Employment Type</label>
                                            <span>{selectedJob.employmentType || "N/A"}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Location</label>
                                            <span>{selectedJob.location}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Work Mode</label>
                                            <span>{selectedJob.workMode}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Experience</label>
                                            <span>{selectedJob.experience || "N/A"}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Qualification</label>
                                            <span>{selectedJob.highestQualification || "N/A"}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Number of Openings</label>
                                            <span>{selectedJob.numberOfOpenings || "N/A"}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Salary Range</label>
                                            <span>{formatSalary(selectedJob.minSalary, selectedJob.maxSalary)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Opening Date</label>
                                            <span>{formatDate(selectedJob.applicationOpeningDate)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Closing Date</label>
                                            <span>{formatDate(selectedJob.applicationClosingDate)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <label>Hiring Manager Email</label>
                                            <span>{selectedJob.hiringManagerEmail}</span>
                                        </div>
                                    </div>

                                    {selectedJob.jobDescription && (
                                        <div className="detail-section">
                                            <h4>Job Description</h4>
                                            <p>{selectedJob.jobDescription}</p>
                                        </div>
                                    )}

                                    {selectedJob.responsibilities && (
                                        <div className="detail-section">
                                            <h4>Responsibilities</h4>
                                            <p>{selectedJob.responsibilities}</p>
                                        </div>
                                    )}

                                    {selectedJob.requirements && (
                                        <div className="detail-section">
                                            <h4>Requirements</h4>
                                            <p>{selectedJob.requirements}</p>
                                        </div>
                                    )}

                                    {selectedJob.skills && selectedJob.skills.length > 0 && (
                                        <div className="detail-section">
                                            <h4>Key Skills</h4>
                                            <div className="modal-skill-chips">
                                                {selectedJob.skills.map((skill, idx) => (
                                                    <span key={`${selectedJob._id}-skill-${idx}`} className="modal-skill-chip">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedJob.perksAndBenefits && (
                                        <div className="detail-section">
                                            <h4>Perks & Benefits</h4>
                                            <p>{selectedJob.perksAndBenefits}</p>
                                        </div>
                                    )}

                                    <div className="detail-stats">
                                        <div className="stat-card">
                                            <FaUsers className="stat-icon" />
                                            <span className="stat-value">{selectedJob.applicationsCount || 0}</span>
                                            <span className="stat-label">Applications</span>
                                        </div>
                                        <div className="stat-card">
                                            <FaEye className="stat-icon" />
                                            <span className="stat-value">{selectedJob.views || 0}</span>
                                            <span className="stat-label">Views</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeViewTab === "viewers" && (
                                <div className="viewers-tab">
                                    <div className="viewers-search">
                                        <div className="viewers-search-input">
                                            <FaSearch />
                                            <input
                                                type="text"
                                                value={viewerSearch}
                                                onChange={(e) => setViewerSearch(e.target.value)}
                                                placeholder="Search viewer emails"
                                            />
                                        </div>
                                        <div className="viewers-filter-wrapper">
                                            <button
                                                type="button"
                                                className={`viewers-filter-toggle ${viewerSource !== "all" ? "active" : ""}`}
                                                onClick={() => setViewerFilterOpen((prev) => !prev)}
                                                title="Toggle filter source"
                                            >
                                                {viewerSource === "all" ? "All" : viewerSource === "login" ? "Logged in" : "From prompt"}
                                            </button>
                                            <div
                                                className={`viewers-filter-dropdown ${viewerFilterOpen ? "open" : ""}`}
                                                onMouseLeave={() => setViewerFilterOpen(false)}
                                            >
                                                <button
                                                    type="button"
                                                    className={`viewers-filter-option ${viewerSource === "all" ? "selected" : ""}`}
                                                    onClick={() => {
                                                        setViewerSource("all");
                                                        setViewerFilterOpen(false);
                                                    }}
                                                >
                                                    All
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`viewers-filter-option ${viewerSource === "login" ? "selected" : ""}`}
                                                    onClick={() => {
                                                        setViewerSource("login");
                                                        setViewerFilterOpen(false);
                                                    }}
                                                >
                                                    Logged in
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`viewers-filter-option ${viewerSource === "prompt" ? "selected" : ""}`}
                                                    onClick={() => {
                                                        setViewerSource("prompt");
                                                        setViewerFilterOpen(false);
                                                    }}
                                                >
                                                    From prompt
                                                </button>
                                            </div>
                                        </div>
                                        {viewers.length > 0 && (
                                            <button
                                                type="button"
                                                className="viewers-download-btn"
                                                onClick={handleDownloadViewers}
                                                disabled={downloadingViewers || viewersLoading}
                                            >
                                                {downloadingViewers ? "Downloading..." : "Download CSV"}
                                            </button>
                                        )}
                                    </div>
                                    {viewersLoading && viewers.length === 0 ? (
                                        <div className="viewers-empty">Loading viewers...</div>
                                    ) : viewers.length === 0 ? (
                                        <div className="viewers-empty">No viewers yet.</div>
                                    ) : (
                                        <div className="viewers-list">
                                            {viewers.map((viewer, idx) => (
                                                <div key={`${viewer.email}-${idx}`} className="viewer-row">
                                                    <div className="viewer-email">
                                                        {viewer.email || "N/A"}
                                                        <span className={`viewer-pill ${viewer.isLogin ? "pill-login" : "pill-guest"}`}>
                                                            {viewer.isLogin ? "Logged in" : "From prompt"}
                                                        </span>
                                                    </div>
                                                    <div className="viewer-time">
                                                        {viewer.viewedAt
                                                            ? new Date(viewer.viewedAt).toLocaleString("en-IN", {
                                                                dateStyle: "medium",
                                                                timeStyle: "short"
                                                            })
                                                            : "N/A"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="modal-btn secondary-btn"
                                onClick={() => setShowViewModal(false)}
                            >
                                Close
                            </button>
                            <button
                                className="modal-btn primary-btn"
                                onClick={() => {
                                    setShowViewModal(false);
                                    setJobToEdit(selectedJob);
                                    setShowEditModal(true);
                                }}
                            >
                                <FaEdit />
                                Edit Job
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && jobToDelete && (
                <>
                    <div className="delete-modal-overlay" onClick={() => setShowDeleteModal(false)}></div>
                    <div className="delete-modal">
                        <div className="modal-header">
                            <h2>Delete Job</h2>
                            <button
                                className="modal-close-btn"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>
                                Are you sure you want to delete <strong>"{jobToDelete.jobTitle}"</strong>?
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="modal-btn secondary-btn"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleteJobMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                className="modal-btn delete-btn-modal"
                                onClick={handleDeleteJob}
                                disabled={deleteJobMutation.isPending}
                            >
                                {deleteJobMutation.isPending ? (
                                    <>
                                        <CircularProgress size={14} sx={{ color: "white", mr: 1 }} />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <FaTrash />
                                        Delete Job
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Edit Job Modal */}
            {showEditModal && jobToEdit && (
                <EditJobModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setJobToEdit(null);
                    }}
                    jobId={jobToEdit._id}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Update Status Modal */}
            {showStatusModal && jobToUpdateStatus && (
                <>
                    <div className="status-modal-overlay" onClick={() => setShowStatusModal(false)}></div>
                    <div className="status-update-modal">
                        <div className="modal-header">
                            <h2>Update Job Status</h2>
                            <button
                                className="modal-close-btn"
                                onClick={() => setShowStatusModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="job-info-preview">
                                <h3>{jobToUpdateStatus.jobTitle}</h3>
                                <p className="company-name">{jobToUpdateStatus.companyName}</p>
                            </div>
                            <div className="status-selection">
                                <label>Select Status</label>
                                <div className="status-options">
                                    {["Draft", "Active", "Inactive", "Closed"].map((status) => (
                                        <div
                                            key={status}
                                            className={`status-option ${selectedStatus === status ? 'selected' : ''}`}
                                            onClick={() => setSelectedStatus(status)}
                                        >
                                            <div className="status-indicator">
                                                {getStatusIcon(status)}
                                            </div>
                                            <span>{status}</span>
                                            {selectedStatus === status && (
                                                <FaCheck className="check-icon" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="modal-btn secondary-btn"
                                onClick={() => setShowStatusModal(false)}
                                disabled={updateJobMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                className="modal-btn primary-btn"
                                onClick={handleUpdateStatus}
                                disabled={updateJobMutation.isPending || !selectedStatus || selectedStatus === jobToUpdateStatus.status}
                            >
                                {updateJobMutation.isPending ? (
                                    <>
                                        <CircularProgress size={14} sx={{ color: "white", mr: 1 }} />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <FaSync />
                                        Update Status
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Social Share Modal */}
            <SocialShareModal
                isOpen={showSocialShareModal}
                onClose={() => setShowSocialShareModal(false)}
                onBulkGenerationStart={handleBulkGenerationStart}
            />
            
            {/* Bulk Social Share Progress Indicator */}
            <BulkSocialShareProgressIndicator
                progress={bulkProgress}
                isActive={isBulkActive}
                isCompleted={isBulkCompleted}
                isError={isBulkError}
                errorMessage={bulkErrorMessage}
                onDismiss={handleDismissBulkProgress}
            />

            {/* Single Job Social Share Modal */}
            <SingleJobSocialShareModal
                isOpen={showSingleJobSocialShareModal}
                onClose={() => {
                    setShowSingleJobSocialShareModal(false);
                    setSelectedJobForSocialShare(null);
                }}
                job={selectedJobForSocialShare}
            />

            {/* Candidate Upload Modal */}
            <CandidateUploadModal
                isOpen={showCandidateUploadModal}
                onClose={() => {
                    setShowCandidateUploadModal(false);
                    setSelectedJobForUpload(null);
                }}
                job={selectedJobForUpload}
            />
        </div>
    );
};

export default MyJobsScreen;

