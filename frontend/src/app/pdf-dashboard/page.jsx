'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  Crown,
  Calendar,
  FileText,
  TrendingUp,
  CreditCard,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentForm from '@/components/PaymentForm';
import { ensureUserEmail, setUserEmail, getUserEmail } from '@/lib/pdfUserId';
import { pdfApi } from '@/lib/pdfApi';
import './dashboard.css';

export default function PdfDashboardPage() {
  const [userStats, setUserStats] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [userEmail, setUserEmailState] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showAllActiveSubscriptions, setShowAllActiveSubscriptions] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const email = ensureUserEmail();
      if (email) {
        setUserEmailState(email);
        await loadData();
      } else {
        setLoading(false);
        setShowEmailInput(true);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (showPaymentForm && selectedPlan) {
      const currentEmail = ensureUserEmail();
      if (!currentEmail) {
        setShowPaymentForm(false);
        setPendingAction('selectPlan');
        setShowEmailInput(true);
        toast.error('Please enter your email address to proceed with payment');
      }
    }
  }, [showPaymentForm, selectedPlan]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const email = ensureUserEmail();
        if (email) {
          loadData();
        }
      }
    };

    const handleFocus = () => {
      const email = ensureUserEmail();
      if (email) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (userEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      setUserEmail(userEmail);
      setShowEmailInput(false);
      await loadData();
      if (pendingAction === 'selectPlan' && selectedPlan) {
        setShowSubscriptionModal(false);
        setShowPaymentForm(true);
        setPendingAction(null);
      } else if (pendingAction === 'subscribe') {
        setShowSubscriptionModal(true);
        setPendingAction(null);
      }
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  const loadData = async () => {
    const email = ensureUserEmail();
    if (!email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [statsResponse, plansResponse] = await Promise.all([
        pdfApi.getStats(),
        pdfApi.getPlans(),
      ]);

      if (statsResponse.success) {
        setUserStats(statsResponse.stats);
      }
      if (plansResponse.success) {
        setSubscriptionPlans(plansResponse.plans);
      }
    } catch (error) {
      if (error.response?.status !== 400) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan) => {
    const currentEmail = ensureUserEmail();
    if (!currentEmail) {
      setPendingAction('selectPlan');
      setSelectedPlan(plan);
      setShowEmailInput(true);
      toast.error('Please enter your email address to subscribe');
      return;
    }

    setSelectedPlan(plan);
    setShowSubscriptionModal(false);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async (paymentData) => {
    setSubscribing(true);
    try {
      const response = await pdfApi.createSubscription({
        planType: paymentData.planType,
        paymentData: {
          cardNumber: paymentData.cardNumber,
          cardHolderName: paymentData.cardHolderName,
          expiryMonth: paymentData.expiryMonth,
          expiryYear: paymentData.expiryYear,
          cvv: paymentData.cvv,
        },
      });
      if (response.success) {
        toast.success(response.message || 'Subscription activated successfully!');
        setShowPaymentForm(false);
        setSelectedPlan(null);
        await loadData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
      throw error;
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <main className="pdf-dashboard-page">
        <div className="pdf-dashboard-container">
          <div className="pdf-dashboard-loading">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pdf-dashboard-page">
      <div className="pdf-dashboard-container">
        {/* Header */}
        <div className="pdf-dashboard-header">
          <h1 className="pdf-dashboard-title">
            Your <span className="pdf-dashboard-title-highlight">Dashboard</span>
          </h1>
          <p className="pdf-dashboard-subtitle">
            Track your PDF compression usage and manage your subscription
          </p>
        </div>

        {/* Email Input Modal */}
        {showEmailInput && (
          <div className="pdf-dashboard-modal-overlay">
            <div className="pdf-dashboard-modal-content">
              <div className="pdf-dashboard-modal-header">
                <h2 className="pdf-dashboard-modal-title">Email Required</h2>
                <button
                  onClick={() => setShowEmailInput(false)}
                  className="pdf-dashboard-modal-close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="pdf-dashboard-modal-description">
                Please enter your email address to continue. This will be used to track your usage and subscriptions.
              </p>

              {ensureUserEmail() && (
                <div className="pdf-dashboard-email-existing">
                  <p className="pdf-dashboard-email-existing-text">
                    <strong>Current email:</strong> {ensureUserEmail()}
                  </p>
                  <button
                    onClick={async () => {
                      const email = ensureUserEmail();
                      if (email) {
                        setUserEmailState(email);
                        setShowEmailInput(false);
                        await loadData();
                        if (pendingAction === 'selectPlan' && selectedPlan) {
                          setShowSubscriptionModal(false);
                          setShowPaymentForm(true);
                          setPendingAction(null);
                        } else if (pendingAction === 'subscribe') {
                          setShowSubscriptionModal(true);
                          setPendingAction(null);
                        }
                      }
                    }}
                    className="pdf-dashboard-email-continue-btn"
                  >
                    Continue with {ensureUserEmail()}
                  </button>
                </div>
              )}

              {ensureUserEmail() && (
                <div className="pdf-dashboard-email-divider">OR</div>
              )}

              <form onSubmit={handleEmailSubmit} className="pdf-dashboard-email-form">
                <div className="pdf-dashboard-email-field">
                  <label className="pdf-dashboard-email-label">
                    {ensureUserEmail() ? 'Enter a different email' : 'Enter your email'}
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmailState(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    className="pdf-dashboard-email-input"
                    autoFocus={!ensureUserEmail()}
                  />
                </div>
                <div className="pdf-dashboard-email-buttons">
                  <button
                    type="button"
                    onClick={() => setShowEmailInput(false)}
                    className="pdf-dashboard-email-button pdf-dashboard-email-button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="pdf-dashboard-email-button pdf-dashboard-email-button-primary"
                  >
                    Continue
                  </button>
                </div>
              </form>
              <p className="pdf-dashboard-email-note">
                Your email is stored locally in your browser and sent with requests to identify you.
              </p>
            </div>
          </div>
        )}

        {/* Usage Stats */}
        {userStats && (
          <div className="pdf-dashboard-stats-card">
            <h2 className="pdf-dashboard-stats-title">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Usage Statistics
            </h2>
            <div className="pdf-dashboard-stats-grid">
              <div className="pdf-dashboard-stat-card pdf-dashboard-stat-card-blue">
                <div className="pdf-dashboard-stat-header">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div className="pdf-dashboard-stat-label">Daily Compressions Used</div>
                </div>
                <div className="pdf-dashboard-stat-value">
                  {userStats.dailyCompressionsUsed}
                </div>
              </div>
              <div className="pdf-dashboard-stat-card pdf-dashboard-stat-card-green">
                <div className="pdf-dashboard-stat-header">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <div className="pdf-dashboard-stat-label">Remaining Today</div>
                </div>
                <div className="pdf-dashboard-stat-value">
                  {userStats.dailyCompressionsRemaining}
                </div>
              </div>
              <div className="pdf-dashboard-stat-card pdf-dashboard-stat-card-purple">
                <div className="pdf-dashboard-stat-header">
                  <FileText className="w-6 h-6 text-purple-600" />
                  <div className="pdf-dashboard-stat-label">Total Compressions</div>
                </div>
                <div className="pdf-dashboard-stat-value">
                  {userStats.totalCompressionsUsed}
                </div>
              </div>
            </div>

            {/* Active Subscriptions Table */}
            {(() => {
              // Get all active subscriptions from allSubscriptions array
              // Include subscriptions even if compression limit is reached but not expired
              let activeSubscriptions = [];

              if (userStats.allSubscriptions && Array.isArray(userStats.allSubscriptions)) {
                const now = new Date();
                activeSubscriptions = userStats.allSubscriptions.filter(sub => {
                  // Include if status is active/pre-subscribed
                  if (sub.status === 'pre-subscribed') return true;

                  // Include if status is active AND not expired (check endDate)
                  if (sub.status === 'active' && sub.endDate) {
                    const endDate = new Date(sub.endDate);
                    return now <= endDate;
                  }
                  return sub.status === 'active';
                });
              }

              // If no active subscriptions in allSubscriptions but we have a subscription object, use it
              if (activeSubscriptions.length === 0 && userStats.subscription) {
                // Convert subscription object to array format
                const now = new Date();
                const endDate = userStats.subscription.endDate ? new Date(userStats.subscription.endDate) : null;
                // Only add if not expired
                if (!endDate || now <= endDate) {
                  activeSubscriptions = [{
                    id: 'current',
                    planType: userStats.subscription.planType,
                    used: userStats.subscription.used,
                    totalAllowed: userStats.subscription.totalAllowed,
                    remaining: userStats.subscription.remaining,
                    startDate: userStats.subscription.startDate,
                    endDate: userStats.subscription.endDate,
                    status: 'active',
                    amount: userStats.subscription.amount,
                  }];
                }
              }

              if (activeSubscriptions.length === 0) {
                return null;
              }

              const INITIAL_DISPLAY_COUNT = 2;
              const hasMorePlans = activeSubscriptions.length > INITIAL_DISPLAY_COUNT;
              const displayedSubscriptions = showAllActiveSubscriptions
                ? activeSubscriptions
                : activeSubscriptions.slice(0, INITIAL_DISPLAY_COUNT);

              return (
                <div style={{ marginTop: '24px' }}>
                  <div className="pdf-dashboard-subscription-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Crown className="w-6 h-6 text-yellow-500" />
                      <h3 className="pdf-dashboard-subscription-title">
                        My Subscriptions ({activeSubscriptions.length})
                      </h3>
                    </div>
                  </div>

                  <div className="pdf-dashboard-active-subscriptions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {displayedSubscriptions.map((sub, index) => (
                      <div
                        key={sub.id || `active-${index}`}
                        style={{
                          background: 'white',
                          borderRadius: '12px',
                          border: sub.status === 'active' ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                          padding: '20px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Status Badge */}
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: sub.status === 'active' ? '#eff6ff' : '#fffbeb',
                          color: sub.status === 'active' ? '#1d4ed8' : '#b45309',
                          textTransform: 'capitalize'
                        }}>
                          {sub.status === 'pre-subscribed' ? 'Queued' : sub.status}
                        </div>

                        {/* Plan Header */}
                        <div style={{ marginBottom: '16px' }}>
                          <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {sub.planType} Plan
                            {sub.amount && <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>₹{sub.amount}</span>}
                          </h4>
                        </div>

                        {/* Usage Stats (if Active) */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px', color: '#4b5563' }}>
                            <span>Compressions Used</span>
                            <span style={{ fontWeight: '600' }}>{sub.used} / {sub.totalAllowed}</span>
                          </div>
                          <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(((sub.used || 0) / (sub.totalAllowed || 1)) * 100, 100)}%`,
                                height: '100%',
                                backgroundColor: sub.remaining === 0 ? '#ef4444' : '#3b82f6',
                                borderRadius: '4px',
                                transition: 'width 0.5s ease'
                              }}
                            />
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '13px', color: sub.remaining === 0 ? '#ef4444' : '#059669', fontWeight: '500' }}>
                            {sub.remaining} remaining
                          </div>
                        </div>

                        {/* Dates Footer */}
                        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#6b7280' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar className="w-4 h-4" />
                            <span>Started: {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'Pending'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar className="w-4 h-4" />
                            <span>Expires: {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'Pending'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>


                  {/* See More / See Less Button */}
                  {
                    hasMorePlans && (
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => setShowAllActiveSubscriptions(!showAllActiveSubscriptions)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            margin: '0 auto'
                          }}
                        >
                          {showAllActiveSubscriptions ? (
                            <>See Less <TrendingUp className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} /></>
                          ) : (
                            <>See More ({activeSubscriptions.length - INITIAL_DISPLAY_COUNT} more) <TrendingUp className="w-4 h-4" /></>
                          )}
                        </button>
                      </div>
                    )
                  }

                  {/* View History Button (Moved below table) */}
                  {
                    userStats.allSubscriptions && userStats.allSubscriptions.some(sub => ['expired', 'completed', 'cancelled'].includes(sub.status)) && (
                      <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                        <button
                          onClick={() => setShowHistoryModal(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#6b7280',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Calendar className="w-4 h-4" />
                          View History
                        </button>
                      </div>
                    )
                  }
                </div>
              );
            })()}

            {/* Free Plan - Show only if no active subscriptions */}
            {(!userStats.allSubscriptions || userStats.allSubscriptions.filter(sub => sub.status === 'active').length === 0) && !userStats.subscription && (
              <div className="pdf-dashboard-subscription-free">
                <div className="pdf-dashboard-subscription-free-header">
                  <Crown className="w-6 h-6 text-yellow-600" />
                  <h3 className="pdf-dashboard-subscription-free-title">Free Plan</h3>
                </div>
                <p className="pdf-dashboard-subscription-free-text">
                  You are currently on the free plan. You can compress 1 PDF per day.
                </p>
                <button
                  onClick={() => {
                    const currentEmail = ensureUserEmail();
                    if (!currentEmail) {
                      setPendingAction('subscribe');
                      setShowEmailInput(true);
                      toast.error('Please enter your email address to subscribe');
                      return;
                    }
                    setShowSubscriptionModal(true);
                  }}
                  className="pdf-dashboard-subscription-upgrade-btn"
                >
                  <CreditCard className="w-5 h-5" />
                  Upgrade Now
                </button>
              </div>
            )}

            {/* All Subscriptions List Removed as per user request (replaced by History Modal) */}


            {/* History Modal */}
            {showHistoryModal && userStats.allSubscriptions && (() => {
              const historySubscriptions = userStats.allSubscriptions.filter(sub =>
                ['expired', 'completed', 'cancelled'].includes(sub.status)
              );

              return (
                <div className="pdf-dashboard-modal-overlay" onClick={() => setShowHistoryModal(false)}>
                  <div className="pdf-dashboard-modal-content pdf-dashboard-modal-content-large" onClick={e => e.stopPropagation()}>
                    <div className="pdf-dashboard-modal-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Calendar className="w-6 h-6 text-gray-500" />
                        <h2 className="pdf-dashboard-modal-title">Subscription History</h2>
                      </div>
                      <button onClick={() => setShowHistoryModal(false)} className="pdf-dashboard-modal-close">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    {historySubscriptions.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', maxHeight: '60vh', overflowY: 'auto', padding: '4px' }}>
                        {historySubscriptions.map((sub, index) => (
                          <div
                            key={sub.id || `history-${index}`}
                            style={{
                              background: 'white',
                              borderRadius: '12px',
                              border: '1px solid #e5e7eb',
                              padding: '20px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              position: 'relative'
                            }}
                          >
                            {/* Status Badge */}
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: '#f3f4f6',
                              color: '#6b7280',
                              textTransform: 'capitalize'
                            }}>
                              {sub.status}
                            </div>

                            {/* Plan Header */}
                            <div style={{ marginBottom: '12px' }}>
                              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#374151', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {sub.planType} Plan
                              </h4>
                              <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginTop: '2px' }}>
                                ₹{sub.amount} • {sub.used} / {sub.compressionsAllowed || sub.totalAllowed} used
                              </div>
                            </div>

                            {/* Dates Footer */}
                            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#9ca3af' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar className="w-3 h-3" />
                                <span>Started: {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '-'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar className="w-3 h-3" />
                                <span>Ended: {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '-'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        <p>No subscription history found.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Subscription Plans */}
        <div className="pdf-dashboard-plans-card">
          <div className="pdf-dashboard-plans-header">
            <h2 className="pdf-dashboard-plans-title">Subscription Plans</h2>
            <p className="pdf-dashboard-plans-subtitle">Choose a plan that fits your needs</p>
          </div>

          <div className="pdf-dashboard-plans-grid">
            {subscriptionPlans.map((plan) => (
              <div
                key={plan.type}
                className={`pdf-dashboard-plan-card pdf-dashboard-plan-card-${plan.type}`}
              >
                <div className="pdf-dashboard-plan-header">
                  <h3 className="pdf-dashboard-plan-name">{plan.name}</h3>
                  <div className="pdf-dashboard-plan-price">
                    ₹{plan.amount}
                  </div>
                  <div className="pdf-dashboard-plan-duration">{plan.duration}</div>
                </div>
                <div className="pdf-dashboard-plan-features">
                  <div className="pdf-dashboard-plan-feature">
                    <FileText className="w-5 h-5 text-green-500" />
                    <span>{plan.compressionsAllowed} PDF compressions</span>
                  </div>
                  <div className="pdf-dashboard-plan-description">{plan.description}</div>
                </div>
                <button
                  onClick={() => {
                    const currentEmail = ensureUserEmail();
                    if (!currentEmail) {
                      setPendingAction('selectPlan');
                      setSelectedPlan(plan);
                      setShowEmailInput(true);
                      toast.error('Please enter your email address to subscribe');
                      return;
                    }
                    handlePlanSelect(plan);
                  }}
                  disabled={subscribing}
                  className={`pdf-dashboard-plan-button pdf-dashboard-plan-button-${plan.type}`}
                >
                  <CreditCard className="w-5 h-5" />
                  Subscribe Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Modal */}
        {showSubscriptionModal && (
          <div className="pdf-dashboard-modal-overlay">
            <div className="pdf-dashboard-modal-content pdf-dashboard-modal-content-large">
              <div className="pdf-dashboard-modal-header">
                <h2 className="pdf-dashboard-modal-title">Choose a Subscription Plan</h2>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="pdf-dashboard-modal-close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="pdf-dashboard-modal-body">
                <div className="pdf-dashboard-plans-grid">
                  {subscriptionPlans.map((plan) => (
                    <div
                      key={plan.type}
                      className={`pdf-dashboard-plan-card pdf-dashboard-plan-card-${plan.type}`}
                    >
                      <div className="pdf-dashboard-plan-header">
                        <h3 className="pdf-dashboard-plan-name">{plan.name}</h3>
                        <div className="pdf-dashboard-plan-price">
                          ₹{plan.amount}
                        </div>
                        <div className="pdf-dashboard-plan-duration">{plan.duration}</div>
                      </div>
                      <div className="pdf-dashboard-plan-features">
                        <div className="pdf-dashboard-plan-feature">
                          <FileText className="w-5 h-5 text-green-500" />
                          <span>{plan.compressionsAllowed} PDF compressions</span>
                        </div>
                        <div className="pdf-dashboard-plan-description">{plan.description}</div>
                      </div>
                      <button
                        onClick={() => {
                          const currentEmail = ensureUserEmail();
                          if (!currentEmail) {
                            setPendingAction('selectPlan');
                            setSelectedPlan(plan);
                            setShowSubscriptionModal(false);
                            setShowEmailInput(true);
                            toast.error('Please enter your email address to subscribe');
                            return;
                          }
                          setShowSubscriptionModal(false);
                          handlePlanSelect(plan);
                        }}
                        disabled={subscribing}
                        className={`pdf-dashboard-plan-button pdf-dashboard-plan-button-${plan.type}`}
                      >
                        <CreditCard className="w-5 h-5" />
                        Subscribe Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Payment Form Modal */}
        {showPaymentForm && selectedPlan && ensureUserEmail() && (
          <div className="pdf-dashboard-modal-overlay">
            <PaymentForm
              planType={selectedPlan.type}
              planName={selectedPlan.name}
              amount={selectedPlan.amount}
              onSuccess={() => {
                setShowPaymentForm(false);
                setSelectedPlan(null);
              }}
              onCancel={() => {
                setShowPaymentForm(false);
                setSelectedPlan(null);
              }}
              onSubmit={handlePaymentSubmit}
              onEmailRequired={() => {
                setPendingAction('selectPlan');
                setShowEmailInput(true);
              }}
            />
          </div>
        )}

        {/* All Active Subscriptions Modal */}
        {showAllActiveSubscriptions && userStats && (() => {
          // Get all active subscriptions (including those with limit reached but not expired)
          let allActiveSubscriptions = [];

          if (userStats.allSubscriptions && Array.isArray(userStats.allSubscriptions)) {
            const now = new Date();
            allActiveSubscriptions = userStats.allSubscriptions.filter(sub => {
              // Include if status is active AND not expired (check endDate)
              if (sub.status === 'active' && sub.endDate) {
                const endDate = new Date(sub.endDate);
                return now <= endDate;
              }
              return sub.status === 'active';
            });
          }

          // If no active subscriptions in allSubscriptions but we have a subscription object, use it
          if (allActiveSubscriptions.length === 0 && userStats.subscription) {
            const now = new Date();
            const endDate = userStats.subscription.endDate ? new Date(userStats.subscription.endDate) : null;
            // Only add if not expired
            if (!endDate || now <= endDate) {
              allActiveSubscriptions = [{
                id: 'current',
                planType: userStats.subscription.planType,
                used: userStats.subscription.used,
                totalAllowed: userStats.subscription.totalAllowed,
                remaining: userStats.subscription.remaining,
                startDate: userStats.subscription.startDate,
                endDate: userStats.subscription.endDate,
                status: 'active',
              }];
            }
          }

          if (allActiveSubscriptions.length === 0) {
            return null;
          }

          return (
            <div className="pdf-dashboard-modal-overlay" onClick={() => setShowAllActiveSubscriptions(false)}>
              <div
                className="pdf-dashboard-all-subscriptions-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="pdf-dashboard-modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Crown className="w-6 h-6 text-yellow-500" />
                    <h2 className="pdf-dashboard-modal-title">
                      All Active Subscriptions ({allActiveSubscriptions.length})
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowAllActiveSubscriptions(false)}
                    className="pdf-dashboard-modal-close"
                    aria-label="Close modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="pdf-dashboard-all-subscriptions-content">
                  {allActiveSubscriptions.map((sub, index) => (
                    <div key={sub.id || `modal-active-${index}`} className="pdf-dashboard-subscription-active">
                      <div className="pdf-dashboard-subscription-details">
                        <div className="pdf-dashboard-subscription-detail">
                          <div className="pdf-dashboard-subscription-detail-label">Plan Type</div>
                          <div className="pdf-dashboard-subscription-detail-value capitalize">
                            {sub.planType}
                          </div>
                        </div>
                        <div className="pdf-dashboard-subscription-detail">
                          <div className="pdf-dashboard-subscription-detail-label">Compressions Used</div>
                          <div className="pdf-dashboard-subscription-detail-value">
                            {sub.used || 0} / {sub.totalAllowed || 0}
                          </div>
                        </div>
                        <div className="pdf-dashboard-subscription-detail">
                          <div className="pdf-dashboard-subscription-detail-label">Remaining</div>
                          <div className={`pdf-dashboard-subscription-detail-value ${(sub.remaining || 0) > 0 ? 'pdf-dashboard-subscription-remaining' : ''}`} style={(sub.remaining || 0) === 0 ? { color: '#dc2626' } : {}}>
                            {sub.remaining || 0} {(sub.remaining || 0) === 0 && ' (Limit Reached)'}
                          </div>
                        </div>
                        <div className="pdf-dashboard-subscription-detail">
                          <div className="pdf-dashboard-subscription-detail-label">
                            <Calendar className="w-4 h-4" />
                            Expires On
                          </div>
                          <div className="pdf-dashboard-subscription-detail-value">
                            {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                      {sub.startDate && (
                        <div className="pdf-dashboard-subscription-footer">
                          <div className="pdf-dashboard-subscription-footer-text">
                            <strong>Start Date:</strong>{' '}
                            {new Date(sub.startDate).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </main >
  );
}

