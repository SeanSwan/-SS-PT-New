import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

/**
 * Debug Component - Shows current user state and routing info
 */
const Debug: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  // Don't show in production
  if (import.meta.env.PROD) {
    return null;
  }
  
  // Only show if explicitly enabled
  if (!import.meta.env.VITE_DEV_MODE) {
    return null;
  }
  
  const getDashboardAccess = () => {
    if (!user) return 'No user logged in';
    
    const access = {
      admin: user.role === 'admin',
      trainer: user.role === 'admin' || user.role === 'trainer',
      client: user.role === 'admin' || user.role === 'trainer' || user.role === 'client',
      user: !!user
    };
    
    return access;
  };
  
  const dashboardAccess = getDashboardAccess();
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: '70px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '11px',
        zIndex: 9999,
        maxWidth: '320px',
        wordWrap: 'break-word',
        fontFamily: 'monospace',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <strong style={{ color: '#00ffff', marginBottom: '10px', display: 'block' }}>🔧 Debug Panel</strong>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Navigation:</strong><br/>
        Path: {location.pathname}<br/>
        Query: {location.search}<br/>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Auth State:</strong><br/>
        Loading: {String(isLoading)}<br/>
        User: {user ? '✅' : '❌'}<br/>
        Role: {user?.role || 'none'}<br/>
        Name: {user ? `${user.firstName} ${user.lastName}` : 'none'}<br/>
        Email: {user?.email || 'none'}<br/>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Dashboard Access:</strong><br/>
        {typeof dashboardAccess === 'object' ? (
          Object.entries(dashboardAccess).map(([key, value]) => (
            <span key={key} style={{ display: 'block' }}>
              {key}: {value ? '✅' : '❌'}
            </span>
          ))
        ) : (
          <span>{dashboardAccess}</span>
        )}
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>DOM Check:</strong><br/>
        DashboardSelector: {document.querySelector('[data-dashboard-selector="true"]') ? '✅' : '❌'}<br/>
        User Switcher: {document.querySelector('.user-switcher-panel') ? '✅' : '❌'}
      </div>
      
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
        Tip: Use the user switcher (bottom right) to test different roles
      </div>
    </div>
  );
};

export default Debug;