"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { FaCheckCircle, FaSpinner, FaArrowRight, FaPlus, FaTimes, FaEdit, FaRocket, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import { useResumeBuilderCreations, useGenerateResume, useResumeBuilderPlanConfig } from '@/hooks/useResumeBuilder';
import { sectionsAndFields } from '@/components/sectionsAndFields';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import '../page.css';

const STEPS = [
    { label: 'Gathering Information' },
    { label: 'Drafting Content' },
    { label: 'Formatting Sections' },
    { label: 'Review & Edit' },
    { label: 'Finalizing & Generating' },
];

const CreateResumeFormPageClient = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: creationsRemaining = 0, isLoading: checkingCreations } = useResumeBuilderCreations();
    const { data: planConfigData } = useResumeBuilderPlanConfig();
    const generateResumeMutation = useGenerateResume();
    
    // Get active plan name
    const userPlan = planConfigData?.userPlan;
    const allPlans = planConfigData?.plans || {};
    const activePlanType = userPlan?.activePlanType || userPlan?.planType || 'basic';
    const activePlanName = allPlans[activePlanType]?.name || activePlanType;
    
    // Get role from query params
    const mainRoleFromQuery = searchParams?.get('mainRole');
    const subRoleFromQuery = searchParams?.get('subRole');
    const selectedMainRole = mainRoleFromQuery ? decodeURIComponent(mainRoleFromQuery) : null;
    const selectedSubRole = subRoleFromQuery ? decodeURIComponent(subRoleFromQuery) : null;
    
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [finished, setFinished] = useState(false);
    const [selectedSection, setSelectedSection] = useState(null);
    const [currentSections, setCurrentSections] = useState([]);
    const [formData, setFormData] = useState({});
    
    // Get userId from token
    const [userId, setUserId] = useState(null);
    
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const token = Cookies.get('js_token');
            if (token) {
                const decoded = jwtDecode(token);
                setUserId(decoded?.userId || decoded?.id || null);
            } else {
                setUserId(null);
            }
        } catch (error) {
            console.error("Error decoding token:", error);
            setUserId(null);
        }
    }, []);

    // Redirect if no role selected
    useEffect(() => {
        if (!selectedMainRole || !selectedSubRole) {
            router.push('/jobseeker/resume-builder/create');
        }
    }, [selectedMainRole, selectedSubRole, router]);

    // Scroll to top on component mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Draft management functions
    const getRoleKey = () => {
        if (!selectedMainRole || !selectedSubRole) return null;
        return `${selectedMainRole}_${selectedSubRole}`.replace(/\s+/g, '_');
    };

    const getAllDraftsData = () => {
        try {
            const draftsStr = localStorage.getItem('resumebuilder_draft_resumes');
            if (!draftsStr) return {};
            return JSON.parse(draftsStr);
        } catch (error) {
            console.error("Error parsing draft_resumes:", error);
            return {};
        }
    };

    const saveAllDraftsData = (draftsData) => {
        try {
            localStorage.setItem('resumebuilder_draft_resumes', JSON.stringify(draftsData));
        } catch (error) {
            console.error("Error saving draft_resumes:", error);
        }
    };

    const loadDraft = useCallback(() => {
        if (!userId) return;
        const roleKey = getRoleKey();
        if (!roleKey) return;
        
        try {
            const draftsData = getAllDraftsData();
            const userDrafts = draftsData[userId] || {};
            const draft = userDrafts[roleKey];
            
            if (draft && draft.data) {
                console.log('Loading draft data:', draft.data);
                setFormData(draft.data);
            } else {
                console.log('No draft found for:', { userId, roleKey, userDrafts });
            }
        } catch (error) {
            console.error("Error loading draft:", error);
        }
    }, [userId, selectedMainRole, selectedSubRole]);

    const saveDraft = useCallback((data) => {
        if (!userId) return;
        const roleKey = getRoleKey();
        if (!roleKey) return;
        
        try {
            const draftsData = getAllDraftsData();
            if (!draftsData[userId]) {
                draftsData[userId] = {};
            }
            
            draftsData[userId][roleKey] = {
                mainRole: selectedMainRole,
                subRole: selectedSubRole,
                data: data,
                updatedAt: new Date().toISOString()
            };
            
            saveAllDraftsData(draftsData);
        } catch (error) {
            console.error("Error saving draft:", error);
        }
    }, [userId, selectedMainRole, selectedSubRole]);

    const clearDraft = useCallback(() => {
        if (!userId) return;
        const roleKey = getRoleKey();
        if (!roleKey) return;
        
        try {
            const draftsData = getAllDraftsData();
            if (draftsData[userId] && draftsData[userId][roleKey]) {
                delete draftsData[userId][roleKey];
                
                // Clean up empty user object
                if (Object.keys(draftsData[userId]).length === 0) {
                    delete draftsData[userId];
                }
                
                saveAllDraftsData(draftsData);
            }
        } catch (error) {
            console.error("Error clearing draft:", error);
        }
    }, [userId, selectedMainRole, selectedSubRole]);

    useEffect(() => {
        if (selectedMainRole && selectedSubRole) {
            const matched = sectionsAndFields.find(
                (item) => item.category === selectedMainRole
            );
            const sections = matched ? matched.sections : [];
            setCurrentSections(sections);
            setSelectedSection(null);
            
            // Scroll to top when navigating to form
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Auto-select first section
            setTimeout(() => {
                if (sections.length > 0) {
                    setSelectedSection(sections[0].name);
                }
            }, 100);
        }
    }, [selectedMainRole, selectedSubRole]);

    // Load draft when userId and roles are available
    useEffect(() => {
        if (userId && selectedMainRole && selectedSubRole) {
            const timeoutId = setTimeout(() => {
                loadDraft();
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [userId, selectedMainRole, selectedSubRole, loadDraft]);

    useEffect(() => {
        if (selectedMainRole && selectedSubRole && Object.keys(formData).length > 0) {
            const timeoutId = setTimeout(() => {
                saveDraft(formData);
            }, 500);
            
            return () => clearTimeout(timeoutId);
        }
    }, [formData, selectedMainRole, selectedSubRole, saveDraft]);

    const handleSubmit = async () => {
        if (creationsRemaining <= 0) {
            toast.error("No resume creations remaining. Please purchase a plan.");
            return;
        }

        try {
            setLoading(true);
            setCompleted(false);
            setCurrentStep(0);
            setFinished(false);

            // Step animation
            const stepInterval = 3000;
            let stepTimer = setInterval(() => {
                setCurrentStep((prev) => {
                    if (prev < 2) return prev + 1;
                    return prev;
                });
            }, stepInterval);

            // Call API to generate resume
            const result = await generateResumeMutation.mutateAsync({
                mainRole: selectedMainRole,
                subRole: selectedSubRole,
                formData
            });

            clearInterval(stepTimer);

            if (!result.success) {
                throw new Error("Failed to generate resume");
            }

            // Clear draft after successful generation
            clearDraft();

            // Complete remaining steps
            setTimeout(() => {
                let idx = 2;
                const fastTimer = setInterval(() => {
                    idx++;
                    setCurrentStep(idx);
                    if (idx >= STEPS.length - 1) {
                        clearInterval(fastTimer);
                        setFinished(true);
                        setCompleted(true);

                        setTimeout(() => {
                            router.push(`/jobseeker/resume-builder/download?resumeId=${result.data.resumeId}`);
                        }, 1000);
                    }
                }, 1000);
            }, 1000);

        } catch (err) {
            console.error("Error:", err);
            setLoading(false);
            toast.error(err?.response?.data?.message || "Failed to generate resume.");
        }
    };

    const handleRoleChangeClick = () => {
        if (selectedMainRole && selectedSubRole && Object.keys(formData).length > 0) {
            saveDraft(formData);
        }
        router.push('/jobseeker/resume-builder/create');
    };

    const handleFieldChange = (sectionName, fieldName, value, index = 0) => {
        setFormData((prev) => {
            const updated = { ...prev };
            const sectionData = updated[sectionName] || (isMultiple(sectionName) ? [] : {});
            if (isMultiple(sectionName)) {
                const copy = [...sectionData];
                copy[index] = { ...(copy[index] || {}), [fieldName]: value };
                updated[sectionName] = copy;
            } else {
                updated[sectionName] = { ...sectionData, [fieldName]: value };
            }
            return updated;
        });
    };

    const validateForm = () => {
        if (!currentSections || currentSections.length === 0) return false;

        const personalInfoSection = currentSections.find(s => s.name === "Personal Information");
        if (personalInfoSection) {
            const requiredFields = personalInfoSection.fields.filter(f => f.required);
            const personalData = formData["Personal Information"] || {};
            
            for (const field of requiredFields) {
                if (!personalData[field.name] || personalData[field.name].trim() === "") {
                    return false;
                }
            }
        }

        const educationSection = currentSections.find(s => 
            s.name === "Education" || s.name === "Education & Certifications"
        );
        if (educationSection && educationSection.multiple) {
            const educationData = formData[educationSection.name];
            if (!educationData || !Array.isArray(educationData) || educationData.length === 0) {
                return false;
            }
            const hasValidEntry = educationData.some(entry => {
                return Object.values(entry).some(val => val && val.toString().trim() !== "");
            });
            if (!hasValidEntry) return false;
        }

        const skillsSection = currentSections.find(s => 
            s.name === "Skills & Tools" || 
            s.name === "Technical Skills" || 
            s.name === "Tools & Skills"
        );
        if (skillsSection) {
            const skillsData = formData[skillsSection.name] || {};
            const skillFields = skillsSection.fields.filter(f => 
                f.name.includes("skill") || 
                f.name.includes("Skill") || 
                f.type === "multiselect"
            );
            
            const hasSkill = skillFields.some(field => {
                const value = skillsData[field.name];
                if (Array.isArray(value)) {
                    return value.length > 0 && value.some(v => v && v.toString().trim() !== "");
                }
                return value && value.toString().trim() !== "";
            });
            
            if (!hasSkill) return false;
        }

        return true;
    };

    const isFormValid = validateForm();
    const isMultiple = (sectionName) =>
        currentSections.find((s) => s.name === sectionName)?.multiple;

    const handleDeleteEntry = (sectionName, index) => {
        setFormData((prev) => {
            const updated = { ...prev };
            if (Array.isArray(updated[sectionName])) {
                updated[sectionName] = updated[sectionName].filter((_, i) => i !== index);
            }
            return updated;
        });
    };

    const allSections = [...currentSections, { name: "Total Summary", fields: [] }];

    if (loading) {
        return (
            <div className="resumebuilder-create-container">
                <div className="resumebuilder-create-loading">
                    <h2>Resume Creation in Progress</h2>
                    <p>Your resume is being created step-by-step...</p>

                    <div className="resumebuilder-create-steps">
                        {STEPS.map((step, idx) => {
                            const isComplete = idx < currentStep || (finished && idx === STEPS.length - 1);
                            const isCurrent = idx === currentStep && !finished && !isComplete;

                            return (
                                <div
                                    key={step.label}
                                    className={`resumebuilder-create-step${isComplete ? ' complete' : ''}${isCurrent ? ' current' : ''}`}
                                >
                                    <div className="resumebuilder-create-step-icon">
                                        {isComplete ? (
                                            <FaCheckCircle className="icon-check" />
                                        ) : isCurrent ? (
                                            <FaSpinner className="icon-spinner" />
                                        ) : (
                                            <span className="step-dot"></span>
                                        )}
                                    </div>
                                    <div className="resumebuilder-create-step-label">{step.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (!selectedMainRole || !selectedSubRole) {
        return null; // Will redirect
    }

    return (
        <div className="resumebuilder-create-container">
            <div className="resumebuilder-create-form">
                {/* LEFT SIDEBAR */}
                <div className={`resumebuilder-create-sidebar ${selectedSection ? 'mobile-hidden' : ''}`}>
                    <div className="resumebuilder-create-sidebar-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <FaArrowLeft 
                                onClick={() => router.push('/jobseeker/resume-builder')} 
                                style={{ cursor: 'pointer', fontSize: '18px', color: '#2563eb', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                                title="Back to Resume Builder"
                            />
                            <div className="resumebuilder-create-sidebar-title" style={{ display: 'flex', alignItems: 'center', margin: 0 }}>Create Your Resume</div>
                        </div>
                        <div className="resumebuilder-create-sidebar-subtitle">
                            Fill in your details below - AI will craft a professional, ATS-friendly resume.
                        </div>
                    </div>

                    <div className="resumebuilder-create-credits">
                        {creationsRemaining} Creations Left ({activePlanName})
                    </div>

                    <div className="resumebuilder-create-divider"></div>

                    <div className="resumebuilder-create-role-info">
                        <div className="resumebuilder-create-role-sub">{selectedSubRole}</div>
                        <div className="resumebuilder-create-role-main">{selectedMainRole}</div>
                        <div className="resumebuilder-create-role-change" onClick={handleRoleChangeClick}>
                            Change
                        </div>
                    </div>

                    <div className="resumebuilder-create-divider"></div>

                    {/* SECTION LIST */}
                    <div className="resumebuilder-create-sections">
                        {allSections?.map((section, index) => (
                            <div
                                key={index}
                                className={`resumebuilder-create-section-item ${selectedSection === section.name ? "active" : ""}`}
                                onClick={() => setSelectedSection(section.name)}
                            >
                                {section.name}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT CONTENT */}
                <div className="resumebuilder-create-content">
                    {selectedSection !== "Total Summary" && (
                        selectedSection ? (
                            <div className="resumebuilder-create-section-fields">
                                <div className="resumebuilder-create-section-header">
                                    <div className="resumebuilder-create-section-header-mobile">
                                        <button 
                                            className="resumebuilder-create-back-btn"
                                            onClick={() => setSelectedSection(null)}
                                        >
                                            <FaArrowLeft />
                                        </button>
                                        <h2>{selectedSection}</h2>
                                    </div>
                                    {isMultiple(selectedSection) && (
                                        <button
                                            className="resumebuilder-create-add-btn"
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    [selectedSection]: [
                                                        ...(prev[selectedSection] || []),
                                                        {},
                                                    ],
                                                }))
                                            }
                                        >
                                            <FaPlus />
                                            <span>Add Another</span>
                                        </button>
                                    )}
                                </div>
                                <div className="resumebuilder-create-fields-grid">
                                    {(() => {
                                        const section = currentSections.find((sec) => sec.name === selectedSection);
                                        const entries = isMultiple(selectedSection)
                                            ? formData[selectedSection] || [{}]
                                            : [formData[selectedSection] || {}];

                                        return entries.map((entry, entryIndex) => (
                                            <div key={entryIndex} className="resumebuilder-create-entry">
                                                {isMultiple(selectedSection) && (
                                                    <div className="resumebuilder-create-entry-header">
                                                        <div className="resumebuilder-create-entry-title">
                                                            {selectedSection} #{entryIndex + 1}
                                                        </div>
                                                        {entries.length > 1 && (
                                                            <button
                                                                className="resumebuilder-create-delete-btn"
                                                                onClick={() => handleDeleteEntry(selectedSection, entryIndex)}
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {section?.fields?.map((field, i) => {
                                                    const isEndDateField = field.name === "endDate" || field.name === "eduEnd";
                                                    const isPresent = entry[`${field.name}_isPresent`] === true || entry[field.name] === "Present";
                                                    
                                                    return (
                                                        <div key={i} className="resumebuilder-create-field">
                                                            <label>
                                                                {field.label}
                                                                {field.required && <span className="required-asterisk">*</span>}
                                                            </label>
                                                            {field.type === "textarea" ? (
                                                                <textarea
                                                                    name={field.name}
                                                                    value={entry[field.name] || ""}
                                                                    onChange={(e) =>
                                                                        handleFieldChange(
                                                                            selectedSection,
                                                                            field.name,
                                                                            e.target.value,
                                                                            entryIndex
                                                                        )
                                                                    }
                                                                    placeholder={field.placeholder || field.label}
                                                                />
                                                            ) : field.type === "select" ? (
                                                                <select
                                                                    name={field.name}
                                                                    value={entry[field.name] || ""}
                                                                    onChange={(e) =>
                                                                        handleFieldChange(
                                                                            selectedSection,
                                                                            field.name,
                                                                            e.target.value,
                                                                            entryIndex
                                                                        )
                                                                    }
                                                                >
                                                                    <option value="">Select {field.label}</option>
                                                                    {field.options?.map((opt, optIdx) => (
                                                                        <option key={optIdx} value={opt}>
                                                                            {opt}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            ) : isEndDateField ? (
                                                                <div className="resumebuilder-create-date-field">
                                                                    <input
                                                                        type={field.type || "month"}
                                                                        name={field.name}
                                                                        value={isPresent ? "" : (entry[field.name] || "")}
                                                                        onChange={(e) =>
                                                                            handleFieldChange(
                                                                                selectedSection,
                                                                                field.name,
                                                                                e.target.value,
                                                                                entryIndex
                                                                            )
                                                                        }
                                                                        placeholder={field.placeholder || field.label}
                                                                        disabled={isPresent}
                                                                        className={isPresent ? "disabled" : ""}
                                                                    />
                                                                    <label className="resumebuilder-create-present-checkbox">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isPresent}
                                                                            onChange={(e) => {
                                                                                handleFieldChange(
                                                                                    selectedSection,
                                                                                    field.name,
                                                                                    e.target.checked ? "Present" : "",
                                                                                    entryIndex
                                                                                );
                                                                                handleFieldChange(
                                                                                    selectedSection,
                                                                                    `${field.name}_isPresent`,
                                                                                    e.target.checked,
                                                                                    entryIndex
                                                                                );
                                                                            }}
                                                                        />
                                                                        <span>Present</span>
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <input
                                                                    type={field.type || "text"}
                                                                    name={field.name}
                                                                    value={entry[field.name] || ""}
                                                                    onChange={(e) =>
                                                                        handleFieldChange(
                                                                            selectedSection,
                                                                            field.name,
                                                                            e.target.value,
                                                                            entryIndex
                                                                        )
                                                                    }
                                                                    placeholder={field.placeholder || field.label}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ));
                                    })()}
                                </div>

                                <button
                                    className="resumebuilder-create-next-btn"
                                    onClick={() => {
                                        const currentIndex = allSections.findIndex(
                                            (s) => s.name === selectedSection
                                        );
                                        if (currentIndex < allSections.length - 1) {
                                            setSelectedSection(allSections[currentIndex + 1].name);
                                        }
                                    }}
                                >
                                    <span>Next</span>
                                    <FaArrowRight />
                                </button>
                            </div>
                        ) : (
                            <div className="resumebuilder-create-placeholder">Select a section to start filling details.</div>
                        )
                    )}
                    {selectedSection === "Total Summary" && (
                        <div className="resumebuilder-create-summary">
                            <h2>Review Your Details</h2>

                            {Object.keys(formData).length === 0 ||
                                Object.values(formData).every(
                                    (section) =>
                                        (Array.isArray(section)
                                            ? section.every((entry) => Object.values(entry).every((v) => !v))
                                            : Object.values(section || {}).every((v) => !v))
                                ) ? (
                                <div className="resumebuilder-create-empty-summary">
                                    <FaExclamationTriangle />
                                    <p>No data entered yet. Please fill in some details to review.</p>
                                </div>
                            ) : (
                                <div className="resumebuilder-create-summary-content">
                                    {Object.entries(formData).map(([sectionName, sectionValue]) => {
                                        if (Array.isArray(sectionValue)) {
                                            const filledEntries = sectionValue
                                                .map((entry) =>
                                                    Object.fromEntries(
                                                        Object.entries(entry).filter(([_, val]) => {
                                                            if (val === null || val === undefined) return false;
                                                            const strVal = typeof val === 'string' ? val : String(val);
                                                            return strVal.trim() !== '';
                                                        })
                                                    )
                                                )
                                                .filter((entry) => Object.keys(entry).length > 0);

                                            if (filledEntries.length === 0) return null;

                                            return (
                                                <div key={sectionName} className="resumebuilder-create-summary-section">
                                                    <div className="resumebuilder-create-summary-header">
                                                        <h3>{sectionName}</h3>
                                                        <button
                                                            className="resumebuilder-create-edit-btn"
                                                            onClick={() => setSelectedSection(sectionName)}
                                                        >
                                                            <FaEdit />
                                                            <span>Edit</span>
                                                        </button>
                                                    </div>
                                                    {filledEntries.map((entry, idx) => (
                                                        <div key={idx} className="resumebuilder-create-summary-entry">
                                                            {Object.entries(entry).map(([key, val]) => (
                                                                <div key={key} className="resumebuilder-create-summary-field">
                                                                    <strong>{key.replace(/([A-Z])/g, " $1")}:</strong> {val}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        } else {
                                            const filteredFields = Object.fromEntries(
                                                Object.entries(sectionValue || {}).filter(([_, val]) => {
                                                    if (val === null || val === undefined) return false;
                                                    const strVal = typeof val === 'string' ? val : String(val);
                                                    return strVal.trim() !== '';
                                                })
                                            );
                                            if (Object.keys(filteredFields).length === 0) return null;

                                            return (
                                                <div key={sectionName} className="resumebuilder-create-summary-section">
                                                    <div className="resumebuilder-create-summary-header">
                                                        <h3>{sectionName}</h3>
                                                        <button
                                                            className="resumebuilder-create-edit-btn"
                                                            onClick={() => setSelectedSection(sectionName)}
                                                        >
                                                            <FaEdit />
                                                            <span>Edit</span>
                                                        </button>
                                                    </div>
                                                    <div className="resumebuilder-create-summary-entry">
                                                        {Object.entries(filteredFields).map(([key, val]) => (
                                                            <div key={key} className="resumebuilder-create-summary-field">
                                                                <strong>{key.replace(/([A-Z])/g, " $1")}:</strong> {val}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            )}

                            <button
                                className="resumebuilder-create-generate-btn"
                                onClick={handleSubmit}
                                disabled={checkingCreations || !isFormValid || generateResumeMutation.isPending}
                                title={!isFormValid ? "Please fill required fields: Personal Information, at least one Education, and at least one Skill" : ""}
                            >
                                <FaRocket />
                                <span>{generateResumeMutation.isPending ? 'Generating...' : 'Start Generating Resume'}</span>
                            </button>
                            {!isFormValid && (
                                <div className="resumebuilder-create-validation-message">
                                    <FaExclamationTriangle />
                                    <span>Please complete: Required Personal Information, at least one Education entry, and at least one Skill</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateResumeFormPageClient;
