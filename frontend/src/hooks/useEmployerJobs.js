import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { updateJobCountsCache, setJobCountsCache } from './useEmployerJobCounts';

// Query keys
export const employerJobsKeys = {
    all: ['employer', 'jobs'],
    lists: () => [...employerJobsKeys.all, 'list'],
    list: (filters) => [...employerJobsKeys.lists(), { filters }],
    details: () => [...employerJobsKeys.all, 'detail'],
    detail: (id) => [...employerJobsKeys.details(), id],
};

// Fetch employer jobs with filters
const fetchEmployerJobs = async ({ queryKey }) => {
    const [, , , { filters }] = queryKey;
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const params = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 10,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.jobType && { jobType: filters.jobType }),
        ...(filters.workMode && { workMode: filters.workMode }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
    });

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_JOB_URL}?${params.toString()}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to fetch jobs');
};

// Helper to update counts cache from jobs response
const updateCountsFromResponse = (queryClient, responseData) => {
    if (responseData?.counts) {
        setJobCountsCache(queryClient, {
            totalJobs: responseData.counts.totalJobs,
            activeJobs: responseData.counts.activeJobs
        });
    }
};

// Fetch single job by ID
const fetchJobById = async (jobId) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_JOB_URL}/${jobId}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch job');
};

// Update job
const updateJob = async ({ jobId, data }) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.put(
        `${process.env.NEXT_PUBLIC_JOB_URL}/${jobId}`,
        data,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update job');
};

// Delete job
const deleteJob = async (jobId) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_JOB_URL}/${jobId}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to delete job');
};

// Hook to get employer jobs
export const useEmployerJobs = (filters = {}) => {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: employerJobsKeys.list(filters),
        queryFn: fetchEmployerJobs,
        enabled: typeof window !== 'undefined' && !!Cookies.get('emp_token'),
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
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
        onSuccess: (data) => {
            // Update counts cache if counts are present in response
            updateCountsFromResponse(queryClient, data);
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
        },
    });
};

// Hook to get single job by ID
export const useJobById = (jobId) => {
    const router = useRouter();

    return useQuery({
        queryKey: employerJobsKeys.detail(jobId),
        queryFn: () => fetchJobById(jobId),
        enabled: typeof window !== 'undefined' && !!Cookies.get('emp_token') && !!jobId,
        staleTime: 2 * 60 * 1000,
        gcTime: 5 * 60 * 1000,
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

// Hook to update job
export const useUpdateJob = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: updateJob,
        onSuccess: (data, variables) => {
            // Get old job data from cache to compare status
            let oldJob = queryClient.getQueryData(employerJobsKeys.detail(variables.jobId));
            
            // If not in detail cache, try to find it in list cache
            if (!oldJob) {
                const listQueries = queryClient.getQueriesData({ queryKey: employerJobsKeys.lists() });
                for (const [, listData] of listQueries) {
                    if (listData?.data) {
                        const foundJob = listData.data.find(job => job._id === variables.jobId);
                        if (foundJob) {
                            oldJob = foundJob;
                            break;
                        }
                    }
                }
            }
            
            const oldStatus = oldJob?.status?.toLowerCase();
            const newStatus = data?.status?.toLowerCase();
            
            // Update the job in the list cache
            queryClient.setQueryData(employerJobsKeys.detail(variables.jobId), data);
            // Invalidate lists to refetch if needed
            queryClient.invalidateQueries({ 
                queryKey: employerJobsKeys.lists(),
                refetchType: 'none'
            });
            
            // Update active jobs count if status changed to/from Active
            // Only update if we know the old status and it's different from new status
            if (oldStatus && oldStatus !== newStatus) {
                const wasActive = oldStatus === 'active';
                const isActive = newStatus === 'active';
                
                if (wasActive && !isActive) {
                    // Status changed from Active to something else - decrement active jobs
                    updateJobCountsCache(queryClient, {
                        activeJobsDelta: -1
                    });
                } else if (!wasActive && isActive) {
                    // Status changed to Active - increment active jobs
                    updateJobCountsCache(queryClient, {
                        activeJobsDelta: 1
                    });
                }
            }
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
        },
    });
};

// Hook to delete job
export const useDeleteJob = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: deleteJob,
        onSuccess: (data, jobId) => {
            // Get old job data from cache to check if it was active
            let oldJob = queryClient.getQueryData(employerJobsKeys.detail(jobId));
            
            // If not in detail cache, try to find it in list cache
            if (!oldJob) {
                const listQueries = queryClient.getQueriesData({ queryKey: employerJobsKeys.lists() });
                for (const [, listData] of listQueries) {
                    if (listData?.data) {
                        const foundJob = listData.data.find(job => job._id === jobId);
                        if (foundJob) {
                            oldJob = foundJob;
                            break;
                        }
                    }
                }
            }
            
            const wasActive = oldJob?.status?.toLowerCase() === 'active';
            
            // Remove job from detail cache
            queryClient.removeQueries({ queryKey: employerJobsKeys.detail(jobId) });
            // Invalidate lists to refetch
            queryClient.invalidateQueries({ 
                queryKey: employerJobsKeys.lists()
            });
            
            // Update job counts cache if present
            updateJobCountsCache(queryClient, {
                totalJobsDelta: -1, // Always decrement total jobs
                activeJobsDelta: wasActive ? -1 : 0 // Only decrement active if job was active
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

