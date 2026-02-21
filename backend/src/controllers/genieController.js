const { GoogleGenerativeAI } = require('@google/generative-ai');

// Simple text-based conversation handler for Genie
// For now, we'll use the standard Gemini API instead of Realtime API for simplicity
// Realtime API can be added later with WebSocket support

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genieClient = null;

const initializeGenieClient = () => {
    if (!genieClient && GEMINI_API_KEY) {
        genieClient = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
    return genieClient;
};

/**
 * Get initial greeting from Genie
 */
const getGreeting = async (req, res) => {
    try {
        const client = initializeGenieClient();
        if (!client) {
            return res.status(500).json({
                success: false,
                message: "Gemini API not configured"
            });
        }

        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const model = client.getGenerativeModel({ model: modelName });
        
        const prompt = `You are Genie, a helpful job search assistant. Greet the user and say: "Hi! I think you're looking for jobs. Tell me some details and I'll find the best jobs that suit you."

Then ask: "What is your current role or the role you're looking for?"

Keep your response friendly and conversational, under 50 words.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.status(200).json({
            success: true,
            message: text.trim()
        });
    } catch (error) {
        console.error("Genie Greeting Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate greeting"
        });
    }
};

/**
 * Process user message and get AI response
 */
const processMessage = async (req, res) => {
    try {
        const { message, conversationState, currentRole, yearsOfExperience, preferredLocation } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        const client = initializeGenieClient();
        if (!client) {
            return res.status(500).json({
                success: false,
                message: "Gemini API not configured"
            });
        }

        const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        const model = client.getGenerativeModel({ model: modelName });

        // Build conversation context
        let systemPrompt = `You are Genie, a helpful job search assistant. Your goal is to collect three pieces of information:
1. Current role or desired role
2. Years of experience
3. Preferred location

Current conversation state: ${conversationState || 'starting'}`;

        if (currentRole) {
            systemPrompt += `\nUser's role: ${currentRole}`;
        }
        if (yearsOfExperience !== null && yearsOfExperience !== undefined) {
            systemPrompt += `\nUser's years of experience: ${yearsOfExperience}`;
        }
        if (preferredLocation) {
            systemPrompt += `\nUser's preferred location: ${preferredLocation}`;
        }

        systemPrompt += `\n\nUser just said: "${message}"`;

        // FIRST: Extract information from user message based on what we're missing
        let extractedRole = currentRole;
        let extractedYears = yearsOfExperience;
        let extractedLocation = preferredLocation;

        // Extract role if we don't have it yet
        if (!currentRole) {
            // Check if user is confirming/mentioning a role
            // Look for role-related keywords, but ignore confirmations like "yes", "that's right", etc.
            const confirmations = /^(yes|yeah|yep|correct|that's right|that is right|right|ok|okay|sure)$/i;
            if (!confirmations.test(message.trim())) {
                // Extract role from message - clean it up
                let roleText = message.trim().toLowerCase();
                // Remove common filler words
                roleText = roleText.replace(/^(i am|i'm|i want to be|looking for|role is|a |an |the )/i, '').trim();
                // Check if it's not just a confirmation
                if (roleText && roleText.length > 2 && !confirmations.test(roleText)) {
                    extractedRole = roleText.charAt(0).toUpperCase() + roleText.slice(1);
                }
            }
        }
        
        // Extract years of experience if we have role but not experience
        if ((currentRole || extractedRole) && (yearsOfExperience === null || yearsOfExperience === undefined)) {
            const yearsMatch = message.match(/(\d+)\s*(?:year|yr|years|yrs)?/i);
            if (yearsMatch) {
                extractedYears = parseInt(yearsMatch[1]);
            } else {
                // If no number found, check for "fresher" or "entry level"
                if (message.match(/fresher|entry|beginner|no experience|0|zero/i)) {
                    extractedYears = 0;
                }
            }
        }
        
        // Extract location if we have role and experience but not location
        if ((currentRole || extractedRole) && 
            (yearsOfExperience !== null && yearsOfExperience !== undefined || extractedYears !== null && extractedYears !== undefined) && 
            !preferredLocation) {
            const confirmations = /^(yes|yeah|yep|correct|that's right|that is right|right|ok|okay|sure)$/i;
            if (!confirmations.test(message.trim())) {
                extractedLocation = message.trim();
            }
        }

        // Use extracted values or existing values
        const finalRole = extractedRole || currentRole;
        const finalYears = extractedYears !== null && extractedYears !== undefined ? extractedYears : yearsOfExperience;
        const finalLocation = extractedLocation || preferredLocation;

        // NOW determine current state and what to ask next based on final extracted info
        let currentState = conversationState || 'starting';
        let nextInstruction = "";
        
        if (!finalRole) {
            currentState = 'asking_role';
            nextInstruction = "The user hasn't provided their role yet. Ask: 'What is your current role or the role you're looking for?'";
        } else if (finalYears === null || finalYears === undefined) {
            currentState = 'asking_experience';
            nextInstruction = `The user's role is "${finalRole}". Now ask: 'How many years of experience do you have?'`;
        } else if (!finalLocation) {
            currentState = 'asking_location';
            nextInstruction = `The user's role is "${finalRole}" with ${finalYears} years of experience. Now ask: 'What is your preferred location?'`;
        } else {
            currentState = 'done';
            nextInstruction = `Perfect! The user wants a ${finalRole} role with ${finalYears} years of experience in ${finalLocation}. Say: 'Perfect! I have all the information I need. Let me search for jobs matching your preferences.' Then signal that you're ready to search by including the text: '[SEARCH_JOBS]' at the end of your response.`;
        }
        
        systemPrompt = systemPrompt.replace(/Current conversation state: .*/, `Current conversation state: ${currentState}`);
        
        // Update system prompt with final extracted values
        if (finalRole) {
            if (systemPrompt.includes("User's role:")) {
                systemPrompt = systemPrompt.replace(/User's role: .*/, `User's role: ${finalRole}`);
            } else {
                systemPrompt += `\nUser's role: ${finalRole}`;
            }
        }
        if (finalYears !== null && finalYears !== undefined) {
            if (systemPrompt.includes("User's years of experience:")) {
                systemPrompt = systemPrompt.replace(/User's years of experience: .*/, `User's years of experience: ${finalYears}`);
            } else {
                systemPrompt += `\nUser's years of experience: ${finalYears}`;
            }
        }
        if (finalLocation) {
            if (systemPrompt.includes("User's preferred location:")) {
                systemPrompt = systemPrompt.replace(/User's preferred location: .*/, `User's preferred location: ${finalLocation}`);
            } else {
                systemPrompt += `\nUser's preferred location: ${finalLocation}`;
            }
        }

        systemPrompt += `\n\n${nextInstruction}\n\nKeep your response friendly, conversational, and under 60 words. DO NOT repeat the question if you already have the answer.`;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const text = response.text().trim();

        return res.status(200).json({
            success: true,
            message: text,
            extractedRole: finalRole || extractedRole || currentRole,
            extractedYears: finalYears !== null && finalYears !== undefined ? finalYears : (extractedYears !== null && extractedYears !== undefined ? extractedYears : yearsOfExperience),
            extractedLocation: finalLocation || extractedLocation || preferredLocation,
            readyToSearch: text.includes('[SEARCH_JOBS]'),
            conversationState: currentState
        });
    } catch (error) {
        console.error("Genie Process Message Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to process message"
        });
    }
};

module.exports = {
    getGreeting,
    processMessage
};

