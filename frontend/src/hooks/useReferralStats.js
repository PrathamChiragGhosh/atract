import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';

const fetchReferralStats = async () => {
  const token = Cookies.get('emp_token');
  if (!token) {
    throw new Error('No authentication token');
  }

  const baseUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL?.includes('/employer') 
    ? process.env.NEXT_PUBLIC_EMPLOYER_URL.replace('/employer', '') 
    : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');

  const response = await axios.get(`${baseUrl}/api/referral-stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to fetch referral stats');
};

export const referralStatsKeys = {
  all: ['referralStats'],
  lists: () => [...referralStatsKeys.all, 'list'],
  list: (filters) => [...referralStatsKeys.lists(), { filters }],
};

export const useReferralStats = () => {
  return useQuery({
    queryKey: referralStatsKeys.all,
    queryFn: fetchReferralStats,
    retry: 1,
    staleTime: 30000, // 30 seconds
  });
};

