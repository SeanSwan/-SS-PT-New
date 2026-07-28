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
import { useNavigate } from 'react-router-dom';
import {
  Wrapper,
  Aurora,
  GildedRule,
  Eyebrow,
  Title,
  Body,
  Facts,
  Fact,
  Actions,
  StartButton,
  LaterButton,
} from './ClientOnboardingLaunchCard.styles';

export const CLIENT_ONBOARDING_PATH = '/dashboard/client/onboarding';

/** Honest, verifiable facts about the flow — these mirror the wizard's real steps. */
const FLOW_FACTS = [
  { label: '8 sections' },
  { label: 'about 10 minutes' },
  { label: 'saves as you go' },
] as const;

/**
 * Roles for whom a training-profile assessment is meaningful. Staff visiting a
 * client route must never be invited to fill one in — `/dashboard/client/*` is
 * reachable by URL for admins and trainers (activeRole derives from the path),
 * and submitting would write client onboarding data onto a staff account.
 */
const ONBOARDING_ROLES = new Set(['client', 'user']);

export interface ClientOnboardingLaunchCardProps {
  /** Strictly false means "known incomplete". undefined means "not loaded yet". */
  isOnboardingComplete?: boolean;
  /** Only client-type accounts are invited to onboard. */
  role?: string;
  firstName?: string;
  onStart?: () => void;
}

const ClientOnboardingLaunchCard: React.FC<ClientOnboardingLaunchCardProps> = ({
  isOnboardingComplete,
  role,
  firstName,
  onStart,
}) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Only nag when we KNOW it is incomplete.
  if (isOnboardingComplete !== false || dismissed) return null;
  // ...and only a client-type account. An admin or trainer whose own flag is
  // false must not be invited to fill in a client assessment.
  if (role !== undefined && !ONBOARDING_ROLES.has(role)) return null;

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
