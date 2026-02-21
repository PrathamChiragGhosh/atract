"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysisData, useDashboardStats } from '@/hooks/useAdminDashboard';
import ChartComponent from '@/components/admin/ChartComponent';
import { chartThemes, getTheme, getThemeOptions } from '@/constants/chartThemes';
import {
    FaUsers, FaBuilding, FaUserTie, FaBriefcase,
    FaChartLine, FaArrowLeft, FaCalendarAlt, FaChevronDown,
    FaClock, FaCalendarWeek, FaCalendar, FaCalendarCheck,
    FaPalette
} from 'react-icons/fa';
import { CircularProgress } from '@mui/material';
import './analysis.css';

export default function AnalysisPage() {
    const router = useRouter();
    const [selectedChartData, setSelectedChartData] = useState('clients');
    const [chartType, setChartType] = useState('line');
    const [selectedTimePeriod, setSelectedTimePeriod] = useState('yearly');
    const [selectedTheme, setSelectedTheme] = useState('default');
    const [currentPeriodOffset, setCurrentPeriodOffset] = useState(0); // 0 = current, -1 = previous, 1 = next (not used)
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
    const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const timeDropdownRef = useRef(null);
    const themeDropdownRef = useRef(null);

    // Fetch analysis data with time period for charts
    const { data: analysisData, isLoading: analysisLoading, error: analysisError, refetch: refetchAnalysis } = useAnalysisData(selectedTimePeriod, selectedChartData, currentPeriodOffset);

    // Fetch dashboard stats for summary cards
    const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useDashboardStats();

    const stats = dashboardData?.data || {};
    const chartData = analysisData?.data?.chartData || {};
    const isLoading = analysisLoading || dashboardLoading;
    const error = analysisError || dashboardError;
    const refetch = () => {
        refetchAnalysis();
        refetchDashboard();
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
                setTimeDropdownOpen(false);
            }
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
                setThemeDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDataSourceChange = (dataSource) => {
        setSelectedChartData(dataSource);
        setDropdownOpen(false);
    };

    const handleTimePeriodChange = (timePeriod) => {
        setSelectedTimePeriod(timePeriod);
        setTimeDropdownOpen(false);
    };

    const handleThemeChange = (theme) => {
        setSelectedTheme(theme);
        setThemeDropdownOpen(false);
    };

    // Navigation functions
    const handlePreviousPeriod = () => {
        if (currentPeriodOffset > -12) { // Limit to 12 periods back
            setCurrentPeriodOffset(prev => prev - 1);
        }
    };

    const handleNextPeriod = () => {
        if (currentPeriodOffset < 0) { // Can't go to future
            setCurrentPeriodOffset(prev => prev + 1);
        }
    };

    const handleResetToCurrent = () => {
        setCurrentPeriodOffset(0);
    };

    const currentTheme = getTheme(selectedTheme);
    const themeOptions = getThemeOptions();

    const getChartData = () => {
        const selectedData = chartData[selectedChartData];

        if (chartType === 'pie') {
            // For pie charts, use status/distribution data
            const pieDataMap = {
                clients: selectedData?.status || {
                    labels: ['Active Clients', 'Inactive Clients'],
                    datasets: [{
                        data: [0, 0], // Will be populated by backend
                        backgroundColor: ['#10b981', '#ef4444'],
                        borderColor: ['#059669', '#dc2626'],
                        borderWidth: 2
                    }]
                },
                employers: {
                    labels: ['Employers'],
                    datasets: [{
                        data: [stats?.overview?.totalEmployers || 0],
                        backgroundColor: ['#3b82f6'],
                        borderColor: ['#2563eb'],
                        borderWidth: 2
                    }]
                },
                jobSeekers: selectedData?.profileCompletion || {
                    labels: ['Complete Profile', 'Has Resume Only', 'Basic Profile'],
                    datasets: [{
                        data: [0, 0, 0], // Will be populated by backend
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderColor: ['#059669', '#d97706', '#dc2626'],
                        borderWidth: 2
                    }]
                },
                jobs: selectedData?.status || {
                    labels: ['Active Jobs', 'Draft Jobs', 'Closed Jobs', 'Inactive Jobs'],
                    datasets: [{
                        data: [0, 0, 0, 0], // Will be populated by backend
                        backgroundColor: ['#10b981', '#f59e0b', '#6b7280', '#ef4444'],
                        borderColor: ['#059669', '#d97706', '#4b5563', '#dc2626'],
                        borderWidth: 2
                    }]
                }
            };
            return pieDataMap[selectedChartData] || { labels: [], datasets: [{ data: [] }] };
        } else {
            // For line/bar charts, use growth data
            return selectedData?.growth || { labels: [], datasets: [{ label: 'No Data', data: [] }] };
        }
    };

    // Allow all chart types for comprehensive analysis
    const availableChartTypes = ['line', 'bar', 'pie'];
    const handleChartTypeChange = (type) => {
        if (availableChartTypes.includes(type)) {
            setChartType(type);
        }
    };

    const getChartTitle = () => {
        const titles = {
            clients: 'Client Progress',
            employers: 'Employer Progress',
            jobSeekers: 'Job Seeker Progress',
            jobs: 'Job Progress'
        };
        const title = titles[selectedChartData] || 'Progress Analytics';
        const periodText = timePeriodLabels[selectedTimePeriod];

        // Add period indicator based on offset
        let periodIndicator = '';
        if (currentPeriodOffset < 0) {
            const periodsBack = Math.abs(currentPeriodOffset);
            periodIndicator = ` (${periodsBack} period${periodsBack > 1 ? 's' : ''} ago)`;
        } else if (currentPeriodOffset > 0) {
            periodIndicator = ' (Future)';
        }

        return `${title} - ${periodText}${periodIndicator}`;
    };

    const dataSourceOptions = [
        { value: 'clients', label: 'Clients', icon: FaUsers },
        { value: 'employers', label: 'Employers', icon: FaBuilding },
        { value: 'jobSeekers', label: 'Job Seekers', icon: FaUserTie },
        { value: 'jobs', label: 'Jobs', icon: FaBriefcase }
    ];

    const timePeriodOptions = [
        { value: 'daily', label: 'Daily', icon: FaClock },
        { value: 'weekly', label: 'Weekly', icon: FaCalendarWeek },
        { value: 'halfyearly', label: 'Half Yearly', icon: FaCalendar },
        { value: 'yearly', label: 'Yearly', icon: FaCalendarCheck }
    ];

    const timePeriodLabels = {
        daily: 'Last 7 Days',
        weekly: 'Last 4 Weeks',
        halfyearly: 'Last 6 Months',
        yearly: 'Last 12 Months'
    };

    if (isLoading) {
        return (
            <div className="analysis-container">
                <div className="analysis-loading">
                    <CircularProgress size={50} />
                    <p>Loading analysis data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analysis-container">
                <div className="analysis-error">
                    <FaChartLine size={48} color="#ef4444" />
                    <h2>Error Loading Analysis</h2>
                    <p>{error.message || 'Failed to load analysis data'}</p>
                    <button onClick={() => refetch()} className="analysis-retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="analysis-container">
            {/* Header */}
            <div className="analysis-header">
                <div className="analysis-header-left">
                    <button
                        onClick={() => router.back()}
                        className="analysis-back-btn"
                    >
                        <FaArrowLeft />
                        Back to Dashboard
                    </button>
                    <div>
                        <h1 className="analysis-title">Graphical Analysis</h1>
                        <p className="analysis-subtitle">Comprehensive data visualization and insights</p>
                    </div>
                </div>
                <div className="analysis-header-controls">
                    {/* Time Period Dropdown */}
                    <div className="analysis-dropdown" ref={timeDropdownRef}>
                        <button
                            onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                            className="analysis-dropdown-btn"
                        >
                            {(() => {
                                const option = timePeriodOptions.find(opt => opt.value === selectedTimePeriod);
                                const IconComponent = option?.icon;
                                return (
                                    <>
                                        <FaCalendarAlt />
                                        {option?.label}
                                        <FaChevronDown className={`dropdown-arrow ${timeDropdownOpen ? 'open' : ''}`} />
                                    </>
                                );
                            })()}
                        </button>
                        {timeDropdownOpen && (
                            <div className="analysis-dropdown-menu">
                                {timePeriodOptions.map((option) => {
                                    const IconComponent = option.icon;
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => handleTimePeriodChange(option.value)}
                                            className={`analysis-dropdown-item ${selectedTimePeriod === option.value ? 'active' : ''}`}
                                        >
                                            <IconComponent />
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Data Source Dropdown */}
                    <div className="analysis-dropdown" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="analysis-dropdown-btn"
                        >
                            {(() => {
                                const option = dataSourceOptions.find(opt => opt.value === selectedChartData);
                                const IconComponent = option?.icon;
                                return (
                                    <>
                                        {IconComponent && <IconComponent />}
                                        {option?.label}
                                        <FaChevronDown className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} />
                                    </>
                                );
                            })()}
                        </button>
                        {dropdownOpen && (
                            <div className="analysis-dropdown-menu">
                                {dataSourceOptions.map((option) => {
                                    const IconComponent = option.icon;
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => handleDataSourceChange(option.value)}
                                            className={`analysis-dropdown-item ${selectedChartData === option.value ? 'active' : ''}`}
                                        >
                                            <IconComponent />
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Theme Dropdown */}
                    <div className="analysis-dropdown" ref={themeDropdownRef}>
                        <button
                            onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                            className="analysis-dropdown-btn"
                        >
                            <FaPalette />
                            {currentTheme.name}
                            <FaChevronDown className={`dropdown-arrow ${themeDropdownOpen ? 'open' : ''}`} />
                        </button>
                        {themeDropdownOpen && (
                            <div className="analysis-dropdown-menu">
                                {themeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleThemeChange(option.value)}
                                        className={`analysis-dropdown-item ${selectedTheme === option.value ? 'active' : ''}`}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                display: 'flex',
                                                gap: '2px',
                                                flexWrap: 'wrap',
                                                maxWidth: '60px'
                                            }}>
                                                {option.colors.slice(0, 4).map((color, index) => (
                                                    <div
                                                        key={index}
                                                        style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            backgroundColor: color,
                                                            borderRadius: '1px'
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            {option.label}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="analysis-chart-section">
                <div className="analysis-chart-container">
                    <ChartComponent
                        data={getChartData()}
                        title={getChartTitle()}
                        type={chartType}
                        height={500}
                        onTypeChange={handleChartTypeChange}
                        loading={isLoading}
                        availableTypes={availableChartTypes}
                        theme={currentTheme}
                        showNavigation={true}
                        onPreviousPeriod={handlePreviousPeriod}
                        onNextPeriod={handleNextPeriod}
                        onResetToCurrent={handleResetToCurrent}
                        canGoPrevious={currentPeriodOffset > -12}
                        canGoNext={currentPeriodOffset < 0}
                        currentPeriodOffset={currentPeriodOffset}
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="analysis-summary">
                <div className="analysis-summary-grid">
                    <div className="analysis-summary-card">
                        <div className="analysis-summary-icon">
                            <FaUsers />
                        </div>
                        <div className="analysis-summary-content">
                            <h3>Total Clients</h3>
                            <p className="analysis-summary-value">{stats.overview?.totalClients || 0}</p>
                        </div>
                    </div>

                    <div className="analysis-summary-card">
                        <div className="analysis-summary-icon">
                            <FaBuilding />
                        </div>
                        <div className="analysis-summary-content">
                            <h3>Total Employers</h3>
                            <p className="analysis-summary-value">{stats.overview?.totalEmployers || 0}</p>
                        </div>
                    </div>

                    <div className="analysis-summary-card">
                        <div className="analysis-summary-icon">
                            <FaUserTie />
                        </div>
                        <div className="analysis-summary-content">
                            <h3>Total Job Seekers</h3>
                            <p className="analysis-summary-value">{stats.overview?.totalJobSeekers || 0}</p>
                        </div>
                    </div>

                    <div className="analysis-summary-card">
                        <div className="analysis-summary-icon">
                            <FaBriefcase />
                        </div>
                        <div className="analysis-summary-content">
                            <h3>Total Jobs</h3>
                            <p className="analysis-summary-value">{stats.overview?.totalJobs || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
