/**
 * ============================================================================
 * FILE: runner/runnerChannel.ts
 * PURPOSE: Console <-> Audience <-> FloorCard transport. SWA-105 Slice 5.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * TRANSPORT LAW (Opus 5 P2): the TV is a SECOND WINDOW of the same machine, so
 * console<->audience sync is BroadcastChannel — same-origin, zero network,
 * immune to gym Wi-Fi. Only the phone Floor Card (slice 10) rides a network
 * link, and it degrades invisibly: the TV never shows a transport error.
 *
 * The channel is injected so every behavior here is unit-testable without a
 * browser. Message shapes are versioned and closed.
 */

import type { RunnerCommand, RunnerState } from './runnerProtocol';

export const RUNNER_CHANNEL_NAME = 'swan-bootcamp-runner-v1';

export type RunnerMessage =
  | { v: 1; kind: 'state'; state: RunnerState; plan?: object }
  | { v: 1; kind: 'command'; command: RunnerCommand }
  | { v: 1; kind: 'hello'; role: 'audience' | 'floor' };

export interface ChannelLike {
  postMessage(message: RunnerMessage): void;
  addEventListener(type: 'message', handler: (ev: { data: RunnerMessage }) => void): void;
  close(): void;
}

export const defaultChannel = (): ChannelLike =>
  new BroadcastChannel(RUNNER_CHANNEL_NAME) as unknown as ChannelLike;

function isRunnerMessage(data: unknown): data is RunnerMessage {
  return !!data && typeof data === 'object'
    && (data as { v?: unknown }).v === 1
    && ['state', 'command', 'hello'].includes((data as { kind?: string }).kind ?? '');
}

/**
 * The console side — the ONLY writer. Publishes full state on every change
 * (full state, never deltas: a missed delta is a desync, a missed full state
 * is just one stale frame). Answers `hello` with the current state + plan so
 * a late-opened audience window syncs without a refresh.
 */
export function createConsoleEndpoint(opts: {
  channel: ChannelLike;
  getState: () => RunnerState;
  getPlan: () => object;
  onCommand: (command: RunnerCommand) => void;
}) {
  const { channel, getState, getPlan, onCommand } = opts;

  channel.addEventListener('message', ({ data }) => {
    if (!isRunnerMessage(data)) return;
    if (data.kind === 'command') onCommand(data.command);
    if (data.kind === 'hello') {
      channel.postMessage({ v: 1, kind: 'state', state: getState(), plan: getPlan() });
    }
  });

  return {
    publish() {
      channel.postMessage({ v: 1, kind: 'state', state: getState() });
    },
    publishWithPlan() {
      channel.postMessage({ v: 1, kind: 'state', state: getState(), plan: getPlan() });
    },
    close: () => channel.close(),
  };
}

/**
 * A read side (audience TV window or floor card). Applies newer-seq states
 * only; announces itself so the console replays state + plan.
 */
export function createReceiverEndpoint(opts: {
  channel: ChannelLike;
  role: 'audience' | 'floor';
  onState: (state: RunnerState, plan?: object) => void;
}) {
  const { channel, role, onState } = opts;
  let lastSeq = -1;

  channel.addEventListener('message', ({ data }) => {
    if (!isRunnerMessage(data) || data.kind !== 'state') return;
    if (data.state.seq <= lastSeq) return; // stale frame — drop, never rewind
    lastSeq = data.state.seq;
    onState(data.state, data.plan);
  });

  channel.postMessage({ v: 1, kind: 'hello', role });

  return {
    sendCommand(command: RunnerCommand) {
      channel.postMessage({ v: 1, kind: 'command', command });
    },
    close: () => channel.close(),
  };
}
