/**
 * ============================================================================
 * FILE: ClientOnboardingLaunchCard.tsx
 * PURPOSE: The glowing entry point that takes a newly-signed-up client into the
 *          full NASM-informed onboarding assessment.
 * AUTHOR:  Claude (Opus 5) | CREATED: 2026-07-27 (launch audit S4)
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The onboarding wizard was already built and already routed at
 * /dashboard/client/onboarding — but NOTHING linked to it. The only gate that
 * referenced it (`shouldRedirectClientToOnboarding`) was never wired into the
 * layout, so it was dead logic with passing tests. Net effect: a client signed
 * up, landed on an empty dashboard, and onboarding was unreachable unless they
 * guessed the URL.
 *
 * Sean's directive (2026-07-27): onboarding happens AFTER signup, entered from
 * a glowing button on the client's own dashboard — never as a wall that blocks
 * them from reaching the product they just paid for.
 *
 * DESIGN INTENT
 * This is a new client's first impression, so it carries a signature moment:
 * an aurora bloom behind a crystalline card, a gilded rule marking it as the
 * premium first step, and honest expectation-setting up front (how many
 * sections, roughly how long, that it saves as you go). Setting expectations is
 * the actual fix for "it felt too deep" — the depth is the value, the surprise
 * was the problem.
 *
 * BEHAVIOUR
 * - Renders ONLY when isOnboardingComplete === false. `undefined` means we have
 *   not learned the flag yet, and we do not nag on a maybe.
 * - Dismissible for the session, never permanently — an unfinished assessment
 *   is a real gap in the coaching record, so it returns on next visit.
 *
 * RULES OBSERVED: 1 (styled-components, no MUI), 2 (44px targets), 3 (dark
 * first), 4 (<300 lines), 6 (tokens with fallbacks), 7 (contrast), 22-25
 * (premium + motion accessibility), 75 (copy describes what actually happens).
 * ============================================================================
 */

import React, { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';

export const CLIENT_ONBOARDING_PATH = '/dashboard/client/onboarding';

/** Honest, verifiable facts about the flow — these mirror the wizard's real steps. */
const FLOW_FACTS = [
  { label: '8 sections' },
  { label: 'about 10 minutes' },
  { label: 'saves as you go' },
] as const;

const auroraDrift = keyframes`
  0%   { transform: translate3d(-8%, -4%, 0) scale(1.05); opacity: 0.55; }
  50%  { transform: translate3d(6%, 3%, 0) scale(1.18);  opacity: 0.8; }
  100% { transform: translate3d(-8%, -4%, 0) scale(1.05); opacity: 0.55; }
`;

const sheen = keyframes`
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
`;

/* Shared style chunk that interpolates a keyframe — MUST use the css helper
   (rule 43): a plain template string would stringify the keyframe object and
   crash styled-components at mount. */
const auroraMotion = css`
  animation: ${auroraDrift} 14s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Wrapper = styled.section`
  position: relative;
  isolation: isolate;
  border-radius: 20px;
  overflow: hidden;
  margin: 0 0 1.5rem;
  padding: clamp(1.25rem, 3vw, 2rem);
  background:
    linear-gradient(145deg,
      var(--surface-elevated, #003080) 0%,
      var(--bg-primary, #002060) 55%,
      var(--card-dark, #141419) 100%);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.28));
  box-shadow:
    0 18px 45px -22px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(198, 168, 75, 0.14) inset;
`;

const Aurora = styled.div`
  position: absolute;
  inset: -35%;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(38% 44% at 22% 34%, var(--accent-primary, #60C0F0) 0%, transparent 68%),
    radial-gradient(34% 40% at 76% 62%, var(--accent-glow, #8B5CF6) 0%, transparent 66%);
  filter: blur(46px);
  opacity: 0.6;
  ${auroraMotion}
`;

const GildedRule = styled.span`
  display: block;
  width: 46px;
  height: 2px;
  margin-bottom: 0.85rem;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent-luxury, #C6A84B), transparent);
`;

const Eyebrow = styled.p`
  margin: 0 0 0.35rem;
  font-family: 'Sora', 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-luxury, #C6A84B);
`;

const Title = styled.h2`
  margin: 0 0 0.5rem;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: clamp(1.35rem, 3.2vw, 1.9rem);
  line-height: 1.2;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const Body = styled.p`
  margin: 0 0 1.1rem;
  max-width: 60ch;
  font-size: 0.97rem;
  line-height: 1.6;
  color: var(--text-secondary, rgba(224, 236, 244, 0.82));
`;

const Facts = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 1.35rem;
  padding: 0;
  list-style: none;
`;

const Fact = styled.li`
  padding: 0.34rem 0.7rem;
  border-radius: 999px;
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 0.74rem;
  color: var(--text-primary, #E0ECF4);
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.24);
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
`;

/* Dual-Button Glow: blue background earns a purple glow. */
const StartButton = styled.button`
  position: relative;
  overflow: hidden;
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 12px;
  cursor: pointer;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(135deg, var(--bg-primary, #002060), var(--surface-elevated, #003080));
  box-shadow: 0 0 20px -4px var(--accent-glow, #8B5CF6);
  transition: transform 160ms ease, box-shadow 220ms ease;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 38%;
    height: 100%;
    background: linear-gradient(100deg, transparent, rgba(224, 236, 244, 0.26), transparent);
    animation: ${sheen} 3.6s ease-in-out infinite;
  }

  &:hover,
  &:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 0 30px -2px var(--accent-glow, #8B5CF6);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8B5CF6);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::after { animation: none; }
    &:hover { transform: none; }
  }
`;

const LaterButton = styled.button`
  min-height: 44px;
  padding: 0.75rem 1.1rem;
  border: 1px solid var(--border-subtle, rgba(224, 236, 244, 0.2));
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.9rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export interface ClientOnboardingLaunchCardProps {
  /** Strictly false means "known incomplete". undefined means "not loaded yet". */
  isOnboardingComplete?: boolean;
  firstName?: string;
  onStart?: () => void;
}

const ClientOnboardingLaunchCard: React.FC<ClientOnboardingLaunchCardProps> = ({
  isOnboardingComplete,
  firstName,
  onStart,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Only nag when we KNOW it is incomplete.
  if (isOnboardingComplete !== false || dismissed) return null;

  const greeting = firstName ? `${firstName}, let's` : "Let's";

  const handleStart = () => {
    if (onStart) onStart();
    else navigate(CLIENT_ONBOARDING_PATH);
  };

  return (
    <Wrapper aria-labelledby="onboarding-launch-title">
      <Aurora aria-hidden="true" />
      <GildedRule aria-hidden="true" />
      <Eyebrow>Your first step</Eyebrow>
      <Title id="onboarding-launch-title">{greeting} build your training profile</Title>
      <Body>
        This is the movement, health, and goals assessment your coach uses to build your
        program — the same NASM-informed intake we&apos;d walk through in person. It is
        what makes every workout, chart, and recommendation after this actually yours.
      </Body>
      <Facts>
        {FLOW_FACTS.map((fact) => (
          <Fact key={fact.label}>{fact.label}</Fact>
        ))}
      </Facts>
      <Actions>
        <StartButton type="button" onClick={handleStart}>
          Start my assessment
        </StartButton>
        <LaterButton type="button" onClick={() => setDismissed(true)}>
          Not right now
        </LaterButton>
      </Actions>
    </Wrapper>
  );
};

export default ClientOnboardingLaunchCard;
