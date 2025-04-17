import { useAuth } from "../hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect, useRef } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const protectedRouteLoadTime = useRef<number>(performance.now());
  
  // Performance measurement
  useEffect(() => {
    if (!isLoading) {
      const renderTime = performance.now() - protectedRouteLoadTime.current;
      console.log(`Protected route authentication check completed in ${renderTime.toFixed(2)}ms`);
    }
  }, [isLoading]);
  
  // Reduced logging to improve performance
  if (process.env.NODE_ENV !== 'production') {
    console.log(`ProtectedRoute for path: ${path}`, { user, isLoading });
  }

  // Memoize the loading state to reduce re-renders
  if (isLoading) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Loading state for path: ${path}`);
    }
    
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Use a constant redirect component to reduce work for React
  if (!user) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`No user found, redirecting to auth from path: ${path}`);
    }
    
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`User authenticated, rendering component for path: ${path}`);
  }
  
  // Always use the render prop pattern for consistency and to ensure props are passed correctly
  return (
    <Route path={path}>
      {(params) => {
        // Log params in development mode to help with debugging
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Rendering protected route ${path} with params:`, params);
        }
        return <Component />;
      }}
    </Route>
  );
}