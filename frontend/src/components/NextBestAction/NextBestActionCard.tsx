/**
 * ============================================================================
 * FILE: NextBestActionCard.tsx
 * PURPOSE: Shared, self-fetching Next-Best-Action card (Phase 1.5a, Fable
 *          Vision arc) — the cross-dashboard keystone answering "what should
 *          I do next?" from the deterministic rules engine.
 * DATA: useProgressPulse (one round trip: pulse + nextBestAction + Phase 1.5a
 *       context enrichments). Truthful states — loading skeleton, explicit
 *       unavailable/retry recovery, and no stale guidance after a failed load.
 * TRANSPARENCY: rule-based engine — the card always carries the disclosure
 *       line (not medical advice; FDA general-wellness posture).
 * ============================================================================
 */
import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import useProgressPulse from '../../hooks/analytics/useProgressPulse';

interface RenderableAction {
  code: string;
  priority: number;
  title: string;
  message: string;
  cta: { label: string; href: string } | null;
}

const isSafeInternalRoute = (value: unknown): value is string => (
  typeof value === 'string'
  && value.length > 1
  && value.startsWith('/')
  && !value.startsWith('//')
  && Array.from(value).every((character) => {
    const code = character.charCodeAt(0);
    return character !== '\\' && code >= 0x20 && code !== 0x7f && !/\s/.test(character);
  })
);

const isRenderableAction = (value: unknown): value is RenderableAction => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const action = value as Record<string, unknown>;
  if (typeof action.code !== 'string' || !action.code.trim()
    || typeof action.priority !== 'number' || !Number.isFinite(action.priority)
    || typeof action.title !== 'string' || !action.title.trim()
    || typeof action.message !== 'string' || !action.message.trim()) return false;
  if (action.cta === null) return true;
  if (!action.cta || typeof action.cta !== 'object' || Array.isArray(action.cta)) return false;
  const cta = action.cta as Record<string, unknown>;
  return typeof cta.label === 'string' && !!cta.label.trim() && isSafeInternalRoute(cta.href);
};

const isRenderableGuidance = (value: unknown): value is { primary: RenderableAction; secondary: RenderableAction[] } => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const guidance = value as Record<string, unknown>;
  return isRenderableAction(guidance.primary)
    && Array.isArray(guidance.secondary)
    && guidance.secondary.every(isRenderableAction);
};

const Shell = styled.section<{ $bare?: boolean }>`
  ${({ $bare }) => !$bare && `
    background: var(--surface-elevated, #141419);
    border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 14%, transparent);
    border-radius: 14px;
    padding: 16px;
  `}
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary, #9fb6c8);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Title = styled.h4`
  margin: 0;
  color: var(--text-primary, #e0ecf4);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
`;

const Message = styled.p`
  margin: 0;
  color: var(--text-secondary, #9fb6c8);
  font-size: 13px;
  line-height: 1.55;
`;

const CautionNote = styled.p`
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #c6a84b) 30%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #c6a84b) 8%, transparent);
  color: var(--text-primary, #e0ecf4);
  font-size: 12px;
  line-height: 1.5;
`;

/* Accent button — design.md §6/§11: Wing-Purple-deep fill (text-safe, ≈5.3:1
   with Frost White) → Ice Wing halo. The prior Ice-Wing FILL put the data
   accent on a control; purple fill + cyan halo is the canonical dual-glow. */
const CtaButton = styled.button`
  min-height: 44px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  background: var(--wing-purple-deep, #6d3fd1);
  color: var(--text-primary, #e0ecf4);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60c0f0) 45%, transparent);
  transition: box-shadow var(--speed-snap, 160ms) var(--ease-snap, cubic-bezier(0.16, 1, 0.3, 1)),
    transform var(--speed-snap, 160ms) var(--ease-snap, cubic-bezier(0.16, 1, 0.3, 1));

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 26px color-mix(in srgb, var(--accent-primary, #60c0f0) 60%, transparent);
  }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60c0f0); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

const SecondaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const SecondaryChip = styled.span`
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 22%, transparent);
  color: var(--text-secondary, #9fb6c8);
  font-size: 11px;
  line-height: 1.4;
`;

const Disclosure = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-size: 10.5px;
  line-height: 1.5;
`;

const Skeleton = styled.div`
  height: 64px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 8%, transparent);
`;

export const NBA_DISCLOSURE_COPY =
  'Rule-based guidance from your logged training data — not medical advice.';

export interface NextBestActionCardProps {
  /** Skip the outer chrome when the mount supplies its own panel. */
  bare?: boolean;
  /** Hide the internal eyebrow header (mount already labels the panel). */
  hideHeader?: boolean;
  /** Override navigation for log CTAs (role-aware paths on the user home). */
  onLogWorkout?: () => void;
}

const LOG_CODES = new Set(['log_first_workout', 'return_after_gap', 'streak_at_risk', 'plan_next', 'keep_momentum']);

const NextBestActionCard: React.FC<NextBestActionCardProps> = ({ bare, hideHeader, onLogWorkout }) => {
  const { status, pulse, liteNba, refetch } = useProgressPulse();
  const navigate = useNavigate();

  // D1: free tier renders the rungs-1-3 lite guidance; paid renders the
  // full context-enriched compass. Same card, honest either way.
  const candidateNba = pulse?.nextBestAction ?? liteNba ?? null;
  const nba = isRenderableGuidance(candidateNba) ? candidateNba : null;
  const primary = nba?.primary ?? null;
  const secondary = nba?.secondary.slice(0, 2) ?? [];
  // Constraints ride only the paid pulse (lite has none by design — D1).
  const constraints = pulse?.nextBestAction && typeof pulse.nextBestAction.constraints?.note === 'string'
    ? pulse.nextBestAction.constraints
    : null;
  const hasGuidance = (status === 'ready' || status === 'lite') && Boolean(primary);
  const unavailable = status === 'error' || ((status === 'ready' || status === 'lite') && !hasGuidance);

  const handleCta = () => {
    if (primary?.cta && LOG_CODES.has(primary.code) && onLogWorkout) return onLogWorkout();
    if (primary?.cta?.href) return navigate(primary.cta.href);
    return navigate('/dashboard/client/workouts');
  };

  return (
    <Shell $bare={bare} aria-label="Next best action">
      {!hideHeader && (
        <HeaderRow>
          <Compass size={13} aria-hidden="true" />
          Next Best Action
        </HeaderRow>
      )}
      {status === 'loading' && <Skeleton aria-hidden="true" />}
      {hasGuidance && primary && (
        <>
          <Title>{primary.title}</Title>
          <Message>{primary.message}</Message>
          {constraints?.note && <CautionNote>{constraints.note}</CautionNote>}
          {primary.cta && (
            <CtaButton type="button" onClick={handleCta}>{primary.cta.label}</CtaButton>
          )}
          {secondary.length > 0 && (
            <SecondaryRow>
              {secondary.map((item) => <SecondaryChip key={item.code}>{item.title}</SecondaryChip>)}
            </SecondaryRow>
          )}
        </>
      )}
      {unavailable && (
        <>
          <Title>Guidance unavailable</Title>
          <Message>We could not load your next step. Try again.</Message>
          <CtaButton type="button" onClick={refetch}>Retry</CtaButton>
        </>
      )}
      <Disclosure>{NBA_DISCLOSURE_COPY}</Disclosure>
    </Shell>
  );
};

export default NextBestActionCard;
