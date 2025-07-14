/**
 * NASM Progress Charts Component
 * =============================
 * 
 * Revolutionary Progress Visualization for Client Dashboard
 * Comprehensive NASM-compliant progress tracking with multiple chart types
 * and real-time data visualization from MCP-processed workout forms.
 * 
 * Core Features:
 * - NASM Category Development Radar Chart
 * - Volume Progression Area Charts
 * - Form Quality Improvement Line Charts
 * - Workout Intensity Timeline
 * - Interactive time range filtering
 * - Mobile-responsive chart containers
 * - Real-time data updates from workout forms
 * - WCAG AA accessibility compliance
 * 
 * Part of the NASM Workout Tracking System - Phase 2.3: Core Components
 * Designed for SwanStudios Platform - Production Ready
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { 
  LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar,
  PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import { 
  TrendingUp, BarChart3, Activity, Target, Calendar, 
  Filter, Download, RefreshCw, Eye, EyeOff, Maximize,
  Award, Zap, Clock, Weight, Star, ChevronDown, Info,
  Play, Pause, SkipBack, SkipForward, Settings
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { 
  dailyWorkoutFormService, 
  ProgressData 
} from '../../services/nasmApiService';

// ==================== INTERFACES ====================

interface NASMProgressChartsProps {
  clientId: number;
  timeRange?: string;
  autoRefresh?: boolean;
}

interface ChartConfig {
  id: string;
  title: string;
  type: 'radar' | 'area' | 'line' | 'bar' | 'pie' | 'scatter';
  visible: boolean;
  height: number;
  gridSpan: number;
}

interface TimeRangeOption {
  value: string;
  label: string;
  duration: number; // in days
}

// ==================== STYLED COMPONENTS ====================

const stellarGlow = keyframes`
  0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4); }
  100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
`;

const dataFlow = keyframes`
  0% { transform: translateX(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
`;

const progressTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#0f172a',
    surface: '#1e293b',
    cardBg: '#334155',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    border: '#475569',
    chartBg: '#1e293b',
    gridLines: '#374151',
    // NASM Category Colors
    coreStability: '#3b82f6',
    balance: '#10b981',
    strength: '#f59e0b',
    power: '#ef4444',
    agility: '#8b5cf6',
    endurance: '#06b6d4'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem'
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
};

const ProgressChartsContainer = styled(motion.div)`
  min-height: 100vh;
  background: linear-gradient(135deg, ${progressTheme.colors.background} 0%, #1a202c 100%);
  padding: ${progressTheme.spacing.lg};
  color: ${progressTheme.colors.text};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    padding: ${progressTheme.spacing.md};
  }
`;

const ChartsHeader = styled.div`
  background: ${progressTheme.colors.surface};
  border-radius: ${progressTheme.borderRadius.lg};
  padding: ${progressTheme.spacing.xl};
  margin-bottom: ${progressTheme.spacing.xl};
  border: 1px solid ${progressTheme.colors.border};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${progressTheme.colors.primary}, ${progressTheme.colors.accent});
  }
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  gap: ${progressTheme.spacing.lg};
  margin-bottom: ${progressTheme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${progressTheme.colors.text};
  display: flex;
  align-items: center;
  gap: ${progressTheme.spacing.sm};
`;

const TimeRangeSelector = styled.div`
  display: flex;
  gap: ${progressTheme.spacing.xs};
  background: ${progressTheme.colors.cardBg};
  border-radius: ${progressTheme.borderRadius.md};
  padding: ${progressTheme.spacing.xs};
  border: 1px solid ${progressTheme.colors.border};

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const TimeButton = styled(motion.button)<{ active: boolean }>`
  padding: ${progressTheme.spacing.sm} ${progressTheme.spacing.md};
  border: none;
  border-radius: ${progressTheme.borderRadius.sm};
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  background: ${props => props.active ? progressTheme.colors.primary : 'transparent'};
  color: ${props => props.active ? progressTheme.colors.text : progressTheme.colors.textSecondary};

  &:hover {
    background: ${props => props.active ? progressTheme.colors.primary : `${progressTheme.colors.primary}20`};
    color: ${progressTheme.colors.text};
  }
`;

const ControlsSection = styled.div`
  display: flex;
  gap: ${progressTheme.spacing.md};
  align-items: center;
  flex-wrap: wrap;
`;

const Button = styled(motion.button)<{ variant: 'primary' | 'secondary' | 'ghost' }>`
  padding: ${progressTheme.spacing.sm} ${progressTheme.spacing.md};
  border-radius: ${progressTheme.borderRadius.md};
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: ${progressTheme.spacing.xs};
  transition: all 0.3s ease;

  background: ${props => 
    props.variant === 'primary' ? progressTheme.colors.primary :
    props.variant === 'secondary' ? progressTheme.colors.cardBg :
    'transparent'
  };
  
  color: ${progressTheme.colors.text};
  border: ${props => props.variant === 'ghost' ? `1px solid ${progressTheme.colors.border}` : 'none'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => 
      props.variant === 'primary' ? `${progressTheme.colors.primary}40` :
      `${progressTheme.colors.cardBg}40`
    };
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: ${progressTheme.spacing.lg};
  margin-bottom: ${progressTheme.spacing.xl};

  @media (max-width: 1024px) {
    grid-template-columns: repeat(6, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(motion.div)<{ gridSpan: number; isVisible: boolean }>`
  grid-column: span ${props => props.gridSpan};
  background: ${progressTheme.colors.surface};
  border-radius: ${progressTheme.borderRadius.lg};
  border: 1px solid ${progressTheme.colors.border};
  overflow: hidden;
  position: relative;
  opacity: ${props => props.isVisible ? 1 : 0.5};
  transition: all 0.3s ease;

  @media (max-width: 1024px) {
    grid-column: span ${props => Math.min(props.gridSpan, 6)};
  }

  @media (max-width: 768px) {
    grid-column: span 1;
  }

  &:hover {
    border-color: ${progressTheme.colors.primary};
    animation: ${stellarGlow} 2s ease-in-out infinite;
  }

  ${props => !props.isVisible && `
    pointer-events: none;
  `}
`;

const ChartTitle = styled.div`
  padding: ${progressTheme.spacing.lg} ${progressTheme.spacing.lg} ${progressTheme.spacing.md} ${progressTheme.spacing.lg};
  background: ${progressTheme.colors.background};
  border-bottom: 1px solid ${progressTheme.colors.border};
  
  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: ${progressTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${progressTheme.spacing.sm};
  }
`;

const ChartContainer = styled.div<{ height: number }>`
  height: ${props => props.height}px;
  padding: ${progressTheme.spacing.lg};
  background: ${progressTheme.colors.chartBg};
  position: relative;

  .recharts-tooltip-wrapper {
    background: ${progressTheme.colors.surface} !important;
    border: 1px solid ${progressTheme.colors.border} !important;
    border-radius: ${progressTheme.borderRadius.md} !important;
    color: ${progressTheme.colors.text} !important;
  }

  .recharts-tooltip-label {
    color: ${progressTheme.colors.text} !important;
    font-weight: 600 !important;
  }

  .recharts-default-tooltip {
    background: ${progressTheme.colors.surface} !important;
    border: 1px solid ${progressTheme.colors.border} !important;
    border-radius: ${progressTheme.borderRadius.md} !important;
    color: ${progressTheme.colors.text} !important;
  }
`;

const ChartToggleButton = styled(motion.button)`
  position: absolute;
  top: ${progressTheme.spacing.md};
  right: ${progressTheme.spacing.md};
  background: ${progressTheme.colors.cardBg};
  border: 1px solid ${progressTheme.colors.border};
  border-radius: ${progressTheme.borderRadius.sm};
  color: ${progressTheme.colors.textSecondary};
  cursor: pointer;
  padding: ${progressTheme.spacing.xs};
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: ${progressTheme.colors.primary};
    color: ${progressTheme.colors.text};
  }
`;

const ProgressSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${progressTheme.spacing.lg};
  margin-bottom: ${progressTheme.spacing.xl};
`;

const SummaryCard = styled(motion.div)`
  background: ${progressTheme.colors.surface};
  border-radius: ${progressTheme.borderRadius.lg};
  padding: ${progressTheme.spacing.lg};
  border: 1px solid ${progressTheme.colors.border};
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${progressTheme.colors.primary}, ${progressTheme.colors.accent});
  }

  &:hover {
    border-color: ${progressTheme.colors.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${progressTheme.colors.primary}40;
  }
`;

const SummaryTitle = styled.h4`
  margin: 0 0 ${progressTheme.spacing.sm} 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${progressTheme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SummaryValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${progressTheme.colors.text};
  margin-bottom: ${progressTheme.spacing.xs};
`;

const SummarySubtext = styled.div`
  font-size: 0.8rem;
  color: ${progressTheme.colors.textSecondary};
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid ${progressTheme.colors.border};
  border-radius: 50%;
  border-top-color: ${progressTheme.colors.text};
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  text-align: center;
  color: ${progressTheme.colors.error};
  padding: ${progressTheme.spacing.xl};
  font-size: 1.1rem;
  
  svg {
    margin-bottom: ${progressTheme.spacing.sm};
  }
`;

const DataUpdateIndicator = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, ${progressTheme.colors.accent}, transparent);
  z-index: 20;
`;

// ==================== TIME RANGE OPTIONS ====================

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '1week', label: '1 Week', duration: 7 },
  { value: '1month', label: '1 Month', duration: 30 },
  { value: '3months', label: '3 Months', duration: 90 },
  { value: '6months', label: '6 Months', duration: 180 },
  { value: '1year', label: '1 Year', duration: 365 }
];

// ==================== CHART CONFIGURATIONS ====================

const DEFAULT_CHART_CONFIGS: ChartConfig[] = [
  {
    id: 'nasmCategories',
    title: 'NASM Category Development',
    type: 'radar',
    visible: true,
    height: 350,
    gridSpan: 6
  },
  {
    id: 'volumeProgression',
    title: 'Volume Progression',
    type: 'area',
    visible: true,
    height: 300,
    gridSpan: 6
  },
  {
    id: 'formQuality',
    title: 'Form Quality Improvement',
    type: 'line',
    visible: true,
    height: 300,
    gridSpan: 6
  },
  {
    id: 'workoutIntensity',
    title: 'Workout Intensity & Duration',
    type: 'line',
    visible: true,
    height: 300,
    gridSpan: 6
  }
];

// ==================== MAIN COMPONENT ====================

const NASMProgressCharts: React.FC<NASMProgressChartsProps> = ({ 
  clientId, 
  timeRange = '3months',
  autoRefresh = false 
}) => {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>(DEFAULT_CHART_CONFIGS);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadProgressData(true);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh, clientId, selectedTimeRange]);

  // Load data on mount and when parameters change
  useEffect(() => {
    loadProgressData();
  }, [clientId, selectedTimeRange]);

  const loadProgressData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsUpdating(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await dailyWorkoutFormService.getClientProgress(clientId, {
        timeRange: selectedTimeRange
      });

      if (response.success && response.data) {
        setProgressData(response.data);
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to load progress data');
      }

    } catch (error: any) {
      console.error('Failed to load progress data:', error);
      setError(error.message || 'Failed to load progress data');
      if (!isRefresh) {
        toast.error('Failed to load progress data');
      }
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  const toggleChartVisibility = useCallback((chartId: string) => {
    setChartConfigs(prev => 
      prev.map(config => 
        config.id === chartId 
          ? { ...config, visible: !config.visible }
          : config
      )
    );
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: progressTheme.colors.surface,
          border: `1px solid ${progressTheme.colors.border}`,
          borderRadius: progressTheme.borderRadius.md,
          padding: progressTheme.spacing.md,
          color: progressTheme.colors.text
        }}>
          <p style={{ fontWeight: 600, marginBottom: progressTheme.spacing.xs }}>
            {formatDate(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ 
              color: entry.color, 
              margin: `${progressTheme.spacing.xs} 0`,
              fontSize: '0.9rem'
            }}>
              {`${entry.dataKey}: ${entry.value}${entry.unit || ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderNASMCategoriesChart = () => {
    if (!progressData?.categories) return null;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={progressData.categories}>
          <PolarGrid stroke={progressTheme.colors.gridLines} />
          <PolarAngleAxis 
            dataKey="category" 
            tick={{ fill: progressTheme.colors.textSecondary, fontSize: 12 }}
          />
          <PolarRadiusAxis 
            angle={0} 
            domain={[0, 1000]} 
            tick={{ fill: progressTheme.colors.textSecondary, fontSize: 10 }}
          />
          <Radar
            name="Current Level"
            dataKey="level"
            stroke={progressTheme.colors.primary}
            fill={progressTheme.colors.primary}
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const renderVolumeProgressionChart = () => {
    if (!progressData?.volumeProgression) return null;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={progressData.volumeProgression}>
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={progressTheme.colors.success} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={progressTheme.colors.success} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={progressTheme.colors.gridLines} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fill: progressTheme.colors.textSecondary, fontSize: 11 }}
          />
          <YAxis tick={{ fill: progressTheme.colors.textSecondary, fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="totalWeight"
            stroke={progressTheme.colors.success}
            fillOpacity={1}
            fill="url(#volumeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderFormQualityChart = () => {
    if (!progressData?.formTrends) return null;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={progressData.formTrends}>
          <CartesianGrid strokeDasharray="3 3" stroke={progressTheme.colors.gridLines} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fill: progressTheme.colors.textSecondary, fontSize: 11 }}
          />
          <YAxis 
            domain={[1, 5]} 
            tick={{ fill: progressTheme.colors.textSecondary, fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="averageFormRating"
            stroke={progressTheme.colors.warning}
            strokeWidth={3}
            dot={{ fill: progressTheme.colors.warning, strokeWidth: 2, r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderWorkoutIntensityChart = () => {
    if (!progressData?.workoutHistory) return null;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={progressData.workoutHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke={progressTheme.colors.gridLines} />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fill: progressTheme.colors.textSecondary, fontSize: 11 }}
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fill: progressTheme.colors.textSecondary, fontSize: 11 }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fill: progressTheme.colors.textSecondary, fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="intensity"
            stroke={progressTheme.colors.error}
            strokeWidth={2}
            name="Intensity (1-10)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="duration"
            stroke={progressTheme.colors.primary}
            strokeWidth={2}
            name="Duration (min)"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const getChartRenderer = (chartType: string) => {
    switch (chartType) {
      case 'nasmCategories': return renderNASMCategoriesChart();
      case 'volumeProgression': return renderVolumeProgressionChart();
      case 'formQuality': return renderFormQualityChart();
      case 'workoutIntensity': return renderWorkoutIntensityChart();
      default: return null;
    }
  };

  const summaryStats = useMemo(() => {
    if (!progressData) return null;

    return {
      totalWorkouts: progressData.workoutHistory?.length || 0,
      averageFormRating: progressData.formTrends?.length > 0 
        ? (progressData.formTrends.reduce((sum, entry) => sum + entry.averageFormRating, 0) / progressData.formTrends.length).toFixed(1)
        : '0',
      totalVolumeLifted: progressData.volumeProgression?.length > 0
        ? progressData.volumeProgression.reduce((sum, entry) => sum + entry.totalWeight, 0).toLocaleString()
        : '0',
      highestCategory: progressData.categories?.length > 0
        ? progressData.categories.reduce((highest, cat) => 
            cat.level > highest.level ? cat : highest
          ).category
        : 'N/A'
    };
  }, [progressData]);

  if (loading) {
    return (
      <ProgressChartsContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <LoadingSpinner />
        </div>
      </ProgressChartsContainer>
    );
  }

  if (error) {
    return (
      <ProgressChartsContainer>
        <ErrorMessage>
          <Activity size={32} />
          <div>{error}</div>
          <Button variant="primary" onClick={() => loadProgressData()} style={{ marginTop: progressTheme.spacing.md }}>
            <RefreshCw size={16} />
            Retry
          </Button>
        </ErrorMessage>
      </ProgressChartsContainer>
    );
  }

  return (
    <ThemeProvider theme={progressTheme}>
      <ProgressChartsContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ChartsHeader>
          <HeaderTop>
            <Title>
              <TrendingUp size={28} />
              NASM Progress Overview
            </Title>
            <ControlsSection>
              <TimeRangeSelector>
                {TIME_RANGE_OPTIONS.map((option) => (
                  <TimeButton
                    key={option.value}
                    active={selectedTimeRange === option.value}
                    onClick={() => setSelectedTimeRange(option.value)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {option.label}
                  </TimeButton>
                ))}
              </TimeRangeSelector>
              <Button variant="secondary" onClick={() => loadProgressData(true)} disabled={isUpdating}>
                {isUpdating ? <LoadingSpinner /> : <RefreshCw size={16} />}
                Refresh
              </Button>
              <Button variant="ghost">
                <Download size={16} />
                Export
              </Button>
            </ControlsSection>
          </HeaderTop>

          {lastUpdated && (
            <div style={{ 
              fontSize: '0.8rem', 
              color: progressTheme.colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: progressTheme.spacing.xs
            }}>
              <Clock size={12} />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </ChartsHeader>

        {summaryStats && (
          <ProgressSummary>
            <SummaryCard whileHover={{ scale: 1.02 }}>
              <SummaryTitle>Total Workouts</SummaryTitle>
              <SummaryValue>{summaryStats.totalWorkouts}</SummaryValue>
              <SummarySubtext>Completed sessions</SummarySubtext>
            </SummaryCard>
            
            <SummaryCard whileHover={{ scale: 1.02 }}>
              <SummaryTitle>Average Form Rating</SummaryTitle>
              <SummaryValue>{summaryStats.averageFormRating}/5</SummaryValue>
              <SummarySubtext>Form quality score</SummarySubtext>
            </SummaryCard>
            
            <SummaryCard whileHover={{ scale: 1.02 }}>
              <SummaryTitle>Total Volume Lifted</SummaryTitle>
              <SummaryValue>{summaryStats.totalVolumeLifted}</SummaryValue>
              <SummarySubtext>lbs total weight</SummarySubtext>
            </SummaryCard>
            
            <SummaryCard whileHover={{ scale: 1.02 }}>
              <SummaryTitle>Highest Category</SummaryTitle>
              <SummaryValue style={{ fontSize: '1.2rem' }}>{summaryStats.highestCategory}</SummaryValue>
              <SummarySubtext>Best performing area</SummarySubtext>
            </SummaryCard>
          </ProgressSummary>
        )}

        <ChartsGrid>
          {chartConfigs.map((config) => (
            <ChartCard
              key={config.id}
              gridSpan={config.gridSpan}
              isVisible={config.visible}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: config.visible ? 1 : 0.5, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence>
                {isUpdating && (
                  <DataUpdateIndicator
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                  />
                )}
              </AnimatePresence>
              
              <ChartToggleButton
                onClick={() => toggleChartVisibility(config.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {config.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </ChartToggleButton>
              
              <ChartTitle>
                <h3>
                  {config.type === 'radar' && <Target size={20} />}
                  {config.type === 'area' && <BarChart3 size={20} />}
                  {config.type === 'line' && <TrendingUp size={20} />}
                  {config.title}
                </h3>
              </ChartTitle>
              
              <ChartContainer height={config.height}>
                {config.visible && getChartRenderer(config.id)}
                {!config.visible && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: progressTheme.colors.textSecondary,
                    fontSize: '0.9rem'
                  }}>
                    Chart hidden - click eye icon to show
                  </div>
                )}
              </ChartContainer>
            </ChartCard>
          ))}
        </ChartsGrid>
      </ProgressChartsContainer>
    </ThemeProvider>
  );
};

export default NASMProgressCharts;