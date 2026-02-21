/**
 * Utility to generate JSON-LD schema for Google Jobs
 * Based on Schema.org JobPosting specification
 */

/**
 * Parse experience string and convert to months (integer)
 * Handles formats like: "5 to 6 years", "Fresher", "10+ years", "0-1 years", "2-3 years", etc.
 * @param {string} experienceStr - Experience string from database
 * @returns {number|null} - Experience in months (integer) or null if cannot parse
 */
const parseExperienceToMonths = (experienceStr) => {
    if (!experienceStr || typeof experienceStr !== 'string') {
        return null;
    }

    const normalized = experienceStr.trim().toLowerCase();

    // Handle "Fresher" or "0 years" cases
    if (normalized.includes('fresher') || normalized === '0' || normalized === '0 years') {
        return 0;
    }

    // Extract all numbers from the string
    const numbers = normalized.match(/\d+/g);
    if (!numbers || numbers.length === 0) {
        return null;
    }

    // Convert to integers
    const years = numbers.map(num => parseInt(num, 10));

    // Handle ranges like "5 to 6 years", "2-3 years", "0-1 years"
    if (years.length >= 2) {
        // Use minimum value from range (e.g., "5 to 6 years" -> 5 years = 60 months)
        const minYears = Math.min(...years);
        return minYears * 12;
    }

    // Handle single number with "+" like "10+ years"
    if (normalized.includes('+')) {
        const yearsValue = years[0];
        return yearsValue * 12;
    }

    // Handle single number like "5 years", "1 year"
    if (normalized.includes('year')) {
        return years[0] * 12;
    }

    // Handle months explicitly like "6 months"
    if (normalized.includes('month')) {
        return years[0];
    }

    // If just a number, assume it's years (e.g., "5" -> 5 years = 60 months)
    return years[0] * 12;
};

const generateJobPostingSchema = (job, employer = null) => {
    // Base URL for job links (adjust based on your domain)
    const baseUrl = process.env.FRONTEND_URL || 'https://atract.in';
    const jobUrl = `${baseUrl}/${job.shortId}`;

    // Format date to ISO 8601 format
    const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };

    // Build the schema object
    const schema = {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "title": job.jobTitle || '',
        "description": job.jobDescription || '',
        "datePosted": formatDate(job.applicationOpeningDate || job.createdAt),
        "validThrough": formatDate(job.applicationClosingDate),
        "directApply": true
    };

    // Add job URL
    if (job.shortId) {
        schema.url = jobUrl;
    }

    // Hiring Organization
    const hiringOrg = {
        "@type": "Organization",
        "name": job.companyName || ''
    };

    // Add company website if available (from employer or job)
    if (employer?.companyWebsite) {
        hiringOrg.sameAs = employer.companyWebsite;
    }

    schema.hiringOrganization = hiringOrg;

    // Job Location
    if (job.location) {
        const jobLocation = {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": job.location,
                "addressCountry": "IN" // Default to India, adjust if needed
            }
        };
        schema.jobLocation = jobLocation;
    }

    // Base Salary (if salary information is available)
    if (job.minSalary || job.maxSalary) {
        const baseSalary = {
            "@type": "MonetaryAmount",
            "currency": "INR",
            "value": {
                "@type": "QuantitativeValue"
            }
        };

        // If both min and max are available, use range
        if (job.minSalary && job.maxSalary) {
            baseSalary.value.minValue = job.minSalary;
            baseSalary.value.maxValue = job.maxSalary;
            baseSalary.value.unitText = "YEAR";
        } else if (job.minSalary) {
            baseSalary.value.value = job.minSalary;
            baseSalary.value.unitText = "YEAR";
        } else if (job.maxSalary) {
            baseSalary.value.value = job.maxSalary;
            baseSalary.value.unitText = "YEAR";
        }

        schema.baseSalary = baseSalary;
    }

    // Employment Type
    if (job.employmentType) {
        // Map employment types to Schema.org values
        const employmentTypeMap = {
            'Permanent': 'FULL_TIME',
            'Contract': 'CONTRACTOR',
            'Temporary': 'TEMPORARY'
        };
        schema.employmentType = employmentTypeMap[job.employmentType] || job.employmentType;
    }

    // Job Type (work mode)
    if (job.workMode) {
        // Map work modes to appropriate schema values
        if (job.workMode === 'Remote') {
            schema.jobLocationType = 'TELECOMMUTE';
        }
    }

    // Experience requirements
    if (job.experience) {
        const monthsOfExperience = parseExperienceToMonths(job.experience);
        if (monthsOfExperience !== null) {
            schema.experienceRequirements = {
                "@type": "OccupationalExperienceRequirements",
                "monthsOfExperience": monthsOfExperience
            };
        }
    }

    // Qualifications
    if (job.highestQualification) {
        schema.qualifications = job.highestQualification;
    }

    // Skills
    if (job.skills && Array.isArray(job.skills) && job.skills.length > 0) {
        schema.skills = job.skills.join(', ');
    }

    // Number of openings
    if (job.numberOfOpenings) {
        schema.hiringOrganization.numberOfEmployees = {
            "@type": "QuantitativeValue",
            "value": job.numberOfOpenings
        };
    }

    return JSON.stringify(schema, null, 2);
};

module.exports = {
    generateJobPostingSchema
};

