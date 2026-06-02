/**
 * COMPONENT: EnhancedClientProgressViewShell
 * PURPOSE: Presentational header, tabs, and quick actions for trainer progress.
 * OWNER: Trainer Dashboard / Client Progress
 * DATA FLOW: Receives loaded client progress data from EnhancedClientProgressView.
 */
import React, { useMemo } from 'react';
import { Activity, ArrowLeftRight, BarChart3, Shield, Target } from 'lucide-react';
import ClientProgressView from './ClientProgressView';
import {
  ComparisonAnalytics,
  GoalProgressTracker,
  InjuryRiskAssessment,
  type ClientData,
  type GoalUpdate,
  type WorkoutHistoryEntry,
} from './Analytics';
import {
  AlertBanner,
  BodyText,
  CaptionText,
  GlassPanel,
  HeaderLeft,
  HeaderRight,
  HeaderRow,
  Heading4,
  HiddenCheckbox,
  QuickActionBar,
  QuickActionButtons,
  RiskChip,
  SmallButton,
  SmallText,
  TabBar,
  TabButton,
  TabPanelWrapper,
  TabsContainer,
  ToggleLabel,
  ToggleThumb,
  ToggleTrack,
} from './EnhancedClientProgressView.styles';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface EnhancedClientProgressViewShellProps {
  advancedMode: boolean;
  clientData: ClientData;
  clientId: string;
  onAdvancedModeChange: (nextValue: boolean) => void;
  onGoalUpdate: (goalId: string, update: GoalUpdate) => void;
  onTabChange: (newValue: number) => void;
  tabValue: number;
  workoutHistory: WorkoutHistoryEntry[];
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

const EnhancedClientProgressViewShell: React.FC<EnhancedClientProgressViewShellProps> = ({
  advancedMode,
  clientData,
  clientId,
  onAdvancedModeChange,
  onGoalUpdate,
  onTabChange,
  tabValue,
  workoutHistory,
}) => {
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

  return (
    <>
      <GlassPanel>
        <HeaderRow>
          <HeaderLeft>
            <Heading4>
              Enhanced Client Progress Dashboard
            </Heading4>
            <BodyText>
              Advanced analytics and insights for {clientData.firstName} {clientData.lastName}
            </BodyText>
          </HeaderLeft>

          <HeaderRight>
            <ToggleLabel>
              <HiddenCheckbox
                checked={advancedMode}
                onChange={(event) => onAdvancedModeChange(event.target.checked)}
              />
              <ToggleTrack $checked={advancedMode}>
                <ToggleThumb $checked={advancedMode} />
              </ToggleTrack>
              <SmallText>Advanced Analytics Mode</SmallText>
            </ToggleLabel>

            <RiskChip $level={clientData.riskLevel}>
              Risk Level: {clientData.riskLevel.toUpperCase()}
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

      <TabsContainer>
        <TabBar role="tablist" aria-label="enhanced client progress tabs">
          {tabs.map((tab, index) => (
            <TabButton
              key={tab.id}
              $active={tabValue === index}
              role="tab"
              aria-selected={tabValue === index}
              aria-controls={tab['aria-controls']}
              id={tab.id}
              onClick={() => onTabChange(index)}
            >
              {tab.icon}
              {tab.label}
            </TabButton>
          ))}
        </TabBar>

        <TabPanel value={tabValue} index={0}>
          <ClientProgressView />
        </TabPanel>

        {advancedMode && (
          <>
            <TabPanel value={tabValue} index={1}>
              <ComparisonAnalytics clientId={clientId} clientData={clientData} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <InjuryRiskAssessment
                clientId={clientId}
                clientData={clientData}
                workoutHistory={workoutHistory}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <GoalProgressTracker
                clientId={clientId}
                clientData={clientData}
                onGoalUpdate={onGoalUpdate}
              />
            </TabPanel>
          </>
        )}
      </TabsContainer>

      {advancedMode && (
        <QuickActionBar>
          <CaptionText>Quick Actions</CaptionText>
          <QuickActionButtons>
            <SmallButton onClick={() => onTabChange(1)}>
              <BarChart3 size={14} />
              Compare
            </SmallButton>
            <SmallButton onClick={() => onTabChange(2)}>
              <Shield size={14} />
              Risk
            </SmallButton>
            <SmallButton onClick={() => onTabChange(3)}>
              <Target size={14} />
              Goals
            </SmallButton>
          </QuickActionButtons>
        </QuickActionBar>
      )}
    </>
  );
};

export default EnhancedClientProgressViewShell;
