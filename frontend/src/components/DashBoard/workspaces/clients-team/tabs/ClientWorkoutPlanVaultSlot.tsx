/**
 * ============================================================================
 * FILE: ClientWorkoutPlanVaultSlot.tsx
 * PURPOSE: Single horizon tile for the Clients & Team workout-plan vault.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders one plan horizon as a compact trainer/admin action tile, including
 * primary-arc promotion and protected PDF access.
 *
 * HOW IT FITS IN THE APP:
 * ClientWorkoutPlansPanel builds the seven-horizon vault summary, then delegates
 * each slot here so the parent stays focused on data loading and orchestration.
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
  slot: ClientPlanHorizonSlot;
  activatingPlanId: string | null;
  openingPdfId: string | null;
  primaryUpdatingId: string | null;
  onActivate: (plan: ClientPlanSummary) => void;
  onOpenPdf: (plan: ClientPlanSummary) => void;
  onMakePrimary: (plan: ClientPlanSummary) => void;
}

const slotPlanName = (slot: ClientPlanHorizonSlot) => slot.plan?.name || 'Pending';
const filledSlotStatus = (plan: ClientPlanSummary | null | undefined) => (
  plan?.status === 'paused' ? 'Paused' : 'Ready'
);
const emptySlotStatus = (slot: ClientPlanHorizonSlot) => (
  slot.isDefaultHorizon ? 'Default' : 'Pending'
);
const activeSlot = (slot: ClientPlanHorizonSlot) => (
  Boolean(slot.plan && isClientPlanActiveStatus(slot.plan.status))
);

function vaultSlotStatus(slot: ClientPlanHorizonSlot) {
  if (slot.isPrimary) return 'Primary';
  if (activeSlot(slot)) return 'Active';
  if (slot.isFilled) return filledSlotStatus(slot.plan);
  return emptySlotStatus(slot);
}

function vaultSlotDetail(slot: ClientPlanHorizonSlot) {
  if (slot.plan) return `${slot.durationWeeks} weeks - ${slot.plan.status} - ${formatPlanUseLabel(slot.plan.assignmentDefault)}`;
  if (slot.isDefaultHorizon) return 'Default six-month arc pending';
  return 'No plan saved yet';
}

interface SlotActionProps {
  slot: ClientPlanHorizonSlot;
  plan: ClientPlanSummary;
}

interface ActivateArcActionProps extends SlotActionProps {
  activatingPlanId: string | null;
  onActivate: (plan: ClientPlanSummary) => void;
}

const ActivateArcAction: React.FC<ActivateArcActionProps> = ({
  slot,
  plan,
  activatingPlanId,
  onActivate,
}) => {
  if (isClientPlanActiveStatus(plan.status)) return null;

  return (
    <PlanActionButton
      type="button"
      disabled={activatingPlanId === plan.id}
      aria-label={`Activate ${slot.label} arc`}
      onClick={() => onActivate(plan)}
    >
      <PlayCircle size={14} aria-hidden="true" />
      {activatingPlanId === plan.id ? 'Activating' : 'Activate Arc'}
    </PlanActionButton>
  );
};

interface PrimaryArcActionProps extends SlotActionProps {
  primaryUpdatingId: string | null;
  onMakePrimary: (plan: ClientPlanSummary) => void;
}

const PrimaryArcAction: React.FC<PrimaryArcActionProps> = ({
  slot,
  plan,
  primaryUpdatingId,
  onMakePrimary,
}) => {
  if (slot.isPrimary) return null;

  return (
    <PlanActionButton
      type="button"
      $variant="primary"
      disabled={primaryUpdatingId === plan.id}
      aria-label={`Make ${slot.label} primary arc`}
      onClick={() => onMakePrimary(plan)}
    >
      <Crown size={14} aria-hidden="true" />
      {primaryUpdatingId === plan.id ? 'Updating' : 'Make Primary'}
    </PlanActionButton>
  );
};

interface PlanPdfActionProps extends SlotActionProps {
  openingPdfId: string | null;
  onOpenPdf: (plan: ClientPlanSummary) => void;
}

const PlanPdfAction: React.FC<PlanPdfActionProps> = ({
  slot,
  plan,
  openingPdfId,
  onOpenPdf,
}) => {
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

const ClientWorkoutPlanVaultSlotActions: React.FC<ClientWorkoutPlanVaultSlotProps> = ({
  slot,
  activatingPlanId,
  openingPdfId,
  primaryUpdatingId,
  onActivate,
  onOpenPdf,
  onMakePrimary,
}) => {
  if (!slot.plan) return null;

  return (
    <PlanActions>
      <ActivateArcAction
        slot={slot}
        plan={slot.plan}
        activatingPlanId={activatingPlanId}
        onActivate={onActivate}
      />
      <PrimaryArcAction
        slot={slot}
        plan={slot.plan}
        primaryUpdatingId={primaryUpdatingId}
        onMakePrimary={onMakePrimary}
      />
      <PlanPdfAction
        slot={slot}
        plan={slot.plan}
        openingPdfId={openingPdfId}
        onOpenPdf={onOpenPdf}
      />
    </PlanActions>
  );
};

const ClientWorkoutPlanVaultSlot: React.FC<ClientWorkoutPlanVaultSlotProps> = ({
  slot,
  activatingPlanId,
  openingPdfId,
  primaryUpdatingId,
  onActivate,
  onOpenPdf,
  onMakePrimary,
}) => (
  <VaultSlot
    aria-label={`${slot.label} plan arc`}
    $filled={slot.isFilled}
    $primary={slot.isPrimary}
  >
    <VaultSlotTop>
      <VaultSlotLabel>{slot.label}</VaultSlotLabel>
      <VaultSlotStatus $primary={slot.isPrimary}>
        {slot.isPrimary && <Crown size={11} aria-hidden="true" />}
        {vaultSlotStatus(slot)}
      </VaultSlotStatus>
    </VaultSlotTop>
    <VaultSlotPlanName>{slotPlanName(slot)}</VaultSlotPlanName>
    <VaultSlotDetail>{vaultSlotDetail(slot)}</VaultSlotDetail>
    <ClientWorkoutPlanVaultSlotActions
      slot={slot}
      activatingPlanId={activatingPlanId}
      openingPdfId={openingPdfId}
      primaryUpdatingId={primaryUpdatingId}
      onActivate={onActivate}
      onOpenPdf={onOpenPdf}
      onMakePrimary={onMakePrimary}
    />
  </VaultSlot>
);

export default ClientWorkoutPlanVaultSlot;
