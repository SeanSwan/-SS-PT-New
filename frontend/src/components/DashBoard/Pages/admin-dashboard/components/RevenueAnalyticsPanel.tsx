import React, { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../../../../../services/api.service';
import {
  ErrorState,
  HeaderSection,
  KPISection,
  LoadingState,
  RevenueChartsSection,
  TransactionsSection,
} from './RevenueAnalyticsPanel.sections';
import { AnalyticsContainer } from './RevenueAnalyticsPanel.styles';
import type { RevenueAnalyticsData, RevenueStatus } from './RevenueAnalyticsPanel.types';

const RevenueAnalyticsPanel: React.FC = () => {
  const [revenueData, setRevenueData] = useState<RevenueAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [status, setStatus] = useState<RevenueStatus>('live');

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRevenueData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
        setStatus('updating');
      }
      setError(null);

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

  useEffect(() => {
    fetchRevenueData();

    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchRevenueData(false);
      }, 30000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchRevenueData, autoRefresh]);

  const handleRefresh = () => {
    fetchRevenueData();
  };

  const handleExport = async () => {
    let url: string | null = null;
    let anchor: HTMLAnchorElement | null = null;

    try {
      const response = await apiService.get(`/api/admin/finance/export?format=csv&timeRange=${timeRange}`, {
        responseType: 'blob'
      });

      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'text/csv' });
      url = window.URL.createObjectURL(blob);
      anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `revenue-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
    } catch (exportError) {
      console.error('Export failed:', exportError);
    } finally {
      if (url) {
        window.URL.revokeObjectURL(url);
      }
      if (anchor?.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh((current) => !current);
  };

  if (loading && !revenueData) {
    return (
      <AnalyticsContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <LoadingState />
      </AnalyticsContainer>
    );
  }

  if (error && !revenueData) {
    return (
      <AnalyticsContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <ErrorState error={error} onRetry={handleRefresh} />
      </AnalyticsContainer>
    );
  }

  return (
    <AnalyticsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <HeaderSection
        autoRefresh={autoRefresh}
        loading={loading}
        status={status}
        timeRange={timeRange}
        onAutoRefreshToggle={toggleAutoRefresh}
        onExport={handleExport}
        onRefresh={handleRefresh}
        onTimeRangeChange={setTimeRange}
      />

      {revenueData && <KPISection data={revenueData} />}
      {revenueData && <RevenueChartsSection data={revenueData} />}
      {revenueData?.recentTransactions.length ? (
        <TransactionsSection data={revenueData} lastUpdated={lastUpdated} />
      ) : null}
    </AnalyticsContainer>
  );
};

export default RevenueAnalyticsPanel;
