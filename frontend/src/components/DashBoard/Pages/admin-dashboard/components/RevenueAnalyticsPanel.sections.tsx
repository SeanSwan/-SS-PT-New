import React from 'react';
import {
  AlertTriangle, Activity, ArrowDown, ArrowUp, BarChart3, Clock, CreditCard,
  DollarSign, Download, LineChart, PieChart, RefreshCw, TrendingUp, Users,
} from 'lucide-react';
import {
  VictoryArea, VictoryAxis, VictoryChart, VictoryLegend, VictoryLine,
  VictoryPie, VictoryTooltip, VictoryVoronoiContainer,
} from 'victory';
import {
  packageLegendProps, packagePieProps, pieChartColors, revenueAreaProps,
  revenueAxisProps, transactionLineProps, victoryTooltipProps,
} from './RevenueAnalyticsPanel.chartConfig';
import {
  ErrorContainer, ErrorMessage, ErrorTitle, LastUpdatedText, LoadingContainer,
  LoadingSpinner, LoadingSubtitle, LoadingTitle, TransactionAmount,
  TransactionAmountBlock, TransactionCustomer, TransactionDate,
  TransactionDetails, TransactionItem, TransactionPackage, TransactionStatus,
} from './RevenueAnalyticsPanel.feedbackStyles';
import {
  ActionButton, ChartCard, ChartsContainer, ChartTitle, ControlsContainer,
  KPICard, KPIChange, KPIGrid, KPIHeader, KPIIcon, KPILabel, KPIValue,
  PanelHeader, PanelTitle, StatusDot, StatusIndicator, TimeRangeSelector,
  TransactionsContainer,
} from './RevenueAnalyticsPanel.styles';
import type { RevenueAnalyticsData, RevenueStatus, RevenueTransaction } from './RevenueAnalyticsPanel.types';

interface HeaderSectionProps {
  autoRefresh: boolean;
  loading: boolean;
  status: RevenueStatus;
  timeRange: string;
  onAutoRefreshToggle: () => void;
  onExport: () => void;
  onRefresh: () => void;
  onTimeRangeChange: (value: string) => void;
}

interface RevenueDataProps {
  data: RevenueAnalyticsData;
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

interface TransactionsSectionProps extends RevenueDataProps {
  lastUpdated: Date;
}

const kpis = [
  {
    label: 'Total Revenue',
    icon: DollarSign,
    tone: 'var(--accent-primary, #60C0F0)',
    delay: 0.1,
    value: (data: RevenueAnalyticsData) => `$${data.overview.totalRevenue.toLocaleString()}`,
    change: (data: RevenueAnalyticsData) => data.changes.revenue,
  },
  {
    label: 'Monthly Recurring',
    icon: TrendingUp,
    tone: 'var(--accent-secondary, #8B5CF6)',
    delay: 0.2,
    value: (data: RevenueAnalyticsData) => `$${data.overview.monthlyRecurring.toLocaleString()}`,
    change: (data: RevenueAnalyticsData) => data.changes.customers,
  },
  {
    label: 'Avg Transaction',
    icon: CreditCard,
    tone: 'var(--success, #10b981)',
    delay: 0.3,
    value: (data: RevenueAnalyticsData) => `$${data.overview.averageTransaction}`,
    change: (data: RevenueAnalyticsData) => data.changes.transactions,
  },
  {
    label: 'Total Customers',
    icon: Users,
    tone: 'var(--warning, #f59e0b)',
    delay: 0.4,
    value: (data: RevenueAnalyticsData) => data.overview.totalCustomers.toLocaleString(),
    change: (data: RevenueAnalyticsData) => data.changes.conversion,
  },
];

const renderStatusText = (status: RevenueStatus) => {
  if (status === 'updating') return 'Updating...';
  if (status === 'error') return 'Connection Error';
  return 'Live Data';
};

export const LoadingState = () => (
  <LoadingContainer>
    <LoadingSpinner
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
    <LoadingTitle>Loading Revenue Analytics...</LoadingTitle>
    <LoadingSubtitle>Connecting to real-time financial data</LoadingSubtitle>
  </LoadingContainer>
);

export const ErrorState = ({ error, onRetry }: ErrorStateProps) => (
  <ErrorContainer>
    <AlertTriangle size={48} color="var(--danger, #ef4444)" />
    <ErrorTitle>Failed to Load Revenue Analytics</ErrorTitle>
    <ErrorMessage>{error}</ErrorMessage>
    <ActionButton onClick={onRetry}>
      <RefreshCw size={16} />
      Retry Connection
    </ActionButton>
  </ErrorContainer>
);

export const HeaderSection = ({
  autoRefresh,
  loading,
  status,
  timeRange,
  onAutoRefreshToggle,
  onExport,
  onRefresh,
  onTimeRangeChange,
}: HeaderSectionProps) => (
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
        {renderStatusText(status)}
      </StatusIndicator>
    </div>

    <ControlsContainer>
      <TimeRangeSelector value={timeRange} onChange={(event) => onTimeRangeChange(event.target.value)}>
        <option value="24h">Last 24 Hours</option>
        <option value="7d">Last 7 Days</option>
        <option value="30d">Last 30 Days</option>
        <option value="90d">Last 90 Days</option>
        <option value="1y">Last Year</option>
      </TimeRangeSelector>
      <ActionButton onClick={onAutoRefreshToggle} $autoRefresh={autoRefresh}>
        <Activity size={16} />
        {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
      </ActionButton>
      <ActionButton onClick={onRefresh} disabled={loading}>
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        Refresh
      </ActionButton>
      <ActionButton onClick={onExport}>
        <Download size={16} />
        Export
      </ActionButton>
    </ControlsContainer>
  </PanelHeader>
);

export const KPISection = ({ data }: RevenueDataProps) => (
  <KPIGrid>
    {kpis.map(({ label, icon: Icon, tone, delay, value, change }) => {
      const currentChange = change(data);
      const isPositive = currentChange > 0;
      return (
        <KPICard
          key={label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay }}
          whileHover={{ scale: 1.02 }}
        >
          <KPIHeader>
            <KPIIcon $tone={tone}>
              <Icon size={24} />
            </KPIIcon>
            <KPIChange isPositive={isPositive}>
              {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              {Math.abs(currentChange)}%
            </KPIChange>
          </KPIHeader>
          <KPIValue>{value(data)}</KPIValue>
          <KPILabel>{label}</KPILabel>
        </KPICard>
      );
    })}
  </KPIGrid>
);

export const RevenueChartsSection = ({ data }: RevenueDataProps) => (
  <ChartsContainer>
    <ChartCard initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
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
            labelComponent={<VictoryTooltip {...victoryTooltipProps} cornerRadius={8} />}
          />
        }
      >
        <VictoryAxis tickFormat={(tick: string) => tick} {...revenueAxisProps} />
        <VictoryAxis dependentAxis tickFormat={(value: number) => `$${(value / 1000).toFixed(0)}k`} {...revenueAxisProps} />
        <VictoryArea data={data.revenueHistory} x="month" y="revenue" {...revenueAreaProps} />
        <VictoryLine data={data.revenueHistory} x="month" y="transactions" {...transactionLineProps} />
      </VictoryChart>
    </ChartCard>

    <ChartCard initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.6 }}>
      <ChartTitle>
        <PieChart size={20} />
        Revenue by Package
      </ChartTitle>
      <VictoryPie
        data={data.topPackages}
        x="name"
        y="revenue"
        innerRadius={60}
        padAngle={3}
        colorScale={pieChartColors}
        animate={{ duration: 800, easing: 'cubicInOut' }}
        height={280}
        labels={({ datum }) => datum.name}
        labelComponent={<VictoryTooltip {...victoryTooltipProps} cornerRadius={8} />}
        {...packagePieProps}
      />
      <VictoryLegend
        orientation="horizontal"
        gutter={16}
        height={60}
        {...packageLegendProps}
        colorScale={pieChartColors}
        data={data.topPackages.map((pkg) => ({ name: pkg.name }))}
      />
    </ChartCard>
  </ChartsContainer>
);

const renderTransaction = (transaction: RevenueTransaction) => (
  <TransactionItem key={transaction.id}>
    <TransactionDetails>
      <TransactionCustomer>{transaction.customer?.name || 'Unknown Customer'}</TransactionCustomer>
      <TransactionPackage>{transaction.package}</TransactionPackage>
      <TransactionDate>{new Date(transaction.date).toLocaleString()}</TransactionDate>
    </TransactionDetails>
    <TransactionAmountBlock>
      <TransactionAmount>${transaction.amount.toLocaleString()}</TransactionAmount>
      <TransactionStatus $completed={transaction.status === 'Completed'}>{transaction.status}</TransactionStatus>
    </TransactionAmountBlock>
  </TransactionItem>
);

export const TransactionsSection = ({ data, lastUpdated }: TransactionsSectionProps) => (
  <TransactionsContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
    <ChartTitle>
      <Clock size={20} />
      Recent High-Value Transactions
      <LastUpdatedText>Last updated: {lastUpdated.toLocaleTimeString()}</LastUpdatedText>
    </ChartTitle>
    {data.recentTransactions.slice(0, 5).map(renderTransaction)}
  </TransactionsContainer>
);
