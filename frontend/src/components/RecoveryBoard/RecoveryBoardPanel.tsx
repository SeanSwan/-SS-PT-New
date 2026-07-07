/**
 * RecoveryBoardPanel.tsx — "what recovery work should I do today?" (4B.4)
 * =========================================================================
 * The client-facing Mobility Board: myofascial release (SMR), stretching, and
 * mobility drills prescribed by the deterministic zero-LLM engine from the
 * client's real assessment + pain data. Low-motion data-card class, one-thumb
 * 44px Done controls, honest states (loading / starter / error — never blank),
 * and BOTH locked disclaimers (render-locked by test, mirroring the
 * pain-panel pattern). Rule 9: stretching/flexibility/mobility language only.
 */
import React from 'react';
import styled from 'styled-components';
import { Check, Sparkles } from 'lucide-react';
import useRecoveryBoard, { type RecoveryBoardItem } from './useRecoveryBoard';

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  color: var(--text-primary, #e0ecf4);
`;

const SectionLabel = styled.h4`
  margin: 0.25rem 0 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary, #60c0f0);
`;

const ItemRow = styled.div<{ $done: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 44px;
  opacity: ${({ $done }) => ($done ? 0.55 : 1)};
`;

const ItemCopy = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemName = styled.p<{ $done: boolean }>`
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.35;
  text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
`;

const ItemMeta = styled.p`
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-secondary, #9fb3c8);
`;

const DoneButton = styled.button<{ $done: boolean }>`
  min-width: 44px;
  min-height: 44px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid var(--border-subtle, #2a2a36);
  background: ${({ $done }) =>
    $done ? 'color-mix(in srgb, var(--accent-primary, #60c0f0) 25%, transparent)' : 'transparent'};
  color: var(--text-primary, #e0ecf4);

  &:disabled { opacity: 0.5; cursor: default; }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8b5cf6); outline-offset: 2px; }
`;

const Note = styled.p`
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--text-secondary, #9fb3c8);
`;

const CautionNote = styled(Note)`
  color: var(--accent-gold, #c6a84b);
`;

const Disclaimer = styled.p`
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.45;
  color: var(--text-secondary, #9fb3c8);
  opacity: 0.85;
`;

const formatDuration = (seconds: number | null): string | null => {
  if (!seconds || seconds <= 0) return null;
  return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds}s`;
};

const Section: React.FC<{
  label: string;
  items: RecoveryBoardItem[];
  completedKeys: Set<string>;
  completing: string | null;
  onComplete: (key: string) => void;
}> = ({ label, items, completedKeys, completing, onComplete }) => {
  if (items.length === 0) return null;
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      {items.map((item) => {
        const done = completedKeys.has(item.key);
        return (
          <ItemRow key={item.key} $done={done}>
            <ItemCopy>
              <ItemName $done={done}>{item.name}</ItemName>
              <ItemMeta>
                {[item.region, formatDuration(item.durationSec)].filter(Boolean).join(' · ')}
              </ItemMeta>
            </ItemCopy>
            <DoneButton
              type="button"
              $done={done}
              disabled={done || completing === item.key}
              onClick={() => onComplete(item.key)}
              aria-pressed={done}
              aria-label={done ? `${item.name} completed` : `Mark ${item.name} done`}
            >
              <Check size={18} />
            </DoneButton>
          </ItemRow>
        );
      })}
    </>
  );
};

const RecoveryBoardPanel: React.FC = () => {
  const { status, board, completedKeys, completing, complete } = useRecoveryBoard();

  if (status === 'loading') {
    return <Note>Loading your recovery plan…</Note>;
  }
  if (status === 'error') {
    return <Note>Couldn't load your recovery plan right now — pull to refresh or check back shortly.</Note>;
  }
  if (status === 'no-assessment' || !board) {
    return (
      <Shell>
        <Note>
          {board?.starterMessage ??
            'Complete a movement assessment with your trainer to unlock a personalized daily recovery plan.'}
        </Note>
        {(board?.disclaimers ?? []).map((line) => (
          <Disclaimer key={line.slice(0, 24)}>{line}</Disclaimer>
        ))}
      </Shell>
    );
  }

  const doneCount = completedKeys.size;
  const totalCount =
    board.smrTargets.length + board.stretches.length + board.mobilityDrills.length;

  return (
    <Shell aria-label="Today's recovery plan">
      {board.intensityNote && <CautionNote>{board.intensityNote}</CautionNote>}
      <Section
        label="Myofascial release"
        items={board.smrTargets}
        completedKeys={completedKeys}
        completing={completing}
        onComplete={complete}
      />
      <Section
        label="Stretching"
        items={board.stretches}
        completedKeys={completedKeys}
        completing={completing}
        onComplete={complete}
      />
      <Section
        label="Mobility"
        items={board.mobilityDrills}
        completedKeys={completedKeys}
        completing={completing}
        onComplete={complete}
      />
      {doneCount > 0 && (
        <Note>
          <Sparkles size={12} aria-hidden="true" /> {doneCount}/{totalCount} done today — recovery
          counts toward your progress.
        </Note>
      )}
      {typeof board.daysSinceLastRecovery === 'number' && board.daysSinceLastRecovery > 2 && (
        <Note>
          It's been {board.daysSinceLastRecovery} days since your last recovery session — even 10
          minutes helps.
        </Note>
      )}
      {board.disclaimers.map((line) => (
        <Disclaimer key={line.slice(0, 24)}>{line}</Disclaimer>
      ))}
    </Shell>
  );
};

export default RecoveryBoardPanel;
