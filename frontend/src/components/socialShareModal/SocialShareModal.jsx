"use client";

import { useState, useEffect, useRef } from 'react';
import { CircularProgress } from '@mui/material';
import { FaTimes, FaShareAlt, FaSync } from 'react-icons/fa';
import { usePendingSocialShareCount, useGenerateSocialShare } from '@/hooks/useSocialShare';
import { useQueryClient } from '@tanstack/react-query';
import { employerJobsKeys } from '@/hooks/useEmployerJobs';
import { toast } from 'react-hot-toast';
import './SocialShareModal.css';

const SocialShareModal = ({ isOpen, onClose, onBulkGenerationStart }) => {
    const queryClient = useQueryClient();
    const { data: pendingData, isLoading: loadingCount } = usePendingSocialShareCount();
    const generateSocialShareMutation = useGenerateSocialShare();
    const [isGenerating, setIsGenerating] = useState(false);

    const pendingCount = pendingData?.pendingCount || 0;

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';

            return () => {
                // Restore scroll position when modal closes
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                window.scrollTo(0, scrollY);
            };
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (pendingCount === 0) {
            onClose();
            return;
        }

        setIsGenerating(true);
        try {
            const result = await generateSocialShareMutation.mutateAsync({ generateInBackground: false });
            
            // Show success message with results
            if (result.failed > 0) {
                toast.error(`${result.failed} job(s) failed to generate. Please try again.`);
            } else {
                toast.success(`Social share generated successfully for ${result.generated} job(s)!`);
            }
            
            // Close modal after successful generation
            setTimeout(() => {
                setIsGenerating(false);
                onClose();
            }, 1500);
        } catch (error) {
            console.error('Generate social share error:', error);
            toast.error(error.response?.data?.message || 'Failed to generate social share. Please try again.');
            setIsGenerating(false);
        }
    };

    const handleGenerateInBackground = async () => {
        if (pendingCount === 0) {
            onClose();
            return;
        }

        try {
            // Start the background generation request
            const response = await generateSocialShareMutation.mutateAsync({ generateInBackground: true });

            // If we get a background response, notify parent to start tracking
            if (response && response.isBackground) {
                // Notify parent component to start tracking progress
                if (onBulkGenerationStart) {
                    onBulkGenerationStart(pendingCount);
                }
            } else if (response) {
                // If we got result immediately (shouldn't happen with background=true, but handle it)
                if (response.failed > 0) {
                    toast.error(`${response.failed} job(s) failed to generate. Please try again.`);
                } else {
                    toast.success(`Social share generated successfully for ${response.generated} job(s)!`);
                }
            }

            // Close modal immediately
            onClose();
        } catch (error) {
            console.error('Background generation error:', error);
            toast.error('Failed to start background generation. Please try again.');
        }
    };

    const handleClose = () => {
        if (!isGenerating && !generateSocialShareMutation.isPending) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="social-share-modal-overlay" onClick={handleClose}></div>
            <div className="social-share-modal-container">
                <div className="social-share-modal-content">
                    <div className="social-share-modal-header">
                        <div className="social-share-modal-title-section">
                            <FaShareAlt className="social-share-icon" />
                            <h2>Generate Social Share</h2>
                        </div>
                        <button 
                            className="social-share-modal-close" 
                            onClick={handleClose} 
                            disabled={isGenerating || generateSocialShareMutation.isPending}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="social-share-modal-body">
                        {loadingCount ? (
                            <div className="social-share-loading">
                                <CircularProgress size={24} />
                                <p>Checking pending jobs...</p>
                            </div>
                        ) : (
                            <>
                                <p className="social-share-modal-subtitle">
                                    {pendingCount === 0 
                                        ? "All your jobs already have social share content generated."
                                        : `Generate social share content for ${pendingCount} ${pendingCount === 1 ? 'job' : 'jobs'} that don't have it yet.`
                                    }
                                </p>

                                {pendingCount > 0 && (
                                    <div className="social-share-info">
                                        <p>Social share content will include:</p>
                                        <ul>
                                            <li>Apply link with short URL</li>
                                            <li>Brief job description</li>
                                            <li>Relevant hashtags (minimum 5)</li>
                                            <li>AI evaluation disclaimer</li>
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="social-share-modal-footer">
                        <button
                            type="button"
                            className="social-share-modal-cancel-btn"
                            onClick={handleClose}
                            disabled={isGenerating || generateSocialShareMutation.isPending}
                        >
                            Cancel
                        </button>
                        {pendingCount > 0 && (
                            <div className="social-share-modal-footer-actions">
                                <button
                                    type="button"
                                    className="social-share-modal-background-btn"
                                    onClick={handleGenerateInBackground}
                                    disabled={isGenerating || generateSocialShareMutation.isPending}
                                    title="Generate in background and continue working"
                                >
                                    <FaSync /> Generate in Background
                                </button>
                                <button
                                    type="button"
                                    className="social-share-modal-generate-btn"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || generateSocialShareMutation.isPending}
                                >
                                    {isGenerating || generateSocialShareMutation.isPending ? (
                                        <>
                                            <CircularProgress size={16} sx={{ color: "white", mr: 1 }} />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <FaShareAlt /> Generate
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SocialShareModal;

