/**
 * Client Hub training-plan vault section.
 * ======================================
 *
 * Renders all seven SwanStudios plan-horizon slots for the selected client.
 * The parent owns loading and mutations; this component only presents the
 * read model and forwards PDF / primary-arc actions.
 */

import React from 'react';
import { Layers3 } from 'lucide-react';
import ClientWorkoutPlanVaultSlot from './ClientWorkoutPlanVaultSlot';
import type { ClientPlanSummary, ClientPlanVaultSummary } from './ClientWorkoutPlansPanel.logic';
import {
  VaultGrid,
  VaultHeader,
  VaultMeta,
  VaultSection,
  VaultTitle,
} from './ClientWorkoutPlansPanel.styles';

interface ClientWorkoutPlanVaultSectionProps {
  activatingPlanId: string | null;
  openingPdfId: string | null;
  planVault: ClientPlanVaultSummary;
  primaryUpdatingId: string | null;
  onActivate: (plan: ClientPlanSummary) => void;
  onMakePrimary: (plan: ClientPlanSummary) => void;
  onOpenPdf: (plan: ClientPlanSummary) => void;
}

const ClientWorkoutPlanVaultSection: React.FC<ClientWorkoutPlanVaultSectionProps> = ({
  activatingPlanId,
  openingPdfId,
  planVault,
  primaryUpdatingId,
  onActivate,
  onMakePrimary,
  onOpenPdf,
}) => (
  <VaultSection aria-label="Plan Arc Library">
    <VaultHeader>
      <VaultTitle><Layers3 size={16} /> Plan Arc Library</VaultTitle>
      <VaultMeta>{planVault.filledCount} of 7 arcs filled</VaultMeta>
    </VaultHeader>
    <VaultGrid>
      {planVault.slots.map((slot) => (
        <ClientWorkoutPlanVaultSlot
          key={slot.horizonKey}
          slot={slot}
          activatingPlanId={activatingPlanId}
          openingPdfId={openingPdfId}
          primaryUpdatingId={primaryUpdatingId}
          onActivate={onActivate}
          onOpenPdf={onOpenPdf}
          onMakePrimary={onMakePrimary}
        />
      ))}
    </VaultGrid>
  </VaultSection>
);

export default ClientWorkoutPlanVaultSection;
