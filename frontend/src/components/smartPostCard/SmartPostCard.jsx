"use client";

import { useState, useEffect, useRef, memo } from "react";
import { HiCheckCircle, HiBriefcase, HiBuildingOffice2, HiMapPin, HiDocumentText, HiDocument, HiTrash } from "react-icons/hi2";
import { CircularProgress } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import SmartPostVerifyModal from "@/components/smartPostVerifyModal/SmartPostVerifyModal";
import SmartPostDeleteModal from "@/components/smartPostDeleteModal/SmartPostDeleteModal";
import { useDeleteSmartPostJob } from "@/hooks/useSmartPost";
import "./SmartPostCard.css";

const SmartPostCard = memo(({ item, completedCard, isNewlyGenerated = false, completionTime }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const hasShownAnimation = useRef(false);
    const isCompleted = !!completedCard;
    const cardId = completedCard?._id;
    const queryClient = useQueryClient();
    const deleteMutation = useDeleteSmartPostJob();

    // Track if animation has been shown for this specific card
    const animationShownRef = useRef(false);
    const prevIsNewlyGeneratedRef = useRef(isNewlyGenerated);
    const prevIsCompletedRef = useRef(isCompleted);
    const isMountedRef = useRef(false);
    
    // Trigger animation when card is marked as newly generated
    useEffect(() => {
        // Mark as mounted after first render
        if (!isMountedRef.current) {
            isMountedRef.current = true;
            prevIsCompletedRef.current = isCompleted;
            prevIsNewlyGeneratedRef.current = isNewlyGenerated;
            return;
        }
        
        // Only trigger for completed cards with an ID
        if (!isCompleted || !cardId) {
            prevIsCompletedRef.current = isCompleted;
            prevIsNewlyGeneratedRef.current = isNewlyGenerated;
            return;
        }
        
        // Detect transitions
        const justBecameCompleted = !prevIsCompletedRef.current && isCompleted;
        const justBecameNewlyGenerated = !prevIsNewlyGeneratedRef.current && isNewlyGenerated;
        
        // Trigger animation when:
        // 1. Card is completed
        // 2. It's marked as newly generated (in newlyCompletedIds)
        // 3. Animation hasn't been shown yet for this card
        // 4. Either: card just became completed with newlyGenerated=true, OR card is already completed but just became newly generated
        const shouldShowAnimation = isNewlyGenerated && 
                                    !animationShownRef.current && 
                                    (justBecameCompleted || justBecameNewlyGenerated);
        
        if (shouldShowAnimation) {
            animationShownRef.current = true;
            
            // Small delay to ensure DOM is ready and card is fully rendered
            const showTimer = setTimeout(() => {
                setShowSuccessOverlay(true);
            }, 200);
            
            // Hide after animation completes (3 seconds for animation + buffer)
            const hideTimer = setTimeout(() => {
                setShowSuccessOverlay(false);
            }, 3200);

            // Update refs to track state
            prevIsNewlyGeneratedRef.current = isNewlyGenerated;
            prevIsCompletedRef.current = isCompleted;

            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
            };
        }
        
        // Always update refs to track state changes
        prevIsNewlyGeneratedRef.current = isNewlyGenerated;
        prevIsCompletedRef.current = isCompleted;
    }, [isCompleted, isNewlyGenerated, cardId]);

    const handleVerifyClick = () => {
        setIsModalOpen(true);
    };

    const handlePostSuccess = () => {
        // Cache is already updated by usePostSmartPostJob's onSuccess
        // Just close the modal
        setIsModalOpen(false);
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!cardId) return;
        
        try {
            await deleteMutation.mutateAsync(cardId);
            
            // Update cache to remove deleted card
            queryClient.setQueryData(["smartPostJobs"], (oldData) => {
                if (!oldData || !oldData.success) return oldData;
                
                const filteredData = (oldData.data || []).filter(
                    card => card._id !== cardId
                );
                
                return {
                    ...oldData,
                    data: filteredData
                };
            });
            
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Delete error:', error);
            // Modal stays open on error
        }
    };

    if (!isCompleted) {
        // Loading state
        const { sourceType, sourceText, sourceFileName } = item || {};
        return (
            <div className="smart-post-card smart-post-card-loading">
                <div className="smart-post-loading-content">
                    <div className="smart-post-loading-header">
                        {sourceType === "file" ? (
                            <div className="smart-post-loading-file-info">
                                <HiDocumentText className="smart-post-loading-file-icon" />
                                <span className="smart-post-loading-file-name">{sourceFileName || 'File'}</span>
                            </div>
                        ) : (
                            <div className="smart-post-loading-text-preview">
                                {sourceText || 'Job Description'}
                            </div>
                        )}
                    </div>
                    <div className="smart-post-loading-status">
                        <div className="smart-post-loading-spinner"></div>
                        <span>Analyzing job description...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Completed state
    return (
        <>
            <div className="smart-post-card smart-post-card-completed">
                {showSuccessOverlay && (
                    <div className="smart-post-success-overlay" style={{ display: 'flex' }}>
                        <div className="smart-post-success-tick">
                            <HiCheckCircle className="smart-post-success-icon" />
                        </div>
                    </div>
                )}
                <div className="smart-post-completed-header">
                    <div className="smart-post-completed-icon-wrapper">
                        <HiCheckCircle className="smart-post-completed-icon" />
                    </div>
                    <div className="smart-post-completed-info">
                        <h3 className="smart-post-completed-title">
                            <HiBriefcase className="smart-post-completed-title-icon" />
                            {completedCard.jobTitle || 'Job Title'}
                        </h3>
                        <div className="smart-post-completed-details">
                            <p className="smart-post-completed-company">
                                <HiBuildingOffice2 className="smart-post-completed-detail-icon" />
                                {completedCard.companyName || 'Company'}
                            </p>
                            <p className="smart-post-completed-location">
                                <HiMapPin className="smart-post-completed-detail-icon" />
                                {completedCard.location || 'Location'}
                            </p>
                        </div>
                        {(completedCard.sourceText || completedCard.sourceFileName) && (
                            <div className="smart-post-completed-source">
                                {completedCard.sourceType === 'file' ? (
                                    <>
                                        <HiDocumentText className="smart-post-completed-source-icon" />
                                        <span className="smart-post-completed-source-text">{completedCard.sourceFileName}</span>
                                    </>
                                ) : (
                                    <>
                                        <HiDocument className="smart-post-completed-source-icon" />
                                        <span className="smart-post-completed-source-text">
                                            {completedCard.sourceText?.substring(0, 100)}
                                            {completedCard.sourceText?.length > 100 ? '...' : ''}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="smart-post-completed-actions">
                    {/* Delete button - only for completed cards */}
                    <button
                        className="smart-post-delete-btn"
                        onClick={handleDeleteClick}
                        disabled={deleteMutation.isPending}
                        title="Delete smart post"
                    >
                        {deleteMutation.isPending ? (
                            <CircularProgress size={16} thickness={4} className="smart-post-delete-loading" />
                        ) : (
                            <HiTrash className="smart-post-delete-icon" />
                        )}
                    </button>
                    <button 
                        className="smart-post-verify-btn"
                        onClick={handleVerifyClick}
                    >
                        <HiCheckCircle className="smart-post-verify-btn-icon" />
                        Verify and Post Job
                    </button>
                </div>
            </div>

            <SmartPostVerifyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                jobData={completedCard}
                smartPostJobId={completedCard._id}
                onPostSuccess={handlePostSuccess}
            />
            
            <SmartPostDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                jobTitle={completedCard?.jobTitle}
            />
        </>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Re-render if:
    // 1. completedCard changes (loading -> completed transition) - ALLOW THIS
    // 2. item changes (different pending result) - ALLOW THIS
    // 3. isNewlyGenerated changes - ALLOW THIS
    // Don't re-render if only completionTime changes (not used in render)
    const prevCompletedId = prevProps.completedCard?._id;
    const nextCompletedId = nextProps.completedCard?._id;
    const prevItemId = prevProps.item?.analysisId;
    const nextItemId = nextProps.item?.analysisId;
    
    // Re-render if completedCard changed (loading -> completed)
    if (prevCompletedId !== nextCompletedId) return false;
    
    // Re-render if item changed
    if (prevItemId !== nextItemId) return false;
    
    // Re-render if isNewlyGenerated changed
    if (prevProps.isNewlyGenerated !== nextProps.isNewlyGenerated) return false;
    
    // Don't re-render if only completionTime changed
    return true; // Props are equal, skip re-render
});

SmartPostCard.displayName = 'SmartPostCard';

export default SmartPostCard;

