"use client";

import "./page.css";
import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { CircularProgress } from "@mui/material";
import { Toaster, toast } from "react-hot-toast";
import { FaTimes } from "react-icons/fa";
import { useJobSeekerAuth } from "@/hooks/useJobSeekerAuth";

const SettingsPage = () => {
    // Check authentication and redirect if not logged in
    useJobSeekerAuth();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [emailAlertOnLogin, setEmailAlertOnLogin] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalStep, setModalStep] = useState('confirmation'); // 'confirmation' or 'otp'
    const [modalAction, setModalAction] = useState(null); // 'enable' or 'disable'
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [otpError, setOtpError] = useState("");
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => {
        fetchEmailAlertSetting();
    }, []);

    const fetchEmailAlertSetting = async () => {
        const token = Cookies.get("js_token");
        if (!token) {
            setSessionExpired(true);
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/settings/email-alert`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const serverValue = response.data?.data?.emailAlertOnLogin ?? response.data?.emailAlertOnLogin ?? false;
            setEmailAlertOnLogin(Boolean(serverValue));
            
            if (response.data?.data?.email) {
                setUserEmail(response.data.data.email);
            }
        } catch (error) {
            if (error?.response?.status === 401) {
                setSessionExpired(true);
            } else {
                toast.error(error?.response?.data?.message || "Unable to load settings.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOtp = async () => {
        const token = Cookies.get("js_token");
        if (!token) {
            setSessionExpired(true);
            toast.error("Your session expired. Please sign in again.");
            return;
        }

        setSendingOtp(true);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/settings/send-otp`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                toast.success("OTP sent to your registered email address.");
                setModalStep('otp');
                setOtpError("");
                setOtp(["", "", "", ""]);
                // Auto-focus first OTP input
                setTimeout(() => {
                    const firstInput = document.getElementById('otp-input-0');
                    if (firstInput) firstInput.focus();
                }, 100);
            } else {
                const errorMsg = response.data.message || "Failed to send OTP.";
                toast.error(errorMsg);
                setOtpError(errorMsg);
            }
        } catch (error) {
            const errorMsg = error?.response?.data?.message || "Failed to send OTP.";
            toast.error(errorMsg);
            setOtpError(errorMsg);
        } finally {
            setSendingOtp(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        
        // Clear error when user starts typing
        if (otpError) {
            setOtpError("");
        }
        
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 3) {
            const nextInput = document.getElementById(`otp-input-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-input-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const token = Cookies.get("js_token");
        if (!token) {
            setSessionExpired(true);
            toast.error("Your session expired. Please sign in again.");
            return;
        }

        const otpString = otp.join("");
        if (otpString.length !== 4) {
            setOtpError("Please enter the complete OTP.");
            return;
        }

        setOtpError("");
        setVerifyingOtp(true);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/settings/verify-otp`,
                { otp: otpString, action: modalAction },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                if (modalAction === 'enable') {
                    setEmailAlertOnLogin(true);
                    toast.success("Email alert on login enabled successfully.");
                } else if (modalAction === 'disable') {
                    setEmailAlertOnLogin(false);
                    toast.success("Email alert on login disabled successfully.");
                }
                setShowModal(false);
                setModalStep('confirmation');
                setModalAction(null);
                setOtp(["", "", "", ""]);
                setOtpError("");
            } else {
                const errorMsg = response.data.message || "Invalid OTP. Please try again.";
                setOtpError(errorMsg);
                toast.error(errorMsg);
            }
        } catch (error) {
            const errorMsg = error?.response?.data?.message || "Failed to verify OTP.";
            setOtpError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setVerifyingOtp(false);
        }
    };

    const handleToggleEmailAlert = () => {
        if (isSaving || sessionExpired || sendingOtp) return;

        // Show modal with confirmation step
        if (!emailAlertOnLogin) {
            setModalAction('enable');
        } else {
            setModalAction('disable');
        }
        setModalStep('confirmation');
        setShowModal(true);
    };

    const handleConfirmAction = async () => {
        const token = Cookies.get("js_token");
        if (!token) {
            setSessionExpired(true);
            toast.error("Your session expired. Please sign in again.");
            setShowModal(false);
            return;
        }

        // Both enable and disable require OTP
        await handleSendOtp();
    };

    const handleCloseModal = () => {
        if (modalStep === 'otp') {
            // Show confirmation before closing OTP modal
            setShowCloseConfirmation(true);
        } else {
            // Close confirmation modal directly
            setShowModal(false);
            setModalStep('confirmation');
            setModalAction(null);
            setOtp(["", "", "", ""]);
        }
    };

    const handleConfirmClose = () => {
        setShowModal(false);
        setModalStep('confirmation');
        setModalAction(null);
        setOtp(["", "", "", ""]);
        setOtpError("");
        setShowCloseConfirmation(false);
    };

    return (
        <div className="js-settings-page">
            {isLoading ? (
                <div className="js-settings-loading">
                    <CircularProgress />
                    <p>Loading your preferences…</p>
                </div>
            ) : (
                <>
                    {sessionExpired && (
                        <div className="js-settings-warning">
                            Please sign in again to manage settings.
                        </div>
                    )}

                    <section className="js-settings-card">
                        <div className="js-settings-card-header">
                            <div>
                                <p className="js-settings-card-eyebrow">Account</p>
                                <h2>Email preferences</h2>
                                <p className="js-settings-subtitle">
                                    Control when you receive email notifications.
                                </p>
                            </div>
                        </div>

                        <div className="js-settings-card-body">
                            <div className="js-settings-preference-block">
                                <div className="js-settings-preference">
                                    <div className="js-settings-preference-content">
                                        <h3>Receive email alert when login</h3>
                                        <p>
                                            Get an email notification every time you log in to your account. This helps you stay aware of account activity.
                                        </p>
                                    </div>
                                    <button
                                        className={`js-settings-toggle ${emailAlertOnLogin ? "on" : ""}`}
                                        onClick={handleToggleEmailAlert}
                                        disabled={isSaving || sessionExpired || sendingOtp}
                                        aria-pressed={emailAlertOnLogin}
                                        aria-label={
                                            emailAlertOnLogin
                                                ? "Disable email alert on login"
                                                : "Enable email alert on login"
                                        }
                                    >
                                        <span className="js-settings-toggle-thumb" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* Single Modal for Confirmation and OTP */}
            {showModal && (
                <>
                    <div 
                        className="js-settings-otp-overlay" 
                        onClick={() => {
                            // Disable backdrop click while sending OTP or verifying
                            if (!sendingOtp && !verifyingOtp && modalStep === 'confirmation') {
                                handleCloseModal();
                            }
                        }} 
                    />
                    <div className="js-settings-otp-modal">
                        <div className="js-settings-otp-header">
                            <h3>
                                {modalStep === 'confirmation' 
                                    ? (modalAction === 'enable' ? 'Enable Email Alert' : 'Disable Email Alert')
                                    : 'Verify your email'
                                }
                            </h3>
                            <button
                                type="button"
                                className="js-settings-otp-close"
                                onClick={handleCloseModal}
                                disabled={sendingOtp || verifyingOtp}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="js-settings-otp-body">
                            {modalStep === 'confirmation' ? (
                                <>
                                    <p className="js-settings-otp-text">
                                        {modalAction === 'enable' ? (
                                            <>
                                                To enable email alerts on login, we'll send a verification OTP to <strong>{userEmail || "your registered email"}</strong>. 
                                                Please confirm to proceed.
                                            </>
                                        ) : (
                                            <>
                                                To disable email alerts on login, we'll send a verification OTP to <strong>{userEmail || "your registered email"}</strong>. 
                                                Please confirm to proceed.
                                            </>
                                        )}
                                    </p>
                                    <div className="js-settings-otp-actions">
                                        <button
                                            type="button"
                                            className="js-settings-otp-btn-secondary"
                                            onClick={handleCloseModal}
                                            disabled={sendingOtp || verifyingOtp}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="js-settings-otp-btn-primary"
                                            onClick={handleConfirmAction}
                                            disabled={sendingOtp || verifyingOtp}
                                        >
                                            {sendingOtp ? (
                                                <>
                                                    <CircularProgress size={16} sx={{ color: "white", marginRight: "8px" }} />
                                                    Sending OTP...
                                                </>
                                            ) : (
                                                'Send OTP'
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="js-settings-otp-text">
                                        We've sent a 4-digit OTP to <strong>{userEmail || "your registered email"}</strong>. Please enter it below to {modalAction === 'enable' ? 'enable' : 'disable'} email alerts on login.
                                    </p>
                                    {otpError && (
                                        <div className="js-settings-otp-error">
                                            {otpError}
                                        </div>
                                    )}
                                    <div className="js-settings-otp-inputs">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`otp-input-${index}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                className={`js-settings-otp-input ${otpError ? 'error' : ''}`}
                                                disabled={verifyingOtp || sendingOtp}
                                                autoComplete="off"
                                                autoCorrect="off"
                                                autoCapitalize="off"
                                                spellCheck="false"
                                            />
                                        ))}
                                    </div>
                                    <div className="js-settings-otp-actions">
                                        <button
                                            type="button"
                                            className="js-settings-otp-btn-secondary"
                                            onClick={() => {
                                                if (!verifyingOtp && !sendingOtp) {
                                                    handleSendOtp();
                                                }
                                            }}
                                            disabled={verifyingOtp || sendingOtp}
                                        >
                                            {sendingOtp ? "Sending..." : "Resend OTP"}
                                        </button>
                                        <button
                                            type="button"
                                            className="js-settings-otp-btn-primary"
                                            onClick={handleVerifyOtp}
                                            disabled={verifyingOtp || sendingOtp || otp.join("").length !== 4}
                                        >
                                            {verifyingOtp ? (
                                                <>
                                                    <CircularProgress size={16} sx={{ color: "white", marginRight: "8px" }} />
                                                    Verifying...
                                                </>
                                            ) : (
                                                "Verify OTP"
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Close Confirmation Modal */}
            {showCloseConfirmation && (
                <>
                    <div className="js-settings-otp-overlay" style={{ zIndex: 3002 }} />
                    <div className="js-settings-otp-modal" style={{ zIndex: 3003 }}>
                        <div className="js-settings-otp-header">
                            <h3>Exit verification?</h3>
                            <button
                                type="button"
                                className="js-settings-otp-close"
                                onClick={() => setShowCloseConfirmation(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="js-settings-otp-body">
                            <p className="js-settings-otp-text">
                                Are you sure you want to exit? Your OTP verification will be cancelled and the setting will not be changed.
                            </p>
                            <div className="js-settings-otp-actions">
                                <button
                                    type="button"
                                    className="js-settings-otp-btn-secondary"
                                    onClick={() => setShowCloseConfirmation(false)}
                                >
                                    Continue Verification
                                </button>
                                <button
                                    type="button"
                                    className="js-settings-otp-btn-primary"
                                    onClick={handleConfirmClose}
                                >
                                    Exit Verification
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <Toaster position="top-right" />
        </div>
    );
};

export default SettingsPage;

