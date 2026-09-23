/**
 * Revolutionary Stellar Command Center Admin Dashboard
 * SwanStudios Personal Training & Social Media Platform
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { AdminDashboardMotionShell, CommandHeader } from './overview/AdminOverview.styles';
import AdminOverviewPanel from './overview/AdminOverviewPanel';
import {
  DashboardBackgroundSettingsPanel,
  DashboardBackgroundSurface,
} from '../../shared/DashboardBackgroundStudio';

// === MAIN ADMIN DASHBOARD COMPONENT ===
// NOTE: Uses universal theme from UniversalThemeContext (provided by parent)
// Removed standalone ThemeProvider/adminGalaxyTheme to connect to site-wide theme system
const RevolutionaryAdminDashboard: React.FC = () => (
  <DashboardBackgroundSurface>
  <AdminDashboardMotionShell
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <CommandHeader
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <span className="command-kicker">Admin / live briefing</span>
      <div className="command-heading-row">
        <div>
          <h1>What needs a decision first?</h1>
          <p>Start with live client, payment, and safety queues. Analytics follow once the work that changes a client day is clear.</p>
        </div>
        <Link className="command-coach-link" to="/dashboard/admin/coach-assistant?workspace=chat">
          Open Coach Command Center
        </Link>
      </div>
    </CommandHeader>

    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <AdminOverviewPanel />
    </motion.div>

    <DashboardBackgroundSettingsPanel scopeLabel="Admin" />
  </AdminDashboardMotionShell>
  </DashboardBackgroundSurface>
);

export { RevolutionaryAdminDashboard };
export { CommandCard } from './AdminDashboardCards';
export default RevolutionaryAdminDashboard;
export { RevolutionaryAdminDashboard as MainDashboard };
