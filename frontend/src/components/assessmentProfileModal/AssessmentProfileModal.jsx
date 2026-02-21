"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { CircularProgress } from "@mui/material";
import { toast } from "react-hot-toast";
import { FaCheckCircle, FaTimes, FaUpload } from "react-icons/fa";
import { HiChevronDown, HiCheck } from "react-icons/hi2";
import { useQueryClient } from "@tanstack/react-query";
import "./AssessmentProfileModal.css";
import { jobSeekerProfileKeys } from "@/hooks/useJobSeekerProfile";

const AssessmentProfileModal = ({
    isOpen,
    onClose,
    requirementsData,
    requirementsError,
    isLoading,
    token,
    onSaveSuccess,
    onRetry,
    isDirectApply = false
}) => {
    const queryClient = useQueryClient();
    const [formValues, setFormValues] = useState({});
    const [fileValues, setFileValues] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const [showQualificationDropdown, setShowQualificationDropdown] = useState(false);
    const yearDropdownRef = useRef(null);
    const qualificationDropdownRef = useRef(null);

    const qualificationOptions = useMemo(() => [
        "10th Pass",
        "12th Pass",
        "Diploma",
        "Bachelor's Degree",
        "Master's Degree",
        "MBA",
        "Ph.D.",
        "Professional Degree",
        "Technical Certification",
        "Other"
    ], []);

    const passoutYearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear() + 10;
        const years = [];
        for (let year = currentYear; year >= 1950; year -= 1) {
            years.push(year);
        }
        return years;
    }, []);

    useEffect(() => {
        if (!requirementsData?.requirements) {
            setFormValues({});
            setFileValues({});
            setFieldErrors({});
            setShowYearDropdown(false);
            setShowQualificationDropdown(false);
            return;
        }

        const nextValues = {};
        requirementsData.requirements.forEach((requirement) => {
            if (requirement.type === "file") {
                nextValues[requirement.key] = "";
            } else {
                nextValues[requirement.key] = requirement.value ?? "";
            }
        });
        setFormValues(nextValues);
        setFileValues({});
        setFieldErrors({});
        setShowYearDropdown(false);
        setShowQualificationDropdown(false);
    }, [requirementsData]);

    useEffect(() => {
        if (!isOpen) {
            document.body.style.overflow = "";
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose?.();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow || "";
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!showYearDropdown && !showQualificationDropdown) {
            return undefined;
        }
        const handleClickOutside = (event) => {
            if (showYearDropdown && yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
                setShowYearDropdown(false);
            }
            if (showQualificationDropdown && qualificationDropdownRef.current && !qualificationDropdownRef.current.contains(event.target)) {
                setShowQualificationDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showYearDropdown, showQualificationDropdown]);

    if (!isOpen) {
        return null;
    }

    const updateFieldError = (key, message) => {
        setFieldErrors((prev) => {
            if (message) {
                return { ...prev, [key]: message };
            }
            if (!prev[key]) {
                return prev;
            }
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const validateRequirementValue = (requirement, rawValue) => {
        if (!requirement || requirement.editable === false) {
            return true;
        }

        let error = "";
        const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
        const label = requirement.label || "This field";

        switch (requirement.key) {
            case "fullName":
                if (!value || value.length < 3 || value.length > 40) {
                    error = "Full name must be between 3 and 40 characters";
                }
                break;
            case "mobileNumber":
                if (!value || !/^[6-9]\d{9}$/.test(value)) {
                    error = "Enter a valid 10-digit mobile number";
                }
                break;
            case "passoutYear":
                if (!value) {
                    error = "Select your graduation year";
                } else {
                    const year = Number(value);
                    const minYear = 1950;
                    const maxYear = new Date().getFullYear() + 10;
                    if (Number.isNaN(year) || year < minYear || year > maxYear) {
                        error = `Year must be between ${minYear} and ${maxYear}`;
                    }
                }
                break;
            case "highestQualification":
                if (!value) {
                    error = "Select your highest qualification";
                }
                break;
            case "experienceInYears":
            case "noticePeriod":
            case "currentCTC":
                if (value === "" || value === null || value === undefined) {
                    error = `Enter ${label.toLowerCase()}`;
                } else {
                    const numeric = Number(value);
                    if (Number.isNaN(numeric)) {
                        error = `${label} must be a number`;
                    } else {
                        if (typeof requirement.min === "number" && numeric < requirement.min) {
                            error = `${label} must be at least ${requirement.min}`;
                        }
                        if (!error && typeof requirement.max === "number" && numeric > requirement.max) {
                            error = `${label} cannot exceed ${requirement.max}`;
                        }
                    }
                }
                break;
            default:
                if (requirement.requiredForAssessment !== false && (value === undefined || value === null || value === "")) {
                    error = `Enter ${label.toLowerCase()}`;
                }
                break;
        }

        updateFieldError(requirement.key, error);
        return !error;
    };

    const validateFileRequirement = (requirement, file, hasExistingValue = false) => {
        let error = "";
        if (!file) {
            if (!requirement.isSatisfied && !requirement.hasFileValue && !hasExistingValue) {
                error = "Upload your latest resume";
            }
        } else {
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                error = "File size must be under 10MB";
            } else if (!/(\.pdf|\.doc|\.docx)$/i.test(file.name)) {
                error = "Upload PDF or Word document";
            }
        }
        updateFieldError(requirement.key, error);
        return !error;
    };

    const requirements = requirementsData?.requirements || [];
    const missing = requirements.filter(item => item.requiredForAssessment && !item.isSatisfied);

    const handleInputChange = (requirement, value) => {
        let nextValue = value;

        if (requirement.key === "mobileNumber") {
            nextValue = (value || "").replace(/\D/g, "").slice(0, 10);
        }

        setFormValues(prev => ({
            ...prev,
            [requirement.key]: nextValue
        }));

        if (requirement.editable !== false) {
            validateRequirementValue(requirement, nextValue);
        }
    };

    const handleFileChange = (requirement, fileList) => {
        const file = fileList?.[0];
        if (!file) {
            setFileValues((prev) => {
                const next = { ...prev };
                delete next[requirement.key];
                return next;
            });
            validateFileRequirement(requirement, null, requirement.hasFileValue);
            return;
        }

        setFileValues(prev => ({
            ...prev,
            [requirement.key]: file
        }));
        validateFileRequirement(requirement, file);
    };

    const renderRequirementInput = (requirement) => {
        const currentValue = formValues[requirement.key] ?? "";
        const commonProps = {
            id: `assessmentProfileModal-input-${requirement.key}`,
            name: requirement.key,
            value: currentValue,
            disabled: submitting || requirement.editable === false,
            onChange: (event) => handleInputChange(requirement, event.target.value)
        };

        if (requirement.key === "highestQualification") {
            return (
                <div className="assessmentProfileModal-dropdown" ref={qualificationDropdownRef}>
                    <button
                        type="button"
                        className={`assessmentProfileModal-dropdown-toggle ${showQualificationDropdown ? "is-open" : ""}`}
                        onClick={() => {
                            if (submitting) return;
                            setShowQualificationDropdown((prev) => !prev);
                            setShowYearDropdown(false);
                        }}
                        disabled={submitting}
                    >
                        <span className={currentValue ? "" : "assessmentProfileModal-dropdown-placeholder"}>
                            {currentValue || "Select qualification"}
                        </span>
                        <HiChevronDown />
                    </button>
                    {showQualificationDropdown && (
                        <div className="assessmentProfileModal-dropdown-menu">
                            <div
                                className={`assessmentProfileModal-dropdown-item ${!currentValue ? "selected" : ""}`}
                                onClick={() => {
                                    handleInputChange(requirement, "");
                                    setShowQualificationDropdown(false);
                                }}
                            >
                                <span>Select qualification</span>
                                {!currentValue && <HiCheck className="assessmentProfileModal-checkIcon" />}
                            </div>
                            {qualificationOptions.map((option) => (
                                <div
                                    key={option}
                                    className={`assessmentProfileModal-dropdown-item ${currentValue === option ? "selected" : ""}`}
                                    onClick={() => {
                                        handleInputChange(requirement, option);
                                        setShowQualificationDropdown(false);
                                    }}
                                >
                                    <span>{option}</span>
                                    {currentValue === option && <HiCheck className="assessmentProfileModal-checkIcon" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (requirement.key === "passoutYear") {
            return (
                <div className="assessmentProfileModal-dropdown" ref={yearDropdownRef}>
                    <button
                        type="button"
                        className={`assessmentProfileModal-dropdown-toggle ${showYearDropdown ? "is-open" : ""}`}
                        onClick={() => {
                            if (submitting) return;
                            setShowYearDropdown((prev) => !prev);
                            setShowQualificationDropdown(false);
                        }}
                        disabled={submitting}
                    >
                        <span className={currentValue ? "" : "assessmentProfileModal-dropdown-placeholder"}>
                            {currentValue || "Select year"}
                        </span>
                        <HiChevronDown />
                    </button>
                    {showYearDropdown && (
                        <div className="assessmentProfileModal-dropdown-menu">
                            <div
                                className={`assessmentProfileModal-dropdown-item ${!currentValue ? "selected" : ""}`}
                                onClick={() => {
                                    handleInputChange(requirement, "");
                                    setShowYearDropdown(false);
                                }}
                            >
                                <span>Select year</span>
                                {!currentValue && <HiCheck className="assessmentProfileModal-checkIcon" />}
                            </div>
                            {passoutYearOptions.map((year) => (
                                <div
                                    key={year}
                                    className={`assessmentProfileModal-dropdown-item ${currentValue === String(year) ? "selected" : ""}`}
                                    onClick={() => {
                                        handleInputChange(requirement, String(year));
                                        setShowYearDropdown(false);
                                    }}
                                >
                                    <span>{year}</span>
                                    {currentValue === String(year) && <HiCheck className="assessmentProfileModal-checkIcon" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (requirement.type === "number") {
            return (
                <input
                    type="number"
                    min={requirement.min ?? undefined}
                    max={requirement.max ?? undefined}
                    step={requirement.step ?? "any"}
                    inputMode={requirement.step ? "decimal" : "numeric"}
                    {...commonProps}
                />
            );
        }

        if (requirement.type === "tel") {
            return (
                <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    {...commonProps}
                />
            );
        }

        if (requirement.type === "email") {
            return (
                <input
                    type="email"
                    {...commonProps}
                    readOnly
                />
            );
        }

        if (requirement.type === "file") {
            return (
                <div className="assessmentProfileModal-fileInput">
                    <label className="assessmentProfileModal-uploadBtn">
                        <FaUpload />
                        <span>{fileValues[requirement.key]?.name || "Upload file"}</span>
                        <input
                            type="file"
                            accept={requirement.accept || ".pdf,.doc,.docx"}
                            onChange={(event) => handleFileChange(requirement, event.target.files)}
                            disabled={submitting}
                        />
                    </label>
                    {requirement.hasFileValue && !fileValues[requirement.key] && (
                        <span className="assessmentProfileModal-fileStatus">
                            Existing resume on file
                        </span>
                    )}
                </div>
            );
        }

        return (
            <input
                type="text"
                {...commonProps}
            />
        );
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!token) {
            toast.error("Login required.");
            return;
        }

        let allValid = true;

        requirements.forEach((requirement) => {
            if (requirement.type === "file") {
                const isValidFile = validateFileRequirement(
                    requirement,
                    fileValues[requirement.key],
                    requirement.hasFileValue
                );
                if (!isValidFile) {
                    allValid = false;
                }
            } else if (requirement.requiredForAssessment !== false && requirement.editable !== false) {
                const isValidField = validateRequirementValue(requirement, formValues[requirement.key]);
                if (!isValidField) {
                    allValid = false;
                }
            }
        });

        if (!allValid) {
            toast.error("Please fix the highlighted fields.");
            return;
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            requirements.forEach((requirement) => {
                if (requirement.type === "file") {
                    if (fileValues[requirement.key]) {
                        formData.append(requirement.key, fileValues[requirement.key]);
                    }
                } else if (requirement.editable !== false) {
                    const draftValue = formValues[requirement.key];
                    if (draftValue !== undefined && draftValue !== null && draftValue !== "") {
                        // Convert number fields to proper numeric values
                        if (requirement.type === "number") {
                            const numericValue = parseFloat(draftValue);
                            if (!isNaN(numericValue)) {
                                formData.append(requirement.key, numericValue);
                            }
                        } else {
                            formData.append(requirement.key, draftValue);
                        }
                    }
                }
            });

            if (!Array.from(formData.keys()).length) {
                toast.error("Update at least one field.");
                return;
            }

            const response = await axios.put(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/profile`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response?.data?.data) {
                queryClient.setQueryData(jobSeekerProfileKeys.profile(), response.data.data);
            }

            toast.success("Profile updated");
            onSaveSuccess?.();
        } catch (error) {
            console.error("Profile update error:", error);
            toast.error(error.response?.data?.message || "Unable to update profile right now.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="assessmentProfileModal-overlay">
            <div className="assessmentProfileModal-panel">
                <div className="assessmentProfileModal-header">
                    <div>
                        <p>{isDirectApply ? "Complete profile to apply" : "Complete profile to start assessment"}</p>
                        <small>{missing.length} field{missing.length === 1 ? "" : "s"} required</small>
                    </div>
                    <button
                        type="button"
                        className="assessmentProfileModal-closeBtn"
                        onClick={onClose}
                        aria-label="Close profile modal"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="assessmentProfileModal-body">
                    {isLoading ? (
                        <div className="assessmentProfileModal-loader">
                            <CircularProgress size={28} sx={{ color: "#2563eb" }} />
                            <p>Fetching required fields...</p>
                        </div>
                    ) : requirementsError ? (
                        <div className="assessmentProfileModal-error">
                            <p>{requirementsError}</p>
                            <button
                                type="button"
                                onClick={onRetry}
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <form className="assessmentProfileModal-form" onSubmit={handleSubmit}>
                            {requirements.map((requirement) => (
                                <div
                                    key={requirement.key}
                                    className={`assessmentProfileModal-field ${requirement.isSatisfied ? "is-complete" : "is-missing"}`}
                                >
                                    <div className="assessmentProfileModal-fieldLabel">
                                        <label htmlFor={`assessmentProfileModal-input-${requirement.key}`}>
                                            {requirement.label}
                                        </label>
                                        {requirement.isSatisfied ? (
                                            <span className="assessmentProfileModal-chip success">
                                                <FaCheckCircle /> Updated
                                            </span>
                                        ) : (
                                            <span className="assessmentProfileModal-chip warning">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                    {renderRequirementInput(requirement)}
                                    {requirement.helperText && (
                                        <small>{requirement.helperText}</small>
                                    )}
                            {fieldErrors[requirement.key] && (
                                <span className="assessmentProfileModal-fieldError">
                                    {fieldErrors[requirement.key]}
                                </span>
                            )}
                                </div>
                            ))}

                            <button
                                type="submit"
                                className="assessmentProfileModal-submitBtn"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <CircularProgress size={18} sx={{ color: "white", mr: 1 }} />
                                        Saving...
                                    </>
                                ) : (
                                    "Save & Continue"
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssessmentProfileModal;

