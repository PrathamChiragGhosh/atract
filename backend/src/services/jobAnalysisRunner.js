const JobAnalysis = require("../models/jobAnalysis");
const Job = require("../models/job");
const jobAnalysisService = require("./jobAnalysisService");
const { getIO } = require("../socket/socketServer");

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 10 * 60 * 1000;

const updateJobAnalysis = async (jobId, updates) => {
    return JobAnalysis.findOneAndUpdate(
        { jobId },
        { $set: updates },
        { new: true, upsert: true }
    );
};

const scheduleRetry = async (jobId, attempts, lastError) => {
    const nextRetryAt = new Date(Date.now() + RETRY_DELAY_MS);
    await updateJobAnalysis(jobId, {
        status: "retry_scheduled",
        inProgress: false,
        attempts,
        nextRetryAt,
        lastError
    });
};

const emitJobAnalysisUpdate = (jobId, payload) => {
    try {
        const io = getIO();
        io.to(`job:${jobId}`).emit("job:analysis", payload);
    } catch (err) {
        // silent
    }
};

const runJobAnalysis = async (jobId) => {
    const analysisDoc = await updateJobAnalysis(jobId, {
        inProgress: true,
        status: "processing",
        lastStartedAt: new Date()
    });

    const attempts = (analysisDoc?.attempts || 0) + 1;

    try {
        const job = await Job.findById(jobId);
        if (!job) throw new Error("Job not found");

        const { jobText, analysis, embedding } = await jobAnalysisService.processJob(job);

        const finalDoc = await updateJobAnalysis(jobId, {
            status: "completed",
            inProgress: false,
            attempts,
            lastCompletedAt: new Date(),
            nextRetryAt: null,
            lastError: null,
            provider: process.env.JOB_ANALYSIS_PROVIDER || process.env.RESUME_AI_PROVIDER || null,
            model: process.env.JOB_ANALYSIS_MODEL || process.env.RESUME_AI_MODEL || null,
            embedModel: process.env.JOB_ANALYSIS_EMBED_MODEL || process.env.RESUME_EMBED_MODEL || null,
            jobText,
            summary: analysis.summary,
            keySkills: analysis.keySkills,
            role: analysis.role,
            seniority: analysis.seniority,
            minExperience: analysis.minExperience,
            maxExperience: analysis.maxExperience,
            locations: analysis.locations,
            salaryRange: analysis.salaryRange,
            responsibilities: analysis.responsibilities,
            requirements: analysis.requirements,
            embedding,
            embeddingOnly: false
        });

        emitJobAnalysisUpdate(jobId, { status: "completed", jobId });

        // Reset match attempts for this job since embedding has changed
        setImmediate(() => {
            const { resetMatchAttemptsForJob } = require('./jobMatchingService');
            resetMatchAttemptsForJob(jobId).catch(err => {
                console.error('Error resetting match attempts for job:', err);
            });
        });

        // Trigger instant alerts for job seekers with active instant alert plans
        setImmediate(() => {
            const { triggerInstantAlertsForJob } = require('./jobInstantAlertService');
            triggerInstantAlertsForJob(jobId).catch(err => {
                console.error('Error triggering instant alerts:', err);
            });
        });

        return finalDoc;
    } catch (err) {
        if (attempts < MAX_ATTEMPTS) {
            await scheduleRetry(jobId, attempts, err.message);
            emitJobAnalysisUpdate(jobId, { status: "retry_scheduled", attempts, jobId });
            setTimeout(() => runJobAnalysis(jobId).catch(() => {}), RETRY_DELAY_MS);
            return null;
        }

        // Final fallback: embedding-only
        try {
            const job = await Job.findById(jobId);
            const textParts = [
                job?.jobTitle,
                job?.companyName,
                job?.jobDescription,
                job?.requirements
            ].filter(Boolean).join("\n\n");
            const embedding = await jobAnalysisService.embedText(textParts);
            const finalDoc = await updateJobAnalysis(jobId, {
                status: "embedding_only",
                inProgress: false,
                attempts,
                lastCompletedAt: new Date(),
                nextRetryAt: null,
                lastError: err.message,
                embedding,
                embeddingOnly: true
            });
            emitJobAnalysisUpdate(jobId, { status: "embedding_only", jobId });

            // Reset match attempts for this job since embedding has changed
            setImmediate(() => {
                const { resetMatchAttemptsForJob } = require('./jobMatchingService');
                resetMatchAttemptsForJob(jobId).catch(err => {
                    console.error('Error resetting match attempts for job:', err);
                });
            });

            // Trigger instant alerts even for embedding-only jobs
            setImmediate(() => {
                const { triggerInstantAlertsForJob } = require('./jobInstantAlertService');
                triggerInstantAlertsForJob(jobId).catch(err => {
                    console.error('Error triggering instant alerts:', err);
                });
            });

            return finalDoc;
        } catch (embedErr) {
            await updateJobAnalysis(jobId, {
                status: "failed",
                inProgress: false,
                attempts,
                lastCompletedAt: new Date(),
                nextRetryAt: null,
                lastError: embedErr.message
            });
            emitJobAnalysisUpdate(jobId, { status: "failed", jobId });
            return null;
        }
    }
};

module.exports = { runJobAnalysis };

