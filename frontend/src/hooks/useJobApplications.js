import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export const jobApplicationsKeys = {
    all: ['jobseeker', 'applications'],
    lists: () => [...jobApplicationsKeys.all, 'list'],
    list: (filters) => [...jobApplicationsKeys.lists(), { filters }]
};

const fetchJobApplications = async ({ queryKey }) => {
    const [, , , { filters }] = queryKey;
    const token = Cookies.get('js_token');

    if (!token) {
        throw new Error('No authentication token');
    }

    const params = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 20
    });

    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.submissionType) params.set('submissionType', filters.submissionType);
    if (filters.jobType) params.set('jobType', filters.jobType);
    if (filters.workMode) params.set('workMode', filters.workMode);
    if (filters.sort) params.set('sort', filters.sort);

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/applications?${params.toString()}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }

    throw new Error(response.data.message || 'Failed to fetch applications');
};

export const useJobApplications = (filters = {}) => {
    const router = useRouter();

    return useQuery({
        queryKey: jobApplicationsKeys.list(filters),
        queryFn: fetchJobApplications,
        enabled: typeof window !== 'undefined' && !!Cookies.get('js_token'),
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
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
        }
    });
};


