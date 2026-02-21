import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Cookies from "js-cookie";

const getBaseUrl = () => {
    const employerUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL || '';
    if (employerUrl.includes('/employer')) {
        return employerUrl.replace('/employer', '');
    }
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
};

const getAuthHeaders = () => {
    const token = Cookies.get("admin_token");
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
};

// Get comprehensive dashboard statistics
export const useDashboardStats = () => {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'stats'],
        queryFn: async () => {
            const baseUrl = getBaseUrl();
            const response = await axios.get(
                `${baseUrl}/admin/dashboard/stats`,
                { headers: getAuthHeaders() }
            );
            return response.data;
        },
        refetchInterval: 60000, // Refetch every minute
        staleTime: 30000, // Consider data stale after 30 seconds
    });
};

// Get module-specific statistics
export const useModuleStats = (module, startDate, endDate) => {
    return useQuery({
        queryKey: ['admin', 'dashboard', 'module', module, startDate, endDate],
        queryFn: async () => {
            const baseUrl = getBaseUrl();
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await axios.get(
                `${baseUrl}/admin/dashboard/module/${module}`,
                {
                    headers: getAuthHeaders(),
                    params
                }
            );
            return response.data;
        },
        enabled: !!module,
    });
};

// Get analysis data with time period filtering
export const useAnalysisData = (period = 'yearly', dataSource, offset = 0) => {
    return useQuery({
        queryKey: ['admin', 'analysis', period, dataSource, offset],
        queryFn: async () => {
            const baseUrl = getBaseUrl();
            const params = { period };
            if (dataSource) params.dataSource = dataSource;
            if (offset !== 0) params.offset = offset;

            const response = await axios.get(
                `${baseUrl}/admin/dashboard/analysis`,
                {
                    headers: getAuthHeaders(),
                    params
                }
            );
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

