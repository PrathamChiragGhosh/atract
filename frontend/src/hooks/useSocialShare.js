import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { employerJobsKeys } from './useEmployerJobs';

// Get pending social share count
const getPendingSocialShareCount = async () => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_JOB_URL}/pending-social-share-count`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (response.data.success) {
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get pending count');
};

// Generate social share for jobs
const generateSocialShare = async ({ generateInBackground = false }) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.post(
        `${process.env.NEXT_PUBLIC_JOB_URL}/generate-social-share`,
        { generateInBackground },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            validateStatus: (status) => status === 200 || status === 202 // Accept both 200 and 202
        }
    );

    if (response.data.success) {
        // If status is 202, it means background processing started
        // Return the response with a flag indicating it's in progress
        if (response.status === 202) {
            return {
                ...response.data.data,
                isBackground: true,
                status: 'processing'
            };
        }
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to generate social share');
};

export const usePendingSocialShareCount = () => {
    const router = useRouter();

    return useQuery({
        queryKey: ['socialShare', 'pendingCount'],
        queryFn: getPendingSocialShareCount,
        enabled: typeof window !== 'undefined' && !!Cookies.get('emp_token'),
        staleTime: 30 * 1000, // 30 seconds
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('emp_token');
                    router.push('/signin/employer');
                }
                return false;
            }
            return failureCount < 1;
        },
    });
};

// Generate social share for a single job
const generateSocialShareForSingleJob = async ({ jobId, generateInBackground = false }) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.post(
        `${process.env.NEXT_PUBLIC_JOB_URL}/${jobId}/generate-social-share`,
        { generateInBackground },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            validateStatus: (status) => status === 200 || status === 202 // Accept both 200 and 202
        }
    );

    if (response.data.success) {
        // If status is 202, it means background processing started
        // Return the response with a flag indicating it's in progress
        if (response.status === 202) {
            return {
                ...response.data.data,
                isBackground: true,
                status: 'processing'
            };
        }
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to generate social share');
};

export const useGenerateSocialShare = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: generateSocialShare,
        onSuccess: () => {
            // Invalidate jobs list to refresh with updated social share content
            queryClient.invalidateQueries({ queryKey: employerJobsKeys.lists() });
            // Invalidate pending count
            queryClient.invalidateQueries({ queryKey: ['socialShare', 'pendingCount'] });
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
        },
    });
};

export const useGenerateSocialShareForSingleJob = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: generateSocialShareForSingleJob,
        onSuccess: () => {
            // Invalidate jobs list to refresh with updated social share content
            queryClient.invalidateQueries({ queryKey: employerJobsKeys.lists() });
            // Invalidate pending count
            queryClient.invalidateQueries({ queryKey: ['socialShare', 'pendingCount'] });
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
        },
    });
};

