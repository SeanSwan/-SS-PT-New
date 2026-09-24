/*
 * ops.styles.ts — the styled-components for the operations panels: OpsRail and the RunConsole it
 * hosts (Rule 4 extraction).
 *
 * WHY THIS IS THE RIGHT SEAM. Both panels are "operator acts on the store" surfaces and they were
 * built to be read as one unit: the rail is the deck's bottom edge and the run console sits beside
 * it. `OpsRail.tsx` was at 227 lines before S4 and the run console would have pushed the pair past
 * the 300-line cap; extracting at the seam those two files already shared beats trimming the comment
 * blocks that explain the honesty rules, and beats a third copy of `Panel`/`Head`/`Button`.
 *
 * Note this is the SAME `Panel` shape `roster.styles.ts` and the other decks use — the console has
 * one card language, and a fourth variant of it would be the point at which "consistent" stops
 * describing anything.
 */

import styled from 'styled-components';

export const Panel = styled.section`
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: var(--radius-card, 20px);
  background: var(--carbon, #141419);
  padding: var(--space-5, 24px);
`;

export const Head = styled.h2`
  margin: 0 0 var(--space-4, 16px);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ice-wing, #60c0f0);
`;

export const Actions = styled.div`
  display: flex;
  gap: var(--space-3, 12px);
  flex-wrap: wrap;
  align-items: flex-start;
`;

export const Button = styled.button`
  background: var(--ice-wing, #60c0f0);
  color: var(--obsidian-black, #0a0a0f);
  border: 0;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export const Blocked = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 34ch;
`;

export const Why = styled.span`
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;

export const Warning = styled.div`
  border-left: 3px solid var(--danger, #f06060);
  background: rgba(240, 96, 96, 0.08);
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-radius: 0 8px 8px 0;
  margin-top: var(--space-4, 16px);
  font-size: 13px;
`;

export const Ok = styled(Warning)`
  border-left-color: var(--gilded-fern, #c6a84b);
  background: rgba(198, 168, 75, 0.08);
`;

export const Note = styled.p`
  margin: var(--space-3, 12px) 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
`;

export const Input = styled.input`
  width: 8ch;
  background: var(--obsidian-black, #0a0a0f);
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.24));
  border-radius: 8px;
  padding: 8px 10px;
  color: var(--text-primary, #e0ecf4);
  font-family: var(--font-data, monospace);
  font-size: 14px;
  &::placeholder { color: var(--text-faint, rgba(224, 236, 244, 0.38)); }
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const FieldLabel = styled.label`
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;
