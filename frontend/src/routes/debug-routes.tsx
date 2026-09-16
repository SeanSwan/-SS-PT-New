/**
 * debug-routes.tsx
 * Special routes for debugging purposes that can be accessed directly
 */
import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import CrossDashboardDebugger from '../components/DevTools/CrossDashboardDebugger';
import DevTools from '../components/DevTools/DevTools';

/** QA surface for the 20-variant Three.js front-page fleet. Lazy: dev-only route. */
const ThreeWorldGallery = lazy(() => import('../pages/DesignPlayground/ThreeWorldGallery'));

/**
 * DebugRoutes Component
 * Provides direct routes to debugging tools
 */
const DebugRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/debug" element={<DevTools />} />
      <Route path="/debug/dashboard" element={<CrossDashboardDebugger />} />
      <Route
        path="/debug/three-gallery"
        element={(
          <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-primary, #e0ecf4)' }}>loading gallery…</div>}>
            <ThreeWorldGallery />
          </Suspense>
        )}
      />
    </Routes>
  );
};

export default DebugRoutes;
