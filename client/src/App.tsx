import { Switch, Route } from "wouter";
import { Toaster } from "./components/ui/toaster";
import Dashboard from "./pages/Dashboard";
import Budgets from "./pages/Budgets";
import Receipts from "./pages/Receipts";
import Analytics from "./pages/Analytics";
import Insights from "./pages/Insights";
import NotFound from "./pages/not-found";
import Sidebar from "./components/layout/Sidebar";
import MobileHeader from "./components/layout/MobileHeader";
import { useState } from "react";

function App() {
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
            <Route path="/" component={Dashboard} />
            <Route path="/budgets" component={Budgets} />
            <Route path="/receipts" component={Receipts} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/insights" component={Insights} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
      
      <Toaster />
    </div>
  );
}

export default App;
