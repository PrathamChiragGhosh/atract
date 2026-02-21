import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { updateJobCountsCache } from './useEmployerJobCounts';
import { employerJobsKeys } from './useEmployerJobs';

// Query keys
export const jobKeys = {
    all: ['job'],
    employer: (employerId) => [...jobKeys.all, 'employer', employerId],
    list: () => [...jobKeys.all, 'list'],
    detail: (jobId) => [...jobKeys.all, 'detail', jobId],
};

// Post a new job
const postJob = async (jobData) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.post(
        `${process.env.NEXT_PUBLIC_JOB_URL}`,
        jobData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (response.data.success) {
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to post job');
};

// Hook to post a job
export const usePostJob = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: postJob,
        onSuccess: (data) => {
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
                const newStatus = (data.status || '').toLowerCase();
                if (statusFilter && statusFilter !== newStatus) return;

                const existingJobs = listData.data;

                // Avoid duplicates if React Query refetches very quickly
                const alreadyExists = existingJobs.some((job) => job._id === data._id);
                if (alreadyExists) return;

                // Keep within the current page limit if present
                const limit = filters.limit || existingJobs.length || 10;
                const updatedJobs = [data, ...existingJobs].slice(0, limit);

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
            const isActive = data?.status?.toLowerCase() === 'active';
            updateJobCountsCache(queryClient, {
                totalJobsDelta: 1, // Always increment total jobs
                activeJobsDelta: isActive ? 1 : 0 // Only increment active if status is Active
            });
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
        },
    });
};

