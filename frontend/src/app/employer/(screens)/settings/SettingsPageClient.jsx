"use client";

import "./page.css";
import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { CircularProgress } from "@mui/material";
import { Toaster, toast } from "react-hot-toast";
import { FaTimes } from "react-icons/fa";

const SettingsPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [notifyWithoutTest, setNotifyWithoutTest] = useState(false);
    const [notifyBasicTest, setNotifyBasicTest] = useState(false);
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
        fetchNotificationSetting();
        fetchEmailAlertSetting();
    }, []);

    const fetchNotificationSetting = async () => {
        const token = Cookies.get("emp_token");
        if (!token) {
            setSessionExpired(true);
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/settings/notifications`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const serverValue =
                response.data?.data?.notifyApplicationsWithoutTest ??
                response.data?.notifyApplicationsWithoutTest ??
                false;

            const basicTestValue =
                response.data?.data?.notifyBasicTestCompletion ??
                response.data?.notifyBasicTestCompletion ??
                false;

            setNotifyWithoutTest(Boolean(serverValue));
            setNotifyBasicTest(Boolean(basicTestValue));
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load notification settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleNotification = async (field) => {
        if (isSaving) return;

        const token = Cookies.get("emp_token");
        if (!token) {
            setSessionExpired(true);
            toast.error("Your session expired. Please sign in again.");
            return;
        }

        const setterMap = {
            notifyApplicationsWithoutTest: setNotifyWithoutTest,
            notifyBasicTestCompletion: setNotifyBasicTest
        };

        const currentValue =
            field === "notifyApplicationsWithoutTest" ? notifyWithoutTest : notifyBasicTest;
        const nextValue = !currentValue;

        const setter = setterMap[field];
        setter(nextValue);
        setIsSaving(true);

        try {
            await axios.patch(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/settings/notifications`,
                { [field]: nextValue },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            let successMessage = "Notification preference updated.";
            if (field === "notifyApplicationsWithoutTest") {
                successMessage = nextValue
                    ? "Email alerts enabled for direct applications."
                    : "Email alerts paused for direct applications.";
            } else if (field === "notifyBasicTestCompletion") {
                successMessage = nextValue
                    ? "Email alerts enabled for basic test completions."
                    : "Email alerts paused for basic test completions.";
            }
            toast.success(successMessage);
        } catch (error) {
            setter(!nextValue);
            toast.error(error?.response?.data?.message || "Unable to update notification preference.");
        } finally {
            setIsSaving(false);
        }
    };

    const fetchEmailAlertSetting = async () => {
        const token = Cookies.get("emp_token");
        if (!token) {
            return;
        }

        try {
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/settings/email-alert`,
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
            // Silently fail - not critical
            console.error("Failed to fetch email alert setting:", error);
        }
    };

    const handleSendOtp = async () => {
        const token = Cookies.get("emp_token");
        if (!token) {
            setSessionExpired(true);
            toast.error("Your session expired. Please sign in again.");
            return;
        }

        setSendingOtp(true);
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/settings/send-otp`,
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
                    const firstInput = document.getElementById('emp-otp-input-0');
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
            const nextInput = document.getElementById(`emp-otp-input-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`emp-otp-input-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const token = Cookies.get("emp_token");
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
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/settings/verify-otp`,
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
        const token = Cookies.get("emp_token");
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
        <div className="emp-settings-page">
            {isLoading ? (
                <div className="emp-settings-loading">
                    <CircularProgress />
                    <p>Loading your preferences…</p>
                </div>
            ) : (
                <>
                    {sessionExpired && (
                        <div className="emp-settings-warning">
                            Please sign in again to manage notification settings.
                        </div>
                    )}

                    <section className="emp-settings-card highlight simple">
                        <div className="emp-settings-card-header">
                            <div>
                                <p className="emp-settings-card-eyebrow">Notifications</p>
                                <h2>Email delivery preferences</h2>
                                <p className="emp-settings-subtitle">
                                    Decide which events should send an instant email to your inbox.
                                </p>
                            </div>
                        </div>

                        <div className="emp-settings-card-body">
                            <div className="emp-settings-preference-block">
                                <div className="emp-settings-preference">
                                    <div className="emp-settings-preference-content">
                                        <h3>Direct applications</h3>
                                        <p>
                                            Get notified the moment someone submits to a role with no required tests—those emails include
                                            the candidate’s details, resume link, and the job they applied for so you can reply immediately.
                                        </p>
                                    </div>
                                    <button
                                        className={`emp-settings-toggle ${notifyWithoutTest ? "on" : ""}`}
                                        onClick={() => handleToggleNotification("notifyApplicationsWithoutTest")}
                                        disabled={isSaving || sessionExpired}
                                        aria-pressed={notifyWithoutTest}
                                        aria-label={
                                            notifyWithoutTest
                                                ? "Disable email notifications for direct applications"
                                                : "Enable email notifications for direct applications"
                                        }
                                    >
                                        <span className="emp-settings-toggle-thumb" />
                                    </button>
                                </div>
                            </div>

                            <div className="emp-settings-preference-block">
                                <div className="emp-settings-preference">
                                    <div className="emp-settings-preference-content">
                                        <h3>Basic test completions</h3>
                                        <p>
                                            Once a candidate clears the required basic test (which auto-submits their application),
                                            we’ll email you their readiness summary so you can react instantly.
                                        </p>
                                    </div>
                                    <button
                                        className={`emp-settings-toggle ${notifyBasicTest ? "on" : ""}`}
                                        onClick={() => handleToggleNotification("notifyBasicTestCompletion")}
                                        disabled={isSaving || sessionExpired}
                                        aria-pressed={notifyBasicTest}
                                        aria-label={
                                            notifyBasicTest
                                                ? "Disable email notifications for basic test completions"
                                                : "Enable email notifications for basic test completions"
                                        }
                                    >
                                        <span className="emp-settings-toggle-thumb" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="emp-settings-card simple">
                        <div className="emp-settings-card-header">
                            <div>
                                <p className="emp-settings-card-eyebrow">Account</p>
                                <h2>Email preferences</h2>
                                <p className="emp-settings-subtitle">
                                    Control when you receive email notifications.
                                </p>
                            </div>
                        </div>
                        <div className="emp-settings-card-body">
                            <div className="emp-settings-preference-block">
                                <div className="emp-settings-preference">
                                    <div className="emp-settings-preference-content">
                                        <h3>Receive email alert when login</h3>
                                        <p>
                                            Get an email notification every time you log in to your account. This helps you stay aware of account activity.
                                        </p>
                                    </div>
                                    <button
                                        className={`emp-settings-toggle ${emailAlertOnLogin ? "on" : ""}`}
                                        onClick={handleToggleEmailAlert}
                                        disabled={isSaving || sessionExpired || sendingOtp}
                                        aria-pressed={emailAlertOnLogin}
                                        aria-label={
                                            emailAlertOnLogin
                                                ? "Disable email alert on login"
                                                : "Enable email alert on login"
                                        }
                                    >
                                        <span className="emp-settings-toggle-thumb" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="emp-settings-card simple">
                        <div className="emp-settings-card-header">
                            <div>
                                <p className="emp-settings-card-eyebrow">Account</p>
                                <h2>Keep your company profile up to date</h2>
                                <p className="emp-settings-subtitle">
                                    Manage logos, company details, and contact info from the profile screen.
                                </p>
                            </div>
                        </div>
                        <div className="emp-settings-card-body account">
                            <p>
                                Candidates see your employer profile on every job post. Make sure your branding and contact
                                details stay accurate so applicants know who they&apos;re speaking with.
                            </p>
                            <a className="emp-settings-link-btn" href="/employer/profile">
                                Update profile
                            </a>
                        </div>
                    </section>
                </>
            )}

            {/* Single Modal for Confirmation and OTP */}
            {showModal && (
                <>
                    <div 
                        className="emp-settings-otp-overlay" 
                        onClick={() => {
                            // Disable backdrop click while sending OTP or verifying
                            if (!sendingOtp && !verifyingOtp && modalStep === 'confirmation') {
                                handleCloseModal();
                            }
                        }} 
                    />
                    <div className="emp-settings-otp-modal">
                        <div className="emp-settings-otp-header">
                            <h3>
                                {modalStep === 'confirmation' 
                                    ? (modalAction === 'enable' ? 'Enable Email Alert' : 'Disable Email Alert')
                                    : 'Verify your email'
                                }
                            </h3>
                            <button
                                type="button"
                                className="emp-settings-otp-close"
                                onClick={handleCloseModal}
                                disabled={sendingOtp || verifyingOtp}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="emp-settings-otp-body">
                            {modalStep === 'confirmation' ? (
                                <>
                                    <p className="emp-settings-otp-text">
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
                                    <div className="emp-settings-otp-actions">
                                        <button
                                            type="button"
                                            className="emp-settings-otp-btn-secondary"
                                            onClick={handleCloseModal}
                                            disabled={sendingOtp || verifyingOtp}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="emp-settings-otp-btn-primary"
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
                                    <p className="emp-settings-otp-text">
                                        We've sent a 4-digit OTP to <strong>{userEmail || "your registered email"}</strong>. Please enter it below to {modalAction === 'enable' ? 'enable' : 'disable'} email alerts on login.
                                    </p>
                                    {otpError && (
                                        <div className="emp-settings-otp-error">
                                            {otpError}
                                        </div>
                                    )}
                                    <div className="emp-settings-otp-inputs">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                id={`emp-otp-input-${index}`}
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                className={`emp-settings-otp-input ${otpError ? 'error' : ''}`}
                                                disabled={verifyingOtp || sendingOtp}
                                                autoComplete="off"
                                                autoCorrect="off"
                                                autoCapitalize="off"
                                                spellCheck="false"
                                            />
                                        ))}
                                    </div>
                                    <div className="emp-settings-otp-actions">
                                        <button
                                            type="button"
                                            className="emp-settings-otp-btn-secondary"
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
                                            className="emp-settings-otp-btn-primary"
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
                    <div className="emp-settings-otp-overlay" style={{ zIndex: 3002 }} />
                    <div className="emp-settings-otp-modal" style={{ zIndex: 3003 }}>
                        <div className="emp-settings-otp-header">
                            <h3>Exit verification?</h3>
                            <button
                                type="button"
                                className="emp-settings-otp-close"
                                onClick={() => setShowCloseConfirmation(false)}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <div className="emp-settings-otp-body">
                            <p className="emp-settings-otp-text">
                                Are you sure you want to exit? Your OTP verification will be cancelled and the setting will not be changed.
                            </p>
                            <div className="emp-settings-otp-actions">
                                <button
                                    type="button"
                                    className="emp-settings-otp-btn-secondary"
                                    onClick={() => setShowCloseConfirmation(false)}
                                >
                                    Continue Verification
                                </button>
                                <button
                                    type="button"
                                    className="emp-settings-otp-btn-primary"
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

