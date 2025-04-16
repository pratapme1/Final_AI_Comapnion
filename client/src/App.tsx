import { Switch, Route } from "wouter";
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
import { useState } from "react";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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
          <Switch>
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/budgets" component={Budgets} />
            <ProtectedRoute path="/receipts" component={Receipts} />
            <ProtectedRoute path="/analytics" component={Analytics} />
            <ProtectedRoute path="/insights" component={Insights} />
            <Route path="/auth" component={AuthPage} />
            <Route component={NotFound} />
          </Switch>
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
