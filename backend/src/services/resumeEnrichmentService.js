const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("@cyber2024/pdf-parse-fixed");
const mammoth = require("mammoth");
const fs = require("fs").promises;
const path = require("path");
const { jsonrepair } = require("jsonrepair");
const qualifications = require("../constants/qualifications");
const indianCities = require("../constants/indianCitiesBackend");

const RETRYABLE_PROVIDER = ["together", "gemini", "none"];

const getProvider = () => (process.env.RESUME_AI_PROVIDER || "none").toLowerCase();
const getModel = () => process.env.RESUME_AI_MODEL || "";
const getEmbedModel = () => process.env.RESUME_EMBED_MODEL || "";

function normalizeText(text) {
    if (!text) return "";
    return text.replace(/\u0000/g, "").trim();
}

async function extractTextFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    try {
        if (ext === ".pdf") {
            const dataBuffer = await fs.readFile(filePath);
            const data = await pdfParse(dataBuffer);
            return normalizeText(data.text);
        }
        if (ext === ".docx" || ext === ".doc") {
            const result = await mammoth.extractRawText({ path: filePath });
            return normalizeText(result.value);
        }
        if (ext === ".txt") {
            return normalizeText(await fs.readFile(filePath, "utf-8"));
        }
    } catch (error) {
        throw new Error(`Failed to read resume (${ext || "unknown"}): ${error.message}`);
    }
    throw new Error(`Unsupported file format: ${ext}`);
}

// Normalize mobile number: remove country code, keep only digits (e.g., 91-6309076646 -> 6309076646)
function normalizeMobileNumber(phone) {
    if (!phone) return null;
    const cleaned = String(phone).replace(/[^\d]/g, ""); // Remove all non-digits
    // If starts with country code (91 for India), remove it if number is 12+ digits
    if (cleaned.length >= 12 && cleaned.startsWith("91")) {
        return cleaned.substring(2);
    }
    // Return last 10 digits if longer, or full number if 10 or less
    return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
}

// Match location with predefined cities, return matched city or null
function matchLocation(location) {
    if (!location) return null;
    const loc = String(location).trim();
    if (!loc) return null;
    
    // Try exact match (case-insensitive)
    const exactMatch = indianCities.find(city => city.toLowerCase() === loc.toLowerCase());
    if (exactMatch) return exactMatch;
    
    // Try partial match (location contains city name or vice versa)
    const partialMatch = indianCities.find(city => 
        loc.toLowerCase().includes(city.toLowerCase()) || 
        city.toLowerCase().includes(loc.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    // Return original if no match (will be treated as custom)
    return loc;
}

// Match qualification with predefined list
function matchQualification(qual) {
    if (!qual) return null;
    const q = String(qual).trim();
    if (!q) return null;
    
    // Try exact match (case-insensitive)
    const exactMatch = qualifications.find(qualOption => qualOption.toLowerCase() === q.toLowerCase());
    if (exactMatch) return exactMatch;
    
    // Try partial match
    const partialMatch = qualifications.find(qualOption => 
        q.toLowerCase().includes(qualOption.toLowerCase()) || 
        qualOption.toLowerCase().includes(q.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    // Return null if no match (will be treated as custom)
    return null;
}

// Parse date string to Date object
function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;
        // Don't allow future dates
        if (date > new Date()) return null;
        return date;
    } catch {
        return null;
    }
}

function normalizeJsonResponse(raw) {
    if (!raw) {
        throw new Error("Empty AI response");
    }
    let parsed;
    try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (err) {
        try {
            parsed = JSON.parse(jsonrepair(raw));
        } catch (e) {
            throw new Error("Unable to parse AI response as JSON");
        }
    }

    const safeArray = (val) => (Array.isArray(val) ? val.filter(Boolean) : []);
    const numberOrNull = (val) => {
        const n = Number(val);
        return Number.isFinite(n) ? n : null;
    };

    const safeString = (val) => {
        if (!val) return null;
        const str = String(val).trim();
        return str && str.length > 0 ? str : null;
    };

    // Normalize gender: must be one of ["male", "female", "other"]
    const normalizeGender = (val) => {
        if (!val) return null;
        const g = String(val).toLowerCase().trim();
        if (["male", "female", "other"].includes(g)) return g;
        return null;
    };

    // Normalize languages
    const normalizeLanguages = (val) => {
        if (!val) return [];
        if (!Array.isArray(val)) return [];
        const proficiencyLevels = ["Basic", "Conversational", "Fluent", "Native"];
        return val
            .filter(lang => lang && (lang.language || lang.name))
            .map(lang => ({
                language: String(lang.language || lang.name || "").trim(),
                proficiency: proficiencyLevels.includes(lang.proficiency) ? lang.proficiency : "Basic",
                read: Boolean(lang.read),
                write: Boolean(lang.write),
                speak: Boolean(lang.speak)
            }))
            .filter(lang => lang.language.length > 0);
    };

    // Extract current location from current company location if not directly provided
    let currentLocation = matchLocation(parsed.current_location || parsed.currentLocation);
    if (!currentLocation && parsed.current_company_location) {
        currentLocation = matchLocation(parsed.current_company_location);
    }
    if (!currentLocation && parsed.currentCompanyLocation) {
        currentLocation = matchLocation(parsed.currentCompanyLocation);
    }

    return {
        skills: safeArray(parsed.skills || parsed.Skills), // Already in order from AI
        mobileNumber: normalizeMobileNumber(parsed.mobile_number || parsed.mobileNumber || parsed.phoneNumber || parsed.phone),
        gender: normalizeGender(parsed.gender || parsed.Gender),
        dateOfBirth: parseDate(parsed.date_of_birth || parsed.dateOfBirth || parsed.dob || parsed.DOB),
        address: safeString(parsed.address || parsed.Address || parsed.full_address || parsed.fullAddress),
        currentLocation: currentLocation,
        highestQualification: matchQualification(parsed.highest_qualification || parsed.highestQualification || parsed.qualification || parsed.Qualification),
        passoutYear: (() => {
            const year = numberOrNull(parsed.passout_year || parsed.passoutYear || parsed.graduation_year || parsed.graduationYear);
            if (year && year >= 1950 && year <= new Date().getFullYear() + 10) return year;
            return null;
        })(),
        languages: normalizeLanguages(parsed.languages || parsed.Languages),
        linkedinUrl: (() => {
            const url = safeString(parsed.linkedin_url || parsed.linkedinUrl || parsed.linkedin || parsed.LinkedIn);
            if (url && /linkedin\.com/i.test(url)) {
                return url.startsWith("http") ? url : `https://${url}`;
            }
            return null;
        })(),
        githubUrl: (() => {
            const url = safeString(parsed.github_url || parsed.githubUrl || parsed.github || parsed.GitHub);
            if (url && /github\.com/i.test(url)) {
                return url.startsWith("http") ? url : `https://${url}`;
            }
            return null;
        })(),
        experienceYears: numberOrNull(parsed.experience_years || parsed.experienceYears || parsed.yearsOfExperience),
        jobTitles: safeArray(parsed.job_titles || parsed.jobTitles),
        education: parsed.education || parsed.Education || null,
        certifications: safeArray(parsed.certifications || parsed.Certifications),
        projects: safeArray(parsed.projects || parsed.Projects),
        preferredLocation: parsed.preferred_location || parsed.preferredLocation || null,
        summary: parsed.summary || parsed.Summary || null,
        aboutMe: parsed.about_me || parsed.aboutMe || parsed.summary || null,
        atsInsights: safeArray(parsed.ats_insights || parsed.atsInsights || parsed.insights),
        missingSkills: safeArray(parsed.missing_skills || parsed.missingSkills),
        weaknesses: safeArray(parsed.weaknesses || parsed.issues),
        atsScore: numberOrNull(parsed.ats_score || parsed.atsScore),
        rawJson: parsed
    };
}

function buildPrompt(resumeText) {
    const qualificationsList = qualifications.join(", ");
    return `
You are an ATS and career coach. Extract structured data from this resume.
Return ONLY JSON with keys:
- skills: string[] (ordered by importance/relevance, most important first)
- mobile_number: string (extract phone/mobile number, remove country code, keep only digits like "6309076646", or null)
- gender: string (extract from name or resume context, must be one of: "male", "female", "other", or null)
- date_of_birth: string (ISO date format YYYY-MM-DD if found, or null)
- address: string (full address if found, or null)
- current_location: string (current city/location, try to match with common Indian cities, or null)
- current_company_location: string (location of current company if mentioned, use this if current_location not found)
- highest_qualification: string (must match one of: ${qualificationsList}, or null if not matching)
- passout_year: number (year of graduation/passout, between 1950 and current year + 10, or null)
- languages: array of objects with {language: string, proficiency: "Basic"|"Conversational"|"Fluent"|"Native", read: boolean, write: boolean, speak: boolean}
- linkedin_url: string (LinkedIn profile URL if found, or null)
- github_url: string (GitHub profile URL if found, or null)
- experience_years: number
- job_titles: string[]
- education: string
- certifications: string[]
- projects: string[]
- preferred_location: string
- summary: string
- about_me: string
- ats_insights: string[] (issues like missing skills, weak summary, formatting)
- missing_skills: string[]
- weaknesses: string[]
- ats_score: number (0-100, higher is better)

IMPORTANT:
- For mobile_number: Extract and normalize to digits only (e.g., "91-6309076646" or "+916309076646" -> "6309076646")
- For gender: Infer from name (e.g., "Priya" -> "female", "Rahul" -> "male") or use "other" if unclear
- For current_location: If not directly mentioned, infer from current company location (e.g., if working at "Hyderabad company" -> "Hyderabad")
- For highest_qualification: Must exactly match one of the predefined options or return null
- For languages: Extract all languages mentioned with their proficiency levels

Resume text:
${resumeText}
`.trim();
}

async function analyzeWithTogether({ text, model }) {
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) throw new Error("TOGETHER_API_KEY is missing");
    const togetherModel = model || process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";
    const client = new OpenAI({
        apiKey,
        baseURL: process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1"
    });

    const prompt = buildPrompt(text);
    const resp = await client.chat.completions.create({
        model: togetherModel,
        messages: [
            { role: "system", content: "You return compact JSON only, no prose." },
            { role: "user", content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1500
    });

    const content = resp.choices?.[0]?.message?.content?.trim();
    return normalizeJsonResponse(content);
}

async function analyzeWithGemini({ text, model }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");
    const geminiModel = model || "gemini-1.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelClient = genAI.getGenerativeModel({ model: geminiModel });
    const resp = await modelClient.generateContent(buildPrompt(text));
    const content = resp.response?.text();
    return normalizeJsonResponse(content);
}

async function generateEmbedding({ text, provider, embedModel }) {
    const cleaned = text?.slice(0, 12000) || "";
    if (!cleaned) return [];

    if (provider === "together") {
        const apiKey = process.env.TOGETHER_API_KEY;
        if (!apiKey) throw new Error("TOGETHER_API_KEY is missing for embedding");
        const model = embedModel || process.env.TOGETHER_EMBED_MODEL || "togethercomputer/m2-bert-80M-8k-retrieval";
        const client = new OpenAI({
            apiKey,
            baseURL: process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1"
        });
        const res = await client.embeddings.create({
            model,
            input: cleaned
        });
        return res.data?.[0]?.embedding || [];
    }

    if (provider === "gemini") {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is missing for embedding");
        const model = embedModel || "text-embedding-004";
        const genAI = new GoogleGenerativeAI(apiKey);
        const embed = genAI.getGenerativeModel({ model });
        const res = await embed.embedContent(cleaned);
        return res?.embedding?.values || [];
    }

    return [];
}

async function analyzeResumeFile(filePath, resumeUrl) {
    const provider = getProvider();
    if (!RETRYABLE_PROVIDER.includes(provider)) {
        throw new Error("Invalid RESUME_AI_PROVIDER value");
    }
    if (provider === "none") {
        return {
            enabled: false,
            result: null
        };
    }

    const text = await extractTextFromFile(filePath);
    if (!text || text.length < 50) {
        throw new Error("Resume text is too short to analyze");
    }

    const model = getModel();
    const embedModel = getEmbedModel();
    const analyzer =
        provider === "together"
            ? () => analyzeWithTogether({ text, model })
            : () => analyzeWithGemini({ text, model });

    const parsed = await analyzer();
    const embedding = await generateEmbedding({ text, provider, embedModel }).catch((err) => {
        console.error("Embedding generation failed:", err);
        return [];
    });

    return {
        enabled: true,
        provider,
        model: model || null,
        embedModel: embedModel || null,
        rawText: text,
        parsed: {
            ...parsed,
            fileUrl: resumeUrl || null,
            rawText: text,
            embedding
        }
    };
}

module.exports = {
    analyzeResumeFile,
    isEnabled: () => getProvider() !== "none",
    getConfig: () => ({
        provider: getProvider(),
        model: getModel() || null,
        embedModel: getEmbedModel() || null
    })
};

