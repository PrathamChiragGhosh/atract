"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { useSmartSelectPayments } from '@/hooks/useSmartSelect';
import { FaArrowLeft, FaSearch, FaFilter, FaCalendarAlt, FaRupeeSign, FaCheckCircle, FaTimesCircle, FaClock, FaHistory, FaExclamationTriangle } from 'react-icons/fa';
import { CircularProgress } from '@mui/material';
import './page.css';

const SmartSelectTransactions = () => {
    const router = useRouter();
    const { data: payments = [], isLoading: loading, error, isError, isFetching } = useSmartSelectPayments();
    
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // all, paid, pending, failed
    const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month, year
    const [showFilters, setShowFilters] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    // Track when data has been loaded for the first time
    useEffect(() => {
        // Mark as loaded once the query completes (either with data or error)
        // This happens when isFetching becomes false after being true
        if (!isFetching && !hasLoadedOnce) {
            // Query has completed - we have data (even if empty array) or an error
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
                payment.transactionId?.toLowerCase().includes(searchLower) ||
                payment.orderId?.toLowerCase().includes(searchLower) ||
                payment.paymentId?.toLowerCase().includes(searchLower) ||
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
            return <FaCheckCircle className="smart-select-transaction-status-icon smart-select-transaction-status-success" />;
        } else if (statusLower === "pending") {
            return <FaClock className="smart-select-transaction-status-icon smart-select-transaction-status-pending" />;
        } else {
            return <FaTimesCircle className="smart-select-transaction-status-icon smart-select-transaction-status-failed" />;
        }
    };

    const getStatusClass = (status) => {
        const statusLower = status?.toLowerCase();
        if (statusLower === "paid" || statusLower === "completed" || statusLower === "succeeded") {
            return "smart-select-transaction-status-success";
        } else if (statusLower === "pending") {
            return "smart-select-transaction-status-pending";
        } else {
            return "smart-select-transaction-status-failed";
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
            <div className="smart-select-transaction-history-container">
                <div className="smart-select-transaction-history-header">
                    <button 
                        className="smart-select-transaction-back-btn" 
                        onClick={() => router.push("/employer/smart-select")}
                    >
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    <div className="smart-select-transaction-header-content">
                        <div className="smart-select-transaction-header-left">
                            <FaHistory className="smart-select-transaction-header-icon" />
                            <div>
                                <h1 className="smart-select-transaction-title">
                                    Transaction History
                                    <span className="smart-select-transaction-type-badge">
                                        Smart Select
                                    </span>
                                </h1>
                                <p className="smart-select-transaction-subtitle">
                                    View and manage all your payment transactions for Smart Select
                                </p>
                            </div>
                        </div>
                        <div className="smart-select-transaction-header-stats">
                            <div className="smart-select-transaction-stat-item">
                                <span className="smart-select-transaction-stat-label">Total</span>
                                <span className="smart-select-transaction-stat-value">-</span>
                            </div>
                            <div className="smart-select-transaction-stat-item">
                                <span className="smart-select-transaction-stat-label">Filtered</span>
                                <span className="smart-select-transaction-stat-value">-</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="smart-select-transaction-controls">
                    <div className="smart-select-transaction-search-bar">
                        <FaSearch className="smart-select-transaction-search-icon" />
                        <input
                            type="text"
                            className="smart-select-transaction-search-input"
                            placeholder="Search by plan, payment ID, amount, or status..."
                            value=""
                            onChange={() => {}}
                            disabled
                        />
                    </div>
                    <button
                        className="smart-select-transaction-filter-toggle"
                        disabled
                    >
                        <FaFilter />
                        <span>Filters</span>
                    </button>
                </div>

                {/* Loading State with Spinner */}
                <div className="smart-select-transaction-content">
                    <div className="smart-select-transaction-loading-state">
                        <CircularProgress size={48} />
                        <p className="smart-select-transaction-loading-text">Loading transactions...</p>
                    </div>
                </div>
                <Toaster position="top-right" />
            </div>
        );
    }

    if (isError && !loading) {
        return (
            <div className="smart-select-transaction-history-container">
                <div className="smart-select-transaction-error-screen">
                    <div className="smart-select-transaction-error-content">
                        <div className="smart-select-transaction-error-icon-wrapper">
                            <FaExclamationTriangle className="smart-select-transaction-error-icon" />
                        </div>
                        <h1 className="smart-select-transaction-error-title">Error Loading Transactions</h1>
                        <p className="smart-select-transaction-error-description">
                            {error?.response?.data?.message || error?.message || "Failed to load transaction history"}
                        </p>
                        <div className="smart-select-transaction-error-actions">
                            <button
                                className="smart-select-transaction-error-btn"
                                onClick={() => window.location.reload()}
                            >
                                <FaClock />
                                <span>Retry</span>
                            </button>
                            <button
                                className="smart-select-transaction-error-btn secondary"
                                onClick={() => router.push("/employer/smart-select")}
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
        <div className="smart-select-transaction-history-container">
            <div className="smart-select-transaction-history-header">
                <button 
                    className="smart-select-transaction-back-btn" 
                    onClick={() => router.push("/employer/smart-select")}
                >
                    <FaArrowLeft /> Back to Dashboard
                </button>
                <div className="smart-select-transaction-header-content">
                    <div className="smart-select-transaction-header-left">
                        <FaHistory className="smart-select-transaction-header-icon" />
                        <div>
                            <h1 className="smart-select-transaction-title">
                                Transaction History
                                <span className="smart-select-transaction-type-badge">
                                    Smart Select
                                </span>
                            </h1>
                            <p className="smart-select-transaction-subtitle">
                                View and manage all your payment transactions for Smart Select
                            </p>
                        </div>
                    </div>
                    <div className="smart-select-transaction-header-stats">
                        <div className="smart-select-transaction-stat-item">
                            <span className="smart-select-transaction-stat-label">Total</span>
                            <span className="smart-select-transaction-stat-value">{payments.length}</span>
                        </div>
                        <div className="smart-select-transaction-stat-item">
                            <span className="smart-select-transaction-stat-label">Filtered</span>
                            <span className="smart-select-transaction-stat-value">{filteredPayments.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="smart-select-transaction-controls">
                <div className="smart-select-transaction-search-bar">
                    <FaSearch className="smart-select-transaction-search-icon" />
                    <input
                        type="text"
                        className="smart-select-transaction-search-input"
                        placeholder="Search by plan, payment ID, amount, or status..."
                        value={searchTerm || ""}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            className="smart-select-transaction-clear-search"
                            onClick={() => setSearchTerm("")}
                            title="Clear search"
                        >
                            <FaTimesCircle />
                        </button>
                    )}
                </div>
                <button
                    className={`smart-select-transaction-filter-toggle ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                >
                    <FaFilter />
                    <span>Filters</span>
                    {hasActiveFilters && (
                        <span className="smart-select-transaction-filter-badge">1</span>
                    )}
                </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="smart-select-transaction-filter-panel">
                    <div className="smart-select-transaction-filter-group">
                        <label className="smart-select-transaction-filter-label">
                            <FaCalendarAlt /> Status
                        </label>
                        <div className="smart-select-transaction-filter-options">
                            <button
                                className={`smart-select-transaction-filter-option ${statusFilter === "all" ? "active" : ""}`}
                                onClick={() => setStatusFilter("all")}
                            >
                                All
                            </button>
                            <button
                                className={`smart-select-transaction-filter-option ${statusFilter === "paid" ? "active" : ""}`}
                                onClick={() => setStatusFilter("paid")}
                            >
                                Paid
                            </button>
                            <button
                                className={`smart-select-transaction-filter-option ${statusFilter === "pending" ? "active" : ""}`}
                                onClick={() => setStatusFilter("pending")}
                            >
                                Pending
                            </button>
                            <button
                                className={`smart-select-transaction-filter-option ${statusFilter === "failed" ? "active" : ""}`}
                                onClick={() => setStatusFilter("failed")}
                            >
                                Failed
                            </button>
                        </div>
                    </div>
                    <div className="smart-select-transaction-filter-group">
                        <label className="smart-select-transaction-filter-label">
                            <FaCalendarAlt /> Date Range
                        </label>
                        <div className="smart-select-transaction-filter-options">
                            <button
                                className={`smart-select-transaction-filter-option ${dateFilter === "all" ? "active" : ""}`}
                                onClick={() => setDateFilter("all")}
                            >
                                All Time
                            </button>
                            <button
                                className={`smart-select-transaction-filter-option ${dateFilter === "today" ? "active" : ""}`}
                                onClick={() => setDateFilter("today")}
                            >
                                Today
                            </button>
                            <button
                                className={`smart-select-transaction-filter-option ${dateFilter === "week" ? "active" : ""}`}
                                onClick={() => setDateFilter("week")}
                            >
                                This Week
                            </button>
                            <button
                                className={`smart-select-transaction-filter-option ${dateFilter === "month" ? "active" : ""}`}
                                onClick={() => setDateFilter("month")}
                            >
                                This Month
                            </button>
                            <button
                                className={`smart-select-transaction-filter-option ${dateFilter === "year" ? "active" : ""}`}
                                onClick={() => setDateFilter("year")}
                            >
                                This Year
                            </button>
                        </div>
                    </div>
                    {hasActiveFilters && (
                        <button className="smart-select-transaction-clear-filters" onClick={clearFilters}>
                            Clear All Filters
                        </button>
                    )}
                </div>
            )}

            {/* Transactions List */}
            <div className="smart-select-transaction-content">
                {filteredPayments.length === 0 ? (
                    <div className="smart-select-transaction-empty-state">
                        <FaHistory className="smart-select-transaction-empty-icon" />
                        <h3 className="smart-select-transaction-empty-title">
                            {hasActiveFilters ? "No transactions found" : "No transactions yet"}
                        </h3>
                        <p className="smart-select-transaction-empty-description">
                            {hasActiveFilters
                                ? "Try adjusting your filters or search terms"
                                : "Your payment history will appear here once you make a purchase"}
                        </p>
                        {hasActiveFilters && (
                            <button className="smart-select-transaction-empty-btn" onClick={clearFilters}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="smart-select-transaction-list">
                        {filteredPayments.map((payment, index) => {
                            const transactionId = payment.transactionId || payment.orderId || payment.paymentId || payment.sessionId;
                            return (
                            <div key={transactionId || payment._id || index} className="smart-select-transaction-card">
                                <div className="smart-select-transaction-card-header">
                                    <div className="smart-select-transaction-card-left">
                                        <div className="smart-select-transaction-icon-wrapper">
                                            {getStatusIcon(payment.status)}
                                        </div>
                                        <div className="smart-select-transaction-card-info">
                                            <h3 className="smart-select-transaction-card-title">
                                                {payment.planType ? payment.planType.charAt(0).toUpperCase() + payment.planType.slice(1) : "Smart Select Plan"}
                                            </h3>
                                            <div className="smart-select-transaction-card-meta">
                                                <span className="smart-select-transaction-meta-item">
                                                    <FaCalendarAlt />
                                                    {new Date(payment.createdAt).toLocaleDateString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </span>
                                                {transactionId && (
                                                    <span className="smart-select-transaction-meta-item">
                                                        {payment.orderId ? 'Order' : payment.paymentId ? 'Payment' : 'ID'}: {transactionId.substring(0, 12)}...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="smart-select-transaction-card-right">
                                        <div className="smart-select-transaction-amount">
                                            <FaRupeeSign className="smart-select-transaction-amount-icon" />
                                            <span className="smart-select-transaction-amount-value">{payment.amount}</span>
                                        </div>
                                        <span className={`smart-select-transaction-status-badge ${getStatusClass(payment.status)}`}>
                                            {payment.status}
                                        </span>
                                    </div>
                                </div>
                                {payment.productType && (
                                    <div className="smart-select-transaction-card-footer">
                                        <span className="smart-select-transaction-product-type">
                                            Product: {payment.productType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <Toaster position="top-right" />
        </div>
    );
};

export default SmartSelectTransactions;

