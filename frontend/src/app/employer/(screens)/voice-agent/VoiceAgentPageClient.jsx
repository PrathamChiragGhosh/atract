"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import "./page.css";

const VoiceAgentPage = () => {
    const [sessionId, setSessionId] = useState(null);
    const [jobDescription, setJobDescription] = useState("");
    const [resumes, setResumes] = useState([]);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [candidateLinks, setCandidateLinks] = useState([]);

    // Extract base API URL from NEXT_PUBLIC_JOB_URL
    // NEXT_PUBLIC_JOB_URL examples: 
    //   - http://localhost:5001/api/job
    //   - http://localhost:5001/job  
    // We need: http://localhost:5001 (or http://localhost:5001/api if /api was in original)
    const getBaseApiUrl = () => {
        const jobUrl = process.env.NEXT_PUBLIC_JOB_URL || "http://localhost:5001/job";
        // Remove trailing /api/job or /job
        const baseUrl = jobUrl.replace(/\/api\/job\/?$|\/job\/?$/, '');
        return baseUrl || "http://localhost:5001";
    };
    
    const API_URL = getBaseApiUrl();
    const SOCKET_URL = getBaseApiUrl();
    
    // Debug: Log the API URL being used
    console.log("Voice Agent API URL:", API_URL);

    useEffect(() => {
        // Connect to socket when component mounts
        const token = Cookies.get("emp_token");
        if (!token) return;

        // Decode token to get employer ID
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        const decoded = JSON.parse(jsonPayload);
        const employerId = decoded.userId;

        const newSocket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
        });

        newSocket.on("connect", () => {
            console.log("Socket connected");
            newSocket.emit("employer:connect", { employerId });
        });

        newSocket.on("employer:connected", (data) => {
            console.log("Employer connected to voice agent:", data);
            setConnected(true);
        });

        newSocket.on("candidate:connected", (data) => {
            console.log("Candidate connected:", data);
            toast.success(`Candidate ${data.candidateName} connected`);
        });

        newSocket.on("conversation:started", (data) => {
            console.log("Conversation started:", data);
            toast.success(`Conversation started with ${data.candidateName}`);
        });

        newSocket.on("candidate:responded", (data) => {
            console.log("Candidate responded:", data);
        });

        newSocket.on("conversation:ended", (data) => {
            console.log("Conversation ended:", data);
            toast.success("Conversation completed");
            // Refresh session data
            if (sessionId) {
                fetchSession();
            }
        });

        newSocket.on("error", (error) => {
            console.error("Socket error:", error);
            toast.error(error.message || "Socket connection error");
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    const fetchSession = async () => {
        if (!sessionId) return;

        try {
            const token = Cookies.get("emp_token");
            const response = await axios.get(
                `${API_URL}/voice-agent/session/${sessionId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {
                setSession(response.data.data);
                
                // Generate candidate links if resumes exist
                if (response.data.data.resumes && response.data.data.resumes.length > 0) {
                    const links = response.data.data.resumes
                        .filter(r => r.resumeId && (r.resumeId._id || r.resumeId))
                        .map(resume => {
                            const resumeId = resume.resumeId._id || resume.resumeId;
                            return {
                                resumeId: resumeId,
                                candidateName: resume.candidateName || 'Unknown',
                                link: `${window.location.origin}/voice-agent/${resumeId}?sessionId=${sessionId}`
                            };
                        });
                    setCandidateLinks(links);
                }
            }
        } catch (error) {
            console.error("Error fetching session:", error);
        }
    };

    const handleCreateSession = async () => {
        if (!jobDescription.trim()) {
            toast.error("Please enter job description");
            return;
        }

        try {
            setLoading(true);
            const token = Cookies.get("emp_token");
            const url = `${API_URL}/voice-agent/session`;
            console.log("Creating session at:", url);
            const response = await axios.post(
                url,
                { jobDescription },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {
                setSessionId(response.data.data._id);
                setSession(response.data.data);
                toast.success("Session created successfully");
            }
        } catch (error) {
            console.error("Error creating session:", error);
            console.error("Error details:", {
                url: `${API_URL}/voice-agent/session`,
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            
            if (error.response?.status === 404) {
                toast.error(`Route not found. Check if backend is running and route is registered. URL: ${API_URL}/voice-agent/session`);
            } else {
                toast.error(error.response?.data?.message || "Failed to create session");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setResumes(files);
    };

    const handleUploadAndAnalyze = async () => {
        if (!sessionId) {
            toast.error("Please create a session first");
            return;
        }

        if (resumes.length === 0) {
            toast.error("Please select resume files");
            return;
        }

        try {
            setAnalyzing(true);
            const token = Cookies.get("emp_token");
            const formData = new FormData();
            formData.append("sessionId", sessionId);
            formData.append("jobDescription", jobDescription);

            resumes.forEach((file) => {
                formData.append("resumes", file);
            });

            const response = await axios.post(
                `${API_URL}/voice-agent/session/${sessionId}/upload`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.data.success) {
                setSession(response.data.data.session);
                
                // Generate candidate links
                const links = response.data.data.analyzedResumes.map(resume => ({
                    resumeId: resume._id,
                    candidateName: resume.candidateName || 'Unknown',
                    link: `${window.location.origin}/voice-agent/${resume._id}?sessionId=${sessionId}`
                }));
                setCandidateLinks(links);
                
                toast.success(
                    `Successfully analyzed ${response.data.data.analyzedResumes.length} resume(s)`
                );
                setResumes([]);
                fetchSession();
            }
        } catch (error) {
            console.error("Error uploading resumes:", error);
            toast.error(
                error.response?.data?.message || "Failed to analyze resumes"
            );
        } finally {
            setAnalyzing(false);
        }
    };

    const handleStart = async () => {
        if (!sessionId) {
            toast.error("Please create a session first");
            return;
        }

        try {
            setLoading(true);
            const token = Cookies.get("emp_token");
            const response = await axios.post(
                `${API_URL}/voice-agent/session/${sessionId}/start`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {
                setSession(response.data.data);
                
                // Generate candidate links if not already generated
                if (response.data.data.resumes && response.data.data.resumes.length > 0 && candidateLinks.length === 0) {
                    const links = response.data.data.resumes
                        .filter(r => r.resumeId)
                        .map(resume => ({
                            resumeId: resume.resumeId._id || resume.resumeId,
                            candidateName: resume.candidateName || 'Unknown',
                            link: `${window.location.origin}/voice-agent/${resume.resumeId._id || resume.resumeId}?sessionId=${sessionId}`
                        }));
                    setCandidateLinks(links);
                }
                
                toast.success("Voice agent session started");
                // Start connecting to candidates
                // The socket server will handle the connection flow
            }
        } catch (error) {
            console.error("Error starting session:", error);
            toast.error(
                error.response?.data?.message || "Failed to start session"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="voice-agent-page">
            <div className="voice-agent-container">
                <h1>AI Voice Agent</h1>

                {!sessionId ? (
                    <div className="create-session-section">
                        <div className="form-group">
                            <label>Job Description</label>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Enter the job description for the AI to use during conversations..."
                                rows={10}
                            />
                        </div>
                        <button
                            onClick={handleCreateSession}
                            disabled={loading}
                            className="btn-primary"
                        >
                            {loading ? "Creating..." : "Create Session"}
                        </button>
                    </div>
                ) : (
                    <div className="session-section">
                        <div className="session-info">
                            <p>
                                <strong>Session ID:</strong> {sessionId}
                            </p>
                            <p>
                                <strong>Status:</strong>{" "}
                                {session?.status || "pending"}
                            </p>
                            <p>
                                <strong>Candidates:</strong>{" "}
                                {session?.totalCandidates || 0}
                            </p>
                        </div>

                        <div className="form-group">
                            <label>Upload Resumes (PDF, DOC, DOCX)</label>
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                            />
                            {resumes.length > 0 && (
                                <p className="file-count">
                                    {resumes.length} file(s) selected
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleUploadAndAnalyze}
                            disabled={analyzing || resumes.length === 0}
                            className="btn-secondary"
                        >
                            {analyzing
                                ? "Analyzing Resumes..."
                                : "Upload & Analyze Resumes"}
                        </button>

                        {session?.resumes && session.resumes.length > 0 && (
                            <div className="resumes-list">
                                <h3>Analyzed Resumes</h3>
                                {session.resumes.map((resume, index) => (
                                    <div key={index} className="resume-item">
                                        <p>
                                            <strong>{resume.candidateName}</strong> -{" "}
                                            {resume.phoneNumber || "No phone"}
                                        </p>
                                        <p>Status: {resume.status}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Candidate Links Section */}
                        {candidateLinks.length > 0 && (session?.status === 'connecting' || session?.status === 'in_progress') && (
                            <div className="candidate-links-section">
                                <h3>Candidate Links (Copy to test conversation)</h3>
                                {candidateLinks.map((linkData, index) => (
                                    <div key={index} className="link-item">
                                        <div className="link-info">
                                            <p className="link-label">
                                                <strong>{linkData.candidateName}</strong>
                                            </p>
                                            <div className="link-container">
                                                <input
                                                    type="text"
                                                    value={linkData.link}
                                                    readOnly
                                                    className="link-input"
                                                    onClick={(e) => e.target.select()}
                                                />
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(linkData.link);
                                                        toast.success(`Link copied for ${linkData.candidateName}!`);
                                                    }}
                                                    className="btn-copy"
                                                >
                                                    📋 Copy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <p className="link-note">
                                    💡 Open these links in a new browser window/tab to test the conversation
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleStart}
                            disabled={
                                loading ||
                                !session?.resumes ||
                                session.resumes.length === 0
                            }
                            className="btn-primary btn-start"
                        >
                            {loading ? "Starting..." : "Start Voice Agent"}
                        </button>

                        {connected && (
                            <p className="connection-status connected">
                                ✓ Connected to voice agent server
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceAgentPage;

