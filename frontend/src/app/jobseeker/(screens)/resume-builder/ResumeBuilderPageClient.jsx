"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { useResumeBuilderPlan, useResumeBuilderPlanConfig, useCreateCheckoutSession } from '@/hooks/useResumeBuilder';
import ResumeBuilderDashboard from './dashboard';
import { CircularProgress } from '@mui/material';
import { FaArrowLeft, FaCheck, FaTimes } from 'react-icons/fa';
import Cookies from 'js-cookie';
import './page.css';

const ResumeBuilderPageClient = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [redirectingToCheckOut, setRedirectingToCheckOut] = useState('');
    const [mounted, setMounted] = useState(false);
    const { data: planData, isLoading: planLoading, error: planError, isError: planIsError } = useResumeBuilderPlan();
    const { data: planConfigData, isLoading: planConfigLoading } = useResumeBuilderPlanConfig();
    const createCheckoutMutation = useCreateCheckoutSession();
    
    const isUpgradePlan = searchParams?.get('upgrade-plan') !== null;
    
    // Get plan configurations from backend
    const plans = planConfigData?.plans || {};
    const features = planConfigData?.features || {};

    // Show toast for plan loading errors
    useEffect(() => {
        if (mounted && planIsError && planError) {
            const errorMessage = planError?.response?.data?.message 
                || planError?.message 
                || 'Failed to load plan data. Please try again.';
            toast.error(errorMessage);
        }
    }, [mounted, planIsError, planError]);

    // Ensure component is mounted before accessing window
    useEffect(() => {
        setMounted(true);
    }, []);

    // Handle purchase plan
    const handlePay = async (planType) => {
        const token = Cookies.get('js_token');
        if (!token) {
            toast.error("Please log in to continue");
            router.push("/signin/jobseeker");
            return;
        }

        setRedirectingToCheckOut(planType);
        try {
            const result = await createCheckoutMutation.mutateAsync(planType);
            if (result.url) {
                toast.success("Redirecting to payment...");
                window.location.href = result.url;
            } else {
                throw new Error("Payment session URL not received");
            }
        } catch (error) {
            console.error("Payment error:", error);
            const errorMessage = error?.response?.data?.message 
                || error?.message 
                || "Failed to initiate payment. Please try again.";
            toast.error(errorMessage);
            setRedirectingToCheckOut('');
        }
    };

    // Helper function to get feature display name
    const getFeatureDisplayName = (featureCode) => {
        return features[featureCode]?.displayName || features[featureCode]?.name || featureCode;
    };

    // Get all features that should be displayed
    const getAllFeatures = () => {
        const allFeatures = [];
        
        // Standard features (always available)
        allFeatures.push({ key: 'creations', label: 'Resume Creations', type: 'count' });
        allFeatures.push({ key: 'enhancements', label: 'Resume Enhancements', type: 'count' });
        allFeatures.push({ key: 'downloads', label: 'PDF Downloads', type: 'count' });
        allFeatures.push({ key: 'ats-score', label: 'ATS Score Optimization', type: 'standard' });
        allFeatures.push({ key: 'templates', label: 'Multiple Templates', type: 'standard' });
        
        // All config features
        Object.keys(features).forEach(featureCode => {
            allFeatures.push({
                key: featureCode,
                label: getFeatureDisplayName(featureCode),
                type: 'feature'
            });
        });
        
        // Support level
        allFeatures.push({ key: 'support', label: 'Support', type: 'support' });
        
        return allFeatures;
    };

    // Check if a feature is available in a plan
    const isFeatureAvailable = (planType, featureKey) => {
        const plan = plans[planType];
        if (!plan) return false;

        // Standard features are always available
        if (featureKey === 'ats-score' || featureKey === 'templates') {
            return true;
        }

        // Creations, enhancements, downloads - always available (just different values)
        if (featureKey === 'creations' || featureKey === 'enhancements' || featureKey === 'downloads') {
            return true;
        }

        // Support - always available (just different levels)
        if (featureKey === 'support') {
            return true;
        }

        // Check if feature code is in plan features
        return plan.features && plan.features.includes(featureKey);
    };

    // Get feature value/label for display
    const getFeatureValue = (planType, featureKey) => {
        const plan = plans[planType];
        if (!plan) return '';

        if (featureKey === 'creations') {
            return `${plan.benefits?.creations || 0} creations`;
        }
        
        if (featureKey === 'enhancements') {
            return `${plan.benefits?.enhancements || 0} enhancements`;
        }

        if (featureKey === 'downloads') {
            return `${plan.benefits?.downloads || 0} downloads`;
        }

        if (featureKey === 'support') {
            if (planType === 'basic') return 'Standard support';
            if (planType === 'premium') return 'Priority support';
            if (planType === 'organization') return 'Dedicated support';
        }

        // For feature codes, return the display name
        return getFeatureDisplayName(featureKey);
    };

    // Helper function to render plan features with ticks and crosses
    const renderPlanFeatures = (planType) => {
        const allFeatures = getAllFeatures();
        const plan = plans[planType];
        if (!plan) return [];

        return allFeatures.map(feature => {
            const isAvailable = isFeatureAvailable(planType, feature.key);
            const value = getFeatureValue(planType, feature.key);
            
            return {
                key: feature.key,
                label: feature.label,
                value: value,
                available: isAvailable
            };
        });
    };

    // Show loading state or wait for mount
    if (!mounted || planLoading || planConfigLoading) {
        return (
            <div className="resumebuilder-page">
                <div className="resumebuilder-loading-container">
                    <CircularProgress />
                </div>
            </div>
        );
    }

    // If plan exists and not upgrading, show dashboard
    if (planData?.hasPlan && !isUpgradePlan) {
        return <ResumeBuilderDashboard />;
    }

    // Otherwise show pricing section (if upgrading)
    return (
        <div className="resumebuilder-page">
            <Toaster position="top-right" />
            
            {/* Pricing Section */}
            <div className="resumebuilder-pricing-section">
                {isUpgradePlan && (
                    <div className="resumebuilder-pricing-back-btn-container">
                        <button 
                            className="resumebuilder-pricing-back-btn"
                            onClick={() => router.push("/jobseeker/resume-builder")}
                        >
                            <FaArrowLeft />
                            <span>Back to Dashboard</span>
                        </button>
                    </div>
                )}
                <div className="resumebuilder-pricing-header">
                    <h2 className="resumebuilder-pricing-title">Choose Your Resume Builder Plan</h2>
                    <p className="resumebuilder-pricing-subtitle">
                        Simple pricing for creating professional, ATS-optimized resumes.
                    </p>
                </div>
                <div className="resumebuilder-pricing-card-grid">
                    {/* Basic Plan */}
                    {plans.basic && (
                        <div className="resumebuilder-pricing-card">
                            <div>
                                <div className="resumebuilder-plan-name">{plans.basic.name}</div>
                                <div className="resumebuilder-plan-price">
                                    <span className="resumebuilder-price-currency">₹</span>
                                    {plans.basic.amount}
                                    <span className="resumebuilder-plan-frequency">/once</span>
                                </div>
                                <ul className="resumebuilder-plan-features">
                                    {renderPlanFeatures('basic').map((feature, index) => (
                                        <li key={index} style={{ listStyle: 'none' }} className="resumebuilder-plan-feature-item-no-icon">
                                            {feature.available ? (
                                                <FaCheck style={{ marginRight: '8px', fontSize: '12px', color: '#10b981' }} />
                                            ) : (
                                                <FaTimes style={{ marginRight: '8px', fontSize: '12px', color: '#ef4444' }} />
                                            )}
                                            <span style={{ opacity: feature.available ? 1 : 0.6 }}>
                                                {feature.value || feature.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="resumebuilder-plan-select-btn" onClick={() => handlePay("basic")}>
                                {redirectingToCheckOut === "basic" ? "Loading..." : "Get Started"}
                            </div>
                        </div>
                    )}

                    {/* Premium Plan */}
                    {plans.premium && (
                        <div className="resumebuilder-pricing-card resumebuilder-pricing-card-popular">
                            <div>
                                <div className="resumebuilder-popular-tag">Most Popular</div>
                                <div className="resumebuilder-plan-name">{plans.premium.name}</div>
                                <div className="resumebuilder-plan-price">
                                    <span className="resumebuilder-price-currency">₹</span>
                                    {plans.premium.amount}
                                    <span className="resumebuilder-plan-frequency">/once</span>
                                </div>
                                <ul className="resumebuilder-plan-features">
                                    {renderPlanFeatures('premium').map((feature, index) => (
                                        <li key={index} style={{ listStyle: 'none' }} className="resumebuilder-plan-feature-item-no-icon">
                                            {feature.available ? (
                                                <FaCheck style={{ marginRight: '8px', fontSize: '12px', color: '#10b981' }} />
                                            ) : (
                                                <FaTimes style={{ marginRight: '8px', fontSize: '12px', color: '#ef4444' }} />
                                            )}
                                            <span style={{ opacity: feature.available ? 1 : 0.6 }}>
                                                {feature.value || feature.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="resumebuilder-plan-select-btn resumebuilder-plan-select-btn-popular" onClick={() => handlePay("premium")}>
                                {redirectingToCheckOut === "premium" ? "Loading..." : "Choose Premium"}
                            </div>
                        </div>
                    )}

                    {/* Organization Plan */}
                    {plans.organization && (
                        <div className="resumebuilder-pricing-card">
                            <div>
                                <div className="resumebuilder-plan-name">{plans.organization.name}</div>
                                <div className="resumebuilder-plan-price">
                                    <span className="resumebuilder-price-currency">₹</span>
                                    {plans.organization.amount}
                                    <span className="resumebuilder-plan-frequency">/once</span>
                                </div>
                                <ul className="resumebuilder-plan-features">
                                    {renderPlanFeatures('organization').map((feature, index) => (
                                        <li key={index} style={{ listStyle: 'none' }} className="resumebuilder-plan-feature-item-no-icon">
                                            {feature.available ? (
                                                <FaCheck style={{ marginRight: '8px', fontSize: '12px', color: '#10b981' }} />
                                            ) : (
                                                <FaTimes style={{ marginRight: '8px', fontSize: '12px', color: '#ef4444' }} />
                                            )}
                                            <span style={{ opacity: feature.available ? 1 : 0.6 }}>
                                                {feature.value || feature.label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="resumebuilder-plan-select-btn" onClick={() => handlePay("organization")}>
                                {redirectingToCheckOut === "organization" ? "Loading..." : "Get Started"}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResumeBuilderPageClient;

