/**
 * debug-routes.tsx
 * Special routes for debugging purposes that can be accessed directly
 */
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import CrossDashboardDebugger from '../components/DevTools/CrossDashboardDebugger';
import DevTools from '../components/DevTools/DevTools';

/**
 * DebugRoutes Component
 * Provides direct routes to debugging tools
 */
const DebugRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/debug" element={<DevTools />} />
      <Route path="/debug/dashboard" element={<CrossDashboardDebugger />} />
    </Routes>
  );
};

export default DebugRoutes;
