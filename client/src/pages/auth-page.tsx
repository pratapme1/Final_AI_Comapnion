import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { Redirect } from "wouter";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import { Loader2 } from "lucide-react";

// Create form schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState("login");
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const onLogin = (data: LoginFormValues) => {
    // Performance optimization: Start timestamp to measure login flow
    const loginStartTime = performance.now();
    
    // Convert username to lowercase to ensure case insensitivity
    const normalizedData = {
      ...data,
      username: data.username.toLowerCase()
    };
    
    console.log("Attempting login with:", normalizedData);
    
    // Show a toast for login attempt with shorter duration
    toast({
      title: "Signing in",
      description: "Please wait while we authenticate...",
      variant: "default",
      duration: 1500, // Shorter duration to improve perceived performance
    });
    
    // Pre-warm data that will be needed after login
    // This happens in parallel with the login request
    setTimeout(() => {
      const prewarmUrls = [
        '/api/stats/budget-status',
        '/api/stats/category-spending'
      ];
      
      // Silently prefetch dashboard data
      prewarmUrls.forEach(url => {
        fetch(url, { credentials: 'include', method: 'GET' })
          .catch(() => {}); // Ignore errors, this is just prewarming
      });
    }, 100);
    
    loginMutation.mutate(normalizedData, {
      onSuccess: (userData) => {
        const loginEndTime = performance.now();
        console.log(`Login flow completed in ${loginEndTime - loginStartTime}ms`);
        console.log("Login successful in form handler:", userData);
        
        // Display success toast that stays visible during transition
        toast({
          title: "Success ✓",
          description: "Logged in successfully! Redirecting...",
          variant: "default",
          duration: 2000, // Shorter duration for better perceived performance
        });
        
        // Explicitly update the user data in the auth context
        queryClient.setQueryData(["/api/user"], userData);
        
        // Faster redirection for better perceived performance
        setTimeout(() => {
          console.log("Redirecting to dashboard...");
          window.location.href = '/';
        }, 300); // Reduced delay for better performance while still showing toast
      },
      onError: (error) => {
        console.error("Login error:", error);
        
        // More detailed error message
        let errorMessage = "Invalid username or password. Please try again.";
        
        // Check if there's a more specific error message
        if (error.message) {
          if (error.message.includes("404") || error.message.includes("401")) {
            errorMessage = "The username or password you entered is incorrect.";
          } else if (error.message.includes("timeout") || error.message.includes("network")) {
            errorMessage = "Network issue. Please check your connection and try again.";
          } else {
            errorMessage = error.message; // Use server-provided message if available
          }
        }
        
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };

  const onRegister = (data: RegisterFormValues) => {
    // Performance optimization: Start timestamp to measure registration flow
    const registerStartTime = performance.now();
    
    // Convert username to lowercase to ensure case insensitivity
    const normalizedData = {
      ...data,
      username: data.username.toLowerCase()
    };
    
    // Show a toast for registration attempt with shorter duration
    toast({
      title: "Creating Account",
      description: "Setting up your account...",
      variant: "default",
      duration: 1500, // Shorter duration to improve perceived performance
    });
    
    // Pre-warm data that will be needed after registration
    // This happens in parallel with the registration request
    setTimeout(() => {
      const prewarmUrls = [
        '/api/stats/budget-status',
        '/api/stats/category-spending'
      ];
      
      // Silently prefetch dashboard data
      prewarmUrls.forEach(url => {
        fetch(url, { credentials: 'include', method: 'GET' })
          .catch(() => {}); // Ignore errors, this is just prewarming
      });
    }, 100);
    
    registerMutation.mutate(normalizedData, {
      onSuccess: (userData) => {
        const registerEndTime = performance.now();
        console.log(`Registration flow completed in ${registerEndTime - registerStartTime}ms`);
        console.log("Registration successful in form handler:", userData);
        
        // Display success toast that stays visible during transition
        toast({
          title: "Account Created ✓",
          description: "Your account was created successfully! Redirecting...",
          variant: "default",
          duration: 2000, // Shorter duration for better perceived performance
        });
        
        // Explicitly update the user data in the auth context
        queryClient.setQueryData(["/api/user"], userData);
        
        // Faster redirection for better perceived performance
        setTimeout(() => {
          console.log("Redirecting to dashboard after registration...");
          window.location.href = '/';
        }, 300); // Reduced delay for better performance while still showing toast
      },
      onError: (error) => {
        console.error("Registration error:", error);
        
        // More detailed error message
        let errorMessage = "Unable to create account. Please try a different username.";
        
        // Check if there's a more specific error message
        if (error.message) {
          if (error.message.includes("exists")) {
            errorMessage = "This username is already taken. Please choose another one.";
          } else if (error.message.includes("timeout") || error.message.includes("network")) {
            errorMessage = "Network issue. Please check your connection and try again.";
          } else {
            errorMessage = error.message; // Use server-provided message if available
          }
        }
        
        toast({
          title: "Registration Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  };

  // Redirect if already logged in
  if (user) {
    console.log("User authenticated, redirecting to dashboard:", user);
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary/90 to-primary/70 p-12 flex-col justify-center items-center text-white">
        <div className="max-w-md mx-auto">
          <div className="mb-8 flex items-center space-x-3">
            <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            </div>
            <span className="font-bold text-3xl">Smart Ledger</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Manage your finances with AI-powered insights</h1>
          <p className="text-white/90 text-lg mb-6">
            Track expenses, analyze spending patterns, and get personalized financial recommendations.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
              <div className="text-2xl font-bold mb-1">Budget Tracking</div>
              <p className="text-white/80">Create and monitor your budgets with real-time updates</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
              <div className="text-2xl font-bold mb-1">AI Insights</div>
              <p className="text-white/80">Get intelligent suggestions to optimize your spending</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-6">
        <Card className="w-full max-w-md border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 space-y-1">
            <div className="md:hidden flex items-center space-x-2 mb-6 justify-center">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
              </div>
              <span className="font-bold text-2xl text-gray-800">Smart Ledger</span>
            </div>
            
            <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              {activeTab === "login" ? "Welcome back" : "Create an account"}
            </CardTitle>
            
            <CardDescription className="text-center text-gray-500">
              {activeTab === "login" 
                ? "Enter your credentials to access your account" 
                : "Fill out the form below to create your new account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-6 pt-1">
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-gray-100 rounded-lg">
                <TabsTrigger value="login" className="text-base rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="text-base rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              className="h-12 border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                            <a href="#" className="text-xs text-primary/80 hover:text-primary">Forgot password?</a>
                          </div>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              className="h-12 border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-12 mt-4 text-base font-medium text-white bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-200 rounded-lg"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing In...
                        </div>
                      ) : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Choose a username" 
                              className="h-12 border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Choose a password (min. 6 characters)"
                              className="h-12 border-gray-200 bg-gray-50 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-12 mt-4 text-base font-medium text-white bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-200 rounded-lg"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating Account...
                        </div>
                      ) : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex justify-center border-t pt-6 pb-6 text-center">
            <p className="text-sm text-gray-500">
              {activeTab === "login" ? "Don't have an account? " : "Already have an account? "}
              <Button
                variant="link"
                className="p-0 h-auto font-medium text-primary hover:text-primary/80"
                onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
              >
                {activeTab === "login" ? "Register now" : "Sign in"}
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;