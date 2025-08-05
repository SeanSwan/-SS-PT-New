/**
 * AdminStellarSidebar.tsx - EMERGENCY SIMPLIFIED VERSION
 * =====================================================
 * 
 * Temporary simplified admin sidebar to bypass styled-components errors
 * This will get the admin dashboard working immediately while we fix the main component
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AdminStellarSidebar.css'; // Will create simple CSS file

interface AdminNavItem {
  id: string;
  label: string;
  route: string;
  icon: string;
}

const adminNavItems: AdminNavItem[] = [
  { id: 'overview', label: 'Dashboard Overview', route: '/dashboard/default', icon: '🛡️' },
  { id: 'analytics', label: 'Analytics', route: '/dashboard/analytics', icon: '📊' },
  { id: 'users', label: 'User Management', route: '/dashboard/user-management', icon: '👥' },
  { id: 'trainers', label: 'Trainers', route: '/dashboard/trainers', icon: '✅' },
  { id: 'sessions', label: 'Sessions', route: '/dashboard/admin-sessions', icon: '📅' },
  { id: 'packages', label: 'Packages', route: '/dashboard/admin-packages', icon: '📦' },
  { id: 'schedule', label: 'Master Schedule', route: '/dashboard/admin/master-schedule', icon: '🗓️' },
  { id: 'orders', label: 'Orders', route: '/dashboard/pending-orders', icon: '📋' },
  { id: 'settings', label: 'Settings', route: '/dashboard/settings', icon: '⚙️' }
];

const AdminStellarSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavigation = (route: string) => {
    navigate(route);
  };

  const isActive = (route: string) => {
    return location.pathname.includes(route.replace('/dashboard', ''));
  };

  return (
    <div className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className=\"admin-sidebar-header\">
        <div className=\"admin-logo\">
          <span className=\"admin-logo-icon\">⚡</span>
          {!isCollapsed && <span className=\"admin-logo-text\">Admin Command</span>}
        </div>
        <button 
          className=\"admin-collapse-btn\"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label=\"Toggle sidebar\"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <nav className=\"admin-nav\">
        <div className=\"admin-nav-section\">
          <h3 className=\"admin-section-title\">
            {!isCollapsed && 'Command Center'}
          </h3>
          {adminNavItems.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${isActive(item.route) ? 'active' : ''}`}
              onClick={() => handleNavigation(item.route)}
              title={item.label}
            >
              <span className=\"admin-nav-icon\">{item.icon}</span>
              {!isCollapsed && <span className=\"admin-nav-text\">{item.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      <div className=\"admin-sidebar-footer\">
        {!isCollapsed && (
          <div className=\"admin-version-info\">
            Admin v1.0 - Emergency Mode
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStellarSidebar;
