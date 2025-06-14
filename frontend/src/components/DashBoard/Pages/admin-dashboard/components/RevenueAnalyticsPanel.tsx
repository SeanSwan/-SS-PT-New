/**
 * RevenueAnalyticsPanel.tsx - SwanStudios Financial Intelligence Dashboard
 * ========================================================================
 * Comprehensive revenue analytics and business intelligence component
 * Real-time financial monitoring for admin command center
 * 
 * Features:
 * - Real-time revenue tracking and analytics
 * - Interactive charts and data visualization
 * - Financial KPI monitoring
 * - Transaction insights and trends
 * - Customer analytics integration
 * - Export capabilities for reporting
 * 
 * Master Prompt v28 Alignment:
 * - Revolutionary financial intelligence interface
 * - Galaxy-themed professional aesthetics
 * - Performance-optimized data visualization
 * - Production-ready error handling
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../../context/AuthContext';
import {
  DollarSign, TrendingUp, TrendingDown, Users, ShoppingBag,
  Calendar, Download, RefreshCw, Filter, Eye, BarChart3,
  PieChart, LineChart, Target, Award, AlertTriangle,
  CheckCircle, Clock, CreditCard
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
  Legend
} from 'recharts';

// Styled Components
const cosmicPulse = keyframes`
  0% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
`;

const AnalyticsContainer = styled(motion.div)`
  background: linear-gradient(135deg, rgba(10, 10, 26, 0.9) 0%, rgba(30, 58, 138, 0.1) 100%);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PanelTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 600;
  background: linear-gradient(135deg, #00ffff, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const TimeRangeSelector = styled.select`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
    animation: ${cosmicPulse} 2s infinite;
  }
  
  option {
    background: #1e3a8a;
    color: white;
  }
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(0, 255, 255, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(0, 255, 255, 0.2));
    border-color: rgba(59, 130, 246, 0.6);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const MetricCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.3);
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
    height: 4px;
    background: ${props => props.accentColor || 'linear-gradient(135deg, #00ffff, #3b82f6)'};
  }
`;

const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const MetricInfo = styled.div`
  flex: 1;
`;

const MetricLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
`;

const MetricValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.color || '#00ffff'};
  margin-bottom: 0.5rem;
`;

const MetricChange = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: ${props => {
    if (props.type === 'increase') return '#10b981';
    if (props.type === 'decrease') return '#ef4444';
    return '#6b7280';
  }};
`;

const MetricIcon = styled.div`
  background: ${props => props.color || 'rgba(0, 255, 255, 0.2)'};
  border-radius: 12px;
  padding: 1rem;
  color: ${props => props.color || '#00ffff'};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ChartsContainer = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  min-height: 400px;
`;

const ChartTitle = styled.h3`
  color: #00ffff;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TransactionsContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
`;

const TransactionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: #ef4444;
  text-align: center;
  margin: 1rem 0;
`;

// Interface definitions
interface FinancialMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
  format: 'currency' | 'number' | 'percentage';
}

interface RevenueData {
  overview: {
    totalRevenue: number;
    revenueChange: number;
    transactionCount: number;
    averageOrderValue: number;
    newCustomers: number;
  };
  dailyTrend: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
  topPackages: Array<{
    id: number;
    name: string;
    revenue: number;
    soldCount: number;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    date: string;
    customer: {
      name: string;
      email: string;
    };
    status: string;
  }>;
}

// Color schemes for charts
const chartColors = {
  primary: '#00ffff',
  secondary: '#3b82f6',
  tertiary: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444'
};

const pieChartColors = ['#00ffff', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b'];

const RevenueAnalyticsPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch financial data
  const fetchFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authAxios.get(`/api/admin/finance/overview?timeRange=${timeRange}`);

      if (response.data.success) {
        setRevenueData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load financial data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [authAxios, timeRange]);

  // Initial data load
  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchFinancialData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, fetchFinancialData]);

  // Handle time range change
  const handleTimeRangeChange = (newTimeRange: string) => {
    setTimeRange(newTimeRange);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await authAxios.get(`/api/admin/finance/export?format=csv&timeRange=${timeRange}`);
      
      // Create and download CSV file
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `swanstudios-revenue-${timeRange}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Create metrics array
  const metrics: FinancialMetric[] = revenueData ? [
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      value: revenueData.overview.totalRevenue,
      change: revenueData.overview.revenueChange,
      changeType: revenueData.overview.revenueChange >= 0 ? 'increase' : 'decrease',
      icon: <DollarSign size={24} />,
      color: '#10b981',
      format: 'currency'
    },
    {
      id: 'transactions',
      title: 'Transactions',
      value: revenueData.overview.transactionCount,
      change: 0, // Would be calculated from previous period
      changeType: 'neutral',
      icon: <CreditCard size={24} />,
      color: '#3b82f6',
      format: 'number'
    },
    {
      id: 'avg-order',
      title: 'Avg Order Value',
      value: revenueData.overview.averageOrderValue,
      change: 0, // Would be calculated from previous period
      changeType: 'neutral',
      icon: <ShoppingBag size={24} />,
      color: '#0ea5e9',
      format: 'currency'
    },
    {
      id: 'new-customers',
      title: 'New Customers',
      value: revenueData.overview.newCustomers,
      change: 0, // Would be calculated from previous period
      changeType: 'neutral',
      icon: <Users size={24} />,
      color: '#f59e0b',
      format: 'number'
    }
  ] : [];

  if (loading && !revenueData) {
    return (
      <AnalyticsContainer>
        <LoadingSpinner />
        <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
          Loading financial analytics...
        </div>
      </AnalyticsContainer>
    );
  }

  if (error) {
    return (
      <AnalyticsContainer>
        <ErrorMessage>
          <AlertTriangle size={20} style={{ marginRight: '0.5rem' }} />
          {error}
        </ErrorMessage>
        <ActionButton onClick={fetchFinancialData}>
          <RefreshCw size={16} />
          Retry
        </ActionButton>
      </AnalyticsContainer>
    );
  }

  return (
    <AnalyticsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header Controls */}
      <PanelHeader>
        <PanelTitle>
          <BarChart3 size={24} />
          Revenue Analytics
        </PanelTitle>
        
        <ControlsContainer>
          <TimeRangeSelector
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </TimeRangeSelector>
          
          <ActionButton
            onClick={fetchFinancialData}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </ActionButton>
          
          <ActionButton
            onClick={handleExport}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={16} />
            Export
          </ActionButton>
          
          <ActionButton
            onClick={() => setAutoRefresh(!autoRefresh)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: autoRefresh 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(0, 255, 255, 0.1))'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(0, 255, 255, 0.1))'
            }}
          >
            <Eye size={16} />
            {autoRefresh ? 'Live' : 'Manual'}
          </ActionButton>
        </ControlsContainer>
      </PanelHeader>

      {/* Key Metrics */}
      <MetricsGrid>
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.id}
            accentColor={metric.color}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -4 }}
          >
            <MetricHeader>
              <MetricInfo>
                <MetricLabel>{metric.title}</MetricLabel>
                <MetricValue color={metric.color}>
                  {metric.format === 'currency' && '$'}
                  {typeof metric.value === 'number' 
                    ? metric.value.toLocaleString() 
                    : metric.value}
                  {metric.format === 'percentage' && '%'}
                </MetricValue>
                <MetricChange type={metric.changeType}>
                  {metric.changeType === 'increase' && <TrendingUp size={16} />}
                  {metric.changeType === 'decrease' && <TrendingDown size={16} />}
                  {metric.change !== 0 && (
                    <span>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                    </span>
                  )}
                </MetricChange>
              </MetricInfo>
              <MetricIcon color={metric.color}>
                {metric.icon}
              </MetricIcon>
            </MetricHeader>
          </MetricCard>
        ))}
      </MetricsGrid>

      {/* Charts */}
      {revenueData && (
        <ChartsContainer>
          {/* Revenue Trend Chart */}
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <ChartTitle>
              <LineChart size={20} />
              Revenue Trend
            </ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <ReLineChart data={revenueData.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255, 255, 255, 0.7)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="rgba(255, 255, 255, 0.7)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(30, 58, 138, 0.9)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? `$${value.toLocaleString()}` : value,
                    name === 'revenue' ? 'Revenue' : 'Transactions'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={chartColors.primary}
                  strokeWidth={3}
                  dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
                />
              </ReLineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top Packages Chart */}
          <ChartCard
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <ChartTitle>
              <PieChart size={20} />
              Top Packages
            </ChartTitle>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={revenueData.topPackages}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="revenue"
                  nameKey="name"
                >
                  {revenueData.topPackages.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
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

      {/* Recent Transactions */}
      {revenueData && revenueData.recentTransactions.length > 0 && (
        <TransactionsContainer>
          <ChartTitle>
            <Clock size={20} />
            Recent High-Value Transactions
          </ChartTitle>
          {revenueData.recentTransactions.slice(0, 5).map((transaction, index) => (
            <TransactionItem key={transaction.id}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                  {transaction.customer?.name || 'Unknown Customer'}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {new Date(transaction.date).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#10b981', fontWeight: 600 }}>
                  ${transaction.amount.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
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