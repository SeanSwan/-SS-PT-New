/**
 * Revolutionary Stellar Command Center Admin Dashboard
 * SwanStudios Personal Training & Social Media Platform
 */

import React from 'react';
import { motion } from 'framer-motion';

import { CommandHeader } from './overview/AdminOverview.styles';
import AdminOverviewPanel from './overview/AdminOverviewPanel';

// === MAIN ADMIN DASHBOARD COMPONENT ===
// NOTE: Uses universal theme from UniversalThemeContext (provided by parent)
// Removed standalone ThemeProvider/adminGalaxyTheme to connect to site-wide theme system
const RevolutionaryAdminDashboard: React.FC = () => (
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
);

export { RevolutionaryAdminDashboard };
export { CommandCard } from './AdminDashboardCards';
export default RevolutionaryAdminDashboard;
export { RevolutionaryAdminDashboard as MainDashboard };
