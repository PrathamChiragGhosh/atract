"use client";

import { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { FaCamera, FaBuilding, FaGlobe, FaIndustry, FaUsers, FaCalendarAlt, FaMapMarkerAlt, FaPhone, FaEnvelope, FaIdCard, FaTrash } from "react-icons/fa";
import { HiChevronDown, HiCheck } from "react-icons/hi2";
import { useEmployerProfile, useUpdateEmployerProfile } from "@/hooks/useEmployerProfile";
import "./page.css";

const EmployerProfileScreen = () => {
    const router = useRouter();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [mounted, setMounted] = useState(false);

    // Personal Information
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [gender, setGender] = useState("");
    const [address, setAddress] = useState("");
    const [profilePicture, setProfilePicture] = useState(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState(null);
    const [removeProfilePicture, setRemoveProfilePicture] = useState(false);

    // Company Information
    const [companyName, setCompanyName] = useState("");
    const [gstNumber, setGstNumber] = useState("");
    const [companyAddress, setCompanyAddress] = useState("");
    const [companyWebsite, setCompanyWebsite] = useState("");
    const [companyDescription, setCompanyDescription] = useState("");
    const [industryType, setIndustryType] = useState("");
    const [companySize, setCompanySize] = useState("");
    const [yearEstablished, setYearEstablished] = useState("");
    const [companyLogo, setCompanyLogo] = useState(null);
    const [companyLogoPreview, setCompanyLogoPreview] = useState(null);
    const [removeCompanyLogo, setRemoveCompanyLogo] = useState(false);

    const [lastUpdated, setLastUpdated] = useState(null);
    const [errors, setErrors] = useState({});

    // Dropdown states
    const [showGenderDropdown, setShowGenderDropdown] = useState(false);
    const [showCompanySizeDropdown, setShowCompanySizeDropdown] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Dropdown refs
    const genderRef = useRef(null);
    const companySizeRef = useRef(null);

    // Dropdown position states for mobile
    const [genderDropdownPosition, setGenderDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [companySizeDropdownPosition, setCompanySizeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    // Dropdown options
    const genderOptions = ["Male", "Female", "Other"];
    const companySizeOptions = [
        { value: "1-10", label: "1-10 employees" },
        { value: "11-50", label: "11-50 employees" },
        { value: "51-200", label: "51-200 employees" },
        { value: "201-500", label: "201-500 employees" },
        { value: "501-1000", label: "501-1000 employees" },
        { value: "1000+", label: "1000+ employees" }
    ];

    // GST validation regex
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    // React Query hooks
    const { data: profileData, isLoading: loading, error: profileError } = useEmployerProfile();
    const updateProfileMutation = useUpdateEmployerProfile();

    // Client-side only mount check to prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

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
            const rect = selectRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
            });
        }
    };

    // Position is now calculated synchronously in onClick handlers for mobile
    // Keep useEffect only for desktop/fallback
    useEffect(() => {
        if (showGenderDropdown && genderRef.current && !isMobile) {
            updateDropdownPosition(genderRef, setGenderDropdownPosition);
        }
    }, [showGenderDropdown, isMobile]);

    useEffect(() => {
        if (showCompanySizeDropdown && companySizeRef.current && !isMobile) {
            updateDropdownPosition(companySizeRef, setCompanySizeDropdownPosition);
        }
    }, [showCompanySizeDropdown, isMobile]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.page-emp-custom-dropdown')) {
                setShowGenderDropdown(false);
                setShowCompanySizeDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close dropdowns on scroll (mobile only) - better performance than updating positions
    useEffect(() => {
        if (!isMobile) return;

        const handleScroll = () => {
            setShowGenderDropdown(false);
            setShowCompanySizeDropdown(false);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isMobile]);

    // Update form state when profile data is fetched/updated
    useEffect(() => {
        if (profileData) {
            setFullName(profileData.fullName || "");
            setEmail(profileData.email || "");
            setMobileNumber(profileData.mobileNumber || "");
            setGender(profileData.gender || "");
            setAddress(profileData.address || "");
            setCompanyName(profileData.companyName || "");
            setGstNumber(profileData.gstNumber || "");
            setCompanyAddress(profileData.companyAddress || "");
            setCompanyWebsite(profileData.companyWebsite || "");
            setCompanyDescription(profileData.companyDescription || "");
            setIndustryType(profileData.industryType || "");
            setCompanySize(profileData.companySize || "");
            setYearEstablished(profileData.yearEstablished || "");
            setProfilePicturePreview(profileData.profilePicture || null);
            setCompanyLogoPreview(profileData.companyLogo || null);
            setLastUpdated(profileData.updatedAt || profileData.createdAt || null);
            setRemoveProfilePicture(false);
            setRemoveCompanyLogo(false);
        }
    }, [profileData]);

    // Handle profile error
    useEffect(() => {
        if (profileError) {
            if (profileError?.response?.status === 401) {
                Cookies.remove("emp_token");
                router.push("/signin/employer");
            } else {
                setError(profileError?.message || "Failed to load profile. Please try again.");
            }
        }
    }, [profileError, router]);

    // Handle profile picture upload
    const handleProfilePictureChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError("Profile picture must be less than 2MB");
                return;
            }
            if (!file.type.startsWith("image/")) {
                setError("Please select an image file");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(file);
                setProfilePicturePreview(reader.result);
            };
            reader.readAsDataURL(file);
            setError("");
        }
    };

    // Handle company logo upload
    const handleCompanyLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError("Company logo must be less than 2MB");
                return;
            }
            if (!file.type.startsWith("image/")) {
                setError("Please select an image file");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyLogo(file);
                setCompanyLogoPreview(reader.result);
                setRemoveCompanyLogo(false); // Reset remove flag when uploading new image
            };
            reader.readAsDataURL(file);
            setError("");
        }
    };

    // Handle remove profile picture
    const handleRemoveProfilePicture = () => {
        setProfilePicture(null);
        setProfilePicturePreview(null);
        setRemoveProfilePicture(true);
        setError("");
    };

    // Handle remove company logo
    const handleRemoveCompanyLogo = () => {
        setCompanyLogo(null);
        setCompanyLogoPreview(null);
        setRemoveCompanyLogo(true);
        setError("");
    };

    // Validate GST number
    const validateGST = (gst) => {
        if (!gst || gst.trim() === "") return true; // Optional field
        const cleanGst = gst.trim().toUpperCase().replace(/\s/g, '');
        return gstRegex.test(cleanGst);
    };

    // Validate mobile number
    const validateMobile = (mobile) => {
        if (!mobile || mobile.trim() === "") return true; // Optional field
        const cleanMobile = mobile.replace(/\D/g, '');
        return cleanMobile.length === 10;
    };

    // Validate website URL
    const validateWebsite = (website) => {
        if (!website || website.trim() === "") return true; // Optional field
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        return urlRegex.test(website);
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Validate fields
        const newErrors = {};
        if (fullName && (fullName.length < 3 || fullName.length > 40)) {
            newErrors.fullName = "Full name must be between 3 and 40 characters";
        }
        if (mobileNumber && !validateMobile(mobileNumber)) {
            newErrors.mobileNumber = "Mobile number must be 10 digits";
        }
        if (gstNumber && !validateGST(gstNumber)) {
            newErrors.gstNumber = "Invalid GST number format. Format: 22AAAAA0000A1Z5";
        }
        if (companyWebsite && !validateWebsite(companyWebsite)) {
            newErrors.companyWebsite = "Invalid website URL format";
        }
        if (companyName && (companyName.length < 2 || companyName.length > 100)) {
            newErrors.companyName = "Company name must be between 2 and 100 characters";
        }
        if (companyDescription && companyDescription.length > 2000) {
            newErrors.companyDescription = "Company description must be less than 2000 characters";
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            setError("Please fix all validation errors before submitting");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("fullName", fullName);
            formData.append("mobileNumber", mobileNumber);
            formData.append("gender", gender || "");
            formData.append("address", address);
            formData.append("gstNumber", gstNumber);
            formData.append("companyName", companyName);
            formData.append("companyAddress", companyAddress);
            formData.append("companyWebsite", companyWebsite);
            formData.append("companyDescription", companyDescription);
            formData.append("industryType", industryType);
            formData.append("companySize", companySize || "");
            formData.append("yearEstablished", yearEstablished || "");
            
            // Handle profile picture: upload new, keep existing, or remove
            if (removeProfilePicture) {
                // Send empty string to remove the image
                formData.append("profilePicture", "");
            } else if (profilePicture) {
                // Upload new image
                formData.append("profilePicture", profilePicture);
            }
            // If neither removeProfilePicture nor profilePicture, keep existing (don't send)
            
            // Handle company logo: upload new, keep existing, or remove
            if (removeCompanyLogo) {
                // Send empty string to remove the image
                formData.append("companyLogo", "");
            } else if (companyLogo) {
                // Upload new image
                formData.append("companyLogo", companyLogo);
            }
            // If neither removeCompanyLogo nor companyLogo, keep existing (don't send)

            const updatedData = await updateProfileMutation.mutateAsync(formData);

            if (updatedData) {
                setSuccess("Profile updated successfully!");
                setProfilePicture(null);
                setCompanyLogo(null);
                setRemoveProfilePicture(false);
                setRemoveCompanyLogo(false);
                if (updatedData?.updatedAt) {
                    setLastUpdated(updatedData.updatedAt);
                }
                setTimeout(() => setSuccess(""), 3000);
                // Cache is automatically updated by React Query mutation onSuccess
            }
        } catch (err) {
            if (err?.response?.status === 401) {
                Cookies.remove("emp_token");
                router.push("/signin/employer");
            } else {
                setError(err?.response?.data?.message || err?.message || "Failed to update profile. Please try again.");
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    };

    // Get initials from name
    const getInitials = (name) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Calculate profile completion percentage
    const calculateProfileCompletion = () => {
        const fields = [
            { value: fullName, weight: 10 },
            { value: mobileNumber, weight: 8 },
            { value: gender, weight: 5 },
            { value: address, weight: 8 },
            { value: companyName, weight: 12 },
            { value: gstNumber, weight: 10 },
            { value: companyAddress, weight: 10 },
            { value: companyWebsite, weight: 8 },
            { value: industryType, weight: 8 },
            { value: companySize, weight: 8 },
            { value: yearEstablished, weight: 8 },
            { value: companyDescription, weight: 5 },
            { value: profilePicturePreview || profilePicture, weight: 8 },
            { value: companyLogoPreview || companyLogo, weight: 8 }
        ];

        let completed = 0;
        let total = 0;

        fields.forEach(field => {
            total += field.weight;
            if (field.value && field.value !== "" && field.value !== null) {
                completed += field.weight;
            }
        });

        return Math.round((completed / total) * 100);
    };

    // Prevent hydration mismatch by ensuring consistent initial render
    // Show loading state only after component is mounted on client
    if (!mounted) {
        // Return same structure during SSR to prevent hydration mismatch
        return (
            <div className="page-emp-profile-container">
                <div className="page-emp-profile-wrapper">
                    <div className="page-emp-profile-loading" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress />
                        <p>Loading profile...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page-emp-profile-loading">
                <CircularProgress />
                <p>Loading profile...</p>
            </div>
        );
    }

    return (
        <div className="page-emp-profile-container">
            <div className="page-emp-profile-wrapper">
                {/* Header */}
                <div className="page-emp-profile-header">
                    <h1 className="page-emp-profile-title">Company Profile</h1>
                    {lastUpdated && (
                        <p className="page-emp-profile-last-updated">
                            Last updated: {formatDate(lastUpdated)}
                        </p>
                    )}
                </div>

                {error && <div className="page-emp-profile-error">{error}</div>}
                {success && <div className="page-emp-profile-success">{success}</div>}

                <form onSubmit={handleSubmit} className="page-emp-profile-form">
                    {/* Personal Information Section */}
                    <div className="page-emp-profile-section">
                        <div className="page-emp-section-header">
                            <h2 className="page-emp-section-title">
                                <FaIdCard className="page-emp-section-icon" />
                                Personal Information
                            </h2>
                        </div>

                        <div className="page-emp-profile-picture-section">
                            <div className="page-emp-profile-picture-wrapper">
                                {profilePicturePreview ? (
                                    <img src={profilePicturePreview} alt="Profile" className="page-emp-profile-picture" />
                                ) : (
                                    <div className="page-emp-profile-picture-placeholder">
                                        <span className="page-emp-profile-initials">{getInitials(fullName)}</span>
                                    </div>
                                )}
                                <label className="page-emp-profile-picture-upload">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProfilePictureChange}
                                        style={{ display: "none" }}
                                    />
                                    <FaCamera className="page-emp-upload-icon" />
                                </label>
                                {profilePicturePreview && (
                                    <button
                                        type="button"
                                        className="page-emp-profile-picture-remove"
                                        onClick={handleRemoveProfilePicture}
                                        title="Remove profile picture"
                                    >
                                        <FaTrash className="page-emp-remove-icon" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="page-emp-form-grid">
                            <div className="page-emp-form-group">
                                <label className="page-emp-form-label">Full Name <span className="page-required">*</span></label>
                                <input
                                    type="text"
                                    className="page-emp-form-input"
                                    value={fullName}
                                    onChange={(e) => {
                                        setFullName(e.target.value);
                                        if (errors.fullName) setErrors({ ...errors, fullName: "" });
                                    }}
                                    placeholder="Enter your full name"
                                />
                                {errors.fullName && <p className="page-emp-form-error">{errors.fullName}</p>}
                            </div>

                            <div className="page-emp-form-group">
                                <label className="page-emp-form-label">Email</label>
                                <input
                                    type="email"
                                    className="page-emp-form-input"
                                    value={email}
                                    disabled
                                    style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                                />
                            </div>

                            <div className="page-emp-form-group">
                                <label className="page-emp-form-label">Mobile Number</label>
                                <input
                                    type="tel"
                                    className="page-emp-form-input"
                                    value={mobileNumber}
                                    onChange={(e) => {
                                        setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                                        if (errors.mobileNumber) setErrors({ ...errors, mobileNumber: "" });
                                    }}
                                    placeholder="10-digit mobile number"
                                    maxLength={10}
                                />
                                {errors.mobileNumber && <p className="page-emp-form-error">{errors.mobileNumber}</p>}
                            </div>

                            <div className={`page-emp-form-group page-emp-custom-dropdown-wrapper ${showGenderDropdown ? 'page-dropdown-open' : ''}`}>
                                <label className="page-emp-form-label">Gender</label>
                                <div className={`page-emp-custom-dropdown ${showGenderDropdown ? 'page-dropdown-open' : ''}`} ref={genderRef}>
                                    <div
                                        className={`page-emp-custom-dropdown-select ${showGenderDropdown ? 'page-open' : ''}`}
                                        onClick={() => {
                                            if (!showGenderDropdown && isMobile && genderRef.current) {
                                                // Calculate position before opening on mobile
                                                updateDropdownPosition(genderRef, setGenderDropdownPosition);
                                            }
                                            setShowGenderDropdown(!showGenderDropdown);
                                            setShowCompanySizeDropdown(false);
                                        }}
                                    >
                                        <span>{gender || "Select Gender"}</span>
                                        <HiChevronDown className={`page-emp-dropdown-icon ${showGenderDropdown ? 'page-open' : ''}`} />
                                    </div>
                                    {showGenderDropdown && (
                                        <div
                                            className="page-emp-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${genderDropdownPosition.top || 0}px`,
                                                left: `${genderDropdownPosition.left || 0}px`,
                                                width: `${genderDropdownPosition.width || '100%'}px`
                                            } : {}}
                                        >
                                            <div
                                                className="page-emp-custom-dropdown-item"
                                                onClick={() => {
                                                    setGender('');
                                                    setShowGenderDropdown(false);
                                                }}
                                            >
                                                {!gender && <HiCheck className="page-emp-check-icon" />}
                                                <span>Select Gender</span>
                                            </div>
                                            {genderOptions.map((option) => {
                                                const value = option.toLowerCase();
                                                return (
                                                    <div
                                                        key={value}
                                                        className="page-emp-custom-dropdown-item"
                                                        onClick={() => {
                                                            setGender(value);
                                                            setShowGenderDropdown(false);
                                                        }}
                                                    >
                                                        {gender === value && <HiCheck className="page-emp-check-icon" />}
                                                        <span>{option}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="page-emp-form-group page-emp-form-group-full">
                                <label className="page-emp-form-label">Address</label>
                                <textarea
                                    className="page-emp-form-textarea"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Enter your full address"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Company Information Section */}
                    <div className="page-emp-profile-section">
                        <div className="page-emp-section-header">
                            <h2 className="page-emp-section-title">
                                <FaBuilding className="page-emp-section-icon" />
                                Company Information
                            </h2>
                        </div>

                        <div className="page-emp-company-logo-section">
                            <div className="page-emp-company-logo-wrapper">
                                {companyLogoPreview ? (
                                    <img src={companyLogoPreview} alt="Company Logo" className="page-emp-company-logo" />
                                ) : (
                                    <div className="page-emp-company-logo-placeholder">
                                        <FaBuilding />
                                    </div>
                                )}
                                <label className="page-emp-company-logo-upload">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCompanyLogoChange}
                                        style={{ display: "none" }}
                                    />
                                    <FaCamera className="page-emp-upload-icon" />
                                </label>
                                {companyLogoPreview && (
                                    <button
                                        type="button"
                                        className="page-emp-company-logo-remove"
                                        onClick={handleRemoveCompanyLogo}
                                        title="Remove company logo"
                                    >
                                        <FaTrash className="page-emp-remove-icon" />
                                    </button>
                                )}
                            </div>
                            <p className="page-emp-logo-hint">Upload Company Logo</p>
                        </div>

                        <div className="page-emp-form-grid">
                            <div className="page-emp-form-group page-emp-form-group-full">
                                <label className="page-emp-form-label">Company Name <span className="page-required">*</span></label>
                                <input
                                    type="text"
                                    className="page-emp-form-input"
                                    value={companyName}
                                    onChange={(e) => {
                                        setCompanyName(e.target.value);
                                        if (errors.companyName) setErrors({ ...errors, companyName: "" });
                                    }}
                                    placeholder="Enter company name"
                                />
                                {errors.companyName && <p className="page-emp-form-error">{errors.companyName}</p>}
                            </div>

                            <div className="page-emp-form-group">
                                <label className="page-emp-form-label">GST Number</label>
                                <input
                                    type="text"
                                    className="page-emp-form-input"
                                    value={gstNumber}
                                    onChange={(e) => {
                                        const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
                                        setGstNumber(value);
                                        if (errors.gstNumber) setErrors({ ...errors, gstNumber: "" });
                                    }}
                                    placeholder="22AAAAA0000A1Z5"
                                    maxLength={15}
                                />
                                {errors.gstNumber && <p className="page-emp-form-error">{errors.gstNumber}</p>}
                                <p className="page-emp-form-hint">Format: 2 digits + 10 alphanumeric + 1 digit + Z + 1 alphanumeric</p>
                            </div>

                            <div className="page-emp-form-group">
                                <label className="page-emp-form-label">Industry Type</label>
                                <input
                                    type="text"
                                    className="page-emp-form-input"
                                    value={industryType}
                                    onChange={(e) => setIndustryType(e.target.value)}
                                    placeholder="e.g., IT, Manufacturing, Healthcare"
                                />
                            </div>

                            <div className={`page-emp-form-group page-emp-custom-dropdown-wrapper ${showCompanySizeDropdown ? 'page-dropdown-open' : ''}`}>
                                <label className="page-emp-form-label">Company Size</label>
                                <div className={`page-emp-custom-dropdown ${showCompanySizeDropdown ? 'page-dropdown-open' : ''}`} ref={companySizeRef}>
                                    <div
                                        className={`page-emp-custom-dropdown-select ${showCompanySizeDropdown ? 'page-open' : ''}`}
                                        onClick={() => {
                                            if (!showCompanySizeDropdown && isMobile && companySizeRef.current) {
                                                // Calculate position before opening on mobile
                                                updateDropdownPosition(companySizeRef, setCompanySizeDropdownPosition);
                                            }
                                            setShowCompanySizeDropdown(!showCompanySizeDropdown);
                                            setShowGenderDropdown(false);
                                        }}
                                    >
                                        <span>
                                            {companySizeOptions.find(opt => opt.value === companySize)?.label || "Select Size"}
                                        </span>
                                        <HiChevronDown className={`page-emp-dropdown-icon ${showCompanySizeDropdown ? 'page-open' : ''}`} />
                                    </div>
                                    {showCompanySizeDropdown && (
                                        <div
                                            className="page-emp-custom-dropdown-menu"
                                            style={isMobile ? {
                                                position: 'fixed',
                                                top: `${companySizeDropdownPosition.top || 0}px`,
                                                left: `${companySizeDropdownPosition.left || 0}px`,
                                                width: `${companySizeDropdownPosition.width || '100%'}px`
                                            } : {}}
                                        >
                                            <div
                                                className="page-emp-custom-dropdown-item"
                                                onClick={() => {
                                                    setCompanySize('');
                                                    setShowCompanySizeDropdown(false);
                                                }}
                                            >
                                                {!companySize && <HiCheck className="page-emp-check-icon" />}
                                                <span>Select Size</span>
                                            </div>
                                            {companySizeOptions.map((option) => (
                                                <div
                                                    key={option.value}
                                                    className="page-emp-custom-dropdown-item"
                                                    onClick={() => {
                                                        setCompanySize(option.value);
                                                        setShowCompanySizeDropdown(false);
                                                    }}
                                                >
                                                    {companySize === option.value && <HiCheck className="page-emp-check-icon" />}
                                                    <span>{option.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="page-emp-form-group">
                                <label className="page-emp-form-label">Year Established</label>
                                <input
                                    type="number"
                                    className="page-emp-form-input"
                                    value={yearEstablished}
                                    onChange={(e) => {
                                        const year = e.target.value;
                                        if (year === "" || (parseInt(year) >= 1800 && parseInt(year) <= new Date().getFullYear())) {
                                            setYearEstablished(year);
                                        }
                                    }}
                                    placeholder="e.g., 2020"
                                    min="1800"
                                    max={new Date().getFullYear()}
                                />
                            </div>

                            <div className="page-emp-form-group">
                                <label className="page-emp-form-label">Company Website</label>
                                <input
                                    type="text"
                                    className="page-emp-form-input"
                                    value={companyWebsite}
                                    onChange={(e) => {
                                        setCompanyWebsite(e.target.value);
                                        if (errors.companyWebsite) setErrors({ ...errors, companyWebsite: "" });
                                    }}
                                    placeholder="https://www.example.com"
                                />
                                {errors.companyWebsite && <p className="page-emp-form-error">{errors.companyWebsite}</p>}
                            </div>

                            <div className="page-emp-form-group page-emp-form-group-full">
                                <label className="page-emp-form-label">Company Address</label>
                                <textarea
                                    className="page-emp-form-textarea"
                                    value={companyAddress}
                                    onChange={(e) => setCompanyAddress(e.target.value)}
                                    placeholder="Enter company address"
                                    rows={3}
                                />
                            </div>

                            <div className="page-emp-form-group page-emp-form-group-full">
                                <label className="page-emp-form-label">Company Description</label>
                                <textarea
                                    className="page-emp-form-textarea"
                                    value={companyDescription}
                                    onChange={(e) => {
                                        setCompanyDescription(e.target.value);
                                        if (errors.companyDescription) setErrors({ ...errors, companyDescription: "" });
                                    }}
                                    placeholder="Describe your company, its mission, and values..."
                                    rows={5}
                                    maxLength={2000}
                                />
                                {errors.companyDescription && <p className="page-emp-form-error">{errors.companyDescription}</p>}
                                <p className="page-emp-form-hint">{companyDescription.length}/2000 characters</p>
                            </div>
                        </div>
                    </div>

                </form>

                {/* Fixed Footer with Save Button and Profile Completion */}
                <div className="page-emp-profile-footer">
                    <div className="page-emp-profile-completion">
                        <span className="page-emp-completion-label">Profile Completion</span>
                        <span className="page-emp-completion-percentage">{calculateProfileCompletion()}%</span>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            handleSubmit(e);
                        }}
                        className="page-emp-footer-save-btn"
                        disabled={updateProfileMutation.isPending || Object.keys(errors).length > 0}
                    >
                        {updateProfileMutation.isPending ? (
                            <>
                                <CircularProgress size={16} sx={{ color: "white", mr: 1 }} />
                                Saving...
                            </>
                        ) : (
                            "Save Profile"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployerProfileScreen;

