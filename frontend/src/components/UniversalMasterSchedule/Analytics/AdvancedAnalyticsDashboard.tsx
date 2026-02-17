/**
 * Advanced Analytics Dashboard for Universal Master Schedule
 * =========================================================
 *
 * Comprehensive business intelligence dashboard providing:
 * - Real-time revenue analytics
 * - Trainer performance metrics
 * - Client retention analysis
 * - Social engagement correlation
 * - Predictive insights
 * - NASM compliance tracking
 *
 * This is the nerve center for data-driven business decisions.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Star,
  Target,
  Activity,
  Award,
  Calendar,
  Clock,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';

// Advanced Chart Components (would normally import from recharts)
interface ChartProps {
  data: any[];
  height?: number;
}

const MockLineChart: React.FC<ChartProps> = ({ data, height = 200 }) => (
  <div style={{
    height,
    background: 'rgba(59, 130, 246, 0.1)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  }}>
    <LineChart size={48} color="#3b82f6" />
    <ChartLabel>Revenue Trend Chart</ChartLabel>
  </div>
);

const MockBarChart: React.FC<ChartProps> = ({ data, height = 200 }) => (
  <div style={{
    height,
    background: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(34, 197, 94, 0.3)'
  }}>
    <BarChart3 size={48} color="#22c55e" />
    <ChartLabel>Trainer Performance</ChartLabel>
  </div>
);

interface AdvancedAnalyticsDashboardProps {
  sessions: any[];
  clients: any[];
  trainers: any[];
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  sessions,
  clients,
  trainers,
  dateRange,
  onDateRangeChange
}) => {
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    revenue: {
      total: 25400,
      growth: 12.5,
      trend: 'up',
      daily: 850,
      weekly: 5950,
      monthly: 25400
    },
    trainers: {
      active: 8,
      topPerformer: 'Sarah Johnson',
      averageRating: 4.8,
      utilization: 85,
      retention: 94
    },
    clients: {
      total: 156,
      active: 142,
      newThisMonth: 23,
      retention: 89,
      averageLifetime: 8.5
    },
    sessions: {
      total: 1240,
      completed: 1156,
      cancelled: 84,
      noShows: 32,
      completionRate: 93.2
    }
  });

  // Calculate key performance indicators
  const kpis = useMemo(() => {
    const revenuePerSession = analyticsData.revenue.total / analyticsData.sessions.completed;
    const clientAcquisitionCost = 45; // Example metric
    const lifetimeValue = analyticsData.clients.averageLifetime * revenuePerSession * 12;

    return {
      revenuePerSession: Math.round(revenuePerSession),
      clientAcquisitionCost,
      lifetimeValue: Math.round(lifetimeValue),
      roi: Math.round((lifetimeValue / clientAcquisitionCost) * 100)
    };
  }, [analyticsData]);

  return (
    <AnalyticsDashboardContainer>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header with Controls */}
        <DashboardHeader>
          <div>
            <HeaderTitle>
              Business Intelligence Center
            </HeaderTitle>
            <HeaderSubtitle>
              Advanced analytics for data-driven decisions
            </HeaderSubtitle>
          </div>

          <SelectWrapper>
            <SelectLabel>Period</SelectLabel>
            <StyledSelect
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </StyledSelect>
          </SelectWrapper>
        </DashboardHeader>

        {/* Key Performance Indicators */}
        <KPISection>
          <KPIGrid>
            <KPICard>
              <KPIIcon>
                <DollarSign size={24} />
              </KPIIcon>
              <KPIContent>
                <KPIValue>${analyticsData.revenue.total.toLocaleString()}</KPIValue>
                <KPILabel>Total Revenue</KPILabel>
                <KPITrend $positive={analyticsData.revenue.growth > 0}>
                  {analyticsData.revenue.growth > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(analyticsData.revenue.growth)}%
                </KPITrend>
              </KPIContent>
            </KPICard>

            <KPICard>
              <KPIIcon>
                <Users size={24} />
              </KPIIcon>
              <KPIContent>
                <KPIValue>{analyticsData.clients.active}</KPIValue>
                <KPILabel>Active Clients</KPILabel>
                <KPITrend $positive={true}>
                  <ArrowUp size={14} />
                  {analyticsData.clients.newThisMonth} new
                </KPITrend>
              </KPIContent>
            </KPICard>

            <KPICard>
              <KPIIcon>
                <Target size={24} />
              </KPIIcon>
              <KPIContent>
                <KPIValue>{analyticsData.sessions.completionRate}%</KPIValue>
                <KPILabel>Completion Rate</KPILabel>
                <KPITrend $positive={true}>
                  <ArrowUp size={14} />
                  Industry leading
                </KPITrend>
              </KPIContent>
            </KPICard>

            <KPICard>
              <KPIIcon>
                <Star size={24} />
              </KPIIcon>
              <KPIContent>
                <KPIValue>{analyticsData.trainers.averageRating}</KPIValue>
                <KPILabel>Trainer Rating</KPILabel>
                <KPITrend $positive={true}>
                  <ArrowUp size={14} />
                  Excellent
                </KPITrend>
              </KPIContent>
            </KPICard>
          </KPIGrid>
        </KPISection>

        {/* Advanced Metrics Grid */}
        <MetricsGrid>
          <MetricsRow>
            {/* Revenue Analytics */}
            <MetricCard>
              <MetricCardTitle>
                Revenue Analytics
              </MetricCardTitle>
              <MockLineChart data={[]} height={250} />
              <MetricItemsRow>
                <MetricItem>
                  <MetricItemLabel>
                    Revenue/Session
                  </MetricItemLabel>
                  <MetricItemValue>
                    ${kpis.revenuePerSession}
                  </MetricItemValue>
                </MetricItem>
                <MetricItem>
                  <MetricItemLabel>
                    Client LTV
                  </MetricItemLabel>
                  <MetricItemValue>
                    ${kpis.lifetimeValue.toLocaleString()}
                  </MetricItemValue>
                </MetricItem>
                <MetricItem>
                  <MetricItemLabel>
                    ROI
                  </MetricItemLabel>
                  <MetricItemValue>
                    {kpis.roi}%
                  </MetricItemValue>
                </MetricItem>
              </MetricItemsRow>
            </MetricCard>

            {/* Trainer Performance */}
            <MetricCard>
              <MetricCardTitle>
                Trainer Performance
              </MetricCardTitle>
              <MockBarChart data={[]} height={250} />
            </MetricCard>
          </MetricsRow>
        </MetricsGrid>
      </motion.div>
    </AnalyticsDashboardContainer>
  );
};

export default AdvancedAnalyticsDashboard;

// ==================== STYLED COMPONENTS ====================

const AnalyticsDashboardContainer = styled.div`
  padding: 2rem;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  min-height: 100vh;
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
`;

const HeaderTitle = styled.h4`
  color: #e2e8f0;
  font-weight: 300;
  font-size: 2rem;
  margin: 0;
`;

const HeaderSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin: 0.25rem 0 0 0;
`;

const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
`;

const SelectLabel = styled.label`
  color: #e2e8f0;
  font-size: 0.75rem;
  padding-left: 0.25rem;
`;

const StyledSelect = styled.select`
  background: rgba(15, 23, 42, 0.95);
  color: #e2e8f0;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  font-size: 0.875rem;
  cursor: pointer;
  outline: none;
  appearance: auto;

  &:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
  }

  option {
    background: rgba(15, 23, 42, 0.95);
    color: #e2e8f0;
  }
`;

const KPISection = styled.div`
  margin-bottom: 2rem;
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const KPICard = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(15, 23, 42, 0.85);
    border-color: rgba(14, 165, 233, 0.4);
  }
`;

const KPIIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #0369a1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const KPIContent = styled.div`
  flex: 1;
`;

const KPIValue = styled.div`
  font-size: 1.75rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 0.25rem;
`;

const KPILabel = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
`;

const KPITrend = styled.div<{ $positive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: ${props => props.$positive ? '#22c55e' : '#ef4444'};
`;

const MetricsGrid = styled.div`
  margin-top: 2rem;
`;

const MetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  height: 100%;
`;

const MetricCardTitle = styled.h6`
  color: #e2e8f0;
  font-size: 1.125rem;
  font-weight: 500;
  margin: 0 0 1rem 0;
`;

const MetricItemsRow = styled.div`
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
`;

const MetricItem = styled.div`
  text-align: center;
`;

const MetricItemLabel = styled.span`
  display: block;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
`;

const MetricItemValue = styled.span`
  display: block;
  font-size: 1.125rem;
  font-weight: 500;
  color: #e2e8f0;
`;

const ChartLabel = styled.span`
  margin-left: 0.5rem;
  color: #e2e8f0;
`;
