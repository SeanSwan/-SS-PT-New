/**
 * FILE: ClientTrainingPlanVaultCard.tsx
 * PURPOSE: Read-only seven-horizon training-plan vault for the client overview.
 */

import React from 'react';
import { FileText, Layers3 } from 'lucide-react';
import type { ClientTrainingPlanSlot, ClientTrainingPlanVault } from './useCurrentClientWorkout';
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
  loading?: boolean;
  error?: boolean;
  onNavigate: (path: string) => void;
  onViewPdf: (slot: ClientTrainingPlanSlot) => void;
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

const ClientTrainingPlanVaultCard: React.FC<ClientTrainingPlanVaultCardProps> = ({
  planVault,
  loading = false,
  error = false,
  onNavigate,
  onViewPdf,
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
          <SmallButton
            type="button"
            aria-label="Open workout plan vault"
            onClick={() => onNavigate('/dashboard/client/workouts')}
          >
            Open
          </SmallButton>
        </WidgetHeader>
        {error ? (
          <MutedText>Plan arcs are unavailable. Open My Workouts or refresh the dashboard.</MutedText>
        ) : (
          <WidgetList>
            {slots.map((slot) => (
              <WidgetRow key={slot.horizonKey}>
                <WidgetLabel>{slot.isPrimary ? `${slot.label} Primary` : slot.label}</WidgetLabel>
                <WidgetValue>{slotStatus(slot)}</WidgetValue>
                <WidgetLabel>{slotDetail(slot)}</WidgetLabel>
                {slot.pdfFile && (
                  <SmallButton
                    type="button"
                    onClick={() => onViewPdf(slot)}
                    aria-label={`View ${slot.label} PDF plan`}
                  >
                    <FileText size={14} aria-hidden="true" />
                    PDF
                  </SmallButton>
                )}
              </WidgetRow>
            ))}
          </WidgetList>
        )}
      </CardInner>
    </WidgetCard>
  );
};

export default ClientTrainingPlanVaultCard;
