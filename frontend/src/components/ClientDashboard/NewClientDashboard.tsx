/**
 * NewClientDashboard.tsx
 * 
 * Updated dashboard component for clients that integrates all modules
 * using the admin-style sidebar navigation layout.
 */

import React from "react";
import ClientDashboardLayout from "./newLayout/ClientDashboardLayout";

/**
 * NewClientDashboard Component
 * 
 * Primary client dashboard that serves as the central hub for all
 * client interactions with the platform. Features:
 * - Admin-style sidebar navigation
 * - Enhanced messaging for trainer and admin communication
 * - Social profile functionality
 * - All existing client dashboard features
 * - Button styling upgraded to GlowButton component
 */
const NewClientDashboard: React.FC = () => {
  return <ClientDashboardLayout />;
};

export default NewClientDashboard;