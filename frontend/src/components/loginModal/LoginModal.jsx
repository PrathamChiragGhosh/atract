"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import { CircularProgress } from "@mui/material";
import axios from "axios";
import Cookies from "js-cookie";
import "./LoginModal.css";

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);
    const router = useRouter();
    const [mode, setMode] = useState("login"); // 'login' or 'signup'
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Signup states
    const [signupEmail, setSignupEmail] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [step3, setStep3] = useState(false);
    const [fullName, setFullName] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [confirmRegPassword, setConfirmRegPassword] = useState("");
    const [showPassReg, setShowPassReg] = useState(false);
    const [showPassReg2, setShowPassReg2] = useState(false);

    // Validation
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
        regPassValid &&
        regConfirmMatch;

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        if (!formValid || loading) return;

        try {
            setLoading(true);
            setError("");

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/login`,
                {
                    email: email.toLowerCase(),
                    password: password,
                }
            );

            if (response.data.success) {
                Cookies.set("js_token", response.data.token, { expires: 7 });
                window.dispatchEvent(new Event("auth-updated"));
                onLoginSuccess?.();
                onClose();
                // Reset form
                setEmail("");
                setPassword("");
                setError("");
            } else {
                setError(response.data.message || "Login failed");
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Login failed. Please check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        if (!validSignupEmail || loading) return;

        try {
            setLoading(true);
            setError("");

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/generate-otp`,
                {
                    loginType: "E-Mail",
                    loginValue: signupEmail.toLowerCase(),
                }
            );

            if (res.data.success) {
                setOtpSent(true);
                setError("");
            } else {
                setError(res.data.message || "Failed to send OTP");
            }
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to send OTP. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (value, idx) => {
        if (!/^[0-9]?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[idx] = value;
        setOtp(newOtp);
        setError("");

        if (value && idx < 3) {
            document.getElementById(`login-otp-${idx + 1}`)?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const otpValue = otp.join("");
        if (otpValue.length !== 4 || loading) return;

        try {
            setLoading(true);
            setError("");

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/check-otp`,
                {
                    loginType: "E-Mail",
                    loginValue: signupEmail.toLowerCase(),
                    otp: otpValue,
                }
            );

            if (res.data.success) {
                setStep3(true);
                setError("");
            } else {
                setError(res.data.message || "Invalid OTP");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Invalid OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        if (e) e.preventDefault();
        if (!registrationValid || loading) return;

        try {
            setLoading(true);
            setError("");

            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/register`,
                {
                    fullName: fullName.trim(),
                    email: signupEmail.toLowerCase(),
                    password: regPassword,
                }
            );

            if (res.data.success) {
                Cookies.set("js_token", res.data.token, { expires: 7 });
                window.dispatchEvent(new Event("auth-updated"));
                onLoginSuccess?.();
                onClose();
                // Reset form
                resetSignupFlow();
            } else {
                setError(res.data.message || "Registration failed");
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Registration failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const resetSignupFlow = () => {
        setSignupEmail("");
        setOtpSent(false);
        setOtp(["", "", "", ""]);
        setStep3(false);
        setFullName("");
        setRegPassword("");
        setConfirmRegPassword("");
        setError("");
    };

    const switchMode = (m) => {
        setMode(m);
        setError("");
        if (m === "login") {
            resetSignupFlow();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="login-modal-overlay" onClick={onClose}>
            <div className="login-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="login-modal-content">
                    <div className="login-modal-header">
                        <h2 className="login-modal-title">
                            {mode === "login" ? "Login" : "Create Account"}
                        </h2>
                        <button className="login-modal-close" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="login-modal-body">
                        {/* Login Form */}
                        {mode === "login" && (
                            <form className="login-form" onSubmit={handleLogin}>
                                <div className="login-form-group">
                                    <label className="login-label">Email Address</label>
                                    <input
                                        type="email"
                                        className="login-input"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value.toLowerCase());
                                            setError("");
                                        }}
                                        autoComplete="email"
                                        disabled={loading}
                                    />
                                    {!isEmailValid && email && (
                                        <p className="login-error">Enter a valid email</p>
                                    )}
                                </div>

                                <div className="login-form-group">
                                    <label className="login-label">Password</label>
                                    <div className="login-input-wrapper">
                                        <input
                                            type={showPass ? "text" : "password"}
                                            className="login-input"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setError("");
                                            }}
                                            autoComplete="current-password"
                                            disabled={loading}
                                        />
                                        <span
                                            className="login-eye-icon"
                                            onClick={() => setShowPass(!showPass)}
                                        >
                                            {showPass ? <FaEyeSlash /> : <FaEye />}
                                        </span>
                                    </div>
                                    {!isPasswordValid && password && (
                                        <p className="login-error">
                                            Must include uppercase, lowercase, number, symbol and 8+ characters.
                                        </p>
                                    )}
                                </div>

                                {error && <p className="login-error">{error}</p>}

                                <button
                                    type="submit"
                                    className={`login-submit-btn ${!formValid || loading ? "disabled" : ""}`}
                                    disabled={!formValid || loading}
                                >
                                    {loading ? (
                                        <CircularProgress size={18} sx={{ color: "white" }} />
                                    ) : (
                                        "Login"
                                    )}
                                </button>

                                <div className="login-switch-mode">
                                    <p>
                                        Don't have an account?{" "}
                                        <button
                                            type="button"
                                            className="login-link-btn"
                                            onClick={() => switchMode("signup")}
                                        >
                                            Create Account
                                        </button>
                                    </p>
                                </div>
                            </form>
                        )}

                        {/* Signup Form */}
                        {mode === "signup" && (
                            <>
                                {!otpSent && !step3 && (
                                    <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
                                        <div className="login-form-group">
                                            <label className="login-label">Email Address</label>
                                            <input
                                                type="email"
                                                className="login-input"
                                                placeholder="Enter your email"
                                                value={signupEmail}
                                                onChange={(e) => {
                                                    setSignupEmail(e.target.value.toLowerCase());
                                                    setError("");
                                                }}
                                                autoComplete="email"
                                                disabled={loading}
                                            />
                                            {!validSignupEmail && signupEmail && (
                                                <p className="login-error">Enter a valid email</p>
                                            )}
                                        </div>

                                        {error && <p className="login-error">{error}</p>}

                                        <button
                                            type="submit"
                                            className={`login-submit-btn ${!validSignupEmail || loading ? "disabled" : ""}`}
                                            disabled={!validSignupEmail || loading}
                                        >
                                            {loading ? (
                                                <CircularProgress size={18} sx={{ color: "white" }} />
                                            ) : (
                                                "Send OTP"
                                            )}
                                        </button>

                                        <div className="login-switch-mode">
                                            <p>
                                                Already have an account?{" "}
                                                <button
                                                    type="button"
                                                    className="login-link-btn"
                                                    onClick={() => switchMode("login")}
                                                >
                                                    Login
                                                </button>
                                            </p>
                                        </div>
                                    </form>
                                )}

                                {otpSent && !step3 && (
                                    <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}>
                                        <div className="login-form-group">
                                            <label className="login-label">Enter OTP</label>
                                            <div className="login-otp-container">
                                                {otp.map((digit, idx) => (
                                                    <input
                                                        key={idx}
                                                        id={`login-otp-${idx}`}
                                                        type="text"
                                                        className="login-otp-input"
                                                        maxLength={1}
                                                        value={digit}
                                                        onChange={(e) => handleOtpChange(e.target.value, idx)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Backspace" && !otp[idx] && idx > 0) {
                                                                document.getElementById(`login-otp-${idx - 1}`)?.focus();
                                                            }
                                                        }}
                                                        disabled={loading}
                                                    />
                                                ))}
                                            </div>
                                            {error && <p className="login-error">{error}</p>}
                                        </div>

                                        <button
                                            type="submit"
                                            className={`login-submit-btn ${otp.join("").length !== 4 || loading ? "disabled" : ""}`}
                                            disabled={otp.join("").length !== 4 || loading}
                                        >
                                            {loading ? (
                                                <CircularProgress size={18} sx={{ color: "white" }} />
                                            ) : (
                                                "Verify OTP"
                                            )}
                                        </button>
                                    </form>
                                )}

                                {step3 && (
                                    <form className="login-form" onSubmit={handleRegister}>
                                        <div className="login-form-group">
                                            <label className="login-label">Full Name</label>
                                            <input
                                                type="text"
                                                className="login-input"
                                                placeholder="Enter your full name"
                                                value={fullName}
                                                onChange={(e) => {
                                                    setFullName(e.target.value);
                                                    setError("");
                                                }}
                                                disabled={loading}
                                            />
                                            {(fullName.length > 0 && (fullName.length < 3 || fullName.length > 40)) && (
                                                <p className="login-error">Name must be between 3 and 40 characters</p>
                                            )}
                                        </div>

                                        <div className="login-form-group">
                                            <label className="login-label">Password</label>
                                            <div className="login-input-wrapper">
                                                <input
                                                    type={showPassReg ? "text" : "password"}
                                                    className="login-input"
                                                    placeholder="Enter your password"
                                                    value={regPassword}
                                                    onChange={(e) => {
                                                        setRegPassword(e.target.value);
                                                        setError("");
                                                    }}
                                                    autoComplete="new-password"
                                                    disabled={loading}
                                                />
                                                <span
                                                    className="login-eye-icon"
                                                    onClick={() => setShowPassReg(!showPassReg)}
                                                >
                                                    {showPassReg ? <FaEyeSlash /> : <FaEye />}
                                                </span>
                                            </div>
                                            {!regPassValid && regPassword && (
                                                <p className="login-error">
                                                    Must include uppercase, lowercase, number, symbol and 8+ characters.
                                                </p>
                                            )}
                                        </div>

                                        <div className="login-form-group">
                                            <label className="login-label">Confirm Password</label>
                                            <div className="login-input-wrapper">
                                                <input
                                                    type={showPassReg2 ? "text" : "password"}
                                                    className="login-input"
                                                    placeholder="Confirm your password"
                                                    value={confirmRegPassword}
                                                    onChange={(e) => {
                                                        setConfirmRegPassword(e.target.value);
                                                        setError("");
                                                    }}
                                                    autoComplete="new-password"
                                                    disabled={loading}
                                                />
                                                <span
                                                    className="login-eye-icon"
                                                    onClick={() => setShowPassReg2(!showPassReg2)}
                                                >
                                                    {showPassReg2 ? <FaEyeSlash /> : <FaEye />}
                                                </span>
                                            </div>
                                            {!regConfirmMatch && confirmRegPassword && (
                                                <p className="login-error">Passwords do not match</p>
                                            )}
                                        </div>

                                        {error && <p className="login-error">{error}</p>}

                                        <button
                                            type="submit"
                                            className={`login-submit-btn ${!registrationValid || loading ? "disabled" : ""}`}
                                            disabled={!registrationValid || loading}
                                        >
                                            {loading ? (
                                                <CircularProgress size={18} sx={{ color: "white" }} />
                                            ) : (
                                                "Create Account"
                                            )}
                                        </button>

                                        <div className="login-switch-mode">
                                            <p>
                                                Already have an account?{" "}
                                                <button
                                                    type="button"
                                                    className="login-link-btn"
                                                    onClick={() => switchMode("login")}
                                                >
                                                    Login
                                                </button>
                                            </p>
                                        </div>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;

