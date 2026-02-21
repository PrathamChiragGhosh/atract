"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Image from "next/image";
import axios from "axios";
import "./page.css";
import signInImage2 from "@/assets/signin-image2.png";
import { CircularProgress } from '@mui/material';
import Cookies from 'js-cookie';
import Link from "next/link";


const EmployerAuthPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [mode, setMode] = useState("signin");

    // -----------------------------
    // SIGN IN STATES
    // -----------------------------
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);

    // -----------------------------
    // SIGN UP (3-step)
    // -----------------------------
    const [signupEmail, setSignupEmail] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [step3, setStep3] = useState(false);

    // Step 3 fields
    const [fullName, setFullName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [confirmRegPassword, setConfirmRegPassword] = useState("");
    const [showPassReg, setShowPassReg] = useState(false);
    const [showPassReg2, setShowPassReg2] = useState(false);

    // UI STATES
    const [loading, setLoading] = useState(false);
    const [otpError, setOtpError] = useState("");
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // -----------------------------
    // FORGOT PASSWORD STATES
    // -----------------------------
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotOtpSent, setForgotOtpSent] = useState(false);
    const [forgotOtp, setForgotOtp] = useState(["", "", "", ""]);
    const [forgotOtpVerified, setForgotOtpVerified] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [forgotPasswordError, setForgotPasswordError] = useState("");
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

    // Load mode from URL
    useEffect(() => {
        const reg = searchParams.get("register");
        setMode(reg === "true" ? "signup" : "signin");
    }, [searchParams]);

    const switchMode = (m) => {
        if (m === "signup") {
            router.replace("/signin/employer?register=true");
            resetSignupFlow();
        } else {
            router.replace("/signin/employer");
            setSignupEmail("");
            setOtpSent(false);
            setOtp(["", "", "", ""]);
            setFullName("");
            setCompanyName("");
            setRegPassword("");
            setConfirmRegPassword("");
            setOtpError("");
        }
    };

    const resetSignupFlow = () => {
        setSignupEmail("");
        setOtpSent(false);
        setOtp(["", "", "", ""]);
        setStep3(false);
        setFullName("");
        setCompanyName("");
        setRegPassword("");
        setConfirmRegPassword("");
        setOtpError("");
        setAcceptedTerms(false);
    };

    // -----------------------------
    // VALIDATION
    // -----------------------------
    const isEmailValid = /\S+@\S+\.\S+/.test(email);

    const isPasswordValid =
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password);

    const formValid = isEmailValid && isPasswordValid;

    const validSignupEmail = /\S+@\S+\.\S+/.test(signupEmail.toLowerCase());

    const regPassValid =
        regPassword.length >= 8 &&
        /[A-Z]/.test(regPassword) &&
        /[a-z]/.test(regPassword) &&
        /[0-9]/.test(regPassword) &&
        /[^A-Za-z0-9]/.test(regPassword);

    const regConfirmMatch = regPassword === confirmRegPassword;

    const registrationValid =
        fullName.length >= 3 &&
        fullName.length <= 40 &&
        companyName.length >= 2 &&
        companyName.length <= 100 &&
        regPassValid &&
        regConfirmMatch;


    // -----------------------------
    // OTP Step
    // -----------------------------
    const handleOtpChange = (value, idx) => {
        if (!/^[0-9]?$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[idx] = value;
        setOtp(newOtp);
        setOtpError("")

        if (value && idx < 3) {
            document.getElementById(`otp-${idx + 1}`)?.focus();
        }
    };

    const handleOtpBackspace = (e, idx) => {
        if (e.key === "Backspace" && !otp[idx] && idx > 0) {
            document.getElementById(`otp-${idx - 1}`)?.focus();
        }
    };

    // -----------------------------
    // SEND OTP API
    // -----------------------------
    const handleSendOtp = async () => {
        try {
            setLoading(true);
            setOtpError("");

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/generate-otp`,
                {
                    loginType: "E-Mail",
                    loginValue: signupEmail.toLowerCase(),
                }
            );

            if (res.data.success) {
                setOtpSent(true);
            } else {
                if (res.data.alreadyExists) {
                    setOtpError("Account already exists with this email. Use a different email.");
                    return;
                }
                setOtpError("Failed to send OTP. Try again.");
            }
        } catch (err) {
            setOtpError(
                err.response?.data?.message || "Unable to send OTP. Try again."
            );
        } finally {
            setLoading(false);
        }
    };



    // -----------------------------
    // VERIFY OTP API
    // -----------------------------
    const handleVerifyOtp = async () => {
        try {
            setLoading(true);
            setOtpError("");

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/check-otp`,
                {
                    loginType: "E-Mail",
                    loginValue: signupEmail.toLowerCase(),
                    otp: otp,
                }
            );

            if (res.data.success) {
                // OTP Correct — Move to Step 3
                setStep3(true);
                return;
            }

            // Account exists
            if (res.data.alreadyExists) {
                setOtpError("Account already exists with this email. Use a different email.");
                return;
            }

            // Invalid OTP
            setOtpError(res.data.message || "Invalid OTP. Try again.");

        } catch (err) {
            setOtpError("Unable to verify OTP. Try again.");
        } finally {
            setLoading(false);
        }
    };



    const handleRegistration = async () => {
        try {
            setLoading(true);
            setOtpError("");

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/register`,
                {
                    fullName,
                    companyName,
                    email: signupEmail.toLowerCase(),
                    password: regPassword,
                }
            );

            if (res.data.success) {
                const { token } = res.data;

                if (token) {
                    Cookies.set('emp_token', token);
                    window.dispatchEvent(new Event("auth-updated"));
                    router.push("/employer/home");
                }
            } else if (res.data.alreadyExists) {
                setOtpError("Account already exists with this email.");
            } else {
                setOtpError(res.data.message || "Registration failed.");
            }

        } catch (err) {
            setOtpError("Unable to complete registration.");
        } finally {
            setLoading(false);
        }
    };


    const handleLogin = async () => {
        try {
            setLoading(true);
            setOtpError("");

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/login`,
                {
                    email: email.toLowerCase(),
                    password,
                }
            );

            if (res.data.success) {
                Cookies.set("emp_token", res.data.token);
                window.dispatchEvent(new Event("auth-updated"));
                router.push("/employer/home");
                return;
            }

            // If login failed
            setOtpError(res.data.message || "Login failed");

        } catch (err) {
            setOtpError("Unable to login. Try again.");
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------
    // FORGOT PASSWORD HANDLERS
    // -----------------------------
    const handleForgotOtpChange = (value, idx) => {
        if (!/^[0-9]?$/.test(value)) return;

        const newOtp = [...forgotOtp];
        newOtp[idx] = value;
        setForgotOtp(newOtp);
        setForgotPasswordError("");

        if (value && idx < 3) {
            document.getElementById(`forgot-otp-${idx + 1}`)?.focus();
        }
    };

    const handleForgotOtpBackspace = (e, idx) => {
        if (e.key === "Backspace" && !forgotOtp[idx] && idx > 0) {
            document.getElementById(`forgot-otp-${idx - 1}`)?.focus();
        }
    };

    const handleSendForgotOtp = async () => {
        try {
            setForgotPasswordLoading(true);
            setForgotPasswordError("");

            if (!/\S+@\S+\.\S+/.test(forgotEmail.toLowerCase())) {
                setForgotPasswordError("Enter a valid email");
                return;
            }

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/forgot-password/send-otp`,
                { email: forgotEmail.toLowerCase() }
            );

            if (res.data.success) {
                setForgotOtpSent(true);
            } else {
                setForgotPasswordError(res.data.message || "Failed to send OTP. Try again.");
            }
        } catch (err) {
            setForgotPasswordError(
                err.response?.data?.message || "Unable to send OTP. Try again."
            );
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    const handleVerifyForgotOtp = async () => {
        try {
            setForgotPasswordLoading(true);
            setForgotPasswordError("");

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/forgot-password/verify-otp`,
                {
                    email: forgotEmail.toLowerCase(),
                    otp: forgotOtp.join(""),
                }
            );

            if (res.data.success) {
                setForgotOtpVerified(true);
            } else {
                setForgotPasswordError(res.data.message || "Invalid OTP. Try again.");
            }
        } catch (err) {
            setForgotPasswordError(
                err.response?.data?.message || "Unable to verify OTP. Try again."
            );
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            setForgotPasswordLoading(true);
            setForgotPasswordError("");

            const isNewPasswordValid =
                newPassword.length >= 8 &&
                /[A-Z]/.test(newPassword) &&
                /[a-z]/.test(newPassword) &&
                /[0-9]/.test(newPassword) &&
                /[^A-Za-z0-9]/.test(newPassword);

            if (!isNewPasswordValid) {
                setForgotPasswordError(
                    "Password must include uppercase, lowercase, number, symbol and 8+ characters."
                );
                return;
            }

            if (newPassword !== confirmPassword) {
                setForgotPasswordError("Passwords do not match");
                return;
            }

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/forgot-password/reset`,
                {
                    email: forgotEmail.toLowerCase(),
                    otp: forgotOtp.join(""),
                    newPassword,
                    confirmPassword,
                }
            );

            if (res.data.success) {
                // Close modal and show success message
                setShowForgotPassword(false);
                setOtpError("Password reset successfully! Please check your email for confirmation.");
                // Reset forgot password states
                setForgotEmail("");
                setForgotOtpSent(false);
                setForgotOtp(["", "", "", ""]);
                setForgotOtpVerified(false);
                setNewPassword("");
                setConfirmPassword("");
                setForgotPasswordError("");
            } else {
                setForgotPasswordError(res.data.message || "Failed to reset password.");
            }
        } catch (err) {
            setForgotPasswordError(
                err.response?.data?.message || "Unable to reset password. Try again."
            );
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    const resetForgotPasswordFlow = () => {
        setForgotEmail("");
        setForgotOtpSent(false);
        setForgotOtp(["", "", "", ""]);
        setForgotOtpVerified(false);
        setNewPassword("");
        setConfirmPassword("");
        setForgotPasswordError("");
    };


    return (
        <div className="auth-full-wrapper">
            {/* LEFT SIDE */}
            <div className="auth-left">
                <Image src={signInImage2} alt="Employer Auth" className="auth-left-image" priority />

                <div className="auth-left-overlay">
                    <div className="overlay-bg">
                        <h1>Find Better Talent</h1>
                        <p>Post jobs, find candidates, and build your team with confidence.</p>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="auth-right">
                <div className="auth-box">

                    {/* HEADINGS */}
                    {mode === "signin" ? (
                        <>
                            <h1 className="auth-title">Welcome Back</h1>
                            <p className="auth-subtitle">Login to continue your journey.</p>
                        </>
                    ) : (
                        <>
                            <h1 className="auth-title">
                                {step3 ? "Complete Your Registration" : "Create Your Account"}
                            </h1>

                            <p className="auth-subtitle">
                                {step3 ? "Finish setting up your account." : "Start your journey today."}
                            </p>
                        </>
                    )}

                    {/* ---------------------- SIGN IN ---------------------- */}
                    {mode === "signin" && (
                        <form className="auth-form"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleLogin();
                            }}
                            autoComplete="on"
                        >
                            <label className="auth-label">Email Address</label>
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value.toLowerCase())
                                    setOtpError("")
                                }}
                                autoComplete="email"
                                name="email"
                                disabled={loading}
                            />

                            {!isEmailValid && email && (
                                <p className="auth-error">Enter a valid email</p>
                            )}

                            <label className="auth-label">Password</label>

                            <div className="auth-input-wrapper">
                                <input
                                    type={showPass ? "text" : "password"}
                                    className="auth-input"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value)
                                        setOtpError("")
                                    }}
                                    autoComplete="current-password"
                                    name="password"
                                    disabled={loading}
                                />
                                <span className="eye-icon" onClick={() => setShowPass(!showPass)}>
                                    {showPass ? <FaEyeSlash /> : <FaEye />}
                                </span>
                            </div>

                            {!isPasswordValid && password && (
                                <p className="auth-error">
                                    Must include uppercase, lowercase, number, symbol and 8+ characters.
                                </p>
                            )}

                            <button
                                type="submit"
                                className={`auth-btn ${!formValid || loading ? "disabled" : ""}`}
                                disabled={!formValid || loading}
                            >
                                {loading ? <CircularProgress size={15} sx={{ color: "white" }} /> : "Login"}
                            </button>
                            {otpError && <p className="auth-error">{otpError}</p>}

                            <div className="auth-bottom-links">
                                <a 
                                    className="forgot-link" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (showCloseConfirmation) {
                                            setShowCloseConfirmation(false);
                                        }
                                        setShowForgotPassword(true);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    Forgot Password?
                                </a>
                            </div>
                        </form>
                    )}

                    {/* ---------------------- SIGN UP FLOW ---------------------- */}
                    {mode === "signup" && (
                        <div className="auth-form">

                            {/* STEP 1 - EMAIL */}
                            {!otpSent && !step3 && (
                                <>
                                    <label className="auth-label">Email Address</label>

                                    <input
                                        type="email"
                                        className="auth-input"
                                        placeholder="Enter your email"
                                        value={signupEmail}
                                        onChange={(e) => {
                                            setSignupEmail(e.target.value.toLowerCase());
                                            setOtpError("");
                                        }}
                                        disabled={loading}
                                    />

                                    {signupEmail && !validSignupEmail && (
                                        <p className="auth-error">Enter a valid email</p>
                                    )}

                                    {otpError && (
                                        <p className="auth-error">{otpError}</p>
                                    )}

                                    <div className="auth-terms-checkbox">
                                        <input
                                            type="checkbox"
                                            id="employer-terms-checkbox"
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                            className="auth-terms-checkbox-input"
                                        />
                                        <label htmlFor="employer-terms-checkbox" className="auth-terms-checkbox-label">
                                            I agree to the{" "}
                                            <Link 
                                                href="/employer/terms" 
                                                target="_blank"
                                                className="auth-terms-link"
                                            >
                                                Terms & Conditions
                                            </Link>
                                        </label>
                                    </div>

                                    <button
                                        className={`auth-btn ${!validSignupEmail || !acceptedTerms || loading ? "disabled" : ""}`}
                                        disabled={!validSignupEmail || !acceptedTerms || loading}
                                        onClick={handleSendOtp}
                                    >
                                        {loading ? <CircularProgress sx={{ color: 'white' }} thickness={3} size={15} /> : "Send OTP"}
                                    </button>
                                </>
                            )}

                            {/* STEP 2 - OTP */}
                            {otpSent && !step3 && (
                                <>
                                    <p className="otp-info-text">
                                        A 4-digit OTP has been sent to <b>{signupEmail}</b>
                                    </p>

                                    <div className="otp-container">
                                        {otp.map((d, idx) => (
                                            <input
                                                key={idx}
                                                id={`otp-${idx}`}
                                                maxLength={1}
                                                className="otp-input"
                                                value={d}
                                                onChange={(e) => handleOtpChange(e.target.value, idx)}
                                                onKeyDown={(e) => handleOtpBackspace(e, idx)}
                                                autoComplete="off"
                                                inputMode="numeric"
                                            />
                                        ))}
                                    </div>

                                    {otpError && <p className="auth-error">{otpError}</p>}

                                    <button
                                        className={`auth-btn ${otp.join("").length !== 4 || loading ? "disabled" : ""}`}
                                        disabled={otp.join("").length !== 4 || loading}
                                        onClick={handleVerifyOtp}
                                    >
                                        {loading ? (
                                            <CircularProgress sx={{ color: "white" }} size={15} thickness={3} />
                                        ) : (
                                            "Verify OTP"
                                        )}
                                    </button>

                                    <button className="change-email-btn" onClick={resetSignupFlow}>
                                        Change Email
                                    </button>
                                </>
                            )}

                            {/* STEP 3 - FINAL DETAILS */}
                            {step3 && (
                                <>
                                    {/* FULL NAME */}
                                    <label className="auth-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="auth-input"
                                        placeholder="Enter full name"
                                        value={fullName}
                                        maxLength={40}
                                        onChange={(e) => {
                                            setFullName(e.target.value);
                                            setOtpError("");
                                        }}
                                    />

                                    {fullName && fullName.length < 3 && (
                                        <p className="auth-error">Full name must be at least 3 characters</p>
                                    )}

                                    {/* COMPANY NAME */}
                                    <label className="auth-label">Company Name</label>
                                    <input
                                        type="text"
                                        className="auth-input"
                                        placeholder="Enter company name"
                                        value={companyName}
                                        maxLength={100}
                                        onChange={(e) => {
                                            setCompanyName(e.target.value);
                                            setOtpError("");
                                        }}
                                    />

                                    {companyName && companyName.length < 2 && (
                                        <p className="auth-error">Company name must be at least 2 characters</p>
                                    )}

                                    {/* PASSWORD */}
                                    <label className="auth-label">Password</label>
                                    <div className="auth-input-wrapper">
                                        <input
                                            type={showPassReg ? "text" : "password"}
                                            className="auth-input"
                                            placeholder="Create a password"
                                            value={regPassword}
                                            onChange={(e) => {
                                                setRegPassword(e.target.value);
                                                setOtpError("");
                                            }}
                                        />
                                        <span className="eye-icon" onClick={() => setShowPassReg(!showPassReg)}>
                                            {showPassReg ? <FaEyeSlash /> : <FaEye />}
                                        </span>
                                    </div>

                                    {/* PASSWORD VALIDATION */}
                                    {regPassword && !regPassValid && (
                                        <p className="auth-error">
                                            Must include: uppercase, lowercase, number, special character & min 8 characters.
                                        </p>
                                    )}

                                    {/* CONFIRM PASSWORD */}
                                    <label className="auth-label">Confirm Password</label>
                                    <div className="auth-input-wrapper">
                                        <input
                                            type={showPassReg2 ? "text" : "password"}
                                            className="auth-input"
                                            placeholder="Confirm password"
                                            value={confirmRegPassword}
                                            onChange={(e) => {
                                                setConfirmRegPassword(e.target.value);
                                                setOtpError("");
                                            }}
                                        />
                                        <span className="eye-icon" onClick={() => setShowPassReg2(!showPassReg2)}>
                                            {showPassReg2 ? <FaEyeSlash /> : <FaEye />}
                                        </span>
                                    </div>

                                    {/* PASSWORD MATCH ERROR */}
                                    {confirmRegPassword && !regConfirmMatch && (
                                        <p className="auth-error">Passwords do not match</p>
                                    )}

                                    {/* COMPLETE REGISTRATION BUTTON */}
                                    <button
                                        className={`auth-btn ${!registrationValid || loading ? "disabled" : ""}`}
                                        disabled={!registrationValid || loading}
                                        onClick={handleRegistration}
                                    >
                                        {loading ? (
                                            <CircularProgress sx={{ color: "white" }} size={15} thickness={3} />
                                        ) : (
                                            "Complete Registration"
                                        )}
                                    </button>

                                    {otpError && <p className="auth-error">{otpError}</p>}
                                </>
                            )}
                        </div>
                    )}

                </div>

                {/* SWITCH SIGNIN / SIGNUP */}
                <div className="auth-register-box">
                    {mode === "signin" ? (
                        <>
                            <p>Don't have an account?</p>
                            <button onClick={() => switchMode("signup")} className="auth-register-btn">
                                Create Account
                            </button>
                        </>
                    ) : (
                        <>
                            <p>Already have an account?</p>
                            <button onClick={() => switchMode("signin")} className="auth-register-btn">
                                Sign In
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* FORGOT PASSWORD MODAL */}
            {showForgotPassword && (
                <>
                    <div
                        className="forgot-password-overlay"
                        onClick={() => {
                            if (forgotPasswordLoading) {
                                setShowCloseConfirmation(true);
                            } else {
                                setShowForgotPassword(false);
                                resetForgotPasswordFlow();
                            }
                        }}
                    ></div>
                    <div className="forgot-password-modal">
                        <div className="forgot-password-header">
                            <h2>Reset Password</h2>
                            <button
                                className="forgot-password-close"
                                onClick={() => {
                                    if (forgotPasswordLoading) {
                                        setShowCloseConfirmation(true);
                                    } else {
                                        setShowForgotPassword(false);
                                        resetForgotPasswordFlow();
                                    }
                                }}
                                disabled={forgotPasswordLoading}
                            >
                                ×
                            </button>
                        </div>

                        <div className="forgot-password-body">
                            {/* STEP 1 - EMAIL */}
                            {!forgotOtpSent && !forgotOtpVerified && (
                                <>
                                    <p className="forgot-password-info">
                                        Enter your email address and we'll send you an OTP to reset your password.
                                    </p>
                                    <label className="auth-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="auth-input"
                                        placeholder="Enter your email"
                                        value={forgotEmail}
                                        onChange={(e) => {
                                            setForgotEmail(e.target.value.toLowerCase());
                                            setForgotPasswordError("");
                                        }}
                                        disabled={forgotPasswordLoading}
                                        autoFocus
                                    />
                                    {forgotPasswordError && (
                                        <p className="auth-error">{forgotPasswordError}</p>
                                    )}
                                    <button
                                        className={`auth-btn ${!/\S+@\S+\.\S+/.test(forgotEmail.toLowerCase()) || forgotPasswordLoading ? "disabled" : ""}`}
                                        disabled={!/\S+@\S+\.\S+/.test(forgotEmail.toLowerCase()) || forgotPasswordLoading}
                                        onClick={handleSendForgotOtp}
                                    >
                                        {forgotPasswordLoading ? (
                                            <CircularProgress sx={{ color: 'white' }} thickness={3} size={15} />
                                        ) : (
                                            "Send OTP"
                                        )}
                                    </button>
                                </>
                            )}

                            {/* STEP 2 - OTP */}
                            {forgotOtpSent && !forgotOtpVerified && (
                                <>
                                    <p className="otp-info-text">
                                        A 4-digit OTP has been sent to <b>{forgotEmail}</b>
                                    </p>
                                    <div className="otp-container">
                                        {forgotOtp.map((d, idx) => (
                                            <input
                                                key={idx}
                                                id={`forgot-otp-${idx}`}
                                                maxLength={1}
                                                className="otp-input"
                                                value={d}
                                                onChange={(e) => handleForgotOtpChange(e.target.value, idx)}
                                                onKeyDown={(e) => handleForgotOtpBackspace(e, idx)}
                                                autoComplete="off"
                                                autoCorrect="off"
                                                autoCapitalize="off"
                                                spellCheck="false"
                                                inputMode="numeric"
                                                disabled={forgotPasswordLoading}
                                            />
                                        ))}
                                    </div>
                                    {forgotPasswordError && <p className="auth-error">{forgotPasswordError}</p>}
                                    <button
                                        className={`auth-btn ${forgotOtp.join("").length !== 4 || forgotPasswordLoading ? "disabled" : ""}`}
                                        disabled={forgotOtp.join("").length !== 4 || forgotPasswordLoading}
                                        onClick={handleVerifyForgotOtp}
                                    >
                                        {forgotPasswordLoading ? (
                                            <CircularProgress sx={{ color: "white" }} size={15} thickness={3} />
                                        ) : (
                                            "Verify OTP"
                                        )}
                                    </button>
                                    <button
                                        className="change-email-btn"
                                        onClick={resetForgotPasswordFlow}
                                        disabled={forgotPasswordLoading}
                                    >
                                        Change Email
                                    </button>
                                </>
                            )}

                            {/* STEP 3 - NEW PASSWORD */}
                            {forgotOtpVerified && (
                                <>
                                    <p className="forgot-password-info">
                                        Create a new password for your account.
                                    </p>
                                    <label className="auth-label">New Password</label>
                                    <div className="auth-input-wrapper">
                                        <input
                                            type={showNewPass ? "text" : "password"}
                                            className="auth-input"
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => {
                                                setNewPassword(e.target.value);
                                                setForgotPasswordError("");
                                            }}
                                            disabled={forgotPasswordLoading}
                                            autoFocus
                                        />
                                        <span className="eye-icon" onClick={() => setShowNewPass(!showNewPass)}>
                                            {showNewPass ? <FaEyeSlash /> : <FaEye />}
                                        </span>
                                    </div>
                                    {newPassword && !(
                                        newPassword.length >= 8 &&
                                        /[A-Z]/.test(newPassword) &&
                                        /[a-z]/.test(newPassword) &&
                                        /[0-9]/.test(newPassword) &&
                                        /[^A-Za-z0-9]/.test(newPassword)
                                    ) && (
                                        <p className="auth-error">
                                            Must include uppercase, lowercase, number, symbol and 8+ characters.
                                        </p>
                                    )}
                                    <label className="auth-label">Confirm Password</label>
                                    <div className="auth-input-wrapper">
                                        <input
                                            type={showConfirmPass ? "text" : "password"}
                                            className="auth-input"
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value);
                                                setForgotPasswordError("");
                                            }}
                                            disabled={forgotPasswordLoading}
                                        />
                                        <span className="eye-icon" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                                            {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                                        </span>
                                    </div>
                                    {confirmPassword && newPassword !== confirmPassword && (
                                        <p className="auth-error">Passwords do not match</p>
                                    )}
                                    {forgotPasswordError && <p className="auth-error">{forgotPasswordError}</p>}
                                    <button
                                        className={`auth-btn ${!(
                                            newPassword.length >= 8 &&
                                            /[A-Z]/.test(newPassword) &&
                                            /[a-z]/.test(newPassword) &&
                                            /[0-9]/.test(newPassword) &&
                                            /[^A-Za-z0-9]/.test(newPassword) &&
                                            newPassword === confirmPassword
                                        ) || forgotPasswordLoading ? "disabled" : ""}`}
                                        disabled={!(
                                            newPassword.length >= 8 &&
                                            /[A-Z]/.test(newPassword) &&
                                            /[a-z]/.test(newPassword) &&
                                            /[0-9]/.test(newPassword) &&
                                            /[^A-Za-z0-9]/.test(newPassword) &&
                                            newPassword === confirmPassword
                                        ) || forgotPasswordLoading}
                                        onClick={handleResetPassword}
                                    >
                                        {forgotPasswordLoading ? (
                                            <CircularProgress sx={{ color: "white" }} size={15} thickness={3} />
                                        ) : (
                                            "Update Password"
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* CLOSE CONFIRMATION MODAL */}
                    {showCloseConfirmation && (
                        <>
                            <div
                                className="forgot-password-overlay"
                                onClick={() => setShowCloseConfirmation(false)}
                            ></div>
                            <div className="forgot-password-confirmation-modal">
                                <div className="forgot-password-confirmation-header">
                                    <h3>Exit Password Reset?</h3>
                                </div>
                                <div className="forgot-password-confirmation-body">
                                    <p>An operation is in progress. Are you sure you want to exit? Your progress will be lost.</p>
                                </div>
                                <div className="forgot-password-confirmation-actions">
                                    <button
                                        className="forgot-password-confirmation-cancel"
                                        onClick={() => setShowCloseConfirmation(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="forgot-password-confirmation-confirm"
                                        onClick={() => {
                                            setShowCloseConfirmation(false);
                                            setShowForgotPassword(false);
                                            resetForgotPasswordFlow();
                                        }}
                                    >
                                        Exit
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}



export default EmployerAuthPage;

