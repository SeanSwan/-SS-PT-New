/**
 * AdminOverviewControls — the Platform Pulse time-range selector + status row,
 * extracted from AdminOverviewPanel (SWA-138 S8, Rule 4 line-cap relief).
 */
import React from 'react';
import {
  ControlsHeader,
  ControlsInner,
  CosmicSelect,
  ErrorText,
  StatusText,
} from './AdminOverviewPanel.styles';

interface AdminOverviewControlsProps {
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
}

const AdminOverviewControls: React.FC<AdminOverviewControlsProps> = ({
  timeRange,
  onTimeRangeChange,
  isLoading,
  error,
}) => (
  <ControlsHeader>
    <ControlsInner>
      <CosmicSelect
        value={timeRange}
        onChange={(e) => onTimeRangeChange(e.target.value)}
        aria-label="Select time range"
      >
        <option value="24h">Last 24 hours</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </CosmicSelect>
      {isLoading && <StatusText>Loading...</StatusText>}
      {error && <ErrorText role="alert" aria-live="polite">{error}</ErrorText>}
    </ControlsInner>
  </ControlsHeader>
);

export default AdminOverviewControls;
