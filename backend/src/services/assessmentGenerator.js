"use strict";

const OpenAI = require('openai');

const TECH_ROLE_KEYWORDS = [
    'engineer',
    'developer',
    'engineering',
    'software',
    'sdet',
    'devops',
    'architect',
    'qa',
    'data scientist',
    'ml',
    'ai',
    'backend',
    'frontend',
    'full stack',
    'android',
    'ios',
    'cloud',
    'platform',
    'security',
    'infra'
];

const BUSINESS_ROLE_KEYWORDS = [
    'product manager',
    'product owner',
    'project manager',
    'program manager',
    'marketing',
    'growth',
    'operations',
    'hr',
    'talent',
    'finance',
    'sales',
    'customer success',
    'partnerships',
    'business analyst'
];

class AssessmentGenerator {
    constructor() {
        console.log('AssessmentGenerator constructor: TOGETHER_MODEL from env:', process.env.TOGETHER_MODEL);
        this.model = process.env.TOGETHER_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
        console.log('AssessmentGenerator constructor: Using model:', this.model);
        this.client = null;
    }

    ensureClient() {
        if (this.client) {
            console.log('ensureClient: Client already exists, returning');
            return;
        }

        const apiKey = process.env.TOGETHER_API_KEY;
        console.log('ensureClient: TOGETHER_API_KEY value:', apiKey ? `"${apiKey.substring(0, 10)}..."` : 'undefined or empty');

        if (!apiKey || apiKey.trim() === '') {
            throw new Error(`TOGETHER_API_KEY is not configured or empty. Current value: "${apiKey}"`);
        }

        console.log('ensureClient: Creating OpenAI client with trimmed API key...');
        try {
            this.client = new OpenAI({
                apiKey: apiKey.trim(),
                baseURL: 'https://api.together.xyz/v1'
            });
            console.log('ensureClient: OpenAI client created successfully, type:', typeof this.client);
            console.log('ensureClient: Client has chat property:', !!this.client.chat);
        } catch (error) {
            console.log('ensureClient: ERROR creating OpenAI client:', error.message);
            throw error;
        }
    }

    async generateFullSet({ job, experienceBand, jobSeekerProfile = {}, attemptContext = {} }) {
        return this.generate({
            job,
            experienceBand,
            jobSeekerProfile,
            attemptContext,
            mode: 'full'
        });
    }

    async generateMcqsOnly({ job, experienceBand, jobSeekerProfile = {}, attemptContext = {} }) {
        return this.generate({
            job,
            experienceBand,
            jobSeekerProfile,
            attemptContext,
            mode: 'mcq-only'
        });
    }

    async generate({ job, experienceBand, jobSeekerProfile, attemptContext, mode = 'full' }) {
        console.log('generate: Called with mode:', mode);
        return this.generateWithTogether({ job, experienceBand, jobSeekerProfile, attemptContext, mode });
    }

    async generateWithTogether({ job, experienceBand, jobSeekerProfile, attemptContext, mode = 'full' }) {
        this.ensureClient();

        const prompt = this.buildPrompt({
            job,
            experienceBand,
            jobSeekerProfile,
            attemptContext,
            mode
        });

        const startedAt = Date.now();

        const completion = await this.client.chat.completions.create({
            model: this.model,
            temperature: 0.35,
            max_tokens: 6000,
            top_p: 0.9,
            messages: [
                {
                    role: 'system',
                    content: 'You are a meticulous technical interviewer who only responds with strict JSON that follows the requested schema.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });

        const latency = Date.now() - startedAt;
        const content = completion.choices?.[0]?.message?.content?.trim();

        if (!content) {
            throw new Error('AI did not return any content for assessment generation');
        }

        console.log('AI Response preview (first 200 chars):', content.substring(0, 200));
        console.log('AI Response length:', content.length);

        return this.processResponse(content, mode, latency);
    }


    processResponse(content, mode, latency) {
        const parsed = this.extractJson(content);

        const basicQuestions = Array.isArray(parsed.basicQuestions) ? parsed.basicQuestions : [];
        const mcqQuestions = Array.isArray(parsed.mcqQuestions) ? parsed.mcqQuestions : [];

        console.log('processResponse: Extracted', basicQuestions.length, 'basic questions and', mcqQuestions.length, 'MCQ questions');

        if (mode === 'full' && basicQuestions.length !== 5) {
            throw new Error('AI did not return exactly 5 basic questions');
        }

        if (mcqQuestions.length !== 10) {
            throw new Error('AI did not return exactly 10 MCQ questions');
        }

        return {
            basicQuestions,
            mcqQuestions,
            generationMeta: {
                provider: 'together',
                model: this.model,
                latencyMs: latency
            }
        };
    }

    buildPrompt({ job, experienceBand, jobSeekerProfile, attemptContext, mode }) {
        const {
            jobTitle,
            companyName,
            jobDescription,
            responsibilities,
            requirements,
            skills = [],
            experience,
            workMode,
            location,
            department
        } = job;

        const skillList = skills && skills.length ? skills.join(', ') : 'Not specified';
        const responsibilitiesText = responsibilities || 'Not specified';
        const requirementsText = requirements || 'Not specified';
        const descriptionText = jobDescription || 'Not specified';
        const experienceText = experience || 'Not specified';
        const workModeText = workMode || 'Not specified';
        const locationText = location || 'Not specified';
        const departmentText = department || 'Not specified';

        const seekerSummary = [
            jobSeekerProfile.experienceInYears ? `${jobSeekerProfile.experienceInYears} years overall experience` : null,
            typeof jobSeekerProfile.noticePeriod === 'number' ? `${jobSeekerProfile.noticePeriod} day notice period` : null,
            jobSeekerProfile.highestQualification ? `highest qualification ${jobSeekerProfile.highestQualification}` : null,
            jobSeekerProfile.skills?.length ? `personal skill highlights: ${jobSeekerProfile.skills.slice(0, 8).join(', ')}` : null
        ].filter(Boolean).join(' | ') || 'Profile details unavailable — infer based on job requirements.';

        const orientation = this.determineOrientation({
            jobTitle,
            department,
            requirements,
            responsibilities,
            skills
        });
        const orientationGuidance = this.buildOrientationGuidance(orientation, jobTitle);

        const previousMcqPrompts = Array.isArray(attemptContext?.previousMcqPrompts)
            ? attemptContext.previousMcqPrompts.slice(-30)
            : [];

        const attemptNotes = [
            attemptContext?.attemptNumber ? `Attempt number: ${attemptContext.attemptNumber}` : null,
            attemptContext?.mode === 'retake' ? 'Candidate previously failed; avoid reusing earlier MCQs and emphasise weak areas.' : null,
            attemptContext?.weakAreas?.length ? `Skill gaps to cover: ${attemptContext.weakAreas.join(', ')}.` : null
        ].filter(Boolean);

        const attemptSection = attemptNotes.length
            ? `ATTEMPT CONTEXT
- ${attemptNotes.join('\n- ')}
`
            : '';

        const basicSection = mode === 'full' ? `
PART A — Conversational Readiness Prompts (Exactly 5):
- Candidate types answers manually (NO multiple choice, NO coding tasks).
- Focus on logistics + motivation: notice period, compensation expectations, role alignment, certifications, relocation, availability, recent impact, stakeholder comfort, etc.
- Keep each prompt < 28 words, conversational, and not tied to a specific hard skill or tool.
- Each object must include: "prompt", "category" (availability|alignment|motivation|logistics etc.), "expectation" (what an ideal answer highlights), "contextHint" (optional nuance or follow-up hook).
` : `
PART A — Conversational Readiness Prompts:
- Already captured. Return an empty array for "basicQuestions".
`;

        const mcqSection = `
PART B — Role-Calibrated Technical MCQs (Exactly 10):
- Build questions straight from the job's responsibilities, requirements, domain and skill stack listed above.
- Calibrate depth for a ${experienceBand || 'mid'}-level candidate; if the job expects more experience than the candidate band, include scenario questions that reveal the gap (and vice versa).
- Blend question intents: troubleshooting, architecture/design, prioritisation, metrics/impact, tool selection, best practices, edge cases.
- At least 3 MCQs must explicitly reference details from the responsibilities or requirements text. At least 2 must reason about experience differences (less/more/moderate exposure).
- Each MCQ must contain the following keys: "prompt", "summary", "skillFocus", "difficulty" (introductory|moderate|advanced), "experienceAlignment" (junior|mid|senior), "options" (array of 4 distinct sentences), "correctOption" (index 0-3), "rationale".
- Options must be mutually exclusive, free of “all of the above”, and written as full phrases that show understanding of the scenario.
${orientationGuidance}
${previousMcqPrompts.length ? `
AVOID REPEATED THEMES:
The following topics already appeared in past attempts. Do NOT reuse the same scenario, wording, or intent:
- ${previousMcqPrompts.join('\n- ')}
` : ''}
`;

        const prompt = `
You are crafting a two-part "Take test to apply" assessment for the ${jobTitle} role at ${companyName}.

JOB SNAPSHOT
- Title: ${jobTitle}
- Company: ${companyName}
- Department: ${departmentText}
- Work Mode: ${workModeText}
- Location: ${locationText}
- Experience expectation: ${experienceText}
- Core skills: ${skillList}
- Responsibilities focus: ${responsibilitiesText}
- Requirements focus: ${requirementsText}
- Description summary: ${descriptionText}

CANDIDATE PROFILE SIGNALS
- ${seekerSummary}
- Target experience band: ${experienceBand || 'mid'}
${attemptSection}

TEST BLUEPRINT
${basicSection}
${mcqSection}

OUTPUT CONTRACT
- Respond with STRICT JSON only: { "basicQuestions": [...], "mcqQuestions": [...] }.
- basicQuestions length must be ${mode === 'full' ? 'exactly 5' : '0'}.
- mcqQuestions length must be exactly 10.
- Never wrap the JSON in markdown fences or add commentary.
`;

        return prompt.trim();
    }

    determineOrientation({ jobTitle = '', department = '', requirements = '', responsibilities = '', skills = [] }) {
        const haystack = `${jobTitle} ${department} ${requirements} ${responsibilities} ${skills.join(' ')}`.toLowerCase();

        let technicalHits = 0;
        let businessHits = 0;

        TECH_ROLE_KEYWORDS.forEach((keyword) => {
            if (haystack.includes(keyword)) {
                technicalHits += 1;
            }
        });

        BUSINESS_ROLE_KEYWORDS.forEach((keyword) => {
            if (haystack.includes(keyword)) {
                businessHits += 1;
            }
        });

        if (technicalHits >= 2 && technicalHits >= businessHits + 1) {
            return 'technical';
        }

        if (businessHits >= 2 && businessHits > technicalHits) {
            return 'business';
        }

        return 'hybrid';
    }

    buildOrientationGuidance(orientation, jobTitle = '') {
        switch (orientation) {
            case 'technical':
                return `
- This ${jobTitle || 'role'} involves deep engineering work: ensure ≥6 MCQs demand concrete technical reasoning (debugging snippets, architecture trade-offs, performance tuning) and ≥2 probe system design or code comprehension. Still include ≥2 conceptual questions covering collaboration or product impact.`;
            case 'business':
                return `
- This ${jobTitle || 'role'} is primarily business/product oriented: keep MCQs scenario-driven (prioritisation, stakeholder alignment, GTM strategy, metrics). Avoid code-heavy or low-level implementation questions unless explicitly tied to decisions.`;
            default:
                return `
- This ${jobTitle || 'role'} mixes strategy and execution: split MCQs roughly 50/50 between conceptual/product judgement and technical execution (configuration, tooling, data interpretation).`;
        }
    }

    extractJson(payload) {
        console.log('extractJson: Processing AI response, length:', payload.length);

        // First, try to clean up the response
        let cleanPayload = payload.trim();

        // Remove markdown code blocks if present
        cleanPayload = cleanPayload.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
        cleanPayload = cleanPayload.replace(/`/g, '').trim();

        console.log('extractJson: Cleaned payload length:', cleanPayload.length);

        // Try direct parsing first
        try {
            return JSON.parse(cleanPayload);
        } catch (err) {
            console.log('extractJson: Direct parse failed:', err.message);
        }

        // Try extracting JSON between curly braces
        const jsonMatch = cleanPayload.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (err) {
                console.log('extractJson: JSON extraction failed:', err.message);
            }
        }

        // Last resort: try to fix common JSON issues
        try {
            let fixedJson = cleanPayload;

            // Extract just the JSON part if wrapped in other text
            const startBrace = fixedJson.indexOf('{');
            const lastBrace = fixedJson.lastIndexOf('}');

            if (startBrace >= 0 && lastBrace > startBrace) {
                fixedJson = fixedJson.substring(startBrace, lastBrace + 1);
            }

            // Fix trailing commas
            fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');

            // Try to add missing commas between array elements
            fixedJson = fixedJson.replace(/([}\]])(\s*)(")/g, '$1,$2');

            console.log('extractJson: Attempting fixed JSON parse...');
            return JSON.parse(fixedJson);

        } catch (fixErr) {
            console.log('extractJson: All repair attempts failed:', fixErr.message);

            // If everything fails, try to extract partial data
            try {
                // Look for basic structure and try to complete it
                const partialMatch = cleanPayload.match(/"basicQuestions"\s*:\s*\[([\s\S]*?)\]/);
                const mcqMatch = cleanPayload.match(/"mcqQuestions"\s*:\s*\[([\s\S]*?)\]/);

                const basicQuestions = partialMatch ? this.parsePartialArray(partialMatch[1]) : [];
                const mcqQuestions = mcqMatch ? this.parsePartialArray(mcqMatch[1]) : [];

                console.log('extractJson: Returning partial data - basic:', basicQuestions.length, 'mcq:', mcqQuestions.length);

                return {
                    basicQuestions: basicQuestions.slice(0, 5),
                    mcqQuestions: mcqQuestions.slice(0, 10)
                };

            } catch (partialErr) {
                console.log('extractJson: Even partial parsing failed');
                throw new Error(`Unable to parse AI response: ${err.message}`);
            }
        }
    }

    parsePartialArray(arrayContent) {
        const items = [];
        const segments = arrayContent.split('},');

        for (const segment of segments) {
            try {
                const cleanSegment = segment.trim();
                if (cleanSegment.startsWith('{') && !cleanSegment.endsWith('}')) {
                    // Try to close incomplete objects
                    const fixedSegment = cleanSegment + '}';
                    const parsed = JSON.parse(fixedSegment);
                    items.push(parsed);
                } else if (cleanSegment.startsWith('{') && cleanSegment.endsWith('}')) {
                    const parsed = JSON.parse(cleanSegment);
                    items.push(parsed);
                }
            } catch (e) {
                // Skip malformed items
                console.log('parsePartialArray: Skipping malformed item');
            }
        }

        return items;
    }
}

module.exports = new AssessmentGenerator();

