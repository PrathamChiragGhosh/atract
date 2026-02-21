"use client";

import { useEffect, useState } from "react";
import { FaCheckCircle, FaBolt, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import "./SmartPostToast.css";

const SmartPostToast = ({ isOpen, status, onClose, message }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure smooth animation
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 10);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    useEffect(() => {
        // Only auto-close for completed or failed status, not for processing
        if ((status === 'completed' || status === 'failed') && isOpen && isVisible) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => {
                    onClose();
                }, 300); // Wait for fade-out animation
            }, 5000); // Auto close after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [status, isOpen, isVisible, onClose]);

    if (!isOpen) return null;

    const getToastContent = () => {
        switch (status) {
            case 'processing':
                return {
                    icon: <FaSpinner className="smart-post-toast-icon spinning" />,
                    title: "Smart Post Analysis Started",
                    message: message || "AI is generating comprehensive job details. This may take a moment..."
                };
            case 'completed':
                return {
                    icon: <FaCheckCircle className="smart-post-toast-icon completed" />,
                    title: "Analysis Complete!",
                    message: message || "Job details have been extracted. Please verify and post your job."
                };
            case 'failed':
                return {
                    icon: <FaExclamationTriangle className="smart-post-toast-icon failed" />,
                    title: "Analysis Failed",
                    message: message || "Failed to analyze job description. Please try again."
                };
            default:
                return {
                    icon: <FaBolt className="smart-post-toast-icon" />,
                    title: "Smart Post",
                    message: "Processing your job description..."
                };
        }
    };

    const content = getToastContent();

    return (
        <div className={`smart-post-toast ${isVisible ? 'show' : 'hide'} ${status || ''}`}>
            <div className="smart-post-toast-content">
                <div className="smart-post-toast-icon-wrapper">
                    {content.icon}
                </div>
                <div className="smart-post-toast-text">
                    <div className="smart-post-toast-title">{content.title}</div>
                    <div className="smart-post-toast-message">{content.message}</div>
                </div>
                {(status === 'completed' || status === 'failed') && (
                    <button
                        className="smart-post-toast-close"
                        onClick={() => {
                            setIsVisible(false);
                            setTimeout(() => {
                                onClose();
                            }, 300);
                        }}
                        aria-label="Close"
                    >
                        ×
                    </button>
                )}
            </div>
            {status === 'processing' && (
                <div className="smart-post-toast-progress">
                    <div className="smart-post-toast-progress-bar"></div>
                </div>
            )}
        </div>
    );
};

export default SmartPostToast;

