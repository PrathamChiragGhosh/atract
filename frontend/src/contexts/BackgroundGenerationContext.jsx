"use client";

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { saveDraft } from '@/store/draftsSlice';

const BackgroundGenerationContext = createContext(null);

export const useBackgroundGeneration = () => {
    const context = useContext(BackgroundGenerationContext);
    if (!context) {
        throw new Error('useBackgroundGeneration must be used within BackgroundGenerationProvider');
    }
    return context;
};

export const BackgroundGenerationProvider = ({ children }) => {
    const [activeTasks, setActiveTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const pathname = usePathname();
    const dispatch = useDispatch();
    // Track completed task IDs to prevent interval updates
    const completedTaskIdsRef = useRef(new Set());
    // Track interval IDs to ensure we can clear them properly
    const intervalRefs = useRef(new Map());
    // Track task progress directly to avoid state update issues
    const taskProgressRef = useRef(new Map());

    // Check if we're on the post-job page
    const isOnPostJobPage = pathname?.includes('/post-job') || false;

    const startBackgroundGeneration = useCallback(async (taskId, generateFn, formData, employerId, draftId = null) => {
        // Generate draft ID if not provided
        const finalDraftId = draftId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Initialize progress tracking
        taskProgressRef.current.set(taskId, 0);
        
        // Add task to active tasks
        setActiveTasks(prev => [...prev, {
            id: taskId,
            status: 'generating',
            progress: 0,
            startTime: Date.now(),
            draftId: finalDraftId
        }]);

        try {
            // Simulate progress updates
            const progressInterval = setInterval(() => {
                // Don't update if task is already marked as completed
                if (completedTaskIdsRef.current.has(taskId)) {
                    const intervalId = intervalRefs.current.get(taskId);
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalRefs.current.delete(taskId);
                    }
                    return;
                }
                
                // Get current progress from ref
                const currentProgress = taskProgressRef.current.get(taskId) || 0;
                
                // Only increment if below 90%
                if (currentProgress < 90) {
                    const newProgress = Math.min(currentProgress + 10, 90);
                    taskProgressRef.current.set(taskId, newProgress);
                    
                    setActiveTasks(prev => prev.map(task => {
                        if (task.id === taskId && !completedTaskIdsRef.current.has(taskId)) {
                            return { ...task, progress: newProgress };
                        }
                        return task;
                    }));
                }
            }, 500);
            
            // Store interval ID for this task
            intervalRefs.current.set(taskId, progressInterval);

            // Execute generation
            const result = await generateFn();

            // Mark task as completed FIRST to prevent any further interval updates
            completedTaskIdsRef.current.add(taskId);
            
            // Update progress ref to 100% immediately
            taskProgressRef.current.set(taskId, 100);
            
            // Clear interval immediately using stored ID
            const intervalId = intervalRefs.current.get(taskId);
            if (intervalId) {
                clearInterval(intervalId);
                intervalRefs.current.delete(taskId);
            }
            
            // Also clear the interval variable directly as backup
            clearInterval(progressInterval);
            
            // Wait a tiny bit to ensure interval is fully stopped
            await new Promise(resolve => setTimeout(resolve, 50));

            // Set progress to 100% using functional update - do this multiple times to ensure React processes it
            setActiveTasks(prev => {
                return prev.map(task => {
                    if (task.id === taskId) {
                        return { ...task, progress: 100 };
                    }
                    return task;
                });
            });
            
            // Wait a bit for React to process the update
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Force another update to 100% to ensure it's visible
            setActiveTasks(prev => {
                return prev.map(task => {
                    if (task.id === taskId) {
                        return { ...task, progress: 100 };
                    }
                    return task;
                });
            });
            
            // Additional delay to ensure 100% is visible before moving to completed
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // Clean up refs
            taskProgressRef.current.delete(taskId);
            completedTaskIdsRef.current.delete(taskId);

            // Update draft with generated content (only for JD generation, not social share)
            const isSocialShare = taskId.startsWith('social_share_');
            if (!isSocialShare && employerId && finalDraftId) {
                const draftDataWithGeneratedContent = {
                    id: finalDraftId,
                    ...formData,
                    jobDescription: result.jobDescription || '',
                    responsibilities: result.responsibilities || '',
                    requirements: result.requirements || '',
                    perksAndBenefits: result.perksAndBenefits || '',
                    skills: Array.isArray(result.skills) ? result.skills.filter(Boolean) : (formData.skills || []),
                    // Preserve hiringManagerEmail and assessment details from formData
                    hiringManagerEmail: formData.hiringManagerEmail || '',
                    requiresBasicTest: formData.requiresBasicTest !== undefined ? formData.requiresBasicTest : true,
                    requiresVideoProctoredTest: Boolean(formData.requiresVideoProctoredTest)
                };
                dispatch(saveDraft({ draftData: draftDataWithGeneratedContent, employerId }));
            }

            // Update to completed
            setActiveTasks(prev => prev.filter(task => task.id !== taskId));
            setCompletedTasks(prev => [...prev, {
                id: taskId,
                status: 'completed',
                result,
                completedAt: Date.now(),
                formData,
                employerId,
                draftId: finalDraftId
            }]);

            // Return result for auto-fill
            return result;
        } catch (error) {
            setActiveTasks(prev => prev.filter(task => task.id !== taskId));
            setCompletedTasks(prev => [...prev, {
                id: taskId,
                status: 'error',
                error: error.message,
                completedAt: Date.now(),
                draftId: finalDraftId
            }]);
            throw error;
        }
    }, [dispatch]);

    const removeCompletedTask = useCallback((taskId) => {
        setCompletedTasks(prev => prev.filter(task => task.id !== taskId));
    }, []);

    const clearAllCompleted = useCallback(() => {
        setCompletedTasks([]);
    }, []);

    return (
        <BackgroundGenerationContext.Provider
            value={{
                activeTasks,
                completedTasks,
                startBackgroundGeneration,
                removeCompletedTask,
                clearAllCompleted
            }}
        >
            {children}
        </BackgroundGenerationContext.Provider>
    );
};

