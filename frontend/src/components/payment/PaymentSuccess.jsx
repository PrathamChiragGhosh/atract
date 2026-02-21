"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IoCheckmarkDoneCircle } from "react-icons/io5";
import { CircularProgress } from '@mui/material';
import axios from 'axios';
import Cookies from 'js-cookie';
import './PaymentSuccess.css';

const PaymentSuccess = ({ 
    verificationEndpoint, 
    onSuccessRedirect, 
    onHomeRedirect = "/",
    apiBaseUrl,
    usePost = false
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [amount, setAmount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const verifyPayment = async () => {
            if (typeof window === 'undefined') return;

            const orderId = searchParams?.get('order_id');
            const paymentId = searchParams?.get('payment_id');
            const signature = searchParams?.get('razorpay_signature');
            const sessionId = searchParams?.get('session_id'); // For backward compatibility with Stripe
            const type = searchParams?.get('type'); // smart-select, resume-builder, etc.
            
            // Handle Razorpay payment verification (POST)
            if (usePost && orderId && paymentId) {
                const signature = searchParams?.get('signature');
                if (!signature) {
                    // If no signature in URL, try to verify payment status without signature
                    // This is a fallback for cases where verification already happened
                    try {
                        const token = Cookies.get('emp_token') || Cookies.get('jobseeker_token') || Cookies.get('js_token');
                        const headers = token ? { Authorization: `Bearer ${token}` } : {};

                        const response = await axios.get(
                            `${apiBaseUrl || process.env.NEXT_PUBLIC_EMPLOYER_URL || process.env.NEXT_PUBLIC_JOBSEEKER_URL}${verificationEndpoint}?order_id=${encodeURIComponent(orderId)}&payment_id=${encodeURIComponent(paymentId)}`,
                            { headers }
                        );

                        if (response.data.success) {
                            setAmount(response.data.payment?.amount || response.data.amount);
                            setError(false);

                            // Auto-redirect after 3 seconds if onSuccessRedirect is provided
                            if (onSuccessRedirect) {
                                setTimeout(() => {
                                    router.push(onSuccessRedirect);
                                }, 3000);
                            }
                        } else {
                            setError(true);
                        }
                    } catch (err) {
                        console.error("Payment verification failed:", err);
                        setError(true);
                    } finally {
                        setLoading(false);
                    }
                    return;
                }
                try {
                    const token = Cookies.get('emp_token') || Cookies.get('jobseeker_token') || Cookies.get('js_token');
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};

                    const response = await axios.post(
                        `${apiBaseUrl || process.env.NEXT_PUBLIC_EMPLOYER_URL || process.env.NEXT_PUBLIC_JOBSEEKER_URL}${verificationEndpoint}`,
                        {
                            razorpay_order_id: orderId,
                            razorpay_payment_id: paymentId,
                            razorpay_signature: signature
                        },
                        { headers }
                    );

                    if (response.data.success) {
                        setAmount(response.data.payment?.amount || response.data.amount);
                        setError(false);
                        
                        // Auto-redirect after 3 seconds if onSuccessRedirect is provided
                        if (onSuccessRedirect) {
                            setTimeout(() => {
                                router.push(onSuccessRedirect);
                            }, 3000);
                        }
                    } else {
                        setError(true);
                    }
                } catch (err) {
                    console.error("Payment verification failed:", err);
                    setError(true);
                } finally {
                    setLoading(false);
                }
                return;
            }

            // Handle Stripe payment verification (GET) - for backward compatibility
            if (!usePost && sessionId) {
                // Clean session_id
                let cleanSessionId = sessionId.trim();
                const match = cleanSessionId.match(/^(cs_[a-zA-Z0-9_-]{1,63})/);
                if (match) {
                    cleanSessionId = match[1];
                }

                // Validate session_id
                if (!cleanSessionId || !cleanSessionId.startsWith('cs_')) {
                    console.error("Invalid session ID format");
                    setLoading(false);
                    setError(true);
                    return;
                }

                try {
                    const token = Cookies.get('emp_token') || Cookies.get('jobseeker_token') || Cookies.get('js_token');
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};

                    const response = await axios.get(
                        `${apiBaseUrl || process.env.NEXT_PUBLIC_EMPLOYER_URL || process.env.NEXT_PUBLIC_JOBSEEKER_URL}${verificationEndpoint}?session_id=${encodeURIComponent(cleanSessionId)}`,
                        { headers }
                    );

                    if (response.data.success) {
                        setAmount(response.data.payment?.amount || response.data.amount);
                        setError(false);
                        
                        // Auto-redirect after 3 seconds if onSuccessRedirect is provided
                        if (onSuccessRedirect) {
                            setTimeout(() => {
                                router.push(onSuccessRedirect);
                            }, 3000);
                        }
                    } else {
                        setError(true);
                    }
                } catch (err) {
                    console.error("Payment verification failed:", err);
                    setError(true);
                } finally {
                    setLoading(false);
                }
                return;
            }

            // No valid payment parameters
            setLoading(false);
            setError(true);
        };

        verifyPayment();
    }, [searchParams, verificationEndpoint, onSuccessRedirect, router, apiBaseUrl, usePost]);

    return (
        <div className="payment-success-container">
            <div className="payment-success-box">
                {loading ? (
                    <div className='payment-success-box-loading'>
                        <CircularProgress size={60} />
                        <div className="payment-success-loading-msg">
                            Hold on... we are verifying your payment
                        </div>
                    </div>
                ) : error ? (
                    <div>
                        <div className="payment-success-tick-mark payment-success-tick-mark-fail">
                            <IoCheckmarkDoneCircle />
                        </div>
                        <h1>Something went wrong</h1>
                        <div className="payment-success-message">
                            We couldn't verify your payment. Please contact support.
                        </div>
                        <button className="payment-success-home-btn" onClick={() => router.push(onHomeRedirect)}>
                            Back to Home
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="payment-success-tick-mark">
                            <IoCheckmarkDoneCircle />
                        </div>
                        <h1>Payment Successful</h1>
                        {amount && <div className="payment-success-amount-paid">₹{amount}</div>}
                        <div className="payment-success-message">
                            Thank you! Your payment was processed successfully.
                        </div>
                        <div className="payment-success-btn-row">
                            <button className="payment-success-home-btn" onClick={() => router.push(onHomeRedirect)}>
                                Back to Home
                            </button>
                            {onSuccessRedirect && (
                                <button className="payment-success-dashboard-btn" onClick={() => router.push(onSuccessRedirect)}>
                                    Go to Dashboard
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;

