/**
 * MCP Status Dot Component
 *
 * A simple indicator that shows the status of both MCP servers
 * with color-coded dots in the sidebar
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Tooltip, Typography } from './primitives';
import { Activity } from 'lucide-react';

// Import MCP server utilities - FIXED: import as default export
import useMcpIntegration from '../../hooks/useMcpIntegration';

interface McpStatusDotProps {
  miniMode?: boolean;
}

const StatusContainer = styled.div<{ $miniMode: boolean }>`
  display: flex;
  align-items: center;
  margin-top: 8px;
  margin-bottom: ${({ $miniMode }) => ($miniMode ? '8px' : '0')};
  justify-content: ${({ $miniMode }) => ($miniMode ? 'center' : 'flex-start')};
`;

const Dot = styled.span<{ $color: string; $borderColor: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  margin-left: 8px;
  border: 2px solid ${({ $borderColor }) => $borderColor};
  flex-shrink: 0;
`;

const SmallDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  margin-right: 8px;
  flex-shrink: 0;
`;

/**
 * MCP Status Dot Component
 * Shows the status of MCP servers in the sidebar with green/red dots
 */
const McpStatusDot: React.FC<McpStatusDotProps> = ({ miniMode = false }) => {
  const { mcpStatus } = useMcpIntegration();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  const allServersRunning = mcpStatus.workout && mcpStatus.gamification;

  return (
    <StatusContainer $miniMode={miniMode}>
      <Tooltip
        title={
          <div>
            <Typography variant="subtitle2">MCP Server Status</Typography>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
              <SmallDot $color={mcpStatus.workout ? '#22c55e' : '#ef4444'} />
              <Typography variant="body2">
                Workout Server: {mcpStatus.workout ? 'Online' : 'Offline'}
              </Typography>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <SmallDot $color={mcpStatus.gamification ? '#22c55e' : '#ef4444'} />
              <Typography variant="body2">
                Gamification Server: {mcpStatus.gamification ? 'Online' : 'Offline'}
              </Typography>
            </div>
          </div>
        }
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>
          <Activity size={16} style={{ marginRight: miniMode ? 0 : 8 }} />
          {!miniMode && <Typography variant="body2">MCP Status</Typography>}
          <Dot
            $color={allServersRunning ? '#22c55e' : '#ef4444'}
            $borderColor={allServersRunning ? '#86efac' : '#fca5a5'}
          />
        </span>
      </Tooltip>
    </StatusContainer>
  );
};

export default McpStatusDot;
