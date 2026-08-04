/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ReceiptPRStrip — the Receipt's earned-gold moment.          │
 * │ useSessionStats has ALWAYS detected per-session PRs; until  │
 * │ this strip they were computed and never shown. Renders gold │
 * │ chips (gold = EARNED, its one legitimate Train use) above   │
 * │ the SaveSuccessPanel. Empty PRs → renders nothing.          │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { Trophy } from 'lucide-react';
import type { PersonalRecord } from '../../../useSessionStats';

const Strip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-family: 'Sora', sans-serif;
`;

const Kicker = styled.strong`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-gold, #c6a84b);
  font-size: 0.85rem;
`;

const PRChip = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #c6a84b) 55%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #c6a84b) 14%, transparent);
  color: var(--accent-gold, #c6a84b);
  font: 700 0.78rem 'Sora', sans-serif;
  white-space: nowrap;
`;

const ReceiptPRStrip: React.FC<{ prs: PersonalRecord[] }> = ({ prs }) => {
  if (prs.length === 0) return null;
  return (
    <Strip role='status' aria-label={`${prs.length} personal record${prs.length === 1 ? '' : 's'} this session`}>
      <Kicker>
        <Trophy size={16} aria-hidden='true' />
        {prs.length === 1 ? 'Personal record!' : `${prs.length} personal records!`}
      </Kicker>
      {prs.map((pr) => (
        <PRChip key={`${pr.exerciseName}-${pr.type}`}>
          {pr.exerciseName} · {pr.label}
        </PRChip>
      ))}
    </Strip>
  );
};

export default ReceiptPRStrip;
