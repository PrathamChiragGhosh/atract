import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Get blog API base URL (no trailing slash).
// Use same-origin (empty string) when proxy is enabled so Next.js rewrites forward to backend.
const getBlogApiUrl = () => {
    // Use proxy: request same origin so Next.js rewrites /api/blogs -> backend
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BLOG_USE_PROXY !== 'false') {
        return '';
    }
    // Server-side or proxy disabled: use explicit URL
    if (process.env.NEXT_PUBLIC_BLOG_API_URL) {
        return process.env.NEXT_PUBLIC_BLOG_API_URL;
    }
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        return process.env.NEXT_PUBLIC_BACKEND_URL;
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (process.env.NEXT_PUBLIC_EMPLOYER_URL) {
        const employerUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL;
        return employerUrl.includes('/employer')
            ? employerUrl.replace('/employer', '')
            : employerUrl;
    }
    if (process.env.NEXT_PUBLIC_JOBSEEKER_URL) {
        return process.env.NEXT_PUBLIC_JOBSEEKER_URL.replace(/\/jobseeker\/?$/, '');
    }
    if (process.env.NEXT_PUBLIC_JOB_URL) {
        return process.env.NEXT_PUBLIC_JOB_URL.replace(/\/job\/?$/, '');
    }
    return 'http://localhost:5001';
};

// Query keys
export const blogKeys = {
    all: ['blogs'],
    list: () => [...blogKeys.all, 'list'],
    seoList: (page) => [...blogKeys.all, 'seo-list', page],
    detail: (slug) => [...blogKeys.all, 'detail', slug],
};

// Fetch all blogs (for /posts page)
const fetchBlogs = async () => {
    const blogApiUrl = getBlogApiUrl();
    const apiUrl = `${blogApiUrl}/api/blogs`;

    try {
        const response = await axios.get(apiUrl);

        if (response.data.success) {
            return response.data;
        }
        throw new Error(response.data.message || 'Failed to fetch blogs');
    } catch (error) {
        // Handle network errors gracefully
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
            throw new Error('Unable to connect to blog server. Please check if the blog service is running.');
        }
        if (error.response?.status === 404) {
            throw new Error('Blogs endpoint not found');
        }
        throw new Error(error.response?.data?.message || error.message || 'Failed to fetch blogs');
    }
};

// Fetch SEO blogs (for /blogs page) with pagination
const fetchSeoBlogs = async ({ queryKey }) => {
    const page = queryKey[2] || 1;
    const blogApiUrl = getBlogApiUrl();
    const apiUrl = `${blogApiUrl}/api/blogs/seo/list?page=${page}&limit=20`;

    try {
        const response = await axios.get(apiUrl);

        if (response.data.success) {
            return response.data;
        }
        throw new Error(response.data.message || 'Failed to fetch blogs');
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
            throw new Error('Unable to connect to blog server. Please check if the blog service is running.');
        }
        if (error.response?.status === 404) {
            throw new Error('Blogs endpoint not found');
        }
        // Prefer backend error message (especially for 500) over Axios generic message
        const backendMsg = error.response?.data?.message;
        const msg = backendMsg || (error.message?.startsWith('Request failed with status code') ? 'Blog server error. Check that the backend and database are running.' : error.message) || 'Failed to fetch blogs';
        throw new Error(msg);
    }
};

// Fetch blog by slug
const fetchBlogBySlug = async ({ queryKey }) => {
    // queryKey structure: ['blogs', 'detail', slug]
    // Extract slug from index 2 (not 3!)
    const slug = queryKey[2];
    
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
        console.error('Blog slug extraction failed. queryKey:', queryKey);
        throw new Error('Blog slug is required');
    }
    
    const blogApiUrl = getBlogApiUrl();
    // URL encode the slug to handle special characters
    const encodedSlug = encodeURIComponent(slug.trim());
    const apiUrl = `${blogApiUrl}/api/blogs/${encodedSlug}`;

    try {
        const response = await axios.get(apiUrl);

        if (response.data.success) {
            return response.data;
        }
        throw new Error(response.data.message || 'Blog not found');
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
            throw new Error('Unable to connect to blog server. Please check if the blog service is running.');
        }
        if (error.response?.status === 404) {
            throw new Error('Blog not found');
        }
        const backendMsg = error.response?.data?.message;
        const msg = backendMsg || (error.message?.startsWith('Request failed with status code') ? 'Blog server error. Check that the backend and database are running.' : error.message) || 'Failed to fetch blog';
        throw new Error(msg);
    }
};

// Hook to get all blogs
export const useBlogs = () => {
    return useQuery({
        queryKey: blogKeys.list(),
        queryFn: fetchBlogs,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
};

// Hook to get SEO blogs with pagination
export const useSeoBlogs = (page = 1) => {
    return useQuery({
        queryKey: blogKeys.seoList(page),
        queryFn: fetchSeoBlogs,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
};

// Hook to get blog by slug
export const useBlogBySlug = (slug) => {
    // Ensure slug is a string and trim it
    const slugStr = slug ? String(slug).trim() : '';
    const isValidSlug = slugStr.length > 0;
    
    return useQuery({
        queryKey: blogKeys.detail(slugStr),
        queryFn: fetchBlogBySlug,
        enabled: isValidSlug,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
};

