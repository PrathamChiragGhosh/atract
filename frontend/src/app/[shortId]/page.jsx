"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import axios from "axios";
import Cookies from "js-cookie";
import { useQueryClient } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import {
    FaBriefcase, FaBuilding, FaMapMarkerAlt, FaCalendarAlt, FaDollarSign,
    FaClock, FaStopCircle, FaExclamationCircle, FaBookmark, FaRegBookmark,
    FaEdit, FaTrash, FaSync, FaShare, FaTimes, FaCheck, FaCheckCircle
} from "react-icons/fa";
import { Toaster, toast } from "react-hot-toast";
import JobSeekerSideBar from "@/components/SideBar/JobSeekerSideBar";
import EmployerSideBar from "@/components/SideBar/EmployerSideBar";
import LoginModal from "@/components/loginModal/LoginModal";
import JobAssessmentDrawer from "@/components/jobAssessmentDrawer/JobAssessmentDrawer";
import EditJobModal from "@/components/editJobModal/EditJobModal";
import AssessmentProfileModal from "@/components/assessmentProfileModal/AssessmentProfileModal";
import { savedJobsKeys } from "@/hooks/useSavedJobs";
import { jobApplicationsKeys } from "@/hooks/useJobApplications";
import { useUpdateJob, useDeleteJob, employerJobsKeys } from "@/hooks/useEmployerJobs";
import "./page.css";

const doesApplicationMatchFilters = (application, filters = {}) => {
    if (!application) return false;
    if (filters.status && application.status !== filters.status) return false;
    if (filters.submissionType && application.submissionType !== filters.submissionType) return false;
    if (filters.jobType && application.jobType !== filters.jobType) return false;
    if (filters.workMode && application.workMode !== filters.workMode) return false;
    if (filters.search && filters.search.trim()) {
        const searchValue = filters.search.trim().toLowerCase();
        const haystack = [
            application.jobTitle,
            application.companyName,
            application.location
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        if (!haystack.includes(searchValue)) {
            return false;
        }
    }
    return true;
};

const updateStatusBreakdownCounts = (breakdown = [], status) => {
    if (!status) {
        return Array.isArray(breakdown) ? breakdown : [];
    }
    const list = Array.isArray(breakdown) ? breakdown.map(item => ({ ...item })) : [];
    const existingIndex = list.findIndex(item => item.status === status);
    if (existingIndex !== -1) {
        list[existingIndex] = {
            ...list[existingIndex],
            count: (list[existingIndex].count || 0) + 1
        };
        return list;
    }
    return [
        ...list,
        {
            status,
            count: 1
        }
    ];
};

const JobDetailsPage = () => {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const shortId = params?.shortId;
    
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [jobStatus, setJobStatus] = useState(null); // 'active', 'expired', 'unavailable'
    const [userType, setUserType] = useState(null); // 'jobseeker', 'employer', or null
    const [similarJobs, setSimilarJobs] = useState([]);
    const [similarLoading, setSimilarLoading] = useState(false);
    const [similarError, setSimilarError] = useState(null);
    const [savedJobs, setSavedJobs] = useState(new Set()); // Track saved job IDs
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isJobSeekerLoggedIn, setIsJobSeekerLoggedIn] = useState(false);
    const [savingJobId, setSavingJobId] = useState(null); // Track which job is being saved
    const [employerId, setEmployerId] = useState(null); // Employer ID from token
    const [isJobOwner, setIsJobOwner] = useState(false); // Check if employer owns the job
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");
    const updateJobMutation = useUpdateJob();
    const deleteJobMutation = useDeleteJob();
    const [jobSeekerToken, setJobSeekerToken] = useState(null);
    const [assessmentInfo, setAssessmentInfo] = useState(null);
    const [assessmentLoading, setAssessmentLoading] = useState(false);
    const [proctoringInfo, setProctoringInfo] = useState(null);
    const [proctoringLoading, setProctoringLoading] = useState(false);
    const [showAssessmentDrawer, setShowAssessmentDrawer] = useState(false);
    const [profileRequirementData, setProfileRequirementData] = useState(null);
    const [schemaScriptId, setSchemaScriptId] = useState(null);
    const [profileRequirementLoading, setProfileRequirementLoading] = useState(false);
    const [profileRequirementError, setProfileRequirementError] = useState(null);
    const [showProfileRequirementModal, setShowProfileRequirementModal] = useState(false);
    const [pendingActionAfterProfile, setPendingActionAfterProfile] = useState(null);
    const [directApplyLoading, setDirectApplyLoading] = useState(false);
    const viewEmailStorageKey = "viewEmailEncrypted";
    const viewEmailSecret = "email-key-atract";
    const encodeEmail = (text) => {
        try {
            return btoa(
                String.fromCharCode(
                    ...text
                        .split("")
                        .map((ch, i) => ch.charCodeAt(0) ^ viewEmailSecret.charCodeAt(i % viewEmailSecret.length))
                )
            );
        } catch {
            return "";
        }
    };
    const decodeEmail = (encoded) => {
        try {
            const decoded = atob(encoded);
            return decoded
                .split("")
                .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ viewEmailSecret.charCodeAt(i % viewEmailSecret.length)))
                .join("");
        } catch {
            return "";
        }
    };
    const getStoredEmail = () => {
        if (typeof window === "undefined") return "";
        try {
            const stored = localStorage.getItem(viewEmailStorageKey);
            if (!stored) return "";
            return decodeEmail(stored);
        } catch {
            return "";
        }
    };

    const [hasApplied, setHasApplied] = useState(false);
    const [showEmailPrompt, setShowEmailPrompt] = useState(false);
    const [emailForUpdates, setEmailForUpdates] = useState(() => {
        if (typeof window === "undefined") return "";
        return getStoredEmail();
    });
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [sendingEmailCapture, setSendingEmailCapture] = useState(false);
    const [emailCaptureSuccess, setEmailCaptureSuccess] = useState(false);
    const basicTestRequired = job?.requiresBasicTest !== undefined ? job.requiresBasicTest : true;
    const videoTestRequired = Boolean(job?.requiresVideoProctoredTest);
    const jobRequiresAssessment = basicTestRequired || videoTestRequired;
    const jobId = job?._id;

    // Show email capture for anonymous visitors (only if no stored email)
    useEffect(() => {
        if (!isJobSeekerLoggedIn && job?._id) {
            const storedEmail = getStoredEmail();
            setShowEmailPrompt(!storedEmail);
            if (storedEmail && !emailForUpdates) {
                setEmailForUpdates(storedEmail);
            }
        }
    }, [isJobSeekerLoggedIn, job?._id]);

    // Check user authentication and type
    useEffect(() => {
        const checkAuth = () => {
            const jsToken = Cookies.get("js_token");
            const empToken = Cookies.get("emp_token");
            
            if (jsToken) {
                setUserType("jobseeker");
                setIsJobSeekerLoggedIn(true);
                try {
                    const decoded = jwtDecode(jsToken);
                    setEmailForUpdates(decoded?.email || "");
                } catch (err) {
                    setEmailForUpdates("");
                }
                setEmployerId(null);
                setJobSeekerToken(jsToken);
            } else if (empToken) {
                setUserType("employer");
                setIsJobSeekerLoggedIn(false);
                try {
                    const decoded = jwtDecode(empToken);
                    setEmployerId(decoded.userId);
                } catch (err) {
                    console.error("Failed to decode employer token:", err);
                    setEmployerId(null);
                }
                setJobSeekerToken(null);
            } else {
                setUserType(null);
                setIsJobSeekerLoggedIn(false);
                setEmployerId(null);
                setJobSeekerToken(null);
                setEmailForUpdates("");
            }
        };

        checkAuth();
        window.addEventListener("auth-updated", checkAuth);
        return () => window.removeEventListener("auth-updated", checkAuth);
    }, []);

    // Check if employer owns the job
    useEffect(() => {
        if (userType === "employer" && employerId && job) {
            const jobEmployerId = job.employerId?._id || job.employerId;
            setIsJobOwner(employerId === jobEmployerId?.toString() || employerId === jobEmployerId);
        } else {
            setIsJobOwner(false);
        }
    }, [userType, employerId, job]);

    // Prevent body scroll when modals are open
    useEffect(() => {
        if (showEditModal || showDeleteModal || showStatusModal) {
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
    }, [showEditModal, showDeleteModal, showStatusModal]);

    // Log view + fetch similar jobs based on current job details (works for all users)
    useEffect(() => {
        if (!shortId || !job) {
            setSimilarJobs([]);
            setSimilarError(null);
            setSimilarLoading(false);
            return;
        }

        const controller = new AbortController();

        const fetchSimilarJobs = async () => {
            try {
                setSimilarLoading(true);
                setSimilarError(null);

                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_JOB_URL}/similar/${shortId}`,
                    {
                        signal: controller.signal
                    }
                );

                if (response.data.success) {
                    setSimilarJobs(response.data.data || []);
                } else {
                    setSimilarJobs([]);
                    setSimilarError(response.data.message || "Unable to fetch similar jobs right now.");
                }
            } catch (fetchError) {
                if (fetchError.name === "CanceledError" || axios.isCancel?.(fetchError)) return;
                setSimilarError(fetchError.response?.data?.message || "Unable to fetch similar jobs right now.");
            } finally {
                setSimilarLoading(false);
            }
        };

        const logJobViewEmail = async () => {
            const jsToken = Cookies.get("js_token");
            const headers = jsToken ? { Authorization: `Bearer ${jsToken}` } : {};

            const storedEmail = getStoredEmail();
            const effectiveEmail = jsToken ? null : (emailForUpdates || storedEmail);

            if (!jsToken && !effectiveEmail) {
                setShowEmailPrompt(true);
                return;
            }

            try {
                await axios.post(
                    `${process.env.NEXT_PUBLIC_JOB_URL}/public/${shortId}/view-email`,
                    jsToken ? {} : { email: effectiveEmail },
                    { headers }
                );
                if (!jsToken && effectiveEmail && !storedEmail) {
                    // persist for future jobs
                    localStorage.setItem(viewEmailStorageKey, encodeEmail(effectiveEmail));
                }
                if (!jsToken) {
                    setEmailCaptureSuccess(true);
                    setTimeout(() => setEmailCaptureSuccess(false), 3000);
                }
            } catch (err) {
                // silent fail
            }
        };

        logJobViewEmail();
        fetchSimilarJobs();
        return () => controller.abort();
    }, [shortId, job?._id, isJobSeekerLoggedIn]); // Depend on job._id to refetch when job changes

    // Check if job is saved (for logged-in job seekers)
    useEffect(() => {
        if (!isJobSeekerLoggedIn || !job?._id) {
            return;
        }

        const token = Cookies.get("js_token");
        if (!token) return;

        const checkSavedStatus = async () => {
            try {
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/check-saved/${job._id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (response.data.success) {
                    setSavedJobs(prev => {
                        const newSet = new Set(prev);
                        if (response.data.isSaved) {
                            newSet.add(job._id);
                        } else {
                            newSet.delete(job._id);
                        }
                        return newSet;
                    });
                }
            } catch (err) {
                console.error("Failed to check saved status:", err);
            }
        };

        checkSavedStatus();
    }, [isJobSeekerLoggedIn, job?._id]);

    // Check saved status for similar jobs
    useEffect(() => {
        if (!isJobSeekerLoggedIn || !similarJobs.length) {
            return;
        }

        const token = Cookies.get("js_token");
        if (!token) return;

        const checkSimilarJobsSavedStatus = async () => {
            try {
                // Check saved status for all similar jobs
                const checkPromises = similarJobs.map(async (similarJob) => {
                    if (!similarJob._id) return null;
                    try {
                        const response = await axios.get(
                            `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/check-saved/${similarJob._id}`,
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            }
                        );
                        if (response.data.success) {
                            return { jobId: similarJob._id, isSaved: response.data.isSaved };
                        }
                    } catch (err) {
                        console.error(`Failed to check saved status for job ${similarJob._id}:`, err);
                    }
                    return null;
                });

                const results = await Promise.all(checkPromises);
                
                setSavedJobs(prev => {
                    const newSet = new Set(prev);
                    results.forEach(result => {
                        if (result) {
                            if (result.isSaved) {
                                newSet.add(result.jobId);
                            } else {
                                newSet.delete(result.jobId);
                            }
                        }
                    });
                    return newSet;
                });
            } catch (err) {
                console.error("Failed to check similar jobs saved status:", err);
            }
        };

        checkSimilarJobsSavedStatus();
    }, [isJobSeekerLoggedIn, similarJobs]);

    // Inject JSON-LD schema into document head
    const injectSchema = (schema) => {
        if (!schema) return;

        // Remove existing schema script if any
        if (schemaScriptId) {
            const existingScript = document.getElementById(schemaScriptId);
            if (existingScript) {
                existingScript.remove();
            }
        }

        // Create new script element
        const scriptId = `job-schema-${shortId}`;
        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        script.text = schema;
        document.head.appendChild(script);
        
        setSchemaScriptId(scriptId);
    };

    // Fetch job details
    useEffect(() => {
        if (!shortId) return;

        const fetchJob = async () => {
            try {
                setLoading(true);
                setError(null);
                setHasApplied(false);

                const headers = {};
                if (jobSeekerToken) {
                    headers.Authorization = `Bearer ${jobSeekerToken}`;
                }
                
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_JOB_URL}/public/${shortId}`,
                    { headers }
                );

                if (response.data.success) {
                    const jobData = response.data.data;
                    setJob(jobData);
                    setHasApplied(Boolean(jobData?.hasApplied));
                    
                    // Inject Google Jobs schema if available
                    if (response.data.googleSchema) {
                        injectSchema(response.data.googleSchema);
                    }
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const closingDate = new Date(jobData.applicationClosingDate);
                    closingDate.setHours(0, 0, 0, 0);
                    
                    if (jobData.status === 'Draft' || jobData.status === 'Inactive' || jobData.status === 'Closed') {
                        setJobStatus('unavailable');
                    } else if (jobData.status === 'Active' && closingDate < today) {
                        setJobStatus('expired');
                    } else if (jobData.status === 'Active') {
                        setJobStatus('active');
                    }

                    const viewedJobsKey = 'viewedJobsEncrypted';
                    const key = "view-key-atract"; // simple xor key for obfuscation

                    const encode = (text) => {
                        return btoa(String.fromCharCode(...text.split('').map((ch, i) => ch.charCodeAt(0) ^ key.charCodeAt(i % key.length))));
                    };
                    const decode = (encoded) => {
                        try {
                            const decoded = atob(encoded);
                            return decoded.split('').map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
                        } catch {
                            return null;
                        }
                    };

                    const stored = localStorage.getItem(viewedJobsKey);
                    let viewedJobs = [];
                    if (stored) {
                        try {
                            viewedJobs = JSON.parse(stored)
                                .map(decode)
                                .filter(Boolean);
                        } catch {
                            viewedJobs = [];
                        }
                    }

                    if (!viewedJobs.includes(shortId)) {
                        try {
                            const viewResponse = await axios.post(
                                `${process.env.NEXT_PUBLIC_JOB_URL}/public/${shortId}/view`
                            );
                            
                            if (viewResponse.data.success) {
                                setJob(prev => prev ? { ...prev, views: viewResponse.data.views } : null);
                                viewedJobs.push(shortId);
                                const encodedList = viewedJobs.map(encode);
                                localStorage.setItem(viewedJobsKey, JSON.stringify(encodedList));
                            }
                        } catch (viewErr) {
                            console.error("Failed to increment view count:", viewErr);
                        }
                    }
                } else {
                    setError(response.data.message || "Failed to load job");
                }
            } catch (err) {
                if (err.response?.status === 404) {
                    setError("Job no longer exists");
                } else if (err.response?.status === 400) {
                    setError("Invalid job link");
                } else {
                    setError(err.response?.data?.message || "Failed to load job details");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchJob();

        // Cleanup: Remove schema script when component unmounts or shortId changes
        return () => {
            if (schemaScriptId) {
                const script = document.getElementById(schemaScriptId);
                if (script) {
                    script.remove();
                }
            }
        };
    }, [shortId, jobSeekerToken, schemaScriptId]);

    const fetchProfileRequirements = useCallback(async () => {
        if (!jobSeekerToken) {
            setProfileRequirementData(null);
            return null;
        }
        try {
            setProfileRequirementLoading(true);
            setProfileRequirementError(null);
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/profile/assessment-requirements`,
                {
                    headers: {
                        Authorization: `Bearer ${jobSeekerToken}`
                    }
                }
            );
            const snapshot = response.data?.data || null;
            setProfileRequirementData(snapshot);
            return snapshot;
        } catch (error) {
            console.error("Profile requirements fetch error:", error);
            const message = error.response?.data?.message || "Unable to fetch required profile details.";
            setProfileRequirementError(message);
            return null;
        } finally {
            setProfileRequirementLoading(false);
        }
    }, [jobSeekerToken]);

    const loadAssessmentSummary = useCallback(async () => {
        if (!jobRequiresAssessment || !job?._id || !jobSeekerToken) {
            return;
        }
        try {
            setAssessmentLoading(true);
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/jobs/${job._id}/assessment`,
                {
                    headers: {
                        Authorization: `Bearer ${jobSeekerToken}`
                    }
                }
            );
            if (response.data.success) {
                setAssessmentInfo(response.data.data);
            }
        } catch (summaryError) {
            console.error("Failed to fetch assessment summary:", summaryError);
        } finally {
            setAssessmentLoading(false);
        }
    }, [job?._id, jobSeekerToken, jobRequiresAssessment]);

    const loadProctoringStatus = useCallback(async () => {
        if (!videoTestRequired || !job?._id || !jobSeekerToken) {
            setProctoringInfo(null);
            return;
        }
        try {
            setProctoringLoading(true);
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/jobs/${job._id}/proctoring`,
                {
                    headers: {
                        Authorization: `Bearer ${jobSeekerToken}`
                    }
                }
            );
            if (response.data.success) {
                setProctoringInfo(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch proctoring summary:", error);
        } finally {
            setProctoringLoading(false);
        }
    }, [videoTestRequired, job?._id, jobSeekerToken]);

    useEffect(() => {
        if (!jobRequiresAssessment) {
            setAssessmentInfo(null);
            setAssessmentLoading(false);
            return;
        }
        if (!job?._id || !isJobSeekerLoggedIn || !jobSeekerToken) {
            setAssessmentInfo(null);
            return;
        }
        loadAssessmentSummary();
    }, [job?._id, isJobSeekerLoggedIn, jobSeekerToken, loadAssessmentSummary, jobRequiresAssessment]);

    useEffect(() => {
        if (!videoTestRequired || !job?._id || !isJobSeekerLoggedIn || !jobSeekerToken) {
            setProctoringInfo(null);
            return;
        }
        loadProctoringStatus();
    }, [videoTestRequired, job?._id, isJobSeekerLoggedIn, jobSeekerToken, loadProctoringStatus]);

    useEffect(() => {
        if (isJobSeekerLoggedIn && jobSeekerToken) {
            fetchProfileRequirements();
        } else {
            setProfileRequirementData(null);
        }
    }, [isJobSeekerLoggedIn, jobSeekerToken, fetchProfileRequirements]);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return "Not specified";
        if (min && max) return `₹${(min / 100000).toFixed(1)}L - ₹${(max / 100000).toFixed(1)}L`;
        if (min) return `₹${(min / 100000).toFixed(1)}L+`;
        if (max) return `Up to ₹${(max / 100000).toFixed(1)}L`;
        return "Not specified";
    };

    const ensureProfileReady = useCallback(async () => {
        if (!jobSeekerToken) {
            return false;
        }
        if (!profileRequirementData) {
            const snapshot = await fetchProfileRequirements();
            return Boolean(snapshot?.allSatisfied);
        }
        return profileRequirementData.allSatisfied;
    }, [jobSeekerToken, profileRequirementData, fetchProfileRequirements]);

    const updateApplicationsCacheAfterApply = useCallback((applicationData) => {
        if (!applicationData) {
            return;
        }

        const cachedQueries = queryClient.getQueriesData({
            queryKey: jobApplicationsKeys.lists()
        });

        if (!cachedQueries.length) {
            return;
        }

        cachedQueries.forEach(([queryKey, cachedData]) => {
            if (!cachedData) return;
            const filters = queryKey?.[3]?.filters || {};
            const currentPage = filters.page || 1;
            if (currentPage !== 1) {
            return;
        }
            if (!doesApplicationMatchFilters(applicationData, filters)) {
            return;
        }

            const existingData = Array.isArray(cachedData.data) ? cachedData.data : [];
            if (existingData.some(item => item.applicationId === applicationData.applicationId)) {
            return;
        }

            const limit = filters.limit || cachedData.pagination?.limit || 20;
            const nextData = [applicationData, ...existingData].slice(0, limit);

            const nextSummary = cachedData.summary
                ? {
                    ...cachedData.summary,
                    totalApplications: (cachedData.summary.totalApplications || 0) + 1,
                    totalUpdates: (cachedData.summary.totalUpdates || 0) + (applicationData.totalUpdates || 0),
                    statusBreakdown: updateStatusBreakdownCounts(cachedData.summary.statusBreakdown, applicationData.status)
                }
                : cachedData.summary;

            let nextPagination = cachedData.pagination;
            if (cachedData.pagination) {
                const paginationLimit = cachedData.pagination.limit || limit;
                const nextTotalRecords = (cachedData.pagination.totalRecords || 0) + 1;
                const nextTotalPages = Math.max(1, Math.ceil(nextTotalRecords / paginationLimit));
                nextPagination = {
                    ...cachedData.pagination,
                    totalRecords: nextTotalRecords,
                    totalPages: nextTotalPages,
                    hasNextPage: nextTotalPages > 1,
                    hasPrevPage: false
                };
            }

            queryClient.setQueryData(queryKey, {
                ...cachedData,
                data: nextData,
                pagination: nextPagination,
                summary: nextSummary
            });
        });
    }, [queryClient]);

    const handleApplyWithoutTest = useCallback(async ({ skipProfileCheck = false, hasBasicTest = false, hasVideoTest = false, basicAssessmentId = null, videoAssessmentId = null } = {}) => {
        if (!job?._id || hasApplied) {
            if (hasApplied) {
                toast.success("You have already applied to this job.");
            }
            return;
        }

        // Check if job is accepting applications before proceeding
        if (jobStatus !== 'active') {
            // Don't show toast for inactive jobs to prevent continuous notifications
            console.log(`Job ${job._id} is not accepting applications (status: ${jobStatus})`);
            return;
        }

        if (!isJobSeekerLoggedIn) {
            setShowLoginModal(true);
            return;
        }

        const token = Cookies.get("js_token");
        if (!token) {
            setShowLoginModal(true);
            return;
        }

        if (!skipProfileCheck) {
            const ready = await ensureProfileReady();
            if (!ready) {
                setPendingActionAfterProfile('direct');
                setShowProfileRequirementModal(true);
                return;
            }
        }

        if (directApplyLoading) {
            return;
        }

        // Get assessment IDs from state if not provided
        const finalBasicAssessmentId = basicAssessmentId || (hasBasicTest && assessmentInfo?._id ? assessmentInfo._id : null);
        const finalVideoAssessmentId = videoAssessmentId || (hasVideoTest && proctoringInfo?._id ? proctoringInfo._id : null);

        setDirectApplyLoading(true);
        try {
            const requestBody = {
                hasBasicTest,
                hasVideoTest
            };
            if (hasBasicTest && finalBasicAssessmentId) {
                requestBody.basicAssessmentId = finalBasicAssessmentId;
            }
            if (hasVideoTest && finalVideoAssessmentId) {
                requestBody.videoAssessmentId = finalVideoAssessmentId;
            }

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/jobs/${job._id}/apply`,
                requestBody,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const responsePayload = response.data?.data;
            const applicationSummary = responsePayload?.application;

            toast.success(response.data?.message || "Application submitted successfully!");
            setHasApplied(true);
            setJob(prev => prev ? {
                ...prev,
                hasApplied: true,
                applicationsCount: (prev.applicationsCount || 0) + 1
            } : prev);

            updateApplicationsCacheAfterApply(applicationSummary);

            if (job?._id) {
                const cachedQueries = queryClient.getQueriesData({
                    queryKey: savedJobsKeys.lists()
                });

                if (cachedQueries.length > 0) {
                    cachedQueries.forEach(([queryKey, cachedData]) => {
                        if (!cachedData) return;
                        const currentData = { ...cachedData };
                        const currentJobs = Array.isArray(currentData.data) ? currentData.data : [];
                        const jobIndex = currentJobs.findIndex(j => j?._id === job._id);

                        if (jobIndex !== -1) {
                            const updatedJobs = [...currentJobs];
                            updatedJobs[jobIndex] = {
                                ...updatedJobs[jobIndex],
                                hasApplied: true,
                                applicationsCount: (updatedJobs[jobIndex].applicationsCount || 0) + 1
                            };

                            queryClient.setQueryData(queryKey, {
                                ...currentData,
                                data: updatedJobs
                            });
                        }
                    });
                }
            }
        } catch (error) {
            if (error?.response?.status === 401) {
                setShowLoginModal(true);
            } else {
                toast.error(error?.response?.data?.message || "Failed to submit application");
            }
        } finally {
            setDirectApplyLoading(false);
        }
    }, [job, hasApplied, isJobSeekerLoggedIn, ensureProfileReady, directApplyLoading, queryClient, updateApplicationsCacheAfterApply]);

    const handleEmailCaptureSubmit = async (e) => {
        e.preventDefault();
        if (!emailForUpdates.trim()) {
            toast.error("Please enter your email.");
            return;
        }
        if (!acceptTerms) {
            toast.error("Please accept the terms and conditions.");
            return;
        }
        setSendingEmailCapture(true);
        try {
            const normalizedEmail = emailForUpdates.trim();
            await axios.post(`${process.env.NEXT_PUBLIC_JOB_URL}/public/${shortId}/view-email`, { email: normalizedEmail });
            setShowEmailPrompt(false);
            localStorage.setItem(viewEmailStorageKey, encodeEmail(normalizedEmail));
            setEmailCaptureSuccess(true);
            setTimeout(() => setEmailCaptureSuccess(false), 3000);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save email.");
        } finally {
            setSendingEmailCapture(false);
        }
    };

    const handleAssessmentRefresh = useCallback(async (payload) => {
        if (payload) {
            setAssessmentInfo(payload);
            // Auto-apply if basic test passed and video test is not required
            if (payload.hasPassed && !videoTestRequired && !hasApplied && job?._id) {
                // Auto-apply to the job with basic test flag
                await handleApplyWithoutTest({ 
                    skipProfileCheck: true, 
                    hasBasicTest: true, 
                    hasVideoTest: false,
                    basicAssessmentId: payload._id
                });
            } else if (payload.hasPassed && videoTestRequired) {
                loadProctoringStatus();
            }
            return;
        }
        loadAssessmentSummary();
        if (videoTestRequired) {
            loadProctoringStatus();
        }
    }, [loadAssessmentSummary, loadProctoringStatus, videoTestRequired, hasApplied, job?._id, handleApplyWithoutTest]);

    // Auto-apply when video test passes
    useEffect(() => {
        if (
            videoTestRequired &&
            proctoringInfo?.status === "passed" &&
            !hasApplied &&
            job?._id &&
            isJobSeekerLoggedIn &&
            (!basicTestRequired || assessmentInfo?.hasPassed)
        ) {
            handleApplyWithoutTest({ 
                skipProfileCheck: true, 
                hasBasicTest: basicTestRequired, 
                hasVideoTest: true,
                basicAssessmentId: basicTestRequired ? assessmentInfo?._id : null,
                videoAssessmentId: proctoringInfo?._id || null
            });
        }
    }, [proctoringInfo?.status, videoTestRequired, hasApplied, job?._id, isJobSeekerLoggedIn, basicTestRequired, assessmentInfo?.hasPassed, assessmentInfo?._id, proctoringInfo?._id, handleApplyWithoutTest]);

    const handleLaunchVideoTest = useCallback(async () => {
        if (!jobId) {
            return;
        }
        if (!isJobSeekerLoggedIn) {
            setShowLoginModal(true);
            return;
        }
        if (basicTestRequired && !assessmentInfo?.hasPassed) {
            toast.error("Please finish the readiness test first.");
            return;
        }
        const ready = await ensureProfileReady();
        if (!ready) {
            setPendingActionAfterProfile("assessment");
            setShowProfileRequirementModal(true);
            return;
        }
        router.push(`/jobseeker/proctoring/${jobId}`);
    }, [assessmentInfo?.hasPassed, basicTestRequired, ensureProfileReady, isJobSeekerLoggedIn, jobId, router]);

    const handleCloseProfileRequirementModal = () => {
        setShowProfileRequirementModal(false);
        setPendingActionAfterProfile(null);
    };

    const isJobSeekerView = userType === "jobseeker";
    const latestAssessmentAttempt = assessmentInfo?.attemptsSummary?.length
        ? assessmentInfo.attemptsSummary[assessmentInfo.attemptsSummary.length - 1]
        : null;

    const resolveVideoCtaLabel = (status) => {
        switch (status) {
            case "pending-generation":
                return "Video Test Preparing";
            case "awaiting-precheck":
                return "Run Video Pre-checks";
            case "ready":
                return "Start Video Test";
            case "in-progress":
                return "Resume Video Test";
            case "flagged":
            case "failed":
                return "Video Test Pending";
            case "passed":
                return "Video Test Cleared";
            default:
                return "Launch Video Test";
        }
    };

    const getAssessmentCtaLabel = () => {
        if (!isJobSeekerLoggedIn) return "Login to Apply";
        if (!jobRequiresAssessment) return "Apply Without Test";
        if (videoTestRequired && !basicTestRequired) {
            return resolveVideoCtaLabel(proctoringInfo?.status || "not-started");
        }
        if (!assessmentInfo) return "Complete Test to Apply";
        if (!assessmentInfo.hasPassed) {
            if (assessmentInfo.requiresRegeneration) return "Refresh Test to Apply";
            if (assessmentInfo.status === "in-progress") return "Continue Application Test";
            if (assessmentInfo.status === "failed") return "Retake Test to Apply";
            return "Complete Test to Apply";
        }

        if (videoTestRequired) {
            return resolveVideoCtaLabel(proctoringInfo?.status || "not-started");
        }

        return "Apply with Test Score";
    };

    const handleProfileModalSuccess = useCallback(async () => {
        const snapshot = await fetchProfileRequirements();
        if (snapshot?.allSatisfied) {
            setShowProfileRequirementModal(false);
            const nextAction = pendingActionAfterProfile;
            setPendingActionAfterProfile(null);
            if (nextAction === 'assessment') {
                setShowAssessmentDrawer(true);
            } else if (nextAction === 'direct') {
                handleApplyWithoutTest({ skipProfileCheck: true });
            }
        }
    }, [fetchProfileRequirements, pendingActionAfterProfile, handleApplyWithoutTest]);

    const handleOpenAssessmentDrawer = async () => {
        if (hasApplied) {
            toast.success("You have already applied to this job.");
            return;
        }

        if (!isJobSeekerLoggedIn) {
            setShowLoginModal(true);
            return;
        }
        if (!job?._id) return;
        if (!jobRequiresAssessment) {
            handleApplyWithoutTest();
            return;
        }

        const ready = await ensureProfileReady();
        if (!ready) {
            setPendingActionAfterProfile('assessment');
            setShowProfileRequirementModal(true);
            return;
        }

        setShowAssessmentDrawer(true);
    };

    const handleCloseAssessmentDrawer = () => {
        setShowAssessmentDrawer(false);
    };

    const handlePrimaryCta = useCallback(async () => {
        if (!jobRequiresAssessment) {
            await handleApplyWithoutTest();
            return;
        }

        if (videoTestRequired && !basicTestRequired) {
            await handleLaunchVideoTest();
            return;
        }

        if (!assessmentInfo || !assessmentInfo.hasPassed) {
            await handleOpenAssessmentDrawer();
            return;
        }

        if (videoTestRequired) {
            if (proctoringInfo?.status === "passed") {
                toast.success("Video test already cleared for this job.");
                return;
            }
            await handleLaunchVideoTest();
            return;
        }

        await handleOpenAssessmentDrawer();
    }, [
        assessmentInfo?.hasPassed,
        basicTestRequired,
        handleApplyWithoutTest,
        handleLaunchVideoTest,
        handleOpenAssessmentDrawer,
        jobRequiresAssessment,
        proctoringInfo?.status,
        videoTestRequired
    ]);

    const handleNavigateToJob = (targetShortId) => {
        if (!targetShortId || targetShortId === shortId) return;
        router.push(`/${targetShortId}`);
    };

    const handleSaveJob = async (jobId, shortId) => {
        if (!jobId || !isJobSeekerLoggedIn) {
            if (!isJobSeekerLoggedIn) {
                setShowLoginModal(true);
            }
            return;
        }

        const token = Cookies.get("js_token");
        if (!token) {
            setShowLoginModal(true);
            return;
        }

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
                // Update local state
                setSavedJobs(prev => {
                    const newSet = new Set(prev);
                    if (response.data.isSaved) {
                        newSet.add(jobId);
                    } else {
                        newSet.delete(jobId);
                    }
                    return newSet;
                });

                // Get the job from response (includes populated employerId with company image)
                const jobFromResponse = response.data.job;

                // Update React Query cache if it exists
                const cachedQueries = queryClient.getQueriesData({
                    queryKey: savedJobsKeys.lists()
                });

                if (cachedQueries.length > 0 && jobFromResponse) {
                    cachedQueries.forEach(([queryKey, cachedData]) => {
                        if (!cachedData) return;

                        const [, , , { filters }] = queryKey;
                        const currentData = { ...cachedData };
                        const currentJobs = currentData.data || [];
                        const currentPagination = currentData.pagination || {};

                        if (response.data.isSaved) {
                            // Adding job - check if it matches current filters
                            const matchesFilters = checkJobMatchesFilters(jobFromResponse, filters);
                            
                            if (matchesFilters) {
                                // Check if job already exists in cache
                                const jobExists = currentJobs.some(j => j._id === jobId);
                                
                                if (!jobExists) {
                                    // Add job to page 1 if it matches filters
                                    if (filters.page === 1 || !filters.page) {
                                        // Use job directly from response (already has populated employerId with company image)
                                        const updatedJobs = [jobFromResponse, ...currentJobs];
                                        // Limit to 20 jobs per page
                                        const jobsForPage = updatedJobs.slice(0, filters.limit || 20);
                                        
                                        queryClient.setQueryData(queryKey, {
                                            ...currentData,
                                            data: jobsForPage,
                                            pagination: {
                                                ...currentPagination,
                                                totalJobs: (currentPagination.totalJobs || 0) + 1,
                                                totalPages: Math.ceil(((currentPagination.totalJobs || 0) + 1) / (filters.limit || 20)),
                                                hasNextPage: (filters.page || 1) < Math.ceil(((currentPagination.totalJobs || 0) + 1) / (filters.limit || 20))
                                            }
                                        });
                                    }
                                }
                            }
                        } else {
                            // Removing job - remove from all cached pages
                            const updatedJobs = currentJobs.filter(j => j._id !== jobId);
                            const removed = currentJobs.length !== updatedJobs.length;
                            
                            if (removed) {
                                const newTotalJobs = Math.max(0, (currentPagination.totalJobs || 0) - 1);
                                const newTotalPages = Math.max(1, Math.ceil(newTotalJobs / (filters.limit || 20)));
                                
                                queryClient.setQueryData(queryKey, {
                                    ...currentData,
                                    data: updatedJobs,
                                    pagination: {
                                        ...currentPagination,
                                        totalJobs: newTotalJobs,
                                        totalPages: newTotalPages,
                                        hasNextPage: (filters.page || 1) < newTotalPages,
                                        hasPrevPage: (filters.page || 1) > 1
                                    }
                                });
                            }
                        }
                    });
                }
            }
        } catch (err) {
            console.error("Failed to save/unsave job:", err);
            if (err.response?.status === 401) {
                setShowLoginModal(true);
            }
        } finally {
            setSavingJobId(null);
        }
    };

    // Helper function to check if job matches filters
    const checkJobMatchesFilters = (jobData, filters) => {
        if (!jobData || !filters) return true;

        // Check search filter
        if (filters.search && filters.search.trim()) {
            const searchLower = filters.search.trim().toLowerCase();
            const matchesSearch = 
                jobData.jobTitle?.toLowerCase().includes(searchLower) ||
                jobData.companyName?.toLowerCase().includes(searchLower) ||
                jobData.location?.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
        }

        // Check status filter
        if (filters.status && filters.status.trim()) {
            if (jobData.status !== filters.status.trim()) return false;
        }

        // Check job type filter
        if (filters.jobType && filters.jobType.trim()) {
            if (jobData.jobType !== filters.jobType.trim()) return false;
        }

        // Check work mode filter
        if (filters.workMode && filters.workMode.trim()) {
            if (jobData.workMode !== filters.workMode.trim()) return false;
        }

        return true;
    };

    const isJobSaved = (jobId) => {
        return savedJobs.has(jobId);
    };

    // Handle edit job
    const handleEditJob = () => {
        setShowEditModal(true);
    };

    // Handle edit success
    const handleEditSuccess = async () => {
        setShowEditModal(false);
        // Fetch updated job details
        if (shortId) {
            try {
                const headers = {};
                if (jobSeekerToken) {
                    headers.Authorization = `Bearer ${jobSeekerToken}`;
                }

                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_JOB_URL}/public/${shortId}`,
                    { headers }
                );
                if (response.data.success) {
                    const jobData = response.data.data;
                    setJob(jobData);
                    setHasApplied(Boolean(jobData?.hasApplied));
                    
                    // Update job status based on new data
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const closingDate = new Date(jobData.applicationClosingDate);
                    closingDate.setHours(0, 0, 0, 0);
                    
                    if (jobData.status === 'Draft' || jobData.status === 'Inactive' || jobData.status === 'Closed') {
                        setJobStatus('unavailable');
                    } else if (jobData.status === 'Active' && closingDate < today) {
                        setJobStatus('expired');
                    } else if (jobData.status === 'Active') {
                        setJobStatus('active');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch updated job:", err);
                toast.error("Failed to refresh job details");
            }
        }
    };

    // Handle delete job
    const handleDeleteJob = async () => {
        if (!job?._id) return;
        try {
            await deleteJobMutation.mutateAsync(job._id);
            setShowDeleteModal(false);
            toast.success("Job deleted successfully");
            router.push("/employer/jobs");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error(error.response?.data?.message || "Failed to delete job");
        }
    };

    // Handle update status
    const handleUpdateStatus = async () => {
        if (!job?._id || !selectedStatus) return;
        try {
            const updatedJob = await updateJobMutation.mutateAsync({
                jobId: job._id,
                data: { status: selectedStatus }
            });
            setShowStatusModal(false);
            setSelectedStatus("");
            toast.success("Job status updated successfully");
            
            // Update job state with new data from mutation response
            if (updatedJob) {
                setJob(updatedJob);
                if (typeof updatedJob.hasApplied === "boolean") {
                    setHasApplied(Boolean(updatedJob.hasApplied));
                } else {
                    setHasApplied(false);
                }
                
                // Update job status based on new status
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const closingDate = new Date(updatedJob.applicationClosingDate);
                closingDate.setHours(0, 0, 0, 0);
                
                if (selectedStatus === 'Draft' || selectedStatus === 'Inactive' || selectedStatus === 'Closed') {
                    setJobStatus('unavailable');
                } else if (selectedStatus === 'Active' && closingDate < today) {
                    setJobStatus('expired');
                } else if (selectedStatus === 'Active') {
                    setJobStatus('active');
                }

                // Update employer jobs cache if present
                const cachedQueries = queryClient.getQueriesData({
                    queryKey: employerJobsKeys.lists()
                });

                if (cachedQueries.length > 0 && updatedJob) {
                    cachedQueries.forEach(([queryKey, cachedData]) => {
                        if (!cachedData) return;

                        const [, , , { filters }] = queryKey;
                        const currentData = { ...cachedData };
                        const currentJobs = currentData.data || [];

                        // Find and update the job in the cached list
                        const jobIndex = currentJobs.findIndex(j => j._id === updatedJob._id);
                        if (jobIndex !== -1) {
                            // Update the job in the cache
                            const updatedJobs = [...currentJobs];
                            updatedJobs[jobIndex] = updatedJob;

                            queryClient.setQueryData(queryKey, {
                                ...currentData,
                                data: updatedJobs
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Update status error:", error);
            toast.error(error.response?.data?.message || "Failed to update status");
        }
    };

    // Handle open status modal
    const handleOpenStatusModal = () => {
        setSelectedStatus(job?.status || "");
        setShowStatusModal(true);
    };

    // Handle share job
    const handleShareJob = async () => {
        if (!job?.shortId) {
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

    const renderSimilarJobs = () => {
        // Show similar jobs for all users (not just job seekers)

        if (similarLoading) {
            return (
                <div className="job-details-similar-jobs-card">
                    <h3>Similar Jobs</h3>
                    <div className="job-details-similar-skeleton-list">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="job-details-similar-skeleton-card">
                                <div className="job-details-skeleton-line job-details-skeleton-line-short" />
                                <div className="job-details-skeleton-line" />
                                <div className="job-details-skeleton-line job-details-skeleton-line-tiny" />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (similarError) {
            return (
                <div className="job-details-similar-jobs-card">
                    <h3>Similar Jobs</h3>
                    <p className="job-details-similar-message job-details-similar-message-error">{similarError}</p>
                </div>
            );
        }

        if (!similarJobs.length) {
            return (
                <div className="job-details-similar-jobs-card">
                    <h3>Similar Jobs</h3>
                    <p className="job-details-similar-message">
                        No tailored matches yet. Update your skills to unlock better recommendations.
                    </p>
                </div>
            );
        }

        return (
            <div className="job-details-similar-jobs-card">
                <h3>Similar Jobs</h3>
                <div className="job-details-similar-jobs-list">
                    {similarJobs.map((similarJob) => {
                        const companyName = similarJob.employerId?.companyName || similarJob.companyName;
                        const companyLogo = similarJob.employerId?.companyLogo;
                        const jobSkills = Array.isArray(similarJob.skills) ? similarJob.skills.slice(0, 3) : [];

                        return (
                            <div key={similarJob._id} className="job-details-similar-job-item-wrapper">
                                <button
                                    type="button"
                                    className="job-details-similar-job-item"
                                    onClick={() => handleNavigateToJob(similarJob.shortId)}
                                >
                                    <div className="job-details-similar-job-header">
                                        <div className="job-details-similar-job-logo">
                                            {companyLogo ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={companyLogo} alt={companyName || "Company"} />
                                            ) : (
                                                <span>{companyName?.charAt(0) || "J"}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="job-details-similar-job-company">{companyName}</p>
                                            <p className="job-details-similar-job-title">{similarJob.jobTitle}</p>
                                        </div>
                                    </div>
                                    <div className="job-details-similar-job-meta">
                                        <span>{similarJob.location}</span>
                                        {similarJob.experience && <span>{similarJob.experience}</span>}
                                        <span>{formatSalary(similarJob.minSalary, similarJob.maxSalary)}</span>
                                    </div>
                                    {jobSkills.length > 0 && (
                                        <div className="job-details-similar-job-skills">
                                            {jobSkills.map((skill, idx) => (
                                                <span key={`${similarJob._id}-skill-${idx}`}>{skill}</span>
                                            ))}
                                        </div>
                                    )}
                                </button>
                                {userType !== 'employer' && (
                                    <button
                                        type="button"
                                        className={`job-details-similar-job-save-btn ${isJobSaved(similarJob._id) ? 'job-details-saved' : ''} ${savingJobId === similarJob._id ? 'job-details-saving' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSaveJob(similarJob._id, similarJob.shortId);
                                        }}
                                        title={isJobSaved(similarJob._id) ? "Unsave job" : "Save job"}
                                        disabled={savingJobId === similarJob._id}
                                    >
                                        {savingJobId === similarJob._id ? (
                                            <CircularProgress size={14} sx={{ color: "inherit" }} />
                                        ) : (
                                            isJobSaved(similarJob._id) ? <FaBookmark /> : <FaRegBookmark />
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const getUnavailableContent = () => {
        if (!jobStatus || !job) return null;

        if (jobStatus === 'expired') {
            return {
                icon: <FaClock className="job-details-unavailable-icon" />,
                title: "Job Posting Expired",
                message: "This job posting has expired and is no longer accepting applications.",
                subMessage: "The application deadline has passed. Please look for other opportunities."
            };
        }

        let title;
        let message;
        let subMessage;

        switch (job.status) {
            case 'Draft':
                title = "Job Not Available";
                message = "This job posting is not yet published.";
                subMessage = "The employer is still working on this job posting. Please check back later.";
                break;
            case 'Inactive':
                title = "Job No Longer Available";
                message = "This job posting is currently inactive.";
                subMessage = "The employer has temporarily paused this job posting. It may become available again in the future.";
                break;
            case 'Closed':
                title = "Job Position Closed";
                message = "This job posting has been closed.";
                subMessage = "The employer is no longer accepting applications for this position.";
                break;
            default:
                title = "Job Not Available";
                message = "This job is no longer accepting applications.";
                subMessage = "Please explore other job opportunities.";
        }

        return {
            icon: <FaStopCircle className="job-details-unavailable-icon" />,
            title,
            message,
            subMessage
        };
    };

    let mainContent;

    if (loading) {
        mainContent = (
            <div className="job-details-loading">
                <CircularProgress />
                <p>Loading job details...</p>
            </div>
        );
    } else if (error || !job) {
        mainContent = (
                <div className="job-details-error">
                    <FaExclamationCircle className="job-details-error-icon" />
                    <h2>Job Not Available</h2>
                    <p>{error || "Job no longer exists"}</p>
                    <button className="job-details-home-btn" onClick={() => router.push("/")}>
                        Go to Home
                </button>
            </div>
        );
    } else if (jobStatus === 'unavailable' || jobStatus === 'expired') {
        const content = getUnavailableContent();
        mainContent = content ? (
            <div className="job-details-unavailable-container">
                <div className="job-details-unavailable-content">
                    {content.icon}
                    <h2>{content.title}</h2>
                    <p className="job-details-unavailable-message">{content.message}</p>
                    <p className="job-details-unavailable-submessage">{content.subMessage}</p>
                    <button className="job-details-home-btn" onClick={() => router.push("/")}>
                        <FaBriefcase />
                        Browse Other Jobs
                    </button>
                </div>
            </div>
        ) : null;
    } else {
        mainContent = (
            <>
                <div className="job-details-wrapper">
                    <div className="job-details-section-card job-details-header-section">
                    {!isJobOwner && hasApplied && (
                        <button
                            type="button"
                            className={`job-details-save-job-btn applied-floating ${isJobSaved(job._id) ? 'job-details-saved' : ''} ${savingJobId === job._id ? 'job-details-saving' : ''}`}
                            onClick={() => handleSaveJob(job._id, job.shortId)}
                            title={isJobSaved(job._id) ? "Unsave job" : "Save job"}
                            disabled={savingJobId === job._id}
                        >
                            {savingJobId === job._id ? (
                                <CircularProgress size={14} sx={{ color: "inherit" }} />
                            ) : (
                                <>
                                    {isJobSaved(job._id) ? <FaBookmark /> : <FaRegBookmark />}
                                </>
                            )}
                        </button>
                    )}
                    <div className="job-details-title-section">
                        <h1 className="job-details-title">{job.jobTitle}</h1>
                        <div className="job-details-company-info">
                            <FaBuilding className="job-details-company-icon" />
                            <span>{job.companyName}</span>
                        </div>
                        <div className="job-details-location-info">
                            <FaMapMarkerAlt className="job-details-location-icon" />
                            <span>{job.location}</span>
                        </div>
                    </div>
                        {jobStatus === 'active' && (
                            <div className="job-details-action-buttons">
                                {isJobOwner ? (
                                    // Employer action buttons
                                    <div className="job-details-employer-action-buttons">
                                        <button
                                            type="button"
                                            className="job-details-employer-action-btn job-details-share-btn"
                                            onClick={handleShareJob}
                                            title="Share Job"
                                        >
                                            <FaShare />
                                        </button>
                                        <button
                                            type="button"
                                            className="job-details-employer-action-btn job-details-status-btn"
                                            onClick={handleOpenStatusModal}
                                            title="Update Status"
                                        >
                                            <FaSync />
                                        </button>
                                        <button
                                            type="button"
                                            className="job-details-employer-action-btn job-details-edit-btn"
                                            onClick={handleEditJob}
                                            title="Edit Job"
                                        >
                                            <FaEdit />
                                        </button>
                                        <button
                                            type="button"
                                            className="job-details-employer-action-btn job-details-delete-btn"
                                            onClick={() => setShowDeleteModal(true)}
                                            title="Delete Job"
                                        >
                                            <FaTrash />
                                        </button>
                        </div>
                                ) : (
                                    // Job seeker/public action buttons
                                    <>
                                        {!hasApplied && (
                                            <button
                                                type="button"
                                                className={`job-details-save-job-btn ${isJobSaved(job._id) ? 'job-details-saved' : ''} ${savingJobId === job._id ? 'job-details-saving' : ''}`}
                                                onClick={() => handleSaveJob(job._id, job.shortId)}
                                                title={isJobSaved(job._id) ? "Unsave job" : "Save job"}
                                                disabled={savingJobId === job._id}
                                            >
                                                {savingJobId === job._id ? (
                                                    <CircularProgress size={16} sx={{ color: "inherit" }} />
                                                ) : (
                                                    <>
                                                        {isJobSaved(job._id) ? <FaBookmark /> : <FaRegBookmark />}
                                                        <span>{isJobSaved(job._id) ? "Saved" : "Save"}</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        {hasApplied ? (
                                            <div className="job-details-applied-banner">
                                                <FaCheckCircle />
                                                <div>
                                                    <strong>Application submitted</strong>
                                                    <span>We&apos;ll notify you about updates.</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                className="job-details-apply-btn"
                                                onClick={handlePrimaryCta}
                                                disabled={
                                                    (!jobRequiresAssessment && directApplyLoading) ||
                                                    (jobRequiresAssessment && (assessmentLoading || proctoringLoading))
                                                }
                                            >
                                                {getAssessmentCtaLabel()}
                                                {isJobSeekerLoggedIn && (
                                                    (jobRequiresAssessment && (assessmentLoading || proctoringLoading)) ||
                                                    (!jobRequiresAssessment && directApplyLoading)
                                                ) && (
                                                    <CircularProgress size={16} sx={{ color: "white", ml: 1 }} />
                                                )}
                                            </button>
                                        )}
                                        {isJobSeekerLoggedIn && basicTestRequired && !hasApplied && (
                                            <div className="job-details-assessment-meta">
                                                {assessmentLoading && (
                                                    <span className="job-details-assessment-chip loading">Syncing test status...</span>
                                                )}
                                                {assessmentInfo && (
                                                    <>
                                                        <span className={`job-details-assessment-chip status-${assessmentInfo.status}`}>
                                                            {assessmentInfo.status?.replace('-', ' ')}
                                                        </span>
                                                        {assessmentInfo.requiresRegeneration && (
                                                            <span className="job-details-assessment-warning">
                                                                <FaExclamationCircle />
                                                                Job updated — regenerate test
                                                            </span>
                                                        )}
                                                        {assessmentInfo.hasPassed && (
                                                            <span className="job-details-assessment-success">
                                                                <FaCheckCircle />
                                                                Test passed
                                                            </span>
                                                        )}
                                                        {typeof latestAssessmentAttempt?.score === "number" && (
                                                            <span className="job-details-assessment-score">
                                                                Last score: {latestAssessmentAttempt.score}/100
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {isJobSeekerLoggedIn && videoTestRequired && !basicTestRequired && !hasApplied && (
                                            <div className="job-details-assessment-meta">
                                                {proctoringInfo ? (
                                                    <>
                                                        <span className={`job-details-assessment-chip status-${proctoringInfo.status}`}>
                                                            {proctoringInfo.status?.replace("-", " ")}
                                                        </span>
                                                        {proctoringInfo.status === "passed" && (
                                                            <span className="job-details-assessment-success">
                                                                <FaCheckCircle />
                                                                Video test passed
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="job-details-assessment-chip loading">Syncing video test...</span>
                                                )}
                                            </div>
                                        )}
                                        {isJobSeekerLoggedIn && assessmentInfo?.hasPassed && videoTestRequired && !hasApplied && (
                                            <div className="job-details-assessment-meta">
                                                {proctoringLoading && (
                                                    <span className="job-details-assessment-chip loading">Syncing video test...</span>
                                                )}
                                                {proctoringInfo && (
                                                    <>
                                                        <span className={`job-details-assessment-chip status-${proctoringInfo.status}`}>
                                                            {proctoringInfo.status?.replace('-', ' ')}
                                                        </span>
                                                        {proctoringInfo.status === "passed" && (
                                                            <span className="job-details-assessment-success">
                                                                <FaCheckCircle />
                                                                Video test passed
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {isJobSeekerLoggedIn && !jobRequiresAssessment && (
                                            <div className="job-details-assessment-meta">
                                                {!hasApplied && (
                                                    <span className="job-details-assessment-chip optional">
                                                        No assessments required
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                        </div>
                    )}
                </div>

                    <div className="job-details-section-card job-details-info-section">
                        <h2 className="job-details-section-title">Job Information</h2>
                <div className="job-details-info-grid">
                    <div className="job-details-info-item">
                        <FaBriefcase className="job-details-info-icon" />
                        <div>
                            <label>Job Type</label>
                            <span>{job.jobType}</span>
                        </div>
                    </div>
                    <div className="job-details-info-item">
                        <FaMapMarkerAlt className="job-details-info-icon" />
                        <div>
                            <label>Work Mode</label>
                            <span>{job.workMode}</span>
                        </div>
                    </div>
                    {job.department && (
                        <div className="job-details-info-item">
                            <FaBuilding className="job-details-info-icon" />
                            <div>
                                <label>Department</label>
                                <span>{job.department}</span>
                            </div>
                        </div>
                    )}
                    {job.experience && (
                        <div className="job-details-info-item">
                            <FaBriefcase className="job-details-info-icon" />
                            <div>
                                <label>Experience</label>
                                <span>{job.experience}</span>
                            </div>
                        </div>
                    )}
                    <div className="job-details-info-item">
                        <FaDollarSign className="job-details-info-icon" />
                        <div>
                            <label>Salary Range</label>
                            <span>{formatSalary(job.minSalary, job.maxSalary)}</span>
                        </div>
                    </div>
                    {job.numberOfOpenings && (
                        <div className="job-details-info-item">
                            <FaBriefcase className="job-details-info-icon" />
                            <div>
                                <label>Number of Openings</label>
                                <span>{job.numberOfOpenings}</span>
                            </div>
                        </div>
                    )}
                    <div className="job-details-info-item">
                        <FaCalendarAlt className="job-details-info-icon" />
                        <div>
                            <label>Opening Date</label>
                            <span>{formatDate(job.applicationOpeningDate)}</span>
                        </div>
                    </div>
                    <div className="job-details-info-item">
                        <FaCalendarAlt className="job-details-info-icon" />
                        <div>
                            <label>Closing Date</label>
                            <span>{formatDate(job.applicationClosingDate)}</span>
                        </div>
                    </div>
                </div>
                </div>

                    <div className="job-details-section-card job-details-assessment-section">
                        <h2 className="job-details-section-title">Assessment Requirements</h2>
                        <div className="job-details-assessment-grid">
                            <div className={`job-details-assessment-item ${basicTestRequired ? "required" : "optional"}`}>
                                <div className="job-details-assessment-item-header">
                                    <span>Basic application test</span>
                                    <strong>{basicTestRequired ? "Required" : "Not required"}</strong>
                                </div>
                                <p>
                                    Conversational readiness prompts plus technical MCQs that unlock the current apply flow.
                                </p>
                            </div>
                            <div className={`job-details-assessment-item ${videoTestRequired ? "required" : "optional"}`}>
                                <div className="job-details-assessment-item-header">
                                    <span>Video proctored test</span>
                                    <strong>{videoTestRequired ? "Required" : "Not required"}</strong>
                                </div>
                                <p>
                                    High-signal evaluation to showcase top talent. If this is required, you&apos;ll complete a secure,
                                    AI-proctored session during the live follow-up.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="job-details-section-card">
                        <h2 className="job-details-section-title">Job Description</h2>
                        <p className="job-details-section-content">{job.jobDescription}</p>
                    </div>

                    {job.responsibilities && (
                        <div className="job-details-section-card">
                            <h2 className="job-details-section-title">Responsibilities</h2>
                            <p className="job-details-section-content">{job.responsibilities}</p>
                    </div>
                )}

                {job.requirements && (
                        <div className="job-details-section-card">
                            <h2 className="job-details-section-title">Requirements</h2>
                            <p className="job-details-section-content">{job.requirements}</p>
                    </div>
                )}

                    {job.skills && job.skills.length > 0 && (
                        <div className="job-details-section-card">
                            <h2 className="job-details-section-title">Key Skills</h2>
                            <div className="job-details-skill-list">
                                {job.skills.map((skill, idx) => (
                                    <span key={`${job._id}-skill-${idx}`} className="job-details-skill-chip">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                    </div>
                )}

                    {job.perksAndBenefits && (
                        <div className="job-details-section-card">
                            <h2 className="job-details-section-title">Perks & Benefits</h2>
                            <p className="job-details-section-content">{job.perksAndBenefits}</p>
                    </div>
                )}

                    <div className="job-details-section-card job-details-footer-section">
                <div className="job-details-footer-info">
                    <p>Posted on {formatDate(job.createdAt)}</p>
                    {job.views > 0 && (
                        <p>{job.views} view{job.views !== 1 ? 's' : ''}</p>
                    )}
                </div>
            </div>
                </div>

                {jobStatus === 'active' && !isJobOwner && (
                    <div className="job-details-apply-btn-mobile">
                        <div className="job-details-apply-btn-mobile-buttons">
                        <button
                            type="button"
                            className={`job-details-save-job-btn-mobile ${isJobSaved(job._id) ? 'job-details-saved' : ''} ${savingJobId === job._id ? 'job-details-saving' : ''}`}
                            onClick={() => handleSaveJob(job._id, job.shortId)}
                            title={isJobSaved(job._id) ? "Unsave job" : "Save job"}
                            disabled={savingJobId === job._id}
                        >
                            {savingJobId === job._id ? (
                                <CircularProgress size={18} sx={{ color: "inherit" }} />
                            ) : (
                                isJobSaved(job._id) ? <FaBookmark /> : <FaRegBookmark />
                            )}
                        </button>
                        {hasApplied ? (
                            <div className="job-details-applied-banner">
                                <FaCheckCircle />
                                <div>
                                    <strong>Application submitted</strong>
                                    <span>We&apos;ll keep you posted.</span>
                                </div>
                            </div>
                        ) : (
                            <button
                                className="job-details-apply-btn"
                                onClick={handlePrimaryCta}
                                disabled={
                                    (!jobRequiresAssessment && directApplyLoading) ||
                                    (jobRequiresAssessment && (assessmentLoading || proctoringLoading))
                                }
                            >
                                {getAssessmentCtaLabel()}
                                {isJobSeekerLoggedIn && (
                                    (jobRequiresAssessment && (assessmentLoading || proctoringLoading)) ||
                                    (!jobRequiresAssessment && directApplyLoading)
                                ) && (
                                    <CircularProgress size={14} sx={{ color: "white", ml: 1 }} />
                                )}
                            </button>
                        )}
                        </div>
                        {isJobSeekerLoggedIn && basicTestRequired && !hasApplied && (
                            <div className="job-details-assessment-meta job-details-assessment-meta-mobile">
                                {assessmentInfo ? (
                                    <>
                                        <span className={`job-details-assessment-chip status-${assessmentInfo.status}`}>
                                            {assessmentInfo.status?.replace('-', ' ')}
                                        </span>
                                        {assessmentInfo.requiresRegeneration && (
                                            <span className="job-details-assessment-warning">
                                                <FaExclamationCircle />
                                                Regenerate required
                                            </span>
                                        )}
                                        {assessmentInfo.hasPassed && (
                                            <span className="job-details-assessment-success">
                                                <FaCheckCircle />
                                                Test passed
                                            </span>
                                        )}
                                        {typeof latestAssessmentAttempt?.score === "number" && (
                                            <span className="job-details-assessment-score">
                                                Last score: {latestAssessmentAttempt.score}/100
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="job-details-assessment-chip loading">Syncing test status...</span>
                                )}
                            </div>
                        )}
                        {isJobSeekerLoggedIn && assessmentInfo?.hasPassed && videoTestRequired && !hasApplied && (
                            <div className="job-details-assessment-meta job-details-assessment-meta-mobile">
                                {proctoringInfo ? (
                                    <>
                                        <span className={`job-details-assessment-chip status-${proctoringInfo.status}`}>
                                            {proctoringInfo.status?.replace('-', ' ')}
                                        </span>
                                        {proctoringInfo.status === "passed" ? (
                                            <span className="job-details-assessment-success">
                                                <FaCheckCircle />
                                                Video test passed
                                            </span>
                                        ) : (
                                            <span className="job-details-assessment-warning">
                                                <FaExclamationCircle />
                                                Secure video stage pending
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="job-details-assessment-chip loading">Syncing video test...</span>
                                )}
                            </div>
                        )}
                        {isJobSeekerLoggedIn && !jobRequiresAssessment && !hasApplied && (
                            <div className="job-details-assessment-meta job-details-assessment-meta-mobile">
                                <span className="job-details-assessment-chip optional">
                                    No assessments required
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </>
        );
    }

    const handleLoginSuccess = () => {
        // Refresh auth state
        const checkAuth = () => {
            const jsToken = Cookies.get("js_token");
            if (jsToken) {
                setUserType("jobseeker");
                setIsJobSeekerLoggedIn(true);
                setJobSeekerToken(jsToken);
            } else {
                setUserType(null);
                setIsJobSeekerLoggedIn(false);
                setJobSeekerToken(null);
            }
        };
        checkAuth();
        fetchProfileRequirements();
    };

    return (
        <div className={`job-details-page ${userType ? 'with-sidebar' : ''} ${job ? 'with-similar' : ''}`}>
            {isJobSeekerView && <JobSeekerSideBar />}
            {userType === 'employer' && <EmployerSideBar />}

            <div className={`job-details-content ${userType ? 'jobseeker' : ''}`}>
                <div className={`job-details-layout ${job ? 'has-similar' : 'centered'}`}>
                    <div className={`job-details-main ${job ? '' : 'compact'}`}>
                        {mainContent}
                    </div>

                    {/* Show similar jobs for all users when job is loaded */}
                    {job && (
                        <aside className="job-details-similar">
                            {renderSimilarJobs()}
                        </aside>
                    )}
                </div>
            </div>

            {job && (
                <AssessmentProfileModal
                    isOpen={showProfileRequirementModal}
                    onClose={handleCloseProfileRequirementModal}
                    requirementsData={profileRequirementData}
                    requirementsError={profileRequirementError}
                    isLoading={profileRequirementLoading}
                    token={jobSeekerToken}
                    onSaveSuccess={handleProfileModalSuccess}
                    onRetry={fetchProfileRequirements}
                    isDirectApply={pendingActionAfterProfile === 'direct'}
                />
            )}

            {job && jobRequiresAssessment && (
                <JobAssessmentDrawer
                    isOpen={showAssessmentDrawer}
                    onClose={handleCloseAssessmentDrawer}
                    job={job}
                    jobId={job._id}
                    token={jobSeekerToken}
                    baselineAssessment={assessmentInfo}
                    onAssessmentRefresh={handleAssessmentRefresh}
                    onLaunchVideoTest={handleLaunchVideoTest}
                    hasApplied={hasApplied}
                    videoTestRequired={videoTestRequired}
                />
            )}

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={handleLoginSuccess}
            />

            <Toaster position="top-right" />

            {showEmailPrompt && !isJobSeekerLoggedIn && (
                <div className="job-details-email-capture">
                    <div className="job-details-email-card">
                        <button
                            className="job-details-email-close"
                            onClick={() => setShowEmailPrompt(false)}
                            aria-label="Close"
                        >
                            <FaTimes />
                        </button>
                        <div className="job-details-email-text">
                            <strong>Get more jobs like this</strong>
                            <p>Share your email to receive updates and similar roles.</p>
                        </div>
                        <form className="job-details-email-form" onSubmit={handleEmailCaptureSubmit}>
                            <input
                                type="email"
                                value={emailForUpdates}
                                onChange={(e) => setEmailForUpdates(e.target.value)}
                                placeholder="Enter your email"
                                required
                            />
                            <label className="job-details-email-checkbox">
                                <input
                                    type="checkbox"
                                    checked={acceptTerms}
                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                />
                                <span>I agree to the terms and conditions</span>
                            </label>
                            <button type="submit" disabled={sendingEmailCapture}>
                                {sendingEmailCapture ? "Saving..." : "Send me updates"}
                            </button>
                            {emailCaptureSuccess && (
                                <div className="job-details-email-success">Saved! We will send similar jobs.</div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Job Modal */}
            {showEditModal && job && (
                <EditJobModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                    }}
                    jobId={job._id}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && job && (
                <>
                    <div className="job-details-delete-modal-overlay" onClick={() => setShowDeleteModal(false)}></div>
                    <div className="job-details-delete-modal">
                        <div className="job-details-modal-header">
                            <h2>Delete Job</h2>
                            <button
                                className="job-details-modal-close-btn"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="job-details-modal-body">
                            <p>
                                Are you sure you want to delete <strong>"{job.jobTitle}"</strong>?
                            </p>
                            <p className="job-details-warning-text">This action cannot be undone.</p>
                        </div>
                        <div className="job-details-modal-footer">
                            <button
                                className="job-details-modal-btn job-details-secondary-btn"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleteJobMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                className="job-details-modal-btn job-details-delete-btn-modal"
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

            {/* Update Status Modal */}
            {showStatusModal && job && (
                <>
                    <div className="job-details-status-modal-overlay" onClick={() => setShowStatusModal(false)}></div>
                    <div className="job-details-status-update-modal">
                        <div className="job-details-modal-header">
                            <h2>Update Job Status</h2>
                            <button
                                className="job-details-modal-close-btn"
                                onClick={() => setShowStatusModal(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="job-details-modal-body">
                            <div className="job-details-job-info-preview">
                                <h3>{job.jobTitle}</h3>
                                <p className="job-details-company-name">{job.companyName}</p>
                            </div>
                            <div className="job-details-status-selection">
                                <label>Select Status</label>
                                <div className="job-details-status-options">
                                    {["Draft", "Active", "Inactive", "Closed"].map((status) => (
                                        <div
                                            key={status}
                                            className={`job-details-status-option ${selectedStatus === status ? 'job-details-selected' : ''}`}
                                            onClick={() => setSelectedStatus(status)}
                                        >
                                            <div className="job-details-status-indicator">
                                                {getStatusIcon(status)}
                                            </div>
                                            <span>{status}</span>
                                            {selectedStatus === status && (
                                                <FaCheck className="job-details-check-icon" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="job-details-modal-footer">
                            <button
                                className="job-details-modal-btn job-details-secondary-btn"
                                onClick={() => setShowStatusModal(false)}
                                disabled={updateJobMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                className="job-details-modal-btn job-details-primary-btn"
                                onClick={handleUpdateStatus}
                                disabled={updateJobMutation.isPending || !selectedStatus || selectedStatus === job.status}
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
        </div>
    );
};

export default JobDetailsPage;
