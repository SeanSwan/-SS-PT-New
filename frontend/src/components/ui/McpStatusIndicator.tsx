/**
 * McpStatusIndicator Component
 *
 * Displays the status of MCP servers with visual indicators
 * and provides information about server connectivity.
 */

import React from 'react';
import styled from 'styled-components';
import { McpServerStatus } from '../../utils/mcp-utils';
import {
  Server,
  Trophy,
  AlertCircle,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const IndicatorContainer = styled.div<{ $floating?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  ${({ $floating }) => $floating && `
    position: fixed;
    bottom: 15px;
    left: 15px;
    z-index: 1000;
  `}
`;

const CompactContainer = styled.div<{ $floating?: boolean }>`
  display: flex;
  gap: 10px;
  ${({ $floating }) => $floating && `
    position: fixed;
    bottom: 15px;
    left: 15px;
    z-index: 1000;
    opacity: 0.8;
    &:hover { opacity: 1; }
  `}
`;

const StatusCard = styled.div<{ $bgColor: string; $borderColor: string }>`
  padding: 12px;
  border-radius: 8px;
  background-color: ${props => props.$bgColor};
  border: 1px solid ${props => props.$borderColor};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const StatusTitle = styled.span`
  margin-left: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
`;

const StatusBadgesRow = styled.div`
  display: flex;
  gap: 8px;
`;

const StatusBadge = styled.div<{ $bgColor: string; $borderColor: string }>`
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 20px;
  background-color: ${props => props.$bgColor};
  border: 1px solid ${props => props.$borderColor};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

const BadgeLabel = styled.span`
  margin-left: 4px;
  font-size: 0.75rem;
  color: white;
  font-weight: bold;
`;

interface McpStatusIndicatorProps {
  status: McpServerStatus;
  variant?: 'compact' | 'full';
  position?: 'floating' | 'inline';
}

const McpStatusIndicator: React.FC<McpStatusIndicatorProps> = ({
  status,
  variant = 'compact',
  position = 'floating'
}) => {
  const hasFullFunctionality = status.workout && status.gamification;
  const hasBasicFunctionality = status.workout;
  const isFloating = position === 'floating';

  const getStatusColor = (isOnline: boolean) => isOnline ? '#00c853' : '#ff0000';
  const getStatusBgColor = (isOnline: boolean) => isOnline ? 'rgba(0, 200, 83, 0.2)' : 'rgba(255, 0, 0, 0.2)';
  const getStatusBorderColor = (isOnline: boolean) => isOnline ? 'rgba(0, 200, 83, 0.5)' : 'rgba(255, 0, 0, 0.5)';

  const getOverallStatusText = () => {
    if (hasFullFunctionality) return 'All MCP servers online';
    if (hasBasicFunctionality) return 'Basic MCP functionality available';
    return 'MCP servers offline';
  };

  const getOverallStatusIcon = () => {
    if (hasFullFunctionality) return <CheckCircle size={15} color="#00c853" />;
    if (hasBasicFunctionality) return <AlertTriangle size={15} color="#ff9800" />;
    return <AlertCircle size={15} color="#ff0000" />;
  };

  const getOverallBgColor = () => {
    if (hasFullFunctionality) return 'rgba(0, 200, 83, 0.1)';
    if (hasBasicFunctionality) return 'rgba(255, 152, 0, 0.1)';
    return 'rgba(255, 0, 0, 0.1)';
  };

  const getOverallBorderColor = () => {
    if (hasFullFunctionality) return 'rgba(0, 200, 83, 0.3)';
    if (hasBasicFunctionality) return 'rgba(255, 152, 0, 0.3)';
    return 'rgba(255, 0, 0, 0.3)';
  };

  // Render full variant
  if (variant === 'full') {
    return (
      <IndicatorContainer $floating={isFloating}>
        <StatusCard $bgColor={getOverallBgColor()} $borderColor={getOverallBorderColor()}>
          <StatusHeader>
            {getOverallStatusIcon()}
            <StatusTitle>{getOverallStatusText()}</StatusTitle>
          </StatusHeader>

          <StatusBadgesRow>
            <StatusBadge
              $bgColor={getStatusBgColor(status.workout)}
              $borderColor={getStatusBorderColor(status.workout)}
            >
              <Server size={15} color={getStatusColor(status.workout)} />
              <BadgeLabel>Workout MCP</BadgeLabel>
            </StatusBadge>

            <StatusBadge
              $bgColor={getStatusBgColor(status.gamification)}
              $borderColor={getStatusBorderColor(status.gamification)}
            >
              <Trophy size={15} color={getStatusColor(status.gamification)} />
              <BadgeLabel>Gamification MCP</BadgeLabel>
            </StatusBadge>
          </StatusBadgesRow>
        </StatusCard>
      </IndicatorContainer>
    );
  }

  // Render compact variant
  return (
    <CompactContainer $floating={isFloating}>
      <StatusBadge
        $bgColor={getStatusBgColor(status.workout)}
        $borderColor={getStatusBorderColor(status.workout)}
        title={`Workout MCP Server: ${status.workout ? 'Online' : 'Offline'}`}
      >
        <Server size={15} color={getStatusColor(status.workout)} />
        <BadgeLabel>Workout</BadgeLabel>
      </StatusBadge>

      <StatusBadge
        $bgColor={getStatusBgColor(status.gamification)}
        $borderColor={getStatusBorderColor(status.gamification)}
        title={`Gamification MCP Server: ${status.gamification ? 'Online' : 'Offline'}`}
      >
        <Trophy size={15} color={getStatusColor(status.gamification)} />
        <BadgeLabel>Gamification</BadgeLabel>
      </StatusBadge>
    </CompactContainer>
  );
};

export default McpStatusIndicator;
