import React, { useMemo, useState, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { AlertTriangle, Info, X, Calendar, Clock, MapPin, Users, ChevronDown } from 'lucide-react';
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
  subtitle: string;
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
  staleAvailable: number;
}

// ─── Teal-Blue Accent System ─────────────────────────────────────────────────

const TEAL = {
  cyan: '#00FFFF',
  bright: '#00C8FF',
  sky: '#0EA5E9',
  blue: '#3b82f6',
  green: '#10b981',
  muted: '#94a3b8',
  warn: '#f59e0b',
  error: '#ef4444',
  purple: '#8b5cf6',
};

// ─── Card Definitions ────────────────────────────────────────────────────────

const CARD_CONFIGS: CardConfig[] = [
  {
    key: 'total',
    label: 'Total Sessions',
    subtitle: 'All in scope',
    definition: 'All sessions in current scope and date range',
    color: TEAL.cyan,
    getValue: (s) => s.total,
  },
  {
    key: 'available',
    label: 'Available',
    subtitle: 'Upcoming open slots',
    definition: 'Open slots today or later, not yet booked by a client',
    color: TEAL.sky,
    getValue: (s) => s.available,
  },
  {
    key: 'scheduled',
    label: 'Scheduled',
    subtitle: 'Upcoming booked',
    definition: 'Booked or confirmed sessions today or later',
    color: TEAL.green,
    getValue: (s) => s.scheduled,
  },
  {
    key: 'completed',
    label: 'Completed',
    subtitle: 'Finished sessions',
    definition: 'Sessions that have been finished',
    color: TEAL.muted,
    getValue: (s) => s.completed,
  },
];

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  available: TEAL.sky,
  scheduled: TEAL.green,
  confirmed: '#059669',
  completed: TEAL.muted,
  cancelled: TEAL.error,
  blocked: TEAL.warn,
  requested: TEAL.purple,
};

function isUpcoming(session: any): boolean {
  const date = session.sessionDate || session.start || session.startTime;
  if (!date) return true; // no date = keep visible
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(date) >= startOfToday;
}

function getSessionDate(session: any): Date {
  const date = session.sessionDate || session.start || session.startTime;
  return date ? new Date(date) : new Date(0);
}

function getSessionsForFilter(sessions: any[], filterKey: string): any[] {
  if (filterKey === 'total') return sessions;
  if (filterKey === 'scheduled') {
    return sessions.filter(s =>
      (s.status === 'scheduled' || s.status === 'confirmed') && isUpcoming(s)
    );
  }
  if (filterKey === 'available') {
    return sessions.filter(s => s.status === 'available' && isUpcoming(s));
  }
  return sessions.filter(s => s.status === filterKey);
}

function sortSessions(sessions: any[], filterKey: string): any[] {
  const sorted = [...sessions];
  if (filterKey === 'completed') {
    // Completed: most recent first
    sorted.sort((a, b) => getSessionDate(b).getTime() - getSessionDate(a).getTime());
  } else {
    // Available/Scheduled/Total: nearest upcoming first
    sorted.sort((a, b) => getSessionDate(a).getTime() - getSessionDate(b).getTime());
  }
  return sorted;
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

const INITIAL_ROWS = 20;
const LOAD_MORE_INCREMENT = 20;

const ScheduleStats: React.FC<ScheduleStatsProps> = ({
  mode,
  sessions,
  creditsDisplay,
  lowCredits,
  statusFilter,
  onStatusFilterChange,
}) => {
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

  // Reset visible rows when filter changes
  const handleFilterChange = useCallback((key: string) => {
    setVisibleRows(INITIAL_ROWS);
    onStatusFilterChange(key);
  }, [onStatusFilterChange]);

  const stats = useMemo<Stats>(() => {
    const allAvailable = sessions.filter(s => s.status === 'available');
    const upcomingAvailable = allAvailable.filter(isUpcoming);
    const staleAvailable = allAvailable.length - upcomingAvailable.length;

    const scheduled = sessions.filter(s =>
      (s.status === 'scheduled' || s.status === 'confirmed') && isUpcoming(s)
    ).length;
    const completed = sessions.filter(s => s.status === 'completed').length;
    const total = sessions.length;
    const other = total - allAvailable.length - scheduled - completed;
    return {
      total,
      available: upcomingAvailable.length,
      scheduled,
      completed,
      other,
      staleAvailable,
    };
  }, [sessions]);

  const allFilteredSessions = useMemo(() => {
    if (!statusFilter) return [];
    const filtered = getSessionsForFilter(sessions, statusFilter);
    return sortSessions(filtered, statusFilter);
  }, [sessions, statusFilter]);

  const drillDownSessions = allFilteredSessions.slice(0, visibleRows);
  const drillDownTotal = allFilteredSessions.length;
  const hasMore = visibleRows < drillDownTotal;

  const activeConfig = statusFilter
    ? CARD_CONFIGS.find(c => c.key === statusFilter) || null
    : null;

  return (
    <StatsPanel>
      <HeaderRow>
        <PrimaryHeading style={{ fontSize: '1.5rem', marginBottom: 0, color: '#e2e8f0' }}>
          Schedule Overview
        </PrimaryHeading>
        <DateWindow>Today onward</DateWindow>
      </HeaderRow>

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
            onClick={() => handleFilterChange(card.key)}
          >
            <div className="stat-value" style={{ color: card.color }}>
              {card.getValue(stats)}
            </div>
            <CardLabel>{card.label}</CardLabel>
            <CardSubtitle>{card.subtitle}</CardSubtitle>
            <Tooltip className="tooltip">{card.definition}</Tooltip>
          </InteractiveStatCard>
        ))}

        {mode === 'client' && (
          <InteractiveStatCard
            as="div"
            $active={false}
            $accentColor={TEAL.cyan}
          >
            <div className="stat-value" style={{ color: TEAL.cyan }}>
              {creditsDisplay}
            </div>
            <CardLabel>Credits</CardLabel>
            <CardSubtitle>Remaining</CardSubtitle>
          </InteractiveStatCard>
        )}
      </GridContainer>

      {/* Secondary notes */}
      <NotesRow>
        {stats.staleAvailable > 0 && (
          <StaleNote>
            <Info size={13} />
            {stats.staleAvailable} past available slot{stats.staleAvailable !== 1 ? 's' : ''} not shown in Available count
          </StaleNote>
        )}
        {stats.other > 0 && (
          <OtherStatusNote>
            <Info size={13} />
            {stats.other} session{stats.other !== 1 ? 's' : ''} in other statuses (cancelled, blocked, requested)
          </OtherStatusNote>
        )}
      </NotesRow>

      {/* Drill-down panel */}
      <DrillDownWrapper $open={!!statusFilter}>
        {statusFilter && activeConfig && (
          <DrillDownPanel data-testid="schedule-kpi-drilldown">
            <DrillDownHeader>
              <DrillDownTitle>
                <StatusDot $color={activeConfig.color} />
                <div>
                  <DrillDownLabel>{activeConfig.label}</DrillDownLabel>
                  <DrillDownDefinition>{activeConfig.definition}</DrillDownDefinition>
                </div>
              </DrillDownTitle>
              <DrillDownActions>
                <DrillDownCount $color={activeConfig.color}>
                  {drillDownTotal} session{drillDownTotal !== 1 ? 's' : ''}
                </DrillDownCount>
                <ClearButton
                  type="button"
                  onClick={() => handleFilterChange(statusFilter)}
                  aria-label="Clear filter"
                >
                  <X size={16} />
                  Clear filter
                </ClearButton>
              </DrillDownActions>
            </DrillDownHeader>

            {drillDownSessions.length === 0 ? (
              <EmptyState>
                <Calendar size={32} style={{ opacity: 0.5, color: TEAL.sky }} />
                <EmptyTitle>No {activeConfig.label.toLowerCase()} sessions found</EmptyTitle>
                <EmptySubtext>
                  {statusFilter === 'available'
                    ? 'Create available slots from the schedule header'
                    : statusFilter === 'scheduled'
                    ? 'Sessions will appear here once clients book'
                    : 'Sessions will appear here once completed'}
                </EmptySubtext>
              </EmptyState>
            ) : (
              <>
                <TableScrollArea data-testid="schedule-drilldown-scroll">
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
                              <CellIcon><Calendar size={14} /></CellIcon>
                              {formatSessionDate(session)}
                            </SessionCellFlex>
                          </td>
                          <td>
                            <SessionCellFlex>
                              <CellIcon><Clock size={14} /></CellIcon>
                              {formatSessionTime(session)}
                            </SessionCellFlex>
                          </td>
                          {mode === 'admin' && (
                            <td className="hide-mobile">
                              <SessionCellFlex>
                                <CellIcon><Users size={14} /></CellIcon>
                                {formatPersonName(session.trainer)}
                              </SessionCellFlex>
                            </td>
                          )}
                          {mode !== 'client' && (
                            <td className="hide-mobile">
                              <SessionCellFlex>
                                <CellIcon><Users size={14} /></CellIcon>
                                {formatPersonName(session.client)}
                              </SessionCellFlex>
                            </td>
                          )}
                          <td>
                            <StatusBadge $color={STATUS_COLORS[session.status] || TEAL.muted}>
                              {session.status}
                            </StatusBadge>
                          </td>
                          <td className="hide-mobile">
                            <SessionCellFlex>
                              <CellIcon><MapPin size={14} /></CellIcon>
                              {session.location || 'Main Studio'}
                            </SessionCellFlex>
                          </td>
                        </SessionRow>
                      ))}
                    </tbody>
                  </SessionTable>
                </TableScrollArea>

                <TableFooter>
                  <RowCount>
                    Showing {Math.min(visibleRows, drillDownTotal)} of {drillDownTotal}
                  </RowCount>
                  {hasMore && (
                    <LoadMoreButton
                      type="button"
                      onClick={() => setVisibleRows(v => v + LOAD_MORE_INCREMENT)}
                    >
                      <ChevronDown size={16} />
                      Load more ({Math.min(LOAD_MORE_INCREMENT, drillDownTotal - visibleRows)} rows)
                    </LoadMoreButton>
                  )}
                </TableFooter>
              </>
            )}
          </DrillDownPanel>
        )}
      </DrillDownWrapper>
    </StatsPanel>
  );
};

export default ScheduleStats;

// ─── Styled Components — Teal-Blue Contrast Protocol ─────────────────────────

const StatsPanel = styled.div`
  margin: 1rem 2rem;
  padding: 1.5rem;
  background: rgba(10, 15, 30, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(14, 165, 233, 0.15);
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
    background: rgba(10, 15, 30, 0.92);
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

const HeaderRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.25rem;
  }
`;

const DateWindow = styled.span`
  font-size: 0.8rem;
  color: ${TEAL.sky};
  background: rgba(14, 165, 233, 0.1);
  padding: 2px 10px;
  border-radius: 12px;
  border: 1px solid rgba(14, 165, 233, 0.2);
  white-space: nowrap;
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
  background: rgba(5, 10, 25, 0.97);
  color: #e2e8f0;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease;
  z-index: 10;
  border: 1px solid rgba(14, 165, 233, 0.25);

  @media (max-width: 768px) {
    display: none;
  }
`;

const CardLabel = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-top: 0.25rem;
`;

const CardSubtitle = styled.div`
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 2px;
`;

const InteractiveStatCard = styled.button<{ $active: boolean; $accentColor: string }>`
  position: relative;
  text-align: center;
  padding: 1.5rem 1rem;
  min-height: 44px;
  background: rgba(15, 23, 42, 0.8);
  border: 2px solid rgba(51, 65, 85, 0.5);
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
    margin-bottom: 0.25rem;
    line-height: 1;
  }

  &:hover {
    background: rgba(15, 23, 42, 0.95);
    border-color: rgba(148, 163, 184, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  &:hover .tooltip {
    opacity: 1;
  }

  &:focus-visible {
    border-color: ${TEAL.cyan};
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  ${({ $active, $accentColor }) =>
    $active &&
    css`
      border-color: ${$accentColor};
      background: rgba(15, 23, 42, 0.95);
      box-shadow: 0 0 20px ${$accentColor}40, 0 0 40px ${$accentColor}15;
      transform: scale(1.03);

      &:hover {
        transform: scale(1.03) translateY(-1px);
      }
    `}

  @media (max-width: 768px) {
    padding: 1.25rem 0.75rem;

    .stat-value {
      font-size: 1.75rem;
    }
  }

  @media (max-width: 480px) {
    padding: 1rem 0.625rem;

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

const NotesRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const StaleNote = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.78rem;
  color: ${TEAL.warn};
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 6px;
`;

const OtherStatusNote = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.78rem;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 6px;
`;

const DrillDownWrapper = styled.div<{ $open: boolean }>`
  overflow: hidden;
  max-height: ${({ $open }) => ($open ? '2000px' : '0')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: max-height 300ms ease, opacity 200ms ease;
`;

const DrillDownPanel = styled.div`
  margin-top: 1rem;
  padding: 1.25rem;
  background: rgba(8, 12, 28, 0.9);
  border: 1px solid rgba(14, 165, 233, 0.12);
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
`;

const DrillDownLabel = styled.strong`
  font-size: 1rem;
  color: #e2e8f0;
`;

const DrillDownDefinition = styled.div`
  font-size: 0.8rem;
  color: #94a3b8;
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
  box-shadow: 0 0 6px ${({ $color }) => $color}60;
`;

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 6px 12px;
  min-height: 44px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: rgba(51, 65, 85, 0.6);
    color: #f1f5f9;
    border-color: rgba(148, 163, 184, 0.4);
  }

  &:focus-visible {
    outline: 2px solid ${TEAL.cyan};
    outline-offset: 2px;
  }
`;

const TableScrollArea = styled.div`
  max-height: 420px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.3);

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.5);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.4);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.5);
  }

  @media (max-width: 768px) {
    max-height: 300px;
  }
`;

const SessionTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  thead {
    position: sticky;
    top: 0;
    z-index: 2;
    background: rgba(15, 23, 42, 0.98);
  }

  thead th {
    text-align: left;
    padding: 0.625rem 0.75rem;
    color: #94a3b8;
    font-weight: 600;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border-bottom: 1px solid rgba(51, 65, 85, 0.5);
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
    color: #cbd5e1;
    border-bottom: 1px solid rgba(30, 41, 59, 0.6);
  }

  &:last-child td {
    border-bottom: none;
  }

  &:hover td {
    background: rgba(30, 41, 59, 0.5);
  }
`;

const SessionCellFlex = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

const CellIcon = styled.span`
  display: inline-flex;
  color: #64748b;
  flex-shrink: 0;
`;

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background: ${({ $color }) => `${$color}25`};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => `${$color}50`};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  text-align: center;
`;

const EmptyTitle = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: #cbd5e1;
  font-weight: 500;
`;

const EmptySubtext = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
`;

const TableFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(51, 65, 85, 0.3);
`;

const RowCount = styled.span`
  font-size: 0.8rem;
  color: #94a3b8;
`;

const LoadMoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 6px 14px;
  min-height: 44px;
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 6px;
  color: ${TEAL.sky};
  font-size: 0.8rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: rgba(14, 165, 233, 0.15);
    border-color: rgba(14, 165, 233, 0.35);
    color: ${TEAL.bright};
  }

  &:focus-visible {
    outline: 2px solid ${TEAL.cyan};
    outline-offset: 2px;
  }
`;
