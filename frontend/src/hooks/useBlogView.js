import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { addViewedBlogId, hasViewedBlog, updateAnonymousToPartial } from '@/utils/blogViewStorage';
import { getUserInfo } from '@/utils/commentStorage';

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

// Fetch job seeker profile to get name and email
const fetchJobSeekerProfile = async () => {
    const token = Cookies.get('js_token');
    if (!token) return null;

    try {
        const response = await axios.get(
            `${process.env.NEXT_PUBLIC_JOBSEEKER_URL}/profile`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (response.data.success) {
            return response.data.data;
        }
    } catch (error) {
        console.error('Error fetching job seeker profile:', error);
    }
    return null;
};

// Fetch employer profile to get name and email
const fetchEmployerProfile = async () => {
    const token = Cookies.get('emp_token');
    if (!token) return null;

    try {
        const response = await axios.get(
            `${process.env.NEXT_PUBLIC_EMPLOYER_URL}/profile`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (response.data.success) {
            return response.data.data;
        }
    } catch (error) {
        console.error('Error fetching employer profile:', error);
    }
    return null;
};

// Track blog view
const trackBlogViewFn = async ({ slug, blogId }) => {
    const blogApiUrl = getBlogApiUrl();
    const apiUrl = `${blogApiUrl}/api/blogs/${slug}/view`;

    // Determine viewer type and info (priority: logged-in user > comment form > anonymous)
    let viewerType = 'anonymous';
    let name = null;
    let email = null;
    let jobSeekerId = null;
    let employerId = null;

    // Check for logged-in job seeker (highest priority)
    const jsToken = Cookies.get('js_token');
    if (jsToken) {
        try {
            const decoded = jwtDecode(jsToken);
            viewerType = 'jobseeker';
            jobSeekerId = decoded.userId || decoded.id;
            
            // Fetch profile to get name and email
            const profile = await fetchJobSeekerProfile();
            if (profile) {
                name = profile.fullName || decoded.userName || null;
                email = profile.email || null;
            } else {
                // Fallback to token if profile fetch fails
                name = decoded.userName || null;
            }
        } catch (error) {
            console.error('Error decoding job seeker token:', error);
        }
    }

    // Check for logged-in employer (only if not job seeker)
    if (!jsToken) {
        const empToken = Cookies.get('emp_token');
        if (empToken) {
            try {
                const decoded = jwtDecode(empToken);
                viewerType = 'employer';
                employerId = decoded.userId || decoded.id;
                
                // Fetch profile to get name and email
                const profile = await fetchEmployerProfile();
                if (profile) {
                    name = profile.companyName || profile.fullName || decoded.name || null;
                    email = profile.email || null;
                } else {
                    // Fallback to token if profile fetch fails
                    name = decoded.name || decoded.companyName || null;
                    email = decoded.email || null;
                }
            } catch (error) {
                console.error('Error decoding employer token:', error);
            }
        }
    }

    // If not logged in, check comment form data (second priority)
    if (viewerType === 'anonymous') {
        const commentInfo = getUserInfo();
        if (commentInfo && (commentInfo.name || commentInfo.email)) {
            viewerType = 'partial';
            name = commentInfo.name || null;
            email = commentInfo.email || null;
        }
    }

    const response = await axios.post(apiUrl, {
        viewerType,
        name,
        email,
        jobSeekerId,
        employerId,
    });

    if (response.data.success) {
        // Store blog ID in localStorage to prevent duplicate views (only for anonymous/partial users)
        // Logged-in users are tracked by backend (jobSeekerId/employerId), so no need to store in localStorage
        
        // If view was updated from anonymous to partial, update localStorage accordingly
        if (response.data.message && response.data.message.includes('updated from anonymous to partial')) {
            if (blogId) {
                updateAnonymousToPartial(blogId);
            }
        } else if (blogId && (viewerType === 'anonymous' || viewerType === 'partial')) {
            addViewedBlogId(blogId, viewerType);
        }
        return response.data;
    }
    throw new Error(response.data.message || 'Failed to track view');
};

// Hook to track blog view
export const useTrackBlogView = (slug, blogId) => {
    return useMutation({
        mutationFn: async () => {
            // Determine current viewer type
            let currentViewerType = 'anonymous';
            const jsToken = Cookies.get('js_token');
            const empToken = Cookies.get('emp_token');
            
            if (jsToken) {
                currentViewerType = 'jobseeker';
            } else if (empToken) {
                currentViewerType = 'employer';
            } else {
                // Check if we have comment form data
                const commentInfo = getUserInfo();
                if (commentInfo && (commentInfo.name || commentInfo.email)) {
                    currentViewerType = 'partial';
                }
            }
            
            // Check localStorage only for anonymous/partial users
            // Logged-in users (jobseeker/employer) are handled by backend duplicate check via jobSeekerId/employerId
            if (blogId && (currentViewerType === 'anonymous' || currentViewerType === 'partial')) {
                if (hasViewedBlog(blogId, currentViewerType)) {
                    return Promise.resolve({ success: true, message: 'Already viewed' });
                }
            }
            
            // Always call backend for logged-in users - backend will handle duplicate check
            // For anonymous/partial, localStorage check above prevents duplicate calls
            return trackBlogViewFn({ slug, blogId });
        },
    });
};

// Hook to get blog view count
export const useBlogViewCount = (slug) => {
    return useQuery({
        queryKey: ['blog-view-count', slug],
        queryFn: async () => {
            const blogApiUrl = getBlogApiUrl();
            const apiUrl = `${blogApiUrl}/api/blogs/${slug}/views`;
            const response = await axios.get(apiUrl);
            if (response.data.success) {
                return response.data.viewCount;
            }
            throw new Error(response.data.message || 'Failed to fetch view count');
        },
        enabled: !!slug,
        staleTime: 30 * 1000, // 30 seconds
    });
};

