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

// Fetch all clients
export const useClients = (params = {}) => {
    return useQuery({
        queryKey: ['admin', 'clients', params],
        queryFn: async () => {
            const baseUrl = getBaseUrl();
            const queryString = new URLSearchParams(params).toString();
            const response = await axios.get(
                `${baseUrl}/admin/clients${queryString ? `?${queryString}` : ''}`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        staleTime: 30000, // 30 seconds
    });
};

// Create client
export const useCreateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (clientData) => {
            const baseUrl = getBaseUrl();
            const response = await axios.post(
                `${baseUrl}/admin/clients`,
                clientData,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
        },
    });
};

// Update client
export const useUpdateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updateData }) => {
            const baseUrl = getBaseUrl();
            const response = await axios.put(
                `${baseUrl}/admin/clients/${id}`,
                updateData,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
        },
    });
};

// Delete client
export const useDeleteClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            const baseUrl = getBaseUrl();
            const response = await axios.delete(
                `${baseUrl}/admin/clients/${id}`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'clients'] });
        },
    });
};

// Get client by ID
export const useClient = (id) => {
    return useQuery({
        queryKey: ['admin', 'clients', id],
        queryFn: async () => {
            const baseUrl = getBaseUrl();
            const response = await axios.get(
                `${baseUrl}/admin/clients/${id}`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        enabled: !!id,
    });
};

