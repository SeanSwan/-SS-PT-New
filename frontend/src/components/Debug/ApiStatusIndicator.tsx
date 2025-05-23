import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';

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

// Styled components for the indicator
const pulse = keyframes`
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
`;

const StatusContainer = styled.div<{ $isProd: boolean; $isDragging: boolean; $position: Position }>`
  position: fixed;
  bottom: ${props => props.$position.y}px;
  left: ${props => props.$position.x}px;
  background: ${props => props.$isProd ? 'rgba(0, 100, 0, 0.9)' : 'rgba(100, 0, 0, 0.9)'};
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid ${props => props.$isProd ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)'};
  max-width: 300px;
  user-select: none;
  cursor: ${props => props.$isDragging ? 'grabbing' : 'grab'};
  transition: ${props => props.$isDragging ? 'none' : 'all 0.3s ease'};
  backdrop-filter: blur(8px);
  
  &:hover {
    transform: ${props => props.$isDragging ? 'none' : 'translateY(-2px)'};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
`;

const StatusDot = styled.div<{ $isLive: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$isLive ? '#4caf50' : '#f44336'};
  animation: ${pulse} 2s infinite;
`;

const StatusText = styled.div`
  flex: 1;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const DetailPanel = styled.div<{ $expanded: boolean }>`
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 280px;
  background: rgba(0, 0, 0, 0.95);
  border-radius: 8px;
  padding: ${props => props.$expanded ? '15px' : '0'};
  margin-bottom: 10px;
  max-height: ${props => props.$expanded ? '400px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: ${props => props.$expanded ? '1' : '0'};
  z-index: 9998;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: grab;
  flex: 1;
  
  &:active {
    cursor: grabbing;
  }
`;

const DetailItem = styled.div`
  margin-bottom: 10px;
  
  strong {
    color: #00ffff;
    display: block;
    margin-bottom: 5px;
  }
  
  span {
    display: block;
    margin-left: 10px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.8);
  }
`;

interface ApiStatusIndicatorProps {
  hideInProduction?: boolean;
}

/**
 * Component that displays the current API/Mock data status
 */
const ApiStatusIndicator: React.FC<ApiStatusIndicatorProps> = ({ hideInProduction = true }) => {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [envInfo, setEnvInfo] = useState<Record<string, string>>({});
  const [position, setPosition] = useState<Position>(() => {
    const saved = localStorage.getItem('apiStatusIndicator_position');
    return saved ? JSON.parse(saved) : { x: 10, y: 10 };
  });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0
  });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Don't show in production if configured that way
  const isProd = import.meta.env.PROD;
  if (isProd && hideInProduction) {
    return null;
  }
  
  // Get the API status on mount
  useEffect(() => {
    try {
      const isMockDataEnabled = localStorage.getItem('use_mock_data') === 'true';
      setUsingMockData(isMockDataEnabled);
      
      // Get API endpoint from env
      const endpoint = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      setApiEndpoint(endpoint);
      
      // Collect environment info
      const environmentInfo: Record<string, string> = {};
      
      // Get all VITE_ environment variables
      Object.keys(import.meta.env).forEach(key => {
        if (key.startsWith('VITE_') && key !== 'VITE_API_BASE_URL') {
          environmentInfo[key] = String(import.meta.env[key]);
        }
      });
      
      setEnvInfo(environmentInfo);
    } catch (error) {
      console.error('Error checking API status:', error);
    }
  }, []);
  
  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('apiStatusIndicator_position', JSON.stringify(position));
  }, [position]);
  
  // Mouse event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
      e.preventDefault();
      e.stopPropagation();
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
      const newX = Math.max(0, Math.min(window.innerWidth - 300, dragState.startPosX + deltaX));
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
  
  /**
   * Toggle mock data mode
   */
  const toggleMockData = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = !usingMockData;
      localStorage.setItem('use_mock_data', newStatus ? 'true' : 'false');
      setUsingMockData(newStatus);
      
      // Force reload to apply changes
      window.location.reload();
    } catch (error) {
      console.error('Error toggling mock data mode:', error);
    }
  };
  
  /**
   * Toggle details expansion
   */
  const toggleDetails = (e: React.MouseEvent) => {
    if (!dragState.isDragging) {
      setDetailsExpanded(!detailsExpanded);
    }
  };
  
  return (
    <StatusContainer 
      ref={containerRef}
      $isProd={isProd} 
      $isDragging={dragState.isDragging}
      $position={position}
      onMouseDown={handleMouseDown}
      onClick={toggleDetails}
      title="Drag to move • Click to expand details"
    >
      <DragHandle className="drag-handle">
        <StatusDot $isLive={!usingMockData} />
        <StatusText>
          {isProd ? 'PRODUCTION' : 'DEVELOPMENT'} - 
          {usingMockData ? ' Mock Data' : ' Live API'}
        </StatusText>
      </DragHandle>
      
      <ToggleButton onClick={toggleMockData}>
        {usingMockData ? 'USE API' : 'USE MOCK'}
      </ToggleButton>
      
      <DetailPanel $expanded={detailsExpanded}>
        <DetailItem>
          <strong>API Status:</strong>
          <span>Mode: {usingMockData ? 'Using Mock Data' : 'Using Live API'}</span>
          <span>API Endpoint: {apiEndpoint}</span>
        </DetailItem>
        
        <DetailItem>
          <strong>Environment:</strong>
          <span>Mode: {isProd ? 'Production' : 'Development'}</span>
          {Object.entries(envInfo).map(([key, value]) => (
            <span key={key}>{key}: {value}</span>
          ))}
        </DetailItem>
        
        <DetailItem>
          <strong>Storage:</strong>
          <span>use_mock_data: {localStorage.getItem('use_mock_data') || 'not set'}</span>
          <span>Auth Token: {localStorage.getItem('token') ? '✅ Present' : '❌ Not found'}</span>
        </DetailItem>
        
        <DetailItem style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: '15px' }}>
          Click the toggle button to switch between mock and live data.
          <br />Warning: This will reload the page.
          <br /><br />💡 Drag this panel to move it around
        </DetailItem>
      </DetailPanel>
    </StatusContainer>
  );
};

export default ApiStatusIndicator;