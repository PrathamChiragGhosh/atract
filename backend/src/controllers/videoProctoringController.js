"use strict";

const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Job = require("../models/job.js");
const JobSeeker = require("../models/jobSeeker.js");
const Employer = require("../models/employer.js");
const JobAssessment = require("../models/jobAssessment.js");
const VideoProctoringAssessment = require("../models/videoProctoringAssessment.js");
const JobApplication = require("../models/jobApplication.js");
const sendMail = require("../utils/sendMail.js");
const questionService = require("../services/videoProctoringQuestionService.js");
const reporterService = require("../services/videoProctoringReporter.js");
const proctoringQueue = require("../services/proctoringBackgroundQueue.js");
const { compressVideo } = require("../utils/videoCompressor.js");

const PRECHECK_TTL_MINUTES = 15;
const MILLISECONDS_IN_MINUTE = 60 * 1000;

const restrictedEventMap = {
    "exit-fullscreen": { severity: "warning", sessionKey: "fullscreenBreaches", note: "Candidate exited forced full-screen mode." },
    "tab-blur": { severity: "warning", sessionKey: "tabSwitches", note: "Browser tab lost focus." },
    "window-blur": { severity: "warning", sessionKey: "tabSwitches", note: "Browser window lost focus." },
    "copy": { severity: "warning", sessionKey: "copyEvents", note: "Copy shortcut detected." },
    "paste": { severity: "warning", sessionKey: "pasteEvents", note: "Paste shortcut detected." },
    "right-click": { severity: "info", sessionKey: "rightClickEvents", note: "Right-click detected." },
    "devtools-open": { severity: "critical", sessionKey: "devtoolEvents", note: "Developer tools opened." },
    "screen-share-ended": { severity: "warning", note: "Screen sharing stopped unexpectedly." },
    "multiple-faces": { severity: "critical", sessionKey: "suspiciousMovementAlerts", note: "More than one face detected." },
    "face-missing": { severity: "warning", sessionKey: "suspiciousMovementAlerts", note: "Candidate left the frame." },
    "face-away": { severity: "warning", sessionKey: "suspiciousMovementAlerts", note: "Candidate looking away for extended time." },
    "camera-covered": { severity: "critical", sessionKey: "suspiciousMovementAlerts", note: "Camera feed covered or too dark." },
    "mic-muted": { severity: "warning", sessionKey: "backgroundNoiseAlerts", note: "Microphone muted while answering." },
    "network-drop": { severity: "warning", note: "Network connectivity lost." },
    "background-noise": { severity: "info", sessionKey: "backgroundNoiseAlerts", note: "High background noise detected." }
};

const getVideoProctoringStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const includeQuestions = req.query?.includeQuestions === "true";

        const job = await getJobByIdentifier(
            jobId,
            "jobTitle companyName location workMode department skills requiresVideoProctoredTest requiresBasicTest employerId applicationClosingDate status updatedAt"
        );

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const jobObjectId = job._id;
        const jobIdString = jobObjectId.toString();

        let assessment = await VideoProctoringAssessment.findOne({
            job: jobObjectId,
            jobSeeker: req.userId
        });

        if (!assessment) {
            return res.status(200).json({
                success: true,
                data: buildEmptyAssessmentPayload({ jobId: jobIdString, jobSeekerId: req.userId, job })
            });
        }

        const mutated = refreshAssessmentStatus(assessment);
        if (mutated) {
            assessment.lastInteractionAt = new Date();
            await assessment.save();
        }

        const payload = buildAssessmentPayload({
            assessment,
            job,
            includeQuestions
        });

        return res.status(200).json({
            success: true,
            data: payload
        });
    } catch (error) {
        console.error("Get proctoring status error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch video proctored test status"
        });
    }
};

const startVideoProctoringAssessment = async (req, res) => {
    try {
        const { jobId } = req.params;
        const {
            questionCount = process.env.PROCTORING_DEFAULT_QUESTION_COUNT
                ? Number(process.env.PROCTORING_DEFAULT_QUESTION_COUNT)
                : 15,
            runInBackground = false,
            forceNew = false
        } = req.body || {};

        const job = await getJobByIdentifier(
            jobId,
            "jobTitle companyName location workMode department skills experience requiresVideoProctoredTest requiresBasicTest employerId status applicationClosingDate updatedAt jobDescription responsibilities requirements"
        );

        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const jobObjectId = job._id;
        const jobIdString = jobObjectId.toString();

        if (!job.requiresVideoProctoredTest) {
            return res.status(400).json({
                success: false,
                message: "This job does not mandate the video-ready assessment."
            });
        }

        const today = new Date();
        if (job.applicationClosingDate && new Date(job.applicationClosingDate) < today) {
            return res.status(400).json({
                success: false,
                message: "Hiring window closed. Proctored test cannot be started."
            });
        }

        const jobSeeker = await JobSeeker.findById(req.userId)
            .select("fullName email highestQualification experienceInYears skills noticePeriod currentCTC mobileNumber resume");

        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker profile not found"
            });
        }

        if (job.requiresBasicTest) {
            const baselineAssessment = await JobAssessment.findOne({
                job: jobObjectId,
                jobSeeker: req.userId
            }).select("status attempts");

            if (!baselineAssessment || !baselineAssessment.attempts?.some((attempt) => attempt.status === "passed")) {
                return res.status(412).json({
                    success: false,
                    message: "Please pass the basic assessment before launching the video-proctored stage."
                });
            }
        }

        let assessment = await VideoProctoringAssessment.findOne({
            job: jobObjectId,
            jobSeeker: req.userId
        });

        if (!assessment) {
            assessment = new VideoProctoringAssessment({
                job: jobObjectId,
                jobSeeker: req.userId
            });
        }

        const activeAttempt = findActiveAttempt(assessment);
        if (activeAttempt && !forceNew && ["pending-generation", "awaiting-precheck", "ready", "in-progress"].includes(activeAttempt.status)) {
            return res.status(200).json({
                success: true,
                message: "An attempt is already in progress for this job.",
                data: buildAssessmentPayload({
                    assessment,
                    job,
                    includeQuestions: true
                })
            });
        }

        const normalizedQuestionCount = clampQuestionCount(questionCount);
        const countdownSeconds = deriveCountdownSeconds(normalizedQuestionCount);
        const nextAttemptNumber = (assessment.latestAttemptNumber || 0) + 1;

        const freshAttempt = {
            attemptNumber: nextAttemptNumber,
            status: "pending-generation",
            configuration: {
                questionCount: normalizedQuestionCount,
                countdownSeconds
            },
            generation: {
                status: "running",
                queuedAt: new Date()
            },
            progress: buildMcqProgress([])
        };

        assessment.attempts.push(freshAttempt);
        assessment.latestAttemptNumber = nextAttemptNumber;
        assessment.status = "pending-generation";
        assessment.lastInteractionAt = new Date();
        await assessment.save();

        if (runInBackground) {
            proctoringQueue.enqueue(async () => {
                await processBackgroundGeneration({
                    assessmentId: assessment._id,
                    attemptNumber: nextAttemptNumber,
                    job,
                    jobSeeker,
                    normalizedQuestionCount
                });
            }, { id: `vp_generation_${assessment._id}_${nextAttemptNumber}` });

            return res.status(202).json({
                success: true,
                message: "Question set is being curated in the background. We will email you when it is ready.",
                data: buildAssessmentPayload({
                    assessment,
                    job,
                    includeQuestions: false
                })
            });
        }

        const generation = await questionService.generateQuestionSet({
            job: job.toObject ? job.toObject() : job,
            jobSeekerProfile: jobSeeker.toObject ? jobSeeker.toObject() : jobSeeker,
            questionCount: normalizedQuestionCount,
            attemptNumber: nextAttemptNumber
        });

        const attemptRef = assessment.attempts.find((attempt) => attempt.attemptNumber === nextAttemptNumber);
        attemptRef.mcqQuestions = generation.questions;
        attemptRef.progress = buildMcqProgress(attemptRef.mcqQuestions);
        attemptRef.generation.status = "completed";
        attemptRef.generation.startedAt = attemptRef.generation.startedAt || new Date();
        attemptRef.generation.completedAt = new Date();
        attemptRef.status = "awaiting-precheck";
        assessment.status = "awaiting-precheck";
        assessment.lastInteractionAt = new Date();

        await assessment.save();

        return res.status(201).json({
            success: true,
            message: "Video proctored test is ready. Complete the pre-checks to begin.",
            data: buildAssessmentPayload({
                assessment,
                job,
                includeQuestions: true
            })
        });
    } catch (error) {
        console.error("Start proctoring assessment error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to start the video proctored test"
        });
    }
};

const logProctoringPrecheck = async (req, res) => {
    try {
        const { jobId, attemptId } = req.params;
        const { results = {}, summary = null } = req.body || {};

        const job = await getJobByIdentifier(jobId, "_id");
        if (!job) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }
        const jobObjectId = job._id;

        const assessment = await VideoProctoringAssessment.findOne({
            job: jobObjectId,
            jobSeeker: req.userId
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Proctored test record not found"
            });
        }

        const attempt = assessment.attempts.find((item) => item.attemptId === attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        if (!["awaiting-precheck", "ready"].includes(attempt.status)) {
            return res.status(400).json({
                success: false,
                message: "This attempt cannot accept new pre-check results"
            });
        }

        const failedChecks = Object.entries(results || {}).filter(([, value]) => {
            const status = typeof value?.status === "string" ? value.status.toLowerCase() : null;
            return status === "failed";
        });
        if (failedChecks.length) {
            return res.status(412).json({
                success: false,
                code: "precheck_failed",
                message: "Please resolve the highlighted system requirements before proceeding.",
                data: { failedChecks }
            });
        }

        attempt.precheck = {
            completed: true,
            completedAt: new Date(),
            summary: summary || "All signals verified",
            results
        };
        attempt.status = "ready";
        assessment.status = "ready";
        assessment.lastInteractionAt = new Date();

        await assessment.save();

        return res.status(200).json({
            success: true,
            message: "Pre-checks logged successfully.",
            data: {
                attemptId: attempt.attemptId,
                status: attempt.status,
                precheck: attempt.precheck
            }
        });
    } catch (error) {
        console.error("Log proctoring precheck error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to store pre-check results"
        });
    }
};

const acknowledgeMediaPermissions = async (req, res) => {
    try {
        const { jobId, attemptId } = req.params;
        const { cameraGranted = false, microphoneGranted = false, screenGranted = false } = req.body || {};

        const job = await getJobByIdentifier(jobId, "_id");
        if (!job) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }
        const jobObjectId = job._id;

        const assessment = await VideoProctoringAssessment.findOne({
            job: jobObjectId,
            jobSeeker: req.userId
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Proctored test record not found"
            });
        }

        const attempt = assessment.attempts.find((item) => item.attemptId === attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        attempt.permissions = {
            camera: Boolean(cameraGranted),
            microphone: Boolean(microphoneGranted),
            screen: Boolean(screenGranted),
            grantedAt: new Date(),
            reminders: (attempt.permissions?.reminders || 0)
        };
        assessment.lastInteractionAt = new Date();
        await assessment.save();

        return res.status(200).json({
            success: true,
            message: "Permissions recorded",
            data: attempt.permissions
        });
    } catch (error) {
        console.error("Acknowledge permissions error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to record permissions"
        });
    }
};

const updateProctoringMcqProgress = async (req, res) => {
    try {
        const { jobId, attemptId } = req.params;
        const { questionId, selectedOption, isMarked } = req.body || {};

        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: "questionId is required"
            });
        }

        const job = await getJobByIdentifier(jobId, "_id");
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        const assessment = await VideoProctoringAssessment.findOne({
            job: job._id,
            jobSeeker: req.userId
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Proctored test record not found"
            });
        }

        const attempt = assessment.attempts.find((item) => item.attemptId === attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        const mcq = attempt.mcqQuestions.find((question) => question.questionId === questionId);
        if (!mcq) {
            return res.status(404).json({
                success: false,
                message: "Question not found"
            });
        }

        if (selectedOption !== undefined && selectedOption !== null) {
            mcq.selectedOption = clampOptionIndex(selectedOption);
            mcq.answeredAt = new Date();
        }

        if (typeof isMarked === "boolean") {
            mcq.isMarked = isMarked;
        }

        attempt.progress = buildMcqProgress(attempt.mcqQuestions);
        assessment.lastInteractionAt = new Date();
        await assessment.save();

        return res.status(200).json({
            success: true,
            data: {
                attemptId: attempt.attemptId,
                question: sanitizeMcqQuestions([mcq])[0],
                progress: attempt.progress
            }
        });
    } catch (error) {
        console.error("Update MCQ progress error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to update MCQ"
        });
    }
};

const startProctoringSession = async (req, res) => {
    try {
        const { jobId, attemptId } = req.params;
        const { consents = {} } = req.body || {};

        const job = await getJobByIdentifier(jobId, "_id");
        if (!job) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }
        const jobObjectId = job._id;

        const assessment = await VideoProctoringAssessment.findOne({
            job: jobObjectId,
            jobSeeker: req.userId
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Proctored test record not found"
            });
        }

        const attempt = assessment.attempts.find((item) => item.attemptId === attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        if (!attempt.precheck?.completed) {
            return res.status(400).json({
                success: false,
                message: "Please finish the system pre-checks first."
            });
        }

        const elapsedSincePrecheck = Date.now() - new Date(attempt.precheck.completedAt || new Date()).getTime();
        if (elapsedSincePrecheck > PRECHECK_TTL_MINUTES * MILLISECONDS_IN_MINUTE) {
            attempt.precheck.completed = false;
            attempt.precheck.summary = "Expired – rerun required";
            attempt.status = "awaiting-precheck";
            assessment.status = "awaiting-precheck";
            await assessment.save();
            return res.status(428).json({
                success: false,
                message: "Pre-check results expired. Please rerun the tests."
            });
        }

        if (!attempt.permissions?.camera || !attempt.permissions?.microphone || !attempt.permissions?.screen) {
            attempt.permissions = attempt.permissions || {};
            attempt.permissions.reminders = (attempt.permissions.reminders || 0) + 1;
            attempt.permissions.lastReminderAt = new Date();
            await assessment.save();
            return res.status(400).json({
                success: false,
                message: "Camera, microphone and screen sharing permissions are required."
            });
        }

        const normalizedConsents = {
            recording: consents.recording ?? attempt.consents?.recording ?? false,
            integrity: consents.integrity ?? attempt.consents?.integrity ?? false
        };

        if (!normalizedConsents.recording || !normalizedConsents.integrity) {
            return res.status(400).json({
                success: false,
                message: "Please accept the consent statements before starting."
            });
        }

        attempt.consents = {
            recording: Boolean(normalizedConsents.recording),
            integrity: Boolean(normalizedConsents.integrity),
            acceptedAt: new Date()
        };

        attempt.status = "in-progress";
        attempt.session = attempt.session || {};
        attempt.session.startedAt = attempt.session.startedAt || new Date();
        attempt.session.countdownStartedAt = attempt.session.countdownStartedAt || new Date();
        attempt.session.countdownEndsAt = new Date(attempt.session.countdownStartedAt.getTime() + (attempt.configuration?.countdownSeconds || 0) * 1000);
        assessment.status = "in-progress";
        assessment.lastInteractionAt = new Date();

        await assessment.save();

        return res.status(200).json({
            success: true,
            message: "Session is now live. Stay in full-screen until you submit.",
            data: {
                attemptId: attempt.attemptId,
                countdownSeconds: attempt.configuration?.countdownSeconds || 0,
                countdownEndsAt: attempt.session.countdownEndsAt
            }
        });
    } catch (error) {
        console.error("Start proctoring session error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to start the secure session"
        });
    }
};

const recordProctoringEvent = async (req, res) => {
    try {
        const { jobId, attemptId } = req.params;
        const { eventType, severity, note, payload = {} } = req.body || {};

        if (!eventType) {
            return res.status(400).json({
                success: false,
                message: "eventType is required"
            });
        }

        const job = await getJobByIdentifier(jobId, "_id");
        if (!job) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }
        const jobObjectId = job._id;

        const assessment = await VideoProctoringAssessment.findOne({
            job: jobObjectId,
            jobSeeker: req.userId
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Proctored test record not found"
            });
        }

        const attempt = assessment.attempts.find((item) => item.attemptId === attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        const eventPayload = {
            eventType,
            severity: severity || "info",
            note: note || restrictedEventMap[eventType]?.note || null,
            payload,
            recordedAt: new Date()
        };

        attempt.events = attempt.events || [];
        attempt.events.push(eventPayload);

        const restriction = restrictedEventMap[eventType];
        if (restriction) {
            attempt.violations = attempt.violations || [];
            attempt.violations.push({
                eventType,
                severity: restriction.severity,
                note: restriction.note,
                payload,
                recordedAt: new Date()
            });
            if (restriction.sessionKey) {
                attempt.session = attempt.session || {};
                attempt.session[restriction.sessionKey] = (attempt.session[restriction.sessionKey] || 0) + 1;
            }
            if (restriction.severity === "critical") {
                attempt.session = attempt.session || {};
                attempt.session.hasCriticalViolation = true;
            }
        }

        assessment.lastInteractionAt = new Date();
        await assessment.save();

        return res.status(204).send();
    } catch (error) {
        console.error("Record proctoring event error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to log the session event"
        });
    }
};

const storeProctoringAsset = async (req, res) => {
    try {
        const { jobId, attemptId, assetType } = req.params;
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Asset is required"
            });
        }

        if (!["snapshot", "audio"].includes(assetType)) {
            return res.status(400).json({
                success: false,
                message: "Unsupported asset type"
            });
        }

        const job = await getJobByIdentifier(jobId, "_id");
        if (!job) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }
        const jobObjectId = job._id;

        const assessment = await VideoProctoringAssessment.findOne({
            job: jobObjectId,
            jobSeeker: req.userId
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Proctored test record not found"
            });
        }

        const attempt = assessment.attempts.find((item) => item.attemptId === attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        const relativePath = toRelativeUploadsPath(req.file.path);
        const publicUrl = buildAssetUrl(relativePath);
        const assetRecord = {
            assetType,
            storedPath: relativePath,
            publicUrl,
            metadata: {
                mimetype: req.file.mimetype,
                width: req.body?.width,
                height: req.body?.height,
                rmsLevel: req.body?.rmsLevel,
                reason: req.body?.reason || null
            },
            sizeBytes: req.file.size,
            capturedAt: new Date()
        };

        if (assetType === "snapshot") {
            attempt.media.snapshots.push(assetRecord);
            attempt.session.randomSnapshotCount = (attempt.session.randomSnapshotCount || 0) + 1;
        } else if (assetType === "audio") {
            attempt.media.audioSamples.push(assetRecord);
            attempt.session.randomAudioCount = (attempt.session.randomAudioCount || 0) + 1;
        }

        assessment.lastInteractionAt = new Date();
        await assessment.save();

        return res.status(201).json({
            success: true,
            data: {
                assetType,
                url: publicUrl
            }
        });
    } catch (error) {
        console.error("Store proctoring asset error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to store monitoring artifact"
        });
    }
};

const storeProctoringVideo = async (req, res) => {
    try {
        const { jobId, attemptId } = req.params;
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Video payload missing"
            });
        }

        const job = await getJobByIdentifier(jobId, "_id");
        if (!job) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID"
            });
        }
        const jobObjectId = job._id;

        const assessment = await VideoProctoringAssessment.findOne({
            job: jobObjectId,
            jobSeeker: req.userId
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: "Proctored test record not found"
            });
        }

        const attempt = assessment.attempts.find((item) => item.attemptId === attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

        const originalPath = req.file.path;
        const outputName = `${path.basename(originalPath, path.extname(originalPath))}-compressed.mp4`;
        const outputPath = path.join(path.dirname(originalPath), outputName);

        const compressionResult = await compressVideo(originalPath, outputPath, {
            preset: "veryfast",
            crf: 32
        });

        await fs.unlink(originalPath).catch(() => null);

        const relativeCompressedPath = toRelativeUploadsPath(outputPath);
        const videoUrl = buildAssetUrl(relativeCompressedPath);
        attempt.media.recording = {
            storedPath: relativeCompressedPath,
            compressedPath: relativeCompressedPath,
            videoUrl,
            sizeBytes: req.file.size,
            compressedSizeBytes: compressionResult.compressedSizeBytes,
            durationMs: compressionResult.durationMs,
            codec: compressionResult.codec,
            uploadedAt: new Date()
        };

        assessment.lastInteractionAt = new Date();
        await assessment.save();

        return res.status(201).json({
            success: true,
            data: attempt.media.recording
        });
    } catch (error) {
        console.error("Store proctoring video error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to store compressed video"
        });
    }
};

const submitVideoProctoringAttempt = async (req, res) => {
    try {
        const { jobId, attemptId } = req.params;

        const job = await getJobByIdentifier(
            jobId,
            "jobTitle companyName location workMode department skills employerId hiringManagerEmail requiresBasicTest requiresVideoProctoredTest"
        );
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Unable to find the required records"
            });
        }

        const jobObjectId = job._id;
        const jobIdString = jobObjectId.toString();

        const [assessment, jobSeeker, basicAssessmentRecord, employerProfile] = await Promise.all([
            VideoProctoringAssessment.findOne({
                job: jobObjectId,
                jobSeeker: req.userId
            }),
            JobSeeker.findById(req.userId)
                .select("fullName email mobileNumber experienceInYears highestQualification skills resume noticePeriod currentCTC"),
            JobAssessment.findOne({
                job: jobObjectId,
                jobSeeker: req.userId
            }).select("attempts basicQuestions"),
            job.employerId ? Employer.findById(job.employerId).select('email fullName companyName notificationPreferences') : null
        ]);

        if (!assessment || !jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Unable to find the required records"
            });
        }

        const {
            latestAttempt: latestBasicAttempt,
            snapshot: basicSnapshot
        } = deriveBasicSnapshot(basicAssessmentRecord);

        const attempt = assessment.attempts.find((item) => item.attemptId === attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Attempt not found"
            });
        }

    if (["submitted", "passed", "failed", "flagged"].includes(attempt.status) && attempt.session?.endedAt) {
        return res.status(400).json({
            success: false,
            message: attempt.status === "flagged"
                ? "This attempt is already closed and awaiting manual review."
                : "Attempt has already been submitted."
        });
    }

    if (!attempt.session?.startedAt) {
        attempt.session = attempt.session || {};
        attempt.session.startedAt = new Date();
        attempt.status = "in-progress";
    }

    attempt.status = "submitted";
    attempt.session.endedAt = new Date();

        const totalMcq = attempt.mcqQuestions.length;
        let correctCount = 0;
        let unansweredCount = 0;
        const weakAreas = new Set();

        attempt.mcqQuestions.forEach((question) => {
            if (typeof question.selectedOption !== "number") {
                question.scoreAwarded = 0;
                unansweredCount += 1;
                return;
            }
            const isCorrect = question.selectedOption === question.correctOption;
            question.scoreAwarded = isCorrect ? 10 : 0;
            if (isCorrect) {
                correctCount += 1;
            } else if (question.focusArea) {
                weakAreas.add(question.focusArea);
            }
        });

        attempt.progress = buildMcqProgress(attempt.mcqQuestions);

        const questionScore = correctCount * 10;
        const violationPenalty = calculateViolationScore(attempt.violations);
        const finalScore = Math.max(questionScore - violationPenalty, 0);
        const totalAvailable = totalMcq * 10 || 100;
        const passThreshold = Math.round(totalAvailable * 0.7);

        const hasCritical = attempt.violations?.some((item) => item.severity === "critical");
        attempt.finalScore = finalScore;
        attempt.scoreBreakdown = {
            questionScore,
            violationPenalty
        };
        const hasPassed = !hasCritical && finalScore >= passThreshold;
        attempt.hasPassed = hasPassed;

        const incorrectCount = Math.max(totalMcq - correctCount - unansweredCount, 0);
        const technicalSummary = {
            score: finalScore,
            totalQuestions: totalMcq,
            correctAnswers: correctCount,
            incorrectAnswers: incorrectCount,
            unanswered: unansweredCount,
            passed: attempt.hasPassed,
            weakAreas: Array.from(weakAreas)
        };

        let aiSummary = null;
        if (hasPassed) {
            const eventsSummary = summarizeEvents(attempt.events);
            const violationSummary = summarizeEvents(attempt.violations);

            aiSummary = await reporterService.generate({
                job: job.toObject ? job.toObject() : job,
                jobSeeker: jobSeeker.toObject ? jobSeeker.toObject() : jobSeeker,
                attempt,
                eventsSummary,
                violationSummary
            });

            attempt.aiSummary = aiSummary;
        } else {
            attempt.aiSummary = null;
        }

        if (hasPassed) {
            attempt.status = "passed";
            assessment.status = "passed";
        } else {
            attempt.status = "failed";
            assessment.status = "failed";
        }

        assessment.lastInteractionAt = new Date();
        await assessment.save();

        let emailSent = false;
        if (attempt.hasPassed) {
            emailSent = await sendProctoringReportEmail({
                job,
                jobSeeker,
                employer: employerProfile,
                attempt,
                basicSnapshot,
                basicAssessmentRecord,
                latestBasicAttempt
            });
        } else {
            attempt.reportEmailStatus = "skipped";
        }

        await assessment.save();

        if (emailSent && latestBasicAttempt && basicAssessmentRecord) {
            latestBasicAttempt.readinessReviewEmailStatus = "sent";
            await basicAssessmentRecord.save();
        }

        // Auto-apply to job if video test passed and job requires video test
        let applicationData = null;
        if (attempt.hasPassed && job.requiresVideoProctoredTest) {
            try {
                // console.log("Auto-apply: Video test passed, checking application status...");
                // Check if already applied
                let jobApplications = await JobApplication.findOne({ job: jobObjectId });
                const alreadyApplied = jobApplications && jobApplications.applicants.some(
                    applicant => `${applicant.jobSeeker}` === `${req.userId}`
                );

                if (alreadyApplied) {
                    // console.log("Auto-apply: Already applied to this job");
                } else {
                    // Check if basic test is also required and passed
                    const basicTestPassed = job.requiresBasicTest && latestBasicAttempt && latestBasicAttempt.status === "passed";
                    // console.log("Auto-apply: Basic test required:", job.requiresBasicTest, "Basic test passed:", basicTestPassed);
                    
                    if (!job.requiresBasicTest || basicTestPassed) {
                        // console.log("Auto-apply: Creating application...");
                        if (!jobApplications) {
                            jobApplications = new JobApplication({
                                job: jobObjectId,
                                employer: job.employerId,
                                applicants: []
                            });
                        }

                        const submissionType = job.requiresBasicTest && basicTestPassed
                            ? 'basic+video'
                            : 'video-test';

                        const initialTimeline = [
                            {
                                type: "applied",
                                label: "Applied",
                                description: `${jobSeeker.fullName ? jobSeeker.fullName.split(" ")[0] : "You"} submitted this application`,
                                source: "jobseeker",
                                createdAt: new Date()
                            },
                            {
                                type: "sent_to_employer",
                                label: "Application sent",
                                description: "We shared your profile with the employer",
                                source: "system",
                                createdAt: new Date()
                            }
                        ];

                        const defaultEngagement = {
                            viewedAt: null,
                            resumeDownloadedAt: null,
                            lastAction: null
                        };

                        jobApplications.applicants.push({
                            jobSeeker: req.userId,
                            submissionType,
                            hasBasicTest: job.requiresBasicTest && basicTestPassed,
                            hasVideoTest: true,
                            basicAssessmentId: basicTestPassed && basicAssessmentRecord ? basicAssessmentRecord._id : null,
                            videoAssessmentId: assessment._id,
                            requiresBasicTest: job.requiresBasicTest,
                            requiresVideoProctoredTest: job.requiresVideoProctoredTest,
                            profileSnapshot: {
                                fullName: jobSeeker.fullName,
                                email: jobSeeker.email,
                                experienceInYears: jobSeeker.experienceInYears ?? null,
                                highestQualification: jobSeeker.highestQualification || '',
                                skills: Array.isArray(jobSeeker.skills) ? jobSeeker.skills.slice(0, 15) : [],
                                resume: jobSeeker.resume || null
                            },
                            statusTimeline: initialTimeline,
                            employerEngagement: defaultEngagement,
                            lastStatusUpdatedAt: initialTimeline[initialTimeline.length - 1]?.createdAt || new Date()
                        });

                        await jobApplications.save();
                        const latestApplicant = jobApplications.applicants[jobApplications.applicants.length - 1];
                        // console.log("Auto-apply: Application saved, applicant ID:", latestApplicant?._id);

                        await Job.findByIdAndUpdate(
                            jobObjectId,
                            { $inc: { applicationsCount: 1 } },
                            { new: true }
                        );
                        // console.log("Auto-apply: Job applications count updated");

                        // Build application summary for response
                        const latestApplicantObj = latestApplicant?.toObject ? latestApplicant.toObject({ depopulate: true }) : latestApplicant;
                        applicationData = {
                            applicationId: latestApplicant?._id?.toString(),
                            jobId: jobObjectId.toString(),
                            jobTitle: job?.jobTitle || "",
                            companyName: job?.companyName || employerProfile?.companyName || "",
                            companyInitial: (job?.companyName || employerProfile?.companyName || "A")[0].toUpperCase(),
                            companyLogo: employerProfile?.companyLogo || null,
                            location: job?.location || "",
                            workMode: job?.workMode || "",
                            jobType: job?.jobType || "",
                            shortId: job?.shortId || null,
                            status: "pending",
                            submissionType,
                            appliedAt: new Date(),
                            latestUpdateAt: new Date(),
                            requiresBasicTest: job.requiresBasicTest,
                            requiresVideoProctoredTest: true,
                            statusTimeline: initialTimeline,
                            employerEngagement: defaultEngagement,
                            totalUpdates: initialTimeline.length,
                            employerUpdates: 0
                        };
                        // console.log("Auto-apply: Application data built successfully");
                    } else {
                        // console.log("Auto-apply: Skipped - Basic test required but not passed");
                    }
                }
            } catch (applyError) {
                console.error("Auto-apply after video test error:", applyError);
                console.error("Auto-apply error stack:", applyError.stack);
                // Don't fail the request if auto-apply fails
            }
        } else {
            console.log("Auto-apply: Skipped - Video test not passed or job doesn't require video test. hasPassed:", attempt.hasPassed, "requiresVideoProctoredTest:", job.requiresVideoProctoredTest);
        }

        const payload = buildAssessmentPayload({
            assessment,
            job,
            includeQuestions: false
        });

        return res.status(200).json({
            success: true,
            message: "Session submitted. We have shared the report with the employer." + (applicationData ? " Application submitted successfully." : ""),
            data: {
                attemptId: attempt.attemptId,
                finalScore: attempt.finalScore,
                hasPassed: attempt.hasPassed,
                aiSummary,
                assessment: payload,
                application: applicationData
            }
        });
    } catch (error) {
        console.error("Submit proctoring attempt error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to submit the video proctored test"
        });
    }
};

function clampQuestionCount(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 8) {
        return 15;
    }
    if (numeric > 40) {
        return 40;
    }
    return Math.round(numeric);
}

function deriveCountdownSeconds(questionCount) {
    const secondsPerPrompt = 90;
    const buffer = 120;
    return questionCount * secondsPerPrompt + buffer;
}

function findActiveAttempt(assessment) {
    if (!assessment?.attempts?.length) {
        return null;
    }
    return assessment.attempts.find((attempt) => ["pending-generation", "awaiting-precheck", "ready", "in-progress"].includes(attempt.status));
}

function refreshAssessmentStatus(assessment) {
    if (!assessment?.attempts?.length) {
        assessment.status = "not-started";
        return true;
    }

    let mutated = false;
    assessment.attempts.forEach((attempt) => {
        if (attempt.status === "flagged" && !attempt.session?.endedAt) {
            attempt.status = "in-progress";
            mutated = true;
        }
    });

    const previousStatus = assessment.status;
    if (assessment.attempts.some((attempt) => attempt.status === "in-progress")) {
        assessment.status = "in-progress";
    } else if (assessment.attempts.some((attempt) => attempt.status === "ready")) {
        assessment.status = "ready";
    } else if (assessment.attempts.some((attempt) => attempt.status === "awaiting-precheck")) {
        assessment.status = "awaiting-precheck";
    } else if (assessment.attempts.some((attempt) => attempt.status === "pending-generation")) {
        assessment.status = "pending-generation";
    } else if (assessment.attempts.some((attempt) => attempt.status === "passed")) {
        assessment.status = "passed";
    } else if (assessment.attempts.some((attempt) => attempt.status === "failed")) {
        assessment.status = "failed";
    } else if (assessment.attempts.some((attempt) => attempt.status === "flagged")) {
        assessment.status = "flagged";
    } else {
        assessment.status = "submitted";
    }
    return mutated || previousStatus !== assessment.status;
}

function buildAssessmentPayload({ assessment, job, includeQuestions = false }) {
    const attemptsSummary = assessment.attempts.map((attempt) => ({
        attemptId: attempt.attemptId,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        finalScore: attempt.finalScore,
        hasPassed: attempt.hasPassed,
        recordedAt: attempt.session?.endedAt || attempt.session?.startedAt,
        riskScore: attempt.aiSummary?.riskScore ?? null
    }));

    const activeAttempt = findActiveAttempt(assessment);
    const payload = {
        _id: assessment._id.toString(),
        jobId: assessment.job.toString(),
        jobSeekerId: assessment.jobSeeker.toString(),
        status: assessment.status,
        attemptsSummary,
        requiresVideo: job?.requiresVideoProctoredTest ?? true,
        latestAttemptNumber: assessment.latestAttemptNumber,
        lastInteractionAt: assessment.lastInteractionAt,
        activeAttemptId: activeAttempt?.attemptId || null
    };

    if (includeQuestions && activeAttempt) {
        payload.activeAttempt = {
            attemptId: activeAttempt.attemptId,
            attemptNumber: activeAttempt.attemptNumber,
            status: activeAttempt.status,
            configuration: activeAttempt.configuration,
            generation: activeAttempt.generation,
            precheck: activeAttempt.precheck,
            permissions: activeAttempt.permissions,
            consents: activeAttempt.consents,
            session: activeAttempt.session,
            media: {
                snapshots: activeAttempt.media.snapshots.slice(-5),
                audioSamples: activeAttempt.media.audioSamples.slice(-3),
                recording: activeAttempt.media.recording
            },
            mcqQuestions: includeQuestions ? sanitizeMcqQuestions(activeAttempt.mcqQuestions) : [],
            progress: activeAttempt.progress || buildMcqProgress(activeAttempt.mcqQuestions),
            violations: activeAttempt.violations?.slice(-10) || [],
            events: activeAttempt.events?.slice(-20) || []
        };
    }

    const latestAttempt = assessment.attempts[assessment.attempts.length - 1];
    if (latestAttempt?.aiSummary) {
        payload.latestReport = latestAttempt.aiSummary;
    }

    return payload;
}

function buildEmptyAssessmentPayload({ jobId, jobSeekerId, job }) {
    return {
        jobId,
        jobSeekerId,
        status: "not-started",
        requiresVideo: job?.requiresVideoProctoredTest ?? true,
        attemptsSummary: [],
        latestAttemptNumber: 0,
        activeAttemptId: null
    };
}

async function processBackgroundGeneration({ assessmentId, attemptNumber, job, jobSeeker, normalizedQuestionCount }) {
    const assessment = await VideoProctoringAssessment.findById(assessmentId);
    if (!assessment) {
        return;
    }
    const attempt = assessment.attempts.find((item) => item.attemptNumber === attemptNumber);
    if (!attempt) {
        return;
    }
    try {
        attempt.generation.status = "running";
        attempt.generation.startedAt = new Date();
        await assessment.save();

        const generation = await questionService.generateQuestionSet({
            job: job.toObject ? job.toObject() : job,
            jobSeekerProfile: jobSeeker.toObject ? jobSeeker.toObject() : jobSeeker,
            questionCount: normalizedQuestionCount,
            attemptNumber
        });

        attempt.mcqQuestions = generation.questions;
        attempt.progress = buildMcqProgress(attempt.mcqQuestions);
        attempt.generation.status = "completed";
        attempt.generation.completedAt = new Date();
        attempt.status = "awaiting-precheck";
        assessment.status = "awaiting-precheck";
        assessment.lastInteractionAt = new Date();
        await assessment.save();

        await sendProctoringReadyEmail({
            job,
            jobSeeker,
            attempt
        });
    } catch (error) {
        console.error("Background proctoring generation error:", error);
        attempt.generation.status = "failed";
        attempt.generation.error = error.message;
        assessment.status = "failed";
        await assessment.save();
    }
}

async function sendProctoringReadyEmail({ job, jobSeeker, attempt }) {
    if (!jobSeeker?.email) {
        return;
    }
    const portalUrl = buildJobSeekerPortalUrl(job?._id, attempt?.attemptId);
    const html = `
        <div style="font-family: Arial, sans-serif; max-width:640px; margin:auto; border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <div style="background:#111827;color:#fff;padding:18px 22px;">
                <h2 style="margin:0;font-size:18px;">Your secure video assessment is ready</h2>
                <p style="margin:4px 0 0 0;font-size:13px;">${job?.companyName || "Atract"} – ${job?.jobTitle || "Opportunity"}</p>
            </div>
            <div style="padding:22px;">
                <p style="font-size:15px;color:#1f2937;">Hi ${jobSeeker?.fullName?.split(" ")[0] || "there"},</p>
                <p style="font-size:15px;color:#1f2937;">
                    We curated a personalised video-proctored question set covering ${job?.jobTitle || "the"} role. Please run the system checks and start the session in one sitting.
                </p>
                <ol style="font-size:14px; color:#374151;line-height:1.6;">
                    <li>Confirm camera, microphone and speaker access.</li>
                    <li>Stay in full screen and avoid switching tabs.</li>
                    <li>We will randomly capture snapshots & audio snippets for integrity.</li>
                </ol>
                <p style="text-align:center;margin:24px 0;">
                    <a href="${portalUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
                        Open secure test
                    </a>
                </p>
                <p style="font-size:13px;color:#6b7280;">Link expires if the job closes. Reach out to the recruiter if you need help.</p>
            </div>
        </div>
    `;

    await sendMail(jobSeeker.email, "Video proctored test is ready", html);
}

async function sendProctoringReportEmail({ job, jobSeeker, employer, attempt, basicSnapshot = null, basicAssessmentRecord = null, latestBasicAttempt = null }) {
    const employerEmail = employer?.email || job?.hiringManagerEmail;
    if (!employerEmail) {
        attempt.reportEmailStatus = "skipped";
        return false;
    }

    const videoUrl = attempt.media?.recording?.videoUrl ? buildAssetUrl(attempt.media.recording.videoUrl) : "Video link will be available inside the dashboard.";
    const verdictBadge = attempt.hasPassed ? "PASS" : attempt.status === "failed" ? "FAIL" : "REVIEW";
    
    // Build resume URL
    const jwt = require('jsonwebtoken');
    const RESUME_SHARE_TOKEN_TTL = process.env.RESUME_SHARE_TOKEN_TTL || "7d";
    let resumeUrl = null;
    if (jobSeeker?.resume && jobSeeker?._id && process.env.JWT_SECRET) {
        try {
            const serviceBase = process.env.JOBSEEKER_URL || process.env.APP_BASE_URL || "";
            if (serviceBase) {
                const token = jwt.sign(
                    {
                        scope: "resume_share",
                        jobSeekerId: jobSeeker._id.toString(),
                        resumePath: jobSeeker.resume
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: RESUME_SHARE_TOKEN_TTL }
                );
                resumeUrl = `${serviceBase}/resume/share/${token}`;
            }
        } catch (error) {
            console.error("Resume share token error:", error);
        }
    }
    if (!resumeUrl && jobSeeker?.resume) {
        const base = process.env.PUBLIC_ASSET_BASE_URL || process.env.APP_BASE_URL || "";
        if (base) {
            resumeUrl = `${base}/${jobSeeker.resume.replace(/^\//, "")}`;
        }
    }

    // Extract basic test data if available
    let basicTestSection = "";
    let hasBasicTest = false;
    if (basicAssessmentRecord && latestBasicAttempt && job.requiresBasicTest) {
        hasBasicTest = true;
        const review = latestBasicAttempt.readinessReview || {};
        const technicalSummary = {
            score: typeof latestBasicAttempt.score === "number" ? latestBasicAttempt.score : 0,
            totalQuestions: latestBasicAttempt.mcqQuestions?.length || 10,
            correctAnswers: Math.floor((latestBasicAttempt.score || 0) / 10),
            incorrectAnswers: (latestBasicAttempt.mcqQuestions?.length || 10) - Math.floor((latestBasicAttempt.score || 0) / 10),
            unanswered: 0,
            passed: latestBasicAttempt.status === "passed",
            weakAreas: latestBasicAttempt.weakAreas || []
        };
        
        // Build readiness pairs
        const readinessFlow = [];
        if (basicAssessmentRecord.basicQuestions && latestBasicAttempt.basicResponses) {
            const responseMap = new Map();
            latestBasicAttempt.basicResponses.forEach((response) => {
                responseMap.set(response.questionId, response);
            });
            basicAssessmentRecord.basicQuestions.forEach((question) => {
                const response = responseMap.get(question.questionId);
                readinessFlow.push({
                    question: question.prompt,
                    answer: (response?.answerText || '').trim()
                });
            });
        }
        
        const readinessList = readinessFlow
            .map(pair => `<li style="margin-bottom:8px;"><strong>${pair.question}</strong><br/><em style="color:#475569;">${pair.answer || "Not answered"}</em></li>`)
            .join("");
        const readinessHtml = readinessList ? `<ol style="padding-left:20px; margin:8px 0;">${readinessList}</ol>` : "<p>No readiness responses captured.</p>";
        
        const highlightsHtml = (review.highlights || []).length
            ? `<ul style="padding-left:18px; margin:8px 0;">${review.highlights.map(item => `<li style="margin-bottom:4px;color:#047857;">${item}</li>`).join("")}</ul>`
            : "<p>—</p>";
        
        const concernsHtml = (review.concerns || []).length
            ? `<ul style="padding-left:18px; margin:8px 0;">${review.concerns.map(item => `<li style="margin-bottom:4px;color:#b45309;">${item}</li>`).join("")}</ul>`
            : "<p>—</p>";
        
        const inconsistenciesHtml = (review.inconsistencies || []).length
            ? `<ul style="padding-left:18px; margin:8px 0;">${review.inconsistencies.map(item => `<li style="margin-bottom:4px;"><strong>${item.topic}:</strong> ${item.description} (${item.severity})</li>`).join("")}</ul>`
            : "<p>No conflicts detected.</p>";
        
        const recommendationsHtml = (review.recommendations || []).length
            ? `<ul style="padding-left:18px; margin:8px 0;">${review.recommendations.map(item => `<li style="margin-bottom:4px;">${item}</li>`).join("")}</ul>`
            : "<p>—</p>";
        
        const integrity = latestBasicAttempt.integrity || {};
        const integrityHtml = `
            <div style="margin-top:8px;">
                <p style="margin:4px 0;"><strong>Copy attempts:</strong> ${integrity.copyEvents || 0}</p>
                <p style="margin:4px 0;"><strong>Paste attempts:</strong> ${integrity.pasteEvents || 0}</p>
                <p style="margin:4px 0;"><strong>Tab/window switches:</strong> ${integrity.tabBlurEvents || 0}</p>
                <p style="margin:4px 0;"><strong>Times resumed:</strong> ${integrity.resumeCount || 0}</p>
            </div>
        `;
        
        basicTestSection = `
            <hr style="margin:24px 0; border:none; border-top:2px solid #e5e7eb;" />
            <h2 style="margin:0 0 16px 0; font-size:20px; color:#0f172a;">Basic Assessment Summary</h2>
            <p><strong>Technical Score:</strong> ${technicalSummary.score}/100 (${technicalSummary.passed ? "Passed" : "Failed"})</p>
            <p><strong>Fit Verdict:</strong> ${review.fitVerdict || "N/A"}</p>
            <p style="margin-top:12px;">${review.summary || "Summary not available."}</p>
            
            <div style="margin:16px 0; padding:16px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc;">
                <h3 style="margin:0 0 12px 0; font-size:16px; color:#0f172a;">Performance Snapshot</h3>
                <table style="width:100%; border-collapse:collapse; margin-top:12px;">
                    <tr>
                        <td style="padding:6px 0; border-bottom:1px dashed #dbeafe; color:#475569;"><strong>Correct Answers</strong></td>
                        <td style="padding:6px 0; border-bottom:1px dashed #dbeafe; color:#0f172a;">${technicalSummary.correctAnswers}/${technicalSummary.totalQuestions}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; border-bottom:1px dashed #dbeafe; color:#475569;"><strong>Incorrect Answers</strong></td>
                        <td style="padding:6px 0; border-bottom:1px dashed #dbeafe; color:#0f172a;">${technicalSummary.incorrectAnswers}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; border-bottom:1px dashed #dbeafe; color:#475569;"><strong>Weak Areas</strong></td>
                        <td style="padding:6px 0; border-bottom:1px dashed #dbeafe; color:#0f172a;">${(technicalSummary.weakAreas || []).join(", ") || "None"}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#475569;"><strong>Integrity Snapshot</strong></td>
                        <td style="padding:6px 0; color:#0f172a;">Copy ${integrity.copyEvents || 0} · Tab switches ${integrity.tabBlurEvents || 0}</td>
                    </tr>
                </table>
            </div>
            
            <h3 style="margin-top:20px;">Highlights</h3>
            ${highlightsHtml}
            
            <h3 style="margin-top:16px;">Concerns</h3>
            ${concernsHtml}
            
            <h3 style="margin-top:16px;">Inconsistencies</h3>
            ${inconsistenciesHtml}
            
            <h3 style="margin-top:16px;">Recommended Follow-ups</h3>
            ${recommendationsHtml}
            
            <h3 style="margin-top:16px;">Assessment Integrity Signals</h3>
            ${integrityHtml}
            
            <h3 style="margin-top:16px;">Readiness Responses</h3>
            ${readinessHtml}
        `;
    }

    const videoTestSection = `
        <hr style="margin:24px 0; border:none; border-top:2px solid #e5e7eb;" />
        <h2 style="margin:0 0 16px 0; font-size:20px; color:#0f172a;">Video Proctoring Summary</h2>
        <p style="margin:0 0 12px 0;">${attempt.aiSummary?.summary || "Summary unavailable."}</p>
        <ul style="padding-left:18px; margin:0;">
            ${(attempt.aiSummary?.highlights || []).map((item) => `<li style="margin-bottom:6px;color:#047857;">${item}</li>`).join("")}
        </ul>
        <ul style="padding-left:18px; margin:16px 0 0 0;">
            ${(attempt.aiSummary?.concerns || []).map((item) => `<li style="margin-bottom:6px;color:#b91c1c;">${item}</li>`).join("")}
        </ul>
        <p style="margin-top:16px;"><strong>Risk score:</strong> ${attempt.aiSummary?.riskScore ?? "N/A"} / 100</p>
        <p><strong>Security video:</strong> <a href="${videoUrl}" style="color:#2563eb;">${videoUrl}</a></p>
    `;

    const subject = hasBasicTest 
        ? `[${job?.companyName || employer?.companyName || "Atract"}] ${jobSeeker?.fullName || "Candidate"} – Complete Assessment Summary for ${job?.jobTitle || "Role"}`
        : `[${job?.companyName || "Atract"}] Video proctoring report – ${jobSeeker?.fullName || "Candidate"}`;

    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 720px; margin:0 auto; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
            <div style="background:#0f172a; color:#fff; padding:16px 20px;">
                <h2 style="margin:0;font-size:18px;">${job?.jobTitle || "Role"} – ${hasBasicTest ? "Complete Assessment Summary" : "Proctoring Report"}</h2>
                <p style="margin:6px 0 0 0;font-size:13px;">${job?.companyName || employer?.companyName || "Atract Hiring"} | Verdict: ${verdictBadge}</p>
            </div>
            <div style="padding:20px;">
                <h3 style="margin-top:0;">Candidate</h3>
                <p style="margin:4px 0;"><strong>Name:</strong> ${jobSeeker?.fullName || "N/A"} (${jobSeeker?.email || "N/A"})</p>
                <p style="margin:4px 0;"><strong>Experience:</strong> ${jobSeeker?.experienceInYears ?? "N/A"} years</p>
                <p style="margin:4px 0;"><strong>Current CTC:</strong> ${jobSeeker?.currentCTC ? `${jobSeeker.currentCTC} LPA` : "Not shared"}</p>
                <p style="margin:4px 0;"><strong>Highest qualification:</strong> ${jobSeeker?.highestQualification || "N/A"}</p>
                <p style="margin:4px 0;"><strong>Notice period:</strong> ${jobSeeker?.noticePeriod ?? "N/A"} days</p>
                <p style="margin:4px 0;"><strong>Phone:</strong> ${jobSeeker?.mobileNumber || "N/A"}</p>
                <p style="margin:4px 0;"><strong>Resume:</strong> ${resumeUrl ? `<a href="${resumeUrl}" style="color:#2563eb;">Open resume</a>` : "Resume not attached"}</p>
                
                ${hasBasicTest ? basicTestSection : ""}
                ${videoTestSection}
            </div>
            <div style="background:#f8fafc; padding:14px 20px; font-size:12px; color:#475569;">
                This digest was automatically generated to help you review ${jobSeeker?.fullName || "the candidate"} faster.
            </div>
        </div>
    `;

    // Build resume attachment path
    const attachments = [];
    if (jobSeeker?.resume) {
        const projectRoot = path.resolve(__dirname, "../../");
        const uploadsRoot = path.resolve(projectRoot, "uploads");
        let absolutePath;
        if (jobSeeker.resume.startsWith("/uploads/")) {
            absolutePath = path.resolve(projectRoot, `.${jobSeeker.resume}`);
        } else if (path.isAbsolute(jobSeeker.resume)) {
            absolutePath = jobSeeker.resume;
        } else {
            absolutePath = path.resolve(projectRoot, jobSeeker.resume);
        }
        if (absolutePath.startsWith(uploadsRoot) && fsSync.existsSync(absolutePath)) {
            attachments.push({
                filename: path.basename(absolutePath),
                path: absolutePath
            });
        }
    }

    try {
        const response = await sendMail(
            employerEmail,
            subject,
            html,
            attachments.length > 0 ? attachments : undefined
        );
        attempt.reportEmailStatus = response?.success ? "sent" : "failed";
        return attempt.reportEmailStatus === "sent";
    } catch (error) {
        console.error("Failed to send proctoring report email:", error);
        attempt.reportEmailStatus = "failed";
        return false;
    }
}

function buildJobSeekerPortalUrl(jobId, attemptId) {
    const base =
        process.env.JOBSEEKER_PORTAL_URL ||
        process.env.FRONTEND_URL ||
        process.env.APP_BASE_URL ||
        "";
    if (!base) {
        return "#";
    }
    const url = new URL(base);
    url.pathname = `/jobseeker/proctoring/${jobId}`;
    if (attemptId) {
        url.searchParams.set("attemptId", attemptId);
    }
    return url.toString();
}

function buildAssetUrl(relativePath = "") {
    if (!relativePath) {
        return null;
    }
    if (/^https?:\/\//i.test(relativePath)) {
        return relativePath;
    }
    const base =
        process.env.PUBLIC_ASSET_BASE_URL ||
        process.env.APP_BASE_URL ||
        process.env.FRONTEND_URL ||
        "";
    if (!base) {
        return relativePath;
    }
    return `${base.replace(/\/$/, "")}/${relativePath.replace(/^\//, "")}`;
}

function toRelativeUploadsPath(absolutePath) {
    if (!absolutePath) {
        return null;
    }
    const uploadsRoot = path.join(__dirname, "../../");
    return absolutePath.replace(`${uploadsRoot}${path.sep}`, "").replace(/\\/g, "/");
}

function summarizeEvents(events = []) {
    return events.slice(-25).map((event) => ({
        eventType: event.eventType,
        severity: event.severity,
        note: event.note,
        recordedAt: event.recordedAt
    }));
}

function calculateViolationScore(violations = []) {
    if (!violations.length) {
        return 0;
    }
    return violations.reduce((sum, violation) => {
        if (violation.severity === "critical") {
            return sum + 25;
        }
        if (violation.severity === "warning") {
            return sum + 12;
        }
        return sum + 3;
    }, 0);
}

async function getJobByIdentifier(identifier, selectFields) {
    if (!identifier) {
        return null;
    }
    const select = selectFields || "";

    if (mongoose.Types.ObjectId.isValid(identifier)) {
        const byId = await Job.findById(identifier).select(select).exec();
        if (byId) {
            return byId;
        }
    }

    return Job.findOne({ shortId: identifier }).select(select).exec();
}

function buildMcqProgress(mcqQuestions = []) {
    const total = mcqQuestions.length || 0;
    const answered = mcqQuestions.filter((question) => typeof question.selectedOption === "number").length;
    const marked = mcqQuestions.filter((question) => question.isMarked).length;

    return {
        total,
        answered,
        remaining: Math.max(total - answered, 0),
        marked
    };
}

function sanitizeMcqQuestions(mcqQuestions = []) {
    return mcqQuestions.map((question) => ({
        questionId: question.questionId,
        prompt: question.prompt,
        summary: question.summary,
        intent: question.intent,
        focusArea: question.focusArea,
        difficulty: question.difficulty,
        options: question.options,
        selectedOption: typeof question.selectedOption === "number" ? question.selectedOption : null,
        isMarked: question.isMarked,
        answeredAt: question.answeredAt,
        recommendedDurationSec: question.recommendedDurationSec,
        weight: question.weight
    }));
}

function clampOptionIndex(value) {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
        return 0;
    }
    if (parsed > 3) {
        return 3;
    }
    return parsed;
}

function deriveBasicSnapshot(basicAssessmentRecord) {
    if (!basicAssessmentRecord?.attempts?.length) {
        return {
            latestAttempt: null,
            snapshot: null
        };
    }

    const sorted = [...basicAssessmentRecord.attempts].sort(
        (a, b) => (b.attemptNumber || 0) - (a.attemptNumber || 0)
    );
    const latestAttempt = sorted[0] || null;

    if (!latestAttempt) {
        return {
            latestAttempt: null,
            snapshot: null
        };
    }

    return {
        latestAttempt,
        snapshot: {
            score: typeof latestAttempt.score === "number" ? latestAttempt.score : null,
            result: latestAttempt.status,
            readinessReview: latestAttempt.readinessReview || null
        }
    };
}

module.exports = {
    getVideoProctoringStatus,
    startVideoProctoringAssessment,
    logProctoringPrecheck,
    acknowledgeMediaPermissions,
    updateProctoringMcqProgress,
    startProctoringSession,
    recordProctoringEvent,
    storeProctoringAsset,
    storeProctoringVideo,
    submitVideoProctoringAttempt
};


