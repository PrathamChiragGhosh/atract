"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";
import "./page.css";

const VoiceAgentCandidatePage = () => {
    const params = useParams();
    const resumeId = params?.resumeId;
    const [sessionId, setSessionId] = useState(null);
    const [connected, setConnected] = useState(false);
    const [conversationReady, setConversationReady] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [status, setStatus] = useState("waiting");
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechDetected, setSpeechDetected] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [speechSupported, setSpeechSupported] = useState(false);
    const [manualInput, setManualInput] = useState("");
    const [useManualInput, setUseManualInput] = useState(false);
    
    // Refs for speech recognition
    const recognitionRef = useRef(null);
    const silenceTimeoutRef = useRef(null);
    const isProcessingRef = useRef(false);
    const finalTranscriptRef = useRef("");
    const conversationReadyRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const isRecognitionActiveRef = useRef(false);
    const streamingTextRef = useRef("");
    const conversationIdRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioQueueRef = useRef([]);
    const isPlayingAudioRef = useRef(false);
    const audioChunksReceivedRef = useRef(false); // Track if any audio chunks were received
    
    // New refs for responseId and sequence tracking
    const currentResponseIdRef = useRef(null);
    const expectedSeqRef = useRef(0);
    const audioBuffersByResponseRef = useRef(new Map()); // responseId -> { pending: Map(seq -> base64), nextSeqToPlay, lastChunkPlaying: Promise, audioComplete: boolean, isCompleting: boolean }
    const dedupeSetRef = useRef(new Set()); // set of `${responseId}:${seq}`
    // Minimum delay before playing chunks to prevent cutting
    const MIN_PLAY_DELAY = 50; // Reduced to 50ms for more responsive, less laggy playback

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";

    // Initialize AudioContext for OpenAI Realtime audio
    useEffect(() => {
        // Match OpenAI Realtime's 24kHz sample rate - no resampling needed
        // Chrome respects 24kHz, eliminating distortion and robotic voice
        if (typeof window !== 'undefined') {
            try {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 24000   // 🔥 MATCH OPENAI REALTIME AUDIO RATE
                });
                const actualRate = audioContextRef.current.sampleRate;
                console.log("🎧 AudioContext initialized @", actualRate, "Hz");
                if (actualRate !== 24000) {
                    console.warn(`⚠️ AudioContext sample rate is ${actualRate}Hz (expected 24kHz). Resampling will be used as fallback.`);
                }
            } catch (error) {
                console.error('❌ Failed to initialize AudioContext:', error);
            }
        }
    }, []);

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setSpeechSupported(true);
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true; // Enable interim results for visual feedback
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                console.log('Speech recognition started');
                setIsListening(true);
                isRecognitionActiveRef.current = true;
                setSpeechDetected(false);
                finalTranscriptRef.current = "";
                setInterimTranscript("");
            };


            recognitionRef.current.onresult = (event) => {
                let interim = '';
                let final = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        final += transcript + ' ';
                        setSpeechDetected(true);
                    } else {
                        interim += transcript;
                    }
                }

                finalTranscriptRef.current += final;
                setInterimTranscript(interim);

                // Clear silence timeout when speech is detected
                if (silenceTimeoutRef.current) {
                    clearTimeout(silenceTimeoutRef.current);
                }

                // If we have final results and not processing, prepare to send
                if (final.trim() && !isProcessingRef.current) {
                    const fullTranscript = (finalTranscriptRef.current + interim).trim();
                    if (fullTranscript) {
                        // Set timeout to send after silence (user finished speaking)
                        silenceTimeoutRef.current = setTimeout(() => {
                            const activeConversationId = conversationIdRef.current || conversationId;
                            if (!isProcessingRef.current && fullTranscript.trim() && activeConversationId) {
                                console.log('Sending transcript after silence:', fullTranscript);
                                console.log('ConversationId available:', activeConversationId);
                                handleSendResponse(fullTranscript);
                                isProcessingRef.current = true;
                                finalTranscriptRef.current = "";
                                setInterimTranscript("");
                            } else {
                                console.warn('Cannot send - missing conversationId or already processing');
                                console.log('isProcessingRef:', isProcessingRef.current);
                                console.log('conversationId (state):', conversationId);
                                console.log('conversationId (ref):', conversationIdRef.current);
                            }
                        }, 800); // 0.8 seconds of silence = user finished speaking (faster response)
                    }
                }
            };

            recognitionRef.current.onend = () => {
                console.log('Speech recognition ended');
                isRecognitionActiveRef.current = false;
                setIsListening(false);
                setSpeechDetected(false);
                setInterimTranscript("");
                
                // DO NOT restart here - mic will restart ONLY when audio finishes playing
                // This prevents mic from capturing AI voice and causing false triggers
            };

            recognitionRef.current.onerror = (event) => {
                const errorType = event.error;
                
                if (errorType === 'no-speech') {
                    // This is normal - user didn't speak yet
                    console.log('No speech detected yet, continuing to listen...');
                    isRecognitionActiveRef.current = false;
                    setIsListening(false);
                    
                    // DO NOT restart here - mic will restart ONLY when audio finishes playing
                    // This prevents mic from capturing AI voice and causing false triggers
                    return; // Don't show error for no-speech
                }
                
                if (errorType === 'not-allowed') {
                    console.error('Microphone permission denied');
                    toast.error('Microphone permission denied. Please enable microphone access.');
                    setUseManualInput(true);
                    setIsListening(false);
                    isRecognitionActiveRef.current = false;
                } else if (errorType === 'aborted') {
                    // Aborted is normal when we stop/restart, ignore
                    console.log('Speech recognition aborted (normal)');
                    isRecognitionActiveRef.current = false;
                } else if (errorType === 'network') {
                    // Network error - handle gracefully and try to restart after a delay
                    console.warn('Speech recognition network error - will retry in 2 seconds');
                    setIsListening(false);
                    setSpeechDetected(false);
                    setInterimTranscript("");
                    isRecognitionActiveRef.current = false;
                    
                    // Retry after a delay if conversation is still active
                    setTimeout(() => {
                        if (conversationReadyRef.current && recognitionRef.current && !isRecognitionActiveRef.current && !isSpeakingRef.current) {
                            try {
                                recognitionRef.current.start();
                                isRecognitionActiveRef.current = true;
                                setIsListening(true);
                                console.log('✅ Speech recognition restarted after network error');
                            } catch (e) {
                                console.error('Failed to restart speech recognition after network error:', e);
                            }
                        }
                    }, 2000);
                } else {
                    // Other errors - log but don't spam console
                    if (errorType !== 'not-allowed' && errorType !== 'service-not-allowed') {
                        console.warn('Speech recognition error:', errorType, '- will retry when AI finishes speaking');
                    }
                    setIsListening(false);
                    setSpeechDetected(false);
                    setInterimTranscript("");
                    isRecognitionActiveRef.current = false;
                    
                    // DO NOT restart here - mic will restart ONLY when audio finishes playing
                    // This prevents mic from capturing AI voice and causing false triggers
                }
            };
        } else {
            setSpeechSupported(false);
            setUseManualInput(true);
            console.warn('Speech recognition not supported in this browser');
        }
    }, []);

    const socketInitializedRef = useRef(false);
    
    useEffect(() => {
        if (!resumeId) return;
        
        // Prevent duplicate initialization
        if (socketInitializedRef.current) {
            console.log('Socket already initialized, skipping...');
            return;
        }
        
        socketInitializedRef.current = true;
        
        // Clear any existing socket connection first
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.close();
            socketRef.current = null;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const sessionIdParam = urlParams.get("sessionId");
        if (sessionIdParam) {
            setSessionId(sessionIdParam);
        }

        const newSocket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
        });

        newSocket.on("connect", () => {
            console.log("Socket connected");
            if (sessionIdParam && resumeId) {
                newSocket.emit("candidate:connect", {
                    sessionId: sessionIdParam,
                    resumeId: resumeId,
                });
            }
        });

        newSocket.on("candidate:connected", (data) => {
            console.log("Candidate connected:", data);
            setConnected(true);
            setStatus("connected");
            if (data.sessionId) setSessionId(data.sessionId);
        });

        newSocket.on("conversation:ready", async (data) => {
            console.log("Conversation ready:", data);
            setConversationReady(true);
            conversationReadyRef.current = true;
            setConversationId(data.conversationId);
            conversationIdRef.current = data.conversationId;
            setStatus("in_conversation");
            
            // Automatically start conversation and request initial greeting
            newSocket.emit("conversation:start", { 
                conversationId: data.conversationId,
                resumeId: resumeId 
            });
            
            // Start continuous listening after a short delay
            setTimeout(() => {
                if (speechSupported && !useManualInput) {
                    startContinuousListening();
                }
            }, 1000);
        });

        // Handle streaming text from OpenAI Realtime API (token by token)
        newSocket.on("ai:streaming", (data) => {
            console.log("AI streaming:", data);
            const { delta, fullText } = data;
            
            if (delta) {
                streamingTextRef.current = fullText;
                
                // Update the last message or create new one
                setMessages((prev) => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage && lastMessage.speaker === "ai" && lastMessage.isStreaming) {
                        // Update existing streaming message
                        return [
                            ...prev.slice(0, -1),
                            { ...lastMessage, message: fullText, timestamp: new Date() }
                        ];
                    } else {
                        // Create new streaming message
                        return [
                            ...prev,
                            { speaker: "ai", message: fullText, isStreaming: true, timestamp: new Date() }
                        ];
                    }
                });

                // Don't start speaking during streaming - wait for complete text or use audio stream
                // This prevents interruptions and noise
            }
        });

        // Handle complete text response from Realtime API - UI UPDATE ONLY, NO AUDIO
        // Audio comes ONLY from ai:audio_stream event
        newSocket.on("ai:text_complete", (data) => {
            const msg = data.text?.trim() || data.message?.trim();
            if (!msg) return;

            console.log("AI text complete (UI only):", msg);
            
            // Reset processing flag so user can respond after AI speaks
            isProcessingRef.current = false;
            streamingTextRef.current = "";

            // Only update UI, do NOT play any audio here
            setMessages((prev) => {
                // Check if last message is the same (avoid duplicates)
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.speaker === "ai" && lastMessage.message === msg) {
                    console.log('Duplicate message detected, skipping');
                    return prev;
                }
                
                // Update streaming message or add new one
                if (lastMessage && lastMessage.speaker === "ai" && lastMessage.isStreaming) {
                    return [
                        ...prev.slice(0, -1),
                        { speaker: "ai", message: msg, timestamp: new Date() }
                    ];
                } else {
                    return [
                        ...prev,
                        { speaker: "ai", message: msg, timestamp: new Date() },
                    ];
                }
            });

            // Reset audio chunks received flag for this message
            audioChunksReceivedRef.current = false;
        });

        // Helper: decode base64 to Int16Array
        function base64ToInt16Array(b64) {
            const binary = atob(b64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
            const samples = new Int16Array(len / 2);
            for (let i = 0, j = 0; i < len; i += 2, j++) {
                // little-endian
                const v = (bytes[i]) | (bytes[i + 1] << 8);
                samples[j] = v > 32767 ? v - 65536 : v;
            }
            return samples;
        }

        // Helper: decode base64 to ArrayBuffer (for compressed formats like mp3)
        function base64ToArrayBuffer(b64) {
            const binary = atob(b64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
            return bytes.buffer;
        }

        // Merge and decode compressed chunks once all chunks have arrived
        async function decodeAndPlayCompressed(responseId) {
            const store = audioBuffersByResponseRef.current.get(responseId);
            if (!store || store.format === 'pcm16') return;

            const chunks = Array.from(store.compressedChunks.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([, b64]) => new Uint8Array(base64ToArrayBuffer(b64)));

            if (chunks.length === 0) return;

            const totalLength = chunks.reduce((sum, arr) => sum + arr.length, 0);
            const merged = new Uint8Array(totalLength);
            let offset = 0;
            for (const arr of chunks) {
                merged.set(arr, offset);
                offset += arr.length;
            }

            try {
                const audioBuffer = await audioContextRef.current.decodeAudioData(merged.buffer);
                store.compressedChunks.clear();
                setIsSpeaking(true);
                isSpeakingRef.current = true;
                await playAudioBuffer(audioBuffer, true);
            } catch (err) {
                console.error("Unable to decode compressed audio data:", err);
            }
        }

        // Helper: normalize audio chunk payloads (supports legacy string or object with format)
        function normalizeAudioChunk(chunk) {
            if (!chunk) {
                return { audioBase64: null, audioFormat: 'pcm16', sampleRate: 24000 };
            }
            if (typeof chunk === 'string') {
                return { audioBase64: chunk, audioFormat: 'pcm16', sampleRate: 24000 };
            }
            const { audioBase64, audioFormat, sampleRate } = chunk;
            return {
                audioBase64: audioBase64 || null,
                audioFormat: (audioFormat || 'pcm16').toLowerCase(),
                sampleRate: sampleRate || 24000
            };
        }

        // Helper: convert Int16Array to AudioBuffer (with fallback resampling if needed)
        async function int16ToAudioBuffer(int16Arr) {
            const ac = audioContextRef.current;
            if (!ac) throw new Error("No AudioContext");

            // Convert Int16Array -> Float32Array with clamping to prevent clipping
            const float32 = new Float32Array(int16Arr.length);
            for (let i = 0; i < int16Arr.length; i++) {
                float32[i] = Math.max(-1, Math.min(1, int16Arr[i] / 32768));
            }

            // If AudioContext is exactly 24kHz, create buffer directly (no resampling)
            if (ac.sampleRate === 24000) {
                const audioBuffer = ac.createBuffer(1, float32.length, 24000);
                audioBuffer.getChannelData(0).set(float32);
                return audioBuffer;
            }

            // Fallback: resample from 24kHz to AudioContext sample rate using OfflineAudioContext
            console.warn(`⚠️ AudioContext sample rate is ${ac.sampleRate}Hz (expected 24kHz), resampling...`);
            const offlineCtx = new OfflineAudioContext(
                1, 
                Math.ceil(float32.length * (ac.sampleRate / 24000)), 
                ac.sampleRate
            );
            const buffer = offlineCtx.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);
            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(offlineCtx.destination);
            source.start(0);
            const rendered = await offlineCtx.startRendering();
            return rendered;
        }

        // Helper: play AudioBuffer with gain smoothing and noise reduction
        async function playAudioBuffer(audioBuffer, isLastChunk = false) {
            if (!audioContextRef.current) return;
            const ac = audioContextRef.current;
            await ac.resume().catch(()=>{});
            const source = ac.createBufferSource();
            source.buffer = audioBuffer;
            
            // Create audio processing chain for clearer voice
            const gainNode = ac.createGain();
            const duration = audioBuffer.duration;
            const now = ac.currentTime;
            
            // Subtle high-pass filter to reduce only very low-frequency noise (preserves natural voice)
            const highPassFilter = ac.createBiquadFilter();
            highPassFilter.type = 'highpass';
            highPassFilter.frequency.value = 60; // Lower cutoff (60Hz) to preserve natural voice warmth
            highPassFilter.Q.value = 0.7; // Gentler Q for more natural sound
            
            // Gentle compression for natural dynamics (not aggressive)
            const compressor = ac.createDynamicsCompressor();
            compressor.threshold.value = -30; // Lower threshold for gentler compression
            compressor.knee.value = 20; // Softer knee
            compressor.ratio.value = 4; // Lower ratio (4:1) for more natural dynamics
            compressor.attack.value = 0.01; // Slower attack for natural transients
            compressor.release.value = 0.3; // Longer release for natural decay
            
            // Subtle EQ to enhance voice clarity (presence boost)
            const eq = ac.createBiquadFilter();
            eq.type = 'peaking';
            eq.frequency.value = 3000; // Boost around 3kHz for voice clarity
            eq.gain.value = 2; // Subtle 2dB boost
            eq.Q.value = 1;
            
            // Natural gain ramp up at start (5ms) - very minimal for immediate, natural playback
            gainNode.gain.setValueAtTime(0.0001, now);
            gainNode.gain.exponentialRampToValueAtTime(1.0, now + 0.005); // Natural volume level
            
            // DO NOT ramp down at end - this was cutting off the last 30ms of audio
            // Keep full volume until the very end to ensure complete playback
            gainNode.gain.setValueAtTime(1.0, now + 0.005);
            
            // Connect audio processing chain: source -> highpass -> eq -> compressor -> gain -> destination
            // This preserves natural voice characteristics while enhancing clarity
            source.connect(highPassFilter);
            highPassFilter.connect(eq);
            eq.connect(compressor);
            compressor.connect(gainNode);
            gainNode.connect(ac.destination);

            return new Promise((resolve, reject) => {
                source.onended = () => {
                    // Immediate resolution for last chunk - onended already means audio finished
                    // Minimal delay just for hardware pipeline (reduced to absolute minimum)
                    if (isLastChunk) {
                        // Very minimal buffer - just 50ms for hardware to finish
                        setTimeout(() => resolve(), 50);
                    } else {
                        resolve();
                    }
                };
                try {
                    source.start();
                } catch (e) {
                    reject(e);
                }
            });
        }

        // Helper: play contiguous sequences for a responseId
        async function playPendingSequences(responseId) {
            const store = audioBuffersByResponseRef.current.get(responseId);
            if (!store) {
                console.warn("⚠️ No store found for responseId:", responseId);
                return;
            }

            // If next expected chunk is missing, just return
            // The ai:audio_stream handler will call this again when the chunk arrives
            if (!store.pending.has(store.nextSeqToPlay)) {
                // Only log if there are actually pending chunks (not just waiting for next one)
                if (store.pending.size > 0) {
                    // Reduce log spam - only log every 10th check or if chunks are significantly out of order
                    const pendingSeqs = Array.from(store.pending.keys()).sort((a, b) => a - b);
                    const minPending = Math.min(...pendingSeqs);
                    if (minPending < store.nextSeqToPlay - 5 || store.pending.size % 10 === 0) {
                        console.log(`⏳ Waiting for chunk seq=${store.nextSeqToPlay}, pending chunks:`, pendingSeqs);
                    }
                }
                return;
            }

            // Only apply delay for the first chunk in a sequence
            // Subsequent chunks play immediately after the previous one finishes
            const isFirstChunk = store.nextSeqToPlay === 0 || !store.pending.has(store.nextSeqToPlay - 1);
            if (isFirstChunk) {
                await new Promise(res => setTimeout(res, MIN_PLAY_DELAY));
            }

            let chunksPlayed = 0;
            // attempt to play contiguous sequences starting from nextSeqToPlay
            while (store.pending.has(store.nextSeqToPlay)) {
                const currentSeq = store.nextSeqToPlay;
                const chunk = store.pending.get(currentSeq);
                store.pending.delete(currentSeq);
                
                // Check if this is the last chunk
                // It's the last chunk if:
                // 1. No more pending chunks after we delete this one, AND
                // 2. We've received audio_complete signal (all chunks sent from backend)
                // OR if we're in response_complete handler and this is the last pending chunk
                // This ensures we mark the last chunk even if audio_complete arrives late
                const isLastChunk = store.pending.size === 0 && (store.audioComplete || store.isCompleting);

                const { audioBase64, audioFormat } = normalizeAudioChunk(chunk);
                if (!audioBase64) {
                    console.warn(`⚠️ Missing audio data for seq=${currentSeq}`);
                    store.nextSeqToPlay = currentSeq + 1;
                    continue;
                }

                try {
                    console.log(`▶️ Playing chunk seq=${currentSeq}, remaining in pending:`, store.pending.size, isLastChunk ? '(LAST CHUNK)' : '');

                    let audioBuffer;
                    const format = (audioFormat || 'pcm16').toLowerCase();

                    if (format === 'mp3' || format === 'audio/mpeg' || format === 'mpeg' || format === 'mp4' || format === 'aac') {
                        const arrayBuffer = base64ToArrayBuffer(audioBase64);
                        audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                    } else {
                        const int16 = base64ToInt16Array(audioBase64);
                        audioBuffer = await int16ToAudioBuffer(int16);
                    }
                    setIsSpeaking(true);
                    isSpeakingRef.current = true;
                    // Play and await end - this ensures chunks play sequentially
                    // Pass isLastChunk flag to add extra padding for hardware playback
                    const playPromise = playAudioBuffer(audioBuffer, isLastChunk);
                    
                    // If this is the last chunk, store the promise so we can wait for it in response_complete
                    if (isLastChunk) {
                        store.lastChunkPlaying = playPromise;
                        console.log("📌 Last chunk promise stored, will wait for completion in response_complete");
                    }
                    
                    // Always await to ensure sequential playback
                    await playPromise;
                    chunksPlayed++;
                    console.log(`✅ Chunk seq=${currentSeq} finished playing${isLastChunk ? ' (LAST CHUNK)' : ''}`);
                } catch (err) {
                    console.error(`❌ Error decoding/playing chunk seq=${currentSeq}:`, err);
                    // Even on error, increment to avoid getting stuck
                }

                // Increment AFTER successful playback (or error) to move to next chunk
                store.nextSeqToPlay = currentSeq + 1;
            }
            
            if (chunksPlayed > 0) {
                console.log(`✅ Finished playing ${chunksPlayed} chunk(s) for responseId: ${responseId}, nextSeqToPlay: ${store.nextSeqToPlay}`);
            }
        }
        
        // Handle streaming audio from OpenAI Realtime API (high-quality human-like voice)
        // Robust queue/order/dedupe/resample + stop mic
        newSocket.on("ai:audio_stream", async (data) => {
            console.log("🔊 ai:audio_stream received", { 
                hasAudio: !!data?.audio, 
                responseId: data?.responseId, 
                seq: data?.seq,
                audioLength: data?.audio?.length 
            });
            
            if (!data || !data.audio) {
                console.warn("⚠️ ai:audio_stream missing data or audio");
                return;
            }
            const { audio: audioBase64, responseId, seq, audioFormat, sampleRate } = data;

            // require responseId/seq
            if (!responseId || typeof seq === "undefined") {
                console.warn("⚠️ ai:audio_stream missing responseId/seq - discarding", { responseId, seq });
                return;
            }

            // Dedupe by responseId+seq
            const dedupeKey = `${responseId}:${seq}`;
            if (dedupeSetRef.current.has(dedupeKey)) {
                console.log("Duplicate audio chunk skipped", dedupeKey);
                return;
            }
            dedupeSetRef.current.add(dedupeKey);

            // If a new response started, clean up old response and reset queue state
            if (currentResponseIdRef.current !== responseId) {
                const oldResponseId = currentResponseIdRef.current;
                console.log("New response started:", responseId, "old:", oldResponseId);
                
                // Clean up old response store if it exists
                if (oldResponseId && audioBuffersByResponseRef.current.has(oldResponseId)) {
                    console.log(`🧹 Cleaning up old response store: ${oldResponseId}`);
                    audioBuffersByResponseRef.current.delete(oldResponseId);
                }
                
                // Clean up dedupe entries for old response (keep only current response)
                if (oldResponseId) {
                    const keysToDelete = [];
                    for (const key of dedupeSetRef.current) {
                        if (key.startsWith(`${oldResponseId}:`)) {
                            keysToDelete.push(key);
                        }
                    }
                    keysToDelete.forEach(key => dedupeSetRef.current.delete(key));
                    if (keysToDelete.length > 0) {
                        console.log(`🧹 Cleaned up ${keysToDelete.length} dedupe entries for old response`);
                    }
                }
                
                // stop any ongoing playback queue
                audioQueueRef.current = [];

                // initialize per-response storage
                audioBuffersByResponseRef.current.set(responseId, {
                    pending: new Map(),
                    nextSeqToPlay: 0,
                    lastChunkPlaying: null, // Promise that resolves when last chunk finishes
                    audioComplete: false, // Track when all audio chunks have been sent from backend
                    isCompleting: false, // Track when response_complete has been received
                    format: 'pcm16',
                    sampleRate: 24000,
                    compressedChunks: new Map() // For compressed formats (mp3)
                });

                currentResponseIdRef.current = responseId;
                expectedSeqRef.current = 0;
            }

            // store pending chunk
            const responseStore = audioBuffersByResponseRef.current.get(responseId);
            if (!responseStore) return;

            const fmt = (audioFormat || 'pcm16').toLowerCase();
            responseStore.format = fmt; // Always update to the latest format from backend
            responseStore.sampleRate = sampleRate || responseStore.sampleRate || 24000;

            if (fmt !== 'pcm16') {
                // For compressed formats (e.g., mp3), store chunks; decode once on audio_complete
                responseStore.compressedChunks.set(seq, audioBase64);
            } else {
                // PCM16 path: store chunk for immediate ordered playback
                responseStore.pending.set(seq, {
                    audioBase64,
                    audioFormat: fmt,
                    sampleRate: responseStore.sampleRate
                });
            }

            // Immediately abort speech recognition to avoid capturing AI output
            // abort() is instant and reliable, stop() waits for speech-to-end causing overlap
            if (recognitionRef.current) {
                try { 
                    recognitionRef.current.abort(); 
                } catch (e) {}
                isRecognitionActiveRef.current = false;
                setIsListening(false);
            }
            
            // Clear any silence timeout to prevent "send after silence" from firing while AI is speaking
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }

            // Clear processing flag immediately when audio starts
            isProcessingRef.current = false;
            audioChunksReceivedRef.current = true;

            // For PCM16, play immediately; for compressed we wait for audio_complete
            if (responseStore.format === 'pcm16') {
                playPendingSequences(responseId).catch(err => {
                    console.error("Error playing sequences:", err);
                });
            }
        });

        // Handle audio complete (all audio chunks sent from backend)
        newSocket.on("ai:audio_complete", (data) => {
            const { responseId } = data || {};
            console.log("✅ ai:audio_complete received for responseId:", responseId);
            // Mark that all audio chunks have been sent for this response
            const store = audioBuffersByResponseRef.current.get(responseId);
            if (store) {
                store.audioComplete = true;
                console.log(`✅ All audio chunks sent for responseId: ${responseId}, pending chunks: ${store.pending.size}`);
                
                // For compressed formats (e.g., mp3), decode the full concatenated buffer once
                if (store.format !== 'pcm16') {
                // Decode merged compressed audio once all chunks have arrived (mp3)
                decodeAndPlayCompressed(responseId);
                }

                // For PCM16, try to play any pending chunks now that we know all have been sent
                if (store.format === 'pcm16') {
                    playPendingSequences(responseId).catch(err => {
                        console.error("Error playing sequences after audio_complete:", err);
                    });
                }
            } else {
                console.warn(`⚠️ No store found for responseId: ${responseId} when audio_complete received`);
            }
        });
        
        // Handle response complete - restart mic and clean up state
        newSocket.on("ai:response_complete", async (data) => {
            const { responseId } = data || {};
            console.log("✅ ai:response_complete", responseId);
            
            // Wait for all pending chunks to play before cleaning up
            const store = audioBuffersByResponseRef.current.get(responseId);
            if (!store) {
                console.warn(`⚠️ No store found for responseId: ${responseId}`);
                // Still wait a bit for safety
                await new Promise(res => setTimeout(res, 500));
            } else {
                // Mark that we're completing this response (helps with last chunk detection)
                store.isCompleting = true;
                
                // First, ensure we've marked audio as complete (in case response_complete arrives before audio_complete)
                if (!store.audioComplete) {
                    console.log("⏳ response_complete received before audio_complete, waiting for audio_complete...");
                    let waitCount = 0;
                    while (!store.audioComplete && waitCount < 100) { // Wait up to 5 seconds
                        await new Promise(res => setTimeout(res, 50));
                        waitCount++;
                    }
                    if (!store.audioComplete) {
                        console.warn("⚠️ audio_complete never received, assuming all chunks sent");
                        store.audioComplete = true;
                    }
                }
                
                // Try to play any remaining chunks now that we know we're completing (PCM16 only)
                if (store.format === 'pcm16') {
                    await playPendingSequences(responseId).catch(err => {
                        console.error("Error playing sequences in response_complete:", err);
                    });
                }
                
                if (store.format === 'pcm16' && store.pending.size > 0) {
                    console.log(`⏳ Waiting for ${store.pending.size} pending chunks to play...`);
                    // Wait much longer for lengthy messages - up to 60 seconds
                    let attempts = 0;
                    const maxAttempts = 1200; // 60 seconds max wait (50ms * 1200)
                    const maxNoProgressAttempts = 400; // 20 seconds of no progress (50ms * 400)
                    let lastPendingSize = store.pending.size;
                    let noProgressCount = 0;
                    let lastLogTime = Date.now();
                    
                    while (store.pending.size > 0 && attempts < maxAttempts && noProgressCount < maxNoProgressAttempts) {
                        await playPendingSequences(responseId);
                        
                        // Check if we made progress
                        if (store.pending.size === lastPendingSize) {
                            noProgressCount++;
                        } else {
                            noProgressCount = 0; // Reset if we made progress
                            lastPendingSize = store.pending.size;
                        }
                        
                        // Log status every 2 seconds to reduce spam
                        const now = Date.now();
                        if (now - lastLogTime > 2000) {
                            console.log(`⏳ Still waiting: ${store.pending.size} chunks remaining, nextSeqToPlay: ${store.nextSeqToPlay}, no progress for ${(noProgressCount * 50 / 1000).toFixed(1)}s`);
                            lastLogTime = now;
                        }
                        
                        if (store.pending.size > 0) {
                            await new Promise(res => setTimeout(res, 50));
                            attempts++;
                        }
                    }
                    
                    // If we still have pending chunks, continue waiting but log warning
                    if (store.pending.size > 0) {
                        if (noProgressCount >= maxNoProgressAttempts) {
                            console.warn(`⚠️ ${store.pending.size} chunks still pending after ${(attempts * 50 / 1000).toFixed(1)}s with no progress - may be lost`);
                        } else {
                            console.log(`⏳ ${store.pending.size} chunks still pending, continuing to wait...`);
                            // Continue waiting as long as we're making progress
                            while (store.pending.size > 0 && noProgressCount < maxNoProgressAttempts) {
                                await playPendingSequences(responseId);
                                
                                if (store.pending.size === lastPendingSize) {
                                    noProgressCount++;
                                } else {
                                    noProgressCount = 0;
                                    lastPendingSize = store.pending.size;
                                }
                                
                                if (store.pending.size > 0) {
                                    await new Promise(res => setTimeout(res, 50));
                                }
                            }
                        }
                    }
                    
                    if (store.pending.size > 0) {
                        console.warn(`⚠️ ${store.pending.size} chunks still pending after extended wait - may be lost in transit`);
                    } else {
                        console.log(`✅ All pending chunks played successfully`);
                    }
                }
                
                // Wait for the last chunk to actually finish playing (if we have it)
                if (store.lastChunkPlaying) {
                    console.log("⏳ Waiting for last chunk to finish playing...");
                    try {
                        await store.lastChunkPlaying;
                        console.log("✅ Last chunk playback completed");
                        // Immediate restart - no additional delay needed
                        // onended event already means audio finished playing
                    } catch (err) {
                        console.error("❌ Error waiting for last chunk:", err);
                        // Even on error, no delay for immediate restart
                    }
                } else {
                    // If we don't have last chunk promise, no delay for immediate restart
                    console.log("⏳ No last chunk promise, restarting immediately...");
                }
            }
            
            // Clean up dedupe entries for this response (prevent memory leak)
            if (responseId) {
                const keysToDelete = [];
                for (const key of dedupeSetRef.current) {
                    if (key.startsWith(`${responseId}:`)) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => dedupeSetRef.current.delete(key));
                if (keysToDelete.length > 0) {
                    console.log(`🧹 Cleaned up ${keysToDelete.length} dedupe entries for responseId: ${responseId}`);
                }
                
                // Remove the store AFTER all cleanup is done
                // Don't delete too early - wait a bit to ensure no race conditions
                setTimeout(() => {
                    if (audioBuffersByResponseRef.current.has(responseId)) {
                        audioBuffersByResponseRef.current.delete(responseId);
                        console.log(`🧹 Cleaned up store for responseId: ${responseId}`);
                    }
                }, 1000); // Wait 1 second before deleting to ensure no late chunks
            }
            
            // Restart mic after all audio is done
            try {
                if (conversationReadyRef.current && recognitionRef.current && !isRecognitionActiveRef.current) {
                    recognitionRef.current.start();
                    isRecognitionActiveRef.current = true;
                    setIsListening(true);
                    console.log("🎤 Mic restarted after AI finished");
                }
            } catch (e) {
                console.error("❌ Error restarting recognition after AI finished:", e);
            }
            setIsSpeaking(false);
            isSpeakingRef.current = false;
        });

        // ai:audio event removed - we ONLY use ai:audio_stream for OpenAI Realtime PCM audio
        // No fallback audio URLs, no browser TTS, only OpenAI Realtime audio chunks

        newSocket.on("response:received", (data) => {
            console.log("Response received confirmation:", data);
            // Don't reset processing flag here - keep it until AI responds
            // The AI response will reset it and restart listening
        });

        newSocket.on("conversation:ended", (data) => {
            console.log("Conversation ended:", data);
            setStatus("ended");
            conversationReadyRef.current = false;
            stopListening();
            stopSpeaking();
            toast.success("Conversation completed");
        });

        newSocket.on("error", (error) => {
            // Completely ignore empty error objects
            if (!error || (typeof error === "object" && Object.keys(error).length === 0)) {
                return;
            }

            // Extract message safely
            const message =
                typeof error === "string"
                    ? error
                    : error?.message
                    ? error.message
                    : JSON.stringify(error);

            if (message && message !== "{}") {
                console.error("Socket error:", message);
                toast.error(message);
            }

            isProcessingRef.current = false;
        });

        setSocket(newSocket);
        socketRef.current = newSocket; // Store in ref for reliable access

        return () => {
            console.log('Cleaning up socket connection...');
            socketInitializedRef.current = false;
            if (newSocket) {
                newSocket.removeAllListeners(); // Remove all event listeners
                newSocket.close();
            }
            socketRef.current = null;
            // Clear audio queue and stop playback
            audioQueueRef.current = [];
            isPlayingAudioRef.current = false;
            // Clear new refs
            currentResponseIdRef.current = null;
            expectedSeqRef.current = 0;
            audioBuffersByResponseRef.current.clear();
            dedupeSetRef.current.clear();
            stopListening();
            stopSpeaking();
        };
    }, [resumeId]);

    // Speak text using Web Speech API
    // Browser TTS (SpeechSynthesis) has been completely removed
    // We now use ONLY OpenAI Realtime audio for natural, human-like voice
    // This prevents conflicts, interruptions, and audio cut-offs

    // Legacy playAudio function removed - we ONLY use OpenAI Realtime PCM audio via ai:audio_stream
    // No browser Audio() or URL-based audio playback

    // Start continuous listening (like a phone call)
    const startContinuousListening = () => {
        if (!recognitionRef.current || isSpeaking || isRecognitionActiveRef.current) {
            console.log('Cannot start listening:', { 
                hasRecognition: !!recognitionRef.current, 
                isSpeaking,
                isRecognitionActive: isRecognitionActiveRef.current
            });
            return;
        }

        try {
            console.log('Starting continuous speech recognition...');
            recognitionRef.current.start();
            setIsListening(true);
            setSpeechDetected(false);
            setInterimTranscript("");
            finalTranscriptRef.current = "";
        } catch (error) {
            console.error("Error starting speech recognition:", error);
            if (error.name === 'InvalidStateError') {
                // Already started, update ref
                isRecognitionActiveRef.current = true;
                setIsListening(true);
                console.log('Speech recognition already started');
            } else {
                toast.error('Failed to start speech recognition. Using manual input.');
                setUseManualInput(true);
            }
        }
    };

    // Stop listening (only used on cleanup or conversation end)
    const stopListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                isRecognitionActiveRef.current = false;
            } catch (e) {
                // Ignore errors when stopping
            }
        }
        setIsListening(false);
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
        }
    };

    // Stop speaking (for OpenAI Realtime audio)
    const stopSpeaking = () => {
        // Clear audio queue and stop playback
        audioQueueRef.current = [];
        isPlayingAudioRef.current = false;
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        // Clear new refs
        currentResponseIdRef.current = null;
        expectedSeqRef.current = 0;
        audioBuffersByResponseRef.current.clear();
        dedupeSetRef.current.clear();
    };

    const handleConnect = () => {
        const activeSocket = socketRef.current || socket;
        if (!activeSocket || !sessionId || !resumeId) {
            toast.error("Missing connection information");
            return;
        }

        activeSocket.emit("candidate:ready", { resumeId });
        setStatus("connecting");
    };

    const handleSendResponse = (message) => {
        console.log('=== HANDLE SEND RESPONSE ===');
        console.log('Socket (state):', socket);
        console.log('Socket (ref):', socketRef.current);
        console.log('ConversationId (state):', conversationId);
        console.log('ConversationId (ref):', conversationIdRef.current);
        console.log('Message:', message);
        console.log('Message trimmed:', message?.trim());
        
        // Use refs if state is not available (more reliable)
        const activeSocket = socketRef.current || socket;
        const activeConversationId = conversationIdRef.current || conversationId;
        
        if (!activeSocket) {
            console.error('❌ Socket not available (both state and ref are null)');
            toast.error('Not connected to server. Please refresh the page.');
            return;
        }
        
        if (!activeConversationId) {
            console.error('❌ ConversationId not available');
            toast.error('Conversation not ready. Please wait...');
            return;
        }
        
        if (!message || !message.trim()) {
            console.error('❌ Empty message');
            return;
        }

        const trimmedMessage = message.trim();
        console.log('Sending response:', trimmedMessage);

        // Add candidate message to UI
        setMessages((prev) => [
            ...prev,
            { speaker: "candidate", message: trimmedMessage, timestamp: new Date() },
        ]);

        // Send to backend
        console.log('=== SENDING CANDIDATE RESPONSE ===');
        console.log('ConversationId:', activeConversationId);
        console.log('Message:', trimmedMessage);
        console.log('Has Socket:', !!activeSocket);
        console.log('ResumeId:', resumeId);
        console.log('Socket connected:', activeSocket?.connected);
        
        if (!activeSocket.connected) {
            console.error('❌ Socket not connected');
            toast.error('Connection lost. Please refresh the page.');
            isProcessingRef.current = false;
            return;
        }
        
        // Set processing flag to prevent duplicate sends
        isProcessingRef.current = true;
        
        activeSocket.emit("candidate:response", {
            conversationId: activeConversationId,
            message: trimmedMessage,
            resumeId: resumeId // Include resumeId as backup
        });
        
        console.log('✅ Candidate response emitted to server');
        
        console.log('✅ Candidate response emitted');
        console.log('=== END SENDING ===');

        // Clear interim transcript
        setInterimTranscript("");
        finalTranscriptRef.current = "";

        // Backend will process and send AI response via ai:text_complete (UI) and ai:audio_stream (audio)
    };

    const handleManualSend = () => {
        if (manualInput.trim()) {
            handleSendResponse(manualInput);
            setManualInput("");
            isProcessingRef.current = true;
        }
    };

    const handleEndConversation = () => {
        if (!socket || !conversationId) {
            return;
        }

        stopListening();
        stopSpeaking();
        socket.emit("conversation:end", { conversationId });
    };

    return (
        <div className="voice-agent-candidate-page">
            <div className="candidate-container">
                <h1>AI Voice Agent - Candidate</h1>

                <div className="status-section">
                    <div className={`status-badge status-${status}`}>
                        {status === "waiting" && "Waiting for connection..."}
                        {status === "connected" && "Connected"}
                        {status === "connecting" && "Connecting..."}
                        {status === "ready" && "Starting conversation..."}
                        {status === "in_conversation" && "In conversation"}
                        {status === "ended" && "Conversation ended"}
                    </div>
                    
                    {isSpeaking && (
                        <div className="speaking-indicator">
                            🔊 AI is speaking...
                        </div>
                    )}
                    
                    {isListening && (
                        <div className="listening-indicator">
                            🎤 Listening...
                            {speechDetected && (
                                <span className="speech-detected-badge">✓ Speech detected</span>
                            )}
                        </div>
                    )}
                    
                    {interimTranscript && (
                        <div className="interim-transcript">
                            <em>You said: "{interimTranscript}"</em>
                        </div>
                    )}
                </div>

                {!connected && (
                    <div className="connection-prompt">
                        <p>Waiting for AI agent to connect...</p>
                    </div>
                )}

                {connected && !conversationReady && (
                    <div className="ready-section">
                        <button
                            onClick={handleConnect}
                            className="btn-connect"
                            disabled={status !== "connected"}
                        >
                            Connect & Start Conversation
                        </button>
                    </div>
                )}

                {conversationReady && (
                    <div className="conversation-section">
                        <div className="messages-container">
                            {messages.length === 0 && (
                                <div className="waiting-message">
                                    <p>AI is preparing to start the conversation...</p>
                                </div>
                            )}
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`message message-${msg.speaker}`}
                                >
                                    <div className="message-content">
                                        <strong>
                                            {msg.speaker === "ai"
                                                ? "AI Agent"
                                                : "You"}
                                            :
                                        </strong>{" "}
                                        {msg.message}
                                    </div>
                                    <div className="message-time">
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Manual Input Fallback */}
                        {(useManualInput || !speechSupported) && (
                            <div className="manual-input-section">
                                <p className="manual-input-note">
                                    {!speechSupported 
                                        ? "⚠️ Speech recognition not supported in this browser. Please type your response:"
                                        : "💬 Type your response (or enable microphone for voice):"}
                                </p>
                                <div className="manual-input-container">
                                    <input
                                        type="text"
                                        value={manualInput}
                                        onChange={(e) => setManualInput(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleManualSend();
                                            }
                                        }}
                                        placeholder="Type your message here..."
                                        className="manual-input"
                                        disabled={isProcessingRef.current}
                                    />
                                    <button
                                        onClick={handleManualSend}
                                        disabled={!manualInput.trim() || isProcessingRef.current}
                                        className="btn-send"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="controls">
                            <button
                                onClick={handleEndConversation}
                                className="btn-end"
                            >
                                End Conversation
                            </button>
                        </div>
                    </div>
                )}

                <div className="info-section">
                    <p>
                        <strong>Resume ID:</strong> {resumeId}
                    </p>
                    {sessionId && (
                        <p>
                            <strong>Session ID:</strong> {sessionId}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceAgentCandidatePage;
