import React, { useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { AlertTriangle, Info, X, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';
import {
  PrimaryHeading,
  GridContainer,
  Caption,
  SmallText
} from '../ui';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScheduleStatsProps {
  mode: 'admin' | 'trainer' | 'client';
  sessions: any[];
  creditsDisplay: string | number;
  lowCredits: boolean;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
}

interface CardConfig {
  key: string;
  label: string;
  definition: string;
  color: string;
  getValue: (stats: Stats) => number;
}

interface Stats {
  total: number;
  available: number;
  scheduled: number;
  completed: number;
  other: number;
}

// ─── Card Definitions ────────────────────────────────────────────────────────

const CARD_CONFIGS: CardConfig[] = [
  {
    key: 'total',
    label: 'Total Sessions',
    definition: 'All sessions in current scope and date range',
    color: galaxySwanTheme.primary.main,
    getValue: (s) => s.total,
  },
  {
    key: 'available',
    label: 'Available',
    definition: 'Open slots not yet booked by a client',
    color: '#3b82f6',
    getValue: (s) => s.available,
  },
  {
    key: 'scheduled',
    label: 'Scheduled',
    definition: 'Booked or confirmed upcoming sessions (includes confirmed status)',
    color: '#10b981',
    getValue: (s) => s.scheduled,
  },
  {
    key: 'completed',
    label: 'Completed',
    definition: 'Sessions that have been finished',
    color: '#6b7280',
    getValue: (s) => s.completed,
  },
];

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  available: '#3b82f6',
  scheduled: '#10b981',
  confirmed: '#059669',
  completed: '#6b7280',
  cancelled: '#ef4444',
  blocked: '#f59e0b',
  requested: '#8b5cf6',
};

function isUpcoming(session: any): boolean {
  const date = session.sessionDate || session.start || session.startTime;
  if (!date) return true; // no date = keep it visible
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(date) >= startOfToday;
}

function getSessionsForFilter(sessions: any[], filterKey: string): any[] {
  if (filterKey === 'total') return sessions;
  if (filterKey === 'scheduled') {
    return sessions.filter(s =>
      (s.status === 'scheduled' || s.status === 'confirmed') && isUpcoming(s)
    );
  }
  return sessions.filter(s => s.status === filterKey);
}

function formatPersonName(person: any): string {
  if (!person) return '—';
  const first = person.firstName || '';
  const last = person.lastName || '';
  return (first + ' ' + last).trim() || person.email || '—';
}

function formatSessionDate(session: any): string {
  const date = session.sessionDate || session.start || session.startTime;
  if (!date) return 'No date';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSessionTime(session: any): string {
  const date = session.sessionDate || session.start || session.startTime;
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ─── Component ───────────────────────────────────────────────────────────────

const ScheduleStats: React.FC<ScheduleStatsProps> = ({
  mode,
  sessions,
  creditsDisplay,
  lowCredits,
  statusFilter,
  onStatusFilterChange,
}) => {
  const stats = useMemo<Stats>(() => {
    const available = sessions.filter(s => s.status === 'available').length;
    const scheduled = sessions.filter(s =>
      (s.status === 'scheduled' || s.status === 'confirmed') && isUpcoming(s)
    ).length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const total = sessions.length;
    const other = total - available - scheduled - completed;
    return { total, available, scheduled, completed, other };
  }, [sessions]);

  const drillDownSessions = useMemo(() => {
    if (!statusFilter) return [];
    return getSessionsForFilter(sessions, statusFilter).slice(0, 10);
  }, [sessions, statusFilter]);

  const activeConfig = statusFilter
    ? CARD_CONFIGS.find(c => c.key === statusFilter) || null
    : null;

  const drillDownTotal = statusFilter
    ? getSessionsForFilter(sessions, statusFilter).length
    : 0;

  return (
    <StatsPanel>
      <PrimaryHeading style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        Schedule Overview
      </PrimaryHeading>

      {mode === 'client' && lowCredits && (
        <CreditWarning>
          <AlertTriangle size={18} />
          <div>
            <SmallText>
              Low credits: {creditsDisplay} sessions remaining. Visit the store to purchase more.
            </SmallText>
          </div>
        </CreditWarning>
      )}

      <GridContainer columns={mode === 'client' ? 5 : 4} gap="1rem">
        {CARD_CONFIGS.map((card) => (
          <InteractiveStatCard
            key={card.key}
            as="button"
            type="button"
            role="button"
            aria-pressed={statusFilter === card.key}
            aria-label={`${card.label}: ${card.getValue(stats)}. ${card.definition}`}
            data-testid={`schedule-kpi-${card.key}`}
            $active={statusFilter === card.key}
            $accentColor={card.color}
            onClick={() => onStatusFilterChange(card.key)}
          >
            <div className="stat-value" style={{ color: card.color }}>
              {card.getValue(stats)}
            </div>
            <Caption secondary>{card.label}</Caption>
            <Tooltip className="tooltip">{card.definition}</Tooltip>
          </InteractiveStatCard>
        ))}

        {mode === 'client' && (
          <InteractiveStatCard
            as="div"
            $active={false}
            $accentColor={galaxySwanTheme.primary.main}
          >
            <div className="stat-value" style={{ color: galaxySwanTheme.primary.main }}>
              {creditsDisplay}
            </div>
            <Caption secondary>Credits Remaining</Caption>
          </InteractiveStatCard>
        )}
      </GridContainer>

      {stats.other > 0 && (
        <OtherStatusNote>
          <Info size={14} />
          {stats.other} session{stats.other !== 1 ? 's' : ''} in other statuses (cancelled, blocked, requested)
        </OtherStatusNote>
      )}

      {/* Drill-down panel */}
      <DrillDownWrapper $open={!!statusFilter}>
        {statusFilter && activeConfig && (
          <DrillDownPanel data-testid="schedule-kpi-drilldown">
            <DrillDownHeader>
              <DrillDownTitle>
                <StatusDot $color={activeConfig.color} />
                <div>
                  <strong>{activeConfig.label}</strong>
                  <DrillDownDefinition>{activeConfig.definition}</DrillDownDefinition>
                </div>
              </DrillDownTitle>
              <DrillDownActions>
                <DrillDownCount $color={activeConfig.color}>
                  {drillDownTotal} session{drillDownTotal !== 1 ? 's' : ''}
                </DrillDownCount>
                <ClearButton
                  type="button"
                  onClick={() => onStatusFilterChange(statusFilter)}
                  aria-label="Clear filter"
                >
                  <X size={16} />
                  Clear filter
                </ClearButton>
              </DrillDownActions>
            </DrillDownHeader>

            {drillDownSessions.length === 0 ? (
              <EmptyState>
                <Calendar size={32} style={{ opacity: 0.4 }} />
                <p>No {activeConfig.label.toLowerCase()} sessions found</p>
                <SmallText style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {statusFilter === 'available'
                    ? 'Create available slots from the schedule header'
                    : statusFilter === 'scheduled'
                    ? 'Sessions will appear here once clients book'
                    : 'Sessions will appear here once completed'}
                </SmallText>
              </EmptyState>
            ) : (
              <>
                <SessionTable>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      {mode === 'admin' && <th className="hide-mobile">Trainer</th>}
                      {mode !== 'client' && <th className="hide-mobile">Client</th>}
                      <th>Status</th>
                      <th className="hide-mobile">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownSessions.map((session: any, idx: number) => (
                      <SessionRow key={session.id || idx}>
                        <td>
                          <SessionCellFlex>
                            <Calendar size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                            {formatSessionDate(session)}
                          </SessionCellFlex>
                        </td>
                        <td>
                          <SessionCellFlex>
                            <Clock size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                            {formatSessionTime(session)}
                          </SessionCellFlex>
                        </td>
                        {mode === 'admin' && (
                          <td className="hide-mobile">
                            <SessionCellFlex>
                              <Users size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                              {formatPersonName(session.trainer)}
                            </SessionCellFlex>
                          </td>
                        )}
                        {mode !== 'client' && (
                          <td className="hide-mobile">
                            <SessionCellFlex>
                              <Users size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                              {formatPersonName(session.client)}
                            </SessionCellFlex>
                          </td>
                        )}
                        <td>
                          <StatusBadge $color={STATUS_COLORS[session.status] || '#6b7280'}>
                            {session.status}
                          </StatusBadge>
                        </td>
                        <td className="hide-mobile">
                          <SessionCellFlex>
                            <MapPin size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                            {session.location || 'Main Studio'}
                          </SessionCellFlex>
                        </td>
                      </SessionRow>
                    ))}
                  </tbody>
                </SessionTable>
                {drillDownTotal > 10 && (
                  <ViewAllNote>
                    Showing 10 of {drillDownTotal} — all {drillDownTotal} are visible in the calendar below
                  </ViewAllNote>
                )}
              </>
            )}
          </DrillDownPanel>
        )}
      </DrillDownWrapper>
    </StatsPanel>
  );
};

export default ScheduleStats;

// ─── Styled Components ───────────────────────────────────────────────────────

const StatsPanel = styled.div`
  margin: 1rem 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  flex-shrink: 0;

  @media (max-width: 1024px) {
    margin: 0.75rem 1.5rem;
    padding: 1.25rem;
  }

  @media (max-width: 768px) {
    margin: 0.5rem 1rem;
    padding: 1rem;
    border-radius: 10px;
    backdrop-filter: none;
    background: rgba(20, 20, 40, 0.85);
  }

  @media (max-width: 480px) {
    margin: 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
  }

  @media (min-width: 2560px) {
    margin: 1.25rem 2.5rem;
    padding: 2rem;
    border-radius: 16px;
  }

  @media (min-width: 3840px) {
    margin: 1.5rem 3rem;
    padding: 2.5rem;
  }
`;

const CreditWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fef3c7;

  @media (max-width: 480px) {
    padding: 0.625rem 0.75rem;
    gap: 0.5rem;
    font-size: 0.875rem;
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }
`;

const Tooltip = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 30, 0.95);
  color: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease;
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.15);

  @media (max-width: 768px) {
    display: none;
  }
`;

const InteractiveStatCard = styled.button<{ $active: boolean; $accentColor: string }>`
  position: relative;
  text-align: center;
  padding: 1.5rem;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: 12px;
  overflow: visible;
  cursor: pointer;
  transition: all 200ms ease;
  color: inherit;
  font-family: inherit;
  outline: none;

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: ${galaxySwanTheme.primary.main};
    margin-bottom: 0.5rem;
    line-height: 1;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }

  &:hover .tooltip {
    opacity: 1;
  }

  &:focus-visible {
    border-color: ${galaxySwanTheme.primary.main};
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.25);
  }

  &:active {
    transform: translateY(0);
  }

  ${({ $active, $accentColor }) =>
    $active &&
    css`
      border-color: ${$accentColor};
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 20px ${$accentColor}33, 0 0 40px ${$accentColor}11;
      transform: scale(1.03);

      &:hover {
        transform: scale(1.03) translateY(-1px);
      }
    `}

  @media (max-width: 768px) {
    padding: 1.25rem;

    .stat-value {
      font-size: 1.75rem;
    }
  }

  @media (max-width: 480px) {
    padding: 1rem;

    .stat-value {
      font-size: 1.5rem;
    }
  }

  @media (min-width: 2560px) {
    padding: 2rem;

    .stat-value {
      font-size: 2.5rem;
    }
  }

  @media (min-width: 3840px) {
    padding: 2.5rem;

    .stat-value {
      font-size: 3rem;
    }
  }
`;

const OtherStatusNote = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
`;

const DrillDownWrapper = styled.div<{ $open: boolean }>`
  overflow: hidden;
  max-height: ${({ $open }) => ($open ? '500px' : '0')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: max-height 250ms ease, opacity 200ms ease;
`;

const DrillDownPanel = styled.div`
  margin-top: 1rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;

  @media (max-width: 480px) {
    padding: 0.75rem;
  }
`;

const DrillDownHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const DrillDownTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  strong {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.9);
  }
`;

const DrillDownDefinition = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
`;

const DrillDownActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
`;

const DrillDownCount = styled.span<{ $color: string }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

const StatusDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 6px 12px;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }
`;

const SessionTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  thead th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .hide-mobile {
    @media (max-width: 768px) {
      display: none;
    }
  }
`;

const SessionRow = styled.tr`
  td {
    padding: 0.625rem 0.75rem;
    color: rgba(255, 255, 255, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  &:last-child td {
    border-bottom: none;
  }

  &:hover td {
    background: rgba(255, 255, 255, 0.03);
  }
`;

const SessionCellFlex = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => `${$color}40`};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);

  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

const ViewAllNote = styled.div`
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
`;
