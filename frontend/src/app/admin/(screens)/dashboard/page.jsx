"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardStats } from '@/hooks/useAdminDashboard';
import ChartComponent from '@/components/admin/ChartComponent';
import {
    FaUsers, FaBuilding, FaUserTie, FaBriefcase, FaFileAlt,
    FaChartLine, FaCalendarAlt, FaCheckCircle, FaClock,
    FaTimesCircle, FaEye, FaMoneyBillWave, FaArrowUp,
    FaArrowDown, FaSpinner, FaExclamationTriangle, FaChartPie, FaChartBar,
    FaChartArea, FaChevronDown
} from 'react-icons/fa';
import { CircularProgress } from '@mui/material';
import './dashboard.css';

export default function AdminDashboardPage() {
    const router = useRouter();
    const { data, isLoading, error, refetch } = useDashboardStats();
    const [selectedModule, setSelectedModule] = useState(null);

    const stats = data?.data || {};
    const overview = stats.overview || {};
    const clients = stats.clients || {};
    const employers = stats.employers || {};
    const jobSeekers = stats.jobSeekers || {};
    const jobs = stats.jobs || {};
    const serviceJobs = stats.serviceJobs || {};
    const applications = stats.applications || {};
    const smartPosts = stats.smartPosts || {};
    const payments = stats.payments || {};
    const activities = stats.activities || [];
    const chartData = stats.chartData || {};

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        return num.toLocaleString();
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '₹0';
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const getStatusColor = (status) => {
        const colors = {
            'active': '#10b981',
            'inactive': '#ef4444',
            'open': '#3b82f6',
            'filled': '#10b981',
            'closed': '#6b7280',
            'draft': '#f59e0b',
            'pending': '#f59e0b',
            'reviewed': '#3b82f6',
            'shortlisted': '#10b981',
            'rejected': '#ef4444',
            'completed': '#10b981',
            'processing': '#3b82f6',
            'failed': '#ef4444'
        };
        return colors[status?.toLowerCase()] || '#6b7280';
    };

    const handleAnalyseClick = () => {
        router.push('/admin/analysis');
    };

    if (isLoading) {
        return (
            <div className="admin-dashboard-container">
                <div className="admin-dashboard-loading">
                    <CircularProgress size={50} />
                    <p>Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-dashboard-container">
                <div className="admin-dashboard-error">
                    <FaExclamationTriangle size={48} color="#ef4444" />
                    <h2>Error Loading Dashboard</h2>
                    <p>{error.message || 'Failed to load dashboard data'}</p>
                    <button onClick={() => refetch()} className="admin-dashboard-retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard-container">
            {/* Header */}
            <div className="admin-dashboard-header">
                <div>
                    <h1 className="admin-dashboard-title">Admin Dashboard</h1>
                    <p className="admin-dashboard-subtitle">Complete overview of all system activities</p>
                </div>
                <div className="admin-dashboard-header-actions">
                    <button
                        onClick={handleAnalyseClick}
                        className="admin-dashboard-analyse-btn"
                    >
                        <FaChartArea />
                        Analyse Graphically
                    </button>
                    <button onClick={() => refetch()} className="admin-dashboard-refresh-btn">
                        <FaChartLine /> Refresh
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="admin-dashboard-overview">
                <div className="admin-dashboard-card admin-dashboard-card-primary">
                    <div className="admin-dashboard-card-icon">
                        <FaUsers />
                    </div>
                    <div className="admin-dashboard-card-content">
                        <div className="admin-dashboard-card-label">Total Clients</div>
                        <div className="admin-dashboard-card-value">{formatNumber(overview.totalClients)}</div>
                        <div className="admin-dashboard-card-change positive">
                            <FaArrowUp /> {formatNumber(clients.today)} today
                        </div>
                    </div>
                </div>

                <div className="admin-dashboard-card admin-dashboard-card-secondary">
                    <div className="admin-dashboard-card-icon">
                        <FaBuilding />
                    </div>
                    <div className="admin-dashboard-card-content">
                        <div className="admin-dashboard-card-label">Total Employers</div>
                        <div className="admin-dashboard-card-value">{formatNumber(overview.totalEmployers)}</div>
                        <div className="admin-dashboard-card-change positive">
                            <FaArrowUp /> {formatNumber(employers.today)} today
                        </div>
                    </div>
                </div>

                <div className="admin-dashboard-card admin-dashboard-card-tertiary">
                    <div className="admin-dashboard-card-icon">
                        <FaUserTie />
                    </div>
                    <div className="admin-dashboard-card-content">
                        <div className="admin-dashboard-card-label">Total Job Seekers</div>
                        <div className="admin-dashboard-card-value">{formatNumber(overview.totalJobSeekers)}</div>
                        <div className="admin-dashboard-card-change positive">
                            <FaArrowUp /> {formatNumber(jobSeekers.today)} today
                        </div>
                    </div>
                </div>

                <div className="admin-dashboard-card admin-dashboard-card-quaternary">
                    <div className="admin-dashboard-card-icon">
                        <FaBriefcase />
                    </div>
                    <div className="admin-dashboard-card-content">
                        <div className="admin-dashboard-card-label">Total Jobs</div>
                        <div className="admin-dashboard-card-value">{formatNumber(overview.totalJobs)}</div>
                        <div className="admin-dashboard-card-change positive">
                            <FaArrowUp /> {formatNumber(jobs.today)} today
                        </div>
                    </div>
                </div>

                <div className="admin-dashboard-card admin-dashboard-card-primary">
                    <div className="admin-dashboard-card-icon">
                        <FaFileAlt />
                    </div>
                    <div className="admin-dashboard-card-content">
                        <div className="admin-dashboard-card-label">Total Applications</div>
                        <div className="admin-dashboard-card-value">{formatNumber(overview.totalApplications)}</div>
                        <div className="admin-dashboard-card-change positive">
                            <FaArrowUp /> {formatNumber(applications.today)} today
                        </div>
                    </div>
                </div>

                <div className="admin-dashboard-card admin-dashboard-card-success">
                    <div className="admin-dashboard-card-icon">
                        <FaMoneyBillWave />
                    </div>
                    <div className="admin-dashboard-card-content">
                        <div className="admin-dashboard-card-label">Total Revenue</div>
                        <div className="admin-dashboard-card-value">{formatCurrency(overview.totalRevenue)}</div>
                        <div className="admin-dashboard-card-change positive">
                            <FaArrowUp /> {formatCurrency(payments.revenueThisMonth)} this month
                        </div>
                    </div>
                </div>
            </div>

            {/* Module Sections */}
            <div className="admin-dashboard-modules">
                {/* Clients Module */}
                <div className="admin-dashboard-module">
                    <div className="admin-dashboard-module-header">
                        <h2><FaUsers /> Clients</h2>
                        <button 
                            onClick={() => setSelectedModule(selectedModule === 'clients' ? null : 'clients')}
                            className="admin-dashboard-toggle-btn"
                        >
                            {selectedModule === 'clients' ? 'Hide' : 'Show'} Details
                        </button>
                    </div>
                    <div className="admin-dashboard-module-stats">
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">Total:</span>
                            <span className="admin-dashboard-stat-value">{formatNumber(clients.total)}</span>
                        </div>
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">Active:</span>
                            <span className="admin-dashboard-stat-value" style={{ color: getStatusColor('active') }}>
                                {formatNumber(clients.active)}
                            </span>
                        </div>
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">This Month:</span>
                            <span className="admin-dashboard-stat-value">{formatNumber(clients.thisMonth)}</span>
                        </div>
                    </div>
                </div>

                {/* Employers Module */}
                <div className="admin-dashboard-module">
                    <div className="admin-dashboard-module-header">
                        <h2><FaBuilding /> Employers</h2>
                        <button 
                            onClick={() => setSelectedModule(selectedModule === 'employers' ? null : 'employers')}
                            className="admin-dashboard-toggle-btn"
                        >
                            {selectedModule === 'employers' ? 'Hide' : 'Show'} Details
                        </button>
                    </div>
                    <div className="admin-dashboard-module-stats">
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">Total:</span>
                            <span className="admin-dashboard-stat-value">{formatNumber(employers.total)}</span>
                        </div>
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">This Month:</span>
                            <span className="admin-dashboard-stat-value">{formatNumber(employers.thisMonth)}</span>
                        </div>
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">This Week:</span>
                            <span className="admin-dashboard-stat-value">{formatNumber(employers.thisWeek)}</span>
                        </div>
                    </div>
                </div>

                {/* Jobs Module */}
                <div className="admin-dashboard-module">
                    <div className="admin-dashboard-module-header">
                        <h2><FaBriefcase /> Jobs</h2>
                        <button 
                            onClick={() => setSelectedModule(selectedModule === 'jobs' ? null : 'jobs')}
                            className="admin-dashboard-toggle-btn"
                        >
                            {selectedModule === 'jobs' ? 'Hide' : 'Show'} Details
                        </button>
                    </div>
                    <div className="admin-dashboard-module-stats">
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">Total:</span>
                            <span className="admin-dashboard-stat-value">{formatNumber(jobs.total)}</span>
                        </div>
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">Active:</span>
                            <span className="admin-dashboard-stat-value" style={{ color: getStatusColor('active') }}>
                                {formatNumber(jobs.active)}
                            </span>
                        </div>
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">Draft:</span>
                            <span className="admin-dashboard-stat-value" style={{ color: getStatusColor('draft') }}>
                                {formatNumber(jobs.draft)}
                            </span>
                        </div>
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">Closed:</span>
                            <span className="admin-dashboard-stat-value" style={{ color: getStatusColor('closed') }}>
                                {formatNumber(jobs.closed)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Applications Module */}
                <div className="admin-dashboard-module">
                    <div className="admin-dashboard-module-header">
                        <h2><FaFileAlt /> Applications</h2>
                        <button 
                            onClick={() => setSelectedModule(selectedModule === 'applications' ? null : 'applications')}
                            className="admin-dashboard-toggle-btn"
                        >
                            {selectedModule === 'applications' ? 'Hide' : 'Show'} Details
                        </button>
                    </div>
                    <div className="admin-dashboard-module-stats">
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">Total:</span>
                            <span className="admin-dashboard-stat-value">{formatNumber(applications.total)}</span>
                        </div>
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">This Month:</span>
                            <span className="admin-dashboard-stat-value">{formatNumber(applications.thisMonth)}</span>
                        </div>
                        <div className="admin-dashboard-stat-item">
                            <span className="admin-dashboard-stat-label">This Week:</span>
                            <span className="admin-dashboard-stat-value">{formatNumber(applications.thisWeek)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activities */}
            <div className="admin-dashboard-activities">
                <h2><FaCalendarAlt /> Recent Activities</h2>
                <div className="admin-dashboard-activities-list">
                    {activities.length > 0 ? (
                        activities.map((activity, index) => (
                            <div key={index} className="admin-dashboard-activity-item">
                                <div className="admin-dashboard-activity-icon">
                                    {activity.type === 'job_created' && <FaBriefcase />}
                                    {activity.type === 'application_submitted' && <FaFileAlt />}
                                    {activity.type === 'client_created' && <FaUsers />}
                                </div>
                                <div className="admin-dashboard-activity-content">
                                    <div className="admin-dashboard-activity-title">{activity.title}</div>
                                    <div className="admin-dashboard-activity-description">{activity.description}</div>
                                    <div className="admin-dashboard-activity-time">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="admin-dashboard-no-activities">No recent activities</p>
                    )}
                </div>
            </div>
        </div>
    );
}
