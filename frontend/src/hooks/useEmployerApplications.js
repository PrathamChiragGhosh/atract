import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Query keys
export const employerApplicationsKeys = {
    all: ['employer', 'applications'],
    lists: () => [...employerApplicationsKeys.all, 'list'],
    list: (filters) => [...employerApplicationsKeys.lists(), { filters }],
};

// Fetch employer applications with filters
const fetchEmployerApplications = async ({ queryKey }) => {
    const [, , , { filters }] = queryKey;
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const params = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 20,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.submissionType && { submissionType: filters.submissionType }),
        ...(filters.jobIds && Array.isArray(filters.jobIds) && filters.jobIds.length > 0 && { jobIds: filters.jobIds.join(',') }),
        ...(filters.sort && { sort: filters.sort }),
    });

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/applications?${params.toString()}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to fetch applications');
};

// Hook to get employer applications
export const useEmployerApplications = (filters = {}) => {
    const router = useRouter();

    return useQuery({
        queryKey: employerApplicationsKeys.list(filters),
        queryFn: fetchEmployerApplications,
        enabled: typeof window !== 'undefined' && !!Cookies.get('emp_token'),
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('emp_token');
                    router.push('/');
                }
                return false;
            }
            return failureCount < 1;
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('emp_token');
                router.push('/');
            }
        },
    });
};

