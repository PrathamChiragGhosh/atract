import axios from 'axios';
import { ensureUserEmail } from './pdfUserId';

// Get backend URL - try multiple sources
const getBackendUrl = () => {
  // Priority 1: Explicit API URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Priority 2: Explicit backend URL
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // Priority 3: Extract from JOBSEEKER_URL (if available)
  if (process.env.NEXT_PUBLIC_JOBSEEKER_URL) {
    const jobseekerUrl = process.env.NEXT_PUBLIC_JOBSEEKER_URL;
    // Extract base URL (remove /jobseeker path)
    return jobseekerUrl.replace(/\/jobseeker\/?$/, '');
  }
  
  // Priority 4: Extract from JOB_URL (if available)
  if (process.env.NEXT_PUBLIC_JOB_URL) {
    const jobUrl = process.env.NEXT_PUBLIC_JOB_URL;
    // Extract base URL (remove /job path if present)
    return jobUrl.replace(/\/job\/?$/, '');
  }
  
  // Fallback: Default backend URL
  return 'http://localhost:5001';
};

const API_URL = getBackendUrl();

// Log API URL in development for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('📡 PDF API Base URL:', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add user email to all requests
api.interceptors.request.use(async (config) => {
  const email = ensureUserEmail();
  if (email) {
    config.headers['x-user-email'] = email;
  } else {
    // Also try to get email from body or query if available
    if (config.data && config.data.email) {
      config.headers['x-user-email'] = config.data.email;
    } else {
      console.warn('No email found in localStorage or request body');
    }
  }
  return config;
});

export const pdfApi = {
  upload: async (file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await api.post('/api/pdf/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  compress: async (data) => {
    const response = await api.post('/api/pdf/compress', data);
    return response.data;
  },

  download: async (id) => {
    const response = await api.get(`/api/pdf/download/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/api/pdf/history');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/subscription/stats');
    return response.data;
  },

  getPlans: async () => {
    const response = await api.get('/api/subscription/plans');
    return response.data;
  },

  createSubscription: async (data) => {
    const response = await api.post('/api/subscription/create', data);
    return response.data;
  },
};

export default api;

