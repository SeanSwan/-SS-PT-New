/**
 * AI-Powered Features Dashboard
 *
 * Central hub for all AI features including:
 * - Workout Generation
 * - Progress Analysis
 * - Nutrition Planning
 * - Exercise Alternatives
 * - Real-time MCP Status
 */

import React, { useState, useEffect } from 'react';
import {
  Dumbbell, BarChart3, UtensilsCrossed, ArrowLeftRight, Sparkles,
  TrendingUp, Brain, Gauge, CheckCircle2, XCircle, RefreshCw,
  Settings, Bell, X, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import WorkoutGenerator from '../WorkoutGenerator/WorkoutGenerator';
import ProgressAnalysis from '../ProgressAnalysis/ProgressAnalysis';
import NutritionPlanning from '../NutritionPlanning/NutritionPlanning';
import ExerciseAlternatives from '../ExerciseAlternatives/ExerciseAlternatives';
import AIDashboard from '../AIDashboard/AIDashboard';

// ─── Keyframes ──────────────────────────────────────────────────────────────────

const gradientShift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ─── Styled Components ──────────────────────────────────────────────────────────

const DashboardContainer = styled.div`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 16px;
  padding: 2rem;
  min-height: 600px;
  position: relative;
  overflow: hidden;

  /* Glass morphism effect */
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  /* Animated gradient border */
  &:before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 2px;
    background: linear-gradient(45deg, #00ffff, #7851a9, #ff6b9d, #00ffff);
    background-size: 400% 400%;
    animation: ${gradientShift} 3s ease infinite;
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.6;
    z-index: -1;
  }
`;

const DashboardTitle = styled.h4`
  font-size: 2rem;
  font-weight: 300;
  margin: 0 0 1.5rem 0;
  background: linear-gradient(to right, #00ffff, #7851a9, #ff6b9d);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FeatureCard = styled.div`
  background: rgba(30, 30, 60, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
    border-color: rgba(0, 255, 255, 0.4);
  }
`;

const FeatureIconBox = styled.div<{ $color?: string; $colorSecondary?: string }>`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${props => props.$color || '#00ffff'}, ${props => props.$colorSecondary || '#7851a9'});
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;

  svg {
    width: 2rem;
    height: 2rem;
    color: white;
  }
`;

const StatusChipStyled = styled.span<{ $status?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8125rem;
  font-weight: 500;
  min-height: 32px;
  background: ${props => props.$status === 'online' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'};
  color: ${props => props.$status === 'online' ? '#4caf50' : '#f44336'};
  border: 1px solid ${props => props.$status === 'online' ? '#4caf50' : '#f44336'};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ActionButton = styled.button<{ $fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-transform: none;
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(90deg, #7851a9, #00ffff);
    transform: scale(1.02);
  }

  &:disabled {
    background: rgba(128, 128, 128, 0.3);
    color: rgba(255, 255, 255, 0.5);
    cursor: not-allowed;
    transform: none;
  }
`;

const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  color: #00ffff;
  border: 1px solid #00ffff;
  border-radius: 8px;
  padding: 10px 20px;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const StatusPanel = styled.div`
  background: rgba(20, 20, 40, 0.9);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const StatsCard = styled.div`
  background: rgba(30, 30, 60, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  color: white;
  text-align: center;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: center;

  @media (min-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(6, 1fr);
  }
`;

const CardBody = styled.div`
  padding: 1rem;
  flex-grow: 1;
`;

const CardFooter = styled.div`
  padding: 0 1rem 1rem 1rem;
`;

const CapabilityChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 1rem;
`;

const WarningAlert = styled.div`
  margin-top: 1rem;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(255, 152, 0, 0.1);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-left: 4px solid #ff9800;
  font-size: 0.875rem;
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $value: number; $barColor: string }>`
  height: 100%;
  width: ${props => props.$value}%;
  background-color: ${props => props.$barColor};
  border-radius: 4px;
  transition: width 0.4s ease;
`;

const Spinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 255, 255, 0.2);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  position: relative;
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  margin: 1rem;
  background: rgba(20, 20, 40, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
`;

const CloseIconButton = styled.button`
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const RefreshIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const TitleActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
`;

const ToggleTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
  border-radius: 12px;
  background: ${props => props.$checked ? '#00ffff' : 'rgba(255, 255, 255, 0.3)'};
  transition: background 0.2s ease;
`;

const ToggleThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${props => props.$checked ? '20px' : '2px'};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: left 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
`;

const ToggleLabelText = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
`;

const StatusRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const TextMuted = styled.span`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
`;

const TextMutedSmall = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8125rem;
  display: block;
  margin-bottom: 8px;
`;

const HealthTextRight = styled.div`
  text-align: right;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const SectionTitle = styled.h6`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: #00ffff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatsValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  color: #00ffff;
`;

const StatsLabel = styled.div`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: capitalize;
`;

const FeatureTitle = styled.h6`
  margin: 0 0 8px 0;
  font-size: 1.125rem;
  font-weight: 500;
  color: #00ffff;
`;

const FeatureDescription = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

const UsageSection = styled.div`
  margin-top: 2rem;
`;

const DefaultFeatureView = styled.div`
  padding: 1.5rem;
  text-align: center;
`;

const DefaultFeatureTitle = styled.h6`
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: #00ffff;
`;

const DefaultFeatureText = styled.p`
  margin: 0 0 1.5rem 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
`;

// ─── AI Feature Definitions ─────────────────────────────────────────────────────

const AI_FEATURES = [
  {
    id: 'workout-generator',
    title: 'AI Workout Generator',
    description: 'Generate personalized workouts using advanced AI based on client data, goals, and equipment.',
    icon: Dumbbell,
    color: '#00ffff',
    colorSecondary: '#46cdcf',
    capabilities: ['Personalized Plans', 'Equipment Adaptation', 'Progress Integration'],
    component: 'WorkoutGenerator'
  },
  {
    id: 'progress-analysis',
    title: 'Progress Analytics',
    description: 'AI-powered analysis of client progress with insights and recommendations.',
    icon: BarChart3,
    color: '#7851a9',
    colorSecondary: '#9c27b0',
    capabilities: ['Pattern Recognition', 'Predictive Insights', 'Goal Tracking'],
    component: 'ProgressAnalysis'
  },
  {
    id: 'nutrition-planning',
    title: 'Nutrition AI',
    description: 'Smart nutrition plans tailored to workout programs and dietary preferences.',
    icon: UtensilsCrossed,
    color: '#ff6b9d',
    colorSecondary: '#e91e63',
    capabilities: ['Macro Optimization', 'Meal Planning', 'Dietary Restrictions'],
    component: 'NutritionPlanning'
  },
  {
    id: 'exercise-alternatives',
    title: 'Exercise Alternatives',
    description: 'Find optimal exercise substitutions based on equipment and limitations.',
    icon: ArrowLeftRight,
    color: '#4caf50',
    colorSecondary: '#66bb6a',
    capabilities: ['Equipment Substitution', 'Injury Modifications', 'Skill Level Adaptations'],
    component: 'ExerciseAlternatives'
  }
];

// Mock stats - replace with real API calls
const MOCK_STATS = {
  workoutsGenerated: 156,
  clientAnalyses: 89,
  nutritionPlans: 67,
  alternativesProvided: 234,
  averageResponseTime: '2.3s',
  successRate: '98.5%'
};

const AIFeaturesDashboard = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // State management
  const [mcpStatus, setMcpStatus] = useState({
    workout: { status: 'checking', details: {} },
    gamification: { status: 'checking', details: {} }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState(MOCK_STATS);

  // Check MCP status on mount and setup auto-refresh
  useEffect(() => {
    checkMcpStatus();

    if (autoRefresh) {
      const interval = setInterval(checkMcpStatus, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  /**
   * Check MCP server status
   */
  const checkMcpStatus = async () => {
    // Short-circuit when MCP is disabled — no network calls
    if (import.meta.env.VITE_ENABLE_MCP_SERVICES !== 'true') {
      setMcpStatus({
        workout: { status: 'disabled', details: { error: 'MCP disabled' } },
        gamification: { status: 'disabled', details: { error: 'MCP disabled' } }
      });
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/mcp/status`);
      const data = await response.json();

      setMcpStatus(data.servers || {
        workout: { status: 'offline', details: { error: 'No response' } },
        gamification: { status: 'offline', details: { error: 'No response' } }
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking MCP status:', error);
      setMcpStatus({
        workout: { status: 'offline', details: { error: error.message } },
        gamification: { status: 'offline', details: { error: error.message } }
      });
      setIsLoading(false);

      if (autoRefresh) {
        enqueueSnackbar('MCP connection check failed', { variant: 'warning' });
      }
    }
  };

  /**
   * Handle feature selection
   */
  const handleFeatureClick = (feature) => {
    if (mcpStatus.workout.status === 'offline' && mcpStatus.gamification.status === 'offline') {
      enqueueSnackbar('AI services are currently offline', { variant: 'error' });
      return;
    }

    setSelectedFeature(feature);
  };

  /**
   * Close feature dialog
   */
  const handleCloseFeature = () => {
    setSelectedFeature(null);
  };

  /**
   * Render feature component based on selection
   */
  const renderFeatureComponent = () => {
    if (!selectedFeature) return null;

    switch (selectedFeature.component) {
      case 'WorkoutGenerator':
        return <WorkoutGenerator onClose={handleCloseFeature} />;
      case 'ProgressAnalysis':
        return <ProgressAnalysis onClose={handleCloseFeature} />;
      case 'NutritionPlanning':
        return <NutritionPlanning onClose={handleCloseFeature} />;
      case 'ExerciseAlternatives':
        return <ExerciseAlternatives onClose={handleCloseFeature} />;
      case 'AIDashboard':
        return <AIDashboard />;
      default:
        return (
          <DefaultFeatureView>
            <DefaultFeatureTitle>
              {selectedFeature.title}
            </DefaultFeatureTitle>
            <DefaultFeatureText>
              Coming Soon! This feature is under development.
            </DefaultFeatureText>
            <ActionButton onClick={handleCloseFeature}>
              Close
            </ActionButton>
          </DefaultFeatureView>
        );
    }
  };

  // Calculate overall system health
  const systemHealth = {
    status: mcpStatus.workout.status === 'online' || mcpStatus.gamification.status === 'online' ? 'healthy' : 'degraded',
    percentage: mcpStatus.workout.status === 'online' && mcpStatus.gamification.status === 'online' ? 100 :
                mcpStatus.workout.status === 'online' || mcpStatus.gamification.status === 'online' ? 50 : 0
  };

  const healthBarColor = systemHealth.percentage >= 75 ? '#4caf50' :
                          systemHealth.percentage >= 50 ? '#ff9800' : '#f44336';

  return (
    <DashboardContainer>
      <DashboardTitle>
        <Sparkles size={32} />
        AI Features Dashboard
        <TitleActions>
          <ToggleLabel>
            <HiddenCheckbox
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <ToggleTrack $checked={autoRefresh}>
              <ToggleThumb $checked={autoRefresh} />
            </ToggleTrack>
            <ToggleLabelText>Auto-refresh</ToggleLabelText>
          </ToggleLabel>
          <RefreshIconButton
            onClick={checkMcpStatus}
            disabled={isLoading}
            title="Refresh Status"
          >
            <RefreshCw size={20} color={isLoading ? 'rgba(255, 255, 255, 0.3)' : '#00ffff'} />
          </RefreshIconButton>
        </TitleActions>
      </DashboardTitle>

      {/* System Status Panel */}
      <StatusPanel>
        <SectionTitle>
          <Gauge size={20} /> System Status
          {isLoading && <Spinner />}
        </SectionTitle>

        <StatusGrid>
          <StatusRow>
            <TextMuted>Workout MCP:</TextMuted>
            <StatusChipStyled $status={mcpStatus.workout.status}>
              {mcpStatus.workout.status === 'online' ? <CheckCircle2 /> : <XCircle />}
              {mcpStatus.workout.status === 'online' ? 'Online' : 'Offline'}
            </StatusChipStyled>

            <TextMuted>Gamification MCP:</TextMuted>
            <StatusChipStyled $status={mcpStatus.gamification.status}>
              {mcpStatus.gamification.status === 'online' ? <CheckCircle2 /> : <XCircle />}
              {mcpStatus.gamification.status === 'online' ? 'Online' : 'Offline'}
            </StatusChipStyled>
          </StatusRow>

          <HealthTextRight>
            <TextMutedSmall>
              System Health: {systemHealth.percentage}%
            </TextMutedSmall>
            <ProgressTrack>
              <ProgressFill $value={systemHealth.percentage} $barColor={healthBarColor} />
            </ProgressTrack>
          </HealthTextRight>
        </StatusGrid>

        {systemHealth.status === 'degraded' && (
          <WarningAlert>
            Some AI services are currently unavailable. Features may be limited.
          </WarningAlert>
        )}
      </StatusPanel>

      {/* Feature Cards */}
      <FeatureGrid>
        {AI_FEATURES.map((feature) => (
          <FeatureCard
            as={motion.div}
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: AI_FEATURES.indexOf(feature) * 0.1 }}
          >
            <CardBody>
              <FeatureIconBox $color={feature.color} $colorSecondary={feature.colorSecondary}>
                <feature.icon />
              </FeatureIconBox>

              <FeatureTitle>{feature.title}</FeatureTitle>

              <FeatureDescription>{feature.description}</FeatureDescription>

              <ChipRow>
                {feature.capabilities.map((capability) => (
                  <CapabilityChip key={capability}>
                    {capability}
                  </CapabilityChip>
                ))}
              </ChipRow>
            </CardBody>

            <CardFooter>
              <ActionButton
                $fullWidth
                onClick={() => handleFeatureClick(feature)}
                disabled={mcpStatus.workout.status === 'offline' && mcpStatus.gamification.status === 'offline'}
              >
                Launch {feature.title}
              </ActionButton>
            </CardFooter>
          </FeatureCard>
        ))}
      </FeatureGrid>

      {/* Usage Statistics */}
      <UsageSection>
        <SectionHeader>
          <SectionTitle>
            <TrendingUp size={20} /> Usage Statistics
          </SectionTitle>
          <OutlineButton
            onClick={() => setSelectedFeature({ title: 'AI Monitoring Dashboard', component: 'AIDashboard' })}
          >
            <BarChart3 size={18} />
            View Detailed Analytics
          </OutlineButton>
        </SectionHeader>

        <StatsGrid>
          {Object.entries(stats).map(([key, value]) => (
            <StatsCard key={key}>
              <StatsValue>{value}</StatsValue>
              <StatsLabel>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </StatsLabel>
            </StatsCard>
          ))}
        </StatsGrid>
      </UsageSection>

      {/* Feature Modal */}
      {!!selectedFeature && (
        <ModalOverlay onClick={(e) => { if (e.target === e.currentTarget) handleCloseFeature(); }}>
          <ModalContent>
            <CloseIconButton onClick={handleCloseFeature} title="Close">
              <X size={24} />
            </CloseIconButton>
            {renderFeatureComponent()}
          </ModalContent>
        </ModalOverlay>
      )}
    </DashboardContainer>
  );
};

export default AIFeaturesDashboard;
