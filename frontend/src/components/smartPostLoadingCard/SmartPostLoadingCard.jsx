"use client";

import { HiDocumentText } from "react-icons/hi2";
import "./SmartPostLoadingCard.css";

export default function SmartPostLoadingCard({ item }) {
    const { sourceType, sourceText, sourceFileName } = item || {};
    
    return (
        <div className="smart-post-loading-card">
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

