"use strict";

const OpenAI = require("openai");

class ReadinessReviewer {
    constructor() {
        this.client = null;
        this.model = process.env.TOGETHER_MODEL || "openai/gpt-oss-20b";
        this.provider = "together-ai";
    }

    ensureClient() {
        if (this.client) {
            return;
        }
        if (!process.env.TOGETHER_API_KEY) {
            throw new Error("TOGETHER_API_KEY is not configured");
        }
        this.client = new OpenAI({
            apiKey: process.env.TOGETHER_API_KEY,
            baseURL: "https://api.together.xyz/v1"
        });
    }

    async generate(payload) {
        this.ensureClient();

        const prompt = this.buildPrompt(payload);

        const startedAt = Date.now();
        const completion = await this.client.chat.completions.create({
            model: this.model,
            temperature: 0.3,
            max_tokens: 1400,
            top_p: 0.9,
            messages: [
                {
                    role: "system",
                    content: "You are an experienced technical recruiter. Respond ONLY with valid JSON that matches the requested schema."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

        const latencyMs = Date.now() - startedAt;
        const content = completion.choices?.[0]?.message?.content?.trim();
        if (!content) {
            throw new Error("No readiness summary generated");
        }

        const parsed = this.extractJson(content);
        if (!parsed.summary || !parsed.fitVerdict) {
            throw new Error("Invalid readiness summary response");
        }

        return {
            summary: parsed.summary,
            fitVerdict: parsed.fitVerdict,
            highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
            concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
            inconsistencies: Array.isArray(parsed.inconsistencies) ? parsed.inconsistencies : [],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            historicalInsights: Array.isArray(parsed.historicalInsights) ? parsed.historicalInsights : [],
            generatedAt: new Date(),
            generationMeta: {
                provider: this.provider,
                model: this.model,
                latencyMs
            }
        };
    }

    buildPrompt({ job, jobSeeker, readinessPairs, technicalSummary, resumeUrl, integrity = {}, historicalAttempts = [] }) {
        const jobBlock = `
JOB CONTEXT:
- Title: ${job?.jobTitle || "N/A"}
- Company: ${job?.companyName || "N/A"}
- Location: ${job?.location || "N/A"}
- Experience expectation: ${job?.experience || "N/A"}
- Key skills: ${(job?.skills || []).join(", ") || "N/A"}
`.trim();

        const seekerBlock = `
CANDIDATE PROFILE:
- Name: ${jobSeeker?.fullName || "N/A"}
- Email: ${jobSeeker?.email || "N/A"}
- Mobile: ${jobSeeker?.mobileNumber || "N/A"}
- Highest qualification: ${jobSeeker?.highestQualification || "N/A"}
- Graduation year: ${jobSeeker?.passoutYear || "N/A"}
- Total experience (yrs): ${jobSeeker?.experienceInYears ?? "N/A"}
- Notice period (days): ${jobSeeker?.noticePeriod ?? "N/A"}
- Key skills: ${(jobSeeker?.skills || []).join(", ") || "N/A"}
- Resume reference: ${resumeUrl || "Not available"}
`.trim();

        const readinessBlock = readinessPairs.map((pair, index) => {
            return `Q${index + 1}: ${pair.question}\nAnswer: ${pair.answer || "No response"}`;
        }).join("\n\n");

        const technicalBlock = `
TECHNICAL OUTCOME:
- Score: ${technicalSummary.score}/100
- Result: ${technicalSummary.passed ? "PASSED" : "FAILED"}
- Correct answers: ${technicalSummary.correctAnswers} / ${technicalSummary.totalQuestions || technicalSummary.total || "N/A"}
- Weak areas: ${(technicalSummary.weakAreas || []).join(", ") || "None"}
`.trim();

        const integrityBlock = `
ASSESSMENT INTEGRITY SIGNALS:
- Copy attempts: ${integrity.copyEvents ?? 0}
- Paste attempts: ${integrity.pasteEvents ?? 0}
- Tab switches: ${integrity.tabBlurEvents ?? 0}
- Times resumed: ${integrity.resumeCount ?? 0}
- Focused time: ${this.formatDuration(integrity.totalFocusedMs)}
`.trim();

        const historicalBlock = historicalAttempts.length
            ? historicalAttempts.map(item => {
                const score = typeof item.score === "number" ? `${item.score}/100` : "N/A";
                const duration = this.formatDuration(item.integrity?.totalFocusedMs || 0);
                return `#${item.attemptNumber} — Status: ${item.status} — Score: ${score} — Focused time: ${duration} — Readiness summary: ${item.readinessSummary || "N/A"}`;
            }).join("\n")
            : "No prior attempts.";

        return `
${jobBlock}

${seekerBlock}

READINESS RESPONSES:
${readinessBlock}

${technicalBlock}

${integrityBlock}

HISTORICAL ATTEMPTS:
${historicalBlock}

TASK:
Evaluate the five readiness answers against the candidate's profile and job requirements. Identify how well the answers align with the resume/profile, note any inconsistencies (e.g., conflicting notice period), consider the integrity signals (copy attempts, tab/window changes, pauses) when determining risk of cheating, and factor in the historical attempts when surfacing concerns or improvements. Treat 0-day notice period and "immediate join" as equivalent, and flag inconsistencies only when they are truly contradictory. Provide actionable insights for a hiring manager.

Return STRICT JSON:
{
  "summary": "2-3 concise sentences describing overall readiness and tone.",
  "fitVerdict": "fit|caution|concern",
  "highlights": ["..."],
  "concerns": ["..."],
  "inconsistencies": [
    {
      "topic": "Notice Period",
      "description": "Answer says immediate but profile shows 30 days.",
      "severity": "warning"
    }
  ],
  "recommendations": ["Optional recruiter follow-ups or next steps"],
  "historicalInsights": ["Patterns or notable observations across earlier attempts (if any)"]
}
`.trim();
    }

    extractJson(payload) {
        try {
            return JSON.parse(payload);
        } catch (error) {
            const match = payload.match(/\{[\s\S]*\}/);
            if (!match) {
                throw new Error("Unable to parse readiness review response");
            }
            return JSON.parse(match[0]);
        }
    }

    formatDuration(ms = 0) {
        if (!ms || ms <= 0) {
            return "0s";
        }
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const parts = [];
        if (hours) parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        if (seconds || !parts.length) parts.push(`${seconds}s`);
        return parts.join(" ");
    }
}

module.exports = new ReadinessReviewer();

