"use client";

import { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import { FaTimes, FaShareAlt, FaSync, FaCopy, FaCheck } from 'react-icons/fa';
import { useGenerateSocialShareForSingleJob } from '@/hooks/useSocialShare';
import { useBackgroundGeneration } from '@/contexts/BackgroundGenerationContext';
import { useQueryClient } from '@tanstack/react-query';
import { employerJobsKeys } from '@/hooks/useEmployerJobs';
import { toast } from 'react-hot-toast';
import './SingleJobSocialShareModal.css';

const SingleJobSocialShareModal = ({ isOpen, onClose, job }) => {
    const queryClient = useQueryClient();
    const generateSocialShareMutation = useGenerateSocialShareForSingleJob();
    const { startBackgroundGeneration, activeTasks } = useBackgroundGeneration();
    const [isGenerating, setIsGenerating] = useState(false);
    const [socialShareContent, setSocialShareContent] = useState(null);
    const [isCopied, setIsCopied] = useState(false);

    // Check if job already has social share content and refresh from cache if needed
    useEffect(() => {
        if (job?.socialShareContent) {
            setSocialShareContent(job.socialShareContent);
        } else {
            setSocialShareContent(null);
        }
    }, [job]);

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

    // Refresh job data from cache after generation
    useEffect(() => {
        if (isOpen && job?._id) {
            // Invalidate and refetch to get updated job with social share content
            queryClient.invalidateQueries({ queryKey: employerJobsKeys.lists() });
        }
    }, [isOpen, job?._id, queryClient]);

    const handleGenerate = async () => {
        if (!job?._id) return;

        setIsGenerating(true);
        try {
            const result = await generateSocialShareMutation.mutateAsync({
                jobId: job._id,
                generateInBackground: false
            });

            if (result.socialShareContent) {
                setSocialShareContent(result.socialShareContent);
                toast.success('Social share generated successfully!');
            }
            setIsGenerating(false);
        } catch (error) {
            console.error('Generate social share error:', error);
            toast.error(error.response?.data?.message || 'Failed to generate social share. Please try again.');
            setIsGenerating(false);
        }
    };

    const handleGenerateInBackground = async () => {
        if (!job?._id) return;

        const taskId = `social_share_single_${job._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // Start the background generation request
            const response = await generateSocialShareMutation.mutateAsync({
                jobId: job._id,
                generateInBackground: true
            });

            // If we get a background response, it means generation started in background
            // We need to poll for completion
            if (response && response.isBackground) {
                // Start tracking the task - the actual generation function will poll for completion
                startBackgroundGeneration(
                    taskId,
                    async () => {
                        // Poll for completion by checking the job's socialShareContent
                        const maxAttempts = 120; // 120 attempts = 60 seconds max
                        const pollInterval = 500; // Poll every 500ms
                        
                        for (let attempt = 0; attempt < maxAttempts; attempt++) {
                            try {
                                // Refetch jobs to get updated job data
                                await queryClient.invalidateQueries({ queryKey: employerJobsKeys.lists() });
                                
                                // Wait a bit for the query to update
                                await new Promise(resolve => setTimeout(resolve, 200));
                                
                                // Get the updated job from cache
                                const allJobsQueries = queryClient.getQueriesData({ queryKey: employerJobsKeys.lists() });
                                let updatedJob = null;
                                
                                for (const [, jobsData] of allJobsQueries) {
                                    if (jobsData?.data) {
                                        const found = jobsData.data.find(j => j._id === job._id);
                                        if (found) {
                                            updatedJob = found;
                                            break;
                                        }
                                    }
                                }
                                
                                // If job has socialShareContent, generation is complete
                                if (updatedJob?.socialShareContent) {
                                    // Update local state if modal is still open
                                    setSocialShareContent(updatedJob.socialShareContent);
                                    toast.success('Social share generated successfully!');
                                    return { socialShareContent: updatedJob.socialShareContent };
                                }
                                
                                // Wait before next poll
                                await new Promise(resolve => setTimeout(resolve, pollInterval));
                            } catch (pollError) {
                                console.error('Polling error:', pollError);
                                // Continue polling
                            }
                        }
                        
                        // If we reach here, polling timed out
                        throw new Error('Generation timed out. Please check back later or refresh the page.');
                    },
                    { jobId: job._id },
                    null,
                    null
                ).catch((error) => {
                    console.error('Background generation error:', error);
                    toast.error(error.message || 'Failed to generate social share. Please try again.');
                });
            } else if (response && response.socialShareContent) {
                // If we got content immediately (shouldn't happen with background=true, but handle it)
                setSocialShareContent(response.socialShareContent);
                toast.success('Social share generated successfully!');
            }

            // Close modal immediately
            onClose();
        } catch (error) {
            console.error('Background generation error:', error);
            toast.error('Failed to start background generation. Please try again.');
        }
    };

    const handleCopy = async () => {
        if (!socialShareContent) return;

        try {
            await navigator.clipboard.writeText(socialShareContent);
            setIsCopied(true);
            toast.success('Social share content copied to clipboard!');
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback: select text in a temporary textarea
            const textarea = document.createElement('textarea');
            textarea.value = socialShareContent;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setIsCopied(true);
            toast.success('Social share content copied to clipboard!');
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleClose = () => {
        if (!isGenerating && !generateSocialShareMutation.isPending) {
            onClose();
        }
    };

    // Check if there's an active background task for this job
    const hasActiveTask = activeTasks.some(
        task => task.id.startsWith(`social_share_single_${job?._id}_`)
    );

    // Format content for display (preserve line breaks)
    const formatContentForDisplay = (content) => {
        if (!content) return '';
        return content.split('\n').map((line, index) => (
            <span key={index}>
                {line}
                {index < content.split('\n').length - 1 && <br />}
            </span>
        ));
    };

    if (!isOpen || !job) return null;

    return (
        <>
            <div className="single-job-social-share-modal-overlay" onClick={handleClose}></div>
            <div className="single-job-social-share-modal-container">
                <div className="single-job-social-share-modal-content">
                    <div className="single-job-social-share-modal-header">
                        <div className="single-job-social-share-modal-title-section">
                            <FaShareAlt className="single-job-social-share-icon" />
                            <h2>Social Share - {job.jobTitle}</h2>
                        </div>
                        <button
                            className="single-job-social-share-modal-close"
                            onClick={handleClose}
                            disabled={isGenerating || generateSocialShareMutation.isPending}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="single-job-social-share-modal-body">
                        {socialShareContent ? (
                            <div className="social-share-content-display">
                                <div className="social-share-content-header">
                                    <h3>Social Share Content</h3>
                                    <button
                                        className="copy-content-btn"
                                        onClick={handleCopy}
                                        title="Copy to clipboard"
                                    >
                                        {isCopied ? (
                                            <>
                                                <FaCheck /> Copied!
                                            </>
                                        ) : (
                                            <>
                                                <FaCopy /> Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="social-share-content-text">
                                    {formatContentForDisplay(socialShareContent)}
                                </div>
                            </div>
                        ) : (
                            <div className="social-share-generate-section">
                                <p className="social-share-generate-message">
                                    Generate social share content for this job. The content will include:
                                </p>
                                <ul className="social-share-features-list">
                                    <li>Apply link with short URL</li>
                                    <li>Brief job description</li>
                                    <li>Relevant hashtags (minimum 5)</li>
                                    <li>AI evaluation disclaimer</li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="single-job-social-share-modal-footer">
                        <button
                            type="button"
                            className="single-job-social-share-modal-cancel-btn"
                            onClick={handleClose}
                            disabled={isGenerating || generateSocialShareMutation.isPending}
                        >
                            {socialShareContent ? 'Close' : 'Cancel'}
                        </button>
                        {!socialShareContent && (
                            <div className="single-job-social-share-modal-footer-actions">
                                <button
                                    type="button"
                                    className="single-job-social-share-modal-background-btn"
                                    onClick={handleGenerateInBackground}
                                    disabled={isGenerating || generateSocialShareMutation.isPending || hasActiveTask}
                                    title="Generate in background and continue working"
                                >
                                    <FaSync /> Generate in Background
                                </button>
                                <button
                                    type="button"
                                    className="single-job-social-share-modal-generate-btn"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || generateSocialShareMutation.isPending || hasActiveTask}
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

export default SingleJobSocialShareModal;

