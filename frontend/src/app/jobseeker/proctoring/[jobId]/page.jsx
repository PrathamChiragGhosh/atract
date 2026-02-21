"use client";

import { use } from "react";
import VideoProctoringPortal from "@/components/videoProctoringPortal/VideoProctoringPortal";

const unwrap = (maybePromise) => (typeof maybePromise?.then === "function" ? use(maybePromise) : maybePromise);

const VideoProctoringPage = ({ params, searchParams }) => {
    const resolvedParams = unwrap(params) || {};
    const resolvedSearch = unwrap(searchParams) || {};

    const jobId = resolvedParams.jobId || resolvedSearch.jobId || null;
    const attemptId = resolvedSearch.attemptId || null;

    if (!jobId || jobId === "undefined") {
        return (
            <div style={{ padding: "32px", fontFamily: "Inter, sans-serif" }}>
                <p>Unable to locate this job. Please return to the job board and relaunch the video test.</p>
            </div>
        );
    }

    return (
        <VideoProctoringPortal jobId={jobId} initialAttemptId={attemptId} />
    );
};

export default VideoProctoringPage;


