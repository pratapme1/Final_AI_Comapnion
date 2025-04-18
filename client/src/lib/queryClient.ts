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
 * Optimized API request function with request deduplication for GET requests
 * and better error handling for mutation requests
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
      return await pendingRequests.get(requestKey)!;
    } catch (err) {
      // If the cached promise rejects, we'll try again
      pendingRequests.delete(requestKey);
    }
  }
  
  // Create appropriate headers
  const headers: HeadersInit = {};
  
  // Add Content-Type for requests with body data
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add caching headers
  headers["Cache-Control"] = method === 'GET' ? 'max-age=10' : 'no-cache';
  
  // Add a timestamp to prevent caching of non-GET requests in some browsers
  if (method !== 'GET') {
    headers["X-Requested-Time"] = Date.now().toString();
  }
  
  // Create the fetch promise with improved configuration
  const fetchPromise = fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    // Prevent caching for mutation requests
    cache: method === 'GET' ? 'default' : 'no-store',
  });
  
  // Store the promise for GET requests
  if (method === 'GET') {
    pendingRequests.set(requestKey, fetchPromise);
    
    // Clean up the cache entry after the request completes
    fetchPromise.finally(() => {
      pendingRequests.delete(requestKey);
    });
  }
  
  try {
    const res = await fetchPromise;
    
    // Log non-OK responses for better debugging
    if (!res.ok) {
      console.warn(`API request failed: ${method} ${url}`, { 
        status: res.status, 
        statusText: res.statusText 
      });
    }
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request error: ${method} ${url}`, error);
    throw error;
  }
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

// Configure the query client with optimizations for automatic data refresh
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,      // Enable refetch when window gains focus
      staleTime: 1000,                 // Set data as stale after 1 second
      retry: false,
      gcTime: 300000,                  // Cache data for 5 minutes
      refetchOnMount: true,            // Refetch when component mounts
      refetchOnReconnect: true,        // Refetch when network reconnects
    },
    mutations: {
      retry: false,
    },
  },
});
