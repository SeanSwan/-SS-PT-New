/**
 * FILE: ClientTrainingPlanVaultCard.tsx
 * PURPOSE: Read-only seven-horizon training-plan vault for the client overview.
 */

import React from 'react';
import { Dumbbell, FileText, Layers3 } from 'lucide-react';
import { formatPlanBillingIntentLabel, formatPlanUseLabel } from '../../../../../utils/workoutPlanAssignmentSemantics';
import type { ClientTrainingPlanSlot, ClientTrainingPlanVault, CurrentClientWorkout } from './useCurrentClientWorkout';
import { CardInner, MutedText, SectionKicker, SectionTitle } from './ClientObservatoryShell.styles';
import {
  SmallButton,
  WidgetCard,
  WidgetHeader,
  WidgetLabel,
  WidgetList,
  WidgetRow,
  WidgetValue,
} from './ClientObservatoryFeed.styles';

interface ClientTrainingPlanVaultCardProps {
  planVault?: ClientTrainingPlanVault | null;
  currentWorkout?: CurrentClientWorkout | null;
  loading?: boolean;
  error?: boolean;
  canLogToday?: boolean;
  onNavigate: (path: string) => void;
  onViewPdf: (slot: ClientTrainingPlanSlot) => void;
  showOpenButton?: boolean;
}

const FALLBACK_SLOTS: ClientTrainingPlanSlot[] = [
  {
    horizonKey: 'six_month', label: '6 Month', isDefaultHorizon: true, isFilled: false, isPrimary: false,
  },
];

function slotStatus(slot: ClientTrainingPlanSlot): string {
  if (slot.isPrimary) return 'Primary';
  if (slot.isFilled) return slot.planStatus === 'paused' ? 'Paused' : 'Ready';
  if (slot.isDefaultHorizon) return 'Default';
  return 'Pending';
}

function slotDetail(slot: ClientTrainingPlanSlot): string {
  if (slot.planTitle) return slot.planTitle;
  if (slot.isDefaultHorizon) return 'Default arc pending';
  return 'Pending';
}

function slotUseDetail(slot: ClientTrainingPlanSlot): string | null {
  if (!slot.isFilled) return null;
  return `${formatPlanUseLabel(slot.assignmentDefault)} - ${formatPlanBillingIntentLabel(slot)}`;
}

function slotCursorDetail(slot: ClientTrainingPlanSlot): string | null {
  const parts = [
    slot.currentWeek ? `Week ${slot.currentWeek}` : null,
    slot.currentDay ? `Day ${slot.currentDay}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' - ') : null;
}

function todayLogPath(workout?: CurrentClientWorkout | null): string {
  const params = new URLSearchParams({ loadPlan: 'today' });
  if (workout?.assignmentKey) params.set('assignmentKey', workout.assignmentKey);
  if (workout?.assignmentType) params.set('assignmentType', workout.assignmentType);
  return `/dashboard/client/log-workout?${params.toString()}`;
}

function assignmentBelongsToSlot(slot: ClientTrainingPlanSlot, workout?: CurrentClientWorkout | null): boolean {
  if (!workout?.assignmentKey || !slot.planId) return true;
  return workout.assignmentKey.startsWith(`${slot.planId}:`);
}

function canLogFromSlot(
  slot: ClientTrainingPlanSlot,
  canLogToday: boolean,
  workout?: CurrentClientWorkout | null,
): boolean {
  return canLogToday
    && slot.isPrimary
    && slot.isFilled
    && slot.planStatus !== 'paused'
    && assignmentBelongsToSlot(slot, workout);
}

const ClientTrainingPlanVaultCard: React.FC<ClientTrainingPlanVaultCardProps> = ({
  planVault,
  currentWorkout,
  loading = false,
  error = false,
  canLogToday = true,
  onNavigate,
  onViewPdf,
  showOpenButton = true,
}) => {
  const slots = planVault?.slots?.length ? planVault.slots : FALLBACK_SLOTS;
  const filledCount = planVault?.filledCount || 0;

  return (
    <WidgetCard data-testid="client-plan-vault-card">
      <CardInner>
        <WidgetHeader>
          <div>
            <SectionKicker>
              <Layers3 size={14} aria-hidden="true" />
              Plan Vault
            </SectionKicker>
            <SectionTitle>
              {loading ? 'Loading plan arcs' : `${filledCount} of 7 arcs ready`}
            </SectionTitle>
          </div>
          {showOpenButton && (
            <SmallButton
              type="button"
              aria-label="Open workout plan vault"
              onClick={() => onNavigate('/dashboard/client/workouts')}
            >
              Open
            </SmallButton>
          )}
        </WidgetHeader>
        {error ? (
          <MutedText>Plan arcs are unavailable. Open My Workouts or refresh the dashboard.</MutedText>
        ) : (
          <WidgetList>
            {slots.map((slot) => {
              const useDetail = slotUseDetail(slot);
              const cursorDetail = slotCursorDetail(slot);
              return (
                <WidgetRow
                  key={slot.horizonKey}
                  aria-label={`${slot.label} ${slotStatus(slot)} plan arc`}
                >
                  <WidgetLabel>{slot.label}</WidgetLabel>
                  <WidgetValue>{slotStatus(slot)}</WidgetValue>
                  <WidgetLabel>{slotDetail(slot)}</WidgetLabel>
                  {cursorDetail && (
                    <WidgetLabel>{cursorDetail}</WidgetLabel>
                  )}
                  {useDetail && (
                    <WidgetLabel>{useDetail}</WidgetLabel>
                  )}
                  {canLogFromSlot(slot, canLogToday, currentWorkout) && (
                    <SmallButton
                      type="button"
                      onClick={() => onNavigate(todayLogPath(currentWorkout))}
                      aria-label={`Log Today from ${slot.label} primary plan`}
                    >
                      <Dumbbell size={14} aria-hidden="true" />
                      Log Today
                    </SmallButton>
                  )}
                  {slot.pdfFile && (
                    <SmallButton
                      type="button"
                      onClick={() => onViewPdf(slot)}
                      aria-label={`View ${slot.label} PDF plan`}
                    >
                      <FileText size={14} aria-hidden="true" />
                      Open PDF
                    </SmallButton>
                  )}
                </WidgetRow>
              );
            })}
          </WidgetList>
        )}
      </CardInner>
    </WidgetCard>
  );
};

export default ClientTrainingPlanVaultCard;
