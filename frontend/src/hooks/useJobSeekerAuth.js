import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';

/**
 * Hook to protect job seeker routes
 * Redirects to signup/register page with returnUrl if not authenticated
 */
export const useJobSeekerAuth = () => {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const token = Cookies.get('js_token');
        
        if (!token) {
            // Encode the current path as returnUrl and redirect to register page
            const returnUrl = encodeURIComponent(pathname);
            router.push(`/signin/jobseeker?register=true&returnUrl=${returnUrl}`);
        }
    }, [router, pathname]);
};

