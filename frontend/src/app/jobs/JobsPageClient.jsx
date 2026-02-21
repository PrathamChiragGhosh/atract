"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircularProgress } from "@mui/material";
import axios from "axios";
import Cookies from "js-cookie";
import { Toaster, toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
    FaBriefcase, FaBuilding, FaMapMarkerAlt, FaMoneyBillAlt, FaCalendarAlt,
    FaFilter, FaTimes, FaBookmark, FaRegBookmark,
    FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import AIResumeBanner from "@/components/promotionalBanner/AIResumeBanner";
import LoginModal from "@/components/loginModal/LoginModal";
import { savedJobsKeys } from "@/hooks/useSavedJobs";
import { getJobApiBaseUrl } from "@/lib/api";
import "./page.css";

const Page = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [savedJobs, setSavedJobs] = useState(() => new Set());
    const [savingJobId, setSavingJobId] = useState(null);
    const [isJobSeekerLoggedIn, setIsJobSeekerLoggedIn] = useState(false);
    const [jobSeekerToken, setJobSeekerToken] = useState(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const isInitialMount = useRef(true);
    const prevFiltersRef = useRef(null);
    const prevPageRef = useRef(null);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        const syncAuthState = () => {
            const token = Cookies.get("js_token");
            if (token) {
                setIsJobSeekerLoggedIn(true);
                setJobSeekerToken(token);
            } else {
                setIsJobSeekerLoggedIn(false);
                setJobSeekerToken(null);
                setSavedJobs(() => new Set());
            }
        };

        syncAuthState();
        window.addEventListener("auth-updated", syncAuthState);
        return () => window.removeEventListener("auth-updated", syncAuthState);
    }, []);

    // Filters state - arrays for multi-select
    const [filters, setFilters] = useState({
        department: [],
        jobType: [],
        employmentType: [],
        experience: [],
        workMode: [],
        location: [],
        highestQualification: [],
        salaryRange: [],
        numberOfOpenings: [],
        freshness: [],
        openingDateFreshness: []
    });

    // Filter options - matching post job screen
    const departmentOptions = [
        "IT/Software", "Sales & Marketing", "HR", "Finance", "Operations",
        "Engineering", "Product", "Design", "Customer Support", "Legal",
        "Administration", "Manufacturing", "Healthcare", "Education", "Other"
    ];
    const jobTypeOptions = ["Full-time", "Part-time", "Internship", "Freelance", "Contract", "Temporary"];
    const employmentTypeOptions = ["Permanent", "Contract", "Temporary"];
    const workModeOptions = ["Onsite", "Hybrid", "Remote"];
    const experienceOptions = [
        "Fresher", "0-1 years", "1-2 years", "2-3 years", "3-5 years",
        "5-7 years", "7-10 years", "10+ years"
    ];
    const locationOptions = [
        "Bangalore, Karnataka", "Mumbai, Maharashtra", "Delhi NCR", "Hyderabad, Telangana",
        "Pune, Maharashtra", "Chennai, Tamil Nadu", "Kolkata, West Bengal", "Ahmedabad, Gujarat",
        "Jaipur, Rajasthan", "Chandigarh, Punjab", "Indore, Madhya Pradesh", "Gurgaon, Haryana",
        "Noida, Uttar Pradesh", "Kochi, Kerala", "Coimbatore, Tamil Nadu", "Goa", "Remote", "Other"
    ];
    const qualificationOptions = [
        "10th Pass", "12th Pass", "Diploma", "Bachelor's Degree", "Master's Degree",
        "MBA", "Ph.D.", "Professional Degree", "Technical Certification", "Other"
    ];
    const salaryRangeOptions = [
        { min: 0, max: 500000, label: "0-5 Lakhs" },
        { min: 500000, max: 1000000, label: "5-10 Lakhs" },
        { min: 1000000, max: 1500000, label: "10-15 Lakhs" },
        { min: 1500000, max: 2000000, label: "15-20 Lakhs" },
        { min: 2000000, max: 2500000, label: "20-25 Lakhs" },
        { min: 2500000, max: 3000000, label: "25-30 Lakhs" },
        { min: 3000000, max: 5000000, label: "30-50 Lakhs" },
        { min: 5000000, max: 10000000, label: "50+ Lakhs" }
    ];
    const numberOfOpeningsOptions = [
        { value: "1-10", label: "Less than 10" },
        { value: "11-50", label: "Less than 50" },
        { value: "51-100", label: "Less than 100" },
        { value: "101-200", label: "Less than 200" },
        { value: "201-300", label: "Less than 300" },
        { value: "300+", label: "300+" }
    ];
    const freshnessOptions = [
        { value: "", label: "Any time" },
        { value: "today", label: "Today" },
        { value: "week", label: "Past week" },
        { value: "month", label: "Past month" }
    ];

    // Count active filters
    const activeFiltersCount = Object.values(filters).filter(val => {
        return Array.isArray(val) && val.length > 0;
    }).length;

    const fetchJobs = async (filtersToUse = filters, pageToUse = currentPage) => {
        // Prevent duplicate fetches
        if (isFetchingRef.current) {
            return;
        }
        isFetchingRef.current = true;

        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: pageToUse.toString(),
                limit: "20"
            });

            // Add filters to params
            Object.entries(filtersToUse).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        if (v) {
                            // Handle salary range objects
                            if (key === "salaryRange" && typeof v === "object") {
                                params.append("minSalary", v.min);
                                params.append("maxSalary", v.max);
                            } else {
                                params.append(key, v);
                            }
                        }
                    });
                }
            });

            const response = await axios.get(
                `${getJobApiBaseUrl()}/public?${params.toString()}`
            );

            if (response.data.success) {
                setJobs(response.data.data);
                setPagination(response.data.pagination);
            } else {
                setError("Failed to load jobs");
            }
        } catch (err) {
            console.error("Fetch jobs error:", err);
            setError(err.response?.data?.message || "Failed to load jobs");
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        // Load filters from URL params
        const params = new URLSearchParams(searchParams);
        // Reconstruct salaryRange from minSalary/maxSalary pairs
        const minSalaries = params.getAll("minSalary");
        const maxSalaries = params.getAll("maxSalary");
        const salaryRange = [];
        for (let i = 0; i < Math.min(minSalaries.length, maxSalaries.length); i++) {
            salaryRange.push({
                min: parseInt(minSalaries[i]),
                max: parseInt(maxSalaries[i])
            });
        }

        const urlFilters = {
            department: params.getAll("department") || [],
            jobType: params.getAll("jobType") || [],
            employmentType: params.getAll("employmentType") || [],
            experience: params.getAll("experience") || [],
            workMode: params.getAll("workMode") || [],
            location: params.getAll("location") || [],
            highestQualification: params.getAll("highestQualification") || [],
            salaryRange: salaryRange,
            numberOfOpenings: params.getAll("numberOfOpenings") || [],
            freshness: params.getAll("freshness") || [],
            openingDateFreshness: params.getAll("openingDateFreshness") || []
        };
        const page = parseInt(params.get("page")) || 1;
        
        // Check if filters or page actually changed before updating
        const filtersStr = JSON.stringify(urlFilters);
        const prevFiltersStr = prevFiltersRef.current ? JSON.stringify(prevFiltersRef.current) : null;
        const pageChanged = prevPageRef.current !== page;
        const filtersChanged = filtersStr !== prevFiltersStr;

        setFilters(urlFilters);
        setCurrentPage(page);
        
        // Only fetch if filters or page changed (or on initial mount)
        if (filtersChanged || pageChanged || isInitialMount.current) {
            prevFiltersRef.current = JSON.parse(JSON.stringify(urlFilters));
            prevPageRef.current = page;
            isInitialMount.current = false;
            // Use the URL values directly instead of state (which may not be updated yet)
            fetchJobs(urlFilters, page);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!isJobSeekerLoggedIn || !jobSeekerToken || jobs.length === 0) {
            if (!isJobSeekerLoggedIn) {
                setSavedJobs(() => new Set());
            }
            return;
        }

        let isCancelled = false;

        const checkSavedStatuses = async () => {
            try {
                const results = await Promise.all(
                    jobs.map(async (job) => {
                        if (!job?._id) return null;
                        try {
                            const response = await axios.get(
                                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/check-saved/${job._id}`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${jobSeekerToken}`
                                    }
                                }
                            );
                            if (response.data.success) {
                                return { jobId: job._id, isSaved: response.data.isSaved };
                            }
                        } catch (statusError) {
                            console.error(`Failed to check saved status for job ${job?._id}:`, statusError);
                        }
                        return null;
                    })
                );

                if (isCancelled) return;

                setSavedJobs(() => {
                    const next = new Set();
                    results.forEach((result) => {
                        if (result?.isSaved) {
                            next.add(result.jobId);
                        }
                    });
                    return next;
                });
            } catch (err) {
                if (!isCancelled) {
                    console.error("Failed to load saved status for jobs list:", err);
                }
            }
        };

        checkSavedStatuses();

        return () => {
            isCancelled = true;
        };
    }, [isJobSeekerLoggedIn, jobSeekerToken, jobs]);

    // Prevent background scroll when mobile filter drawer is open
    useEffect(() => {
        if (showMobileFilters) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            
            return () => {
                // Restore scroll position
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [showMobileFilters]);

    const handleMultiSelectChange = (key, optionValue) => {
        setCurrentPage(1);
        
        // Calculate new filters first
        const currentArray = Array.isArray(filters[key]) ? filters[key] : [];
        let newArray;
        if (key === "salaryRange" && typeof optionValue === "object") {
            const exists = currentArray.some(
                item => item.min === optionValue.min && item.max === optionValue.max
            );
            newArray = exists
                ? currentArray.filter(item => !(item.min === optionValue.min && item.max === optionValue.max))
                : [...currentArray, optionValue];
        } else {
            newArray = currentArray.includes(optionValue)
                ? currentArray.filter(v => v !== optionValue)
                : [...currentArray, optionValue];
        }
        
        const newFilters = { ...filters, [key]: newArray };
        
        // Update filters state
        setFilters(newFilters);
        
        // Update URL with new filters - moved outside setState to avoid render error
        const params = new URLSearchParams({ page: "1" });
        Object.entries(newFilters).forEach(([filterKey, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => {
                    if (v) {
                        if (filterKey === "salaryRange" && typeof v === "object") {
                            params.append("minSalary", v.min);
                            params.append("maxSalary", v.max);
                        } else {
                            params.append(filterKey, v);
                        }
                    }
                });
            }
        });
        router.push(`/jobs?${params.toString()}`);
    };


    const clearFilters = () => {
        const clearedFilters = Object.keys(filters).reduce((acc, key) => {
            acc[key] = [];
            return acc;
        }, {});
        setFilters(clearedFilters);
        router.push("/jobs");
        setShowMobileFilters(false);
    };

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

    const formatSalary = (min, max) => {
        if (!min && !max) return "Not disclosed";
        if (min && max) return `₹${(min / 100000).toFixed(1)}L - ₹${(max / 100000).toFixed(1)}L`;
        if (min) return `₹${(min / 100000).toFixed(1)}L+`;
        if (max) return `Up to ₹${(max / 100000).toFixed(1)}L`;
        return "Not disclosed";
    };

    const truncateText = (text, maxLength) => {
        if (!text) return "";
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + "...";
    };

    const getCompanyInitial = (companyName) => {
        if (!companyName) return "C";
        return companyName.charAt(0).toUpperCase();
    };

    const handleJobClick = (shortId) => {
        router.push(`/${shortId}`);
    };

    const isJobSaved = (jobId) => savedJobs.has(jobId);

    const handleSaveJob = async (jobId, jobData) => {
        if (!jobId) return;

        if (!isJobSeekerLoggedIn || !jobSeekerToken) {
            setShowLoginModal(true);
            return;
        }

        if (savingJobId) {
            return;
        }

        setSavingJobId(jobId);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/save-job`,
                { jobId },
                {
                    headers: {
                        Authorization: `Bearer ${jobSeekerToken}`
                    }
                }
            );

            if (response.data.success) {
                setSavedJobs((prev) => {
                    const next = new Set(prev);
                    if (response.data.isSaved) {
                        next.add(jobId);
                    } else {
                        next.delete(jobId);
                    }
                    return next;
                });

                const jobFromResponse = response.data.job || jobData;

                const cachedQueries = queryClient.getQueriesData({
                    queryKey: savedJobsKeys.lists()
                });

                if (cachedQueries.length > 0 && jobFromResponse) {
                    cachedQueries.forEach(([queryKey, cachedData]) => {
                        if (!cachedData) return;

                        const [, , , payload] = queryKey;
                        const filters = payload?.filters || {};
                        const currentData = { ...cachedData };
                        const currentJobs = currentData.data || [];
                        const currentPagination = currentData.pagination || {};
                        const limit = filters.limit || 20;
                        const page = filters.page || 1;

                        if (response.data.isSaved) {
                            const matchesFilters = checkJobMatchesFilters(jobFromResponse, filters);
                            if (!matchesFilters) return;

                            const jobExists = currentJobs.some(j => j?._id === jobId);
                            if (!jobExists && page === 1) {
                                const updatedJobs = [jobFromResponse, ...currentJobs];
                                const jobsForPage = updatedJobs.slice(0, limit);

                                queryClient.setQueryData(queryKey, {
                                    ...currentData,
                                    data: jobsForPage,
                                    pagination: {
                                        ...currentPagination,
                                        totalJobs: (currentPagination.totalJobs || 0) + 1,
                                        totalPages: Math.ceil(((currentPagination.totalJobs || 0) + 1) / limit),
                                        hasNextPage: page < Math.ceil(((currentPagination.totalJobs || 0) + 1) / limit),
                                        hasPrevPage: false
                                    }
                                });
                            }
                        } else {
                            const updatedJobs = currentJobs.filter(j => j?._id !== jobId);
                            const removed = updatedJobs.length !== currentJobs.length;
                            if (removed) {
                                const newTotalJobs = Math.max(0, (currentPagination.totalJobs || 0) - 1);
                                const newTotalPages = Math.max(1, Math.ceil(newTotalJobs / limit));

                                queryClient.setQueryData(queryKey, {
                                    ...currentData,
                                    data: updatedJobs,
                                    pagination: {
                                        ...currentPagination,
                                        totalJobs: newTotalJobs,
                                        totalPages: newTotalPages,
                                        hasNextPage: page < newTotalPages,
                                        hasPrevPage: page > 1
                                    }
                                });
                            }
                        }
                    });
                }
            }
        } catch (err) {
            if (err?.response?.status === 401) {
                setShowLoginModal(true);
                setIsJobSeekerLoggedIn(false);
                setJobSeekerToken(null);
                setSavedJobs(() => new Set());
            } else {
                toast.error(err?.response?.data?.message || "Failed to update saved job");
            }
        } finally {
            setSavingJobId(null);
        }
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

    const handleLoginSuccess = () => {
        const token = Cookies.get("js_token");
        if (token) {
            setIsJobSeekerLoggedIn(true);
            setJobSeekerToken(token);
        }
        setShowLoginModal(false);
    };

    return (
        <>
        <div className="jobspage-container">
            <div className="jobspage-wrapper">
                {/* Desktop Filters Sidebar */}
                <div className="jobspage-filters-sidebar desktop-only">
                    <div className="jobspage-filters-header">
                        <h3>Filters</h3>
                        {activeFiltersCount > 0 && (
                            <button className="jobspage-clear-all-btn" onClick={clearFilters}>
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="jobspage-filters-content">
                        {/* Department */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Department</label>
                            {departmentOptions.map((dept) => (
                                <label key={dept} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.department.includes(dept)}
                                        onChange={() => handleMultiSelectChange("department", dept)}
                                    />
                                    <span>{dept}</span>
                                </label>
                            ))}
                        </div>

                        {/* Job Type */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Job Type</label>
                            {jobTypeOptions.map((type) => (
                                <label key={type} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.jobType.includes(type)}
                                        onChange={() => handleMultiSelectChange("jobType", type)}
                                    />
                                    <span>{type}</span>
                                </label>
                            ))}
                        </div>

                        {/* Employment Type */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Employment Type</label>
                            {employmentTypeOptions.map((type) => (
                                <label key={type} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.employmentType.includes(type)}
                                        onChange={() => handleMultiSelectChange("employmentType", type)}
                                    />
                                    <span>{type}</span>
                                </label>
                            ))}
                        </div>

                        {/* Experience */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Experience</label>
                            {experienceOptions.map((exp) => (
                                <label key={exp} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.experience.includes(exp)}
                                        onChange={() => handleMultiSelectChange("experience", exp)}
                                    />
                                    <span>{exp}</span>
                                </label>
                            ))}
                        </div>

                        {/* Work Mode */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Work Mode</label>
                            {workModeOptions.map((mode) => (
                                <label key={mode} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.workMode.includes(mode)}
                                        onChange={() => handleMultiSelectChange("workMode", mode)}
                                    />
                                    <span>{mode}</span>
                                </label>
                            ))}
                        </div>

                        {/* Location */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Location</label>
                            {locationOptions.map((loc) => (
                                <label key={loc} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.location.includes(loc)}
                                        onChange={() => handleMultiSelectChange("location", loc)}
                                    />
                                    <span>{loc}</span>
                                </label>
                            ))}
                        </div>

                        {/* Qualification */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Minimum Qualification</label>
                            {qualificationOptions.map((qual) => (
                                <label key={qual} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.highestQualification.includes(qual)}
                                        onChange={() => handleMultiSelectChange("highestQualification", qual)}
                                    />
                                    <span>{qual}</span>
                                </label>
                            ))}
                        </div>

                        {/* Salary Range */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Salary Range</label>
                            {salaryRangeOptions.map((range) => {
                                const isChecked = filters.salaryRange.some(
                                    r => r.min === range.min && r.max === range.max
                                );
                                return (
                                    <label key={range.label} className="jobspage-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleMultiSelectChange("salaryRange", range)}
                                        />
                                        <span>{range.label}</span>
                                    </label>
                                );
                            })}
                        </div>

                        {/* Number of Openings */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Number of Openings</label>
                            {numberOfOpeningsOptions.map((option) => (
                                <label key={option.value} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.numberOfOpenings.includes(option.value)}
                                        onChange={() => handleMultiSelectChange("numberOfOpenings", option.value)}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Freshness */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Posted Date</label>
                            {freshnessOptions.map((option) => (
                                <label key={option.value} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.freshness.includes(option.value)}
                                        onChange={() => handleMultiSelectChange("freshness", option.value)}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Opening Date Freshness */}
                        <div className="jobspage-filter-group">
                            <label className="jobspage-filter-group-label">Opening Date</label>
                            {freshnessOptions.map((option) => (
                                <label key={option.value} className="jobspage-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={filters.openingDateFreshness.includes(option.value)}
                                        onChange={() => handleMultiSelectChange("openingDateFreshness", option.value)}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Middle Section - Jobs List and Banner */}
                <div className="jobspage-middle-section">
                    {/* Main Content */}
                    <div className="jobspage-main-content">
                        {/* Header with Mobile Filter Button */}
                        <div className="jobspage-header">
                            <div className="jobspage-header-left">
                                <h1>Explore Jobs</h1>
                                {pagination.totalJobs !== undefined && (
                                    <p className="jobspage-jobs-count">{pagination.totalJobs} jobs found</p>
                                )}
                            </div>
                            <div className="jobspage-header-right">
                                <button
                                    className="jobspage-mobile-filter-btn mobile-only"
                                    onClick={() => setShowMobileFilters(true)}
                                >
                                    <FaFilter />
                                    Filters
                                </button>
                                <span className="jobspage-active-filters-text mobile-only">
                                    {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}
                                </span>
                                <span className="jobspage-active-filters-text desktop-only">
                                    {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
                                </span>
                            </div>
                        </div>

                        {/* Jobs List */}
                    {loading ? (
                        <div className="jobspage-loading">
                            <CircularProgress />
                            <p>Loading jobs...</p>
                        </div>
                    ) : error ? (
                        <div className="jobspage-error">
                            <p>{error}</p>
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="jobspage-empty">
                            <FaBriefcase className="jobspage-empty-icon" />
                            <h3>No jobs found</h3>
                            <p>Try adjusting your filters</p>
                        </div>
                    ) : (
                        <>
                            <div className="jobspage-jobs-list">
                                {jobs.map((job) => {
                                    const companyLogo = job.employerId?.companyLogo;
                                    const companyName = job.employerId?.companyName || job.companyName;
                                    const skillHighlights = Array.isArray(job.skills) && job.skills.length > 0
                                        ? job.skills.slice(0, 5)
                                        : [];
                                    const hasMoreSkills = Array.isArray(job.skills) && job.skills.length > 5;
                                    const jobIsSaved = isJobSaved(job._id);
                                    
                                    return (
                                        <div
                                            key={job._id}
                                            className="jobspage-job-card"
                                            onClick={() => handleJobClick(job.shortId)}
                                        >
                                            <div className="jobspage-job-card-header">
                                                <div className="jobspage-job-card-title-section">
                                                    <h3 className="jobspage-job-card-title">{job.jobTitle}</h3>
                                                    <div className="jobspage-job-card-company">
                                                        <FaBuilding className="jobspage-company-icon-small" />
                                                        <span>{companyName}</span>
                                                    </div>
                                                </div>
                                                <div className="jobspage-job-card-logo">
                                                    {companyLogo ? (
                                                        <img src={companyLogo} alt={companyName} />
                                                    ) : (
                                                        <div className="jobspage-company-logo-placeholder">
                                                            {getCompanyInitial(companyName)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="jobspage-job-card-details">
                                                <div className="jobspage-job-detail-row">
                                                    {job.experience && (
                                                        <span className="jobspage-job-detail-item">
                                                            <FaBriefcase className="jobspage-detail-icon" />
                                                            {job.experience}
                                                        </span>
                                                    )}
                                                    {job.location && (
                                                        <span className="jobspage-job-detail-item">
                                                            <FaMapMarkerAlt className="jobspage-detail-icon" />
                                                            {job.location}
                                                        </span>
                                                    )}
                                                    <span className="jobspage-job-detail-item">
                                                        <FaMoneyBillAlt className="jobspage-detail-icon" />
                                                        {formatSalary(job.minSalary, job.maxSalary)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="jobspage-job-card-description">
                                                <p>{truncateText(job.jobDescription, 150)}</p>
                                            </div>

                                            {skillHighlights.length > 0 && (
                                                <div className="jobspage-job-card-skills">
                                                    {skillHighlights.map((skill, idx) => (
                                                        <span key={`${job._id}-skill-${idx}`} className="jobspage-skill-tag">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {hasMoreSkills && (
                                                        <span className="jobspage-skill-tag jobspage-skill-tag-more">
                                                            & more
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="jobspage-job-card-footer">
                                                <span className="jobspage-job-posted-date">
                                                    <FaCalendarAlt className="jobspage-date-icon" />
                                                    {formatDate(job.createdAt)}
                                                </span>
                                                <button
                                                    className={`jobspage-save-job-btn ${jobIsSaved ? "jobspage-save-job-btn-saved" : ""}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSaveJob(job._id, job);
                                                    }}
                                                    disabled={savingJobId === job._id}
                                                >
                                                    {savingJobId === job._id ? (
                                                        <CircularProgress size={16} sx={{ color: "inherit" }} />
                                                    ) : (
                                                        <>
                                                            {jobIsSaved ? <FaBookmark /> : <FaRegBookmark />}
                                                            <span>{jobIsSaved ? "Saved" : "Save"}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="jobspage-pagination">
                                    <button
                                        className="jobspage-pagination-btn"
                                        onClick={() => {
                                            const newPage = Math.max(1, currentPage - 1);
                                            const params = new URLSearchParams(searchParams);
                                            params.set('page', newPage.toString());
                                            router.push(`/jobs?${params.toString()}`);
                                        }}
                                        disabled={!pagination.hasPrevPage || loading}
                                    >
                                        <FaChevronLeft />
                                        Previous
                                    </button>
                                    <div className="jobspage-pagination-info">
                                        Page {pagination.currentPage} of {pagination.totalPages}
                                    </div>
                                    <button
                                        className="jobspage-pagination-btn"
                                        onClick={() => {
                                            const newPage = currentPage + 1;
                                            const params = new URLSearchParams(searchParams);
                                            params.set('page', newPage.toString());
                                            router.push(`/jobs?${params.toString()}`);
                                        }}
                                        disabled={!pagination.hasNextPage || loading}
                                    >
                                        Next
                                        <FaChevronRight />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                    </div>

                    {/* Promotional Banner - Desktop Only */}
                    <div className="jobspage-banner-sidebar desktop-only">
                        <AIResumeBanner />
                    </div>
                </div>
            </div>

            {/* Mobile Filters Drawer */}
            {showMobileFilters && (
                <>
                    <div className="jobspage-mobile-filter-overlay" onClick={() => setShowMobileFilters(false)}></div>
                    <div className="jobspage-mobile-filter-drawer">
                        <div className="jobspage-drawer-header">
                            <h3>Filters</h3>
                            <button
                                className="jobspage-drawer-close-btn"
                                onClick={() => setShowMobileFilters(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="jobspage-drawer-content">
                            {/* Same filter content as desktop */}
                            <div className="jobspage-filters-content">
                                {/* Department */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Department</label>
                                    {departmentOptions.map((dept) => (
                                        <label key={dept} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.department.includes(dept)}
                                                onChange={() => handleMultiSelectChange("department", dept)}
                                            />
                                            <span>{dept}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Job Type */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Job Type</label>
                                    {jobTypeOptions.map((type) => (
                                        <label key={type} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.jobType.includes(type)}
                                                onChange={() => handleMultiSelectChange("jobType", type)}
                                            />
                                            <span>{type}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Employment Type */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Employment Type</label>
                                    {employmentTypeOptions.map((type) => (
                                        <label key={type} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.employmentType.includes(type)}
                                                onChange={() => handleMultiSelectChange("employmentType", type)}
                                            />
                                            <span>{type}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Experience */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Experience</label>
                                    {experienceOptions.map((exp) => (
                                        <label key={exp} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.experience.includes(exp)}
                                                onChange={() => handleMultiSelectChange("experience", exp)}
                                            />
                                            <span>{exp}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Work Mode */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Work Mode</label>
                                    {workModeOptions.map((mode) => (
                                        <label key={mode} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.workMode.includes(mode)}
                                                onChange={() => handleMultiSelectChange("workMode", mode)}
                                            />
                                            <span>{mode}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Location */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Location</label>
                                    {locationOptions.map((loc) => (
                                        <label key={loc} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.location.includes(loc)}
                                                onChange={() => handleMultiSelectChange("location", loc)}
                                            />
                                            <span>{loc}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Qualification */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Minimum Qualification</label>
                                    {qualificationOptions.map((qual) => (
                                        <label key={qual} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.highestQualification.includes(qual)}
                                                onChange={() => handleMultiSelectChange("highestQualification", qual)}
                                            />
                                            <span>{qual}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Salary Range */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Salary Range</label>
                                    {salaryRangeOptions.map((range) => {
                                        const isChecked = filters.salaryRange.some(
                                            r => r.min === range.min && r.max === range.max
                                        );
                                        return (
                                            <label key={range.label} className="jobspage-checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleMultiSelectChange("salaryRange", range)}
                                                />
                                                <span>{range.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>

                                {/* Number of Openings */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Number of Openings</label>
                                    {numberOfOpeningsOptions.map((option) => (
                                        <label key={option.value} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.numberOfOpenings.includes(option.value)}
                                                onChange={() => handleMultiSelectChange("numberOfOpenings", option.value)}
                                            />
                                            <span>{option.label}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Freshness */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Posted Date</label>
                                    {freshnessOptions.map((option) => (
                                        <label key={option.value} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.freshness.includes(option.value)}
                                                onChange={() => handleMultiSelectChange("freshness", option.value)}
                                            />
                                            <span>{option.label}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Opening Date Freshness */}
                                <div className="jobspage-filter-group">
                                    <label className="jobspage-filter-group-label">Opening Date</label>
                                    {freshnessOptions.map((option) => (
                                        <label key={option.value} className="jobspage-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={filters.openingDateFreshness.includes(option.value)}
                                                onChange={() => handleMultiSelectChange("openingDateFreshness", option.value)}
                                            />
                                            <span>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {activeFiltersCount > 0 && (
                            <div className="jobspage-drawer-footer">
                                <button className="jobspage-discard-btn" onClick={clearFilters}>
                                    Clear All
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>

        <Toaster position="top-right" />
        <LoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={handleLoginSuccess}
        />
        </>
    );
};

export default Page;

