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
        const res = await apiRequest("POST", "/api/login", credentials);
        const userData = await res.json();
        console.log("Login response:", userData);
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login successful, updating user data:", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Logged in successfully!",
        variant: "default",
      });
      
      // Force a refetch of the user data to ensure everything is in sync
      queryClient.invalidateQueries({
        queryKey: ["/api/user"]
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
        const res = await apiRequest("POST", "/api/register", credentials);
        const userData = await res.json();
        console.log("Registration response:", userData);
        return userData;
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: (user: SelectUser) => {
      console.log("Registration successful, updating user data:", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Account created successfully! You are now logged in.",
        variant: "default",
      });
      
      // Force a refetch of the user data to ensure everything is in sync
      queryClient.invalidateQueries({
        queryKey: ["/api/user"]
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
        await apiRequest("POST", "/api/logout");
        console.log("Logout successful");
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Logout mutation completed, clearing user data");
      queryClient.setQueryData(["/api/user"], null);
      
      // Show logout toast
      toast({
        title: "Success", 
        description: "You have been logged out.",
        variant: "default",
      });
      
      // Invalidate any cached user data to ensure clean state
      queryClient.invalidateQueries({
        queryKey: ["/api/user"]
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