"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./HomeScreen.css";
import axios from "axios";
import { getJobApiBaseUrl } from "@/lib/api";

import {
    FaArrowRight,
    FaCheck,
    FaRocket,
    FaShieldAlt,
    FaChartLine,
    FaUsers,
    FaBriefcase,
    FaGraduationCap,
    FaFileAlt,
    FaVideo,
    FaBrain,
    FaSearch,
    FaBell,
    FaStar,
    FaAward,
    FaClock,
    FaGlobe,
    FaLock,
    FaUserCheck,
    FaLightbulb,
    FaNetworkWired,
    FaHandshake
} from "react-icons/fa";

import {
    Sparkles,
    UserCheck,
    ArrowRight,
    BrainCircuit,
    Search,
    ShieldCheck,
    Users,
    Check,
    Briefcase,
    Target,
    Zap,
    TrendingUp,
    Award,
    Clock,
    Globe,
    Lock,
    FileText,
    Video,
    BookOpen,
    MessageSquare,
    BarChart3,
    Star,
    Rocket,
    Lightbulb,
    Bell,
    FileDown,
    Wrench
} from "lucide-react";

import { motion } from "framer-motion";
import PdfLoginModal from "@/components/pdfLoginModal/PdfLoginModal";
import Cookies from "js-cookie";

/* Images */
const heroImg = "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1480&q=80";
const jobSeekerImg = "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1480&q=80";
const employerImg = "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1480&q=80";
const aiMatchingImg = "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1480&q=80";
const assessmentImg = "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1480&q=80";
const successImg = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1480&q=80";

/* Animation Variants */
const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
        opacity: 1, 
        y: 0, 
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
    },
};

const fadeIn = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1, 
        transition: { duration: 0.8, ease: "easeOut" } 
    },
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
        opacity: 1, 
        scale: 1, 
        transition: { duration: 0.5, ease: "easeOut" } 
    },
};

const stagger = { 
    visible: { 
        transition: { 
            staggerChildren: 0.15,
            delayChildren: 0.1
        } 
    } 
};

const staggerFast = { 
    visible: { 
        transition: { 
            staggerChildren: 0.1,
            delayChildren: 0.05
        } 
    } 
};

export default function HomeScreen({ onGetStarted }) {
    const router = useRouter();
    const [recentJobs, setRecentJobs] = useState([]);
    const [recentJobsLoading, setRecentJobsLoading] = useState(false);
    const [recentJobsError, setRecentJobsError] = useState(null);
    const [showPdfLoginModal, setShowPdfLoginModal] = useState(false);
    const [pendingRoute, setPendingRoute] = useState(null);

    useEffect(() => {
        const fetchRecentJobs = async () => {
            try {
                setRecentJobsLoading(true);
                setRecentJobsError(null);
                const resp = await axios.get(
                    `${getJobApiBaseUrl()}/public?page=1&limit=9`
                );
                if (resp.data?.success && Array.isArray(resp.data.data)) {
                    setRecentJobs(resp.data.data);
                } else {
                    setRecentJobs([]);
                    setRecentJobsError("Unable to load jobs right now.");
                }
            } catch (err) {
                console.error("Recent jobs fetch error:", err);
                setRecentJobsError("Unable to load jobs right now.");
            } finally {
                setRecentJobsLoading(false);
            }
        };

        fetchRecentJobs();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "1 day ago";
        if (diffDays === 2) return "2 days ago";
        if (diffDays === 3) return "3 days ago";
        if (diffDays <= 7) return `${diffDays} days ago`;

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatSalary = (min, max) => {
        if (!min && !max) return "Not disclosed";
        if (min && max) return `₹${(min / 100000).toFixed(1)}L - ₹${(max / 100000).toFixed(1)}L`;
        if (min) return `₹${(min / 100000).toFixed(1)}L+`;
        if (max) return `Up to ₹${(max / 100000).toFixed(1)}L`;
        return "Not disclosed";
    };

    const handleJobClick = (shortId) => {
        if (!shortId) return;
        router.push(`/${shortId}`);
    };

    const stats = [
        { value: "10K+", label: "Active Job Seekers", icon: <Users className="mainhomescreen-stat-icon" /> },
        { value: "500+", label: "Trusted Companies", icon: <Briefcase className="mainhomescreen-stat-icon" /> },
        { value: "95%", label: "Match Success Rate", icon: <Target className="mainhomescreen-stat-icon" /> },
        { value: "3x", label: "Faster Hiring", icon: <Zap className="mainhomescreen-stat-icon" /> }
    ];

    // Utility banners configuration - easily extendable (matches stat card design)
    const utilityBanners = [
        // Add more utility banners here in the future - they'll match stat card styling
    ];

    const jobSeekerFeatures = [
        {
            icon: <Search className="mainhomescreen-feature-icon" />,
            title: "Smart Job Discovery",
            description: "AI-powered job matching that finds opportunities tailored to your skills, experience, and career goals.",
            color: "blue"
        },
        {
            icon: <FileText className="mainhomescreen-feature-icon" />,
            title: "AI Resume Builder",
            description: "Create professional, ATS-friendly resumes with our intelligent resume builder powered by AI.",
            color: "purple"
        },
        {
            icon: <BrainCircuit className="mainhomescreen-feature-icon" />,
            title: "Skill Assessments",
            description: "Take comprehensive assessments to showcase your technical skills and get matched with relevant jobs.",
            color: "green"
        },
        {
            icon: <Video className="mainhomescreen-feature-icon" />,
            title: "Video Interviews",
            description: "Complete video proctored interviews from anywhere, anytime, with AI-powered evaluation.",
            color: "orange"
        },
        {
            icon: <Bell className="mainhomescreen-feature-icon" />,
            title: "Real-time Updates",
            description: "Get instant notifications about application status, new job matches, and interview invitations.",
            color: "pink"
        },
        {
            icon: <BarChart3 className="mainhomescreen-feature-icon" />,
            title: "Career Insights",
            description: "Track your application progress, view analytics, and get personalized career recommendations.",
            color: "indigo"
        }
    ];

    const employerFeatures = [
        {
            icon: <Sparkles className="mainhomescreen-feature-icon" />,
            title: "AI Candidate Matching",
            description: "Our advanced AI analyzes thousands of profiles to find the perfect candidates for your roles in seconds.",
            color: "blue",
            stats: [{ value: "95%", label: "Match Accuracy" }]
        },
        {
            icon: <ShieldCheck className="mainhomescreen-feature-icon" />,
            title: "Automated Screening",
            description: "Save time with AI-powered assessments that evaluate technical skills, problem-solving, and cultural fit.",
            color: "green",
            stats: [{ value: "80%", label: "Time Saved" }]
        },
        {
            icon: <UserCheck className="mainhomescreen-feature-icon" />,
            title: "Video Proctoring",
            description: "Conduct secure, AI-monitored video interviews with real-time integrity checks and comprehensive reports.",
            color: "purple",
            stats: [{ value: "100%", label: "Secure" }]
        },
        {
            icon: <TrendingUp className="mainhomescreen-feature-icon" />,
            title: "Analytics Dashboard",
            description: "Get detailed insights into candidate performance, hiring metrics, and pipeline analytics.",
            color: "orange",
            stats: [{ value: "360°", label: "View" }]
        },
        {
            icon: <Rocket className="mainhomescreen-feature-icon" />,
            title: "Quick Posting",
            description: "Post jobs in minutes with AI-assisted job description generation and optimization.",
            color: "pink",
            stats: [{ value: "5min", label: "Setup Time" }]
        },
        {
            icon: <Award className="mainhomescreen-feature-icon" />,
            title: "Quality Candidates",
            description: "Access pre-vetted, qualified candidates who have passed rigorous assessments and screenings.",
            color: "indigo",
            stats: [{ value: "Top 10%", label: "Talent Pool" }]
        }
    ];

    const howItWorks = [
        {
            number: "01",
            title: "Create Your Profile",
            description: "Sign up and build your profile with skills, experience, and preferences",
            icon: <UserCheck className="mainhomescreen-step-icon" />,
            gradient: "from-blue-500 to-cyan-500"
        },
        {
            number: "02",
            title: "AI Finds Matches",
            description: "Our AI analyzes your profile and matches you with perfect opportunities",
            icon: <Sparkles className="mainhomescreen-step-icon" />,
            gradient: "from-purple-500 to-pink-500"
        },
        {
            number: "03",
            title: "Apply & Get Hired",
            description: "Apply to matched jobs, complete assessments, and land your dream role",
            icon: <Check className="mainhomescreen-step-icon" />,
            gradient: "from-green-500 to-emerald-500"
        }
    ];

    const benefits = [
        {
            icon: <Clock className="mainhomescreen-benefit-icon" />,
            title: "Save Time",
            description: "Automated matching and screening reduce hiring time by 70%"
        },
        {
            icon: <Globe className="mainhomescreen-benefit-icon" />,
            title: "Global Reach",
            description: "Access talent from anywhere in the world"
        },
        {
            icon: <Lock className="mainhomescreen-benefit-icon" />,
            title: "Secure & Private",
            description: "Enterprise-grade security for all your data"
        },
        {
            icon: <Star className="mainhomescreen-benefit-icon" />,
            title: "Top Quality",
            description: "Only the best candidates make it through our screening"
        }
    ];

    return (
        <div className="mainhomescreen-wrapper">
            {/* Background Pattern */}
            <div className="mainhomescreen-bg-pattern" aria-hidden="true" />

            {/* Hero Section */}
            <section className="mainhomescreen-hero">
                <div className="mainhomescreen-container">
                    {/* Mobile Free Tools Banner */}
                    <motion.div 
                        className="mainhomescreen-mobile-free-tools-banner"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        onClick={() => router.push("/free-tools")}
                    >
                        <div className="mainhomescreen-mobile-banner-content">
                            <div className="mainhomescreen-mobile-banner-icon">
                                <Wrench size={24} />
                            </div>
                            <div className="mainhomescreen-mobile-banner-text">
                                <div className="mainhomescreen-mobile-banner-title">Explore Our Free Tools</div>
                                <div className="mainhomescreen-mobile-banner-subtitle">PDF, Word, Resume & More</div>
                            </div>
                            <ArrowRight className="mainhomescreen-mobile-banner-arrow" size={20} />
                        </div>
                        <div className="mainhomescreen-mobile-banner-shine"></div>
                    </motion.div>

                    {/* Utility Banners - styled like stat cards for easy integration */}
                    {utilityBanners.length > 0 && (
                        <motion.div 
                            className="mainhomescreen-utility-banners"
                            initial="hidden"
                            animate="visible"
                            variants={fadeInUp}
                        >
                            {utilityBanners.map((banner, idx) => (
                                <motion.div 
                                    key={idx}
                                    className="mainhomescreen-promo-banner"
                                    onClick={() => {
                                        // Check if user is already logged in (check both pdf_token and js_token)
                                        const pdfToken = localStorage.getItem("pdf_token") || Cookies.get("pdf_token");
                                        const jsToken = Cookies.get("js_token");
                                        if (pdfToken || jsToken) {
                                            // User is logged in, navigate directly
                                            router.push(banner.route);
                                        } else {
                                            // User not logged in, show login modal
                                            setPendingRoute(banner.route);
                                            setShowPdfLoginModal(true);
                                        }
                                    }}
                                    initial={{ opacity: 0, scale: 0.9, y: -20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ 
                                        duration: 0.5, 
                                        delay: idx * 0.1,
                                        type: "spring",
                                        stiffness: 100
                                    }}
                                    whileHover={{ 
                                        scale: 1.03, 
                                        y: -8,
                                        transition: { duration: 0.2 }
                                    }}
                                    style={{
                                        background: banner.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    }}
                                >
                                    <div className="mainhomescreen-promo-content">
                                        <div className="mainhomescreen-promo-icon-wrapper">
                                            {banner.icon}
                                        </div>
                                        <div className="mainhomescreen-promo-text">
                                            <div className="mainhomescreen-promo-label">{banner.label}</div>
                                            {banner.subtitle && (
                                                <div className="mainhomescreen-promo-subtitle">{banner.subtitle}</div>
                                            )}
                                        </div>
                                        <div className="mainhomescreen-promo-cta">
                                            <span>Try Now</span>
                                            <ArrowRight className="mainhomescreen-promo-arrow" />
                                        </div>
                                    </div>
                                    <div className="mainhomescreen-promo-shine"></div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                        <motion.div 
                            className="mainhomescreen-hero-content"
                            initial="hidden"
                            animate="visible"
                            variants={stagger}
                        >
                        <motion.div className="mainhomescreen-hero-left" variants={fadeInUp}>
                            <motion.span 
                                className="mainhomescreen-badge"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <FaRocket className="mainhomescreen-badge-icon" />
                                Trusted by 500+ Companies
                            </motion.span>

                            <motion.h1 
                                className="mainhomescreen-hero-title"
                                variants={fadeInUp}
                            >
                                Find Your Dream Job or Perfect Candidate with{" "}
                                <span className="mainhomescreen-highlight">AI-Powered Intelligence</span>
                            </motion.h1>

                            <motion.p 
                                className="mainhomescreen-hero-description"
                                variants={fadeInUp}
                            >
                                The future of recruitment is here. Experience seamless job matching, automated assessments, 
                                and intelligent candidate screening—all powered by cutting-edge AI technology.
                            </motion.p>

                            <motion.div 
                                className="mainhomescreen-hero-cta"
                                variants={fadeInUp}
                            >
                                <button 
                                    className="mainhomescreen-btn mainhomescreen-btn-primary"
                                    onClick={onGetStarted}
                                >
                                    Get Started Free
                                    <FaArrowRight className="mainhomescreen-btn-icon" />
                                </button>
                                <button 
                                    className="mainhomescreen-btn mainhomescreen-btn-secondary"
                                    onClick={() => router.push("/jobs")}
                                >
                                    Explore Jobs
                                </button>
                            </motion.div>
                        </motion.div>

                        <motion.div 
                            className="mainhomescreen-hero-right"
                            variants={scaleIn}
                            initial="hidden"
                            animate="visible"
                            transition={{ duration: 0.8, delay: 0.3 }}
                        >
                            <div className="mainhomescreen-hero-image-wrapper">
                                <img 
                                    src={heroImg} 
                                    alt="AI Recruitment Platform" 
                                    className="mainhomescreen-hero-image"
                                />
                                <div className="mainhomescreen-hero-overlay" />
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Stats - full width */}
                    <motion.div 
                        className="mainhomescreen-hero-stats"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={fadeInUp}
                    >
                        {stats.map((stat, idx) => (
                            <motion.div 
                                key={idx}
                                className="mainhomescreen-stat-card"
                                whileHover={{ scale: 1.05, y: -5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="mainhomescreen-stat-icon-wrapper">
                                    {stat.icon}
                                </div>
                                <div className="mainhomescreen-stat-content">
                                    <div className="mainhomescreen-stat-value">{stat.value}</div>
                                    <div className="mainhomescreen-stat-label">{stat.label}</div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Recent Jobs */}
                    <motion.div 
                        className="mainhomescreen-recent-jobs"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={fadeInUp}
                    >
                        <div className="mainhomescreen-recent-header">
                            <div>
                                <span className="mainhomescreen-section-badge">Recently Posted</span>
                                <h3 className="mainhomescreen-recent-title">Latest opportunities curated for you</h3>
                                <p className="mainhomescreen-recent-subtitle">Fresh roles from top employers. Apply in a click.</p>
                            </div>
                            <button
                                className="mainhomescreen-recent-cta"
                                onClick={() => router.push("/jobs")}
                            >
                                Explore more jobs
                            </button>
                        </div>

                        {recentJobsLoading ? (
                            <div className="mainhomescreen-recent-grid">
                                {Array.from({ length: 9 }).map((_, idx) => (
                                    <div key={`skeleton-${idx}`} className="mainhomescreen-job-card skeleton">
                                        <div className="mainhomescreen-job-card-header">
                                            <div className="mainhomescreen-job-title">
                                                <div className="skeleton-line short" />
                                                <div className="skeleton-line xshort" />
                                            </div>
                                            <div className="mainhomescreen-job-logo">
                                                <div className="skeleton-avatar" />
                                            </div>
                                        </div>
                                        <div className="mainhomescreen-job-meta">
                                            <span className="skeleton-pill" />
                                            <span className="skeleton-pill" />
                                            <span className="skeleton-pill" />
                                        </div>
                                        <div className="skeleton-line" />
                                        <div className="mainhomescreen-job-skills">
                                            <span className="skeleton-pill small" />
                                            <span className="skeleton-pill small" />
                                            <span className="skeleton-pill small" />
                                        </div>
                                        <div className="mainhomescreen-job-footer">
                                            <div className="skeleton-btn" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentJobsError ? (
                            <div className="mainhomescreen-recent-error">{recentJobsError}</div>
                        ) : recentJobs.length === 0 ? (
                            <div className="mainhomescreen-recent-empty">No jobs to show right now.</div>
                        ) : (
                            <>
                                <div className="mainhomescreen-recent-grid">
                                    {recentJobs.map((job) => {
                                        const companyName = job.employerId?.companyName || job.companyName || "Company";
                                        const companyLogo = job.employerId?.companyLogo;
                                        const skills = Array.isArray(job.skills) ? job.skills.slice(0, 3) : [];
                                        return (
                                            <div
                                                key={job._id}
                                                className="mainhomescreen-job-card"
                                                onClick={() => handleJobClick(job.shortId)}
                                            >
                                                <div className="mainhomescreen-job-card-header">
                                                    <div className="mainhomescreen-job-title">
                                                        <h4>{job.jobTitle}</h4>
                                                        <span>{companyName}</span>
                                                    </div>
                                                    <div className="mainhomescreen-job-logo">
                                                        {companyLogo ? (
                                                            <img src={companyLogo} alt={companyName} />
                                                        ) : (
                                                            <div className="mainhomescreen-job-logo-placeholder">
                                                                {companyName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mainhomescreen-job-meta">
                                                    {job.location && (
                                                        <span>{job.location}</span>
                                                    )}
                                                    <span>{formatSalary(job.minSalary, job.maxSalary)}</span>
                                                    <span>{formatDate(job.createdAt)}</span>
                                                </div>
                                                <p className="mainhomescreen-job-desc">
                                                    {(job.jobDescription || "").slice(0, 140)}{(job.jobDescription || "").length > 140 ? "..." : ""}
                                                </p>
                                                {skills.length > 0 && (
                                                    <div className="mainhomescreen-job-skills">
                                                        {skills.map((skill, idx) => (
                                                            <span key={`${job._id}-skill-${idx}`}>{skill}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="mainhomescreen-job-footer">
                                                    <button
                                                        className="mainhomescreen-job-apply"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleJobClick(job.shortId);
                                                        }}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mainhomescreen-recent-bottom">
                                    <button
                                        className="mainhomescreen-recent-cta secondary"
                                        onClick={() => router.push("/jobs")}
                                    >
                                        Explore more jobs
                                    </button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            </section>

            {/* Job Seeker Services Section */}
            <section className="mainhomescreen-section mainhomescreen-section-jobseeker">
                <div className="mainhomescreen-container">
                    <motion.div
                        className="mainhomescreen-section-header"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                    >
                        <span className="mainhomescreen-section-badge">For Job Seekers</span>
                        <h2 className="mainhomescreen-section-title">
                            Everything You Need to <span className="mainhomescreen-highlight">Land Your Dream Job</span>
                        </h2>
                        <p className="mainhomescreen-section-description">
                            Powerful tools and intelligent matching to help you find the perfect role and stand out to employers.
                        </p>
                    </motion.div>

                    <motion.div
                        className="mainhomescreen-features-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={stagger}
                    >
                        {jobSeekerFeatures.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                className={`mainhomescreen-feature-card mainhomescreen-feature-${feature.color}`}
                                variants={fadeInUp}
                                whileHover={{ y: -8, scale: 1.02 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="mainhomescreen-feature-icon-wrapper">
                                    {feature.icon}
                                </div>
                                <h3 className="mainhomescreen-feature-title">{feature.title}</h3>
                                <p className="mainhomescreen-feature-description">{feature.description}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div
                        className="mainhomescreen-image-showcase"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <div className="mainhomescreen-showcase-content">
                            <div className="mainhomescreen-showcase-text">
                                <h3 className="mainhomescreen-showcase-title">
                                    Track Your Applications in Real-Time
                                </h3>
                                <p className="mainhomescreen-showcase-description">
                                    Get instant updates on your application status, view detailed timelines, 
                                    and see when employers engage with your profile. Stay informed every step of the way.
                                </p>
                                <ul className="mainhomescreen-showcase-list">
                                    <li>
                                        <FaCheck className="mainhomescreen-list-icon" />
                                        Real-time application tracking
                                    </li>
                                    <li>
                                        <FaCheck className="mainhomescreen-list-icon" />
                                        Status updates and notifications
                                    </li>
                                    <li>
                                        <FaCheck className="mainhomescreen-list-icon" />
                                        Employer engagement insights
                                    </li>
                                </ul>
                            </div>
                            <div className="mainhomescreen-showcase-image-wrapper">
                                <img 
                                    src={jobSeekerImg} 
                                    alt="Job Seeker Dashboard" 
                                    className="mainhomescreen-showcase-image"
                                />
                                            </div>
                                        </div>
                    </motion.div>
                                    </div>
            </section>

            {/* Employer Services Section */}
            <section className="mainhomescreen-section mainhomescreen-section-employer">
                <div className="mainhomescreen-container">
                    <motion.div
                        className="mainhomescreen-section-header"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                    >
                        <span className="mainhomescreen-section-badge mainhomescreen-section-badge-employer">
                            For Employers
                        </span>
                        <h2 className="mainhomescreen-section-title">
                            Hire Smarter, Faster, and Better with <span className="mainhomescreen-highlight">AI-Powered Recruitment</span>
                        </h2>
                        <p className="mainhomescreen-section-description">
                            Streamline your hiring process with intelligent candidate matching, automated assessments, 
                            and comprehensive analytics—all in one platform.
                        </p>
                    </motion.div>

                    <motion.div
                        className="mainhomescreen-features-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={stagger}
                    >
                        {employerFeatures.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                className={`mainhomescreen-feature-card mainhomescreen-feature-${feature.color}`}
                                variants={fadeInUp}
                                whileHover={{ y: -8, scale: 1.02 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="mainhomescreen-feature-icon-wrapper">
                                    {feature.icon}
                                            </div>
                                <h3 className="mainhomescreen-feature-title">{feature.title}</h3>
                                <p className="mainhomescreen-feature-description">{feature.description}</p>
                                {feature.stats && (
                                    <div className="mainhomescreen-feature-stats">
                                        {feature.stats.map((stat, sIdx) => (
                                            <div key={sIdx} className="mainhomescreen-feature-stat">
                                                <span className="mainhomescreen-feature-stat-value">{stat.value}</span>
                                                <span className="mainhomescreen-feature-stat-label">{stat.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div
                        className="mainhomescreen-image-showcase mainhomescreen-image-showcase-reverse"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <div className="mainhomescreen-showcase-content">
                            <div className="mainhomescreen-showcase-image-wrapper">
                                <img 
                                    src={employerImg} 
                                    alt="Employer Dashboard" 
                                    className="mainhomescreen-showcase-image"
                                />
                                </div>
                            <div className="mainhomescreen-showcase-text">
                                <h3 className="mainhomescreen-showcase-title">
                                    Comprehensive Candidate Insights
                                </h3>
                                <p className="mainhomescreen-showcase-description">
                                    View detailed candidate profiles, assessment results, video interview summaries, 
                                    and make data-driven hiring decisions with confidence.
                                </p>
                                <ul className="mainhomescreen-showcase-list">
                                    <li>
                                        <FaCheck className="mainhomescreen-list-icon" />
                                        Complete assessment summaries
                                    </li>
                                    <li>
                                        <FaCheck className="mainhomescreen-list-icon" />
                                        Video interview analytics
                                    </li>
                                    <li>
                                        <FaCheck className="mainhomescreen-list-icon" />
                                        AI-powered candidate insights
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* How It Works */}
            <section className="mainhomescreen-section mainhomescreen-section-how">
                <div className="mainhomescreen-container">
                    <motion.div
                        className="mainhomescreen-section-header"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                    >
                        <span className="mainhomescreen-section-badge">Simple Process</span>
                        <h2 className="mainhomescreen-section-title">
                            How <span className="mainhomescreen-highlight">Atract</span> Works
                        </h2>
                        <p className="mainhomescreen-section-description">
                            Three simple steps to connect the right talent with the right opportunities.
                        </p>
                    </motion.div>

                    <motion.div
                        className="mainhomescreen-steps-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={stagger}
                    >
                        {howItWorks.map((step, idx) => (
                            <motion.div
                                key={idx}
                                className="mainhomescreen-step-card"
                                variants={fadeInUp}
                                whileHover={{ y: -10, scale: 1.03 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="mainhomescreen-step-number">{step.number}</div>
                                <div className={`mainhomescreen-step-icon-wrapper mainhomescreen-step-${idx + 1}`}>
                                    {step.icon}
                                </div>
                                <h3 className="mainhomescreen-step-title">{step.title}</h3>
                                <p className="mainhomescreen-step-description">{step.description}</p>
                                {idx < howItWorks.length - 1 && (
                                    <div className="mainhomescreen-step-connector">
                                        <ArrowRight className="mainhomescreen-connector-icon" />
                                    </div>
                                )}
                    </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="mainhomescreen-section mainhomescreen-section-benefits">
                <div className="mainhomescreen-container">
                    <motion.div
                        className="mainhomescreen-benefits-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={staggerFast}
                    >
                        {benefits.map((benefit, idx) => (
                            <motion.div
                                key={idx}
                                className="mainhomescreen-benefit-card"
                                variants={fadeInUp}
                                whileHover={{ y: -5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="mainhomescreen-benefit-icon-wrapper">
                                    {benefit.icon}
                                </div>
                                <h3 className="mainhomescreen-benefit-title">{benefit.title}</h3>
                                <p className="mainhomescreen-benefit-description">{benefit.description}</p>
                            </motion.div>
                        ))}
                </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="mainhomescreen-section mainhomescreen-section-cta">
                <div className="mainhomescreen-container">
                    <motion.div
                        className="mainhomescreen-cta-wrapper"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <div className="mainhomescreen-cta-content">
                            <h2 className="mainhomescreen-cta-title">
                                Ready to Transform Your Hiring or Career Journey?
                            </h2>
                            <p className="mainhomescreen-cta-description">
                                Join thousands of companies and job seekers who are already experiencing the future of recruitment.
                            </p>
                            <div className="mainhomescreen-cta-buttons">
                                <button 
                                    className="mainhomescreen-btn mainhomescreen-btn-primary mainhomescreen-btn-large"
                                    onClick={onGetStarted}
                                >
                                    Get Started Free
                                    <FaArrowRight className="mainhomescreen-btn-icon" />
                                </button>
                                <button 
                                    className="mainhomescreen-btn mainhomescreen-btn-outline mainhomescreen-btn-large"
                                    onClick={() => router.push("/jobs")}
                                >
                                    Browse Jobs
                                </button>
                            </div>
                        </div>
                        <div className="mainhomescreen-cta-image-wrapper">
                            <img 
                                src={successImg} 
                                alt="Success" 
                                className="mainhomescreen-cta-image"
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* PDF Login Modal - Google Sign-in Style */}
            <PdfLoginModal
                isOpen={showPdfLoginModal}
                onClose={() => {
                    setShowPdfLoginModal(false);
                    setPendingRoute(null);
                }}
                onLoginSuccess={() => {
                    // After successful login, navigate to the pending route
                    if (pendingRoute) {
                        router.push(pendingRoute);
                    }
                    setShowPdfLoginModal(false);
                    setPendingRoute(null);
                }}
            />
        </div>
    );
}
