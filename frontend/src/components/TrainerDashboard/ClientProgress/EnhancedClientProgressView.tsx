import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../../context/AuthContext';
import { useGlobalClient } from '../../../context/GlobalClientContext';
import {
  Activity,
  Target,
  ArrowLeftRight,
  Shield,
  BarChart3,
  TrendingUp
} from 'lucide-react';

// Import the original ClientProgressView
import ClientProgressView from './ClientProgressView';

// Import new analytics components and types
import {
  ComparisonAnalytics,
  InjuryRiskAssessment,
  GoalProgressTracker,
  type ClientData,
  type WorkoutHistoryEntry,
  type GoalUpdate
} from './Analytics';
import { logger } from '@/utils/logger';
import { parseClientProgressId } from './ClientProgressView.logic';
import {
  LoadingClientProgressState,
  MissingClientProgressState,
} from './EnhancedClientProgressViewStatePanels';

/* ------------------------------------------------------------------ */
/*  Styled Components – Crystalline Swan theme                             */
/* ------------------------------------------------------------------ */

const PageWrapper = styled.div`
  padding: 24px;
`;

const GlassPanel = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 16px;
`;

const HeaderLeft = styled.div``;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

const Heading4 = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 8px 0;
`;

const BodyText = styled.p`
  font-size: 1rem;
  color: #94a3b8;
  margin: 0;
`;

const SmallText = styled.span`
  font-size: 0.875rem;
  color: #94a3b8;
`;

const CaptionText = styled.span`
  font-size: 0.75rem;
  color: #94a3b8;
  display: block;
  margin-bottom: 8px;
`;

/* ---------- Toggle Switch ---------- */

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-height: 44px;
  user-select: none;
`;

const ToggleTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 48px;
  height: 26px;
  border-radius: 13px;
  background: ${({ $checked }) => ($checked ? '#0ea5e9' : 'rgba(148, 163, 184, 0.3)')};
  transition: background 0.2s ease;
  flex-shrink: 0;
`;

const ToggleThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $checked }) => ($checked ? '24px' : '3px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

/* ---------- Chip / Badge ---------- */

interface RiskChipProps {
  $level: ClientData['riskLevel'];
}

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  low:    { bg: 'rgba(34, 197, 94, 0.15)',  text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
  medium: { bg: 'rgba(234, 179, 8, 0.15)',  text: '#facc15', border: 'rgba(234, 179, 8, 0.3)' },
  high:   { bg: 'rgba(239, 68, 68, 0.15)',  text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  unknown: { bg: 'rgba(148, 163, 184, 0.12)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.28)' },
};

const RiskChip = styled.span<RiskChipProps>`
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  background: ${({ $level }) => riskColors[$level]?.bg ?? riskColors.medium.bg};
  color: ${({ $level }) => riskColors[$level]?.text ?? riskColors.medium.text};
  border: 1px solid ${({ $level }) => riskColors[$level]?.border ?? riskColors.medium.border};
`;

/* ---------- Alert Banner ---------- */

const AlertBanner = styled.div`
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.25);
  border-radius: 8px;
  padding: 14px 18px;
  color: #7dd3fc;
  font-size: 0.875rem;
  line-height: 1.5;
`;

/* ---------- Tabs ---------- */

const TabsContainer = styled.div`
  width: 100%;
  margin-bottom: 24px;
`;

const TabBar = styled.div`
  display: flex;
  overflow-x: auto;
  border-bottom: 1px solid rgba(14, 165, 233, 0.2);
  gap: 4px;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(14, 165, 233, 0.3);
    border-radius: 2px;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  min-height: 44px;
  min-width: 44px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#0ea5e9' : 'transparent')};
  background: ${({ $active }) => ($active ? 'rgba(14, 165, 233, 0.08)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#0ea5e9' : '#94a3b8')};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;

  &:hover {
    color: #0ea5e9;
    background: rgba(14, 165, 233, 0.05);
  }

  &:focus-visible {
    outline: 2px solid #0ea5e9;
    outline-offset: -2px;
  }
`;

const TabPanelWrapper = styled.div`
  padding: 24px 0;
`;

const SmallButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  padding: 8px 14px;
  border: 1px solid rgba(14, 165, 233, 0.25);
  border-radius: 8px;
  background: rgba(14, 165, 233, 0.08);
  color: #7dd3fc;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.15);
    border-color: rgba(14, 165, 233, 0.4);
  }

  &:focus-visible {
    outline: 2px solid #0ea5e9;
    outline-offset: 2px;
  }
`;

/* ---------- Quick-Action FAB ---------- */

const QuickActionBar = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 16px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const QuickActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

/* ------------------------------------------------------------------ */
/*  Sub-Components                                                     */
/* ------------------------------------------------------------------ */

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`enhanced-progress-tabpanel-${index}`}
      aria-labelledby={`enhanced-progress-tab-${index}`}
      {...other}
    >
      {value === index && (
        <TabPanelWrapper>
          {children}
        </TabPanelWrapper>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `enhanced-progress-tab-${index}`,
    'aria-controls': `enhanced-progress-tabpanel-${index}`,
  };
}

const toBoundedMetric = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const toNonNegativeNumber = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

const toStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
};

const toProgressMetrics = (metrics: any): ClientData['progressMetrics'] => ({
  strength: toBoundedMetric(metrics?.strength),
  cardio: toBoundedMetric(metrics?.cardio),
  flexibility: toBoundedMetric(metrics?.flexibility),
  balance: toBoundedMetric(metrics?.balance),
  stability: toBoundedMetric(metrics?.stability),
});

const toRiskLevel = (value: unknown): ClientData['riskLevel'] => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }
  return 'unknown';
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

/**
 * EnhancedClientProgressView Component
 *
 * Advanced trainer progress dashboard with comprehensive analytics including:
 * - Original fitness progress, gamification, and recommendations
 * - Advanced comparison analytics vs other clients/averages/goals
 * - NASM-based injury risk assessment and corrective protocols
 * - SMART goal tracking with milestone management
 * - Predictive analytics and AI-powered insights
 *
 * This component extends the existing ClientProgressView with professional-grade
 * analytics tools for comprehensive client management and progression tracking.
 */
const EnhancedClientProgressView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(0);
  const [advancedMode, setAdvancedMode] = useState(false);
  const { authAxios } = useAuth();
  const { activeClient } = useGlobalClient();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [isLoadingClient, setIsLoadingClient] = useState(true);

  const rawClientId = searchParams.get('clientId') ?? activeClient?.id?.toString() ?? '';
  const parsedClientId = parseClientProgressId(rawClientId);
  const clientId = parsedClientId ? String(parsedClientId) : '';

  // Fetch real client data from API
  const loadClientData = useCallback(async () => {
    if (!authAxios || !clientId) {
      setClientData(null);
      setWorkoutHistory([]);
      setIsLoadingClient(false);
      return;
    }
    setIsLoadingClient(true);
    try {
      const [clientRes, progressRes] = await Promise.allSettled([
        authAxios.get(`/api/workout-forms/client/${clientId}/info`),
        authAxios.get(`/api/workout-forms/client/${clientId}/progress`),
      ]);

      const clientInfo = clientRes.status === 'fulfilled' ? clientRes.value.data?.client : null;
      const progressInfo = progressRes.status === 'fulfilled' ? progressRes.value.data : null;
      const metrics = progressInfo?.metrics;

      setClientData({
        id: clientId,
        firstName: clientInfo?.firstName || 'Client',
        lastName: clientInfo?.lastName || `#${clientId}`,
        username: clientInfo?.email?.split('@')[0] || `client${clientId}`,
        startDate: clientInfo?.createdAt || '',
        totalSessions: progressInfo?.totalSessions || 0,
        completedSessions: progressInfo?.completedSessions || 0,
        riskLevel: toRiskLevel(progressInfo?.riskLevel ?? progressInfo?.risk?.level ?? clientInfo?.riskLevel),
        primaryGoals: toStringList(clientInfo?.goals),
        lastAssessment: progressInfo?.lastAssessmentDate || '',
        progressMetrics: toProgressMetrics(metrics)
      });

      // Load workout history
      if (progressInfo?.recentWorkouts) {
        setWorkoutHistory(progressInfo.recentWorkouts.map((w: any) => ({
          date: w.date || w.createdAt,
          type: w.workoutType || 'Workout',
          duration: toNonNegativeNumber(w.duration),
          intensity: toNonNegativeNumber(w.intensity)
        })));
      }
    } catch (error) {
      logger.error('Failed to load client progress data:', error);
      // Fallback with client ID visible (no fake names)
      setClientData({
        id: clientId,
        firstName: 'Client',
        lastName: `#${clientId}`,
        username: `client${clientId}`,
        startDate: '',
        totalSessions: 0,
        completedSessions: 0,
        riskLevel: 'unknown',
        primaryGoals: [],
        lastAssessment: '',
        progressMetrics: toProgressMetrics(null)
      });
    } finally {
      setIsLoadingClient(false);
    }
  }, [authAxios, clientId]);

  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // Use real data, fallback to safe defaults
  const enhancedClientData = clientData || {
    id: clientId, firstName: 'Client', lastName: clientId ? `#${clientId}` : 'not selected', username: '',
    startDate: '', totalSessions: 0, completedSessions: 0, riskLevel: 'unknown' as const,
    primaryGoals: [], lastAssessment: '', progressMetrics: { strength: 0, cardio: 0, flexibility: 0, balance: 0, stability: 0 }
  };

  const handleGoalUpdate = (goalId: string, update: GoalUpdate): void => {
    // Handle goal updates - in real implementation, this would call API
    logger.log('Goal update:', goalId, update);
  };

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (!advancedMode && tabValue !== 0) {
      setTabValue(0);
    }
  }, [advancedMode, tabValue]);

  // Build the list of tabs dynamically based on advancedMode
  const tabs = useMemo(() => {
    const base = [
      { label: 'Overview & Fitness', icon: <Activity size={18} />, ...a11yProps(0) },
    ];

    if (advancedMode) {
      base.push(
        { label: 'Comparison Analytics', icon: <ArrowLeftRight size={18} />, ...a11yProps(1) },
        { label: 'Injury Risk Assessment', icon: <Shield size={18} />, ...a11yProps(2) },
        { label: 'Goal Tracking', icon: <Target size={18} />, ...a11yProps(3) },
      );
    }

    return base;
  }, [advancedMode]);

  const renderHeader = () => (
    <GlassPanel>
      <HeaderRow>
        <HeaderLeft>
          <Heading4>
            Enhanced Client Progress Dashboard
          </Heading4>
          <BodyText>
            Advanced analytics and insights for {enhancedClientData.firstName} {enhancedClientData.lastName}
          </BodyText>
        </HeaderLeft>

        <HeaderRight>
          <ToggleLabel>
            <HiddenCheckbox
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
            />
            <ToggleTrack $checked={advancedMode}>
              <ToggleThumb $checked={advancedMode} />
            </ToggleTrack>
            <SmallText>Advanced Analytics Mode</SmallText>
          </ToggleLabel>

          <RiskChip $level={enhancedClientData.riskLevel}>
            Risk Level: {enhancedClientData.riskLevel.toUpperCase()}
          </RiskChip>
        </HeaderRight>
      </HeaderRow>

      {advancedMode && (
        <AlertBanner>
          Advanced Analytics Mode provides comprehensive risk assessment, comparative analysis, and predictive insights
          for professional-grade client management.
        </AlertBanner>
      )}
    </GlassPanel>
  );

  const renderTabs = () => (
    <TabsContainer>
      <TabBar role="tablist" aria-label="enhanced client progress tabs">
        {tabs.map((tab, idx) => (
          <TabButton
            key={tab.id}
            $active={tabValue === idx}
            role="tab"
            aria-selected={tabValue === idx}
            aria-controls={tab['aria-controls']}
            id={tab.id}
            onClick={() => handleTabChange(idx)}
          >
            {tab.icon}
            {tab.label}
          </TabButton>
        ))}
      </TabBar>

      {/* Original Overview Tab - Embedded ClientProgressView */}
      <TabPanel value={tabValue} index={0}>
        <ClientProgressView />
      </TabPanel>

      {/* Advanced Analytics Tabs (only visible in advanced mode) */}
      {advancedMode && (
        <>
          <TabPanel value={tabValue} index={1}>
            <ComparisonAnalytics
              clientId={clientId}
              clientData={enhancedClientData}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <InjuryRiskAssessment
              clientId={clientId}
              clientData={enhancedClientData}
              workoutHistory={workoutHistory}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <GoalProgressTracker
              clientId={clientId}
              clientData={enhancedClientData}
              onGoalUpdate={handleGoalUpdate}
            />
          </TabPanel>
        </>
      )}

    </TabsContainer>
  );

  if (!clientId) {
    return (
      <MissingClientProgressState
        onBackToClients={() => navigate('/dashboard/trainer/clients')}
      />
    );
  }

  if (isLoadingClient) {
    return <LoadingClientProgressState />;
  }

  return (
    <PageWrapper>
      {renderHeader()}
      {renderTabs()}

      {/* Quick Action Bar for Advanced Mode */}
      {advancedMode && (
        <QuickActionBar>
          <CaptionText>
            Quick Actions
          </CaptionText>
          <QuickActionButtons>
            <SmallButton onClick={() => setTabValue(1)}>
              <BarChart3 size={14} />
              Compare
            </SmallButton>
            <SmallButton onClick={() => setTabValue(2)}>
              <Shield size={14} />
              Risk
            </SmallButton>
            <SmallButton onClick={() => setTabValue(3)}>
              <Target size={14} />
              Goals
            </SmallButton>
          </QuickActionButtons>
        </QuickActionBar>
      )}
    </PageWrapper>
  );
};

export default EnhancedClientProgressView;
