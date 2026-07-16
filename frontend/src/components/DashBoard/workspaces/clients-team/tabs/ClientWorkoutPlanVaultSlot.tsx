/**
 * ============================================================================
 * FILE: ClientWorkoutPlanVaultSlot.tsx
 * PURPOSE: Compact command tile for one saved-plan horizon.
 * ============================================================================
 *
 * A plan's active status is the only current/primary truth. A non-current slot
 * exposes one activation command, avoiding parallel "activate" and "primary"
 * controls that would dispatch the same canonical lifecycle transition.
 */

import React from 'react';
import { Crown, ExternalLink, PlayCircle } from 'lucide-react';
import {
  isClientPlanActiveStatus,
  type ClientPlanHorizonSlot,
  type ClientPlanSummary,
} from './ClientWorkoutPlansPanel.logic';
import { formatPlanUseLabel } from './ClientWorkoutPlanUse.logic';
import {
  PlanActionButton,
  PlanActions,
  VaultSlot,
  VaultSlotDetail,
  VaultSlotLabel,
  VaultSlotPlanName,
  VaultSlotStatus,
  VaultSlotTop,
} from './ClientWorkoutPlansPanel.styles';

interface ClientWorkoutPlanVaultSlotProps {
  activatingPlanId: string | null;
  openingPdfId: string | null;
  slot: ClientPlanHorizonSlot;
  onActivate: (plan: ClientPlanSummary) => void;
  onOpenPdf: (plan: ClientPlanSummary) => void;
}

const slotPlanName = (slot: ClientPlanHorizonSlot) => slot.plan?.name || 'Pending';
const activeSlot = (slot: ClientPlanHorizonSlot) => (
  Boolean(slot.plan && isClientPlanActiveStatus(slot.plan.status))
);
const vaultSlotStatus = (slot: ClientPlanHorizonSlot) => {
  if (slot.isPrimary || activeSlot(slot)) return 'Current';
  if (slot.plan?.status === 'paused') return 'Paused';
  if (slot.isFilled) return 'Ready';
  return slot.isDefaultHorizon ? 'Default' : 'Pending';
};
const vaultSlotDetail = (slot: ClientPlanHorizonSlot) => {
  if (slot.plan) {
    return `${slot.durationWeeks} weeks - ${slot.plan.status} - ${formatPlanUseLabel(slot.plan.assignmentDefault)}`;
  }
  return slot.isDefaultHorizon ? 'Default six-month arc pending' : 'No plan saved yet';
};

const ActivateArcAction: React.FC<{
  activatingPlanId: string | null;
  plan: ClientPlanSummary;
  slot: ClientPlanHorizonSlot;
  onActivate: (plan: ClientPlanSummary) => void;
}> = ({ activatingPlanId, plan, slot, onActivate }) => {
  if (isClientPlanActiveStatus(plan.status)) return null;
  const busy = activatingPlanId === plan.id;
  return (
    <PlanActionButton
      type="button"
      $variant="primary"
      disabled={busy}
      aria-label={`Make ${slot.label} the current arc`}
      onClick={() => onActivate(plan)}
    >
      <PlayCircle size={14} aria-hidden="true" />
      {busy ? 'Activating' : 'Make Current'}
    </PlanActionButton>
  );
};

const PlanPdfAction: React.FC<{
  openingPdfId: string | null;
  plan: ClientPlanSummary;
  slot: ClientPlanHorizonSlot;
  onOpenPdf: (plan: ClientPlanSummary) => void;
}> = ({ openingPdfId, plan, slot, onOpenPdf }) => {
  if (!plan.pdfFile) return null;
  return (
    <PlanActionButton
      type="button"
      disabled={openingPdfId === plan.id}
      aria-label={`Open ${slot.label} PDF plan`}
      onClick={() => onOpenPdf(plan)}
    >
      <ExternalLink size={14} aria-hidden="true" />
      {openingPdfId === plan.id ? 'Opening PDF' : 'Open PDF'}
    </PlanActionButton>
  );
};

const SlotActions: React.FC<ClientWorkoutPlanVaultSlotProps> = ({
  activatingPlanId,
  openingPdfId,
  slot,
  onActivate,
  onOpenPdf,
}) => {
  if (!slot.plan) return null;
  return (
    <PlanActions>
      <ActivateArcAction
        activatingPlanId={activatingPlanId}
        plan={slot.plan}
        slot={slot}
        onActivate={onActivate}
      />
      <PlanPdfAction
        openingPdfId={openingPdfId}
        plan={slot.plan}
        slot={slot}
        onOpenPdf={onOpenPdf}
      />
    </PlanActions>
  );
};

const ClientWorkoutPlanVaultSlot: React.FC<ClientWorkoutPlanVaultSlotProps> = (props) => {
  const { slot } = props;
  return (
    <VaultSlot
      aria-label={`${slot.label} plan arc`}
      $filled={slot.isFilled}
      $primary={slot.isPrimary}
    >
      <VaultSlotTop>
        <VaultSlotLabel>{slot.label}</VaultSlotLabel>
        <VaultSlotStatus $primary={slot.isPrimary}>
          {(slot.isPrimary || activeSlot(slot)) && <Crown size={11} aria-hidden="true" />}
          {vaultSlotStatus(slot)}
        </VaultSlotStatus>
      </VaultSlotTop>
      <VaultSlotPlanName>{slotPlanName(slot)}</VaultSlotPlanName>
      <VaultSlotDetail>{vaultSlotDetail(slot)}</VaultSlotDetail>
      <SlotActions {...props} />
    </VaultSlot>
  );
};

export default ClientWorkoutPlanVaultSlot;
