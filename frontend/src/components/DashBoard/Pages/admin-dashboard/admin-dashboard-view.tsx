/**
 * Revolutionary Stellar Command Center Admin Dashboard
 * SwanStudios Personal Training & Social Media Platform
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ThemeProvider } from 'styled-components';

import { adminGalaxyTheme } from './admin-dashboard-theme';
import { CommandHeader } from './overview/AdminOverview.styles';
import AdminOverviewPanel from './overview/AdminOverviewPanel';

// === MAIN ADMIN DASHBOARD COMPONENT ===
const RevolutionaryAdminDashboard: React.FC = () => (
  <ThemeProvider theme={adminGalaxyTheme}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ width: '100%', minHeight: '100%' }}
    >
      <CommandHeader
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h1>Command Center Overview</h1>
        <p>Your administrative command center for platform oversight</p>
      </CommandHeader>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AdminOverviewPanel />
      </motion.div>
    </motion.div>
  </ThemeProvider>
);

export { RevolutionaryAdminDashboard };
export { CommandCard } from './AdminDashboardCards';
export default RevolutionaryAdminDashboard;
export { RevolutionaryAdminDashboard as MainDashboard };
