/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ RunnerEmptyState — the Session Runner's zero-exercise hero. │
 * │ Sean 2026-07-30: an empty session showed the OLD lone add   │
 * │ button, so the redesign was invisible on first open. The    │
 * │ empty state now speaks the runner language: world-accent    │
 * │ hero, style-aware kicker, big primary CTA + load-plan CTA.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { Download, Plus, Sparkles } from 'lucide-react';
import { TRAIN } from '../../../styles/train-tokens';
import { RUNNER_STYLES } from './runnerStyles';
import { useRunnerStyle } from './useRunnerStyle';

const EmptyHero = styled.div`
  border-radius: 18px;
  padding: clamp(20px, 5vw, 34px);
  text-align: center;
  background:
    radial-gradient(120% 140% at 50% -20%, color-mix(in srgb, var(--world-accent, #60C0F0) 16%, transparent) 0%, transparent 55%),
    linear-gradient(170deg, var(--surface-raised, #003080) 0%, var(--bg-deep, #0A0A0F) 88%);
  border: 1px solid color-mix(in srgb, var(--world-accent, #60C0F0) 32%, transparent);
`;

const Kicker = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${TRAIN.active};
`;

const Headline = styled.h3`
  margin: 10px 0 4px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1.35rem, 5vw, 1.9rem);
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const Sub = styled.p`
  margin: 0 auto 18px;
  max-width: 42ch;
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
`;

const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
`;

const PrimaryCta = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 22px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--world-accent, #60C0F0) 55%, transparent);
  background: color-mix(in srgb, var(--world-accent, #60C0F0) 18%, var(--surface-elevated, #141419));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 24px color-mix(in srgb, var(--world-accent, #60C0F0) 22%, transparent);
  transition: transform 0.15s ease;

  @media (prefers-reduced-motion: no-preference) {
    &:active { transform: scale(0.97); }
  }
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

const SecondaryCta = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 18px;
  border-radius: 14px;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.2));
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: default; }
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

interface RunnerEmptyStateProps {
  onAddExercise: () => void;
  onLoadPlan?: () => void;
  isLoadingPlan?: boolean;
}

const RunnerEmptyState: React.FC<RunnerEmptyStateProps> = ({
  onAddExercise, onLoadPlan, isLoadingPlan = false,
}) => {
  const [styleId] = useRunnerStyle();
  const styleName = RUNNER_STYLES.find((style) => style.id === styleId)?.name ?? 'Focus Flow';

  return (
    <EmptyHero data-runner-empty={styleId}>
      <Kicker>
        <Sparkles size={13} aria-hidden='true' />
        Session Runner · {styleName}
      </Kicker>
      <Headline>Ready when you are</Headline>
      <Sub>
        Pull in today&apos;s plan or start from scratch — the session builds itself
        around you, one set at a time.
      </Sub>
      <CtaRow>
        <PrimaryCta type='button' onClick={onAddExercise} aria-label='Add your first exercise'>
          <Plus size={18} aria-hidden='true' />
          Add your first exercise
        </PrimaryCta>
        {onLoadPlan && (
          <SecondaryCta
            type='button'
            onClick={onLoadPlan}
            disabled={isLoadingPlan}
            aria-label="Use today's plan"
          >
            <Download size={16} aria-hidden='true' />
            {isLoadingPlan ? 'Loading…' : "Use today's plan"}
          </SecondaryCta>
        )}
      </CtaRow>
    </EmptyHero>
  );
};

export default RunnerEmptyState;
