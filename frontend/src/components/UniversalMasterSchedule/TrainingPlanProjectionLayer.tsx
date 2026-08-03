/**
 * ============================================================================
 * FILE: TrainingPlanProjectionLayer.tsx
 * PURPOSE: Present plan-derived schedule projections without appointment powers.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders bounded planned-training cards, safe loading and
 * retry states, staff client labels, completion truth, and appointment overlap.
 * HOW IT FITS IN THE APP: UniversalMasterSchedule mounts this layer above its
 * canonical client timeline or appointment calendar; no schedule mutation path
 * receives a projection object.
 * KEY DECISIONS: Cards are read-only, billing-neutral, explicitly collapsible,
 * and separated from booking, rescheduling, credit, and drag/drop controls.
 */

import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { ScheduleView } from '../../redux/slices/scheduleSlice';
import {
  buildAppointmentCoexistenceKeys,
  filterProjectionItemsByTrainer,
  groupProjectionItemsByDate,
  type ProjectionSessionLike,
} from './TrainingPlanProjectionLayer.logic';
import { useTrainingPlanProjections } from './hooks/useTrainingPlanProjections';
import {
  Card,
  CardGrid,
  CardTop,
  ClientName,
  Coexistence,
  Overdue,
  ControlButton,
  DateGroup,
  DateHeading,
  DayLabel,
  Detail,
  Footer,
  Groups,
  Header,
  HeaderActions,
  HeadingGroup,
  IconFrame,
  Kicker,
  Layer,
  Meta,
  Notice,
  PlanTitle,
  SafetyBadge,
  StateMessage,
  Status,
  Subtitle,
  Title,
} from './TrainingPlanProjectionLayer.styles';

interface ProjectionClient {
  id?: string | number | null;
  firstName?: string | null;
  lastName?: string | null;
}

interface TrainingPlanProjectionLayerProps {
  mode: 'admin' | 'trainer' | 'client';
  activeView: ScheduleView;
  currentDate: Date;
  clients: readonly ProjectionClient[];
  sessions: readonly ProjectionSessionLike[];
  clientRosterLoading: boolean;
  trainerFilterId?: string | number | null;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

const formatDateOnly = (dateOnly: string): string => {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return dateFormatter.format(new Date(year, month - 1, day, 12));
};

const humanize = (value: string): string => value
  .split('_')
  .filter(Boolean)
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join(' ');

const TrainingPlanProjectionLayer: React.FC<TrainingPlanProjectionLayerProps> = ({
  mode,
  activeView,
  currentDate,
  clients,
  sessions,
  clientRosterLoading,
  trainerFilterId,
}) => {
  const [expanded, setExpanded] = useState(true);
  const projectionState = useTrainingPlanProjections({
    mode,
    activeView,
    currentDate,
    clients,
    clientRosterLoading,
  });
  const staffMode = mode !== 'client';
  const clientNames = useMemo(() => new Map(clients.map((client) => {
    const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
    return [String(client.id), name || 'Assigned client'];
  })), [clients]);
  const appointmentKeys = useMemo(
    () => buildAppointmentCoexistenceKeys(sessions),
    [sessions],
  );
  const filteredItems = useMemo(
    () => filterProjectionItemsByTrainer(projectionState.items, trainerFilterId),
    [projectionState.items, trainerFilterId],
  );
  const groups = useMemo(() => groupProjectionItemsByDate(filteredItems), [filteredItems]);

  if (!projectionState.enabled || projectionState.status === 'disabled') return null;

  return (
    <Layer role="region" aria-label="Planned training">
      <Header>
        <HeadingGroup>
          <IconFrame aria-hidden="true"><CalendarRange size={21} /></IconFrame>
          <div>
            <Kicker>Training plan overlay</Kicker>
            <Title>Planned Training</Title>
            <Subtitle>
              Plan assignments stay separate from appointments. Changes happen in the training plan.
            </Subtitle>
          </div>
        </HeadingGroup>
        <HeaderActions>
          <SafetyBadge><ShieldCheck size={16} aria-hidden="true" /> Read only · No credit impact</SafetyBadge>
          <ControlButton
            type="button"
            aria-label={`${expanded ? 'Hide' : 'Show'} planned training`}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            {expanded ? 'Hide' : 'Show'} plans
          </ControlButton>
        </HeaderActions>
      </Header>

      {expanded && (
        <>
          {projectionState.clientScopeLimited && (
            <Notice>
              Showing the first 50 of {projectionState.totalScopedClients} authorized clients.
              Narrow the schedule lens to inspect the rest.
            </Notice>
          )}

          {projectionState.status === 'ready' && projectionState.error && (
            <Notice role="alert">{projectionState.error}</Notice>
          )}
          {(projectionState.status === 'waiting' || projectionState.status === 'loading') && (
            <StateMessage role="status">Loading planned training…</StateMessage>
          )}

          {projectionState.status === 'error' && (
            <StateMessage role="alert">
              <span>{projectionState.error || 'Could not load planned training.'}</span>
              <ControlButton
                type="button"
                aria-label="Retry planned training"
                onClick={projectionState.retry}
              >
                <RefreshCw size={16} aria-hidden="true" /> Retry
              </ControlButton>
            </StateMessage>
          )}

          {projectionState.status === 'ready' && groups.length === 0 && (
            <StateMessage>No planned training in this view.</StateMessage>
          )}

          {projectionState.status === 'ready' && groups.length > 0 && (
            <Groups>
              {groups.map((group) => (
                <DateGroup key={group.date} aria-labelledby={`projection-date-${group.date}`}>
                  <DateHeading id={`projection-date-${group.date}`}>
                    {formatDateOnly(group.date)}
                  </DateHeading>
                  <CardGrid>
                    {group.items.map((item) => {
                      const completed = item.completionState === 'completed';
                      const exerciseText = item.exercisePreview.length
                        ? item.exercisePreview.join(' · ')
                        : item.exerciseCount
                          ? `${item.exerciseCount} prescribed exercises`
                          : 'No exercise preview';
                      return (
                        <Card key={item.projectionId} aria-label={`${item.dayLabel}, ${completed ? 'completed' : 'planned'}`}>
                          <CardTop>
                            <ClientName>
                              {staffMode ? clientNames.get(String(item.clientId)) || 'Assigned client' : 'Your plan'}
                            </ClientName>
                            {!completed && item.overdueDays != null && (
                              <Overdue aria-label={`${item.overdueDays} days behind plan`}>{item.overdueDays}d behind</Overdue>
                            )}
                            <Status $completed={completed}>{completed ? 'Completed' : 'Planned'}</Status>
                          </CardTop>
                          <PlanTitle>{item.title}</PlanTitle>
                          <DayLabel>{item.dayLabel}</DayLabel>
                          <Meta>
                            <span>W{item.weekNumber} · D{item.dayNumber}</span>
                            <span>{humanize(item.assignmentType)}</span>
                            <span>Revision {item.prescribedRevision}</span>
                          </Meta>
                          {item.focus && <Detail>{item.focus}</Detail>}
                          <Detail>{exerciseText}</Detail>
                          {appointmentKeys.has(item.coexistenceKey) && (
                            <Coexistence>
                              <CalendarClock size={15} aria-hidden="true" /> Appointment also scheduled
                            </Coexistence>
                          )}
                        </Card>
                      );
                    })}
                  </CardGrid>
                </DateGroup>
              ))}
            </Groups>
          )}

          {projectionState.status === 'ready' && projectionState.total > 0 && (
            <Footer>
              <span>
                {trainerFilterId
                  ? `Showing ${filteredItems.length} filtered of ${projectionState.items.length} loaded assignments.`
                  : `Showing ${filteredItems.length} of ${projectionState.total} planned assignments.`}
              </span>
              {projectionState.hasMore && (
                <ControlButton
                  type="button"
                  aria-label="Load more planned training"
                  disabled={projectionState.loadingMore}
                  onClick={() => void projectionState.loadMore()}
                >
                  {projectionState.loadingMore ? 'Loading…' : 'Load more'}
                </ControlButton>
              )}
            </Footer>
          )}
        </>
      )}
    </Layer>
  );
};

export default TrainingPlanProjectionLayer;