import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Cookies from "js-cookie";
import { employerJobsKeys } from "./useEmployerJobs";
import { updateJobCountsCache } from "./useEmployerJobCounts";
import { jobKeys } from "./usePostJob";

// Analyze smart post
export const useAnalyzeSmartPost = () => {
    return useMutation({
        mutationFn: async ({ jdText, extraPrompt, files }) => {
            const token = Cookies.get("emp_token");
            if (!token) {
                throw new Error('No authentication token');
            }

            const formData = new FormData();
            
            if (jdText) {
                formData.append("jdText", jdText);
            }
            
            if (extraPrompt) {
                formData.append("extraPrompt", extraPrompt);
            }
            
            if (files && files.length > 0) {
                files.forEach((file) => {
                    formData.append("files", file);
                });
            }

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-post/analyze`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            return response.data;
        },
    });
};

// Get smart post job by ID (for polling status)
export const useSmartPostJob = (id, options = {}) => {
    return useQuery({
        queryKey: ["smartPostJob", id],
        queryFn: async () => {
            const token = Cookies.get("emp_token");
            if (!token) {
                throw new Error('No authentication token');
            }

            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-post/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            return response.data;
        },
        enabled: !!id,
        refetchInterval: options.refetchInterval || false, // Can be set to poll
        ...options
    });
};

// Get all smart post jobs
export const useSmartPostJobs = () => {
    return useQuery({
        queryKey: ["smartPostJobs"],
        queryFn: async () => {
            const token = Cookies.get("emp_token");
            if (!token) {
                throw new Error('No authentication token');
            }

            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-post`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            return response.data;
        },
    });
};

// Post job from smart post
export const usePostSmartPostJob = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ smartPostJobId, jobData }) => {
            const token = Cookies.get("emp_token");
            if (!token) {
                throw new Error('No authentication token');
            }

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-post/${smartPostJobId}/post`,
                jobData || {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return { ...response.data, smartPostJobId };
        },
        onSuccess: (data) => {
            const smartPostJobId = data.smartPostJobId;
            const postedJob = data.data; // The created job from backend
            
            // Remove the posted smart post job from cache (it's deleted on backend)
            if (smartPostJobId) {
                queryClient.setQueryData(["smartPostJobs"], (oldData) => {
                    if (!oldData || !oldData.success) return oldData;
                    
                    const filteredData = (oldData.data || []).filter(
                        card => card._id !== smartPostJobId
                    );
                    
                    return {
                        ...oldData,
                        data: filteredData
                    };
                });
            }
            
            // Update employer jobs cache if job data is available
            if (postedJob) {
                // Invalidate public/job queries
                queryClient.invalidateQueries({ queryKey: jobKeys.list() });
                queryClient.invalidateQueries({ queryKey: jobKeys.all });

                // Optimistically update employer "My Jobs" list caches so the new job appears immediately
                const employerJobLists = queryClient.getQueriesData({
                    queryKey: employerJobsKeys.lists(),
                });

                employerJobLists.forEach(([queryKey, listData]) => {
                    if (!listData?.data || !Array.isArray(listData.data)) return;

                    // Last segment of the key is the filters object: { filters: {...} }
                    const lastKeyPart = queryKey[queryKey.length - 1];
                    const filters = lastKeyPart?.filters || {};

                    // Respect status filter: only inject into lists where status matches (or no status filter)
                    const statusFilter = (filters.status || '').toLowerCase();
                    const newStatus = (postedJob.status || '').toLowerCase();
                    if (statusFilter && statusFilter !== newStatus) return;

                    const existingJobs = listData.data;

                    // Avoid duplicates if React Query refetches very quickly
                    const alreadyExists = existingJobs.some((job) => job._id === postedJob._id);
                    if (alreadyExists) return;

                    // Keep within the current page limit if present
                    const limit = filters.limit || existingJobs.length || 10;
                    const updatedJobs = [postedJob, ...existingJobs].slice(0, limit);

                    const updatedPagination = {
                        ...(listData.pagination || {}),
                        totalJobs: (listData.pagination?.totalJobs || 0) + 1,
                    };

                    queryClient.setQueryData(queryKey, {
                        ...listData,
                        data: updatedJobs,
                        pagination: updatedPagination,
                    });
                });

                // Also invalidate employer jobs root key so any other related queries refetch if needed
                queryClient.invalidateQueries({ queryKey: employerJobsKeys.all });
                
                // Update job counts cache if present
                const isActive = postedJob?.status?.toLowerCase() === 'active';
                updateJobCountsCache(queryClient, {
                    totalJobsDelta: 1, // Always increment total jobs
                    activeJobsDelta: isActive ? 1 : 0 // Only increment active if status is Active
                });
            }
        },
    });
};

// Delete smart post job
export const useDeleteSmartPostJob = () => {
    return useMutation({
        mutationFn: async (smartPostJobId) => {
            const token = Cookies.get("emp_token");
            if (!token) {
                throw new Error('No authentication token');
            }

            const response = await axios.delete(
                `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-post/${smartPostJobId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            return response.data;
        },
    });
};

