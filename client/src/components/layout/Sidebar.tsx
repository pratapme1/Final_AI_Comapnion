import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  isMobileOpen: boolean;
  closeMobileSidebar: () => void;
}

const Sidebar = ({ isMobileOpen, closeMobileSidebar }: SidebarProps) => {
  const { logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation('/auth');
      }
    });
  };

  // Navigation links
  const navigationLinks = [
    { href: "/", label: "Dashboard", icon: "Dashboard" },
    { href: "/receipts", label: "Receipts", icon: "Receipt" },
    { href: "/budgets", label: "Budgets", icon: "CreditCard" },
    { href: "/analytics", label: "Analytics", icon: "BarChart" },
    { href: "/insights", label: "Insights", icon: "Lightbulb" },
  ];

  // Settings links
  const settingsLinks = [
    { href: "/settings", label: "Account Settings", icon: "Settings" },
    { href: "/logout", label: "Logout", icon: "LogOut" },
  ];

  // Check if a link is active
  const isActiveLink = (path: string) => {
    if (!location) return false;
    return path === "/" ? location === path : location === path;
  };

  // Render icon component based on icon name
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "Dashboard":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        );
      case "Receipt":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
        );
      case "CreditCard":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        );
      case "BarChart":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        );
      case "Lightbulb":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        );
      case "Settings":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        );
      case "LogOut":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out",
        "fixed inset-y-0 left-0 z-30 md:static md:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Mobile close button */}
      {isMobileOpen && (
        <button
          className="md:hidden absolute top-4 right-4 text-gray-500"
          onClick={closeMobileSidebar}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Logo and title */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
          </svg>
          <h1 className="text-lg font-bold text-gray-800">Smart Ledger</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">AI Financial Insights</p>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navigationLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>
                <span
                  className={cn(
                    "flex items-center px-4 py-2 text-sm rounded-md cursor-pointer",
                    isActiveLink(link.href)
                      ? "bg-blue-50 text-primary font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {renderIcon(link.icon)}
                  {link.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Settings section */}
        <div className="px-4 mt-6">
          <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Settings</h2>
          <ul className="mt-2 space-y-1">
            {settingsLinks.map((link) => (
              <li key={link.href}>
                {link.label === "Logout" ? (
                  <button
                    onClick={handleLogout}
                    className="w-full text-left"
                  >
                    <span
                      className={cn(
                        "flex items-center px-4 py-2 text-sm rounded-md cursor-pointer text-gray-700 hover:bg-gray-100",
                      isActiveLink(link.href)
                        ? "bg-blue-50 text-primary font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {renderIcon(link.icon)}
                      {link.label}
                    </span>
                  </button>
                ) : (
                  <Link href={link.href}>
                    <span
                      className={cn(
                        "flex items-center px-4 py-2 text-sm rounded-md cursor-pointer",
                        isActiveLink(link.href)
                          ? "bg-blue-50 text-primary font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {renderIcon(link.icon)}
                      {link.label}
                    </span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;