import { Suspense } from 'react';
import DownloadResumePageClient from './DownloadResumePageClient';

export default function DownloadResumePage() {
    return (
        <Suspense fallback={
            <div className="resumebuilder-download-container">
                <div className="resumebuilder-download-loading">
                    <p>Loading...</p>
                </div>
            </div>
        }>
            <DownloadResumePageClient />
        </Suspense>
    );
}

