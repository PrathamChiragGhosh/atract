import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const generateJD = async (jobData) => {
    const token = Cookies.get('emp_token');
    if (!token) {
        throw new Error('No authentication token');
    }

    const response = await axios.post(
        `${process.env.NEXT_PUBLIC_JOB_URL}/generate-jd`,
        jobData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (response.data.success) {
        return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to generate job description');
};

export const useGenerateJD = () => {
    const router = useRouter();

    return useMutation({
        mutationFn: generateJD,
        onError: (error) => {
            if (error?.response?.status === 401) {
                Cookies.remove('emp_token');
                router.push('/signin/employer');
            }
        },
    });
};

