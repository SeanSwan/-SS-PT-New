/**
 * admin-route-fallback.tsx
 * 
 * This is an ultra-simplified admin route component that uses zero hooks
 * and guarantees rendering the children regardless of auth state.
 * This is ONLY for breaking infinite loops in development mode.
 */
import React from 'react';

const AdminRouteFallback = ({ children }: { children: React.ReactNode }) => {
  // No hooks, no checks, just render children
  console.log('[EMERGENCY FALLBACK] Using zero-hook admin route to break cycle');
  return <>{children}</>;
};

export default AdminRouteFallback;
