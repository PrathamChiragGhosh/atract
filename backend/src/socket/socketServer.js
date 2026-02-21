const { Server } = require('socket.io');
const mongoose = require('mongoose');
const WebSocket = require('ws');
const VoiceAgentSession = require('../models/voiceAgentSession.js');
const VoiceAgentConversation = require('../models/voiceAgentConversation.js');
const AnalyzedResume = require('../models/analyzedResume.js');
const OpenAI = require('openai');
const openaiRealtimeService = require('../services/openaiRealtimeService.js');
const geminiRealtimeService = require('../services/geminiRealtimeService.js');
const murfSpeechService = require('../services/murfSpeechService.js');

const VOICE_AGENT_PROVIDER = (process.env.VOICE_AGENT_PROVIDER || 'openai').toLowerCase();

const MURF_PCM_FORMATS = new Set(['RAW', 'PCM', 'LINEAR16']);

const { spawn } = require('child_process');

async function streamMurfAudio({ text, resumeId, conversationId, responseId, io, audioFormatPref }) {
    // Force MP3 from Murf, transcode to PCM16 server-side for true streaming
    const murfFormat = 'MP3';
    let mp3Stream;
    try {
        mp3Stream = await murfSpeechService.streamSpeechStream(text || '', { format: murfFormat });
    } catch (err) {
        console.error(`Murf streaming failed to start (${murfFormat}):`, err?.data || err?.response?.data || err?.message || err);
        throw err;
    }

    return new Promise((resolve, reject) => {
        let seq = 0;
        let ffmpeg;
        try {
            ffmpeg = spawn('ffmpeg', [
                '-i', 'pipe:0',
                '-f', 's16le',
                '-ac', '1',
                '-ar', '24000',
                'pipe:1'
            ], {
                stdio: ['pipe', 'pipe', 'inherit']
            });
        } catch (err) {
            // ffmpeg not found; fallback to raw MP3 streaming
            console.error('ffmpeg spawn failed, falling back to MP3 streaming:', err?.message || err);
            fallbackMp3(mp3Stream, { resumeId, conversationId, responseId, io });
            return resolve();
        }

        ffmpeg.stdout.on('data', (chunk) => {
            const audioBase64 = chunk.toString('base64');
            io.to(`candidate:${resumeId}`).emit('ai:audio_stream', {
                conversationId,
                audio: audioBase64,
                responseId,
                seq: seq++,
                audioFormat: 'pcm16',
                sampleRate: 24000
            });
        });

        const onFail = (err) => {
            console.error('ffmpeg pipeline error, falling back to MP3 streaming:', err?.message || err);
            fallbackMp3(mp3Stream, { resumeId, conversationId, responseId, io, startSeq: seq });
            resolve();
        };

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                onFail(new Error(`ffmpeg exited with code ${code}`));
            }
        });

        ffmpeg.on('error', onFail);
        mp3Stream.on('error', onFail);

        mp3Stream.pipe(ffmpeg.stdin);
    });
}

function fallbackMp3(mp3Stream, { resumeId, conversationId, responseId, io, startSeq = 0 }) {
    let seq = startSeq;
    mp3Stream.on('data', (chunk) => {
        const audioBase64 = chunk.toString('base64');
        io.to(`candidate:${resumeId}`).emit('ai:audio_stream', {
            conversationId,
            audio: audioBase64,
            responseId,
            seq: seq++,
            audioFormat: 'mp3',
            sampleRate: 24000
        });
    });
    mp3Stream.on('end', () => {
        io.to(`candidate:${resumeId}`).emit('ai:audio_complete', {
            conversationId,
            responseId
        });
        io.to(`candidate:${resumeId}`).emit('ai:response_complete', {
            conversationId,
            responseId
        });
    });
    mp3Stream.on('error', (err) => {
        console.error('MP3 fallback stream error:', err?.message || err);
    });
}

let io = null;
let aiClient = null;
const realtimeConnections = new Map(); // Map of conversationId -> OpenAI Realtime WebSocket
const genieSessions = new Map(); // Map of sessionId -> { conversationState, currentRole, yearsOfExperience, preferredLocation }

/**
 * Initialize AI client for conversation
 */
function getAIClient() {
    if (!aiClient) {
        const apiKey = process.env.TOGETHER_API_KEY;
        if (!apiKey) {
            throw new Error('TOGETHER_API_KEY is required for voice agent');
        }
        aiClient = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.together.xyz/v1'
        });
    }
    return aiClient;
}

/**
 * Generate initial greeting for candidate
 */
async function generateInitialGreeting({ candidateName, jobDescription, candidateInfo }) {
    try {
        const client = getAIClient();
        const model = process.env.TOGETHER_MODEL || 'openai/gpt-oss-20b';

        const prompt = `You are a professional recruiter calling a job candidate. Generate a warm, friendly greeting to start the conversation.

Candidate Name: ${candidateName}
Job Description: ${jobDescription.substring(0, 500)}...

Generate a natural, conversational greeting that:
1. Greets the candidate by name
2. Introduces yourself as calling from the company
3. Asks if it's a good time to talk (briefly, 1-2 minutes)
4. Mentions you're calling about the position

Keep it natural, friendly, and under 50 words. Return ONLY the greeting text, no additional formatting.`;

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional, friendly recruiter. Generate natural, conversational greetings.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        return response.choices[0]?.message?.content?.trim() || 
            `Hi ${candidateName}, this is calling from our recruitment team. Is this a good time to talk for a couple of minutes about the position?`;
    } catch (error) {
        console.error('Error generating greeting:', error);
        return `Hi ${candidateName}, this is calling from our recruitment team. Is this a good time to talk for a couple of minutes about the position?`;
    }
}

/**
 * Generate AI response based on candidate's message
 */
async function generateAIResponse({ conversationId, candidateMessage, jobDescription, conversationHistory }) {
    try {
        const client = getAIClient();
        const model = process.env.TOGETHER_MODEL || 'openai/gpt-oss-20b';

        // Build conversation context
        const historyText = conversationHistory
            .slice(-10) // Last 10 messages for context
            .map(msg => `${msg.speaker === 'ai' ? 'Recruiter' : 'Candidate'}: ${msg.message}`)
            .join('\n');

        const prompt = `You are a professional recruiter having a phone conversation with a job candidate. Continue the conversation naturally based on the candidate's response.

Job Description: ${jobDescription.substring(0, 500)}...

Recent Conversation:
${historyText}

Candidate just said: "${candidateMessage}"

Generate a natural, conversational response that:
1. Acknowledges what the candidate said
2. Asks relevant follow-up questions about their experience, interest, availability, etc.
3. Keeps the conversation flowing naturally
4. Is appropriate for a phone call (concise, conversational tone)

Keep your response under 100 words. Return ONLY the response text, no additional formatting.`;

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional recruiter conducting a phone interview. Keep responses natural, conversational, and engaging.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8,
            max_tokens: 200
        });

        return response.choices[0]?.message?.content?.trim() || 
            "Thank you for that information. Can you tell me a bit more about your experience?";
    } catch (error) {
        console.error('Error generating AI response:', error);
        return "Thank you for that information. Can you tell me a bit more about your experience?";
    }
}

/**
 * Initialize Socket.io server
 */
function initializeSocket(server, corsOptions) {
    io = new Server(server, {
        cors: corsOptions,
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Handle employer connection - expects employerId in query
        socket.on('employer:connect', async (data) => {
            try {
                const { employerId } = data;
                
                if (!employerId) {
                    socket.emit('error', { message: 'Employer ID is required' });
                    return;
                }

                // Join employer room
                socket.join(`employer:${employerId}`);
                socket.employerId = employerId;
                
                console.log(`Employer ${employerId} connected, socket: ${socket.id}`);
                socket.emit('employer:connected', { 
                    success: true,
                    message: 'Connected to voice agent server'
                });
            } catch (error) {
                console.error('Employer connect error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Handle jobseeker connection - expects jobSeekerId
        socket.on('jobseeker:connect', (data = {}) => {
            const { jobSeekerId } = data;
            if (!jobSeekerId) {
                socket.emit('error', { message: 'JobSeeker ID is required' });
                return;
            }
            socket.join(`jobseeker:${jobSeekerId}`);
            socket.jobSeekerId = jobSeekerId;
            socket.emit('jobseeker:connected', { success: true });
            console.log(`JobSeeker ${jobSeekerId} connected, socket: ${socket.id}`);
        });

        // Handle candidate connection - expects sessionId and resumeId
        socket.on('candidate:connect', async (data) => {
            try {
                const { sessionId, resumeId } = data;
                
                if (!sessionId || !resumeId) {
                    socket.emit('error', { message: 'Session ID and Resume ID are required' });
                    return;
                }

                // Verify session and resume
                const session = await VoiceAgentSession.findById(sessionId);
                if (!session) {
                    socket.emit('error', { message: 'Session not found' });
                    return;
                }

                const resume = await AnalyzedResume.findById(resumeId);
                if (!resume || resume.sessionId.toString() !== sessionId) {
                    socket.emit('error', { message: 'Resume not found' });
                    return;
                }

                // Join candidate room
                socket.join(`candidate:${resumeId}`);
                socket.sessionId = sessionId;
                socket.resumeId = resumeId;
                
                console.log(`Candidate socket joined room: candidate:${resumeId}`);
                console.log(`Socket resumeId set to: ${socket.resumeId}`);
                console.log(`Socket sessionId set to: ${socket.sessionId}`);
                
                // Update resume connection status
                const resumeIndex = session.resumes.findIndex(
                    r => r.resumeId.toString() === resumeId
                );
                if (resumeIndex !== -1) {
                    session.resumes[resumeIndex].connectionStatus = 'connected';
                    session.resumes[resumeIndex].connectedAt = new Date();
                    await session.save();
                }

                // Notify employer
                io.to(`employer:${session.employerId}`).emit('candidate:connected', {
                    sessionId,
                    resumeId,
                    candidateName: resume.candidateName
                });

                console.log(`Candidate ${resumeId} connected for session ${sessionId}`);
                socket.emit('candidate:connected', { 
                    success: true,
                    message: 'Connected to voice agent',
                    sessionId,
                    resumeId
                });
            } catch (error) {
                console.error('Candidate connect error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Handle candidate ready to start conversation
        socket.on('candidate:ready', async (data) => {
            try {
                const { resumeId } = data;
                
                if (!socket.resumeId || socket.resumeId !== resumeId) {
                    socket.emit('error', { message: 'Invalid resume ID' });
                    return;
                }

                const session = await VoiceAgentSession.findById(socket.sessionId);
                if (!session) {
                    socket.emit('error', { message: 'Session not found' });
                    return;
                }

                // Update status
                const resumeIndex = session.resumes.findIndex(
                    r => r.resumeId.toString() === resumeId
                );
                if (resumeIndex !== -1) {
                    session.resumes[resumeIndex].connectionStatus = 'in_conversation';
                    session.resumes[resumeIndex].conversationStartedAt = new Date();
                    await session.save();
                }

                // Create conversation record
                const resume = await AnalyzedResume.findById(resumeId);
                const conversation = await VoiceAgentConversation.create({
                    sessionId: session._id,
                    resumeId: resumeId,
                    candidateName: resume.candidateName,
                    phoneNumber: resume.phoneNumber,
                    jobDescription: session.jobDescription,
                    status: 'in_progress',
                    startedAt: new Date(),
                    messages: []
                });

                // Notify employer
                io.to(`employer:${session.employerId}`).emit('conversation:started', {
                    sessionId: session._id,
                    resumeId,
                    conversationId: conversation._id,
                    candidateName: resume.candidateName
                });

                // Notify candidate - conversation can start
                socket.emit('conversation:ready', {
                    success: true,
                    conversationId: conversation._id,
                    message: 'Conversation ready to start'
                });

                console.log(`Conversation started for candidate ${resumeId}`);
            } catch (error) {
                console.error('Candidate ready error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Handle AI message (from employer side)
        socket.on('ai:message', async (data) => {
            try {
                const { conversationId, message, audioUrl } = data;
                
                if (!socket.resumeId) {
                    socket.emit('error', { message: 'Not connected as candidate' });
                    return;
                }

                const conversation = await VoiceAgentConversation.findById(conversationId);
                if (!conversation) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }

                // Add AI message
                conversation.messages.push({
                    speaker: 'ai',
                    message: message || '[Audio message]',
                    audioUrl: audioUrl,
                    timestamp: new Date()
                });
                await conversation.save();

                // Send to candidate
                // DO NOT send ai:speaking - use ai:text_complete for UI updates only
                // Audio comes from ai:audio_stream only
                io.to(`candidate:${socket.resumeId}`).emit('ai:text_complete', {
                    conversationId,
                    text: message
                });
            } catch (error) {
                console.error('AI message error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Handle candidate response
        socket.on('candidate:response', async (data) => {
            try {
                console.log('=== CANDIDATE RESPONSE RECEIVED ===');
                console.log('Full data:', JSON.stringify(data, null, 2));
                console.log('Socket ID:', socket.id);
                console.log('Socket resumeId:', socket.resumeId);
                console.log('Socket sessionId:', socket.sessionId);
                console.log('Socket rooms:', Array.from(socket.rooms));
                
                const { conversationId, message, audioUrl, resumeId } = data;
                
                // Use resumeId from data if socket.resumeId is not set
                const activeResumeId = socket.resumeId || resumeId;
                
                if (!conversationId) {
                    console.error('❌ No conversationId provided');
                    socket.emit('error', { message: 'Conversation ID is required' });
                    return;
                }

                if (!message || !message.trim()) {
                    console.error('❌ No message provided');
                    socket.emit('error', { message: 'Message is required' });
                    return;
                }
                
                if (!activeResumeId) {
                    console.error('❌ No resumeId available. Socket resumeId:', socket.resumeId, 'Data resumeId:', resumeId);
                    socket.emit('error', { message: 'Not connected as candidate. Please reconnect.' });
                    return;
                }

                console.log('🔍 Looking for conversation:', conversationId);
                console.log('ConversationId type:', typeof conversationId);
                console.log('Is valid ObjectId:', mongoose.Types.ObjectId.isValid(conversationId));
                
                // Validate conversationId format
                if (!mongoose.Types.ObjectId.isValid(conversationId)) {
                    console.error('❌ Invalid conversationId format:', conversationId);
                    socket.emit('error', { message: 'Invalid conversation ID format' });
                    return;
                }
                
                const conversation = await VoiceAgentConversation.findById(conversationId);
                if (!conversation) {
                    console.error('❌ Conversation not found:', conversationId);
                    // Try to find any conversations for debugging
                    const allConversations = await VoiceAgentConversation.find({}).limit(5).lean();
                    console.log('Sample conversations in DB:', allConversations.map(c => ({ id: c._id, resumeId: c.resumeId })));
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }
                
                console.log('✅ Conversation found:', conversation._id);
                console.log('Conversation resumeId:', conversation.resumeId);
                console.log('Conversation sessionId:', conversation.sessionId);
                console.log('Current messages count:', conversation.messages?.length || 0);

                console.log('💾 Saving candidate message to conversation');
                console.log('Message to save:', message.trim());

                // Add candidate message
                const candidateMessage = {
                    speaker: 'candidate',
                    message: message.trim(),
                    audioUrl: audioUrl || null,
                    timestamp: new Date()
                };
                
                conversation.messages.push(candidateMessage);
                const savedConversation = await conversation.save();
                console.log('✅ Candidate message saved to database');
                console.log('Total messages in conversation:', savedConversation.messages.length);
                console.log('Last message:', savedConversation.messages[savedConversation.messages.length - 1]);

                // Get session to notify employer
                const session = await VoiceAgentSession.findById(conversation.sessionId);
                if (!session) {
                    console.error('❌ Session not found for conversation:', conversation.sessionId);
                } else {
                    console.log('📤 Notifying employer:', session.employerId);
                    // Send to employer
                    io.to(`employer:${session.employerId}`).emit('candidate:responded', {
                        conversationId,
                        resumeId: activeResumeId,
                        message: message.trim(),
                        audioUrl
                    });
                }

                const provider = VOICE_AGENT_PROVIDER;
                
                // Murf provider: use text LLM + Murf TTS (streaming chunks, PCM-first fallback to MP3)
                if (provider === 'murf') {
                    try {
                        const aiText = await generateAIResponse({
                            conversationId,
                            candidateMessage: message.trim(),
                            jobDescription: conversation.jobDescription,
                            conversationHistory: conversation.messages
                        });

                        const responseId = `murf-${Date.now()}`;

                        if (aiText && aiText.trim()) {
                            // Save AI response
                            conversation.messages.push({
                                speaker: 'ai',
                                message: aiText.trim(),
                                timestamp: new Date()
                            });
                            await conversation.save();

                            // Send text to candidate UI
                            io.to(`candidate:${resumeId}`).emit('ai:text_complete', {
                                conversationId,
                                text: aiText.trim(),
                                responseId
                            });
                        }

                        // Convert text to speech via Murf (stream chunks, fallback to MP3 on failure)
                        await streamMurfAudio({
                            text: aiText,
                            resumeId,
                            conversationId,
                            responseId,
                            io
                        });

                        // Signal completion
                        io.to(`candidate:${resumeId}`).emit('ai:audio_complete', {
                            conversationId,
                            responseId
                        });
                        io.to(`candidate:${resumeId}`).emit('ai:response_complete', {
                            conversationId,
                            responseId
                        });
                    } catch (error) {
                        console.error('❌ Murf provider error:', error);
                        socket.emit('error', { 
                            message: 'Failed to generate response via Murf: ' + error.message 
                        });
                    }
                    return;
                }

                // Default: OpenAI Realtime provider
                console.log('🤖 Sending to OpenAI Realtime API...');
                console.log('Candidate message:', message.trim());
                
                try {
                    // Check if realtime connection exists
                    const realtimeWs = realtimeConnections.get(conversationId);
                    
                    if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
                        // Use Realtime API for streaming response
                        console.log('✅ Using Realtime API for streaming response');
                        openaiRealtimeService.sendTextInput(conversationId, message.trim());
                    } else {
                        // Realtime API not available - don't use fallback, wait for Realtime to connect
                        console.error('❌ Realtime API not available - cannot generate response');
                        socket.emit('error', { 
                            message: 'AI service is not available. Please wait for connection to be established.' 
                        });
                        // Don't use fallback - it causes wrong context
                        return;
                    }
                } catch (error) {
                    console.error('❌ Error generating AI response:', error);
                    console.error('Error stack:', error.stack);
                    // Send error to candidate
                    socket.emit('error', { 
                        message: 'Failed to generate AI response: ' + error.message 
                    });
                }

                // Send acknowledgment to candidate
                socket.emit('response:received', {
                    success: true,
                    conversationId,
                    message: 'Your response has been received and is being processed'
                });
                console.log('✅ Response processing complete');
                console.log('=== END CANDIDATE RESPONSE HANDLING ===');
            } catch (error) {
                console.error('❌ Candidate response handler error:', error);
                console.error('Error stack:', error.stack);
                socket.emit('error', { message: error.message });
            }
        });

        // Handle conversation start - use OpenAI Realtime API
        socket.on('conversation:start', async (data) => {
            try {
                const { conversationId, resumeId } = data;
                
                const conversation = await VoiceAgentConversation.findById(conversationId)
                    .populate({
                        path: 'sessionId',
                        populate: {
                            path: 'employerId',
                            select: 'fullName companyName'
                        }
                    });
                if (!conversation) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }

                const resume = await AnalyzedResume.findById(resumeId);
                if (!resume) {
                    socket.emit('error', { message: 'Resume not found' });
                    return;
                }

                // Get employer/recruiter name
                const populatedSession = conversation.sessionId;
                const employer = populatedSession?.employerId;
                const recruiterName = employer?.fullName || employer?.companyName || 'the recruiter';

                // Update status for the resume/session
                const session = await VoiceAgentSession.findById(conversation.sessionId._id || conversation.sessionId);
                const resumeIndex = session.resumes.findIndex(
                    r => r.resumeId.toString() === resumeId
                );
                if (resumeIndex !== -1) {
                    session.resumes[resumeIndex].connectionStatus = 'in_conversation';
                }
                await session.save();

                const provider = VOICE_AGENT_PROVIDER;

                // Murf provider: generate greeting text + stream TTS chunks (with PCM-first, MP3 fallback)
                if (provider === 'murf') {
                    try {
                        const greeting = await generateInitialGreeting({
                            candidateName: resume.candidateName || 'there',
                            jobDescription: conversation.jobDescription,
                            candidateInfo: {
                                yearsOfExperience: resume.yearsOfExperience,
                                experience: resume.experience,
                                skills: resume.skills || [],
                                currentRole: resume.currentRole,
                                currentCompany: resume.currentCompany,
                                education: resume.education
                            }
                        });

                        const responseId = `murf-${Date.now()}`;

                        // Save greeting to conversation
                        if (greeting) {
                            conversation.messages.push({
                                speaker: 'ai',
                                message: greeting.trim(),
                                timestamp: new Date()
                            });
                            await conversation.save();
                        }

                        // Emit text to candidate UI
                        io.to(`candidate:${resumeId}`).emit('ai:text_complete', {
                            conversationId,
                            text: greeting,
                            responseId
                        });

                        // Stream speech via Murf (chunked)
                        await streamMurfAudio({
                            text: greeting,
                            resumeId,
                            conversationId,
                            responseId,
                            io
                        });

                        io.to(`candidate:${resumeId}`).emit('ai:audio_complete', {
                            conversationId,
                            responseId
                        });
                        io.to(`candidate:${resumeId}`).emit('ai:response_complete', {
                            conversationId,
                            responseId
                        });
                    } catch (error) {
                        console.error('❌ Murf greeting error:', error);
                        socket.emit('error', { message: 'Failed to start conversation with Murf: ' + error.message });
                    }
                    return;
                }

                console.log('🚀 Starting OpenAI Realtime connection for conversation:', conversationId);

                // Create OpenAI Realtime connection with streaming callbacks
                const realtimeWs = await openaiRealtimeService.createRealtimeConnection(
                    conversationId,
                    {
                        candidateName: resume.candidateName || 'there',
                        jobDescription: conversation.jobDescription,
                        conversationHistory: conversation.messages,
                        recruiterName: recruiterName,
                        candidateInfo: {
                            yearsOfExperience: resume.yearsOfExperience,
                            experience: resume.experience,
                            skills: resume.skills || [],
                            currentRole: resume.currentRole,
                            currentCompany: resume.currentCompany,
                            education: resume.education
                        }
                    },
                    // Message handler for streaming responses
                    (realtimeMessage) => {
                        handleRealtimeMessage(realtimeMessage, conversationId, resumeId, socket, io);
                    }
                );

                // Store connection reference
                realtimeConnections.set(conversationId, realtimeWs);

                console.log('✅ Realtime connection established');

            } catch (error) {
                console.error('❌ Conversation start error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Language detection function - simple check for non-English characters
        function detectEnglish(text) {
            if (!text || !text.trim()) return true;
            
            // Common non-English patterns (using safe regex patterns)
            const nonEnglishPatterns = [
                /[¡¿]/g,  // Spanish inverted punctuation
                /[áéíóúñüÁÉÍÓÚÑÜ]/g,  // Spanish accented characters
                /[àèìòùÀÈÌÒÙ]/g,  // French/Italian accented characters
                /[äöüßÄÖÜ]/g,  // German characters
                /[çÇ]/g,  // French/Turkish
                /[ñÑ]/g,  // Spanish
                /[âêîôûÂÊÎÔÛ]/g,  // French accented
                /[ăâîșțĂÂÎȘȚ]/g,  // Romanian
                /[\u0370-\u03FF]/g,  // Greek (using Unicode range)
                /[\u0400-\u04FF]/g,  // Cyrillic (using Unicode range)
                /[\u4E00-\u9FFF]/g,  // Chinese (using Unicode range)
                /[\u3040-\u309F\u30A0-\u30FF]/g,  // Japanese (using Unicode range)
                /[\uAC00-\uD7AF]/g,  // Korean (using Unicode range)
                /[\u0900-\u097F]/g,  // Hindi/Devanagari (using Unicode range)
                /[\u0600-\u06FF]/g,  // Arabic (using Unicode range)
            ];
            
            // Check for non-English patterns
            for (const pattern of nonEnglishPatterns) {
                if (pattern.test(text)) {
                    return false;
                }
            }
            
            // Check for common non-English phrases
            const nonEnglishPhrases = [
                'hola', 'bonjour', 'guten tag', 'ciao', 'namaste', 
                'como estas', 'comment allez', 'wie geht', 'come stai',
                'buenos dias', 'buenas tardes', 'buenas noches',
                'como te va', 'que tal', 'comment ça va', 'wie geht es',
                'como estas hoy', 'bonjour comment allez'
            ];
            
            const lowerText = text.toLowerCase();
            for (const phrase of nonEnglishPhrases) {
                if (lowerText.includes(phrase)) {
                    return false;
                }
            }
            
            return true;
        }

        // Handle realtime API messages
        function handleRealtimeMessage(realtimeMessage, conversationId, resumeId, socket, io) {
            const { type, text, fullText, audio, error } = realtimeMessage;

            switch (type) {
                case 'text_delta':
                    // Stream text token by token - but check if accumulating text is English
                    if (text) {
                        // Check the full accumulated text for non-English
                        if (fullText && !detectEnglish(fullText)) {
                            console.warn('⚠️ Non-English text detected in stream, will reject on complete');
                            // Continue streaming but will reject on text_complete
                        }
                        io.to(`candidate:${resumeId}`).emit('ai:streaming', {
                            conversationId,
                            delta: text,
                            fullText: fullText,
                            responseId: realtimeMessage.responseId
                        });
                    }
                    break;

                case 'text_complete':
                    // Full text available - save to database
                    if (text && text.trim()) {
                        // Language detection - check if text is in English
                        const isEnglish = detectEnglish(text.trim());
                        
                        if (!isEnglish) {
                            console.error('❌ AI generated non-English text, rejecting:', text.trim());
                            // Send error to candidate
                            io.to(`candidate:${resumeId}`).emit('error', { 
                                message: 'AI response was not in English. Generating new response...' 
                            });
                            // Wait for current response to finish before requesting new one
                            // Store a flag to retry after current response completes
                            setTimeout(() => {
                                const realtimeWs = realtimeConnections.get(conversationId);
                                if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
                                    console.log('🔄 Requesting English-only response from AI (after delay)...');
                                    openaiRealtimeService.sendTextInput(conversationId, 
                                        'IMPORTANT: You must respond ONLY in English (US). Never use Spanish, French, or any other language. Use English greetings like "Hi" or "Hello", never "Hola" or "Bonjour".'
                                    );
                                }
                            }, 2000); // Wait 2 seconds for current response to complete
                            // Don't send non-English text to candidate
                            return;
                        }
                        
                        console.log('📝 Saving AI message to database (English verified):', text.trim());
                        VoiceAgentConversation.findById(conversationId).then(conversation => {
                            if (conversation) {
                                // Check if message already exists (prevent duplicates)
                                const lastMessage = conversation.messages[conversation.messages.length - 1];
                                if (!lastMessage || lastMessage.message !== text.trim() || lastMessage.speaker !== 'ai') {
                                    conversation.messages.push({
                                        speaker: 'ai',
                                        message: text.trim(),
                                        timestamp: new Date()
                                    });
                                    conversation.save().then(() => {
                                        console.log('✅ AI message saved to database');
                                    }).catch(err => {
                                        console.error('❌ Error saving AI message:', err);
                                    });
                                } else {
                                    console.log('⚠️ Duplicate message skipped');
                                }
                            }
                        }).catch(err => {
                            console.error('❌ Error finding conversation:', err);
                        });
                        
                        console.log('📤 Sending AI text to candidate (UI only, no audio):', text.trim());
                        // DO NOT send audio or speech triggers here.
                        // Only update UI with full text AFTER audio is complete.
                        io.to(`candidate:${resumeId}`).emit('ai:text_complete', {
                            conversationId,
                            text: text.trim(),
                            responseId: realtimeMessage.responseId
                        });
                    }
                    break;

                case 'audio_delta':
                    // Stream audio chunks with responseId and seq for proper ordering and deduplication
                    if (audio) {
                        io.to(`candidate:${resumeId}`).emit('ai:audio_stream', {
                            conversationId,
                            audio: audio,
                            responseId: realtimeMessage.responseId,
                            seq: realtimeMessage.seq,
                            audioFormat: 'pcm16',
                            sampleRate: 24000
                        });
                    }
                    break;

                case 'audio_complete':
                    // All audio chunks have been sent - now safe to signal completion
                    console.log('🔊 All audio sent, signaling audio complete');
                    io.to(`candidate:${resumeId}`).emit('ai:audio_complete', {
                        conversationId,
                        responseId: realtimeMessage.responseId
                    });
                    // Emit response_complete AFTER audio_complete (everything is done for this response)
                    io.to(`candidate:${resumeId}`).emit('ai:response_complete', {
                        conversationId,
                        responseId: realtimeMessage.responseId
                    });
                    break;

                case 'response_done':
                    // Response text is done, but audio might still be streaming
                    // Don't signal completion yet - wait for audio_complete
                    console.log('📝 Response text done, waiting for audio to complete');
                    // Do NOT emit response_complete here - wait for audio_complete
                    break;

                case 'error':
                    console.error('Realtime API error:', error);
                    socket.emit('error', { message: error?.message || 'Realtime API error' });
                    break;
            }
        }

        // Handle conversation end
        socket.on('conversation:end', async (data) => {
            try {
                const { conversationId } = data;
                
                const conversation = await VoiceAgentConversation.findById(conversationId);
                if (!conversation) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }

                conversation.status = 'completed';
                conversation.endedAt = new Date();
                if (conversation.startedAt) {
                    conversation.duration = Math.floor(
                        (conversation.endedAt - conversation.startedAt) / 1000
                    );
                }
                await conversation.save();

                // Update session
                const session = await VoiceAgentSession.findById(conversation.sessionId);
                const resumeIndex = session.resumes.findIndex(
                    r => r.resumeId.toString() === conversation.resumeId.toString()
                );
                if (resumeIndex !== -1) {
                    session.resumes[resumeIndex].status = 'completed';
                    session.resumes[resumeIndex].connectionStatus = 'ended';
                    session.resumes[resumeIndex].conversationEndedAt = new Date();
                    session.processedCandidates += 1;
                    await session.save();
                }

                // Notify both parties
                io.to(`employer:${session.employerId}`).emit('conversation:ended', {
                    conversationId,
                    resumeId: conversation.resumeId
                });
                
                socket.emit('conversation:ended', {
                    success: true,
                    conversationId
                });
            } catch (error) {
                console.error('Conversation end error:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // ==================== GENIE SOCKET HANDLERS ====================
        
        // Handle Genie session start
        socket.on('genie:start', async () => {
            try {
                const sessionId = `genie_${socket.id}_${Date.now()}`;
                socket.genieSessionId = sessionId;
                
                // Initialize session state
                genieSessions.set(sessionId, {
                    conversationState: 'asking_role',
                    currentRole: null,
                    yearsOfExperience: null,
                    preferredLocation: null
                });

                socket.emit('genie:started', {
                    success: true,
                    sessionId: sessionId
                });

                // Send initial greeting with streaming
                await sendStreamingGreeting(socket, sessionId);
            } catch (error) {
                console.error('Genie start error:', error);
                socket.emit('genie:error', {
                    error: error.message
                });
            }
        });

        // Helper function to send streaming greeting
        async function sendStreamingGreeting(socket, sessionId) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
                
                if (!GEMINI_API_KEY) {
                    throw new Error('GEMINI_API_KEY is required');
                }

                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ 
                    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
                });

                const prompt = `You are Genie, a helpful job search assistant. Greet the user and say: "Hi! I think you're looking for jobs. Tell me some details and I'll find the best jobs that suit you. What is your current role or the role you're looking for?" Keep it friendly and conversational, under 50 words.`;

                // Use streaming
                const result = await model.generateContentStream(prompt);
                let fullText = '';

                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    fullText += chunkText;
                    
                    // Emit each chunk character by character for real-time effect
                    for (let i = 0; i < chunkText.length; i++) {
                        socket.emit('genie:text_delta', {
                            text: chunkText[i],
                            sessionId: sessionId,
                            isComplete: false
                        });
                        // Small delay for character-by-character effect
                        await new Promise(resolve => setTimeout(resolve, 20));
                    }
                }

                socket.emit('genie:text_complete', {
                    sessionId: sessionId,
                    fullText: fullText
                });
            } catch (error) {
                console.error('Error sending streaming greeting:', error);
                socket.emit('genie:error', {
                    error: error.message
                });
            }
        }

        // Handle Genie message with streaming
        socket.on('genie:message', async (data) => {
            try {
                const { message, sessionId } = data;
                const sessionState = genieSessions.get(sessionId);

                if (!sessionState) {
                    socket.emit('genie:error', { error: 'Session not found' });
                    return;
                }

                // Extract information and update session state
                if (!sessionState.currentRole) {
                    const confirmations = /^(yes|yeah|yep|correct|that's right|that is right|right|ok|okay|sure)$/i;
                    if (!confirmations.test(message.trim())) {
                        let roleText = message.trim().toLowerCase();
                        roleText = roleText.replace(/^(i am|i'm|i want to be|looking for|role is|a |an |the )/i, '').trim();
                        if (roleText && roleText.length > 2 && !confirmations.test(roleText)) {
                            sessionState.currentRole = roleText.charAt(0).toUpperCase() + roleText.slice(1);
                            sessionState.conversationState = 'asking_experience';
                        }
                    }
                } else if (sessionState.yearsOfExperience === null) {
                    const yearsMatch = message.match(/(\d+)\s*(?:year|yr|years|yrs)?/i);
                    if (yearsMatch) {
                        sessionState.yearsOfExperience = parseInt(yearsMatch[1]);
                        sessionState.conversationState = 'asking_location';
                    } else if (message.match(/fresher|entry|beginner|no experience|0|zero/i)) {
                        sessionState.yearsOfExperience = 0;
                        sessionState.conversationState = 'asking_location';
                    }
                } else if (!sessionState.preferredLocation) {
                    const confirmations = /^(yes|yeah|yep|correct|that's right|that is right|right|ok|okay|sure)$/i;
                    if (!confirmations.test(message.trim())) {
                        sessionState.preferredLocation = message.trim();
                        sessionState.conversationState = 'done';
                    }
                }

                // Build context for Gemini
                let systemPrompt = `You are Genie, a helpful job search assistant. Your goal is to collect three pieces of information:
1. Current role or desired role
2. Years of experience
3. Preferred location

Current conversation state: ${sessionState.conversationState}.`;

                if (sessionState.currentRole) {
                    systemPrompt += `\nUser's role: ${sessionState.currentRole}.`;
                }
                if (sessionState.yearsOfExperience !== null) {
                    systemPrompt += `\nUser's years of experience: ${sessionState.yearsOfExperience}.`;
                }
                if (sessionState.preferredLocation) {
                    systemPrompt += `\nUser's preferred location: ${sessionState.preferredLocation}.`;
                }

                systemPrompt += `\n\nUser just said: "${message}".\n\n`;

                // Determine next question
                if (!sessionState.currentRole) {
                    systemPrompt += "Ask: 'What is your current role or the role you're looking for?'";
                } else if (sessionState.yearsOfExperience === null) {
                    systemPrompt += `Ask: 'How many years of experience do you have?'`;
                } else if (!sessionState.preferredLocation) {
                    systemPrompt += `Ask: 'What is your preferred location?'`;
                } else {
                    systemPrompt += `Say: 'Perfect! I have all the information I need. Let me search for jobs matching your preferences. [SEARCH_JOBS]'`;
                }

                systemPrompt += `\n\nKeep your response friendly, conversational, and under 60 words. DO NOT repeat the question if you already have the answer.`;

                // Send streaming response
                await sendStreamingResponse(socket, sessionId, systemPrompt, sessionState);

                genieSessions.set(sessionId, sessionState);

            } catch (error) {
                console.error('Genie message error:', error);
                socket.emit('genie:error', { error: error.message });
            }
        });

        // Helper function to send streaming response
        async function sendStreamingResponse(socket, sessionId, prompt, sessionState) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
                
                if (!GEMINI_API_KEY) {
                    throw new Error('GEMINI_API_KEY is required');
                }

                const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ 
                    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
                });

                // Use streaming
                const result = await model.generateContentStream(prompt);
                let fullText = '';

                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    fullText += chunkText;
                    
                    // Emit each chunk character by character for real-time effect
                    for (let i = 0; i < chunkText.length; i++) {
                        socket.emit('genie:text_delta', {
                            text: chunkText[i],
                            sessionId: sessionId,
                            isComplete: false
                        });
                        // Small delay for character-by-character effect (10ms = faster, 20ms = moderate)
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                }

                socket.emit('genie:text_complete', {
                    sessionId: sessionId,
                    fullText: fullText,
                    conversationState: sessionState.conversationState,
                    currentRole: sessionState.currentRole,
                    yearsOfExperience: sessionState.yearsOfExperience,
                    preferredLocation: sessionState.preferredLocation,
                    readyToSearch: fullText.includes('[SEARCH_JOBS]')
                });
            } catch (error) {
                console.error('Error sending streaming response:', error);
                socket.emit('genie:error', {
                    error: error.message
                });
            }
        }

        // Handle Genie disconnect
        socket.on('genie:disconnect', () => {
            if (socket.genieSessionId) {
                geminiRealtimeService.closeConnection(socket.genieSessionId);
                genieSessions.delete(socket.genieSessionId);
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            // Cleanup Genie session
            if (socket.genieSessionId) {
                geminiRealtimeService.closeConnection(socket.genieSessionId);
                genieSessions.delete(socket.genieSessionId);
            }
        });
    });

    return io;
}

/**
 * Get Socket.io instance
 */
function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized. Call initializeSocket first.');
    }
    return io;
}

module.exports = {
    initializeSocket,
    getIO
};

