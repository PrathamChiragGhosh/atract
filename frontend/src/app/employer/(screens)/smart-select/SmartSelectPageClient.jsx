"use client";

import { useState, useEffect, Suspense } from 'react';
import './page.css';
import { HiSparkles } from 'react-icons/hi2';
import { HiChevronDown } from 'react-icons/hi2';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { useSmartSelectPlan, useSmartSelectPlanConfig } from '@/hooks/useSmartSelect';
import SmartSelectDashboard from './dashboard';
import { CircularProgress } from '@mui/material';
import { FaArrowLeft, FaCheck, FaTimes } from 'react-icons/fa';

const SmartSelectPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [redirectingToCheckOut, setRedirectingToCheckOut] = useState('');
    const [openFaqIndex, setOpenFaqIndex] = useState(null);
    const [mounted, setMounted] = useState(false);
    const { data: planData, isLoading: planLoading, refetch: refetchPlan, error: planError, isError: planIsError } = useSmartSelectPlan();
    const { data: planConfigData, isLoading: planConfigLoading } = useSmartSelectPlanConfig();
    
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

    // Note: Payment verification is now handled by the /payment-success page
    // No need to handle it here anymore

    // Generate FAQ with dynamic plan values
    const getFaqs = () => {
        const basicCount = plans.basic?.benefits?.analyzeCount || 2;
        const premiumCount = plans.premium?.benefits?.analyzeCount || 10;
        const orgCount = plans.organization?.benefits?.analyzeCount || 50;
        const basicName = plans.basic?.name || 'Basic';
        const premiumName = plans.premium?.name || 'Premium';
        const orgName = plans.organization?.name || 'Organization';

        return [
            {
                question: "What is Smart Select and how does it work?",
                answer: "Smart Select is an AI-powered resume analysis tool that helps employers find the best candidates. Simply upload multiple candidate resumes along with your job description, and our AI will analyze each resume, provide ATS scores, job match insights, and help you compare candidates side-by-side to make informed hiring decisions."
            },
            {
                question: "What file formats are supported for resume uploads?",
                answer: "We support PDF and DOCX file formats for resume uploads. You can upload multiple resumes at once, and our system will process them all for comparison and analysis."
            },
            {
                question: "How accurate is the ATS scoring and job matching?",
                answer: "Our AI-powered system has a 95% match accuracy rate. The ATS scoring evaluates how well a resume will pass through Applicant Tracking Systems, while job matching compares candidate qualifications against your job requirements to provide detailed fit scores."
            },
            {
                question: "Can I use Smart Select for multiple job postings?",
                answer: `Yes! Depending on your plan, you can analyze resumes for multiple job postings. The ${basicName} plan allows up to ${basicCount} resume analyses, ${premiumName} allows up to ${premiumCount}, and ${orgName} plan allows up to ${orgCount} analyses. Each analysis can be matched against different job descriptions.`
            },
            {
                question: "Is my data secure and confidential?",
                answer: "Absolutely. All candidate resumes and job descriptions are encrypted and kept confidential. We use industry-standard security measures to protect your data, and documents are automatically deleted after analysis completion unless you choose to save them."
            },
            {
                question: "What happens after I purchase a plan?",
                answer: "After successful payment, you'll receive access to your plan immediately. You can start uploading resumes and analyzing candidates right away. Your analysis credits are stored in your account and can be used anytime within the plan validity period."
            },
            {
                question: "Can I upgrade or downgrade my plan later?",
                answer: "Yes, you can upgrade your plan at any time. When you upgrade, you'll pay the difference between plans, and your analysis credits will be updated accordingly. Contact our support team for assistance with plan changes."
            },
            {
                question: "Do you offer refunds?",
                answer: "We offer a satisfaction guarantee. If you're not happy with Smart Select within the first 7 days of purchase, contact our support team for a full refund. Refund requests after this period are handled on a case-by-case basis."
            }
        ];
    };

    const faqs = getFaqs();

    const toggleFaq = (index) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    const handlePay = async (planType) => {
        // Prevent Next.js error overlay for payment errors
        try {
            const token = Cookies.get('emp_token');
        if (!token) {
            toast.error("Please log in to continue");
            router.push("/signin/employer");
            return;
        }

        setRedirectingToCheckOut(planType);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/checkout`,
                {
                    planType: planType,
                    currency: "INR"
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data?.success && response.data?.orderId) {
                // Load Razorpay script
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

                const isLoaded = await loadRazorpay();
                if (!isLoaded) {
                    throw new Error("Failed to load Razorpay checkout");
                }

                console.log("Opening Razorpay checkout with options:", {
                    key: response.data.keyId,
                    orderId: response.data.orderId,
                    amount: response.data.amount
                });

                // Open Razorpay checkout
                const options = {
                    key: response.data.keyId,
                    amount: response.data.amount,
                    currency: response.data.currency,
                    name: 'Atract - Smart Select',
                    description: response.data.description || 'Resume Analysis Plan',
                    order_id: response.data.orderId,
                    prefill: {
                        name: response.data.name || '',
                        email: response.data.email || '',
                        contact: response.data.contact || ''
                    },
                    notes: response.data.notes || {},
                    theme: {
                        color: response.data.theme?.color || '#2563eb'
                    },
                    handler: async function (paymentResponse) {
                        console.log("Razorpay handler called with:", {
                            orderId: paymentResponse.razorpay_order_id,
                            paymentId: paymentResponse.razorpay_payment_id,
                            signature: paymentResponse.razorpay_signature ? "present" : "missing"
                        });

                        // Payment successful - verify payment
                        try {
                            console.log("Payment successful, verifying...", {
                                orderId: paymentResponse.razorpay_order_id,
                                paymentId: paymentResponse.razorpay_payment_id
                            });

                            const verifyResponse = await axios.post(
                                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/verify-payment`,
                                {
                                    razorpay_order_id: paymentResponse.razorpay_order_id,
                                    razorpay_payment_id: paymentResponse.razorpay_payment_id,
                                    razorpay_signature: paymentResponse.razorpay_signature
                                },
                                {
                                    headers: { Authorization: `Bearer ${token}` }
                                }
                            );

                            console.log("Verification response:", verifyResponse.data);
                            console.log("Verification status:", verifyResponse.status);

                            if (verifyResponse.data.success) {
                                toast.success("Payment successful! Plan activated.");
                                // Redirect to payment success page with signature for display
                                router.push(`/payment-success?order_id=${paymentResponse.razorpay_order_id}&payment_id=${paymentResponse.razorpay_payment_id}&signature=${paymentResponse.razorpay_signature}&type=smart-select`);
                                // Refetch plan data
                                refetchPlan();
                            } else {
                                throw new Error(verifyResponse.data.message || "Payment verification failed");
                            }
                        } catch (verifyError) {
                            console.error("Payment verification error:", verifyError);
                            toast.error(verifyError?.response?.data?.message || "Payment verification failed. Please contact support.");
                        }
                    },
                    modal: {
                        ondismiss: function() {
                            toast.error("Payment cancelled");
                            setRedirectingToCheckOut('');
                        }
                    }
                };

                console.log("Creating Razorpay instance with options:", options);

                const razorpay = new window.Razorpay(options);
                console.log("Razorpay instance created, opening modal...");

                razorpay.open();
                toast.success("Opening payment gateway...");
            } else {
                throw new Error("Payment order not received");
            }
        } catch (error) {
            // Prevent Next.js error overlay for expected 400 errors
            const isExpectedError = error?.response?.status === 400;

            if (isExpectedError) {
                console.log("Payment validation error:", error?.response?.data);
            } else {
                console.error("Payment error:", error);
                console.log("Error response:", error?.response?.data);
                console.log("Error status:", error?.response?.status);
            }

            const errorMessage = error?.response?.data?.message
                || error?.message
                || "Failed to initiate payment. Please try again.";

            // Special handling for plan already exists error
            if (errorMessage.includes("already have the")) {
                toast.error("You already own this plan. Please choose a different plan or contact support.");
                setRedirectingToCheckOut('');
                return; // Don't show generic error and prevent error overlay
            }

            // Handle other specific errors gracefully
            if (error?.response?.status === 400) {
                toast.error(errorMessage);
                setRedirectingToCheckOut('');
                return; // Prevent Next.js error overlay
            }

            // For unexpected errors, show generic message but don't crash
            toast.error("Failed to initiate payment. Please try again.");
            setRedirectingToCheckOut('');

            // For unexpected errors, we still want to log but not show overlay
            if (!isExpectedError) {
                // Could send to error reporting service here
            }
        }
        } catch (unexpectedError) {
            // Catch any unexpected errors that might bubble up and cause Next.js overlay
            console.error("Unexpected error in handlePay:", unexpectedError);
            toast.error("An unexpected error occurred. Please try again.");
            setRedirectingToCheckOut('');
        }
    };

    const handleMoreDetails = () => {
        const pricingSection = document.querySelector('.smart-select-pricing-section');
        if (pricingSection) {
            pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Helper function to get feature display name
    const getFeatureDisplayName = (featureCode) => {
        return features[featureCode]?.displayName || features[featureCode]?.name || featureCode;
    };

    // Get all features that should be displayed (comprehensive list)
    const getAllFeatures = () => {
        const allFeatures = [];
        
        // Standard features (always available)
        allFeatures.push({ key: 'analyze-count', label: 'Analyses', type: 'count' });
        allFeatures.push({ key: 'resume-limit', label: 'Resumes per analysis', type: 'count' });
        allFeatures.push({ key: 'ats-score', label: 'ATS & job match score', type: 'standard' });
        allFeatures.push({ key: 'pdf-report', label: 'PDF report', type: 'standard' });
        
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
        if (featureKey === 'ats-score' || featureKey === 'pdf-report') {
            return true;
        }

        // Analyze count and resume limit - always available (just different values)
        if (featureKey === 'analyze-count' || featureKey === 'resume-limit') {
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

        if (featureKey === 'analyze-count') {
            return `Up to ${plan.benefits?.analyzeCount || 0} analyses`;
        }
        
        if (featureKey === 'resume-limit') {
            return `Up to ${plan.benefits?.resumeLimitPerAnalyze || 0} resumes per analysis`;
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
            <div className="smart-select-page">
                <div className="smart-select-loading-container">
                    <CircularProgress />
                </div>
            </div>
        );
    }

    // If plan exists and not upgrading, show dashboard
    if (planData?.hasPlan && !isUpgradePlan) {
        return <SmartSelectDashboard />;
    }

    // Otherwise show landing page or pricing (if upgrading)
    return (
        <div className="smart-select-page">
            {/* Hero Section - Only show if not upgrading */}
            {!isUpgradePlan && (
            <div className="smart-select-hero">
                <div className="smart-select-hero-overlay"></div>
                <div className="smart-select-hero-inner">
                    <div className="smart-select-hero-text">
                        <div className="smart-select-hero-pretitle">
                            <HiSparkles style={{ marginRight: '8px' }} />
                            AI-Powered Smart Select
                        </div>
                        <h1 className="smart-select-hero-title">
                            Find the <span>Perfect Candidate</span> with AI Resume Analysis
                        </h1>
                        <p className="smart-select-hero-desc">
                            Upload multiple candidate resumes, get ATS scores, match with your job description, compare side-by-side, and select the best candidates—all powered by AI.
                        </p>
                        <div className="smart-select-hero-actions">
                            <button className="smart-select-hero-btn" onClick={() => handlePay("premium")}>
                                Get Started Now
                            </button>
                            <button className="smart-select-hero-btn-alt" onClick={handleMoreDetails}>
                                More Details
                            </button>
                        </div>
                        <div className="smart-select-hero-stats">
                            <div className="smart-select-hero-stat">
                                <div className="smart-select-hero-stat-num">500+</div>
                                <div className="smart-select-hero-stat-label">Resumes Analyzed</div>
                            </div>
                            <div className="smart-select-hero-stat-divider"></div>
                            <div className="smart-select-hero-stat">
                                <div className="smart-select-hero-stat-num">95%</div>
                                <div className="smart-select-hero-stat-label">Match Accuracy</div>
                            </div>
                            <div className="smart-select-hero-stat-divider"></div>
                            <div className="smart-select-hero-stat">
                                <div className="smart-select-hero-stat-num">4.8/5</div>
                                <div className="smart-select-hero-stat-label">Employer Satisfaction</div>
                            </div>
                        </div>
                    </div>
                    <div className="smart-select-hero-image">
                        <div className="smart-select-hero-icon-wrapper">
                            <HiSparkles size={120} />
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Pricing Section */}
            <div className="smart-select-pricing-section">
                {isUpgradePlan && (
                    <div className="smart-select-pricing-back-btn-container">
                        <button 
                            className="smart-select-pricing-back-btn"
                            onClick={() => router.push("/employer/smart-select")}
                        >
                            <FaArrowLeft />
                            <span>Back to Dashboard</span>
                        </button>
                    </div>
                )}
                <div className="smart-select-pricing-header">
                    <h2 className="smart-select-pricing-title">Choose Your Analysis Plan</h2>
                    <p className="smart-select-pricing-subtitle">
                        Simple pricing for recruiters, hiring managers, and organizations.
                    </p>
                </div>
                <div className="smart-select-pricing-card-grid">
                    {/* Basic Plan */}
                    {plans.basic && (
                        <div className="smart-select-pricing-card">
                            <div>
                                <div className="smart-select-plan-name">{plans.basic.name}</div>
                                <div className="smart-select-plan-price">
                                    <span className="smart-select-price-currency">₹</span>
                                    {plans.basic.amount}
                                    <span className="smart-select-plan-frequency">/once</span>
                                </div>
                                <ul className="smart-select-plan-features">
                                    {renderPlanFeatures('basic').map((feature, index) => (
                                        <li key={index} style={{ listStyle: 'none' }} className="smart-select-plan-feature-item-no-icon">
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
                            <div className="smart-select-plan-select-btn" onClick={() => handlePay("basic")}>
                                {redirectingToCheckOut === "basic" ? "Loading..." : "Get Started"}
                            </div>
                        </div>
                    )}

                    {/* Premium Plan */}
                    {plans.premium && (
                        <div className="smart-select-pricing-card smart-select-pricing-card-popular">
                            <div>
                                <div className="smart-select-popular-tag">Most Popular</div>
                                <div className="smart-select-plan-name">{plans.premium.name}</div>
                                <div className="smart-select-plan-price">
                                    <span className="smart-select-price-currency">₹</span>
                                    {plans.premium.amount}
                                    <span className="smart-select-plan-frequency">/once</span>
                                </div>
                                <ul className="smart-select-plan-features">
                                    {renderPlanFeatures('premium').map((feature, index) => (
                                        <li key={index} style={{ listStyle: 'none' }} className="smart-select-plan-feature-item-no-icon">
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
                            <div className="smart-select-plan-select-btn smart-select-plan-select-btn-popular" onClick={() => handlePay("premium")}>
                                {redirectingToCheckOut === "premium" ? "Loading..." : "Choose Premium"}
                            </div>
                        </div>
                    )}

                    {/* Organization Plan */}
                    {plans.organization && (
                        <div className="smart-select-pricing-card">
                            <div>
                                <div className="smart-select-plan-name">{plans.organization.name}</div>
                                <div className="smart-select-plan-price">
                                    <span className="smart-select-price-currency">₹</span>
                                    {plans.organization.amount}
                                    <span className="smart-select-plan-frequency">/once</span>
                                </div>
                                <ul className="smart-select-plan-features">
                                    {renderPlanFeatures('organization').map((feature, index) => (
                                        <li key={index} style={{ listStyle: 'none' }} className="smart-select-plan-feature-item-no-icon">
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
                            <div className="smart-select-plan-select-btn" onClick={() => handlePay("organization")}>
                                {redirectingToCheckOut === "organization" ? "Loading..." : "Get Started"}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* FAQ Section - Only show if not upgrading */}
            {!isUpgradePlan && (
            <div className="smart-select-faq-section">
                <div className="smart-select-faq-header">
                    <h2 className="smart-select-faq-title">Frequently Asked Questions</h2>
                    <p className="smart-select-faq-subtitle">
                        Everything you need to know about Smart Select
                    </p>
                </div>
                <div className="smart-select-faq-container">
                    {faqs.map((faq, index) => (
                        <div 
                            key={index} 
                            className={`smart-select-faq-item ${openFaqIndex === index ? 'smart-select-faq-item-open' : ''}`}
                        >
                            <div 
                                className="smart-select-faq-question"
                                onClick={() => toggleFaq(index)}
                            >
                                <span>{faq.question}</span>
                                <HiChevronDown 
                                    className={`smart-select-faq-icon ${openFaqIndex === index ? 'smart-select-faq-icon-open' : ''}`}
                                />
                            </div>
                            <div className={`smart-select-faq-answer ${openFaqIndex === index ? 'smart-select-faq-answer-open' : ''}`}>
                                <p>{faq.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            )}
            <Toaster position="top-right" />
        </div>
    );
};

const SmartSelectPageWithSuspense = () => {
    return (
        <Suspense fallback={
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                background: '#f8fafc'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <CircularProgress />
                    <p style={{ marginTop: '16px', color: '#64748b' }}>Loading...</p>
                </div>
            </div>
        }>
            <SmartSelectPage />
        </Suspense>
    );
};

export default SmartSelectPageWithSuspense;

