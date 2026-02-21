"use client";

import React, { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { FaChartLine, FaChartPie, FaChartBar, FaArrowLeft, FaArrowRight, FaCalendarAlt } from 'react-icons/fa';
import './ChartComponent.css';

// Register Chart.js components globally
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const ChartComponent = ({
    data,
    title,
    type = 'line', // 'line', 'bar', 'pie'
    height = 300,
    showToggle = true,
    onTypeChange,
    loading = false,
    availableTypes = ['line', 'bar', 'pie'], // Control which chart types are available
    colors = [
        '#3b82f6', // blue
        '#ef4444', // red
        '#10b981', // green
        '#f59e0b', // amber
        '#8b5cf6', // violet
        '#06b6d4', // cyan
        '#84cc16', // lime
        '#f97316', // orange
    ],
    theme = null, // Theme object with colors, background, text, grid properties
    showNavigation = false, // Show navigation buttons
    onPreviousPeriod,
    onNextPeriod,
    onResetToCurrent,
    canGoPrevious = true,
    canGoNext = false,
    currentPeriodOffset = 0
}) => {
    const chartRef = useRef(null);

    // Get the colors to use (from theme or default)
    const getChartColors = () => {
        return theme?.colors || colors;
    };

    // Generate colors for pie chart
    const getPieColors = (dataLength) => {
        const chartColors = getChartColors();
        const colorsNeeded = dataLength;
        const pieColors = [];
        for (let i = 0; i < colorsNeeded; i++) {
            pieColors.push(chartColors[i % chartColors.length]);
        }
        return pieColors;
    };

    // Prepare chart data based on type
    const prepareChartData = () => {
        // Ensure data has the correct structure
        if (!data || !Array.isArray(data.labels) || !Array.isArray(data.datasets)) {
            return {
                labels: ['No Data'],
                datasets: [{
                    label: 'No Data',
                    data: [0],
                    backgroundColor: ['#e5e7eb'],
                    borderColor: ['#9ca3af'],
                    borderWidth: 1
                }]
            };
        }

        if (type === 'pie') {
            const pieData = data.datasets[0]?.data || [];
            const labels = data.labels || [];

            // Ensure we have data for pie chart
            if (pieData.length === 0 || labels.length === 0) {
                return {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e5e7eb'],
                        borderColor: ['#9ca3af'],
                        borderWidth: 2
                    }]
                };
            }

            return {
                labels: labels,
                datasets: [{
                    data: pieData,
                    backgroundColor: getPieColors(labels.length),
                    borderColor: getPieColors(labels.length).map(color => color + 'dd'),
                    borderWidth: 2,
                    hoverBackgroundColor: getPieColors(labels.length).map(color => color + 'bb'),
                }]
            };
        } else {
            // For line/bar charts
            const chartColors = getChartColors();
            const datasets = data.datasets.map((dataset, index) => ({
                ...dataset,
                data: Array.isArray(dataset.data) ? dataset.data : [],
                borderColor: chartColors[index % chartColors.length],
                backgroundColor: type === 'line'
                    ? chartColors[index % chartColors.length] + '20'
                    : chartColors[index % chartColors.length] + '80',
                borderWidth: type === 'line' ? 3 : 1,
                fill: type === 'line' ? true : false,
                tension: type === 'line' ? 0.4 : 0,
                hoverBackgroundColor: chartColors[index % chartColors.length] + 'cc',
            }));

            return {
                labels: data.labels,
                datasets: datasets
            };
        }
    };

    // Chart options
    const getChartOptions = () => {
        const textColor = theme?.text || '#1f2937';
        const gridColor = theme?.grid || 'rgba(0, 0, 0, 0.1)';
        const tooltipBgColor = theme?.background === '#1f2937' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)';
        const tooltipTextColor = theme?.background === '#1f2937' ? '#1f2937' : '#fff';

        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: type === 'pie' ? 'right' : 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        color: textColor,
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                title: {
                    display: !!title,
                    text: title,
                    color: textColor,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 30
                    }
                },
                tooltip: {
                    backgroundColor: tooltipBgColor,
                    titleColor: tooltipTextColor,
                    bodyColor: tooltipTextColor,
                    borderColor: getChartColors()[0],
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            if (type === 'pie') {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                            return `${context.dataset.label}: ${context.parsed.y}`;
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        };

        if (type === 'pie') {
            return {
                ...baseOptions,
                plugins: {
                    ...baseOptions.plugins,
                    legend: {
                        ...baseOptions.plugins.legend,
                        position: 'right',
                        align: 'center'
                    }
                }
            };
        }

        return {
            ...baseOptions,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor,
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            if (value >= 1000) {
                                return (value / 1000).toFixed(1) + 'k';
                            }
                            return value;
                        }
                    }
                }
            }
        };
    };

    const chartData = prepareChartData();
    const options = getChartOptions();

    const renderChart = () => {
        if (loading) {
            return (
                <div
                    className="chart-loading"
                    style={{
                        backgroundColor: theme?.background || '#ffffff',
                        color: theme?.text || '#1f2937'
                    }}
                >
                    <div className="chart-loading-spinner"></div>
                    <p>Loading chart data...</p>
                </div>
            );
        }

        if (!data || !data.labels || data.labels.length === 0) {
            return (
                <div
                    className="chart-no-data"
                    style={{
                        backgroundColor: theme?.background || '#ffffff',
                        color: theme?.text || '#1f2937'
                    }}
                >
                    <FaChartLine size={48} color={theme?.text || '#6b7280'} />
                    <p>No data available</p>
                </div>
            );
        }

        try {
            switch (type) {
                case 'line':
                    return <Line data={chartData} options={options} />;
                case 'bar':
                    return <Bar data={chartData} options={options} />;
                case 'pie':
                    return <Pie data={chartData} options={options} />;
                default:
                    return <Line data={chartData} options={options} />;
            }
        } catch (error) {
            console.error('Chart rendering error:', error);
            return (
                <div
                    className="chart-error"
                    style={{
                        backgroundColor: theme?.background || '#ffffff',
                        color: theme?.text || '#1f2937'
                    }}
                >
                    <FaChartLine size={48} color="#ef4444" />
                    <p>Failed to load chart</p>
                </div>
            );
        }
    };

    const handleTypeChange = (newType) => {
        if (onTypeChange) {
            onTypeChange(newType);
        }
    };

    return (
        <div
            className="chart-container"
            style={{
                backgroundColor: theme?.background || '#ffffff',
                borderRadius: '8px',
                padding: '20px',
                transition: 'background-color 0.3s ease'
            }}
        >
            {(title || showToggle || showNavigation) && (
                <div className="chart-header">
                    <div className="chart-title-section">
                        {title && (
                            <h3
                                className="chart-title"
                                style={{
                                    color: theme?.text || '#1f2937',
                                    '--title-bar-color': theme?.colors?.[0] || '#3b82f6'
                                }}
                            >
                                {title}
                            </h3>
                        )}
                        {showNavigation && (
                            <div className="chart-navigation">
                                <button
                                    className="chart-nav-btn"
                                    onClick={onPreviousPeriod}
                                    disabled={!canGoPrevious}
                                    title="Previous Period"
                                    style={{
                                        backgroundColor: theme?.background === '#1f2937' ? '#374151' :
                                                       theme?.background === '#000000' ? '#1a1a1a' : '#f3f4f6',
                                        color: theme?.text || '#6b7280',
                                        opacity: !canGoPrevious ? 0.5 : 1,
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '8px 12px',
                                        cursor: canGoPrevious ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <FaArrowLeft size={14} />
                                </button>
                                <button
                                    className="chart-nav-btn chart-nav-reset"
                                    onClick={onResetToCurrent}
                                    disabled={currentPeriodOffset === 0}
                                    title="Current Period"
                                    style={{
                                        backgroundColor: theme?.background === '#1f2937' ? '#374151' :
                                                       theme?.background === '#000000' ? '#1a1a1a' : '#f3f4f6',
                                        color: theme?.text || '#6b7280',
                                        opacity: currentPeriodOffset === 0 ? 0.5 : 1,
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '8px 12px',
                                        cursor: currentPeriodOffset === 0 ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 4px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <FaCalendarAlt size={14} />
                                </button>
                                <button
                                    className="chart-nav-btn"
                                    onClick={onNextPeriod}
                                    disabled={!canGoNext}
                                    title="Next Period"
                                    style={{
                                        backgroundColor: theme?.background === '#1f2937' ? '#374151' :
                                                       theme?.background === '#000000' ? '#1a1a1a' : '#f3f4f6',
                                        color: theme?.text || '#6b7280',
                                        opacity: !canGoNext ? 0.5 : 1,
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '8px 12px',
                                        cursor: canGoNext ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <FaArrowRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                    {showToggle && (
                        <div
                            className="chart-toggle-buttons"
                            style={{
                                backgroundColor: theme?.background === '#1f2937' ? '#374151' :
                                               theme?.background === '#000000' ? '#1a1a1a' : '#f3f4f6'
                            }}
                        >
                            {availableTypes.includes('line') && (
                                <button
                                    className={`chart-toggle-btn ${type === 'line' ? 'active' : ''}`}
                                    onClick={() => handleTypeChange('line')}
                                    title="Line Chart"
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: theme?.text || '#6b7280'
                                    }}
                                >
                                    <FaChartLine />
                                </button>
                            )}
                            {availableTypes.includes('bar') && (
                                <button
                                    className={`chart-toggle-btn ${type === 'bar' ? 'active' : ''}`}
                                    onClick={() => handleTypeChange('bar')}
                                    title="Bar Chart"
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: theme?.text || '#6b7280'
                                    }}
                                >
                                    <FaChartBar />
                                </button>
                            )}
                            {availableTypes.includes('pie') && (
                                <button
                                    className={`chart-toggle-btn ${type === 'pie' ? 'active' : ''}`}
                                    onClick={() => handleTypeChange('pie')}
                                    title="Pie Chart"
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: theme?.text || '#6b7280'
                                    }}
                                >
                                    <FaChartPie />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
            <div
                className="chart-wrapper"
                style={{
                    height: `${height}px`,
                    backgroundColor: theme?.background === '#000000' ? '#111111' : 'transparent',
                    borderRadius: '4px',
                    padding: '10px'
                }}
            >
                {renderChart()}
            </div>
        </div>
    );
};

export default ChartComponent;
