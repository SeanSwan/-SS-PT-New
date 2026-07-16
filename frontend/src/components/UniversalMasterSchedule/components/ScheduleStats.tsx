import React, { useMemo, useState, useCallback } from 'react';
import { AlertTriangle, Info, X, Calendar, Clock, MapPin, Users, ChevronDown } from 'lucide-react';
import { GridContainer, SmallText } from '../ui';
import {
  CARD_CONFIGS,
  STATUS_COLORS,
  SCHEDULE_STAT_COLORS,
  formatPersonName,
  formatSessionDate,
  formatSessionTime,
  getScheduleSessionRowKey,
  getSessionsForFilter,
  isUpcoming,
  sortSessions,
  type Stats,
} from './ScheduleStats.logic';
import * as S from './ScheduleStats.styles';
import {
  getClientSessionSignal,
  isNonDeductingClientSource,
} from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import { StyledBox } from '@/components/ui/StyledBox';

interface ScheduleStatsProps {
  mode: 'admin' | 'trainer' | 'client';
  sessions: any[];
  creditsDisplay: string | number;
  sessionsRemaining?: number;
  clientSource?: string | null;
  lowCredits: boolean;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
}

const INITIAL_ROWS = 20;
const LOAD_MORE_INCREMENT = 20;

const ScheduleStats: React.FC<ScheduleStatsProps> = ({
  mode,
  sessions,
  creditsDisplay,
  sessionsRemaining,
  clientSource,
  lowCredits,
  statusFilter,
  onStatusFilterChange,
}) => {
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

  const handleFilterChange = useCallback((key: string) => {
    setVisibleRows(INITIAL_ROWS);
    onStatusFilterChange(key);
  }, [onStatusFilterChange]);

  const stats = useMemo<Stats>(() => {
    const allAvailable = sessions.filter((session) => session.status === 'available');
    const upcomingAvailable = allAvailable.filter(isUpcoming);
    const staleAvailable = allAvailable.length - upcomingAvailable.length;
    const scheduled = sessions.filter(
      (session) => (session.status === 'scheduled' || session.status === 'confirmed') && isUpcoming(session)
    ).length;
    const completed = sessions.filter((session) => session.status === 'completed').length;
    const cancelled = sessions.filter((session) => session.status === 'cancelled').length;

    return {
      total: upcomingAvailable.length + scheduled + completed,
      available: upcomingAvailable.length,
      scheduled,
      completed,
      other: cancelled,
      staleAvailable,
    };
  }, [sessions]);

  const allFilteredSessions = useMemo(() => {
    if (!statusFilter) return [];
    return sortSessions(getSessionsForFilter(sessions, statusFilter), statusFilter);
  }, [sessions, statusFilter]);

  const drillDownSessions = allFilteredSessions.slice(0, visibleRows);
  const drillDownTotal = allFilteredSessions.length;
  const hasMore = visibleRows < drillDownTotal;
  const activeConfig = statusFilter
    ? CARD_CONFIGS.find((card) => card.key === statusFilter) || null
    : null;
  const isNonDeductingClient = isNonDeductingClientSource(clientSource);
  const shouldShowLowCreditsWarning = mode === 'client' && lowCredits && !isNonDeductingClient;
  const clientSessionSignal = getClientSessionSignal({
    clientSource,
    availableSessions: sessionsRemaining
  });

  return (
    <S.StatsPanel>
      <S.HeaderRow>
        <S.ScheduleOverviewHeading>Schedule Overview</S.ScheduleOverviewHeading>
        <S.DateWindow>Today onward</S.DateWindow>
      </S.HeaderRow>

      {shouldShowLowCreditsWarning && (
        <S.CreditWarning>
          <AlertTriangle size={18} />
          <div>
            <SmallText>
              Low credits: {creditsDisplay} sessions remaining. Visit the store to purchase more.
            </SmallText>
          </div>
        </S.CreditWarning>
      )}

      <GridContainer columns={mode === 'client' ? 6 : 5} gap="1rem">
        {CARD_CONFIGS.map((card) => (
          <S.InteractiveStatCard
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
            <StyledBox as="div" className="stat-value" $style={{ color: card.color }}>
              {card.getValue(stats)}
            </StyledBox>
            <S.CardLabel>{card.label}</S.CardLabel>
            <S.CardSubtitle>{card.subtitle}</S.CardSubtitle>
            <S.Tooltip className="tooltip">{card.definition}</S.Tooltip>
          </S.InteractiveStatCard>
        ))}

        {mode === 'client' && (
          <S.InteractiveStatCard
            as="div"
            $active={false}
            $accentColor={SCHEDULE_STAT_COLORS.secondary}
          >
            <StyledBox as="div" className="stat-value" $style={{ color: SCHEDULE_STAT_COLORS.secondary }}>
              {isNonDeductingClient ? 'Log' : creditsDisplay}
            </StyledBox>
            <S.CardLabel>{isNonDeductingClient ? 'Tracking' : 'Credits'}</S.CardLabel>
            <S.CardSubtitle>{clientSessionSignal.label}</S.CardSubtitle>
            <S.Tooltip className="tooltip">{clientSessionSignal.note}</S.Tooltip>
          </S.InteractiveStatCard>
        )}
      </GridContainer>

      <S.NotesRow>
        {stats.staleAvailable > 0 && (
          <S.StaleNote>
            <Info size={13} />
            {stats.staleAvailable} past available slot{stats.staleAvailable !== 1 ? 's' : ''} not shown in Available count
          </S.StaleNote>
        )}
        {stats.other > 0 && (
          <S.OtherStatusNote>
            <Info size={13} />
            {stats.other} cancelled session{stats.other !== 1 ? 's' : ''}
          </S.OtherStatusNote>
        )}
      </S.NotesRow>

      <S.DrillDownWrapper $open={!!statusFilter}>
        {statusFilter && activeConfig && (
          <S.DrillDownPanel data-testid="schedule-kpi-drilldown">
            <S.DrillDownHeader>
              <S.DrillDownTitle>
                <S.StatusDot $color={activeConfig.color} />
                <div>
                  <S.DrillDownLabel>{activeConfig.label}</S.DrillDownLabel>
                  <S.DrillDownDefinition>{activeConfig.definition}</S.DrillDownDefinition>
                </div>
              </S.DrillDownTitle>
              <S.DrillDownActions>
                <S.DrillDownCount $color={activeConfig.color}>
                  {drillDownTotal} session{drillDownTotal !== 1 ? 's' : ''}
                </S.DrillDownCount>
                <S.ClearButton
                  type="button"
                  onClick={() => handleFilterChange(statusFilter)}
                  aria-label="Clear filter"
                >
                  <X size={16} />
                  Clear filter
                </S.ClearButton>
              </S.DrillDownActions>
            </S.DrillDownHeader>

            {drillDownSessions.length === 0 ? (
              <S.EmptyState>
                <StyledBox as={Calendar} size={32} $style={{ opacity: 0.5, color: SCHEDULE_STAT_COLORS.primary }} />
                <S.EmptyTitle>No {activeConfig.label.toLowerCase()} sessions found</S.EmptyTitle>
                <S.EmptySubtext>
                  {statusFilter === 'available'
                    ? 'Create available slots from the schedule header'
                    : statusFilter === 'scheduled'
                      ? 'Sessions will appear here once clients book'
                      : statusFilter === 'other'
                      ? 'No cancelled sessions found'
                        : 'Sessions will appear here once completed'}
                </S.EmptySubtext>
              </S.EmptyState>
            ) : (
              <>
                <S.TableScrollArea data-testid="schedule-drilldown-scroll">
                  <S.SessionTable>
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
                      {drillDownSessions.map((session: any) => (
                        <S.SessionRow key={getScheduleSessionRowKey(session)}>
                          <td>
                            <S.SessionCellFlex>
                              <S.CellIcon><Calendar size={14} /></S.CellIcon>
                              {formatSessionDate(session)}
                            </S.SessionCellFlex>
                          </td>
                          <td>
                            <S.SessionCellFlex>
                              <S.CellIcon><Clock size={14} /></S.CellIcon>
                              {formatSessionTime(session)}
                            </S.SessionCellFlex>
                          </td>
                          {mode === 'admin' && (
                            <td className="hide-mobile">
                              <S.SessionCellFlex>
                                <S.CellIcon><Users size={14} /></S.CellIcon>
                                {formatPersonName(session.trainer)}
                              </S.SessionCellFlex>
                            </td>
                          )}
                          {mode !== 'client' && (
                            <td className="hide-mobile">
                              <S.SessionCellFlex>
                                <S.CellIcon><Users size={14} /></S.CellIcon>
                                {formatPersonName(session.client)}
                              </S.SessionCellFlex>
                            </td>
                          )}
                          <td>
                            <S.StatusBadge $color={STATUS_COLORS[session.status] || SCHEDULE_STAT_COLORS.muted}>
                              {session.status}
                            </S.StatusBadge>
                          </td>
                          <td className="hide-mobile">
                            <S.SessionCellFlex>
                              <S.CellIcon><MapPin size={14} /></S.CellIcon>
                              {session.location || 'Main Studio'}
                            </S.SessionCellFlex>
                          </td>
                        </S.SessionRow>
                      ))}
                    </tbody>
                  </S.SessionTable>
                </S.TableScrollArea>

                <S.TableFooter>
                  <S.RowCount>
                    Showing {Math.min(visibleRows, drillDownTotal)} of {drillDownTotal}
                  </S.RowCount>
                  {hasMore && (
                    <S.LoadMoreButton
                      type="button"
                      onClick={() => setVisibleRows((value) => value + LOAD_MORE_INCREMENT)}
                    >
                      <ChevronDown size={16} />
                      Load more ({Math.min(LOAD_MORE_INCREMENT, drillDownTotal - visibleRows)} rows)
                    </S.LoadMoreButton>
                  )}
                </S.TableFooter>
              </>
            )}
          </S.DrillDownPanel>
        )}
      </S.DrillDownWrapper>
    </S.StatsPanel>
  );
};

export default ScheduleStats;
