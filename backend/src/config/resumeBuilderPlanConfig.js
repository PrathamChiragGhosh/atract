/**
 * Resume Builder Plan Configuration
 * 
 * This file contains all plan-related configurations including:
 * - Plan prices
 * - Creations, enhancements, and downloads per plan
 * - Feature codes and definitions
 * - Plan feature mappings
 * 
 * To modify plan features or limits, update this file and restart the server.
 */

// Plan prices (in INR)
const planPrices = {
    basic: {
        name: "Basic",
        amount: 99,
    },
    premium: {
        name: "Premium",
        amount: 999,
    },
    organization: {
        name: "Organization",
        amount: 4999,
    },
};

// Plan benefits - creations, enhancements, and downloads
const planBenefits = {
    basic: {
        creations: 1,           // Number of resume creations available
        enhancements: 1,         // Number of resume enhancements available
        downloads: 1             // Number of resume downloads available
    },
    premium: {
        creations: 5,
        enhancements: 5,
        downloads: 10
    },
    organization: {
        creations: 25,
        enhancements: 25,
        downloads: 100
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
    'resume-builder-001': {
        code: 'resume-builder-001',
        name: 'Multiple Resume Templates',
        description: 'Access to multiple professional resume templates',
        category: 'templates',
        displayName: 'Multiple Templates'
    },
    'resume-builder-002': {
        code: 'resume-builder-002',
        name: 'ATS Optimization',
        description: 'Automatic ATS score optimization (target 80+)',
        category: 'optimization',
        displayName: 'ATS Optimization'
    },
    'resume-builder-003': {
        code: 'resume-builder-003',
        name: 'Resume Enhancement',
        description: 'Enhance existing resumes with AI',
        category: 'enhancement',
        displayName: 'Resume Enhancement'
    },
    'resume-builder-004': {
        code: 'resume-builder-004',
        name: 'PDF Download',
        description: 'Download resumes as PDF files',
        category: 'export',
        displayName: 'PDF Download'
    }
};

// Plan feature mappings - which features are available in which plans
const planFeatures = {
    basic: [
        'resume-builder-001', // Multiple Resume Templates
        'resume-builder-002', // ATS Optimization
        'resume-builder-004'  // PDF Download
    ],
    premium: [
        'resume-builder-001', // Multiple Resume Templates
        'resume-builder-002', // ATS Optimization
        'resume-builder-003', // Resume Enhancement
        'resume-builder-004'  // PDF Download
    ],
    organization: [
        'resume-builder-001', // Multiple Resume Templates
        'resume-builder-002', // ATS Optimization
        'resume-builder-003', // Resume Enhancement
        'resume-builder-004'  // PDF Download
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
 * @param {string} featureCode - Feature code (e.g., 'resume-builder-001')
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
 * Get creations count for a plan
 * @param {string} planType - Plan type
 * @returns {number} Number of creations
 */
const getCreationsCount = (planType) => {
    if (!planType || !planBenefits[planType]) {
        return 0;
    }
    return planBenefits[planType].creations || 0;
};

/**
 * Get enhancements count for a plan
 * @param {string} planType - Plan type
 * @returns {number} Number of enhancements
 */
const getEnhancementsCount = (planType) => {
    if (!planType || !planBenefits[planType]) {
        return 0;
    }
    return planBenefits[planType].enhancements || 0;
};

/**
 * Get downloads count for a plan
 * @param {string} planType - Plan type
 * @returns {number} Number of downloads
 */
const getDownloadsCount = (planType) => {
    if (!planType || !planBenefits[planType]) {
        return 0;
    }
    return planBenefits[planType].downloads || 0;
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
    getCreationsCount,
    getEnhancementsCount,
    getDownloadsCount
};

