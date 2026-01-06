import React from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { AdminDashboardMetric } from './AdminOverview.types';
import { MetricCommandCard, MetricGrid, ChartContainer } from './AdminOverview.styles';

interface AdminOverviewMetricsProps {
  metrics: AdminDashboardMetric[];
}

const AdminOverviewMetrics: React.FC<AdminOverviewMetricsProps> = ({ metrics }) => {
  const renderMetricCard = (metric: AdminDashboardMetric) => (
    <MetricCommandCard key={metric.id} accentColor={metric.color} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {metric.title}
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color: metric.color,
                marginBottom: '0.5rem',
              }}
            >
              {metric.format === 'currency' && '$'}
              {metric.format === 'number'
                ? Number(metric.value).toLocaleString()
                : metric.format === 'percentage'
                  ? `${metric.value}%`
                  : metric.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {metric.changeType === 'increase' ? (
                <TrendingUp size={16} color="#10b981" />
              ) : metric.changeType === 'decrease' ? (
                <TrendingDown size={16} color="#ef4444" />
              ) : (
                <Activity size={16} color="#6b7280" />
              )}
              <span
                style={{
                  fontSize: '0.875rem',
                  color:
                    metric.changeType === 'increase'
                      ? '#10b981'
                      : metric.changeType === 'decrease'
                        ? '#ef4444'
                        : '#6b7280',
                }}
              >
                {metric.change > 0 ? '+' : ''}
                {metric.change}%
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '12px',
                background: `${metric.color}20`,
                color: metric.color,
                marginBottom: '0.5rem',
              }}
            >
              {metric.icon}
            </div>
            {metric.target && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
                Target: {metric.target}
                {metric.format === 'percentage' ? '%' : ''}
              </div>
            )}
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '1rem 0' }} />

        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {metric.description}
        </div>

        {metric.target && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Progress to Target</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                {((Number(metric.value) / metric.target) * 100).toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                height: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min((Number(metric.value) / metric.target) * 100, 100)}%`,
                  background: metric.color,
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>
        )}

        <ChartContainer>Trend data available</ChartContainer>
      </div>
    </MetricCommandCard>
  );

  return <MetricGrid>{metrics.map(renderMetricCard)}</MetricGrid>;
};

export default AdminOverviewMetrics;
