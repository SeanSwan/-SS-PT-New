/**
 * contextLoss — the WebGL context-loss policy, as a pure state machine.
 * @module pages/HomePage/three-worlds/contextLoss
 *
 * WHY THIS IS ITS OWN MODULE
 * Context loss is the one failure mode where the page looks fine and is not. Two
 * hostile reviews independently found bugs here, and neither could be caught by a
 * test because the logic lived inside a React effect: one version kept the render
 * loop running on a dead context (the frame counter climbed while the canvas was
 * black), and the next published `contextLost: 'no'` during the FATAL second loss
 * because `restored` was never cleared.
 *
 * Pulling the transitions out of the effect makes them testable without a GPU, which
 * is the only way this stays correct. `runtime.ts` wires the listeners; this decides
 * what they mean.
 *
 * THE POLICY: one loss is survivable and worth recovering from. A second loss means
 * recovery is not working, so the world stops pretending and falls back to its poster.
 */

export type ContextLossStage = 'healthy' | 'lost' | 'recovered' | 'fatal';

export interface ContextLossState {
  stage: ContextLossStage;
  losses: number;
  /** True when the context is currently lost and NOT yet recovered. */
  contextLost: boolean;
  /** True when the loop should be stopped and the poster shown. */
  giveUp: boolean;
}

export interface ContextLossPolicy {
  /** Record a `webglcontextlost` event. */
  onLost: () => ContextLossState;
  /** Record a `webglcontextrestored` event. */
  onRestored: () => ContextLossState;
  /** Current state, without transitioning. */
  read: () => ContextLossState;
}

/**
 * Wire the policy to a canvas. Returns a detach function for cleanup.
 *
 * Extracted from `runtime.ts` (rule-4 line cap, round 4) so the DOM plumbing lives
 * next to the transitions it feeds. The hooks are the runtime's reactions; this
 * module decides only WHEN they fire.
 */
export function attachContextLossListeners(
  canvas: HTMLCanvasElement,
  policy: ContextLossPolicy,
  hooks: {
    /** Every loss: stop the loop and show the poster (first loss included). */
    onLost: () => void;
    /** The fatal second loss: adopt the permanent still. */
    onGiveUp: () => void;
    /** A meaningful restore: bring the canvas back. */
    onRestored: () => void;
  },
): () => void {
  const onLost = (e: Event) => {
    // Preventing default is what leaves the door open for WEBGL_lose_context
    // restoration; without it the browser is free to tear the context down for good.
    e.preventDefault();
    const s = policy.onLost();
    hooks.onLost();
    if (s.giveUp) hooks.onGiveUp();
  };
  const onRestored = () => {
    // A late restore after the fatal loss must not flap the verdict — the two-loss
    // rule exists to settle exactly this boundary.
    const s = policy.onRestored();
    if (s.giveUp) return;
    hooks.onRestored();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  return () => {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };
}

/** Build an independent policy instance. One per mounted world. */
export function createContextLossPolicy(): ContextLossPolicy {
  let losses = 0;
  // "Recovered since the MOST RECENT loss" — not "has ever recovered". Conflating the
  // two is precisely the bug that made the fatal loss report itself as healthy.
  let restoredSinceLoss = true;
  let giveUp = false;

  const read = (): ContextLossState => {
    const stage: ContextLossStage = giveUp
      ? 'fatal'
      : losses === 0
        ? 'healthy'
        : restoredSinceLoss ? 'recovered' : 'lost';
    return {
      stage,
      losses,
      contextLost: losses > 0 && !restoredSinceLoss,
      giveUp,
    };
  };

  return {
    onLost() {
      losses += 1;
      restoredSinceLoss = false;
      // A second loss means recovery is not working.
      if (losses > 1) giveUp = true;
      return read();
    },
    onRestored() {
      // Ignored once the policy has given up: a late restore must not flap the
      // poster/live boundary that the two-loss rule exists to settle.
      if (giveUp) return read();
      restoredSinceLoss = true;
      return read();
    },
    read,
  };
}
