/**
 * PRODUCTION-READY REVENUE ANALYTICS PANEL
 * ========================================
 * 
 * Real-time financial intelligence dashboard for SwanStudios admin command center
 * Connects to live Stripe API data with enterprise-grade performance
 * Built for high-stakes business presentations and investor demos
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
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import DemoDataBanner from './DemoDataBanner';
import {
  DollarSign, TrendingUp, TrendingDown, Users, ShoppingBag,
  Calendar, Download, RefreshCw, Filter, Eye, BarChart3,
  PieChart, LineChart, Target, Award, AlertTriangle,
  CheckCircle, Clock, CreditCard, Zap, Star, Building,
  Globe, Briefcase, Activity, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart
} from 'recharts';

// =====================================================
// STYLED COMPONENTS - EXECUTIVE GRADE DESIGN
// =====================================================

const cosmicPulse = keyframes`
  0% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
`;

const dataFlow = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const AnalyticsContainer = styled(motion.div)`
  background: linear-gradient(135deg, 
    rgba(10, 10, 26, 0.95) 0%, 
    rgba(30, 58, 138, 0.1) 50%,
    rgba(14, 165, 233, 0.05) 100%
  );
  border-radius: 24px;
  padding: 2.5rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
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
    background: linear-gradient(90deg, transparent, #00ffff, transparent);
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
  background: linear-gradient(135deg, #00ffff 0%, #3b82f6 50%, #1e3a8a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
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
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
  `}
  
  ${props => props.status === 'updating' && `
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: #f59e0b;
  `}
  
  ${props => props.status === 'error' && `
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
  `}
`;

const StatusDot = styled.div<{ $isLive: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  animation: ${props => props.$isLive ? `${cosmicPulse} 2s infinite` : 'none'};
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const ActionButton = styled(motion.button)`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  color: #3b82f6;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TimeRangeSelector = styled.select`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  color: #ffffff;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
  
  option {
    background: #1e3a8a;
    color: white;
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
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 58, 138, 0.1) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
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
    background: linear-gradient(90deg, #00ffff, #3b82f6);
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
  background: ${props => props.color}15;
  border: 1px solid ${props => props.color}30;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.color};
`;

const KPIValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  margin-bottom: 0.5rem;
`;

const KPILabel = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const KPIChange = styled.div<{ isPositive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.isPositive ? '#10b981' : '#ef4444'};
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
  background: rgba(30, 58, 138, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
`;

const ChartTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// Transactions Section
const TransactionsContainer = styled(motion.div)`
  background: rgba(30, 58, 138, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
`;

const TransactionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.2);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
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
  border: 4px solid rgba(59, 130, 246, 0.2);
  border-left: 4px solid #3b82f6;
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
  primary: '#00ffff',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gradient: 'url(#colorGradient)'
};

const pieChartColors = ['#00ffff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
  const [isDemoData, setIsDemoData] = useState(false);

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
      const response = await fetch(`/api/admin/analytics/revenue?timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRevenueData(data.data);
        setLastUpdated(new Date());
        setStatus('live');
        setIsDemoData(false);
      } else {
        throw new Error(data.message || 'Failed to fetch revenue data');
      }
    } catch (err: any) {
      console.error('Revenue analytics fetch error:', err);
      setError(err.message || 'Failed to load revenue analytics');
      setStatus('error');
      
      // Fallback to demo data — flag it so the banner shows
      setRevenueData(generateDemoData());
      setIsDemoData(true);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Generate impressive demo data for presentations
  const generateDemoData = useCallback(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Generate realistic revenue progression
    const revenueHistory = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date(currentYear, currentMonth - i, 1);
      const baseRevenue = 45000 + (Math.random() * 25000);
      const growth = Math.pow(1.15, (12 - i) / 12); // 15% annual growth
      
      revenueHistory.push({
        date: month.toISOString().split('T')[0],
        revenue: Math.round(baseRevenue * growth),
        transactions: Math.round((baseRevenue * growth) / 150), // Average transaction $150
        customers: Math.round((baseRevenue * growth) / 300), // Average customer value $300
        month: month.toLocaleString('default', { month: 'short' })
      });
    }

    return {
      overview: {
        totalRevenue: 847500,
        monthlyRecurring: 125400,
        averageTransaction: 185,
        totalCustomers: 2847,
        conversionRate: 3.2,
        customerLifetimeValue: 2850
      },
      changes: {
        revenue: 24.8,
        transactions: 18.5,
        customers: 15.2,
        conversion: 8.9
      },
      revenueHistory,
      topPackages: [
        { name: 'Premium Training', revenue: 245000, percentage: 35.2 },
        { name: 'Elite Coaching', revenue: 180000, percentage: 25.8 },
        { name: 'Nutrition Plans', revenue: 125000, percentage: 18.0 },
        { name: 'Group Sessions', revenue: 95000, percentage: 13.6 },
        { name: 'Supplements', revenue: 52500, percentage: 7.4 }
      ],
      recentTransactions: [
        {
          id: 'txn_001',
          customer: { name: 'Marcus Johnson', email: 'marcus@example.com' },
          amount: 2500,
          date: new Date(Date.now() - 3600000).toISOString(),
          status: 'Completed',
          package: 'Elite Annual Plan'
        },
        {
          id: 'txn_002',
          customer: { name: 'Sarah Williams', email: 'sarah@example.com' },
          amount: 1850,
          date: new Date(Date.now() - 7200000).toISOString(),
          status: 'Completed',
          package: 'Premium Quarterly'
        },
        {
          id: 'txn_003',
          customer: { name: 'David Chen', email: 'david@example.com' },
          amount: 950,
          date: new Date(Date.now() - 10800000).toISOString(),
          status: 'Processing',
          package: 'Nutrition + Training'
        },
        {
          id: 'txn_004',
          customer: { name: 'Jennifer Davis', email: 'jennifer@example.com' },
          amount: 750,
          date: new Date(Date.now() - 14400000).toISOString(),
          status: 'Completed',
          package: 'Monthly Premium'
        },
        {
          id: 'txn_005',
          customer: { name: 'Michael Brown', email: 'michael@example.com' },
          amount: 1200,
          date: new Date(Date.now() - 18000000).toISOString(),
          status: 'Completed',
          package: 'Group Training'
        }
      ]
    };
  }, []);

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
      const response = await fetch(`/api/admin/finance/export?format=csv&timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
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
          <div style={{ color: '#3b82f6', fontSize: '1.125rem', fontWeight: 500 }}>
            Loading Revenue Analytics...
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
            Connecting to real-time financial data
          </div>
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
          <AlertTriangle size={48} color="#ef4444" />
          <div style={{ color: '#ef4444', fontSize: '1.25rem', fontWeight: 600 }}>
            Failed to Load Revenue Analytics
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>
            {error}
          </div>
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
            style={{
              background: autoRefresh ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              borderColor: autoRefresh ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)',
              color: autoRefresh ? '#10b981' : '#3b82f6'
            }}
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

      {isDemoData && <DemoDataBanner />}

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
              <KPIIcon color="#00ffff">
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
              <KPIIcon color="#3b82f6">
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
              <KPIIcon color="#10b981">
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
              <KPIIcon color="#f59e0b">
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
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={revenueData.revenueHistory}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="month" 
                  stroke="rgba(255, 255, 255, 0.7)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="rgba(255, 255, 255, 0.7)"
                  fontSize={12}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(30, 58, 138, 0.9)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={((value: any, name: string) => [
                    name === 'revenue' ? `$${value.toLocaleString()}` : String(value),
                    name === 'revenue' ? 'Revenue' : 'Transactions'
                  ]) as any}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  fill="url(#colorGradient)"
                  stroke="#00ffff"
                  strokeWidth={3}
                />
                <Line 
                  type="monotone" 
                  dataKey="transactions" 
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={350}>
              <RePieChart>
                <Pie
                  data={revenueData.topPackages}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="revenue"
                  nameKey="name"
                >
                  {revenueData.topPackages.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={pieChartColors[index % pieChartColors.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(30, 58, 138, 0.9)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Legend 
                  wrapperStyle={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                />
              </RePieChart>
            </ResponsiveContainer>
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
            <div style={{ 
              marginLeft: 'auto', 
              fontSize: '0.875rem', 
              color: 'rgba(255, 255, 255, 0.6)',
              fontWeight: 400
            }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </ChartTitle>
          
          {revenueData.recentTransactions.slice(0, 5).map((transaction: any, index: number) => (
            <TransactionItem key={transaction.id}>
              <div>
                <div style={{ 
                  fontWeight: 600, 
                  marginBottom: '0.25rem',
                  color: '#ffffff'
                }}>
                  {transaction.customer?.name || 'Unknown Customer'}
                </div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginBottom: '0.25rem'
                }}>
                  {transaction.package}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  {new Date(transaction.date).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  color: '#10b981', 
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  marginBottom: '0.25rem'
                }}>
                  ${transaction.amount.toLocaleString()}
                </div>
                <div style={{ 
                  fontSize: '0.875rem',
                  color: transaction.status === 'Completed' ? '#10b981' : '#f59e0b',
                  fontWeight: 500
                }}>
                  {transaction.status}
                </div>
              </div>
            </TransactionItem>
          ))}
        </TransactionsContainer>
      )}
    </AnalyticsContainer>
  );
};

export default RevenueAnalyticsPanel;
