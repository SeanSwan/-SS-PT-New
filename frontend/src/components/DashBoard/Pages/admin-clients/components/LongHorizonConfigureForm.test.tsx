import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LongHorizonConfigureForm from './LongHorizonConfigureForm';

vi.mock('../../../../Shared/EquipmentProfilePicker', () => ({
  default: ({ onSelect }: { onSelect: (id: number | null) => void }) => (
    <button type="button" onClick={() => onSelect(77)}>Select equipment</button>
  ),
}));

vi.mock('../../../../Shared/AITerminalPanel', () => ({
  default: () => <div data-testid="ai-terminal" />,
}));

describe('LongHorizonConfigureForm', () => {
  it('updates horizon, equipment, and generates the draft', () => {
    const setHorizonMonths = vi.fn();
    const setEquipmentProfileId = vi.fn();
    const onGenerate = vi.fn();

    render(
      <LongHorizonConfigureForm
        clientId={56}
        horizonMonths={6}
        setHorizonMonths={setHorizonMonths}
        clientGoals={{ primaryGoal: 'strength', secondaryGoals: [], constraints: [] }}
        goalsLoading={false}
        goalsError=""
        equipmentProfileId={null}
        setEquipmentProfileId={setEquipmentProfileId}
        trainerNotes=""
        setTrainerNotes={vi.fn()}
        isAdmin
        overrideReasonRequired={false}
        overrideReason=""
        setOverrideReason={vi.fn()}
        isSubmitting={false}
        onClose={vi.fn()}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /12 months/i }));
    fireEvent.click(screen.getByRole('button', { name: /select equipment/i }));
    fireEvent.click(screen.getByRole('button', { name: /swan coach planning draft/i }));

    expect(setHorizonMonths).toHaveBeenCalledWith(12);
    expect(setEquipmentProfileId).toHaveBeenCalledWith(77);
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('shows override reason when required', () => {
    render(
      <LongHorizonConfigureForm
        clientId={56}
        horizonMonths={6}
        setHorizonMonths={vi.fn()}
        clientGoals={null}
        goalsLoading={false}
        goalsError=""
        equipmentProfileId={null}
        setEquipmentProfileId={vi.fn()}
        trainerNotes=""
        setTrainerNotes={vi.fn()}
        isAdmin={false}
        overrideReasonRequired
        overrideReason=""
        setOverrideReason={vi.fn()}
        isSubmitting={false}
        onClose={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByText(/admin override reason/i)).toBeInTheDocument();
  });
});
