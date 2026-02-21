"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PaymentSuccess from '@/components/payment/PaymentSuccess';

const PaymentSuccessContent = () => {
    const searchParams = useSearchParams();
    const type = searchParams?.get('type') || 'smart-select';

    // Configure based on payment type
    const getConfig = () => {
        switch (type) {
            case 'smart-select':
                return {
                    verificationEndpoint: '/smart-select/verify-payment',
                    onSuccessRedirect: '/employer/smart-select',
                    apiBaseUrl: process.env.NEXT_PUBLIC_EMPLOYER_URL,
                    usePost: true // Use POST for Razorpay verification
                };
            case 'instant-alerts':
                return {
                    verificationEndpoint: '/instant-alerts/verify-payment',
                    onSuccessRedirect: '/jobseeker/profile',
                    apiBaseUrl: process.env.NEXT_PUBLIC_JOBSEEKER_URL,
                    usePost: true // Use POST for Razorpay verification
                };
            case 'resume-builder':
                return {
                    verificationEndpoint: '/resume-builder/verify-session',
                    onSuccessRedirect: '/jobseeker/resume-builder',
                    apiBaseUrl: process.env.NEXT_PUBLIC_JOBSEEKER_URL
                };
            default:
                return {
                    verificationEndpoint: '/smart-select/verify-session',
                    onSuccessRedirect: '/employer/smart-select',
                    apiBaseUrl: process.env.NEXT_PUBLIC_EMPLOYER_URL
                };
        }
    };

    const config = getConfig();

    return (
        <PaymentSuccess
            verificationEndpoint={config.verificationEndpoint}
            onSuccessRedirect={config.onSuccessRedirect}
            onHomeRedirect="/"
            apiBaseUrl={config.apiBaseUrl}
            usePost={config.usePost || false}
        />
    );
};

const PaymentSuccessPage = () => {
    return (
        <Suspense fallback={
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f8fbff 0%, #e9eef6 100%)'
            }}>
                <div>Loading...</div>
            </div>
        }>
            <PaymentSuccessContent />
        </Suspense>
    );
};

export default PaymentSuccessPage;

