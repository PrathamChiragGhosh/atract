"use strict";

const OpenAI = require("openai");
const { jsonrepair } = require("jsonrepair");

class VideoProctoringQuestionService {
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
            throw new Error("TOGETHER_API_KEY or OPENAI_API_KEY must be configured for proctoring generation");
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

    async generateQuestionSet({ job, questionCount = 15, jobSeekerProfile = {}, attemptNumber = 1 }) {
        this.ensureClient();

        const normalizedCount = Math.min(Math.max(questionCount, 8), 40);
        const prompt = this.buildPrompt({ job, jobSeekerProfile, questionCount: normalizedCount, attemptNumber });

        const MAX_TRIES = 3;
        let lastError = null;

        for (let tryIndex = 0; tryIndex < MAX_TRIES; tryIndex += 1) {
            try {
                const startedAt = Date.now();
                const completion = await this.client.chat.completions.create({
                    model: this.model,
                    temperature: 0.4,
                    max_tokens: 2200,
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert hiring manager designing high-signal live prompts. Respond with valid JSON only."
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
                    throw new Error("Proctoring generator did not return any content");
                }

                const parsed = this.extractJson(content);
                const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

                if (questions.length < normalizedCount) {
                    throw new Error(`Expected at least ${normalizedCount} prompts but received ${questions.length}`);
                }

                const normalizedQuestions = this.normalizeQuestions(questions.slice(0, normalizedCount), attemptNumber);

                return {
                    questions: normalizedQuestions,
                    generationMeta: {
                        provider: this.provider,
                        model: this.model,
                        latencyMs
                    }
                };
            } catch (error) {
                lastError = error;
                if (tryIndex < MAX_TRIES - 1) {
                    continue;
                }
                break;
            }
        }

        throw lastError || new Error("Unable to generate proctoring prompts.");
    }

    buildPrompt({ job = {}, jobSeekerProfile = {}, questionCount, attemptNumber }) {
        const {
            jobTitle,
            companyName,
            department,
            jobDescription,
            responsibilities,
            requirements,
            skills = [],
            experience,
            workMode,
            location
        } = job;

        const seekerSummary = [
            jobSeekerProfile.fullName ? `Candidate: ${jobSeekerProfile.fullName}` : null,
            typeof jobSeekerProfile.experienceInYears === "number" ? `Experience: ${jobSeekerProfile.experienceInYears} yrs` : null,
            jobSeekerProfile.highestQualification ? `Qualification: ${jobSeekerProfile.highestQualification}` : null,
            jobSeekerProfile.skills?.length ? `Skills: ${jobSeekerProfile.skills.join(", ")}` : null
        ].filter(Boolean).join(" · ") || "Candidate profile data is limited. Focus on role expectations.";

        return `
Design ${questionCount} fully structured MCQs for the video-proctored stage (${companyName || "the company"} — ${jobTitle || "role"}).

ROLE SNAPSHOT
- Title: ${jobTitle || "N/A"}
- Department: ${department || "N/A"}
- Location: ${location || "N/A"} (${workMode || "hybrid"})
- Experience band: ${experience || "Not specified"}
- Skills & tools: ${(skills || []).join(", ") || "Not specified"}
- Description: ${jobDescription || "Not provided"}
- Responsibilities focus: ${responsibilities || "Not provided"}
- Requirements focus: ${requirements || "Not provided"}

CANDIDATE SIGNALS
${seekerSummary}

MCQ BLUEPRINT
- Every question is multiple-choice with exactly 4 mutually exclusive options.
- Blend scenario decision-making, debugging/root-cause, architecture trade-offs, stakeholder/ethics, and metrics/insight questions.
- Prompts <= 55 words; each option must be a descriptive statement (no “all of the above”).
- Set difficulty to introductory/moderate/advanced according to the role expectations.
- recommendedDurationSec defaults to 75 unless the scenario clearly needs longer.
- Each question is worth 10 points; include a concise summary plus a rationale for the correct option.
- Avoid repeating earlier attempt themes. Attempt #${attemptNumber}.

JSON RESPONSE CONTRACT (STRICT — NO PROSE, NO MARKDOWN)
{
  "questions": [
    {
      "prompt": "Clear MCQ stem",
      "summary": "One sentence describing intent",
      "intent": "troubleshooting|architecture|ethics|measurement|leadership|product",
      "focusArea": "Skill/category anchor",
      "difficulty": "introductory|moderate|advanced",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOption": 0,
      "rationale": "Why this option is correct.",
      "recommendedDurationSec": 75,
      "weight": 1
    }
  ]
}

Return STRICT JSON only.`.trim();
    }

    normalizeQuestions(rawQuestions = [], attemptNumber = 1) {
        return rawQuestions.map((question, index) => {
            const prompt = this.cleanText(question?.prompt) || `Prompt ${index + 1}`;
            const summary = this.cleanText(question?.summary) || null;
            const intent = this.cleanText(question?.intent) || null;
            const focusArea = this.cleanText(question?.focusArea) || null;
            const difficulty = ['introductory', 'moderate', 'advanced'].includes((question?.difficulty || '').toLowerCase())
                ? question.difficulty.toLowerCase()
                : 'moderate';
            const options = Array.isArray(question?.options)
                ? question.options.map((opt) => this.cleanText(opt) || '').filter(Boolean).slice(0, 4)
                : [];
            while (options.length < 4) {
                options.push(`Option ${options.length + 1}`);
            }
            const correctOption = Number.isInteger(question?.correctOption) ? Math.min(Math.max(question.correctOption, 0), 3) : 0;
            const rationale = this.cleanText(question?.rationale) || null;
            const recommendedDurationSec = Number(question?.recommendedDurationSec) || 75;
            const weight = Number(question?.weight) || 1;

            return {
                questionId: `vpq_${attemptNumber}_${index + 1}`,
                prompt,
                summary,
                intent,
                focusArea,
                difficulty,
                options,
                correctOption,
                rationale,
                recommendedDurationSec,
                weight,
                selectedOption: null,
                isMarked: false,
                answeredAt: null,
                scoreAwarded: 0
            };
        });
    }

    extractJson(payload) {
        const attemptParse = (input) => {
            if (!input) {
                return null;
            }
            const trimmed = input.trim();
            if (!trimmed) {
                return null;
            }
            try {
                return JSON.parse(trimmed);
            } catch (innerError) {
                try {
                    return JSON.parse(jsonrepair(trimmed));
                } catch {
                    return null;
                }
            }
        };

        const fencedMatch = payload.match(/```(?:json)?([\s\S]*?)```/i);
        if (fencedMatch) {
            const repaired = attemptParse(fencedMatch[1]);
            if (repaired) {
                return repaired;
            }
        }

        const match = payload.match(/\{[\s\S]*\}/);
        if (match) {
            const repaired = attemptParse(match[0]);
            if (repaired) {
                return repaired;
            }
        }

        const direct = attemptParse(payload);
        if (direct) {
            return direct;
        }

        const multiJson = payload.match(/\{[\s\S]*?\}/g);
        if (multiJson?.length) {
            for (const chunk of multiJson) {
                const repaired = attemptParse(chunk);
                if (repaired?.questions) {
                    return repaired;
                }
            }
        }

        if (payload.includes("questions")) {
            const rough = payload.replace(/^[\s\S]*?"questions"\s*:\s*/i, "").trim();
            if (rough.startsWith("[")) {
                const closingIndex = rough.lastIndexOf("]");
                if (closingIndex !== -1) {
                    const slice = rough.slice(0, closingIndex + 1);
                    const listAttempt = attemptParse(`{"questions":${slice}}`);
                    if (listAttempt?.questions) {
                        return listAttempt;
                    }
                }
            }
        }

        console.error("Proctoring JSON parse failure. Payload preview:", payload.slice(0, 500));

        throw new Error("Unable to parse JSON from proctoring generator response");
    }

    cleanText(value) {
        if (value === null || value === undefined) {
            return null;
        }
        return value.toString().replace(/\s+/g, " ").trim();
    }
}

module.exports = new VideoProctoringQuestionService();


