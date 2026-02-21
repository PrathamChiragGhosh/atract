import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Query keys
export const blogPublisherKeys = {
    all: ['blogPublisher'],
    settings: () => [...blogPublisherKeys.all, 'settings'],
};

// Get base API URL
const getBaseApiUrl = () => {
    const employerUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL || '';
    const baseUrl = employerUrl.includes('/employer') 
        ? employerUrl.replace('/employer', '') 
        : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
    return baseUrl;
};

// Fetch blog publisher settings
const fetchBlogPublisherSettings = async () => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const apiUrl = `${baseUrl}/api/blog-publisher/settings`;

    const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
    });

    // Backend returns { enabled, time, keywords, allowedEmails } directly (no success field for GET)
    return {
        settings: {
            enabled: response.data.enabled || false,
            time: response.data.time || '09:00',
            extraKeywords: response.data.keywords || [],
            allowedEmails: response.data.allowedEmails || [],
        }
    };
};

// Update blog publisher settings
const updateBlogPublisherSettings = async (data) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const apiUrl = `${baseUrl}/api/blog-publisher/settings`;

    const response = await axios.post(
        apiUrl,
        {
            enabled: data.enabled,
            time: data.time || '09:00',
            keywords: data.extraKeywords || [],
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (response.data.success) {
        return {
            settings: {
                enabled: response.data.enabled || false,
                time: response.data.time || '09:00',
                extraKeywords: response.data.keywords || [],
                allowedEmails: response.data.allowedEmails || [],
            }
        };
    }
    throw new Error(response.data.message || 'Failed to update settings');
};

// Hook to get blog publisher settings
export const useBlogPublisherSettings = () => {
    const router = useRouter();

    return useQuery({
        queryKey: blogPublisherKeys.settings(),
        queryFn: fetchBlogPublisherSettings,
        enabled: typeof window !== 'undefined' && !!Cookies.get('emp_token'),
        staleTime: 5 * 60 * 1000, // 5 minutes
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

// Hook to update blog publisher settings
export const useUpdateBlogPublisherSettings = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: updateBlogPublisherSettings,
        onSuccess: (data) => {
            queryClient.setQueryData(blogPublisherKeys.settings(), data);
            queryClient.invalidateQueries({
                queryKey: blogPublisherKeys.settings(),
                refetchType: 'none'
            });
        },
        onError: (error) => {
            if (error?.response?.status === 401) {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
            queryClient.invalidateQueries({ queryKey: blogPublisherKeys.settings() });
        },
    });
};

