import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export const resumeBuilderKeys = {
    all: ['resumeBuilder'],
    plan: () => [...resumeBuilderKeys.all, 'plan'],
    planConfig: () => [...resumeBuilderKeys.all, 'planConfig'],
    payments: () => [...resumeBuilderKeys.all, 'payments'],
    creations: () => [...resumeBuilderKeys.all, 'creations'],
    downloads: () => [...resumeBuilderKeys.all, 'downloads'],
    enhancements: () => [...resumeBuilderKeys.all, 'enhancements'],
    resume: (resumeId) => [...resumeBuilderKeys.all, 'resume', resumeId],
    allResumes: () => [...resumeBuilderKeys.all, 'allResumes'],
};

// Get base API URL
const getBaseApiUrl = () => {
    if (typeof window === 'undefined') return '';
    return process.env.NEXT_PUBLIC_JOBSEEKER_URL || process.env.NEXT_PUBLIC_API_URL || '';
};

// Fetch job seeker's Resume Builder plan
const fetchResumeBuilderPlan = async () => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.get(
        `${baseUrl}/resume-builder/plan`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to fetch plan');
};

// Fetch payment history
const fetchPaymentHistory = async () => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.get(
        `${baseUrl}/resume-builder/payments`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.payments || [];
    }
    throw new Error(response.data.message || 'Failed to fetch payments');
};

// Fetch plan configuration
const fetchPlanConfiguration = async () => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.get(
        `${baseUrl}/resume-builder/plan-config`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to fetch plan configuration');
};

// Check creations remaining
const fetchCreations = async () => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.get(
        `${baseUrl}/resume-builder/check-creations`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.creationsRemaining || 0;
    }
    throw new Error(response.data.message || 'Failed to check creations');
};

// Check downloads remaining
const fetchDownloads = async () => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.get(
        `${baseUrl}/resume-builder/check-downloads`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.downloadsRemaining || 0;
    }
    throw new Error(response.data.message || 'Failed to check downloads');
};

// Check enhancements remaining
const fetchEnhancements = async () => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.get(
        `${baseUrl}/resume-builder/check-enhancements`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.enhancementsRemaining || 0;
    }
    throw new Error(response.data.message || 'Failed to check enhancements');
};

// Fetch resume by ID
const fetchResumeById = async ({ queryKey }) => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const resumeId = queryKey[2];
    if (!resumeId) {
        throw new Error('Resume ID is required');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.get(
        `${baseUrl}/resume-builder/get-resume`,
        {
            params: { resumeId },
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to fetch resume');
};

// Generate resume
const generateResume = async (data) => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.post(
        `${baseUrl}/resume-builder/generate-resume`,
        data,
        {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to generate resume');
};

// Fetch all resumes
const fetchAllResumes = async () => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.get(
        `${baseUrl}/resume-builder/get-all-resumes`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.resumes || [];
    }
    throw new Error(response.data.message || 'Failed to fetch resumes');
};

// Update downloads
const updateDownloads = async (templatePlan) => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.post(
        `${baseUrl}/resume-builder/update-downloads`,
        { templatePlan },
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to update downloads');
};

// Create checkout session
const createCheckoutSession = async (planType) => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.post(
        `${baseUrl}/resume-builder/checkout`,
        { planType, currency: 'inr' },
        {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to create checkout session');
};

// Update active plan
const updateActivePlan = async (activePlanType) => {
    const token = Cookies.get('js_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const baseUrl = getBaseApiUrl();
    const response = await axios.put(
        `${baseUrl}/resume-builder/active-plan`,
        { activePlanType },
        {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to update active plan');
};

// Hook to get Resume Builder plan
export const useResumeBuilderPlan = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: resumeBuilderKeys.plan(),
        queryFn: fetchResumeBuilderPlan,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('js_token'),
        staleTime: 2 * 60 * 1000, // 2 minutes
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/signin/jobseeker');
                }
                return false;
            }
            return failureCount < 1;
        },
    });
};

// Hook to get payment history
export const useResumeBuilderPayments = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: resumeBuilderKeys.payments(),
        queryFn: fetchPaymentHistory,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('js_token'),
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/signin/jobseeker');
                }
                return false;
            }
            return failureCount < 1;
        },
    });
};

// Hook to get plan configuration
export const useResumeBuilderPlanConfig = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: resumeBuilderKeys.planConfig(),
        queryFn: fetchPlanConfiguration,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('js_token'),
        staleTime: 5 * 60 * 1000, // 5 minutes - config doesn't change often
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/signin/jobseeker');
                }
                return false;
            }
            return failureCount < 1;
        },
    });
};

// Hook to check creations
export const useResumeBuilderCreations = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: resumeBuilderKeys.creations(),
        queryFn: fetchCreations,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('js_token'),
        staleTime: 0, // Always consider data stale to ensure fresh data after plan switch
        refetchOnMount: true, // Always refetch when component mounts to get latest count
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/signin/jobseeker');
                }
                return false;
            }
            return failureCount < 1;
        },
    });
};

// Hook to check downloads
export const useResumeBuilderDownloads = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: resumeBuilderKeys.downloads(),
        queryFn: fetchDownloads,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('js_token'),
        staleTime: 1 * 60 * 1000, // 1 minute
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/signin/jobseeker');
                }
                return false;
            }
            return failureCount < 1;
        },
    });
};

// Hook to check enhancements
export const useResumeBuilderEnhancements = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: resumeBuilderKeys.enhancements(),
        queryFn: fetchEnhancements,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('js_token'),
        staleTime: 1 * 60 * 1000, // 1 minute
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/signin/jobseeker');
                }
                return false;
            }
            return failureCount < 1;
        },
    });
};

// Hook to get resume by ID
export const useResumeById = (resumeId) => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isValidId = resumeId && typeof resumeId === 'string' && resumeId.trim().length > 0;

    return useQuery({
        queryKey: resumeBuilderKeys.resume(resumeId),
        queryFn: fetchResumeById,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('js_token') && isValidId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/signin/jobseeker');
                }
                return false;
            }
            return failureCount < 1;
        },
    });
};

// Hook to generate resume
export const useGenerateResume = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: generateResume,
        onSuccess: async () => {
            // Invalidate and refetch related queries to ensure UI updates
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.plan() }),
                queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.planConfig() }),
                queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.creations() }),
                queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.allResumes() })
            ]);
            // Refetch to ensure immediate UI update
            await queryClient.refetchQueries({ queryKey: resumeBuilderKeys.plan() });
            await queryClient.refetchQueries({ queryKey: resumeBuilderKeys.creations() });
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('js_token');
                router.push('/signin/jobseeker');
            }
        },
    });
};

// Hook to update downloads
export const useUpdateDownloads = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateDownloads,
        onSuccess: () => {
            // Invalidate downloads query
            queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.downloads() });
            queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.plan() });
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('js_token');
                router.push('/signin/jobseeker');
            }
        },
    });
};

// Hook to create checkout session
export const useCreateCheckoutSession = () => {
    const router = useRouter();

    return useMutation({
        mutationFn: createCheckoutSession,
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('js_token');
                router.push('/signin/jobseeker');
            }
        },
    });
};

// Hook to update active plan
export const useUpdateActivePlan = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateActivePlan,
        onSuccess: () => {
            // Invalidate plan config to refetch with new active plan
            queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.planConfig() });
            queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.plan() });
            // Invalidate creations, downloads, and enhancements to refetch with new active plan
            queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.creations() });
            queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.downloads() });
            queryClient.invalidateQueries({ queryKey: resumeBuilderKeys.enhancements() });
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('js_token');
                router.push('/signin/jobseeker');
            }
        },
    });
};

// Hook to fetch all resumes
export const useAllResumes = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: resumeBuilderKeys.allResumes(),
        queryFn: fetchAllResumes,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('js_token'),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
            if (error?.response?.status === 401) {
                if (typeof window !== 'undefined') {
                    Cookies.remove('js_token');
                    router.push('/signin/jobseeker');
                }
                return false;
            }
            return failureCount < 1;
        },
    });
};

