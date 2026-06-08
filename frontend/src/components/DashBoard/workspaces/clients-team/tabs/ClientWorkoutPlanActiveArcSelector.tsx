import React, { useMemo } from 'react';
import styled from 'styled-components';
import type {
  ClientPlanSummary,
  ClientPlanVaultSummary,
} from './ClientWorkoutPlansPanel.logic';

interface ClientWorkoutPlanActiveArcSelectorProps {
  planVault: ClientPlanVaultSummary;
  updatingPlanId: string | null;
  onMakePrimary: (plan: ClientPlanSummary) => void;
}

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
  onMakePrimary,
}) => {
  const filledSlots = useMemo(() => planVault.slots.filter((slot) => slot.isFilled && slot.plan), [planVault.slots]);
  const activePlanId = planVault.primaryPlanId || filledSlots[0]?.plan?.id || '';
  const disabled = filledSlots.length === 0 || Boolean(updatingPlanId);

  const selectActiveArc = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPlan = filledSlots.find((slot) => slot.plan?.id === event.target.value)?.plan;
    if (selectedPlan && selectedPlan.id !== activePlanId) {
      onMakePrimary(selectedPlan);
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
        {filledSlots.length === 0 ? (
          <option value="">No saved plan arcs</option>
        ) : filledSlots.map((slot) => (
          <option key={slot.plan?.id} value={slot.plan?.id}>
            {slot.label} - {slot.plan?.name}
          </option>
        ))}
      </SelectControl>
      <SelectorMeta>{planVault.filledCount} saved arc{planVault.filledCount === 1 ? '' : 's'} available</SelectorMeta>
    </SelectorShell>
  );
};

export default ClientWorkoutPlanActiveArcSelector;
