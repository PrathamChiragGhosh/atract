"use strict";

const OpenAI = require("openai");

class VideoProctoringReporter {
    constructor() {
        this.client = null;
        this.model = process.env.TOGETHER_MODEL || "openai/gpt-oss-20b";
        this.provider = "together-ai";
    }

    ensureClient() {
        if (this.client) {
            return;
        }

        const apiKey = process.env.TOGETHER_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("TOGETHER_API_KEY or OPENAI_API_KEY must be configured for proctoring insights");
        }

        const useTogether = Boolean(process.env.TOGETHER_API_KEY);
        this.client = new OpenAI({
            apiKey,
            baseURL: useTogether ? "https://api.together.xyz/v1" : undefined
        });
        if (!useTogether && process.env.OPENAI_MODEL) {
            this.model = process.env.OPENAI_MODEL;
            this.provider = "openai";
        }
    }

    async generate({ job, jobSeeker, attempt, eventsSummary, violationSummary }) {
        this.ensureClient();

        const prompt = this.buildPrompt({ job, jobSeeker, attempt, eventsSummary, violationSummary });

        const startedAt = Date.now();
        const completion = await this.client.chat.completions.create({
            model: this.model,
            temperature: 0.25,
            max_tokens: 1400,
            messages: [
                {
                    role: "system",
                    content: "You are a senior compliance reviewer. Respond with JSON only."
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
            throw new Error("No AI summary generated for proctoring attempt");
        }

        const parsed = this.extractJson(content);
        return {
            summary: parsed.summary,
            verdict: parsed.verdict,
            riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : 50,
            highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
            concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            violationsSummary: Array.isArray(parsed.violationsSummary) ? parsed.violationsSummary : [],
            generatedAt: new Date(),
            generationMeta: {
                provider: this.provider,
                model: this.model,
                latencyMs
            }
        };
    }

    buildPrompt({ job, jobSeeker, attempt, eventsSummary, violationSummary }) {
        const jobBlock = `
ROLE
- Title: ${job?.jobTitle || "N/A"}
- Company: ${job?.companyName || "N/A"}
- Department: ${job?.department || "N/A"}
- Location: ${job?.location || "N/A"}
- Work mode: ${job?.workMode || "N/A"}
- Skills: ${(job?.skills || []).join(", ") || "N/A"}
`.trim();

        const candidateBlock = `
CANDIDATE
- Name: ${jobSeeker?.fullName || "N/A"}
- Email: ${jobSeeker?.email || "N/A"}
- Experience: ${jobSeeker?.experienceInYears ?? "N/A"} years
- Highest qualification: ${jobSeeker?.highestQualification || "N/A"}
- Key skills: ${(jobSeeker?.skills || []).join(", ") || "N/A"}
`.trim();

        const precheck = attempt?.precheck || {};
        const precheckSummary = JSON.stringify(precheck?.results || {}, null, 2);
        const permissions = attempt?.permissions || {};

        const sessionStats = `
SESSION
- Question count: ${attempt?.configuration?.questionCount || 15}
- Countdown (sec): ${attempt?.configuration?.countdownSeconds || 0}
- Started: ${attempt?.session?.startedAt || "N/A"}
- Ended: ${attempt?.session?.endedAt || "N/A"}
- Fullscreen breaches: ${attempt?.session?.fullscreenBreaches || 0}
- Tab switches: ${attempt?.session?.tabSwitches || 0}
- Copy events: ${attempt?.session?.copyEvents || 0}
- Paste events: ${attempt?.session?.pasteEvents || 0}
- Suspicious movement alerts: ${attempt?.session?.suspiciousMovementAlerts || 0}
- Background noise alerts: ${attempt?.session?.backgroundNoiseAlerts || 0}
- Random snapshots: ${attempt?.session?.randomSnapshotCount || 0}
- Random audio samples: ${attempt?.session?.randomAudioCount || 0}
`.trim();

        const eventsBlock = JSON.stringify(eventsSummary || [], null, 2);
        const violationsBlock = JSON.stringify(violationSummary || [], null, 2);

        return `
${jobBlock}

${candidateBlock}

PRECHECK SUMMARY
${precheckSummary}

PERMISSIONS
${JSON.stringify(permissions || {}, null, 2)}

${sessionStats}

EVENTS (monitored signals)
${eventsBlock}

VIOLATIONS (security incidents)
${violationsBlock}

TASK
1. Interpret pre-check data: were any requirements marginal? call out gaps.
2. Evaluate session telemetry for intent to cheat (tab switches, devtools, face changes, mic mute, etc.).
3. Consider environment signals (lighting, background noise) and permission drops (camera/mic/screen).
4. Weigh severity of violations (copy/paste, screen exit, multiple faces) and note mitigating context.
5. Recommend whether to accept, review manually, or reject.

Respond with JSON:
{
  "summary": "Concise narrative (3 sentences max).",
  "verdict": "pass | review | fail",
  "riskScore": 0-100 (higher = riskier),
  "highlights": ["Positive observations"],
  "concerns": ["Specific red flags"],
  "violationsSummary": ["Readable summary of most serious incidents"],
  "recommendations": ["Practical next steps for employer"]
}
`.trim();
    }

    extractJson(payload) {
        try {
            return JSON.parse(payload);
        } catch (error) {
            const match = payload.match(/\{[\s\S]*\}/);
            if (!match) {
                throw new Error("Unable to parse JSON from proctoring summary");
            }
            return JSON.parse(match[0]);
        }
    }
}

module.exports = new VideoProctoringReporter();


