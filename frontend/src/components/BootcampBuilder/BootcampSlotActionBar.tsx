import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import styled from 'styled-components';

const Actions = styled.div`
  align-items: center;
  display: flex;
  gap: 4px;
  padding: 4px 0 6px 28px;

  @media (max-width: 430px) {
    flex-wrap: wrap;
    padding-left: 8px;
  }
`;

const ActionButton = styled.button`
  align-items: center;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 7px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

const MoveSelect = styled.select`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 7px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  min-height: 44px;
  padding: 0 10px;

  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

interface BootcampSlotActionBarProps {
  exerciseName: string;
  stationCount: number;
  stationIndex: number;
  onDuplicate: () => void;
  onMove: (stationIndex: number) => void;
  onRemove: () => void;
}

const BootcampSlotActionBar: React.FC<BootcampSlotActionBarProps> = ({
  exerciseName,
  stationCount,
  stationIndex,
  onDuplicate,
  onMove,
  onRemove,
}) => (
  <Actions aria-label={`Actions for ${exerciseName}`}>
    <ActionButton type="button" aria-label={`Duplicate ${exerciseName}`} onClick={onDuplicate} title="Duplicate slot">
      <Copy size={16} aria-hidden="true" />
    </ActionButton>
    <MoveSelect
      aria-label={`Move ${exerciseName} to station`}
      value=""
      onChange={(event) => {
        const targetStation = Number(event.target.value);
        if (Number.isInteger(targetStation) && targetStation !== stationIndex) onMove(targetStation);
      }}
    >
      <option value="" disabled>Move to…</option>
      {Array.from({ length: stationCount }, (_, targetStation) => (
        <option key={targetStation} value={targetStation} disabled={targetStation === stationIndex}>
          Station {targetStation + 1}
        </option>
      ))}
    </MoveSelect>
    <ActionButton type="button" aria-label={`Remove ${exerciseName}`} onClick={onRemove} title="Remove slot">
      <Trash2 size={16} aria-hidden="true" />
    </ActionButton>
  </Actions>
);

export default BootcampSlotActionBar;
