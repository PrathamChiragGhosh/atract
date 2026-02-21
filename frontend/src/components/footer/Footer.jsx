"use client";
import "./Footer.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import coreLogo from "@/assets/core-logo.png";
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram } from "react-icons/fa";
import Cookies from "js-cookie";

const Footer = () => {
    const router = useRouter();

    const handleNavigation = (path) => {
        if (!router || !path) return;
        
        try {
            router.push(path);
        } catch (error) {
            console.error("Navigation error:", error);
            // Fallback to window.location if router fails
            if (typeof window !== 'undefined') {
                window.location.href = path;
            }
        }
    };

    const handleEmployerCTA = () => {
        const empToken = Cookies.get("emp_token");
        if (empToken) {
            handleNavigation("/employer/home");
        } else {
            handleNavigation("/signin/employer");
        }
    };

    const handleJobSeekerCTA = () => {
        const jsToken = Cookies.get("js_token");
        if (jsToken) {
            handleNavigation("/jobseeker/home");
        } else {
            handleNavigation("/signin/jobseeker");
        }
    };

    return (
        <footer className="new-footer">
            {/* AI band */}
            <div className="footer-hero">
                <div className="footer-hero-left">
                    <div className="footer-hero-brand">
                        <Image src={coreLogo} alt="Atract Core Logo" className="footer-core-logo-small" />
                        <div className="footer-hero-text">
                            <span className="footer-hero-kicker">AI-Powered Hiring</span>
                            <h2>Atract brings talent and teams together with intelligence.</h2>
                            <p>Automated assessments, secure proctoring, and signal-rich profiles for faster, bias-free decisions.</p>
                        </div>
                    </div>
                </div>
                <div className="footer-hero-actions">
                    <button
                        className="footer-btn footer-btn-primary"
                        onClick={handleEmployerCTA}
                    >
                        For Employers
                    </button>
                    <button
                        className="footer-btn footer-btn-ghost"
                        onClick={handleJobSeekerCTA}
                    >
                        For Job Seekers
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="footer-grid">
                {/* Column 1 – Company Info */}
                <div className="footer-col">
                    <h3 className="footer-title">Company</h3>
                    <a href="#" onClick={(e) => e.preventDefault()}>About Us</a>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavigation("/contact-us");
                        }}
                    >
                        Contact Us
                    </a>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavigation("/privacy-policy");
                        }}
                    >
                        Privacy Policy
                    </a>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavigation("/shipping-policy");
                        }}
                    >
                        Shipping Policy
                    </a>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavigation("/cancellation-policy");
                        }}
                    >
                        Cancellation Policy
                    </a>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleNavigation("/employer/terms");
                        }}
                    >
                        Terms & Conditions
                    </a>
                </div>

                {/* Column 2 – Product */}
                <div className="footer-col">
                    <h3 className="footer-title">Product</h3>
                    <a href="#" onClick={(e) => e.preventDefault()}>AI Assessments</a>
                    <a href="#" onClick={(e) => e.preventDefault()}>Video Proctoring</a>
                    <a href="#" onClick={(e) => e.preventDefault()}>Smart Matching</a>
                    <a href="#" onClick={(e) => e.preventDefault()}>Security & Trust</a>
                </div>

                {/* Column 3 – Get Started */}
                <div className="footer-col">
                    <h3 className="footer-title">Get Started</h3>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleEmployerCTA();
                        }}
                    >
                        Employers
                    </a>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleJobSeekerCTA();
                        }}
                    >
                        Job Seekers
                    </a>
                    <a href="#" onClick={(e) => e.preventDefault()}>Pricing</a>
                    <a href="#" onClick={(e) => e.preventDefault()}>Blog</a>
                </div>

                {/* Column 4 – Social Media */}
                <div className="footer-col">
                    <h3 className="footer-title">Follow Us</h3>
                    <div className="footer-socials">
                        <a href="#" onClick={(e) => e.preventDefault()}><FaFacebookF /></a>
                        <a href="#" onClick={(e) => e.preventDefault()}><FaTwitter /></a>
                        <a href="#" onClick={(e) => e.preventDefault()}><FaLinkedinIn /></a>
                        <a href="#" onClick={(e) => e.preventDefault()}><FaInstagram /></a>
                    </div>
                </div>
            </div>

            {/* Core Branding */}
            <div className="footer-core">
                <div className="footer-core-brand">
                    <Image src={coreLogo} alt="Core Company Logo" className="footer-core-logo" />
                    <div className="footer-core-text">
                        <p className="footer-core-title">A Core Company</p>
                        <p className="footer-core-subtitle">Building trustworthy AI for hiring.</p>
                    </div>
                </div>
                <div className="footer-bottom">
                    <span>© 2025 Atract. AI-powered hiring platform.</span>
                    <div className="footer-bottom-links">
                        <a href="#" onClick={(e) => e.preventDefault()}>Security</a>
                        <a href="#" onClick={(e) => e.preventDefault()}>Status</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
