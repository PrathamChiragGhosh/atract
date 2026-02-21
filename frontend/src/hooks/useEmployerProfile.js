import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Query keys
export const employerProfileKeys = {
    all: ['employer', 'profile'],
    profile: () => [...employerProfileKeys.all, 'data'],
};

// Fetch employer profile
const fetchEmployerProfile = async () => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/profile`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch profile');
};

// Update employer profile
const updateEmployerProfile = async (formData) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.put(
        `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/profile`,
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

// Hook to get employer profile
export const useEmployerProfile = () => {
    const router = useRouter();

    return useQuery({
        queryKey: employerProfileKeys.profile(),
        queryFn: fetchEmployerProfile,
        enabled: typeof window !== 'undefined' && !!Cookies.get('emp_token'), // Only fetch on client and if token exists
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        refetchOnMount: false, // Use cached data if available
        refetchOnWindowFocus: false, // Don't refetch on window focus
        retry: (failureCount, error) => {
            // Don't retry on 401 (unauthorized)
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

// Hook to update employer profile
export const useUpdateEmployerProfile = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: updateEmployerProfile,
        onSuccess: (data) => {
            // Optimistically update the cache with new data
            queryClient.setQueryData(employerProfileKeys.profile(), data);
            // Invalidate to ensure fresh data is fetched if needed
            queryClient.invalidateQueries({ 
                queryKey: employerProfileKeys.profile(),
                refetchType: 'none' // Don't refetch immediately, use cached data
            });
        },
        onError: (error) => {
            if (error?.response?.status === 401) {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
            // Revert optimistic update on error
            queryClient.invalidateQueries({ queryKey: employerProfileKeys.profile() });
        },
    });
};

