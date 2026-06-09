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

function vaultSlotStatus(slot: ClientPlanHorizonSlot) {
  if (slot.isPrimary) return 'Primary';
  if (slot.plan && isClientPlanActiveStatus(slot.plan.status)) return 'Active';
  if (slot.isFilled) return slot.plan?.status === 'paused' ? 'Paused' : 'Ready';
  if (slot.isDefaultHorizon) return 'Default';
  return 'Pending';
}

function vaultSlotDetail(slot: ClientPlanHorizonSlot) {
  if (slot.plan) return `${slot.durationWeeks} weeks - ${slot.plan.status} - ${formatPlanUseLabel(slot.plan.assignmentDefault)}`;
  if (slot.isDefaultHorizon) return 'Default six-month arc pending';
  return 'No plan saved yet';
}

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
    <VaultSlotPlanName>{slot.plan?.name || 'Pending'}</VaultSlotPlanName>
    <VaultSlotDetail>{vaultSlotDetail(slot)}</VaultSlotDetail>
    {slot.plan && (
      <PlanActions>
        {!isClientPlanActiveStatus(slot.plan.status) && (
          <PlanActionButton
            type="button"
            disabled={activatingPlanId === slot.plan.id}
            aria-label={`Activate ${slot.label} arc`}
            onClick={() => onActivate(slot.plan as ClientPlanSummary)}
          >
            <PlayCircle size={14} aria-hidden="true" />
            {activatingPlanId === slot.plan.id ? 'Activating' : 'Activate Arc'}
          </PlanActionButton>
        )}
        {!slot.isPrimary && (
          <PlanActionButton
            type="button"
            $variant="primary"
            disabled={primaryUpdatingId === slot.plan.id}
            aria-label={`Make ${slot.label} primary arc`}
            onClick={() => onMakePrimary(slot.plan as ClientPlanSummary)}
          >
            <Crown size={14} aria-hidden="true" />
            {primaryUpdatingId === slot.plan.id ? 'Updating' : 'Make Primary'}
          </PlanActionButton>
        )}
        {slot.plan.pdfFile && (
          <PlanActionButton
            type="button"
            disabled={openingPdfId === slot.plan.id}
            aria-label={`Open ${slot.label} PDF plan`}
            onClick={() => onOpenPdf(slot.plan as ClientPlanSummary)}
          >
            <ExternalLink size={14} aria-hidden="true" />
            {openingPdfId === slot.plan.id ? 'Opening PDF' : 'Open PDF'}
          </PlanActionButton>
        )}
      </PlanActions>
    )}
  </VaultSlot>
);

export default ClientWorkoutPlanVaultSlot;
