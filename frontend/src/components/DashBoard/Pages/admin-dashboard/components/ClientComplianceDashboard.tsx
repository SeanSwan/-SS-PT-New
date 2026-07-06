/**
 * ClientComplianceDashboard - live admin "needs attention" widget.
 * Surfaces at-risk clients from /api/admin/compliance/at-risk without
 * falling back to demo client data.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Send,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { buildClientProfileRoute } from '../../../workspaces/clients-team/clientDailyTrainingRoutes';
import { CommandCard } from '../AdminDashboardCards';
import {
  ActionBtns,
  Actions,
  Avatar,
  ClientCount,
  ClientInfo,
  ClientList,
  ClientName,
  ClientReason,
  ClientRow,
  ComplianceBars,
  DaysBadge,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterPill,
  Header,
  HeaderLeft,
  MiniBar,
  MiniBarFill,
  MiniBarLabel,
  MiniBarTrack,
  MiniBarVal,
  PillCount,
  RefreshBtn,
  RetryInline,
  RiskIndicator,
  RISK_HEALTHY,
  RISK_WARNING,
  SessionBadge,
  SkeletonRow,
  SmallBtn,
  StatBox,
  StatLbl,
  StatNum,
  StatsRow,
  Title,
  type RiskLevel,
} from './ClientComplianceDashboard.styles';

interface AtRiskClient {
  id: number;
  firstName: string;
  lastName: string;
  photo?: string;
  riskLevel: RiskLevel;
  reason: string;
  daysSinceLastWorkout: number;
  complianceRate7d: number;
  complianceRate30d: number;
  sessionsRemaining: number | null;
  clientSource?: string;
  isFreeTracking?: boolean;
  programExpiresIn?: number;
  lastCheckIn?: string;
}

type FilterType = 'all' | RiskLevel;

const filters: FilterType[] = ['all', 'critical', 'warning', 'watch'];
const isRiskFilter = (value: FilterType): value is RiskLevel => value !== 'all';

/** Messages surface for check-ins. Client preselect needs deep-link support
 *  in the messaging page — owned by the comms lane (unmerged WIP branch),
 *  so this routes to the surface without touching messaging internals. */
const ADMIN_MESSAGES_ROUTE = '/dashboard/admin/messages';

const ClientComplianceDashboard: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  const openClientProfile = useCallback((clientId: number) => {
    const route = buildClientProfileRoute(clientId);
    if (route) navigate(route);
  }, [navigate]);

  const openCheckInCompose = useCallback((clientId: number) => {
    navigate(`${ADMIN_MESSAGES_ROUTE}?composeTo=${clientId}`);
  }, [navigate]);

  const filtered = filter === 'all' ? clients : clients.filter(c => c.riskLevel === filter);
  const counts: Record<RiskLevel, number> = {
    critical: clients.filter(c => c.riskLevel === 'critical').length,
    warning: clients.filter(c => c.riskLevel === 'warning').length,
    watch: clients.filter(c => c.riskLevel === 'watch').length,
  };
  const avgCompliance = Math.round(clients.reduce((sum, client) => sum + client.complianceRate30d, 0) / (clients.length || 1));

  return (
    <CommandCard>
      <Header>
        <HeaderLeft>
          <AlertTriangle size={20} color={RISK_WARNING} />
          <Title>Needs Attention</Title>
          <ClientCount>{clients.length} client{clients.length !== 1 ? 's' : ''}</ClientCount>
        </HeaderLeft>
        <RefreshBtn type="button" onClick={() => fetchCompliance(true)} whileTap={{ rotate: 180 }} disabled={refreshing} aria-label="Refresh client compliance">
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
        </RefreshBtn>
      </Header>

      <FilterBar>
        {filters.map(f => (
          <FilterPill key={f} type="button" $active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {isRiskFilter(f) && <PillCount $level={f}>{counts[f]}</PillCount>}
          </FilterPill>
        ))}
      </FilterBar>

      <StatsRow>
        <StatBox $level="critical">
          <StatNum>{counts.critical}</StatNum>
          <StatLbl>Critical</StatLbl>
        </StatBox>
        <StatBox $level="warning">
          <StatNum>{counts.warning}</StatNum>
          <StatLbl>Warning</StatLbl>
        </StatBox>
        <StatBox $level="watch">
          <StatNum>{counts.watch}</StatNum>
          <StatLbl>Watch</StatLbl>
        </StatBox>
        <StatBox $level="healthy">
          <StatNum>{avgCompliance}%</StatNum>
          <StatLbl>Avg Compliance</StatLbl>
        </StatBox>
      </StatsRow>

      <ClientList>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : error ? (
          <ErrorState role="alert" aria-live="polite">
            <AlertTriangle size={32} color={RISK_WARNING} />
            <span>{error}</span>
            <RetryInline type="button" onClick={() => fetchCompliance(true)}>Retry</RetryInline>
          </ErrorState>
        ) : filtered.length === 0 ? (
          <EmptyState>
            <CheckCircle2 size={32} color={RISK_HEALTHY} />
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
                  {!client.isFreeTracking && client.sessionsRemaining != null && client.sessionsRemaining <= 2 && (
                    <SessionBadge><TrendingDown size={12} /> {client.sessionsRemaining} left</SessionBadge>
                  )}
                  <ActionBtns>
                    <SmallBtn type="button" onClick={() => openCheckInCompose(client.id)} aria-label={`Send check-in to ${client.firstName} ${client.lastName}`}><Send size={14} /></SmallBtn>
                    <SmallBtn type="button" onClick={() => openClientProfile(client.id)} aria-label={`View ${client.firstName} ${client.lastName} profile`}><Eye size={14} /></SmallBtn>
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
