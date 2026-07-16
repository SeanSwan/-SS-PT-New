/**
 * Client Hub training-plan vault section.
 * ======================================
 *
 * Renders all seven plan horizons. The parent owns reads and commands; each
 * filled slot exposes one current-plan activation command and protected PDF.
 */
import React from 'react';
import { Layers3 } from 'lucide-react';
import ClientWorkoutPlanVaultSlot from './ClientWorkoutPlanVaultSlot';
import type {
  ClientPlanSummary,
  ClientPlanVaultSummary,
} from './ClientWorkoutPlansPanel.logic';
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
  onActivate: (plan: ClientPlanSummary) => void;
  onOpenPdf: (plan: ClientPlanSummary) => void;
}

const ClientWorkoutPlanVaultSection: React.FC<ClientWorkoutPlanVaultSectionProps> = ({
  activatingPlanId,
  openingPdfId,
  planVault,
  onActivate,
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
          onActivate={onActivate}
          onOpenPdf={onOpenPdf}
        />
      ))}
    </VaultGrid>
  </VaultSection>
);

export default ClientWorkoutPlanVaultSection;
