import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

// Import custom hooks
import useClientDashboardMcp from '../../hooks/useClientDashboardMcp';

const StatusContainer = styled.div<{ status: 'success' | 'error' | 'syncing' | 'stale' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  background-color: ${(props) => {
    switch (props.status) {
      case 'success':
        return 'rgba(0, 200, 83, 0.15)';
      case 'error':
        return 'rgba(255, 107, 107, 0.15)';
      case 'syncing':
        return 'rgba(0, 255, 255, 0.15)';
      case 'stale':
        return 'rgba(255, 187, 0, 0.15)';
    }
  }};
  color: ${(props) => {
    switch (props.status) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#FF6B6B';
      case 'syncing':
        return '#00FFFF';
      case 'stale':
        return '#FFBB00';
    }
  }};
`;

const StatusText = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RefreshButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Spinning animation for the refresh icon
const SpinningIcon = styled(RefreshCw)`
  animation: spin 1.5s linear infinite;
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Time thresholds for sync status
const SYNC_THRESHOLDS = {
  STALE: 15 * 60 * 1000, // 15 minutes
  VERY_STALE: 60 * 60 * 1000, // 1 hour
};

/**
 * SyncStatus Component
 * 
 * Displays the synchronization status between client and admin dashboards,
 * including the time since last sync and a button to manually refresh.
 */
const SyncStatus: React.FC = () => {
  const { lastSyncTime, loading, error, refreshAll } = useClientDashboardMcp();
  const [syncStatus, setSyncStatus] = useState<'success' | 'error' | 'syncing' | 'stale'>('syncing');
  const [timeSinceSync, setTimeSinceSync] = useState<string>('');
  
  // Update sync status and time display
  useEffect(() => {
    const updateStatus = () => {
      if (loading) {
        setSyncStatus('syncing');
        setTimeSinceSync('Syncing...');
        return;
      }
      
      if (error) {
        setSyncStatus('error');
        setTimeSinceSync('Sync failed');
        return;
      }
      
      if (!lastSyncTime) {
        setSyncStatus('stale');
        setTimeSinceSync('Never synced');
        return;
      }
      
      const now = new Date();
      const syncTime = new Date(lastSyncTime);
      const timeDiff = now.getTime() - syncTime.getTime();
      
      // Format the time since last sync
      if (timeDiff < 60 * 1000) {
        setTimeSinceSync('Just now');
      } else if (timeDiff < 60 * 60 * 1000) {
        const minutes = Math.floor(timeDiff / (60 * 1000));
        setTimeSinceSync(`${minutes} minute${minutes !== 1 ? 's' : ''} ago`);
      } else if (timeDiff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(timeDiff / (60 * 60 * 1000));
        setTimeSinceSync(`${hours} hour${hours !== 1 ? 's' : ''} ago`);
      } else {
        const days = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
        setTimeSinceSync(`${days} day${days !== 1 ? 's' : ''} ago`);
      }
      
      // Set status based on time difference
      if (timeDiff < SYNC_THRESHOLDS.STALE) {
        setSyncStatus('success');
      } else if (timeDiff < SYNC_THRESHOLDS.VERY_STALE) {
        setSyncStatus('stale');
      } else {
        setSyncStatus('stale');
      }
    };
    
    // Update immediately
    updateStatus();
    
    // Update every minute
    const interval = setInterval(updateStatus, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [lastSyncTime, loading, error]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    refreshAll();
  };
  
  // Return nothing if no sync has happened and no error
  if (!lastSyncTime && !error && !loading) {
    return null;
  }
  
  // Get icon based on status
  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'success':
        return <CheckCircle size={16} />;
      case 'error':
        return <AlertTriangle size={16} />;
      case 'syncing':
        return <SpinningIcon size={16} />;
      case 'stale':
        return <Clock size={16} />;
    }
  };
  
  // Get status message
  const getStatusMessage = () => {
    switch (syncStatus) {
      case 'success':
        return `Data synchronized ${timeSinceSync}`;
      case 'error':
        return 'Failed to synchronize data';
      case 'syncing':
        return 'Synchronizing data...';
      case 'stale':
        return `Data is stale (Last sync: ${timeSinceSync})`;
    }
  };
  
  return (
    <StatusContainer status={syncStatus}>
      <StatusText>
        {getStatusIcon()}
        <span>{getStatusMessage()}</span>
      </StatusText>
      
      <RefreshButton 
        onClick={handleRefresh} 
        disabled={loading}
      >
        <RefreshCw size={14} />
        {loading ? 'Syncing...' : 'Refresh'}
      </RefreshButton>
    </StatusContainer>
  );
};

export default SyncStatus;