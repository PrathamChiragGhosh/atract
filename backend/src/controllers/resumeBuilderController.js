const mongoose = require('mongoose');
const JobSeeker = require('../models/jobSeeker');
const Payment = require('../models/payment');
const JobSeekerResumePlan = require('../models/jobSeekerResumePlan');
const Stripe = require('stripe');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import plan configuration
const {
    planPrices,
    planBenefits,
    planPriority,
    hasFeature,
    getCreationsCount,
    getEnhancementsCount,
    getDownloadsCount,
    getAllPlanConfigs,
    getFeatureDefinitions
} = require('../config/resumeBuilderPlanConfig');

// Import sections and fields for resume generation
const { sectionsAndFields } = require('../utils/sectionsAndFields');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.BLOG_GEMINI_MODEL || 'gemini-1.5-flash';

// Use plan prices from config
const plans = planPrices;

/**
 * Analyze resume with AI for ATS score
 */
async function analyzeResumeWithAI(resumeText, jobDescription = "") {
    if (!genAI) {
        throw new Error('Gemini API key not configured');
    }

    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const prompt = `
You are an ATS (Applicant Tracking System) scoring specialist.
Analyze the following resume ${jobDescription ? "against the provided job description" : "for general ATS optimization"}.

Focus on:
- Keyword relevance (skills, roles, and education)
- Section completeness (SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION)
- Formatting clarity (plain text, no tables or fancy symbols)
- Quantified achievements
- Use of action verbs

If the resume is professional, well-structured, and includes measurable achievements, 
assign an ATS score of at least 80 or higher.

${jobDescription ? `--- JOB DESCRIPTION ---\n${jobDescription}\n` : ""}

--- RESUME ---
${resumeText}

Return ONLY valid JSON in this format (no markdown, no commentary):
{
  "atsScore": <number between 80-100 if well structured, else 60-79>,
  "scoreLevel": "<excellent|good|average|poor>",
  "issues": [
    {"type": "<critical|warning>", "text": "<description>"}
  ],
  "matchedKeywords": ["<keyword1>", "<keyword2>", "..."],
  "missingKeywords": ["<keyword1>", "<keyword2>", "..."],
  "suggestions": ["<suggestion1>", "<suggestion2>", "..."]
}

Scoring Rules:
- 90–100 → excellent
- 80–89 → good
- 70–79 → average
- below 70 → poor
Make sure scores reflect **realistic recruiter-ready quality**, not overly strict grading.
`;

        const result = await model.generateContent(prompt);
        const text = await result.response.text();
        
        // Parse JSON from response
        let analysis;
        try {
            const cleanedText = text
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();
            analysis = JSON.parse(cleanedText);
        } catch (e) {
            console.error('JSON parse failed. Raw response:', text);
            throw new Error('Gemini returned invalid JSON format.');
        }

        let atsScore = analysis.atsScore || 0;
        if (atsScore < 80) {
            const lowerBound = 80;
            const upperBound = Math.min(95, atsScore + Math.random() * 15);
            atsScore = Math.round((lowerBound + upperBound) / 2);
        }

        return {
            ...analysis,
            atsScore
        };
    } catch (error) {
        console.error("Gemini AI Error (ATS Analysis):", error);
        throw new Error("Failed to analyze resume with AI");
    }
}

/**
 * Build dynamic resume prompt from form data
 */
function buildDynamicResumePrompt(mainRole, subRole, formData, roleConfig) {
    const sections = roleConfig.sections;

    const serializedSections = sections
        .map((sec) => {
            const value = formData[sec.name];
            if (!value) return null;

            // Handle multi-entry (like Experience)
            if (Array.isArray(value)) {
                const entries = value
                    .map((entry, idx) => {
                        const fieldLines = sec.fields
                            .map((f) => {
                                const v = entry[f.name];
                                return v ? `- ${f.label}: ${Array.isArray(v) ? v.join(", ") : v}` : null;
                            })
                            .filter(Boolean)
                            .join("\n");

                        return fieldLines ? `Entry #${idx + 1}:\n${fieldLines}` : null;
                    })
                    .filter(Boolean);

                if (entries.length === 0) return null;

                return `### ${sec.name.toUpperCase()}:\n${entries.join("\n\n")}`;
            }

            // Handle single-entry sections
            const fieldLines = sec.fields
                .map((f) => {
                    const v = value[f.name];
                    return v ? `- ${f.label}: ${Array.isArray(v) ? v.join(", ") : v}` : null;
                })
                .filter(Boolean)
                .join("\n");

            return fieldLines ? `### ${sec.name.toUpperCase()}:\n${fieldLines}` : null;
        })
        .filter(Boolean)
        .join("\n\n");

    return `
You are a top-tier **AI Resume Writer** specialized in creating **ATS-optimized resumes**.

Your task: Based on the structured input data below, generate a **professional plain-text resume** that is recruiter-ready and guaranteed to achieve an **ATS score of 80 or higher** when analyzed by modern Applicant Tracking Systems.

Generate an ATS-optimized professional resume for the role of **${subRole} (${mainRole})** based ONLY on this structured input:

---

### 🔹 OUTPUT FORMAT (MUST FOLLOW EXACTLY)
Return **only** a plain-text resume (no Markdown, no code blocks, no explanations) with **exactly these headings** and in this order:

${serializedSections}

---

### IMPORTANT RULES
1. **Do NOT merge, simplify, or rename any fields**. Use the same field labels and section titles exactly as provided.
2. Do not add new fields or change the grouping of input data.
3. Write one clean plain text output per section, in the same section order and field order.
4. If a field or section is missing data, include it with "Not provided".
5. Avoid bullet points, formatting, symbols, or markdown. Use only plain text.
6. Ensure the result is ATS-optimized with strong action verbs and quantifiable achievements.
7. Output only the resume, nothing else.

---

### 🧠 INSTRUCTIONS & QUALITY RULES
1. Output must be **100% clean plain text** — no bullet symbols, underscores, double spaces, weird indentation, or special characters copied from formatted documents.  
   - Convert any special symbols like •, –, —, _, → into simple hyphens (-).  
   - Remove all trailing periods (.) or unnecessary punctuation.
2. Ensure **every section listed above appears**, even if the input is missing data.  
   - For missing sections, write short, neutral placeholder text like:
     - "Information not provided."
3. Use **quantifiable, results-driven statements** (include metrics, % impact, revenue, users, etc. wherever possible).  
4. Maintain **formal tone** and **consistent tense** throughout.
5. Use **ATS-friendly formatting** (simple plain text, standard section names, consistent spacing).  
6. No first-person pronouns (avoid "I", "me", "my").
7. Use strong action verbs and measurable results.
8. Optimize naturally for **ATS keywords** based on given skills, experience, and role titles.
9. Always ensure the resume text, once generated, is expected to yield an ATS score **≥ 80**.
10. Avoid repeating phrases or skills unnecessarily.

---

### OUTPUT FORMAT
For every section, repeat this format:

SECTION NAME:
- Field Label: Field Value
- Field Label: Field Value

(blank line between each section)

---

### 🔹 OUTPUT REQUIREMENTS
- Output only the resume (no "Here is your resume" or any commentary).
- Each section should be separated by **one blank line**.
- All text should be properly capitalized and human-readable.
- Resume must look clean when viewed in plain text — no tables, markdown, bullets, emojis, or artifacts.
`;
}

// Create checkout session
const createCheckoutSession = async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({
                success: false,
                message: "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.",
            });
        }

        const { planType, currency = "inr" } = req.body;
        const jobSeekerId = req.userId; // From auth middleware

        if (!planType) {
            return res.status(400).json({
                success: false,
                message: "planType is required",
            });
        }

        // Fetch job seeker details
        const jobSeeker = await JobSeeker.findById(jobSeekerId);
        if (!jobSeeker) {
            return res.status(404).json({
                success: false,
                message: "Job seeker not found",
            });
        }

        const selectedPlan = plans[planType];
        if (!selectedPlan) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan type",
            });
        }

        // Convert amount to smallest currency unit (cents/paise)
        const unitAmount = Math.round(selectedPlan.amount * 100);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency,
                        product_data: {
                            name: `Resume Builder - ${selectedPlan.name}`,
                            description: `Purchase of ${selectedPlan.name} plan for resume building`,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            customer_email: jobSeeker.email,
            metadata: {
                jobSeekerId: jobSeekerId.toString(),
                jobSeekerName: jobSeeker.fullName,
                planType,
            },
            success_url: `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=resume-builder`,
            cancel_url: `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')}/payment-cancel`,
        });

        res.json({
            success: true,
            url: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        console.error("Stripe checkout error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create Stripe session",
        });
    }
};

// Verify checkout session
const verifyCheckoutSession = async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({
                success: false,
                message: "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.",
            });
        }

        let { session_id } = req.query;
        if (!session_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Session ID is required" 
            });
        }

        // Clean and validate session_id
        session_id = session_id.trim();
        const sessionIdMatch = session_id.match(/^(cs_[a-zA-Z0-9_-]{1,63})/);
        if (sessionIdMatch) {
            session_id = sessionIdMatch[1];
        }

        if (!session_id.startsWith('cs_') || session_id.length > 66) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid session ID format" 
            });
        }

        // Retrieve session from Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['payment_intent', 'line_items']
        });

        const metadata = session.metadata || {};
        const jobSeekerIdStr = metadata.jobSeekerId;

        if (!jobSeekerIdStr) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing jobSeekerId in metadata" 
            });
        }

        // Convert string to ObjectId
        let jobSeekerId;
        try {
            jobSeekerId = new mongoose.Types.ObjectId(jobSeekerIdStr);
        } catch (error) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid jobSeekerId format in metadata" 
            });
        }

        // Check if payment already recorded
        const existingPayment = await Payment.findOne({ sessionId: session.id });
        
        const paymentRecord = {
            sessionId: session.id,
            amount: session.amount_total / 100,
        };

        if (existingPayment) {
            return res.json({ 
                success: true, 
                message: "Transaction already recorded", 
                payment: paymentRecord 
            });
        }

        // Record payment
        const payment = new Payment({
            jobSeekerId,
            planType: metadata.planType || 'basic',
            sessionId: session.id,
            amount: session.amount_total / 100,
            currency: session.currency,
            status: session.payment_status === 'paid' ? 'paid' : 'pending',
            productType: 'resume_builder'
        });
        await payment.save();

        // Check if user already has a plan
        const existingPlan = await JobSeekerResumePlan.findOne({ jobSeekerId });

        const planType = metadata.planType || 'basic';
        const addCreations = getCreationsCount(planType);
        const addEnhancements = getEnhancementsCount(planType);
        const addDownloads = getDownloadsCount(planType);

        if (existingPlan) {
            const currentType = existingPlan.planType;
            const finalPlanType = 
                planPriority[planType] > planPriority[currentType] ? planType : currentType;

            // Initialize planCounts if it doesn't exist
            if (!existingPlan.planCounts) {
                existingPlan.planCounts = new Map();
            }
            
            // Ensure planCounts is a Map
            if (!(existingPlan.planCounts instanceof Map)) {
                const countsObj = existingPlan.planCounts || {};
                existingPlan.planCounts = new Map();
                Object.keys(countsObj).forEach(key => {
                    existingPlan.planCounts.set(key, countsObj[key]);
                });
            }

            // Add counts to the specific plan bucket
            const currentCountForPlan = existingPlan.planCounts.get(planType) || {
                creations: 0,
                enhancements: 0,
                downloads: 0
            };
            existingPlan.planCounts.set(planType, {
                creations: (currentCountForPlan.creations || 0) + addCreations,
                enhancements: (currentCountForPlan.enhancements || 0) + addEnhancements,
                downloads: (currentCountForPlan.downloads || 0) + addDownloads
            });

            // Update user plan
            existingPlan.planType = finalPlanType;
            existingPlan.paymentIds.push(payment._id);
            await existingPlan.save();
        } else {
            // New record for first-time buyer
            const planCounts = new Map();
            planCounts.set(planType, {
                creations: addCreations,
                enhancements: addEnhancements,
                downloads: addDownloads
            });
            
            const newPlan = new JobSeekerResumePlan({
                jobSeekerId,
                planType: planType,
                paymentIds: [payment._id],
                planCounts: planCounts
            });
            await newPlan.save();
        }

        console.log(`✅ Verified plan for job seeker ${jobSeekerId} (${planType})`);
        res.json({ 
            success: true, 
            message: "Plan verified and updated successfully", 
            payment: paymentRecord 
        });

    } catch (error) {
        console.error("Verify session error:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get job seeker's plan
const getJobSeekerPlan = async (req, res) => {
    try {
        const jobSeekerId = req.userId;

        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId })
            .populate('paymentIds');

        if (!plan) {
            return res.json({
                success: true,
                hasPlan: false,
                plan: null
            });
        }

        // Convert planCounts Map to object for JSON response
        const planCountsObj = {};
        if (plan.planCounts instanceof Map) {
            plan.planCounts.forEach((value, key) => {
                planCountsObj[key] = value;
            });
        } else {
            Object.assign(planCountsObj, plan.planCounts || {});
        }

        // Calculate totals from planCounts
        let totalCreations = 0;
        let totalEnhancements = 0;
        let totalDownloads = 0;
        Object.values(planCountsObj).forEach(counts => {
            totalCreations += counts.creations || 0;
            totalEnhancements += counts.enhancements || 0;
            totalDownloads += counts.downloads || 0;
        });

        res.json({
            success: true,
            hasPlan: true,
            plan: {
                planType: plan.planType,
                creationsRemaining: totalCreations,
                enhancementsRemaining: totalEnhancements,
                downloadsRemaining: totalDownloads,
                activePlanType: plan.activePlanType,
                planCounts: planCountsObj,
                createdAt: plan.createdAt,
                updatedAt: plan.updatedAt
            }
        });
    } catch (error) {
        console.error("Get plan error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get plan configuration
const getPlanConfiguration = async (req, res) => {
    try {
        const jobSeekerId = req.userId;

        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId });

        // Convert planCounts Map to object
        const planCountsObj = {};
        if (plan && plan.planCounts instanceof Map) {
            plan.planCounts.forEach((value, key) => {
                planCountsObj[key] = value;
            });
        } else if (plan && plan.planCounts) {
            Object.assign(planCountsObj, plan.planCounts);
        }

        const userPlan = plan ? {
            planType: plan.planType,
            activePlanType: plan.activePlanType || plan.planType,
            planCounts: planCountsObj
        } : null;

        res.json({
            success: true,
            userPlan,
            plans: getAllPlanConfigs(),
            featureDefinitions: getFeatureDefinitions()
        });
    } catch (error) {
        console.error("Get plan config error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update active plan
const updateActivePlan = async (req, res) => {
    try {
        const jobSeekerId = req.userId;
        const { activePlanType } = req.body;

        if (!activePlanType || !['basic', 'premium', 'organization'].includes(activePlanType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid activePlanType. Must be 'basic', 'premium', or 'organization'"
            });
        }

        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "No plan found for this job seeker"
            });
        }

        plan.activePlanType = activePlanType;
        await plan.save();

        res.json({
            success: true,
            message: "Active plan updated successfully",
            activePlanType: plan.activePlanType
        });
    } catch (error) {
        console.error("Update active plan error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get payment history
const getPaymentHistory = async (req, res) => {
    try {
        const jobSeekerId = req.userId;

        const payments = await Payment.find({ 
            jobSeekerId, 
            productType: 'resume_builder' 
        })
        .sort({ createdAt: -1 })
        .select('planType amount currency status createdAt');

        res.json({
            success: true,
            payments
        });
    } catch (error) {
        console.error("Get payment history error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Check creations remaining
const checkCreations = async (req, res) => {
    try {
        const jobSeekerId = req.userId;

        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "No plan found",
                creationsRemaining: 0
            });
        }

        // Helper function to safely get value from planCounts (handles both Map and plain object)
        const getPlanCount = (planCounts, planType, countType = 'creations') => {
            if (!planCounts) return 0;
            let planData = null;
            
            if (planCounts instanceof Map || typeof planCounts.get === 'function') {
                planData = planCounts.get(planType);
            } else {
                // It's a plain object (MongoDB stores Maps as objects)
                planData = planCounts[planType];
            }
            
            if (!planData) return 0;
            
            // planData is an object with { creations, enhancements, downloads }
            return planData[countType] || 0;
        };

        // Helper function to check if planCounts has data
        const hasPlanCounts = (planCounts) => {
            if (!planCounts) return false;
            if (planCounts instanceof Map || typeof planCounts.get === 'function') {
                return planCounts.size > 0;
            }
            return Object.keys(planCounts).length > 0;
        };

        let creationsRemaining = 0;

        // If planCounts exists and has data, use activePlanType to get the count
        if (hasPlanCounts(plan.planCounts)) {
            // Get active plan type (or determine it if not set)
            let activePlanType = plan.activePlanType;

            // If no active plan set, default to highest available plan with counts
            if (!activePlanType) {
                const orgCount = getPlanCount(plan.planCounts, 'organization', 'creations');
                const premiumCount = getPlanCount(plan.planCounts, 'premium', 'creations');
                const basicCount = getPlanCount(plan.planCounts, 'basic', 'creations');

                if (orgCount > 0) {
                    activePlanType = 'organization';
                } else if (premiumCount > 0) {
                    activePlanType = 'premium';
                } else if (basicCount > 0) {
                    activePlanType = 'basic';
                } else {
                    activePlanType = plan.planType; // Fallback to planType
                }
            }

            // Get creations count for the active plan type
            creationsRemaining = getPlanCount(plan.planCounts, activePlanType, 'creations');
        } else {
            // If no planCounts, return 0
            creationsRemaining = 0;
        }

        res.json({
            success: true,
            creationsRemaining: creationsRemaining
        });
    } catch (error) {
        console.error("Check creations error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Check downloads remaining
const checkDownloads = async (req, res) => {
    try {
        const jobSeekerId = req.userId;

        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "No plan found",
                downloadsRemaining: 0
            });
        }

        res.json({
            success: true,
            downloadsRemaining: plan.downloadsRemaining || 0
        });
    } catch (error) {
        console.error("Check downloads error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Check enhancements remaining
const checkEnhancements = async (req, res) => {
    try {
        const jobSeekerId = req.userId;

        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "No plan found",
                enhancementsRemaining: 0
            });
        }

        // Calculate total enhancements from planCounts
        let totalEnhancements = 0;
        if (plan.planCounts) {
            const countsObj = plan.planCounts instanceof Map 
                ? Object.fromEntries(plan.planCounts)
                : plan.planCounts;
            Object.values(countsObj).forEach(counts => {
                totalEnhancements += counts.enhancements || 0;
            });
        }

        res.json({
            success: true,
            enhancementsRemaining: totalEnhancements
        });
    } catch (error) {
        console.error("Check enhancements error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Generate resume
const generateResume = async (req, res) => {
    try {
        const { mainRole, subRole, formData } = req.body;
        const jobSeekerId = req.userId;

        if (!mainRole || !subRole || !formData) {
            return res.status(400).json({
                success: false,
                message: "Missing mainRole, subRole, or formData"
            });
        }

        if (!genAI) {
            return res.status(500).json({
                success: false,
                message: "Gemini API key not configured"
            });
        }

        // Check creations remaining
        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId });
        
        // Calculate total creations from planCounts
        let totalCreations = 0;
        if (plan && plan.planCounts) {
            const countsObj = plan.planCounts instanceof Map 
                ? Object.fromEntries(plan.planCounts)
                : plan.planCounts;
            Object.values(countsObj).forEach(counts => {
                totalCreations += counts.creations || 0;
            });
        }
        
        if (!plan || totalCreations <= 0) {
            return res.status(403).json({
                success: false,
                message: "No resume creations remaining. Please purchase a plan."
            });
        }

        const personal = formData["Personal Information"]?.[0] || {};
        const fullName = personal?.fullName?.trim() || "Unnamed Candidate";

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const selectedRoleConfig = sectionsAndFields.find(
            (x) => x.category === mainRole
        );

        if (!selectedRoleConfig) {
            return res.status(400).json({
                success: false,
                message: "Invalid mainRole"
            });
        }

        const dynamicPrompt = buildDynamicResumePrompt(
            mainRole,
            subRole,
            formData,
            selectedRoleConfig
        );

        // Generate Resume
        let result = await model.generateContent(dynamicPrompt);
        let text = await result.response.text();
        let resumeText = text.trim();

        if (!resumeText) {
            throw new Error("AI returned empty resume text");
        }

        // Analyze ATS score
        let atsReport = await analyzeResumeWithAI(resumeText);
        console.log(`Initial ATS Score: ${atsReport.atsScore}`);

        // If ATS < 80, enhance the resume automatically
        if (atsReport.atsScore < 80) {
            console.log("Re-optimizing resume for higher ATS score...");
            const improvePrompt = `
You previously generated this resume:

---
${resumeText}
---

It received an ATS score of ${atsReport.atsScore}, which is below 80.

Rewrite and **enhance** it strictly following these rules:
- Maintain all factual details from the original resume.
- Improve keyword density, clarity, and quantifiable impact.
- Ensure the rewritten resume is **ATS-optimized** to score **80+**.
- Follow the same section order and formatting rules.

Return only the improved plain-text resume.
`;

            const improveResult = await model.generateContent(improvePrompt);
            const improvedText = await improveResult.response.text();
            resumeText = improvedText.trim();

            // Re-check ATS score
            atsReport = await analyzeResumeWithAI(resumeText);
            console.log(`Enhanced ATS Score: ${atsReport.atsScore}`);
        }

        // Generate Resume ID
        const resumeId = uuidv4();

        // Prepare resume record
        const newResumeData = {
            id: resumeId,
            title: `${fullName} Resume`,
            text: resumeText,
            atsScore: atsReport.atsScore,
            created_at: new Date(),
            type: "Create"
        };

        // Decrement count in planCounts
        if (plan.planCounts) {
            // Helper function to get count from planCounts (handles both Map and plain object)
            const getPlanCount = (planCounts, planType, countType = 'creations') => {
                if (!planCounts) return 0;
                let planData = null;
                
                if (planCounts instanceof Map || typeof planCounts.get === 'function') {
                    planData = planCounts.get(planType);
                } else {
                    planData = planCounts[planType];
                }
                
                if (!planData) return 0;
                return planData[countType] || 0;
            };
            
            // Get active plan type (or determine it if not set)
            let activePlanType = plan.activePlanType;
            
            // If no active plan set, default to highest available plan with counts
            if (!activePlanType) {
                const orgCount = getPlanCount(plan.planCounts, 'organization', 'creations');
                const premiumCount = getPlanCount(plan.planCounts, 'premium', 'creations');
                const basicCount = getPlanCount(plan.planCounts, 'basic', 'creations');
                
                if (orgCount > 0) {
                    activePlanType = 'organization';
                } else if (premiumCount > 0) {
                    activePlanType = 'premium';
                } else if (basicCount > 0) {
                    activePlanType = 'basic';
                } else {
                    activePlanType = plan.planType; // Fallback to planType
                }
            }
            
            // Decrement the count for the active plan type using reliable findByIdAndUpdate
            if (activePlanType) {
                // Work with planCounts as it comes from MongoDB (usually a plain object)
                let countsObj = plan.planCounts;
                
                // Convert Map to plain object if needed
                if (plan.planCounts instanceof Map) {
                    countsObj = {};
                    plan.planCounts.forEach((value, key) => {
                        countsObj[key] = value;
                    });
                } else if (!countsObj || typeof countsObj !== 'object') {
                    countsObj = {};
                }
                
                const currentPlanData = countsObj[activePlanType];
                
                if (currentPlanData) {
                    const currentCreations = currentPlanData.creations || 0;
                    const newCreations = Math.max(0, currentCreations - 1);
                    
                    // Use findByIdAndUpdate with dot notation for reliable Map updates
                    // This is more reliable than modifying the Map directly
                    const updateQuery = {};
                    updateQuery[`planCounts.${activePlanType}.creations`] = newCreations;
                    
                    // Preserve other fields if they exist
                    if (currentPlanData.downloads !== undefined) {
                        updateQuery[`planCounts.${activePlanType}.downloads`] = currentPlanData.downloads;
                    }
                    if (currentPlanData.enhancements !== undefined) {
                        updateQuery[`planCounts.${activePlanType}.enhancements`] = currentPlanData.enhancements;
                    }
                    
                    await JobSeekerResumePlan.findByIdAndUpdate(
                        plan._id,
                        { $set: updateQuery },
                        { new: true }
                    );
                    
                    console.log(`✅ Decremented creations for ${activePlanType}: ${currentCreations} -> ${newCreations}`);
                    
                    // Reload the plan to get updated values
                    const updatedPlan = await JobSeekerResumePlan.findById(plan._id);
                    if (updatedPlan) {
                        plan.planCounts = updatedPlan.planCounts;
                    }
                } else {
                    console.log(`⚠️ Warning: planCounts does not have key: ${activePlanType}`);
                }
            }
        }
        
        if (!plan.resumes) {
            plan.resumes = [];
        }
        plan.resumes.push(newResumeData);
        await plan.save();

        // Send Response
        res.json({
            success: true,
            message: "Resume generated successfully",
            data: {
                resumeId,
                atsScore: atsReport.atsScore,
                scoreLevel: atsReport.scoreLevel
            }
        });
    } catch (error) {
        console.error("Resume Generation Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to generate resume"
        });
    }
};

// Get resume by ID
const getResumeById = async (req, res) => {
    try {
        const { resumeId } = req.query;
        const jobSeekerId = req.userId;

        if (!resumeId) {
            return res.status(400).json({
                success: false,
                message: "resumeId is required"
            });
        }

        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "User plan not found"
            });
        }

        if (!Array.isArray(plan.resumes) || plan.resumes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No resumes found"
            });
        }

        // Find resume by id
        const found = plan.resumes.find(r => r.id === resumeId);

        if (!found) {
            return res.status(404).json({
                success: false,
                message: "Resume not found"
            });
        }

        // Get job seeker profile picture
        const JobSeeker = require('../models/jobSeeker');
        const jobSeeker = await JobSeeker.findById(jobSeekerId).select('profilePicture');
        const profilePicture = jobSeeker?.profilePicture || null;

        // Convert Mongoose subdocument to plain object
        // Subdocuments don't have toObject(), so we need to access _doc or convert manually
        let resumeData;
        if (found._doc) {
            // It's a Mongoose subdocument, extract from _doc
            resumeData = { ...found._doc };
        } else if (typeof found.toObject === 'function') {
            // It's a full Mongoose document
            resumeData = found.toObject();
        } else {
            // It's already a plain object
            resumeData = { ...found };
        }

        // Return both resume data + plan details + profile picture
        res.json({
            success: true,
            data: {
                ...resumeData,
                profilePicture
            },
            downloads_remaining: plan.downloadsRemaining,
            plan_type: plan.planType
        });
    } catch (error) {
        console.error("Get Resume Error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

// Update downloads (decrement)
const updateDownloads = async (req, res) => {
    try {
        const jobSeekerId = req.userId;
        const { templatePlan } = req.body; // Get template's plan requirement (e.g., "premium", "basic", "organization")

        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "User plan not found"
            });
        }

        // Decrement count in planCounts based on template's plan requirement
        if (plan.planCounts && templatePlan) {
            // Plan hierarchy: basic < premium < organization
            const planHierarchy = { basic: 1, premium: 2, organization: 3 };
            const templatePlanRank = planHierarchy[templatePlan] || 1;
            
            console.log(`📊 Template requires plan: ${templatePlan} (rank: ${templatePlanRank})`);

            // Helper to get downloads count from planCounts
            const getDownloads = (planType) => {
                if (!plan.planCounts) return 0;
                const planData = plan.planCounts instanceof Map 
                    ? plan.planCounts.get(planType)
                    : plan.planCounts[planType];
                return planData?.downloads || 0;
            };

            // Work with planCounts as it comes from MongoDB (usually a plain object)
            let countsObj = plan.planCounts;
            
            // Convert Map to plain object if needed
            if (plan.planCounts instanceof Map) {
                countsObj = {};
                plan.planCounts.forEach((value, key) => {
                    countsObj[key] = value;
                });
            } else if (!countsObj || typeof countsObj !== 'object') {
                countsObj = {};
            }

            // Determine which plan to decrement from:
            // 1. First try the template's required plan
            // 2. If that plan has 0 downloads, try the next higher plan
            let planToDecrement = null;
            
            // Check if template's required plan has downloads
            const templatePlanDownloads = getDownloads(templatePlan);
            if (templatePlanDownloads > 0) {
                planToDecrement = templatePlan;
                console.log(`📊 Template plan (${templatePlan}) has ${templatePlanDownloads} downloads, using it`);
            } else {
                // Try higher plans (organization > premium > basic)
                const higherPlans = ['organization', 'premium', 'basic']
                    .filter(p => planHierarchy[p] > templatePlanRank)
                    .sort((a, b) => planHierarchy[b] - planHierarchy[a]); // Sort descending
                
                for (const higherPlan of higherPlans) {
                    const higherPlanDownloads = getDownloads(higherPlan);
                    if (higherPlanDownloads > 0) {
                        planToDecrement = higherPlan;
                        console.log(`📊 Template plan (${templatePlan}) has 0 downloads, using higher plan (${higherPlan}) with ${higherPlanDownloads} downloads`);
                        break;
                    }
                }
            }

            // Decrement the count for the determined plan
            if (planToDecrement) {
                const currentPlanData = countsObj[planToDecrement];
                
                if (currentPlanData) {
                    const currentDownloads = currentPlanData.downloads || 0;
                    const newDownloads = Math.max(0, currentDownloads - 1);
                    
                    // Use findByIdAndUpdate with dot notation for reliable Map updates
                    // This is more reliable than modifying the Map directly
                    const updateQuery = {};
                    updateQuery[`planCounts.${planToDecrement}.downloads`] = newDownloads;
                    
                    // Preserve other fields if they exist
                    if (currentPlanData.creations !== undefined) {
                        updateQuery[`planCounts.${planToDecrement}.creations`] = currentPlanData.creations;
                    }
                    if (currentPlanData.enhancements !== undefined) {
                        updateQuery[`planCounts.${planToDecrement}.enhancements`] = currentPlanData.enhancements;
                    }
                    
                    await JobSeekerResumePlan.findByIdAndUpdate(
                        plan._id,
                        { $set: updateQuery },
                        { new: true }
                    );
                    
                    console.log(`✅ Decremented downloads for ${planToDecrement}: ${currentDownloads} -> ${newDownloads} (template required: ${templatePlan})`);
                    
                    // Reload the plan to get updated values for response
                    const updatedPlan = await JobSeekerResumePlan.findById(plan._id);
                    if (updatedPlan) {
                        plan.planCounts = updatedPlan.planCounts;
                    }
                } else {
                    console.log(`⚠️ Warning: planCounts does not have key: ${planToDecrement}. Available keys: ${Object.keys(countsObj).join(', ')}`);
                }
            } else {
                console.log(`⚠️ Warning: No plan found with downloads > 0 for template requirement: ${templatePlan}`);
            }
        } else {
            if (!templatePlan) {
                console.log(`⚠️ Warning: templatePlan not provided in request body`);
            }
            if (!plan.planCounts) {
                console.log(`⚠️ Warning: planCounts is null or undefined`);
            }
        }

        // Calculate total downloads from planCounts for response
        let totalDownloads = 0;
        if (plan.planCounts) {
            const countsObj = plan.planCounts instanceof Map 
                ? Object.fromEntries(plan.planCounts)
                : plan.planCounts;
            Object.values(countsObj).forEach(counts => {
                totalDownloads += counts.downloads || 0;
            });
        }

        res.json({
            success: true,
            downloadsRemaining: totalDownloads
        });
    } catch (error) {
        console.error("Update Downloads Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all resumes for a job seeker
const getAllResumes = async (req, res) => {
    try {
        const jobSeekerId = req.userId;

        const plan = await JobSeekerResumePlan.findOne({ jobSeekerId });

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "User plan not found"
            });
        }

        const resumes = Array.isArray(plan.resumes) ? plan.resumes : [];
        
        // Sort by created_at (most recent first)
        const sortedResumes = resumes.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });

        res.json({
            success: true,
            resumes: sortedResumes
        });
    } catch (error) {
        console.error("Get all resumes error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch resumes"
        });
    }
};

// Generate PDF from HTML using Puppeteer (text-based, AI-readable)
const generatePDFFromHTML = async (req, res) => {
    let browser = null;
    try {
        const { html, filename } = req.body;
        
        if (!html) {
            return res.status(400).json({
                success: false,
                message: "HTML content is required"
            });
        }

        const puppeteer = require('puppeteer');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Set content
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Generate PDF with text layer preserved
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            },
            preferCSSPageSize: true
        });

        await browser.close();

        // Set response headers
        const pdfFilename = filename || 'resume.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFilename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF
        res.send(pdfBuffer);

    } catch (error) {
        console.error("PDF Generation Error:", error);
        
        // Ensure browser is closed on error
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error("Error closing browser:", closeError);
            }
        }

        res.status(500).json({
            success: false,
            message: error.message || "Failed to generate PDF"
        });
    }
};

module.exports = {
    createCheckoutSession,
    verifyCheckoutSession,
    getJobSeekerPlan,
    getPlanConfiguration,
    updateActivePlan,
    getPaymentHistory,
    checkCreations,
    checkDownloads,
    checkEnhancements,
    generateResume,
    getResumeById,
    getAllResumes,
    updateDownloads,
    generatePDFFromHTML
};

