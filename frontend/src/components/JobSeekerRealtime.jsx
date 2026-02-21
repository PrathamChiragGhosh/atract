"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Cookies from "js-cookie";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useJobSeekerProfile, jobSeekerProfileKeys } from "@/hooks/useJobSeekerProfile";
import { usePathname } from "next/navigation";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_JOBSEEKER_URL || "";

// Singleton socket across renders to avoid duplicate connections (StrictMode re-renders)
// Persist across HMR/StrictMode by stashing on window
const socketStore = typeof window !== "undefined" ? window : global;
if (!socketStore.__jobseekerSocketState) {
    socketStore.__jobseekerSocketState = {
        socket: null,
        listenersBound: false,
        joinedUserId: null
    };
}
let sharedSocket = socketStore.__jobseekerSocketState.socket;
let sharedListenersBound = socketStore.__jobseekerSocketState.listenersBound;
let sharedJoinedUserId = socketStore.__jobseekerSocketState.joinedUserId;

const statusCopy = {
    processing: "Analyzing your resume for better matches...",
    completed: "Resume insights updated",
    retry_scheduled: "Retrying resume analysis shortly",
    failed: "Resume analysis failed after retries",
    disabled: "Resume analysis disabled"
};

export default function JobSeekerRealtime() {
    const socketRef = useRef(null);
    const queryClient = useQueryClient();
    const { data: profileData } = useJobSeekerProfile();
    const pathname = usePathname();
    const jobAlertToastIdRef = useRef(null);
    const lastStatusToastIdRef = useRef(null);

    useEffect(() => {
        const token = Cookies.get("js_token");
        if (!token || !SOCKET_URL || !profileData?._id) return;

        // Reuse singleton; create once
        if (!sharedSocket) {
            sharedSocket = io(SOCKET_URL, {
                transports: ["websocket", "polling"],
                withCredentials: true,
                autoConnect: false,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            socketStore.__jobseekerSocketState.socket = sharedSocket;
        }
        socketRef.current = sharedSocket;
        if (!sharedSocket.connected) {
            sharedSocket.connect();
        }

        const getProfile = () => queryClient.getQueryData(jobSeekerProfileKeys.profile());

        if (!sharedListenersBound) {
            sharedSocket.on("connect", () => {
                const profile = getProfile();
                if (profile?._id) {
                    sharedJoinedUserId = profile._id;
                    sharedSocket.emit("jobseeker:connect", { jobSeekerId: profile._id });
                    socketStore.__jobseekerSocketState.joinedUserId = profile._id;
                }
            });

            sharedSocket.on("resume:analysis", (payload) => {
                const hasProfile = !!getProfile();
                if (hasProfile) {
                    queryClient.setQueryData(jobSeekerProfileKeys.profile(), (prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            resumeAnalysis: {
                                ...prev.resumeAnalysis,
                                status: payload.status ?? prev.resumeAnalysis?.status,
                                inProgress: payload.inProgress ?? prev.resumeAnalysis?.inProgress,
                                attempts: payload.attempts ?? prev.resumeAnalysis?.attempts,
                                lastStartedAt: payload.lastStartedAt ?? prev.resumeAnalysis?.lastStartedAt,
                                lastCompletedAt: payload.lastCompletedAt ?? prev.resumeAnalysis?.lastCompletedAt,
                                nextRetryAt: payload.nextRetryAt ?? prev.resumeAnalysis?.nextRetryAt,
                                lastError: payload.lastError ?? prev.resumeAnalysis?.lastError,
                                resumePathSnapshot: payload.resumePath ?? prev.resumeAnalysis?.resumePathSnapshot
                            },
                            resumeParsedDetails: {
                                ...prev.resumeParsedDetails,
                                atsScore: payload.atsScore ?? prev.resumeParsedDetails?.atsScore,
                                atsInsights: payload.atsInsights ?? prev.resumeParsedDetails?.atsInsights ?? [],
                                missingSkills: payload.missingSkills ?? prev.resumeParsedDetails?.missingSkills ?? [],
                                skills: payload.skills ?? prev.resumeParsedDetails?.skills ?? [], // Already in order (top most first)
                                mobileNumber: payload.mobileNumber ?? prev.resumeParsedDetails?.mobileNumber ?? null,
                                gender: payload.gender ?? prev.resumeParsedDetails?.gender ?? null,
                                dateOfBirth: payload.dateOfBirth ?? prev.resumeParsedDetails?.dateOfBirth ?? null,
                                address: payload.address ?? prev.resumeParsedDetails?.address ?? null,
                                currentLocation: payload.currentLocation ?? prev.resumeParsedDetails?.currentLocation ?? null,
                                highestQualification: payload.highestQualification ?? prev.resumeParsedDetails?.highestQualification ?? null,
                                passoutYear: payload.passoutYear ?? prev.resumeParsedDetails?.passoutYear ?? null,
                                languages: payload.languages ?? prev.resumeParsedDetails?.languages ?? [],
                                linkedinUrl: payload.linkedinUrl ?? prev.resumeParsedDetails?.linkedinUrl ?? null,
                                githubUrl: payload.githubUrl ?? prev.resumeParsedDetails?.githubUrl ?? null,
                                experienceYears: payload.experienceYears ?? prev.resumeParsedDetails?.experienceYears,
                                jobTitles: payload.jobTitles ?? prev.resumeParsedDetails?.jobTitles ?? [],
                                education: payload.education ?? prev.resumeParsedDetails?.education ?? null,
                                certifications: payload.certifications ?? prev.resumeParsedDetails?.certifications ?? [],
                                projects: payload.projects ?? prev.resumeParsedDetails?.projects ?? [],
                                preferredLocation: payload.preferredLocation ?? prev.resumeParsedDetails?.preferredLocation ?? null,
                                summary: payload.summary ?? prev.resumeParsedDetails?.summary ?? null,
                                aboutMe: payload.aboutMe ?? prev.resumeParsedDetails?.aboutMe ?? null,
                                weaknesses: payload.weaknesses ?? prev.resumeParsedDetails?.weaknesses ?? [],
                                fileUrl: payload.resumePath ?? prev.resumeParsedDetails?.fileUrl
                            }
                        };
                    });
                }

                const msg = statusCopy[payload.status] || "Resume analysis update";
            lastStatusToastIdRef.current = toast.success(msg, {
                position: "top-right",
                duration: 4000,
                id: "resume-analysis-status"
            });

                // Note: Job alert modal is now handled in the profile screen with styled modal
                // No need to show global modal here
            });

            sharedListenersBound = true;
            socketStore.__jobseekerSocketState.listenersBound = true;
        } else {
            // Re-emit connect with current profile when remounting
            const profile = getProfile();
            if (sharedSocket.connected && profile?._id && sharedJoinedUserId !== profile._id) {
                sharedJoinedUserId = profile._id;
                socketStore.__jobseekerSocketState.joinedUserId = profile._id;
                sharedSocket.emit("jobseeker:connect", { jobSeekerId: profile._id });
            }
        }

        return () => {
            // Do not disconnect singleton to allow reuse; listeners stay bound once
        };
    }, [queryClient, profileData?._id]);


    // Dismiss any lingering toasts on route change
    useEffect(() => {
        if (jobAlertToastIdRef.current) {
            toast.dismiss(jobAlertToastIdRef.current);
            jobAlertToastIdRef.current = null;
        }
        if (lastStatusToastIdRef.current) {
            toast.dismiss(lastStatusToastIdRef.current);
            lastStatusToastIdRef.current = null;
        }
    }, [pathname]);

    return null;
}


