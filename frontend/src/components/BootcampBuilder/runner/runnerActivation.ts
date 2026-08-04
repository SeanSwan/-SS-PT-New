/**
 * ============================================================================
 * FILE: runner/runnerActivation.ts
 * PURPOSE: ONE user gesture acquires everything the Runner needs — and losing
 *          any of it is LOUD, never silent. SWA-105 Slice 5 (Opus P7, Kimi R8).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * WHY ONE FUNCTION: fullscreen, Wake Lock, AudioContext.resume() and the first
 * video.play() ALL require a user activation. Split them across a promise
 * chain and some browsers silently drop the later ones — silent audio on one
 * laptop, no video on another. Everything happens inside the SAME onClick.
 *
 * WAKE-LOCK REALITY (Kimi R8): the lock is RELEASED on visibilitychange — one
 * alt-tab at minute 8 kills it silently — so this module re-acquires on
 * visibility return and reports every loss. And a wake lock protects the
 * LAPTOP, not the TV: the TV's own sleep timer is a setup-checklist problem
 * no web API can touch (documented in the Runner setup screen, slice 6).
 *
 * All browser APIs are injected — every path here is unit-testable.
 */

export interface ActivationTargets {
  /** The element to fullscreen (the audience window root). */
  fullscreenEl?: { requestFullscreen?: () => Promise<void> } | null;
  /** Videos to unlock with a muted play() inside the gesture. */
  videos?: Array<{ play: () => Promise<void>; muted: boolean }>;
  audioContext?: { state: string; resume: () => Promise<void> } | null;
  wakeLockApi?: { request: (type: 'screen') => Promise<WakeSentinelLike> } | null;
  documentRef?: {
    addEventListener: (type: 'visibilitychange', fn: () => void) => void;
    visibilityState: string;
  } | null;
  /** LOUD failure surface — the Runner shows a persistent banner + audio heartbeat. */
  onDegraded: (facility: 'fullscreen' | 'wake_lock' | 'audio' | 'video', detail: string) => void;
  onWakeLockRestored?: () => void;
}

export interface WakeSentinelLike {
  released?: boolean;
  addEventListener?: (type: 'release', fn: () => void) => void;
  release?: () => Promise<void>;
}

export interface ActivationResult {
  fullscreen: boolean;
  wakeLock: boolean;
  audio: boolean;
  video: boolean;
}

/** Call ONLY from inside the Start Class click handler. */
export async function acquireAll(targets: ActivationTargets): Promise<ActivationResult> {
  const result: ActivationResult = { fullscreen: false, wakeLock: false, audio: false, video: false };

  // Kick every request inside the gesture SYNCHRONOUSLY, await after — the
  // activation token does not survive an intermediate await on some engines.
  const fullscreenP = targets.fullscreenEl?.requestFullscreen?.() ?? Promise.reject(new Error('unsupported'));
  const audioP = targets.audioContext
    ? (targets.audioContext.state === 'running' ? Promise.resolve() : targets.audioContext.resume())
    : Promise.reject(new Error('no_audio_context'));
  const videoPs = (targets.videos ?? []).map((v) => { v.muted = true; return v.play(); });
  const wakeP = acquireWakeLock(targets);

  result.fullscreen = await settles(fullscreenP, () => targets.onDegraded('fullscreen', 'request rejected'));
  result.audio = await settles(audioP, () => targets.onDegraded('audio', 'context did not resume — cues will be silent'));
  result.video = (await Promise.all(videoPs.map((p) => settles(p, () => {})))).every(Boolean)
    && videoPs.length >= 0;
  if (!result.video && videoPs.length > 0) targets.onDegraded('video', 'autoplay blocked on a demo video');
  result.wakeLock = await wakeP;

  return result;
}

async function settles(p: Promise<unknown>, onFail: () => void): Promise<boolean> {
  try { await p; return true; } catch { onFail(); return false; }
}

/**
 * Acquire the wake lock and KEEP it: re-request on every visibility return,
 * report every release. Returns first-acquisition success.
 */
async function acquireWakeLock(targets: ActivationTargets): Promise<boolean> {
  const api = targets.wakeLockApi;
  if (!api) {
    targets.onDegraded('wake_lock', 'not supported — the screen WILL sleep; see setup checklist');
    return false;
  }

  const request = async (isReacquire: boolean): Promise<boolean> => {
    try {
      const sentinel = await api.request('screen');
      sentinel.addEventListener?.('release', () => {
        // Released ≠ failed: visibility loss releases it. If we're visible and
        // it released anyway, that's a real degradation.
        if (targets.documentRef?.visibilityState === 'visible') {
          targets.onDegraded('wake_lock', 'released while visible');
        }
      });
      if (isReacquire) targets.onWakeLockRestored?.();
      return true;
    } catch {
      targets.onDegraded('wake_lock', isReacquire ? 're-acquire failed' : 'request rejected');
      return false;
    }
  };

  targets.documentRef?.addEventListener('visibilitychange', () => {
    if (targets.documentRef?.visibilityState === 'visible') void request(true);
  });

  return request(false);
}
