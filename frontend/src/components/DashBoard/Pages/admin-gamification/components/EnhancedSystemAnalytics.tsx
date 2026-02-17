import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import {
  Award,
  Trophy,
  Star,
  Users,
  TrendingUp,
  Gift,
  Calendar,
  Activity,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  AlertTriangle,
  Download,
  Filter,
  Plus,
  Minus,
  HelpCircle,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Scatter,
  ScatterChart,
  ZAxis
} from 'recharts';

/* ═══════════════════════════════════════════
   Galaxy-Swan Theme Tokens
   ═══════════════════════════════════════════ */
const THEME = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  bgGlass: 'rgba(255,255,255,0.04)',
  border: 'rgba(14,165,233,0.2)',
  borderSubtle: 'rgba(14,165,233,0.1)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.12)',
  error: '#ef4444',
  errorBg: 'rgba(239,68,68,0.12)',
  warning: '#f59e0b',
  warningBg: 'rgba(245,158,11,0.12)',
  primaryBg: 'rgba(14,165,233,0.12)',
} as const;

/* ═══════════════════════════════════════════
   Styled Components
   ═══════════════════════════════════════════ */

const AnalyticsRoot = styled.div`
  color: ${THEME.text};
`;

const HeaderSection = styled.div`
  margin-bottom: 24px;
`;

const PageTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0 0 16px 0;
`;

const ControlsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
`;

const TabGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? THEME.accent : THEME.border};
  background: ${({ $active }) => $active ? THEME.accent : 'transparent'};
  color: ${({ $active }) => $active ? '#0a0a1a' : THEME.text};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${THEME.accentHover};
    background: ${({ $active }) => $active ? THEME.accentHover : 'rgba(14,165,233,0.1)'};
  }
`;

const ToggleGroup = styled.div`
  display: inline-flex;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  overflow: hidden;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 8px 14px;
  border: none;
  border-right: 1px solid ${THEME.border};
  background: ${({ $active }) => $active ? THEME.accent : 'transparent'};
  color: ${({ $active }) => $active ? '#0a0a1a' : THEME.text};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:last-child {
    border-right: none;
  }

  &:hover {
    background: ${({ $active }) => $active ? THEME.accentHover : 'rgba(14,165,233,0.1)'};
  }
`;

const GridContainer = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(12, 1fr);
  }
`;

const GridItem = styled.div<{ $xs?: number; $md?: number }>`
  grid-column: span 1;

  @media (min-width: 768px) {
    grid-column: span ${({ $md, $xs }) => $md ?? $xs ?? 12};
  }
`;

const GlassCard = styled.div`
  background: ${THEME.bgCard};
  border: 1px solid ${THEME.border};
  border-radius: 12px;
  backdrop-filter: blur(12px);
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const CardHeaderStyled = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${THEME.text};
  margin: 0;
`;

const CardSubtitle = styled.p`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
  margin: 4px 0 0 0;
`;

const CardContent = styled.div`
  padding: 16px 20px;
  flex: 1;
`;

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid ${THEME.borderSubtle};
  margin: 0;
`;

const ChartContainer = styled.div<{ $height?: number }>`
  height: ${({ $height }) => $height ?? 350}px;
  width: 100%;
`;

const ExportButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${THEME.border};
  background: transparent;
  color: ${THEME.text};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${THEME.accent};
    color: ${THEME.accent};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${THEME.border};
  background: transparent;
  color: ${THEME.text};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${THEME.accent};
    color: ${THEME.accent};
  }
`;

/* KPI Card styled components */
const KpiCardWrapper = styled.div`
  background: ${THEME.bgCard};
  border: 1px solid ${THEME.border};
  border-radius: 12px;
  backdrop-filter: blur(12px);
  padding: 20px;
  height: 100%;
`;

const KpiHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const KpiLabel = styled.span`
  font-size: 0.8125rem;
  color: ${THEME.textSecondary};
`;

const KpiIconBubble = styled.div<{ $color: string }>`
  padding: 8px;
  background: ${({ $color }) => `${$color}20`};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const KpiValue = styled.div`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

const KpiTrendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TrendBadge = styled.span<{ $trend: 'up' | 'down' }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $trend }) => $trend === 'up' ? THEME.successBg : THEME.errorBg};
  color: ${({ $trend }) => $trend === 'up' ? THEME.success : THEME.error};
`;

const ComparisonLabel = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textMuted};
`;

/* Custom Tooltip for Recharts */
const TooltipPaper = styled.div`
  background: rgba(15,23,42,0.95);
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  padding: 12px;
  backdrop-filter: blur(12px);
`;

const TooltipTitle = styled.p`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${THEME.text};
  margin: 0 0 4px 0;
`;

const TooltipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const TooltipDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const TooltipValue = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
`;

/* Table */
const TableWrapper = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 0.8125rem;
  color: ${THEME.textSecondary};
  border-bottom: 1px solid ${THEME.border};
`;

const Td = styled.td`
  padding: 12px 16px;
  font-size: 0.875rem;
  color: ${THEME.text};
  border-bottom: 1px solid ${THEME.borderSubtle};
`;

/* Chip / Badge */
const TierChip = styled.span<{ $tier: string }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $tier }) =>
    $tier === 'Bronze' ? '#CD7F3233' :
    $tier === 'Silver' ? '#C0C0C033' :
    $tier === 'Gold' ? '#FFD70033' :
    '#E5E4E233'
  };
  color: ${({ $tier }) =>
    $tier === 'Bronze' ? '#CD7F32' :
    $tier === 'Silver' ? '#C0C0C0' :
    $tier === 'Gold' ? '#FFD700' :
    '#E5E4E2'
  };
`;

const RiskChip = styled.span<{ $risk: string }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $risk }) => $risk === 'high' ? THEME.errorBg : THEME.warningBg};
  color: ${({ $risk }) => $risk === 'high' ? THEME.error : THEME.warning};
`;

/* Insight Cards */
const InsightCard = styled.div<{ $variant: 'success' | 'primary' | 'warning' }>`
  padding: 16px;
  border-radius: 10px;
  height: 100%;
  background: ${({ $variant }) =>
    $variant === 'success' ? THEME.successBg :
    $variant === 'primary' ? THEME.primaryBg :
    THEME.warningBg
  };
  border: 1px solid ${({ $variant }) =>
    $variant === 'success' ? 'rgba(34,197,94,0.2)' :
    $variant === 'primary' ? 'rgba(14,165,233,0.2)' :
    'rgba(245,158,11,0.2)'
  };
`;

const InsightHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
`;

const InsightTitle = styled.span<{ $variant: 'success' | 'primary' | 'warning' }>`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ $variant }) =>
    $variant === 'success' ? THEME.success :
    $variant === 'primary' ? THEME.accent :
    THEME.warning
  };
`;

const InsightBody = styled.p`
  font-size: 0.8125rem;
  color: ${THEME.textSecondary};
  margin: 0;
  line-height: 1.5;

  strong {
    color: ${THEME.text};
  }
`;

/* Points Economy stat card */
const StatBox = styled.div<{ $variant: 'primary' | 'error' | 'warning' }>`
  padding: 16px;
  border-radius: 10px;
  background: ${({ $variant }) =>
    $variant === 'primary' ? THEME.primaryBg :
    $variant === 'error' ? THEME.errorBg :
    THEME.warningBg
  };
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary' ? 'rgba(14,165,233,0.2)' :
    $variant === 'error' ? 'rgba(239,68,68,0.2)' :
    'rgba(245,158,11,0.2)'
  };
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatLabel = styled.span`
  font-size: 0.8125rem;
  color: ${THEME.textSecondary};
`;

const StatValue = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${THEME.text};
`;

const SectionTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: ${THEME.text};
  margin: 24px 0 16px 0;
`;

const ChartTypeSelectorRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 16px;
`;

const InnerGrid3 = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

/**
 * Enhanced SystemAnalytics Component
 *
 * Provides comprehensive analytics and insights for the gamification system
 * Displays user engagement metrics, achievement statistics, reward usage, and tier distribution
 * Optimized for performance with customizable views and exportable data
 */
const EnhancedSystemAnalytics: React.FC<{ data: any }> = ({ data }) => {
  // State for view control
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'achievements' | 'rewards' | 'tiers' | 'trends'>('overview');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Handle time range change
  const handleTimeRangeChange = useCallback((
    newTimeRange: 'week' | 'month' | 'quarter' | 'year',
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  }, []);

  // Handle chart type change
  const handleChartTypeChange = useCallback((
    newChartType: 'bar' | 'line' | 'pie' | 'area',
  ) => {
    if (newChartType !== null) {
      setChartType(newChartType);
    }
  }, []);

  // Calculate KPI card values based on time range
  const kpiValues = useMemo(() => {
    // In a real implementation, these would be calculated from the data based on time range
    // Here we're just using mock data

    const ranges = {
      week: {
        newUsers: 8,
        achievementsEarned: 47,
        rewardsRedeemed: 12,
        engagementRate: 78,
        pointsEarned: 6800,
        pointsSpent: 2500,
        prevNewUsers: 6,
        prevAchievementsEarned: 42,
        prevRewardsRedeemed: 10,
        prevEngagementRate: 72,
        prevPointsEarned: 6200,
        prevPointsSpent: 2800
      },
      month: {
        newUsers: 24,
        achievementsEarned: 186,
        rewardsRedeemed: 42,
        engagementRate: 83,
        pointsEarned: 28900,
        pointsSpent: 9300,
        prevNewUsers: 19,
        prevAchievementsEarned: 165,
        prevRewardsRedeemed: 38,
        prevEngagementRate: 80,
        prevPointsEarned: 24500,
        prevPointsSpent: 8700
      },
      quarter: {
        newUsers: 52,
        achievementsEarned: 412,
        rewardsRedeemed: 95,
        engagementRate: 81,
        pointsEarned: 64500,
        pointsSpent: 22800,
        prevNewUsers: 43,
        prevAchievementsEarned: 378,
        prevRewardsRedeemed: 82,
        prevEngagementRate: 79,
        prevPointsEarned: 58900,
        prevPointsSpent: 19800
      },
      year: {
        newUsers: 164,
        achievementsEarned: 1250,
        rewardsRedeemed: 280,
        engagementRate: 79,
        pointsEarned: 186000,
        pointsSpent: 78500,
        prevNewUsers: 128,
        prevAchievementsEarned: 1080,
        prevRewardsRedeemed: 245,
        prevEngagementRate: 74,
        prevPointsEarned: 152000,
        prevPointsSpent: 63000
      }
    };

    const current = ranges[timeRange];

    return {
      newUsers: {
        value: current.newUsers,
        trend: current.newUsers > current.prevNewUsers ? 'up' : 'down',
        percentage: Math.round(Math.abs((current.newUsers - current.prevNewUsers) / current.prevNewUsers * 100))
      },
      achievementsEarned: {
        value: current.achievementsEarned,
        trend: current.achievementsEarned > current.prevAchievementsEarned ? 'up' : 'down',
        percentage: Math.round(Math.abs((current.achievementsEarned - current.prevAchievementsEarned) / current.prevAchievementsEarned * 100))
      },
      rewardsRedeemed: {
        value: current.rewardsRedeemed,
        trend: current.rewardsRedeemed > current.prevRewardsRedeemed ? 'up' : 'down',
        percentage: Math.round(Math.abs((current.rewardsRedeemed - current.prevRewardsRedeemed) / current.prevRewardsRedeemed * 100))
      },
      engagementRate: {
        value: current.engagementRate,
        trend: current.engagementRate > current.prevEngagementRate ? 'up' : 'down',
        percentage: Math.abs(current.engagementRate - current.prevEngagementRate)
      },
      pointsEarned: {
        value: current.pointsEarned,
        trend: current.pointsEarned > current.prevPointsEarned ? 'up' : 'down',
        percentage: Math.round(Math.abs((current.pointsEarned - current.prevPointsEarned) / current.prevPointsEarned * 100))
      },
      pointsSpent: {
        value: current.pointsSpent,
        trend: current.pointsSpent < current.prevPointsSpent ? 'up' : 'down', // Lower spending is considered positive
        percentage: Math.round(Math.abs((current.pointsSpent - current.prevPointsSpent) / current.prevPointsSpent * 100))
      },
      pointsEconomy: {
        value: Math.round((current.pointsEarned - current.pointsSpent) / current.pointsEarned * 100),
        trend: (current.pointsEarned - current.pointsSpent) > (current.prevPointsEarned - current.prevPointsSpent) ? 'up' : 'down',
        percentage: Math.round(Math.abs(
          ((current.pointsEarned - current.pointsSpent) - (current.prevPointsEarned - current.prevPointsSpent)) /
          (current.prevPointsEarned - current.prevPointsSpent) * 100
        ))
      }
    };
  }, [timeRange]);

  // Generate activity data based on time range
  const activityData = useMemo(() => {
    const getActivityData = () => {
      const now = new Date();
      const result = [];

      let dataPoints = 0;
      let interval = 0;

      // Set number of data points and interval based on time range
      switch (timeRange) {
        case 'week':
          dataPoints = 7;
          interval = 24 * 60 * 60 * 1000; // 1 day
          break;
        case 'month':
          dataPoints = 30;
          interval = 24 * 60 * 60 * 1000; // 1 day
          break;
        case 'quarter':
          dataPoints = 12;
          interval = 7 * 24 * 60 * 60 * 1000; // 1 week
          break;
        case 'year':
          dataPoints = 12;
          interval = 30 * 24 * 60 * 60 * 1000; // 1 month
          break;
      }

      for (let i = dataPoints - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - (i * interval));
        const pointsEarned = Math.floor(Math.random() * 2000) + 1000;
        const pointsSpent = Math.floor(Math.random() * 500) + 300;
        const activeUsers = Math.floor(Math.random() * 10) + 30;
        const newUsers = Math.floor(Math.random() * 3) + 1;

        result.push({
          date: timeRange === 'year'
            ? date.toLocaleDateString('en-US', { month: 'short' })
            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          pointsEarned,
          pointsSpent,
          activeUsers,
          newUsers,
          achievementsEarned: Math.floor(Math.random() * 10) + 5,
          rewardsRedeemed: Math.floor(Math.random() * 3) + 1,
          engagementRate: Math.floor(Math.random() * 10) + 70
        });
      }

      return result;
    };

    return getActivityData();
  }, [timeRange]);

  // Generate tier distribution data
  const tierDistributionData = useMemo(() => {
    return [
      { name: 'Bronze', value: 18, color: '#CD7F32' },
      { name: 'Silver', value: 15, color: '#C0C0C0' },
      { name: 'Gold', value: 7, color: '#FFD700' },
      { name: 'Platinum', value: 2, color: '#E5E4E2' }
    ];
  }, []);

  // Generate achievement completion data
  const achievementCompletionData = useMemo(() => {
    return [
      { name: 'Fitness Starter', completion: 90, color: '#4CAF50' },
      { name: 'Exercise Explorer', completion: 75, color: '#2196F3' },
      { name: 'Level 10 Champion', completion: 60, color: '#9C27B0' },
      { name: 'Squat Master', completion: 45, color: '#FF9800' },
      { name: 'Consistency King', completion: 30, color: '#F44336' },
      { name: 'Elite Athlete', completion: 15, color: '#607D8B' },
      { name: 'Fitness Legend', completion: 5, color: '#795548' }
    ];
  }, []);

  // Generate reward redemption data
  const rewardRedemptionData = useMemo(() => {
    return [
      { name: 'Water Bottle', redemptions: 15, color: '#4CAF50' },
      { name: 'Free Session', redemptions: 10, color: '#2196F3' },
      { name: 'Fitness Assessment', redemptions: 8, color: '#9C27B0' },
      { name: 'Fitness T-Shirt', redemptions: 6, color: '#FF9800' },
      { name: '25% Off Package', redemptions: 3, color: '#F44336' }
    ];
  }, []);

  // Generate user retention data
  const userRetentionData = useMemo(() => {
    return [
      { tier: 'Bronze', retention: 65 },
      { tier: 'Silver', retention: 78 },
      { tier: 'Gold', retention: 92 },
      { tier: 'Platinum', retention: 98 }
    ];
  }, []);

  // Generate tier progression data
  const tierProgressionData = useMemo(() => {
    const data = [];

    const startDate = new Date();
    const numPoints = timeRange === 'week' ? 7 :
                    timeRange === 'month' ? 4 :
                    timeRange === 'quarter' ? 12 :
                    12;

    const interval = timeRange === 'week' ? 1 :
                    timeRange === 'month' ? 7 :
                    timeRange === 'quarter' ? 7 :
                    30;

    startDate.setDate(startDate.getDate() - (numPoints * interval));

    let bronzeUsers = 15;
    let silverUsers = 10;
    let goldUsers = 3;
    let platinumUsers = 1;
    const totalUsers = bronzeUsers + silverUsers + goldUsers + platinumUsers;

    for (let i = 0; i < numPoints; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (i * interval));

      // Small random changes to the numbers
      bronzeUsers += Math.floor(Math.random() * 3) - 1;
      silverUsers += Math.floor(Math.random() * 3) - 0.5;
      goldUsers += Math.floor(Math.random() * 2) - 0.5;
      platinumUsers += Math.floor(Math.random() * 2) - 0.5;

      // Ensure values are at least 0
      bronzeUsers = Math.max(0, bronzeUsers);
      silverUsers = Math.max(0, silverUsers);
      goldUsers = Math.max(0, goldUsers);
      platinumUsers = Math.max(0, platinumUsers);

      // Calculate percentages
      const newTotal = bronzeUsers + silverUsers + goldUsers + platinumUsers;

      data.push({
        date: timeRange === 'year'
          ? date.toLocaleDateString('en-US', { month: 'short' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bronze: Math.round((bronzeUsers / newTotal) * 100),
        silver: Math.round((silverUsers / newTotal) * 100),
        gold: Math.round((goldUsers / newTotal) * 100),
        platinum: Math.round((platinumUsers / newTotal) * 100)
      });
    }

    return data;
  }, [timeRange]);

  // User engagement by achievement level
  const engagementData = useMemo(() => {
    return [
      { name: '0-5', achievements: 5, retention: 35, engagement: 25 },
      { name: '6-10', achievements: 10, retention: 48, engagement: 40 },
      { name: '11-15', achievements: 15, retention: 65, engagement: 58 },
      { name: '16-20', achievements: 20, retention: 78, engagement: 72 },
      { name: '21+', achievements: 25, retention: 92, engagement: 85 }
    ];
  }, []);

  // Risk users - those who haven't earned points in 14+ days
  const riskUsers = useMemo(() => {
    return [
      { id: 'user123', name: 'John Smith', tier: 'Silver', lastActive: '21 days ago', risk: 'high' },
      { id: 'user456', name: 'Alice Brown', tier: 'Bronze', lastActive: '18 days ago', risk: 'high' },
      { id: 'user789', name: 'Robert Davis', tier: 'Gold', lastActive: '16 days ago', risk: 'medium' },
      { id: 'user101', name: 'Emily Wilson', tier: 'Bronze', lastActive: '15 days ago', risk: 'medium' },
      { id: 'user112', name: 'Michael Clark', tier: 'Silver', lastActive: '14 days ago', risk: 'medium' }
    ];
  }, []);

  // Function to export data (mock implementation)
  const handleExportData = useCallback(() => {
    setIsExporting(true);

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);

      // In a real implementation, this would download a CSV or Excel file
      alert('Analytics data exported successfully!');
    }, 1500);
  }, []);

  // Custom tooltip component for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <TooltipPaper>
          <TooltipTitle>{label}</TooltipTitle>
          {payload.map((entry: any, index: number) => (
            <TooltipRow key={`item-${index}`}>
              <TooltipDot $color={entry.color} />
              <TooltipValue>
                {entry.name}: {entry.value.toLocaleString()}
              </TooltipValue>
            </TooltipRow>
          ))}
        </TooltipPaper>
      );
    }

    return null;
  };

  // KPI Card Component
  const KpiCard = ({
    title,
    value,
    suffix = '',
    trend,
    percentage,
    color,
    icon: Icon
  }: {
    title: string;
    value: number | string;
    suffix?: string;
    trend: 'up' | 'down';
    percentage: number;
    color: string;
    icon: React.ElementType;
  }) => (
    <KpiCardWrapper>
      <KpiHeader>
        <KpiLabel>{title}</KpiLabel>
        <KpiIconBubble $color={color}>
          <Icon size={20} color={color} />
        </KpiIconBubble>
      </KpiHeader>

      <KpiValue>
        {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </KpiValue>

      <KpiTrendRow>
        <TrendBadge $trend={trend}>
          {trend === 'up' ? <Plus size={14} /> : <Minus size={14} />}
          {percentage}%
        </TrendBadge>

        <ComparisonLabel>
          vs previous {timeRange}
        </ComparisonLabel>
      </KpiTrendRow>
    </KpiCardWrapper>
  );

  // Render the overview tab
  const renderOverviewTab = () => (
    <GridContainer>
      {/* KPI Summary Cards */}
      <GridItem $md={3}>
        <KpiCard
          title="Active Users"
          value={data.userEngagement.activeUsers}
          trend={kpiValues.newUsers.trend}
          percentage={kpiValues.newUsers.percentage}
          color="#4361ee"
          icon={Users}
        />
      </GridItem>

      <GridItem $md={3}>
        <KpiCard
          title="Achievements Earned"
          value={kpiValues.achievementsEarned.value}
          trend={kpiValues.achievementsEarned.trend}
          percentage={kpiValues.achievementsEarned.percentage}
          color="#3a86ff"
          icon={Trophy}
        />
      </GridItem>

      <GridItem $md={3}>
        <KpiCard
          title="Rewards Redeemed"
          value={kpiValues.rewardsRedeemed.value}
          trend={kpiValues.rewardsRedeemed.trend}
          percentage={kpiValues.rewardsRedeemed.percentage}
          color="#8338ec"
          icon={Gift}
        />
      </GridItem>

      <GridItem $md={3}>
        <KpiCard
          title="Engagement Rate"
          value={kpiValues.engagementRate.value}
          suffix="%"
          trend={kpiValues.engagementRate.trend}
          percentage={kpiValues.engagementRate.percentage}
          color="#ff006e"
          icon={Activity}
        />
      </GridItem>

      {/* Activity Timeline */}
      <GridItem $md={12}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Activity Timeline</CardTitle>
            <ExportButton
              onClick={handleExportData}
              disabled={isExporting}
              title="Export data to CSV"
            >
              <Download size={16} />
              {isExporting ? 'Exporting...' : 'Export'}
            </ExportButton>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={350}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' && (
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                    <XAxis dataKey="date" stroke={THEME.textMuted} />
                    <YAxis stroke={THEME.textMuted} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar name="Points Earned" dataKey="pointsEarned" fill="#4361ee" />
                    <Bar name="Points Spent" dataKey="pointsSpent" fill="#ff006e" />
                  </BarChart>
                )}

                {chartType === 'line' && (
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                    <XAxis dataKey="date" stroke={THEME.textMuted} />
                    <YAxis stroke={THEME.textMuted} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" name="Points Earned" dataKey="pointsEarned" stroke="#4361ee" dot={{ r: 3 }} />
                    <Line type="monotone" name="Points Spent" dataKey="pointsSpent" stroke="#ff006e" dot={{ r: 3 }} />
                  </LineChart>
                )}

                {chartType === 'area' && (
                  <AreaChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                    <XAxis dataKey="date" stroke={THEME.textMuted} />
                    <YAxis stroke={THEME.textMuted} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" name="Points Earned" dataKey="pointsEarned" fill="#4361ee33" stroke="#4361ee" />
                    <Area type="monotone" name="Points Spent" dataKey="pointsSpent" fill="#ff006e33" stroke="#ff006e" />
                  </AreaChart>
                )}

                {chartType === 'pie' && (
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Points Earned', value: activityData.reduce((sum, item) => sum + item.pointsEarned, 0), color: '#4361ee' },
                        { name: 'Points Spent', value: activityData.reduce((sum, item) => sum + item.pointsSpent, 0), color: '#ff006e' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Points Earned', value: 0, color: '#4361ee' },
                        { name: 'Points Spent', value: 0, color: '#ff006e' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </ChartContainer>

            {/* Chart Type Selector */}
            <ChartTypeSelectorRow>
              <ToggleGroup>
                <ToggleBtn
                  $active={chartType === 'bar'}
                  onClick={() => handleChartTypeChange('bar')}
                  aria-label="bar chart"
                >
                  <BarChartIcon size={16} />
                </ToggleBtn>
                <ToggleBtn
                  $active={chartType === 'line'}
                  onClick={() => handleChartTypeChange('line')}
                  aria-label="line chart"
                >
                  <TrendingUp size={16} />
                </ToggleBtn>
                <ToggleBtn
                  $active={chartType === 'area'}
                  onClick={() => handleChartTypeChange('area')}
                  aria-label="area chart"
                >
                  <Activity size={16} />
                </ToggleBtn>
                <ToggleBtn
                  $active={chartType === 'pie'}
                  onClick={() => handleChartTypeChange('pie')}
                  aria-label="pie chart"
                >
                  <PieChartIcon size={16} />
                </ToggleBtn>
              </ToggleGroup>
            </ChartTypeSelectorRow>
          </CardContent>
        </GlassCard>
      </GridItem>

      {/* Tier Distribution & Achievement Completion */}
      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Tier Distribution</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {tierDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Achievement Completion Rates</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={achievementCompletionData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis type="number" domain={[0, 100]} stroke={THEME.textMuted} />
                  <YAxis type="category" dataKey="name" width={150} stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="completion" radius={[0, 4, 4, 0]}>
                    {achievementCompletionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      {/* At-Risk Users */}
      <GridItem $md={12}>
        <GlassCard>
          <CardHeaderStyled>
            <div>
              <CardTitle>At-Risk Users</CardTitle>
              <CardSubtitle>Users who haven't earned points in 14+ days</CardSubtitle>
            </div>
            <span title="These users may need re-engagement strategies">
              <HelpCircle size={16} color={THEME.textMuted} />
            </span>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <TableWrapper>
              <StyledTable>
                <thead>
                  <tr>
                    <Th>User</Th>
                    <Th>Tier</Th>
                    <Th>Last Active</Th>
                    <Th>Risk Level</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {riskUsers.map((user) => (
                    <tr key={user.id}>
                      <Td>{user.name}</Td>
                      <Td>
                        <TierChip $tier={user.tier}>{user.tier}</TierChip>
                      </Td>
                      <Td>{user.lastActive}</Td>
                      <Td>
                        <RiskChip $risk={user.risk}>{user.risk.toUpperCase()}</RiskChip>
                      </Td>
                      <Td>
                        <ActionButton>
                          Send Incentive
                        </ActionButton>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>
            </TableWrapper>
          </CardContent>
        </GlassCard>
      </GridItem>

      {/* Insights Cards */}
      <GridItem $md={12}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Key Insights</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <InnerGrid3>
              <InsightCard $variant="success">
                <InsightHeader>
                  <Trophy size={18} color={THEME.success} />
                  <InsightTitle $variant="success">
                    Achievement Impact
                  </InsightTitle>
                </InsightHeader>
                <InsightBody>
                  Users who earn at least 10 achievements show a <strong>78% higher retention rate</strong> than those with fewer achievements.
                </InsightBody>
              </InsightCard>

              <InsightCard $variant="primary">
                <InsightHeader>
                  <Activity size={18} color={THEME.accent} />
                  <InsightTitle $variant="primary">
                    Engagement Trend
                  </InsightTitle>
                </InsightHeader>
                <InsightBody>
                  Overall engagement has <strong>increased by {kpiValues.engagementRate.percentage}%</strong> compared to the previous {timeRange}, driven mainly by the new achievement system.
                </InsightBody>
              </InsightCard>

              <InsightCard $variant="warning">
                <InsightHeader>
                  <AlertTriangle size={18} color={THEME.warning} />
                  <InsightTitle $variant="warning">
                    Attention Needed
                  </InsightTitle>
                </InsightHeader>
                <InsightBody>
                  <strong>{riskUsers.length} users</strong> haven't earned points in over 14 days and are at risk of churn. Consider sending personalized incentives.
                </InsightBody>
              </InsightCard>
            </InnerGrid3>
          </CardContent>
        </GlassCard>
      </GridItem>
    </GridContainer>
  );

  // Render the users tab
  const renderUsersTab = () => (
    <GridContainer>
      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>User Engagement Metrics</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="date" stroke={THEME.textMuted} />
                  <YAxis stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" name="Active Users" dataKey="activeUsers" stroke="#4361ee" dot={{ r: 3 }} />
                  <Line type="monotone" name="New Users" dataKey="newUsers" stroke="#3a86ff" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Engagement by Achievement Count</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="name" stroke={THEME.textMuted} />
                  <YAxis stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar name="Retention %" dataKey="retention" fill="#4361ee" />
                  <Bar name="Engagement %" dataKey="engagement" fill="#ff006e" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      <GridItem $md={12}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>User Retention by Tier</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userRetentionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="tier" stroke={THEME.textMuted} />
                  <YAxis domain={[0, 100]} stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar name="Retention %" dataKey="retention">
                    {userRetentionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.tier === 'Bronze' ? '#CD7F32' :
                          entry.tier === 'Silver' ? '#C0C0C0' :
                          entry.tier === 'Gold' ? '#FFD700' :
                          '#E5E4E2'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>
    </GridContainer>
  );

  // Render the achievements tab
  const renderAchievementsTab = () => (
    <GridContainer>
      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Achievement Completion Rates</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={400}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={achievementCompletionData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis type="number" domain={[0, 100]} stroke={THEME.textMuted} />
                  <YAxis type="category" dataKey="name" width={150} stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="completion" radius={[0, 4, 4, 0]}>
                    {achievementCompletionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Achievements Earned Over Time</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={400}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="date" stroke={THEME.textMuted} />
                  <YAxis stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    name="Achievements Earned"
                    dataKey="achievementsEarned"
                    fill="#8338ec33"
                    stroke="#8338ec"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>
    </GridContainer>
  );

  // Render the rewards tab
  const renderRewardsTab = () => (
    <GridContainer>
      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Reward Redemptions</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={350}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rewardRedemptionData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis type="number" stroke={THEME.textMuted} />
                  <YAxis type="category" dataKey="name" width={150} stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="redemptions" radius={[0, 4, 4, 0]}>
                    {rewardRedemptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Rewards Redeemed Over Time</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={350}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="date" stroke={THEME.textMuted} />
                  <YAxis stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    name="Rewards Redeemed"
                    dataKey="rewardsRedeemed"
                    fill="#ff006e33"
                    stroke="#ff006e"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      <GridItem $md={12}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Points Economy</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={350}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="date" stroke={THEME.textMuted} />
                  <YAxis stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar name="Points Earned" dataKey="pointsEarned" fill="#4361ee" />
                  <Bar name="Points Spent" dataKey="pointsSpent" fill="#ff006e" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div>
              <SectionTitle>
                Points Economy Health
              </SectionTitle>

              <InnerGrid3>
                <StatBox $variant="primary">
                  <StatLabel>Total Points Issued</StatLabel>
                  <StatValue>
                    {kpiValues.pointsEarned.value.toLocaleString()}
                  </StatValue>
                </StatBox>

                <StatBox $variant="error">
                  <StatLabel>Total Points Spent</StatLabel>
                  <StatValue>
                    {kpiValues.pointsSpent.value.toLocaleString()}
                  </StatValue>
                </StatBox>

                <StatBox $variant="warning">
                  <StatLabel>Points Economy Rate</StatLabel>
                  <StatValue>
                    {kpiValues.pointsEconomy.value}%
                  </StatValue>
                </StatBox>
              </InnerGrid3>
            </div>
          </CardContent>
        </GlassCard>
      </GridItem>
    </GridContainer>
  );

  // Render the tiers tab
  const renderTiersTab = () => (
    <GridContainer>
      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Tier Distribution</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={350}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {tierDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Tier Distribution Over Time</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={350}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tierProgressionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="date" stroke={THEME.textMuted} />
                  <YAxis stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="bronze"
                    stackId="1"
                    stroke="#CD7F32"
                    fill="#CD7F3266"
                    name="Bronze"
                  />
                  <Area
                    type="monotone"
                    dataKey="silver"
                    stackId="1"
                    stroke="#C0C0C0"
                    fill="#C0C0C066"
                    name="Silver"
                  />
                  <Area
                    type="monotone"
                    dataKey="gold"
                    stackId="1"
                    stroke="#FFD700"
                    fill="#FFD70066"
                    name="Gold"
                  />
                  <Area
                    type="monotone"
                    dataKey="platinum"
                    stackId="1"
                    stroke="#E5E4E2"
                    fill="#E5E4E266"
                    name="Platinum"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>
    </GridContainer>
  );

  // Render the trends tab
  const renderTrendsTab = () => (
    <GridContainer>
      <GridItem $md={12}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Engagement Rate Trends</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={350}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis dataKey="date" stroke={THEME.textMuted} />
                  <YAxis domain={[0, 100]} stroke={THEME.textMuted} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    name="Engagement Rate (%)"
                    dataKey="engagementRate"
                    stroke="#4361ee"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Achievement vs. Retention</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={350}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.1)" />
                  <XAxis type="number" dataKey="achievements" name="Achievements" stroke={THEME.textMuted} />
                  <YAxis type="number" dataKey="retention" name="Retention %" stroke={THEME.textMuted} />
                  <ZAxis type="number" range={[100, 600]} />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                  <Legend />
                  <Scatter name="User Segments" data={engagementData} fill="#8338ec" />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>

      <GridItem $md={6}>
        <GlassCard>
          <CardHeaderStyled>
            <CardTitle>Skill Analysis</CardTitle>
          </CardHeaderStyled>
          <StyledDivider />
          <CardContent>
            <ChartContainer $height={350}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                  { subject: 'User Acquisition', A: 85, B: 75, fullMark: 100 },
                  { subject: 'Retention', A: 78, B: 65, fullMark: 100 },
                  { subject: 'Engagement', A: 83, B: 72, fullMark: 100 },
                  { subject: 'Achievement Rate', A: 72, B: 60, fullMark: 100 },
                  { subject: 'Reward Usage', A: 65, B: 55, fullMark: 100 },
                  { subject: 'Points Economy', A: 70, B: 60, fullMark: 100 },
                ]}>
                  <PolarGrid stroke="rgba(14,165,233,0.1)" />
                  <PolarAngleAxis dataKey="subject" stroke={THEME.textMuted} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={THEME.textMuted} />
                  <Radar name="Current" dataKey="A" stroke="#8338ec" fill="#8338ec" fillOpacity={0.3} />
                  <Radar name="Previous" dataKey="B" stroke="#ff006e" fill="#ff006e" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </GlassCard>
      </GridItem>
    </GridContainer>
  );

  return (
    <AnalyticsRoot>
      <HeaderSection>
        <PageTitle>
          Gamification Analytics Dashboard
        </PageTitle>

        <ControlsRow>
          <TabGroup>
            <TabButton
              $active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            >
              <Activity size={16} />
              Overview
            </TabButton>
            <TabButton
              $active={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} />
              Users
            </TabButton>
            <TabButton
              $active={activeTab === 'achievements'}
              onClick={() => setActiveTab('achievements')}
            >
              <Trophy size={16} />
              Achievements
            </TabButton>
            <TabButton
              $active={activeTab === 'rewards'}
              onClick={() => setActiveTab('rewards')}
            >
              <Gift size={16} />
              Rewards
            </TabButton>
            <TabButton
              $active={activeTab === 'tiers'}
              onClick={() => setActiveTab('tiers')}
            >
              <Award size={16} />
              Tiers
            </TabButton>
            <TabButton
              $active={activeTab === 'trends'}
              onClick={() => setActiveTab('trends')}
            >
              <TrendingUp size={16} />
              Trends
            </TabButton>
          </TabGroup>

          <ToggleGroup>
            <ToggleBtn
              $active={timeRange === 'week'}
              onClick={() => handleTimeRangeChange('week')}
              aria-label="last week"
            >
              Week
            </ToggleBtn>
            <ToggleBtn
              $active={timeRange === 'month'}
              onClick={() => handleTimeRangeChange('month')}
              aria-label="last month"
            >
              Month
            </ToggleBtn>
            <ToggleBtn
              $active={timeRange === 'quarter'}
              onClick={() => handleTimeRangeChange('quarter')}
              aria-label="last quarter"
            >
              Quarter
            </ToggleBtn>
            <ToggleBtn
              $active={timeRange === 'year'}
              onClick={() => handleTimeRangeChange('year')}
              aria-label="last year"
            >
              Year
            </ToggleBtn>
          </ToggleGroup>
        </ControlsRow>
      </HeaderSection>

      {/* Render appropriate tab content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'achievements' && renderAchievementsTab()}
      {activeTab === 'rewards' && renderRewardsTab()}
      {activeTab === 'tiers' && renderTiersTab()}
      {activeTab === 'trends' && renderTrendsTab()}
    </AnalyticsRoot>
  );
};

export default React.memo(EnhancedSystemAnalytics);
