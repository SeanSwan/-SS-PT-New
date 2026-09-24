/*
 * constellation-walk.ts — the keyboard walk over the constellation's nodes.
 *
 * WHY THIS FILE EXISTS. `BrainConstellation.tsx` crossed this package's Rule 4
 * cap (300 lines, ban 14) again, and the cap is met by extracting at a seam
 * rather than by tightening comments — the comments are what stops the defects
 * in that file coming back.
 *
 * The seam is "which node does the keyboard move to" vs "how the component is
 * wired". This module is a PURE FUNCTION of `(nodes, focused, key)`: it holds no
 * state, touches no ref and no scene, and returns the same answer for the same
 * input. That is what makes it safe to move, and it is also what makes the
 * keyboard contract testable without rendering React or a WebGL context.
 *
 * It also fixes a real behaviour the component had inline: the walk wrapped
 * correctly in BOTH directions, but `Escape` and `Enter` were entangled with it.
 * Separating them means the wrap arithmetic is one thing and the activation
 * semantics are another.
 */

import type { BrainNode } from './constellation-layout';

/** What the component should do in response to a key. */
export type WalkAction =
  | { kind: 'focus'; channelId: string }
  | { kind: 'activate'; channelId: string }
  | { kind: 'clear' }
  | { kind: 'none' };

/**
 * Resolve a keypress against the node list.
 *
 * `03 §Keyboard` requires the constellation be fully operable without a pointer,
 * and the roster below it must stay in a DETERMINISTIC order — so the walk moves
 * through the same array the list renders, by index, wrapping at both ends.
 *
 * An empty roster is a 'none' for every key including Escape: clearing a focus
 * that cannot exist is a no-op, and reporting it as one keeps the caller from
 * scheduling a pointless re-render.
 */
export function walk(nodes: BrainNode[], focused: string | null, key: string): WalkAction {
  if (!nodes.length) return { kind: 'none' };

  const at = nodes.findIndex((n) => n.channelId === focused);

  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      // `at` is -1 when nothing is focused, so the first press lands on index 0.
      return { kind: 'focus', channelId: nodes[(at + 1 + nodes.length) % nodes.length].channelId };

    case 'ArrowUp':
    case 'ArrowLeft':
      // `at <= 0` wraps to the END, so ArrowUp from the first node goes to the
      // last rather than sticking. `at` of -1 (nothing focused) also lands last,
      // which is the same direction the user asked for.
      return { kind: 'focus', channelId: nodes[(at <= 0 ? nodes.length : at) - 1].channelId };

    case 'Enter':
      // D9 (Astra 140126): MEMBERSHIP, not the raw string. `at` is computed one
      // line above and used to be ignored here, so a focus left behind by a
      // roster removal activated a creator that no longer exists. `at >= 0` is
      // the roster itself saying the node is still there; a stale focus is
      // cleared (healed) rather than acted on, and a focus that never existed
      // is a no-op.
      if (at >= 0) return { kind: 'activate', channelId: nodes[at].channelId };
      return focused ? { kind: 'clear' } : { kind: 'none' };

    case 'Escape':
      return { kind: 'clear' };

    default:
      return { kind: 'none' };
  }
}
