const WebSocket = require('ws');

/**
 * OpenAI Realtime API Service
 * Handles real-time streaming conversations using WebSocket
 * Uses OpenAI Realtime API: wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview
 */
class OpenAIRealtimeService {
    constructor() {
        this.connections = new Map(); // Map of conversationId -> WebSocket connection
    }

    /**
     * Create a realtime WebSocket connection for a conversation
     * @param {string} conversationId - Conversation ID
     * @param {Object} config - Configuration
     * @param {Function} onMessage - Callback for messages
     * @returns {Promise<WebSocket>} WebSocket connection
     */
    async createRealtimeConnection(conversationId, config = {}, onMessage = null) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is required for realtime API');
        }

        const { candidateName, jobDescription, conversationHistory = [], candidateInfo = {}, recruiterName = 'the recruiter' } = config;

        // Create WebSocket connection to OpenAI Realtime API
        // Using gpt-4o-realtime-preview for high-quality natural voice
        const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`;
        
        const ws = new WebSocket(wsUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'OpenAI-Beta': 'realtime=v1'
            }
        });

        // Build system prompt for recruiter interview
        const jobDesc = jobDescription?.substring(0, 2000) || 'Not specified';
        
        // Extract job title from job description (first line or first sentence)
        let jobTitle = 'the position';
        if (jobDesc) {
            const firstLine = jobDesc.split('\n')[0].trim();
            if (firstLine.length < 100) {
                jobTitle = firstLine;
            } else {
                // Try to extract from common patterns
                const titleMatch = jobDesc.match(/(?:Job Title|Position|Role):\s*(.+?)(?:\n|\.|$)/i) ||
                                  jobDesc.match(/^(?:We are|Looking for|Hiring)\s+(?:a|an)?\s*(.+?)(?:\s+for|\s+at|$)/i);
                if (titleMatch) {
                    jobTitle = titleMatch[1].trim();
                }
            }
        }
        
        const systemPrompt = `You are ${recruiterName}, a professional recruiter calling a candidate who has APPLIED FOR A JOB POSITION. This is a job interview/screening call.

⚠️ CRITICAL LANGUAGE REQUIREMENT ⚠️
YOU MUST SPEAK ONLY IN ENGLISH (US). THIS IS MANDATORY AND NON-NEGOTIABLE.
- NEVER use Spanish, French, Hindi, or any other language
- NEVER use greetings like "¡Hola!" or "Bonjour" or "नमस्ते"
- ALWAYS use English greetings like "Hi", "Hello", "Good morning"
- ALL your responses MUST be in English (US) only
- If the candidate speaks another language, politely ask them to speak in English
- This is a professional English-speaking recruitment call

YOUR NAME: ${recruiterName}
- Always introduce yourself using this name: "${recruiterName}"
- Use your name naturally in conversation when appropriate

CANDIDATE INFORMATION:
- Name: ${candidateName || 'the candidate'}
- Experience: ${candidateInfo.yearsOfExperience || candidateInfo.experience || 'Not specified'}
- Skills: ${candidateInfo.skills?.join(', ') || 'Not specified'}
- Current Role: ${candidateInfo.currentRole || candidateInfo.currentCompany || 'Not specified'}

JOB POSITION THEY APPLIED FOR:
${jobDesc}

YOUR ROLE:
You are ${recruiterName}, a RECRUITER calling about their JOB APPLICATION. This is NOT a general assistant or customer service call.

CONVERSATION RULES:
1. ⚠️ MANDATORY: You MUST speak ONLY in English (US) - NEVER use any other language
2. You are calling about THEIR APPLICATION for THIS SPECIFIC JOB
3. Ask job-specific questions: experience, skills, why they applied, fit for the role
4. Discuss the job requirements and their qualifications
5. Ask ONE question at a time, wait for answer
6. Keep responses concise but complete - ALWAYS finish your sentences completely, even if longer than 50 words
7. Be professional, warm, and conversational
8. Speak at a natural, human-like pace (not rushed)
9. Focus on: their experience, relevant skills, interest in THIS job, availability, salary expectations
10. ⚠️ CRITICAL: NEVER cut off mid-sentence - always complete your thought fully before ending

TOPICS TO COVER:
- Their relevant experience for this role
- Skills that match the job requirements
- Why they applied for this position
- Their interest and fit
- Availability and notice period
- Salary expectations
- Any questions they have about the role

${conversationHistory.length > 0 ? `\nRECENT CONVERSATION:\n${conversationHistory.slice(-6).map(m => `${m.speaker === 'ai' ? `You (${recruiterName})` : 'Candidate'}: ${m.message}`).join('\n')}` : ''}

CRITICAL REQUIREMENTS: 
- ⚠️ YOU MUST SPEAK ONLY IN ENGLISH (US) - THIS IS MANDATORY
- NEVER use Spanish, French, Hindi, or any other language
- Do NOT ask "How can I assist you?" or "What can I help you with?"
- This is about THEIR JOB APPLICATION, not general assistance
- Always reference the job position and their application
- Be a recruiter conducting an interview, not a customer service agent
- Speak naturally and at a comfortable pace, like a real human conversation

Start with: "Hi ${candidateName || 'there'}, this is ${recruiterName} calling about your application for ${jobTitle}. Is this a good time to talk for a few minutes?"

Remember: 
- ALWAYS speak in English (US) only - this is mandatory
- Always reference the job application and position
- Ask about their experience, skills, and interest in THIS specific role
- Use your name "${recruiterName}" naturally in conversation`;

        let accumulatedText = '';
        let currentResponseId = null;
        let currentResponseItems = new Map(); // Track response items and their content
        let audioChunksReceived = 0; // Track number of audio chunks received
        let responseDoneReceived = false; // Track if response.done was received
        let audioDoneReceived = false; // Track if response.audio.done was received
        let audioSeqByResponse = new Map(); // responseId -> seq counter for audio chunks

        ws.on('open', () => {
            console.log(`✅ Realtime WebSocket opened for conversation: ${conversationId}`);
            
            // Configure session with high-quality voice settings
            ws.send(JSON.stringify({
                type: "session.update",
                session: {
                    modalities: ["text", "audio"],
                    instructions: systemPrompt,
                    
                    // ⭐ MOST IMPORTANT SETTINGS ⭐
                    voice: "marin",                     // Voice selection (marin = newest, most natural and human-like with smooth prosody)
                    output_audio_format: "pcm16",       // Required for real-time audio
                    
                    input_audio_format: "pcm16",
                    input_audio_transcription: {
                        model: "whisper-1",
                        language: "en"                  // Force English transcription
                    },
                    
                    turn_detection: {
                        type: "semantic_vad"  // Uses semantic understanding to detect when AI finishes speaking, prevents mid-sentence cuts
                    },
                    
                    temperature: 0.8,                    // Higher temperature for more natural, conversational responses
                    max_response_output_tokens: 1000    // Significantly increased to ensure complete responses (was 400, now 1000)
                }
            }));

            // Start the conversation with initial greeting instruction
            setTimeout(() => {
                // Send initial greeting instruction BEFORE starting to speak
                ws.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "message",
                        role: "system",
                        content: [
                            {
                                type: "input_text",
                                text: `Start with: "Hi ${candidateName || 'there'}, this is ${recruiterName} calling regarding your application for ${jobTitle}. Is this a good time to talk?"`
                            }
                        ]
                    }
                }));
                
                // Then trigger response generation
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: "response.create"
                    }));
                }, 200);
            }, 500);
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                // Handle different message types
                switch (message.type) {
                    case 'session.created':
                        console.log('Session created:', message.session.id);
                        break;
                    
                    case 'session.updated':
                        console.log('Session updated');
                        break;
                    
                    case 'response.created':
                        currentResponseId = message.response?.id;
                        accumulatedText = '';
                        currentResponseItems.clear();
                        audioChunksReceived = 0;
                        responseDoneReceived = false;
                        audioDoneReceived = false;
                        // Initialize sequence counter for this response
                        if (currentResponseId) {
                            audioSeqByResponse.set(currentResponseId, 0);
                        }
                        break;
                    
                    case 'response.output_item.added':
                        // New output item (text or audio)
                        if (message.item?.id) {
                            currentResponseItems.set(message.item.id, { type: message.item.type, content: '' });
                        }
                        break;
                    
                    case 'response.content_part.added':
                        // Text content part added
                        if (message.part?.text) {
                            const text = message.part.text;
                            accumulatedText += text;
                            console.log('📝 Text delta received:', text);
                            console.log('📝 Accumulated text so far:', accumulatedText);
                            if (onMessage) {
                                onMessage({
                                    type: 'text_delta',
                                    text: text,
                                    fullText: accumulatedText,
                                    responseId: currentResponseId
                                });
                            }
                        }
                        // Audio content part - IGNORE (we use response.audio.delta instead to avoid duplicates)
                        // Do NOT send audio from here - it causes duplicate playback
                        break;
                    
                    case 'response.content_part.done':
                        // Content part complete
                        if (message.part?.text) {
                            // Finalize text
                            console.log('✅ Content part done, final text:', accumulatedText);
                            if (onMessage && accumulatedText.trim()) {
                                onMessage({
                                    type: 'text_complete',
                                    text: accumulatedText.trim(),
                                    responseId: currentResponseId
                                });
                            }
                        }
                        break;
                    
                    case 'response.audio_transcript.delta':
                        // Streaming text transcript (alternative format)
                        if (message.delta) {
                            accumulatedText += message.delta;
                            if (onMessage) {
                                onMessage({
                                    type: 'text_delta',
                                    text: message.delta,
                                    fullText: accumulatedText,
                                    responseId: currentResponseId
                                });
                            }
                        }
                        break;
                    
                    case 'response.audio_transcript.done':
                        // Full transcript available
                        const fullTranscript = message.transcript || accumulatedText;
                        accumulatedText = fullTranscript;
                        if (onMessage) {
                            onMessage({
                                type: 'text_complete',
                                text: fullTranscript,
                                responseId: currentResponseId
                            });
                        }
                        break;
                    
                    case 'response.audio.delta':
                        // Streaming audio data (alternative format)
                        if (message.delta && onMessage) {
                            audioChunksReceived++;
                            const responseId = currentResponseId || (message.response && message.response.id) || 'unknown';
                            
                            // Initialize seq counter for this response if needed
                            if (!audioSeqByResponse.has(responseId)) {
                                audioSeqByResponse.set(responseId, 0);
                            }
                            const seq = audioSeqByResponse.get(responseId);
                            audioSeqByResponse.set(responseId, seq + 1);
                            
                            console.log(`🔊 Audio delta received (chunk ${audioChunksReceived}, responseId: ${responseId}, seq: ${seq})`);
                            onMessage({
                                type: 'audio_delta',
                                audio: message.delta,
                                responseId: responseId,
                                seq: seq
                            });
                        }
                        break;
                    
                    case 'response.audio.done':
                        // Audio complete - signal that all audio has been sent
                        audioDoneReceived = true;
                        const audioDoneResponseId = currentResponseId || (message.response && message.response.id);
                        console.log(`🔊 All audio chunks sent (total: ${audioChunksReceived}, responseId: ${audioDoneResponseId})`);
                        // Only send audio_complete when OpenAI actually says audio is done
                        if (onMessage) {
                            onMessage({
                                type: 'audio_complete',
                                totalChunks: audioChunksReceived,
                                responseId: audioDoneResponseId
                            });
                        }
                        break;
                    
                    case 'response.output_item.done':
                        // Output item complete
                        break;
                    
                    case 'response.done':
                        // Response complete - only handle text, audio_complete is handled by response.audio.done
                        responseDoneReceived = true;
                        const doneResponseId = currentResponseId || (message.response && message.response.id);
                        const finalText = accumulatedText.trim();
                        console.log(`✅ Response done (received ${audioChunksReceived} audio chunks, responseId: ${doneResponseId})`);
                        console.log(`📝 Final text length: ${finalText.length} characters`);
                        console.log(`📝 Final text: "${finalText}"`);
                        
                        // Check if text appears incomplete (ends mid-sentence)
                        const endsWithPunctuation = /[.!?]$/.test(finalText);
                        const endsWithCompleteWord = !/\s$/.test(finalText) && finalText.length > 0;
                        
                        if (!endsWithPunctuation && finalText.length > 20) {
                            console.warn(`⚠️ Response text may be incomplete - doesn't end with punctuation. Text: "${finalText.substring(finalText.length - 50)}"`);
                        }
                        
                        if (onMessage && finalText) {
                            // Send final text if we have it
                            onMessage({
                                type: 'text_complete',
                                text: finalText,
                                responseId: doneResponseId
                            });
                        }
                        // Reset text tracking and clean up per-response seq counter
                        accumulatedText = '';
                        if (doneResponseId) {
                            audioSeqByResponse.delete(doneResponseId);
                        }
                        currentResponseId = null;
                        currentResponseItems.clear();
                        break;
                    
                    case 'error':
                        console.error('Realtime API error:', message);
                        if (onMessage) {
                            onMessage({
                                type: 'error',
                                error: message.error || message
                            });
                        }
                        break;
                    
                    default:
                        // Log other events for debugging (but not input_audio_buffer events)
                        if (message.type && !message.type.includes('input_audio_buffer') && !message.type.includes('rate_limits')) {
                            // Only log important events
                            if (message.type.includes('response') || message.type.includes('error')) {
                                console.log('Realtime event:', message.type, message);
                            }
                        }
                }
            } catch (error) {
                console.error('Error parsing realtime message:', error);
            }
        });

        ws.on('error', (error) => {
            console.error(`❌ Realtime WebSocket error for ${conversationId}:`, error);
            if (onMessage) {
                onMessage({
                    type: 'error',
                    error: error.message
                });
            }
        });

        ws.on('close', () => {
            console.log(`Realtime WebSocket closed for conversation: ${conversationId}`);
            this.connections.delete(conversationId);
        });

        // Store connection
        this.connections.set(conversationId, ws);

        return ws;
    }

    /**
     * Send text input to realtime API
     */
    sendTextInput(conversationId, text) {
        const ws = this.connections.get(conversationId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('Realtime connection not available for conversation:', conversationId);
            throw new Error('Realtime connection not available');
        }

        console.log('📤 Sending text to Realtime API:', text);

        // Send text input
        try {
            ws.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                    type: 'message',
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: text
                        }
                    ]
                }
            }));

            // Trigger response generation
            ws.send(JSON.stringify({
                type: 'response.create'
            }));
            
            console.log('✅ Text sent and response triggered');
        } catch (error) {
            console.error('❌ Error sending text to Realtime API:', error);
            throw error;
        }
    }

    /**
     * Send audio input to realtime API (base64 encoded PCM16)
     */
    sendAudioInput(conversationId, audioBase64) {
        const ws = this.connections.get(conversationId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error('Realtime connection not available');
        }

        // Send audio input
        ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: audioBase64
        }));
    }

    /**
     * Close realtime connection
     */
    closeConnection(conversationId) {
        const ws = this.connections.get(conversationId);
        if (ws) {
            ws.close();
            this.connections.delete(conversationId);
        }
    }

    /**
     * Get connection for a conversation
     */
    getConnection(conversationId) {
        return this.connections.get(conversationId);
    }
}

module.exports = new OpenAIRealtimeService();
