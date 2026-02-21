"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { FaCamera, FaFileUpload, FaTimes, FaPlus, FaDownload, FaTrash, FaEye, FaEdit, FaLanguage, FaMagic, FaBolt, FaArrowRight } from "react-icons/fa";
import { HiChevronDown, HiCheck } from "react-icons/hi2";
import { toast } from "react-hot-toast";
import { useJobSeekerProfile, useUpdateJobSeekerProfile, useDeleteJobSeekerProfilePicture, jobSeekerProfileKeys } from "@/hooks/useJobSeekerProfile";
import { useQueryClient } from "@tanstack/react-query";
import PromotionalBanner from "@/components/promotionalBanner/PromotionalBanner";
import "./page.css";
import SkillSelector from "@/components/skills/SkillSelector";
import indianCities from "@/constants/indianCities";
import { useJobSeekerAuth } from "@/hooks/useJobSeekerAuth";

const ProfileScreen = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [mounted, setMounted] = useState(false);

    // Check authentication and redirect if not logged in
    useJobSeekerAuth();
    const [saving, setSaving] = useState(false);
    const [deletingResume, setDeletingResume] = useState(false);
    const [deletingProfilePicture, setDeletingProfilePicture] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeletePictureModal, setShowDeletePictureModal] = useState(false);
    const [removeProfilePictureRequested, setRemoveProfilePictureRequested] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [analysisState, setAnalysisState] = useState({
        resumeAnalysis: {},
        resumeParsedDetails: {}
    });
    const [isDragActive, setIsDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Form fields
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [gender, setGender] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [highestQualification, setHighestQualification] = useState("");
    const [showQualificationDropdown, setShowQualificationDropdown] = useState(false);
    const [isCustomQualification, setIsCustomQualification] = useState(false);
    const [customQualification, setCustomQualification] = useState("");
    const [passoutYear, setPassoutYear] = useState("");
    const [experienceInYears, setExperienceInYears] = useState("");
    const [noticePeriod, setNoticePeriod] = useState("");
    const [currentCTC, setCurrentCTC] = useState("");
    const [expectedCTC, setExpectedCTC] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [githubUrl, setGithubUrl] = useState("");
    const [address, setAddress] = useState("");
    const [currentLocation, setCurrentLocation] = useState("");
    const [locationQuery, setLocationQuery] = useState("");
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [skills, setSkills] = useState([]);
    const [profilePicture, setProfilePicture] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState(null);
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeFileName, setResumeFileName] = useState("");
    const [resumeUrl, setResumeUrl] = useState(null);
    const [previewFetchNonce, setPreviewFetchNonce] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [languages, setLanguages] = useState([]);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [editingLanguageIndex, setEditingLanguageIndex] = useState(null);
    const [languageForm, setLanguageForm] = useState({
        language: "",
        proficiency: "",
        read: false,
        write: false,
        speak: false
    });
    const [languageSearchQuery, setLanguageSearchQuery] = useState("");
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [showProficiencyDropdown, setShowProficiencyDropdown] = useState(false);
    const languageDropdownRef = useRef(null);
    const proficiencyDropdownRef = useRef(null);
    const languageSelectRef = useRef(null);
    const proficiencySelectRef = useRef(null);
    const [languageDropdownPosition, setLanguageDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [proficiencyDropdownPosition, setProficiencyDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [jobAlertOnResumeMatch, setJobAlertOnResumeMatch] = useState(false);
    const [showJobAlertModal, setShowJobAlertModal] = useState(false);
    const [enablingJobAlert, setEnablingJobAlert] = useState(false);
    const lastAlertPromptRef = useRef(null);
    const initialAnalysisBaselineRef = useRef({ initialized: false, completedAt: null, path: null });
    const [showInstantAlertModal, setShowInstantAlertModal] = useState(false);
    const [instantCheckoutLoading, setInstantCheckoutLoading] = useState(false);
    const [instantPlan, setInstantPlan] = useState(null);
    const [instantPlanLoading, setInstantPlanLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const filteredLocations = useMemo(() => {
        const q = locationQuery.trim().toLowerCase();
        if (!q) return indianCities.slice(0, 10);
        return indianCities.filter(city => city.toLowerCase().includes(q)).slice(0, 10);
    }, [locationQuery]);

    // Dropdown states for Gender and Passout Year
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [showPassoutYearDropdown, setShowPassoutYearDropdown] = useState(false);
    const genderRef = useRef(null);
    const passoutYearRef = useRef(null);
    const qualificationRef = useRef(null);
    const [genderDropdownPosition, setGenderDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [passoutYearDropdownPosition, setPassoutYearDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [qualificationDropdownPosition, setQualificationDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Common languages list
    const commonLanguages = [
        "English", "Hindi", "Spanish", "French", "German", "Italian", "Portuguese", "Russian",
        "Chinese", "Japanese", "Korean", "Arabic", "Turkish", "Dutch", "Swedish", "Norwegian",
        "Danish", "Finnish", "Polish", "Czech", "Hungarian", "Romanian", "Greek", "Thai",
        "Vietnamese", "Indonesian", "Malay", "Bengali", "Urdu", "Tamil", "Telugu", "Marathi",
        "Gujarati", "Kannada", "Malayalam", "Punjabi", "Assamese", "Oriya", "Nepali", "Sinhala"
    ];

    const proficiencyLevels = ["Basic", "Conversational", "Fluent", "Native"];

    // Qualifications list
    const qualifications = [
        "10th Pass", "12th Pass", "Diploma", "Bachelor's Degree", "Master's Degree",
        "MBA", "Ph.D.", "Professional Degree", "Technical Certification", "Other"
    ];

    const isDocFile = (file) => {
        if (!file) return false;
        const type = file.type?.toLowerCase() || "";
        const name = file.name?.toLowerCase() || "";
        return type.includes("word") || type.includes("doc") || name.endsWith(".doc") || name.endsWith(".docx");
    };

    // Validation errors
    const [errors, setErrors] = useState({});

    // React Query hooks
    const { data: profileData, isLoading: loading, error: profileError } = useJobSeekerProfile();
    const updateProfileMutation = useUpdateJobSeekerProfile();

    // Client-side only mount check to prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // Update form state when profile data is fetched/updated
    useEffect(() => {
        if (profileData) {
            setFullName(profileData.fullName || "");
            setEmail(profileData.email || "");
            setMobileNumber(profileData.mobileNumber || "");
            setGender(profileData.gender || "");
            setDateOfBirth(profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split("T")[0] : "");
            
            // Check if qualification is in the list or custom
            const qual = profileData.highestQualification || "";
            if (qual && !qualifications.includes(qual)) {
                setIsCustomQualification(true);
                setCustomQualification(qual);
                setHighestQualification("");
            } else {
                setIsCustomQualification(false);
                setCustomQualification("");
                setHighestQualification(qual);
            }
            
            setPassoutYear(profileData.passoutYear ? String(profileData.passoutYear) : "");
            setExperienceInYears(profileData.experienceInYears !== null && profileData.experienceInYears !== undefined ? profileData.experienceInYears : "");
            setNoticePeriod(profileData.noticePeriod !== null && profileData.noticePeriod !== undefined ? profileData.noticePeriod : "");
            setCurrentCTC(profileData.currentCTC !== null && profileData.currentCTC !== undefined ? String(profileData.currentCTC) : "");
            setExpectedCTC(profileData.expectedCTC !== null && profileData.expectedCTC !== undefined ? String(profileData.expectedCTC) : "");
            setLinkedinUrl(profileData.linkedinUrl || "");
            setGithubUrl(profileData.githubUrl || "");
            setAddress(profileData.address || "");
            setCurrentLocation(profileData.currentLocation || "");
            setLocationQuery(profileData.currentLocation || "");
            setSkills(profileData.skills || []);
            setLanguages(profileData.languages || []);
            setJobAlertOnResumeMatch(!!profileData.jobAlertOnResumeMatch);
            setProfilePicturePreview(profileData.profilePicture || null);
            setLastUpdated(profileData.updatedAt || profileData.createdAt || null);
            if (profileData.resume) {
                setResumeUrl(profileData.resume);
                // Extract filename from resume path (e.g., "/uploads/resumes/userId/resume-123.pdf")
                const resumePathParts = profileData.resume.split('/');
                const filename = resumePathParts[resumePathParts.length - 1] || "resume.pdf";
                setResumeFileName(filename);
                setPreviewUrl(null);
                setPreviewFetchNonce(Date.now());
            } else {
                setResumeUrl(null);
                setResumeFileName("");
                setPreviewUrl(null);
            }

            setAnalysisState({
                resumeAnalysis: profileData.resumeAnalysis || {},
                resumeParsedDetails: profileData.resumeParsedDetails || {}
            });
        }
    }, [profileData]);

    // Record initial analysis baseline from first profile load
    useEffect(() => {
        if (!profileData || initialAnalysisBaselineRef.current.initialized) return;
        const completedAt = profileData.resumeAnalysis?.lastCompletedAt || null;
        const path = profileData.resumeAnalysis?.resumePath || profileData.resumeAnalysis?.resumePathSnapshot || null;
        initialAnalysisBaselineRef.current = { initialized: true, completedAt, path };
    }, [profileData]);

    const fetchPlan = useCallback(async () => {
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
            // keep silent; banner will fallback
        } finally {
            setInstantPlanLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlan();
    }, [fetchPlan]);

    // Prompt to enable personalized job alerts only when analysis transitions to completed after initial load
    useEffect(() => {
        const status = analysisState?.resumeAnalysis?.status;
        const completedAt = analysisState?.resumeAnalysis?.lastCompletedAt;
        const path = analysisState?.resumeAnalysis?.resumePathSnapshot || analysisState?.resumeAnalysis?.resumePath || null;

        if (!status || !completedAt) return;

        // Ensure we have a baseline
        if (!initialAnalysisBaselineRef.current.initialized) {
            initialAnalysisBaselineRef.current = { initialized: true, completedAt, path };
            return;
        }

        const baseline = initialAnalysisBaselineRef.current;
        const isNewCompletion = status === "completed" && completedAt !== baseline.completedAt;

        if (isNewCompletion && !jobAlertOnResumeMatch) {
            const key = `${status}-${completedAt}`;
            if (lastAlertPromptRef.current !== key) {
                lastAlertPromptRef.current = key;
                setShowJobAlertModal(true);
            }
        }
    }, [analysisState, jobAlertOnResumeMatch]);

    // Auto-fill empty profile fields when resume analysis completes
    const autoFillCompletedRef = useRef(new Set());
    const autoFillToastShownRef = useRef(new Set());
    useEffect(() => {
        const status = analysisState?.resumeAnalysis?.status;
        const completedAt = analysisState?.resumeAnalysis?.lastCompletedAt;
        const parsedDetails = analysisState?.resumeParsedDetails || {};

        if (status !== "completed" || !completedAt || !parsedDetails || !profileData) return;

        // Track which analysis completion we've already processed
        const completionKey = `${completedAt}`;
        if (autoFillCompletedRef.current.has(completionKey)) return;
        
        // Check if fields are already filled in profile data - if so, don't auto-fill
        // This prevents auto-filling on page refresh when data is already saved
        const profileHasSkills = profileData.skills && Array.isArray(profileData.skills) && profileData.skills.length > 0;
        const profileHasMobile = profileData.mobileNumber && profileData.mobileNumber.trim().length > 0;
        const profileHasGender = profileData.gender && ["male", "female", "other"].includes(profileData.gender);
        const profileHasDob = profileData.dateOfBirth;
        const profileHasAddress = profileData.address && profileData.address.trim().length > 0;
        const profileHasLocation = profileData.currentLocation && profileData.currentLocation.trim().length > 0;
        const profileHasQual = profileData.highestQualification && profileData.highestQualification.trim().length > 0;
        const profileHasPassoutYear = profileData.passoutYear;
        const profileHasLanguages = profileData.languages && Array.isArray(profileData.languages) && profileData.languages.length > 0;
        const profileHasLinkedIn = profileData.linkedinUrl && profileData.linkedinUrl.trim().length > 0;
        const profileHasGithub = profileData.githubUrl && profileData.githubUrl.trim().length > 0;
        const profileHasExperience = profileData.experienceInYears !== null && profileData.experienceInYears !== undefined;

        // Check current form values to see what needs to be filled (only check once per completion)
        const currentMobileNumber = mobileNumber;
        const currentGender = gender;
        const currentDateOfBirth = dateOfBirth;
        const currentAddress = address;
        const currentCurrentLocation = currentLocation;
        const currentHighestQualification = highestQualification;
        const currentIsCustomQualification = isCustomQualification;
        const currentPassoutYear = passoutYear;
        const currentLanguages = languages;
        const currentLinkedinUrl = linkedinUrl;
        const currentGithubUrl = githubUrl;
        const currentExperienceInYears = experienceInYears;
        const currentSkills = skills;

        // Mark as processed before making changes to prevent re-triggering
        autoFillCompletedRef.current.add(completionKey);

        let fieldsFilled = [];
        let hasChanges = false;

        // Auto-fill mobile number (only if empty in both form and profile)
        if (!currentMobileNumber && !profileHasMobile && parsedDetails.mobileNumber) {
            const phone = String(parsedDetails.mobileNumber).trim();
            if (phone && phone.length >= 10) {
                setMobileNumber(phone);
                fieldsFilled.push("mobile number");
                hasChanges = true;
            }
        }

        // Auto-fill gender (only if empty in both form and profile)
        if (!currentGender && !profileHasGender && parsedDetails.gender && ["male", "female", "other"].includes(parsedDetails.gender)) {
            setGender(parsedDetails.gender);
            fieldsFilled.push("gender");
            hasChanges = true;
        }

        // Auto-fill date of birth (only if empty in both form and profile)
        if (!currentDateOfBirth && !profileHasDob && parsedDetails.dateOfBirth) {
            try {
                const dob = new Date(parsedDetails.dateOfBirth);
                if (!isNaN(dob.getTime()) && dob <= new Date()) {
                    setDateOfBirth(dob.toISOString().split("T")[0]);
                    fieldsFilled.push("date of birth");
                    hasChanges = true;
                }
            } catch (e) {
                // Invalid date, skip
            }
        }

        // Auto-fill address (only if empty in both form and profile)
        if (!currentAddress && !profileHasAddress && parsedDetails.address) {
            const addr = String(parsedDetails.address).trim();
            if (addr && addr.length > 0) {
                setAddress(addr);
                fieldsFilled.push("address");
                hasChanges = true;
            }
        }

        // Auto-fill current location (only if empty in both form and profile) - prefer currentLocation over preferredLocation
        const locationToUse = parsedDetails.currentLocation || parsedDetails.preferredLocation;
        if (!currentCurrentLocation && !profileHasLocation && locationToUse) {
            const location = String(locationToUse).trim();
            if (location && location.length >= 2 && location.length <= 80) {
                setCurrentLocation(location);
                fieldsFilled.push("location");
                hasChanges = true;
            }
        }

        // Auto-fill highest qualification (only if empty in both form and profile and matches predefined list)
        if (!currentHighestQualification && !currentIsCustomQualification && !profileHasQual && parsedDetails.highestQualification) {
            const qual = String(parsedDetails.highestQualification).trim();
            const matchingQual = qualifications.find(q => q.toLowerCase() === qual.toLowerCase());
            if (matchingQual) {
                setHighestQualification(matchingQual);
                setIsCustomQualification(false);
                fieldsFilled.push("qualification");
                hasChanges = true;
            } else if (qual) {
                // If not in list, set as custom
                setCustomQualification(qual);
                setIsCustomQualification(true);
                setHighestQualification("");
                fieldsFilled.push("qualification (custom)");
                hasChanges = true;
            }
        }

        // Auto-fill passout year (only if empty in both form and profile)
        if (!currentPassoutYear && !profileHasPassoutYear && parsedDetails.passoutYear) {
            const year = Math.round(Number(parsedDetails.passoutYear));
            if (year >= 1950 && year <= new Date().getFullYear() + 10) {
                setPassoutYear(year.toString());
                fieldsFilled.push("passout year");
                hasChanges = true;
            }
        }

        // Auto-fill languages (only if empty in both form and profile)
        if (!profileHasLanguages && parsedDetails.languages && Array.isArray(parsedDetails.languages) && parsedDetails.languages.length > 0) {
            const existingLanguages = Array.isArray(currentLanguages) && currentLanguages.length > 0 
                ? currentLanguages.map(l => `${l.language?.toLowerCase()}-${l.proficiency}`) 
                : [];
            
            const newLanguages = parsedDetails.languages
                .filter(lang => lang && lang.language && lang.proficiency)
                .filter(lang => !existingLanguages.includes(`${lang.language.toLowerCase()}-${lang.proficiency}`))
                .slice(0, 5); // Limit to top 5 new languages
            
            if (newLanguages.length > 0) {
                const existingLangs = Array.isArray(currentLanguages) && currentLanguages.length > 0 ? currentLanguages : [];
                setLanguages([...existingLangs, ...newLanguages]);
                fieldsFilled.push(`${newLanguages.length} language${newLanguages.length > 1 ? 's' : ''}`);
                hasChanges = true;
            }
        }

        // Auto-fill LinkedIn URL (only if empty in both form and profile)
        if (!currentLinkedinUrl && !profileHasLinkedIn && parsedDetails.linkedinUrl) {
            const url = String(parsedDetails.linkedinUrl).trim();
            if (url && /linkedin\.com/i.test(url)) {
                setLinkedinUrl(url);
                fieldsFilled.push("LinkedIn");
                hasChanges = true;
            }
        }

        // Auto-fill GitHub URL (only if empty in both form and profile)
        if (!currentGithubUrl && !profileHasGithub && parsedDetails.githubUrl) {
            const url = String(parsedDetails.githubUrl).trim();
            if (url && /github\.com/i.test(url)) {
                setGithubUrl(url);
                fieldsFilled.push("GitHub");
                hasChanges = true;
            }
        }

        // Auto-fill experience in years (only if empty in both form and profile)
        if (!currentExperienceInYears && !profileHasExperience && parsedDetails.experienceYears !== null && parsedDetails.experienceYears !== undefined) {
            const expYears = Math.round(parsedDetails.experienceYears);
            if (expYears > 0 && expYears <= 50) {
                setExperienceInYears(expYears.toString());
                fieldsFilled.push("experience");
                hasChanges = true;
            }
        }

        // Auto-fill skills (only if profile doesn't already have skills) - use top most skills from ordered list, merge with existing
        if (!profileHasSkills && parsedDetails.skills && Array.isArray(parsedDetails.skills) && parsedDetails.skills.length > 0) {
            const existingSkills = Array.isArray(currentSkills) && currentSkills.length > 0 ? currentSkills.map(s => String(s).toLowerCase().trim()) : [];
            // Skills are already in order (top most first) from analysis, get top 12 unique ones not already in profile
            const analysisSkills = parsedDetails.skills
                .map(s => String(s).trim())
                .filter(s => s && s.length > 0)
                .filter(s => !existingSkills.includes(s.toLowerCase()))
                .slice(0, 12); // Take top 12 from the ordered list
            
            if (analysisSkills.length > 0) {
                const existingSkillsList = Array.isArray(currentSkills) && currentSkills.length > 0 ? currentSkills : [];
                const newSkills = [...existingSkillsList, ...analysisSkills];
                // Limit total skills to 20 to keep profile clean
                setSkills(newSkills.slice(0, 20));
                fieldsFilled.push(`${analysisSkills.length} skill${analysisSkills.length > 1 ? 's' : ''}`);
                hasChanges = true;
            }
        }

        // Show notification if any fields were auto-filled (only once per completion)
        if (hasChanges && fieldsFilled.length > 0 && !autoFillToastShownRef.current.has(completionKey)) {
            autoFillToastShownRef.current.add(completionKey);
            toast.success(
                `Profile auto-filled: ${fieldsFilled.join(", ")}. Review and save to apply changes.`,
                {
                    position: "top-right",
                    duration: 5000,
                    id: `profile-autofill-${completionKey}`
                }
            );
        }
    }, [analysisState, profileData]); // Depend on analysisState and profileData to check if fields are already filled

    // Fetch and show inline resume preview when resumeUrl exists
    useEffect(() => {
        const token = Cookies.get("js_token");
        if (!token || !resumeUrl) {
            setPreviewUrl(null);
            return;
        }

        let revokeUrl = null;
        const fetchPreview = async () => {
            try {
                setPreviewLoading(true);
                const res = await axios.get(
                    `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/resume/view`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        responseType: "blob"
                    }
                );
                const blobUrl = URL.createObjectURL(res.data);
                revokeUrl = blobUrl;
                setPreviewUrl(blobUrl);
            } catch (err) {
                setPreviewUrl(null);
            } finally {
                setPreviewLoading(false);
            }
        };

        fetchPreview();

        return () => {
            if (revokeUrl) URL.revokeObjectURL(revokeUrl);
        };
    }, [resumeUrl, previewFetchNonce]);

    // Show immediate preview when user selects a new resume locally (before save)
    useEffect(() => {
        let revokeUrl = null;
        if (resumeFile) {
            if (resumeFile.type?.includes("pdf")) {
                setPreviewLoading(true);
                const objectUrl = URL.createObjectURL(resumeFile);
                revokeUrl = objectUrl;
                setPreviewUrl(objectUrl);
                setPreviewLoading(false);
            } else {
                // Unsupported preview type (doc/docx) — skip preview
                setPreviewUrl(null);
                setPreviewLoading(false);
            }
        }

        return () => {
            if (revokeUrl) URL.revokeObjectURL(revokeUrl);
        };
    }, [resumeFile]);

    // Handle profile error
    useEffect(() => {
        if (profileError) {
            if (profileError.response?.status !== 401) {
                setError("Failed to load profile. Please try again.");
            }
        }
    }, [profileError]);

    // Position is now calculated synchronously in onClick handlers for mobile
    // Keep useEffect only for desktop/fallback (language modal dropdowns)
    useEffect(() => {
        if (showLanguageDropdown && languageSelectRef.current && !isMobile) {
            updateDropdownPosition(languageSelectRef, setLanguageDropdownPosition);
        }
    }, [showLanguageDropdown, isMobile]);

    useEffect(() => {
        if (showProficiencyDropdown && proficiencySelectRef.current && !isMobile) {
            updateDropdownPosition(proficiencySelectRef, setProficiencyDropdownPosition);
        }
    }, [showProficiencyDropdown, isMobile]);

    // Position is now calculated synchronously in onClick handlers for mobile
    // Keep useEffect only for desktop/fallback
    useEffect(() => {
        if (showGenderDropdown && genderRef.current && !isMobile) {
            updateDropdownPosition(genderRef, setGenderDropdownPosition);
        }
    }, [showGenderDropdown, isMobile]);

    useEffect(() => {
        if (showPassoutYearDropdown && passoutYearRef.current && !isMobile) {
            updateDropdownPosition(passoutYearRef, setPassoutYearDropdownPosition);
        }
    }, [showPassoutYearDropdown, isMobile]);

    useEffect(() => {
        if (showQualificationDropdown && qualificationRef.current && !isMobile) {
            updateDropdownPosition(qualificationRef, setQualificationDropdownPosition);
        }
    }, [showQualificationDropdown, isMobile]);

    // Close dropdowns on scroll (mobile only) - better performance than updating positions
    useEffect(() => {
        if (!isMobile) return;

        const handleScroll = () => {
            setShowGenderDropdown(false);
            setShowPassoutYearDropdown(false);
            setShowQualificationDropdown(false);
            setShowLanguageDropdown(false);
            setShowProficiencyDropdown(false);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isMobile]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showLanguageDropdown && !event.target.closest('.jobseeker-profile-custom-dropdown')) {
                setShowLanguageDropdown(false);
            }
            if (showProficiencyDropdown && !event.target.closest('.jobseeker-profile-custom-dropdown')) {
                setShowProficiencyDropdown(false);
            }
            if (showGenderDropdown && !event.target.closest('.jobseeker-profile-custom-dropdown')) {
                setShowGenderDropdown(false);
            }
            if (showPassoutYearDropdown && !event.target.closest('.jobseeker-profile-custom-dropdown')) {
                setShowPassoutYearDropdown(false);
            }
            if (showQualificationDropdown && !event.target.closest('.jobseeker-profile-custom-dropdown')) {
                setShowQualificationDropdown(false);
            }
            if (showLocationDropdown && !event.target.closest('.jobseeker-profile-location-autocomplete')) {
                setShowLocationDropdown(false);
            }
        };

        if (showLanguageDropdown || showProficiencyDropdown || showGenderDropdown || showPassoutYearDropdown || showQualificationDropdown || showLocationDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLanguageDropdown, showProficiencyDropdown, showGenderDropdown, showPassoutYearDropdown, showQualificationDropdown, showLocationDropdown]);


    // Validation functions
    const validateField = (name, value) => {
        const newErrors = { ...errors };

        switch (name) {
            case "fullName":
                if (value && (value.length < 3 || value.length > 40)) {
                    newErrors.fullName = "Full name must be between 3 and 40 characters";
                } else {
                    delete newErrors.fullName;
                }
                break;
            case "mobileNumber":
                if (value && !/^[6-9]\d{9}$/.test(value)) {
                    newErrors.mobileNumber = "Enter a valid 10-digit mobile number";
                } else {
                    delete newErrors.mobileNumber;
                }
                break;
            case "passoutYear":
                if (value) {
                    const year = parseInt(value);
                    const currentYear = new Date().getFullYear();
                    if (year < 1950 || year > currentYear + 10) {
                        newErrors.passoutYear = `Year must be between 1950 and ${currentYear + 10}`;
                    } else {
                        delete newErrors.passoutYear;
                    }
                } else {
                    delete newErrors.passoutYear;
                }
                break;
            case "experienceInYears":
                if (value !== "" && value !== null) {
                    const exp = parseFloat(value);
                    if (exp < 0 || exp > 50) {
                        newErrors.experienceInYears = "Experience must be between 0 and 50 years";
                    } else {
                        delete newErrors.experienceInYears;
                    }
                } else {
                    delete newErrors.experienceInYears;
                }
                break;
            case "linkedinUrl":
                if (value && !/^(https?:\/\/)?(www\.)?linkedin\.com\/.+/i.test(value)) {
                    newErrors.linkedinUrl = "Enter a valid LinkedIn URL";
                } else {
                    delete newErrors.linkedinUrl;
                }
                break;
            case "githubUrl":
                if (value && !/^(https?:\/\/)?(www\.)?github\.com\/.+/i.test(value)) {
                    newErrors.githubUrl = "Enter a valid GitHub URL";
                } else {
                    delete newErrors.githubUrl;
                }
                break;
            case "expectedCTC":
                if (value !== "" && value !== null) {
                    const num = parseFloat(value);
                    if (isNaN(num) || num < 0) {
                        newErrors.expectedCTC = "Expected CTC must be a positive number";
                    } else {
                        delete newErrors.expectedCTC;
                    }
                } else {
                    delete newErrors.expectedCTC;
                }
                break;
            case "dateOfBirth":
                if (value) {
                    const dob = new Date(value);
                    const today = new Date();
                    if (dob > today) {
                        newErrors.dateOfBirth = "Date of birth cannot be in the future";
                    } else {
                        delete newErrors.dateOfBirth;
                    }
                } else {
                    delete newErrors.dateOfBirth;
                }
                break;
            case "currentLocation":
                if (value && (value.length < 2 || value.length > 80)) {
                    newErrors.currentLocation = "Location must be between 2 and 80 characters";
                } else {
                    delete newErrors.currentLocation;
                }
                break;
            default:
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle profile picture upload
    const handleProfilePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setErrors({ ...errors, profilePicture: "Image size must be less than 5MB" });
                return;
            }
            if (!file.type.startsWith("image/")) {
                setErrors({ ...errors, profilePicture: "Please upload an image file" });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result;
                setProfilePicture(base64);
                setProfilePicturePreview(base64);
                setRemoveProfilePictureRequested(false);
                // Remove profilePicture error from errors object
                const newErrors = { ...errors };
                delete newErrors.profilePicture;
                setErrors(newErrors);
            };
            reader.readAsDataURL(file);
            // reset input so same file can be selected again if needed
            e.target.value = "";
        }
    };

    // Handle resume upload
    const handleResumeChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setErrors({ ...errors, resume: "File size must be less than 10MB" });
                return;
            }
            if (!file.type.includes("pdf") && !file.type.includes("doc") && !file.type.includes("docx")) {
                setErrors({ ...errors, resume: "Please upload a PDF or Word document" });
                return;
            }

            setResumeFile(file);
            setResumeFileName(file.name);
            // Remove resume error from errors object
            const newErrors = { ...errors };
            delete newErrors.resume;
            setErrors(newErrors);
        }
    };


    // Language handlers
    const openLanguageModal = (index = null) => {
        if (index !== null) {
            setEditingLanguageIndex(index);
            setLanguageForm({ ...languages[index] });
        } else {
            setEditingLanguageIndex(null);
            setLanguageForm({
                language: "",
                proficiency: "",
                read: false,
                write: false,
                speak: false
            });
        }
        setLanguageSearchQuery("");
        setShowLanguageDropdown(false);
        setShowProficiencyDropdown(false);
        setShowLanguageModal(true);
    };

    // Calculate dropdown position for mobile
    const updateDropdownPosition = (selectRef, setPosition) => {
        if (selectRef.current) {
            const rect = selectRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
            });
        }
    };

    // Prevent body scroll when language modal is open
    useEffect(() => {
        if (showLanguageModal) {
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
    }, [showLanguageModal]);

    const closeLanguageModal = () => {
        setShowLanguageModal(false);
        setEditingLanguageIndex(null);
        setLanguageForm({
            language: "",
            proficiency: "",
            read: false,
            write: false,
            speak: false
        });
        setLanguageSearchQuery("");
        setShowLanguageDropdown(false);
        setShowProficiencyDropdown(false);
    };

    const saveLanguage = () => {
        if (!languageForm.language || !languageForm.proficiency) {
            return;
        }

        const newLanguage = {
            language: languageForm.language,
            proficiency: languageForm.proficiency,
            read: languageForm.read,
            write: languageForm.write,
            speak: languageForm.speak
        };

        if (editingLanguageIndex !== null) {
            const updatedLanguages = [...languages];
            updatedLanguages[editingLanguageIndex] = newLanguage;
            setLanguages(updatedLanguages);
        } else {
            setLanguages([...languages, newLanguage]);
        }

        closeLanguageModal();
    };

    const removeLanguage = (index) => {
        setLanguages(languages.filter((_, i) => i !== index));
    };

    const filteredLanguages = commonLanguages.filter(lang =>
        lang.toLowerCase().includes(languageSearchQuery.toLowerCase())
    );

    // Calculate profile completion percentage based on saved data
    const calculateProfileCompletion = () => {
        if (!profileData) return 0;

        const fields = [
            { value: profileData.fullName, weight: 10 },
            { value: profileData.mobileNumber, weight: 8 },
            { value: profileData.gender, weight: 5 },
            { value: profileData.dateOfBirth, weight: 5 },
            { value: profileData.address, weight: 8 },
            { value: profileData.highestQualification, weight: 10 },
            { value: profileData.passoutYear, weight: 5 },
            { value: profileData.experienceInYears !== null && profileData.experienceInYears !== undefined ? profileData.experienceInYears : null, weight: 5 },
            { value: profileData.noticePeriod !== null && profileData.noticePeriod !== undefined ? profileData.noticePeriod : null, weight: 5 },
            { value: profileData.currentCTC !== null && profileData.currentCTC !== undefined ? profileData.currentCTC : null, weight: 5 },
            { value: profileData.expectedCTC !== null && profileData.expectedCTC !== undefined ? profileData.expectedCTC : null, weight: 5 },
            { value: profileData.linkedinUrl, weight: 8 },
            { value: profileData.githubUrl, weight: 8 },
            { value: Array.isArray(profileData.skills) && profileData.skills.length > 0 ? profileData.skills : null, weight: 12 },
            { value: Array.isArray(profileData.languages) && profileData.languages.length > 0 ? profileData.languages : null, weight: 8 },
            { value: profileData.currentLocation, weight: 8 },
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
    };

    // Get progress bar color based on percentage
    const getProgressColor = (percentage) => {
        if (percentage >= 80) return "#10b981"; // green
        if (percentage >= 50) return "#f59e0b"; // orange
        return "#ef4444"; // red
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
        if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        }
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Get initials from name
    const getInitials = (name) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // View resume (opens in new tab)
    const handleViewResume = () => {
        const token = Cookies.get("js_token");
        if (!token) {
            router.push("/signin/jobseeker");
            return;
        }

        // Open resume in new tab with authentication
        const viewUrl = `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/resume/view`;
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
        }).catch(err => {
            newWindow.close();
            if (err.response?.status === 401) {
                Cookies.remove("js_token");
                router.push("/signin/jobseeker");
            } else {
                setError(err.response?.data?.message || "Failed to view resume. Please try again.");
            }
        });
    };

    // Download resume
    const handleDownloadResume = async () => {
        try {
            const token = Cookies.get("js_token");
            if (!token) {
                router.push("/signin/jobseeker");
                return;
            }

            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/resume/download`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                }
            );

            // Determine content type from filename or use default
            let contentType = 'application/pdf';
            const fileName = resumeFileName || 'resume.pdf';
            if (fileName.endsWith('.doc')) {
                contentType = 'application/msword';
            } else if (fileName.endsWith('.docx')) {
                contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            }

            // Create blob URL and trigger download
            const blob = new Blob([response.data], { type: contentType });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            if (err.response?.status === 401) {
                Cookies.remove("js_token");
                router.push("/signin/jobseeker");
            } else {
                setError(err.response?.data?.message || "Failed to download resume. Please try again.");
            }
        }
    };

    // Open delete confirmation modal
    const openDeleteModal = () => {
        setShowDeleteModal(true);
    };

    // Close delete confirmation modal
    const closeDeleteModal = () => {
        setShowDeleteModal(false);
    };

    // Delete resume (called after confirmation)
    const handleDeleteResume = async () => {
        try {
            setDeletingResume(true);
            setError("");
            setShowDeleteModal(false);
            const token = Cookies.get("js_token");
            if (!token) {
                router.push("/signin/jobseeker");
                return;
            }

            const res = await axios.delete(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/resume`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (res.data.success) {
                setSuccess("Resume deleted successfully!");
                setResumeUrl(null);
                setResumeFileName("");
                setTimeout(() => setSuccess(""), 3000);
                // Invalidate profile cache to refetch latest data
                queryClient.invalidateQueries({ queryKey: ['jobseeker', 'profile'] });
            }
        } catch (err) {
            if (err.response?.status === 401) {
                Cookies.remove("js_token");
                router.push("/signin/jobseeker");
            } else {
                setError(err.response?.data?.message || "Failed to delete resume. Please try again.");
            }
        } finally {
            setDeletingResume(false);
        }
    };

    // Delete profile picture
    const openDeletePictureModal = () => {
        setShowDeletePictureModal(true);
    };

    const closeDeletePictureModal = () => {
        if (!deletingProfilePicture) {
            setShowDeletePictureModal(false);
        }
    };

    const handleDeleteProfilePicture = async () => {
        setDeletingProfilePicture(true);
        setError("");
        // Mark for removal on save; clear previews immediately
        setProfilePicture(null);
        setProfilePicturePreview(null);
        setRemoveProfilePictureRequested(true);
        setShowDeletePictureModal(false);
        setDeletingProfilePicture(false);
        setSuccess("Photo will be removed after you save changes.");
        setTimeout(() => setSuccess(""), 3000);
    };

    const handleEnableJobAlert = async () => {
        const token = Cookies.get("js_token");
        if (!token) {
            router.push("/signin/jobseeker");
            return;
        }
        setError("");
        setEnablingJobAlert(true);
        try {
            await axios.patch(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/settings/job-alert`,
                { jobAlertOnResumeMatch: true },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setJobAlertOnResumeMatch(true);
            setShowJobAlertModal(false);
            queryClient.setQueryData(jobSeekerProfileKeys.profile(), (prev) => {
                if (!prev) return prev;
                return { ...prev, jobAlertOnResumeMatch: true };
            });
            setSuccess("Personalized job alerts enabled!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            if (err.response?.status === 401) {
                Cookies.remove("js_token");
                router.push("/signin/jobseeker");
            } else {
                setError(err.response?.data?.message || "Failed to enable alerts. Please try again.");
            }
        } finally {
            setEnablingJobAlert(false);
        }
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Validate all fields
        const validations = [
            validateField("fullName", fullName),
            validateField("mobileNumber", mobileNumber),
            validateField("passoutYear", passoutYear),
            validateField("experienceInYears", experienceInYears),
            validateField("linkedinUrl", linkedinUrl),
            validateField("githubUrl", githubUrl),
            validateField("dateOfBirth", dateOfBirth),
            validateField("currentLocation", currentLocation),
            validateField("expectedCTC", expectedCTC)
        ];

        if (validations.some(v => !v) || Object.keys(errors).length > 0) {
            setError("Please fix all validation errors before submitting");
            return;
        }

        try {
            setSaving(true);

            // Create FormData for file upload
            const formData = new FormData();
            formData.append("fullName", fullName);
            formData.append("mobileNumber", mobileNumber);
            formData.append("gender", gender || "");
            formData.append("dateOfBirth", dateOfBirth || "");
            formData.append("highestQualification", isCustomQualification ? customQualification : highestQualification);
            formData.append("passoutYear", passoutYear ? parseInt(passoutYear) : "");
            formData.append("experienceInYears", experienceInYears !== "" ? parseFloat(experienceInYears) : "");
            formData.append("linkedinUrl", linkedinUrl);
            formData.append("githubUrl", githubUrl);
            formData.append("address", address);
            formData.append("currentLocation", currentLocation);
            formData.append("noticePeriod", noticePeriod !== "" ? noticePeriod : "");
            formData.append("currentCTC", currentCTC !== "" ? parseFloat(currentCTC) : "");
            formData.append("expectedCTC", expectedCTC !== "" ? parseFloat(expectedCTC) : "");
            formData.append("skills", JSON.stringify(skills));
            formData.append("languages", JSON.stringify(languages));
            if (removeProfilePictureRequested) {
                formData.append("removeProfilePicture", "true");
            }
            
            if (!removeProfilePictureRequested && (profilePicture || profilePicturePreview)) {
                formData.append("profilePicture", profilePicture || profilePicturePreview);
            }

            // Append resume file if a new one is selected
            if (resumeFile) {
                formData.append("resume", resumeFile);
            }

            const uploadingNewResume = Boolean(resumeFile);
            if (uploadingNewResume) {
                // Optimistically show analysis in progress right after saving
                setAnalysisState({
                    resumeAnalysis: { inProgress: true, status: "processing" },
                    resumeParsedDetails: {}
                });
            }

            const updatedData = await updateProfileMutation.mutateAsync(formData);

            setSuccess("Profile updated successfully!");
            setProfilePicture(null);
            setResumeFile(null);
            setRemoveProfilePictureRequested(false);
            if (updatedData) {
                setAnalysisState({
                    resumeAnalysis: updatedData.resumeAnalysis || {},
                    resumeParsedDetails: updatedData.resumeParsedDetails || {}
                });
            }
            // Update resume URL if new resume was uploaded
            if (updatedData?.resume) {
                setResumeUrl(updatedData.resume);
                const resumePathParts = updatedData.resume.split('/');
                const filename = resumePathParts[resumePathParts.length - 1] || "resume.pdf";
                setResumeFileName(filename);
            }
            if (updatedData?.updatedAt) {
                setLastUpdated(updatedData.updatedAt);
            }
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            if (err.response?.status !== 401) {
                setError(err.response?.data?.message || "Failed to update profile. Please try again.");
            }
        } finally {
            setSaving(false);
        }
    };

    // Prevent hydration mismatch by ensuring consistent initial render
    // Show loading state only after component is mounted on client
    if (!mounted) {
        // Return same structure during SSR to prevent hydration mismatch
        return (
            <div className="jobseeker-profile-container">
                <div className="jobseeker-profile-wrapper">
                    <div className="jobseeker-profile-loading" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress />
                        <p>Loading profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    const showPreview = Boolean(previewUrl || previewLoading || (resumeFile && isDocFile(resumeFile)));

    if (loading) {
        return (
            <div className="jobseeker-profile-loading">
                <CircularProgress />
                <p>Loading profile...</p>
            </div>
        );
    }

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

    const profileCompletion = calculateProfileCompletion();
    const progressColor = getProgressColor(profileCompletion);
    const circumference = 2 * Math.PI * 70; // radius = 70
    const offset = circumference - (profileCompletion / 100) * circumference;
    const resumeAnalysis = analysisState.resumeAnalysis || {};
    const resumeInsights = analysisState.resumeParsedDetails || {};
    const analysisInProgress = resumeAnalysis?.inProgress || ["processing", "retry_scheduled"].includes(resumeAnalysis?.status);
    const hasInsights = Boolean(
        resumeInsights?.summary ||
        (resumeInsights?.skills || []).length ||
        (resumeInsights?.atsInsights || []).length
    );
    const atsInsights = Array.isArray(resumeInsights?.atsInsights) ? resumeInsights.atsInsights : [];
    const hasAtsScore = resumeInsights?.atsScore !== undefined && resumeInsights?.atsScore !== null && resumeInsights?.atsScore !== "";
    const hasAtsInsights = atsInsights.length > 0;
    const hasAtsData = hasAtsScore || hasAtsInsights;
    const needsAtsViewMore = hasAtsInsights && atsInsights.length > 3;
    const showFullAts = false; // placeholder: view more will be wired later
    const showAiCard = analysisInProgress || hasInsights;
    const jobAlertEnabled = jobAlertOnResumeMatch === true;
    const hasInstantPlan = Boolean(instantPlan?.status === "active" && instantPlan?.endDate);
    const remainingDays = hasInstantPlan
        ? Math.max(0, Math.ceil((new Date(instantPlan.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
        : 0;
    const isPlanExpired = hasInstantPlan && new Date(instantPlan.endDate) < new Date();

    const handleInstantAlertCheckout = async () => {
        const token = Cookies.get("js_token");
        if (!token) {
            router.push("/signin/jobseeker");
            return;
        }
        setInstantCheckoutLoading(true);
        setError("");

        // Load Razorpay script if not already loaded
        const loadRazorpay = () => {
            return new Promise((resolve) => {
                if (window.Razorpay) {
                    resolve(true);
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
            });
        };

        try {
            // Load Razorpay
            const isLoaded = await loadRazorpay();
            if (!isLoaded) {
                const msg = "Failed to load payment system. Please try again.";
                setError(msg);
                toast.error(msg);
                return;
            }

            // Create order
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/instant-alerts/checkout`,
                { currency: "inr" },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.data?.success) {
                const msg = res.data?.message || "Unable to start checkout. Please try again.";
                setError(msg);
                toast.error(msg);
                return;
            }

            const { orderId, amount, currency, keyId } = res.data;

            const options = {
                key: keyId,
                amount: amount,
                currency: currency,
                order_id: orderId,
                name: "Atract",
                description: "Instant Job Alerts - Monthly Subscription",
                handler: async function (response) {
                    // Verify payment
                    try {
                        await axios.post(
                            `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/instant-alerts/verify-payment`,
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            }
                        );

                        toast.success("Instant alerts activated successfully!");
                        // Refresh plan data
                        fetchPlan();
                    } catch (verifyError) {
                        console.error("Payment verification failed:", verifyError);
                        toast.error("Payment was successful but verification failed. Please contact support.");
                    }
                },
                prefill: {
                    name: "",
                    email: "",
                    contact: ""
                },
                theme: {
                    color: "#2563eb"
                },
                modal: {
                    ondismiss: function() {
                        toast.info("Payment cancelled. You can try again anytime.");
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            if (err.response?.status === 401) {
                Cookies.remove("js_token");
                router.push("/signin/jobseeker");
            } else {
                const msg = err.response?.data?.message || "Failed to start checkout. Please try again.";
                setError(msg);
                toast.error(msg);
            }
        } finally {
            setInstantCheckoutLoading(false);
        }
    };

    // ATS score styling helpers
    const atsScoreValue = hasAtsScore ? Number(resumeInsights.atsScore) : null;
    const clampAtsScore = atsScoreValue !== null ? Math.max(0, Math.min(100, atsScoreValue)) : null;
    const atsScoreColor = (() => {
        if (clampAtsScore === null) return "#22c55e";
        if (clampAtsScore >= 80) return "#16a34a";
        if (clampAtsScore >= 60) return "#f59e0b";
        return "#ef4444";
    })();

    return (
        <div className="jobseeker-profile-container">
            {!hasInstantPlan && !jobAlertEnabled && (
                <div className="jobseeker-profile-enable-banner">
                    <div className="jobseeker-profile-enable-text">
                        Enable personalized job alerts to get notified when matching roles are posted.
                    </div>
                    <button
                        type="button"
                        className="jobseeker-profile-enable-btn"
                        onClick={() => setShowJobAlertModal(true)}
                    >
                        Enable alerts
                    </button>
                </div>
            )}

            {hasInstantPlan && !isPlanExpired && (
                <div className="jobseeker-profile-active-plan-banner">
                    <div>
                        <div className="jobseeker-profile-active-plan-title">Instant Alerts is active</div>
                        <div className="jobseeker-profile-active-plan-desc">
                            {remainingDays} days remaining · Renew before {new Date(instantPlan.endDate).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="jobseeker-profile-active-plan-chip">Active</div>
                </div>
            )}

            {hasInstantPlan && isPlanExpired && (
                <div className="jobseeker-profile-expired-plan-banner">
                    <div>
                        <div className="jobseeker-profile-expired-plan-title">Instant Alerts expired</div>
                        <div className="jobseeker-profile-expired-plan-desc">
                            Your plan expired on {new Date(instantPlan.endDate).toLocaleDateString()}. Renew to continue receiving instant alerts.
                        </div>
                    </div>
                    <button
                        type="button"
                        className="jobseeker-profile-renew-btn"
                        onClick={handleInstantAlertCheckout}
                        disabled={instantCheckoutLoading}
                    >
                        {instantCheckoutLoading ? "Processing..." : "Renew for ₹200"}
                    </button>
                </div>
            )}

            {!hasInstantPlan && (
                <div
                    className="jobseeker-profile-alert-banner"
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowInstantAlertModal(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setShowInstantAlertModal(true);
                        }
                    }}
                >
                    <div className="jobseeker-profile-alert-left">
                        <div className="jobseeker-profile-alert-eyebrow">Stay ahead</div>
                        <div className="jobseeker-profile-alert-title">Instant job alerts. Be first to apply.</div>
                        <div className="jobseeker-profile-alert-desc">
                            When a matching job is posted, we’ll send you an alert right away.
                        </div>
                        <div className="jobseeker-profile-alert-sub">
                            <span className="jobseeker-profile-alert-pill">Lightning-fast alerts</span>
                            <span className="jobseeker-profile-alert-pill">AI-matched to your resume</span>
                            <span className="jobseeker-profile-alert-pill jobseeker-profile-alert-price">Only ₹200/mo</span>
                        </div>
                    </div>
                    <span className="jobseeker-profile-alert-arrow" aria-hidden="true">
                        <FaArrowRight />
                    </span>
                </div>
            )}
            {/* Profile Header with Circular Progress */}
            <div className="jobseeker-profile-header-card">
                <div className="jobseeker-profile-picture-wrapper">
                    <div className="jobseeker-profile-picture-container">
                        <svg className="jobseeker-profile-progress-ring" viewBox="0 0 160 160" width="160" height="160">
                            <circle
                                className="jobseeker-profile-progress-ring-background"
                                cx="80"
                                cy="80"
                                r="70"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="6"
                            />
                            <circle
                                className="jobseeker-profile-progress-ring-progress"
                                cx="80"
                                cy="80"
                                r="70"
                                fill="none"
                                stroke={progressColor}
                                strokeWidth="6"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                transform="rotate(-90 80 80)"
                                style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
                            />
                        </svg>
                        <div className="jobseeker-profile-picture-avatar">
                            {profilePicturePreview ? (
                                <img src={profilePicturePreview} alt="Profile" />
                            ) : (
                                <div className="jobseeker-profile-avatar-initials">
                                    {getInitials(fullName)}
                                </div>
                            )}
                        </div>
                        <div className="jobseeker-profile-progress-text-overlay" style={{ color: progressColor }}>
                            {profileCompletion}%
                        </div>
                    </div>
                </div>
                <div className="jobseeker-profile-info-summary">
                    <h1 className="jobseeker-profile-name">{fullName || "User Name"}</h1>
                    <div className="jobseeker-profile-details-grid">
                        <div className="jobseeker-profile-detail-item">
                            <span className="jobseeker-profile-detail-label">Total Experience</span>
                            <span className="jobseeker-profile-detail-value">
                                {experienceInYears ? `${experienceInYears} years` : "Not specified"}
                            </span>
                        </div>
                        <div className="jobseeker-profile-detail-item">
                            <span className="jobseeker-profile-detail-label">Mobile</span>
                            <span className="jobseeker-profile-detail-value">{mobileNumber || "Not provided"}</span>
                        </div>
                        <div className="jobseeker-profile-detail-item">
                            <span className="jobseeker-profile-detail-label">Email</span>
                            <span className="jobseeker-profile-detail-value">{email || "Not provided"}</span>
                        </div>
                        <div className="jobseeker-profile-detail-item">
                            <span className="jobseeker-profile-detail-label">Notice Period</span>
                            <span className="jobseeker-profile-detail-value">
                                {noticePeriod ? `${noticePeriod} days` : "Not specified"}
                            </span>
                        </div>
                    </div>
                    <div className="jobseeker-profile-last-updated">
                        <span className="jobseeker-profile-last-updated-label">Last Updated:</span>
                        <span className="jobseeker-profile-last-updated-value">{formatDate(lastUpdated)}</span>
                    </div>
                </div>
            </div>

            {showAiCard && (
                <div className="jobseeker-profile-ai-card">
                    <div className="jobseeker-profile-ai-left">
                        <div className="jobseeker-profile-ai-eyebrow">AI resume intelligence</div>
                        <h3 className="jobseeker-profile-ai-title">
                            {analysisInProgress ? "We’re polishing your resume signals" : "Insights ready for smarter job matches"}
                        </h3>
                        <p className="jobseeker-profile-ai-body">
                            {analysisInProgress
                                ? "Our AI is extracting skills, roles, and ATS tips to personalize your alerts and recommendations."
                                : "We’ve unlocked skills, titles, and ATS insights to tailor alerts and recommendations for you."}
                        </p>
                        <div className="jobseeker-profile-ai-badges">
                            <span className={`jobseeker-profile-ai-badge ${analysisInProgress ? "pulse" : "success"}`}>
                                {analysisInProgress ? "Analyzing in background" : "Insights generated"}
                            </span>
                            {resumeAnalysis?.status === "retry_scheduled" && resumeAnalysis?.nextRetryAt && (
                                <span className="jobseeker-profile-ai-badge subtle">
                                    Next retry at {new Date(resumeAnalysis.nextRetryAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            )}
                            {resumeAnalysis?.status === "failed" && (
                                <span className="jobseeker-profile-ai-badge danger">Analysis paused after attempts</span>
                            )}
                        </div>
                        {!analysisInProgress && hasInsights && (
                            <div className="jobseeker-profile-ai-insights">
                                {resumeInsights.summary && (
                                    <div className="jobseeker-profile-ai-chip highlight">
                                        <FaMagic /> {resumeInsights.summary.slice(0, 140)}{resumeInsights.summary.length > 140 ? "…" : ""}
                                    </div>
                                )}
                                {(resumeInsights.skills || []).slice(0, 6).map((skill, idx) => (
                                    <span key={`skill-${idx}`} className="jobseeker-profile-ai-chip">
                                        {skill}
                                    </span>
                                ))}
                                {(resumeInsights.atsInsights || []).slice(0, 3).map((insight, idx) => (
                                    <span key={`insight-${idx}`} className="jobseeker-profile-ai-chip subtle-chip">
                                        {insight}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="jobseeker-profile-ai-right">
                        <div className="jobseeker-profile-ai-orb">
                            {analysisInProgress ? (
                                <>
                                    <div className="jobseeker-profile-ai-orb-glow" />
                                    <CircularProgress size={54} sx={{ color: "#fff" }} />
                                    <span className="jobseeker-profile-ai-orb-text">Live</span>
                                </>
                            ) : (
                                <div className="jobseeker-profile-ats-ring" style={{ "--ats-ring-color": atsScoreColor }}>
                                    <svg viewBox="0 0 120 120">
                                        <circle className="jobseeker-profile-ats-ring-bg" cx="60" cy="60" r="50" />
                                        <circle
                                            className="jobseeker-profile-ats-ring-progress"
                                            cx="60"
                                            cy="60"
                                            r="50"
                                            strokeDasharray={`${clampAtsScore !== null ? (Math.PI * 100 * (clampAtsScore / 100)) : 0} ${Math.PI * 100}`}
                                        />
                                        <text x="60" y="62" textAnchor="middle" className="jobseeker-profile-ats-ring-text">
                                            {clampAtsScore !== null ? Math.round(clampAtsScore) : "--"}
                                        </text>
                                        <text x="60" y="83" textAnchor="middle" className="jobseeker-profile-ats-ring-subtext">
                                            ATS
                                        </text>
                                    </svg>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="jobseeker-profile-header">
                <h1>Edit Profile</h1>
                <p>Update your profile information to help employers find you</p>
            </div>

            {error && <div className="jobseeker-profile-message error">{error}</div>}
            {success && <div className="jobseeker-profile-message success">{success}</div>}

            {/* Quick Navigation Links */}
            <div className="jobseeker-profile-quick-links">
                <button
                    type="button"
                    onClick={() => document.getElementById('personal-info')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="jobseeker-profile-quick-link-btn"
                >
                    Personal Info
                </button>
                <button
                    type="button"
                    onClick={() => document.getElementById('profile-picture')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="jobseeker-profile-quick-link-btn"
                >
                    Profile Picture
                </button>
                <button
                    type="button"
                    onClick={() => document.getElementById('education')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="jobseeker-profile-quick-link-btn"
                >
                    Education
                </button>
                <button
                    type="button"
                    onClick={() => document.getElementById('skills')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="jobseeker-profile-quick-link-btn"
                >
                    Skills
                </button>
                <button
                    type="button"
                    onClick={() => document.getElementById('languages')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="jobseeker-profile-quick-link-btn"
                >
                    Languages
                </button>
                <button
                    type="button"
                    onClick={() => document.getElementById('social-links')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="jobseeker-profile-quick-link-btn"
                >
                    Social Links
                </button>
                <button
                    type="button"
                    onClick={() => document.getElementById('resume')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="jobseeker-profile-quick-link-btn"
                >
                    Resume
                </button>
            </div>

            <form onSubmit={handleSubmit} className="jobseeker-profile-form">
                {/* Resume Section */}
                <div id="resume" className="jobseeker-profile-section jobseeker-profile-resume-top">
                    <div className={`jobseeker-profile-resume-flex ${showPreview ? "" : "no-preview"}`}>
                        <div className="jobseeker-profile-resume-left">
                            <div className="jobseeker-profile-resume-header">
                                <span className="jobseeker-profile-section-title">Upload your resume</span>
                                <span className="jobseeker-profile-ai-tag">AI powered</span>
                            </div>
                            <p className="jobseeker-profile-resume-subtitle">
                                Our AI will analyze your resume and surface ATS insights after you upload.
                            </p>
                            <div
                                className={`jobseeker-profile-resume-upload-section jobseeker-profile-resume-dropzone ${isDragActive ? "drag-active" : ""}`}
                                onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
                                onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragActive(false);
                                    const file = e.dataTransfer?.files?.[0];
                                    if (file) {
                                        handleResumeChange({ target: { files: [file] } });
                                    }
                                }}
                                onClick={() => {
                                    document.getElementById("resumeUpload")?.click();
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        document.getElementById("resumeUpload")?.click();
                                    }
                                }}
                            >
                                <div className="jobseeker-profile-resume-drop-inner">
                                    <div className="jobseeker-profile-resume-btn-body">
                                        <span className="jobseeker-profile-resume-btn-text">
                                            {resumeFile ? "Change Resume" : "Drag & drop or click to upload"}
                                        </span>
                                        <div className="jobseeker-profile-resume-btn-meta">
                                            <span className="jobseeker-profile-resume-filename">
                                                {resumeFileName || "No file selected"}
                                            </span>
                                            <small className="jobseeker-profile-resume-drop-hint">PDF or DOCX · up to 10MB</small>
                                        </div>
                                    </div>
                                    <span className="jobseeker-profile-resume-drop-icon">
                                        <FaFileUpload />
                                    </span>
                                </div>
                                <input
                                    id="resumeUpload"
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleResumeChange}
                                    style={{ display: "none" }}
                                />
                                {errors.resume && <span className="jobseeker-profile-field-error">{errors.resume}</span>}
                            </div>

                            {(resumeFile || resumeUrl) && (
                                <div className="jobseeker-profile-ats-card">
                                    <div className="jobseeker-profile-ats-header">
                                        <div className="jobseeker-profile-ats-title">
                                            <span className="jobseeker-profile-ats-eyebrow">ATS analysis</span>
                                            <span className="jobseeker-profile-ats-heading">Score & insights</span>
                                        </div>
                                        {hasAtsScore && (
                                            <div className="jobseeker-profile-ats-score">
                                                <span>ATS Score</span>
                                                <strong>{resumeInsights.atsScore}</strong>
                                            </div>
                                        )}
                                    </div>

                                    {hasAtsData ? (
                                        <div className={`jobseeker-profile-ats-insights ${needsAtsViewMore ? "collapsed" : ""}`}>
                                            {hasAtsInsights && (
                                                <ul className="jobseeker-profile-ats-list">
                                                    {atsInsights.map((insight, idx) => (
                                                        <li key={`ats-${idx}`}>{insight}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {!hasAtsInsights && hasAtsScore && (
                                                <div className="jobseeker-profile-ats-placeholder">
                                                    <span>ATS score generated. Detailed insights will appear here.</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="jobseeker-profile-ats-placeholder">
                                            {analysisInProgress ? (
                                                <>
                                                    <div className="jobseeker-profile-ats-loading">
                                                        <CircularProgress size={20} />
                                                        <span>Analyzing your resume…</span>
                                                    </div>
                                                    <span>We’re extracting ATS score and insights. This runs in the background even if you leave.</span>
                                                </>
                                            ) : (
                                                <>
                                                    <strong>No ATS insights yet.</strong>
                                                    <span>Save your profile to let our AI analyze your resume and surface ATS tips.</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    {needsAtsViewMore && (
                                        <button
                                            type="button"
                                            className="jobseeker-profile-ats-toggle"
                                        >
                                            View more
                                        </button>
                                    )}
                                </div>
                            )}

                            {resumeUrl && !resumeFile && (
                                <div className="jobseeker-profile-resume-actions">
                                    <button
                                        type="button"
                                        onClick={handleViewResume}
                                        className="jobseeker-profile-resume-action-btn-icon view-btn"
                                        title="View Resume"
                                    >
                                        <FaEye />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadResume}
                                        className="jobseeker-profile-resume-action-btn-icon download-btn"
                                        title="Download Resume"
                                    >
                                        <FaDownload />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openDeleteModal}
                                        className="jobseeker-profile-resume-action-btn-icon delete-btn"
                                        title="Delete Resume"
                                        disabled={deletingResume}
                                    >
                                        {deletingResume ? (
                                            <CircularProgress size={16} sx={{ color: "white" }} />
                                        ) : (
                                            <FaTrash />
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {(previewUrl || previewLoading || (resumeFile && isDocFile(resumeFile))) && (
                            <div className="jobseeker-profile-resume-preview">
                                {previewLoading && (
                                    <div className="jobseeker-profile-resume-preview-loading">
                                        <CircularProgress size={28} />
                                        <span>Loading preview...</span>
                                    </div>
                                )}
                                {!previewLoading && previewUrl && (
                                    <iframe src={`${previewUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&view=FitH`} title="Resume Preview" />
                                )}
                                {!previewLoading && !previewUrl && resumeFile && isDocFile(resumeFile) && (
                                    <div className="jobseeker-profile-resume-preview-empty">
                                        <strong>Preview not available for DOC/DOCX.</strong>
                                        <span>You can still upload and save your resume, then view/download it after saving.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Personal Information Section */}
                <div id="personal-info" className="jobseeker-profile-section">
                    <h2 className="jobseeker-profile-section-title">Personal Information</h2>
                    
                    <div className="jobseeker-profile-form-grid">
                        <div className="jobseeker-profile-form-group">
                            <label>Full Name <span className="jobseeker-profile-required">*</span></label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => {
                                    setFullName(e.target.value);
                                    validateField("fullName", e.target.value);
                                }}
                                onBlur={() => validateField("fullName", fullName)}
                                placeholder="Enter your full name"
                                maxLength={40}
                                required
                            />
                            {errors.fullName && <span className="jobseeker-profile-field-error">{errors.fullName}</span>}
                        </div>

                        <div className="jobseeker-profile-form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="jobseeker-profile-disabled-input"
                            />
                            <small className="jobseeker-profile-field-hint">Email cannot be changed</small>
                        </div>

                        <div className="jobseeker-profile-form-group">
                            <label>Mobile Number</label>
                            <input
                                type="tel"
                                value={mobileNumber}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                    setMobileNumber(value);
                                    validateField("mobileNumber", value);
                                }}
                                onBlur={() => validateField("mobileNumber", mobileNumber)}
                                placeholder="Enter 10-digit mobile number"
                                maxLength={10}
                            />
                            {errors.mobileNumber && <span className="jobseeker-profile-field-error">{errors.mobileNumber}</span>}
                        </div>

                        <div className={`jobseeker-profile-form-group jobseeker-profile-gender-group ${showGenderDropdown ? 'jobseeker-profile-dropdown-open' : ''}`}>
                            <label>Gender</label>
                            <div className={`jobseeker-profile-custom-dropdown ${showGenderDropdown ? 'jobseeker-profile-dropdown-open' : ''}`} ref={genderRef}>
                                <div
                                    className={`jobseeker-profile-custom-dropdown-select ${showGenderDropdown ? 'jobseeker-profile-open' : ''}`}
                                    onClick={() => {
                                        if (!showGenderDropdown && isMobile && genderRef.current) {
                                            // Calculate position before opening on mobile
                                            updateDropdownPosition(genderRef, setGenderDropdownPosition);
                                        }
                                        setShowGenderDropdown(!showGenderDropdown);
                                        setShowPassoutYearDropdown(false);
                                    }}
                                >
                                    <span className={gender ? "jobseeker-profile-dropdown-selected" : "jobseeker-profile-dropdown-placeholder"}>
                                        {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : "Select Gender"}
                                    </span>
                                    <HiChevronDown className={`jobseeker-profile-dropdown-arrow ${showGenderDropdown ? 'jobseeker-profile-open' : ''}`} />
                                </div>
                                    {showGenderDropdown && (
                                        <div
                                            className="jobseeker-profile-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${genderDropdownPosition.top || 0}px`,
                                                left: `${genderDropdownPosition.left || 0}px`,
                                                width: `${genderDropdownPosition.width || '100%'}px`
                                            } : {}}
                                        >
                                        <div
                                            className={`jobseeker-profile-custom-dropdown-item ${!gender ? 'jobseeker-profile-selected' : ''}`}
                                            onClick={() => {
                                                setGender('');
                                                setShowGenderDropdown(false);
                                            }}
                                        >
                                            <span>Select Gender</span>
                                            {!gender && <HiCheck className="jobseeker-profile-check-icon" />}
                                        </div>
                                        <div
                                            className={`jobseeker-profile-custom-dropdown-item ${gender === 'male' ? 'jobseeker-profile-selected' : ''}`}
                                            onClick={() => {
                                                setGender('male');
                                                setShowGenderDropdown(false);
                                            }}
                                        >
                                            <span>Male</span>
                                            {gender === 'male' && <HiCheck className="jobseeker-profile-check-icon" />}
                                        </div>
                                        <div
                                            className={`jobseeker-profile-custom-dropdown-item ${gender === 'female' ? 'jobseeker-profile-selected' : ''}`}
                                            onClick={() => {
                                                setGender('female');
                                                setShowGenderDropdown(false);
                                            }}
                                        >
                                            <span>Female</span>
                                            {gender === 'female' && <HiCheck className="jobseeker-profile-check-icon" />}
                                        </div>
                                        <div
                                            className={`jobseeker-profile-custom-dropdown-item ${gender === 'other' ? 'jobseeker-profile-selected' : ''}`}
                                            onClick={() => {
                                                setGender('other');
                                                setShowGenderDropdown(false);
                                            }}
                                        >
                                            <span>Other</span>
                                            {gender === 'other' && <HiCheck className="jobseeker-profile-check-icon" />}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="jobseeker-profile-form-group">
                            <label>Date of Birth</label>
                            <input
                                type="date"
                                value={dateOfBirth}
                                onChange={(e) => {
                                    setDateOfBirth(e.target.value);
                                    validateField("dateOfBirth", e.target.value);
                                }}
                                onBlur={() => validateField("dateOfBirth", dateOfBirth)}
                                max={new Date().toISOString().split("T")[0]}
                            />
                            {errors.dateOfBirth && <span className="jobseeker-profile-field-error">{errors.dateOfBirth}</span>}
                        </div>

                        <div className="jobseeker-profile-form-group full-width jobseeker-profile-location-group">
                            <label>Current Location</label>
                            <div className="jobseeker-profile-location-autocomplete">
                                <input
                                    type="text"
                                    value={locationQuery}
                                    onChange={(e) => {
                                        setLocationQuery(e.target.value);
                                        setCurrentLocation(e.target.value);
                                        validateField("currentLocation", e.target.value);
                                        setShowLocationDropdown(true);
                                    }}
                                    onFocus={() => setShowLocationDropdown(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            setShowLocationDropdown(false);
                                        }
                                    }}
                                    placeholder="Search or enter your city (India)"
                                />
                                {showLocationDropdown && (
                                    <div className="jobseeker-profile-location-dropdown">
                                        {filteredLocations.length > 0 ? (
                                            filteredLocations.map((city) => (
                                                <button
                                                    type="button"
                                                    key={city}
                                                    className="jobseeker-profile-location-option"
                                                    onClick={() => {
                                                        setCurrentLocation(city);
                                                        setLocationQuery(city);
                                                        validateField("currentLocation", city);
                                                        setShowLocationDropdown(false);
                                                    }}
                                                >
                                                    {city}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="jobseeker-profile-location-empty">
                                                No matches. Press Enter to keep a custom location.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <small className="jobseeker-profile-field-hint">Type to search popular Indian cities or enter your own.</small>
                            {errors.currentLocation && <span className="jobseeker-profile-field-error">{errors.currentLocation}</span>}
                        </div>

                        <div className="jobseeker-profile-form-group full-width">
                            <label>Full Address</label>
                            <textarea
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter your complete address"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* Profile Picture Section */}
                <div id="profile-picture" className="jobseeker-profile-section">
                    <h2 className="jobseeker-profile-section-title">Profile Picture</h2>
                    <div className="jobseeker-profile-picture-section">
                        <div className="jobseeker-profile-picture-preview">
                            {profilePicturePreview ? (
                                <img src={profilePicturePreview} alt="Profile" />
                            ) : (
                                <div className="jobseeker-profile-picture-placeholder">
                                    <FaCamera size={40} />
                                    <span>No photo</span>
                                </div>
                            )}
                        </div>
                        <div className="jobseeker-profile-picture-upload">
                            <label htmlFor="profile-picture-input" className="jobseeker-profile-upload-btn">
                                <FaCamera /> {profilePicturePreview ? "Change Photo" : "Upload Photo"}
                            </label>
                            <input
                                id="profile-picture-input"
                                type="file"
                                accept="image/*"
                                onChange={handleProfilePictureChange}
                                style={{ display: "none" }}
                            />
                            <small>Max 5MB. JPG, PNG, GIF</small>
                            <div className="jobseeker-profile-picture-actions">
                                {profilePicturePreview && (
                                    <button
                                        type="button"
                                        className="jobseeker-profile-delete-picture-btn"
                                        onClick={openDeletePictureModal}
                                        disabled={deletingProfilePicture}
                                    >
                                        {deletingProfilePicture ? (
                                            <CircularProgress size={14} sx={{ color: "white" }} />
                                        ) : (
                                            <>
                                                <FaTrash /> Delete Photo
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            {errors.profilePicture && <span className="jobseeker-profile-field-error">{errors.profilePicture}</span>}
                        </div>
                    </div>
                </div>

                {/* Education & Experience Section */}
                <div id="education" className="jobseeker-profile-section">
                    <h2 className="jobseeker-profile-section-title">Education & Experience</h2>
                    
                    <div className="jobseeker-profile-form-grid">
                        <div className={`jobseeker-profile-form-group ${showQualificationDropdown ? 'jobseeker-profile-dropdown-open' : ''}`}>
                            <label>Highest Qualification</label>
                            <div className={`jobseeker-profile-custom-dropdown ${showQualificationDropdown ? 'jobseeker-profile-dropdown-open' : ''}`} ref={qualificationRef}>
                                <div
                                    className={`jobseeker-profile-custom-dropdown-select ${showQualificationDropdown ? 'jobseeker-profile-open' : ''}`}
                                    onClick={() => {
                                        if (!showQualificationDropdown && isMobile && qualificationRef.current) {
                                            updateDropdownPosition(qualificationRef, setQualificationDropdownPosition);
                                        }
                                        setShowQualificationDropdown(!showQualificationDropdown);
                                        setShowGenderDropdown(false);
                                        setShowPassoutYearDropdown(false);
                                    }}
                                >
                                    <span className={(isCustomQualification && customQualification) || highestQualification ? "jobseeker-profile-dropdown-selected" : "jobseeker-profile-dropdown-placeholder"}>
                                        {isCustomQualification ? customQualification : (highestQualification || "Select Qualification")}
                                    </span>
                                    <HiChevronDown className={`jobseeker-profile-dropdown-arrow ${showQualificationDropdown ? 'jobseeker-profile-open' : ''}`} />
                                </div>
                                {showQualificationDropdown && (
                                    <div
                                        className="jobseeker-profile-custom-dropdown-menu"
                                        style={isMobile ? {
                                            position: 'fixed',
                                            top: `${qualificationDropdownPosition.top || 0}px`,
                                            left: `${qualificationDropdownPosition.left || 0}px`,
                                            width: `${qualificationDropdownPosition.width || '100%'}px`
                                        } : {}}
                                    >
                                        <div
                                            className={`jobseeker-profile-custom-dropdown-item ${!highestQualification && !isCustomQualification ? 'jobseeker-profile-selected' : ''}`}
                                            onClick={() => {
                                                setHighestQualification('');
                                                setIsCustomQualification(false);
                                                setCustomQualification("");
                                                setShowQualificationDropdown(false);
                                            }}
                                        >
                                            <span>Select Qualification</span>
                                            {!highestQualification && !isCustomQualification && <HiCheck className="jobseeker-profile-check-icon" />}
                                        </div>
                                        {qualifications.map((qual) => (
                                            <div
                                                key={qual}
                                                className={`jobseeker-profile-custom-dropdown-item ${!isCustomQualification && highestQualification === qual ? 'jobseeker-profile-selected' : ''}`}
                                                onClick={() => {
                                                    setHighestQualification(qual);
                                                    setIsCustomQualification(false);
                                                    setCustomQualification("");
                                                    setShowQualificationDropdown(false);
                                                }}
                                            >
                                                <span>{qual}</span>
                                                {!isCustomQualification && highestQualification === qual && <HiCheck className="jobseeker-profile-check-icon" />}
                                            </div>
                                        ))}
                                        <div
                                            className="jobseeker-profile-custom-dropdown-item jobseeker-profile-custom-option"
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
                                    value={customQualification}
                                    onChange={(e) => setCustomQualification(e.target.value)}
                                    placeholder="Enter qualification"
                                    className="jobseeker-profile-custom-input"
                                    style={{ marginTop: '8px' }}
                                />
                            )}
                        </div>

                        <div className={`jobseeker-profile-form-group ${showPassoutYearDropdown ? 'jobseeker-profile-dropdown-open' : ''}`}>
                            <label>Passout Year</label>
                            <div className={`jobseeker-profile-custom-dropdown ${showPassoutYearDropdown ? 'jobseeker-profile-dropdown-open' : ''}`} ref={passoutYearRef}>
                                <div
                                    className={`jobseeker-profile-custom-dropdown-select ${showPassoutYearDropdown ? 'jobseeker-profile-open' : ''}`}
                                    onClick={() => {
                                        if (!showPassoutYearDropdown && isMobile && passoutYearRef.current) {
                                            // Calculate position before opening on mobile
                                            updateDropdownPosition(passoutYearRef, setPassoutYearDropdownPosition);
                                        }
                                        setShowPassoutYearDropdown(!showPassoutYearDropdown);
                                        setShowGenderDropdown(false);
                                    }}
                                >
                                    <span className={passoutYear ? "jobseeker-profile-dropdown-selected" : "jobseeker-profile-dropdown-placeholder"}>
                                        {passoutYear || "Select Year"}
                                    </span>
                                    <HiChevronDown className={`jobseeker-profile-dropdown-arrow ${showPassoutYearDropdown ? 'jobseeker-profile-open' : ''}`} />
                                </div>
                                {showPassoutYearDropdown && (
                                    <div
                                        className="jobseeker-profile-custom-dropdown-menu"
                                        style={isMobile ? {
                                            position: 'fixed',
                                            top: `${passoutYearDropdownPosition.top || 0}px`,
                                            left: `${passoutYearDropdownPosition.left || 0}px`,
                                            width: `${passoutYearDropdownPosition.width || '100%'}px`
                                        } : {}}
                                    >
                                        <div
                                            className={`jobseeker-profile-custom-dropdown-item ${!passoutYear ? 'jobseeker-profile-selected' : ''}`}
                                            onClick={() => {
                                                setPassoutYear('');
                                                setShowPassoutYearDropdown(false);
                                                validateField("passoutYear", '');
                                            }}
                                        >
                                            <span>Select Year</span>
                                            {!passoutYear && <HiCheck className="jobseeker-profile-check-icon" />}
                                        </div>
                                        {years.map((year) => (
                                            <div
                                                key={year}
                                                className={`jobseeker-profile-custom-dropdown-item ${passoutYear === String(year) ? 'jobseeker-profile-selected' : ''}`}
                                                onClick={() => {
                                                    setPassoutYear(String(year));
                                                    setShowPassoutYearDropdown(false);
                                                    validateField("passoutYear", String(year));
                                                }}
                                            >
                                                <span>{year}</span>
                                                {passoutYear === String(year) && <HiCheck className="jobseeker-profile-check-icon" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {errors.passoutYear && <span className="jobseeker-profile-field-error">{errors.passoutYear}</span>}
                        </div>

                        <div className="jobseeker-profile-form-group">
                            <label>Experience (Years)</label>
                            <input
                                type="number"
                                value={experienceInYears}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setExperienceInYears(value);
                                    validateField("experienceInYears", value);
                                }}
                                onBlur={() => validateField("experienceInYears", experienceInYears)}
                                placeholder="e.g., 2.5"
                                min="0"
                                max="50"
                                step="0.1"
                            />
                            {errors.experienceInYears && <span className="jobseeker-profile-field-error">{errors.experienceInYears}</span>}
                            <small className="jobseeker-profile-field-hint">Enter in years (e.g., 2.5 for 2 years 6 months)</small>
                        </div>

                        <div className="jobseeker-profile-form-group">
                            <label>Notice Period (Days)</label>
                            <input
                                type="number"
                                value={noticePeriod}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setNoticePeriod(value);
                                }}
                                placeholder="e.g., 30, 60, 90"
                                min="0"
                                max="365"
                                step="1"
                            />
                            <small className="jobseeker-profile-field-hint">Enter your notice period in days</small>
                        </div>

                        <div className="jobseeker-profile-form-group">
                            <label>Current CTC (LPA)</label>
                            <input
                                type="number"
                                value={currentCTC}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setCurrentCTC(value);
                                }}
                                placeholder="e.g., 5.5, 10, 15"
                                min="0"
                                step="0.1"
                            />
                            <small className="jobseeker-profile-field-hint">Enter your current annual salary in Lakhs Per Annum (LPA)</small>
                        </div>

                        <div className="jobseeker-profile-form-group">
                            <label>Expected CTC (LPA)</label>
                            <input
                                type="number"
                                value={expectedCTC}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setExpectedCTC(value);
                                    validateField("expectedCTC", value);
                                }}
                                onBlur={() => validateField("expectedCTC", expectedCTC)}
                                placeholder="e.g., 6, 12, 18"
                                min="0"
                                step="0.1"
                            />
                            <small className="jobseeker-profile-field-hint">Enter your expected annual salary in Lakhs Per Annum (LPA)</small>
                            {errors.expectedCTC && <span className="jobseeker-profile-field-error">{errors.expectedCTC}</span>}
                        </div>
                    </div>
                </div>

                {/* Skills Section */}
                <div id="skills" className="jobseeker-profile-section">
                    <h2 className="jobseeker-profile-section-title">Skills</h2>
                        <SkillSelector
                            label="Skills"
                            placeholder="Search skills (e.g., React, Product Strategy, Excel)"
                            helperText="Search and add relevant skills. This helps employers find you and match you with the right opportunities."
                            selectedSkills={skills}
                            onChange={setSkills}
                            disabled={saving}
                        />
                </div>

                {/* Languages Section */}
                <div id="languages" className="jobseeker-profile-section">
                    <h2 className="jobseeker-profile-section-title">Languages</h2>
                    <div className="jobseeker-profile-languages-container">
                        {languages.length > 0 && (
                            <div className="jobseeker-profile-languages-list">
                                {languages.map((lang, index) => (
                                    <div key={index} className="jobseeker-profile-language-item">
                                        <div className="jobseeker-profile-language-item-content">
                                            <div className="jobseeker-profile-language-item-header">
                                                <FaLanguage className="jobseeker-profile-language-icon" />
                                                <div className="jobseeker-profile-language-info">
                                                    <span className="jobseeker-profile-language-name">{lang.language}</span>
                                                    <span className="jobseeker-profile-language-proficiency">{lang.proficiency}</span>
                                                </div>
                                            </div>
                                            <div className="jobseeker-profile-language-capabilities">
                                                {lang.read && <span className="jobseeker-profile-capability-badge">Read</span>}
                                                {lang.write && <span className="jobseeker-profile-capability-badge">Write</span>}
                                                {lang.speak && <span className="jobseeker-profile-capability-badge">Speak</span>}
                                            </div>
                                        </div>
                                        <div className="jobseeker-profile-language-item-actions">
                                            <button
                                                type="button"
                                                onClick={() => openLanguageModal(index)}
                                                className="jobseeker-profile-language-edit-btn"
                                                title="Edit Language"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeLanguage(index)}
                                                className="jobseeker-profile-language-delete-btn"
                                                title="Delete Language"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => openLanguageModal()}
                            className="add-language-btn"
                        >
                            <FaPlus /> Add Language
                        </button>
                    </div>
                </div>

                {/* Social Links Section */}
                <div id="social-links" className="jobseeker-profile-section">
                    <h2 className="jobseeker-profile-section-title">Social Links</h2>
                    
                    <div className="jobseeker-profile-form-grid">
                        <div className="jobseeker-profile-form-group">
                            <label>LinkedIn URL</label>
                            <input
                                type="url"
                                value={linkedinUrl}
                                onChange={(e) => {
                                    setLinkedinUrl(e.target.value);
                                    validateField("linkedinUrl", e.target.value);
                                }}
                                onBlur={() => validateField("linkedinUrl", linkedinUrl)}
                                placeholder="https://linkedin.com/in/yourprofile"
                            />
                            {errors.linkedinUrl && <span className="jobseeker-profile-field-error">{errors.linkedinUrl}</span>}
                        </div>

                        <div className="jobseeker-profile-form-group">
                            <label>GitHub URL</label>
                            <input
                                type="url"
                                value={githubUrl}
                                onChange={(e) => {
                                    setGithubUrl(e.target.value);
                                    validateField("githubUrl", e.target.value);
                                }}
                                onBlur={() => validateField("githubUrl", githubUrl)}
                                placeholder="https://github.com/yourusername"
                            />
                            {errors.githubUrl && <span className="jobseeker-profile-field-error">{errors.githubUrl}</span>}
                        </div>
                    </div>
                </div>

            </form>

            {/* Promotional Banner */}
            <PromotionalBanner />

            {/* Fixed Footer with Save Button and Profile Completion */}
            <div className="jobseeker-profile-footer">
                <div className="jobseeker-profile-completion">
                    <span className="jobseeker-profile-completion-label">Profile Completion</span>
                    <span className="jobseeker-profile-completion-percentage">{calculateProfileCompletion()}%</span>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        handleSubmit(e);
                    }}
                    className="jobseeker-profile-footer-save-btn"
                    disabled={saving || Object.keys(errors).length > 0}
                >
                    {saving ? (
                        <>
                            <CircularProgress size={16} sx={{ color: "white", mr: 1 }} />
                            Saving...
                        </>
                    ) : (
                        "Save Profile"
                    )}
                </button>
            </div>

            {showJobAlertModal && (
                <>
                    <div className="jobseeker-profile-modal-overlay" onClick={() => setShowJobAlertModal(false)}></div>
                    <div className="jobseeker-profile-modal-container">
                        <div className="jobseeker-profile-modal-content jobseeker-profile-modal-instant">
                            <div className="jobseeker-profile-modal-header">
                                <h5 className="jobseeker-profile-modal-title">Resume analyzed</h5>
                                <button
                                    type="button"
                                    className="jobseeker-profile-modal-close"
                                    onClick={() => setShowJobAlertModal(false)}
                                    disabled={enablingJobAlert}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="jobseeker-profile-modal-body">
                                <p className="jobseeker-profile-modal-subtitle">
                                    Enable personalized job alerts so we email you when a job matches your analyzed resume.
                                </p>
                            </div>
                            <div className="jobseeker-profile-modal-footer">
                                <button
                                    type="button"
                                    className="jobseeker-profile-modal-btn modal-btn-cancel"
                                    onClick={() => setShowJobAlertModal(false)}
                                    disabled={enablingJobAlert}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="jobseeker-profile-modal-btn modal-btn-save"
                                    onClick={handleEnableJobAlert}
                                    disabled={enablingJobAlert}
                                >
                                    {enablingJobAlert ? "Enabling..." : "Enable alerts"}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {showInstantAlertModal && (
                <>
                    <div className="jobseeker-profile-modal-overlay" onClick={() => setShowInstantAlertModal(false)}></div>
                    <div className="jobseeker-profile-modal-container">
                        <div className="jobseeker-profile-modal-content jobseeker-profile-modal-instant">
                            <button
                                type="button"
                                className="jobseeker-profile-instant-close"
                                onClick={() => setShowInstantAlertModal(false)}
                                disabled={instantCheckoutLoading}
                                aria-label="Close"
                            >
                                <FaTimes />
                            </button>
                            <div className="jobseeker-profile-modal-body jobseeker-profile-modal-body-highlight">
                                <div className="jobseeker-profile-instant-hero">
                                    <div className="jobseeker-profile-price-icon">
                                        <FaBolt />
                                    </div>
                                    <div>
                                        <div className="jobseeker-profile-instant-eyebrow">Instant Alerts</div>
                                        <div className="jobseeker-profile-price-title">Jump the queue. Apply first.</div>
                                        <div className="jobseeker-profile-instant-sub">
                                            Matching jobs drop, alerts fire—near real-time. Stay ahead every time.
                                        </div>
                                    </div>
                                </div>

                                <div className="jobseeker-profile-price-row">
                                    <div>
                                        <div className="jobseeker-profile-price-eyebrow">Just</div>
                                        <div className="jobseeker-profile-price-amount">
                                            ₹200<span className="jobseeker-profile-price-period">/mo</span>
                                        </div>
                                        <div className="jobseeker-profile-price-tagline">One tap to the front of the line.</div>
                                    </div>
                                    <div className="jobseeker-profile-price-badge">Hot deal</div>
                                </div>

                                {error && <div className="jobseeker-profile-inline-error">{error}</div>}

                                <ul className="jobseeker-profile-modal-list">
                                    <li>AI-matched alerts tuned to your resume</li>
                                    <li>Priority pings so you apply before others</li>
                                    <li>Monthly plan — cancel anytime</li>
                                </ul>

                                <div className="jobseeker-profile-instant-cta-row">
                                    <button
                                        type="button"
                                        className="jobseeker-profile-modal-btn modal-btn-cancel"
                                        onClick={() => setShowInstantAlertModal(false)}
                                        disabled={instantCheckoutLoading}
                                    >
                                        Maybe later
                                    </button>
                                    <button
                                        type="button"
                                        className="jobseeker-profile-modal-btn modal-btn-save jobseeker-profile-instant-cta"
                                        onClick={handleInstantAlertCheckout}
                                        disabled={instantCheckoutLoading}
                                    >
                                        {instantCheckoutLoading ? "Redirecting..." : "Proceed to pay"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Language Modal */}
            {showLanguageModal && (
                <>
                    <div className="jobseeker-profile-modal-overlay" onClick={closeLanguageModal}></div>
                    <div className="jobseeker-profile-modal-container">
                        <div className="jobseeker-profile-modal-content jobseeker-profile-language-modal-content">
                            <div className="jobseeker-profile-modal-header">
                                <h5 className="jobseeker-profile-modal-title">
                                    {editingLanguageIndex !== null ? "Edit Language" : "Add Language"}
                                </h5>
                                <button type="button" className="jobseeker-profile-modal-close" onClick={closeLanguageModal}>
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="jobseeker-profile-modal-body jobseeker-profile-language-modal-body">
                                {/* Language Dropdown */}
                                <div className={`jobseeker-profile-form-group ${showLanguageDropdown ? 'jobseeker-profile-dropdown-open' : ''}`}>
                                    <label>Language <span className="jobseeker-profile-required">*</span></label>
                                    <div className={`jobseeker-profile-custom-dropdown ${showLanguageDropdown ? 'jobseeker-profile-dropdown-open' : ''}`}>
                                        <div
                                            ref={languageSelectRef}
                                            className={`jobseeker-profile-custom-dropdown-select ${showLanguageDropdown ? 'jobseeker-profile-open' : ''}`}
                                            onClick={() => {
                                                if (!showLanguageDropdown && isMobile && languageSelectRef.current) {
                                                    // Calculate position before opening on mobile
                                                    updateDropdownPosition(languageSelectRef, setLanguageDropdownPosition);
                                                }
                                                setShowLanguageDropdown(!showLanguageDropdown);
                                                setShowProficiencyDropdown(false);
                                            }}
                                        >
                                            <span className={languageForm.language ? "jobseeker-profile-dropdown-selected" : "jobseeker-profile-dropdown-placeholder"}>
                                                {languageForm.language || "Select Language"}
                                            </span>
                                            <HiChevronDown className={`jobseeker-profile-dropdown-arrow ${showLanguageDropdown ? 'jobseeker-profile-open' : ''}`} />
                                        </div>
                                        {showLanguageDropdown && (
                                            <div 
                                                ref={languageDropdownRef}
                                                className="jobseeker-profile-custom-dropdown-menu"
                                                style={isMobile ? {
                                                    position: 'fixed',
                                                    top: `${languageDropdownPosition.top || 0}px`,
                                                    left: `${languageDropdownPosition.left || 0}px`,
                                                    width: `${languageDropdownPosition.width || '100%'}px`
                                                } : {}}
                                            >
                                                <div className="jobseeker-profile-dropdown-search">
                                                    <input
                                                        type="text"
                                                        placeholder="Search languages..."
                                                        value={languageSearchQuery}
                                                        onChange={(e) => setLanguageSearchQuery(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="jobseeker-profile-dropdown-search-input"
                                                    />
                                                </div>
                                                <div className="jobseeker-profile-dropdown-options">
                                                    {filteredLanguages.length > 0 ? (
                                                        filteredLanguages.map((lang) => (
                                                            <div
                                                                key={lang}
                                                                className={`jobseeker-profile-dropdown-option ${languageForm.language === lang ? 'jobseeker-profile-selected' : ''}`}
                                                                onClick={() => {
                                                                    setLanguageForm({ ...languageForm, language: lang });
                                                                    setShowLanguageDropdown(false);
                                                                    setLanguageSearchQuery("");
                                                                }}
                                                            >
                                                                {lang}
                                                                {languageForm.language === lang && <HiCheck className="jobseeker-profile-check-icon" />}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="jobseeker-profile-dropdown-option disabled">No languages found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Proficiency Dropdown */}
                                <div className={`jobseeker-profile-form-group ${showProficiencyDropdown ? 'jobseeker-profile-dropdown-open' : ''}`}>
                                    <label>Proficiency <span className="jobseeker-profile-required">*</span></label>
                                    <div className={`jobseeker-profile-custom-dropdown ${showProficiencyDropdown ? 'jobseeker-profile-dropdown-open' : ''}`}>
                                        <div
                                            ref={proficiencySelectRef}
                                            className={`jobseeker-profile-custom-dropdown-select ${showProficiencyDropdown ? 'jobseeker-profile-open' : ''}`}
                                            onClick={() => {
                                                if (!showProficiencyDropdown && isMobile && proficiencySelectRef.current) {
                                                    // Calculate position before opening on mobile
                                                    updateDropdownPosition(proficiencySelectRef, setProficiencyDropdownPosition);
                                                }
                                                setShowProficiencyDropdown(!showProficiencyDropdown);
                                                setShowLanguageDropdown(false);
                                            }}
                                        >
                                            <span className={languageForm.proficiency ? "jobseeker-profile-dropdown-selected" : "jobseeker-profile-dropdown-placeholder"}>
                                                {languageForm.proficiency || "Select Proficiency"}
                                            </span>
                                            <HiChevronDown className={`jobseeker-profile-dropdown-arrow ${showProficiencyDropdown ? 'jobseeker-profile-open' : ''}`} />
                                        </div>
                                        {showProficiencyDropdown && (
                                            <div 
                                                ref={proficiencyDropdownRef}
                                                className="jobseeker-profile-custom-dropdown-menu"
                                                style={isMobile ? {
                                                    position: 'fixed',
                                                    top: `${proficiencyDropdownPosition.top || 0}px`,
                                                    left: `${proficiencyDropdownPosition.left || 0}px`,
                                                    width: `${proficiencyDropdownPosition.width || '100%'}px`
                                                } : {}}
                                            >
                                                <div className="jobseeker-profile-dropdown-options">
                                                    {proficiencyLevels.map((level) => (
                                                        <div
                                                            key={level}
                                                            className={`jobseeker-profile-dropdown-option ${languageForm.proficiency === level ? 'jobseeker-profile-selected' : ''}`}
                                                            onClick={() => {
                                                                setLanguageForm({ ...languageForm, proficiency: level });
                                                                setShowProficiencyDropdown(false);
                                                            }}
                                                        >
                                                            {level}
                                                            {languageForm.proficiency === level && <HiCheck className="jobseeker-profile-check-icon" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Capabilities Checkboxes */}
                                <div className="jobseeker-profile-form-group">
                                    <label>Capabilities</label>
                                    <div className="jobseeker-profile-capabilities-checkboxes">
                                        <label className="jobseeker-profile-custom-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={languageForm.read}
                                                onChange={(e) => setLanguageForm({ ...languageForm, read: e.target.checked })}
                                            />
                                            <span className="jobseeker-profile-checkbox-label">Read</span>
                                        </label>
                                        <label className="jobseeker-profile-custom-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={languageForm.write}
                                                onChange={(e) => setLanguageForm({ ...languageForm, write: e.target.checked })}
                                            />
                                            <span className="jobseeker-profile-checkbox-label">Write</span>
                                        </label>
                                        <label className="jobseeker-profile-custom-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={languageForm.speak}
                                                onChange={(e) => setLanguageForm({ ...languageForm, speak: e.target.checked })}
                                            />
                                            <span className="jobseeker-profile-checkbox-label">Speak</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="jobseeker-profile-modal-footer">
                                <button
                                    type="button"
                                    className="jobseeker-profile-modal-btn modal-btn-cancel"
                                    onClick={closeLanguageModal}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="jobseeker-profile-modal-btn modal-btn-save"
                                    onClick={saveLanguage}
                                    disabled={!languageForm.language || !languageForm.proficiency}
                                >
                                    {editingLanguageIndex !== null ? "Update Language" : "Add Language"}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <>
                    <div className="jobseeker-profile-modal-overlay" onClick={closeDeleteModal}></div>
                    <div className="jobseeker-profile-modal-container">
                        <div className="jobseeker-profile-modal-content">
                            <div className="jobseeker-profile-modal-header">
                                <h5 className="jobseeker-profile-modal-title">Delete Resume</h5>
                                <button type="button" className="jobseeker-profile-modal-close" onClick={closeDeleteModal}>
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="jobseeker-profile-modal-body">
                                <p>Are you sure you want to delete your resume? This action cannot be undone.</p>
                            </div>
                            <div className="jobseeker-profile-modal-footer">
                                <button
                                    type="button"
                                    className="jobseeker-profile-modal-btn modal-btn-cancel"
                                    onClick={closeDeleteModal}
                                    disabled={deletingResume}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="jobseeker-profile-modal-btn modal-btn-delete"
                                    onClick={handleDeleteResume}
                                    disabled={deletingResume}
                                >
                                    {deletingResume ? (
                                        <>
                                            <CircularProgress size={14} sx={{ color: "white", mr: 1 }} />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Delete Resume"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Delete Profile Picture Modal */}
            {showDeletePictureModal && (
                <>
                    <div
                        className="jobseeker-profile-modal-overlay"
                        onClick={() => {
                            if (!deletingProfilePicture) closeDeletePictureModal();
                        }}
                    ></div>
                    <div className="jobseeker-profile-modal-container">
                        <div className="jobseeker-profile-modal-content">
                            <div className="jobseeker-profile-modal-header">
                                <h5 className="jobseeker-profile-modal-title">Delete Profile Picture</h5>
                                <button type="button" className="jobseeker-profile-modal-close" onClick={closeDeletePictureModal} disabled={deletingProfilePicture}>
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="jobseeker-profile-modal-body">
                                <p>Are you sure you want to remove your profile picture?</p>
                            </div>
                            <div className="jobseeker-profile-modal-footer">
                                <button
                                    type="button"
                                    className="jobseeker-profile-modal-btn modal-btn-cancel"
                                    onClick={closeDeletePictureModal}
                                    disabled={deletingProfilePicture}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="jobseeker-profile-modal-btn modal-btn-delete"
                                    onClick={handleDeleteProfilePicture}
                                    disabled={deletingProfilePicture}
                                >
                                    {deletingProfilePicture ? (
                                        <>
                                            <CircularProgress size={14} sx={{ color: "white", mr: 1 }} />
                                            Deleting...
                                        </>
                                    ) : (
                                        "Delete Photo"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProfileScreen;
