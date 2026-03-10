/**
 * BusinessKPIDashboard — Financial Analytics & KPI Widget
 * ────────────────────────────────────────────────────────
 * Competitive feature inspired by My PT Hub's financial analytics
 * and Trainerize's business performance tracking.
 * Shows revenue trends, client acquisition/churn, session utilization,
 * MRR, and LTV metrics at a glance.
 *
 * Theme: Crystalline Swan (Gilded Fern gold accents on Midnight Sapphire)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, TrendingDown, Users, UserPlus, UserMinus,
  Activity, Target, ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CommandCard } from '../admin-dashboard-view';

/* ─── Types ─────────────────────────────────────────── */

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

/* ─── Component ─────────────────────────────────────── */

const BusinessKPIDashboard: React.FC = () => {
  const { authAxios } = useAuth();
  const [data, setData] = useState<BusinessData | null>(null);
  const [period, setPeriod] = useState<'30d' | '90d' | '12m'>('30d');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/api/admin/analytics/business-kpis', { params: { period } });
      setData(res.data?.data ?? null);
    } catch {
      setData(buildDemoData());
    } finally {
      setLoading(false);
    }
  }, [authAxios, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const d = data ?? buildDemoData();

  const kpis: KPIMetric[] = [
    { label: 'Monthly Revenue', value: `$${d.mrr.toLocaleString()}`, change: d.mrrChange, icon: <DollarSign size={18} />, color: '#10b981', sparkline: d.revenueSparkline },
    { label: 'Active Clients', value: String(d.activeClients), change: d.newClients - d.churnedClients, icon: <Users size={18} />, color: '#3b82f6', sparkline: d.clientSparkline },
    { label: 'New Clients', value: `+${d.newClients}`, change: d.newClients, icon: <UserPlus size={18} />, color: '#8B5CF6' },
    { label: 'Churn Rate', value: `${d.churnRate.toFixed(1)}%`, change: -d.churnRate, icon: <UserMinus size={18} />, color: d.churnRate > 5 ? '#ef4444' : '#f59e0b' },
    { label: 'Session Utilization', value: `${d.sessionUtilization}%`, change: d.sessionUtilization - 75, icon: <Activity size={18} />, color: '#60C0F0' },
    { label: 'Avg Client LTV', value: `$${d.avgLTV.toLocaleString()}`, change: 0, icon: <Target size={18} />, color: '#C6A84B' },
  ];

  return (
    <CommandCard>
      <Header>
        <HeaderLeft>
          <TrendingUp size={20} color="#C6A84B" />
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

      {/* KPI Grid */}
      <KPIGrid>
        {kpis.map((kpi, i) => (
          <KPICard key={i} $color={kpi.color} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <KPIIcon $color={kpi.color}>{kpi.icon}</KPIIcon>
            <KPIContent>
              <KPILabel>{kpi.label}</KPILabel>
              <KPIValue>{loading ? '—' : kpi.value}</KPIValue>
              {!loading && (
                <KPIChange $positive={kpi.change >= 0}>
                  {kpi.change > 0 ? <ArrowUpRight size={12} /> : kpi.change < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                  {Math.abs(kpi.change).toFixed(1)}%
                </KPIChange>
              )}
            </KPIContent>
            {kpi.sparkline && !loading && (
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

      {/* Revenue Breakdown */}
      <BreakdownRow>
        <BreakdownCard>
          <BreakdownLabel>Revenue / Client</BreakdownLabel>
          <BreakdownValue>${loading ? '—' : d.avgRevenuePerClient.toFixed(0)}</BreakdownValue>
        </BreakdownCard>
        <BreakdownCard>
          <BreakdownLabel>Sessions This Month</BreakdownLabel>
          <BreakdownValue>{loading ? '—' : d.sessionsThisMonth}</BreakdownValue>
        </BreakdownCard>
        <BreakdownCard>
          <BreakdownLabel>vs Last Month</BreakdownLabel>
          <BreakdownValue $positive={(d.sessionsThisMonth - d.sessionsLastMonth) >= 0}>
            {loading ? '—' : `${d.sessionsThisMonth >= d.sessionsLastMonth ? '+' : ''}${d.sessionsThisMonth - d.sessionsLastMonth}`}
          </BreakdownValue>
        </BreakdownCard>
        <BreakdownCard>
          <BreakdownLabel>Total Revenue ({period})</BreakdownLabel>
          <BreakdownValue>${loading ? '—' : d.totalRevenue.toLocaleString()}</BreakdownValue>
        </BreakdownCard>
      </BreakdownRow>
    </CommandCard>
  );
};

/* ─── Demo Data ─────────────────────────────────────── */

function buildDemoData(): BusinessData {
  return {
    mrr: 8750,
    mrrChange: 12.5,
    totalRevenue: 26250,
    revenueChange: 8.3,
    activeClients: 47,
    newClients: 6,
    churnedClients: 2,
    churnRate: 4.3,
    sessionUtilization: 78,
    avgLTV: 2840,
    avgRevenuePerClient: 186,
    sessionsThisMonth: 142,
    sessionsLastMonth: 128,
    revenueSparkline: [5200, 6100, 5800, 7200, 7600, 8100, 8750],
    clientSparkline: [38, 40, 41, 43, 44, 45, 47],
  };
}

export default BusinessKPIDashboard;

/* ─── Styled Components ─────────────────────────────── */

const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
  flex-wrap: wrap; gap: 12px;
`;
const HeaderLeft = styled.div`display: flex; align-items: center; gap: 10px;`;
const Title = styled.h3`font-size: 16px; font-weight: 700; color: #f0f0ff; margin: 0;`;

const PeriodSelector = styled.div`
  display: flex; gap: 4px; background: rgba(0,32,96,0.4); border-radius: 10px; padding: 3px;
`;
const PeriodBtn = styled.button<{ $active: boolean }>`
  padding: 6px 14px; border: none; border-radius: 8px; font-size: 12px; font-weight: 600;
  cursor: pointer; min-height: 44px; transition: all 0.15s;
  background: ${p => p.$active ? 'rgba(198,168,75,0.2)' : 'transparent'};
  color: ${p => p.$active ? '#C6A84B' : 'rgba(255,255,255,0.5)'};
  &:hover { color: #C6A84B; }
`;

const KPIGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;

const KPICard = styled(motion.div)<{ $color: string }>`
  background: rgba(0,32,96,0.3); border: 1px solid ${p => p.$color}22;
  border-radius: 12px; padding: 16px; display: flex; gap: 12px; align-items: flex-start;
  transition: border-color 0.2s;
  &:hover { border-color: ${p => p.$color}44; }
`;
const KPIIcon = styled.div<{ $color: string }>`
  width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0;
  background: ${p => p.$color}1A; color: ${p => p.$color};
`;
const KPIContent = styled.div`flex: 1; min-width: 0;`;
const KPILabel = styled.div`font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px;`;
const KPIValue = styled.div`font-size: clamp(18px, 4vw, 22px); font-weight: 700; color: #f0f0ff; margin-top: 2px; font-family: 'Fira Code', monospace;`;
const KPIChange = styled.div<{ $positive: boolean }>`
  display: inline-flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 600;
  color: ${p => p.$positive ? '#10b981' : '#ef4444'}; margin-top: 4px;
`;

const Sparkline = styled.div`
  width: 60px; height: 24px; flex-shrink: 0; align-self: center;
  svg { width: 100%; height: 100%; }
  @media (max-width: 430px) { display: none; }
`;

const BreakdownRow = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;
const BreakdownCard = styled.div`
  background: rgba(198,168,75,0.05); border: 1px solid rgba(198,168,75,0.1);
  border-radius: 10px; padding: 12px; text-align: center;
`;
const BreakdownLabel = styled.div`font-size: 11px; color: rgba(255,255,255,0.45);`;
const BreakdownValue = styled.div<{ $positive?: boolean }>`
  font-size: 18px; font-weight: 700; margin-top: 4px; font-family: 'Fira Code', monospace;
  color: ${p => p.$positive === undefined ? '#C6A84B' : p.$positive ? '#10b981' : '#ef4444'};
`;
