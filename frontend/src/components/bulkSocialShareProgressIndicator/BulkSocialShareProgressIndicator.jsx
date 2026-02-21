"use client";

import { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import { FaShareAlt, FaCheckCircle, FaTimesCircle, FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa';
import './BulkSocialShareProgressIndicator.css';

const BulkSocialShareProgressIndicator = ({ progress, isActive, isCompleted, isError, errorMessage, onDismiss }) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-expand when task completes
    useEffect(() => {
        if (isCompleted && isMinimized) {
            setIsExpanded(true);
        }
    }, [isCompleted, isMinimized]);

    if (!isActive && !isCompleted && !isError) return null;

    return (
        <div className={`bulk-social-share-progress-container ${isMinimized ? 'minimized' : ''} ${isExpanded ? 'expanded' : ''}`}>
            {!isMinimized ? (
                <div className="bulk-social-share-progress-content">
                    <div className="bulk-social-share-progress-header">
                        <div className="bulk-social-share-progress-title">
                            <FaShareAlt className="bulk-social-share-progress-icon" />
                            <span>Generating Social Share</span>
                        </div>
                        <div className="bulk-social-share-progress-actions">
                            <button
                                className="bulk-social-share-minimize-btn"
                                onClick={() => {
                                    setIsMinimized(true);
                                    setIsExpanded(false);
                                }}
                                title="Minimize"
                            >
                                <FaChevronDown />
                            </button>
                        </div>
                    </div>

                    <div className="bulk-social-share-progress-body">
                        <div className={`bulk-social-share-progress-task-item ${isActive ? 'active' : isCompleted ? 'completed' : 'error'}`}>
                            <div className="bulk-social-share-progress-task-info">
                                <div className="bulk-social-share-progress-task-icon">
                                    {isActive ? (
                                        <CircularProgress size={20} />
                                    ) : isCompleted ? (
                                        <FaCheckCircle className="bulk-social-share-success-icon" />
                                    ) : (
                                        <FaTimesCircle className="bulk-social-share-error-icon" />
                                    )}
                                </div>
                                <div className="bulk-social-share-progress-task-details">
                                    <div className="bulk-social-share-progress-task-title">
                                        {isActive
                                            ? 'Generating Social Share for Jobs...'
                                            : isCompleted
                                            ? 'Social Share Generated!'
                                            : `Error: ${errorMessage || 'Generation failed'}`}
                                    </div>
                                    {isActive && (
                                        <div className="bulk-social-share-progress-task-progress">
                                            <div className="bulk-social-share-progress-bar">
                                                <div
                                                    className="bulk-social-share-progress-bar-fill"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <span className="bulk-social-share-progress-percentage">{progress}%</span>
                                        </div>
                                    )}
                                    {isCompleted && (
                                        <div className="bulk-social-share-progress-task-time">
                                            {new Date().toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>
                                {(isCompleted || isError) && (
                                    <button
                                        className="bulk-social-share-remove-task-btn"
                                        onClick={onDismiss}
                                        title="Dismiss"
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bulk-social-share-progress-minimized">
                    <div className="bulk-social-share-minimized-content">
                        <FaShareAlt className="bulk-social-share-minimized-icon" />
                        <span className="bulk-social-share-minimized-text">
                            {isActive ? 'Generating...' : isCompleted ? 'Completed' : 'Error'}
                        </span>
                        {isCompleted && (
                            <div className="bulk-social-share-completed-badge">✓</div>
                        )}
                    </div>
                    <button
                        className="bulk-social-share-expand-btn"
                        onClick={() => {
                            setIsMinimized(false);
                            setIsExpanded(true);
                        }}
                        title="Expand"
                    >
                        <FaChevronUp />
                    </button>
                </div>
            )}
        </div>
    );
};

export default BulkSocialShareProgressIndicator;

