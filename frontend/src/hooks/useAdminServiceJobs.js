import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Cookies from "js-cookie";

const getBaseUrl = () => {
    const employerUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL || '';
    return employerUrl.includes('/employer')
        ? employerUrl.replace('/employer', '')
        : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
};

const getAuthHeaders = () => {
    const token = Cookies.get('admin_token');
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

// Fetch all service jobs
export const useServiceJobs = (params = {}) => {
    return useQuery({
        queryKey: ['admin', 'service-jobs', params],
        queryFn: async () => {
            const baseUrl = getBaseUrl();
            const queryString = new URLSearchParams(params).toString();
            const response = await axios.get(
                `${baseUrl}/admin/service-jobs${queryString ? `?${queryString}` : ''}`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        staleTime: 30000, // 30 seconds
    });
};

// Create service job
export const useCreateServiceJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (jobData) => {
            const baseUrl = getBaseUrl();
            const response = await axios.post(
                `${baseUrl}/admin/service-jobs`,
                jobData,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'service-jobs'] });
        },
    });
};

// Update service job
export const useUpdateServiceJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updateData }) => {
            const baseUrl = getBaseUrl();
            const response = await axios.put(
                `${baseUrl}/admin/service-jobs/${id}`,
                updateData,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'service-jobs'] });
        },
    });
};

// Delete service job
export const useDeleteServiceJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            const baseUrl = getBaseUrl();
            const response = await axios.delete(
                `${baseUrl}/admin/service-jobs/${id}`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'service-jobs'] });
        },
    });
};

// Get service job by ID
export const useServiceJob = (id) => {
    return useQuery({
        queryKey: ['admin', 'service-jobs', id],
        queryFn: async () => {
            const baseUrl = getBaseUrl();
            const response = await axios.get(
                `${baseUrl}/admin/service-jobs/${id}`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        enabled: !!id,
    });
};

// Get service jobs by client
export const useServiceJobsByClient = (clientId) => {
    return useQuery({
        queryKey: ['admin', 'service-jobs', 'client', clientId],
        queryFn: async () => {
            const baseUrl = getBaseUrl();
            const response = await axios.get(
                `${baseUrl}/admin/service-jobs/client/${clientId}`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        enabled: !!clientId,
    });
};

