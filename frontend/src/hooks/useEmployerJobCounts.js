import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { employerJobsKeys } from './useEmployerJobs';

// Query key for job counts
export const employerJobCountsKeys = {
    all: ['employer', 'jobCounts'],
    detail: (employerId) => [...employerJobCountsKeys.all, employerId],
};

// Fetch job counts (uses minimal query to get counts)
const fetchJobCounts = async () => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    // Fetch with minimal limit to get counts from response
    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_JOB_URL}?page=1&limit=1`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return {
            totalJobs: response.data.counts?.totalJobs || response.data.pagination?.totalJobs || 0,
            activeJobs: response.data.counts?.activeJobs || 0
        };
    }
    throw new Error(response.data.message || 'Failed to fetch job counts');
};

// Hook to get employer job counts
export const useEmployerJobCounts = () => {
    const router = useRouter();

    return useQuery({
        queryKey: employerJobCountsKeys.all,
        queryFn: fetchJobCounts,
        enabled: typeof window !== 'undefined' && !!Cookies.get('emp_token'),
        staleTime: 5 * 60 * 1000, // 5 minutes - counts don't change frequently
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
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
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
        },
    });
};

// Helper function to update job counts in cache
export const updateJobCountsCache = (queryClient, updates) => {
    const currentData = queryClient.getQueryData(employerJobCountsKeys.all);
    
    if (currentData) {
        queryClient.setQueryData(employerJobCountsKeys.all, (oldData) => ({
            totalJobs: (oldData?.totalJobs || 0) + (updates.totalJobsDelta || 0),
            activeJobs: (oldData?.activeJobs || 0) + (updates.activeJobsDelta || 0)
        }));
    }
};

// Helper function to set job counts in cache
export const setJobCountsCache = (queryClient, counts) => {
    queryClient.setQueryData(employerJobCountsKeys.all, counts);
};

