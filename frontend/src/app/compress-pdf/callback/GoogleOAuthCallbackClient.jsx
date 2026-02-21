'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function GoogleOAuthCallbackClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            // Send error to parent window
            if (window.opener) {
                window.opener.postMessage({
                    type: 'GOOGLE_OAUTH_ERROR',
                    error: error === 'access_denied' ? 'Access denied. Please try again.' : 'Authentication failed.'
                }, window.location.origin);
            }
            window.close();
            return;
        }

        if (code) {
            handleOAuthCallback(code);
        } else {
            // No code, send error
            if (window.opener) {
                window.opener.postMessage({
                    type: 'GOOGLE_OAUTH_ERROR',
                    error: 'No authorization code received.'
                }, window.location.origin);
            }
            window.close();
        }
    }, [searchParams, router]);

    const handleOAuthCallback = async (code) => {
        try {
            // Get backend API URL from environment or use default
            const getBackendUrl = () => {
                const jobseekerUrl = process.env.NEXT_PUBLIC_JOBSEEKER_URL || 'http://localhost:5001/jobseeker';
                // Extract base URL and add /api/user
                const baseUrl = jobseekerUrl.replace(/\/jobseeker\/?$/, '');
                return `${baseUrl}/api/user`;
            };
            
            const backendUrl = getBackendUrl();
            const redirectUri = `${window.location.origin}/compress-pdf/callback`;
            
            // Call backend to exchange code for token
            const response = await axios.post(`${backendUrl}/google-oauth-callback`, {
                code: code,
                redirectUri: redirectUri,
            });

            if (response.data.success) {
                // Store PDF user data
                const userData = {
                    email: response.data.email,
                    name: response.data.name || response.data.email.split('@')[0],
                    picture: response.data.picture,
                };
                
                // Store in localStorage
                localStorage.setItem('pdf_token', response.data.token);
                localStorage.setItem('pdf_user', JSON.stringify(userData));
                
                // Send success message to parent window
                if (window.opener) {
                    // Add small delay to ensure message is sent before closing
                    setTimeout(() => {
                        window.opener.postMessage({
                            type: 'GOOGLE_OAUTH_SUCCESS',
                            token: response.data.token,
                            email: response.data.email,
                            name: response.data.name || response.data.email.split('@')[0],
                            picture: response.data.picture,
                        }, window.location.origin);
                        
                        // Close window after a brief moment
                        setTimeout(() => {
                            window.close();
                        }, 100);
                    }, 100);
                } else {
                    // If no opener (direct navigation), redirect to compress-pdf page
                    setTimeout(() => {
                        window.location.href = '/compress-pdf';
                    }, 500);
                }
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (err) {
            console.error('Google OAuth callback error:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to complete Google login. Please try again.';
            
            if (window.opener) {
                setTimeout(() => {
                    window.opener.postMessage({
                        type: 'GOOGLE_OAUTH_ERROR',
                        error: errorMessage
                    }, window.location.origin);
                    
                    setTimeout(() => {
                        window.close();
                    }, 100);
                }, 100);
            } else {
                // Show error on page if no opener
                document.body.innerHTML = `
                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; gap: 16px; background: #202124; color: #e8eaed; padding: 20px; text-align: center;">
                        <div style="font-size: 18px; font-weight: 500;">Login Failed</div>
                        <div style="font-size: 14px; color: #9aa0a6;">${errorMessage}</div>
                        <button onclick="window.close()" style="margin-top: 16px; padding: 10px 20px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
                    </div>
                `;
            }
        }
    };

    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#202124',
            color: '#e8eaed'
        }}>
            <div style={{ fontSize: '18px', fontWeight: 500 }}>Processing Google login...</div>
            <div style={{ fontSize: '14px', color: '#9aa0a6' }}>
                Please wait while we complete your login.
            </div>
        </div>
    );
}

