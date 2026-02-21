"use client";

import { useEffect, useRef } from "react";
import { FaTimes, FaEdit } from "react-icons/fa";
import { PostJobScreen } from "@/app/employer/(screens)/post-job/page";
import "./EditJobModal.css";

const EditJobModal = ({ isOpen, onClose, jobId, onSuccess }) => {
    const contentRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

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

    // Show scrollbar when scrolling
    useEffect(() => {
        if (!isOpen || !contentRef.current) return;

        const contentElement = contentRef.current;
        
        const handleScroll = () => {
            contentElement.classList.add('employer-editjob-model-scrolling');
            
            // Clear existing timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            
            // Hide scrollbar after scrolling stops
            scrollTimeoutRef.current = setTimeout(() => {
                contentElement.classList.remove('employer-editjob-model-scrolling');
            }, 500);
        };

        contentElement.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            contentElement.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSuccess = () => {
        if (onSuccess) {
            onSuccess();
        }
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    return (
        <>
            <div className="employer-editjob-model-overlay" onClick={onClose}></div>
            <div className="employer-editjob-model">
                <div className="employer-editjob-model-header">
                    <h2>
                        <FaEdit className="employer-editjob-model-icon" />
                        Edit Job
                    </h2>
                    <button
                        className="employer-editjob-model-close"
                        onClick={onClose}
                        title="Close"
                    >
                        <FaTimes />
                    </button>
                </div>
                <div className="employer-editjob-model-content" ref={contentRef}>
                    <PostJobScreen
                        isEditMode={true}
                        jobId={jobId}
                        onClose={onClose}
                        onSuccess={handleSuccess}
                        scrollContainerRef={contentRef}
                    />
                </div>
            </div>
        </>
    );
};

export default EditJobModal;

