/**
 * PRODUCTION-READY REVENUE ANALYTICS PANEL
 * ========================================
 * 
 * Real-time financial intelligence dashboard for SwanStudios admin command center
 * Connects to live Stripe API data with enterprise-grade performance
 * Built for high-stakes business review and operational oversight
 * 
 * 🔥 LIVE DATA INTEGRATION:
 * - Real-time Stripe revenue analytics
 * - Live transaction monitoring  
 * - Dynamic financial KPI calculations
 * - Professional business intelligence charts
 * 
 * 💫 PROFESSIONAL FEATURES:
 * - Executive-grade visual design
 * - Real-time data updates every 30 seconds
 * - Export capabilities for presentations
 * - Mobile-responsive professional layout
 * - Error handling for production reliability
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, TrendingUp, TrendingDown, Users, ShoppingBag,
  Calendar, Download, RefreshCw, Filter, Eye, BarChart3,
  PieChart, LineChart, Target, Award, AlertTriangle,
  CheckCircle, Clock, CreditCard, Zap, Star, Building,
  Globe, Briefcase, Activity, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  VictoryChart,
  VictoryArea,
  VictoryLine,
  VictoryAxis,
  VictoryPie,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryLegend,
} from 'victory';
import apiService from '../../../../../services/api.service';

// =====================================================
// STYLED COMPONENTS - EXECUTIVE GRADE DESIGN
// =====================================================

const cosmicPulse = keyframes`
  0% { box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent); }
  50% { box-shadow: 0 0 40px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 56%, transparent); }
  100% { box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent); }
`;

const dataFlow = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const AnalyticsContainer = styled(motion.div)`
  background:
    radial-gradient(circle at 88% 14%, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), transparent 36%),
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent) 0%,
      color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent) 100%
    );
  border-radius: 24px;
  padding: 2.5rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  backdrop-filter: blur(25px);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent-primary, #60C0F0), transparent);
    animation: ${dataFlow} 3s linear infinite;
  }
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
  gap: 1.5rem;
`;

const PanelTitle = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0) 0%, var(--accent-secondary, #8B5CF6) 58%, var(--accent-gold, #C6A84B) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 0 30px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
`;

const StatusIndicator = styled(motion.div)<{ status: 'live' | 'updating' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  
  ${props => props.status === 'live' && `
    background: color-mix(in srgb, var(--success, #10b981) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--success, #10b981) 30%, transparent);
    color: var(--success, #10b981);
  `}
  
  ${props => props.status === 'updating' && `
    background: color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 30%, transparent);
    color: var(--warning, #f59e0b);
  `}
  
  ${props => props.status === 'error' && `
    background: color-mix(in srgb, var(--danger, #ef4444) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 30%, transparent);
    color: var(--danger, #ef4444);
  `}
`;

const StatusDot = styled.div<{ $isLive: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  ${props => props.$isLive && css`
    animation: ${cosmicPulse} 2s infinite;
  `}
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const ActionButton = styled(motion.button)<{ $autoRefresh?: boolean }>`
  background: ${({ $autoRefresh }) => ($autoRefresh ? 'color-mix(in srgb, var(--success, #10b981) 12%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)')};
  border: 1px solid ${({ $autoRefresh }) => ($autoRefresh ? 'color-mix(in srgb, var(--success, #10b981) 30%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)')};
  border-radius: 12px;
  color: ${({ $autoRefresh }) => ($autoRefresh ? 'var(--success, #10b981)' : 'var(--accent-primary, #60C0F0)')};
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TimeRangeSelector = styled.select`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  }
  
  option {
    background: var(--bg-base, #0A0A0F);
    color: var(--text-primary, #E0ECF4);
  }
`;

// KPI Cards Grid
const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
`;

const KPICard = styled(motion.div)`
  background: linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent) 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent) 100%);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  }
`;

const KPIHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const KPIIcon = styled.div<{ color: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => `color-mix(in srgb, ${props.color} 16%, transparent)`};
  border: 1px solid ${props => `color-mix(in srgb, ${props.color} 30%, transparent)`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.color};
`;

const KPIValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  line-height: 1;
  margin-bottom: 0.5rem;
`;

const KPILabel = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const KPIChange = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isPositive'
})<{ isPositive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.isPositive ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)'};
`;

// Charts Container
const ChartsContainer = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2.5rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(motion.div)`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
`;

const ChartTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// Transactions Section
const TransactionsContainer = styled(motion.div)`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 16px;
  padding: 1.5rem;
`;

const TransactionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 66%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const LoadingTitle = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-size: 1.125rem;
  font-weight: 500;
`;

const LoadingSubtitle = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  font-size: 0.875rem;
`;

const ErrorTitle = styled.div`
  color: var(--danger, #ef4444);
  font-size: 1.25rem;
  font-weight: 600;
`;

const ErrorMessage = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  margin-bottom: 1.5rem;
`;

const LastUpdatedText = styled.div`
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  font-weight: 400;
`;

const TransactionDetails = styled.div`
  min-width: 0;
`;

const TransactionCustomer = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: var(--text-primary, #E0ECF4);
`;

const TransactionPackage = styled.div`
  font-size: 0.875rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  margin-bottom: 0.25rem;
`;

const TransactionDate = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

const TransactionAmountBlock = styled.div`
  text-align: right;
`;

const TransactionAmount = styled.div`
  color: var(--success, #10b981);
  font-weight: 700;
  font-size: 1.125rem;
  margin-bottom: 0.25rem;
`;

const TransactionStatus = styled.div<{ $completed: boolean }>`
  font-size: 0.875rem;
  color: ${({ $completed }) => ($completed ? 'var(--success, #10b981)' : 'var(--warning, #f59e0b)')};
  font-weight: 500;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
`;

const LoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-left: 4px solid var(--accent-primary, #60C0F0);
  border-radius: 50%;
`;

const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
`;

// =====================================================
// CHART CONFIGURATION
// =====================================================

const chartColors = {
  primary: '#60C0F0',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gradient: 'url(#colorGradient)'
};

const pieChartColors = ['#60C0F0', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const victoryTooltipProps = {
  flyoutStyle: { fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' },
  style: { fill: '#E0ECF4', fontFamily: "'Fira Code', monospace", fontSize: 10 },
};

const revenueAxisProps = {
  style: {
    axis: { stroke: 'rgba(96, 192, 240, 0.08)' },
    tickLabels: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace" },
    grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
  },
};

const revenueAreaProps = {
  style: {
    data: {
      fill: 'rgba(80, 160, 240, 0.15)',
      stroke: '#50A0F0',
      strokeWidth: 3,
    },
  },
};

const transactionLineProps = {
  style: {
    data: { stroke: '#C6A84B', strokeWidth: 2 },
  },
};

const packagePieProps = {
  style: {
    labels: { fill: '#E0ECF4', fontSize: 10, fontFamily: "'Sora', sans-serif" },
  },
};

const packageLegendProps = {
  style: {
    labels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Sora', sans-serif" },
  },
};

// =====================================================
// MAIN COMPONENT
// =====================================================

const RevenueAnalyticsPanel: React.FC = () => {
  // State Management
  const [revenueData, setRevenueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [status, setStatus] = useState<'live' | 'updating' | 'error'>('live');

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // =====================================================
  // API INTEGRATION
  // =====================================================

  const fetchRevenueData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
        setStatus('updating');
      }
      setError(null);

      // Call real backend analytics API
      const response = await apiService.get(`/api/admin/analytics/revenue?timeRange=${timeRange}`);
      const data = response.data;
      
      if (data.success) {
        setRevenueData(data.data);
        setLastUpdated(new Date());
        setStatus('live');
      } else {
        throw new Error(data.message || 'Failed to fetch revenue data');
      }
    } catch (err: any) {
      console.error('Revenue analytics fetch error:', err);
      setError(err.message || 'Failed to load revenue analytics');
      setStatus('error');
      
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // =====================================================
  // AUTO-REFRESH FUNCTIONALITY
  // =====================================================

  useEffect(() => {
    // Initial data fetch
    fetchRevenueData();

    // Set up auto-refresh
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchRevenueData(false); // Silent refresh
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchRevenueData, autoRefresh]);

  // Handle time range changes
  useEffect(() => {
    if (revenueData) {
      fetchRevenueData();
    }
  }, [timeRange]);

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleRefresh = () => {
    fetchRevenueData();
  };

  const handleExport = async () => {
    try {
      const response = await apiService.get(`/api/admin/finance/export?format=csv&timeRange=${timeRange}`, {
        responseType: 'blob'
      });

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  // =====================================================
  // RENDER LOADING STATE
  // =====================================================

  if (loading && !revenueData) {
    return (
      <AnalyticsContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <LoadingContainer>
          <LoadingSpinner
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <LoadingTitle>
            Loading Revenue Analytics...
          </LoadingTitle>
          <LoadingSubtitle>
            Connecting to real-time financial data
          </LoadingSubtitle>
        </LoadingContainer>
      </AnalyticsContainer>
    );
  }

  // =====================================================
  // RENDER ERROR STATE
  // =====================================================

  if (error && !revenueData) {
    return (
      <AnalyticsContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <ErrorContainer>
          <AlertTriangle size={48} color="var(--danger, #ef4444)" />
          <ErrorTitle>
            Failed to Load Revenue Analytics
          </ErrorTitle>
          <ErrorMessage>
            {error}
          </ErrorMessage>
          <ActionButton onClick={handleRefresh}>
            <RefreshCw size={16} />
            Retry Connection
          </ActionButton>
        </ErrorContainer>
      </AnalyticsContainer>
    );
  }

  // =====================================================
  // RENDER MAIN DASHBOARD
  // =====================================================

  return (
    <AnalyticsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header Section */}
      <PanelHeader>
        <div>
          <PanelTitle>
            <BarChart3 size={32} />
            Revenue Analytics
          </PanelTitle>
          <StatusIndicator
            status={status}
            animate={{ scale: status === 'live' ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 2, repeat: status === 'live' ? Infinity : 0 }}
          >
            <StatusDot $isLive={status === 'live'} />
            {status === 'live' && 'Live Data'}
            {status === 'updating' && 'Updating...'}
            {status === 'error' && 'Connection Error'}
          </StatusIndicator>
        </div>

        <ControlsContainer>
          <TimeRangeSelector
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </TimeRangeSelector>

          <ActionButton
            onClick={toggleAutoRefresh}
            $autoRefresh={autoRefresh}
          >
            <Activity size={16} />
            {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
          </ActionButton>

          <ActionButton onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </ActionButton>

          <ActionButton onClick={handleExport}>
            <Download size={16} />
            Export
          </ActionButton>
        </ControlsContainer>
      </PanelHeader>

      {/* KPI Cards Grid */}
      {revenueData && (
        <KPIGrid>
          {/* Total Revenue */}
          <KPICard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <KPIHeader>
              <KPIIcon color="var(--accent-primary, #60C0F0)">
                <DollarSign size={24} />
              </KPIIcon>
              <KPIChange isPositive={revenueData.changes.revenue > 0}>
                {revenueData.changes.revenue > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(revenueData.changes.revenue)}%
              </KPIChange>
            </KPIHeader>
            <KPIValue>${revenueData.overview.totalRevenue.toLocaleString()}</KPIValue>
            <KPILabel>Total Revenue</KPILabel>
          </KPICard>

          {/* Monthly Recurring Revenue */}
          <KPICard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
          >
            <KPIHeader>
              <KPIIcon color="var(--accent-secondary, #8B5CF6)">
                <TrendingUp size={24} />
              </KPIIcon>
              <KPIChange isPositive={revenueData.changes.customers > 0}>
                {revenueData.changes.customers > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(revenueData.changes.customers)}%
              </KPIChange>
            </KPIHeader>
            <KPIValue>${revenueData.overview.monthlyRecurring.toLocaleString()}</KPIValue>
            <KPILabel>Monthly Recurring</KPILabel>
          </KPICard>

          {/* Average Transaction */}
          <KPICard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <KPIHeader>
              <KPIIcon color="var(--success, #10b981)">
                <CreditCard size={24} />
              </KPIIcon>
              <KPIChange isPositive={revenueData.changes.transactions > 0}>
                {revenueData.changes.transactions > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(revenueData.changes.transactions)}%
              </KPIChange>
            </KPIHeader>
            <KPIValue>${revenueData.overview.averageTransaction}</KPIValue>
            <KPILabel>Avg Transaction</KPILabel>
          </KPICard>

          {/* Total Customers */}
          <KPICard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
          >
            <KPIHeader>
              <KPIIcon color="var(--warning, #f59e0b)">
                <Users size={24} />
              </KPIIcon>
              <KPIChange isPositive={revenueData.changes.conversion > 0}>
                {revenueData.changes.conversion > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {Math.abs(revenueData.changes.conversion)}%
              </KPIChange>
            </KPIHeader>
            <KPIValue>{revenueData.overview.totalCustomers.toLocaleString()}</KPIValue>
            <KPILabel>Total Customers</KPILabel>
          </KPICard>
        </KPIGrid>
      )}

      {/* Charts Section */}
      {revenueData && (
        <ChartsContainer>
          {/* Revenue Trend Chart */}
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <ChartTitle>
              <LineChart size={20} />
              Revenue Trend
            </ChartTitle>
            <VictoryChart
              height={350}
              padding={{ top: 20, bottom: 50, left: 70, right: 70 }}
              animate={{ duration: 800, easing: 'cubicInOut' }}
              containerComponent={
                <VictoryVoronoiContainer
                  labels={({ datum }) => `${datum.month}\nRevenue: $${datum.revenue?.toLocaleString()}\nTransactions: ${datum.transactions}`}
                  labelComponent={
                    <VictoryTooltip
                      {...victoryTooltipProps}
                      cornerRadius={8}
                    />
                  }
                />
              }
            >
              <VictoryAxis
                tickFormat={(t: string) => t}
                {...revenueAxisProps}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                {...revenueAxisProps}
              />
              <VictoryArea
                data={revenueData.revenueHistory}
                x="month"
                y="revenue"
                {...revenueAreaProps}
              />
              <VictoryLine
                data={revenueData.revenueHistory}
                x="month"
                y="transactions"
                {...transactionLineProps}
              />
            </VictoryChart>
          </ChartCard>

          {/* Top Packages Chart */}
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <ChartTitle>
              <PieChart size={20} />
              Revenue by Package
            </ChartTitle>
            <VictoryPie
              data={revenueData.topPackages}
              x="name"
              y="revenue"
              innerRadius={60}
              padAngle={3}
              colorScale={pieChartColors}
              animate={{ duration: 800, easing: 'cubicInOut' }}
              height={280}
              labels={({ datum }) => datum.name}
              labelComponent={
                <VictoryTooltip
                  {...victoryTooltipProps}
                  cornerRadius={8}
                />
              }
              {...packagePieProps}
            />
            <VictoryLegend
              orientation="horizontal"
              gutter={16}
              height={60}
              {...packageLegendProps}
              colorScale={pieChartColors}
              data={revenueData.topPackages.map((pkg: any) => ({ name: pkg.name }))}
            />
          </ChartCard>
        </ChartsContainer>
      )}

      {/* Recent High-Value Transactions */}
      {revenueData && revenueData.recentTransactions.length > 0 && (
        <TransactionsContainer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
            <ChartTitle>
              <Clock size={20} />
              Recent High-Value Transactions
            <LastUpdatedText>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </LastUpdatedText>
            </ChartTitle>
          
          {revenueData.recentTransactions.slice(0, 5).map((transaction: any, index: number) => (
            <TransactionItem key={transaction.id}>
              <TransactionDetails>
                <TransactionCustomer>
                  {transaction.customer?.name || 'Unknown Customer'}
                </TransactionCustomer>
                <TransactionPackage>
                  {transaction.package}
                </TransactionPackage>
                <TransactionDate>
                  {new Date(transaction.date).toLocaleString()}
                </TransactionDate>
              </TransactionDetails>
              <TransactionAmountBlock>
                <TransactionAmount>
                  ${transaction.amount.toLocaleString()}
                </TransactionAmount>
                <TransactionStatus $completed={transaction.status === 'Completed'}>
                  {transaction.status}
                </TransactionStatus>
              </TransactionAmountBlock>
            </TransactionItem>
          ))}
        </TransactionsContainer>
      )}
    </AnalyticsContainer>
  );
};

export default RevenueAnalyticsPanel;
