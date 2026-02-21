import { QueryClient } from '@tanstack/react-query';

// Create a singleton QueryClient instance to avoid recreating it on every render
function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
                gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for 10 minutes (formerly cacheTime)
                refetchOnWindowFocus: false, // Don't refetch on window focus
                refetchOnMount: false, // Use cached data if available
                retry: 1, // Retry failed requests once
                refetchOnReconnect: true, // Refetch when connection is restored
            },
            mutations: {
                retry: 1,
            },
        },
    });
}

// Browser-side singleton pattern
let browserQueryClient = undefined;

export function getQueryClient() {
    if (typeof window === 'undefined') {
        // Server: always make a new query client
        return makeQueryClient();
    } else {
        // Browser: make a new query client if we don't already have one
        if (!browserQueryClient) browserQueryClient = makeQueryClient();
        return browserQueryClient;
    }
}

// For backward compatibility
export const queryClient = typeof window !== 'undefined' ? getQueryClient() : makeQueryClient();

