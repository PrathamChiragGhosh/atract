const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

class JobAnalysisService {
    constructor() {
        this.client = null;
        this.provider = null;
        this.model = null;
        this.embedModel = null;
    }

    ensureClient() {
        if (this.client) return;
        this.provider = (process.env.JOB_ANALYSIS_PROVIDER || process.env.RESUME_AI_PROVIDER || "together").toLowerCase();
        this.model = process.env.JOB_ANALYSIS_MODEL || process.env.RESUME_AI_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
        this.embedModel = process.env.JOB_ANALYSIS_EMBED_MODEL || process.env.RESUME_EMBED_MODEL || "togethercomputer/m2-bert-80M-8k-retrieval";

        if (this.provider === "together") {
            const apiKey = process.env.TOGETHER_API_KEY;
            if (!apiKey) throw new Error("TOGETHER_API_KEY is required for job analysis");
            this.client = new OpenAI({
                apiKey,
                baseURL: "https://api.together.xyz/v1"
            });
        } else if (this.provider === "gemini") {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("GEMINI_API_KEY is required for job analysis");
            this.client = new GoogleGenerativeAI(apiKey);
        } else {
            throw new Error(`Unsupported job analysis provider: ${this.provider}`);
        }
    }

    async analyzeJob(jobText) {
        this.ensureClient();
        const prompt = `You are an ATS job parser. Given the job text, extract structured details.
Return STRICT JSON:
{
  "summary": "...",
  "keySkills": ["skill1","skill2"],
  "role": "e.g. Frontend Engineer",
  "seniority": "e.g. Junior/Mid/Senior/Lead",
  "minExperience": number or null,
  "maxExperience": number or null,
  "locations": ["city or remote"],
  "salaryRange": "string or null",
  "responsibilities": ["..."],
  "requirements": ["..."]
}
Use employer-entered details as primary source.`;

        let raw = "{}";
        if (this.provider === "together") {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: "system", content: "You are a precise ATS job parser." },
                    { role: "user", content: prompt + "\n\nJob:\n" + jobText }
                ],
                temperature: 0.2
            });
            raw = response.choices?.[0]?.message?.content || "{}";
        } else if (this.provider === "gemini") {
            const model = this.client.getGenerativeModel({ model: this.model });
            const response = await model.generateContent([
                { text: "You are a precise ATS job parser." },
                { text: prompt + "\n\nJob:\n" + jobText }
            ]);
            raw = response.response?.text() || "{}";
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            parsed = {};
        }

        return {
            summary: parsed.summary || null,
            keySkills: Array.isArray(parsed.keySkills) ? parsed.keySkills : [],
            role: parsed.role || null,
            seniority: parsed.seniority || null,
            minExperience: parsed.minExperience ?? null,
            maxExperience: parsed.maxExperience ?? null,
            locations: Array.isArray(parsed.locations) ? parsed.locations : [],
            salaryRange: parsed.salaryRange || null,
            responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
            requirements: Array.isArray(parsed.requirements) ? parsed.requirements : []
        };
    }

    async embedText(text) {
        this.ensureClient();
        if (!text || !text.trim()) return [];
        if (this.provider === "together") {
            const result = await this.client.embeddings.create({
                model: this.embedModel,
                input: text.slice(0, 6000)
            });
            return result.data?.[0]?.embedding || [];
        } else if (this.provider === "gemini") {
            const model = this.client.getGenerativeModel({ model: this.embedModel });
            const result = await model.embedContent(text.slice(0, 6000));
            return result?.embedding?.values || [];
        }
        return [];
    }

    async processJob(jobDoc) {
        const parts = [
            jobDoc.jobTitle,
            jobDoc.companyName,
            jobDoc.jobDescription,
            jobDoc.responsibilities,
            jobDoc.requirements,
            (jobDoc.skills || []).join(", "),
            jobDoc.location,
            jobDoc.workMode
        ].filter(Boolean);
        const jobText = parts.join("\n\n");
        if (!jobText || jobText.length < 20) {
            throw new Error("Job text too short");
        }

        const analysis = await this.analyzeJob(jobText);
        const embedding = await this.embedText(jobText);

        return { jobText, analysis, embedding };
    }
}

module.exports = new JobAnalysisService();

