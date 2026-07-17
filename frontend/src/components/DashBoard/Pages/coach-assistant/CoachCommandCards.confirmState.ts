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

function initialRemaining(expiresAt?: string): number {
  if (!expiresAt) return CONFIRMATION_TTL_SECONDS;
  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) return CONFIRMATION_TTL_SECONDS;
  return Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000));
}

export function useConfirmationCardState(options: { done: boolean; expiresAt?: string; isDestructive: boolean }) {
  const [remaining, setRemaining] = useState(() => initialRemaining(options.expiresAt));
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setRemaining(initialRemaining(options.expiresAt));
  }, [options.expiresAt]);

  useEffect(() => {
    if (options.done) return undefined;
    const timer = window.setInterval(() => setRemaining((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [options.done]);

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
