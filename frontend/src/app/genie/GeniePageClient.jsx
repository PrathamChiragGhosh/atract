"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FaMicrophone, FaMicrophoneSlash, FaSpinner, FaPaperPlane } from "react-icons/fa";
import "./page.css";

const GeniePageClient = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationStarted, setConversationStarted] = useState(false);
    const [messages, setMessages] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [userInput, setUserInput] = useState("");
    
    // Conversation state
    const [currentRole, setCurrentRole] = useState(null);
    const [yearsOfExperience, setYearsOfExperience] = useState(null);
    const [preferredLocation, setPreferredLocation] = useState(null);
    
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const silenceTimeoutRef = useRef(null);
    const autoMicEnabledRef = useRef(true);
    const lastInterimTranscriptRef = useRef("");
    const currentStreamingMessageRef = useRef("");
    const streamingMessageIndexRef = useRef(-1);
    const sessionIdRef = useRef(null);

    // Get base API URL
    const getBaseApiUrl = () => {
        const jobUrl = process.env.NEXT_PUBLIC_JOB_URL || "http://localhost:5001/job";
        const baseUrl = jobUrl.replace(/\/job\/?$/, '');
        return baseUrl || "http://localhost:5001";
    };

    const BASE_API_URL = getBaseApiUrl();
    const SOCKET_URL = getBaseApiUrl();
    const JOB_API_URL = process.env.NEXT_PUBLIC_JOB_URL || "http://localhost:5001/job";

    useEffect(() => {
        return () => {
            // Cleanup
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        // Auto-scroll to bottom when new messages arrive
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-start mic when AI finishes speaking
    useEffect(() => {
        if (!isLoading && conversationStarted && isConnected && autoMicEnabledRef.current && !isListening) {
            const timer = setTimeout(() => {
                if (!isLoading && !isListening && autoMicEnabledRef.current) {
                    startListening();
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading, conversationStarted, isConnected, isListening]);

    const initializeSpeechRecognition = () => {
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            toast.error("Speech recognition not supported in this browser");
            return null;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
            let interimTranscript = "";
            let finalTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + " ";
                    lastInterimTranscriptRef.current = "";
                } else {
                    interimTranscript += transcript;
                    lastInterimTranscriptRef.current = transcript;
                }
            }

            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }

            if (interimTranscript) {
                setUserInput(interimTranscript);
            }

            if (finalTranscript.trim()) {
                handleSendMessage(finalTranscript.trim());
                return;
            }

            if (interimTranscript.trim() && !isLoading) {
                silenceTimeoutRef.current = setTimeout(() => {
                    if (lastInterimTranscriptRef.current.trim()) {
                        handleSendMessage(lastInterimTranscriptRef.current.trim());
                    }
                }, 2000);
            }
        };

        recognition.onerror = (event) => {
            // Only log non-recoverable errors
            if (event.error !== "no-speech" && event.error !== "aborted") {
                console.error("Speech recognition error:", event.error);
                toast.error(`Speech recognition error: ${event.error}`);
            }
            setIsListening(false);
            
            // Don't auto-restart on no-speech errors - let the auto-mic handle it
        };

        recognition.onend = () => {
            const wasListening = isListening;
            setIsListening(false);
            
            // Only auto-restart if it wasn't manually stopped and auto-mic is enabled
            if (wasListening && autoMicEnabledRef.current && !isLoading && conversationStarted && isConnected) {
                setTimeout(() => {
                    // Double-check state before restarting
                    if (!isListening && autoMicEnabledRef.current && !isLoading) {
                        // Check if recognition object still exists
                        if (recognitionRef.current) {
                            try {
                                recognitionRef.current.start();
                                setIsListening(true);
                            } catch (error) {
                                // If error, reinitialize
                                if (error.message && error.message.includes("already started")) {
                                    setIsListening(true);
                                } else {
                                    recognitionRef.current = initializeSpeechRecognition();
                                    if (recognitionRef.current) {
                                        recognitionRef.current.start();
                                        setIsListening(true);
                                    }
                                }
                            }
                        }
                    }
                }, 1000);
            }
        };

        return recognition;
    };

    const startListening = () => {
        if (isListening || isLoading) return;
        
        // If recognition exists but might be in a bad state, recreate it
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore errors when stopping
            }
            recognitionRef.current = null;
        }
        
        // Initialize fresh recognition
        recognitionRef.current = initializeSpeechRecognition();
        
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                setUserInput("");
            } catch (error) {
                // If already started, just update state
                if (error.name === 'InvalidStateError' || 
                    (error.message && error.message.includes("already started"))) {
                    setIsListening(true);
                } else {
                    console.error("Error starting recognition:", error);
                }
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (error) {
                console.error("Error stopping recognition:", error);
            }
        }
        setIsListening(false);
        
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
    };

    const handleStartConversation = () => {
        setConversationStarted(true);
        setIsLoading(true);

        // Connect to Socket.io
        const socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected");
            setIsConnected(true);
            
            // Start Genie session
            socket.emit("genie:start");
        });

        socket.on("genie:started", (data) => {
            console.log("Genie session started:", data);
            sessionIdRef.current = data.sessionId;
            setIsLoading(false);
        });

        socket.on("genie:text_delta", (data) => {
            // Handle streaming text character by character
            if (data.text) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    
                    // If we're starting a new message, create it
                    if (streamingMessageIndexRef.current === -1) {
                        newMessages.push({
                            type: "ai",
                            text: "",
                            timestamp: new Date(),
                            isStreaming: true
                        });
                        streamingMessageIndexRef.current = newMessages.length - 1;
                        currentStreamingMessageRef.current = "";
                    }
                    
                    // Append the character
                    currentStreamingMessageRef.current += data.text;
                    newMessages[streamingMessageIndexRef.current] = {
                        ...newMessages[streamingMessageIndexRef.current],
                        text: currentStreamingMessageRef.current,
                        isStreaming: true
                    };
                    
                    return newMessages;
                });
            }
        });

        socket.on("genie:text_complete", (data) => {
            // Mark message as complete
            setMessages(prev => {
                const newMessages = [...prev];
                if (streamingMessageIndexRef.current !== -1) {
                    newMessages[streamingMessageIndexRef.current] = {
                        ...newMessages[streamingMessageIndexRef.current],
                        text: data.fullText || currentStreamingMessageRef.current,
                        isStreaming: false,
                        timestamp: new Date()
                    };
                }
                
                // Reset streaming state
                streamingMessageIndexRef.current = -1;
                currentStreamingMessageRef.current = "";
                
                return newMessages;
            });

            // Update conversation state
            let roleToUse = currentRole;
            let expToUse = yearsOfExperience;
            let locToUse = preferredLocation;

            if (data.currentRole && !currentRole) {
                setCurrentRole(data.currentRole);
                roleToUse = data.currentRole;
            } else if (data.currentRole) {
                roleToUse = data.currentRole;
            }
            
            if (data.yearsOfExperience !== null && data.yearsOfExperience !== undefined && yearsOfExperience === null) {
                setYearsOfExperience(data.yearsOfExperience);
                expToUse = data.yearsOfExperience;
            } else if (data.yearsOfExperience !== null && data.yearsOfExperience !== undefined) {
                expToUse = data.yearsOfExperience;
            }
            
            if (data.preferredLocation && !preferredLocation) {
                setPreferredLocation(data.preferredLocation);
                locToUse = data.preferredLocation;
            } else if (data.preferredLocation) {
                locToUse = data.preferredLocation;
            }

            setIsLoading(false);
            autoMicEnabledRef.current = true;

            // If ready to search, trigger job search with the latest data
            if (data.readyToSearch) {
                setTimeout(() => {
                    searchJobs(roleToUse, expToUse, locToUse);
                }, 1000);
            }
        });

        socket.on("genie:error", (data) => {
            console.error("Genie error:", data);
            toast.error(data.error || "An error occurred");
            setIsLoading(false);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected");
            setIsConnected(false);
        });
    };

    const handleSendMessage = async (messageText = null) => {
        const textToSend = messageText || userInput.trim();
        
        if (!textToSend || !socketRef.current || !sessionIdRef.current) {
            return;
        }

        stopListening();
        autoMicEnabledRef.current = false;

        // Add user message to UI
        const userMessage = { type: "user", text: textToSend, timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setUserInput("");

        setIsLoading(true);
        streamingMessageIndexRef.current = -1;
        currentStreamingMessageRef.current = "";

        // Send message via Socket.io
        socketRef.current.emit("genie:message", {
            message: textToSend,
            sessionId: sessionIdRef.current
        });
    };

    const searchJobs = async (role = null, exp = null, loc = null) => {
        // Use provided parameters or fall back to state
        const roleToSearch = role !== null ? role : currentRole;
        const expToSearch = exp !== null ? exp : yearsOfExperience;
        const locToSearch = loc !== null ? loc : preferredLocation;

        if (!roleToSearch || expToSearch === null || !locToSearch) {
            console.error("Missing job search info:", { roleToSearch, expToSearch, locToSearch });
            toast.error("Missing information for job search");
            return;
        }

        autoMicEnabledRef.current = false;
        setLoadingJobs(true);
        
        try {
            const response = await axios.post(`${JOB_API_URL}/genie/search`, {
                currentRole: roleToSearch,
                yearsOfExperience: expToSearch,
                preferredLocation: locToSearch
            });

            if (response.data.success) {
                const foundJobs = response.data.data || [];
                setJobs(foundJobs);

                if (foundJobs.length === 0) {
                    setMessages(prev => [...prev, {
                        type: "ai",
                        text: "I couldn't find any jobs matching your preferences. Would you like to try different search criteria?",
                        timestamp: new Date()
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        type: "ai",
                        text: `Great! I found ${foundJobs.length} job${foundJobs.length > 1 ? 's' : ''} matching your preferences. Check them out below!`,
                        timestamp: new Date()
                    }]);
                }
            } else {
                toast.error("Failed to search jobs");
                setMessages(prev => [...prev, {
                    type: "ai",
                    text: "Sorry, I encountered an error while searching for jobs. Please try again.",
                    timestamp: new Date()
                }]);
            }
        } catch (error) {
            console.error("Error searching jobs:", error);
            toast.error("Failed to search jobs");
            setMessages(prev => [...prev, {
                type: "ai",
                text: "Sorry, I encountered an error while searching for jobs. Please try again.",
                timestamp: new Date()
            }]);
        } finally {
            setLoadingJobs(false);
            autoMicEnabledRef.current = true;
        }
    };

    const handleToggleListening = () => {
        if (isListening) {
            stopListening();
            autoMicEnabledRef.current = false;
        } else {
            startListening();
            autoMicEnabledRef.current = true;
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="genie-page">
            <div className="genie-container">
                <h1 className="genie-title">Meet Genie - Your Job Search Assistant</h1>
                
                {!conversationStarted ? (
                    <div className="genie-start-section">
                        <button 
                            className="genie-start-button"
                            onClick={handleStartConversation}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <FaSpinner className="spinning" /> Starting...
                                </>
                            ) : (
                                "Ask Genie"
                            )}
                        </button>
                        <p className="genie-description">
                            Click to start a conversation with Genie. Answer a few questions and we'll find the best jobs for you!
                        </p>
                    </div>
                ) : (
                    <div className="genie-conversation-section">
                        <div className="genie-status">
                            <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                                {isConnected ? '●' : '○'} {isConnected ? 'Connected' : 'Connecting...'}
                            </div>
                            {isListening && (
                                <div className="listening-indicator">
                                    🎤 Listening...
                                </div>
                            )}
                        </div>

                        <div className="genie-messages" ref={messagesEndRef}>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`message ${msg.type} ${msg.isStreaming ? 'streaming' : ''}`}>
                                    <div className="message-content">
                                        {msg.text}
                                        {msg.isStreaming && <span className="streaming-cursor">▋</span>}
                                    </div>
                                </div>
                            ))}
                            {isLoading && !messages.find(m => m.isStreaming) && (
                                <div className="message ai">
                                    <div className="message-content">
                                        <FaSpinner className="spinning" /> Genie is thinking...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="genie-input-section">
                            <div className="genie-input-wrapper">
                                <textarea
                                    className="genie-input"
                                    placeholder={isListening ? "Listening..." : "Type your message or use voice..."}
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={!isConnected || isLoading}
                                    rows={2}
                                />
                                <div className="genie-input-actions">
                                    <button
                                        className={`genie-mic-button ${isListening ? 'listening' : ''}`}
                                        onClick={handleToggleListening}
                                        disabled={!isConnected || isLoading}
                                        title={isListening ? "Stop listening" : "Start voice input"}
                                    >
                                        {isListening ? <FaMicrophone /> : <FaMicrophoneSlash />}
                                    </button>
                                    <button
                                        className="genie-send-button"
                                        onClick={() => handleSendMessage()}
                                        disabled={!isConnected || isLoading || !userInput.trim()}
                                        title="Send message"
                                    >
                                        <FaPaperPlane />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {loadingJobs && (
                    <div className="genie-loading">
                        <FaSpinner className="spinning" /> Searching for jobs...
                    </div>
                )}

                {jobs.length > 0 && (
                    <div className="genie-jobs-section">
                        <h2 className="genie-jobs-title">Found {jobs.length} Job{jobs.length > 1 ? 's' : ''}</h2>
                        <div className="genie-jobs-list">
                            {jobs.map((job) => (
                                <div key={job._id} className="genie-job-card">
                                    <h3 className="job-title">{job.jobTitle}</h3>
                                    <p className="job-company">{job.companyName}</p>
                                    <p className="job-location">
                                        <span>📍</span> {job.location}
                                    </p>
                                    {job.experience && (
                                        <p className="job-experience">
                                            <span>💼</span> {job.experience}
                                        </p>
                                    )}
                                    {job.workMode && (
                                        <p className="job-work-mode">
                                            <span>🏢</span> {job.workMode}
                                        </p>
                                    )}
                                    {job.shortId && (
                                        <a
                                            href={`/${job.shortId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="job-view-link"
                                        >
                                            View Job Details →
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeniePageClient;
