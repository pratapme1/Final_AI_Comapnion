import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Cache for pending requests to avoid duplicate network calls
const pendingRequests = new Map<string, Promise<any>>();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Optimized API request function with request deduplication
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // For GET requests, implement request deduplication
  const requestKey = method === 'GET' ? url : `${method}-${url}-${JSON.stringify(data || {})}`;
  
  if (method === 'GET' && pendingRequests.has(requestKey)) {
    try {
      // Return the cached promise for identical in-flight requests
      return await pendingRequests.get(requestKey);
    } catch (err) {
      // If the cached promise rejects, we'll try again
      pendingRequests.delete(requestKey);
    }
  }
  
  // Create the fetch promise
  const fetchPromise = fetch(url, {
    method,
    headers: data ? { 
      "Content-Type": "application/json",
      // Add performance-related headers
      "Cache-Control": method === 'GET' ? 'max-age=10' : 'no-cache', 
    } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  
  // Store the promise for GET requests
  if (method === 'GET') {
    pendingRequests.set(requestKey, fetchPromise);
    
    // Clean up the cache entry after the request completes
    fetchPromise.finally(() => {
      pendingRequests.delete(requestKey);
    });
  }
  
  const res = await fetchPromise;
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    // Use the optimized apiRequest function instead of raw fetch
    try {
      const res = await apiRequest('GET', url);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
      
      return await res.json();
    } catch (error: any) { // Type as any for error.message access
      if (unauthorizedBehavior === "returnNull" && error?.message?.includes('401')) {
        return null;
      }
      throw error;
    }
  };

// Configure the query client with performance optimizations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // Increase stale time to 1 minute to reduce refetches
      retry: false,
      // Add these for better caching behavior
      gcTime: 300000, // Cache data for 5 minutes (formerly cacheTime in v4)
      refetchOnMount: false,
    },
    mutations: {
      retry: false,
    },
  },
});
