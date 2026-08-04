/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ CoachDrawer — SESSION SHELL zone 5.                         │
 * │ Coach is not a persistent dock: ONE purple entry opens ONE  │
 * │ drawer. Tabs: Coach (the proven WorkoutLoggerCoachTerminal, │
 * │ composed by the host so AI_* wiring is untouched) ·         │
 * │ Reference (NASMPhaseGuide + LearningModeToggle — lazy;      │
 * │ read-mostly docs never mount until asked). Dictation joins  │
 * │ in the action-bar slice (§4.4) — dictating must never hide  │
 * │ the rows behind a modal.                                    │
 * │ Wing Purple = Coach ONLY (train-token law).                 │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import Sheet from '../primitives/Sheet';

const TabList = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
`;

const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  font: 700 0.82rem 'Sora', sans-serif;
  cursor: pointer;
  border: 1px solid ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--train-coach, #8b5cf6) 55%, transparent)'
      : 'color-mix(in srgb, var(--world-text, #e0ecf4) 14%, transparent)'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--train-coach, #8b5cf6) 18%, transparent)'
      : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--swan-coach-fg, #c4b5fd)' : 'var(--world-muted, #94a3b8)'};

  &:focus-visible {
    outline: 2px solid var(--train-coach, #8b5cf6);
    outline-offset: 2px;
  }
`;

const Body = styled.div`
  color: var(--world-text, #e0ecf4);
`;

export interface CoachDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The Coach tab — host-composed WorkoutLoggerCoachTerminal (AI_* wiring untouched). */
  coach: React.ReactNode;
  /** The Reference tab — host-composed NASM guide + learning toggle. LAZY. */
  reference: React.ReactNode;
}

type CoachTab = 'coach' | 'reference';

const CoachDrawer: React.FC<CoachDrawerProps> = ({ open, onClose, coach, reference }) => {
  const [tab, setTab] = useState<CoachTab>('coach');

  return (
    <Sheet open={open} onClose={onClose} label='Swan Coach' historyKey='coach-drawer'>
      <TabList role='tablist' aria-label='Coach drawer sections'>
        <Tab type='button' role='tab' aria-selected={tab === 'coach'} $active={tab === 'coach'} onClick={() => setTab('coach')}>
          Coach
        </Tab>
        <Tab type='button' role='tab' aria-selected={tab === 'reference'} $active={tab === 'reference'} onClick={() => setTab('reference')}>
          Reference
        </Tab>
      </TabList>
      {/* Lazy by construction: the unselected tab's node is not rendered. */}
      <Body role='tabpanel'>{tab === 'coach' ? coach : reference}</Body>
    </Sheet>
  );
};

export default CoachDrawer;
