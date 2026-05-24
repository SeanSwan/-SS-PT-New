/**
 * ClientComplianceDashboard — "Needs Attention" System
 * ─────────────────────────────────────────────────────
 * Competitive feature inspired by TrueCoach's compliance tracking.
 * Shows at-risk clients, 7/30/90-day compliance rates, missed workouts,
 * expiring programs, and inactive clients — all in one glanceable widget.
 *
 * Theme: Crystalline Swan (Wing Purple accents, Midnight Sapphire surfaces)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../../../../../utils/imageUrl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, TrendingDown, Clock, UserX, CheckCircle2,
  ChevronRight, RefreshCw, Send, Eye,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { CommandCard } from '../admin-dashboard-view';

/* ─── Types ─────────────────────────────────────────── */

interface AtRiskClient {
  id: number;
  firstName: string;
  lastName: string;
  photo?: string;
  riskLevel: 'critical' | 'warning' | 'watch';
  reason: string;
  daysSinceLastWorkout: number;
  complianceRate7d: number;
  complianceRate30d: number;
  sessionsRemaining: number;
  programExpiresIn?: number; // days
  lastCheckIn?: string;
}

type FilterType = 'all' | 'critical' | 'warning' | 'watch';

/* ─── Component ─────────────────────────────────────── */

const ClientComplianceDashboard: React.FC = () => {
  const { authAxios } = useAuth();
  const [clients, setClients] = useState<AtRiskClient[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompliance = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await authAxios.get('/api/admin/compliance/at-risk');
      const nextClients = Array.isArray(res.data?.clients) ? res.data.clients : [];
      setClients(nextClients);
      setError(null);
    } catch {
      setClients([]);
      setError('Compliance data could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authAxios]);

  useEffect(() => { fetchCompliance(); }, [fetchCompliance]);

  const filtered = filter === 'all' ? clients : clients.filter(c => c.riskLevel === filter);
  const counts = {
    critical: clients.filter(c => c.riskLevel === 'critical').length,
    warning: clients.filter(c => c.riskLevel === 'warning').length,
    watch: clients.filter(c => c.riskLevel === 'watch').length,
  };

  return (
    <CommandCard>
      <Header>
        <HeaderLeft>
          <AlertTriangle size={20} color="#f59e0b" />
          <Title>Needs Attention</Title>
          <ClientCount>{clients.length} client{clients.length !== 1 ? 's' : ''}</ClientCount>
        </HeaderLeft>
        <RefreshBtn onClick={() => fetchCompliance(true)} whileTap={{ rotate: 180 }} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
        </RefreshBtn>
      </Header>

      {/* Risk Level Filters */}
      <FilterBar>
        {(['all', 'critical', 'warning', 'watch'] as FilterType[]).map(f => (
          <FilterPill key={f} $active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <PillCount $level={f as any}>{counts[f as keyof typeof counts]}</PillCount>}
          </FilterPill>
        ))}
      </FilterBar>

      {/* Summary Stats */}
      <StatsRow>
        <StatBox $color="#ef4444">
          <StatNum>{counts.critical}</StatNum>
          <StatLbl>Critical</StatLbl>
        </StatBox>
        <StatBox $color="#f59e0b">
          <StatNum>{counts.warning}</StatNum>
          <StatLbl>Warning</StatLbl>
        </StatBox>
        <StatBox $color="#3b82f6">
          <StatNum>{counts.watch}</StatNum>
          <StatLbl>Watch</StatLbl>
        </StatBox>
        <StatBox $color="#10b981">
          <StatNum>{Math.round(clients.reduce((s, c) => s + c.complianceRate30d, 0) / (clients.length || 1))}%</StatNum>
          <StatLbl>Avg Compliance</StatLbl>
        </StatBox>
      </StatsRow>

      {/* Client List */}
      <ClientList>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : error ? (
          <ErrorState>
            <AlertTriangle size={32} color="#f59e0b" />
            <span>{error}</span>
            <RetryInline type="button" onClick={() => fetchCompliance(true)}>
              Retry
            </RetryInline>
          </ErrorState>
        ) : filtered.length === 0 ? (
          <EmptyState>
            <CheckCircle2 size={32} color="#10b981" />
            <span>All clients are on track!</span>
          </EmptyState>
        ) : (
          <AnimatePresence>
            {filtered.map(client => (
              <ClientRow
                key={client.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                $level={client.riskLevel}
              >
                <RiskIndicator $level={client.riskLevel} />
                <Avatar $src={client.photo}>
                  {!client.photo && `${client.firstName[0]}${client.lastName[0]}`}
                </Avatar>
                <ClientInfo>
                  <ClientName>{client.firstName} {client.lastName}</ClientName>
                  <ClientReason>{client.reason}</ClientReason>
                  <ComplianceBars>
                    <MiniBar>
                      <MiniBarLabel>7d</MiniBarLabel>
                      <MiniBarTrack>
                        <MiniBarFill $pct={client.complianceRate7d} $level={client.riskLevel} />
                      </MiniBarTrack>
                      <MiniBarVal>{client.complianceRate7d}%</MiniBarVal>
                    </MiniBar>
                    <MiniBar>
                      <MiniBarLabel>30d</MiniBarLabel>
                      <MiniBarTrack>
                        <MiniBarFill $pct={client.complianceRate30d} $level={client.riskLevel} />
                      </MiniBarTrack>
                      <MiniBarVal>{client.complianceRate30d}%</MiniBarVal>
                    </MiniBar>
                  </ComplianceBars>
                </ClientInfo>
                <Actions>
                  <DaysBadge $urgent={client.daysSinceLastWorkout > 7}>
                    <Clock size={12} /> {client.daysSinceLastWorkout}d ago
                  </DaysBadge>
                  {client.sessionsRemaining <= 2 && (
                    <SessionBadge><TrendingDown size={12} /> {client.sessionsRemaining} left</SessionBadge>
                  )}
                  <ActionBtns>
                    <SmallBtn title="Send check-in"><Send size={14} /></SmallBtn>
                    <SmallBtn title="View profile"><Eye size={14} /></SmallBtn>
                  </ActionBtns>
                </Actions>
              </ClientRow>
            ))}
          </AnimatePresence>
        )}
      </ClientList>
    </CommandCard>
  );
};

export default ClientComplianceDashboard;

/* ─── Styled Components ─────────────────────────────── */

const spin = keyframes`from{transform:rotate(0)}to{transform:rotate(360deg)}`;

const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  flex-wrap: wrap; gap: 8px;
`;
const HeaderLeft = styled.div`display: flex; align-items: center; gap: 10px;`;
const Title = styled.h3`font-size: 16px; font-weight: 700; color: #f0f0ff; margin: 0;`;
const ClientCount = styled.span`
  font-size: 12px; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.05);
  padding: 2px 8px; border-radius: 10px;
`;
const RefreshBtn = styled(motion.button)`
  background: none; border: 1px solid rgba(139,92,246,0.2); border-radius: 8px;
  color: rgba(255,255,255,0.6); padding: 6px; cursor: pointer; min-height: 44px; min-width: 44px;
  display: flex; align-items: center; justify-content: center;
  &:hover { border-color: #8B5CF6; color: #8B5CF6; }
  .spinning { animation: ${spin} 1s linear infinite; }
`;

const FilterBar = styled.div`
  display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;
const FilterPill = styled.button<{ $active: boolean }>`
  display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px;
  font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; min-height: 44px;
  border: 1px solid ${p => p.$active ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'};
  background: ${p => p.$active ? 'rgba(139,92,246,0.15)' : 'transparent'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(255,255,255,0.6)'};
  transition: all 0.15s;
  &:hover { border-color: rgba(139,92,246,0.3); color: #c4b5fd; }
`;
const PillCount = styled.span<{ $level: string }>`
  background: ${p => p.$level === 'critical' ? '#ef4444' : p.$level === 'warning' ? '#f59e0b' : '#3b82f6'};
  color: #000; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 8px;
`;

const StatsRow = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;
const StatBox = styled.div<{ $color: string }>`
  background: rgba(0,32,96,0.4); border: 1px solid ${p => p.$color}33;
  border-radius: 10px; padding: 12px; text-align: center;
`;
const StatNum = styled.div`font-size: 22px; font-weight: 700; color: #f0f0ff;`;
const StatLbl = styled.div`font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px;`;

const ClientList = styled.div`max-height: 420px; overflow-y: auto; -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.2); border-radius: 3px; }
`;

const ClientRow = styled(motion.div)<{ $level: string }>`
  display: flex; align-items: center; gap: 12px; padding: 14px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
  @media (max-width: 430px) { flex-wrap: wrap; gap: 8px; }
`;
const RiskIndicator = styled.div<{ $level: string }>`
  width: 4px; height: 40px; border-radius: 2px; flex-shrink: 0;
  background: ${p => p.$level === 'critical' ? '#ef4444' : p.$level === 'warning' ? '#f59e0b' : '#3b82f6'};
  box-shadow: 0 0 8px ${p => p.$level === 'critical' ? '#ef444466' : p.$level === 'warning' ? '#f59e0b66' : '#3b82f666'};
`;
const Avatar = styled.div<{ $src?: string }>`
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe ? `url(${cssUrlValue(safe)}) center/cover` : 'linear-gradient(135deg, #8B5CF6, #3b82f6)';
  }};
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff; text-transform: uppercase;
`;
const ClientInfo = styled.div`flex: 1; min-width: 0;`;
const ClientName = styled.div`font-size: 14px; font-weight: 600; color: #e2e8f0;`;
const ClientReason = styled.div`font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; word-break: break-word;`;

const ComplianceBars = styled.div`display: flex; gap: 12px; margin-top: 6px;`;
const MiniBar = styled.div`display: flex; align-items: center; gap: 4px;`;
const MiniBarLabel = styled.span`font-size: 10px; color: rgba(255,255,255,0.4); width: 20px;`;
const MiniBarTrack = styled.div`width: 60px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;`;
const MiniBarFill = styled.div<{ $pct: number; $level: string }>`
  height: 100%; border-radius: 2px; width: ${p => p.$pct}%;
  background: ${p => p.$level === 'critical' ? '#ef4444' : p.$level === 'warning' ? '#f59e0b' : '#3b82f6'};
`;
const MiniBarVal = styled.span`font-size: 10px; color: rgba(255,255,255,0.6); width: 28px; text-align: right;`;

const Actions = styled.div`display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0;`;
const DaysBadge = styled.span<{ $urgent: boolean }>`
  display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600;
  color: ${p => p.$urgent ? '#ef4444' : 'rgba(255,255,255,0.6)'};
  padding: 2px 8px; border-radius: 8px;
  background: ${p => p.$urgent ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)'};
`;
const SessionBadge = styled.span`
  display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600;
  color: #f59e0b; padding: 2px 8px; border-radius: 8px; background: rgba(245,158,11,0.12);
`;
const ActionBtns = styled.div`display: flex; gap: 4px;`;
const SmallBtn = styled.button`
  background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); border-radius: 6px;
  color: #c4b5fd; padding: 6px; cursor: pointer; min-height: 44px; min-width: 44px;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  &:hover { background: rgba(139,92,246,0.2); border-color: #8B5CF6; }
`;

const SkeletonRow = styled.div`
  height: 64px; background: rgba(255,255,255,0.03); border-radius: 8px;
  margin-bottom: 8px; animation: ${keyframes`0%,100%{opacity:0.5}50%{opacity:1}`} 1.5s infinite;
`;
const EmptyState = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 40px 20px; color: rgba(255,255,255,0.6); font-size: 14px;
`;
const ErrorState = styled(EmptyState)`
  color: #f59e0b;
`;
const RetryInline = styled.button`
  min-height: 44px; min-width: 88px; border-radius: 8px;
  border: 1px solid rgba(245,158,11,0.35); background: rgba(245,158,11,0.12);
  color: #f8d28b; font-weight: 700; cursor: pointer;
  &:hover { background: rgba(245,158,11,0.2); }
`;
