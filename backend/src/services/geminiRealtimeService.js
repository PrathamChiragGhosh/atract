const WebSocket = require('ws');

/**
 * Gemini Realtime API Service
 * Handles real-time streaming conversations using WebSocket
 * Uses Gemini Realtime API: wss://generativelanguage.googleapis.com/v1beta/realtime?key=API_KEY
 */
class GeminiRealtimeService {
    constructor() {
        this.connections = new Map(); // Map of sessionId -> WebSocket connection
    }

    /**
     * Create a realtime WebSocket connection for Genie
     * @param {string} sessionId - Session ID
     * @param {Object} config - Configuration (conversation state, currentRole, etc.)
     * @param {Function} onMessage - Callback for streaming messages
     * @returns {Promise<WebSocket>} WebSocket connection
     */
    async createRealtimeConnection(sessionId, config = {}, onMessage = null) {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is required for Gemini Realtime API');
        }

        const wsUrl = `wss://generativelanguage.googleapis.com/v1beta/realtime?key=${GEMINI_API_KEY}`;

        const ws = new WebSocket(wsUrl);

        return new Promise((resolve, reject) => {
            ws.on('open', () => {
                // Initialize the session
                const sessionConfig = {
                    setup: {
                        model: "models/gemini-2.0-flash-exp",
                        generation_config: {
                            response_modalities: ["text"],
                            speech_config: {
                                voice_config: {
                                    prebuilt_voice_config: {
                                        voice_name: "Aoede"
                                    }
                                }
                            }
                        },
                        system_instruction: {
                            parts: [{
                                text: `You are Genie, a helpful job search assistant. Your goal is to collect three pieces of information:
1. Current role or desired role
2. Years of experience
3. Preferred location

Be friendly and conversational. Keep responses concise (under 60 words).`
                            }]
                        }
                    }
                };

                ws.send(JSON.stringify(sessionConfig));
                resolve(ws);
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message, sessionId, config, onMessage);
                } catch (error) {
                    console.error('Error parsing Gemini message:', error);
                    if (onMessage) {
                        onMessage({
                            type: 'error',
                            error: error.message
                        });
                    }
                }
            });

            ws.on('error', (error) => {
                console.error(`❌ Gemini Realtime WebSocket error for ${sessionId}:`, error);
                if (onMessage) {
                    onMessage({
                        type: 'error',
                        error: error.message
                    });
                }
                reject(error);
            });

            ws.on('close', () => {
                this.connections.delete(sessionId);
            });

            // Store connection
            this.connections.set(sessionId, ws);
        });
    }

    /**
     * Handle incoming messages from Gemini Realtime API
     */
    handleMessage(message, sessionId, config, onMessage) {
        if (!onMessage) return;

        // Handle different message types
        if (message.serverContent) {
            // Streaming server content
            if (message.serverContent.modelTurn) {
                const modelTurn = message.serverContent.modelTurn;
                if (modelTurn.parts) {
                    modelTurn.parts.forEach(part => {
                        if (part.text) {
                            // Stream text character by character or word by word
                            onMessage({
                                type: 'text_delta',
                                text: part.text,
                                isComplete: false
                            });
                        }
                    });
                }
            }

            // Check if turn is complete
            if (message.serverContent.modelTurnComplete) {
                onMessage({
                    type: 'text_complete',
                    isComplete: true
                });
            }
        }

        // Handle error messages
        if (message.error) {
            onMessage({
                type: 'error',
                error: message.error.message || message.error
            });
        }

        // Handle setup complete
        if (message.setupComplete) {
            onMessage({
                type: 'setup_complete',
                isComplete: true
            });
        }
    }

    /**
     * Send text input to Gemini Realtime API
     */
    sendTextInput(sessionId, text) {
        const ws = this.connections.get(sessionId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error(`WebSocket not available for session: ${sessionId}`);
            return false;
        }

        try {
            const request = {
                addBlock: {
                    inline_data: {
                        mime_type: "text/plain",
                        data: Buffer.from(text).toString('base64')
                    }
                }
            };

            ws.send(JSON.stringify(request));

            // Trigger generation
            const generateRequest = {
                generateContent: {}
            };

            ws.send(JSON.stringify(generateRequest));
            return true;
        } catch (error) {
            console.error(`Error sending text to Gemini for session ${sessionId}:`, error);
            return false;
        }
    }

    /**
     * Close a connection
     */
    closeConnection(sessionId) {
        const ws = this.connections.get(sessionId);
        if (ws) {
            ws.close();
            this.connections.delete(sessionId);
        }
    }

    /**
     * Get connection status
     */
    isConnected(sessionId) {
        const ws = this.connections.get(sessionId);
        return ws && ws.readyState === WebSocket.OPEN;
    }
}

module.exports = new GeminiRealtimeService();

