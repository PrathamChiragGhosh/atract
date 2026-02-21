import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export const smartSelectKeys = {
    all: ['smartSelect'],
    plan: () => [...smartSelectKeys.all, 'plan'],
    planConfig: () => [...smartSelectKeys.all, 'planConfig'],
    payments: () => [...smartSelectKeys.all, 'payments'],
    analysisHistory: () => [...smartSelectKeys.all, 'analysisHistory'],
};

// Fetch employer's Smart Select plan
const fetchSmartSelectPlan = async () => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/plan`,
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
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/payments`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.payments || [];
    }
    throw new Error(response.data.message || 'Failed to fetch payments');
};

// Fetch analysis history
const fetchAnalysisHistory = async () => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/analysis-history`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.data || [];
    }
    throw new Error(response.data.message || 'Failed to fetch analysis history');
};

// Hook to get Smart Select plan
export const useSmartSelectPlan = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: smartSelectKeys.plan(),
        queryFn: fetchSmartSelectPlan,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('emp_token'),
        staleTime: 2 * 60 * 1000, // 2 minutes
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

// Hook to get payment history
export const useSmartSelectPayments = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: smartSelectKeys.payments(),
        queryFn: fetchPaymentHistory,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('emp_token'),
        staleTime: 5 * 60 * 1000, // 5 minutes
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

// Fetch plan configuration
const fetchPlanConfiguration = async () => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.get(
        `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/plan-config`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (response.data.success) {
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch plan configuration');
};

// Hook to get analysis history
export const useSmartSelectAnalysisHistory = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: smartSelectKeys.analysisHistory(),
        queryFn: fetchAnalysisHistory,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('emp_token'),
        staleTime: 2 * 60 * 1000, // 2 minutes
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

// Hook to get plan configuration
export const useSmartSelectPlanConfig = () => {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return useQuery({
        queryKey: smartSelectKeys.planConfig(),
        queryFn: fetchPlanConfiguration,
        enabled: mounted && typeof window !== 'undefined' && !!Cookies.get('emp_token'),
        staleTime: 5 * 60 * 1000, // 5 minutes - config doesn't change often
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

// Update active plan
const updateActivePlan = async (activePlanType) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.put(
        `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/smart-select/active-plan`,
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

// Hook to update active plan
export const useUpdateActivePlan = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateActivePlan,
        onSuccess: () => {
            // Invalidate plan config to refetch with new active plan
            queryClient.invalidateQueries({ queryKey: smartSelectKeys.planConfig() });
            queryClient.invalidateQueries({ queryKey: smartSelectKeys.plan() });
        },
        onError: (error) => {
            if (error?.response?.status === 401 && typeof window !== 'undefined') {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
        },
    });
};

