"use client";

import { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import { FaMagic, FaCheckCircle, FaTimesCircle, FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa';
import { useBackgroundGeneration } from '@/contexts/BackgroundGenerationContext';
import './FloatingProgressIndicator.css';

const FloatingProgressIndicator = () => {
    const { activeTasks, completedTasks, removeCompletedTask, clearAllCompleted } = useBackgroundGeneration();
    const [isMinimized, setIsMinimized] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-expand when new tasks complete
    useEffect(() => {
        if (completedTasks.length > 0 && isMinimized) {
            setIsExpanded(true);
        }
    }, [completedTasks.length, isMinimized]);

    // Filter out bulk social share tasks (they have their own indicator)
    const filteredActiveTasks = activeTasks.filter(task => {
        const isBulkSocialShare = task.id.startsWith('social_share_') && !task.id.startsWith('social_share_single_');
        return !isBulkSocialShare;
    });
    const filteredCompletedTasks = completedTasks.filter(task => {
        const isBulkSocialShare = task.id.startsWith('social_share_') && !task.id.startsWith('social_share_single_');
        return !isBulkSocialShare;
    });
    
    const hasActiveTasks = filteredActiveTasks.length > 0;
    const hasCompletedTasks = filteredCompletedTasks.length > 0;
    const shouldShow = hasActiveTasks || hasCompletedTasks;

    if (!shouldShow) return null;

    return (
        <div className={`floating-progress-container ${isMinimized ? 'minimized' : ''} ${isExpanded ? 'expanded' : ''}`}>
            {!isMinimized ? (
                <div className="floating-progress-content">
                    <div className="floating-progress-header">
                        <div className="floating-progress-title">
                            <FaMagic className="progress-icon" />
                            <span>AI Generation</span>
                        </div>
                        <div className="floating-progress-actions">
                            {filteredCompletedTasks.length > 0 && (
                                <button
                                    className="clear-all-btn"
                                    onClick={clearAllCompleted}
                                    title="Clear all"
                                >
                                    Clear All
                                </button>
                            )}
                            <button
                                className="minimize-btn"
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

                    <div className="floating-progress-body">
                        {/* Active Tasks */}
                        {filteredActiveTasks.map((task) => {
                                const isSingleJobSocialShare = task.id.startsWith('social_share_single_');
                                let taskTitle = 'Generating Job Description...';
                                
                                if (isSingleJobSocialShare) {
                                    taskTitle = 'Generating Social Share for Job...';
                                }
                                
                                return (
                                    <div key={task.id} className="progress-task-item active">
                                        <div className="progress-task-info">
                                            <div className="progress-task-icon">
                                                <CircularProgress size={20} />
                                            </div>
                                            <div className="progress-task-details">
                                                <div className="progress-task-title">{taskTitle}</div>
                                                <div className="progress-task-progress">
                                                    <div className="progress-bar">
                                                        <div
                                                            className="progress-bar-fill"
                                                            style={{ width: `${task.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="progress-percentage">{task.progress}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                        {/* Completed Tasks */}
                        {filteredCompletedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`progress-task-item ${task.status === 'completed' ? 'completed' : 'error'}`}
                                >
                                    <div className="progress-task-info">
                                        <div className="progress-task-icon">
                                            {task.status === 'completed' ? (
                                                <FaCheckCircle className="success-icon" />
                                            ) : (
                                                <FaTimesCircle className="error-icon" />
                                            )}
                                        </div>
                                        <div className="progress-task-details">
                                            <div className="progress-task-title">
                                                {task.status === 'completed'
                                                    ? (task.id.startsWith('social_share_single_')
                                                        ? 'Social Share Generated!'
                                                        : 'Job Description Generated!')
                                                    : `Error: ${task.error || 'Generation failed'}`}
                                            </div>
                                            <div className="progress-task-time">
                                                {new Date(task.completedAt).toLocaleTimeString()}
                                            </div>
                                        </div>
                                        <button
                                            className="remove-task-btn"
                                            onClick={() => removeCompletedTask(task.id)}
                                            title="Remove"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            ) : (
                <div className="floating-progress-minimized">
                    <div className="minimized-content">
                        <FaMagic className="minimized-icon" />
                        <span className="minimized-text">
                            {hasActiveTasks
                                ? `${filteredActiveTasks.length} generating...`
                                : `${filteredCompletedTasks.length} completed`}
                        </span>
                        {filteredCompletedTasks.length > 0 && (
                            <div className="completed-badge">{filteredCompletedTasks.length}</div>
                        )}
                    </div>
                    <button
                        className="expand-btn"
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

export default FloatingProgressIndicator;

