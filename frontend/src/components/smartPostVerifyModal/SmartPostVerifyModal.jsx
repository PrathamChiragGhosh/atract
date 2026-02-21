"use client";

import { useEffect, useRef, useState } from "react";
import { FaTimes, FaCheckCircle } from "react-icons/fa";
import { PostJobScreen } from "@/app/employer/(screens)/post-job/page";
import "./SmartPostVerifyModal.css";

const SmartPostVerifyModal = ({ isOpen, onClose, jobData, smartPostJobId, onPostSuccess }) => {
    const contentRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';

            return () => {
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
            contentElement.classList.add('smart-post-verify-modal-scrolling');
            
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            
            scrollTimeoutRef.current = setTimeout(() => {
                contentElement.classList.remove('smart-post-verify-modal-scrolling');
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
        if (onPostSuccess) {
            onPostSuccess();
        }
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    // Convert smart post job data to format expected by PostJobScreen
    const initialJobData = jobData ? {
        _id: smartPostJobId,
        jobTitle: jobData.jobTitle || '',
        companyName: jobData.companyName || '',
        jobType: jobData.jobType || '',
        department: jobData.department || '',
        employmentType: jobData.employmentType || '',
        experience: jobData.experience || '',
        workMode: jobData.workMode || '',
        location: jobData.location || '',
        highestQualification: jobData.highestQualification || '',
        minSalary: jobData.minSalary || null,
        maxSalary: jobData.maxSalary || null,
        numberOfOpenings: jobData.numberOfOpenings || null,
        applicationOpeningDate: jobData.applicationOpeningDate ? (typeof jobData.applicationOpeningDate === 'string' ? jobData.applicationOpeningDate : new Date(jobData.applicationOpeningDate).toISOString()) : '',
        applicationClosingDate: jobData.applicationClosingDate ? (typeof jobData.applicationClosingDate === 'string' ? jobData.applicationClosingDate : new Date(jobData.applicationClosingDate).toISOString()) : '',
        hiringManagerEmail: jobData.hiringManagerEmail || '',
        jobDescription: jobData.jobDescription || '',
        responsibilities: jobData.responsibilities || '',
        requirements: jobData.requirements || '',
        perksAndBenefits: jobData.perksAndBenefits || '',
        skills: jobData.skills || [],
        requiresBasicTest: jobData.requiresBasicTest !== undefined ? jobData.requiresBasicTest : true,
        requiresVideoProctoredTest: jobData.requiresVideoProctoredTest || false,
        status: jobData.jobStatus || 'Draft'
    } : null;

    return (
        <>
            <div className="smart-post-verify-modal-overlay" onClick={onClose}></div>
            <div className="smart-post-verify-modal">
                <div className="smart-post-verify-modal-header">
                    <h2>
                        <FaCheckCircle className="smart-post-verify-modal-icon" />
                        Verify and Post Job
                    </h2>
                    <button
                        className="smart-post-verify-modal-close"
                        onClick={onClose}
                        title="Close"
                    >
                        <FaTimes />
                    </button>
                </div>
                <div className="smart-post-verify-modal-content" ref={contentRef}>
                    <PostJobScreen
                        isEditMode={false}
                        initialJobData={initialJobData}
                        onClose={onClose}
                        onSuccess={handleSuccess}
                        scrollContainerRef={contentRef}
                        isSmartPost={true}
                        smartPostJobId={smartPostJobId}
                    />
                </div>
            </div>
        </>
    );
};

export default SmartPostVerifyModal;

