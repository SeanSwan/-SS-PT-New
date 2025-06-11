/**
 * ClientDashboard.tsx
 * 
 * Backward compatibility wrapper for the Revolutionary Client Dashboard.
 * This component provides a consistent import path while delegating to
 * the enhanced RevolutionaryClientDashboard component.
 */

import React from "react";
import RevolutionaryClientDashboard from "./RevolutionaryClientDashboard";

/**
 * ClientDashboard Component
 * 
 * A backward compatibility wrapper that renders the RevolutionaryClientDashboard.
 * This ensures existing imports continue to work while using the latest
 * dashboard implementation.
 */
const ClientDashboard: React.FC = () => {
  return <RevolutionaryClientDashboard />;
};

export default ClientDashboard;
