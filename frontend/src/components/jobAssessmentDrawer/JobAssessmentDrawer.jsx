"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { CircularProgress, Drawer } from "@mui/material";
import { toast } from "react-hot-toast";
import {
    FaCheckCircle,
    FaChevronLeft,
    FaChevronRight,
    FaClipboardCheck,
    FaCreditCard,
    FaExclamationTriangle,
    FaFlag,
    FaRegFlag,
    FaTimes
} from "react-icons/fa";
import "./JobAssessmentDrawer.css";

const BASIC_STAGE = "basic";
const MCQ_STAGE = "mcq";

const defaultProgress = {
    basic: { total: 5, answered: 0, remaining: 5 },
    mcq: { total: 10, answered: 0, remaining: 10, marked: 0 }
};

const JobAssessmentDrawer = ({
    isOpen,
    job,
    jobId,
    token,
    baselineAssessment = null,
    onClose,
    onAssessmentRefresh,
    onLaunchVideoTest,
    hasApplied = false,
    videoTestRequired = false
}) => {
    const [loadingAssessment, setLoadingAssessment] = useState(false);
    const [assessment, setAssessment] = useState(null);
    const [activeAttempt, setActiveAttempt] = useState(null);
    const [resultData, setResultData] = useState(null);
    const [error, setError] = useState(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingBasic, setIsSavingBasic] = useState(false);
    const [isUpdatingMcq, setIsUpdatingMcq] = useState(false);
    const [activeStage, setActiveStage] = useState(BASIC_STAGE);
    const [currentBasicIndex, setCurrentBasicIndex] = useState(0);
    const [currentMcqIndex, setCurrentMcqIndex] = useState(0);

    // Payment related state
    const [isPaymentRequired, setIsPaymentRequired] = useState(false);
    const [paymentOrder, setPaymentOrder] = useState(null);
    const [isCreatingPayment, setIsCreatingPayment] = useState(false);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [basicDraft, setBasicDraft] = useState("");
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const drawerRef = useRef(null);
    const integrityFocusRef = useRef(false);
    const scrollPositionRef = useRef(0);

    const jobSeekerUrl = process.env.NEXT_PUBLIC_JOBSEEKER_URL;

    const attemptLocked = Boolean(assessment?.requiresRegeneration || activeAttempt?.locked || isSubmitting);

    const activeProgress = activeAttempt?.progress || defaultProgress;
    const basicProgress = activeProgress.basic || defaultProgress.basic;
    const mcqProgress = activeProgress.mcq || defaultProgress.mcq;

    const basicFlow = activeAttempt?.basicFlow || [];
    const mcqQuestions = activeAttempt?.mcqQuestions || [];

    const basicComplete = Boolean(
        basicFlow.length &&
        basicFlow.every((item) => item.answerText && item.answerText.trim().length)
    );
    const canEnterMcq = basicComplete || !basicFlow.length;

    const currentBasicQuestion = useMemo(() => {
        if (!basicFlow.length) return null;
        const clampedIndex = Math.min(currentBasicIndex, basicFlow.length - 1);
        return basicFlow[clampedIndex];
    }, [basicFlow, currentBasicIndex]);

    const currentMcqQuestion = useMemo(() => {
        if (!mcqQuestions.length) return null;
        const clampedIndex = Math.min(currentMcqIndex, mcqQuestions.length - 1);
        return mcqQuestions[clampedIndex];
    }, [mcqQuestions, currentMcqIndex]);

    const shouldConfirmClose = Boolean(
        isStarting ||
        (activeAttempt && activeAttempt.status === "in-progress" && !assessment?.requiresRegeneration)
    );

    const logIntegrityEvent = useCallback(async (eventType) => {
        if (!jobId || !token || !activeAttempt?.attemptId) {
            return;
        }
        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/jobs/${jobId}/assessment/activity`,
                {
                    attemptId: activeAttempt.attemptId,
                    eventType,
                    timestamp: new Date().toISOString()
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
        } catch (error) {
            console.error("Assessment integrity event error:", error);
        }
    }, [jobId, token, activeAttempt?.attemptId]);

    const emitFocusStart = useCallback(() => {
        if (integrityFocusRef.current) {
            return;
        }
        integrityFocusRef.current = true;
        logIntegrityEvent("focus-start");
    }, [logIntegrityEvent]);

    const emitFocusEnd = useCallback(() => {
        if (!integrityFocusRef.current) {
            return;
        }
        integrityFocusRef.current = false;
        logIntegrityEvent("focus-end");
    }, [logIntegrityEvent]);

    const resetDrawerState = useCallback(() => {
        setAssessment(null);
        setActiveAttempt(null);
        setResultData(null);
        setError(null);
        setIsStarting(false);
        setIsSubmitting(false);
        setIsSavingBasic(false);
        setIsUpdatingMcq(false);
        setActiveStage(BASIC_STAGE);
        setCurrentBasicIndex(0);
        setCurrentMcqIndex(0);
        setBasicDraft("");
    }, []);

    const closeDrawer = useCallback(() => {
        emitFocusEnd();
        onClose?.();
    }, [onClose, emitFocusEnd]);

    const handleCloseIntent = useCallback(() => {
        if (shouldConfirmClose) {
            setShowConfirmClose(true);
            return;
        }
        closeDrawer();
    }, [closeDrawer, shouldConfirmClose]);

    // Check if payment is required for retest when result data changes or assessment loads
    useEffect(() => {
        if (assessment) {
            // Check if user has failed attempts that can be retried
            const attemptsCount = assessment.attempts?.length || 0;

            // Show banner if assessment failed and user hasn't reached max attempts (3) and hasn't paid for retest
            if (assessment.status === 'failed' && attemptsCount < 3 && !assessment.retestAmountPaid) {
                setIsPaymentRequired(true);
            } else {
                setIsPaymentRequired(false);
            }
        } else {
            setIsPaymentRequired(false);
        }
    }, [assessment]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKey = (event) => {
            if (event.key === "Escape") {
                handleCloseIntent();
            }
        };

        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, handleCloseIntent]);

    useEffect(() => {
        if (!isOpen || !activeAttempt?.attemptId || !token) {
            return undefined;
        }

        emitFocusStart();

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logIntegrityEvent("tab-blur");
                emitFocusEnd();
            } else {
                emitFocusStart();
            }
        };

        const handleWindowBlur = () => {
            logIntegrityEvent("window-blur");
            emitFocusEnd();
        };

        const handleWindowFocus = () => {
            emitFocusStart();
        };

        const handleCopy = (event) => {
            if (!drawerRef.current || !drawerRef.current.contains(event.target)) {
                return;
            }
            event.preventDefault();
            toast.error("Copying content is disabled during the test.");
            logIntegrityEvent("copy");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("copy", handleCopy);
        window.addEventListener("blur", handleWindowBlur);
        window.addEventListener("focus", handleWindowFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("copy", handleCopy);
            window.removeEventListener("blur", handleWindowBlur);
            window.removeEventListener("focus", handleWindowFocus);
            emitFocusEnd();
        };
    }, [isOpen, activeAttempt?.attemptId, token, emitFocusStart, emitFocusEnd, logIntegrityEvent]);

    useEffect(() => {
        if (!isOpen || !activeAttempt?.attemptId || !token) {
            return undefined;
        }

        emitFocusStart();

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logIntegrityEvent("tab-blur");
                emitFocusEnd();
            } else {
                emitFocusStart();
            }
        };

        const handleCopy = (event) => {
            if (!drawerRef.current || !drawerRef.current.contains(event.target)) {
                return;
            }
            event.preventDefault();
            toast.error("Copying content is disabled during the test.");
            logIntegrityEvent("copy");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("copy", handleCopy);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("copy", handleCopy);
            emitFocusEnd();
        };
    }, [isOpen, activeAttempt?.attemptId, token, emitFocusStart, emitFocusEnd, logIntegrityEvent]);

    useEffect(() => {
        if (!isOpen || !shouldConfirmClose) return undefined;
        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isOpen, shouldConfirmClose]);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }
        const scrollY = window.scrollY || 0;
        scrollPositionRef.current = scrollY;
        const { classList } = document.body;
        classList.add("jobAssessmentDrawer-noScroll");
        document.documentElement.style.scrollBehavior = "auto";
        return () => {
            classList.remove("jobAssessmentDrawer-noScroll");
            window.scrollTo(0, scrollPositionRef.current || 0);
            document.documentElement.style.scrollBehavior = "";
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            const timeout = setTimeout(() => {
                resetDrawerState();
            }, 320);
            return () => clearTimeout(timeout);
        }
        return undefined;
    }, [isOpen, resetDrawerState]);

    useEffect(() => {
        if (!isOpen) {
            emitFocusEnd();
        }
    }, [isOpen, emitFocusEnd]);

    useEffect(() => {
        if (!isOpen || !baselineAssessment) return;
        setAssessment((prev) => {
            const nextActiveAttempt = baselineAssessment.activeAttempt ?? prev?.activeAttempt ?? null;
            return {
                ...(prev || {}),
                ...baselineAssessment,
                activeAttempt: nextActiveAttempt
            };
        });
    }, [isOpen, baselineAssessment]);

    const fetchAssessment = useCallback(async ({ showSpinner = false, resetResult = false } = {}) => {
        if (!jobSeekerUrl || !jobId || !token) return;
        try {
            if (showSpinner) {
                setLoadingAssessment(true);
            }
            const response = await axios.get(
                `${jobSeekerUrl}/jobs/${jobId}/assessment`,
                {
                    params: { includeQuestions: true },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const data = response.data?.data;
            setAssessment(data);
            setActiveAttempt(data?.activeAttempt || null);
            if (resetResult) {
                setResultData(null);
            }
            setError(null);
            onAssessmentRefresh?.(data);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to load assessment right now.");
        } finally {
            if (showSpinner) {
                setLoadingAssessment(false);
            }
        }
    }, [jobId, jobSeekerUrl, token, onAssessmentRefresh]);

    useEffect(() => {
        if (!isOpen) return;
        if (!jobId || !token) {
            setAssessment(null);
            setActiveAttempt(null);
            setResultData(null);
            setError(!token ? "Please login as a job seeker to take the test." : null);
            return;
        }
        fetchAssessment({ showSpinner: true, resetResult: true });
    }, [isOpen, jobId, token, fetchAssessment]);

    useEffect(() => {
        if (!activeAttempt?.basicFlow?.length) {
            setCurrentBasicIndex(0);
            setBasicDraft("");
            return;
        }
        const nextIndex = activeAttempt.basicFlow.findIndex((item) => !item.answerText?.trim());
        setCurrentBasicIndex(nextIndex >= 0 ? nextIndex : 0);
    }, [activeAttempt?.attemptId, activeAttempt?.basicFlow]);

    useEffect(() => {
        if (!activeAttempt?.mcqQuestions?.length) {
            setCurrentMcqIndex(0);
            return;
        }
        const nextIndex = activeAttempt.mcqQuestions.findIndex(
            (item) => typeof item.selectedOption !== "number"
        );
        setCurrentMcqIndex(nextIndex >= 0 ? nextIndex : activeAttempt.mcqQuestions.length - 1);
    }, [activeAttempt?.attemptId, activeAttempt?.mcqQuestions]);

    useEffect(() => {
        if (!currentBasicQuestion) {
            setBasicDraft("");
            return;
        }
        setBasicDraft(currentBasicQuestion.answerText || "");
    }, [currentBasicQuestion?.questionId, currentBasicQuestion?.answerText]);

    const hydrateAttempt = useCallback((updater) => {
        setActiveAttempt((prev) => {
            if (!prev) return prev;
            const nextAttempt = updater(prev);
            setAssessment((assessmentDraft) => {
                if (!assessmentDraft) return assessmentDraft;
                return {
                    ...assessmentDraft,
                    activeAttempt: nextAttempt
                };
            });
            return nextAttempt;
        });
    }, []);

    const handleStartAssessment = async ({ forceRetake = false, regenerateBasics = false } = {}) => {
        if (!jobSeekerUrl || !jobId || !token) {
            toast.error("Unable to start the test right now.");
            return;
        }
        setIsStarting(true);
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/jobs/${jobId}/assessment/start`,
                { forceRetake, regenerateBasics },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const data = response.data?.data;
            setAssessment(data);
            setActiveAttempt(data?.activeAttempt || null);
            setResultData(null);
            setActiveStage(BASIC_STAGE);
            setCurrentBasicIndex(0);
            setCurrentMcqIndex(0);
            toast.success(forceRetake ? "New test generated." : "Assessment ready.");
            onAssessmentRefresh?.(data);
        } catch (err) {
            toast.error(err.response?.data?.message || "Unable to start the assessment.");
        } finally {
            setIsStarting(false);
        }
    };

    const handleTextareaPaste = useCallback((event) => {
        event.preventDefault();
        toast.error("Pasting answers is disabled during the test.");
        logIntegrityEvent("paste");
    }, [logIntegrityEvent]);

    const handleBasicSubmit = async () => {
        if (!jobSeekerUrl || !jobId || !token || !activeAttempt || !currentBasicQuestion) return;
        setIsSavingBasic(true);
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/jobs/${jobId}/assessment/progress`,
                {
                    attemptId: activeAttempt.attemptId,
                    questionId: currentBasicQuestion.questionId,
                    type: "basic",
                    answerText: basicDraft
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const payload = response.data?.data;
            const updatedBasicFlow = basicFlow.map((item) =>
                item.questionId === currentBasicQuestion.questionId
                    ? {
                        ...item,
                        answerText: payload?.question?.answerText || basicDraft,
                        answeredAt: payload?.question?.answeredAt || new Date().toISOString()
                    }
                    : item
            );
            hydrateAttempt((prev) => {
                return {
                    ...prev,
                    basicFlow: updatedBasicFlow,
                    progress: payload?.progress || prev.progress
                };
            });
            const remainingIndex = updatedBasicFlow.findIndex((item) => !item.answerText?.trim());
            if (remainingIndex >= 0) {
                setCurrentBasicIndex(remainingIndex);
            } else {
                setCurrentBasicIndex(updatedBasicFlow.length - 1);
                setActiveStage(MCQ_STAGE);
                setCurrentMcqIndex(0);
            }
            toast.success("Response saved");
        } catch (err) {
            toast.error(err.response?.data?.message || "Unable to save response.");
        } finally {
            setIsSavingBasic(false);
        }
    };

    const handleOptionChange = async (optionIndex) => {
        if (!jobSeekerUrl || !jobId || !token || !activeAttempt || !currentMcqQuestion) return;
        setIsUpdatingMcq(true);
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/jobs/${jobId}/assessment/progress`,
                {
                    attemptId: activeAttempt.attemptId,
                    questionId: currentMcqQuestion.questionId,
                    type: "mcq",
                    selectedOption: optionIndex
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const payload = response.data?.data;
            hydrateAttempt((prev) => {
                const updatedMcq = prev.mcqQuestions.map((item) =>
                    item.questionId === currentMcqQuestion.questionId
                        ? {
                            ...item,
                            selectedOption: payload?.question?.selectedOption,
                            isMarked: payload?.question?.isMarked ?? item.isMarked,
                            answeredAt: payload?.question?.answeredAt || new Date().toISOString()
                        }
                        : item
                );
                return {
                    ...prev,
                    mcqQuestions: updatedMcq,
                    progress: payload?.progress || prev.progress
                };
            });
        } catch (err) {
            toast.error(err.response?.data?.message || "Unable to update answer.");
        } finally {
            setIsUpdatingMcq(false);
        }
    };

    const toggleMarkQuestion = async () => {
        if (!jobSeekerUrl || !jobId || !token || !activeAttempt || !currentMcqQuestion) return;
        setIsUpdatingMcq(true);
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/jobs/${jobId}/assessment/progress`,
                {
                    attemptId: activeAttempt.attemptId,
                    questionId: currentMcqQuestion.questionId,
                    type: "mcq",
                    isMarked: !currentMcqQuestion.isMarked
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const payload = response.data?.data;
            hydrateAttempt((prev) => {
                const updatedMcq = prev.mcqQuestions.map((item) =>
                    item.questionId === currentMcqQuestion.questionId
                        ? {
                            ...item,
                            isMarked: payload?.question?.isMarked ?? !currentMcqQuestion.isMarked
                        }
                        : item
                );
                return {
                    ...prev,
                    mcqQuestions: updatedMcq,
                    progress: payload?.progress || prev.progress
                };
            });
        } catch (err) {
            toast.error(err.response?.data?.message || "Unable to update question flag.");
        } finally {
            setIsUpdatingMcq(false);
        }
    };

    const handleSubmitAttempt = async () => {
        if (!jobSeekerUrl || !jobId || !token || !activeAttempt) return;
        emitFocusEnd();
        setIsSubmitting(true);
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/jobs/${jobId}/assessment/submit`,
                {
                    attemptId: activeAttempt.attemptId
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const payload = response.data?.data;
            setResultData(payload);
            toast.success(payload?.hasPassed ? "Great job! You passed." : "Submitted. Review your score.");
            await fetchAssessment({ showSpinner: false, resetResult: false });
        } catch (err) {
            toast.error(err.response?.data?.message || "Unable to submit the test.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Payment functions for assessment retest
    const createRetestPayment = async () => {
        if (!jobId || !token) return;

        setIsCreatingPayment(true);
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/jobs/${jobId}/assessment/retest-payment`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                setPaymentOrder(response.data);
                initiateRazorpayPayment(response.data);
            }
        } catch (error) {
            if (error.response?.status === 402) {
                toast.error(error.response.data.message);
            } else if (error.response?.status === 400) {
                toast.error(error.response.data.message);
            } else {
                toast.error("Failed to create payment. Please try again.");
            }
        } finally {
            setIsCreatingPayment(false);
        }
    };

    const initiateRazorpayPayment = (orderData) => {
        // Load Razorpay script if not already loaded
        const loadRazorpay = () => {
            return new Promise((resolve) => {
                if (window.Razorpay) {
                    resolve(true);
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => resolve(true);
                script.onerror = () => resolve(false);
                document.body.appendChild(script);
            });
        };

        loadRazorpay().then((isLoaded) => {
            if (!isLoaded) {
                toast.error("Failed to load payment system. Please try again.");
                return;
            }

            const options = {
                key: orderData.keyId,
                amount: orderData.amount * 100,
                currency: orderData.currency,
                order_id: orderData.orderId,
                name: "Atract",
                description: "Assessment Retest Payment",
                handler: function (response) {
                    verifyPayment(response);
                },
                prefill: {
                    name: "",
                    email: "",
                    contact: ""
                },
                theme: {
                    color: "#2563eb"
                },
                modal: {
                    ondismiss: function() {
                        toast.info("Payment cancelled. You can try again.");
                        setPaymentOrder(null);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        });
    };

    const verifyPayment = async (razorpayResponse) => {
        if (!jobId || !token) return;

        setIsVerifyingPayment(true);
        try {
            const response = await axios.post(
                `${jobSeekerUrl}/assessment/retest-payment/verify`,
                {
                    razorpay_order_id: razorpayResponse.razorpay_order_id,
                    razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                    razorpay_signature: razorpayResponse.razorpay_signature,
                    jobId: jobId
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data.success) {
                toast.success("Payment verified successfully! You can now retake the test.");
                setPaymentOrder(null);
                setIsPaymentRequired(false);

                // Refresh assessment data to get updated payment status
                fetchAssessment({ showSpinner: false, resetResult: false });
            }
        } catch (error) {
            toast.error("Payment verification failed. Please contact support if amount was deducted.");
        } finally {
            setIsVerifyingPayment(false);
        }
    };

    const handleStageSwitch = (stage) => {
        if (stage === MCQ_STAGE && !canEnterMcq) {
            toast.error("Answer all 5 readiness prompts to unlock MCQs.");
            return;
        }
        setActiveStage(stage);
    };

    const handleNextMcq = () => {
        if (!mcqQuestions.length) return;
        setCurrentMcqIndex((idx) => Math.min(idx + 1, mcqQuestions.length - 1));
    };

    const handlePrevMcq = () => {
        if (!mcqQuestions.length) return;
        setCurrentMcqIndex((idx) => Math.max(idx - 1, 0));
    };

    const renderConfirmModal = () => {
        if (!showConfirmClose) return null;
        return (
            <div className="jobAssessmentDrawer-confirm-overlay">
                <div className="jobAssessmentDrawer-confirm-card">
                    <div className="jobAssessmentDrawer-confirm-header">
                        <FaExclamationTriangle />
                        <span>Leave assessment?</span>
                    </div>
                    <p>
                        Your latest progress is stored, but closing now pauses the test. Continue with the assessment or confirm to exit.
                    </p>
                    <div className="jobAssessmentDrawer-confirm-actions">
                        <button
                            type="button"
                            className="jobAssessmentDrawer-confirm-btn secondary"
                            onClick={() => setShowConfirmClose(false)}
                        >
                            Stay here
                        </button>
                        <button
                            type="button"
                            className="jobAssessmentDrawer-confirm-btn primary"
                            onClick={() => {
                                setShowConfirmClose(false);
                                closeDrawer();
                            }}
                        >
                            Leave anyway
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderBasicStage = () => {
        if (!activeAttempt || !basicFlow.length) {
            return (
                <div className="jobAssessmentDrawer-stage-empty">
                    <p>Readiness prompts will appear here after you start the assessment.</p>
                </div>
            );
        }

        return (
            <div className={`jobAssessmentDrawer-basic-stage ${attemptLocked ? "is-locked" : ""}`}>
                <div className="jobAssessmentDrawer-basic-feed">
                    {basicFlow.map((question, index) => (
                        <div
                            key={question.questionId}
                            className={`jobAssessmentDrawer-basic-thread ${index === currentBasicIndex ? "is-active" : ""}`}
                            onClick={() => setCurrentBasicIndex(index)}
                        >
                            <div className="jobAssessmentDrawer-basic-question">
                                <span className="jobAssessmentDrawer-badge">Q{index + 1}</span>
                                <p>{question.prompt}</p>
                                {question.expectation && (
                                    <small>{question.expectation}</small>
                                )}
                            </div>
                            {question.answerText ? (
                                <div className="jobAssessmentDrawer-basic-answer">
                                    <p>{question.answerText}</p>
                                </div>
                            ) : (
                                <div className="jobAssessmentDrawer-basic-answer placeholder">
                                    Awaiting response
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="jobAssessmentDrawer-basic-input">
                    <label htmlFor="jobAssessmentDrawer-basic-textarea">
                        {currentBasicQuestion ? `Respond to question ${currentBasicIndex + 1}` : "Select a prompt"}
                    </label>
                    <textarea
                        id="jobAssessmentDrawer-basic-textarea"
                        value={basicDraft}
                        disabled={!currentBasicQuestion || attemptLocked}
                        onChange={(e) => setBasicDraft(e.target.value)}
                onPaste={handleTextareaPaste}
                        placeholder="Type your answer like a chat message..."
                        rows={3}
                    />
                    <button
                        type="button"
                        className="jobAssessmentDrawer-primary-btn"
                        onClick={handleBasicSubmit}
                        disabled={!currentBasicQuestion || attemptLocked || isSavingBasic}
                    >
                        {isSavingBasic ? (
                            <>
                                <CircularProgress size={16} sx={{ color: "inherit", mr: 1 }} />
                                Saving...
                            </>
                        ) : (
                            <>
                                Send response
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    };

    const renderMcqStage = () => {
        if (!activeAttempt || !mcqQuestions.length) {
            return (
                <div className="jobAssessmentDrawer-stage-empty">
                    <p>MCQs will unlock after you finish the readiness prompts.</p>
                </div>
            );
        }
        if (!currentMcqQuestion) {
            return null;
        }

        return (
            <div className={`jobAssessmentDrawer-mcq-stage ${attemptLocked ? "is-locked" : ""}`}>
                <div className="jobAssessmentDrawer-mcq-header">
                    <div>
                        <span className="jobAssessmentDrawer-badge">Question {currentMcqIndex + 1} of {mcqQuestions.length}</span>
                        <h3>{currentMcqQuestion.prompt}</h3>
                        {currentMcqQuestion.summary && (
                            <p className="jobAssessmentDrawer-mcq-summary">{currentMcqQuestion.summary}</p>
                        )}
                    </div>
                    <div className="jobAssessmentDrawer-mcq-meta">
                        {currentMcqQuestion.skillFocus && (
                            <span className="jobAssessmentDrawer-tag">{currentMcqQuestion.skillFocus}</span>
                        )}
                        <span className="jobAssessmentDrawer-tag muted">
                            {currentMcqQuestion.difficulty} · {currentMcqQuestion.experienceAlignment}
                        </span>
                    </div>
                </div>

                <div className="jobAssessmentDrawer-mcq-options">
                    {currentMcqQuestion.options.map((option, idx) => {
                        const inputId = `jobAssessmentDrawer-option-${currentMcqQuestion.questionId}-${idx}`;
                        return (
                            <label
                                key={inputId}
                                htmlFor={inputId}
                                className={`jobAssessmentDrawer-option-card ${
                                    currentMcqQuestion.selectedOption === idx ? "selected" : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    id={inputId}
                                    name={`jobAssessmentDrawer-${currentMcqQuestion.questionId}`}
                                    checked={currentMcqQuestion.selectedOption === idx}
                                    onChange={() => handleOptionChange(idx)}
                                    disabled={attemptLocked || isUpdatingMcq}
                                />
                                <span>{option}</span>
                            </label>
                        );
                    })}
                </div>

                <div className="jobAssessmentDrawer-mcq-actions">
                    <button
                        type="button"
                        className="jobAssessmentDrawer-secondary-btn"
                        onClick={toggleMarkQuestion}
                        disabled={attemptLocked || isUpdatingMcq}
                    >
                        {currentMcqQuestion.isMarked ? <FaFlag /> : <FaRegFlag />}
                        {currentMcqQuestion.isMarked ? "Unmark question" : "Mark for review"}
                    </button>
                    <div className="jobAssessmentDrawer-mcq-pager">
                        <button
                            type="button"
                            onClick={handlePrevMcq}
                            disabled={attemptLocked || currentMcqIndex === 0}
                        >
                            <FaChevronLeft /> Previous
                        </button>
                        <button
                            type="button"
                            onClick={currentMcqIndex === mcqQuestions.length - 1 ? handleSubmitAttempt : handleNextMcq}
                            disabled={attemptLocked || isSubmitting}
                            className="jobAssessmentDrawer-primary-btn"
                        >
                            {isSubmitting ? (
                                <>
                                    <CircularProgress size={16} sx={{ color: "inherit", mr: 1 }} />
                                    Submitting...
                                </>
                            ) : currentMcqIndex === mcqQuestions.length - 1 ? (
                                <>
                                    Submit attempt
                                </>
                            ) : (
                                <>
                                    Next <FaChevronRight />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="jobAssessmentDrawer-mcq-navigator">
                    {mcqQuestions.map((question, idx) => (
                        <button
                            type="button"
                            key={question.questionId}
                            className={`jobAssessmentDrawer-mcq-node ${
                                idx === currentMcqIndex ? "is-current" : ""
                            } ${
                                typeof question.selectedOption === "number" ? "is-answered" : "is-empty"
                            } ${question.isMarked ? "is-marked" : ""}`}
                            onClick={() => setCurrentMcqIndex(idx)}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderStageContent = () => (
        <div className="jobAssessmentDrawer-stage-wrapper">
            <div className="jobAssessmentDrawer-stage-tabs">
                <button
                    type="button"
                    className={activeStage === BASIC_STAGE ? "is-active" : ""}
                    onClick={() => handleStageSwitch(BASIC_STAGE)}
                    disabled={!activeAttempt}
                >
                    Readiness Chat
                    <span>{basicProgress.answered}/{basicProgress.total}</span>
                </button>
                <button
                    type="button"
                    className={activeStage === MCQ_STAGE ? "is-active" : ""}
                    onClick={() => handleStageSwitch(MCQ_STAGE)}
                    disabled={!activeAttempt || !canEnterMcq}
                >
                    Technical MCQs
                    <span>{mcqProgress.answered}/{mcqProgress.total}</span>
                </button>
            </div>
            {activeStage === BASIC_STAGE ? renderBasicStage() : renderMcqStage()}
        </div>
    );

    const renderResultView = () => {
        if (!resultData) return null;
        return (
            <div className="jobAssessmentDrawer-result-card">
                <div className={`jobAssessmentDrawer-result-banner ${resultData.hasPassed ? "passed" : "failed"}`}>
                    <FaCheckCircle />
                    <div>
                        <h3>{resultData.hasPassed ? (hasApplied ? "Application submitted!" : "Congratulations!") : "Assessment submitted"}</h3>
                        <p>
                            {resultData.hasPassed
                                ? hasApplied
                                    ? "You passed the test and your application has been sent to the employer."
                                    : "You cleared the job-fit test. Keep the momentum going!"
                                : "Review your score and retake the test for a better outcome."}
                        </p>
                    </div>
                </div>
                <div className="jobAssessmentDrawer-result-grid">
                    <div>
                        <label>Score</label>
                        <strong>{resultData.score}/100</strong>
                    </div>
                    <div>
                        <label>Correct</label>
                        <strong>{resultData.correctAnswers}</strong>
                    </div>
                    <div>
                        <label>Incorrect</label>
                        <strong>{resultData.incorrectAnswers}</strong>
                    </div>
                    <div>
                        <label>Unanswered</label>
                        <strong>{resultData.unanswered}</strong>
                    </div>
                </div>
                <div className="jobAssessmentDrawer-result-actions">
                    {resultData.hasPassed ? (
                        <>
                            {hasApplied ? (
                                <div className="jobAssessmentDrawer-alert success" style={{ marginBottom: '16px' }}>
                                    <FaCheckCircle />
                                    <div>
                                        <strong>Application submitted successfully!</strong>
                                        <p>Your application has been sent to the employer. We'll notify you about updates.</p>
                                    </div>
                                </div>
                            ) : null}
                            {!hasApplied && videoTestRequired && (
                                <button
                                    type="button"
                                    className="jobAssessmentDrawer-primary-btn"
                                    onClick={() => (onLaunchVideoTest ? onLaunchVideoTest() : toast.success("Launching secure proctoring..."))}
                                >
                                    Launch video proctoring
                                </button>
                            )}
                            <button
                                type="button"
                                className="jobAssessmentDrawer-secondary-btn"
                                onClick={handleCloseIntent}
                            >
                                Close
                            </button>
                        </>
                    ) : (
                        <>
                            {isPaymentRequired ? (
                                // Payment required for retest
                                <div className="jobAssessmentDrawer-payment-banner">
                                    <div className="jobAssessmentDrawer-payment-header">
                                        <FaExclamationTriangle />
                                        <h4>🔓 Pay ₹99 to Unlock Retest</h4>
                                    </div>
                                    <p>Get another chance to pass this assessment! Pay now to retake the test.</p>
                                    <div className="jobAssessmentDrawer-payment-actions">
                                        <button
                                            type="button"
                                            className="jobAssessmentDrawer-primary-btn"
                                            onClick={createRetestPayment}
                                            disabled={isCreatingPayment || isVerifyingPayment}
                                        >
                                            {isCreatingPayment ? (
                                                <>
                                                    <CircularProgress size={16} sx={{ color: "inherit", mr: 1 }} />
                                                    Creating payment...
                                                </>
                                            ) : isVerifyingPayment ? (
                                                <>
                                                    <CircularProgress size={16} sx={{ color: "inherit", mr: 1 }} />
                                                    Verifying payment...
                                                </>
                                            ) : (
                                                <>
                                                    Pay ₹99 for Retest
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="jobAssessmentDrawer-secondary-btn"
                                            onClick={handleCloseIntent}
                                            disabled={isCreatingPayment || isVerifyingPayment}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Normal retest flow
                                <>
                                    <button
                                        type="button"
                                        className="jobAssessmentDrawer-primary-btn"
                                        onClick={() => handleStartAssessment({ forceRetake: true })}
                                        disabled={isStarting}
                                    >
                                        {isStarting ? (
                                            <>
                                                <CircularProgress size={16} sx={{ color: "inherit", mr: 1 }} />
                                                Preparing...
                                            </>
                                        ) : (
                                            <>
                                                Retake with new MCQs
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        className="jobAssessmentDrawer-secondary-btn"
                                        onClick={handleCloseIntent}
                                    >
                                        Close
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderAttemptsHistory = () => {
        if (!assessment?.attemptsSummary?.length) return null;
        return (
            <div className="jobAssessmentDrawer-history">
                <h4>Attempt history</h4>
                <ul>
                    {assessment.attemptsSummary.slice().reverse().map((attempt) => (
                        <li key={attempt.attemptId}>
                            <div>
                                <span>Attempt #{attempt.attemptNumber}</span>
                                <strong className={`jobAssessmentDrawer-status ${attempt.status}`}>
                                    {attempt.status}
                                </strong>
                            </div>
                            <p>
                                {typeof attempt.score === "number" ? `${attempt.score}/100` : "No score"}
                                {attempt.jobDetailsChanged && (
                                    <span className="jobAssessmentDrawer-tag warning">job updated</span>
                                )}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    const renderIntro = () => {
        const requiresRefresh = Boolean(assessment?.requiresRegeneration && !hasApplied);
        const hasPassed = Boolean(assessment?.hasPassed);
        const isInProgress = activeAttempt && activeAttempt.status === "in-progress";

        return (
            <div className="jobAssessmentDrawer-intro">
                <div className="jobAssessmentDrawer-intro-card">
                    <div>
                        <span className="jobAssessmentDrawer-badge muted">
                            {hasApplied ? "Application submitted" : "Take test to apply"}
                        </span>
                        <h2>{job?.jobTitle || "Role assessment"}</h2>
                        <p>{job?.companyName}</p>
                    </div>
                    <div className="jobAssessmentDrawer-intro-meta">
                        <span>5 conversational prompts</span>
                        <span>10 scored MCQs (10 pts each)</span>
                        {/* <span>Powered by Together AI</span> */}
                    </div>
                </div>

                {hasApplied && hasPassed && (
                    <div className="jobAssessmentDrawer-alert success">
                        <FaCheckCircle />
                        <div>
                            <strong>Application submitted successfully!</strong>
                            <p>You passed the test and your application has been sent to the employer. We'll notify you about updates.</p>
                        </div>
                    </div>
                )}

                {requiresRefresh && !hasApplied && (
                    <div className="jobAssessmentDrawer-alert warning">
                        <FaExclamationTriangle />
                        <div>
                            <strong>Job details were updated.</strong>
                            <p>We need to regenerate questions to keep them aligned with the new description.</p>
                        </div>
                    </div>
                )}

                {hasPassed && !hasApplied && (
                    <div className="jobAssessmentDrawer-alert success">
                        <FaCheckCircle />
                        <div>
                            <strong>You already passed this test.</strong>
                            {videoTestRequired ? (
                                <p>Next up: Take the proctored test when it's available.</p>
                            ) : (
                                <p>Your application will be submitted automatically.</p>
                            )}
                        </div>
                    </div>
                )}

                {isPaymentRequired && (
                    <div className="jobAssessmentDrawer-payment-banner">
                        <div className="jobAssessmentDrawer-payment-header">
                            <FaExclamationTriangle />
                            <h4>🔓 Pay ₹99 to Unlock Retest</h4>
                        </div>
                        <p>Get another chance to pass this assessment! Pay now to retake the test.</p>
                        <div className="jobAssessmentDrawer-payment-actions">
                            <button
                                type="button"
                                className="jobAssessmentDrawer-primary-btn"
                                onClick={createRetestPayment}
                                disabled={isCreatingPayment || isVerifyingPayment}
                            >
                                {isCreatingPayment ? (
                                    <>
                                        <CircularProgress size={16} sx={{ color: "inherit", mr: 1 }} />
                                        Creating payment...
                                    </>
                                ) : isVerifyingPayment ? (
                                    <>
                                        <CircularProgress size={16} sx={{ color: "inherit", mr: 1 }} />
                                        Verifying payment...
                                    </>
                                ) : (
                                    <>
                                        <FaCreditCard />
                                        Pay ₹99 & Retake
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="jobAssessmentDrawer-secondary-btn"
                                onClick={handleCloseIntent}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                <div className="jobAssessmentDrawer-intro-actions">
                    {!hasPassed && !hasApplied && (
                        <button
                            type="button"
                            className="jobAssessmentDrawer-primary-btn"
                            onClick={() => handleStartAssessment({
                                forceRetake: Boolean(assessment?.status === "failed"),
                                regenerateBasics: requiresRefresh
                            })}
                            disabled={isStarting}
                        >
                            {isStarting ? (
                                <>
                                    <CircularProgress size={16} sx={{ color: "inherit", mr: 1 }} />
                                    Preparing questions...
                                </>
                            ) : (
                                <>
                                    {isInProgress ? "Resume assessment" : "Start assessment"}
                                </>
                            )}
                        </button>
                    )}

                    {hasPassed && !hasApplied && videoTestRequired && (
                        <button
                            type="button"
                            className="jobAssessmentDrawer-primary-btn ghost"
                            onClick={() => (onLaunchVideoTest ? onLaunchVideoTest() : toast.success("Launching secure proctoring..."))}
                        >
                            Launch video proctoring
                        </button>
                    )}

                    {hasApplied && (
                        <button
                            type="button"
                            className="jobAssessmentDrawer-secondary-btn"
                            onClick={handleCloseIntent}
                        >
                            Close
                        </button>
                    )}

                    {isInProgress && !requiresRefresh && (
                        <button
                            type="button"
                            className="jobAssessmentDrawer-secondary-btn"
                            onClick={() => setActiveStage(BASIC_STAGE)}
                        >
                            Jump back to questions
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderBody = () => {
        if (!jobSeekerUrl) {
            return (
                <div className="jobAssessmentDrawer-state">
                    <p>Job seeker service URL is not configured.</p>
                </div>
            );
        }

        if (!token) {
            return (
                <div className="jobAssessmentDrawer-state">
                    <p>Please login as a job seeker to take this test.</p>
                </div>
            );
        }

        if (loadingAssessment) {
            return (
                <div className="jobAssessmentDrawer-state loading">
                    <CircularProgress size={32} sx={{ color: "#2563eb" }} />
                    <p>Fetching your personalized assessment...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="jobAssessmentDrawer-state">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="jobAssessmentDrawer-primary-btn"
                        onClick={() => fetchAssessment({ showSpinner: true, resetResult: true })}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        if (resultData) {
            return renderResultView();
        }

        if (!activeAttempt) {
            return (
                <>
                    {renderIntro()}
                    {renderAttemptsHistory()}
                </>
            );
        }

        if (assessment?.requiresRegeneration) {
            return (
                <>
                    <div className="jobAssessmentDrawer-alert warning">
                        <FaExclamationTriangle />
                        <div>
                            <strong>Test locked</strong>
                            <p>Employer edited this job. Regenerate the test to continue.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="jobAssessmentDrawer-primary-btn"
                        onClick={() => handleStartAssessment({ regenerateBasics: true })}
                        disabled={isStarting}
                    >
                        {isStarting ? (
                            <>
                                <CircularProgress size={16} sx={{ color: "inherit", mr: 1 }} />
                                Refreshing...
                            </>
                        ) : (
                            <>
                                Regenerate questions
                            </>
                        )}
                    </button>
                    {renderAttemptsHistory()}
                </>
            );
        }

        return (
            <>
                <div className="jobAssessmentDrawer-progress">
                    <div>
                        <span>Conversational prompts</span>
                        <strong>{basicProgress.answered}/{basicProgress.total}</strong>
                    </div>
                    <div>
                        <span>MCQs answered</span>
                        <strong>{mcqProgress.answered}/{mcqProgress.total}</strong>
                    </div>
                    <div>
                        <span>Marked</span>
                        <strong>{mcqProgress.marked || 0}</strong>
                    </div>
                </div>
                {renderStageContent()}
                {renderAttemptsHistory()}
            </>
        );
    };

    return (
        <>
            <Drawer
                anchor="right"
                open={Boolean(isOpen)}
                onClose={handleCloseIntent}
                slotProps={{
                    backdrop: { className: "jobAssessmentDrawer-backdrop" },
                    paper: { className: "jobAssessmentDrawer-paper" }
                }}
            >
                <div className="jobAssessmentDrawer-panel" ref={drawerRef}>
                    <header className="jobAssessmentDrawer-header">
                        <div>
                            <p>{job?.jobTitle || "Job application test"}</p>
                            <small>{job?.companyName}</small>
                        </div>
                        <button
                            type="button"
                            className="jobAssessmentDrawer-icon-btn"
                            onClick={handleCloseIntent}
                            aria-label="Close assessment"
                        >
                            <FaTimes />
                        </button>
                    </header>
                    <div className="jobAssessmentDrawer-body">
                        {renderBody()}
                    </div>
                    {/* <footer className="jobAssessmentDrawer-footer">
                        <FaClipboardCheck />
                        <span>Questions generated securely via Together AI · meta-llama/Llama-3-70b-chat-hf</span>
                    </footer> */}
                </div>
            </Drawer>
            {renderConfirmModal()}
        </>
    );
};

export default JobAssessmentDrawer;

