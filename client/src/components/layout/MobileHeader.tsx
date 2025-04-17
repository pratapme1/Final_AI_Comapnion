import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Menu, ChevronRight, BarChart2 } from "lucide-react";

interface MobileHeaderProps {
  toggleSidebar: () => void;
}

const MobileHeader = ({ toggleSidebar }: MobileHeaderProps) => {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Determine current page title based on the route
  const getPageTitle = () => {
    switch(true) {
      case location === '/':
        return 'Dashboard';
      case location.startsWith('/receipts'):
        return 'Receipts';
      case location === '/budgets':
        return 'Budgets';
      case location === '/analytics':
        return 'Analytics';
      case location === '/insights':
        return 'Insights';
      default:
        return 'Smart Ledger';
    }
  };
  
  const pageTitle = getPageTitle();

  return (
    <div className="md:hidden bg-white border-b shadow-sm">
      {/* Main header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            className="text-gray-700 hover:bg-gray-100 p-2 rounded-full focus:outline-none"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
            <Link href="/">
              <span className="font-bold text-gray-800 cursor-pointer ml-2">{pageTitle}</span>
            </Link>
          </div>
        </div>
        
        {/* User initial in a circle */}
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </div>
        </div>
      </div>
      
      {/* Sub header for breadcrumbs or specific page actions */}
      <div className="px-4 py-2 flex items-center text-xs text-gray-500 border-t border-gray-100">
        <Link href="/">
          <span className="cursor-pointer">Smart Ledger</span>
        </Link>
        <ChevronRight className="h-3 w-3 mx-1" />
        <span className="font-medium text-gray-700">{pageTitle}</span>
      </div>
    </div>
  );
};

export default MobileHeader;
