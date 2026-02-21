"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { FaBriefcase, FaBuilding, FaMapMarkerAlt, FaDollarSign, FaCalendarAlt, FaEnvelope, FaEdit, FaFileAlt, FaMagic, FaPlus, FaEllipsisV } from "react-icons/fa";
import { HiChevronDown, HiCheck } from "react-icons/hi2";
import { useEmployerProfile } from "@/hooks/useEmployerProfile";
import { usePostJob } from "@/hooks/usePostJob";
import { useUpdateJob, useJobById } from "@/hooks/useEmployerJobs";
import { usePostSmartPostJob } from "@/hooks/useSmartPost";
import { useDispatch, useSelector } from 'react-redux';
import { initializeDrafts, saveDraft, deleteDraft } from '@/store/draftsSlice';
import { useBackgroundGeneration } from '@/contexts/BackgroundGenerationContext';
import DraftsSidebar from '@/components/draftsSidebar/DraftsSidebar';
import AIGenerateModal from '@/components/aiGenerateModal/AIGenerateModal';
import SkillSelector from '@/components/skills/SkillSelector';
import { Toaster, toast } from "react-hot-toast";
import "./page.css";

const PostJobScreen = ({ isEditMode = false, jobId = null, onClose = null, onSuccess = null, scrollContainerRef = null, initialJobData = null, isSmartPost = false, smartPostJobId = null }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const drafts = useSelector((state) => state.drafts.drafts);
    const { activeTasks, completedTasks, removeCompletedTask } = useBackgroundGeneration();
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [errors, setErrors] = useState({});
    const [showDraftsSidebar, setShowDraftsSidebar] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [currentDraftId, setCurrentDraftId] = useState(null);
    // Track the draftId that is tied to the latest AI background generation for this page
    const [aiDraftId, setAiDraftId] = useState(null);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const draftSaveTimeoutRef = useRef(null);

    // Determine when AI modal should be disabled for the CURRENT job:
    // - If there is an active background generation task for this job's draftId, OR
    // - If this job has a draftId but that draftId is not present in drafts (i.e. generation started / draft removed)
    const hasDraftForAiId =
        !!aiDraftId && Array.isArray(drafts) && drafts.some((d) => d.id === aiDraftId);
    const hasActiveGenerationForAiId =
        !!aiDraftId &&
        Array.isArray(activeTasks) &&
        activeTasks.some((task) => task.draftId === aiDraftId && task.status === 'generating');

    // Disable AI modal if:
    // - There's an active generation for the AI draft, OR
    // - There is an AI draftId but that draft is not present in drafts (still generating / removed)
    const shouldDisableAIModal =
        hasActiveGenerationForAiId || (!!aiDraftId && !hasDraftForAiId);

    // Fetch profile data for auto-fill
    const { data: profileData } = useEmployerProfile();
    const postJobMutation = usePostJob();
    const updateJobMutation = useUpdateJob();
    const postSmartPostMutation = usePostSmartPostJob();
    
    // Fetch job data if in edit mode
    const { data: jobData, isLoading: loadingJob } = useJobById(isEditMode && jobId ? jobId : null);

    // Basic Information
    const [jobTitle, setJobTitle] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [isEditingCompanyName, setIsEditingCompanyName] = useState(false);
    const [jobType, setJobType] = useState("");
    const [showJobTypeDropdown, setShowJobTypeDropdown] = useState(false);
    const [department, setDepartment] = useState("");
    const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
    const [employmentType, setEmploymentType] = useState("");
    const [showEmploymentTypeDropdown, setShowEmploymentTypeDropdown] = useState(false);
    const [experience, setExperience] = useState("");
    const [showExperienceDropdown, setShowExperienceDropdown] = useState(false);
    const [workMode, setWorkMode] = useState("");
    const [showWorkModeDropdown, setShowWorkModeDropdown] = useState(false);
    const [location, setLocation] = useState("");
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [isCustomLocation, setIsCustomLocation] = useState(false);
    const [customLocation, setCustomLocation] = useState("");
    const [highestQualification, setHighestQualification] = useState("");
    const [showQualificationDropdown, setShowQualificationDropdown] = useState(false);
    const [isCustomQualification, setIsCustomQualification] = useState(false);
    const [customQualification, setCustomQualification] = useState("");

    // Salary & Dates
    const [minSalary, setMinSalary] = useState("");
    const [maxSalary, setMaxSalary] = useState("");
    const [numberOfOpenings, setNumberOfOpenings] = useState("");
    const [applicationOpeningDate, setApplicationOpeningDate] = useState("");
    const [applicationClosingDate, setApplicationClosingDate] = useState("");
    const [hiringManagerEmail, setHiringManagerEmail] = useState("");
    const [isEditingEmail, setIsEditingEmail] = useState(false);

    // Detailed Information
    const [jobDescription, setJobDescription] = useState("");
    const [responsibilities, setResponsibilities] = useState("");
    const [requirements, setRequirements] = useState("");
    const [perksAndBenefits, setPerksAndBenefits] = useState("");
    const [skills, setSkills] = useState([]);
    const [requiresBasicTest, setRequiresBasicTest] = useState(true);
    const [requiresVideoProctoredTest, setRequiresVideoProctoredTest] = useState(false);

    // Dropdown refs
    const jobTypeRef = useRef(null);
    const departmentRef = useRef(null);
    const employmentTypeRef = useRef(null);
    const experienceRef = useRef(null);
    const workModeRef = useRef(null);
    const locationRef = useRef(null);
    const qualificationRef = useRef(null);

    // Dropdown position states for mobile
    const [jobTypeDropdownPosition, setJobTypeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [departmentDropdownPosition, setDepartmentDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [employmentTypeDropdownPosition, setEmploymentTypeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [experienceDropdownPosition, setExperienceDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [workModeDropdownPosition, setWorkModeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [locationDropdownPosition, setLocationDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [qualificationDropdownPosition, setQualificationDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    
    const [isMobile, setIsMobile] = useState(false);

    // Dropdown options
    const jobTypes = ["Full-time", "Part-time", "Internship", "Freelance", "Contract", "Temporary"];
    const employmentTypes = ["Permanent", "Contract", "Temporary"];
    const workModes = ["Onsite", "Hybrid", "Remote"];
    const popularLocations = [
        "Bangalore, Karnataka", "Mumbai, Maharashtra", "Delhi NCR", "Hyderabad, Telangana",
        "Pune, Maharashtra", "Chennai, Tamil Nadu", "Kolkata, West Bengal", "Ahmedabad, Gujarat",
        "Jaipur, Rajasthan", "Chandigarh, Punjab", "Indore, Madhya Pradesh", "Gurgaon, Haryana",
        "Noida, Uttar Pradesh", "Kochi, Kerala", "Coimbatore, Tamil Nadu", "Goa"
    ];
    const qualifications = [
        "10th Pass", "12th Pass", "Diploma", "Bachelor's Degree", "Master's Degree",
        "MBA", "Ph.D.", "Professional Degree", "Technical Certification", "Other"
    ];
    const experienceLevels = [
        "Fresher", "0-1 years", "1-2 years", "2-3 years", "3-5 years",
        "5-7 years", "7-10 years", "10+ years"
    ];
    const departments = [
        "IT/Software", "Sales & Marketing", "HR", "Finance", "Operations",
        "Engineering", "Product", "Design", "Customer Support", "Legal",
        "Administration", "Manufacturing", "Healthcare", "Education", "Other"
    ];

    // Client-side only mount check
    useEffect(() => {
        setMounted(true);
    }, []);

    // Auto-open AI modal if ?ai=true query parameter is present
    useEffect(() => {
        const hasAiParam = searchParams?.get("ai") === "true";
        
        if (mounted && !isEditMode && hasAiParam && !showAIModal && !shouldDisableAIModal) {
            setShowAIModal(true);
            // Remove the query parameter from URL after opening modal
            router.replace("/employer/post-job", { scroll: false });
        }
    }, [mounted, isEditMode, searchParams, showAIModal, shouldDisableAIModal, router]);

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            const wasMobile = isMobile;
            setIsMobile(window.innerWidth <= 768);
            // Close mobile menu if switching from mobile to desktop
            if (wasMobile && window.innerWidth > 768) {
                setShowMobileMenu(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [isMobile]);

    // Close mobile menu when clicking outside
    useEffect(() => {
        if (!isMobile || !showMobileMenu) return;

        const handleClickOutside = (event) => {
            if (!event.target.closest('.employee-postjob-header')) {
                setShowMobileMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, showMobileMenu]);

    // Calculate dropdown position for mobile
    const updateDropdownPosition = (selectRef, setPosition) => {
        if (selectRef.current) {
            const rect = selectRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width
            });
        }
    };

    // Initialize drafts for current employer
    useEffect(() => {
        if (profileData?._id) {
            dispatch(initializeDrafts(profileData._id));
        }
    }, [profileData?._id, dispatch]);

    // Auto-fill from profile (only if not loading a draft and not in smart post mode)
    useEffect(() => {
        if (profileData && !currentDraftId && !isSmartPost) {
            if (profileData.companyName && !companyName) {
                setCompanyName(profileData.companyName);
            }
            if (profileData.email && !hiringManagerEmail) {
                setHiringManagerEmail(profileData.email);
            }
        }
    }, [profileData, currentDraftId, companyName, hiringManagerEmail, isSmartPost]);

    // Load job data when in edit mode or smart post mode
    useEffect(() => {
        const dataToLoad = isEditMode ? jobData : (isSmartPost ? initialJobData : null);
        
        if (dataToLoad) {
            // Format dates properly - handle both ISO strings and Date objects
            const formatDate = (dateValue) => {
                if (!dateValue) return "";
                if (typeof dateValue === 'string') {
                    // If it's already in YYYY-MM-DD format, return as is
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                        return dateValue;
                    }
                    // Otherwise parse and format
                    return new Date(dateValue).toISOString().split("T")[0];
                }
                return new Date(dateValue).toISOString().split("T")[0];
            };

            setJobTitle(dataToLoad.jobTitle || "");
            setCompanyName(dataToLoad.companyName || "");
            setJobType(dataToLoad.jobType || "");
            setDepartment(dataToLoad.department || "");
            setEmploymentType(dataToLoad.employmentType || "");
            setExperience(dataToLoad.experience || "");
            setWorkMode(dataToLoad.workMode || "");
            setLocation(dataToLoad.location || "");
            setIsCustomLocation(false);
            setCustomLocation("");
            setHighestQualification(dataToLoad.highestQualification || "");
            setIsCustomQualification(false);
            setCustomQualification("");
            setMinSalary(dataToLoad.minSalary ? String(dataToLoad.minSalary) : "");
            setMaxSalary(dataToLoad.maxSalary ? String(dataToLoad.maxSalary) : "");
            setNumberOfOpenings(dataToLoad.numberOfOpenings ? String(dataToLoad.numberOfOpenings) : "");
            setApplicationOpeningDate(formatDate(dataToLoad.applicationOpeningDate));
            setApplicationClosingDate(formatDate(dataToLoad.applicationClosingDate));
            setHiringManagerEmail(dataToLoad.hiringManagerEmail || "");
            setJobDescription(dataToLoad.jobDescription || "");
            setResponsibilities(dataToLoad.responsibilities || "");
            setRequirements(dataToLoad.requirements || "");
            setPerksAndBenefits(dataToLoad.perksAndBenefits || "");
            setSkills(Array.isArray(dataToLoad.skills) ? dataToLoad.skills : []);
            setRequiresBasicTest(dataToLoad.requiresBasicTest !== undefined ? toBoolean(dataToLoad.requiresBasicTest, true) : true);
            setRequiresVideoProctoredTest(toBoolean(dataToLoad.requiresVideoProctoredTest, false));
        }
    }, [isEditMode, jobData, isSmartPost, initialJobData]);

    // Update dropdown position when opened (desktop only - mobile position calculated synchronously)
    useEffect(() => {
        if (!isMobile && showJobTypeDropdown && jobTypeRef.current) {
            updateDropdownPosition(jobTypeRef, setJobTypeDropdownPosition);
        }
    }, [showJobTypeDropdown, isMobile]);

    useEffect(() => {
        if (!isMobile && showDepartmentDropdown && departmentRef.current) {
            updateDropdownPosition(departmentRef, setDepartmentDropdownPosition);
        }
    }, [showDepartmentDropdown, isMobile]);

    useEffect(() => {
        if (!isMobile && showEmploymentTypeDropdown && employmentTypeRef.current) {
            updateDropdownPosition(employmentTypeRef, setEmploymentTypeDropdownPosition);
        }
    }, [showEmploymentTypeDropdown, isMobile]);

    useEffect(() => {
        if (!isMobile && showExperienceDropdown && experienceRef.current) {
            updateDropdownPosition(experienceRef, setExperienceDropdownPosition);
        }
    }, [showExperienceDropdown, isMobile]);

    useEffect(() => {
        if (!isMobile && showWorkModeDropdown && workModeRef.current) {
            updateDropdownPosition(workModeRef, setWorkModeDropdownPosition);
        }
    }, [showWorkModeDropdown, isMobile]);

    useEffect(() => {
        if (!isMobile && showLocationDropdown && locationRef.current) {
            updateDropdownPosition(locationRef, setLocationDropdownPosition);
        }
    }, [showLocationDropdown, isMobile]);

    useEffect(() => {
        if (!isMobile && showQualificationDropdown && qualificationRef.current) {
            updateDropdownPosition(qualificationRef, setQualificationDropdownPosition);
        }
    }, [showQualificationDropdown, isMobile]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.employee-postjob-custom-dropdown')) {
                setShowJobTypeDropdown(false);
                setShowDepartmentDropdown(false);
                setShowEmploymentTypeDropdown(false);
                setShowExperienceDropdown(false);
                setShowWorkModeDropdown(false);
                setShowLocationDropdown(false);
                setShowQualificationDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdowns on scroll (mobile only) - better performance than updating positions
    useEffect(() => {
        if (!isMobile) return;

        const handleScroll = () => {
            setShowJobTypeDropdown(false);
            setShowDepartmentDropdown(false);
            setShowEmploymentTypeDropdown(false);
            setShowExperienceDropdown(false);
            setShowWorkModeDropdown(false);
            setShowLocationDropdown(false);
            setShowQualificationDropdown(false);
        };

        // If in edit mode and scrollContainerRef is provided, listen to that container's scroll
        // Otherwise listen to window scroll (normal mode)
        const scrollTarget = (isEditMode && scrollContainerRef?.current) ? scrollContainerRef.current : window;
        
        scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            scrollTarget.removeEventListener('scroll', handleScroll);
        };
    }, [isMobile, isEditMode, scrollContainerRef]);

    // Helper function to safely trim strings
    const safeTrim = (value) => {
        if (value === null || value === undefined) return "";
        if (typeof value !== "string") return String(value || "").trim();
        return value.trim();
    };

    // Helper to normalize boolean-like values (handles strings like "true"/"false")
    const toBoolean = (value, defaultValue = false) => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            const lower = value.toLowerCase();
            if (lower === "true") return true;
            if (lower === "false") return false;
        }
        return Boolean(value);
    };

    // Validation functions
    const validateField = (name, value) => {
        const newErrors = { ...errors };

        switch (name) {
            case "jobTitle":
                const jobTitleTrimmed = safeTrim(value);
                if (!value || jobTitleTrimmed.length < 3) {
                    newErrors.jobTitle = "Job title must be at least 3 characters";
                } else {
                    delete newErrors.jobTitle;
                }
                break;
            case "companyName":
                const companyNameTrimmed = safeTrim(value);
                if (!value || companyNameTrimmed.length < 2) {
                    newErrors.companyName = "Company name is employee-postjob-required";
                } else {
                    delete newErrors.companyName;
                }
                break;
            case "minSalary":
                if (value && (isNaN(value) || parseFloat(value) < 0)) {
                    newErrors.minSalary = "Enter a valid minimum salary";
                } else {
                    delete newErrors.minSalary;
                }
                break;
            case "maxSalary":
                if (value && (isNaN(value) || parseFloat(value) < 0)) {
                    newErrors.maxSalary = "Enter a valid maximum salary";
                } else if (value && minSalary && parseFloat(value) < parseFloat(minSalary)) {
                    newErrors.maxSalary = "Maximum salary must be greater than minimum salary";
                } else {
                    delete newErrors.maxSalary;
                }
                break;
            case "numberOfOpenings":
                if (value && (isNaN(value) || parseInt(value) < 1 || !Number.isInteger(parseFloat(value)))) {
                    newErrors.numberOfOpenings = "Enter a valid number of openings (minimum 1)";
                } else {
                    delete newErrors.numberOfOpenings;
                }
                break;
            case "applicationOpeningDate":
                if (!value) {
                    newErrors.applicationOpeningDate = "Opening date is employee-postjob-required";
                } else {
                    const date = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (!isEditMode && date < today) {
                        newErrors.applicationOpeningDate = "Opening date cannot be in the past";
                    } else {
                        delete newErrors.applicationOpeningDate;
                    }
                }
                break;
            case "applicationClosingDate":
                if (!value) {
                    newErrors.applicationClosingDate = "Closing date is employee-postjob-required";
                } else if (applicationOpeningDate && value <= applicationOpeningDate) {
                    newErrors.applicationClosingDate = "Closing date must be after opening date";
                } else {
                    delete newErrors.applicationClosingDate;
                }
                break;
            case "hiringManagerEmail":
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value || !emailRegex.test(value)) {
                    newErrors.hiringManagerEmail = "Enter a valid email address";
                } else {
                    delete newErrors.hiringManagerEmail;
                }
                break;
            case "jobDescription":
                const jobDescTrimmed = safeTrim(value);
                if (!value || jobDescTrimmed.length < 50) {
                    newErrors.jobDescription = "Job description must be at least 50 characters";
                } else {
                    delete newErrors.jobDescription;
                }
                break;
            default:
                break;
        }

        setErrors(newErrors);
        return !newErrors[name];
    };

    // Save draft function
    // Accepts optional overrides so we can immediately persist the latest values (e.g. assessment toggles)
    const saveDraftToStore = (overrides = {}) => {
        // Don't save drafts in edit mode or smart post mode
        if (isEditMode || isSmartPost) return;
        // Only save if there's at least job title and employer ID
        if (!safeTrim(jobTitle) || !profileData?._id) return;

        const finalLocation = isCustomLocation ? customLocation : location;
        const draftData = {
            id: currentDraftId || undefined,
            jobTitle: safeTrim(jobTitle),
            companyName: safeTrim(companyName),
            jobType,
            department: safeTrim(department) || "",
            employmentType: employmentType || "Permanent",
            experience: experience || "",
            workMode,
            location: safeTrim(finalLocation) || "",
            isCustomLocation,
            customLocation: safeTrim(customLocation) || "",
            highestQualification: isCustomQualification ? safeTrim(customQualification) : safeTrim(highestQualification),
            isCustomQualification,
            customQualification: safeTrim(customQualification) || "",
            minSalary: minSalary || "",
            maxSalary: maxSalary || "",
            numberOfOpenings: numberOfOpenings || "",
            applicationOpeningDate,
            applicationClosingDate,
            hiringManagerEmail: safeTrim(hiringManagerEmail),
            jobDescription: safeTrim(jobDescription),
            responsibilities: safeTrim(responsibilities) || "",
            requirements: safeTrim(requirements) || "",
            perksAndBenefits: safeTrim(perksAndBenefits) || "",
            requiresBasicTest: overrides.requiresBasicTest !== undefined ? overrides.requiresBasicTest : requiresBasicTest,
            requiresVideoProctoredTest: overrides.requiresVideoProctoredTest !== undefined ? overrides.requiresVideoProctoredTest : requiresVideoProctoredTest,
            skills: Array.isArray(skills) ? skills.map(skill => safeTrim(skill)).filter(Boolean) : [],
        };

        dispatch(saveDraft({ draftData, employerId: profileData._id }));
    };

    // Auto-save draft when form changes (debounced) - only in create mode (not smart post)
    useEffect(() => {
        if (!mounted || isEditMode || isSmartPost) return;

        // Clear previous timeout
        if (draftSaveTimeoutRef.current) {
            clearTimeout(draftSaveTimeoutRef.current);
        }

        // Save draft after 1 second of no changes
        draftSaveTimeoutRef.current = setTimeout(() => {
            saveDraftToStore();
        }, 1000);

        return () => {
            if (draftSaveTimeoutRef.current) {
                clearTimeout(draftSaveTimeoutRef.current);
            }
        };
    }, [
        jobTitle, companyName, jobType, department, employmentType, experience, workMode,
        location, isCustomLocation, customLocation, highestQualification, isCustomQualification,
        customQualification, minSalary, maxSalary, numberOfOpenings, applicationOpeningDate, applicationClosingDate,
        hiringManagerEmail, jobDescription, responsibilities, requirements, perksAndBenefits, skills,
        requiresBasicTest, requiresVideoProctoredTest,
        mounted, currentDraftId, profileData?._id, isEditMode, isSmartPost
    ]);

    // Update current draft ID when drafts are updated (not in smart post mode)
    useEffect(() => {
        if (!mounted || currentDraftId || !safeTrim(jobTitle) || isSmartPost) return;

        // Find the most recently updated draft with matching job title
        const matchingDraft = drafts.find(d => 
            d.jobTitle === safeTrim(jobTitle) && 
            d.companyName === (safeTrim(companyName) || profileData?.companyName || "")
        );
        
        if (matchingDraft && matchingDraft.id) {
            setCurrentDraftId(matchingDraft.id);
        }
    }, [drafts, jobTitle, companyName, mounted, currentDraftId, profileData, isSmartPost]);

    // Load draft into form
    const handleLoadDraft = (draft) => {
        setJobTitle(draft.jobTitle || "");
        setCompanyName(draft.companyName || "");
        setJobType(draft.jobType || "");
        setDepartment(draft.department || "");
        setEmploymentType(draft.employmentType || "");
        setExperience(draft.experience || "");
        setWorkMode(draft.workMode || "");
        setLocation(draft.location || "");
        setIsCustomLocation(draft.isCustomLocation || false);
        setCustomLocation(draft.customLocation || "");
        setHighestQualification(draft.highestQualification || "");
        setIsCustomQualification(draft.isCustomQualification || false);
        setCustomQualification(draft.customQualification || "");
        setMinSalary(draft.minSalary || "");
        setMaxSalary(draft.maxSalary || "");
        setNumberOfOpenings(draft.numberOfOpenings || "");
        setApplicationOpeningDate(draft.applicationOpeningDate || "");
        setApplicationClosingDate(draft.applicationClosingDate || "");
        // Prefer draft email; if missing (older drafts), fall back to profile email if available
        if (draft.hiringManagerEmail) {
            setHiringManagerEmail(draft.hiringManagerEmail);
        } else if (profileData?.email) {
            setHiringManagerEmail(profileData.email);
        } else {
            setHiringManagerEmail("");
        }
        setJobDescription(draft.jobDescription || "");
        setResponsibilities(draft.responsibilities || "");
        setRequirements(draft.requirements || "");
        setPerksAndBenefits(draft.perksAndBenefits || "");
        setSkills(draft.skills || []);
        setRequiresBasicTest(draft.requiresBasicTest !== undefined ? toBoolean(draft.requiresBasicTest, true) : true);
        setRequiresVideoProctoredTest(toBoolean(draft.requiresVideoProctoredTest, false));
        setCurrentDraftId(draft.id);
        setShowDraftsSidebar(false);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Reset form to initial state
    const resetForm = () => {
        setJobTitle("");
        setIsEditingCompanyName(false);
        setJobType("");
        setShowJobTypeDropdown(false);
        setDepartment("");
        setShowDepartmentDropdown(false);
        setEmploymentType("");
        setShowEmploymentTypeDropdown(false);
        setExperience("");
        setShowExperienceDropdown(false);
        setWorkMode("");
        setShowWorkModeDropdown(false);
        setLocation("");
        setShowLocationDropdown(false);
        setIsCustomLocation(false);
        setCustomLocation("");
        setHighestQualification("");
        setShowQualificationDropdown(false);
        setIsCustomQualification(false);
        setCustomQualification("");
        setMinSalary("");
        setMaxSalary("");
        setNumberOfOpenings("");
        setApplicationOpeningDate("");
        setApplicationClosingDate("");
        setIsEditingEmail(false);
        setJobDescription("");
        setResponsibilities("");
        setRequirements("");
        setPerksAndBenefits("");
        setSkills([]);
        setRequiresBasicTest(true);
        setRequiresVideoProctoredTest(false);
        setErrors({});
        setCurrentDraftId(null);
        // Reset company name and email to profile values if available
        if (profileData) {
            if (profileData.companyName) {
                setCompanyName(profileData.companyName);
            } else {
                setCompanyName("");
            }
            if (profileData.email) {
                setHiringManagerEmail(profileData.email);
            } else {
                setHiringManagerEmail("");
            }
        } else {
            setCompanyName("");
            setHiringManagerEmail("");
        }
    };

    // Start new draft:
    // 1) Save the current form as a draft (including assessment details)
    // 2) Clear currentDraftId so new changes go into a fresh draft
    // 3) Reset the form fields for a clean start
    const handleNewDraft = () => {
        // Prevent any pending auto-save from running with reset values
        if (draftSaveTimeoutRef.current) {
            clearTimeout(draftSaveTimeoutRef.current);
        }

        // Save current form state into a draft (if valid to save)
        saveDraftToStore();

        // Reset and clear current draft ID for a fresh draft
        resetForm();

        setSuccess("New draft started. Your current job details were saved as a draft.");
        setTimeout(() => {
            setSuccess("");
        }, 2000);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Check if all employee-postjob-required fields are valid
    const isFormValid = () => {
        // Check for any errors first
        if (Object.keys(errors).length > 0) {
            return false;
        }

        // Validate employee-postjob-required text fields
        if (!jobTitle || safeTrim(jobTitle).length < 3) {
            return false;
        }

        if (!companyName || safeTrim(companyName).length < 2) {
            return false;
        }

        const hiringEmailTrimmed = safeTrim(hiringManagerEmail);
        if (!hiringManagerEmail || !hiringEmailTrimmed) {
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(hiringEmailTrimmed)) {
            return false;
        }

        if (!jobDescription || safeTrim(jobDescription).length < 50) {
            return false;
        }

        // Check dropdown selections
        if (!jobType) {
            return false;
        }

        if (!workMode) {
            return false;
        }

        // Check location
        const finalLocation = isCustomLocation ? customLocation : location;
        if (!finalLocation || !safeTrim(finalLocation)) {
            return false;
        }

        // Check dates
        if (!applicationOpeningDate) {
            return false;
        }

        if (!applicationClosingDate) {
            return false;
        }

        // Validate date ranges
        const openingDate = new Date(applicationOpeningDate);
        const closingDate = new Date(applicationClosingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!isEditMode && openingDate < today) {
            return false;
        }

        if (closingDate <= openingDate) {
            return false;
        }

        // Validate salary if provided
        if (minSalary && (isNaN(minSalary) || parseFloat(minSalary) < 0)) {
            return false;
        }

        if (maxSalary && (isNaN(maxSalary) || parseFloat(maxSalary) < 0)) {
            return false;
        }

        if (minSalary && maxSalary && parseFloat(maxSalary) < parseFloat(minSalary)) {
            return false;
        }

        return true;
    };

    // Handle form submit
    const handleSubmit = async (e, status = "Active") => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        setError("");
        setSuccess("");

        // Validate all employee-postjob-required fields
        const validations = [
            validateField("jobTitle", jobTitle),
            validateField("companyName", companyName),
            validateField("applicationOpeningDate", applicationOpeningDate),
            validateField("applicationClosingDate", applicationClosingDate),
            validateField("hiringManagerEmail", hiringManagerEmail),
            validateField("jobDescription", jobDescription)
        ];

        if (validations.some(v => !v) || Object.keys(errors).length > 0) {
            setError("Please fix all validation errors before submitting");
            return;
        }

        if (!jobType) {
            setError("Please select a job type");
            return;
        }

        if (!workMode) {
            setError("Please select a work mode");
            return;
        }

        const finalLocation = isCustomLocation ? customLocation : location;
        if (!finalLocation) {
            setError("Please select or enter a location");
            return;
        }

        try {
            const jobDataPayload = {
                jobTitle: safeTrim(jobTitle),
                companyName: safeTrim(companyName),
                jobType,
                department: safeTrim(department) || "",
                employmentType: employmentType || "Permanent",
                experience: experience || "",
                workMode,
                location: safeTrim(finalLocation),
                highestQualification: isCustomQualification ? safeTrim(customQualification) : safeTrim(highestQualification),
                minSalary: minSalary ? parseFloat(minSalary) : null,
                maxSalary: maxSalary ? parseFloat(maxSalary) : null,
                numberOfOpenings: numberOfOpenings ? parseInt(numberOfOpenings) : null,
                applicationOpeningDate,
                applicationClosingDate,
                hiringManagerEmail: hiringManagerEmail ? safeTrim(hiringManagerEmail).toLowerCase() : "",
                jobDescription: safeTrim(jobDescription),
                responsibilities: safeTrim(responsibilities) || "",
                requirements: safeTrim(requirements) || "",
                perksAndBenefits: safeTrim(perksAndBenefits) || "",
                skills: Array.isArray(skills) ? skills.map(skill => safeTrim(skill)).filter(Boolean) : [],
                requiresBasicTest,
                requiresVideoProctoredTest,
                status: status
            };

            if (isEditMode && jobId) {
                // Update existing job
                await updateJobMutation.mutateAsync({ jobId, data: jobDataPayload });
                setSuccess("Job updated successfully!");
                if (onSuccess) {
                    onSuccess();
                }
            } else if (isSmartPost && smartPostJobId) {
                // Post from smart post - update the smart post job with any changes, then post
                await postSmartPostMutation.mutateAsync({ 
                    smartPostJobId, 
                    jobData: jobDataPayload 
                });
                setSuccess("Job posted successfully!");
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                // Create new job
                await postJobMutation.mutateAsync(jobDataPayload);

                // Delete draft after successful posting
                if (currentDraftId && profileData?._id) {
                    dispatch(deleteDraft({ draftId: currentDraftId, employerId: profileData._id }));
                }

                const isDraft = status === "Draft";
                setSuccess(isDraft ? "Job saved as draft successfully!" : "Job posted successfully!");
                if (!isDraft) {
                    toast.success("🚀 Job posted! Track applications in Jobs or Applications.", {
                        position: "top-right",
                        autoClose: 4500,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                        theme: "colored",
                    });
                }
                resetForm();
            }

            setTimeout(() => {
                setSuccess("");
                if (isEditMode && onClose) {
                    onClose();
                }
            }, 2000);

        } catch (err) {
            if (err.response?.status !== 401) {
                setError(err.response?.data?.message || (isEditMode ? "Failed to update job. Please try again." : "Failed to post job. Please try again."));
            }
        }
    };

    // Handle AI generation result (from immediate generation)
    const handleAIGenerate = (generatedContent) => {
        fillFormFromGenerated(generatedContent);
        setSuccess("Job description generated successfully!");
        
        // Trigger draft save after AI generation to ensure skills are saved
        if (!isEditMode && profileData?._id && jobTitle.trim()) {
            // Use a small delay to ensure state updates are complete
            setTimeout(() => {
                saveDraftToStore();
            }, 100);
        }
        
        setTimeout(() => {
            setSuccess("");
        }, 3000);
    };

    // Fill form fields from generated content
    const fillFormFromGenerated = (generatedContent) => {
        if (generatedContent.jobDescription) {
            const jobDesc = typeof generatedContent.jobDescription === 'string' 
                ? generatedContent.jobDescription 
                : String(generatedContent.jobDescription || '');
            setJobDescription(jobDesc);
            validateField("jobDescription", jobDesc);
        }
        if (generatedContent.responsibilities) {
            const resp = typeof generatedContent.responsibilities === 'string' 
                ? generatedContent.responsibilities 
                : String(generatedContent.responsibilities || '');
            setResponsibilities(resp);
        }
        if (generatedContent.requirements) {
            const req = typeof generatedContent.requirements === 'string' 
                ? generatedContent.requirements 
                : String(generatedContent.requirements || '');
            setRequirements(req);
        }
        if (generatedContent.perksAndBenefits) {
            const perks = typeof generatedContent.perksAndBenefits === 'string' 
                ? generatedContent.perksAndBenefits 
                : String(generatedContent.perksAndBenefits || '');
            setPerksAndBenefits(perks);
        }
        if (Array.isArray(generatedContent.skills)) {
            setSkills(generatedContent.skills
                .map(skill => typeof skill === 'string' ? skill : String(skill || ''))
                .filter(Boolean));
        }
    };

    // Handle form updates from modal (bidirectional auto-fill)
    const handleFormUpdateFromModal = (modalFormData) => {
        // Also update job description when background generation returns full content
        if (modalFormData.jobDescription !== undefined) {
            const jd = typeof modalFormData.jobDescription === 'string'
                ? modalFormData.jobDescription
                : String(modalFormData.jobDescription || '');
            setJobDescription(jd);
            validateField("jobDescription", jd);
        }
        if (modalFormData.jobTitle) setJobTitle(modalFormData.jobTitle);
        if (modalFormData.companyName) setCompanyName(modalFormData.companyName);
        if (modalFormData.jobType) setJobType(modalFormData.jobType);
        if (modalFormData.department) setDepartment(modalFormData.department);
        if (modalFormData.employmentType) setEmploymentType(modalFormData.employmentType);
        if (modalFormData.experience) setExperience(modalFormData.experience);
        if (modalFormData.workMode) setWorkMode(modalFormData.workMode);
        if (modalFormData.location) {
            setLocation(modalFormData.location);
            setIsCustomLocation(false);
        }
        if (modalFormData.isCustomLocation) {
            setIsCustomLocation(true);
            setCustomLocation(modalFormData.customLocation || '');
        }
        if (modalFormData.highestQualification) {
            setHighestQualification(modalFormData.highestQualification);
            setIsCustomQualification(false);
        }
        if (modalFormData.isCustomQualification) {
            setIsCustomQualification(true);
            setCustomQualification(modalFormData.customQualification || '');
        }
        if (modalFormData.minSalary !== undefined) setMinSalary(modalFormData.minSalary ? String(modalFormData.minSalary) : '');
        if (modalFormData.maxSalary !== undefined) setMaxSalary(modalFormData.maxSalary ? String(modalFormData.maxSalary) : '');
        if (modalFormData.numberOfOpenings !== undefined) setNumberOfOpenings(modalFormData.numberOfOpenings ? String(modalFormData.numberOfOpenings) : '');
        if (modalFormData.applicationOpeningDate) setApplicationOpeningDate(modalFormData.applicationOpeningDate);
        if (modalFormData.applicationClosingDate) setApplicationClosingDate(modalFormData.applicationClosingDate);
        if (modalFormData.responsibilities !== undefined) setResponsibilities(modalFormData.responsibilities);
        if (modalFormData.requirements !== undefined) setRequirements(modalFormData.requirements);
        if (modalFormData.perksAndBenefits !== undefined) setPerksAndBenefits(modalFormData.perksAndBenefits);
        if (Array.isArray(modalFormData.skills)) setSkills(modalFormData.skills);
    };

    // Handle background generation completion
    useEffect(() => {
        completedTasks.forEach((task) => {
            if (task.status === 'completed' && task.result) {
                // Set current draft ID if it exists (so we know which draft was updated)
                if (task.draftId && !currentDraftId) {
                    setCurrentDraftId(task.draftId);
                }
                
                // Don't auto-fill the form - the draft has already been updated with generated content
                // User should click on the draft to load it into the form
                // Only show a notification that generation is complete
                setSuccess("Job description generated! Check your drafts to load it.");
                setTimeout(() => {
                    setSuccess("");
                    removeCompletedTask(task.id);
                }, 4000);
            } else if (task.status === 'error') {
                setError(`Generation failed: ${task.error || 'Unknown error'}`);
                setTimeout(() => {
                    setError("");
                    removeCompletedTask(task.id);
                }, 5000);
            }
        });
    }, [completedTasks, removeCompletedTask, currentDraftId]);

    // Prepare form data for AI modal
    const getFormDataForAI = () => {
        const finalLocation = isCustomLocation ? customLocation : location;
        const finalQualification = isCustomQualification ? customQualification : highestQualification;

        return {
            jobTitle,
            companyName,
            jobType,
            department,
            employmentType,
            experience,
            workMode,
            location: finalLocation,
            isCustomLocation,
            customLocation,
            highestQualification: finalQualification,
            isCustomQualification,
            customQualification,
            minSalary,
            maxSalary,
            numberOfOpenings,
            applicationOpeningDate,
            applicationClosingDate,
            hiringManagerEmail,
            responsibilities,
            requirements,
            perksAndBenefits,
            skills,
            requiresBasicTest,
            requiresVideoProctoredTest,
        };
    };

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <div className={`employee-postjob-container ${isEditMode ? 'edit-mode' : ''}`}>
                <div className="employee-postjob-wrapper">
                    <div className="employee-postjob-loading" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress />
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show loading when fetching job data in edit mode
    if (isEditMode && loadingJob) {
        return (
            <div className={`employee-postjob-container ${isEditMode ? 'edit-mode' : ''}`}>
                <div className="employee-postjob-wrapper">
                    <div className="employee-postjob-loading" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress />
                        <p>Loading job details...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Toaster position="top-right" />
            <div className={`employee-postjob-container ${isEditMode ? 'edit-mode' : ''}`}>
                <div className="employee-postjob-wrapper">
                {/* Header - Hide in edit mode */}
                {!isEditMode && (
                    <div className="employee-postjob-header">
                        <div className="employee-postjob-title-wrapper">
                            <h1 className="employee-postjob-title">
                                <FaBriefcase className="employee-postjob-title-icon" />
                                Post a New Job
                            </h1>
                        </div>
                        {!isSmartPost && (
                            <div className="employee-postjob-header-actions">
                                <button
                                    type="button"
                                    className="employee-postjob-new-draft-btn"
                                    onClick={() => {
                                        handleNewDraft();
                                        if (isMobile) setShowMobileMenu(false);
                                    }}
                                    title="Start New Draft"
                                >
                                    <FaPlus />
                                    New Draft
                                </button>
                                <button
                                    type="button"
                                    className="employee-postjob-drafts-btn"
                                    onClick={() => {
                                        setShowDraftsSidebar(true);
                                        if (isMobile) setShowMobileMenu(false);
                                    }}
                                    title="View Drafts"
                                >
                                    <FaFileAlt />
                                    Drafts
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Error/Success Messages */}
                {error && <div className="employee-postjob-error">{error}</div>}
                {success && <div className="employee-postjob-success">{success}</div>}

                <form onSubmit={handleSubmit} className="employee-postjob-form">
                    {/* Basic Information Section */}
                    <div className="employee-postjob-section">
                        <div className="employee-postjob-section-header">
                            <h2 className="employee-postjob-section-title">Basic Information</h2>
                            <p className="employee-postjob-section-subtitle">Fill in the essential details about your job posting</p>
                        </div>

                        <div className="employee-postjob-form-grid">
                            <div className="employee-postjob-form-group full-width">
                                <label>Job Title <span className="employee-postjob-required">*</span></label>
                                <input
                                    type="text"
                                    className="employee-postjob-input"
                                    value={jobTitle}
                                    onChange={(e) => {
                                        setJobTitle(e.target.value);
                                        validateField("jobTitle", e.target.value);
                                    }}
                                    onBlur={() => validateField("jobTitle", jobTitle)}
                                    placeholder="e.g., Senior Software Engineer"
                                    maxLength={100}
                                    required
                                />
                                {errors.jobTitle && <span className="employee-postjob-field-error">{errors.jobTitle}</span>}
                            </div>

                            <div className="employee-postjob-form-group full-width">
                                <label>
                                    Company Name <span className="employee-postjob-required">*</span>
                                    {!isEditingCompanyName && companyName && (
                                        <button
                                            type="button"
                                            className="employee-postjob-edit-field-btn"
                                            onClick={() => setIsEditingCompanyName(true)}
                                            title="Edit Company Name"
                                        >
                                            <FaEdit />
                                        </button>
                                    )}
                                </label>
                                {isEditingCompanyName || !companyName ? (
                                    <input
                                        type="text"
                                        className="employee-postjob-input"
                                        value={companyName}
                                        onChange={(e) => {
                                            setCompanyName(e.target.value);
                                            validateField("companyName", e.target.value);
                                        }}
                                        onBlur={() => {
                                            validateField("companyName", companyName);
                                            if (companyName) setIsEditingCompanyName(false);
                                        }}
                                        placeholder="Enter company name"
                                        maxLength={100}
                                        required
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        className="employee-postjob-disabled-input"
                                        value={companyName}
                                        disabled
                                    />
                                )}
                                {errors.companyName && <span className="employee-postjob-field-error">{errors.companyName}</span>}
                            </div>

                            <div className={`employee-postjob-form-group ${showJobTypeDropdown ? 'dropdown-open' : ''}`}>
                                <label>Job Type <span className="employee-postjob-required">*</span></label>
                                <div className={`employee-postjob-custom-dropdown ${showJobTypeDropdown ? 'dropdown-open' : ''}`} ref={jobTypeRef}>
                                    <div
                                        className={`employee-postjob-custom-dropdown-select ${showJobTypeDropdown ? 'open' : ''}`}
                                        onClick={() => {
                                            if (!showJobTypeDropdown && isMobile && jobTypeRef.current) {
                                                // Calculate position before opening on mobile
                                                updateDropdownPosition(jobTypeRef, setJobTypeDropdownPosition);
                                            }
                                            setShowJobTypeDropdown(!showJobTypeDropdown);
                                            setShowDepartmentDropdown(false);
                                            setShowEmploymentTypeDropdown(false);
                                            setShowExperienceDropdown(false);
                                            setShowWorkModeDropdown(false);
                                            setShowLocationDropdown(false);
                                            setShowQualificationDropdown(false);
                                        }}
                                    >
                                        <span className={jobType ? "employee-postjob-dropdown-selected" : "employee-postjob-dropdown-placeholder"}>
                                            {jobType || "Select Job Type"}
                                        </span>
                                        <HiChevronDown className={`employee-postjob-dropdown-arrow ${showJobTypeDropdown ? 'open' : ''}`} />
                                    </div>
                                    {showJobTypeDropdown && (
                                        <div 
                                            className="employee-postjob-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${jobTypeDropdownPosition.top}px`,
                                                left: `${jobTypeDropdownPosition.left}px`,
                                                width: `${jobTypeDropdownPosition.width}px`
                                            } : {}}
                                        >
                                            <div
                                                className="employee-postjob-custom-dropdown-item"
                                                onClick={() => {
                                                    setJobType('');
                                                    setShowJobTypeDropdown(false);
                                                }}
                                            >
                                                {!jobType && <HiCheck className="employee-postjob-check-icon" />}
                                                <span>Select Job Type</span>
                                            </div>
                                            {jobTypes.map((type) => (
                                                <div
                                                    key={type}
                                                    className="employee-postjob-custom-dropdown-item"
                                                    onClick={() => {
                                                        setJobType(type);
                                                        setShowJobTypeDropdown(false);
                                                    }}
                                                >
                                                    {jobType === type && <HiCheck className="employee-postjob-check-icon" />}
                                                    <span>{type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`employee-postjob-form-group ${showDepartmentDropdown ? 'dropdown-open' : ''}`}>
                                <label>Department</label>
                                <div className={`employee-postjob-custom-dropdown ${showDepartmentDropdown ? 'dropdown-open' : ''}`} ref={departmentRef}>
                                    <div
                                        className={`employee-postjob-custom-dropdown-select ${showDepartmentDropdown ? 'open' : ''}`}
                                        onClick={() => {
                                            if (!showDepartmentDropdown && isMobile && departmentRef.current) {
                                                // Calculate position before opening on mobile
                                                updateDropdownPosition(departmentRef, setDepartmentDropdownPosition);
                                            }
                                            setShowDepartmentDropdown(!showDepartmentDropdown);
                                            setShowJobTypeDropdown(false);
                                            setShowEmploymentTypeDropdown(false);
                                            setShowExperienceDropdown(false);
                                            setShowWorkModeDropdown(false);
                                            setShowLocationDropdown(false);
                                            setShowQualificationDropdown(false);
                                        }}
                                    >
                                        <span className={department ? "employee-postjob-dropdown-selected" : "employee-postjob-dropdown-placeholder"}>
                                            {department || "Select Department"}
                                        </span>
                                        <HiChevronDown className={`employee-postjob-dropdown-arrow ${showDepartmentDropdown ? 'open' : ''}`} />
                                    </div>
                                    {showDepartmentDropdown && (
                                        <div 
                                            className="employee-postjob-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${departmentDropdownPosition.top}px`,
                                                left: `${departmentDropdownPosition.left}px`,
                                                width: `${departmentDropdownPosition.width}px`
                                            } : {}}
                                        >
                                            <div
                                                className="employee-postjob-custom-dropdown-item"
                                                onClick={() => {
                                                    setDepartment('');
                                                    setShowDepartmentDropdown(false);
                                                }}
                                            >
                                                {!department && <HiCheck className="employee-postjob-check-icon" />}
                                                <span>Select Department</span>
                                            </div>
                                            {departments.map((dept) => (
                                                <div
                                                    key={dept}
                                                    className="employee-postjob-custom-dropdown-item"
                                                    onClick={() => {
                                                        setDepartment(dept);
                                                        setShowDepartmentDropdown(false);
                                                    }}
                                                >
                                                    {department === dept && <HiCheck className="employee-postjob-check-icon" />}
                                                    <span>{dept}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`employee-postjob-form-group ${showEmploymentTypeDropdown ? 'dropdown-open' : ''}`}>
                                <label>Employment Type</label>
                                <div className={`employee-postjob-custom-dropdown ${showEmploymentTypeDropdown ? 'dropdown-open' : ''}`} ref={employmentTypeRef}>
                                    <div
                                        className={`employee-postjob-custom-dropdown-select ${showEmploymentTypeDropdown ? 'open' : ''}`}
                                        onClick={() => {
                                            if (!showEmploymentTypeDropdown && isMobile && employmentTypeRef.current) {
                                                // Calculate position before opening on mobile
                                                updateDropdownPosition(employmentTypeRef, setEmploymentTypeDropdownPosition);
                                            }
                                            setShowEmploymentTypeDropdown(!showEmploymentTypeDropdown);
                                            setShowJobTypeDropdown(false);
                                            setShowDepartmentDropdown(false);
                                            setShowExperienceDropdown(false);
                                            setShowWorkModeDropdown(false);
                                            setShowLocationDropdown(false);
                                            setShowQualificationDropdown(false);
                                        }}
                                    >
                                        <span className={employmentType ? "employee-postjob-dropdown-selected" : "employee-postjob-dropdown-placeholder"}>
                                            {employmentType || "Select Employment Type"}
                                        </span>
                                        <HiChevronDown className={`employee-postjob-dropdown-arrow ${showEmploymentTypeDropdown ? 'open' : ''}`} />
                                    </div>
                                    {showEmploymentTypeDropdown && (
                                        <div 
                                            className="employee-postjob-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${employmentTypeDropdownPosition.top}px`,
                                                left: `${employmentTypeDropdownPosition.left}px`,
                                                width: `${employmentTypeDropdownPosition.width}px`
                                            } : {}}
                                        >
                                            <div
                                                className="employee-postjob-custom-dropdown-item"
                                                onClick={() => {
                                                    setEmploymentType('');
                                                    setShowEmploymentTypeDropdown(false);
                                                }}
                                            >
                                                {!employmentType && <HiCheck className="employee-postjob-check-icon" />}
                                                <span>Select Employment Type</span>
                                            </div>
                                            {employmentTypes.map((type) => (
                                                <div
                                                    key={type}
                                                    className="employee-postjob-custom-dropdown-item"
                                                    onClick={() => {
                                                        setEmploymentType(type);
                                                        setShowEmploymentTypeDropdown(false);
                                                    }}
                                                >
                                                    {employmentType === type && <HiCheck className="employee-postjob-check-icon" />}
                                                    <span>{type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`employee-postjob-form-group ${showExperienceDropdown ? 'dropdown-open' : ''}`}>
                                <label>Experience</label>
                                <div className={`employee-postjob-custom-dropdown ${showExperienceDropdown ? 'dropdown-open' : ''}`} ref={experienceRef}>
                                    <div
                                        className={`employee-postjob-custom-dropdown-select ${showExperienceDropdown ? 'open' : ''}`}
                                        onClick={() => {
                                            if (!showExperienceDropdown && isMobile && experienceRef.current) {
                                                // Calculate position before opening on mobile
                                                updateDropdownPosition(experienceRef, setExperienceDropdownPosition);
                                            }
                                            setShowExperienceDropdown(!showExperienceDropdown);
                                            setShowJobTypeDropdown(false);
                                            setShowDepartmentDropdown(false);
                                            setShowEmploymentTypeDropdown(false);
                                            setShowWorkModeDropdown(false);
                                            setShowLocationDropdown(false);
                                            setShowQualificationDropdown(false);
                                        }}
                                    >
                                        <span className={experience ? "employee-postjob-dropdown-selected" : "employee-postjob-dropdown-placeholder"}>
                                            {experience || "Select Experience"}
                                        </span>
                                        <HiChevronDown className={`employee-postjob-dropdown-arrow ${showExperienceDropdown ? 'open' : ''}`} />
                                    </div>
                                    {showExperienceDropdown && (
                                        <div 
                                            className="employee-postjob-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${experienceDropdownPosition.top}px`,
                                                left: `${experienceDropdownPosition.left}px`,
                                                width: `${experienceDropdownPosition.width}px`
                                            } : {}}
                                        >
                                            <div
                                                className="employee-postjob-custom-dropdown-item"
                                                onClick={() => {
                                                    setExperience('');
                                                    setShowExperienceDropdown(false);
                                                }}
                                            >
                                                {!experience && <HiCheck className="employee-postjob-check-icon" />}
                                                <span>Select Experience</span>
                                            </div>
                                            {experienceLevels.map((level) => (
                                                <div
                                                    key={level}
                                                    className="employee-postjob-custom-dropdown-item"
                                                    onClick={() => {
                                                        setExperience(level);
                                                        setShowExperienceDropdown(false);
                                                    }}
                                                >
                                                    {experience === level && <HiCheck className="employee-postjob-check-icon" />}
                                                    <span>{level}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`employee-postjob-form-group ${showWorkModeDropdown ? 'dropdown-open' : ''}`}>
                                <label>Work Mode <span className="employee-postjob-required">*</span></label>
                                <div className={`employee-postjob-custom-dropdown ${showWorkModeDropdown ? 'dropdown-open' : ''}`} ref={workModeRef}>
                                    <div
                                        className={`employee-postjob-custom-dropdown-select ${showWorkModeDropdown ? 'open' : ''}`}
                                        onClick={() => {
                                            if (!showWorkModeDropdown && isMobile && workModeRef.current) {
                                                // Calculate position before opening on mobile
                                                updateDropdownPosition(workModeRef, setWorkModeDropdownPosition);
                                            }
                                            setShowWorkModeDropdown(!showWorkModeDropdown);
                                            setShowJobTypeDropdown(false);
                                            setShowDepartmentDropdown(false);
                                            setShowEmploymentTypeDropdown(false);
                                            setShowExperienceDropdown(false);
                                            setShowLocationDropdown(false);
                                            setShowQualificationDropdown(false);
                                        }}
                                    >
                                        <span className={workMode ? "employee-postjob-dropdown-selected" : "employee-postjob-dropdown-placeholder"}>
                                            {workMode || "Select Work Mode"}
                                        </span>
                                        <HiChevronDown className={`employee-postjob-dropdown-arrow ${showWorkModeDropdown ? 'open' : ''}`} />
                                    </div>
                                    {showWorkModeDropdown && (
                                        <div 
                                            className="employee-postjob-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${workModeDropdownPosition.top}px`,
                                                left: `${workModeDropdownPosition.left}px`,
                                                width: `${workModeDropdownPosition.width}px`
                                            } : {}}
                                        >
                                            <div
                                                className="employee-postjob-custom-dropdown-item"
                                                onClick={() => {
                                                    setWorkMode('');
                                                    setShowWorkModeDropdown(false);
                                                }}
                                            >
                                                {!workMode && <HiCheck className="employee-postjob-check-icon" />}
                                                <span>Select Work Mode</span>
                                            </div>
                                            {workModes.map((mode) => (
                                                <div
                                                    key={mode}
                                                    className="employee-postjob-custom-dropdown-item"
                                                    onClick={() => {
                                                        setWorkMode(mode);
                                                        setShowWorkModeDropdown(false);
                                                    }}
                                                >
                                                    {workMode === mode && <HiCheck className="employee-postjob-check-icon" />}
                                                    <span>{mode}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`employee-postjob-form-group ${showLocationDropdown ? 'dropdown-open' : ''}`}>
                                <label>Location <span className="employee-postjob-required">*</span></label>
                                <div className={`employee-postjob-custom-dropdown ${showLocationDropdown ? 'dropdown-open' : ''}`} ref={locationRef}>
                                    <div
                                        className={`employee-postjob-custom-dropdown-select ${showLocationDropdown ? 'open' : ''}`}
                                        onClick={() => {
                                            if (!showLocationDropdown && isMobile && locationRef.current) {
                                                // Calculate position before opening on mobile
                                                updateDropdownPosition(locationRef, setLocationDropdownPosition);
                                            }
                                            setShowLocationDropdown(!showLocationDropdown);
                                            setShowJobTypeDropdown(false);
                                            setShowDepartmentDropdown(false);
                                            setShowEmploymentTypeDropdown(false);
                                            setShowExperienceDropdown(false);
                                            setShowWorkModeDropdown(false);
                                            setShowQualificationDropdown(false);
                                        }}
                                    >
                                        <span className={location || customLocation ? "employee-postjob-dropdown-selected" : "employee-postjob-dropdown-placeholder"}>
                                            {isCustomLocation ? customLocation : (location || "Select Location")}
                                        </span>
                                        <HiChevronDown className={`employee-postjob-dropdown-arrow ${showLocationDropdown ? 'open' : ''}`} />
                                    </div>
                                    {showLocationDropdown && (
                                        <div 
                                            className="employee-postjob-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${locationDropdownPosition.top}px`,
                                                left: `${locationDropdownPosition.left}px`,
                                                width: `${locationDropdownPosition.width}px`
                                            } : {}}
                                        >
                                            <div
                                                className="employee-postjob-custom-dropdown-item"
                                                onClick={() => {
                                                    setLocation('');
                                                    setIsCustomLocation(false);
                                                    setCustomLocation("");
                                                    setShowLocationDropdown(false);
                                                }}
                                            >
                                                {!location && !isCustomLocation && <HiCheck className="employee-postjob-check-icon" />}
                                                <span>Select Location</span>
                                            </div>
                                            {popularLocations.map((loc) => (
                                                <div
                                                    key={loc}
                                                    className="employee-postjob-custom-dropdown-item"
                                                    onClick={() => {
                                                        setLocation(loc);
                                                        setIsCustomLocation(false);
                                                        setCustomLocation("");
                                                        setShowLocationDropdown(false);
                                                    }}
                                                >
                                                    {!isCustomLocation && location === loc && <HiCheck className="employee-postjob-check-icon" />}
                                                    <span>{loc}</span>
                                                </div>
                                            ))}
                                            <div
                                                className="employee-postjob-custom-dropdown-item custom-option"
                                                onClick={() => {
                                                    setIsCustomLocation(true);
                                                    setLocation("");
                                                    setShowLocationDropdown(false);
                                                }}
                                            >
                                                <span>+ Enter Custom Location</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {isCustomLocation && (
                                    <input
                                        type="text"
                                        className="employee-postjob-input employee-postjob-custom-input"
                                        value={customLocation}
                                        onChange={(e) => setCustomLocation(e.target.value)}
                                        placeholder="Enter location"
                                        style={{ marginTop: '8px' }}
                                    />
                                )}
                            </div>

                            <div className={`employee-postjob-form-group ${showQualificationDropdown ? 'dropdown-open' : ''}`}>
                                <label>Minimum Qualification</label>
                                <div className={`employee-postjob-custom-dropdown ${showQualificationDropdown ? 'dropdown-open' : ''}`} ref={qualificationRef}>
                                    <div
                                        className={`employee-postjob-custom-dropdown-select ${showQualificationDropdown ? 'open' : ''}`}
                                        onClick={() => {
                                            if (!showQualificationDropdown && isMobile && qualificationRef.current) {
                                                // Calculate position before opening on mobile
                                                updateDropdownPosition(qualificationRef, setQualificationDropdownPosition);
                                            }
                                            setShowQualificationDropdown(!showQualificationDropdown);
                                            setShowJobTypeDropdown(false);
                                            setShowDepartmentDropdown(false);
                                            setShowEmploymentTypeDropdown(false);
                                            setShowExperienceDropdown(false);
                                            setShowWorkModeDropdown(false);
                                            setShowLocationDropdown(false);
                                        }}
                                    >
                                        <span className={highestQualification || customQualification ? "employee-postjob-dropdown-selected" : "employee-postjob-dropdown-placeholder"}>
                                            {isCustomQualification ? customQualification : (highestQualification || "Select Qualification")}
                                        </span>
                                        <HiChevronDown className={`employee-postjob-dropdown-arrow ${showQualificationDropdown ? 'open' : ''}`} />
                                    </div>
                                    {showQualificationDropdown && (
                                        <div 
                                            className="employee-postjob-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${qualificationDropdownPosition.top}px`,
                                                left: `${qualificationDropdownPosition.left}px`,
                                                width: `${qualificationDropdownPosition.width}px`
                                            } : {}}
                                        >
                                            <div
                                                className="employee-postjob-custom-dropdown-item"
                                                onClick={() => {
                                                    setHighestQualification('');
                                                    setIsCustomQualification(false);
                                                    setCustomQualification("");
                                                    setShowQualificationDropdown(false);
                                                }}
                                            >
                                                {!highestQualification && !isCustomQualification && <HiCheck className="employee-postjob-check-icon" />}
                                                <span>Select Qualification</span>
                                            </div>
                                            {qualifications.map((qual) => (
                                                <div
                                                    key={qual}
                                                    className="employee-postjob-custom-dropdown-item"
                                                    onClick={() => {
                                                        setHighestQualification(qual);
                                                        setIsCustomQualification(false);
                                                        setCustomQualification("");
                                                        setShowQualificationDropdown(false);
                                                    }}
                                                >
                                                    {!isCustomQualification && highestQualification === qual && <HiCheck className="employee-postjob-check-icon" />}
                                                    <span>{qual}</span>
                                                </div>
                                            ))}
                                            <div
                                                className="employee-postjob-custom-dropdown-item custom-option"
                                                onClick={() => {
                                                    setIsCustomQualification(true);
                                                    setHighestQualification("");
                                                    setShowQualificationDropdown(false);
                                                }}
                                            >
                                                <span>+ Enter Custom Qualification</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {isCustomQualification && (
                                    <input
                                        type="text"
                                        className="employee-postjob-input employee-postjob-custom-input"
                                        value={customQualification}
                                        onChange={(e) => setCustomQualification(e.target.value)}
                                        placeholder="Enter qualification"
                                        style={{ marginTop: '8px' }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Skills Section */}
                    <div className="employee-postjob-section">
                        <div className="employee-postjob-section-header">
                            <h2 className="employee-postjob-section-title">Key Skills</h2>
                            <p className="employee-postjob-section-subtitle">
                                Search across technical, functional, and soft skills. Add as many as needed for this role.
                            </p>
                        </div>
                        <SkillSelector
                            selectedSkills={skills}
                            onChange={setSkills}
                            helperText="Selected skills will be visible on the public job listing and help candidates self-assess fit."
                        />
                    </div>

                    {/* Salary & Dates Section */}
                    <div className="employee-postjob-section">
                        <div className="employee-postjob-section-header">
                            <h2 className="employee-postjob-section-title">Salary & Application Dates</h2>
                            <p className="employee-postjob-section-subtitle">Set salary range and application timeline</p>
                        </div>

                        <div className="employee-postjob-form-grid">
                            <div className="employee-postjob-form-group">
                                <label>
                                    <FaDollarSign className="employee-postjob-label-icon" />
                                    Minimum Salary (₹/year)
                                </label>
                                <input
                                    type="number"
                                    className="employee-postjob-input"
                                    value={minSalary || ''}
                                    onChange={(e) => {
                                        setMinSalary(e.target.value);
                                        validateField("minSalary", e.target.value);
                                        if (maxSalary) validateField("maxSalary", maxSalary);
                                    }}
                                    onBlur={() => validateField("minSalary", minSalary)}
                                    placeholder="e.g., 500000"
                                    min="0"
                                    step="1000"
                                />
                                {errors.minSalary && <span className="employee-postjob-field-error">{errors.minSalary}</span>}
                            </div>

                            <div className="employee-postjob-form-group">
                                <label>
                                    <FaDollarSign className="employee-postjob-label-icon" />
                                    Maximum Salary (₹/year)
                                </label>
                                <input
                                    type="number"
                                    className="employee-postjob-input"
                                    value={maxSalary || ''}
                                    onChange={(e) => {
                                        setMaxSalary(e.target.value);
                                        validateField("maxSalary", e.target.value);
                                    }}
                                    onBlur={() => validateField("maxSalary", maxSalary)}
                                    placeholder="e.g., 1000000"
                                    min="0"
                                    step="1000"
                                />
                                {errors.maxSalary && <span className="employee-postjob-field-error">{errors.maxSalary}</span>}
                            </div>

                            <div className="employee-postjob-form-group">
                                <label>
                                    Number of Openings
                                </label>
                                <input
                                    type="number"
                                    className="employee-postjob-input"
                                    value={numberOfOpenings || ''}
                                    onChange={(e) => {
                                        setNumberOfOpenings(e.target.value);
                                        validateField("numberOfOpenings", e.target.value);
                                    }}
                                    onBlur={() => validateField("numberOfOpenings", numberOfOpenings)}
                                    placeholder="e.g., 5"
                                    min="1"
                                    step="1"
                                />
                                {errors.numberOfOpenings && <span className="employee-postjob-field-error">{errors.numberOfOpenings}</span>}
                            </div>

                            <div className="employee-postjob-form-group">
                                <label>
                                    <FaCalendarAlt className="employee-postjob-label-icon" />
                                    Opening Date <span className="employee-postjob-required">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="employee-postjob-input"
                                    value={applicationOpeningDate}
                                    onChange={(e) => {
                                        setApplicationOpeningDate(e.target.value);
                                        validateField("applicationOpeningDate", e.target.value);
                                        if (applicationClosingDate) validateField("applicationClosingDate", applicationClosingDate);
                                    }}
                                    onBlur={() => validateField("applicationOpeningDate", applicationOpeningDate)}
                                    min={!isEditMode ? new Date().toISOString().split("T")[0] : undefined}
                                    required
                                />
                                {errors.applicationOpeningDate && <span className="employee-postjob-field-error">{errors.applicationOpeningDate}</span>}
                            </div>

                            <div className="employee-postjob-form-group">
                                <label>
                                    <FaCalendarAlt className="employee-postjob-label-icon" />
                                    Closing Date <span className="employee-postjob-required">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="employee-postjob-input"
                                    value={applicationClosingDate}
                                    onChange={(e) => {
                                        setApplicationClosingDate(e.target.value);
                                        validateField("applicationClosingDate", e.target.value);
                                    }}
                                    onBlur={() => validateField("applicationClosingDate", applicationClosingDate)}
                                    min={!isEditMode ? (applicationOpeningDate || new Date().toISOString().split("T")[0]) : applicationOpeningDate || undefined}
                                    required
                                />
                                {errors.applicationClosingDate && <span className="employee-postjob-field-error">{errors.applicationClosingDate}</span>}
                            </div>

                            <div className="employee-postjob-form-group full-width">
                                <label>
                                    <FaEnvelope className="employee-postjob-label-icon" />
                                    Hiring Manager Email <span className="employee-postjob-required">*</span>
                                    {!isEditingEmail && hiringManagerEmail && (
                                        <button
                                            type="button"
                                            className="employee-postjob-edit-field-btn"
                                            onClick={() => setIsEditingEmail(true)}
                                            title="Edit Email"
                                        >
                                            <FaEdit />
                                        </button>
                                    )}
                                </label>
                                {isEditingEmail || !hiringManagerEmail ? (
                                    <input
                                        type="email"
                                        className="employee-postjob-input"
                                        value={hiringManagerEmail}
                                        onChange={(e) => {
                                            setHiringManagerEmail(e.target.value);
                                            validateField("hiringManagerEmail", e.target.value);
                                        }}
                                        onBlur={() => {
                                            validateField("hiringManagerEmail", hiringManagerEmail);
                                            if (hiringManagerEmail) setIsEditingEmail(false);
                                        }}
                                        placeholder="hiring.manager@company.com"
                                        required
                                    />
                                ) : (
                                    <input
                                        type="email"
                                        className="employee-postjob-disabled-input"
                                        value={hiringManagerEmail}
                                        disabled
                                    />
                                )}
                                {errors.hiringManagerEmail && <span className="employee-postjob-field-error">{errors.hiringManagerEmail}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Information Section */}
                    <div className="employee-postjob-section">
                        <div className="employee-postjob-section-header">
                            <div className="employee-postjob-section-title-wrapper">
                                <h2 className="employee-postjob-section-title">Job Details</h2>
                                {!isSmartPost && (
                                    <button
                                        type="button"
                                        className={`employee-postjob-ai-generate-btn ${shouldDisableAIModal ? 'employee-postjob-ai-generate-btn-disabled' : ''}`}
                                        onClick={() => {
                                            if (shouldDisableAIModal) return;
                                            setShowAIModal(true);
                                        }}
                                        disabled={shouldDisableAIModal}
                                        title={shouldDisableAIModal ? "AI generation already running or linked to this draft. Use your draft instead." : "Generate with AI"}
                                    >
                                        <FaMagic /> Generate with AI
                                    </button>
                                )}
                            </div>
                            <p className="employee-postjob-section-subtitle">Describe the role, responsibilities, and requirements</p>
                        </div>

                        <div className="employee-postjob-form-grid">
                            <div className="employee-postjob-form-group full-width">
                                <label>Job Description <span className="employee-postjob-required">*</span></label>
                                <textarea
                                    className="employee-postjob-textarea"
                                    value={jobDescription}
                                    onChange={(e) => {
                                        setJobDescription(e.target.value);
                                        validateField("jobDescription", e.target.value);
                                    }}
                                    onBlur={() => validateField("jobDescription", jobDescription)}
                                    placeholder="Write a comprehensive description of the job role, what the company does, and what makes this role exciting..."
                                    rows={6}
                                    required
                                />
                                <small className="employee-postjob-field-hint">Minimum 50 characters</small>
                                {errors.jobDescription && <span className="employee-postjob-field-error">{errors.jobDescription}</span>}
                            </div>

                            <div className="employee-postjob-form-group full-width">
                                <label>Key Responsibilities</label>
                                <textarea
                                    className="employee-postjob-textarea"
                                    value={responsibilities}
                                    onChange={(e) => setResponsibilities(e.target.value)}
                                    placeholder="List the key responsibilities and duties for this position..."
                                    rows={5}
                                />
                            </div>

                            <div className="employee-postjob-form-group full-width">
                                <label>Requirements</label>
                                <textarea
                                    className="employee-postjob-textarea"
                                    value={requirements}
                                    onChange={(e) => setRequirements(e.target.value)}
                                    placeholder="List the required skills, qualifications, and experience..."
                                    rows={5}
                                />
                            </div>

                            <div className="employee-postjob-form-group full-width">
                                <label>Perks & Benefits</label>
                                <textarea
                                    className="employee-postjob-textarea"
                                    value={perksAndBenefits}
                                    onChange={(e) => setPerksAndBenefits(e.target.value)}
                                    placeholder="List the perks, benefits, and advantages of working at your company..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Assessment Requirements Section */}
                    <div className="employee-postjob-section">
                        <div className="employee-postjob-section-header">
                            <h2 className="employee-postjob-section-title">Assessment Requirements</h2>
                            <p className="employee-postjob-section-subtitle">
                                Choose which screening tests candidates must finish before applying. Leave unchecked if a test
                                isn&apos;t needed for this role.
                            </p>
                        </div>
                        <div className="employee-postjob-assessment-options">
                            <div className={`employee-postjob-assessment-option ${requiresBasicTest ? "selected" : ""}`}>
                                <div className="employee-postjob-assessment-option-header">
                                    <div>
                                        <p className="employee-postjob-assessment-title">Basic application test</p>
                                        <p className="employee-postjob-assessment-description">
                                            Conversational prompts plus MCQs that power the current &quot;Complete test to apply&quot; flow.
                                        </p>
                                    </div>
                                    <label className="employee-postjob-assessment-toggle">
                                        <input
                                            type="checkbox"
                                            checked={requiresBasicTest}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setRequiresBasicTest(checked);
                                                // Immediately persist latest assessment choice to draft
                                                saveDraftToStore({ requiresBasicTest: checked });
                                            }}
                                        />
                                        <span>{requiresBasicTest ? "Required" : "Not required"}</span>
                                    </label>
                                </div>
                            </div>

                            <div className={`employee-postjob-assessment-option ${requiresVideoProctoredTest ? "selected" : ""}`}>
                                <div className="employee-postjob-assessment-option-header">
                                    <div>
                                        <p className="employee-postjob-assessment-title">Video proctored test</p>
                                        <p className="employee-postjob-assessment-description">
                                            High-signal experience built to surface top talent, with secure AI-based proctoring when you
                                            invite candidates to a live follow-up.
                                        </p>
                                    </div>
                                    <label className="employee-postjob-assessment-toggle">
                                        <input
                                            type="checkbox"
                                            checked={requiresVideoProctoredTest}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setRequiresVideoProctoredTest(checked);
                                                // Immediately persist latest assessment choice to draft
                                                saveDraftToStore({ requiresVideoProctoredTest: checked });
                                            }}
                                        />
                                        <span>{requiresVideoProctoredTest ? "Required" : "Not required"}</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <small className="employee-postjob-assessment-hint">
                            These preferences sync with your drafts and edit flow so candidates always know what to expect.
                        </small>
                    </div>
                </form>

                {/* Fixed Footer with Post Job and Draft Job Buttons */}
                {!isEditMode ? (
                    <div className="employee-postjob-footer">
                        <div className="employee-postjob-footer-info">
                            <small>All fields marked with <span className="employee-postjob-required">*</span> are employee-postjob-required</small>
                        </div>
                        <div className="employee-postjob-footer-buttons">
                            <button
                                type="button"
                                onClick={(e) => handleSubmit(e, "Draft")}
                                className="employee-postjob-footer-draft-btn"
                                disabled={(postJobMutation.isPending || updateJobMutation.isPending || postSmartPostMutation.isPending) || !isFormValid()}
                            >
                                {postJobMutation.isPending ? (
                                    <>
                                        <CircularProgress size={16} sx={{ color: "#d97706", mr: 1 }} />
                                        Saving...
                                    </>
                                ) : (
                                    "Draft Job"
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleSubmit(e, "Active")}
                                className="employee-postjob-footer-post-btn"
                                disabled={(postJobMutation.isPending || updateJobMutation.isPending || postSmartPostMutation.isPending) || !isFormValid()}
                            >
                                {postJobMutation.isPending ? (
                                    <>
                                        <CircularProgress size={16} sx={{ color: "white", mr: 1 }} />
                                        Posting...
                                    </>
                                ) : (
                                    "Post Job"
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="employee-postjob-footer">
                        <div className="employee-postjob-footer-info">
                            <small>All fields marked with <span className="employee-postjob-required">*</span> are employee-postjob-required</small>
                        </div>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="employee-postjob-footer-post-btn"
                            disabled={(postJobMutation.isPending || updateJobMutation.isPending) || !isFormValid()}
                        >
                            {updateJobMutation.isPending ? (
                                <>
                                    <CircularProgress size={16} sx={{ color: "white", mr: 1 }} />
                                    Updating...
                                </>
                            ) : (
                                "Update Job"
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Drafts Sidebar - Hidden in smart post mode */}
            {!isSmartPost && (
                <DraftsSidebar
                    isOpen={showDraftsSidebar}
                    onClose={() => setShowDraftsSidebar(false)}
                    onLoadDraft={handleLoadDraft}
                    employerId={profileData?._id}
                />
            )}

            {/* AI Generate Modal - Hidden in smart post mode */}
            {!isSmartPost && (
                <AIGenerateModal
                    isOpen={showAIModal}
                    onClose={() => setShowAIModal(false)}
                    onGenerate={handleAIGenerate}
                    formData={getFormDataForAI()}
                    employerId={profileData?._id}
                    onFormUpdate={handleFormUpdateFromModal}
                    currentDraftId={currentDraftId}
                    onDraftIdSet={(draftId) => {
                        setCurrentDraftId(draftId);
                        setAiDraftId(draftId);
                    }}
                />
            )}
            </div>
        </>
    );
};

export default PostJobScreen;

