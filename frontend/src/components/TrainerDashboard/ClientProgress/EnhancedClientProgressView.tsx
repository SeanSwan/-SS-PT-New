import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  Activity,
  Trophy,
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

/* ------------------------------------------------------------------ */
/*  Styled Components – Galaxy-Swan theme                             */
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

const SubHeading = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 8px 0;
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
  $level: 'low' | 'medium' | 'high';
}

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  low:    { bg: 'rgba(34, 197, 94, 0.15)',  text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' },
  medium: { bg: 'rgba(234, 179, 8, 0.15)',  text: '#facc15', border: 'rgba(234, 179, 8, 0.3)' },
  high:   { bg: 'rgba(239, 68, 68, 0.15)',  text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
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

/* ---------- Buttons ---------- */

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  min-width: 44px;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: #0ea5e9;
  color: #0f172a;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;

  &:hover {
    background: #38bdf8;
  }

  &:active {
    transform: scale(0.97);
  }

  &:focus-visible {
    outline: 2px solid #0ea5e9;
    outline-offset: 2px;
  }
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

/* ---------- Gamification Placeholder ---------- */

const CenteredContent = styled.div`
  padding: 24px;
  text-align: center;
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
  const [searchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(0);
  const [advancedMode, setAdvancedMode] = useState(false);

  const clientId = searchParams.get('clientId') || '1';

  // Mock enhanced client data - in real implementation, this would come from API
  const enhancedClientData = useMemo((): ClientData => ({
    id: clientId,
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    startDate: '2024-01-15',
    totalSessions: 45,
    completedSessions: 38,
    riskLevel: 'medium' as const,
    primaryGoals: ['Weight Loss', 'Strength Building'],
    lastAssessment: new Date().toISOString(),
    progressMetrics: {
      strength: 75,
      cardio: 68,
      flexibility: 60,
      balance: 65,
      stability: 70
    }
  }), [clientId]);

  const mockWorkoutHistory = useMemo((): WorkoutHistoryEntry[] => [
    { date: '2024-07-15', type: 'Strength', duration: 60, intensity: 7 },
    { date: '2024-07-13', type: 'Cardio', duration: 45, intensity: 6 },
    { date: '2024-07-11', type: 'Flexibility', duration: 30, intensity: 5 },
    { date: '2024-07-09', type: 'Strength', duration: 65, intensity: 8 },
    { date: '2024-07-07', type: 'HIIT', duration: 35, intensity: 9 }
  ], []);

  const handleGoalUpdate = (goalId: string, update: GoalUpdate): void => {
    // Handle goal updates - in real implementation, this would call API
    console.log('Goal update:', goalId, update);
  };

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

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

    base.push({
      label: 'Gamification',
      icon: <Trophy size={18} />,
      ...a11yProps(advancedMode ? 4 : 1),
    });

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

          <RiskChip $level={enhancedClientData.riskLevel as 'low' | 'medium' | 'high'}>
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
              workoutHistory={mockWorkoutHistory}
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

      {/* Gamification Tab */}
      <TabPanel value={tabValue} index={advancedMode ? 4 : 1}>
        <CenteredContent>
          <SubHeading>
            Gamification &amp; Social Progress
          </SubHeading>
          <BodyText>
            This tab will show the gamification content from the original ClientProgressView.
            Integration with existing gamification functionality will be completed in the next phase.
          </BodyText>
          <PrimaryButton
            style={{ marginTop: 16 }}
            onClick={() => setTabValue(0)}
          >
            View in Overview Tab
          </PrimaryButton>
        </CenteredContent>
      </TabPanel>
    </TabsContainer>
  );

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
