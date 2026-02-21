"use client";

import { useState, useEffect, useRef } from 'react';
import { CircularProgress } from '@mui/material';
import { FaTimes, FaMagic, FaBriefcase, FaBuilding, FaMapMarkerAlt, FaDollarSign, FaCalendarAlt, FaSync } from 'react-icons/fa';
import { HiChevronDown, HiCheck } from 'react-icons/hi2';
import { useGenerateJD } from '@/hooks/useGenerateJD';
import { useBackgroundGeneration } from '@/contexts/BackgroundGenerationContext';
import SkillSelector from '@/components/skills/SkillSelector';
import './AIGenerateModal.css';

const AIGenerateModal = ({ isOpen, onClose, onGenerate, formData, employerId, onFormUpdate, currentDraftId = null, onDraftIdSet = null }) => {
    const [jobTitle, setJobTitle] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [jobType, setJobType] = useState('');
    const [showJobTypeDropdown, setShowJobTypeDropdown] = useState(false);
    const [department, setDepartment] = useState('');
    const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
    const [employmentType, setEmploymentType] = useState('');
    const [showEmploymentTypeDropdown, setShowEmploymentTypeDropdown] = useState(false);
    const [experience, setExperience] = useState('');
    const [showExperienceDropdown, setShowExperienceDropdown] = useState(false);
    const [workMode, setWorkMode] = useState('');
    const [showWorkModeDropdown, setShowWorkModeDropdown] = useState(false);
    const [location, setLocation] = useState('');
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [isCustomLocation, setIsCustomLocation] = useState(false);
    const [customLocation, setCustomLocation] = useState('');
    const [highestQualification, setHighestQualification] = useState('');
    const [showQualificationDropdown, setShowQualificationDropdown] = useState(false);
    const [isCustomQualification, setIsCustomQualification] = useState(false);
    const [customQualification, setCustomQualification] = useState('');
    const [minSalary, setMinSalary] = useState('');
    const [maxSalary, setMaxSalary] = useState('');
    const [numberOfOpenings, setNumberOfOpenings] = useState('');
    const [applicationOpeningDate, setApplicationOpeningDate] = useState('');
    const [applicationClosingDate, setApplicationClosingDate] = useState('');
    
    // Optional context fields
    const [responsibilities, setResponsibilities] = useState('');
    const [requirements, setRequirements] = useState('');
    const [perksAndBenefits, setPerksAndBenefits] = useState('');
    const [skills, setSkills] = useState([]);

    // Dropdown refs
    const jobTypeRef = useRef(null);
    const departmentRef = useRef(null);
    const employmentTypeRef = useRef(null);
    const experienceRef = useRef(null);
    const workModeRef = useRef(null);
    const locationRef = useRef(null);
    const qualificationRef = useRef(null);
    const modalBodyRef = useRef(null);

    // Dropdown position states for mobile
    const [jobTypeDropdownPosition, setJobTypeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [departmentDropdownPosition, setDepartmentDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [employmentTypeDropdownPosition, setEmploymentTypeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [experienceDropdownPosition, setExperienceDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [workModeDropdownPosition, setWorkModeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [locationDropdownPosition, setLocationDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [qualificationDropdownPosition, setQualificationDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const [isMobile, setIsMobile] = useState(false);

    // Separate mutations:
    // - generateJDMutation: used for immediate, in-modal generation
    // - backgroundGenerateJDMutation: used only for background generation
    const generateJDMutation = useGenerateJD();
    const backgroundGenerateJDMutation = useGenerateJD();
    const { startBackgroundGeneration } = useBackgroundGeneration();

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

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Calculate dropdown position for mobile
    const updateDropdownPosition = (selectRef, setPosition) => {
        if (selectRef.current) {
            // Get the actual select element (not the container)
            const selectElement = selectRef.current.querySelector('.custom-dropdown-select');
            if (selectElement) {
                const rect = selectElement.getBoundingClientRect();
                // Set CSS variables on the dropdown container for mobile positioning
                // Subtract 1px to overlap with select border for zero gap
                selectRef.current.style.setProperty('--dropdown-top', (rect.bottom - 1) + 'px');
                selectRef.current.style.setProperty('--dropdown-left', rect.left + 'px');
                selectRef.current.style.setProperty('--dropdown-width', rect.width + 'px');
                // Also update state for compatibility
                setPosition({
                    top: rect.bottom - 30,
                    left: rect.left,
                    width: rect.width
                });
            }
        }
    };

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
            if (!event.target.closest('.custom-dropdown')) {
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
    // IMPORTANT: Listen to both window scroll and modal body scroll for proper behavior
    useEffect(() => {
        if (!isMobile || !isOpen) return;

        const handleScroll = () => {
            setShowJobTypeDropdown(false);
            setShowDepartmentDropdown(false);
            setShowEmploymentTypeDropdown(false);
            setShowExperienceDropdown(false);
            setShowWorkModeDropdown(false);
            setShowLocationDropdown(false);
            setShowQualificationDropdown(false);
        };

        // Listen to window scroll
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Listen to modal body scroll if modal is open
        const modalBody = modalBodyRef.current;
        if (modalBody) {
            modalBody.addEventListener('scroll', handleScroll, { passive: true });
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (modalBody) {
                modalBody.removeEventListener('scroll', handleScroll);
            }
        };
    }, [isMobile, isOpen]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
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
    }, [isOpen]);

    // Auto-fill from form data ONLY when modal first opens (not on subsequent formData changes)
    const [hasInitialized, setHasInitialized] = useState(false);
    
    useEffect(() => {
        if (isOpen && !hasInitialized) {
            // Only auto-fill when modal first opens
            if (formData) {
                setJobTitle(formData.jobTitle || '');
                setCompanyName(formData.companyName || '');
                setJobType(formData.jobType || '');
                setDepartment(formData.department || '');
                setEmploymentType(formData.employmentType || '');
                setExperience(formData.experience || '');
                setWorkMode(formData.workMode || '');
                setLocation(formData.location || '');
                setIsCustomLocation(formData.isCustomLocation || false);
                setCustomLocation(formData.customLocation || '');
                setHighestQualification(formData.highestQualification || '');
                setIsCustomQualification(formData.isCustomQualification || false);
                setCustomQualification(formData.customQualification || '');
                setMinSalary(formData.minSalary || '');
                setMaxSalary(formData.maxSalary || '');
                setNumberOfOpenings(formData.numberOfOpenings || '');
                setApplicationOpeningDate(formData.applicationOpeningDate || '');
                setApplicationClosingDate(formData.applicationClosingDate || '');
                setResponsibilities(formData.responsibilities || '');
                setRequirements(formData.requirements || '');
                setPerksAndBenefits(formData.perksAndBenefits || '');
                setSkills(Array.isArray(formData.skills) ? formData.skills : []);
            }
            setHasInitialized(true);
        } else if (!isOpen) {
            // Reset when modal closes
            setHasInitialized(false);
        }
    }, [isOpen, hasInitialized, formData]);

    const getJobData = () => {
        const finalLocation = isCustomLocation ? customLocation : location;
        const finalQualification = isCustomQualification ? customQualification : highestQualification;

        return {
            jobTitle: jobTitle.trim(),
            companyName: companyName.trim(),
            jobType: jobType || '',
            department: department.trim() || '',
            employmentType: employmentType || '',
            experience: experience || '',
            workMode: workMode || '',
            location: finalLocation.trim() || '',
            highestQualification: finalQualification || '',
            minSalary: minSalary ? parseFloat(minSalary) : null,
            maxSalary: maxSalary ? parseFloat(maxSalary) : null,
            numberOfOpenings: numberOfOpenings ? parseInt(numberOfOpenings) : null,
            applicationOpeningDate: applicationOpeningDate || '',
            applicationClosingDate: applicationClosingDate || '',
            responsibilities: responsibilities.trim() || '',
            requirements: requirements.trim() || '',
            perksAndBenefits: perksAndBenefits.trim() || '',
            isCustomLocation,
            customLocation: customLocation.trim() || '',
            isCustomQualification,
            customQualification: customQualification.trim() || '',
            skills
        };
    };

    // Update form when modal data changes (bidirectional auto-fill)
    useEffect(() => {
        if (!onFormUpdate || !isOpen) return;

        const timeoutId = setTimeout(() => {
            const currentFormData = getJobData();
            // Only update if there are meaningful changes
            if (jobTitle || companyName || jobType || department || employmentType || experience || workMode || location || customLocation || highestQualification || customQualification) {
                onFormUpdate(currentFormData);
            }
        }, 500); // Debounce updates

        return () => clearTimeout(timeoutId);
    }, [
        jobTitle, companyName, jobType, department, employmentType, experience, workMode,
        location, customLocation, isCustomLocation, highestQualification, customQualification,
        isCustomQualification, minSalary, maxSalary, numberOfOpenings, applicationOpeningDate, applicationClosingDate,
        responsibilities, requirements, perksAndBenefits, skills, isOpen, onFormUpdate
    ]);

    const handleGenerate = async () => {
        if (!jobTitle.trim() || !companyName.trim()) {
            alert('Job title and company name are required');
            return;
        }

        const jobData = getJobData();

        try {
            const generatedContent = await generateJDMutation.mutateAsync(jobData);
            onGenerate(generatedContent);
            onClose();
        } catch (error) {
            console.error('Generation error:', error);
            alert(error.response?.data?.message || 'Failed to generate job description. Please try again.');
        }
    };

    const handleGenerateInBackground = async () => {
        if (!jobTitle.trim() || !companyName.trim()) {
            alert('Job title and company name are required');
            return;
        }

        if (!employerId) {
            alert('Employer ID is required for background generation');
            return;
        }

        const jobData = getJobData();
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Use current draft ID if available, otherwise create new one
        const draftId = currentDraftId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Notify parent about draft ID if new draft was created
        if (!currentDraftId && onDraftIdSet) {
            onDraftIdSet(draftId);
        }

        // Start background generation with draft ID
        startBackgroundGeneration(
            taskId,
            () => backgroundGenerateJDMutation.mutateAsync(jobData),
            jobData,
            employerId,
            draftId
        ).catch((error) => {
            console.error('Background generation error:', error);
        });

        // Close modal immediately
        onClose();
    };

    const handleClose = () => {
        if (!generateJDMutation.isPending) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="ai-modal-overlay" onClick={handleClose}></div>
            <div className="ai-modal-container">
                <div className="ai-modal-content">
                    <div className="ai-modal-header">
                        <div className="ai-modal-title-section">
                            <FaMagic className="ai-icon" />
                            <h2>Generate with AI</h2>
                        </div>
                        <button className="ai-modal-close" onClick={handleClose} disabled={generateJDMutation.isPending}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="ai-modal-body" ref={modalBodyRef}>
                        <p className="ai-modal-subtitle">Fill in the job details below. AI will generate a comprehensive job description, responsibilities, requirements, and perks.</p>

                        <div className="ai-form-grid">
                            {/* Required Fields */}
                            <div className="ai-form-section">
                                <h3 className="ai-form-section-title">Required Information</h3>
                                
                                <div className="ai-form-group">
                                    <label>Job Title <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                        placeholder="e.g., Senior Software Engineer"
                                        disabled={generateJDMutation.isPending}
                                    />
                                </div>

                                <div className="ai-form-group">
                                    <label>Company Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Your company name"
                                        disabled={generateJDMutation.isPending}
                                    />
                                </div>

                                <div className={`ai-form-group ${showJobTypeDropdown ? 'dropdown-open' : ''}`}>
                                    <label>Job Type</label>
                                    <div className={`custom-dropdown ${showJobTypeDropdown ? 'dropdown-open' : ''}`} ref={jobTypeRef}>
                                        <div
                                            className="custom-dropdown-select"
                                            onClick={() => {
                                                if (!generateJDMutation.isPending) {
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
                                                }
                                            }}
                                        >
                                            <span>{jobType || "Select job type"}</span>
                                            <HiChevronDown className={`dropdown-icon ${showJobTypeDropdown ? 'open' : ''}`} />
                                        </div>
                                        {showJobTypeDropdown && (
                                            <div 
                                                className="custom-dropdown-menu"
                                                style={isMobile ? {
                                                    position: 'fixed',
                                                    top: `${jobTypeDropdownPosition.top}px`,
                                                    left: `${jobTypeDropdownPosition.left}px`,
                                                    width: `${jobTypeDropdownPosition.width}px`,
                                                    marginTop: 0
                                                } : {}}
                                            >
                                                {jobTypes.map((type) => (
                                                    <div
                                                        key={type}
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setJobType(type);
                                                            setShowJobTypeDropdown(false);
                                                        }}
                                                    >
                                                        {jobType === type && <HiCheck className="check-icon" />}
                                                        <span>{type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`ai-form-group ${showDepartmentDropdown ? 'dropdown-open' : ''}`}>
                                    <label>Department</label>
                                    <div className={`custom-dropdown ${showDepartmentDropdown ? 'dropdown-open' : ''}`} ref={departmentRef}>
                                        <div
                                            className="custom-dropdown-select"
                                            onClick={() => {
                                                if (!generateJDMutation.isPending) {
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
                                                }
                                            }}
                                        >
                                            <span>{department || "Select department"}</span>
                                            <HiChevronDown className={`dropdown-icon ${showDepartmentDropdown ? 'open' : ''}`} />
                                        </div>
                                        {showDepartmentDropdown && (
                                            <div 
                                                className="custom-dropdown-menu"
                                                style={isMobile ? {
                                                    position: 'fixed',
                                                    top: `${departmentDropdownPosition.top}px`,
                                                    left: `${departmentDropdownPosition.left}px`,
                                                    width: `${departmentDropdownPosition.width}px`,
                                                    marginTop: 0
                                                } : {}}
                                            >
                                                {departments.map((dept) => (
                                                    <div
                                                        key={dept}
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setDepartment(dept);
                                                            setShowDepartmentDropdown(false);
                                                        }}
                                                    >
                                                        {department === dept && <HiCheck className="check-icon" />}
                                                        <span>{dept}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`ai-form-group ${showEmploymentTypeDropdown ? 'dropdown-open' : ''}`}>
                                    <label>Employment Type</label>
                                    <div className={`custom-dropdown ${showEmploymentTypeDropdown ? 'dropdown-open' : ''}`} ref={employmentTypeRef}>
                                        <div
                                            className="custom-dropdown-select"
                                            onClick={() => {
                                                if (!generateJDMutation.isPending) {
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
                                                }
                                            }}
                                        >
                                            <span>{employmentType || "Select employment type"}</span>
                                            <HiChevronDown className={`dropdown-icon ${showEmploymentTypeDropdown ? 'open' : ''}`} />
                                        </div>
                                        {showEmploymentTypeDropdown && (
                                            <div 
                                                className="custom-dropdown-menu"
                                                style={isMobile ? {
                                                    position: 'fixed',
                                                    top: `${employmentTypeDropdownPosition.top}px`,
                                                    left: `${employmentTypeDropdownPosition.left}px`,
                                                    width: `${employmentTypeDropdownPosition.width}px`,
                                                    marginTop: 0
                                                } : {}}
                                            >
                                                {employmentTypes.map((type) => (
                                                    <div
                                                        key={type}
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setEmploymentType(type);
                                                            setShowEmploymentTypeDropdown(false);
                                                        }}
                                                    >
                                                        {employmentType === type && <HiCheck className="check-icon" />}
                                                        <span>{type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`ai-form-group ${showExperienceDropdown ? 'dropdown-open' : ''}`}>
                                    <label>Experience</label>
                                    <div className={`custom-dropdown ${showExperienceDropdown ? 'dropdown-open' : ''}`} ref={experienceRef}>
                                        <div
                                            className="custom-dropdown-select"
                                            onClick={() => {
                                                if (!generateJDMutation.isPending) {
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
                                                }
                                            }}
                                        >
                                            <span>{experience || "Select experience level"}</span>
                                            <HiChevronDown className={`dropdown-icon ${showExperienceDropdown ? 'open' : ''}`} />
                                        </div>
                                        {showExperienceDropdown && (
                                            <div 
                                                className="custom-dropdown-menu"
                                                style={isMobile ? {
                                                    position: 'fixed',
                                                    top: `${experienceDropdownPosition.top}px`,
                                                    left: `${experienceDropdownPosition.left}px`,
                                                    width: `${experienceDropdownPosition.width}px`,
                                                    marginTop: 0
                                                } : {}}
                                            >
                                                {experienceLevels.map((level) => (
                                                    <div
                                                        key={level}
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setExperience(level);
                                                            setShowExperienceDropdown(false);
                                                        }}
                                                    >
                                                        {experience === level && <HiCheck className="check-icon" />}
                                                        <span>{level}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`ai-form-group ${showWorkModeDropdown ? 'dropdown-open' : ''}`}>
                                    <label>Work Mode</label>
                                    <div className={`custom-dropdown ${showWorkModeDropdown ? 'dropdown-open' : ''}`} ref={workModeRef}>
                                        <div
                                            className="custom-dropdown-select"
                                            onClick={() => {
                                                if (!generateJDMutation.isPending) {
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
                                                }
                                            }}
                                        >
                                            <span>{workMode || "Select work mode"}</span>
                                            <HiChevronDown className={`dropdown-icon ${showWorkModeDropdown ? 'open' : ''}`} />
                                        </div>
                                        {showWorkModeDropdown && (
                                            <div 
                                                className="custom-dropdown-menu"
                                                style={isMobile ? {
                                                    position: 'fixed',
                                                    top: `${workModeDropdownPosition.top}px`,
                                                    left: `${workModeDropdownPosition.left}px`,
                                                    width: `${workModeDropdownPosition.width}px`,
                                                    marginTop: 0
                                                } : {}}
                                            >
                                                {workModes.map((mode) => (
                                                    <div
                                                        key={mode}
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setWorkMode(mode);
                                                            setShowWorkModeDropdown(false);
                                                        }}
                                                    >
                                                        {workMode === mode && <HiCheck className="check-icon" />}
                                                        <span>{mode}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`ai-form-group ${showLocationDropdown ? 'dropdown-open' : ''}`}>
                                    <label>Location</label>
                                    <div className={`custom-dropdown ${showLocationDropdown ? 'dropdown-open' : ''}`} ref={locationRef}>
                                        <div
                                            className="custom-dropdown-select"
                                            onClick={() => {
                                                if (!generateJDMutation.isPending) {
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
                                                }
                                            }}
                                        >
                                            <span>{location || "Select location"}</span>
                                            <HiChevronDown className={`dropdown-icon ${showLocationDropdown ? 'open' : ''}`} />
                                        </div>
                                        {showLocationDropdown && (
                                            <div 
                                                className="custom-dropdown-menu"
                                                style={isMobile ? {
                                                    position: 'fixed',
                                                    top: `${locationDropdownPosition.top}px`,
                                                    left: `${locationDropdownPosition.left}px`,
                                                    width: `${locationDropdownPosition.width}px`,
                                                    marginTop: 0
                                                } : {}}
                                            >
                                                {popularLocations.map((loc) => (
                                                    <div
                                                        key={loc}
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setLocation(loc);
                                                            setIsCustomLocation(false);
                                                            setShowLocationDropdown(false);
                                                        }}
                                                    >
                                                        {location === loc && <HiCheck className="check-icon" />}
                                                        <span>{loc}</span>
                                                    </div>
                                                ))}
                                                <div
                                                    className="custom-dropdown-item custom-location"
                                                    onClick={() => {
                                                        setIsCustomLocation(true);
                                                        setLocation('');
                                                        setShowLocationDropdown(false);
                                                    }}
                                                >
                                                    {isCustomLocation && <HiCheck className="check-icon" />}
                                                    <span>+ Add Custom Location</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {isCustomLocation && (
                                        <input
                                            type="text"
                                            value={customLocation}
                                            onChange={(e) => setCustomLocation(e.target.value)}
                                            placeholder="Enter custom location"
                                            className="mt-2"
                                            disabled={generateJDMutation.isPending}
                                        />
                                    )}
                                </div>

                                <div className={`ai-form-group ${showQualificationDropdown ? 'dropdown-open' : ''}`}>
                                    <label>Highest Qualification</label>
                                    <div className={`custom-dropdown ${showQualificationDropdown ? 'dropdown-open' : ''}`} ref={qualificationRef}>
                                        <div
                                            className="custom-dropdown-select"
                                            onClick={() => {
                                                if (!generateJDMutation.isPending) {
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
                                                }
                                            }}
                                        >
                                            <span>{isCustomQualification ? customQualification : (highestQualification || "Select qualification")}</span>
                                            <HiChevronDown className={`dropdown-icon ${showQualificationDropdown ? 'open' : ''}`} />
                                        </div>
                                        {showQualificationDropdown && (
                                            <div 
                                                className="custom-dropdown-menu"
                                                style={isMobile ? {
                                                    position: 'fixed',
                                                    top: `${qualificationDropdownPosition.top}px`,
                                                    left: `${qualificationDropdownPosition.left}px`,
                                                    width: `${qualificationDropdownPosition.width}px`,
                                                    marginTop: 0
                                                } : {}}
                                            >
                                                {qualifications.map((qual) => (
                                                    <div
                                                        key={qual}
                                                        className="custom-dropdown-item"
                                                        onClick={() => {
                                                            setHighestQualification(qual);
                                                            setIsCustomQualification(false);
                                                            setShowQualificationDropdown(false);
                                                        }}
                                                    >
                                                        {!isCustomQualification && highestQualification === qual && <HiCheck className="check-icon" />}
                                                        <span>{qual}</span>
                                                    </div>
                                                ))}
                                                <div
                                                    className="custom-dropdown-item custom-location"
                                                    onClick={() => {
                                                        setIsCustomQualification(true);
                                                        setHighestQualification('');
                                                        setShowQualificationDropdown(false);
                                                    }}
                                                >
                                                    {isCustomQualification && <HiCheck className="check-icon" />}
                                                    <span>+ Add Custom Qualification</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {isCustomQualification && (
                                        <input
                                            type="text"
                                            value={customQualification}
                                            onChange={(e) => setCustomQualification(e.target.value)}
                                            placeholder="Enter custom qualification"
                                            className="mt-2"
                                            disabled={generateJDMutation.isPending}
                                        />
                                    )}
                                </div>

                            <div className="ai-form-group full-width">
                                <SkillSelector
                                    label="Key Skills"
                                    selectedSkills={skills}
                                    onChange={setSkills}
                                    helperText="Search and add relevant skills for this role. These skills will be shared with AI and stored with your job draft."
                                    disabled={generateJDMutation.isPending}
                                />
                            </div>

                                <div className="ai-form-group-row">
                                    <div className="ai-form-group">
                                        <label>Min Salary (₹)</label>
                                        <input
                                            type="number"
                                            value={minSalary || ''}
                                            onChange={(e) => setMinSalary(e.target.value)}
                                            placeholder="e.g., 500000"
                                            disabled={generateJDMutation.isPending}
                                        />
                                    </div>
                                    <div className="ai-form-group">
                                        <label>Max Salary (₹)</label>
                                        <input
                                            type="number"
                                            value={maxSalary || ''}
                                            onChange={(e) => setMaxSalary(e.target.value)}
                                            placeholder="e.g., 1000000"
                                            disabled={generateJDMutation.isPending}
                                        />
                                    </div>
                                </div>

                                <div className="ai-form-group-row">
                                    <div className="ai-form-group">
                                        <label>Number of Openings</label>
                                        <input
                                            type="number"
                                            value={numberOfOpenings || ''}
                                            onChange={(e) => setNumberOfOpenings(e.target.value)}
                                            placeholder="e.g., 5"
                                            min="1"
                                            step="1"
                                            disabled={generateJDMutation.isPending}
                                        />
                                    </div>
                                </div>

                                <div className="ai-form-group-row">
                                    <div className="ai-form-group">
                                        <label>Application Opening Date</label>
                                        <input
                                            type="date"
                                            value={applicationOpeningDate}
                                            onChange={(e) => setApplicationOpeningDate(e.target.value)}
                                            disabled={generateJDMutation.isPending}
                                        />
                                    </div>
                                    <div className="ai-form-group">
                                        <label>Application Closing Date</label>
                                        <input
                                            type="date"
                                            value={applicationClosingDate}
                                            onChange={(e) => setApplicationClosingDate(e.target.value)}
                                            disabled={generateJDMutation.isPending}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Optional Context Fields */}
                            <div className="ai-form-section">
                                <h3 className="ai-form-section-title">Optional Context (AI will use these to enhance generation)</h3>
                                
                                <div className="ai-form-group">
                                    <label>Key Responsibilities (Optional)</label>
                                    <textarea
                                        value={responsibilities}
                                        onChange={(e) => setResponsibilities(e.target.value)}
                                        placeholder="Enter any specific responsibilities you want to include..."
                                        rows={4}
                                        disabled={generateJDMutation.isPending}
                                    />
                                </div>

                                <div className="ai-form-group">
                                    <label>Requirements (Optional)</label>
                                    <textarea
                                        value={requirements}
                                        onChange={(e) => setRequirements(e.target.value)}
                                        placeholder="Enter any specific requirements you want to include..."
                                        rows={4}
                                        disabled={generateJDMutation.isPending}
                                    />
                                </div>

                                <div className="ai-form-group">
                                    <label>Perks & Benefits (Optional)</label>
                                    <textarea
                                        value={perksAndBenefits}
                                        onChange={(e) => setPerksAndBenefits(e.target.value)}
                                        placeholder="Enter any specific perks or benefits you want to include..."
                                        rows={4}
                                        disabled={generateJDMutation.isPending}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="ai-modal-footer">
                        <button
                            type="button"
                            className="ai-modal-cancel-btn"
                            onClick={handleClose}
                            disabled={generateJDMutation.isPending}
                        >
                            Cancel
                        </button>
                        <div className="ai-modal-footer-actions">
                            <button
                                type="button"
                                className="ai-modal-background-btn"
                                onClick={handleGenerateInBackground}
                                disabled={generateJDMutation.isPending || !jobTitle.trim() || !companyName.trim() || !employerId}
                                title="Generate in background and continue working"
                            >
                                <FaSync /> Generate in Background
                            </button>
                            <button
                                type="button"
                                className="ai-modal-generate-btn"
                                onClick={handleGenerate}
                                disabled={generateJDMutation.isPending || !jobTitle.trim() || !companyName.trim()}
                            >
                                {generateJDMutation.isPending ? (
                                    <>
                                        <CircularProgress size={16} sx={{ color: "white", mr: 1 }} />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FaMagic /> Generate with AI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AIGenerateModal;

