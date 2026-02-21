"use client";

import { FaRocket, FaChartLine, FaAward, FaStar } from "react-icons/fa";
import { HiArrowRight } from "react-icons/hi2";
import "./PromotionalBanner.css";

const PromotionalBanner = () => {
    return (
        <div className="promotional-banner">
            <div className="promotional-banner-content">
                <div className="promotional-icon-container">
                    <FaRocket className="promotional-icon rocket-icon" />
                    <div className="promotional-glow"></div>
                </div>
                
                <div className="promotional-text">
                    <h3 className="promotional-title">Enhance Your Resume & Boost Your Career!</h3>
                    <p className="promotional-description">
                        Optimize your resume to increase ATS score and get more chances to get selected by top employers
                    </p>
                    
                    <div className="promotional-features">
                        <div className="promotional-feature">
                            <FaChartLine className="pb-feature-icon" />
                            <span>Increase ATS Score</span>
                        </div>
                        <div className="promotional-feature">
                            <FaAward className="pb-feature-icon" />
                            <span>Get More Interviews</span>
                        </div>
                        <div className="promotional-feature">
                            <FaRocket className="pb-feature-icon" />
                            <span>Boost Career Growth</span>
                        </div>
                    </div>
                </div>
                
                <button className="promotional-cta">
                    <span>Upgrade Resume</span>
                    <HiArrowRight className="cta-arrow" />
                </button>
            </div>
        </div>
    );
};

export default PromotionalBanner;
