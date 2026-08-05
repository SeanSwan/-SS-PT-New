/**
 * BusinessKPIDashboard - live admin business KPI widget.
 * Shows revenue, client growth, churn, utilization, and LTV from the
 * canonical /api/admin/analytics/business-kpis endpoint.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Minus,
  RefreshCw,
  Target,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CommandCard } from '../AdminDashboardCards';
import {
  BreakdownCard,
  BreakdownLabel,
  BreakdownRow,
  BreakdownValue,
  ErrorState,
  Header,
  HeaderLeft,
  KPIChange,
  KPIContent,
  KPICard,
  KPIGrid,
  KPIIcon,
  KPILabel,
  KPIValue,
  KPI_ERROR,
  KPI_GOLD,
  KPI_INFO,
  KPI_PRIMARY,
  KPI_SUCCESS,
  KPI_WARNING,
  PeriodBtn,
  PeriodSelector,
  RetryInline,
  Sparkline,
  Title,
} from './BusinessKPIDashboard.styles';

interface KPIMetric {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  sparkline?: number[];
}

interface BusinessData {
  mrr: number;
  mrrChange: number;
  totalRevenue: number;
  revenueChange: number;
  activeClients: number;
  newClients: number;
  churnedClients: number;
  churnRate: number;
  sessionUtilization: number;
  avgLTV: number;
  avgRevenuePerClient: number;
  sessionsThisMonth: number;
  sessionsLastMonth: number;
  revenueSparkline: number[];
  clientSparkline: number[];
}

const EMPTY_BUSINESS_DATA: BusinessData = {
  mrr: 0,
  mrrChange: 0,
  totalRevenue: 0,
  revenueChange: 0,
  activeClients: 0,
  newClients: 0,
  churnedClients: 0,
  churnRate: 0,
  sessionUtilization: 0,
  avgLTV: 0,
  avgRevenuePerClient: 0,
  sessionsThisMonth: 0,
  sessionsLastMonth: 0,
  revenueSparkline: [],
  clientSparkline: [],
};

const numericBusinessKeys: Array<keyof Omit<BusinessData, 'revenueSparkline' | 'clientSparkline'>> = [
  'mrr',
  'mrrChange',
  'totalRevenue',
  'revenueChange',
  'activeClients',
  'newClients',
  'churnedClients',
  'churnRate',
  'sessionUtilization',
  'avgLTV',
  'avgRevenuePerClient',
  'sessionsThisMonth',
  'sessionsLastMonth',
];

const toNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const toSparkline = (value: unknown) => (Array.isArray(value) ? value.map(toNumber) : []);

const normalizeBusinessData = (raw: Partial<BusinessData> | null | undefined): BusinessData => {
  const next = { ...EMPTY_BUSINESS_DATA };
  for (const key of numericBusinessKeys) next[key] = toNumber(raw?.[key]);
  next.revenueSparkline = toSparkline(raw?.revenueSparkline);
  next.clientSparkline = toSparkline(raw?.clientSparkline);
  return next;
};

const BusinessKPIDashboard: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<BusinessData | null>(null);
  const [period, setPeriod] = useState<'30d' | '90d' | '12m'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/api/admin/analytics/business-kpis', { params: { period } });
      setData(normalizeBusinessData(res.data?.data));
      setError(null);
    } catch {
      setData(null);
      setError('Business KPI data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [authAxios, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const d = data ?? EMPTY_BUSINESS_DATA;
  const kpis: KPIMetric[] = [
    {
      label: 'Monthly Revenue (gross)',
      value: `$${d.mrr.toLocaleString()}`,
      change: d.mrrChange,
      icon: <DollarSign size={18} />,
      color: KPI_SUCCESS,
      sparkline: d.revenueSparkline,
    },
    {
      label: 'Active Clients',
      value: String(d.activeClients),
      change: d.newClients - d.churnedClients,
      icon: <Users size={18} />,
      color: KPI_INFO,
      sparkline: d.clientSparkline,
    },
    { label: 'New Clients', value: `+${d.newClients}`, change: d.newClients, icon: <UserPlus size={18} />, color: 'var(--accent-secondary, #8B5CF6)' },
    { label: 'Churn Rate', value: `${d.churnRate.toFixed(1)}%`, change: -d.churnRate, icon: <UserMinus size={18} />, color: d.churnRate > 5 ? KPI_ERROR : KPI_WARNING },
    { label: 'Session Utilization', value: `${d.sessionUtilization}%`, change: d.sessionUtilization - 75, icon: <Activity size={18} />, color: KPI_PRIMARY },
    { label: 'Avg Client LTV', value: `$${d.avgLTV.toLocaleString()}`, change: 0, icon: <Target size={18} />, color: KPI_GOLD },
  ];

  return (
    <CommandCard>
      <Header>
        <HeaderLeft>
          <TrendingUp size={20} color={KPI_GOLD} />
          <Title>Business Intelligence</Title>
        </HeaderLeft>
        <PeriodSelector>
          {(['30d', '90d', '12m'] as const).map(p => (
            <PeriodBtn key={p} $active={period === p} onClick={() => setPeriod(p)}>
              {p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '12 Months'}
            </PeriodBtn>
          ))}
        </PeriodSelector>
      </Header>

      {error ? (
        <ErrorState role="alert" aria-live="polite">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <RetryInline type="button" onClick={fetchData}>
            <RefreshCw size={14} />
            Retry
          </RetryInline>
        </ErrorState>
      ) : (
        <>
          <KPIGrid>
            {kpis.map((kpi, i) => (
              <KPICard key={kpi.label} $color={kpi.color} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <KPIIcon $color={kpi.color}>{kpi.icon}</KPIIcon>
                <KPIContent>
                  <KPILabel>{kpi.label}</KPILabel>
                  <KPIValue>{loading ? '-' : kpi.value}</KPIValue>
                  {!loading && (
                    <KPIChange $positive={kpi.change >= 0}>
                      {kpi.change > 0 ? <ArrowUpRight size={12} /> : kpi.change < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                      {Math.abs(kpi.change).toFixed(1)}%
                    </KPIChange>
                  )}
                </KPIContent>
                {kpi.sparkline && kpi.sparkline.length > 1 && !loading && (
                  <Sparkline>
                    <svg viewBox="0 0 60 24" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke={kpi.color}
                        strokeWidth="1.5"
                        points={kpi.sparkline.map((v, j) => {
                          const max = Math.max(...kpi.sparkline!);
                          const min = Math.min(...kpi.sparkline!);
                          const range = max - min || 1;
                          return `${(j / (kpi.sparkline!.length - 1)) * 60},${24 - ((v - min) / range) * 20}`;
                        }).join(' ')}
                      />
                    </svg>
                  </Sparkline>
                )}
              </KPICard>
            ))}
          </KPIGrid>

          <BreakdownRow>
            <BreakdownCard>
              <BreakdownLabel>Revenue / Client</BreakdownLabel>
              <BreakdownValue>${loading ? '-' : d.avgRevenuePerClient.toFixed(0)}</BreakdownValue>
            </BreakdownCard>
            <BreakdownCard>
              <BreakdownLabel>Sessions This Month</BreakdownLabel>
              <BreakdownValue>{loading ? '-' : d.sessionsThisMonth}</BreakdownValue>
            </BreakdownCard>
            <BreakdownCard>
              <BreakdownLabel>vs Last Month</BreakdownLabel>
              <BreakdownValue $positive={(d.sessionsThisMonth - d.sessionsLastMonth) >= 0}>
                {loading ? '-' : `${d.sessionsThisMonth >= d.sessionsLastMonth ? '+' : ''}${d.sessionsThisMonth - d.sessionsLastMonth}`}
              </BreakdownValue>
            </BreakdownCard>
            <BreakdownCard>
              <BreakdownLabel>Total Revenue ({period})</BreakdownLabel>
              <BreakdownValue>${loading ? '-' : d.totalRevenue.toLocaleString()}</BreakdownValue>
            </BreakdownCard>
          </BreakdownRow>
        </>
      )}
    </CommandCard>
  );
};

export default BusinessKPIDashboard;
