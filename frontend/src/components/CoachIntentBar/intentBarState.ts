/**
 * ============================================================================
 * FILE: CoachIntentBar/intentBarState.ts
 * PURPOSE: The intent bar's truth — who is locked, and would this act on someone else.
 * CREATED: 2026-07-25 (Coach Hive-Mind C5)
 * ============================================================================
 *
 * WHY THIS EXISTS
 *   The intent bar's single most important job is not resolving commands — it is
 *   making **whose record this writes to** impossible to miss. A wrong-client
 *   write was live in production on the command that cancels a session (C0.5).
 *   The backend now prevents it, but the trainer never sees that guarantee, and
 *   an invisible guarantee builds no trust.
 *
 *   This module answers three questions with no React, no DOM, no network:
 *     1. Which dashboard am I standing in? (audience — never demote an admin)
 *     2. Is the locked client the client this command would touch?
 *     3. What tone should the chip carry right now?
 *
 * THE HABITUATION PROBLEM — read before changing the tone rules
 *   An always-visible warning becomes wallpaper by the 200th session. The design
 *   ruling therefore requires the chip be **quiet in the common case and loud
 *   only on CHANGE**. `chipTone` is deliberately binary and `crossClient` is
 *   deliberately hard to trigger: a confirmation that always fires is
 *   equivalent to no confirmation at all.
 *
 *   Same trap already guarded in `voiceConfirmationTier.mjs`, where `42` and
 *   `'42'` are deliberately the SAME client — a transport that stringifies ids
 *   must never manufacture a false cross-client alarm.
 *
 * PURE + DEPENDENCY-FREE (except the audience resolver, itself pure) so the
 * safety logic is testable without a browser.
 */
import { resolveAudienceFromPath } from '../DashBoard/workspaces/clients-team/resolveAudienceFromPath';
import type { ClientHubAudience } from '../DashBoard/workspaces/clients-team/clientHubAudience';

/** Chip appearance. `locked` is the quiet default; `cross-client` is the alarm. */
export type ChipTone = 'locked' | 'cross-client' | 'unlocked';

export interface IntentBarInput {
  /** The client the trainer has selected. Null = nothing locked. */
  lockedClientId?: number | string | null;
  /** The client this command would act on. Null/undefined = the locked one. */
  targetClientId?: number | string | null;
  /** Current dashboard URL — decides which shell we link back into. */
  pathname?: string | null;
}

export interface IntentBarState {
  /** Which dashboard shell to route back into. Never hardcode a role path. */
  audience: ClientHubAudience;
  /** The locked client as a canonical number, or null. */
  lockedClientId: number | null;
  /** The acting client as a canonical number, or null. */
  targetClientId: number | null;
  /** True only when both resolve AND differ. */
  crossClient: boolean;
  /** A client was NAMED while nothing was locked — see resolveIntentBarState. */
  unlockedTarget: boolean;
  /** crossClient || unlockedTarget: the action reaches an unlocked client. */
  identityCrossing: boolean;
  chipTone: ChipTone;
  /**
   * True when a command is client-scoped but nothing is locked. Unattributed is
   * the shape a wrong-client write takes — surface it, never default it.
   */
  unresolvedClient: boolean;
}

/**
 * Canonicalize a client id.
 *
 * Accepts number or numeric string, because ids arrive stringified from some
 * transports. Rejects anything that is not a positive safe integer — mirroring
 * `clientScope.mjs#resolveCommandClientId`, so the frontend and backend agree
 * on what "a client id" means.
 */
export function toClientId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Derive the bar's state. Pure — same input, same output, always.
 *
 * `crossClient` is true ONLY when both ids resolve and differ. A missing target
 * means "the locked client", not "someone else" — treating absence as difference
 * would fire the alarm constantly and train the trainer to ignore it.
 */
export function resolveIntentBarState(input: IntentBarInput = {}): IntentBarState {
  const audience = resolveAudienceFromPath(input.pathname ?? null);
  const lockedClientId = toClientId(input.lockedClientId);
  const targetClientId = toClientId(input.targetClientId);

  const crossClient =
    lockedClientId !== null && targetClientId !== null && lockedClientId !== targetClientId;

  // A command that names a client while nothing is locked cannot be attributed.
  const unresolvedClient = lockedClientId === null && targetClientId === null;

  /**
   * THE BETWEEN-CASE (card 1.2, finding F16g/FF19 — GLM 5.3 + flash).
   *
   * `crossClient` needs BOTH ids; `unresolvedClient` needs BOTH null. A command
   * that NAMES a client while nothing is locked satisfied neither, so the chip
   * showed the quiet `unlocked` tone — "nothing selected" — while
   * `effectiveClientId` silently returned that named client and the write landed
   * on a specific record. The operator saw a neutral chip and a targeted action.
   *
   * The backend escalates this shape to `deliberate` (reason `unlocked_target`).
   * The chip must agree, or the two surfaces disagree about what "safe" means.
   */
  const unlockedTarget = lockedClientId === null && targetClientId !== null;

  /** Either shape where the action reaches a client the operator did not lock. */
  const identityCrossing = crossClient || unlockedTarget;

  let chipTone: ChipTone = 'locked';
  if (identityCrossing) chipTone = 'cross-client';
  else if (lockedClientId === null) chipTone = 'unlocked';

  return {
    audience, lockedClientId, targetClientId,
    crossClient, unlockedTarget, identityCrossing,
    chipTone, unresolvedClient,
  };
}

/**
 * The client the bar will actually act on.
 *
 * Locked wins over target — identical precedence to the backend's
 * `resolveCommandClientId`. When they disagree the UI must have already
 * escalated to a deliberate confirmation; this function does not silently
 * pick the target.
 */
export function effectiveClientId(state: IntentBarState): number | null {
  return state.lockedClientId ?? state.targetClientId;
}

/**
 * Build the audience-correct dashboard path — never a hardcoded role segment.
 *
 * Hardcoding `/dashboard/trainer/...` does not merely navigate; it DEMOTES an
 * admin, swapping the route table and sidebar for the trainer shell
 * (`UniversalDashboardLayout` derives activeRole from the URL). Route locality
 * is the rule: whichever dashboard you are in is the one you stay in.
 */
export function audiencePath(state: IntentBarState, surface: string): string {
  const clean = surface.replace(/^\/+/, '');
  return `/dashboard/${state.audience}/${clean}`;
}
