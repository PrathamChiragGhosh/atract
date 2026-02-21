import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

// Get blog API URL
// Blogs are served from the main backend, so fallback to main backend URL
const getBlogApiUrl = () => {
    // Priority 1: Explicit blog API URL
    if (process.env.NEXT_PUBLIC_BLOG_API_URL) {
        return process.env.NEXT_PUBLIC_BLOG_API_URL;
    }
    
    // Priority 2: Extract from main backend URL
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
        return process.env.NEXT_PUBLIC_BACKEND_URL;
    }
    
    // Priority 3: Extract from main API URL
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    
    // Priority 4: Extract from employer URL (if available)
    if (process.env.NEXT_PUBLIC_EMPLOYER_URL) {
        const employerUrl = process.env.NEXT_PUBLIC_EMPLOYER_URL;
        return employerUrl.includes('/employer') 
            ? employerUrl.replace('/employer', '') 
            : employerUrl;
    }
    
    // Priority 5: Extract from jobseeker URL (if available)
    if (process.env.NEXT_PUBLIC_JOBSEEKER_URL) {
        const jobseekerUrl = process.env.NEXT_PUBLIC_JOBSEEKER_URL;
        return jobseekerUrl.replace(/\/jobseeker\/?$/, '');
    }
    
    // Priority 6: Extract from job URL (if available)
    if (process.env.NEXT_PUBLIC_JOB_URL) {
        const jobUrl = process.env.NEXT_PUBLIC_JOB_URL;
        return jobUrl.replace(/\/job\/?$/, '');
    }
    
    // Fallback: Default to main backend (blogs are on same server)
    return 'http://localhost:5001';
};

// Query keys
export const commentKeys = {
    all: ['blog-comments'],
    list: (slug) => [...commentKeys.all, 'list', slug],
    listWithLastId: (slug, lastId) => [...commentKeys.all, 'list', slug, lastId],
};

// Fetch comments with infinite scroll
const fetchComments = async ({ queryKey, pageParam = null }) => {
    const slug = queryKey[2];
    const lastId = pageParam || null;
    const blogApiUrl = getBlogApiUrl();
    const apiUrl = `${blogApiUrl}/api/blogs/${slug}/comments${lastId ? `?lastId=${lastId}` : ''}`;

    const response = await axios.get(apiUrl);

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to fetch comments');
};

// Create comment
const createCommentFn = async ({ slug, name, email, emailConfirmed, comment, commentorType, jobSeekerId, employerId }) => {
    const blogApiUrl = getBlogApiUrl();
    const apiUrl = `${blogApiUrl}/api/blogs/${slug}/comments`;

    const response = await axios.post(apiUrl, {
        name,
        email,
        emailConfirmed,
        comment,
        commentorType,
        jobSeekerId,
        employerId,
    });

    if (response.data.success) {
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to create comment');
};

// Hook to get comments with infinite scroll
export const useBlogComments = (slug, enabled = true) => {
    return useInfiniteQuery({
        queryKey: commentKeys.list(slug),
        queryFn: ({ pageParam = null }) => fetchComments({ queryKey: commentKeys.list(slug), pageParam }),
        enabled: enabled && !!slug,
        staleTime: 1 * 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        initialPageParam: null,
        getNextPageParam: (lastPage) => {
            return lastPage.hasMore ? lastPage.lastId : undefined;
        },
    });
};

// Hook to create a comment
export const useCreateComment = (slug) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ name, email, emailConfirmed, comment, commentorType, jobSeekerId, employerId }) => 
            createCommentFn({ slug, name, email, emailConfirmed, comment, commentorType, jobSeekerId, employerId }),
        onSuccess: () => {
            // Invalidate and refetch comments
            queryClient.invalidateQueries({ queryKey: commentKeys.list(slug) });
        },
    });
};

