"use client";

import { useState, useEffect, useRef } from "react";
import { HiCheckCircle, HiBriefcase, HiBuildingOffice2, HiMapPin, HiDocumentText, HiDocument } from "react-icons/hi2";
import SmartPostVerifyModal from "@/components/smartPostVerifyModal/SmartPostVerifyModal";
import "./SmartPostCompletedCard.css";

const SmartPostCompletedCard = ({ smartPost, isNewlyGenerated = false, completionTime }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const hasShownAnimation = useRef(false);
    const cardId = smartPost._id;

    // Trigger animation when card is newly generated
    useEffect(() => {
        if (isNewlyGenerated && !hasShownAnimation.current && cardId) {
            hasShownAnimation.current = true;
            
            // Small delay to ensure card is fully rendered in DOM
            const showTimer = setTimeout(() => {
                setShowSuccessOverlay(true);
            }, 150);
            
            // Hide after animation completes (2.5 seconds)
            const hideTimer = setTimeout(() => {
                setShowSuccessOverlay(false);
            }, 2500);

            return () => {
                clearTimeout(showTimer);
                clearTimeout(hideTimer);
            };
        }
    }, [isNewlyGenerated, cardId]);

    const handleVerifyClick = () => {
        setIsModalOpen(true);
    };

    const handlePostSuccess = () => {
        // Refresh the page or update the list
        window.location.reload();
    };

    return (
        <>
            <div className="smart-post-completed-card">
                {showSuccessOverlay && (
                    <div className={`smart-post-success-overlay ${!showSuccessOverlay ? 'fade-out' : ''}`}>
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
                            {smartPost.jobTitle || 'Job Title'}
                        </h3>
                        <div className="smart-post-completed-details">
                            <p className="smart-post-completed-company">
                                <HiBuildingOffice2 className="smart-post-completed-detail-icon" />
                                {smartPost.companyName || 'Company'}
                            </p>
                            <p className="smart-post-completed-location">
                                <HiMapPin className="smart-post-completed-detail-icon" />
                                {smartPost.location || 'Location'}
                            </p>
                        </div>
                        {/* Display source text if present */}
                        {(smartPost.sourceText || smartPost.sourceFileName) && (
                            <div className="smart-post-completed-source">
                                {smartPost.sourceType === 'file' ? (
                                    <>
                                        <HiDocumentText className="smart-post-completed-source-icon" />
                                        <span className="smart-post-completed-source-text">{smartPost.sourceFileName}</span>
                                    </>
                                ) : (
                                    <>
                                        <HiDocument className="smart-post-completed-source-icon" />
                                        <span className="smart-post-completed-source-text">
                                            {smartPost.sourceText?.substring(0, 100)}
                                            {smartPost.sourceText?.length > 100 ? '...' : ''}
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="smart-post-completed-actions">
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
                jobData={smartPost}
                smartPostJobId={smartPost._id}
                onPostSuccess={handlePostSuccess}
            />
        </>
    );
};

export default SmartPostCompletedCard;

