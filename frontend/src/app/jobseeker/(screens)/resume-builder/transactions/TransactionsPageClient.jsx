"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { useResumeBuilderPayments } from '@/hooks/useResumeBuilder';
import { FaArrowLeft, FaSearch, FaFilter, FaCalendarAlt, FaRupeeSign, FaCheckCircle, FaTimesCircle, FaClock, FaHistory, FaExclamationTriangle } from 'react-icons/fa';
import { CircularProgress } from '@mui/material';
import './page.css';

const ResumeBuilderTransactions = () => {
    const router = useRouter();
    const { data: payments = [], isLoading: loading, error, isError, isFetching } = useResumeBuilderPayments();
    
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // all, paid, pending, failed
    const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month, year
    const [showFilters, setShowFilters] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    // Track when data has been loaded for the first time
    useEffect(() => {
        if (!isFetching && !hasLoadedOnce) {
            setHasLoadedOnce(true);
        }
    }, [isFetching, hasLoadedOnce]);

    // Show toast for errors
    useEffect(() => {
        if (isError && error) {
            const errorMessage = error?.response?.data?.message 
                || error?.message 
                || 'Failed to load transaction history. Please try again.';
            toast.error(errorMessage);
        }
    }, [isError, error]);

    // Initialize filtered payments when payments data loads
    useEffect(() => {
        if (payments && payments.length > 0) {
            setFilteredPayments(payments);
        }
    }, [payments]);

    // Apply filters and search
    useEffect(() => {
        let filtered = [...payments];

        // Apply search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(payment => 
                payment.planType?.toLowerCase().includes(searchLower) ||
                payment.sessionId?.toLowerCase().includes(searchLower) ||
                payment.amount?.toString().includes(searchLower) ||
                payment.status?.toLowerCase().includes(searchLower)
            );
        }

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(payment => {
                const status = payment.status?.toLowerCase();
                if (statusFilter === "paid") {
                    return status === "paid" || status === "completed" || status === "succeeded";
                }
                return status === statusFilter.toLowerCase();
            });
        }

        // Apply date filter
        if (dateFilter !== "all") {
            const now = new Date();
            filtered = filtered.filter(payment => {
                const paymentDate = new Date(payment.createdAt);
                const diffTime = now - paymentDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                switch (dateFilter) {
                    case "today":
                        return diffDays === 0;
                    case "week":
                        return diffDays <= 7;
                    case "month":
                        return diffDays <= 30;
                    case "year":
                        return diffDays <= 365;
                    default:
                        return true;
                }
            });
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setFilteredPayments(filtered);
    }, [payments, searchTerm, statusFilter, dateFilter]);

    const getStatusIcon = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === "paid" || statusLower === "completed" || statusLower === "succeeded") {
            return <FaCheckCircle className="resumebuilder-transaction-status-icon resumebuilder-transaction-status-success" />;
        } else if (statusLower === "pending") {
            return <FaClock className="resumebuilder-transaction-status-icon resumebuilder-transaction-status-pending" />;
        } else {
            return <FaTimesCircle className="resumebuilder-transaction-status-icon resumebuilder-transaction-status-failed" />;
        }
    };

    const getStatusClass = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === "paid" || statusLower === "completed" || statusLower === "succeeded") {
            return "resumebuilder-transaction-status-success";
        } else if (statusLower === "pending") {
            return "resumebuilder-transaction-status-pending";
        } else {
            return "resumebuilder-transaction-status-failed";
        }
    };

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setDateFilter("all");
    };

    const hasActiveFilters = searchTerm.trim() || statusFilter !== "all" || dateFilter !== "all";

    // Show loading if actively loading, fetching, or if we haven't received the first response yet
    const showLoading = loading || isFetching || (!hasLoadedOnce && !isError);

    if (showLoading) {
        return (
            <div className="resumebuilder-transaction-history-container">
                <div className="resumebuilder-transaction-history-header">
                    <button 
                        className="resumebuilder-transaction-back-btn" 
                        onClick={() => router.push("/jobseeker/resume-builder")}
                    >
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    <div className="resumebuilder-transaction-header-content">
                        <div className="resumebuilder-transaction-header-left">
                            <FaHistory className="resumebuilder-transaction-header-icon" />
                            <div>
                                <h1 className="resumebuilder-transaction-title">
                                    Transaction History
                                    <span className="resumebuilder-transaction-type-badge">
                                        Resume Builder
                                    </span>
                                </h1>
                                <p className="resumebuilder-transaction-subtitle">
                                    View and manage all your payment transactions for Resume Builder
                                </p>
                            </div>
                        </div>
                        <div className="resumebuilder-transaction-header-stats">
                            <div className="resumebuilder-transaction-stat-item">
                                <span className="resumebuilder-transaction-stat-label">Total</span>
                                <span className="resumebuilder-transaction-stat-value">-</span>
                            </div>
                            <div className="resumebuilder-transaction-stat-item">
                                <span className="resumebuilder-transaction-stat-label">Filtered</span>
                                <span className="resumebuilder-transaction-stat-value">-</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="resumebuilder-transaction-controls">
                    <div className="resumebuilder-transaction-search-bar">
                        <FaSearch className="resumebuilder-transaction-search-icon" />
                        <input
                            type="text"
                            className="resumebuilder-transaction-search-input"
                            placeholder="Search by plan, payment ID, amount, or status..."
                            value=""
                            onChange={() => {}}
                            disabled
                        />
                    </div>
                    <button
                        className="resumebuilder-transaction-filter-toggle"
                        disabled
                    >
                        <FaFilter />
                        <span>Filters</span>
                    </button>
                </div>

                {/* Loading State with Spinner */}
                <div className="resumebuilder-transaction-content">
                    <div className="resumebuilder-transaction-loading-state">
                        <CircularProgress size={48} />
                        <p className="resumebuilder-transaction-loading-text">Loading transactions...</p>
                    </div>
                </div>
                <Toaster position="top-right" />
            </div>
        );
    }

    if (isError && !loading) {
        return (
            <div className="resumebuilder-transaction-history-container">
                <div className="resumebuilder-transaction-error-screen">
                    <div className="resumebuilder-transaction-error-content">
                        <div className="resumebuilder-transaction-error-icon-wrapper">
                            <FaExclamationTriangle className="resumebuilder-transaction-error-icon" />
                        </div>
                        <h1 className="resumebuilder-transaction-error-title">Error Loading Transactions</h1>
                        <p className="resumebuilder-transaction-error-description">
                            {error?.response?.data?.message || error?.message || "Failed to load transaction history"}
                        </p>
                        <div className="resumebuilder-transaction-error-actions">
                            <button
                                className="resumebuilder-transaction-error-btn"
                                onClick={() => window.location.reload()}
                            >
                                <FaClock />
                                <span>Retry</span>
                            </button>
                            <button
                                className="resumebuilder-transaction-error-btn secondary"
                                onClick={() => router.push("/jobseeker/resume-builder")}
                            >
                                <FaArrowLeft />
                                <span>Go Back</span>
                            </button>
                        </div>
                    </div>
                </div>
                <Toaster position="top-right" />
            </div>
        );
    }

    return (
        <div className="resumebuilder-transaction-history-container">
            <div className="resumebuilder-transaction-history-header">
                <button 
                    className="resumebuilder-transaction-back-btn" 
                    onClick={() => router.push("/jobseeker/resume-builder")}
                >
                    <FaArrowLeft /> Back to Dashboard
                </button>
                <div className="resumebuilder-transaction-header-content">
                    <div className="resumebuilder-transaction-header-left">
                        <FaHistory className="resumebuilder-transaction-header-icon" />
                        <div>
                            <h1 className="resumebuilder-transaction-title">
                                Transaction History
                                <span className="resumebuilder-transaction-type-badge">
                                    Resume Builder
                                </span>
                            </h1>
                            <p className="resumebuilder-transaction-subtitle">
                                View and manage all your payment transactions for Resume Builder
                            </p>
                        </div>
                    </div>
                    <div className="resumebuilder-transaction-header-stats">
                        <div className="resumebuilder-transaction-stat-item">
                            <span className="resumebuilder-transaction-stat-label">Total</span>
                            <span className="resumebuilder-transaction-stat-value">{payments.length}</span>
                        </div>
                        <div className="resumebuilder-transaction-stat-item">
                            <span className="resumebuilder-transaction-stat-label">Filtered</span>
                            <span className="resumebuilder-transaction-stat-value">{filteredPayments.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="resumebuilder-transaction-controls">
                <div className="resumebuilder-transaction-search-bar">
                    <FaSearch className="resumebuilder-transaction-search-icon" />
                    <input
                        type="text"
                        className="resumebuilder-transaction-search-input"
                        placeholder="Search by plan, payment ID, amount, or status..."
                        value={searchTerm || ""}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className="resumebuilder-transaction-clear-search"
                            onClick={() => setSearchTerm("")}
                            title="Clear search"
                        >
                            <FaTimesCircle />
                        </button>
                    )}
                </div>
                <button
                    className={`resumebuilder-transaction-filter-toggle ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <FaFilter />
                    <span>Filters</span>
                    {hasActiveFilters && (
                        <span className="resumebuilder-transaction-filter-badge">1</span>
                    )}
                </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="resumebuilder-transaction-filter-panel">
                    <div className="resumebuilder-transaction-filter-group">
                        <label className="resumebuilder-transaction-filter-label">
                            <FaCalendarAlt /> Status
                        </label>
                        <div className="resumebuilder-transaction-filter-options">
                            <button
                                className={`resumebuilder-transaction-filter-option ${statusFilter === "all" ? "active" : ""}`}
                                onClick={() => setStatusFilter("all")}
                            >
                                All
                            </button>
                            <button
                                className={`resumebuilder-transaction-filter-option ${statusFilter === "paid" ? "active" : ""}`}
                                onClick={() => setStatusFilter("paid")}
                            >
                                Paid
                            </button>
                            <button
                                className={`resumebuilder-transaction-filter-option ${statusFilter === "pending" ? "active" : ""}`}
                                onClick={() => setStatusFilter("pending")}
                            >
                                Pending
                            </button>
                            <button
                                className={`resumebuilder-transaction-filter-option ${statusFilter === "failed" ? "active" : ""}`}
                                onClick={() => setStatusFilter("failed")}
                            >
                                Failed
                            </button>
                        </div>
                    </div>
                    <div className="resumebuilder-transaction-filter-group">
                        <label className="resumebuilder-transaction-filter-label">
                            <FaCalendarAlt /> Date Range
                        </label>
                        <div className="resumebuilder-transaction-filter-options">
                            <button
                                className={`resumebuilder-transaction-filter-option ${dateFilter === "all" ? "active" : ""}`}
                                onClick={() => setDateFilter("all")}
                            >
                                All Time
                            </button>
                            <button
                                className={`resumebuilder-transaction-filter-option ${dateFilter === "today" ? "active" : ""}`}
                                onClick={() => setDateFilter("today")}
                            >
                                Today
                            </button>
                            <button
                                className={`resumebuilder-transaction-filter-option ${dateFilter === "week" ? "active" : ""}`}
                                onClick={() => setDateFilter("week")}
                            >
                                This Week
                            </button>
                            <button
                                className={`resumebuilder-transaction-filter-option ${dateFilter === "month" ? "active" : ""}`}
                                onClick={() => setDateFilter("month")}
                            >
                                This Month
                            </button>
                            <button
                                className={`resumebuilder-transaction-filter-option ${dateFilter === "year" ? "active" : ""}`}
                                onClick={() => setDateFilter("year")}
                            >
                                This Year
                            </button>
                        </div>
                    </div>
                    {hasActiveFilters && (
                        <button className="resumebuilder-transaction-clear-filters" onClick={clearFilters}>
                            Clear All Filters
                        </button>
                    )}
                </div>
            )}

            {/* Transactions List */}
            <div className="resumebuilder-transaction-content">
                {filteredPayments.length === 0 ? (
                    <div className="resumebuilder-transaction-empty-state">
                        <FaHistory className="resumebuilder-transaction-empty-icon" />
                        <h3 className="resumebuilder-transaction-empty-title">
                            {hasActiveFilters ? "No transactions found" : "No transactions yet"}
                        </h3>
                        <p className="resumebuilder-transaction-empty-description">
                            {hasActiveFilters
                                ? "Try adjusting your filters or search terms"
                                : "Your payment history will appear here once you make a purchase"}
                        </p>
                        {hasActiveFilters && (
                            <button className="resumebuilder-transaction-empty-btn" onClick={clearFilters}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="resumebuilder-transaction-list">
                        {filteredPayments.map((payment, index) => (
                            <div key={payment.sessionId || payment._id || index} className="resumebuilder-transaction-card">
                                <div className="resumebuilder-transaction-card-header">
                                    <div className="resumebuilder-transaction-card-left">
                                        <div className="resumebuilder-transaction-icon-wrapper">
                                            {getStatusIcon(payment.status)}
                                        </div>
                                        <div className="resumebuilder-transaction-card-info">
                                            <h3 className="resumebuilder-transaction-card-title">
                                                {payment.planType ? payment.planType.charAt(0).toUpperCase() + payment.planType.slice(1) : "Resume Builder Plan"}
                                            </h3>
                                            <div className="resumebuilder-transaction-card-meta">
                                                <span className="resumebuilder-transaction-meta-item">
                                                    <FaCalendarAlt />
                                                    {new Date(payment.createdAt).toLocaleDateString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                                {payment.sessionId && (
                                                    <span className="resumebuilder-transaction-meta-item">
                                                        ID: {payment.sessionId.substring(0, 12)}...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="resumebuilder-transaction-card-right">
                                        <div className="resumebuilder-transaction-amount">
                                            <FaRupeeSign className="resumebuilder-transaction-amount-icon" />
                                            <span className="resumebuilder-transaction-amount-value">{payment.amount}</span>
                                        </div>
                                        <span className={`resumebuilder-transaction-status-badge ${getStatusClass(payment.status)}`}>
                                            {payment.status}
                                        </span>
                                    </div>
                                </div>
                                {payment.productType && (
                                    <div className="resumebuilder-transaction-card-footer">
                                        <span className="resumebuilder-transaction-product-type">
                                            Product: {payment.productType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Toaster position="top-right" />
        </div>
    );
};

export default ResumeBuilderTransactions;

