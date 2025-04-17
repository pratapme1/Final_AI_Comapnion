import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Attempting login with:", credentials);
        const startTime = performance.now();
        
        const res = await apiRequest("POST", "/api/login", credentials);
        const userData = await res.json();
        
        const endTime = performance.now();
        console.log(`Login API call completed in ${endTime - startTime}ms`);
        console.log("Login response:", userData);
        
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login successful, updating user data:", user);
      
      // Cache user data immediately - no need to refetch
      queryClient.setQueryData(["/api/user"], user);
      
      // Pre-fetch some initial data to improve dashboard loading performance
      // This happens in the background and doesn't block the login flow
      setTimeout(() => {
        // Prefetch frequently used data in background
        queryClient.prefetchQuery({
          queryKey: ["/api/stats/budget-status"],
          queryFn: getQueryFn({ on401: "throw" }),
        });
        
        queryClient.prefetchQuery({
          queryKey: ["/api/stats/category-spending"],
          queryFn: getQueryFn({ on401: "throw" }),
        });
      }, 100);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Logged in successfully!",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      try {
        console.log("Attempting registration with:", credentials);
        const startTime = performance.now();
        
        const res = await apiRequest("POST", "/api/register", credentials);
        const userData = await res.json();
        
        const endTime = performance.now();
        console.log(`Registration API call completed in ${endTime - startTime}ms`);
        console.log("Registration response:", userData);
        
        return userData;
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Registration successful, updating user data:", user);
      
      // Cache user data immediately - no need to refetch
      queryClient.setQueryData(["/api/user"], user);
      
      // Pre-fetch some initial data to improve dashboard loading performance
      // Similar to login, prefetch common data in background
      setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: ["/api/stats/budget-status"],
          queryFn: getQueryFn({ on401: "throw" }),
        });
        
        queryClient.prefetchQuery({
          queryKey: ["/api/stats/category-spending"],
          queryFn: getQueryFn({ on401: "throw" }),
        });
      }, 100);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Account created successfully! You are now logged in.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Registration mutation error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log("Attempting logout");
        const startTime = performance.now();
        
        await apiRequest("POST", "/api/logout");
        
        const endTime = performance.now();
        console.log(`Logout API call completed in ${endTime - startTime}ms`);
        console.log("Logout successful");
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Logout mutation completed, clearing user data");
      
      // Immediately clear the user data from cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Selective cache cleanup instead of complete removal
      // This improves performance while still ensuring security
      const keysToRemove = [
        ["/api/user"],
        ["/api/stats"],
        ["/api/stats/budget-status"],
        ["/api/stats/category-spending"],
        ["/api/stats/monthly-spending"],
        ["/api/insights"],
        ["/api/receipts"]
      ];
      
      // Clear only user-related cache entries
      keysToRemove.forEach(key => {
        queryClient.removeQueries({ queryKey: key });
      });
      
      // Show logout toast
      toast({
        title: "Success", 
        description: "You have been logged out.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Logout mutation error:", error);
      
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}