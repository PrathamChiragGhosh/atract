/**
 * Smart Select Plan Configuration
 * 
 * This file contains all plan-related configurations including:
 * - Plan prices
 * - Analyze counts per plan
 * - Resume upload limits per analyze
 * - Feature codes and definitions
 * - Plan feature mappings
 * 
 * To modify plan features or limits, update this file and restart the server.
 */

// Plan prices (in INR)
const planPrices = {
    basic: {
        name: "Basic",
        amount: 199,
    },
    premium: {
        name: "Premium",
        amount: 1499,
    },
    organization: {
        name: "Organization",
        amount: 7999,
    },
};

// Plan benefits - analyze count and resume limits
const planBenefits = {
    basic: {
        analyzeCount: 2,           // Number of analyses available
        resumeLimitPerAnalyze: 10  // Maximum resumes per analysis
    },
    premium: {
        analyzeCount: 10,
        resumeLimitPerAnalyze: 20  // Fixed: 10 analyses × 20 resumes = 200 total resumes
    },
    organization: {
        analyzeCount: 50,
        resumeLimitPerAnalyze: 200
    }
};

// Plan priority for upgrade logic
const planPriority = {
    basic: 1,
    premium: 2,
    organization: 3
};

// Feature definitions with unique codes
const featureDefinitions = {
    'smart-select-001': {
        code: 'smart-select-001',
        name: 'Company Trajectory Match',
        description: 'Analyze candidate fit based on company type (Startup, Mid-size, Enterprise)',
        category: 'advanced',
        displayName: 'Company Trajectory Analysis'
    },
    'smart-select-002': {
        code: 'smart-select-002',
        name: 'Upload JD Document',
        description: 'Upload job description as PDF or DOCX file',
        category: 'input',
        displayName: 'JD Document Upload'
    },
    'smart-select-003': {
        code: 'smart-select-003',
        name: 'Generate AI Job Description',
        description: 'Generate job description using AI based on job details',
        category: 'input',
        displayName: 'AI JD Generator'
    },
    'smart-select-004': {
        code: 'smart-select-004',
        name: 'Salary Benchmarking',
        description: 'Compare candidate salary expectations with market benchmarks',
        category: 'advanced',
        displayName: 'Salary Benchmarking'
    },
    'smart-select-005': {
        code: 'smart-select-005',
        name: 'Export Reports (Excel/DOC)',
        description: 'Download reports in Excel (.csv) and Word (.doc) formats in addition to PDF',
        category: 'export',
        displayName: 'Excel & Word Report Export'
    }
};

// Plan feature mappings - which features are available in which plans
const planFeatures = {
    basic: [
        // Basic plan has no additional features (only PDF reports)
    ],
    premium: [
        'smart-select-001', // Company Trajectory Match
        'smart-select-002', // Upload JD Document
        // 'smart-select-003', // Generate AI Job Description
        // 'smart-select-004', // Salary Benchmarking
        'smart-select-005'  // Export Reports (Excel/DOC)
    ],
    organization: [
        'smart-select-001', // Company Trajectory Match
        'smart-select-002', // Upload JD Document
        'smart-select-003', // Generate AI Job Description
        'smart-select-004', // Salary Benchmarking
        'smart-select-005'  // Export Reports (Excel/DOC)
    ]
};

/**
 * Get plan configuration
 * @param {string} planType - Plan type (basic, premium, organization)
 * @returns {Object} Plan configuration
 */
const getPlanConfig = (planType) => {
    if (!planType || !planPrices[planType]) {
        return null;
    }

    return {
        planType,
        name: planPrices[planType].name,
        amount: planPrices[planType].amount,
        benefits: planBenefits[planType],
        features: planFeatures[planType] || [],
        featureDetails: (planFeatures[planType] || []).map(code => featureDefinitions[code]).filter(Boolean)
    };
};

/**
 * Check if a feature is available in a plan
 * @param {string} planType - Plan type
 * @param {string} featureCode - Feature code (e.g., 'smart-select-001')
 * @returns {boolean}
 */
const hasFeature = (planType, featureCode) => {
    if (!planType || !planFeatures[planType]) {
        return false;
    }
    return planFeatures[planType].includes(featureCode);
};

/**
 * Get all plan configurations for frontend
 * @returns {Object} All plan configurations
 */
const getAllPlanConfigs = () => {
    const plans = {};
    Object.keys(planPrices).forEach(planType => {
        plans[planType] = getPlanConfig(planType);
    });
    return plans;
};

/**
 * Get feature definitions for frontend
 * @returns {Object} All feature definitions
 */
const getFeatureDefinitions = () => {
    return featureDefinitions;
};

/**
 * Get resume limit for a plan
 * @param {string} planType - Plan type
 * @returns {number} Maximum resumes per analyze
 */
const getResumeLimit = (planType) => {
    if (!planType || !planBenefits[planType]) {
        return 0;
    }
    return planBenefits[planType].resumeLimitPerAnalyze || 0;
};

/**
 * Get analyze count for a plan
 * @param {string} planType - Plan type
 * @returns {number} Number of analyses
 */
const getAnalyzeCount = (planType) => {
    if (!planType || !planBenefits[planType]) {
        return 0;
    }
    return planBenefits[planType].analyzeCount || 0;
};

module.exports = {
    planPrices,
    planBenefits,
    planPriority,
    planFeatures,
    featureDefinitions,
    getPlanConfig,
    hasFeature,
    getAllPlanConfigs,
    getFeatureDefinitions,
    getResumeLimit,
    getAnalyzeCount
};

