/**
 * FILE: CoachCommandCards.confirmState.ts
 * PURPOSE: Confirmation-card interaction truth (v2 P1.2 + P2.4).
 *
 * - Pending command operations expire server-side (~120s). A card whose
 *   Confirm can only ever fail is a lie — count down and swap to an honest
 *   expired state with a one-tap re-issue.
 * - Destructive writes need a stronger path than one tap (Sprint A §3.4):
 *   first tap ARMS the confirm for 3s ("Tap again"), second tap executes.
 */
import { useEffect, useState } from 'react';
import styled from 'styled-components';

export const ExpiryHint = styled.small`
  color: var(--coach-muted, #9eb0c7);
  display: block;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
`;

export const CONFIRMATION_TTL_SECONDS = 120;
const DISARM_MS = 3000;

export function formatExpiryCountdown(remaining: number): string {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function resolveExpiryDeadline(expiresAt?: string): number {
  if (!expiresAt) return Date.now() + (CONFIRMATION_TTL_SECONDS * 1000);
  const expiryMs = Date.parse(expiresAt);
  return Number.isFinite(expiryMs)
    ? expiryMs
    : Date.now() + (CONFIRMATION_TTL_SECONDS * 1000);
}

function remainingUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export function useConfirmationCardState(options: { done: boolean; expiresAt?: string; isDestructive: boolean }) {
  const [remaining, setRemaining] = useState(() => remainingUntil(resolveExpiryDeadline(options.expiresAt)));
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const deadline = resolveExpiryDeadline(options.expiresAt);
    const syncRemaining = () => setRemaining(remainingUntil(deadline));
    syncRemaining();
    if (options.done) return undefined;
    const timer = window.setInterval(syncRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [options.done, options.expiresAt]);

  useEffect(() => {
    if (!armed) return undefined;
    const timer = window.setTimeout(() => setArmed(false), DISARM_MS);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const expired = remaining <= 0 && !options.done;

  /** Returns true when the caller may execute; false when this tap only armed. */
  const passDestructiveGate = () => {
    if (!options.isDestructive || armed) {
      setArmed(false);
      return true;
    }
    setArmed(true);
    return false;
  };

  return { armed, expired, passDestructiveGate, remaining };
}
