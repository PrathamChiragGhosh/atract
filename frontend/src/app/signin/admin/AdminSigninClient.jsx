"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import axios from "axios";
import "./page.css";
import { CircularProgress } from '@mui/material';
import Cookies from 'js-cookie';

const AdminSigninClient = () => {
    const router = useRouter();

    // Sign in states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Validation
    const isEmailValid = /\S+@\S+\.\S+/.test(email);

    const isPasswordValid =
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password);

    const formValid = isEmailValid && isPasswordValid;

    // Handle sign in
    const handleSignin = async (e) => {
        e.preventDefault();
        
        if (!formValid) {
            return;
        }

        try {
            setLoading(true);
            setError("");

            // Get base URL from employer URL or use default
            const employerUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL || '';
            const baseUrl = employerUrl.includes('/employer') 
                ? employerUrl.replace('/employer', '') 
                : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
            
            const res = await axios.post(
                `${baseUrl}/admin/signin`,
                {
                    email: email.toLowerCase(),
                    password,
                }
            );

            if (res.data.success) {
                Cookies.set("admin_token", res.data.token);
                window.dispatchEvent(new Event("auth-updated"));
                router.push("/admin");
                return;
            }

            // If signin failed
            setError(res.data.message || "Sign in failed");

        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to sign in. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-signin-wrapper">
            <div className="admin-signin-container">
                <div className="admin-signin-box">
                    {/* Heading */}
                    <h1 className="admin-signin-title">Admin Login</h1>
                    <p className="admin-signin-subtitle">Sign in to access the admin dashboard</p>

                    {/* Form */}
                    <form 
                        className="admin-signin-form"
                        onSubmit={handleSignin}
                        autoComplete="on"
                    >
                        <label className="admin-signin-label">Email Address</label>
                        <input
                            type="email"
                            className="admin-signin-input"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value.toLowerCase());
                                setError("");
                            }}
                            autoComplete="email"
                            name="email"
                            disabled={loading}
                            suppressHydrationWarning
                        />

                        {!isEmailValid && email && (
                            <p className="admin-signin-error">Enter a valid email</p>
                        )}

                        <label className="admin-signin-label">Password</label>
                        <div className="admin-signin-input-wrapper">
                            <input
                                type={showPass ? "text" : "password"}
                                className="admin-signin-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError("");
                                }}
                                autoComplete="current-password"
                                name="password"
                                disabled={loading}
                                suppressHydrationWarning
                            />
                            <span 
                                className="admin-signin-eye-icon" 
                                onClick={() => setShowPass(!showPass)}
                            >
                                {showPass ? <FaEyeSlash /> : <FaEye />}
                            </span>
                        </div>

                        {!isPasswordValid && password && (
                            <p className="admin-signin-error">
                                Must include uppercase, lowercase, number, symbol and 8+ characters.
                            </p>
                        )}

                        <button
                            type="submit"
                            className={`admin-signin-btn ${!formValid || loading ? "admin-signin-btn-disabled" : ""}`}
                            disabled={!formValid || loading}
                        >
                            {loading ? (
                                <CircularProgress size={15} sx={{ color: "white" }} />
                            ) : (
                                "Sign In"
                            )}
                        </button>

                        {error && <p className="admin-signin-error">{error}</p>}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminSigninClient;

