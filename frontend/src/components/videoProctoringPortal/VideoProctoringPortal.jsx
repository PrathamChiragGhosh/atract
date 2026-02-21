

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast, Toaster } from "react-hot-toast";
import { jobApplicationsKeys } from "@/hooks/useJobApplications";
import {
    FaCamera,
    FaMicrophone,
    FaShieldAlt,
    FaPlayCircle,
    FaPauseCircle,
    FaCheckCircle,
    FaTimesCircle,
    FaSpinner,
    FaBolt,
    FaClock,
    FaFlag,
    FaRegFlag,
    FaChevronLeft,
    FaChevronRight,
    FaExclamationCircle,
    FaSignOutAlt
} from "react-icons/fa";
import "./VideoProctoringPortal.css";

const STATUS_LABELS = {
    "not-started": "Generate question set",
    "pending-generation": "Preparing prompts",
    "awaiting-precheck": "Run system checks",
    "ready": "Ready to launch",
    "in-progress": "Session running",
    "submitted": "Submitted",
    "passed": "Passed",
    "failed": "Failed",
    "flagged": "Flagged"
};

const requirementOrder = [
    { key: "camera", label: "Camera" },
    { key: "microphone", label: "Microphone" },
    { key: "speakers", label: "Speakers" },
    { key: "browser", label: "Browser" },
    { key: "os", label: "Operating System" },
    { key: "internet", label: "Internet quality" },
    { key: "lighting", label: "Lighting" },
    { key: "faceDetection", label: "Face detection" },
    { key: "backgroundNoise", label: "Background noise" }
];

const VIOLATION_SNAPSHOT_EVENTS = new Set([
    "tab-blur",
    "window-blur",
    "exit-fullscreen",
    "devtools-open",
    "copy",
    "paste",
    "right-click",
    "screen-share-ended",
    "multiple-faces",
    "face-missing",
    "face-away",
    "camera-covered",
    "mic-muted",
    "network-drop"
]);

const DEFAULT_QUESTION_COUNT = Number(process.env.NEXT_PUBLIC_PROCTORING_DEFAULT_QUESTION_COUNT || 15);

const doesApplicationMatchFilters = (application, filters = {}) => {
    if (!application) return false;
    if (filters.status && application.status !== filters.status) return false;
    if (filters.submissionType && application.submissionType !== filters.submissionType) return false;
    if (filters.jobType && application.jobType !== filters.jobType) return false;
    if (filters.workMode && application.workMode !== filters.workMode) return false;
    if (filters.search && filters.search.trim()) {
        const searchValue = filters.search.trim().toLowerCase();
        const haystack = [
            application.jobTitle,
            application.companyName,
            application.location
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        if (!haystack.includes(searchValue)) {
            return false;
        }
    }
    return true;
};

const updateStatusBreakdownCounts = (breakdown = [], status) => {
    if (!status) {
        return Array.isArray(breakdown) ? breakdown : [];
    }
    const list = Array.isArray(breakdown) ? breakdown.map(item => ({ ...item })) : [];
    const existingIndex = list.findIndex(item => item.status === status);
    if (existingIndex !== -1) {
        list[existingIndex] = {
            ...list[existingIndex],
            count: (list[existingIndex].count || 0) + 1
        };
        return list;
    }
    return [
        ...list,
        {
            status,
            count: 1
        }
    ];
};

const VideoProctoringPortal = ({ jobId, initialAttemptId = null }) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [jobSeekerUrl, setJobSeekerUrl] = useState(null);
    const [resolvedJobId, setResolvedJobId] = useState(jobId || null);
    const [assessment, setAssessment] = useState(null);
    const [activeAttempt, setActiveAttempt] = useState(null);
    const [questionCount] = useState(DEFAULT_QUESTION_COUNT);
    const [precheckRunning, setPrecheckRunning] = useState(false);
    const [precheckResults, setPrecheckResults] = useState({});
    const [permissionsGranted, setPermissionsGranted] = useState({
        camera: false,
        microphone: false,
        screen: false
    });
    const [sessionState, setSessionState] = useState({
        status: "idle",
        countdownSeconds: 0,
        remainingSeconds: 0
    });
    const [violations, setViolations] = useState([]);
    const [submissionData, setSubmissionData] = useState(null);
    const [isGeneratingAttempt, setIsGeneratingAttempt] = useState(false);
    const generationControllerRef = useRef(null);
    const [showGenerationConfirm, setShowGenerationConfirm] = useState(false);
    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
    const [showProgressConfirm, setShowProgressConfirm] = useState(false);
    const [mcqQuestions, setMcqQuestions] = useState([]);
    const [mcqIndex, setMcqIndex] = useState(0);
    const [mcqUpdating, setMcqUpdating] = useState(false);
    const [isPreviewReady, setIsPreviewReady] = useState(false);
    const [previewError, setPreviewError] = useState(null);
    const [agreements, setAgreements] = useState({
        recording: false,
        integrity: false
    });
    const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);

    const agreementChecklist = [
        {
            key: "recording",
            label: "I consent to video, audio, and snapshots being captured for recruitment purposes."
        },
        {
            key: "integrity",
            label: "I will stay in full screen, avoid switching tabs, and follow the integrity guidelines."
        }
    ];
    const allAgreementsChecked = useMemo(() => Object.values(agreements).every(Boolean), [agreements]);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const snapshotIntervalRef = useRef(null);
    const audioIntervalRef = useRef(null);
    const faceIntervalRef = useRef(null);
    const micMonitorRef = useRef(null);
    const timerRef = useRef(null);
    const logThrottleRef = useRef({});
    const guardsCleanupRef = useRef(null);
    const violationSnapshotTimeoutRef = useRef(new Set());

    useEffect(() => {
        setJobSeekerUrl(process.env.NEXT_PUBLIC_JOBSEEKER_URL || null);
        setToken(Cookies.get("js_token") || null);
    }, []);

    useEffect(() => {
        if (jobId && jobId !== resolvedJobId) {
            setResolvedJobId(jobId);
        }
    }, [jobId, resolvedJobId]);

    useEffect(() => {
        if (!resolvedJobId && typeof window !== "undefined") {
            const pathJobId = window.location.pathname.split("/").filter(Boolean).pop();
            if (pathJobId && pathJobId !== "undefined") {
                setResolvedJobId(pathJobId);
            }
        }
    }, [resolvedJobId]);

    useEffect(() => {
        if (!token || !jobSeekerUrl || !resolvedJobId) {
            setLoading(false);
            return;
        }
        fetchAssessment({ includeQuestions: true, attemptId: initialAttemptId });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, jobSeekerUrl, resolvedJobId]);

    useEffect(() => {
        if (activeAttempt?.mcqQuestions?.length) {
            setMcqQuestions(activeAttempt.mcqQuestions);
            setMcqIndex((prev) => {
                const nextIndex = activeAttempt.mcqQuestions.findIndex(
                    (question) => typeof question.selectedOption !== "number"
                );
                if (sessionState.status === "running") {
                    return Math.min(prev, activeAttempt.mcqQuestions.length - 1);
                }
                return nextIndex >= 0 ? nextIndex : Math.min(prev, activeAttempt.mcqQuestions.length - 1);
            });
        } else {
            setMcqQuestions([]);
            setMcqIndex(0);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            setSessionState((prev) => ({
                ...prev,
                status: "idle",
                remainingSeconds: prev.countdownSeconds
            }));
        }
    }, [activeAttempt?.attemptId, activeAttempt?.mcqQuestions, sessionState.status]);

    useEffect(() => {
        if (activeAttempt?.precheck?.results) {
            setPrecheckResults(activeAttempt.precheck.results);
        }
    }, [activeAttempt?.precheck?.completedAt, activeAttempt?.attemptId, activeAttempt?.precheck?.results]);

    useEffect(() => {
        if (activeAttempt?.violations?.length) {
            setViolations(activeAttempt.violations.slice(-30));
        }
    }, [activeAttempt?.violations]);

    const buildProgressFromLocal = useCallback((items = []) => {
        const total = items.length;
        const answered = items.filter((item) => typeof item.selectedOption === "number").length;
        const marked = items.filter((item) => item.isMarked).length;
        return {
            total,
            answered,
            remaining: Math.max(total - answered, 0),
            marked
        };
    }, []);

    const fetchAssessment = useCallback(async ({ includeQuestions = false, attemptId = null } = {}) => {
        if (!jobSeekerUrl || !token || !resolvedJobId) return;
        setLoading(true);
        try {
            const response = await axios.get(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring`,
                {
                    params: { includeQuestions },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const data = response.data?.data;
            setAssessment(data);
            const attempt = attemptId
                ? data?.attemptsSummary?.find((item) => item.attemptId === attemptId)
                : data?.activeAttempt;
            setActiveAttempt(includeQuestions ? data?.activeAttempt : null);
            setLoading(false);
        } catch (error) {
            console.error("Fetch proctoring status error:", error);
            toast.error(error.response?.data?.message || "Unable to sync test status.");
            setLoading(false);
        }
    }, [jobSeekerUrl, token, resolvedJobId]);

    const refreshActiveAttempt = useCallback(async () => {
        await fetchAssessment({ includeQuestions: true });
    }, [fetchAssessment]);

    const syncActiveAttemptState = useCallback((updater) => {
        setActiveAttempt((prev) => {
            if (!prev) return prev;
            return updater(prev);
        });
        setAssessment((prev) => {
            if (!prev?.activeAttempt) {
                return prev;
            }
            return {
                ...prev,
                activeAttempt: updater(prev.activeAttempt)
            };
        });
    }, []);

    const mcqProgressState = useMemo(() => {
        if (activeAttempt?.progress) {
            return activeAttempt.progress;
        }
        return buildProgressFromLocal(mcqQuestions);
    }, [activeAttempt?.progress, buildProgressFromLocal, mcqQuestions]);

    const hasAnyAttempts = Boolean(assessment?.attemptsSummary?.length);
    const shouldShowGenerationPanel = (!assessment && !loading) || (!hasAnyAttempts && assessment?.status === "not-started");
    const showSessionPanel = ["awaiting-precheck", "ready", "in-progress"].includes(assessment?.status);
    const shouldProtectProgress = useMemo(
        () =>
            isGeneratingAttempt ||
            ["pending-generation", "awaiting-precheck", "ready", "in-progress"].includes(assessment?.status),
        [assessment?.status, isGeneratingAttempt]
    );

    useEffect(() => {
        if (!activeAttempt?.session?.countdownEndsAt || activeAttempt.status !== "in-progress") {
            return;
        }
        const remaining = Math.max(
            Math.floor((new Date(activeAttempt.session.countdownEndsAt).getTime() - Date.now()) / 1000),
            0
        );
        startTimer(remaining);
        setSessionState({
            status: "running",
            countdownSeconds: activeAttempt.configuration?.countdownSeconds || remaining,
            remainingSeconds: remaining
        });
    }, [activeAttempt?.attemptId, activeAttempt?.status, activeAttempt?.session?.countdownEndsAt, activeAttempt?.configuration?.countdownSeconds]);

    useEffect(() => {
        if (!activeAttempt) {
            setAgreements({
                recording: false,
                integrity: false
            });
            return;
        }
        setAgreements({
            recording: Boolean(activeAttempt.consents?.recording),
            integrity: Boolean(activeAttempt.consents?.integrity)
        });
    }, [activeAttempt?.attemptId]);

    const startGeneration = useCallback(
        async ({ runInBackground = false, silent = false } = {}) => {
            if (!jobSeekerUrl || !token || !resolvedJobId) return null;
            const controller = new AbortController();
            generationControllerRef.current = controller;
            if (!runInBackground) {
                setIsGeneratingAttempt(true);
                if (!silent) {
                    toast.loading("Generating secure prompts...", { id: "generate-vp" });
                }
            }
            try {
                const response = await axios.post(
                    `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/start`,
                    {
                        questionCount,
                        runInBackground,
                        forceNew: runInBackground
                    },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        signal: controller.signal
                    }
                );
                if (!runInBackground) {
                    toast.success(response.data?.message || "Question set ready.", { id: "generate-vp" });
                    setAssessment(response.data?.data);
                    setActiveAttempt(response.data?.data?.activeAttempt || null);
                }
                return response.data;
            } catch (error) {
                if (axios.isCancel?.(error)) {
                    if (!silent) {
                        toast.dismiss("generate-vp");
                        toast.error("Generation cancelled.", { id: "generate-vp" });
                    }
                    return null;
                }
                console.error("Start generation error:", error);
                console.error("Error details:", {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                    url: `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/start`,
                    jobSeekerUrl,
                    resolvedJobId,
                    token: token ? "present" : "missing"
                });
                if (!silent) {
                    const errorMessage = error.response?.data?.message || error.message || "Unable to generate question set. Please check your connection.";
                    toast.error(errorMessage, { id: "generate-vp" });
                }
                return null;
            } finally {
                if (!runInBackground) {
                    setIsGeneratingAttempt(false);
                    if (!silent) {
                        toast.dismiss("generate-vp");
                    }
                }
                if (generationControllerRef.current === controller) {
                    generationControllerRef.current = null;
                }
            }
        },
        [jobSeekerUrl, questionCount, resolvedJobId, token]
    );

    const handleStartGeneration = useCallback(() => {
        startGeneration();
    }, [startGeneration]);

    const handleMcqOptionChange = async (question, optionIndex) => {
        if (!jobSeekerUrl || !token || !assessment?.activeAttemptId || !resolvedJobId || isSubmittingAttempt) return;
        setMcqUpdating(true);
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/mcq`,
                {
                    questionId: question.questionId,
                    selectedOption: optionIndex
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const payload = response.data?.data;
            const updatedQuestion = payload?.question;
            const updatedProgress = payload?.progress;
            if (updatedQuestion) {
                setMcqQuestions((prev) =>
                    prev.map((item, idx) => {
                        if (item.questionId === updatedQuestion.questionId) {
                            return { ...item, ...updatedQuestion };
                        }
                        return item;
                    })
                );
                syncActiveAttemptState((attemptState) => ({
                    ...attemptState,
                    mcqQuestions: attemptState.mcqQuestions.map((item) =>
                        item.questionId === updatedQuestion.questionId ? { ...item, ...updatedQuestion } : item
                    ),
                    progress: updatedProgress || attemptState.progress
                }));
            }
        } catch (error) {
            console.error("MCQ update error:", error);
            toast.error(error.response?.data?.message || "Unable to save answer.");
        } finally {
            setMcqUpdating(false);
        }
    };

    const handleToggleMark = async (question) => {
        if (!jobSeekerUrl || !token || !assessment?.activeAttemptId || !resolvedJobId || isSubmittingAttempt) return;
        setMcqUpdating(true);
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/mcq`,
                {
                    questionId: question.questionId,
                    isMarked: !question.isMarked
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const payload = response.data?.data;
            const updatedQuestion = payload?.question;
            const updatedProgress = payload?.progress;
            if (updatedQuestion) {
                setMcqQuestions((prev) =>
                    prev.map((item) => (item.questionId === updatedQuestion.questionId ? { ...item, ...updatedQuestion } : item))
                );
                syncActiveAttemptState((attemptState) => ({
                    ...attemptState,
                    mcqQuestions: attemptState.mcqQuestions.map((item) =>
                        item.questionId === updatedQuestion.questionId ? { ...item, ...updatedQuestion } : item
                    ),
                    progress: updatedProgress || attemptState.progress
                }));
            }
        } catch (error) {
            console.error("Toggle mark error:", error);
            toast.error(error.response?.data?.message || "Unable to update question flag.");
        } finally {
            setMcqUpdating(false);
        }
    };

    const captureSnapshot = useCallback(async (reason = "random") => {
        if (!videoRef.current || !assessment?.activeAttemptId || !resolvedJobId) return;
        if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
            return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        const formData = new FormData();
        formData.append("asset", blob, `snapshot-${Date.now()}.png`);
        formData.append("width", canvas.width);
        formData.append("height", canvas.height);
        formData.append("reason", reason);
        try {
            await axios.post(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/assets/snapshot`,
                formData,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
        } catch (error) {
            console.error("Snapshot upload error:", error);
        }
    }, [assessment?.activeAttemptId, jobSeekerUrl, resolvedJobId, token]);


    const scheduleViolationSnapshot = useCallback((reason) => {
        const timeoutId = setTimeout(() => {
            violationSnapshotTimeoutRef.current.delete(timeoutId);
            captureSnapshot(reason);
        }, 1200);
        violationSnapshotTimeoutRef.current.add(timeoutId);
    }, [captureSnapshot]);

    const logEvent = useCallback(async (eventType, metadata = {}) => {
        if (!jobSeekerUrl || !token || !assessment?.activeAttemptId) {
            return;
        }
        const key = `${eventType}`;
        const now = Date.now();
        if (logThrottleRef.current[key] && now - logThrottleRef.current[key] < 2000) {
            return;
        }
        logThrottleRef.current[key] = now;
        try {
            await axios.post(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/session/event`,
                {
                    eventType,
                    payload: metadata
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setViolations((prev) => {
                const next = prev.slice(-30);
                next.push({
                    eventType,
                    details: metadata,
                    recordedAt: new Date().toISOString()
                });
                return next;
            });
            if (VIOLATION_SNAPSHOT_EVENTS.has(eventType)) {
                scheduleViolationSnapshot(eventType);
            }
        } catch (error) {
            console.error("Log event error:", error);
        }
    }, [assessment?.activeAttemptId, jobSeekerUrl, resolvedJobId, scheduleViolationSnapshot, token]);
    const bindStreamToVideo = useCallback(
        (stream) => {
            if (!videoRef.current || !stream) {
                return undefined;
            }

            const videoElement = videoRef.current;
            videoElement.srcObject = stream;
            videoElement.muted = true;
            videoElement.playsInline = true;

            const startPlayback = () => {
                videoElement
                    .play()
                    .then(() => {
                        setIsPreviewReady(true);
                        setPreviewError(null);
                    })
                    .catch((error) => {
                        console.error("Camera preview play error:", error);
                        setPreviewError("Click resume or allow camera playback to continue the test.");
                    });
            };

            if (videoElement.readyState >= 2) {
                startPlayback();
                return () => {};
            }

            const handleLoaded = () => {
                videoElement.removeEventListener("loadedmetadata", handleLoaded);
                startPlayback();
            };
            videoElement.addEventListener("loadedmetadata", handleLoaded);
            return () => videoElement.removeEventListener("loadedmetadata", handleLoaded);
        },
        []
    );

    const waitForPreviewFrame = useCallback(async () => {
        if (!videoRef.current) {
            return;
        }
        if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
            return;
        }
        await new Promise((resolve) => {
            let settled = false;
            const handleLoaded = () => {
                if (settled) return;
                settled = true;
                videoRef.current?.removeEventListener("loadeddata", handleLoaded);
                resolve();
            };
            videoRef.current?.addEventListener("loadeddata", handleLoaded);
            setTimeout(() => {
                if (settled) return;
                settled = true;
                videoRef.current?.removeEventListener("loadeddata", handleLoaded);
                resolve();
            }, 1200);
        });
    }, []);

    const requestCameraAndMic = useCallback(async () => {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            setIsPreviewReady(false);
            setPreviewError(null);
            bindStreamToVideo(stream);
            setPermissionsGranted((prev) => ({
                ...prev,
                camera: true,
                microphone: true
            }));
            return stream;
        } catch (error) {
            console.error("Camera/mic access failed:", error);
            setPreviewError("Unable to access camera or microphone. Please allow permissions and retry.");
            throw error;
        }
    }, [bindStreamToVideo]);

    useEffect(() => {
        if (!["awaiting-precheck", "ready", "in-progress"].includes(assessment?.status || "")) {
            return;
        }
        if (streamRef.current) {
            waitForPreviewFrame();
            return;
        }
        requestCameraAndMic().catch(() => {});
    }, [assessment?.status, requestCameraAndMic, waitForPreviewFrame]);

    const updateFullscreenPrompt = useCallback(() => {
        if (typeof document === "undefined") {
            return;
        }
        const isFull = document.fullscreenElement === document.documentElement;
        setShowFullscreenPrompt(sessionState.status === "running" && !isFull);
    }, [sessionState.status]);

    useEffect(() => {
        updateFullscreenPrompt();
        if (typeof document === "undefined") {
            return;
        }
        const handler = () => updateFullscreenPrompt();
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, [updateFullscreenPrompt]);

    const handleAgreementToggle = useCallback((key) => {
        setAgreements((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    }, []);

    const handleExitPortal = useCallback(() => {
        if (isGeneratingAttempt) {
            setShowGenerationConfirm(true);
            return;
        }
        if (shouldProtectProgress) {
            setShowProgressConfirm(true);
            return;
        }
        router.back();
    }, [isGeneratingAttempt, router, shouldProtectProgress]);

    const handleReturnToFullscreen = useCallback(() => {
        if (typeof document === "undefined") {
            return;
        }
        document.documentElement.requestFullscreen().catch(() => {});
    }, []);

    const handleConfirmLeaveDuringGeneration = useCallback(async () => {
        setShowGenerationConfirm(false);
        generationControllerRef.current?.abort();
        try {
            await startGeneration({ runInBackground: true, silent: true });
            toast.success("We will email you when the secure video test is ready.");
        } catch (error) {
            // ignore background errors
        } finally {
            setIsGeneratingAttempt(false);
            router.back();
        }
    }, [router, startGeneration]);

    const handleConfirmLeaveProgress = useCallback(() => {
        setShowProgressConfirm(false);
        router.back();
    }, [router]);

    const requestScreenShare = useCallback(async () => {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: false
        });
        screenStreamRef.current = screenStream;
        setPermissionsGranted((prev) => ({
            ...prev,
            screen: true
        }));
        const [screenTrack] = screenStream.getVideoTracks();
        if (screenTrack) {
            screenTrack.addEventListener("ended", () => {
                logEvent("screen-share-ended");
            });
        }
    }, [logEvent]);

    const runPrecheckSuite = useCallback(async () => {
        if (!assessment?.activeAttemptId) {
            toast.error("Please start the secure attempt first.");
            return;
        }
        setPrecheckRunning(true);
        try {
            const stream = streamRef.current || await requestCameraAndMic();
            await waitForPreviewFrame();
            const screenGranted = permissionsGranted.screen || (await requestScreenShare(), true);
            if (!screenGranted) {
                setPrecheckRunning(false);
                return;
            }
            const detectionResults = await executeDiagnostics(stream);
            await axios.post(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/precheck`,
                {
                    results: detectionResults,
                    summary: "All baseline signals look healthy."
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setPrecheckResults(detectionResults);
            toast.success("Pre-checks stored");

            await axios.post(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/permissions`,
                {
                    cameraGranted: true,
                    microphoneGranted: true,
                    screenGranted: true
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            await refreshActiveAttempt();
        } catch (error) {
            console.error("Precheck error:", error);
            toast.error(error.response?.data?.message || "Pre-checks failed.");
        } finally {
            setPrecheckRunning(false);
        }
    }, [assessment?.activeAttemptId, jobSeekerUrl, permissionsGranted.screen, refreshActiveAttempt, requestCameraAndMic, requestScreenShare, resolvedJobId, token, waitForPreviewFrame]);

    useEffect(() => {
        if (!streamRef.current) {
            return undefined;
        }
        const cleanup = bindStreamToVideo(streamRef.current);
        return typeof cleanup === "function" ? cleanup : undefined;
    }, [bindStreamToVideo, mcqQuestions.length, assessment?.activeAttemptId, sessionState.status]);

    const executeDiagnostics = async (stream) => {
        const results = {};
        results.camera = await assessCamera(stream);
        results.microphone = await assessMicrophone(stream);
        results.speakers = await assessSpeakers();
        results.browser = detectBrowser();
        results.os = detectOS();
        results.internet = await assessNetwork();
        results.lighting = await assessLighting();
        results.faceDetection = await detectFace();
        results.backgroundNoise = results.microphone;
        setPrecheckResults(results);
        return results;
    };

    const assessCamera = async (stream) => {
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack?.getCapabilities ? videoTrack.getCapabilities() : {};
        return {
            status: videoTrack ? "passed" : "failed",
            message: videoTrack ? "Camera detected" : "No camera feed",
            metrics: {
                width: capabilities.width?.max,
                height: capabilities.height?.max
            },
            lastRunAt: new Date().toISOString()
        };
    };

    const assessMicrophone = async (stream) => {
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) {
            return {
                status: "failed",
                message: "No audio track detected.",
                lastRunAt: new Date().toISOString()
            };
        }

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        await new Promise((resolve) => setTimeout(resolve, 500));
        analyser.getByteTimeDomainData(data);
        const rms = Math.sqrt(data.reduce((sum, value) => sum + (value - 128) ** 2, 0) / data.length);
        audioContext.close();
        const passed = rms > 2;
        return {
            status: passed ? "passed" : "warning",
            message: passed ? "Microphone responsive" : "Please speak louder to calibrate.",
            metrics: { rmsLevel: rms.toFixed(2) },
            lastRunAt: new Date().toISOString()
        };
    };

    const assessSpeakers = async () => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.value = 880;
            oscillator.connect(audioContext.destination);
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                audioContext.close();
            }, 600);
            return {
                status: "passed",
                message: "Speaker test tone played.",
                lastRunAt: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: "warning",
                message: "Unable to play speaker test tone.",
                lastRunAt: new Date().toISOString()
            };
        }
    };

    const detectBrowser = () => {
        const ua = navigator.userAgent;
        let name = "Unknown";
        if (ua.includes("Chrome")) name = "Chrome";
        if (ua.includes("Firefox")) name = "Firefox";
        if (ua.includes("Safari") && !ua.includes("Chrome")) name = "Safari";
        return {
            status: ["Chrome", "Firefox", "Edge"].includes(name) ? "passed" : "warning",
            message: `${name} detected`,
            lastRunAt: new Date().toISOString()
        };
    };

    const detectOS = () => {
        const platform = navigator.userAgentData?.platform || navigator.platform || "unknown";
        const supported = /Mac|Win|Linux/i.test(platform);
        return {
            status: supported ? "passed" : "warning",
            message: platform,
            lastRunAt: new Date().toISOString()
        };
    };

    const assessNetwork = async () => {
        const start = performance.now();
        try {
            await fetch("https://www.gstatic.com/generate_204", {
                cache: "no-cache",
                mode: "no-cors"
            });
        } catch (error) {
            console.warn("Network ping failed", error);
        }
        const latency = performance.now() - start;
        const connection = navigator.connection || {};
        const downlink = connection.downlink || 0;
        const status = latency < 300 && downlink >= 2 ? "passed" : "warning";
        return {
            status,
            message: `Latency ${latency.toFixed(0)}ms · Downlink ${downlink}Mbps`,
            metrics: { latencyMs: latency, downlinkMbps: downlink },
            lastRunAt: new Date().toISOString()
        };
    };

    const assessLighting = async () => {
        await waitForPreviewFrame();
        if (!videoRef.current || !videoRef.current.videoWidth) {
            return {
                status: "pending",
                message: "Waiting for camera preview...",
                lastRunAt: new Date().toISOString()
            };
        }
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let brightness = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        }
        brightness /= pixels.length / 4;
        const status = brightness < 40 ? "warning" : brightness < 80 ? "warning" : "passed";
        return {
            status,
            message:
                status === "passed"
                    ? `Lighting looks good (${brightness.toFixed(0)})`
                    : "Light your face evenly for better detection.",
            metrics: { brightness },
            lastRunAt: new Date().toISOString()
        };
    };

    const detectFace = async () => {
        await waitForPreviewFrame();
        if (!videoRef.current) {
            return {
                status: "pending",
                message: "Waiting for camera preview...",
                lastRunAt: new Date().toISOString()
            };
        }
        if ("FaceDetector" in window) {
            try {
                const detector = new window.FaceDetector({ maxDetectedFaces: 4 });
                const faces = await detector.detect(videoRef.current);
                const status = faces.length === 1 ? "passed" : faces.length === 0 ? "warning" : "warning";
                return {
                    status,
                    message: faces.length === 1 ? "Face confirmed" : faces.length === 0 ? "Face not detected" : "Multiple faces detected",
                    metrics: { faces: faces.length },
                    lastRunAt: new Date().toISOString()
                };
            } catch (error) {
                console.warn("Face detector failed:", error);
            }
        }
        return {
            status: "warning",
            message: "Face detector unavailable in this browser.",
            lastRunAt: new Date().toISOString()
        };
    };

    const beginSession = async () => {
        if (!jobSeekerUrl || !token || !assessment?.activeAttemptId || !resolvedJobId) return;
        try {
            await axios.post(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/session/start`,
                {
                    consents: {
                        recording: Boolean(agreements.recording),
                        integrity: Boolean(agreements.integrity)
                    }
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (document.fullscreenElement !== document.documentElement) {
                await document.documentElement.requestFullscreen().catch(() => {
                    toast.error("Full-screen permission denied.");
                });
            }

            setupSessionGuards();
            startRecording();
            setSessionState({
                status: "running",
                countdownSeconds: activeAttempt?.configuration?.countdownSeconds || 0,
                remainingSeconds: activeAttempt?.configuration?.countdownSeconds || 0
            });
            startTimer(activeAttempt?.configuration?.countdownSeconds || 0);
            await refreshActiveAttempt();
            captureSnapshot("session-start");
            toast.success("Session started. Stay focused!");
        } catch (error) {
            console.error("Start session error:", error);
            toast.error(error.response?.data?.message || "Unable to start secure session.");
        }
    };

    const setupSessionGuards = () => {
        if (guardsCleanupRef.current) {
            guardsCleanupRef.current();
            guardsCleanupRef.current = null;
        }
        const handleVisibilityChange = () => {
            if (document.hidden) {
                logEvent("tab-blur");
            }
        };
        const handleBlur = () => logEvent("window-blur");
        const handleKey = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "i") {
                event.preventDefault();
                logEvent("devtools-open");
            }
            if (event.key === "F12") {
                event.preventDefault();
                logEvent("devtools-open");
            }
            if (event.key === "Escape" && document.fullscreenElement) {
                logEvent("exit-fullscreen");
            }
        };
        const handleCopy = (event) => {
            event.preventDefault();
            logEvent("copy");
        };
        const handlePaste = (event) => {
            event.preventDefault();
            logEvent("paste");
        };
        const handleContextMenu = (event) => {
            event.preventDefault();
            logEvent("right-click");
        };
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                logEvent("exit-fullscreen");
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("keydown", handleKey);
        document.addEventListener("copy", handleCopy);
        document.addEventListener("paste", handlePaste);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("fullscreenchange", handleFullscreenChange);

        const cleanup = () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("keydown", handleKey);
            document.removeEventListener("copy", handleCopy);
            document.removeEventListener("paste", handlePaste);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
        guardsCleanupRef.current = cleanup;
    };

    const startRecording = () => {
        if (!streamRef.current) return;
        recordedChunksRef.current = [];
        const displayStream = streamRef.current;
        const mediaRecorder = new MediaRecorder(displayStream, {
            mimeType: "video/webm;codecs=vp9"
        });
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };
        mediaRecorder.onstop = () => {
            uploadRecording();
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;

        snapshotIntervalRef.current = setInterval(() => {
            captureSnapshot("random");
        }, 80000 + Math.random() * 15000);

        audioIntervalRef.current = setInterval(() => {
            captureAudioSample();
        }, 105000 + Math.random() * 20000);

        faceIntervalRef.current = setInterval(() => {
            monitorFaceDuringSession();
        }, 15000);

        micMonitorRef.current = setInterval(() => {
            const audioTrack = streamRef.current?.getAudioTracks()[0];
            if (audioTrack?.muted || audioTrack?.enabled === false) {
                logEvent("mic-muted");
            }
        }, 12000);

        window.addEventListener("offline", () => logEvent("network-drop"));
    };

    const startTimer = (duration) => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        let remaining = duration;
        timerRef.current = setInterval(() => {
            remaining -= 1;
            setSessionState((prev) => ({
                ...prev,
                remainingSeconds: remaining
            }));
            if (remaining <= 0) {
                clearInterval(timerRef.current);
                toast.loading("Auto-submitting...", { id: "vp-submit" });
                handleSubmitAttempt();
            }
        }, 1000);
    };

    const captureAudioSample = async () => {
        if (!streamRef.current || !assessment?.activeAttemptId || !resolvedJobId) return;
        const audioTrack = streamRef.current.getAudioTracks()[0];
        if (!audioTrack) {
            return;
        }
        const audioStream = new MediaStream([audioTrack]);
        let sampleRecorder;
        try {
            sampleRecorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
        } catch (error) {
            console.error("Audio recorder init error:", error);
            return;
        }
        const chunks = [];
        sampleRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };
        sampleRecorder.onstop = async () => {
            if (!chunks.length) {
                return;
            }
            const blob = new Blob(chunks, { type: "audio/webm" });
            const formData = new FormData();
            formData.append("asset", blob, `audio-${Date.now()}.webm`);
            try {
                await axios.post(
                    `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/assets/audio`,
                    formData,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
            } catch (error) {
                console.error("Audio sample upload error:", error);
            }
        };
        try {
            sampleRecorder.start();
            setTimeout(() => {
                if (sampleRecorder.state !== "inactive") {
                    sampleRecorder.stop();
                }
            }, 2500);
        } catch (error) {
            console.error("Audio recorder start error:", error);
        }
    };

    const monitorFaceDuringSession = async () => {
        if (!videoRef.current) return;
        if (!("FaceDetector" in window)) {
            const luminance = await assessLighting();
            if (luminance.status === "failed") {
                logEvent("camera-covered");
            }
            return;
        }
        try {
            const detector = new window.FaceDetector({ maxDetectedFaces: 4 });
            const faces = await detector.detect(videoRef.current);
            if (faces.length === 0) {
                logEvent("face-missing");
            } else if (faces.length > 1) {
                logEvent("multiple-faces", { faces: faces.length });
            } else {
                const [face] = faces;
                const frameCenter = videoRef.current.videoWidth / 2;
                const faceCenter = face.boundingBox.x + face.boundingBox.width / 2;
                const delta = Math.abs(frameCenter - faceCenter);
                if (delta > videoRef.current.videoWidth * 0.3) {
                    logEvent("face-away");
                }
            }
        } catch (error) {
            console.warn("Face monitoring failed:", error);
        }
    };

    const uploadRecording = async () => {
        if (!recordedChunksRef.current.length || !assessment?.activeAttemptId || !resolvedJobId) return;
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const formData = new FormData();
        formData.append("video", blob, `session-${Date.now()}.webm`);
        try {
            await axios.post(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/video`,
                formData,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
        } catch (error) {
            console.error("Video upload error:", error);
        }
    };

    const cleanupSession = useCallback(() => {
        if (guardsCleanupRef.current) {
            guardsCleanupRef.current();
            guardsCleanupRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        snapshotIntervalRef.current && clearInterval(snapshotIntervalRef.current);
        audioIntervalRef.current && clearInterval(audioIntervalRef.current);
        faceIntervalRef.current && clearInterval(faceIntervalRef.current);
        micMonitorRef.current && clearInterval(micMonitorRef.current);
        timerRef.current && clearInterval(timerRef.current);
        violationSnapshotTimeoutRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        violationSnapshotTimeoutRef.current.clear();
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsPreviewReady(false);
        setPreviewError(null);
    }, []);

    const updateApplicationsCacheAfterApply = useCallback((applicationData) => {
        if (!applicationData) {
            return;
        }

        const cachedQueries = queryClient.getQueriesData({
            queryKey: jobApplicationsKeys.lists()
        });

        if (!cachedQueries.length) {
            return;
        }

        cachedQueries.forEach(([queryKey, cachedData]) => {
            if (!cachedData) return;
            const filters = queryKey?.[3]?.filters || {};
            const currentPage = filters.page || 1;
            if (currentPage !== 1) {
                return;
            }
            if (!doesApplicationMatchFilters(applicationData, filters)) {
                return;
            }

            const existingData = Array.isArray(cachedData.data) ? cachedData.data : [];
            if (existingData.some(item => item.applicationId === applicationData.applicationId)) {
                return;
            }

            const limit = filters.limit || cachedData.pagination?.limit || 20;
            const nextData = [applicationData, ...existingData].slice(0, limit);

            const nextSummary = cachedData.summary
                ? {
                    ...cachedData.summary,
                    totalApplications: (cachedData.summary.totalApplications || 0) + 1,
                    totalUpdates: (cachedData.summary.totalUpdates || 0) + (applicationData.totalUpdates || 0),
                    statusBreakdown: updateStatusBreakdownCounts(cachedData.summary.statusBreakdown, applicationData.status)
                }
                : cachedData.summary;

            let nextPagination = cachedData.pagination;
            if (cachedData.pagination) {
                const paginationLimit = cachedData.pagination.limit || limit;
                const nextTotalRecords = (cachedData.pagination.totalRecords || 0) + 1;
                const nextTotalPages = Math.max(1, Math.ceil(nextTotalRecords / paginationLimit));
                nextPagination = {
                    ...cachedData.pagination,
                    totalRecords: nextTotalRecords,
                    totalPages: nextTotalPages,
                    hasNextPage: nextTotalPages > 1,
                    hasPrevPage: false
                };
            }

            queryClient.setQueryData(queryKey, {
                ...cachedData,
                data: nextData,
                pagination: nextPagination,
                summary: nextSummary
            });
        });
    }, [queryClient]);

    const handleSubmitAttempt = useCallback(async () => {
        if (!jobSeekerUrl || !token || !assessment?.activeAttemptId || !resolvedJobId) return;
        setIsSubmittingAttempt(true);
        cleanupSession();
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/jobs/${resolvedJobId}/proctoring/${assessment.activeAttemptId}/submit`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const responseData = response.data?.data;
            setSubmissionData(responseData);
            
            // Update cache if application data is returned
            if (responseData?.application) {
                updateApplicationsCacheAfterApply(responseData.application);
                toast.success(response.data?.message || "Session submitted. Application submitted successfully!", { id: "vp-submit" });
            } else {
                toast.success("Session submitted", { id: "vp-submit" });
            }
            
            setSessionState((prev) => ({ ...prev, status: "completed" }));
            await fetchAssessment({ includeQuestions: false });
        } catch (error) {
            console.error("Submit attempt error:", error);
            toast.error(error.response?.data?.message || "Unable to submit session.", { id: "vp-submit" });
        } finally {
            setIsSubmittingAttempt(false);
        }
    }, [assessment?.activeAttemptId, cleanupSession, fetchAssessment, jobSeekerUrl, resolvedJobId, token, updateApplicationsCacheAfterApply]);

    useEffect(() => {
        return () => {
            cleanupSession();
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
        };
    }, [cleanupSession]);

    useEffect(() => {
        if (!shouldProtectProgress) {
            return;
        }
        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [shouldProtectProgress]);

    const renderStatus = () => {
        const stageLabel = STATUS_LABELS[assessment?.status] || "Not started";
        const verdictLabel = assessment?.latestReport?.verdict
            ? assessment.latestReport.verdict.toUpperCase()
            : "Awaiting session";
        const progress = mcqProgressState;
        const questionPackCount = assessment?.activeAttempt?.configuration?.questionCount || mcqQuestions.length || questionCount;

        const stageDescriptions = {
            "not-started": "Launch the secure test to generate your personalized prompts.",
            "pending-generation": "We’re preparing prompts tailored to this role.",
            "awaiting-precheck": "Run diagnostics to unlock camera, mic, and screen sharing.",
            ready: "All checks cleared. Enter full screen to begin.",
            "in-progress": "You’re being monitored. Stay focused until you submit.",
            submitted: "Session submitted. Await the AI review.",
            passed: "Great work! Your session is under final review.",
            failed: "Session recorded. Review your score and try again.",
            flagged: "Session requires manual review due to integrity signals."
        };

        const verdictDescriptions = {
            default: "Submit your secure session to generate an AI review summary.",
            awaiting: "No AI review yet. Complete the session to unlock the summary.",
            review: "AI is reviewing this attempt for integrity signals.",
            pass: "AI approved this session. Report sent to the employer.",
            fail: "AI flagged risk signals. Recruiters will review manually."
        };

        const stageCopy = stageDescriptions[assessment?.status] || stageDescriptions["not-started"];
        const verdictKey = assessment?.latestReport?.verdict
            ? assessment.latestReport.verdict.toLowerCase()
            : "awaiting";
        const verdictCopy = verdictDescriptions[verdictKey] || verdictDescriptions.default;
        const questionCopy =
            progress.total > 0
                ? `${progress.remaining} remaining · ${progress.marked} marked for review`
                : "Questions unlock once diagnostics and permissions are complete.";

        return (
            <div className="videoProctoringPortal-status-card">
                <div className="videoProctoringPortal-status-item">
                    <span className="videoProctoringPortal-overline">Current stage</span>
                    <strong>{stageLabel}</strong>
                    <p>{stageCopy}</p>
                </div>
                <div className="videoProctoringPortal-status-item">
                    <span className="videoProctoringPortal-overline">Video verdict</span>
                    <strong>{verdictLabel}</strong>
                    <p>{assessment?.latestReport?.summary || verdictCopy}</p>
                </div>
                <div className="videoProctoringPortal-status-item">
                    <span className="videoProctoringPortal-overline">Question pack</span>
                    <strong>{progress.answered}/{questionPackCount}</strong>
                    <p>{questionCopy}</p>
                </div>
            </div>
        );
    };

    const renderGenerationPanel = () => (
        <div className="videoProctoringPortal-card">
            <div className="videoProctoringPortal-card-header">
                <FaShieldAlt />
                <div>
                    <h3>Secure question set</h3>
                    <p>
                        We generate {questionCount} monitored prompts based on your job profile. Start when you're ready
                        to enter the full-screen session.
                    </p>
                </div>
            </div>
            <button
                type="button"
                className="videoProctoringPortal-primary-btn"
                onClick={handleStartGeneration}
                disabled={isGeneratingAttempt || loading || !resolvedJobId}
            >
                {isGeneratingAttempt || loading ? (
                    <FaSpinner className="videoProctoringPortal-spin" />
                ) : (
                    <>
                        <FaBolt />
                        Generate question set
                    </>
                )}
            </button>
        </div>
    );

    const renderPrecheckPanel = () => {
        const defaultMessages = {
            pending: "Awaiting diagnostics",
            checking: "Running checks...",
            warning: "Needs attention",
            failed: "Unable to proceed",
            passed: "Signal verified"
        };

        const renderStateIcon = (state) => {
            switch (state) {
                case "passed":
                    return <FaCheckCircle />;
                case "warning":
                    return <FaExclamationCircle />;
                case "failed":
                    return <FaTimesCircle />;
                case "checking":
                    return <FaSpinner className="videoProctoringPortal-spin" />;
                default:
                    return <FaClock />;
            }
        };

        const getStepState = (key) => {
            const status = precheckResults[key]?.status?.toLowerCase();
            if (status) {
                return status;
            }
            return precheckRunning ? "checking" : "pending";
        };

        return (
            <div className="videoProctoringPortal-card videoProctoringPortal-precheck-card">
                <div className="videoProctoringPortal-card-header">
                    <FaCamera />
                    <div>
                        <h3>System readiness</h3>
                        <p>Run diagnostics before entering the secure environment.</p>
                    </div>
                </div>
                <div className="videoProctoringPortal-precheck-steps">
                    {requirementOrder.map(({ key, label }) => {
                        const state = getStepState(key);
                        const copy = precheckResults[key]?.message || defaultMessages[state] || defaultMessages.pending;
                        const pill =
                            state === "passed"
                                ? "Ready"
                                : state === "warning"
                                ? "Review"
                                : state === "failed"
                                ? "Failed"
                                : state === "checking"
                                ? "Checking"
                                : "Pending";
                        return (
                            <div key={key} className={`videoProctoringPortal-precheck-item status-${state}`}>
                                <div className="videoProctoringPortal-precheck-icon">{renderStateIcon(state)}</div>
                                <div className="videoProctoringPortal-precheck-copy">
                                    <strong>{label}</strong>
                                    <small>{copy}</small>
                                </div>
                                <span className="videoProctoringPortal-precheck-pill">{pill}</span>
                            </div>
                        );
                    })}
                </div>
                <button
                    type="button"
                    className="videoProctoringPortal-primary-btn"
                    onClick={runPrecheckSuite}
                    disabled={precheckRunning}
                >
                    {precheckRunning ? (
                        <>
                            <FaSpinner className="videoProctoringPortal-spin" />
                            Running diagnostics...
                        </>
                    ) : (
                        <>
                            <FaCamera />
                            Run all checks
                        </>
                    )}
                </button>
            </div>
        );
    };

    const renderSessionPanel = () => {
        if (!mcqQuestions.length) {
            return (
                <div className="videoProctoringPortal-card">
                    <p>Complete system checks to unlock the secure session.</p>
                </div>
            );
        }

        const currentQuestion = mcqQuestions[Math.min(mcqIndex, mcqQuestions.length - 1)];
        const mcqProgress = mcqProgressState;
        const isRunning = sessionState.status === "running";
        const canInteract = isRunning && !mcqUpdating && !isSubmittingAttempt;
        const timerPercent = sessionState.countdownSeconds
            ? Math.max(0, Math.min(100, (sessionState.remainingSeconds / sessionState.countdownSeconds) * 100))
            : 0;
        const showTimerAlert = isRunning && sessionState.remainingSeconds > 0 && sessionState.remainingSeconds <= 300;
        const startDisabled =
            assessment?.status !== "ready" || isRunning || !allAgreementsChecked || isSubmittingAttempt;

        return (
            <div className="videoProctoringPortal-session">
                <div className="videoProctoringPortal-session-left">
                    <div className="videoProctoringPortal-timer-card">
                        <div className="videoProctoringPortal-timer-header">
                            <FaClock />
                            <div>
                                <span>Time remaining</span>
                                <strong>{formatSeconds(sessionState.remainingSeconds)}</strong>
                            </div>
                        </div>
                        <div className="videoProctoringPortal-timer-bar">
                            <div className="videoProctoringPortal-timer-bar-fill" style={{ width: `${timerPercent}%` }} />
                        </div>
                        {showTimerAlert && (
                            <div className="videoProctoringPortal-timer-alert">
                                <FaExclamationCircle />
                                <span>Time is running out. Please wrap up your responses.</span>
                            </div>
                        )}
                    </div>
                    <div className="videoProctoringPortal-video-wrapper">
                        <video ref={videoRef} autoPlay playsInline muted />
                        {(!isPreviewReady || previewError) && (
                            <div className="videoProctoringPortal-video-overlay">
                                {previewError || "Initializing camera preview..."}
                            </div>
                        )}
                    </div>
                    <div className={`videoProctoringPortal-consent-card ${isRunning ? "is-locked" : ""}`}>
                        <p>Before you continue, please confirm:</p>
                        <div className="videoProctoringPortal-consent-list">
                            {agreementChecklist.map(({ key, label }) => (
                                <label
                                    key={key}
                                    className={`videoProctoringPortal-consent-item ${agreements[key] ? "checked" : ""}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={agreements[key]}
                                        disabled={isRunning}
                                        onChange={() => handleAgreementToggle(key)}
                                    />
                                    <span className="videoProctoringPortal-consent-indicator" aria-hidden="true">
                                        <FaCheckCircle />
                                    </span>
                                    <span className="videoProctoringPortal-consent-text">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                        <div className="videoProctoringPortal-session-actions">
                            <button
                                type="button"
                                className={`videoProctoringPortal-primary-btn videoProctoringPortal-session-btn ${
                                    isRunning ? "is-live" : ""
                                }`}
                                onClick={beginSession}
                                disabled={startDisabled}
                            >
                                <FaPlayCircle />
                                {isRunning ? "Session live" : "Enter full screen & begin"}
                            </button>
                            <button
                                type="button"
                                className="videoProctoringPortal-secondary-btn videoProctoringPortal-session-btn"
                                onClick={handleSubmitAttempt}
                                disabled={!isRunning || isSubmittingAttempt}
                            >
                                <FaPauseCircle />
                                {isSubmittingAttempt ? "Submitting..." : "Submit now"}
                            </button>
                        </div>
                    <div className="videoProctoringPortal-progress-card">
                        <div>
                            <span>Answered</span>
                            <strong>{mcqProgress.answered}/{mcqProgress.total}</strong>
                        </div>
                        <div>
                            <span>Marked</span>
                            <strong>{mcqProgress.marked}</strong>
                        </div>
                        <div>
                            <span>Remaining</span>
                            <strong>{mcqProgress.remaining}</strong>
                        </div>
                    </div>
                </div>
                <div className={`videoProctoringPortal-session-right ${isRunning ? "" : "locked"}`}>
                    {isRunning ? (
                        <>
                            <div className="videoProctoringPortal-mcq-header">
                                <div>
                                    <h3>Question {mcqIndex + 1} of {mcqQuestions.length}</h3>
                                    {currentQuestion.summary && <p>{currentQuestion.summary}</p>}
                                </div>
                                <div className="videoProctoringPortal-tags">
                                    {currentQuestion.intent && <span>{currentQuestion.intent}</span>}
                                    {currentQuestion.focusArea && <span>{currentQuestion.focusArea}</span>}
                                    <span>{currentQuestion.difficulty || "moderate"}</span>
                                </div>
                            </div>
                            <p className="videoProctoringPortal-question">{currentQuestion.prompt}</p>
                            <div className="videoProctoringPortal-mcq-options">
                                {currentQuestion.options.map((option, idx) => {
                                    const inputId = `vp-mcq-${currentQuestion.questionId}-${idx}`;
                                    return (
                                        <label
                                            key={inputId}
                                            htmlFor={inputId}
                                            className={`videoProctoringPortal-option-card ${
                                                currentQuestion.selectedOption === idx ? "selected" : ""
                                            }`}
                                        >
                                            <input
                                                id={inputId}
                                                type="radio"
                                                name={`vp-mcq-${currentQuestion.questionId}`}
                                                disabled={!canInteract}
                                                checked={currentQuestion.selectedOption === idx}
                                                onChange={() => handleMcqOptionChange(currentQuestion, idx)}
                                            />
                                            <span>{option}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            <div className="videoProctoringPortal-mcq-actions">
                                <button
                                    type="button"
                                    className="videoProctoringPortal-secondary-btn"
                                    onClick={() => handleToggleMark(currentQuestion)}
                                    disabled={mcqUpdating || isSubmittingAttempt}
                                >
                                    {currentQuestion.isMarked ? <FaFlag /> : <FaRegFlag />}
                                    {currentQuestion.isMarked ? "Unmark question" : "Mark for review"}
                                </button>
                                <div className="videoProctoringPortal-mcq-pager">
                                    <button
                                        type="button"
                                        onClick={() => setMcqIndex((prev) => Math.max(prev - 1, 0))}
                                        disabled={mcqIndex === 0 || !isRunning}
                                    >
                                        <FaChevronLeft /> Previous
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            mcqIndex === mcqQuestions.length - 1
                                                ? handleSubmitAttempt()
                                                : setMcqIndex((prev) => Math.min(prev + 1, mcqQuestions.length - 1))
                                        }
                                        disabled={mcqUpdating || isSubmittingAttempt}
                                        className="videoProctoringPortal-primary-btn"
                                    >
                                        {mcqIndex === mcqQuestions.length - 1 ? "Submit attempt" : (
                                            <>
                                                Next <FaChevronRight />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="videoProctoringPortal-mcq-navigator">
                                {mcqQuestions.map((question, idx) => (
                                    <button
                                        type="button"
                                        key={question.questionId}
                                        className={`videoProctoringPortal-mcq-node ${
                                            idx === mcqIndex ? "is-current" : ""
                                        } ${
                                            typeof question.selectedOption === "number" ? "is-answered" : "is-empty"
                                        } ${question.isMarked ? "is-marked" : ""}`}
                                        onClick={() => setMcqIndex(idx)}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="videoProctoringPortal-precheck-inline">
                            {renderPrecheckPanel()}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderViolations = () => (
        <div className="videoProctoringPortal-card videoProctoringPortal-violations-card">
            <div className="videoProctoringPortal-card-header">
                <FaShieldAlt />
                <div>
                    <h3>Live integrity feed</h3>
                    <p>We flag focus or hardware issues in real time.</p>
                </div>
            </div>
            <ul className="videoProctoringPortal-violation-list">
                {violations.slice().reverse().map((violation, index) => (
                    <li key={`${violation.eventType}-${index}`}>
                        <span>{violation.eventType}</span>
                        <small>{new Date(violation.recordedAt).toLocaleTimeString()}</small>
                    </li>
                ))}
                {!violations.length && <li>No violations logged yet.</li>}
            </ul>
        </div>
    );

    if (!token) {
        return (
            <div className="videoProctoringPortal-wrapper">
                <p>Please sign in to access the secure video assessment.</p>
            </div>
        );
    }

    if (loading && !assessment) {
        return (
            <div className="videoProctoringPortal-wrapper loading">
                <FaSpinner className="videoProctoringPortal-spin" />
                <p>Preparing your secure workspace...</p>
            </div>
        );
    }

    return (
        <div className="videoProctoringPortal-wrapper">
            <div className="videoProctoringPortal-shell">
                <header className="videoProctoringPortal-header">
                    <div className="videoProctoringPortal-header-left">
                        <button
                            type="button"
                            className="videoProctoringPortal-exit-btn"
                            onClick={handleExitPortal}
                            aria-label="Exit video portal"
                        >
                            <FaSignOutAlt />
                        </button>
                        <div>
                            <h1>Video proctored test</h1>
                            <p>Stay compliant, stay confident. We check every signal before scoring.</p>
                        </div>
                    </div>
                </header>
                {assessment && renderStatus()}
                {shouldShowGenerationPanel ? renderGenerationPanel() : null}
                {["pending-generation"].includes(assessment?.status) && (
                    <div className="videoProctoringPortal-card">
                        <p>We are preparing a tailored prompt pack. An email will be sent once it is ready.</p>
                    </div>
                )}
                {showSessionPanel && renderSessionPanel()}
                {renderViolations()}
                {submissionData && (
                    <div className="videoProctoringPortal-card">
                        <div className={`videoProctoringPortal-result ${submissionData.hasPassed ? "passed" : "failed"}`}>
                            {submissionData.hasPassed ? <FaCheckCircle /> : <FaTimesCircle />}
                            <div>
                                <h3>{submissionData.hasPassed ? "Cleared" : "Submitted"}</h3>
                                <p>Score: {submissionData.finalScore ?? submissionData.score ?? "N/A"}</p>
                            </div>
                        </div>
                    </div>
                )}
                <Toaster position="top-right" />
            </div>
            {showFullscreenPrompt && (
                <div className="videoProctoringPortal-modal">
                    <div className="videoProctoringPortal-modal-card">
                        <h3>Switch to full screen</h3>
                        <p>
                            Please return to full screen to keep the proctored session compliant. Leaving full screen pauses
                            integrity tracking.
                        </p>
                        <button
                            type="button"
                            className="videoProctoringPortal-primary-btn"
                            onClick={handleReturnToFullscreen}
                        >
                            Re-enter full screen
                        </button>
                    </div>
                </div>
            )}
            {showGenerationConfirm && (
                <div className="videoProctoringPortal-modal">
                    <div className="videoProctoringPortal-modal-card">
                        <h3>Your question set is still preparing</h3>
                        <p>Leaving now will pause the portal, but we can email you when the secure test is ready.</p>
                        <div className="videoProctoringPortal-modal-actions">
                            <button
                                type="button"
                                className="videoProctoringPortal-secondary-btn"
                                onClick={() => setShowGenerationConfirm(false)}
                            >
                                Stay here
                            </button>
                            <button
                                type="button"
                                className="videoProctoringPortal-primary-btn"
                                onClick={handleConfirmLeaveDuringGeneration}
                            >
                                Leave & email me
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showProgressConfirm && (
                <div className="videoProctoringPortal-modal">
                    <div className="videoProctoringPortal-modal-card">
                        <h3>Leave secure session?</h3>
                        <p>Your current progress is stored, but you will need to rerun the secure session to continue.</p>
                        <div className="videoProctoringPortal-modal-actions">
                            <button
                                type="button"
                                className="videoProctoringPortal-secondary-btn"
                                onClick={() => setShowProgressConfirm(false)}
                            >
                                Stay here
                            </button>
                            <button
                                type="button"
                                className="videoProctoringPortal-primary-btn videoProctoringPortal-leave-btn"
                                onClick={handleConfirmLeaveProgress}
                            >
                                Leave anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function formatSeconds(total = 0) {
    if (!total || total < 0) return "00:00";
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default VideoProctoringPortal;


