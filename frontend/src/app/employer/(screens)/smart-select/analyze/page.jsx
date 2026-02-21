"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useSmartSelectPlanConfig } from '@/hooks/useSmartSelect';
import {
    FaTrashAlt, FaCheckCircle, FaDownload, FaStar, FaArrowLeft, FaFileAlt, FaBars, FaTimes, FaTimesCircle,
    FaTh, FaList, FaUsers, FaTrophy, FaClock, FaEnvelope, FaPhone, FaBriefcase, FaGraduationCap, FaMapMarkerAlt,
    FaCheck, FaExclamationTriangle, FaSearch, FaCog, FaUpload, FaSpinner, FaChartLine, FaMoneyBillWave
} from 'react-icons/fa';
import './page.css';

const STEPS = [
    "Gathering Resumes",
    "Extracting Applicant Info",
    "Comparing to Job Description",
    "Analyzing ATS Criteria",
    "Highlighting Issues",
    "Finalizing Reports"
];

const SmartSelectAnalyze = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Fetch plan configuration
    const { data: planConfigData, isLoading: planConfigLoading } = useSmartSelectPlanConfig();
    const userPlan = planConfigData?.userPlan;
    const allPlans = planConfigData?.plans || {};
    const features = planConfigData?.features || {};
    const planCounts = userPlan?.planCounts || {};
    const activePlanType = userPlan?.activePlanType;
    
    // Get available plans (plans that have counts > 0)
    const availablePlans = ['basic', 'premium', 'organization'].filter(planType => {
        const count = planCounts[planType] || 0;
        return count > 0;
    });
    
    // Use active plan type from backend, or default to highest available
    const selectedPlanType = activePlanType && availablePlans.includes(activePlanType) 
        ? activePlanType 
        : (availablePlans.includes('organization') ? 'organization' 
           : availablePlans.includes('premium') ? 'premium' 
           : availablePlans.includes('basic') ? 'basic' 
           : 'basic');
    
    // Get features for selected plan
    const selectedPlanConfig = allPlans[selectedPlanType];
    const selectedPlanFeatures = selectedPlanConfig?.features || [];
    const selectedPlanResumeLimit = selectedPlanConfig?.benefits?.resumeLimitPerAnalyze || 0;
    const selectedPlanCount = planCounts[selectedPlanType] || 0;
    
    // Helper functions to check feature availability based on selected plan
    const hasFeature = (featureCode) => {
        return selectedPlanFeatures.includes(featureCode);
    };
    
    // Check if user has counts from a specific plan
    const hasPlanCounts = (planType) => {
        return (planCounts[planType] || 0) > 0;
    };
    
    // Check if features are available based on selected plan
    const canUploadJD = hasFeature('smart-select-002');
    const canGenerateJD = hasFeature('smart-select-003');
    const canUseCompanyTrajectory = hasFeature('smart-select-001');
    const canExportExcelDoc = hasFeature('smart-select-005'); // Excel and DOC export
    // Salary benchmarking requires organization plan specifically
    const canUseSalaryBenchmark = selectedPlanType === 'organization' && hasFeature('smart-select-004');
    
    // Check if analysisId exists in URL (for initial state)
    const hasAnalysisId = searchParams?.get('analysisId') !== null;
    
    const [resumes, setResumes] = useState([]);
    const [jobDesc, setJobDesc] = useState("");
    const [topN, setTopN] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [error, setError] = useState("");
    // Initialize sidebar as closed if analysisId is present, otherwise open
    const [sidebarOpen, setSidebarOpen] = useState(!hasAnalysisId);
    const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);
    const [noCreditsMessage, setNoCreditsMessage] = useState("");
    const [viewMode, setViewMode] = useState('detailed');
    const [outputReceived, setOutputReceived] = useState(false);
    // Initialize loadingHistory to true if analysisId is present (prevents flash of drawer/empty state)
    const [loadingHistory, setLoadingHistory] = useState(hasAnalysisId);
    const [showClearAllModal, setShowClearAllModal] = useState(false);
    const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
    const [jdFile, setJdFile] = useState(null);
    const [showJDGeneratorModal, setShowJDGeneratorModal] = useState(false);
    const [jdGeneratorData, setJdGeneratorData] = useState({
        jobTitle: "",
        company: "",
        location: "",
        employmentType: "",
        experienceLevel: "",
        requiredSkills: "",
        responsibilities: "",
        qualifications: "",
        preferredSkills: "",
        salaryRange: "",
        benefits: ""
    });
    const [generatedJD, setGeneratedJD] = useState("");
    const [generatingJD, setGeneratingJD] = useState(false);
    const [companyType, setCompanyType] = useState("startup");
    const [companyComparisonEnabled, setCompanyComparisonEnabled] = useState(false);
    const [salaryBenchmarkEnabled, setSalaryBenchmarkEnabled] = useState(false);
    const [salaryUseJobDescription, setSalaryUseJobDescription] = useState(false);
    const [salaryRole, setSalaryRole] = useState("");
    const [salaryLocation, setSalaryLocation] = useState("");
    const [salaryExperience, setSalaryExperience] = useState("");
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [showJobDescriptionModal, setShowJobDescriptionModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeModalMessage, setUpgradeModalMessage] = useState('');
    const [reportFormat, setReportFormat] = useState('pdf');
    const [reportGenerating, setReportGenerating] = useState(false);
    const [reportError, setReportError] = useState('');
    const [reportTarget, setReportTarget] = useState(null);
    const [resultsView, setResultsView] = useState('summary');
    const fileInputRef = useRef();
    const jdFileInputRef = useRef();
    const reportContentRef = useRef();

    const companyTypeLabels = {
        "startup": "Startup",
        "mid-size": "Mid-size",
        "enterprise": "Enterprise"
    };

    const normalizeCompanyTypeKey = (value) => {
        if (!value) return "";
        const lower = value.toLowerCase();
        if (lower.includes("start")) return "startup";
        if (lower.includes("enterprise") || lower.includes("corporate") || lower.includes("fortune")) return "enterprise";
        if (lower.includes("mid")) return "mid-size";
        return "";
    };

    // Chart data useMemo hooks
    const atsChartData = useMemo(() => {
        if (!results?.allAnalyses) return [];
        return [...results.allAnalyses]
            .map((r, idx) => ({
                label: r.candidateName || r.fileName || `Resume ${idx + 1}`,
                value: Math.round(r.atsScore || 0),
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [results]);

    const companyFitChartData = useMemo(() => {
        if (!results?.allAnalyses) return [];
        return [...results.allAnalyses]
            .filter((r) => typeof r.companyContextFitScore === "number" && r.companyContextFitScore > 0)
            .map((r, idx) => ({
                label: r.candidateName || r.fileName || `Resume ${idx + 1}`,
                value: Math.round(r.companyContextFitScore || 0),
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [results]);

    const salaryChartData = useMemo(() => {
        if (!results?.allAnalyses) return { rows: [], maxMedian: 0 };
        const rows = results.allAnalyses
            .filter((r) => typeof r.salaryEstimate?.marketMedian === "number")
            .map((r, idx) => ({
                label: r.candidateName || r.fileName || `Resume ${idx + 1}`,
                median: r.salaryEstimate.marketMedian,
                min: typeof r.salaryEstimate?.estimatedRange?.min === "number" ? r.salaryEstimate.estimatedRange.min : null,
                max: typeof r.salaryEstimate?.estimatedRange?.max === "number" ? r.salaryEstimate.estimatedRange.max : null,
                currency: r.salaryEstimate?.estimatedRange?.currency || "INR",
                unit: r.salaryEstimate?.estimatedRange?.unit || "LPA",
                confidence: r.salaryEstimate?.confidence || null,
                notes: r.salaryEstimate?.notes || null,
            }))
            .sort((a, b) => (b.median ?? 0) - (a.median ?? 0))
            .slice(0, 5);
        const maxMedian = rows.reduce((max, row) => (row.median && row.median > max ? row.median : max), 0);
        return { rows, maxMedian };
    }, [results]);

    const issueData = useMemo(() => {
        if (!results?.allAnalyses) return { segments: [], total: 0, gradient: null };
        const counts = { critical: 0, warning: 0, info: 0 };
        results.allAnalyses.forEach((analysis) => {
            (analysis.issues || []).forEach((issue) => {
                const type = issue.type === "critical" ? "critical" : issue.type === "warning" ? "warning" : "info";
                counts[type] += 1;
            });
        });
        const segments = [
            { key: "critical", label: "Critical", color: "#ef4444", value: counts.critical },
            { key: "warning", label: "Warnings", color: "#f97316", value: counts.warning },
            { key: "info", label: "Info", color: "#0ea5e9", value: counts.info },
        ].filter((seg) => seg.value > 0);
        const total = segments.reduce((sum, seg) => sum + seg.value, 0);
        if (!total) {
            return { segments: [], total: 0, gradient: null };
        }
        let cumulative = 0;
        const gradient = segments
            .map((seg) => {
                const start = cumulative;
                cumulative += (seg.value / total) * 100;
                return `${seg.color} ${start}% ${cumulative}%`;
            })
            .join(", ");
        return { segments, total, gradient };
    }, [results]);

    const consFrequency = useMemo(() => {
        if (!results?.allAnalyses) return { items: [], maxValue: 0 };
        const counts = {};
        results.allAnalyses.forEach((analysis) => {
            (analysis.cons || []).forEach((con) => {
                if (!con) return;
                counts[con] = (counts[con] || 0) + 1;
            });
        });
        const items = Object.entries(counts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
        const maxValue = items.reduce((max, item) => (item.value > max ? item.value : max), 0);
        return { items, maxValue };
    }, [results]);

    const currentYear = useMemo(() => new Date().getFullYear(), []);
    const comparisonPalette = useMemo(() => ['#2563eb', '#22c55e', '#f97316', '#a855f7', '#ec4899'], []);
    const resultsViewOptions = useMemo(() => (
        [
            { key: 'summary', label: 'Summary View' },
            { key: 'skills', label: 'Skills View' },
            { key: 'comparison', label: 'Comparison View' },
        ]
    ), []);

    const SENIORITY_LEVELS = ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Director', 'VP', 'C-Level'];

    const inferSeniorityLevel = (roleRaw) => {
        if (!roleRaw) return { level: 2, label: 'Mid' };
        const role = roleRaw.toLowerCase();
        if (/(chief|cxo|ceo|coo|cto|cfo)/.test(role)) return { level: 7, label: 'C-Level' };
        if (/(vice president|vp)/.test(role)) return { level: 6, label: 'VP' };
        if (/(director|head\b)/.test(role)) return { level: 5, label: 'Director' };
        if (/(lead|principal)/.test(role)) return { level: 4, label: 'Lead' };
        if (/(senior|sr\b|staff)/.test(role)) return { level: 3, label: 'Senior' };
        if (/(mid|experienced|associate)/.test(role)) return { level: 2, label: 'Mid' };
        if (/(junior|jr\b|entry)/.test(role)) return { level: 1, label: 'Junior' };
        if (/(intern|trainee|apprentice)/.test(role)) return { level: 0, label: 'Intern' };
        return { level: 2, label: 'Mid' };
    };

    const parseTenureRange = (record, fallbackYear) => {
        if (!record) return null;
        const extractYear = (value) => {
            if (!value) return null;
            if (typeof value === 'number') return value;
            const match = String(value).match(/(19|20)\d{2}/);
            return match ? parseInt(match[0], 10) : null;
        };

        let startYear = extractYear(record.startYear || record.startDate || record.tenure);
        let endYear = extractYear(record.endYear || record.endDate || record.tenure);
        if (!startYear && record.tenure) {
            const matches = String(record.tenure).match(/(19|20)\d{2}/g);
            if (matches && matches.length) {
                startYear = parseInt(matches[0], 10);
                if (matches.length > 1) {
                    endYear = parseInt(matches[matches.length - 1], 10);
                }
            }
        }
        if (!startYear && record.years) {
            startYear = fallbackYear - Math.round(record.years);
        }
        if (!startYear) return null;
        if (!endYear || endYear < startYear) {
            endYear = record.isCurrent ? fallbackYear : startYear;
        }
        return { startYear, endYear };
    };

    const buildCareerSeries = useCallback((candidate, currentYear) => {
        if (!candidate) return null;
        const history = Array.isArray(candidate.companyHistory) ? candidate.companyHistory : [];
        const points = history
            .map((item, idx) => {
                const tenure = parseTenureRange(item, currentYear);
                if (!tenure) return null;
                const midpointYear = tenure.startYear + Math.floor((tenure.endYear - tenure.startYear) / 2);
                const seniority = inferSeniorityLevel(item.role || item.title || item.position || '');
                return {
                    id: `${candidate.candidateName || candidate.fileName || 'candidate'}-${idx}`,
                    year: Math.max(tenure.startYear, Math.min(currentYear, midpointYear)),
                    level: seniority.level,
                    label: seniority.label,
                    company: item.company || 'Unknown Company',
                    role: item.role || item.title || item.position || 'Role',
                    startYear: tenure.startYear,
                    endYear: tenure.endYear,
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.year - b.year);
        if (!points.length) return null;
        const minYear = points.reduce((min, p) => Math.min(min, p.startYear || p.year), Infinity);
        const maxYear = points.reduce((max, p) => Math.max(max, p.endYear || p.year), -Infinity);
        const uniquePoints = [];
        const seenYears = new Set();
        points.forEach((point) => {
            let year = point.year;
            while (seenYears.has(Number(year.toFixed(2)))) {
                year += 0.1;
            }
            seenYears.add(Number(year.toFixed(2)));
            uniquePoints.push({ ...point, year });
        });
        const maxLevel = uniquePoints.reduce((max, p) => Math.max(max, p.level), 0);
        return {
            id: candidate.candidateName || candidate.fileName || 'Candidate',
            color: null,
            minYear: Math.min(minYear, uniquePoints[0].year),
            maxYear: Math.max(maxYear, uniquePoints[uniquePoints.length - 1].year),
            maxLevel,
            points: uniquePoints,
        };
    }, []);

    const careerComparison = useMemo(() => {
        if (!results?.topResumes?.length) return null;
        const palette = comparisonPalette;
        const series = results.topResumes.slice(0, 5)
            .map((candidate, idx) => {
                const line = buildCareerSeries(candidate, currentYear);
                if (!line) return null;
                return {
                    ...line,
                    color: palette[idx % palette.length],
                };
            })
            .filter(Boolean);
        if (!series.length) return null;
        const minYear = series.reduce((min, s) => Math.min(min, s.minYear), Infinity);
        const maxYear = series.reduce((max, s) => Math.max(max, s.maxYear), -Infinity);
        const maxLevel = series.reduce((max, s) => Math.max(max, s.maxLevel ?? 0), 0);
        return {
            series,
            minYear,
            maxYear,
            maxLevel,
        };
    }, [results, buildCareerSeries, comparisonPalette, currentYear]);

    const normalizeSkillToken = useCallback((value) => {
        if (!value) return '';
        return value
            .toString()
            .toLowerCase()
            .replace(/[^a-z0-9+]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }, []);

    const formatSkillLabel = useCallback((value) => {
        if (!value) return '';
        const cleaned = value.toString().trim();
        return cleaned
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, []);

    const requiredSkillsList = useMemo(() => {
        const skillMap = new Map();

        const addSkill = (skill, source = 'analysis') => {
            const normalized = normalizeSkillToken(skill);
            if (!normalized) return;
            if (!skillMap.has(normalized)) {
                skillMap.set(normalized, {
                    id: normalized,
                    label: formatSkillLabel(skill),
                    sources: new Set([source]),
                });
            } else {
                skillMap.get(normalized).sources.add(source);
            }
        };

        if (Array.isArray(results?.allAnalyses)) {
            results.allAnalyses.forEach((analysis) => {
                (analysis?.matchedKeywords || []).forEach((skill) => addSkill(skill, 'matched'));
                (analysis?.missingKeywords || []).forEach((skill) => addSkill(skill, 'missing'));
                (analysis?.skills || []).forEach((skill) => addSkill(skill, 'resume'));
            });
        }

        if (!skillMap.size && jobDesc) {
            jobDesc
                .split(/[,\n]/)
                .map((chunk) => chunk.trim())
                .filter((chunk) => chunk.length > 2 && /[a-zA-Z]/.test(chunk))
                .forEach((skill) => addSkill(skill, 'job_desc'));
        }

        return Array.from(skillMap.values())
            .sort((a, b) => a.label.localeCompare(b.label))
            .slice(0, 24);
    }, [results, jobDesc, normalizeSkillToken, formatSkillLabel]);

    const skillHeatmapData = useMemo(() => {
        if (!requiredSkillsList.length || !Array.isArray(results?.allAnalyses)) return null;

        const candidateRows = results.allAnalyses.map((analysis, idx) => {
            const label = analysis.candidateName || analysis.fileName || `Candidate ${idx + 1}`;
            const matched = new Set((analysis?.matchedKeywords || []).map(normalizeSkillToken));
            const missing = new Set((analysis?.missingKeywords || []).map(normalizeSkillToken));
            const resumeSkills = (analysis?.skills || []).map(normalizeSkillToken);

            const determineStrength = (skillId) => {
                if (matched.has(skillId)) return 'strong';
                if (missing.has(skillId)) return 'weak';

                const directHit = resumeSkills.find((token) => token === skillId);
                if (directHit) return 'moderate';

                const partialMatch = resumeSkills.find((token) => token && (token.includes(skillId) || skillId.includes(token)));
                if (partialMatch) return 'moderate';

                const partialMatchedKeyword = Array.from(matched).find((token) => token && (token.includes(skillId) || skillId.includes(token)));
                if (partialMatchedKeyword) return 'strong';

                return 'weak';
            };

            const strengths = {};
            requiredSkillsList.forEach((skill) => {
                strengths[skill.id] = determineStrength(skill.id);
            });

            return {
                id: `candidate-${idx}`,
                label,
                color: comparisonPalette[idx % comparisonPalette.length],
                strengths,
            };
        });

        return {
            skills: requiredSkillsList,
            candidates: candidateRows,
        };
    }, [requiredSkillsList, results, normalizeSkillToken, comparisonPalette]);

    const token = Cookies.get('emp_token');

    // Handle file drop/upload
    function handleDrop(e) {
        e.preventDefault();
        addFiles(Array.from(e.dataTransfer.files));
    }

    function handleFileSelect(e) {
        addFiles(Array.from(e.target.files));
        e.target.value = '';
    }

    function addFiles(files) {
        const validFiles = files.filter(f => {
            const ext = f.name.toLowerCase().split('.').pop();
            return ['pdf', 'doc', 'docx'].includes(ext);
        });

        const currentCount = resumes.length;
        const newCount = currentCount + validFiles.length;
        
        // Check resume limit
        if (selectedPlanResumeLimit > 0 && newCount > selectedPlanResumeLimit) {
            toast.error(`Your plan allows a maximum of ${selectedPlanResumeLimit} resumes per analysis. Please remove some resumes or upgrade your plan.`);
            return;
        }

        const merged = [
            ...resumes,
            ...validFiles.filter(f => !resumes.some(r => r.name === f.name && r.size === f.size))
        ];
        setResumes(merged);
    }

    function removeResume(idx) {
        setResumes(resumes.filter((_, i) => i !== idx));
    }

    function handleDragOver(e) {
        e.preventDefault();
    }

    // Handle JD file upload
    function handleJDFileSelect(e) {
        if (!canUploadJD) {
            toast.error("JD document upload is not available in your current plan. Please upgrade to Premium or Organization plan.");
            e.target.value = '';
            return;
        }
        
        const file = e.target.files[0];
        if (file) {
            const ext = file.name.toLowerCase().split('.').pop();
            if (['pdf', 'doc', 'docx'].includes(ext)) {
                setJdFile(file);
                setError("");
            } else {
                setError("Please upload a PDF, DOC, or DOCX file for job description");
            }
        }
        e.target.value = '';
    }

    // Remove JD file
    function removeJDFile() {
        setJdFile(null);
    }

    // Generate JD with AI
    async function generateJDWithAI() {
        if (!canGenerateJD) {
            toast.error("AI Job Description generation is not available in your current plan. Please upgrade to Premium or Organization plan.");
            return;
        }
        
        try {
            setGeneratingJD(true);
            setError("");

            if (!jdGeneratorData.jobTitle.trim()) {
                setError("Job Title is required");
                setGeneratingJD(false);
                return;
            }

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/generate-job-description`,
                jdGeneratorData,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success && response.data.jobDescription) {
                setGeneratedJD(response.data.jobDescription);
            } else {
                setError(response.data.message || "Failed to generate job description");
                toast.error(response.data.message || "Failed to generate job description");
            }
        } catch (err) {
            console.error("Error generating JD:", err);
            const errorMsg = err.response?.data?.message || "Failed to generate job description";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setGeneratingJD(false);
        }
    }

    // Use generated JD
    function useGeneratedJD() {
        setJobDesc(generatedJD);
        setShowJDGeneratorModal(false);
        setGeneratedJD("");
        setJdGeneratorData({
            jobTitle: "",
            company: "",
            location: "",
            employmentType: "",
            experienceLevel: "",
            requiredSkills: "",
            responsibilities: "",
            qualifications: "",
            preferredSkills: "",
            salaryRange: "",
            benefits: ""
        });
    }

    // Discard generated JD
    function discardGeneratedJD() {
        setGeneratedJD("");
        setShowJDGeneratorModal(false);
    }

    // Load analysis history by analysisId
    async function loadAnalysisHistory(analysisId) {
        try {
            setLoadingHistory(true);
            setError("");
            
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/analysis/${analysisId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success && response.data.data) {
                const analysisData = response.data.data;
                
                if (analysisData.jobDescription) {
                    setJobDesc(analysisData.jobDescription);
                }
                if (analysisData.topN) {
                    setTopN(analysisData.topN.toString());
                }
                if (analysisData.companyType) {
                    const typeKey = normalizeCompanyTypeKey(analysisData.companyType);
                    if (typeKey) {
                        setCompanyType(typeKey);
                    }
                }
                const formattedResults = {
                    totalResumes: analysisData.totalResumes,
                    topResumes: analysisData.topResumesData || [],
                    allAnalyses: analysisData.analysesData || [],
                    analyzeRemaining: analysisData.analyzeRemaining || 0,
                    analysisId: analysisData.analysisId || analysisData._id,
                    companyType: analysisData.companyType || "",
                    companyFitSummary: analysisData.companyFitSummary || null,
                    salarySummary: analysisData.salarySummary || null,
                    salaryContext: analysisData.salaryContext || null,
                    metadata: analysisData.metadata || {},
                };

                setResults(formattedResults);
                setSidebarOpen(false);
                setCompanyComparisonEnabled(Boolean(formattedResults.companyFitSummary));
                setSalaryBenchmarkEnabled(Boolean(formattedResults.salarySummary));
            } else {
                setError("Analysis not found or could not be loaded");
                toast.error("Analysis not found or could not be loaded");
            }
        } catch (err) {
            console.error("Error loading analysis history:", err);
            const errorMsg = err.response?.data?.message || "Failed to load analysis history";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoadingHistory(false);
        }
    }

    // Download resume file
    async function downloadResume(filePath, fileName, analysisId) {
        try {
            if (!analysisId || !fileName) {
                toast.error("Unable to download: Missing file information");
                return;
            }

            // Extract just the filename from the full path if needed
            const cleanFileName = fileName.split('/').pop();
            const downloadUrl = `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/download-resume/${analysisId}/${encodeURIComponent(cleanFileName)}`;
            
            // Use axios to download with authentication headers
            const response = await axios.get(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                responseType: 'blob'
            });

            // Create blob and trigger download
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = cleanFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success('Resume downloaded successfully');
        } catch (err) {
            console.error("Download error:", err);
            toast.error(err.response?.data?.message || "Failed to download resume. Please try again.");
        }
    }

    const findCandidateRecord = (candidate) => {
        if (!candidate) return null;
        if (!results?.allAnalyses) return candidate;
        const matched = results.allAnalyses.find(item => {
            if (!item.fileName || !candidate.fileName) return false;
            const fileMatch = item.fileName === candidate.fileName;
            if (!fileMatch) return false;
            if (candidate.email) {
                return item.email === candidate.email;
            }
            return true;
        });
        return matched || candidate;
    };

    const escapeHtml = (value) =>
        value ? String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

    const formatPercent = (value) =>
        typeof value === 'number' ? `${Math.round(value)}%` : 'N/A';

    const buildTableRows = (rows) =>
        rows
            .map((candidate, index) => {
                const salary = getSalaryDisplay(candidate.salaryEstimate);
                return `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${escapeHtml(candidate.candidateName || candidate.fileName || '')}</td>
                        <td>${formatPercent(candidate.atsScore)}</td>
                        <td>${typeof candidate.companyContextFitScore === 'number' ? formatPercent(candidate.companyContextFitScore) : 'N/A'}</td>
                        <td>${candidate.recommendation ? escapeHtml(getRecommendationText(candidate.recommendation)) : 'N/A'}</td>
                        <td>${salary?.rangeText ? escapeHtml(salary.rangeText) : 'N/A'}</td>
                        <td>${salary?.medianText ? escapeHtml(salary.medianText) : 'N/A'}</td>
                        <td>${candidate.pros ? escapeHtml(candidate.pros.join('; ')) : ''}</td>
                        <td>${candidate.cons ? escapeHtml(candidate.cons.join('; ')) : ''}</td>
                    </tr>
                `;
            })
            .join('');

    const escapeCsvValue = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value).replace(/\r?\n|\r/g, ' ').trim();
        const needsQuoting = /[",]/.test(stringValue);
        const escaped = stringValue.replace(/"/g, '""');
        return needsQuoting ? `"${escaped}"` : escaped;
    };

    const buildCsv = (rows) => {
        const headers = [
            '#',
            'Candidate / File',
            'ATS Score',
            'Company Fit',
            'Recommendation',
            'Salary Range',
            'Salary Median',
            'Pros',
            'Cons',
        ];
        const csvRows = [headers.map(escapeCsvValue).join(',')];
        rows.forEach((candidate, index) => {
            const salary = getSalaryDisplay(candidate.salaryEstimate);
            csvRows.push(
                [
                    index + 1,
                    candidate.candidateName || candidate.fileName || '',
                    formatPercent(candidate.atsScore),
                    typeof candidate.companyContextFitScore === 'number' ? formatPercent(candidate.companyContextFitScore) : 'N/A',
                    candidate.recommendation ? getRecommendationText(candidate.recommendation) : 'N/A',
                    salary?.rangeText || 'N/A',
                    salary?.medianText || 'N/A',
                    candidate.pros ? candidate.pros.join('; ') : '',
                    candidate.cons ? candidate.cons.join('; ') : '',
                ]
                    .map(escapeCsvValue)
                    .join(',')
            );
        });
        return csvRows.join('\n');
    };

    const buildCandidateSummaryHtml = (candidate) => {
        const salary = getSalaryDisplay(candidate.salaryEstimate);
        return `
            <div class="report-section">
                <h2>Candidate Snapshot</h2>
                <ul>
                    <li><strong>Name / File:</strong> ${escapeHtml(candidate.candidateName || candidate.fileName || 'N/A')}</li>
                    <li><strong>ATS Score:</strong> ${formatPercent(candidate.atsScore)}</li>
                    <li><strong>Recommendation:</strong> ${candidate.recommendation ? escapeHtml(getRecommendationText(candidate.recommendation)) : 'N/A'}</li>
                    <li><strong>Company Fit:</strong> ${typeof candidate.companyContextFitScore === 'number' ? formatPercent(candidate.companyContextFitScore) : 'N/A'}</li>
                    <li><strong>Experience:</strong> ${candidate.experienceYears !== undefined && candidate.experienceYears !== null ? `${candidate.experienceYears} yrs` : 'N/A'}</li>
                    <li><strong>Location:</strong> ${escapeHtml(candidate.location || 'N/A')}</li>
                    <li><strong>Email:</strong> ${escapeHtml(candidate.email || 'N/A')}</li>
                    <li><strong>Phone:</strong> ${escapeHtml(candidate.phone || 'N/A')}</li>
                    <li><strong>Salary Range:</strong> ${salary?.rangeText ? escapeHtml(salary.rangeText) : 'N/A'}</li>
                    <li><strong>Salary Median:</strong> ${salary?.medianText ? escapeHtml(salary.medianText) : 'N/A'}</li>
                </ul>
            </div>
        `;
    };

    const buildReportHtml = (candidate) => {
        const rows = candidate ? [candidate] : (results?.allAnalyses || []);
        const companySection = !candidate && results?.companyFitSummary
            ? `
                <div class="report-section">
                    <h2>Company Trajectory Summary</h2>
                    <ul>
                        <li><strong>Target Type:</strong> ${escapeHtml(results.companyFitSummary.targetCompanyType || 'N/A')}</li>
                        <li><strong>Average Fit:</strong> ${results.companyFitSummary.averageFitScore !== null && results.companyFitSummary.averageFitScore !== undefined ? `${results.companyFitSummary.averageFitScore}%` : 'N/A'}</li>
                        ${results.companyFitSummary.strongestCandidate ? `<li><strong>Top Match:</strong> ${escapeHtml(results.companyFitSummary.strongestCandidate)} (${results.companyFitSummary.strongestCandidateScore || 'N/A'}%)</li>` : ''}
                        ${results.companyFitSummary.strongestInsight ? `<li><strong>Insight:</strong> ${escapeHtml(results.companyFitSummary.strongestInsight)}</li>` : ''}
                    </ul>
                </div>
            `
            : '';

        const salarySummarySection = !candidate && results?.salarySummary
            ? `
                <div class="report-section">
                    <h2>Salary Benchmark Summary</h2>
                    <ul>
                        ${results.salarySummary.role && !((results.salaryContext?.useJobDescription) ?? false) ? `<li><strong>Role:</strong> ${escapeHtml(results.salarySummary.role)}</li>` : ''}
                        ${results.salarySummary.location ? `<li><strong>Location:</strong> ${escapeHtml(results.salarySummary.location)}</li>` : ''}
                        ${results.salarySummary.experienceYears !== null && results.salarySummary.experienceYears !== undefined ? `<li><strong>Experience:</strong> ${results.salarySummary.experienceYears} yrs</li>` : ''}
                        <li><strong>Average Median:</strong> ${escapeHtml(formatSalaryValue(results.salarySummary.averageMedian, results.salarySummary.unit, results.salarySummary.currency) || 'N/A')}</li>
                        <li><strong>Average Range:</strong> ${escapeHtml(formatSalaryValue(results.salarySummary.averageMin, results.salarySummary.unit, results.salarySummary.currency) || 'N/A')} - ${escapeHtml(formatSalaryValue(results.salarySummary.averageMax, results.salarySummary.unit, results.salarySummary.currency) || 'N/A')}</li>
                    </ul>
                </div>
            `
            : '';

        const candidateSummary = candidate ? buildCandidateSummaryHtml(candidate) : '';
        const tableRows = buildTableRows(rows);

        return `
            <div class="report-wrapper">
                <h1>${candidate ? `Candidate Report – ${escapeHtml(candidate.candidateName || candidate.fileName || 'Candidate')}` : 'Resume Analysis Report'}</h1>
                <p><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
                ${candidate ? '' : `<p><strong>Total Resumes:</strong> ${results?.totalResumes ?? 0}</p>`}
                ${candidate ? '' : `<p><strong>Analyses Remaining:</strong> ${results?.analyzeRemaining ?? 0}</p>`}
                ${companySection}
                ${salarySummarySection}
                ${candidateSummary}
                <div class="report-section">
                    <h2>${candidate ? 'Candidate Breakdown' : 'Candidate Overview'}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Candidate / File</th>
                                <th>ATS Score</th>
                                <th>Company Fit</th>
                                <th>Recommendation</th>
                                <th>Salary Range</th>
                                <th>Salary Median</th>
                                <th>Pros</th>
                                <th>Cons</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    const getReportFilename = (extension, candidate = null) => {
        if (candidate) {
            const slug = (candidate.candidateName || candidate.fileName || 'candidate')
                .toString()
                .replace(/[^a-z0-9]/gi, '-').toLowerCase();
            return `${slug || 'candidate'}-report.${extension}`;
        }
        const base = `resume-analysis-${results?.analysisId || new Date().getTime()}`;
        return `${base}.${extension}`;
    };

    const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleGenerateReport = async () => {
        try {
            setReportGenerating(true);
            setReportError('');
            const record = reportTarget ? findCandidateRecord(reportTarget) : null;
            const rows = record ? [record] : (results?.allAnalyses || []);

            // Check if user has access to Excel/DOC export
            if ((reportFormat === 'excel' || reportFormat === 'doc') && !canExportExcelDoc) {
                setReportError('Excel and Word export are only available in Premium and Organization plans. Please upgrade your plan.');
                toast.error('Excel and Word export require Premium or Organization plan.');
                setReportGenerating(false);
                return;
            }

            if (reportFormat === 'pdf') {
                if (typeof window === 'undefined') {
                    setReportError('PDF generation is only available in the browser');
                    setReportGenerating(false);
                    return;
                }
                
                if (!reportContentRef.current) {
                    setReportError('Report content element not found');
                    setReportGenerating(false);
                    return;
                }
                
                // Dynamically import html2pdf only on client side
                const html2pdf = (await import('html2pdf.js')).default;
                
                const html = buildReportHtml(record);
                reportContentRef.current.innerHTML = html;
                reportContentRef.current.style.display = 'block';
                
                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: getReportFilename('pdf', record),
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                await html2pdf().set(opt).from(reportContentRef.current).save();
                reportContentRef.current.style.display = 'none';
                reportContentRef.current.innerHTML = '';
            } else if (reportFormat === 'excel') {
                const csv = buildCsv(rows);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                downloadBlob(blob, getReportFilename('csv', record));
            } else if (reportFormat === 'doc') {
                const html = buildReportHtml(record);
                const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`], { type: 'application/msword' });
                downloadBlob(blob, getReportFilename('doc', record));
            }
            
            setReportModalOpen(false);
            setReportTarget(null);
            toast.success('Report generated successfully');
        } catch (err) {
            console.error('Report generation error:', err);
            setReportError(err.message || 'Failed to generate report. Please try again.');
            toast.error(err.message || 'Failed to generate report. Please try again.');
            if (reportContentRef.current) {
                reportContentRef.current.style.display = 'none';
                reportContentRef.current.innerHTML = '';
            }
        } finally {
            setReportGenerating(false);
        }
    };

    const openReportModal = (candidate = null) => {
        const record = candidate ? findCandidateRecord(candidate) : null;
        setReportTarget(record);
        setReportFormat('pdf');
        setReportError('');
        setReportModalOpen(true);
    };

    // Career Progression Graph Component
    const CareerProgressionGraph = ({ data, comparison }) => {
        if (!data || !data.series || !data.series.length) {
            return (
                <div className="smart-select-analyze-career-graph smart-select-analyze-career-empty">
                    No career history detected in the resume.
                </div>
            );
        }

        const padding = { top: 20, right: 30, bottom: 32, left: 60 };
        const width = 600;
        const height = 220;
        const minYear = data.minYear;
        const maxYear = Math.max(minYear + 1, data.maxYear);
        const spanYears = maxYear - minYear;
        const effectiveMaxLevel = data.maxLevel ?? Math.max(...data.series.map((series) => series.maxLevel ?? 0));
        const maxLevel = Math.max(1, effectiveMaxLevel);
        const levelLabels = Array.from({ length: maxLevel + 1 }, (_, idx) => SENIORITY_LEVELS[idx] || `Level ${idx}`);

        const getX = (year) => padding.left + ((year - minYear) / spanYears) * (width - padding.left - padding.right);
        const getY = (level) => padding.top + (1 - level / maxLevel) * (height - padding.top - padding.bottom);

        return (
            <div className={`smart-select-analyze-career-graph ${comparison ? 'smart-select-analyze-career-graph-comparison' : ''}`}>
                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    <line
                        x1={padding.left}
                        y1={height - padding.bottom}
                        x2={width - padding.right}
                        y2={height - padding.bottom}
                        className="smart-select-analyze-career-axis-line"
                    />
                    {levelLabels.map((label, idx) => {
                        const y = getY(idx);
                        return (
                            <g key={label} className="smart-select-analyze-career-gridline">
                                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                                <text x={padding.left - 10} y={y + 4} className="smart-select-analyze-career-axis-label">
                                    {label}
                                </text>
                            </g>
                        );
                    })}
                    <line
                        x1={padding.left}
                        y1={padding.top}
                        x2={padding.left}
                        y2={height - padding.bottom}
                        className="smart-select-analyze-career-axis-line"
                    />
                    {data.series.map((series) => {
                        if (!series.points?.length) return null;
                        const path = series.points
                            .map((point, idx) => {
                                const x = getX(point.year);
                                const y = getY(point.level);
                                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                            })
                            .join(' ');
                        return (
                            <g key={series.id} className="smart-select-analyze-career-line-group">
                                <path d={path} stroke={series.color || '#2563eb'} />
                                {series.points.map((point) => {
                                    const x = getX(point.year);
                                    const y = getY(point.level);
                                    return (
                                        <circle key={point.id} cx={x} cy={y} fill={series.color || '#2563eb'} r={4}>
                                            <title>
                                                {`${point.role} @ ${point.company}\n${point.startYear} - ${point.endYear} (${point.label})`}
                                            </title>
                                        </circle>
                                    );
                                })}
                            </g>
                        );
                    })}
                    {[minYear, maxYear].map((year) => (
                        <text key={year} x={getX(year)} y={height - padding.bottom + 20} className="smart-select-analyze-career-axis-label" textAnchor="middle">
                            {Math.round(year)}
                        </text>
                    ))}
                </svg>
                {comparison && data.series.length > 1 && (
                    <div className="smart-select-analyze-career-legend">
                        {data.series.map((series) => (
                            <div key={series.id} className="smart-select-analyze-career-legend-item">
                                <span style={{ background: series.color || '#2563eb' }} />
                                <span>{series.id}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const SKILL_STRENGTH_META = {
        strong: { icon: '🟢', label: 'Strong', className: 'smart-select-analyze-skill-strong' },
        moderate: { icon: '🟠', label: 'Moderate', className: 'smart-select-analyze-skill-moderate' },
        weak: { icon: '🔴', label: 'Weak', className: 'smart-select-analyze-skill-weak' },
    };

    // Skill Heatmap Component
    const SkillHeatmap = ({ data }) => {
        if (!data || !data.skills?.length || !data.candidates?.length) {
            return (
                <div className="smart-select-analyze-skill-heatmap smart-select-analyze-skill-heatmap-empty">
                    Skill data is not available for this analysis.
                </div>
            );
        }

        return (
            <div className="smart-select-analyze-skill-heatmap">
                <div className="smart-select-analyze-skill-heatmap-table">
                    <div className="smart-select-analyze-skill-row smart-select-analyze-skill-row-header">
                        <div className="smart-select-analyze-skill-cell smart-select-analyze-skill-skill">Skill</div>
                        <div className="smart-select-analyze-skill-cell smart-select-analyze-skill-required">Required</div>
                        {data.candidates.map((candidate) => (
                            <div key={candidate.id} className="smart-select-analyze-skill-cell smart-select-analyze-skill-candidate">
                                {candidate.label}
                            </div>
                        ))}
                    </div>
                    {data.skills.map((skill) => (
                        <div key={skill.id} className="smart-select-analyze-skill-row">
                            <div className="smart-select-analyze-skill-cell smart-select-analyze-skill-skill">{skill.label}</div>
                            <div className="smart-select-analyze-skill-cell smart-select-analyze-skill-required"><FaCheck aria-label="Required skill" /></div>
                            {data.candidates.map((candidate) => {
                                const strength = candidate.strengths[skill.id] || 'weak';
                                const meta = SKILL_STRENGTH_META[strength] || SKILL_STRENGTH_META.weak;
                                return (
                                    <div key={`${candidate.id}-${skill.id}`} className="smart-select-analyze-skill-cell smart-select-analyze-skill-indicator">
                                        <span className={`smart-select-analyze-skill-dot ${meta.className}`} aria-hidden="true">{meta.icon}</span>
                                        <span className="smart-select-analyze-skill-indicator-label">{meta.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="smart-select-analyze-skill-legend">
                    {Object.entries(SKILL_STRENGTH_META).map(([key, meta]) => (
                        <div key={key} className="smart-select-analyze-skill-legend-item">
                            <span className={`smart-select-analyze-skill-dot ${meta.className}`} aria-hidden="true">{meta.icon}</span>
                            <span>{meta.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    useEffect(() => {
        if (!salaryBenchmarkEnabled) {
            setSalaryUseJobDescription(false);
        }
    }, [salaryBenchmarkEnabled]);

    // Check if viewing history (analysisId in URL params)
    const isViewingHistory = searchParams?.get('analysisId') !== null;
    const shouldHideSidebar = analyzing || (results && results.allAnalyses && results.allAnalyses.length > 0) || isViewingHistory;

    useEffect(() => {
        if (analyzing || (results && results.allAnalyses && results.allAnalyses.length > 0) || isViewingHistory) {
            setSidebarOpen(false);
            setAdvancedOptionsOpen(false);
        }
    }, [analyzing, results, isViewingHistory]);

    // Prevent body scrolling on this page
    useEffect(() => {
        // Store original styles
        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyHeight = document.body.style.height;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalHtmlHeight = document.documentElement.style.height;

        // Prevent scrolling
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100%';

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.body.style.height = originalBodyHeight;
            document.documentElement.style.overflow = originalHtmlOverflow;
            document.documentElement.style.height = originalHtmlHeight;
        };
    }, []);

    // Check for analysisId in URL and load history data
    // Set initial sidebar state on client to prevent hydration mismatch
    useLayoutEffect(() => {
        if (typeof window !== 'undefined') {
            const analysisId = searchParams?.get('analysisId');
            if (analysisId) {
                setSidebarOpen(false);
                setAdvancedOptionsOpen(false);
                setLoadingHistory(true); // Set loading immediately
            }
        }
    }, [searchParams]);

    useEffect(() => {
        const analysisId = searchParams?.get('analysisId');
        
        if (analysisId) {
            loadAnalysisHistory(analysisId);
        } else {
            // Reset loading state if analysisId is removed
            setLoadingHistory(false);
        }
    }, [searchParams]);

    // Prevent refresh/back during analysis
    useEffect(() => {
        if (analyzing) {
            window.onbeforeunload = () => "Resume analysis is in progress. Are you sure?";
        } else {
            window.onbeforeunload = null;
        }
        
        return () => {
            window.onbeforeunload = null;
        };
    }, [analyzing]);

    // Start analysis
    async function startAnalyze() {
        if (resumes.length === 0) {
            setError("Please upload at least one resume");
            return;
        }

        // Check resume limit
        if (selectedPlanResumeLimit > 0 && resumes.length > selectedPlanResumeLimit) {
            setError(`Your plan allows a maximum of ${selectedPlanResumeLimit} resumes per analysis. You have uploaded ${resumes.length} resumes. Please remove some resumes or upgrade your plan.`);
            toast.error(`Resume limit exceeded. Your plan allows ${selectedPlanResumeLimit} resumes per analysis.`);
            return;
        }

        // Check if company trajectory is enabled but not available in plan
        if (companyComparisonEnabled && !canUseCompanyTrajectory) {
            setError("Company trajectory analysis is not available in your current plan. Please upgrade to Premium or Organization plan.");
            toast.error("Company trajectory analysis requires Premium or Organization plan.");
            setCompanyComparisonEnabled(false);
            return;
        }

        // Check if salary benchmarking is enabled but user doesn't have organization counts
        if (salaryBenchmarkEnabled && !canUseSalaryBenchmark) {
            if (!hasPlanCounts('organization')) {
                setError("Salary benchmarking requires Organization plan counts. You don't have any Organization plan analyses remaining.");
                toast.error("Salary benchmarking requires Organization plan counts.");
            } else {
                setError("Salary benchmarking is not available in your current plan. Please upgrade to Organization plan.");
                toast.error("Salary benchmarking requires Organization plan.");
            }
            setSalaryBenchmarkEnabled(false);
            return;
        }

        // Remove analysisId from URL if present (starting fresh analysis)
        const analysisId = searchParams?.get('analysisId');
        if (analysisId) {
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.delete('analysisId');
            const newUrl = newSearchParams.toString() 
                ? `/employer/smart-select/analyze?${newSearchParams.toString()}`
                : '/employer/smart-select/analyze';
            router.replace(newUrl);
        }

        // Close sidebar and advanced options first
        setSidebarOpen(false);
        setAdvancedOptionsOpen(false);
        setAnalyzing(true);
        setError("");
        setResults(null);
        setStepIndex(0);
        setProgress(0);
        setOutputReceived(false);

        const timeouts = [];
        let currentStep = 0;

        try {
            if (salaryBenchmarkEnabled && !salaryUseJobDescription) {
                if (!salaryRole.trim() || !salaryLocation.trim() || !salaryExperience.trim()) {
                    setError("Please provide role, location, and experience years for salary benchmarking or choose to infer from the JD.");
                    setAnalyzing(false);
                    return;
                }
                if (isNaN(parseFloat(salaryExperience))) {
                    setError("Salary benchmarking experience must be a number.");
                    setAnalyzing(false);
                    return;
                }
            }

            const formData = new FormData();
            
            if (jdFile) {
                formData.append('jdFile', jdFile);
            } else if (jobDesc.trim()) {
                formData.append('jobDescription', jobDesc.trim());
            }
            
            if (topN && !isNaN(parseInt(topN))) {
                formData.append('topN', parseInt(topN));
            }
            if (companyComparisonEnabled && companyType) {
                formData.append('companyType', companyType);
            }
            formData.append('salaryBenchmarkEnabled', salaryBenchmarkEnabled ? 'true' : 'false');
            formData.append('salaryUseJobDescription', salaryUseJobDescription ? 'true' : 'false');
            if (salaryBenchmarkEnabled && !salaryUseJobDescription) {
                formData.append('salaryBenchmarkRole', salaryRole.trim());
                formData.append('salaryBenchmarkLocation', salaryLocation.trim());
                formData.append('salaryBenchmarkExperience', salaryExperience.trim());
            }

            resumes.forEach((file) => {
                formData.append('resumes', file);
            });

            setStepIndex(0);
            setProgress(0);
            
            const advanceToStep = (stepNum) => {
                currentStep = stepNum;
                setStepIndex(stepNum);
                const progressPercent = Math.floor((stepNum / STEPS.length) * 100);
                setProgress(progressPercent);
            };
            
            timeouts.push(setTimeout(() => {
                if (currentStep === 0) {
                    advanceToStep(1);
                }
            }, 3000));
            
            timeouts.push(setTimeout(() => {
                if (currentStep < 2) {
                    advanceToStep(2);
                }
            }, 6000));
            
            timeouts.push(setTimeout(() => {
                if (currentStep < 3) {
                    advanceToStep(3);
                }
            }, 9000));
            
            timeouts.push(setTimeout(() => {
                if (currentStep < 4) {
                    advanceToStep(4);
                }
            }, 12000));

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/analyze-multiple-resumes`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`
                    },
                }
            );

            timeouts.forEach(t => clearTimeout(t));

            setOutputReceived(true);

            const completeSteps = async () => {
                if (currentStep < 4) {
                    advanceToStep(4);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                advanceToStep(5);
                
                await new Promise(resolve => setTimeout(resolve, 1000));
                setStepIndex(STEPS.length);
                setProgress(100);
            };

            if (response.data.success) {
                await completeSteps();
                setResults(response.data.data);
            } else {
                await completeSteps();
                if (response.data.noCredits) {
                    setNoCreditsMessage(response.data.message || "No analyses remaining");
                    setShowNoCreditsModal(true);
                } else {
                    setError(response.data.message || "Analysis failed");
                }
            }
        } catch (err) {
            timeouts.forEach(t => clearTimeout(t));
            
            if (err.response?.data?.noCredits) {
                setNoCreditsMessage(err.response.data.message || "No analyses remaining");
                setShowNoCreditsModal(true);
            } else if (err.response?.data?.resumeLimitExceeded) {
                const errorMsg = err.response.data.message || `Resume limit exceeded. Your plan allows ${err.response.data.resumeLimit} resumes per analysis.`;
                setError(errorMsg);
                toast.error(errorMsg);
            } else if (err.response?.data?.featureNotAvailable) {
                const errorMsg = err.response.data.message || "This feature is not available in your current plan.";
                setError(errorMsg);
                toast.error(errorMsg);
            } else {
                setError(err.response?.data?.message || err.message || "Failed to analyze resumes");
                toast.error(err.response?.data?.message || err.message || "Failed to analyze resumes");
            }
            console.error("Analysis error:", err);
            setOutputReceived(true);
        } finally {
            setAnalyzing(false);
        }
    }

    const getRecommendationClass = (rec) => {
        switch (rec) {
            case 'strong_recommend': return 'smart-select-analyze-rec-strong';
            case 'recommend': return 'smart-select-analyze-rec-good';
            case 'consider': return 'smart-select-analyze-rec-consider';
            default: return 'smart-select-analyze-rec-not';
        }
    };

    const getRecommendationText = (rec) => {
        switch (rec) {
            case 'strong_recommend': return 'Strongly Recommended';
            case 'recommend': return 'Recommended';
            case 'consider': return 'Consider';
            default: return 'Not Recommended';
        }
    };

    const currencySymbols = {
        INR: '₹',
        USD: '$',
        EUR: '€',
        GBP: '£',
        AUD: 'A$',
        CAD: 'C$',
    };

    function formatSalaryValue(value, unit = 'LPA', currency = 'INR') {
        if (typeof value !== "number" || isNaN(value)) return null;
        const symbol = currencySymbols[currency?.toUpperCase?.()] || `${currency} `;
        const formatted =
            Math.abs(value) >= 1000
                ? value.toLocaleString(undefined, { maximumFractionDigits: 0 })
                : value % 1 === 0
                    ? value.toString()
                    : value.toFixed(1);
        return `${symbol}${formatted} ${unit}`.trim();
    }

    function getSalaryDisplay(est) {
        if (!est || !est.estimatedRange) return null;
        const { min, max, currency = 'INR', unit = 'LPA' } = est.estimatedRange;
        const minText = formatSalaryValue(min, unit, currency);
        const maxText = formatSalaryValue(max, unit, currency);

        let rangeText = null;
        if (minText && maxText) {
            const symbol = currencySymbols[currency?.toUpperCase?.()] || `${currency} `;
            const minNumber = min !== undefined && min !== null ? (min % 1 === 0 ? min.toFixed(0) : min.toFixed(1)) : null;
            const maxNumber = max !== undefined && max !== null ? (max % 1 === 0 ? max.toFixed(0) : max.toFixed(1)) : null;
            if (minNumber !== null && maxNumber !== null) {
                rangeText = `${symbol}${minNumber}–${symbol}${maxNumber} ${unit}`;
            } else {
                rangeText = `${minText} - ${maxText}`;
            }
        } else if (minText) {
            rangeText = `${minText}+`;
        } else if (maxText) {
            rangeText = `Up to ${maxText}`;
        }

        const medianText = formatSalaryValue(est.marketMedian, unit, currency);
        const confidenceLabel = est.confidence
            ? est.confidence
                .toString()
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())
            : null;

        return {
            rangeText,
            medianText,
            confidence: confidenceLabel,
            notes: est.notes || null,
        };
    }

    return (
        <React.Fragment>
        <div className="smart-select-analyze-container">
            {/* Summary Bar - Shown when sidebar is collapsed and no results and not viewing history */}
            {!sidebarOpen && !results && !isViewingHistory && !loadingHistory && (
                <div className="smart-select-analyze-summary-bar">
                    <div className="smart-select-analyze-summary-bar-content">
                        <div className="smart-select-analyze-summary-item smart-select-analyze-summary-resume-count">
                            <FaFileAlt className="smart-select-analyze-summary-icon" />
                            <span className="smart-select-analyze-summary-value-small">
                                {resumes.length}
                                {selectedPlanResumeLimit > 0 && ` / ${selectedPlanResumeLimit}`}
                            </span>
                            <span className="smart-select-analyze-summary-label-small">Resume{resumes.length !== 1 ? 's' : ''}</span>
                        </div>
                        {jobDesc.trim() && (
                            <div className="smart-select-analyze-summary-item smart-select-analyze-summary-jd-item">
                                <span className="smart-select-analyze-summary-label-small">JD</span>
                                <span className="smart-select-analyze-summary-text-small" title={jobDesc}>
                                    {jobDesc.length > 40 ? `${jobDesc.substring(0, 40)}...` : jobDesc}
                                </span>
                            </div>
                        )}
                        {topN && topN.trim() && (
                            <div className="smart-select-analyze-summary-item smart-select-analyze-summary-topn">
                                <span className="smart-select-analyze-summary-label-small">Top</span>
                                <span className="smart-select-analyze-summary-value-small">{topN}</span>
                            </div>
                        )}
                        {companyComparisonEnabled && (
                            <div className="smart-select-analyze-summary-item smart-select-analyze-summary-company-type">
                                <span className="smart-select-analyze-summary-label-small">Company Type</span>
                                <span className="smart-select-analyze-summary-value-small">
                                    {companyTypeLabels[companyType] || "Unspecified"}
                                </span>
                            </div>
                        )}
                        {salaryBenchmarkEnabled && (
                            <div className="smart-select-analyze-summary-item smart-select-analyze-summary-company-type">
                                <span className="smart-select-analyze-summary-label-small">Salary Benchmark</span>
                                <span className="smart-select-analyze-summary-value-small">
                                    {salaryUseJobDescription
                                        ? "From JD"
                                        : salaryRole
                                            ? `${salaryRole}`
                                            : "Enabled"}
                                </span>
                            </div>
                        )}
                    </div>
                    <button 
                        className="smart-select-analyze-summary-bar-toggle"
                        onClick={() => setSidebarOpen(true)}
                        title="Show Full Controls"
                    >
                        <FaBars />
                    </button>
                </div>
            )}

            {!(loadingHistory && isViewingHistory) && (
            <div className={`smart-select-analyze-left ${sidebarOpen ? 'smart-select-analyze-open' : 'smart-select-analyze-closed'} ${shouldHideSidebar ? 'smart-select-analyze-auto-hidden' : ''} ${advancedOptionsOpen ? 'smart-select-analyze-advanced-expanded' : ''}`} suppressHydrationWarning>
                <div className="smart-select-analyze-left-header">
                    <button className="smart-select-analyze-back-btn" onClick={() => router.push("/employer/smart-select")} title="Back to Dashboard">
                        <FaArrowLeft />
                    </button>
                    <div className="smart-select-analyze-header-actions">
                        {!advancedOptionsOpen && (
                            <button 
                                className="smart-select-analyze-advanced-options-btn"
                                onClick={() => setAdvancedOptionsOpen(true)}
                            >
                                <FaCog />
                                <span>Advanced Options</span>
                            </button>
                        )}
                        {advancedOptionsOpen && (
                            <button 
                                className="smart-select-analyze-advanced-options-btn smart-select-analyze-advanced-options-close"
                                onClick={() => setAdvancedOptionsOpen(false)}
                            >
                                <FaTimes />
                                <span>Close</span>
                            </button>
                        )}
                        {sidebarOpen && !advancedOptionsOpen && (
                            <button 
                                className="smart-select-analyze-close-sidebar-btn" 
                                onClick={() => setSidebarOpen(false)}
                                title="Close Sidebar"
                            >
                                <FaTimesCircle />
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="smart-select-analyze-left-content">
                    <h2 className="smart-select-analyze-title">Resume Analyzer</h2>
                    <p className="smart-select-analyze-subtitle">
                        Analyze multiple resumes against your job needs. Instantly view ATS fit, red flags, and make easier hiring decisions.
                    </p>
                    
                    {/* Advanced Options Content */}
                    {advancedOptionsOpen && (
                        <div className="smart-select-analyze-advanced-options-content">
                            {/* JD Section */}
                            <div className="smart-select-analyze-advanced-section">
                                <div className="smart-select-analyze-section-header">
                                    <h3 className="smart-select-analyze-section-title">Job Description</h3>
                                </div>
                                <div className="smart-select-analyze-section-content">
                                    {/* JD Input Section - Left and Right Split */}
                                    <div className="smart-select-analyze-jd-input-section">
                                        {/* Left Side - Textarea with Generate AI Button */}
                                        <div className="smart-select-analyze-jd-textarea-wrapper">
                                            <label className="smart-select-analyze-label" style={{ marginBottom: "8px" }}>
                                                Job Description (Optional)
                                            </label>
                                            <textarea
                                                className="smart-select-analyze-jobdesc smart-select-analyze-jobdesc-advanced"
                                                value={jobDesc}
                                                onChange={e => setJobDesc(e.target.value)}
                                                placeholder="Paste or type job description here..."
                                                rows={8}
                                                disabled={!!jdFile}
                                            />
                                            <div className="smart-select-analyze-jd-textarea-actions">
                                                <button 
                                                    type="button"
                                                    className="smart-select-analyze-generate-jd-btn"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowJDGeneratorModal(true);
                                                    }}
                                                    title="Generate Job Description with AI"
                                                >
                                                    <FaCog />
                                                    <span>Generate with AI</span>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Right Side - Dropzone and Uploaded File */}
                                        <div className="smart-select-analyze-jd-dropzone-wrapper">
                                            <label className="smart-select-analyze-label" style={{ marginBottom: "8px" }}>
                                                Upload JD File
                                                {!canUploadJD && (
                                                    <span style={{ fontSize: '12px', color: '#f59e0b', marginLeft: '10px' }}>
                                                        (Premium/Organization only)
                                                    </span>
                                                )}
                                            </label>
                                            <div className="smart-select-analyze-jd-right-content">
                                                <div 
                                                    className="smart-select-analyze-jd-dropzone"
                                                    style={{ opacity: canUploadJD ? 1 : 0.5, cursor: canUploadJD ? 'pointer' : 'not-allowed' }}
                                                    onDrop={(e) => {
                                                        if (!canUploadJD) {
                                                            toast.error("JD document upload is not available in your current plan.");
                                                            return;
                                                        }
                                                        e.preventDefault();
                                                        const file = e.dataTransfer.files[0];
                                                        if (file) {
                                                            const ext = file.name.toLowerCase().split('.').pop();
                                                            if (['pdf', 'doc', 'docx'].includes(ext)) {
                                                                setJdFile(file);
                                                                setError("");
                                                            } else {
                                                                setError("Please upload a PDF, DOC, or DOCX file");
                                                            }
                                                        }
                                                    }}
                                                    onDragOver={handleDragOver}
                                                    onClick={() => {
                                                        if (canUploadJD) {
                                                            jdFileInputRef.current?.click();
                                                        } else {
                                                            toast.error("JD document upload is not available in your current plan.");
                                                        }
                                                    }}
                                                >
                                                    <input
                                                        type="file"
                                                        ref={jdFileInputRef}
                                                        style={{ display: 'none' }}
                                                        onChange={handleJDFileSelect}
                                                        accept=".pdf,.doc,.docx"
                                                        disabled={!canUploadJD}
                                                    />
                                                    <div className="smart-select-analyze-jd-dropzone-inner">
                                                        <FaUpload className="smart-select-analyze-upload-icon" />
                                                        <div>Upload JD File <strong>(PDF, DOC, DOCX)</strong></div>
                                                        <div className="smart-select-analyze-dropzone-hint">Drag & Drop or click to browse</div>
                                                        <div className="smart-select-analyze-dropzone-hint" style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                                                            File will be processed during analysis
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Uploaded File Display */}
                                                {jdFile && (
                                                    <div className="smart-select-analyze-jd-file-card">
                                                        <div className="smart-select-analyze-jd-file-info">
                                                            <FaFileAlt className="smart-select-analyze-file-icon" />
                                                            <div className="smart-select-analyze-jd-file-details">
                                                                <span className="smart-select-analyze-file-name" title={jdFile.name}>{jdFile.name}</span>
                                                                <span className="smart-select-analyze-file-size">
                                                                    {(jdFile.size / 1024 / 1024).toFixed(2)} MB
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            className="smart-select-analyze-file-remove" 
                                                            onClick={removeJDFile}
                                                            title="Remove JD file"
                                                        >
                                                            <FaTrashAlt />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Company Trajectory Match Section */}
                            <div className="smart-select-analyze-advanced-section">
                                <div className="smart-select-analyze-section-header">
                                    <h3 className="smart-select-analyze-section-title">Company Trajectory Match (Optional)</h3>
                                    {!canUseCompanyTrajectory && (
                                        <span style={{ fontSize: '12px', color: '#f59e0b', marginLeft: '10px' }}>
                                            (Premium/Organization only)
                                        </span>
                                    )}
                                </div>
                                <div className="smart-select-analyze-section-content">
                                    <label className="smart-select-analyze-label" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: companyComparisonEnabled ? "12px" : "0", opacity: canUseCompanyTrajectory ? 1 : 0.5 }}>
                                        <input
                                            type="checkbox"
                                            checked={companyComparisonEnabled}
                                            onChange={(e) => {
                                                if (!canUseCompanyTrajectory) {
                                                    toast.error("Company trajectory analysis is not available in your current plan. Please upgrade to Premium or Organization plan.");
                                                    return;
                                                }
                                                setCompanyComparisonEnabled(e.target.checked);
                                            }}
                                            disabled={!canUseCompanyTrajectory}
                                            style={{ width: 18, height: 18 }}
                                        />
                                        <span>Enable company comparison</span>
                                    </label>
                                    {companyComparisonEnabled && (
                                        <>
                                            <label className="smart-select-analyze-label" style={{ marginBottom: "8px" }}>
                                                Compare with my company type
                                            </label>
                                            <select
                                                className="smart-select-analyze-topn-input"
                                                value={companyType}
                                                onChange={(e) => setCompanyType(e.target.value)}
                                            >
                                                <option value="startup">Startup (0-250 employees / Series A-C)</option>
                                                <option value="mid-size">Mid-size (250-2000 employees / Growth stage)</option>
                                                <option value="enterprise">Enterprise (2000+ employees / Public or late-stage)</option>
                                            </select>
                                        </>
                                    )}
                                    <p className="smart-select-analyze-dropzone-hint" style={{ marginTop: "10px" }}>
                                        We'll only analyze previous company trajectories when this option is enabled.
                                    </p>
                                </div>
                            </div>

                            {/* Salary Benchmark Section */}
                            <div className="smart-select-analyze-advanced-section">
                                <div className="smart-select-analyze-section-header">
                                    <h3 className="smart-select-analyze-section-title">Salary Benchmark Predictor (Optional)</h3>
                                    {!canUseSalaryBenchmark && (
                                        <span style={{ fontSize: '12px', color: '#f59e0b', marginLeft: '10px' }}>
                                            (Organization only)
                                        </span>
                                    )}
                                </div>
                                <div className="smart-select-analyze-section-content">
                                    <label className="smart-select-analyze-label" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: salaryBenchmarkEnabled ? "12px" : "0", opacity: canUseSalaryBenchmark ? 1 : 0.5 }}>
                                        <input
                                            type="checkbox"
                                            checked={canUseSalaryBenchmark ? salaryBenchmarkEnabled : false}
                                            onChange={(e) => {
                                                if (!canUseSalaryBenchmark) {
                                                    if (!hasPlanCounts('organization')) {
                                                        setUpgradeModalMessage('Salary Benchmarking requires Organization plan counts. You currently don\'t have any Organization plan analyses remaining. Please purchase an Organization plan to access this feature.');
                                                    } else {
                                                        setUpgradeModalMessage('Salary Benchmarking is only available in Organization plan. Upgrade to access advanced salary analysis features.');
                                                    }
                                                    setShowUpgradeModal(true);
                                                    return;
                                                }
                                                setSalaryBenchmarkEnabled(e.target.checked);
                                            }}
                                            disabled={!canUseSalaryBenchmark}
                                            style={{ width: 18, height: 18 }}
                                        />
                                        <span>Enable salary benchmark prediction</span>
                                    </label>
                                    {salaryBenchmarkEnabled && (
                                        <div className="smart-select-analyze-salary-inputs">
                                            <label className="smart-select-analyze-label" style={{ marginBottom: "8px" }}>
                                                Role Title
                                            </label>
                                            <input
                                                type="text"
                                                className="smart-select-analyze-topn-input"
                                                value={salaryRole}
                                                onChange={(e) => setSalaryRole(e.target.value)}
                                                disabled={salaryUseJobDescription}
                                                placeholder="e.g., Senior Software Engineer"
                                            />
                                            <label className="smart-select-analyze-label" style={{ marginTop: "16px", marginBottom: "8px" }}>
                                                Location
                                            </label>
                                            <input
                                                type="text"
                                                className="smart-select-analyze-topn-input"
                                                value={salaryLocation}
                                                onChange={(e) => setSalaryLocation(e.target.value)}
                                                disabled={salaryUseJobDescription}
                                                placeholder="e.g., Bengaluru, India"
                                            />
                                            <label className="smart-select-analyze-label" style={{ marginTop: "16px", marginBottom: "8px" }}>
                                                Years of Experience
                                            </label>
                                            <input
                                                type="number"
                                                className="smart-select-analyze-topn-input"
                                                value={salaryExperience}
                                                onChange={(e) => setSalaryExperience(e.target.value)}
                                                disabled={salaryUseJobDescription}
                                                placeholder="e.g., 5"
                                                min="0"
                                                step="0.5"
                                            />
                                            <label className="smart-select-analyze-label" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "16px" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={salaryUseJobDescription}
                                                    onChange={(e) => {
                                                        setSalaryUseJobDescription(e.target.checked);
                                                        if (e.target.checked) {
                                                            setSalaryRole("");
                                                            setSalaryLocation("");
                                                            setSalaryExperience("");
                                                        }
                                                    }}
                                                    style={{ width: 18, height: 18 }}
                                                />
                                                <span>Details are in my JD – infer role, location, and experience automatically</span>
                                            </label>
                                        </div>
                                    )}
                                    <p className="smart-select-analyze-dropzone-hint" style={{ marginTop: "10px" }}>
                                        Provide role, location, and experience to estimate competitive salary ranges and market medians, or let the system infer them from your JD.
                                    </p>
                                </div>
                            </div>

                            {/* Resumes Section */}
                            <div className="smart-select-analyze-advanced-section">
                                <div className="smart-select-analyze-section-header">
                                    <h3 className="smart-select-analyze-section-title">Resumes</h3>
                                </div>
                                <div className="smart-select-analyze-section-content">
                                    <label className="smart-select-analyze-label" style={{ marginBottom: "8px" }}>
                                        Top N Resumes (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        className="smart-select-analyze-topn-input"
                                        value={topN}
                                        onChange={e => setTopN(e.target.value)}
                                        placeholder="e.g., 5 (leave empty for all)"
                                        min="1"
                                    />

                                    <label className="smart-select-analyze-label" style={{ marginTop: "20px", marginBottom: "8px" }}>
                                        Upload Resumes <span style={{ color: "#b1002a", fontSize: 12, fontWeight: 700 }}>(PDF, DOC, DOCX)</span>
                                    </label>
                                    <div
                                        className="smart-select-analyze-dropzone"
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={handleFileSelect}
                                            accept=".pdf,.doc,.docx"
                                        />
                                        <div className="smart-select-analyze-dropzone-inner">
                                            <FaFileAlt className="smart-select-analyze-upload-icon" />
                                            <div>Drag & Drop or <strong>Browse</strong> resumes here</div>
                                            <div className="smart-select-analyze-dropzone-hint">Supported formats: PDF, DOC, DOCX</div>
                                        </div>
                                    </div>

                                    {/* Selected Resumes List */}
                                    {resumes.length > 0 && (
                                        <div className="smart-select-analyze-selected-resumes-section">
                                            <div className="smart-select-analyze-selected-header">
                                                <h4 className="smart-select-analyze-selected-title">
                                                    Selected Resumes ({resumes.length}
                                                    {selectedPlanResumeLimit > 0 && ` / ${selectedPlanResumeLimit}`})
                                                </h4>
                                                <button 
                                                    className="smart-select-analyze-clear-all-btn"
                                                    onClick={() => setShowClearAllModal(true)}
                                                    title="Remove all resumes"
                                                >
                                                    Clear All
                                                </button>
                                            </div>
                                            <div className="smart-select-analyze-files-list">
                                                {resumes.map((f, idx) => (
                                                    <div className="smart-select-analyze-file-card" key={`${f.name}-${f.size}-${idx}`}>
                                                        <div className="smart-select-analyze-file-info">
                                                            <FaFileAlt className="smart-select-analyze-file-icon" />
                                                            <div className="smart-select-analyze-file-details">
                                                                <span className="smart-select-analyze-file-name" title={f.name}>{f.name}</span>
                                                                <span className="smart-select-analyze-file-size">
                                                                    {(f.size / 1024 / 1024).toFixed(2)} MB
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            className="smart-select-analyze-file-remove" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeResume(idx);
                                                            }} 
                                                            title="Remove this resume"
                                                        >
                                                            <FaTrashAlt />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {resumes.length === 0 && (
                                        <div className="smart-select-analyze-no-files-message">
                                            No resumes selected. Please upload resumes to continue.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!advancedOptionsOpen && (
                        <>
                            <textarea
                                className="smart-select-analyze-jobdesc"
                                value={jobDesc}
                                onChange={e => setJobDesc(e.target.value)}
                                placeholder="Paste job description here or enter desired requirements..."
                                rows={4}
                                disabled={!!jdFile}
                            />

                            <label className="smart-select-analyze-label" style={{ marginTop: "22px" }}>
                                Top N Resumes (Optional)
                            </label>
                            <input
                                type="number"
                                className="smart-select-analyze-topn-input"
                                value={topN}
                                onChange={e => setTopN(e.target.value)}
                                placeholder="e.g., 5 (leave empty for all)"
                                min="1"
                            />

                            <label className="smart-select-analyze-label" style={{ marginTop: "22px" }}>
                                Upload Resumes <span style={{ color: "#b1002a", fontSize: 12, fontWeight: 700 }}>(PDF, DOC, DOCX)</span>
                            </label>
                            <div
                                className="smart-select-analyze-dropzone"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                    accept=".pdf,.doc,.docx"
                                />
                                <div className="smart-select-analyze-dropzone-inner">
                                    <FaFileAlt className="smart-select-analyze-upload-icon" />
                                    <div>Drag & Drop or <strong>Browse</strong> resumes here</div>
                                    <div className="smart-select-analyze-dropzone-hint">Supported formats: PDF, DOC, DOCX</div>
                                </div>
                            </div>

                            {/* Selected Resumes List */}
                            {resumes.length > 0 && (
                                <div className="smart-select-analyze-selected-resumes-section">
                                    <div className="smart-select-analyze-selected-header">
                                        <h3 className="smart-select-analyze-selected-title">
                                            Selected Resumes ({resumes.length}
                                            {selectedPlanResumeLimit > 0 && ` / ${selectedPlanResumeLimit}`})
                                        </h3>
                                        <button 
                                            className="smart-select-analyze-clear-all-btn"
                                            onClick={() => setShowClearAllModal(true)}
                                            title="Remove all resumes"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="smart-select-analyze-files-list">
                                        {resumes.map((f, idx) => (
                                            <div className="smart-select-analyze-file-card" key={`${f.name}-${f.size}-${idx}`}>
                                                <div className="smart-select-analyze-file-info">
                                                    <FaFileAlt className="smart-select-analyze-file-icon" />
                                                    <div className="smart-select-analyze-file-details">
                                                        <span className="smart-select-analyze-file-name" title={f.name}>{f.name}</span>
                                                        <span className="smart-select-analyze-file-size">
                                                            {(f.size / 1024 / 1024).toFixed(2)} MB
                                                        </span>
                                                    </div>
                                                </div>
                                                <button 
                                                    className="smart-select-analyze-file-remove" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeResume(idx);
                                                    }} 
                                                    title="Remove this resume"
                                                >
                                                    <FaTrashAlt />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {resumes.length === 0 && (
                                <div className="smart-select-analyze-no-files-message">
                                    No resumes selected. Please upload resumes to continue.
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <div className="smart-select-analyze-error">{error}</div>
                    )}
                </div>

                {/* Fixed Analyze button */}
                {resumes.length > 0 && !analyzing && (
                    <div className="smart-select-analyze-analyze-btn-fixed">
                        <button 
                            className="smart-select-analyze-analyze-btn" 
                            onClick={startAnalyze}
                            disabled={analyzing}
                        >
                            {analyzing ? "Analyzing..." : "Start Analyzing"}
                        </button>
                    </div>
                )}
            </div>
            )}

            <div className={`smart-select-analyze-right ${sidebarOpen ? 'smart-select-analyze-with-sidebar' : 'smart-select-analyze-no-sidebar'} ${shouldHideSidebar || !sidebarOpen ? 'smart-select-analyze-expanded' : ''} ${isViewingHistory ? 'smart-select-analyze-viewing-history' : ''}`}>
                {loadingHistory && isViewingHistory && (
                    <div className="smart-select-analyze-empty">
                        <FaSpinner className="smart-select-analyze-empty-icon" style={{ animation: 'spin 1s linear infinite' }} />
                        <h3>Loading Analysis...</h3>
                        <p>Please wait while we fetch the analysis data.</p>
                    </div>
                )}

                {!analyzing && !results && !loadingHistory && (
                    <div className="smart-select-analyze-empty">
                        <FaFileAlt className="smart-select-analyze-empty-icon" />
                        <h3>Ready to Analyze Resumes</h3>
                        <p>Upload resumes and optionally add a job description to get started.</p>
                    </div>
                )}

                {analyzing && (
                    <div className="smart-select-analyze-steps">
                        <h3>Analyzing Resumes...</h3>
                        <div className="smart-select-analyze-stepper">
                            {STEPS.map((s, idx) => (
                                <div className={`smart-select-analyze-step ${idx < stepIndex ? "smart-select-analyze-done" : ""}`} key={s}>
                                    {idx < stepIndex
                                        ? <FaCheckCircle className="smart-select-analyze-step-check" />
                                        : <span className="smart-select-analyze-step-dot"></span>
                                    }
                                    <span className="smart-select-analyze-step-label">{s}</span>
                                </div>
                            ))}
                        </div>
                        <div className="smart-select-analyze-progress-outer">
                            <div className="smart-select-analyze-progress-inner" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="smart-select-analyze-progress-perc">{progress}% Completed</div>
                    </div>
                )}

                {!analyzing && results && (
                    <div className="smart-select-analyze-results">
                        <div className="smart-select-analyze-results-summary">
                            <div className="smart-select-analyze-summary-header-with-toggle">
                                <div className="smart-select-analyze-summary-stats">
                                    <div className="smart-select-analyze-summary-stat">
                                        <div className="smart-select-analyze-summary-stat-icon">
                                            <FaUsers />
                                        </div>
                                        <span className="smart-select-analyze-summary-label">Total Resumes</span>
                                        <span className="smart-select-analyze-summary-value">{results.totalResumes}</span>
                                    </div>
                                    <div className="smart-select-analyze-summary-stat">
                                        <div className="smart-select-analyze-summary-stat-icon">
                                            <FaTrophy />
                                        </div>
                                        <span className="smart-select-analyze-summary-label">Top Resumes</span>
                                        <span className="smart-select-analyze-summary-value">{results.topResumes?.length || 0}</span>
                                    </div>
                                    <div className="smart-select-analyze-summary-stat">
                                        <div className="smart-select-analyze-summary-stat-icon">
                                            <FaClock />
                                        </div>
                                        <span className="smart-select-analyze-summary-label">Analyses Remaining</span>
                                        <span className="smart-select-analyze-summary-value">{results.analyzeRemaining}</span>
                                    </div>
                                    {typeof results.salarySummary?.averageMedian === "number" && (
                                        <div className="smart-select-analyze-summary-stat">
                                            <div className="smart-select-analyze-summary-stat-icon">
                                                <FaMoneyBillWave />
                                            </div>
                                            <span className="smart-select-analyze-summary-label">Avg Median</span>
                                            <span className="smart-select-analyze-summary-value">
                                                {formatSalaryValue(
                                                    results.salarySummary.averageMedian,
                                                    results.salarySummary.unit,
                                                    results.salarySummary.currency
                                                ) || "N/A"}
                                            </span>
                                        </div>
                                    )}
                                    {results.companyFitSummary?.averageFitScore !== null && results.companyFitSummary?.averageFitScore !== undefined && (
                                        <div className="smart-select-analyze-summary-stat">
                                            <div className="smart-select-analyze-summary-stat-icon">
                                                <FaTrophy />
                                            </div>
                                            <span className="smart-select-analyze-summary-label">Avg Company Fit</span>
                                            <span className="smart-select-analyze-summary-value">
                                                {results.companyFitSummary.averageFitScore}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="smart-select-analyze-summary-controls">
                                    {!isViewingHistory && (
                                        <button
                                            className="smart-select-analyze-summary-toggle-sidebar-btn"
                                            onClick={() => setSidebarOpen(!sidebarOpen)}
                                            title={sidebarOpen ? "Hide Controls" : "Show Controls"}
                                        >
                                            {sidebarOpen ? <FaTimes /> : <FaBars />}
                                            <span>{sidebarOpen ? "Hide Controls" : "Show Controls"}</span>
                                        </button>
                                    )}
                                    {isViewingHistory && (
                                        <button
                                            className="smart-select-analyze-summary-toggle-sidebar-btn"
                                            onClick={() => router.push("/employer/smart-select")}
                                            title="Go to Dashboard"
                                        >
                                            <FaArrowLeft />
                                            <span>Go to Dashboard</span>
                                        </button>
                                    )}
                                    <button
                                        className="smart-select-analyze-download-report-btn smart-select-analyze-download-report-btn-secondary"
                                        onClick={() => openReportModal(null)}
                                    >
                                        Download Full Report
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="smart-select-analyze-results-view-toggle">
                            {resultsViewOptions.map((option) => (
                                <button
                                    key={option.key}
                                    className={resultsView === option.key ? 'smart-select-analyze-active' : ''}
                                    onClick={() => setResultsView(option.key)}
                                >
                                    {option.label}
                                </button>
                            ))}
                            <button
                                className="smart-select-analyze-job-description-btn"
                                onClick={() => setShowJobDescriptionModal(true)}
                                title="View Job Description"
                            >
                                <FaFileAlt /> Job Description
                            </button>
                        </div>

                        {resultsView === 'summary' && (
                            <>
                                {(results.companyFitSummary || results.salarySummary) && (
                                    <div className="smart-select-analyze-summary-cards-grid" style={{ marginTop: "20px" }}>
                                        {results.companyFitSummary && (
                                            <div className="smart-select-analyze-all-analyses-section">
                                                <div className="smart-select-analyze-section-header-with-actions">
                                                    <h3 className="smart-select-analyze-section-title">
                                                        <FaChartLine /> Company Trajectory Match
                                                    </h3>
                                                </div>
                                                <div className="smart-select-analyze-company-trajectory-card">
                                                    <div className="smart-select-analyze-company-trajectory-item">
                                                        <FaChartLine className="smart-select-analyze-company-trajectory-icon" />
                                                        <div className="smart-select-analyze-company-trajectory-content">
                                                            <span className="smart-select-analyze-company-trajectory-label">Comparing candidates against:</span>
                                                            <span className="smart-select-analyze-company-trajectory-value">{results.companyFitSummary.targetCompanyType}</span>
                                                        </div>
                                                    </div>
                                                    {results.companyFitSummary.averageFitScore !== null && (
                                                        <div className="smart-select-analyze-company-trajectory-item">
                                                            <FaTrophy className="smart-select-analyze-company-trajectory-icon" />
                                                            <div className="smart-select-analyze-company-trajectory-content">
                                                                <span className="smart-select-analyze-company-trajectory-label">Average Company Context Fit Score:</span>
                                                                <span className="smart-select-analyze-company-trajectory-value">{results.companyFitSummary.averageFitScore}%</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {results.companyFitSummary.strongestCandidate && (
                                                        <div className="smart-select-analyze-company-trajectory-item">
                                                            <FaStar className="smart-select-analyze-company-trajectory-icon" />
                                                            <div className="smart-select-analyze-company-trajectory-content">
                                                                <span className="smart-select-analyze-company-trajectory-label">Strongest match:</span>
                                                                <span className="smart-select-analyze-company-trajectory-value">
                                                                    {results.companyFitSummary.strongestCandidate}
                                                                    {results.companyFitSummary.strongestCandidateScore !== null && (
                                                                        <> ({results.companyFitSummary.strongestCandidateScore}%)</>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {results.companyFitSummary.strongestInsight && (
                                                        <div className="smart-select-analyze-company-trajectory-item">
                                                            <FaCheckCircle className="smart-select-analyze-company-trajectory-icon" />
                                                            <div className="smart-select-analyze-company-trajectory-content">
                                                                <span className="smart-select-analyze-company-trajectory-label">Insight:</span>
                                                                <span className="smart-select-analyze-company-trajectory-value">{results.companyFitSummary.strongestInsight}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {results.salarySummary && (
                                            <div className="smart-select-analyze-all-analyses-section">
                                                <div className="smart-select-analyze-section-header-with-actions">
                                                    <h3 className="smart-select-analyze-section-title">
                                                        <FaMoneyBillWave /> Salary Benchmark
                                                    </h3>
                                                </div>
                                                <div className="smart-select-analyze-company-trajectory-card">
                                                    {results.salarySummary.role && !((results.salaryContext?.useJobDescription) ?? (results.metadata?.salaryContext?.useJobDescription)) && (
                                                        <div className="smart-select-analyze-company-trajectory-item">
                                                            <FaBriefcase className="smart-select-analyze-company-trajectory-icon" />
                                                            <div className="smart-select-analyze-company-trajectory-content">
                                                                <span className="smart-select-analyze-company-trajectory-label">Role:</span>
                                                                <span className="smart-select-analyze-company-trajectory-value">{results.salarySummary.role}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {results.salarySummary.location && (
                                                        <div className="smart-select-analyze-company-trajectory-item">
                                                            <FaMapMarkerAlt className="smart-select-analyze-company-trajectory-icon" />
                                                            <div className="smart-select-analyze-company-trajectory-content">
                                                                <span className="smart-select-analyze-company-trajectory-label">Location:</span>
                                                                <span className="smart-select-analyze-company-trajectory-value">{results.salarySummary.location}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {results.salarySummary.experienceYears !== null && results.salarySummary.experienceYears !== undefined && (
                                                        <div className="smart-select-analyze-company-trajectory-item">
                                                            <FaClock className="smart-select-analyze-company-trajectory-icon" />
                                                            <div className="smart-select-analyze-company-trajectory-content">
                                                                <span className="smart-select-analyze-company-trajectory-label">Experience considered:</span>
                                                                <span className="smart-select-analyze-company-trajectory-value">{results.salarySummary.experienceYears} yrs</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="smart-select-analyze-company-trajectory-item">
                                                        <FaMoneyBillWave className="smart-select-analyze-company-trajectory-icon" />
                                                        <div className="smart-select-analyze-company-trajectory-content">
                                                            <span className="smart-select-analyze-company-trajectory-label">Average median salary:</span>
                                                            <span className="smart-select-analyze-company-trajectory-value">
                                                                {formatSalaryValue(
                                                                    results.salarySummary.averageMedian,
                                                                    results.salarySummary.unit,
                                                                    results.salarySummary.currency
                                                                ) || "Not available"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {(typeof results.salarySummary.averageMin === "number" || typeof results.salarySummary.averageMax === "number") && (
                                                        <div className="smart-select-analyze-company-trajectory-item">
                                                            <FaMoneyBillWave className="smart-select-analyze-company-trajectory-icon" />
                                                            <div className="smart-select-analyze-company-trajectory-content">
                                                                <span className="smart-select-analyze-company-trajectory-label">Average range:</span>
                                                                <span className="smart-select-analyze-company-trajectory-value">
                                                                    {formatSalaryValue(results.salarySummary.averageMin, results.salarySummary.unit, results.salarySummary.currency) || "N/A"} - {formatSalaryValue(results.salarySummary.averageMax, results.salarySummary.unit, results.salarySummary.currency) || "N/A"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {results.salarySummary.sampleCount !== undefined && (
                                                        <div className="smart-select-analyze-company-trajectory-item">
                                                            <FaUsers className="smart-select-analyze-company-trajectory-icon" />
                                                            <div className="smart-select-analyze-company-trajectory-content">
                                                                <span className="smart-select-analyze-company-trajectory-label">Sample size:</span>
                                                                <span className="smart-select-analyze-company-trajectory-value">
                                                                    {results.salarySummary.sampleCount} candidate{results.salarySummary.sampleCount === 1 ? "" : "s"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {((results.salaryContext?.useJobDescription) ?? (results.metadata?.salaryContext?.useJobDescription)) && (
                                                        <div className="smart-select-analyze-company-trajectory-item">
                                                            <FaFileAlt className="smart-select-analyze-company-trajectory-icon" />
                                                            <div className="smart-select-analyze-company-trajectory-content">
                                                                <span className="smart-select-analyze-company-trajectory-label">Source:</span>
                                                                <span className="smart-select-analyze-company-trajectory-value">Inferred from job description</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {results.topResumes && results.topResumes.length > 0 && (
                                    <div className="smart-select-analyze-top-resumes-section">
                                        <h3 className="smart-select-analyze-section-title">
                                            <FaStar /> Top Recommended Resumes
                                        </h3>
                                        <div className="smart-select-analyze-results-list smart-select-analyze-top-resumes">
                                            {results.topResumes.map((r, i) => {
                                                const total = results.topResumes.length;
                                                const top30Percent = Math.ceil(total * 0.3);
                                                const next30Percent = Math.ceil(total * 0.3);
                                                const salaryDisplay = getSalaryDisplay(r.salaryEstimate);
                                                const careerSeries = buildCareerSeries(r, currentYear);
                                                const candidateColor = comparisonPalette[i % comparisonPalette.length];
                                        
                                                let categoryClass = '';
                                                if (i < top30Percent) {
                                                    categoryClass = 'smart-select-analyze-top-tier-green';
                                                } else if (i < top30Percent + next30Percent) {
                                                    categoryClass = 'smart-select-analyze-top-tier-orange';
                                                } else {
                                                    categoryClass = 'smart-select-analyze-top-tier-red';
                                                }
                                        
                                                return (
                                                    <div className={`smart-select-analyze-result-card smart-select-analyze-top-card ${categoryClass}`} key={i}>
                                                        <div className="smart-select-analyze-result-header">
                                                            <div className="smart-select-analyze-result-rank">#{i + 1}</div>
                                                            <div className="smart-select-analyze-result-scores">
                                                                {r.fitScore > 0 && (
                                                                    <span className="smart-select-analyze-score-badge smart-select-analyze-fit-score">
                                                                        Fit: {r.fitScore}%
                                                                    </span>
                                                                )}
                                                                <span className={`smart-select-analyze-score-badge smart-select-analyze-ats-score ${r.atsScore > 75 ? "smart-select-analyze-good" : r.atsScore > 60 ? "smart-select-analyze-ok" : "smart-select-analyze-low"}`}>
                                                                    ATS: {r.atsScore}%
                                                                </span>
                                                                {typeof r.companyContextFitScore === "number" && (
                                                                    <span className="smart-select-analyze-score-badge smart-select-analyze-fit-score">
                                                                        Company: {r.companyContextFitScore}%
                                                                    </span>
                                                                )}
                                                                {salaryDisplay?.rangeText && (
                                                                    <span className="smart-select-analyze-score-badge smart-select-analyze-fit-score">
                                                                        Salary: {salaryDisplay.rangeText}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="smart-select-analyze-result-main">
                                                            <div className="smart-select-analyze-result-name">{r.candidateName}</div>
                                                            <div className="smart-select-analyze-result-role">{r.currentRole}</div>
                                                            <div className="smart-select-analyze-result-info">
                                                                <div className="smart-select-analyze-info-item">
                                                                    <FaEnvelope className="smart-select-analyze-info-icon" />
                                                                    <span>{r.email}</span>
                                                                </div>
                                                                <div className="smart-select-analyze-info-item">
                                                                    <FaPhone className="smart-select-analyze-info-icon" />
                                                                    <span>{r.phone}</span>
                                                                </div>
                                                            </div>
                                                            <div className="smart-select-analyze-result-info">
                                                                <div className="smart-select-analyze-info-item">
                                                                    <FaBriefcase className="smart-select-analyze-info-icon" />
                                                                    <span>{r.experienceYears} yrs exp</span>
                                                                </div>
                                                                {r.location && (
                                                                    <div className="smart-select-analyze-info-item">
                                                                        <FaMapMarkerAlt className="smart-select-analyze-info-icon" />
                                                                        <span>{r.location}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className={`smart-select-analyze-recommendation-badge ${getRecommendationClass(r.recommendation)}`}>
                                                                {getRecommendationText(r.recommendation)}
                                                            </div>
                                                            {r.summary && (
                                                                <div className="smart-select-analyze-result-summary">{r.summary}</div>
                                                            )}
                                                            {r.companyTrajectoryMatch && (
                                                                <div className="smart-select-analyze-result-summary smart-select-analyze-company-context">
                                                                    <strong>Trajectory Insight:</strong> {r.companyTrajectoryMatch}
                                                                </div>
                                                            )}
                                                            {salaryDisplay?.medianText && (
                                                                <div className="smart-select-analyze-result-summary smart-select-analyze-salary-context">
                                                                    <strong>Market Median:</strong> {salaryDisplay.medianText}
                                                                    {salaryDisplay.confidence && (
                                                                        <div style={{ marginTop: "4px" }}>Confidence: {salaryDisplay.confidence}</div>
                                                                    )}
                                                                    {salaryDisplay.notes && (
                                                                        <div style={{ marginTop: "4px" }}>{salaryDisplay.notes}</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {careerSeries && (
                                                                <div className="smart-select-analyze-result-section">
                                                                    <div className="smart-select-analyze-section-header">
                                                                        <FaChartLine className="smart-select-analyze-section-header-icon" />
                                                                        <span>Career Progression</span>
                                                                    </div>
                                                                    <CareerProgressionGraph
                                                                        data={{
                                                                            series: [{
                                                                                ...careerSeries,
                                                                                color: candidateColor,
                                                                            }],
                                                                            minYear: careerSeries.minYear,
                                                                            maxYear: careerSeries.maxYear,
                                                                            maxLevel: careerSeries.maxLevel,
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="smart-select-analyze-card-visuals">
                                                            <div className="smart-select-analyze-card-visual">
                                                                <div className="smart-select-analyze-card-visual-title">ATS Score</div>
                                                                <div className="smart-select-analyze-card-visual-track">
                                                                    <div className="smart-select-analyze-card-visual-bar" style={{ width: `${Math.min(100, Math.max(0, r.atsScore || 0))}%` }} />
                                                                    <span>{Math.round(r.atsScore || 0)}%</span>
                                                                </div>
                                                            </div>
                                                            {typeof r.companyContextFitScore === "number" && (
                                                                <div className="smart-select-analyze-card-visual">
                                                                    <div className="smart-select-analyze-card-visual-title">Company Fit</div>
                                                                    <div className="smart-select-analyze-card-visual-track smart-select-analyze-card-visual-track-alt">
                                                                        <div className="smart-select-analyze-card-visual-bar" style={{ width: `${Math.min(100, Math.max(0, r.companyContextFitScore || 0))}%` }} />
                                                                        <span>{Math.round(r.companyContextFitScore || 0)}%</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {salaryDisplay?.medianText && (
                                                                <div className="smart-select-analyze-card-visual">
                                                                    <div className="smart-select-analyze-card-visual-title">Salary Median</div>
                                                                    <div className="smart-select-analyze-card-visual-track smart-select-analyze-card-visual-track-salary">
                                                                        <div className="smart-select-analyze-card-visual-bar" style={{ width: '100%' }} />
                                                                        <span>{salaryDisplay.medianText}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="smart-select-analyze-card-actions">
                                                            <button
                                                                className="smart-select-analyze-download-btn"
                                                                onClick={() => downloadResume(r.filePath, r.fileName, results.analysisId)}
                                                            >
                                                                <FaDownload /> Download Resume
                                                            </button>
                                                            <button
                                                                className="smart-select-analyze-download-btn smart-select-analyze-download-btn-outline"
                                                                onClick={() => openReportModal(r)}
                                                            >
                                                                <FaDownload /> Download Report
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="smart-select-analyze-all-analyses-section">
                                    <div className="smart-select-analyze-section-header-with-actions">
                                        <h3 className="smart-select-analyze-section-title">All Resume Analyses</h3>
                                        <div className="smart-select-analyze-view-controls">
                                            {!isViewingHistory && (
                                                <button
                                                    className="smart-select-analyze-toggle-sidebar-btn"
                                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                                    title={sidebarOpen ? "Hide Controls" : "Show Controls"}
                                                >
                                                    {sidebarOpen ? <FaTimes /> : <FaBars />}
                                                </button>
                                            )}
                                            {isViewingHistory && (
                                                <button
                                                    className="smart-select-analyze-toggle-sidebar-btn"
                                                    onClick={() => router.push("/employer/smart-select")}
                                                    title="Go to Dashboard"
                                                >
                                                    <FaArrowLeft />
                                                    <span>Go to Dashboard</span>
                                                </button>
                                            )}
                                            <button
                                                className={`smart-select-analyze-view-toggle-btn ${viewMode === 'grid' ? 'smart-select-analyze-active' : ''}`}
                                                onClick={() => setViewMode(viewMode === 'grid' ? 'detailed' : 'grid')}
                                                title={viewMode === 'grid' ? 'Switch to Detailed View' : 'Switch to Grid View'}
                                            >
                                                {viewMode === 'detailed' ? <FaTh /> : <FaList />}
                                                <span>{viewMode === 'detailed' ? 'Grid View' : 'Detailed View'}</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`smart-select-analyze-results-list ${viewMode === 'grid' ? 'smart-select-analyze-grid-view' : 'smart-select-analyze-detailed-view'}`}>
                                        {results.allAnalyses && results.allAnalyses.map((r, i) => {
                                            const salaryDisplay = getSalaryDisplay(r.salaryEstimate);
                                            const careerSeries = buildCareerSeries(r, currentYear);
                                            const candidateColor = comparisonPalette[i % comparisonPalette.length];
                                            const careerGraph = viewMode === 'detailed' && careerSeries ? (
                                                <div className="smart-select-analyze-result-section">
                                                    <div className="smart-select-analyze-section-header">
                                                        <FaChartLine className="smart-select-analyze-section-header-icon" />
                                                        <span>Career Progression</span>
                                                    </div>
                                                    <CareerProgressionGraph
                                                        data={{
                                                            series: [{
                                                                ...careerSeries,
                                                                color: candidateColor,
                                                            }],
                                                            minYear: careerSeries.minYear,
                                                            maxYear: careerSeries.maxYear,
                                                            maxLevel: careerSeries.maxLevel,
                                                        }}
                                                    />
                                                </div>
                                            ) : null;

                                            return (
                                                <div className={`smart-select-analyze-result-card ${viewMode === 'grid' ? 'smart-select-analyze-grid-card' : 'smart-select-analyze-detail-card'}`} key={i}>
                                                    <div className="smart-select-analyze-result-header">
                                                        <span className="smart-select-analyze-result-file">{r.fileName}</span>
                                                        <div className="smart-select-analyze-result-scores">
                                                            {r.fitScore > 0 && (
                                                                <span className="smart-select-analyze-score-badge smart-select-analyze-fit-score">
                                                                    Fit: {r.fitScore}%
                                                                </span>
                                                            )}
                                                            <span className={`smart-select-analyze-score-badge smart-select-analyze-ats-score ${r.atsScore > 75 ? 'good' : r.atsScore > 60 ? 'ok' : 'low'}`}>
                                                                ATS: {r.atsScore}%
                                                            </span>
                                                            {typeof r.companyContextFitScore === 'number' && (
                                                                <span className="smart-select-analyze-score-badge smart-select-analyze-fit-score">
                                                                    Company: {r.companyContextFitScore}%
                                                                </span>
                                                            )}
                                                            {salaryDisplay?.rangeText && (
                                                                <span className="smart-select-analyze-score-badge smart-select-analyze-fit-score">
                                                                    Salary: {salaryDisplay.rangeText}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="smart-select-analyze-result-main">
                                                        {viewMode === 'grid' ? (
                                                            <>
                                                                <div className="smart-select-analyze-result-name">{r.candidateName || r.fileName}</div>
                                                                <div className="smart-select-analyze-result-role">{r.currentRole || 'N/A'}</div>
                                                                <div className="smart-select-analyze-result-info">
                                                                    <div className="smart-select-analyze-info-item">
                                                                        <FaEnvelope className="smart-select-analyze-info-icon" />
                                                                        <span>{r.email || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="smart-select-analyze-info-item">
                                                                        <FaPhone className="smart-select-analyze-info-icon" />
                                                                        <span>{r.phone || 'N/A'}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="smart-select-analyze-result-info">
                                                                    <div className="smart-select-analyze-info-item">
                                                                        <FaBriefcase className="smart-select-analyze-info-icon" />
                                                                        <span>{r.experienceYears || 0} yrs exp</span>
                                                                    </div>
                                                                    {r.location && (
                                                                        <div className="smart-select-analyze-info-item">
                                                                            <FaMapMarkerAlt className="smart-select-analyze-info-icon" />
                                                                            <span>{r.location}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {salaryDisplay?.medianText && (
                                                                    <div className="smart-select-analyze-result-summary smart-select-analyze-salary-context">
                                                                        {salaryDisplay.medianText}
                                                                    </div>
                                                                )}
                                                                <div className={`smart-select-analyze-recommendation-badge ${getRecommendationClass(r.recommendation)}`}>
                                                                    {getRecommendationText(r.recommendation)}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="smart-select-analyze-result-name">{r.candidateName}</div>
                                                                {r.currentRole && (
                                                                    <div className="smart-select-analyze-result-role">{r.currentRole}</div>
                                                                )}
                                                                <div className="smart-select-analyze-result-info">
                                                                    <div className="smart-select-analyze-info-item">
                                                                        <FaEnvelope className="smart-select-analyze-info-icon" />
                                                                        <span>{r.email}</span>
                                                                    </div>
                                                                    <div className="smart-select-analyze-info-item">
                                                                        <FaPhone className="smart-select-analyze-info-icon" />
                                                                        <span>{r.phone}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="smart-select-analyze-result-info">
                                                                    <div className="smart-select-analyze-info-item">
                                                                        <FaBriefcase className="smart-select-analyze-info-icon" />
                                                                        <span>{r.experienceYears} yrs exp</span>
                                                                    </div>
                                                                    <div className="smart-select-analyze-info-item">
                                                                        <FaGraduationCap className="smart-select-analyze-info-icon" />
                                                                        <span>{r.education}</span>
                                                                    </div>
                                                                    {r.location && (
                                                                        <div className="smart-select-analyze-info-item">
                                                                            <FaMapMarkerAlt className="smart-select-analyze-info-icon" />
                                                                            <span>{r.location}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {careerGraph}
                                                                {r.pros && r.pros.length > 0 && (
                                                                    <div className="smart-select-analyze-result-section">
                                                                        <div className="smart-select-analyze-section-header">
                                                                            <FaCheck className="smart-select-analyze-section-header-icon" />
                                                                            <span>Pros</span>
                                                                        </div>
                                                                        <ul className="smart-select-analyze-pros-list">
                                                                            {r.pros.map((pro, idx) => (
                                                                                <li key={idx}>
                                                                                    <FaCheck className="smart-select-analyze-list-item-icon smart-select-analyze-list-item-icon-pros" />
                                                                                    <span>{pro}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {r.cons && r.cons.length > 0 && (
                                                                    <div className="smart-select-analyze-result-section">
                                                                        <div className="smart-select-analyze-section-header">
                                                                            <FaExclamationTriangle className="smart-select-analyze-section-header-icon" />
                                                                            <span>Cons</span>
                                                                        </div>
                                                                        <ul className="smart-select-analyze-cons-list">
                                                                            {r.cons.map((con, idx) => (
                                                                                <li key={idx}>
                                                                                    <FaTimes className="smart-select-analyze-list-item-icon smart-select-analyze-list-item-icon-cons" />
                                                                                    <span>{con}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {(r.companyTrajectoryMatch || (r.companyHistory && r.companyHistory.length > 0)) && (
                                                                    <div className="smart-select-analyze-result-section">
                                                                        <div className="smart-select-analyze-section-header">
                                                                            <FaChartLine className="smart-select-analyze-section-header-icon" />
                                                                            <span>Company Trajectory Match</span>
                                                                        </div>
                                                                        {r.companyTrajectoryMatch && (
                                                                            <p className="smart-select-analyze-result-summary smart-select-analyze-company-context" style={{ marginBottom: r.companyHistory && r.companyHistory.length > 0 ? '12px' : '0' }}>
                                                                                {r.companyTrajectoryMatch}
                                                                            </p>
                                                                        )}
                                                                        {r.companyHistory && r.companyHistory.length > 0 && (
                                                                            <ul className="smart-select-analyze-pros-list">
                                                                                {r.companyHistory.slice(0, 4).map((company, idx) => (
                                                                                    <li key={idx}>
                                                                                        <FaChartLine className="smart-select-analyze-list-item-icon smart-select-analyze-list-item-icon-pros" />
                                                                                        <span>
                                                                                            {company.company || 'Unknown Company'} — {company.stageOrSize || 'Stage N/A'}
                                                                                            {company.tenure ? ` (${company.tenure})` : ''}
                                                                                            {company.notableContext ? ` • ${company.notableContext}` : ''}
                                                                                        </span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {salaryDisplay && (salaryDisplay.rangeText || salaryDisplay.medianText || salaryDisplay.notes) && (
                                                                    <div className="smart-select-analyze-result-section">
                                                                        <div className="smart-select-analyze-section-header">
                                                                            <FaMoneyBillWave className="smart-select-analyze-section-header-icon" />
                                                                            <span>Salary Benchmark</span>
                                                                        </div>
                                                                        <ul className="smart-select-analyze-pros-list">
                                                                            {salaryDisplay.rangeText && (
                                                                                <li>
                                                                                    <FaMoneyBillWave className="smart-select-analyze-list-item-icon smart-select-analyze-list-item-icon-pros" />
                                                                                    <span>Estimated Range: {salaryDisplay.rangeText}</span>
                                                                                </li>
                                                                            )}
                                                                            {salaryDisplay.medianText && (
                                                                                <li>
                                                                                    <FaMoneyBillWave className="smart-select-analyze-list-item-icon smart-select-analyze-list-item-icon-pros" />
                                                                                    <span>Market Median: {salaryDisplay.medianText}</span>
                                                                                </li>
                                                                            )}
                                                                            {salaryDisplay.confidence && (
                                                                                <li>
                                                                                    <FaMoneyBillWave className="smart-select-analyze-list-item-icon smart-select-analyze-list-item-icon-pros" />
                                                                                    <span>Confidence: {salaryDisplay.confidence}</span>
                                                                                </li>
                                                                            )}
                                                                            {salaryDisplay.notes && (
                                                                                <li>
                                                                                    <FaMoneyBillWave className="smart-select-analyze-list-item-icon smart-select-analyze-list-item-icon-pros" />
                                                                                    <span>{salaryDisplay.notes}</span>
                                                                                </li>
                                                                            )}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {r.issues && r.issues.length > 0 && (
                                                                    <div className="smart-select-analyze-result-section">
                                                                        <div className="smart-select-analyze-section-header">
                                                                            <FaSearch className="smart-select-analyze-section-header-icon" />
                                                                            <span>Issues</span>
                                                                        </div>
                                                                        <ul className="smart-select-analyze-issues-list">
                                                                            {r.issues.map((issue, idx) => (
                                                                                <li key={idx} className={`smart-select-analyze-issue-${issue.type}`}>
                                                                                    <FaExclamationTriangle className="smart-select-analyze-list-item-icon smart-select-analyze-list-item-icon-issues" />
                                                                                    <span>{issue.text}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {r.skills && r.skills.length > 0 && (
                                                                    <div className="smart-select-analyze-result-section">
                                                                        <div className="smart-select-analyze-section-header">
                                                                            <FaCog className="smart-select-analyze-section-header-icon" />
                                                                            <span>Skills</span>
                                                                        </div>
                                                                        <div className="smart-select-analyze-skills-tags">
                                                                            {r.skills.slice(0, 10).map((skill, idx) => (
                                                                                <span key={idx} className="smart-select-analyze-skill-tag">{skill}</span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className={`smart-select-analyze-recommendation-badge ${getRecommendationClass(r.recommendation)}`}>
                                                                    {getRecommendationText(r.recommendation)}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="smart-select-analyze-card-actions">
                                                        <button
                                                            className="smart-select-analyze-download-btn"
                                                            onClick={() => downloadResume(r.filePath, r.fileName, results.analysisId)}
                                                        >
                                                            <FaDownload /> Download Resume
                                                        </button>
                                                        <button
                                                            className="smart-select-analyze-download-btn smart-select-analyze-download-btn-outline"
                                                            onClick={() => openReportModal(r)}
                                                        >
                                                            <FaDownload /> Download Report
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {resultsView === 'skills' && (
                            <SkillHeatmap data={skillHeatmapData} />
                        )}

                        {resultsView === 'comparison' && (
                            <>
                                {(atsChartData.length ||
                                    companyFitChartData.length ||
                                    salaryChartData.rows.length ||
                                    issueData.total ||
                                    consFrequency.items.length) && (
                                    <div className="smart-select-analyze-results-visuals">
                                        <div className="smart-select-analyze-visual-header">
                                            <h3>Visual Insights</h3>
                                            <p>Quick charts summarizing how this batch performed.</p>
                                        </div>
                                        <div className="smart-select-analyze-visual-grid">
                                            <div className="smart-select-analyze-visual-card">
                                                <div className="smart-select-analyze-visual-card-header">
                                                    <h4>ATS Score Leaders</h4>
                                                    <span>Top {atsChartData.length || 0}</span>
                                                </div>
                                                {atsChartData.length ? (
                                                    atsChartData.map((item) => (
                                                        <div className="smart-select-analyze-chart-bar" key={`ats-${item.label}`}>
                                                            <div className="smart-select-analyze-chart-bar-label" title={item.label}>
                                                                {item.label}
                                                            </div>
                                                            <div className="smart-select-analyze-chart-bar-track">
                                                                <div
                                                                    className="smart-select-analyze-chart-bar-fill"
                                                                    style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                                                                />
                                                                <span className="smart-select-analyze-chart-bar-value">{item.value}%</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="smart-select-analyze-visual-empty">No ATS scores available yet.</p>
                                                )}
                                            </div>

                                            <div className="smart-select-analyze-visual-card">
                                                <div className="smart-select-analyze-visual-card-header">
                                                    <h4>Company Context Fit</h4>
                                                    <span>Top matches</span>
                                                </div>
                                                {companyFitChartData.length ? (
                                                    companyFitChartData.map((item) => (
                                                        <div className="smart-select-analyze-chart-bar" key={`fit-${item.label}`}>
                                                            <div className="smart-select-analyze-chart-bar-label" title={item.label}>
                                                                {item.label}
                                                            </div>
                                                            <div className="smart-select-analyze-chart-bar-track">
                                                                <div
                                                                    className="smart-select-analyze-chart-bar-fill smart-select-analyze-chart-bar-fill-alt"
                                                                    style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                                                                />
                                                                <span className="smart-select-analyze-chart-bar-value">{item.value}%</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="smart-select-analyze-visual-empty">No company fit scores captured.</p>
                                                )}
                                            </div>

                                            <div className="smart-select-analyze-visual-card smart-select-analyze-visual-card-span">
                                                <div className="smart-select-analyze-visual-card-header">
                                                    <h4>Salary Benchmark</h4>
                                                    <span>Median &amp; range by candidate</span>
                                                </div>
                                                {salaryChartData.rows.length ? (
                                                    <>
                                                        <div className="smart-select-analyze-visual-highlight">
                                                            <span className="smart-select-analyze-highlight-label">Average Median</span>
                                                            <span className="smart-select-analyze-highlight-value">
                                                                {formatSalaryValue(
                                                                    results.salarySummary?.averageMedian,
                                                                    results.salarySummary?.unit,
                                                                    results.salarySummary?.currency
                                                                ) || "N/A"}
                                                            </span>
                                                        </div>
                                                        {salaryChartData.rows.map((row) => {
                                                            const width = salaryChartData.maxMedian
                                                                ? Math.min(100, Math.max(0, (row.median / salaryChartData.maxMedian) * 100))
                                                                : 0;
                                                            return (
                                                                <div className="smart-select-analyze-chart-bar" key={`salary-${row.label}`}>
                                                                    <div className="smart-select-analyze-chart-bar-label" title={row.label}>
                                                                        {row.label}
                                                                    </div>
                                                                    <div className="smart-select-analyze-chart-bar-track">
                                                                        <div
                                                                            className="smart-select-analyze-chart-bar-fill smart-select-analyze-chart-bar-fill-salary"
                                                                            style={{ width: `${width}%` }}
                                                                        />
                                                                        <span className="smart-select-analyze-chart-bar-value">
                                                                            {formatSalaryValue(row.median, row.unit, row.currency) || "N/A"}
                                                                        </span>
                                                                    </div>
                                                                    <div className="smart-select-analyze-chart-subtext">
                                                                        {row.min !== null && row.max !== null
                                                                            ? `${formatSalaryValue(row.min, row.unit, row.currency)} - ${formatSalaryValue(row.max, row.unit, row.currency)}`
                                                                            : "Range not provided"}
                                                                        {row.confidence && <span className="smart-select-analyze-chart-tag">{row.confidence}</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </>
                                                ) : (
                                                    <p className="smart-select-analyze-visual-empty">No salary estimates yet.</p>
                                                )}
                                            </div>

                                            <div className="smart-select-analyze-visual-card">
                                                <div className="smart-select-analyze-visual-card-header">
                                                    <h4>Issue Mix</h4>
                                                    <span>{issueData.total} total flags</span>
                                                </div>
                                                {issueData.total ? (
                                                    <div className="smart-select-analyze-issue-visual">
                                                        <div
                                                            className="smart-select-analyze-donut"
                                                            style={{
                                                                background: issueData.gradient
                                                                    ? `conic-gradient(${issueData.gradient})`
                                                                    : "#e2e8f0",
                                                            }}
                                                        >
                                                            <span>{issueData.total}</span>
                                                        </div>
                                                        <ul className="smart-select-analyze-donut-legend">
                                                            {issueData.segments.map((seg) => (
                                                                <li key={`issue-${seg.key}`}>
                                                                    <span className="smart-select-analyze-legend-dot" style={{ background: seg.color }} />
                                                                    <span>{seg.label}</span>
                                                                    <span className="smart-select-analyze-legend-value">
                                                                        {Math.round((seg.value / issueData.total) * 100)}%
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ) : (
                                                    <p className="smart-select-analyze-visual-empty">No issues detected.</p>
                                                )}
                                            </div>

                                            <div className="smart-select-analyze-visual-card">
                                                <div className="smart-select-analyze-visual-card-header">
                                                    <h4>Common Cons</h4>
                                                    <span>Top {consFrequency.items.length || 0}</span>
                                                </div>
                                                {consFrequency.items.length ? (
                                                    consFrequency.items.map((item) => {
                                                        const width = consFrequency.maxValue
                                                            ? Math.min(100, Math.max(0, (item.value / consFrequency.maxValue) * 100))
                                                            : 0;
                                                        return (
                                                            <div className="smart-select-analyze-chart-bar" key={`cons-${item.label}`}>
                                                                <div className="smart-select-analyze-chart-bar-label" title={item.label}>
                                                                    {item.label}
                                                                </div>
                                                                <div className="smart-select-analyze-chart-bar-track">
                                                                    <div
                                                                        className="smart-select-analyze-chart-bar-fill smart-select-analyze-chart-bar-fill-cons"
                                                                        style={{ width: `${width}%` }}
                                                                    />
                                                                    <span className="smart-select-analyze-chart-bar-value">{item.value}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="smart-select-analyze-visual-empty">No recurring cons noted yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {careerComparison && (
                                    <div className="smart-select-analyze-all-analyses-section">
                                        <div className="smart-select-analyze-section-header-with-actions">
                                            <h3 className="smart-select-analyze-section-title">
                                                <FaChartLine /> Career Progression Comparison
                                            </h3>
                                            <p className="smart-select-analyze-career-range">
                                                Tracking seniority progression from {Math.round(careerComparison.minYear)} to {Math.round(careerComparison.maxYear)}
                                            </p>
                                        </div>
                                        <CareerProgressionGraph
                                            data={{
                                                series: careerComparison.series,
                                                minYear: careerComparison.minYear,
                                                maxYear: careerComparison.maxYear,
                                                maxLevel: careerComparison.maxLevel,
                                            }}
                                            comparison
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* No Credits Modal */}
            {showNoCreditsModal && (
                <div className="smart-select-analyze-modal-overlay" onClick={() => setShowNoCreditsModal(false)}>
                    <div className="smart-select-analyze-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="smart-select-analyze-modal-header">
                            <h3>No Analyses Remaining</h3>
                            <button onClick={() => setShowNoCreditsModal(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="smart-select-analyze-modal-body">
                            <div className="smart-select-analyze-modal-icon">⚠️</div>
                            <p>{noCreditsMessage || "You've reached your limit of resume analyses for your current plan."}</p>
                            <p>Upgrade your plan to unlock more analyses and continue screening candidates efficiently.</p>
                            <div className="smart-select-analyze-modal-actions">
                                <button
                                    className="smart-select-analyze-modal-btn primary"
                                    onClick={() => {
                                        setShowNoCreditsModal(false);
                                        router.push("/employer/smart-select");
                                    }}
                                >
                                    Go to Dashboard
                                </button>
                                <button
                                    className="smart-select-analyze-modal-btn secondary"
                                    onClick={() => {
                                        setShowNoCreditsModal(false);
                                        window.location.reload();
                                    }}
                                >
                                    Upgrade Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div className="smart-select-analyze-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
                    <div className="smart-select-analyze-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="smart-select-analyze-modal-header">
                            <h3>Upgrade Required</h3>
                            <button onClick={() => setShowUpgradeModal(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="smart-select-analyze-modal-body">
                            <div className="smart-select-analyze-modal-icon">🔒</div>
                            <p style={{ fontWeight: 600, marginBottom: '12px' }}>{upgradeModalMessage || "This feature requires an upgrade."}</p>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>
                                Upgrade to Organization plan to unlock this feature and access all advanced analysis capabilities.
                            </p>
                            <div className="smart-select-analyze-modal-actions">
                                <button
                                    className="smart-select-analyze-modal-btn primary"
                                    onClick={() => {
                                        setShowUpgradeModal(false);
                                        router.push("/employer/smart-select?upgrade-plan=true");
                                    }}
                                >
                                    Upgrade Now
                                </button>
                                <button
                                    className="smart-select-analyze-modal-btn secondary"
                                    onClick={() => setShowUpgradeModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {reportModalOpen && (
                <div className="smart-select-analyze-modal-overlay" onClick={() => {
                    if (!reportGenerating) {
                        setReportModalOpen(false);
                        setReportTarget(null);
                    }
                }}>
                    <div className="smart-select-analyze-modal smart-select-analyze-report-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="smart-select-analyze-modal-header smart-select-analyze-report-modal-header">
                            <h3 className="smart-select-analyze-modal-title smart-select-analyze-report-modal-title">Download Analysis Report</h3>
                            {!reportGenerating && (
                                <button 
                                    className="smart-select-analyze-modal-close"
                                    onClick={() => {
                                        setReportModalOpen(false);
                                        setReportTarget(null);
                                    }}
                                    type="button"
                                >
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                        <div className="smart-select-analyze-modal-body smart-select-analyze-report-modal-body">
                            <p style={{ color: "#334155", fontSize: 14, marginBottom: 16 }}>
                                Choose the format you'd like to export. The report includes summary stats, salary benchmarks, and the full candidate breakdown.
                            </p>
                            {reportTarget && (
                                <p style={{ color: "#1d4ed8", fontSize: 13, marginTop: -8, marginBottom: 16 }}>
                                    You're downloading a focused report for <strong>{reportTarget.candidateName || reportTarget.fileName || 'this candidate'}</strong> only.
                                </p>
                            )}
                            <div className="smart-select-analyze-report-format-options">
                                <label className={`smart-select-analyze-report-option ${reportFormat === 'pdf' ? 'smart-select-analyze-selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="report-format"
                                        value="pdf"
                                        checked={reportFormat === 'pdf'}
                                        onChange={(e) => setReportFormat(e.target.value)}
                                        disabled={reportGenerating}
                                    />
                                    <span>PDF (recommended)</span>
                                </label>
                                {canExportExcelDoc ? (
                                    <>
                                {canExportExcelDoc ? (
                                    <>
                                        <label className={`smart-select-analyze-report-option ${reportFormat === 'excel' ? 'smart-select-analyze-selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="report-format"
                                                value="excel"
                                                checked={reportFormat === 'excel'}
                                                onChange={(e) => setReportFormat(e.target.value)}
                                                disabled={reportGenerating}
                                            />
                                            <span>Excel (.csv)</span>
                                        </label>
                                        <label className={`smart-select-analyze-report-option ${reportFormat === 'doc' ? 'smart-select-analyze-selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name="report-format"
                                                value="doc"
                                                checked={reportFormat === 'doc'}
                                                onChange={(e) => setReportFormat(e.target.value)}
                                                disabled={reportGenerating}
                                            />
                                            <span>Word (.doc)</span>
                                        </label>
                                    </>
                                ) : (
                                    <div style={{ 
                                        padding: '12px', 
                                        background: '#fef3c7', 
                                        borderRadius: '8px', 
                                        marginTop: '8px',
                                        fontSize: '13px',
                                        color: '#92400e'
                                    }}>
                                        <strong>Upgrade Required:</strong> Excel and Word export are available in Premium and Organization plans.
                                    </div>
                                )}
                                    </>
                                ) : (
                                    <div style={{ 
                                        padding: '12px', 
                                        background: '#fef3c7', 
                                        borderRadius: '8px', 
                                        marginTop: '8px',
                                        fontSize: '13px',
                                        color: '#92400e'
                                    }}>
                                        <strong>Upgrade Required:</strong> Excel and Word export are available in Premium and Organization plans.
                                    </div>
                                )}
                            </div>
                            {reportError && (
                                <div className="smart-select-analyze-error-message" style={{ marginTop: 12 }}>
                                    {reportError}
                                </div>
                            )}
                        </div>
                        <div className="smart-select-analyze-modal-footer smart-select-analyze-report-modal-footer">
                            <button
                                className="smart-select-analyze-modal-btn smart-select-analyze-btn-outline"
                                onClick={() => {
                                    if (reportGenerating) return;
                                    setReportModalOpen(false);
                                    setReportTarget(null);
                                }}
                                disabled={reportGenerating}
                                style={{ borderRadius: 8, padding: "8px 18px" }}
                            >
                                Cancel
                            </button>
                            <button
                                className="smart-select-analyze-modal-btn smart-select-analyze-btn-primary"
                                onClick={handleGenerateReport}
                                disabled={reportGenerating}
                                style={{ borderRadius: 8, padding: "8px 18px", minWidth: 140 }}
                            >
                                {reportGenerating ? "Generating..." : "Download"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Description Modal */}
            {showJobDescriptionModal && (
                <div className="smart-select-analyze-modal-overlay" onClick={() => setShowJobDescriptionModal(false)}>
                    <div className="smart-select-analyze-modal smart-select-analyze-report-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="smart-select-analyze-modal-header smart-select-analyze-report-modal-header">
                            <h3 className="smart-select-analyze-modal-title smart-select-analyze-report-modal-title">Job Description</h3>
                            <button 
                                className="smart-select-analyze-modal-close"
                                onClick={() => setShowJobDescriptionModal(false)}
                                type="button"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="smart-select-analyze-modal-body smart-select-analyze-report-modal-body">
                            {jobDesc && jobDesc.trim() ? (
                                <div style={{ 
                                    whiteSpace: 'pre-wrap', 
                                    wordWrap: 'break-word',
                                    color: '#334155',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    padding: '16px',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb',
                                    maxHeight: '60vh',
                                    overflowY: 'auto'
                                }}>
                                    {jobDesc}
                                </div>
                            ) : (
                                <div style={{ 
                                    textAlign: 'center',
                                    padding: '40px 20px',
                                    color: '#64748b'
                                }}>
                                    <FaFileAlt style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
                                    <p style={{ fontSize: '16px', marginBottom: '8px', fontWeight: 600 }}>No Job Description Available</p>
                                    <p style={{ fontSize: '14px' }}>No job description was provided for this analysis.</p>
                                </div>
                            )}
                        </div>
                        <div className="smart-select-analyze-modal-footer smart-select-analyze-report-modal-footer">
                            <button
                                className="smart-select-analyze-modal-btn smart-select-analyze-btn-primary"
                                onClick={() => setShowJobDescriptionModal(false)}
                                style={{ borderRadius: 8, padding: "8px 18px", minWidth: 100 }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden div for PDF report generation */}
            <div ref={reportContentRef} style={{ display: 'none' }} />

            <Toaster position="top-right" />
        </div>
        </React.Fragment>
    );
};

const SmartSelectAnalyzeWithSuspense = () => {
    return (
        <Suspense fallback={
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                background: '#f8fafc'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <FaSpinner style={{ fontSize: '32px', color: '#2563eb', animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: '16px', color: '#64748b' }}>Loading...</p>
                </div>
            </div>
        }>
            <SmartSelectAnalyze />
        </Suspense>
    );
};

export default SmartSelectAnalyzeWithSuspense;

