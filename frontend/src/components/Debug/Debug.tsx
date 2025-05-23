import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import ApiStatusIndicator from './ApiStatusIndicator';

interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
}

/**
 * Debug Component - Shows current user state and routing info
 * Enhanced with dragging and minimize functionality
 */
const Debug: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('debugPanel_minimized');
    return saved === 'true';
  });
  const [position, setPosition] = useState<Position>(() => {
    const saved = localStorage.getItem('debugPanel_position');
    return saved ? JSON.parse(saved) : { x: 10, y: 70 };
  });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0
  });
  const panelRef = useRef<HTMLDivElement>(null);
  
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
  
  // Save minimized state to localStorage
  useEffect(() => {
    localStorage.setItem('debugPanel_minimized', isMinimized.toString());
  }, [isMinimized]);
  
  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('debugPanel_position', JSON.stringify(position));
  }, [position]);
  
  // Mouse event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
      e.preventDefault();
      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startPosX: position.x,
        startPosY: position.y
      });
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (dragState.isDragging) {
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;
      
      // Calculate new position with boundary constraints
      const newX = Math.max(0, Math.min(window.innerWidth - 320, dragState.startPosX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 50, dragState.startPosY + deltaY));
      
      setPosition({ x: newX, y: newY });
    }
  };
  
  const handleMouseUp = () => {
    setDragState(prev => ({ ...prev, isDragging: false }));
  };
  
  // Add global mouse events for dragging
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [dragState.isDragging, dragState.startX, dragState.startY, dragState.startPosX, dragState.startPosY]);
  
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  
  return (
    <>
      <div 
        ref={panelRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          top: `${position.y}px`,
          right: `${position.x}px`,
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: isMinimized ? '8px' : '15px',
          borderRadius: '8px',
          fontSize: isMinimized ? '10px' : '11px',
          zIndex: 9999,
          maxWidth: isMinimized ? '200px' : '320px',
          wordWrap: 'break-word',
          fontFamily: 'monospace',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          cursor: dragState.isDragging ? 'grabbing' : 'grab',
          transition: isMinimized ? 'all 0.3s ease' : 'none',
          userSelect: 'none',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div 
          className="drag-handle"
          style={{ 
            color: '#00ffff', 
            marginBottom: isMinimized ? '0' : '10px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'grab',
            padding: '2px 0'
          }}
        >
          <strong>🔧 Debug Panel</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span 
              onClick={toggleMinimize}
              style={{ 
                cursor: 'pointer', 
                padding: '2px 6px',
                borderRadius: '3px',
                background: 'rgba(255, 255, 255, 0.1)',
                fontSize: '10px',
                userSelect: 'none'
              }}
              title={isMinimized ? 'Expand panel' : 'Minimize panel'}
            >
              {isMinimized ? '📖' : '📕'}
            </span>
          </div>
        </div>
        
        {!isMinimized && (
          <>
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
              Tip: Use the user switcher (bottom right) to test different roles<br/>
              💡 Drag this panel by the header • Click 📕 to minimize
            </div>
          </>
        )}
        
        {isMinimized && (
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '5px' }}>
            User: {user?.role || 'none'} • Path: {location.pathname.split('/').pop() || 'home'}
          </div>
        )}
      </div>
      
      {/* API/Mock Status Indicator */}
      <ApiStatusIndicator hideInProduction={false} />
    </>
  );
};

export default Debug;