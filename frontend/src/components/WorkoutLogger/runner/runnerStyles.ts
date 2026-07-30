/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ runnerStyles.ts — Runner Style registry + persisted store   │
 * │ The Session Runner's Lens dimension: 10 switchable styles   │
 * │ on one engine (RUNNER-STYLES-FINAL-10-2026-07-30.md).       │
 * │ Store pattern mirrors plannerViewMode: localStorage +       │
 * │ subscribe, safe under SSR/private browsing.                 │
 * └─────────────────────────────────────────────────────────────┘
 */

export type RunnerStyleId =
  | 'focus-flow'
  | 'classic-ledger'
  | 'split-zen'
  | 'world-immersion'
  | 'stadium-hud'
  | 'ghost-rival'
  | 'ledger-pro'
  | 'timeline-pulse'
  | 'target-card'
  | 'sheet-stack'
  | 'circuit-relay';

export interface RunnerStyleMeta {
  id: RunnerStyleId;
  name: string;
  tagline: string;
  /** Tier 1 = full-SLA; labs = badged, may lag releases. */
  tier: 'tier1' | 'labs';
  /** Only shipped styles are selectable in the Lens picker. */
  shipped: boolean;
}

export const RUNNER_STYLES: readonly RunnerStyleMeta[] = Object.freeze([
  { id: 'focus-flow', name: 'Focus Flow', tagline: 'One exercise at a time — giant NOW state, thumb-zone controls', tier: 'tier1', shipped: true },
  { id: 'classic-ledger', name: 'Classic Ledger', tagline: 'The full-session card stack — everything visible, scrolling', tier: 'tier1', shipped: true },
  { id: 'sheet-stack', name: 'Sheet Stack', tagline: 'iOS-native bottom-sheet ergonomics — everything at the thumb', tier: 'tier1', shipped: true },
  { id: 'ledger-pro', name: 'Ledger Pro', tagline: 'The perfected dense table for power users', tier: 'tier1', shipped: true },
  { id: 'target-card', name: 'Target Card', tagline: 'Target vs last time with steppers — most sets log in one tap', tier: 'labs', shipped: false },
  { id: 'split-zen', name: 'Split Zen', tagline: 'Viewport-scale numerals for the arm’s-length glance', tier: 'labs', shipped: false },
  { id: 'ghost-rival', name: 'Ghost Rival', tagline: 'Your previous session races beside you as a ghost', tier: 'labs', shipped: false },
  { id: 'timeline-pulse', name: 'Timeline Pulse', tagline: 'The session as a living timeline with a now-line', tier: 'labs', shipped: false },
  { id: 'stadium-hud', name: 'Stadium HUD', tagline: 'XP, streaks, and PR moments — earned gold only', tier: 'labs', shipped: false },
  { id: 'world-immersion', name: 'World Immersion', tagline: 'Your Lens world as the atmosphere behind the session', tier: 'labs', shipped: false },
  { id: 'circuit-relay', name: 'Circuit Relay', tagline: 'Supersets and circuits as rounds and stations', tier: 'labs', shipped: false },
]);

export const DEFAULT_RUNNER_STYLE: RunnerStyleId = 'focus-flow';

const STORAGE_KEY = 'ss.runner.style.v1';
const SHIPPED_IDS = new Set(RUNNER_STYLES.filter((s) => s.shipped).map((s) => s.id));

type Listener = () => void;
const listeners = new Set<Listener>();

export function readRunnerStyle(): RunnerStyleId {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw && SHIPPED_IDS.has(raw as RunnerStyleId)) return raw as RunnerStyleId;
  } catch {
    /* private browsing / SSR — fall through to default */
  }
  return DEFAULT_RUNNER_STYLE;
}

export function writeRunnerStyle(id: RunnerStyleId): void {
  if (!SHIPPED_IDS.has(id)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* persistence unavailable — in-memory listeners still update */
  }
  listeners.forEach((fn) => fn());
}

export function subscribeRunnerStyle(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
