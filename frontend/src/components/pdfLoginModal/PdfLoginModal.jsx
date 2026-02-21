"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTimes } from "react-icons/fa";
import Cookies from "js-cookie";
import "./PdfLoginModal.css";

const PdfLoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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


    const handleGoogleLogin = () => {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        
        // Check if Google Client ID is configured
        if (!clientId) {
            setError("Google OAuth is not configured. Please contact administrator.");
            return;
        }

        setLoading(true);
        setError("");

        // Google OAuth login
        const width = 500;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const redirectUri = `${window.location.origin}/compress-pdf/callback`;
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile&access_type=offline&prompt=consent`;
        
        const popup = window.open(
            googleAuthUrl,
            'Google Sign In',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
            setError("Popup blocked. Please allow popups for this site.");
            setLoading(false);
            return;
        }

        // Listen for OAuth callback
        const checkClosed = setInterval(() => {
            if (popup?.closed) {
                clearInterval(checkClosed);
                setLoading(false);
            }
        }, 1000);

        // Listen for message from popup (OAuth callback)
        const messageHandler = (event) => {
            // Verify origin for security
            if (event.origin !== window.location.origin) {
                console.log('Ignoring message from different origin:', event.origin);
                return;
            }
            
            console.log('Received message:', event.data);
            
            if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
                clearInterval(checkClosed);
                window.removeEventListener('message', messageHandler);
                setLoading(false);
                
                // Store PDF user data
                const userData = {
                    email: event.data.email,
                    name: event.data.name || event.data.email.split("@")[0],
                    picture: event.data.picture,
                };
                
                console.log('Storing PDF user data:', userData);
                localStorage.setItem("pdf_token", event.data.token);
                localStorage.setItem("pdf_user", JSON.stringify(userData));
                
                // Also set in cookies for compatibility
                Cookies.set("pdf_token", event.data.token, { expires: 30 });
                
                // Dispatch auth update event
                window.dispatchEvent(new Event("pdf-auth-updated"));
                
                // Call login success callback first (which handles navigation)
                onLoginSuccess?.();
                
                // Then close modal
                setTimeout(() => {
                    onClose();
                }, 100);
            } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
                clearInterval(checkClosed);
                window.removeEventListener('message', messageHandler);
                setLoading(false);
                setError(event.data.error || "Google login failed. Please try again.");
                console.error('Google OAuth error:', event.data.error);
            }
        };

        window.addEventListener('message', messageHandler);
        
        // Cleanup after 5 minutes
        setTimeout(() => {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            setLoading(false);
            if (popup && !popup.closed) {
                popup.close();
            }
        }, 5 * 60 * 1000);
    };

    if (!isOpen) return null;

    return (
        <div className="pdf-login-overlay" onClick={onClose}>
            <div className="pdf-login-container" onClick={(e) => e.stopPropagation()}>
                <div className="pdf-login-content">
                    {/* Header */}
                    <div className="pdf-login-header">
                        <div className="pdf-login-header-left">
                            <div className="pdf-login-google-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                            </div>
                            <span className="pdf-login-header-text">Sign in with Google</span>
                        </div>
                        <button 
                            className="pdf-login-close-btn"
                            onClick={onClose}
                            disabled={loading}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    {/* Main Content - Google Login Only */}
                    <div className="pdf-login-main">
                        <div className="pdf-login-title">Sign in to Atract</div>
                        
                        <div className="pdf-login-google-only">
                            <div className="pdf-login-google-container">
                                <div className="pdf-login-google-icon-large">
                                    <svg width="48" height="48" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                </div>
                                
                                <div className="pdf-login-google-info">
                                    <p className="pdf-login-google-text">
                                        Sign in with your Google account to continue
                                    </p>
                                    <p className="pdf-login-google-subtext">
                                        We'll use your Google email to access PDF compression features
                                    </p>
                                </div>

                                {error && <p className="pdf-login-error">{error}</p>}

                                <button
                                    className="pdf-login-google-primary-btn"
                                    onClick={handleGoogleLogin}
                                    disabled={loading || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
                                    type="button"
                                >
                                    {loading ? (
                                        <div className="pdf-login-spinner"></div>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '12px' }}>
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                    )}
                                    {loading ? "Signing in..." : "Continue with Google"}
                                </button>

                                {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
                                    <p className="pdf-login-config-error">
                                        Google OAuth is not configured. Please contact administrator.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PdfLoginModal;

