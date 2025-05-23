/**
 * Loadable.tsx
 * Higher-order component for lazy loading components with suspense
 */
import React, { Suspense, ComponentType } from 'react';

// Loadable HOC with TypeScript typing
const Loadable = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => (
    <Suspense fallback={<div>Loading...</div>}>
      <Component {...props} />
    </Suspense>
  );
};

export default Loadable;