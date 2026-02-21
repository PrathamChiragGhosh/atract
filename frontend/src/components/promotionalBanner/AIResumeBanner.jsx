"use client";

import { FaMagic, FaFileAlt, FaCheckCircle, FaRocket } from "react-icons/fa";
import { HiArrowRight } from "react-icons/hi2";
import "./AIResumeBanner.css";

const AIResumeBanner = () => {
    return (
        <div className="airesume-banner">
            <div className="airesume-banner-content">
                <div className="airesume-icon-container">
                    <FaMagic className="airesume-icon" />
                    <div className="airesume-glow"></div>
                </div>
                
                <div className="airesume-text">
                    <h3 className="airesume-title">AI Resume Builder</h3>
                    <p className="airesume-subtitle">Create • Enhance • Improve</p>
                    
                    <div className="airesume-features">
                        <div className="airesume-feature">
                            <FaFileAlt className="airesume-feature-icon" />
                            <span>Create Resume</span>
                        </div>
                        <div className="airesume-feature">
                            <FaCheckCircle className="airesume-feature-icon" />
                            <span>ATS Improvement</span>
                        </div>
                        <div className="airesume-feature">
                            <FaRocket className="airesume-feature-icon" />
                            <span>Enhance with AI</span>
                        </div>
                    </div>
                </div>
                
                <button className="airesume-cta">
                    <span>Get Started</span>
                    <HiArrowRight className="airesume-cta-arrow" />
                </button>
            </div>
        </div>
    );
};

export default AIResumeBanner;

