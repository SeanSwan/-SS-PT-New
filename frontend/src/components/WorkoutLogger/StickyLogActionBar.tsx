/**
 * Blueprint: StickyLogActionBar
 * Parent: WorkoutLogger
 * Purpose: keep Save reachable during long workout logs without adding a
 * second submit path. The fixed bar uses the same submit handler as the footer,
 * and the in-flow spacer prevents footer controls from sitting under it.
 */
import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Save, CheckCircle2 } from 'lucide-react';
import { CS, withAlpha, reducedMotionSafe } from './WorkoutLoggerCS';

interface StickyLogActionBarProps {
  completedSets: number;
  totalSets: number;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const StickyLogActionBar: React.FC<StickyLogActionBarProps> = React.memo(({
  completedSets,
  totalSets,
  onSubmit,
  isSubmitting,
}) => {
  const allLogged = totalSets > 0 && completedSets >= totalSets;

  return (
    <>
      <BarWrap data-testid="sticky-log-action-bar">
        <Pill>
          <Progress $complete={allLogged} aria-label={`${completedSets} of ${totalSets} sets logged`}>
            <CheckCircle2 size={15} aria-hidden="true" />
            {completedSets}/{totalSets} sets
          </Progress>
          <SaveButton
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            aria-label="Complete and save workout"
          >
            {isSubmitting ? <Spinner /> : <><Save size={16} aria-hidden="true" /> Save</>}
          </SaveButton>
        </Pill>
      </BarWrap>
      <LayoutSpacer aria-hidden="true" />
    </>
  );
});

StickyLogActionBar.displayName = 'StickyLogActionBar';
export default StickyLogActionBar;

const BarWrap = styled.div`
  position: fixed;
  left: 50%;
  right: auto;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  z-index: 9988;
  display: flex;
  justify-content: center;
  width: min(calc(100vw - 2rem), 760px);
  transform: translateX(-50%);
  pointer-events: none;

  @media (max-width: 480px) {
    width: calc(100vw - 1.5rem);
    bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
  }
`;

const Pill = styled.div`
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  width: fit-content;
  max-width: 100%;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  border-radius: 999px;
  background:
    linear-gradient(135deg, ${withAlpha(CS.gaming, 0.16)}, ${withAlpha(CS.secondary, 0.12)}),
    ${withAlpha(CS.cardDark, 0.92)};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid ${withAlpha(CS.gaming, 0.32)};
  box-shadow: 0 8px 28px ${withAlpha(CS.bgDeep, 0.5)};

  @media (max-width: 480px) {
    width: 100%;
    justify-content: space-between;
  }

  ${reducedMotionSafe}
`;

const LayoutSpacer = styled.div`
  height: calc(4.75rem + env(safe-area-inset-bottom, 0px));
`;

const Progress = styled.span<{ $complete: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ $complete }) => ($complete ? CS.successText : CS.text)};

  svg { color: ${({ $complete }) => ($complete ? CS.success : CS.gaming)}; flex-shrink: 0; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid ${withAlpha(CS.text, 0.25)};
  border-top-color: ${CS.text};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  ${reducedMotionSafe}
`;

const SaveButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0 1.25rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
  color: ${CS.text};
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 16px ${withAlpha(CS.glow, 0.35)};
  transition: transform 0.15s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px ${withAlpha(CS.glow, 0.45)};
  }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:focus-visible { outline: 2px solid ${CS.gaming}; outline-offset: 2px; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }

  ${reducedMotionSafe}
`;
