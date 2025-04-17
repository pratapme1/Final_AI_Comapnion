import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "./components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import Budgets from "./pages/Budgets";
import Receipts from "./pages/Receipts";
import Analytics from "./pages/Analytics";
import Insights from "./pages/Insights";
import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth-page";
import Sidebar from "./components/layout/Sidebar";
import MobileHeader from "./components/layout/MobileHeader";
import { useState, useEffect, Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader2 } from "lucide-react";

// Performance splash component
function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/90 to-primary/50 text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin" />
        <h1 className="text-2xl font-bold">Smart Ledger</h1>
        <p className="text-sm opacity-80">Loading your financial insights...</p>
      </div>
    </div>
  );
}

function Router() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { isLoading, user } = useAuth();
  // Get current location path
  const [location] = useLocation();
  
  // Check if current page is auth page
  const isAuthPage = location && location === '/auth';

  // Hide splash screen after initial load
  useEffect(() => {
    if (!isLoading && isInitialLoad) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, isInitialLoad]);
  
  // Performance optimization: Debug memory usage (must be in same order in each render)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // Type-safe memory usage check
      const perf = window.performance as any;
      console.log('Memory usage:', perf && perf.memory ? 
        perf.memory : 'Memory API not available');
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Show splash screen during initial load
  if (isInitialLoad && isLoading) {
    return <SplashScreen />;
  }
  
  // For auth page, render with a clean layout (no sidebar or header)
  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-white">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          <AuthPage />
        </Suspense>
        <Toaster />
      </div>
    );
  }

  // For all other pages (protected routes), render with sidebar and header
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar for desktop */}
      <Sidebar isMobileOpen={isSidebarOpen} closeMobileSidebar={() => setIsSidebarOpen(false)} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <MobileHeader toggleSidebar={toggleSidebar} />
        
        {/* Page Content */}
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <Switch>
              <ProtectedRoute path="/" component={Dashboard} />
              <ProtectedRoute path="/budgets" component={Budgets} />
              <ProtectedRoute path="/receipts/*" component={Receipts} />
              <ProtectedRoute path="/analytics" component={Analytics} />
              <ProtectedRoute path="/insights" component={Insights} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </div>
      </main>
      
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}

export default App;
