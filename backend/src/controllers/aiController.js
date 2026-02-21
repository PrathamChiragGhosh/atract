const aiProvider = require('../utils/aiProvider');
const Job = require('../models/job.js');

/**
 * Generate job description using AI
 * @route POST /job/generate-jd
 * @access Private (Employer only)
 */
const generateJobDescription = async (req, res) => {
    try {
        const {
            jobTitle,
            companyName,
            jobType,
            department,
            employmentType,
            experience,
            workMode,
            location,
            highestQualification,
            minSalary,
            maxSalary,
            applicationOpeningDate,
            applicationClosingDate,
            responsibilities,
            requirements,
            perksAndBenefits,
            skills = []
        } = req.body;

        // Validate required fields
        if (!jobTitle || !companyName) {
            return res.status(400).json({
                success: false,
                message: 'Job title and company name are required'
            });
        }

        // Prepare job data for AI generation
        const jobData = {
            jobTitle: jobTitle.trim(),
            companyName: companyName.trim(),
            jobType: jobType || '',
            department: department || '',
            employmentType: employmentType || '',
            experience: experience || '',
            workMode: workMode || '',
            location: location || '',
            highestQualification: highestQualification || '',
            minSalary: minSalary || null,
            maxSalary: maxSalary || null,
            applicationOpeningDate: applicationOpeningDate || '',
            applicationClosingDate: applicationClosingDate || '',
            responsibilities: responsibilities || '',
            requirements: requirements || '',
            perksAndBenefits: perksAndBenefits || '',
            skills: Array.isArray(skills) ? skills : []
        };

        // Generate job description using AI
        const generatedContent = await aiProvider.generateJobDescription(jobData);

        return res.status(200).json({
            success: true,
            message: 'Job description generated successfully',
            data: generatedContent
        });

    } catch (error) {
        console.error('Generate JD Error:', error);
        
        // Handle specific AI provider errors
        if (error.message.includes('API key')) {
            return res.status(500).json({
                success: false,
                message: 'AI service configuration error. Please check API key settings.'
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate job description. Please try again.'
        });
    }
};

/**
 * Get count of jobs pending social share generation
 * @route GET /job/pending-social-share-count
 * @access Private (Employer only)
 */
const getPendingSocialShareCount = async (req, res) => {
    try {
        const employerId = req.userId;

        const count = await Job.countDocuments({
            employerId,
            shortId: { $exists: true, $ne: null }, // Only jobs with shortId (published jobs)
            $or: [
                { socialShareContent: { $exists: false } },
                { socialShareContent: null },
                { socialShareContent: '' }
            ]
        });

        return res.status(200).json({
            success: true,
            data: { pendingCount: count }
        });
    } catch (error) {
        console.error('Get Pending Social Share Count Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get pending count'
        });
    }
};

/**
 * Generate social share for multiple jobs
 * @route POST /job/generate-social-share
 * @access Private (Employer only)
 */
const generateSocialShareForJobs = async (req, res) => {
    try {
        const employerId = req.userId;
        const { generateInBackground = false } = req.body;

        // Find all jobs without social share content
        const jobs = await Job.find({
            employerId,
            shortId: { $exists: true, $ne: null },
            $or: [
                { socialShareContent: { $exists: false } },
                { socialShareContent: null },
                { socialShareContent: '' }
            ]
        }).select('_id jobTitle companyName jobDescription location workMode jobType skills shortId');

        if (jobs.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'All jobs already have social share content',
                data: {
                    total: 0,
                    generated: 0,
                    failed: 0
                }
            });
        }

        if (generateInBackground) {
            // Return immediately and process in background
            res.status(202).json({
                success: true,
                message: `Social share generation started for ${jobs.length} jobs`,
                data: {
                    total: jobs.length,
                    taskId: `social_share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }
            });

            // Process in background
            processSocialShareGeneration(jobs, employerId).catch(err => {
                console.error('Background Social Share Generation Error:', err);
            });

            return;
        }

        // Generate synchronously
        const results = await processSocialShareGeneration(jobs, employerId);

        return res.status(200).json({
            success: true,
            message: `Social share generated for ${results.generated} out of ${results.total} jobs`,
            data: results
        });

    } catch (error) {
        console.error('Generate Social Share Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate social share'
        });
    }
};

/**
 * Process social share generation for jobs
 */
async function processSocialShareGeneration(jobs, employerId) {
    let generated = 0;
    let failed = 0;
    const failedJobIds = [];

    for (const job of jobs) {
        try {
            if (!job.shortId) {
                failed++;
                failedJobIds.push(job._id.toString());
                continue;
            }

            const jobData = {
                jobTitle: job.jobTitle,
                companyName: job.companyName,
                jobDescription: job.jobDescription || '',
                location: job.location || '',
                workMode: job.workMode || '',
                jobType: job.jobType || '',
                skills: Array.isArray(job.skills) ? job.skills : [],
                shortId: job.shortId
            };

            const socialShareContent = await aiProvider.generateSocialShare(jobData);

            // Update job with social share content
            await Job.findByIdAndUpdate(job._id, {
                socialShareContent: socialShareContent
            });

            generated++;
        } catch (error) {
            console.error(`Failed to generate social share for job ${job._id}:`, error);
            failed++;
            failedJobIds.push(job._id.toString());
        }
    }

    return {
        total: jobs.length,
        generated,
        failed,
        failedJobIds
    };
}

/**
 * Generate social share for a single job
 * @route POST /job/:jobId/generate-social-share
 * @access Private (Employer only)
 */
const generateSocialShareForSingleJob = async (req, res) => {
    try {
        const employerId = req.userId;
        const { jobId } = req.params;
        const { generateInBackground = false } = req.body;

        // Find the job
        const job = await Job.findOne({
            _id: jobId,
            employerId
        }).select('_id jobTitle companyName jobDescription location workMode jobType skills shortId socialShareContent');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (!job.shortId) {
            return res.status(400).json({
                success: false,
                message: 'Job must have a shortId to generate social share'
            });
        }

        // If already has social share content, return it
        if (job.socialShareContent) {
            return res.status(200).json({
                success: true,
                message: 'Social share content already exists',
                data: {
                    socialShareContent: job.socialShareContent,
                    alreadyGenerated: true
                }
            });
        }

        if (generateInBackground) {
            // Return immediately and process in background
            res.status(202).json({
                success: true,
                message: 'Social share generation started',
                data: {
                    taskId: `social_share_single_${jobId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    jobId: job._id.toString()
                }
            });

            // Process in background
            processSingleJobSocialShare(job).catch(err => {
                console.error('Background Single Job Social Share Generation Error:', err);
            });

            return;
        }

        // Generate synchronously
        const socialShareContent = await processSingleJobSocialShare(job);

        return res.status(200).json({
            success: true,
            message: 'Social share generated successfully',
            data: {
                socialShareContent,
                alreadyGenerated: false
            }
        });

    } catch (error) {
        console.error('Generate Single Job Social Share Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate social share'
        });
    }
};

/**
 * Process social share generation for a single job
 */
async function processSingleJobSocialShare(job) {
    if (!job.shortId) {
        throw new Error('Job must have a shortId');
    }

    const jobData = {
        jobTitle: job.jobTitle,
        companyName: job.companyName,
        jobDescription: job.jobDescription || '',
        location: job.location || '',
        workMode: job.workMode || '',
        jobType: job.jobType || '',
        skills: Array.isArray(job.skills) ? job.skills : [],
        shortId: job.shortId
    };

    const socialShareContent = await aiProvider.generateSocialShare(jobData);

    // Update job with social share content
    await Job.findByIdAndUpdate(job._id, {
        socialShareContent: socialShareContent
    });

    return socialShareContent;
}

module.exports = {
    generateJobDescription,
    getPendingSocialShareCount,
    generateSocialShareForJobs,
    generateSocialShareForSingleJob
};

