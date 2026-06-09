import React, { useMemo } from 'react';
import styled from 'styled-components';
import type {
  ClientPlanSummary,
  ClientPlanVaultSummary,
} from './ClientWorkoutPlansPanel.logic';

interface ClientWorkoutPlanActiveArcSelectorProps {
  planVault: ClientPlanVaultSummary;
  updatingPlanId: string | null;
  onSelectActiveArc: (plan: ClientPlanSummary) => void;
}

type ClientPlanVaultSlot = ClientPlanVaultSummary['slots'][number];

const filledPlanSlots = (planVault: ClientPlanVaultSummary) => (
  planVault.slots.filter((slot) => slot.isFilled && slot.plan)
);

const resolveActivePlanId = (planVault: ClientPlanVaultSummary, filledSlots: ClientPlanVaultSlot[]) => (
  planVault.primaryPlanId || filledSlots[0]?.plan?.id || ''
);

const findSelectedArcPlan = (
  filledSlots: ClientPlanVaultSlot[],
  planId: string,
) => filledSlots.find((slot) => slot.plan?.id === planId)?.plan || null;

const selectorMetaText = (planVault: ClientPlanVaultSummary, updatingPlanId: string | null) => (
  updatingPlanId
    ? 'Updating current arc...'
    : `${planVault.filledCount} saved arc${planVault.filledCount === 1 ? '' : 's'} available`
);

const renderActiveArcOptions = (filledSlots: ClientPlanVaultSlot[]) => (
  filledSlots.length === 0 ? (
    <option value="">No saved plan arcs</option>
  ) : filledSlots.map((slot) => (
    <option key={slot.plan?.id} value={slot.plan?.id}>
      {slot.label} - {slot.plan?.name}
    </option>
  ))
);

const SelectorShell = styled.div`
  display: grid;
  gap: 6px;
  min-width: min(100%, 320px);
`;

const SelectorLabel = styled.label`
  color: var(--text-muted, rgba(224, 236, 244, 0.74));
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const SelectControl = styled.select`
  min-height: 44px;
  width: 100%;
  padding: 10px 36px 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, var(--accent-primary, #60C0F0) 7%);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;

  &:disabled {
    opacity: 0.72;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const SelectorMeta = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

const ClientWorkoutPlanActiveArcSelector: React.FC<ClientWorkoutPlanActiveArcSelectorProps> = ({
  planVault,
  updatingPlanId,
  onSelectActiveArc,
}) => {
  const filledSlots = useMemo(() => filledPlanSlots(planVault), [planVault]);
  const activePlanId = resolveActivePlanId(planVault, filledSlots);
  const disabled = filledSlots.length === 0 || Boolean(updatingPlanId);

  const selectActiveArc = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPlan = findSelectedArcPlan(filledSlots, event.target.value);
    if (selectedPlan && selectedPlan.id !== activePlanId) {
      onSelectActiveArc(selectedPlan);
    }
  };

  return (
    <SelectorShell>
      <SelectorLabel htmlFor="client-active-training-arc">Active training arc</SelectorLabel>
      <SelectControl
        id="client-active-training-arc"
        value={activePlanId}
        onChange={selectActiveArc}
        disabled={disabled}
      >
        {renderActiveArcOptions(filledSlots)}
      </SelectControl>
      <SelectorMeta>{selectorMetaText(planVault, updatingPlanId)}</SelectorMeta>
    </SelectorShell>
  );
};

export default ClientWorkoutPlanActiveArcSelector;
