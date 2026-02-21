"use client";

import { useState, useEffect, useRef } from "react";
import { HiBolt, HiPlusCircle } from "react-icons/hi2";
import { useQueryClient } from "@tanstack/react-query";
import { useAnalyzeSmartPost, useSmartPostJobs } from "@/hooks/useSmartPost";
import SmartPostCard from "@/components/smartPostCard/SmartPostCard";
import SmartPostAddJDModal from "@/components/smartPostAddJDModal/SmartPostAddJDModal";
import CircularProgress from "@mui/material/CircularProgress";
import "./page.css";

export default function SmartPostPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const analyzeMutation = useAnalyzeSmartPost();
    const queryClient = useQueryClient();
    const { data: existingSmartPosts, refetch: refetchSmartPosts, isLoading: isLoadingSmartPosts } = useSmartPostJobs();
    
    // Track processing card IDs to poll their status
    const [processingCardIds, setProcessingCardIds] = useState(new Set());
    
    // Track newly completed cards (for tick animation) - removed after animation completes
    const [newlyCompletedIds, setNewlyCompletedIds] = useState(new Set());
    
    // Store refs for polling intervals
    const pollingIntervalsRef = useRef(new Map());

    const handleStart = async ({ jdText, extraPrompt, files }) => {
        try {
            // Call API - creates document immediately and returns _id
            const result = await analyzeMutation.mutateAsync({
                jdText: jdText || null,
                extraPrompt: extraPrompt || null,
                files: files || null
            });

            if (result.success && result.data) {
                // Get the created card IDs (documents created immediately)
                const newCardIds = result.data.map(card => card._id).filter(Boolean);
                
                // Add to processing set to track them
                setProcessingCardIds(prev => {
                    const newSet = new Set(prev);
                    newCardIds.forEach(id => newSet.add(id));
                    return newSet;
                });
                
                // Update cache immediately with the new cards (status: 'processing')
                queryClient.setQueryData(["smartPostJobs"], (oldData) => {
                    if (!oldData || !oldData.success) {
                        return {
                            success: true,
                            data: result.data
                        };
                    }
                    
                    const existingData = oldData.data || [];
                    const existingIds = new Set(existingData.map(card => card._id));
                    
                    // Add new cards that don't exist yet
                    const newCards = result.data.filter(card => !existingIds.has(card._id));
                    
                    if (newCards.length === 0) {
                        return oldData;
                    }
                    
                    // Add new cards at the beginning (newest first)
                    return {
                        ...oldData,
                        data: [...newCards, ...existingData]
                    };
                });
                
                // Start polling for status updates for each card
                newCardIds.forEach(cardId => {
                    startPolling(cardId);
                });
            }
        } catch (error) {
            console.error('Analysis error:', error);
        }
    };
    
    // Poll a single card to check its status
    const startPolling = (cardId) => {
        // Clear any existing interval for this card
        const existingInterval = pollingIntervalsRef.current.get(cardId);
        if (existingInterval) {
            clearInterval(existingInterval);
        }
        
        const pollInterval = setInterval(async () => {
            // Refetch all smart posts to get updated status
            const result = await refetchSmartPosts();
            
            if (result.data?.success && result.data?.data) {
                const card = result.data.data.find(c => c._id === cardId);
                
                // If card is completed, add to newlyCompletedIds immediately for animation
                if (card && card.status === 'completed') {
                    setNewlyCompletedIds(prev => {
                        const newSet = new Set(prev);
                        if (!newSet.has(cardId)) {
                            newSet.add(cardId);
                            
                            // Remove from newly completed after animation completes (3.5 seconds)
                            setTimeout(() => {
                                setNewlyCompletedIds(prevCleanup => {
                                    const cleanupSet = new Set(prevCleanup);
                                    cleanupSet.delete(cardId);
                                    return cleanupSet;
                                });
                            }, 3500);
                            
                            return newSet;
                        }
                        return prev;
                    });
                    
                    // Remove from processing and stop polling
                    setProcessingCardIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(cardId);
                        return newSet;
                    });
                    clearInterval(pollInterval);
                    pollingIntervalsRef.current.delete(cardId);
                } else if (card && card.status === 'failed') {
                    // Remove from processing and stop polling for failed cards
                    setProcessingCardIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(cardId);
                        return newSet;
                    });
                    clearInterval(pollInterval);
                    pollingIntervalsRef.current.delete(cardId);
                }
            }
        }, 2000); // Poll every 2 seconds
        
        pollingIntervalsRef.current.set(cardId, pollInterval);
        
        // Stop polling after 5 minutes (safety)
        setTimeout(() => {
            clearInterval(pollInterval);
            pollingIntervalsRef.current.delete(cardId);
        }, 5 * 60 * 1000);
    };
    
    // Cleanup polling intervals on unmount
    useEffect(() => {
        return () => {
            pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
            pollingIntervalsRef.current.clear();
        };
    }, []);

    // Calculate count - only count completed jobs
    const smartPostCount = existingSmartPosts?.data?.filter(card => card.status === 'completed').length || 0;
    
    // Detect scroll to add spacing to header
    const resultsContainerRef = useRef(null);
    const lastScrollYRef = useRef(0);
    
    useEffect(() => {
        const handleScroll = () => {
            // Check both window scroll and results container scroll
            const windowScrollY = window.scrollY || document.documentElement.scrollTop;
            const container = resultsContainerRef.current;
            const containerScrollTop = container?.scrollTop || 0;
            const scrollY = Math.max(windowScrollY, containerScrollTop);
            
            // Check if we're actually at the top (within 5px threshold to account for rounding)
            const isAtTop = scrollY <= 5;
            
            // Check if content is scrollable when header is in full state (not scrolled)
            const isScrollable = document.documentElement.scrollHeight > window.innerHeight + 5;
            
            // Only hide header if:
            // 1. We're scrolled more than 50px, AND
            // 2. We're not at the top (to prevent flickering when header size changes)
            // 3. Content is actually scrollable (to prevent flickering when header change makes content fit)
            if (scrollY > 50 && !isAtTop && isScrollable) {
                setIsScrolled(true);
            } else if (isAtTop) {
                // Always show full header when at top
                setIsScrolled(false);
            }
            
            lastScrollYRef.current = scrollY;
        };

        // Initial check
        handleScroll();

        window.addEventListener('scroll', handleScroll, { passive: true });
        const container = resultsContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
        }
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [existingSmartPosts?.data]); // Re-run when smart posts data changes
    
    // Update processing set and track newly completed cards
    useEffect(() => {
        if (!existingSmartPosts?.data) return;
        
        const newlyCompleted = [];
        
        setProcessingCardIds(prevProcessing => {
            const newSet = new Set(prevProcessing);
            let changed = false;
            
            existingSmartPosts.data.forEach(card => {
                if (newSet.has(card._id)) {
                    // Remove from processing if completed or failed
                    if (card.status === 'completed' || card.status === 'failed') {
                        newSet.delete(card._id);
                        
                        // Track newly completed cards for animation
                        if (card.status === 'completed') {
                            newlyCompleted.push(card._id);
                        }
                        
                        // Stop polling for this card
                        const interval = pollingIntervalsRef.current.get(card._id);
                        if (interval) {
                            clearInterval(interval);
                            pollingIntervalsRef.current.delete(card._id);
                        }
                        changed = true;
                    }
                }
            });
            
            return changed ? newSet : prevProcessing;
        });
        
        // Add newly completed cards to animation tracking (outside setState callback)
        if (newlyCompleted.length > 0) {
            // Use functional update to check current state and add new IDs
            setNewlyCompletedIds(prevCompleted => {
                const newCompletedSet = new Set(prevCompleted);
                let addedAny = false;
                
                newlyCompleted.forEach(id => {
                    if (!newCompletedSet.has(id)) {
                        newCompletedSet.add(id);
                        addedAny = true;
                        
                        // Remove from newly completed after animation completes (3.5 seconds)
                        setTimeout(() => {
                            setNewlyCompletedIds(prev => {
                                const cleanupSet = new Set(prev);
                                cleanupSet.delete(id);
                                return cleanupSet;
                            });
                        }, 3500);
                    }
                });
                
                return addedAny ? newCompletedSet : prevCompleted;
            });
        }
    }, [existingSmartPosts?.data]);

    return (
        <div className={`smart-post-page ${isModalOpen ? 'drawer-open' : ''} ${isScrolled ? 'scrolled' : ''}`}>
            {/* Header Section */}
            <div className="smart-post-header">
                <div className="smart-post-header-content">
                    <div className={`smart-post-header-title-row ${isScrolled ? 'scrolled' : ''}`}>
                        <div>
                            <h1 className="smart-post-page-title">
                                <HiBolt className="smart-post-title-icon" />
                                Smart Post
                            </h1>
                            <p className="smart-post-page-subtitle">
                                Upload job descriptions and let AI extract all the details automatically
                            </p>
                        </div>
                    </div>
                    <div className="smart-post-count-info">
                        <span className="smart-post-count-item">
                            Total Jobs Analyzed: <strong>{smartPostCount}</strong>
                        </span>
                        <button 
                            className="smart-post-add-jd-header-btn"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <HiPlusCircle />
                            Add JD
                        </button>
                    </div>
                </div>
            </div>

            <div className="smart-post-container">
                {/* Analysis Results - Left Side */}
                <div className="smart-post-results" ref={resultsContainerRef}>
                    {/* Loading State */}
                    {isLoadingSmartPosts && (
                        <div className="smart-post-page-loading-state">
                            <div className="smart-post-page-loading-content">
                                <CircularProgress size={48} thickness={4} />
                                <p className="smart-post-page-loading-text">Loading smart posts...</p>
                            </div>
                        </div>
                    )}

                    {/* Display all smart post cards - simple and efficient */}
                    {/* Cards always use their _id as key - stable throughout lifecycle */}
                    {!isLoadingSmartPosts && existingSmartPosts?.data
                        ?.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Newest first
                        .map((smartPost) => {
                            // Determine if card is newly generated (just completed) - use newlyCompletedIds for animation
                            const isNewlyGenerated = smartPost.status === 'completed' && 
                                                   newlyCompletedIds.has(smartPost._id);
                            
                            // Get completion time from updatedAt if available
                            const completionTime = smartPost.status === 'completed' && smartPost.updatedAt 
                                ? new Date(smartPost.updatedAt).getTime() 
                                : null;
                            
                            return (
                                <SmartPostCard
                                    key={smartPost._id}
                                    item={smartPost.status === 'processing' ? {
                                        analysisId: smartPost._id,
                                        sourceType: smartPost.sourceType,
                                        sourceText: smartPost.sourceText?.substring(0, 200) + (smartPost.sourceText?.length > 200 ? '...' : ''),
                                        sourceFileName: smartPost.sourceFileName
                                    } : null}
                                    completedCard={smartPost.status === 'completed' ? smartPost : null}
                                    isNewlyGenerated={isNewlyGenerated}
                                    completionTime={completionTime}
                                />
                            );
                        })}

                    {/* Empty State - only show after loading is complete */}
                    {!isLoadingSmartPosts && (!existingSmartPosts?.data || existingSmartPosts.data.length === 0) && (
                        <div className="smart-post-empty-state">
                            <div className="smart-post-empty-content">
                                <HiBolt className="smart-post-empty-icon" />
                                <h3 className="smart-post-empty-title">No Smart Posts Yet</h3>
                                <p className="smart-post-empty-description">
                                    Get started by uploading a job description. Our AI will automatically extract all the job details for you.
                                </p>
                                <button
                                    className="smart-post-empty-btn"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    Add Your First JD
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add JD Modal */}
            <SmartPostAddJDModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onStart={handleStart}
                isAnalyzing={analyzeMutation.isPending}
            />
        </div>
    );
}

