import { Suspense } from 'react';
import GoogleOAuthCallbackClient from './GoogleOAuthCallbackClient';

export const dynamic = 'force-dynamic';

export default function GoogleOAuthCallback() {
    return (
        <Suspense fallback={
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
                <div style={{ fontSize: '18px', fontWeight: 500 }}>Loading...</div>
                <div style={{ fontSize: '14px', color: '#9aa0a6' }}>
                    Please wait...
                </div>
            </div>
        }>
            <GoogleOAuthCallbackClient />
        </Suspense>
    );
}

