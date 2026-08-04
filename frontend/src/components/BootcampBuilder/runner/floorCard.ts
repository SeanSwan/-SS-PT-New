/**
 * ============================================================================
 * FILE: runner/floorCard.ts
 * PURPOSE: Floor Card command tracking — the phone in Sean's hand while he
 *          walks the floor. SWA-105 Slice 10.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * LAWS (Opus P2 / Kimi R7):
 *  - The phone is NOT a remote mirroring state — it is a coach card that
 *    SENDS idempotent commands and shows what it last knew.
 *  - Optimistic echo: a sent command shows as pending immediately; it
 *    resolves DELIVERED when a newer state arrives, or UNDELIVERED after the
 *    timeout. "Not delivered" is a phone-only state —
 *  - THE TV NEVER SHOWS A TRANSPORT ERROR. Gym Wi-Fi dying must be invisible
 *    to 14 people; only the trainer's phone shows the degraded banner.
 *  - Commands carry baseSeq; a resync (stale seq) refreshes local state and
 *    the trainer taps again — a stale tap NEVER lands as a side effect.
 */

import type { RunnerCommand, RunnerCommandType, RunnerState } from './runnerProtocol';

export interface PendingCommand {
  cmdId: string;
  type: RunnerCommandType;
  sentAtEpochMs: number;
  status: 'pending' | 'delivered' | 'undelivered';
}

export interface FloorCardModel {
  lastKnown: RunnerState | null;
  pending: PendingCommand[];
  /** Non-null while the link is considered degraded (phone-only banner). */
  degradedSinceEpochMs: number | null;
}

export const DELIVERY_TIMEOUT_MS = 2_000;
export const STALE_LINK_MS = 10_000;

export function createFloorCardModel(): FloorCardModel {
  return { lastKnown: null, pending: [], degradedSinceEpochMs: null };
}

/** Build the command for the CURRENT known seq; null when we know nothing yet. */
export function makeCommand(
  model: FloorCardModel,
  type: RunnerCommandType,
  nowEpochMs: number,
): RunnerCommand | null {
  if (!model.lastKnown) return null;
  return {
    cmdId: `floor-${type}-${nowEpochMs}-${model.lastKnown.seq}`,
    type,
    baseSeq: model.lastKnown.seq,
    atEpochMs: nowEpochMs,
  };
}

/** Optimistic echo: track the send immediately. */
export function trackSend(model: FloorCardModel, cmd: RunnerCommand, nowEpochMs: number): FloorCardModel {
  return {
    ...model,
    pending: [
      ...model.pending.filter((p) => p.status === 'pending'),
      { cmdId: cmd.cmdId, type: cmd.type, sentAtEpochMs: nowEpochMs, status: 'pending' },
    ],
  };
}

/**
 * A state frame arrived. A NEWER seq than the one a pending command was based
 * on means the console processed something after our send — the command is
 * DELIVERED (or superseded, which for idempotent commands is the same thing).
 */
export function onStateFrame(model: FloorCardModel, state: RunnerState): FloorCardModel {
  const lastKnown = !model.lastKnown || state.seq > model.lastKnown.seq ? state : model.lastKnown;
  return {
    ...model,
    lastKnown,
    degradedSinceEpochMs: null, // a frame is proof of life
    pending: model.pending.map((p) => (p.status === 'pending' && lastKnown.seq > seqOf(p)
      ? { ...p, status: 'delivered' }
      : p)),
  };
}

const seqOf = (p: PendingCommand): number => {
  const parts = p.cmdId.split('-');
  return Number(parts[parts.length - 1]) || 0;
};

/**
 * Clock tick: expire pending sends past the timeout, and mark the LINK
 * degraded when nothing has been heard for STALE_LINK_MS.
 */
export function onTick(model: FloorCardModel, nowEpochMs: number, lastFrameAtEpochMs: number | null): FloorCardModel {
  const pending = model.pending.map((p) => (
    p.status === 'pending' && nowEpochMs - p.sentAtEpochMs > DELIVERY_TIMEOUT_MS
      ? { ...p, status: 'undelivered' as const }
      : p
  ));
  const stale = lastFrameAtEpochMs !== null && nowEpochMs - lastFrameAtEpochMs > STALE_LINK_MS;
  return {
    ...model,
    pending,
    degradedSinceEpochMs: stale ? (model.degradedSinceEpochMs ?? nowEpochMs) : model.degradedSinceEpochMs,
  };
}

/** What the banner shows — phone-only; the TV never renders this. */
export function linkBanner(model: FloorCardModel): string | null {
  if (model.degradedSinceEpochMs !== null) {
    return 'Connection lost — the class continues on the TV. Commands may not deliver.';
  }
  if (model.pending.some((p) => p.status === 'undelivered')) {
    return 'Last command may not have arrived — check the TV before tapping again.';
  }
  return null;
}
