/**
 * ============================================================================
 * FILE: ClientCurrentWorkoutCard.tsx
 * PURPOSE: Current-workout call-to-action card for the client overview rail.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Converts the canonical current-workout read model into one compact client
 * dashboard CTA, including off-day homework, trainer sessions, rest days, and
 * completed assignment states.
 *
 * HOW IT FITS IN THE APP:
 * ClientHomeTab fetches /api/workouts/:clientId/current, then this card decides
 * the visible label and route target for logging today's assignment or reviewing
 * the broader workout plan/history.
 */

import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import {
  CardInner,
  MutedText,
  SectionKicker,
  SectionTitle,
} from './ClientObservatoryShell.styles';
import {
  SmallButton,
  WidgetCard,
  WidgetHeader,
  WidgetLabel,
  WidgetList,
  WidgetRow,
  WidgetValue,
} from './ClientObservatoryFeed.styles';
import { buildClientCurrentWorkoutViewModel } from './ClientCurrentWorkoutCard.viewModel';
import type { CurrentClientWorkout } from './useCurrentClientWorkout';

interface ClientCurrentWorkoutCardProps {
  currentWorkout?: CurrentClientWorkout | null;
  currentWorkoutError?: boolean;
  currentWorkoutLoading?: boolean;
  onNavigate: (path: string) => void;
}

const ClientCurrentWorkoutCard: React.FC<ClientCurrentWorkoutCardProps> = ({
  currentWorkout,
  currentWorkoutError,
  currentWorkoutLoading,
  onNavigate,
}) => {
  const viewModel = buildClientCurrentWorkoutViewModel({
    workout: currentWorkout,
    error: currentWorkoutError,
    loading: currentWorkoutLoading,
  });

  return (
    <WidgetCard data-testid="current-workout-card">
      <CardInner>
        <WidgetHeader>
          <div>
            <SectionKicker>
              <ClipboardCheck size={14} aria-hidden="true" />
              {viewModel.kicker}
            </SectionKicker>
            <SectionTitle>{viewModel.title}</SectionTitle>
          </div>
          <SmallButton
            type="button"
            aria-label={viewModel.action.ariaLabel}
            onClick={() => onNavigate(viewModel.action.path)}
          >
            {viewModel.action.label}
          </SmallButton>
        </WidgetHeader>
        <WidgetList>
          {viewModel.rows.map((row) => (
            <WidgetRow key={`${row.label}:${row.value}`}>
              <WidgetLabel>{row.label}</WidgetLabel>
              <WidgetValue>{row.value}</WidgetValue>
            </WidgetRow>
          ))}
        </WidgetList>
        <MutedText $top="0.75rem">
          {viewModel.detail}
        </MutedText>
      </CardInner>
    </WidgetCard>
  );
};

export default ClientCurrentWorkoutCard;
