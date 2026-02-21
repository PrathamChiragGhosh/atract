"use client";

import { useSearchParams } from 'next/navigation';
import { useResumeById, useResumeBuilderPlan, useUpdateDownloads } from '@/hooks/useResumeBuilder';
import { CircularProgress } from '@mui/material';
import Link from 'next/link';
import ResumeTemplates from './ResumeTemplates';
import './page.css';

const DownloadResumePageClient = () => {
    const searchParams = useSearchParams();
    const resumeId = searchParams.get('resumeId');
    
    const { data: resumeData, isLoading, error } = useResumeById(resumeId || '');
    const { data: planData } = useResumeBuilderPlan();
    const updateDownloadsMutation = useUpdateDownloads();

    const resume = resumeData?.data;
    const planType = resumeData?.plan_type || 'basic';
    
    // Calculate total downloads from planCounts
    const planCounts = planData?.plan?.planCounts || {};
    const totalDownloads = Object.values(planCounts).reduce((total, counts) => {
        return total + (counts.downloads || 0);
    }, 0);
    const downloadsRemaining = totalDownloads;

    const getScoreLabel = (score) => {
        if (score >= 75) return "Excellent";
        if (score >= 50) return "Good";
        if (score >= 30) return "Average";
        return "Needs Improvement";
    };

    const handleDownloadsUpdate = async () => {
        try {
            await updateDownloadsMutation.mutateAsync();
        } catch (error) {
            console.error('Failed to update downloads:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="resumebuilder-download-container">
                <div className="resumebuilder-download-loading">
                    <CircularProgress />
                    <p>Loading resume...</p>
                </div>
            </div>
        );
    }

    if (error || !resume) {
        return (
            <div className="resumebuilder-download-container">
                <div className="resumebuilder-download-error">
                    <p>{error?.message || "Resume not found"}</p>
                    <Link href="/jobseeker/resume-builder" className="resumebuilder-download-back-link">
                        ← Back to Resume Builder
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="resumebuilder-download-container">
            <div className="resumebuilder-download-left">
                {/* Downloads Info */}
                <div className="resumebuilder-download-plan-info">
                    <div className="resumebuilder-download-count">{downloadsRemaining ?? 0}</div>
                    <div className="resumebuilder-download-downloads-remaining">
                        downloads left
                    </div>
                </div>

                {/* ATS Score Section */}
                <div className="resumebuilder-download-ats-section">
                    <h3 className="resumebuilder-download-ats-label">ATS Score</h3>
                    <div className="resumebuilder-download-ats-card">
                        <div className="resumebuilder-download-ats-value">{resume.atsScore || 0}</div>
                        <div className="resumebuilder-download-ats-label-text">
                            {getScoreLabel(resume.atsScore || 0)}
                        </div>
                    </div>
                </div>

                {/* Resume Generated Text */}
                <div className="resumebuilder-download-generated-text">
                    <h2>Resume Generated</h2>
                    <p>Your enhanced resume is ready. Explore templates on the right to download.</p>
                </div>
            </div>

            <div className="resumebuilder-download-right">
                <ResumeTemplates
                    enhancedText={resume?.text || resume?.resumeText || ''}
                    planType={planType}
                    downloadsRemaining={downloadsRemaining}
                    onDownloadsUpdate={handleDownloadsUpdate}
                    resumeId={resumeId}
                    profilePicture={resume?.profilePicture || null}
                />
            </div>
        </div>
    );
};

export default DownloadResumePageClient;

