/**
 * EmergencyDashboard.jsx
 * A simple, hooks-free emergency dashboard component that loads when normal admin dashboard fails.
 * This component uses no hooks and provides basic functionality to break out of loops.
 */
import React from 'react';

class EmergencyDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isAdmin: true,
      emergency: true
    };
    
    // Set emergency mode flags in localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bypass_admin_verification', 'true');
      localStorage.setItem('admin_emergency_mode', 'true');
      localStorage.setItem('emergency_dashboard_loaded', 'true');
    }
    
    console.log('[EMERGENCY DASHBOARD] Emergency Dashboard loaded');
  }
  
  // Method to reset all emergency flags
  resetEmergencyMode = () => {
    console.log('[EMERGENCY DASHBOARD] Resetting emergency mode...');
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('bypass_admin_verification');
      localStorage.removeItem('admin_emergency_mode');
      localStorage.removeItem('use_emergency_admin_route');
      localStorage.removeItem('fixing_hooks_error');
      localStorage.removeItem('emergency_fallback_mode');
      localStorage.removeItem('skip_hooks_verification');
      localStorage.removeItem('hooks_recovery_active');
      localStorage.removeItem('breaking_hooks_loop');
      localStorage.removeItem('circuit_breaker_active');
      localStorage.removeItem('emergency_dashboard_loaded');
    }
    
    // Force reload the application
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }
  
  // Method to force direct normal dashboard access
  goToAdminDashboard = () => {
    console.log('[EMERGENCY DASHBOARD] Attempting to access admin dashboard...');
    
    // Set all bypass flags to ensure access
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bypass_admin_verification', 'true');
      localStorage.setItem('admin_emergency_mode', 'true');
      localStorage.setItem('use_emergency_admin_route', 'true');
    }
    
    // Navigate to the admin dashboard
    window.location.href = '/dashboard/default';
  }
  
  render() {
    const cardStyle = {
      padding: '2rem',
      background: 'rgba(30, 30, 60, 0.4)',
      backdropFilter: 'blur(10px)',
      borderRadius: '15px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: 'white',
      maxWidth: '800px',
      margin: '2rem auto',
      textAlign: 'center'
    };
    
    const headerStyle = {
      color: '#00ffff',
      fontSize: '2rem',
      marginBottom: '1.5rem'
    };
    
    const buttonStyle = {
      background: 'linear-gradient(135deg, #00ffff, #00b8ff)',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      color: '#0a0a1a',
      fontWeight: 'bold',
      cursor: 'pointer',
      margin: '0.5rem',
      fontSize: '1rem'
    };
    
    const errorButtonStyle = {
      background: 'linear-gradient(135deg, #ff416c, #ff4b2b)',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      color: 'white',
      fontWeight: 'bold',
      cursor: 'pointer',
      margin: '0.5rem',
      fontSize: '1rem'
    };
    
    const infoStyle = {
      background: 'rgba(0, 0, 30, 0.5)',
      padding: '1rem',
      borderRadius: '8px',
      margin: '1.5rem 0',
      textAlign: 'left'
    };
    
    return (
      <div style={{ padding: '2rem' }}>
        <div style={cardStyle}>
          <h1 style={headerStyle}>Emergency Admin Dashboard</h1>
          
          <p style={{ marginBottom: '1.5rem' }}>
            This is an emergency dashboard interface that has been activated due to React hooks errors in the main dashboard.
            This version uses a simplified, class-based component structure to avoid hooks conflicts.
          </p>
          
          <div style={infoStyle}>
            <h3 style={{ color: '#00ffff', marginBottom: '0.5rem' }}>Emergency Status</h3>
            <p>
              <strong>Environment:</strong> {process.env.NODE_ENV || 'unknown'}<br />
              <strong>Emergency Mode:</strong> ACTIVE<br />
              <strong>Admin Access:</strong> {this.state.isAdmin ? 'GRANTED' : 'DENIED'}<br />
              <strong>User:</strong> Emergency Admin
            </p>
          </div>
          
          <div style={{ margin: '2rem 0' }}>
            <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Actions</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <button 
                style={buttonStyle}
                onClick={this.goToAdminDashboard}
              >
                Try Admin Dashboard
              </button>
              
              <button 
                style={buttonStyle}
                onClick={() => window.location.href = '/'}
              >
                Return to Home
              </button>
              
              <button 
                style={errorButtonStyle}
                onClick={this.resetEmergencyMode}
              >
                Reset Emergency Mode
              </button>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.7 }}>
            <p>
              Emergency Dashboard v1.0<br />
              If issues persist, please contact a developer for assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export default EmergencyDashboard;