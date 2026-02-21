import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Query keys
export const savedJobsKeys = {
    all: ['jobseeker', 'saved-jobs'],
    lists: () => [...savedJobsKeys.all, 'list'],
    list: (filters) => [...savedJobsKeys.lists(), { filters }],
};

// Fetch saved jobs with filters
const fetchSavedJobs = async ({ queryKey }) => {
    const [, , , { filters }] = queryKey;
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const params = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 20,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.jobType && { jobType: filters.jobType }),
        ...(filters.workMode && { workMode: filters.workMode }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
    });

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/saved-jobs?${params.toString()}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to fetch saved jobs');
};

// Toggle save/unsave job
const toggleSaveJob = async ({ jobId }) => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.post(
        `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/save-job`,
        { jobId },
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to save/unsave job');
};

// Hook to get saved jobs
export const useSavedJobs = (filters = {}) => {
    const router = useRouter();

    return useQuery({
        queryKey: savedJobsKeys.list(filters),
        queryFn: fetchSavedJobs,
        enabled: typeof window !== 'undefined' && !!Cookies.get('js_token'),
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/');
                }
                return false;
            }
            return failureCount < 1;
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('js_token');
                router.push('/');
            }
        },
    });
};

// Hook to toggle save/unsave job
export const useToggleSaveJob = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: toggleSaveJob,
        onSuccess: () => {
            // Invalidate saved jobs lists to refetch
            queryClient.invalidateQueries({ 
                queryKey: savedJobsKeys.lists()
            });
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('js_token');
                router.push('/');
            }
        },
    });
};

