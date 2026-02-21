import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Query keys
export const jobSeekerProfileKeys = {
    all: ['jobseeker', 'profile'],
    profile: () => [...jobSeekerProfileKeys.all, 'data'],
};

// Fetch job seeker profile
const fetchJobSeekerProfile = async () => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/profile`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch profile');
};

// Update job seeker profile
const updateJobSeekerProfile = async (formData) => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.put(
        `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/profile`,
        formData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        }
    );

    if (response.data.success) {
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update profile');
};

// Hook to get job seeker profile
export const useJobSeekerProfile = () => {
    const router = useRouter();

    return useQuery({
        queryKey: jobSeekerProfileKeys.profile(),
        queryFn: fetchJobSeekerProfile,
        enabled: typeof window !== 'undefined' && !!Cookies.get('js_token'), // Only fetch on client and if token exists
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        refetchOnMount: false, // Use cached data if available
        refetchOnWindowFocus: false, // Don't refetch on window focus
        retry: (failureCount, error) => {
            // Don't retry on 401 (unauthorized)
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/signin/jobseeker');
                }
                return false;
            }
            return failureCount < 1;
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('js_token');
                router.push('/signin/jobseeker');
            }
        },
    });
};

// Hook to update job seeker profile
export const useUpdateJobSeekerProfile = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: updateJobSeekerProfile,
        onSuccess: (data) => {
            // Optimistically update the cache with new data
            queryClient.setQueryData(jobSeekerProfileKeys.profile(), data);
            // Invalidate to ensure fresh data is fetched if needed
            queryClient.invalidateQueries({ 
                queryKey: jobSeekerProfileKeys.profile(),
                refetchType: 'none' // Don't refetch immediately, use cached data
            });
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('js_token');
                router.push('/signin/jobseeker');
            }
            // Revert optimistic update on error
            queryClient.invalidateQueries({ queryKey: jobSeekerProfileKeys.profile() });
        },
    });
};

