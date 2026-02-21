"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { useResumeBuilderPlan, useResumeBuilderPayments, useResumeBuilderPlanConfig, useUpdateActivePlan, useResumeBuilderCreations, useResumeBuilderDownloads, useResumeBuilderEnhancements, useCreateCheckoutSession, useAllResumes } from '@/hooks/useResumeBuilder';
import { FaFileAlt, FaHistory, FaArrowRight, FaCheckCircle, FaClock, FaCalendarAlt, FaMoneyBillWave, FaChevronDown, FaRocket, FaDownload, FaEdit, FaChartLine, FaEye } from 'react-icons/fa';
import { CircularProgress } from '@mui/material';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import './page.css';

const ResumeBuilderDashboard = () => {
    const router = useRouter();
    const { data: planData, isLoading: planLoading, error: planError, isError: planIsError } = useResumeBuilderPlan();
    const { data: payments = [], isLoading: paymentsLoading } = useResumeBuilderPayments();
    const { data: planConfigData } = useResumeBuilderPlanConfig();
    const { data: creationsRemaining = 0 } = useResumeBuilderCreations();
    const { data: downloadsRemaining = 0 } = useResumeBuilderDownloads();
    const { data: enhancementsRemaining = 0 } = useResumeBuilderEnhancements();
    const { data: generatedResumes = [], isLoading: resumesLoading } = useAllResumes();
    const updateActivePlanMutation = useUpdateActivePlan();
    const createCheckoutMutation = useCreateCheckoutSession();
    
    // Get plan configuration data
    const userPlan = planConfigData?.userPlan;
    const allPlans = planConfigData?.plans || {};
    const planCounts = userPlan?.planCounts || {};
    const activePlanType = userPlan?.activePlanType;
    
    // Get available plans (plans that have counts > 0)
    const availablePlans = ['basic', 'premium', 'organization'].filter(planType => {
        const counts = planCounts[planType] || {};
        const total = (counts.creations || 0) + (counts.enhancements || 0) + (counts.downloads || 0);
        return total > 0;
    });
    
    // Selected plan state - use activePlanType from backend, or default to highest available
    const [selectedPlanType, setSelectedPlanType] = useState(() => {
        if (activePlanType && availablePlans.includes(activePlanType)) {
            return activePlanType;
        }
        if (availablePlans.includes('organization')) return 'organization';
        if (availablePlans.includes('premium')) return 'premium';
        if (availablePlans.includes('basic')) return 'basic';
        return planData?.plan?.planType || 'basic';
    });
    
    // Update selected plan when plan data loads
    useEffect(() => {
        if (planConfigData && availablePlans.length > 0) {
            if (activePlanType && availablePlans.includes(activePlanType)) {
                setSelectedPlanType(activePlanType);
            } else if (availablePlans.includes('organization')) {
                setSelectedPlanType('organization');
            } else if (availablePlans.includes('premium')) {
                setSelectedPlanType('premium');
            } else if (availablePlans.includes('basic')) {
                setSelectedPlanType('basic');
            }
        }
    }, [planConfigData, availablePlans, activePlanType]);
    
    // Get selected plan counts (same logic as smart-select)
    const selectedPlanCounts = planCounts[selectedPlanType] || { creations: 0, enhancements: 0, downloads: 0 };
    const selectedCreations = availablePlans.length > 1 ? selectedPlanCounts.creations : creationsRemaining;
    const selectedEnhancements = availablePlans.length > 1 ? selectedPlanCounts.enhancements : enhancementsRemaining;
    const selectedDownloads = availablePlans.length > 1 ? selectedPlanCounts.downloads : downloadsRemaining;
    
    // Calculate total counts across all plans for top stat cards
    const totalCreations = Object.keys(planCounts).reduce((total, planType) => {
        const counts = planCounts[planType] || {};
        return total + (counts.creations || 0);
    }, 0);
    
    const totalEnhancements = Object.keys(planCounts).reduce((total, planType) => {
        const counts = planCounts[planType] || {};
        return total + (counts.enhancements || 0);
    }, 0);
    
    const totalDownloads = Object.keys(planCounts).reduce((total, planType) => {
        const counts = planCounts[planType] || {};
        return total + (counts.downloads || 0);
    }, 0);
    
    // Use total counts if planCounts exists, otherwise fallback to individual query results
    const displayCreations = Object.keys(planCounts).length > 0 ? totalCreations : creationsRemaining;
    const displayEnhancements = Object.keys(planCounts).length > 0 ? totalEnhancements : enhancementsRemaining;
    const displayDownloads = Object.keys(planCounts).length > 0 ? totalDownloads : downloadsRemaining;
    
    // Custom dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    // Drafts state
    const [drafts, setDrafts] = useState([]);
    const [userId, setUserId] = useState(null);
    
    // Combine generated resumes and drafts
    const allResumes = [
        ...generatedResumes.map(resume => ({
            id: resume.id,
            title: resume.title,
            subRole: resume.title.replace(' Resume', '').replace('Unnamed Candidate', 'Untitled'),
            mainRole: 'Generated Resume',
            fullName: resume.title.includes('Unnamed Candidate') ? 'N/A' : resume.title.replace(' Resume', ''),
            createdAt: resume.created_at,
            atsScore: resume.atsScore,
            type: resume.type || 'Create',
            isGenerated: true
        })),
        ...drafts.map(draft => ({
            ...draft,
            isGenerated: false
        }))
    ].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.lastModified || 0);
        const dateB = new Date(b.createdAt || b.lastModified || 0);
        return dateB - dateA;
    });
    
    // Get userId from token
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
    
    // Load drafts from localStorage
    useEffect(() => {
        if (!userId) return;
        
        try {
            const draftsStr = localStorage.getItem('resumebuilder_draft_resumes');
            if (!draftsStr) {
                setDrafts([]);
                return;
            }
            
            const draftsData = JSON.parse(draftsStr);
            const userDrafts = draftsData[userId] || {};
            const allDrafts = [];
            
            Object.entries(userDrafts).forEach(([roleKey, draft]) => {
                try {
                    if (!draft || !draft.data) return;
                    
                    const personalInfo = draft.data["Personal Information"] || {};
                    const preview = {
                        key: roleKey,
                        mainRole: draft.mainRole || roleKey.split('_')[0]?.replace(/_/g, ' ') || 'Unknown',
                        subRole: draft.subRole || roleKey.split('_').slice(1).join(' ').replace(/_/g, ' ') || 'Unknown',
                        fullName: personalInfo.fullName || 'N/A',
                        email: personalInfo.email || 'N/A',
                        phone: personalInfo.phone || 'N/A',
                        sectionsCount: Object.keys(draft.data).length,
                        lastModified: draft.updatedAt || draft.timestamp || 'Unknown',
                        isDraft: true
                    };
                    
                    allDrafts.push(preview);
                } catch (error) {
                    console.error(`Error parsing draft ${roleKey}:`, error);
                }
            });
            
            // Sort by last modified (most recent first)
            allDrafts.sort((a, b) => {
                const dateA = new Date(a.lastModified);
                const dateB = new Date(b.lastModified);
                return dateB - dateA;
            });
            
            setDrafts(allDrafts);
        } catch (error) {
            console.error("Error loading drafts:", error);
            setDrafts([]);
        }
    }, [userId]);
    
    // Handle draft click
    const handleDraftClick = (draft) => {
        const mainRoleEncoded = encodeURIComponent(draft.mainRole);
        const subRoleEncoded = encodeURIComponent(draft.subRole);
        router.push(`/jobseeker/resume-builder/create/form?mainRole=${mainRoleEncoded}&subRole=${subRoleEncoded}`);
    };
    
    // Handle plan switch
    const handlePlanSwitch = async (newPlanType) => {
        if (newPlanType === selectedPlanType) {
            setDropdownOpen(false);
            return;
        }
        
        try {
            await updateActivePlanMutation.mutateAsync(newPlanType);
            setSelectedPlanType(newPlanType);
            setDropdownOpen(false);
            toast.success(`Active plan switched to ${allPlans[newPlanType]?.name || newPlanType}`);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to switch plan');
            setDropdownOpen(false);
        }
    };
    
    // Handle purchase plan
    const handlePurchasePlan = async (planType) => {
        try {
            const result = await createCheckoutMutation.mutateAsync(planType);
            if (result.url) {
                window.location.href = result.url;
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to create checkout session');
        }
    };
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownOpen && !event.target.closest('.custom-plan-dropdown')) {
                setDropdownOpen(false);
            }
        };
        
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [dropdownOpen]);

    const hasPlan = planData?.hasPlan || false;
    const plan = planData?.plan || null;
    const isLoading = planLoading || paymentsLoading;

    if (isLoading) {
        return (
            <div className="resumebuilder-dashboard-container">
                <div className="resumebuilder-dashboard-loading">
                    <CircularProgress />
                    <p>Loading resume builder...</p>
                </div>
            </div>
        );
    }

    // No plan screen
    if (!hasPlan) {
        return (
            <div className="resumebuilder-dashboard-container">
                <Toaster position="top-right" />
                <div className="resumebuilder-dashboard-no-plan-screen">
                    <div className="resumebuilder-dashboard-no-plan-content">
                        <FaFileAlt className="resumebuilder-dashboard-no-plan-icon" />
                        <h2 className="resumebuilder-dashboard-no-plan-title">No Active Plan</h2>
                        <p className="resumebuilder-dashboard-no-plan-description">
                            Purchase a plan to start creating professional, ATS-optimized resumes with AI assistance.
                        </p>
                        <div className="resumebuilder-dashboard-no-plan-features">
                            <div className="resumebuilder-dashboard-feature-item">
                                <FaCheckCircle />
                                <span>AI-Powered Resume Generation</span>
                            </div>
                            <div className="resumebuilder-dashboard-feature-item">
                                <FaCheckCircle />
                                <span>ATS Score Optimization</span>
                            </div>
                            <div className="resumebuilder-dashboard-feature-item">
                                <FaCheckCircle />
                                <span>Multiple Template Options</span>
                            </div>
                            <div className="resumebuilder-dashboard-feature-item">
                                <FaCheckCircle />
                                <span>Resume Enhancement Tools</span>
                            </div>
                        </div>
                        <div className="resumebuilder-dashboard-no-plan-actions">
                            <button
                                className="resumebuilder-dashboard-upgrade-btn resumebuilder-dashboard-upgrade-primary"
                                onClick={() => handlePurchasePlan('premium')}
                                disabled={createCheckoutMutation.isPending}
                            >
                                {createCheckoutMutation.isPending ? 'Processing...' : 'Get Started'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="resumebuilder-dashboard-container">
            <Toaster position="top-right" />
            
            <div className="resumebuilder-dashboard">
                {/* HEADER */}
                <div className="resumebuilder-dashboard-header">
                    <div className="resumebuilder-dashboard-header-left">
                        <h1 className="resumebuilder-dashboard-title">Resume Builder</h1>
                        <p className="resumebuilder-dashboard-subtitle">
                            Create professional, ATS-optimized resumes with AI assistance
                        </p>
                    </div>
                    <div className="resumebuilder-dashboard-header-right">
                        <Link 
                            href="/jobseeker/resume-builder/create" 
                            className="resumebuilder-dashboard-primary-action-btn"
                        >
                            <FaRocket />
                            <span>Create Resume</span>
                        </Link>
                    </div>
                </div>

                {/* STATS GRID */}
                <div className="resumebuilder-dashboard-stats-grid">
                    <div className="resumebuilder-dashboard-stat-card resumebuilder-dashboard-stat-primary">
                        <div className="resumebuilder-dashboard-stat-card-icon">
                            <FaRocket />
                        </div>
                        <div className="resumebuilder-dashboard-stat-card-content">
                            <div className="resumebuilder-dashboard-stat-card-label">Resume Creations</div>
                            <div className="resumebuilder-dashboard-stat-card-value">{displayCreations}</div>
                        </div>
                    </div>
                    <div className="resumebuilder-dashboard-stat-card resumebuilder-dashboard-stat-secondary">
                        <div className="resumebuilder-dashboard-stat-card-icon">
                            <FaEdit />
                        </div>
                        <div className="resumebuilder-dashboard-stat-card-content">
                            <div className="resumebuilder-dashboard-stat-card-label">Enhancements</div>
                            <div className="resumebuilder-dashboard-stat-card-value">{displayEnhancements}</div>
                        </div>
                    </div>
                    <div className="resumebuilder-dashboard-stat-card resumebuilder-dashboard-stat-tertiary">
                        <div className="resumebuilder-dashboard-stat-card-icon">
                            <FaDownload />
                        </div>
                        <div className="resumebuilder-dashboard-stat-card-content">
                            <div className="resumebuilder-dashboard-stat-card-label">PDF Downloads</div>
                            <div className="resumebuilder-dashboard-stat-card-value">{displayDownloads}</div>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="resumebuilder-dashboard-content-main">
                    {/* Top Section: Recent Resumes and Plan Details */}
                    <div className="resumebuilder-dashboard-top-section">
                        {/* Recent Resumes Card - Main Content */}
                        <div className="resumebuilder-dashboard-section-card resumebuilder-dashboard-history-section resumebuilder-dashboard-history-main">
                            <div className="resumebuilder-dashboard-section-header">
                                <div className="resumebuilder-dashboard-section-header-left">
                                    <FaFileAlt className="resumebuilder-dashboard-section-icon" />
                                    <h2 className="resumebuilder-dashboard-section-title">Recent Resumes</h2>
                                </div>
                            </div>
                            <div className="resumebuilder-dashboard-section-body">
                                {resumesLoading ? (
                                    <div className="resumebuilder-dashboard-history-placeholder">
                                        <CircularProgress size={24} />
                                        <p style={{ marginTop: '12px', color: '#64748b' }}>Loading resumes...</p>
                                    </div>
                                ) : allResumes.length === 0 ? (
                                    <div className="resumebuilder-dashboard-history-placeholder">
                                        <div className="resumebuilder-dashboard-placeholder-content">
                                            <FaFileAlt className="resumebuilder-dashboard-placeholder-icon" />
                                            <h3 className="resumebuilder-dashboard-placeholder-title">No resumes yet</h3>
                                            <p className="resumebuilder-dashboard-placeholder-description">
                                                Start creating your first resume to see it here.
                                                Track your resume performance and ATS scores over time.
                                            </p>
                                            <Link
                                                href="/jobseeker/resume-builder/create"
                                                className="resumebuilder-dashboard-placeholder-btn"
                                            >
                                                Create Your First Resume
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="resumebuilder-dashboard-history-list">
                                        {allResumes.map((resume, index) => (
                                            <div 
                                                key={resume.id || resume.key || index} 
                                                className="resumebuilder-dashboard-history-item"
                                                onClick={() => {
                                                    if (resume.isGenerated) {
                                                        router.push(`/jobseeker/resume-builder/download?resumeId=${resume.id}`);
                                                    } else {
                                                        handleDraftClick(resume);
                                                    }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="resumebuilder-dashboard-history-item-left">
                                                    <FaFileAlt className="resumebuilder-dashboard-history-item-icon" />
                                                    <div className="resumebuilder-dashboard-history-item-info">
                                                        <h4 className="resumebuilder-dashboard-history-item-title">
                                                            {resume.isGenerated ? resume.title : resume.subRole} 
                                                            {!resume.isGenerated && resume.isDraft && <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal' }}> (Draft)</span>}
                                                        </h4>
                                                        <p className="resumebuilder-dashboard-history-item-subtitle">
                                                            {resume.isGenerated ? resume.mainRole : resume.mainRole}
                                                        </p>
                                                        {resume.fullName && resume.fullName !== 'N/A' && (
                                                            <p className="resumebuilder-dashboard-history-item-meta">{resume.fullName}</p>
                                                        )}
                                                        {resume.isGenerated && resume.atsScore && (
                                                            <p className="resumebuilder-dashboard-history-item-meta" style={{ color: '#10b981', fontWeight: '600' }}>
                                                                ATS Score: {resume.atsScore}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="resumebuilder-dashboard-history-item-right">
                                                    <span className="resumebuilder-dashboard-history-item-date">
                                                        {resume.createdAt || resume.lastModified 
                                                            ? new Date(resume.createdAt || resume.lastModified).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                            : 'Recently'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Plan Details Card - Top Right */}
                        <div className="resumebuilder-dashboard-section-card resumebuilder-dashboard-plan-details-card">
                            <div className="resumebuilder-dashboard-section-header">
                                <div className="resumebuilder-dashboard-section-header-left">
                                    <FaChartLine className="resumebuilder-dashboard-section-icon" />
                                    <h2 className="resumebuilder-dashboard-section-title">Plan Details</h2>
                                </div>
                                {payments.length > 0 && (
                                    <button
                                        className="resumebuilder-dashboard-view-transactions-btn"
                                        onClick={() => router.push("/jobseeker/resume-builder/transactions")}
                                        title="View All Transactions"
                                    >
                                        <FaHistory />
                                        <span>View Transactions</span>
                                    </button>
                                )}
                            </div>
                            <div className="resumebuilder-dashboard-section-body">
                                {/* Plan Switcher - Only show if user has multiple plans */}
                                {availablePlans.length > 1 && (
                                    <div className="custom-plan-dropdown-wrapper" style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                                            Select Plan to Use
                                        </label>
                                        <div className="custom-plan-dropdown" style={{ position: 'relative' }}>
                                            <button
                                                type="button"
                                                className="custom-plan-dropdown-button"
                                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                                disabled={updateActivePlanMutation.isPending}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0',
                                                    fontSize: '14px',
                                                    background: 'white',
                                                    cursor: updateActivePlanMutation.isPending ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontWeight: '500',
                                                    color: '#1e293b',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: dropdownOpen ? '0 4px 6px rgba(0, 0, 0, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!updateActivePlanMutation.isPending) {
                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!dropdownOpen) {
                                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                                    }
                                                }}
                                            >
                                                <span>
                                                    {allPlans[selectedPlanType]?.name || selectedPlanType} ({selectedCreations + selectedEnhancements + selectedDownloads} available)
                                                </span>
                                                <FaChevronDown 
                                                    style={{ 
                                                        fontSize: '12px',
                                                        color: '#64748b',
                                                        transition: 'transform 0.2s ease',
                                                        transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                                                    }} 
                                                />
                                            </button>
                                            
                                            {dropdownOpen && (
                                                <div 
                                                    className="custom-plan-dropdown-menu"
                                                    style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        marginTop: '4px',
                                                        background: 'white',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                                        zIndex: 1000,
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {availablePlans.map(planType => {
                                                        const counts = planCounts[planType] || {};
                                                        const total = (counts.creations || 0) + (counts.enhancements || 0) + (counts.downloads || 0);
                                                        return (
                                                            <button
                                                                key={planType}
                                                                type="button"
                                                                onClick={() => handlePlanSwitch(planType)}
                                                                className={`custom-plan-dropdown-item ${selectedPlanType === planType ? 'active' : ''}`}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '12px 16px',
                                                                    border: 'none',
                                                                    background: selectedPlanType === planType ? '#eff6ff' : 'white',
                                                                    cursor: 'pointer',
                                                                    textAlign: 'left',
                                                                    fontSize: '14px',
                                                                    color: selectedPlanType === planType ? '#2563eb' : '#1e293b',
                                                                    fontWeight: selectedPlanType === planType ? '600' : '500',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    transition: 'all 0.15s ease',
                                                                    borderBottom: planType !== availablePlans[availablePlans.length - 1] ? '1px solid #f1f5f9' : 'none'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (selectedPlanType !== planType) {
                                                                        e.currentTarget.style.background = '#f8fafc';
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (selectedPlanType !== planType) {
                                                                        e.currentTarget.style.background = 'white';
                                                                    }
                                                                }}
                                                            >
                                                                <span>
                                                                    {allPlans[planType]?.name || planType}
                                                                </span>
                                                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                                    {total} available
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ 
                                            marginTop: '8px',
                                            fontSize: '12px', 
                                            color: '#64748b',
                                            padding: '6px 12px',
                                            background: '#f1f5f9',
                                            borderRadius: '6px',
                                            display: 'inline-block'
                                        }}>
                                            Creations: {allPlans[selectedPlanType]?.benefits?.creations || 0} | Enhancements: {allPlans[selectedPlanType]?.benefits?.enhancements || 0} | Downloads: {allPlans[selectedPlanType]?.benefits?.downloads || 0}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="resumebuilder-dashboard-plan-details">
                                    <div className="resumebuilder-dashboard-plan-detail-item">
                                        <span className="resumebuilder-dashboard-plan-detail-label">Current Plan</span>
                                        <span className="resumebuilder-dashboard-plan-detail-value resumebuilder-dashboard-plan-badge-large">
                                            {plan?.planType || 'basic'}
                                        </span>
                                    </div>
                                    <div className="resumebuilder-dashboard-plan-detail-item">
                                        <span className="resumebuilder-dashboard-plan-detail-label">
                                            {availablePlans.length > 1 ? 'Selected Plan Creations' : 'Creations Available'}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span className="resumebuilder-dashboard-plan-detail-value resumebuilder-dashboard-plan-count">
                                                {selectedCreations}
                                            </span>
                                            {availablePlans.length > 1 && (
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                                                    Total: {displayCreations}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="resumebuilder-dashboard-plan-detail-item">
                                        <span className="resumebuilder-dashboard-plan-detail-label">
                                            {availablePlans.length > 1 ? 'Selected Plan Enhancements' : 'Enhancements Available'}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span className="resumebuilder-dashboard-plan-detail-value resumebuilder-dashboard-plan-count">
                                                {selectedEnhancements}
                                            </span>
                                            {availablePlans.length > 1 && (
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                                                    Total: {displayEnhancements}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="resumebuilder-dashboard-plan-detail-item">
                                        <span className="resumebuilder-dashboard-plan-detail-label">
                                            {availablePlans.length > 1 ? 'Selected Plan Downloads' : 'Downloads Available'}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span className="resumebuilder-dashboard-plan-detail-value resumebuilder-dashboard-plan-count">
                                                {selectedDownloads}
                                            </span>
                                            {availablePlans.length > 1 && (
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                                                    Total: {displayDownloads}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="resumebuilder-dashboard-plan-detail-item">
                                        <span className="resumebuilder-dashboard-plan-detail-label">Total Transactions</span>
                                        <span className="resumebuilder-dashboard-plan-detail-value">
                                            {payments.length} payment{payments.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="resumebuilder-dashboard-plan-upgrade-section">
                                    <Link
                                        href="/jobseeker/resume-builder/create"
                                        className="resumebuilder-dashboard-analyze-resume-btn"
                                    >
                                        <FaRocket />
                                        <span>Create Resume</span>
                                    </Link>
                                    <button
                                        className="resumebuilder-dashboard-upgrade-plan-btn"
                                        onClick={() => {
                                            router.push("/jobseeker/resume-builder?upgrade-plan");
                                        }}
                                    >
                                        <FaArrowRight />
                                        <span>Upgrade Plan</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeBuilderDashboard;

