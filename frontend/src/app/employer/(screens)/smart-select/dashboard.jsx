"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { useSmartSelectPlan, useSmartSelectPayments, useSmartSelectAnalysisHistory, useSmartSelectPlanConfig, useUpdateActivePlan } from '@/hooks/useSmartSelect';
import { FaChartLine, FaFileAlt, FaHistory, FaArrowRight, FaCheckCircle, FaClock, FaEye, FaCalendarAlt, FaUsers, FaTrophy, FaMoneyBillWave, FaChevronDown } from 'react-icons/fa';
import { CircularProgress } from '@mui/material';
import './dashboard.css';

const SmartSelectDashboard = () => {
    const router = useRouter();
    const { data: planData, isLoading: planLoading, error: planError, isError: planIsError } = useSmartSelectPlan();
    const { data: payments = [], isLoading: paymentsLoading, error: paymentsError, isError: paymentsIsError } = useSmartSelectPayments();
    const { data: analysisHistory = [], isLoading: historyLoading, error: historyError, isError: historyIsError } = useSmartSelectAnalysisHistory();
    const { data: planConfigData } = useSmartSelectPlanConfig();
    const updateActivePlanMutation = useUpdateActivePlan();
    
    // Get plan configuration data
    const userPlan = planConfigData?.userPlan;
    const allPlans = planConfigData?.plans || {};
    const planCounts = userPlan?.planCounts || {};
    const activePlanType = userPlan?.activePlanType;
    
    // Get available plans (plans that have counts > 0)
    const availablePlans = ['basic', 'premium', 'organization'].filter(planType => {
        const count = planCounts[planType] || 0;
        return count > 0;
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
    
    // Get selected plan count
    const selectedPlanCount = planCounts[selectedPlanType] || 0;
    
    // Custom dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
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

    // Currency symbols for salary formatting
    const currencySymbols = {
        INR: "₹",
        USD: "$",
        EUR: "€",
        GBP: "£",
        AUD: "A$",
        CAD: "C$",
    };

    const formatNumberShort = (value) => {
        if (typeof value !== "number" || isNaN(value)) return null;
        return value % 1 === 0 ? value.toString() : value.toFixed(1);
    };

    const formatSalaryRange = (estimate) => {
        if (!estimate || !estimate.estimatedRange) return null;
        const { min, max, unit = "LPA", currency = "INR" } = estimate.estimatedRange;
        const symbol = currencySymbols[currency?.toUpperCase?.()] || `${currency} `;
        const minText = typeof min === "number" ? `${symbol}${formatNumberShort(min)} ${unit}` : null;
        const maxText = typeof max === "number" ? `${symbol}${formatNumberShort(max)} ${unit}` : null;
        if (minText && maxText) return `${symbol}${formatNumberShort(min)}–${formatNumberShort(max)} ${unit}`;
        if (minText) return `${minText}+`;
        if (maxText) return `Up to ${maxText}`;
        return null;
    };

    const summarizeSalaryStats = (summary) => {
        if (!summary) return { median: null, range: null };
        const unit = summary.unit || "LPA";
        const currency = summary.currency || "INR";
        const symbol = currencySymbols[currency?.toUpperCase?.()] || `${currency} `;
        const median = typeof summary.averageMedian === "number"
            ? `${symbol}${formatNumberShort(summary.averageMedian)} ${unit}`
            : null;
        const range = (typeof summary.averageMin === "number" && typeof summary.averageMax === "number")
            ? `${symbol}${formatNumberShort(summary.averageMin)}–${formatNumberShort(summary.averageMax)} ${unit}`
            : null;
        return { median, range };
    };

    // Show toast for errors
    useEffect(() => {
        if (planIsError && planError) {
            const errorMessage = planError?.response?.data?.message 
                || planError?.message 
                || 'Failed to load plan data. Please try again.';
            toast.error(errorMessage);
        }
    }, [planIsError, planError]);

    useEffect(() => {
        if (paymentsIsError && paymentsError) {
            const errorMessage = paymentsError?.response?.data?.message 
                || paymentsError?.message 
                || 'Failed to load payment history. Please try again.';
            toast.error(errorMessage);
        }
    }, [paymentsIsError, paymentsError]);

    useEffect(() => {
        if (historyIsError && historyError) {
            const errorMessage = historyError?.response?.data?.message 
                || historyError?.message 
                || 'Failed to load analysis history. Please try again.';
            toast.error(errorMessage);
        }
    }, [historyIsError, historyError]);

    if (planLoading || paymentsLoading) {
        return (
            <div className="smart-select-dashboard-loading">
                <CircularProgress />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const hasPlan = planData?.hasPlan;
    const plan = planData?.plan;

    // If no plan, show upgrade screen
    if (!hasPlan || !plan) {
        return (
            <div className="smart-select-dashboard-container">
                <div className="smart-select-dashboard-no-plan-screen">
                    <div className="smart-select-dashboard-no-plan-content">
                        <div className="smart-select-dashboard-no-plan-icon">
                            <FaChartLine />
                        </div>
                        <h1 className="smart-select-dashboard-no-plan-title">Get Started with Smart Select</h1>
                        <p className="smart-select-dashboard-no-plan-description">
                            Unlock powerful AI-powered resume analysis tools. Compare resumes, get ATS scores, 
                            and find the best candidates with our advanced analyzer.
                        </p>
                        <div className="smart-select-dashboard-no-plan-features">
                            <div className="smart-select-dashboard-feature-item">
                                <FaCheckCircle />
                                <span>AI-Powered ATS Score Analysis</span>
                            </div>
                            <div className="smart-select-dashboard-feature-item">
                                <FaCheckCircle />
                                <span>Job Description Matching</span>
                            </div>
                            <div className="smart-select-dashboard-feature-item">
                                <FaCheckCircle />
                                <span>Side-by-Side Resume Comparison</span>
                            </div>
                            <div className="smart-select-dashboard-feature-item">
                                <FaCheckCircle />
                                <span>Smart Optimization Recommendations</span>
                            </div>
                        </div>
                        <div className="smart-select-dashboard-no-plan-actions">
                            <button
                                className="smart-select-dashboard-upgrade-btn smart-select-dashboard-upgrade-primary"
                                onClick={() => window.location.reload()}
                            >
                                Choose a Plan
                            </button>
                        </div>
                        {payments.length > 0 && (
                            <div className="smart-select-dashboard-no-plan-payments">
                                <h3>Your Payment History</h3>
                                <div className="smart-select-dashboard-payment-list-compact">
                                    {payments.map((pay, i) => (
                                        <div key={i} className="smart-select-dashboard-payment-item-compact">
                                            <span>{new Date(pay.createdAt).toLocaleDateString()}</span>
                                            <span>₹{pay.amount}</span>
                                            <span className={`smart-select-dashboard-status-badge smart-select-dashboard-status-${pay.status}`}>
                                                {pay.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="smart-select-dashboard-container">
            <div className="smart-select-dashboard">
                {/* Dashboard Header */}
                <div className="smart-select-dashboard-header">
                    <div className="smart-select-dashboard-header-left">
                        <h1 className="smart-select-dashboard-title">Smart Select Dashboard</h1>
                        <p className="smart-select-dashboard-subtitle">AI-Powered Resume Analysis Dashboard</p>
                    </div>
                    <div className="smart-select-dashboard-header-right">
                        <button
                            className="smart-select-dashboard-primary-action-btn"
                            onClick={() => {
                                router.push("/employer/smart-select/analyze");
                            }}
                            disabled={plan.analyzeRemaining <= 0}
                        >
                            <FaChartLine />
                            <span>Analyze Resume</span>
                            <FaArrowRight />
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="smart-select-dashboard-stats-grid">
                    <div className="smart-select-dashboard-stat-card smart-select-dashboard-stat-primary">
                        <div className="smart-select-dashboard-stat-card-icon">
                            <FaFileAlt />
                        </div>
                        <div className="smart-select-dashboard-stat-card-content">
                            <div className="smart-select-dashboard-stat-card-label">
                                {availablePlans.length > 1 ? 'Selected Plan Analyses' : 'Analyses Remaining'}
                            </div>
                            <div className="smart-select-dashboard-stat-card-value">
                                {availablePlans.length > 1 ? selectedPlanCount : plan.analyzeRemaining}
                            </div>
                            {availablePlans.length > 1 && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    Total: {plan.analyzeRemaining}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="smart-select-dashboard-stat-card smart-select-dashboard-stat-secondary">
                        <div className="smart-select-dashboard-stat-card-icon">
                            <FaHistory />
                        </div>
                        <div className="smart-select-dashboard-stat-card-content">
                            <div className="smart-select-dashboard-stat-card-label">Total Transactions</div>
                            <div className="smart-select-dashboard-stat-card-value">{payments.length}</div>
                        </div>
                    </div>
                    <div className="smart-select-dashboard-stat-card smart-select-dashboard-stat-tertiary">
                        <div className="smart-select-dashboard-stat-card-icon">
                            <FaCheckCircle />
                        </div>
                        <div className="smart-select-dashboard-stat-card-content">
                            <div className="smart-select-dashboard-stat-card-label">Plan Type</div>
                            <div className="smart-select-dashboard-stat-card-value">{plan.planType?.toUpperCase() || "N/A"}</div>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="smart-select-dashboard-content-main">
                    {/* Top Section: Analysis History and Plan Details */}
                    <div className="smart-select-dashboard-top-section">
                        {/* Analysis History Card - Main Content */}
                        <div className="smart-select-dashboard-section-card smart-select-dashboard-history-section smart-select-dashboard-history-main">
                            <div className="smart-select-dashboard-section-header">
                                <div className="smart-select-dashboard-section-header-left">
                                    <FaHistory className="smart-select-dashboard-section-icon" />
                                    <h2 className="smart-select-dashboard-section-title">Analysis History</h2>
                                    {analysisHistory.length > 0 && (
                                        <span className="smart-select-dashboard-history-count">{analysisHistory.length}</span>
                                    )}
                                </div>
                            </div>
                            <div className="smart-select-dashboard-section-body">
                                {historyLoading ? (
                                    <div className="smart-select-dashboard-loading-state">
                                        <FaClock className="smart-select-dashboard-loading-icon" />
                                        <p>Loading history...</p>
                                    </div>
                                ) : analysisHistory.length === 0 ? (
                                    <div className="smart-select-dashboard-history-placeholder">
                                        <div className="smart-select-dashboard-placeholder-content">
                                            <FaFileAlt className="smart-select-dashboard-placeholder-icon" />
                                            <h3 className="smart-select-dashboard-placeholder-title">No analyses yet</h3>
                                            <p className="smart-select-dashboard-placeholder-description">
                                                Start analyzing resumes to see your analysis history here.
                                                Track your resume performance and ATS scores over time.
                                            </p>
                                            <button
                                                className="smart-select-dashboard-placeholder-btn"
                                                onClick={() => {
                                                    router.push("/employer/smart-select/analyze");
                                                }}
                                                disabled={plan.analyzeRemaining <= 0}
                                            >
                                                Start Your First Analysis
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="smart-select-dashboard-history-list">
                                        {analysisHistory.map((analysis, index) => {
                                            const salaryStats = summarizeSalaryStats(analysis.salarySummary);
                                            return (
                                                <div key={analysis.analysisId || index} className="smart-select-dashboard-history-item">
                                                    <div className="smart-select-dashboard-history-item-header">
                                                        <div className="smart-select-dashboard-history-item-left">
                                                            <div className="smart-select-dashboard-history-item-icon">
                                                                <FaFileAlt />
                                                            </div>
                                                            <div className="smart-select-dashboard-history-item-info">
                                                                <h3 className="smart-select-dashboard-history-item-title">
                                                                    Analysis #{analysisHistory.length - index}
                                                                </h3>
                                                                <div className="smart-select-dashboard-history-item-meta">
                                                                    <span className="smart-select-dashboard-history-meta-item">
                                                                        <FaCalendarAlt />
                                                                        {new Date(analysis.createdAt).toLocaleDateString("en-GB", {
                                                                            day: "2-digit",
                                                                            month: "short",
                                                                            year: "numeric",
                                                                            hour: "2-digit",
                                                                            minute: "2-digit"
                                                                        })}
                                                                    </span>
                                                                    <span className="smart-select-dashboard-history-meta-item">
                                                                        <FaUsers />
                                                                        {analysis.totalResumes} Resume{analysis.totalResumes !== 1 ? 's' : ''}
                                                                    </span>
                                                                    {analysis.topN && (
                                                                        <span className="smart-select-dashboard-history-meta-item">
                                                                            <FaTrophy />
                                                                            Top {analysis.topN}
                                                                        </span>
                                                                    )}
                                                                    {analysis.companyFitSummary?.targetCompanyType && (
                                                                        <span className="smart-select-dashboard-history-meta-item">
                                                                            <FaChartLine />
                                                                            {analysis.companyFitSummary.targetCompanyType}
                                                                        </span>
                                                                    )}
                                                                    {analysis.salarySummary?.averageMedian !== null && (
                                                                        <span className="smart-select-dashboard-history-meta-item">
                                                                            <FaMoneyBillWave />
                                                                            {salaryStats.median || "Salary"}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="smart-select-dashboard-history-view-btn"
                                                            onClick={() => {
                                                                router.push(`/employer/smart-select/analyze?analysisId=${analysis.analysisId}`);
                                                            }}
                                                            title="View Analysis"
                                                        >
                                                            <FaEye />
                                                            <span>View</span>
                                                        </button>
                                                    </div>
                                                    {analysis.jobDescription && (
                                                        <div className="smart-select-dashboard-history-jd-preview">
                                                            <strong>Job Description:</strong>
                                                            <p>{analysis.jobDescription.length > 150 
                                                                ? `${analysis.jobDescription.substring(0, 150)}...` 
                                                                : analysis.jobDescription}</p>
                                                        </div>
                                                    )}
                                                    {analysis.companyFitSummary && (
                                                        <div className="smart-select-dashboard-history-jd-preview">
                                                            <strong>Company Trajectory Match:</strong>
                                                            <p style={{ marginBottom: "4px" }}>
                                                                Target Type: {analysis.companyFitSummary.targetCompanyType}
                                                            </p>
                                                            {analysis.companyFitSummary.averageFitScore !== null && (
                                                                <p style={{ marginBottom: "0" }}>
                                                                    Average Fit: {analysis.companyFitSummary.averageFitScore}%
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {analysis.salarySummary && (
                                                        <div className="smart-select-dashboard-history-jd-preview">
                                                            <strong>Salary Benchmark:</strong>
                                                            <p style={{ marginBottom: "4px" }}>
                                                                Median: {salaryStats.median || "N/A"}
                                                            </p>
                                                            {salaryStats.range && (
                                                                <p style={{ marginBottom: "0" }}>
                                                                    Avg Range: {salaryStats.range}
                                                                </p>
                                                            )}
                                                            {analysis.salarySummary.sampleCount !== undefined && (
                                                                <p style={{ marginTop: "4px", marginBottom: "0", color: "#64748b", fontSize: "13px" }}>
                                                                    Based on {analysis.salarySummary.sampleCount} sample{analysis.salarySummary.sampleCount === 1 ? "" : "s"}.
                                                                </p>
                                                            )}
                                                            {analysis.salaryContext?.useJobDescription && (
                                                                <p style={{ marginTop: "4px", marginBottom: "0", color: "#64748b", fontSize: "13px" }}>
                                                                    Details inferred from JD.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {analysis.topResumes && analysis.topResumes.length > 0 && (
                                                        <div className="smart-select-dashboard-history-top-resumes">
                                                            <div className="smart-select-dashboard-history-top-resumes-header">
                                                                <FaTrophy />
                                                                <span>Top Recommended ({analysis.topResumes.length})</span>
                                                            </div>
                                                            <div className="smart-select-dashboard-history-top-resumes-list">
                                                                {analysis.topResumes.slice(0, 3).map((resume, idx) => (
                                                                    <div key={idx} className="smart-select-dashboard-history-top-resume-item">
                                                                        <span className="smart-select-dashboard-history-resume-name">
                                                                            {resume.candidateName || resume.fileName}
                                                                        </span>
                                                                        <span className="smart-select-dashboard-history-resume-score">
                                                                            ATS: {resume.atsScore}%
                                                                        </span>
                                                                        {typeof resume.companyContextFitScore === "number" && (
                                                                            <span className="smart-select-dashboard-history-resume-score smart-select-dashboard-history-resume-score-secondary">
                                                                                Company: {resume.companyContextFitScore}%
                                                                            </span>
                                                                        )}
                                                                        {resume.salaryEstimate && (
                                                                            <span className="smart-select-dashboard-history-resume-score smart-select-dashboard-history-resume-score-secondary">
                                                                                {formatSalaryRange(resume.salaryEstimate) || "Salary: N/A"}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                {analysis.topResumes.length > 3 && (
                                                                    <div className="smart-select-dashboard-history-more-resumes">
                                                                        +{analysis.topResumes.length - 3} more
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Plan Details Card - Top Right */}
                        <div className="smart-select-dashboard-section-card smart-select-dashboard-plan-details-card">
                            <div className="smart-select-dashboard-section-header">
                                <div className="smart-select-dashboard-section-header-left">
                                    <FaChartLine className="smart-select-dashboard-section-icon" />
                                    <h2 className="smart-select-dashboard-section-title">Plan Details</h2>
                                </div>
                                <button
                                    className="smart-select-dashboard-view-transactions-btn"
                                    onClick={() => router.push("/employer/smart-select/transactions")}
                                    title="View All Transactions"
                                >
                                    <FaHistory />
                                    <span>View Transactions</span>
                                </button>
                            </div>
                            <div className="smart-select-dashboard-section-body">
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
                                                    {allPlans[selectedPlanType]?.name || selectedPlanType} ({planCounts[selectedPlanType] || 0} available)
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
                                                    {availablePlans.map(planType => (
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
                                                                {planCounts[planType] || 0} available
                                                            </span>
                                                        </button>
                                                    ))}
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
                                            Resume Limit: {allPlans[selectedPlanType]?.benefits?.resumeLimitPerAnalyze || 0}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="smart-select-dashboard-plan-details">
                                    <div className="smart-select-dashboard-plan-detail-item">
                                        <span className="smart-select-dashboard-plan-detail-label">Current Plan</span>
                                        <span className="smart-select-dashboard-plan-detail-value smart-select-dashboard-plan-badge-large">
                                            {plan.planType}
                                        </span>
                                    </div>
                                    <div className="smart-select-dashboard-plan-detail-item">
                                        <span className="smart-select-dashboard-plan-detail-label">
                                            {availablePlans.length > 1 ? 'Selected Plan Analyses' : 'Analyses Available'}
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span className="smart-select-dashboard-plan-detail-value smart-select-dashboard-plan-count">
                                                {availablePlans.length > 1 ? selectedPlanCount : plan.analyzeRemaining}
                                            </span>
                                            {availablePlans.length > 1 && (
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                                                    Total: {plan.analyzeRemaining}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="smart-select-dashboard-plan-detail-item">
                                        <span className="smart-select-dashboard-plan-detail-label">Total Transactions</span>
                                        <span className="smart-select-dashboard-plan-detail-value">
                                            {payments.length} payment{payments.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="smart-select-dashboard-plan-upgrade-section">
                                    <button
                                        className="smart-select-dashboard-analyze-resume-btn"
                                        onClick={() => {
                                            router.push("/employer/smart-select/analyze");
                                        }}
                                        disabled={plan.analyzeRemaining <= 0}
                                    >
                                        <FaChartLine />
                                        <span>Analyze Resume</span>
                                    </button>
                                    <button
                                        className="smart-select-dashboard-upgrade-plan-btn"
                                        onClick={() => {
                                            router.push("/employer/smart-select?upgrade-plan");
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
            <Toaster position="top-right" />
        </div>
    );
};

export default SmartSelectDashboard;

