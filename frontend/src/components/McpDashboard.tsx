/**
 * MCP Dashboard Component
 *
 * A complete dashboard for managing MCP server integration
 * with all MCP-related functionality in one place.
 *
 * Migrated from @mui/material to styled-components with Galaxy-Swan theme.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import useClientDashboardMcp from '../hooks/useClientDashboardMcp';
import McpStatusIndicator from './ui/McpStatusIndicator';
import McpMonitor from './ui/McpMonitor';
import McpIntegrationWrapper from './ui/McpIntegrationWrapper';
import GamificationDisplay from './Gamification/GamificationDisplay';
import { checkMcpServersStatus } from '../utils/mcp-utils';
import { getMcpAuthHeaders, setMcpAuthToken } from '../utils/mcp-auth';

// Icons
import {
  Server,
  Settings,
  Play,
  PauseCircle,
  RefreshCw,
  UserCheck,
  Shield,
  Key,
  Save,
  Trophy
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Galaxy-Swan Theme Tokens
   ═══════════════════════════════════════════════════════ */
const GALAXY_CORE = '#0a0a1a';
const SWAN_CYAN = '#00FFFF';
const COSMIC_PURPLE = '#7851A9';
const GLASS_BG = 'rgba(255, 255, 255, 0.04)';
const GLASS_BORDER = 'rgba(255, 255, 255, 0.08)';
const TEXT_PRIMARY = 'rgba(255, 255, 255, 0.92)';
const TEXT_SECONDARY = 'rgba(255, 255, 255, 0.6)';
const SUCCESS_BG = 'rgba(0, 200, 83, 0.1)';
const SUCCESS_BORDER = 'rgba(0, 200, 83, 0.3)';
const SUCCESS_COLOR = '#00c853';
const ERROR_BG = 'rgba(244, 67, 54, 0.1)';
const ERROR_BORDER = 'rgba(244, 67, 54, 0.3)';
const ERROR_COLOR = '#f44336';
const WARNING_COLOR = '#ff9800';
const INFO_COLOR = '#29b6f6';

/* ═══════════════════════════════════════════════════════
   Layout Primitives
   ═══════════════════════════════════════════════════════ */
const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;

  @media (max-width: 768px) {
    padding: 20px 16px;
  }
`;

const Section = styled.div<{ $mt?: number; $mb?: number }>`
  margin-top: ${({ $mt }) => ($mt != null ? `${$mt}px` : '0')};
  margin-bottom: ${({ $mb }) => ($mb != null ? `${$mb}px` : '0')};
`;

const FlexRow = styled.div<{ $gap?: number; $wrap?: boolean }>`
  display: flex;
  gap: ${({ $gap }) => ($gap != null ? `${$gap}px` : '0')};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
  align-items: center;

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

/* ═══════════════════════════════════════════════════════
   Typography Primitives
   ═══════════════════════════════════════════════════════ */
const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 600;
  color: ${TEXT_PRIMARY};
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const PageSubtitle = styled.p`
  font-size: 1rem;
  color: ${TEXT_SECONDARY};
  margin: 0;
  line-height: 1.6;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${TEXT_PRIMARY};
  margin: 0 0 16px 0;
`;

const BodyText = styled.p`
  font-size: 0.875rem;
  color: ${TEXT_SECONDARY};
  margin: 0 0 12px 0;
  line-height: 1.6;
`;

const SmallText = styled.small`
  font-size: 0.75rem;
  color: ${TEXT_SECONDARY};
  display: block;
  margin-top: 4px;
`;

const StatusLabel = styled.span`
  font-size: 0.875rem;
  color: ${TEXT_PRIMARY};

  strong {
    font-weight: 600;
  }
`;

/* ═══════════════════════════════════════════════════════
   Paper / Card Primitives
   ═══════════════════════════════════════════════════════ */
const GlassPanel = styled.div`
  background: ${GLASS_BG};
  border: 1px solid ${GLASS_BORDER};
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
`;

const StatusChip = styled.div<{ $online: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 10px;
  background: ${({ $online }) => ($online ? SUCCESS_BG : ERROR_BG)};
  border: 1px solid ${({ $online }) => ($online ? SUCCESS_BORDER : ERROR_BORDER)};
`;

const CardWrapper = styled.div`
  background: ${GLASS_BG};
  border: 1px solid ${GLASS_BORDER};
  border-radius: 12px;
  overflow: hidden;
`;

const CardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  color: ${TEXT_PRIMARY};
  font-size: 1rem;
  font-weight: 600;
`;

const CardDivider = styled.hr`
  border: none;
  height: 1px;
  background: ${GLASS_BORDER};
  margin: 0;
`;

const CardBody = styled.div`
  padding: 20px;
`;

/* ═══════════════════════════════════════════════════════
   Grid Primitives
   ═══════════════════════════════════════════════════════ */
const GridContainer = styled.div<{ $columns?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $columns }) => $columns || '1fr'};
  gap: ${({ $gap }) => ($gap != null ? `${$gap}px` : '24px')};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const GridFullWidth = styled.div`
  grid-column: 1 / -1;
`;

/* ═══════════════════════════════════════════════════════
   Button Primitives
   ═══════════════════════════════════════════════════════ */
const ButtonBase = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  border: none;
  font-family: inherit;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(ButtonBase)`
  background: linear-gradient(135deg, ${SWAN_CYAN}22, ${COSMIC_PURPLE}44);
  border: 1px solid ${SWAN_CYAN}44;
  color: ${SWAN_CYAN};

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, ${SWAN_CYAN}33, ${COSMIC_PURPLE}55);
    border-color: ${SWAN_CYAN}66;
    box-shadow: 0 0 16px ${SWAN_CYAN}22;
  }
`;

const SuccessButton = styled(ButtonBase)`
  background: linear-gradient(135deg, ${SUCCESS_COLOR}22, ${SUCCESS_COLOR}44);
  border: 1px solid ${SUCCESS_COLOR}44;
  color: ${SUCCESS_COLOR};

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, ${SUCCESS_COLOR}33, ${SUCCESS_COLOR}55);
    border-color: ${SUCCESS_COLOR}66;
  }
`;

const DangerButton = styled(ButtonBase)`
  background: linear-gradient(135deg, ${ERROR_COLOR}22, ${ERROR_COLOR}44);
  border: 1px solid ${ERROR_COLOR}44;
  color: ${ERROR_COLOR};

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, ${ERROR_COLOR}33, ${ERROR_COLOR}55);
    border-color: ${ERROR_COLOR}66;
  }
`;

const OutlinedButton = styled(ButtonBase)`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: ${TEXT_PRIMARY};

  &:hover:not(:disabled) {
    border-color: ${SWAN_CYAN}66;
    color: ${SWAN_CYAN};
    background: rgba(0, 255, 255, 0.04);
  }
`;

const FullWidthButton = styled(PrimaryButton)`
  width: 100%;
`;

/* ═══════════════════════════════════════════════════════
   Form Primitives
   ═══════════════════════════════════════════════════════ */
const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InputLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${SWAN_CYAN};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 12px 16px;
  font-size: 0.875rem;
  color: ${TEXT_PRIMARY};
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
  box-sizing: border-box;

  &:focus {
    border-color: ${SWAN_CYAN}88;
    box-shadow: 0 0 0 2px ${SWAN_CYAN}22;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const HelperText = styled.small`
  font-size: 0.75rem;
  color: ${TEXT_SECONDARY};
  display: block;
  margin-top: 4px;
`;

/* ═══════════════════════════════════════════════════════
   Toggle Switch Primitives
   ═══════════════════════════════════════════════════════ */
const ToggleWrapper = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
`;

const ToggleTrack = styled.div<{ $checked?: boolean }>`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $checked }) => ($checked ? SWAN_CYAN : 'rgba(255, 255, 255, 0.2)')};
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
`;

const ToggleThumb = styled.div<{ $checked?: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '22px' : '2px')};
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const ToggleLabel = styled.span`
  font-size: 0.875rem;
  color: ${TEXT_PRIMARY};
`;

/* ═══════════════════════════════════════════════════════
   Tabs Primitives
   ═══════════════════════════════════════════════════════ */
const TabBar = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 16px;
  overflow-x: auto;

  /* Hide scrollbar but keep scroll functionality */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? SWAN_CYAN : 'transparent')};
  color: ${({ $active }) => ($active ? SWAN_CYAN : 'rgba(255, 255, 255, 0.6)')};
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  transition: color 0.2s, border-color 0.2s;

  &:hover {
    color: ${({ $active }) => ($active ? SWAN_CYAN : 'rgba(255, 255, 255, 0.85)')};
  }
`;

/* ═══════════════════════════════════════════════════════
   Alert Primitive
   ═══════════════════════════════════════════════════════ */
const ALERT_COLORS: Record<string, string> = {
  success: SUCCESS_COLOR,
  error: ERROR_COLOR,
  warning: WARNING_COLOR,
  info: INFO_COLOR,
};

const AlertBox = styled.div<{ $severity: string }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 8px;
  background: ${({ $severity }) => {
    const c = ALERT_COLORS[$severity] || INFO_COLOR;
    return `${c}12`;
  }};
  border-left: 4px solid ${({ $severity }) => ALERT_COLORS[$severity] || INFO_COLOR};
  color: ${TEXT_PRIMARY};
  font-size: 0.875rem;
  line-height: 1.5;
`;

/* ═══════════════════════════════════════════════════════
   Toast / Snackbar Primitive
   ═══════════════════════════════════════════════════════ */
const ToastOverlay = styled.div<{ $visible: boolean; $severity: string }>`
  position: fixed;
  bottom: ${({ $visible }) => ($visible ? '24px' : '-100px')};
  left: 50%;
  transform: translateX(-50%);
  min-width: 300px;
  max-width: 560px;
  padding: 14px 20px;
  border-radius: 10px;
  background: ${GALAXY_CORE};
  border: 1px solid ${({ $severity }) => ALERT_COLORS[$severity] || INFO_COLOR}44;
  border-left: 4px solid ${({ $severity }) => ALERT_COLORS[$severity] || INFO_COLOR};
  color: ${TEXT_PRIMARY};
  font-size: 0.875rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 9999;
  transition: bottom 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  backdrop-filter: blur(16px);
`;

const ToastCloseButton = styled.button`
  background: none;
  border: none;
  color: ${TEXT_SECONDARY};
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px 8px;
  line-height: 1;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${TEXT_PRIMARY};
  }
`;

/* ═══════════════════════════════════════════════════════
   Server Control Button Row
   ═══════════════════════════════════════════════════════ */
const ServerControlRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;

  & > * {
    flex: 1;
  }

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

/* ═══════════════════════════════════════════════════════
   Reusable Toggle Component
   ═══════════════════════════════════════════════════════ */
interface ToggleSwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => (
  <ToggleWrapper>
    <HiddenCheckbox
      checked={checked}
      onChange={(e) => onChange?.(e.target.checked)}
    />
    <ToggleTrack $checked={checked}>
      <ToggleThumb $checked={checked} />
    </ToggleTrack>
    <ToggleLabel>{label}</ToggleLabel>
  </ToggleWrapper>
);

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

/**
 * Admin dashboard for managing MCP server integration
 */
const McpDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    mcpStatus,
    loading,
    error,
    workoutData,
    gamificationData,
    refreshData
  } = useClientDashboardMcp();

  // Tab state
  const [activeTab, setActiveTab] = useState<number>(0);

  // MCP Settings
  const [workoutMcpUrl, setWorkoutMcpUrl] = useState<string>(
    process.env.REACT_APP_WORKOUT_MCP_URL || 'http://localhost:8000'
  );
  const [gamificationMcpUrl, setGamificationMcpUrl] = useState<string>(
    process.env.REACT_APP_GAMIFICATION_MCP_URL || 'http://localhost:8001'
  );
  const [apiToken, setApiToken] = useState<string>(localStorage.getItem('auth_token') || '');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [fallbackEnabled, setFallbackEnabled] = useState<boolean>(true);

  // Server control
  const [serverStarting, setServerStarting] = useState<boolean>(false);
  const [serverStopping, setServerStopping] = useState<boolean>(false);

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Check MCP status on mount
  useEffect(() => {
    checkMcpStatus();
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!notification.open) return;
    const timer = setTimeout(() => {
      setNotification((prev) => ({ ...prev, open: false }));
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification.open]);

  // Check MCP server status
  const checkMcpStatus = async () => {
    try {
      const status = await checkMcpServersStatus();
      console.log('MCP Status:', status);
    } catch (error) {
      console.error('Error checking MCP status:', error);
    }
  };

  // Save MCP settings
  const saveSettings = () => {
    // Save to local storage
    localStorage.setItem('workout_mcp_url', workoutMcpUrl);
    localStorage.setItem('gamification_mcp_url', gamificationMcpUrl);

    // Set auth token
    if (apiToken) {
      setMcpAuthToken(apiToken);
    }

    // Show notification
    setNotification({
      open: true,
      message: 'MCP settings saved successfully!',
      severity: 'success'
    });

    // Refresh data
    refreshData(true);
  };

  // Simulate starting MCP servers
  const startServers = () => {
    setServerStarting(true);

    setTimeout(() => {
      setServerStarting(false);

      setNotification({
        open: true,
        message: 'MCP servers started successfully!',
        severity: 'success'
      });

      refreshData(true);
    }, 2000);
  };

  // Simulate stopping MCP servers
  const stopServers = () => {
    setServerStopping(true);

    setTimeout(() => {
      setServerStopping(false);

      setNotification({
        open: true,
        message: 'MCP servers stopped!',
        severity: 'info'
      });

      refreshData(true);
    }, 2000);
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Status
        return (
          <Section $mt={16}>
            <McpMonitor
              variant="full"
              autoRefresh={autoRefresh}
              refreshInterval={30000}
              onStatusChange={(status) => {
                console.log('MCP Status changed:', status);
              }}
            />
          </Section>
        );

      case 1: // Settings
        return (
          <Section $mt={16}>
            <GlassPanel>
              <SectionTitle>MCP Server Configuration</SectionTitle>

              <GridContainer $columns="1fr 1fr" $gap={24}>
                {/* Workout MCP URL */}
                <InputGroup>
                  <InputLabel htmlFor="workout-mcp-url">Workout MCP Server URL</InputLabel>
                  <StyledInput
                    id="workout-mcp-url"
                    value={workoutMcpUrl}
                    onChange={(e) => setWorkoutMcpUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                  />
                  <HelperText>URL for the AI Workout MCP server</HelperText>
                </InputGroup>

                {/* Gamification MCP URL */}
                <InputGroup>
                  <InputLabel htmlFor="gamification-mcp-url">Gamification MCP Server URL</InputLabel>
                  <StyledInput
                    id="gamification-mcp-url"
                    value={gamificationMcpUrl}
                    onChange={(e) => setGamificationMcpUrl(e.target.value)}
                    placeholder="http://localhost:8001"
                  />
                  <HelperText>URL for the Gamification MCP server</HelperText>
                </InputGroup>

                {/* API Token */}
                <GridFullWidth>
                  <InputGroup>
                    <InputLabel htmlFor="api-token">API Authentication Token</InputLabel>
                    <StyledInput
                      id="api-token"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      type="password"
                      placeholder="Enter authentication token"
                    />
                    <HelperText>Authentication token for MCP server requests</HelperText>
                  </InputGroup>
                </GridFullWidth>

                {/* Auto Refresh Toggle */}
                <div>
                  <ToggleSwitch
                    checked={autoRefresh}
                    onChange={(checked) => setAutoRefresh(checked)}
                    label="Enable Auto-Refresh"
                  />
                  <SmallText>Automatically refresh MCP data at regular intervals</SmallText>
                </div>

                {/* Fallback Toggle */}
                <div>
                  <ToggleSwitch
                    checked={fallbackEnabled}
                    onChange={(checked) => setFallbackEnabled(checked)}
                    label="Enable Fallback Mode"
                  />
                  <SmallText>Use mock data when MCP servers are offline</SmallText>
                </div>

                {/* Save Settings Button */}
                <GridFullWidth>
                  <FullWidthButton onClick={saveSettings}>
                    <Save size={16} />
                    Save MCP Settings
                  </FullWidthButton>
                </GridFullWidth>
              </GridContainer>
            </GlassPanel>

            <GlassPanel style={{ marginTop: '24px' }}>
              <SectionTitle>Server Control</SectionTitle>

              <ServerControlRow>
                <SuccessButton
                  onClick={startServers}
                  disabled={serverStarting || (mcpStatus.workout && mcpStatus.gamification)}
                >
                  <Play size={16} />
                  {serverStarting ? 'Starting Servers...' : 'Start MCP Servers'}
                </SuccessButton>

                <DangerButton
                  onClick={stopServers}
                  disabled={serverStopping || (!mcpStatus.workout && !mcpStatus.gamification)}
                >
                  <PauseCircle size={16} />
                  {serverStopping ? 'Stopping Servers...' : 'Stop MCP Servers'}
                </DangerButton>

                <OutlinedButton onClick={() => refreshData(true)}>
                  <RefreshCw size={16} />
                  Refresh Data
                </OutlinedButton>
              </ServerControlRow>

              <AlertBox $severity="info" style={{ marginTop: '24px' }}>
                Note: Server control is simulated in this dashboard. In a production environment,
                you would implement actual server management functionality.
              </AlertBox>
            </GlassPanel>
          </Section>
        );

      case 2: // Security
        return (
          <Section $mt={16}>
            <GlassPanel>
              <SectionTitle>MCP Security Settings</SectionTitle>

              <GridContainer $columns="1fr" $gap={24}>
                {/* Authentication */}
                <CardWrapper>
                  <CardHeaderRow>
                    <UserCheck size={20} />
                    Authentication
                  </CardHeaderRow>
                  <CardDivider />
                  <CardBody>
                    <GridContainer $columns="1fr" $gap={16}>
                      <InputGroup>
                        <InputLabel htmlFor="security-api-token">Current API Token</InputLabel>
                        <StyledInput
                          id="security-api-token"
                          value={apiToken}
                          onChange={(e) => setApiToken(e.target.value)}
                          type="password"
                          placeholder="Enter API token"
                        />
                      </InputGroup>
                      <div>
                        <OutlinedButton
                          onClick={() => {
                            const newToken = `mcp_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
                            setApiToken(newToken);
                          }}
                        >
                          Generate New Token
                        </OutlinedButton>
                      </div>
                    </GridContainer>
                  </CardBody>
                </CardWrapper>

                {/* Access Control */}
                <CardWrapper>
                  <CardHeaderRow>
                    <Shield size={20} />
                    Access Control
                  </CardHeaderRow>
                  <CardDivider />
                  <CardBody>
                    <BodyText>
                      Configure which users and roles can access the MCP servers.
                    </BodyText>

                    <GridContainer $columns="1fr 1fr" $gap={16}>
                      <ToggleSwitch checked={true} label="Admin Access" />
                      <ToggleSwitch checked={true} label="Trainer Access" />
                      <ToggleSwitch checked={true} label="Client Access" />
                      <ToggleSwitch checked={false} label="Guest Access" />
                    </GridContainer>
                  </CardBody>
                </CardWrapper>

                {/* Encryption */}
                <CardWrapper>
                  <CardHeaderRow>
                    <Key size={20} />
                    Data Encryption
                  </CardHeaderRow>
                  <CardDivider />
                  <CardBody>
                    <BodyText>
                      Configure encryption settings for data sent to and from MCP servers.
                    </BodyText>

                    <GridContainer $columns="1fr 1fr" $gap={16}>
                      <ToggleSwitch checked={true} label="SSL/TLS Encryption" />
                      <ToggleSwitch checked={true} label="Encrypt Request Data" />
                    </GridContainer>
                  </CardBody>
                </CardWrapper>

                {/* Save Button */}
                <FullWidthButton
                  onClick={() => {
                    setNotification({
                      open: true,
                      message: 'Security settings saved successfully!',
                      severity: 'success'
                    });
                  }}
                >
                  <Save size={16} />
                  Save Security Settings
                </FullWidthButton>
              </GridContainer>
            </GlassPanel>
          </Section>
        );

      case 3: // Gamification
        return (
          <Section $mt={16}>
            <McpIntegrationWrapper
              loading={loading}
              mcpStatus={mcpStatus}
              error={error}
              requireFullFunctionality={false}
              loadingMessage="Loading gamification data..."
              onRetry={() => refreshData(true)}
            >
              <GamificationDisplay
                variant="full"
                onDataLoaded={(data) => {
                  console.log('Gamification data loaded:', data);
                }}
              />
            </McpIntegrationWrapper>
          </Section>
        );

      default:
        return null;
    }
  };

  return (
    <PageContainer>
      <Section $mb={32}>
        <PageTitle>
          <Server size={28} />
          MCP Server Administration
        </PageTitle>
        <PageSubtitle>
          Manage and monitor Model Context Protocol (MCP) servers for
          AI-powered workout recommendations and gamification.
        </PageSubtitle>
      </Section>

      {/* Status indicators */}
      <FlexRow $gap={12} $wrap style={{ marginBottom: '24px' }}>
        <StatusChip $online={mcpStatus.workout}>
          <StatusLabel>
            Workout MCP: <strong>{mcpStatus.workout ? 'Online' : 'Offline'}</strong>
          </StatusLabel>
        </StatusChip>

        <StatusChip $online={mcpStatus.gamification}>
          <StatusLabel>
            Gamification MCP: <strong>{mcpStatus.gamification ? 'Online' : 'Offline'}</strong>
          </StatusLabel>
        </StatusChip>

        <OutlinedButton
          style={{ marginLeft: 'auto' }}
          onClick={() => refreshData(true)}
        >
          <RefreshCw size={16} />
          Refresh Status
        </OutlinedButton>
      </FlexRow>

      {/* Tabs Navigation */}
      <TabBar>
        <TabButton $active={activeTab === 0} onClick={() => setActiveTab(0)}>
          <Server size={16} />
          Status
        </TabButton>
        <TabButton $active={activeTab === 1} onClick={() => setActiveTab(1)}>
          <Settings size={16} />
          Settings
        </TabButton>
        <TabButton $active={activeTab === 2} onClick={() => setActiveTab(2)}>
          <Shield size={16} />
          Security
        </TabButton>
        <TabButton $active={activeTab === 3} onClick={() => setActiveTab(3)}>
          <Trophy size={16} />
          Gamification
        </TabButton>
      </TabBar>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Toast Notification */}
      <ToastOverlay $visible={notification.open} $severity={notification.severity}>
        <span>{notification.message}</span>
        <ToastCloseButton onClick={handleCloseNotification} aria-label="Close notification">
          &times;
        </ToastCloseButton>
      </ToastOverlay>
    </PageContainer>
  );
};

export default McpDashboard;
