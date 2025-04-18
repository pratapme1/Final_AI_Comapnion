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
    <div className="min-h-screen w-full overflow-hidden flex flex-col md:flex-row bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iNTAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii41IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIiB0eXBlPSJmcmFjdGFsTm9pc2UiLz48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIC4zIDAiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjYSkiLz48L3N2Zz4=')] bg-cover bg-center bg-no-repeat before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/50 before:to-primary/30 before:backdrop-blur-sm relative">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-gray-900/10 to-primary/5 backdrop-blur-sm opacity-80 z-0"></div>
      
      {/* Left Panel - Hero Section */}
      <div className="hidden md:flex md:w-1/2 p-12 flex-col justify-center items-center text-white z-10">
        <div className="max-w-md mx-auto">
          <div className="mb-8 flex items-center space-x-3">
            <div className="h-14 w-14 bg-white/20 shadow-2xl backdrop-blur-md rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white drop-shadow-lg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            </div>
            <span className="font-bold text-3xl text-white drop-shadow-lg">Smart Ledger</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white drop-shadow-md">
            <span className="bg-gradient-to-r from-white to-white/90 text-transparent bg-clip-text">Manage your finances with AI-powered insights</span>
          </h1>
          
          <p className="text-white/90 text-lg mb-6 drop-shadow-sm">
            Track expenses, analyze spending patterns, and get personalized financial recommendations.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white/10 shadow-xl backdrop-blur-md p-5 rounded-2xl border border-white/20 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-primary/40 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div className="text-xl font-bold">Budget Tracking</div>
              </div>
              <p className="text-white/80">Create and monitor your budgets with real-time updates</p>
            </div>
            
            <div className="bg-white/10 shadow-xl backdrop-blur-md p-5 rounded-2xl border border-white/20 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-primary/40 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>
                <div className="text-xl font-bold">AI Insights</div>
              </div>
              <p className="text-white/80">Get intelligent suggestions to optimize your spending</p>
            </div>
          </div>
          
          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-md py-3 rounded-xl mt-6 border border-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-green-300">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span className="text-sm font-medium text-white/90">Secure authentication & data protection</span>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="relative w-full md:w-1/2 flex items-center justify-center p-4 md:p-6 z-10">
        <Card className="w-full max-w-md border-0 bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
          {/* Mobile Logo */}
          <div className="md:hidden absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/80 to-primary/50 rounded-t-3xl flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="h-14 w-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
              </div>
              <span className="font-bold text-2xl text-white drop-shadow-md">Smart Ledger</span>
            </div>
          </div>
          
          <CardHeader className="pb-2 space-y-1 pt-36 md:pt-6">
            <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              {activeTab === "login" ? "Welcome back" : "Create an account"}
            </CardTitle>
            
            <CardDescription className="text-center text-gray-600">
              {activeTab === "login" 
                ? "Enter your credentials to access your account" 
                : "Fill out the form below to create your new account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-6 pt-4">
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-gray-100/80 rounded-xl">
                <TabsTrigger value="login" className="text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:font-medium transition-all duration-200">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:font-medium transition-all duration-200">
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login" className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute left-3 top-3.5 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              </div>
                              <Input 
                                placeholder="Enter your username" 
                                className="h-12 pl-10 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm" 
                                {...field} 
                              />
                            </div>
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
                            <a href="#" className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors">Forgot password?</a>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute left-3 top-3.5 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              </div>
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                className="h-12 pl-10 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-12 mt-6 text-base font-medium text-white bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:shadow-lg hover:opacity-95 shadow-md transition-all duration-300 rounded-xl"
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
              <TabsContent value="register" className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-5">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <div className="absolute left-3 top-3.5 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              </div>
                              <Input 
                                placeholder="Choose a username" 
                                className="h-12 pl-10 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm" 
                                {...field} 
                              />
                            </div>
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
                            <div className="relative">
                              <div className="absolute left-3 top-3.5 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                              </div>
                              <Input
                                type="password"
                                placeholder="Choose a password (min. 6 characters)"
                                className="h-12 pl-10 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-blue-500 mr-2 mt-0.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                        <p className="text-xs text-blue-700">
                          Creating an account gives you access to all features including AI-powered insights and budget tracking.
                        </p>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 mt-4 text-base font-medium text-white bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:shadow-lg hover:opacity-95 shadow-md transition-all duration-300 rounded-xl"
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
          
          <CardFooter className="flex justify-center border-t border-gray-100 pt-6 pb-6 text-center">
            <p className="text-sm text-gray-600">
              {activeTab === "login" ? "Don't have an account? " : "Already have an account? "}
              <Button
                variant="link"
                className="p-0 h-auto font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
              >
                {activeTab === "login" ? "Register now" : "Sign in"}
              </Button>
            </p>
          </CardFooter>

          {/* Mobile Feature Cards */}
          <div className="md:hidden px-4 pb-8">
            <h3 className="text-gray-600 font-medium text-center mb-4">Powerful features</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                <div className="flex items-center space-x-2 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <div className="text-sm font-medium text-gray-700">Budget Tracking</div>
                </div>
                <p className="text-xs text-gray-600">Real-time updates on your spending</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                <div className="flex items-center space-x-2 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-primary">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                  <div className="text-sm font-medium text-gray-700">AI Insights</div>
                </div>
                <p className="text-xs text-gray-600">Smart suggestions to save money</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;