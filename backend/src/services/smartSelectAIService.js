/**
 * Smart Select AI Service
 * Uses Together AI for resume analysis
 */

require('dotenv').config();
const OpenAI = require('openai');

// Initialize Together AI client
const togetherClient = new OpenAI({
    apiKey: process.env.TOGETHER_API_KEY,
    baseURL: 'https://api.together.xyz/v1'
});

const MODEL = process.env.TOGETHER_MODEL || 'openai/gpt-oss-20b';

/**
 * Safe JSON parsing with fallback
 */
function safeJSONParse(text) {
    try {
        // Try direct parse first
        return JSON.parse(text);
    } catch (e) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1]);
        }
        // Try to find JSON object in text
        const braceMatch = text.match(/\{[\s\S]*\}/);
        if (braceMatch) {
            return JSON.parse(braceMatch[0]);
        }
    }
    throw new Error('Together AI returned invalid JSON format.');
}

/**
 * Comprehensive resume analysis for employers (multi-resume analysis)
 */
async function analyzeResumeComprehensive(resumeText, jobDescription = "", fileName = "", companyType = "", salaryContext = null) {
    try {
        const includeCompanyContext = Boolean(companyType);
        const includeSalaryContext = Boolean(
            salaryContext &&
            (salaryContext.useJobDescription ||
                salaryContext.role ||
                salaryContext.location ||
                typeof salaryContext.experienceYears === "number")
        );
        const salaryUsesJobDescription = includeSalaryContext && salaryContext?.useJobDescription;
        const salaryCurrency = salaryContext?.currency || "INR";
        const salaryUnit = salaryContext?.unit || "LPA";

        const baseFieldBlocks = [
            [`"atsScore": <number between 0-100>`],
            [`"scoreLevel": "<excellent|good|average|poor>"`],
            [`"candidateName": "<extracted name or 'Not Found'>"`],
            [`"email": "<extracted email or 'Not Found'>"`],
            [`"phone": "<extracted phone or 'Not Found'>"`],
            [`"experienceYears": <estimated years of experience as number>`],
            [`"currentRole": "<current/most recent job title or 'Not Found'>"`],
            [`"location": "<location if found or 'Not Found'>"`],
            [
                `"pros": [`,
                `    "<strength 1>"`,
                `    "<strength 2>"`,
                `    "<strength 3>"`,
                `    "<strength 4>"`,
                `    "<strength 5>"`,
                `  ]`
            ],
            [
                `"cons": [`,
                `    "<weakness 1>"`,
                `    "<weakness 2>"`,
                `    "<weakness 3>"`,
                `  ]`
            ],
            [`"matchedKeywords": ["<keyword1>", "<keyword2>", "..."]`],
            [`"missingKeywords": ["<keyword1>", "<keyword2>", "..."]`],
            [
                `"issues": [`,
                `    {"type": "<critical|warning|info>", "text": "<description>"}`,
                `  ]`
            ],
            [`"skills": ["<skill1>", "<skill2>", "..."]`],
            [`"education": "<highest education level or 'Not Found'>"`],
            [`"summary": "<brief 2-3 sentence summary of the candidate's profile>"`],
            [`"fitScore": <number 0-100 representing how well they fit the JD, if JD provided, else 0>`],
            [`"recommendation": "<strong_recommend|recommend|consider|not_recommend>"`]
        ];

        if (includeCompanyContext) {
            baseFieldBlocks.push(
                [`"companyTypeEvaluated": "${companyType}"`],
                [`"companyContextFitScore": <number 0-100 measuring alignment between the candidate's prior company environments and the provided company type>`],
                [`"companyTrajectoryMatch": "<one paragraph highlighting how the candidate's past companies compare with the target company type, including references to growth stages or culture cues>"`],
                [`"companyTypeAlignment": "<aligned|partial|mismatch|insufficient_data>"`],
                [
                    `"companyHistory": [`,
                    `    {`,
                    `      "company": "<company name or 'Unknown'>"`,
                    `      "stageOrSize": "<funding stage / headcount / enterprise indicator>"`,
                    `      "tenure": "<dates or duration>"`,
                    `      "notableContext": "<short note about growth phase, industry, or pace>"`,
                    `    }`,
                    `  ]`
                ]
            );
        }

        if (includeSalaryContext) {
            baseFieldBlocks.push([
                `"salaryEstimate": {`,
                `    "estimatedRange": {"min": <number>, "max": <number>, "currency": "${salaryCurrency}", "unit": "${salaryUnit}"}`,
                `    "marketMedian": <number>`,
                `    "confidence": "<high|medium|low>"`,
                `    "notes": "<short insight about compensation alignment>"`,
                `  }`
            ]);
        }

        const jsonFields = baseFieldBlocks
            .map((block, blockIndex) =>
                block.map((line, lineIndex) => {
                    const isLastBlock = blockIndex === baseFieldBlocks.length - 1;
                    const isLastLine = lineIndex === block.length - 1;
                    const needsComma = !(isLastBlock && isLastLine);
                    return `  ${line}${needsComma ? "," : ""}`;
                })
            )
            .flat();

        const guidelineItems = [
            "ATS Score: Based on formatting, keyword usage, structure, and completeness (0-100)",
            "Score Level: excellent (90-100), good (80-89), average (70-79), poor (<70)",
            "Extract candidate info accurately from resume",
            "Pros: List 5 key strengths (skills, experience, achievements, etc.)",
            "Cons: List 3 main weaknesses or areas for improvement",
            "Keywords: Extract relevant skills and keywords from resume",
            "Issues: Identify critical problems, warnings, or informational items",
            "Fit Score: If JD provided, rate how well the candidate matches (0-100)",
            "Recommendation: strong_recommend (90+ fit), recommend (75-89), consider (60-74), not_recommend (<60)",
            "Experience Years: Calculate from work history dates",
            "Education: Extract highest degree/qualification"
        ];

        if (includeCompanyContext) {
            guidelineItems.push(
                "Company Trajectory Match: Infer company stages/sizes using cues such as funding rounds, headcount, Fortune rankings, or descriptors like \"hypergrowth startup\" or \"global enterprise\". Reference public data sources (Crunchbase, LinkedIn, Glassdoor) when you can.",
                "Company Type Alignment: Use companyContextFitScore to classify alignment (aligned ≥85, partial 60-84, mismatch <60, insufficient_data when signals are missing)."
            );
        }

        if (includeSalaryContext) {
            guidelineItems.push(
                `Salary Estimate: Predict a realistic annual compensation range in ${salaryCurrency} ${salaryUnit}.`,
                "Use market benchmarks, role seniority, and location data to derive the estimate and median.",
                `Keep values numeric (no currency symbols) so that min/max/median represent amounts in ${salaryUnit}.`,
                salaryUsesJobDescription
                    ? "If role, location, or experience are missing, infer them from the job description and resume content."
                    : "Use the provided role, location, and experience as the primary inputs for benchmarking."
            );
        }

        const guidelinesText = guidelineItems
            .map((item, idx) => `${idx + 1}. ${item}`)
            .join("\n");

        const companyContextInstruction = includeCompanyContext
            ? `\nInclude company context insights relative to a "${companyType}" organization only when reliable signals exist in the resume.`
            : "";

        const salaryContextInstruction = includeSalaryContext
            ? `\nProvide salary estimates in ${salaryCurrency} ${salaryUnit} with numeric values only (no currency symbols), and explain assumptions briefly in the notes.${salaryUsesJobDescription ? " Infer role, location, or experience from the job description/resume when they are not explicitly provided." : ""}`
            : "";

        const salaryContextText = includeSalaryContext
            ? `\n--- SALARY CONTEXT ---
Role: ${salaryUsesJobDescription ? "Infer from JD/Resume" : (salaryContext.role || "Not specified")}
Location: ${salaryUsesJobDescription ? "Infer from JD/Resume" : (salaryContext.location || "Not specified")}
Experience: ${
                salaryUsesJobDescription
                    ? "Infer from JD/Resume"
                    : typeof salaryContext.experienceYears === "number"
                        ? `${salaryContext.experienceYears} years`
                        : "Not specified"
            }
Benchmark Unit: ${salaryUnit} (${salaryCurrency})\n`
            : "";

        const prompt = `
You are an expert resume analyzer and recruiter assistant. Analyze the following resume ${jobDescription ? "against the provided job description" : "for general quality and ATS optimization"}.

${jobDescription ? `--- JOB DESCRIPTION ---\n${jobDescription}\n` : ""}
${salaryContextText}

--- RESUME ---
${resumeText}

Provide a comprehensive analysis in JSON format (no markdown, no commentary):
{
${jsonFields.join("\n")}
}

Analysis Guidelines:
${guidelinesText}

Be thorough, objective, and provide actionable insights for hiring decisions.${companyContextInstruction}${salaryContextInstruction}
`;

        const completion = await togetherClient.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert resume analyzer and recruiter assistant. Always respond with valid JSON only, no additional text or markdown.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 4000
        });

        const text = completion.choices[0]?.message?.content;
        if (!text) {
            throw new Error('No response from Together AI');
        }

        const analysis = safeJSONParse(text);

        // Validate and normalize
        if (!analysis.atsScore || typeof analysis.atsScore !== 'number') {
            analysis.atsScore = 75;
        }
        if (!analysis.experienceYears || typeof analysis.experienceYears !== 'number') {
            analysis.experienceYears = 0;
        }
        if (!analysis.fitScore) {
            analysis.fitScore = jobDescription ? 70 : 0;
        }
        if (!analysis.recommendation) {
            const score = analysis.fitScore || analysis.atsScore;
            if (score >= 90) analysis.recommendation = 'strong_recommend';
            else if (score >= 75) analysis.recommendation = 'recommend';
            else if (score >= 60) analysis.recommendation = 'consider';
            else analysis.recommendation = 'not_recommend';
        }

        if (includeCompanyContext) {
            if (!analysis.companyContextFitScore || typeof analysis.companyContextFitScore !== 'number') {
                analysis.companyContextFitScore = 70;
            }
            if (!analysis.companyTypeAlignment) {
                const fitScore = analysis.companyContextFitScore;
                if (fitScore >= 85) analysis.companyTypeAlignment = 'aligned';
                else if (fitScore >= 60) analysis.companyTypeAlignment = 'partial';
                else if (fitScore > 0) analysis.companyTypeAlignment = 'mismatch';
                else analysis.companyTypeAlignment = 'insufficient_data';
            }
        }

        return analysis;
    } catch (error) {
        console.error("Together AI Analysis Error:", error);
        throw new Error("Failed to analyze resume with AI: " + error.message);
    }
}

module.exports = {
    analyzeResumeComprehensive
};

