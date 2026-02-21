/**
 * Smart Filter Matching Service
 * Matches candidates against job requirements and scores them
 */

/**
 * Extract age from string (handles ranges, single values, text)
 */
function extractAge(ageStr) {
    if (!ageStr || typeof ageStr !== 'string') return null;
    
    const ageStrLower = ageStr.toLowerCase().trim();
    
    // Try to find range (e.g., "18-35", "25 to 45")
    const rangeMatch = ageStrLower.match(/(\d+)\s*[-to]\s*(\d+)/);
    if (rangeMatch) {
        return {
            min: parseInt(rangeMatch[1]),
            max: parseInt(rangeMatch[2])
        };
    }
    
    // Try single number
    const singleMatch = ageStrLower.match(/(\d+)/);
    if (singleMatch) {
        const age = parseInt(singleMatch[1]);
        return { min: age, max: age };
    }
    
    return null;
}

/**
 * Check if candidate age matches job age requirement
 */
function matchesAge(candidateAge, jobAge) {
    if (!candidateAge || !jobAge) return false;
    
    const candidateAgeRange = extractAge(candidateAge);
    const jobAgeRange = extractAge(jobAge);
    
    if (!candidateAgeRange || !jobAgeRange) return false;
    
    // Check if ranges overlap
    return candidateAgeRange.min <= jobAgeRange.max && candidateAgeRange.max >= jobAgeRange.min;
}

/**
 * Extract experience years from string
 */
function extractExperienceYears(expStr) {
    if (!expStr || typeof expStr !== 'string') return null;
    
    const expStrLower = expStr.toLowerCase().trim();
    
    // Try to find range (e.g., "2-5 years", "0 to 2")
    const rangeMatch = expStrLower.match(/(\d+)\s*[-to]\s*(\d+)/);
    if (rangeMatch) {
        return {
            min: parseInt(rangeMatch[1]),
            max: parseInt(rangeMatch[2])
        };
    }
    
    // Try single number with "years"
    const singleMatch = expStrLower.match(/(\d+)\s*(?:years?|yrs?)?/);
    if (singleMatch) {
        const years = parseInt(singleMatch[1]);
        return { min: years, max: years };
    }
    
    return null;
}

/**
 * Check if candidate experience matches job requirement
 */
function matchesExperience(candidateExp, jobExp) {
    if (!candidateExp || !jobExp) return false;
    
    const candidateExpRange = extractExperienceYears(candidateExp);
    const jobExpRange = extractExperienceYears(jobExp);
    
    if (!candidateExpRange || !jobExpRange) return false;
    
    // Check if ranges overlap
    return candidateExpRange.min <= jobExpRange.max && candidateExpRange.max >= jobExpRange.min;
}

/**
 * Extract skills from string (comma-separated, space-separated, etc.)
 */
function extractSkills(skillsStr) {
    if (!skillsStr || typeof skillsStr !== 'string') return [];
    
    // Split by comma, semicolon, or newline
    return skillsStr
        .split(/[,;\n]/)
        .map(skill => skill.trim().toLowerCase())
        .filter(skill => skill.length > 0);
}

/**
 * Calculate skills match percentage
 */
function calculateSkillsMatch(candidateSkills, jobSkills) {
    if (!candidateSkills || candidateSkills.length === 0) return 0;
    if (!jobSkills || jobSkills.length === 0) return 0;
    
    const candidateSkillsList = extractSkills(candidateSkills);
    const jobSkillsList = jobSkills.map(s => s.toLowerCase().trim());
    
    if (jobSkillsList.length === 0) return 0;
    
    // Count matching skills
    let matches = 0;
    candidateSkillsList.forEach(candidateSkill => {
        // Check exact match
        if (jobSkillsList.includes(candidateSkill)) {
            matches++;
        } else {
            // Check partial match (e.g., "javascript" matches "js")
            const found = jobSkillsList.some(jobSkill => 
                candidateSkill.includes(jobSkill) || jobSkill.includes(candidateSkill)
            );
            if (found) matches++;
        }
    });
    
    return (matches / jobSkillsList.length) * 100;
}

/**
 * Check gender match
 */
function matchesGender(candidateGender, jobGender) {
    if (!candidateGender || !jobGender) return false;
    
    const candidateGenderLower = candidateGender.toLowerCase().trim();
    const jobGenderLower = jobGender.toLowerCase().trim();
    
    // Handle "both male - female"
    if (jobGenderLower.includes('both') || jobGenderLower.includes('male') && jobGenderLower.includes('female')) {
        return candidateGenderLower.includes('male') || candidateGenderLower.includes('female');
    }
    
    // Exact match
    if (jobGenderLower === 'male' || jobGenderLower === 'female') {
        return candidateGenderLower.includes(jobGenderLower);
    }
    
    // "others" matches anything
    if (jobGenderLower === 'others') {
        return true;
    }
    
    return false;
}

/**
 * Check location match (fuzzy matching)
 * Handles multiple locations (comma-separated) and "Anywhere" patterns
 */
function matchesLocation(candidateLocation, jobLocation) {
    if (!candidateLocation || !jobLocation) return false;
    
    const candidateLocLower = candidateLocation.toLowerCase().trim();
    const jobLocLower = jobLocation.toLowerCase().trim();
    
    // Handle "Anywhere" patterns
    if (candidateLocLower.includes('anywhere') || candidateLocLower.includes('any metro') || candidateLocLower.includes('any')) {
        return true; // Candidate is willing to relocate anywhere
    }
    
    // Split by comma for multiple locations
    const candidateLocations = candidateLocLower.split(',').map(loc => loc.trim());
    const jobLocations = jobLocLower.split(',').map(loc => loc.trim());
    
    // Check if any candidate location matches any job location
    for (const candidateLoc of candidateLocations) {
        for (const jobLoc of jobLocations) {
            // Exact match
            if (candidateLoc === jobLoc) return true;
            
            // Partial match (e.g., "Mumbai" matches "Mumbai, Maharashtra")
            if (candidateLoc.includes(jobLoc) || jobLoc.includes(candidateLoc)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Score a candidate against job requirements
 */
function scoreCandidate(candidate, job) {
    let score = 0;
    const matchDetails = {
        gender: false,
        age: false,
        experience: false,
        skills: 0,
        location: false,
        noticePeriod: false
    };

    // Gender match (20 points)
    if (candidate.gender && job.gender) {
        if (matchesGender(candidate.gender, job.gender)) {
            score += 20;
            matchDetails.gender = true;
        }
    }

    // Age match (15 points)
    if (candidate.age && job.age) {
        if (matchesAge(candidate.age, job.age)) {
            score += 15;
            matchDetails.age = true;
        }
    }

    // Experience match (20 points)
    if (candidate.experience && job.workExperience) {
        if (matchesExperience(candidate.experience, job.workExperience)) {
            score += 20;
            matchDetails.experience = true;
        }
    }

    // Skills match (30 points)
    if (candidate.skills && job.keySkills && job.keySkills.length > 0) {
        const skillsMatchPercent = calculateSkillsMatch(candidate.skills, job.keySkills);
        const skillsPoints = (skillsMatchPercent / 100) * 30;
        score += skillsPoints;
        matchDetails.skills = Math.round(skillsMatchPercent);
    }

    // Location match (10 points)
    // Check both current location and preferred location
    let locationMatched = false;
    if (job.location) {
        if (candidate.location && matchesLocation(candidate.location, job.location)) {
            locationMatched = true;
        } else if (candidate.preferredLocation && matchesLocation(candidate.preferredLocation, job.location)) {
            locationMatched = true;
        }
    }
    
    if (locationMatched) {
        score += 10;
        matchDetails.location = true;
    }

    // Notice period match (5 points) - simple text matching
    if (candidate.noticePeriod && job.noticePeriod) {
        const candidateNP = candidate.noticePeriod.toLowerCase();
        const jobNP = job.noticePeriod.toLowerCase();
        if (candidateNP.includes(jobNP) || jobNP.includes(candidateNP)) {
            score += 5;
            matchDetails.noticePeriod = true;
        }
    }

    // Normalize score to 0-100
    const maxPossibleScore = 100;
    const normalizedScore = Math.min(Math.round(score), maxPossibleScore);

    return {
        score: normalizedScore,
        matchDetails
    };
}

/**
 * Match all candidates against job and return scored results
 */
function matchCandidates(candidates, job) {
    const scoredCandidates = candidates.map(candidate => {
        const scoring = scoreCandidate(candidate, job);
        
        return {
            ...candidate,
            matchScore: scoring.score,
            matchDetails: scoring.matchDetails
        };
    });

    // Sort by score (descending)
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

    return scoredCandidates;
}

/**
 * Apply percentage filter
 */
function applyPercentageFilter(candidates, percentage) {
    if (!percentage || percentage <= 0 || percentage > 100) {
        return candidates;
    }

    const total = candidates.length;
    const topCount = Math.ceil(total * (percentage / 100));
    
    return candidates.slice(0, topCount);
}

/**
 * Apply number filter
 */
function applyNumberFilter(candidates, number) {
    if (!number || number <= 0) {
        return candidates;
    }

    const topCount = Math.min(number, candidates.length);
    return candidates.slice(0, topCount);
}

module.exports = {
    matchCandidates,
    applyPercentageFilter,
    applyNumberFilter,
    scoreCandidate
};

