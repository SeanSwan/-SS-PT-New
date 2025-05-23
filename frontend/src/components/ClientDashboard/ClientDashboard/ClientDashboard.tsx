/**
 * ClientDashboard.tsx
 * 
 * Main dashboard component for clients that integrates all modules
 * from the Swan Studios wellness platform. This component follows
 * the Project Vision v22 requirements including fitness, dance,
 * creative expression, and community aspects.
 */

import React, { useState } from "react";
import { ThemeProvider } from "styled-components";
import { DashboardSection } from './ClientLayout';

// Import main layout components
import ClientLayout from "./ClientLayout";

/**
 * ClientDashboard Component
 * 
 * Primary client dashboard that serves as the central hub for all
 * client interactions with the platform. Provides access to fitness,
 * dance, creative expression, community, and profile management.
 * Designed with accessibility (WCAG AA) and responsive layout as
 * core principles.
 */
const ClientDashboard: React.FC = () => {
  // Use the ClientLayout component which handles the dashboard structure
  // and navigation between different sections
  return (
    <ClientLayout />
  );
};

export default ClientDashboard;