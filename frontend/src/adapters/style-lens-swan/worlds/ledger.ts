/**
 * BLUEPRINT — World Ledger (Swan adapter · World Engine spine, Slice 1)
 * ====================================================================
 * The per-world a11y/perf budget + anti-cheese ledger, exhaustive over the
 * closed `WorldId` union (missing entry = compile error = completeness). This
 * is the rubric CI enforces (layers 1–2 now; measured layer 3 lands Slice 8)
 * and the Design-Director QA agent scores against (master build prompt §3.3).
 *
 * `phenomenon` is the ONE impossible optical phenomenon each world owns — the
 * distinctness anchor ("no 25 greys"): two worlds may never share it (CI
 * layer-2 phenomenon-uniqueness check). `measured` stays null until Slice 8
 * wires Lighthouse/Playwright; budgets are the ceilings those measurements
 * must clear. No hex here — pure policy data (Law 8 R6: surfaces are consumers).
 */
import { WORLD_IDS, WORLD_FAMILY, type WorldFamily, type WorldId } from './worldId';
import { WORLD_REGISTRY, type WorldStatus } from './registry';

export type FidelityTier = 'full' | 'reduced' | 'poster';

export interface WorldBudget {
  /** WCAG 4.5:1 at the brightest animation frame (CLAUDE.md rule 7). */
  readonly contrastMin: number;
  readonly minTouchPx: number;
  readonly lcpMs: number;
  readonly inpMs: number;
  readonly cls: number;
  readonly worldChunkMaxKb: number;
  /** photosensitivity ceiling (G11) — max luminance delta per second. */
  readonly maxLuminanceDeltaPerSec: number;
}

export interface WorldWaiver {
  readonly field: string;
  readonly reason: string;
  readonly approver: string;
  readonly expiresAt: string; // ISO date; expired waiver = red build (Slice 8)
}

export interface WorldLedgerEntry {
  readonly worldId: WorldId;
  readonly family: WorldFamily;
  /** the ONE impossible optical phenomenon — must be unique across all worlds. */
  readonly phenomenon: string;
  readonly status: WorldStatus;
  readonly budgets: WorldBudget;
  readonly fidelityTiers: readonly FidelityTier[];
  /** G1 — sanctioned colorway ids; empty until a wave slice assigns 3–5. */
  readonly sanctionedColorways: readonly string[];
  readonly antiCheese: {
    readonly noCreatures: boolean;
    readonly noClipartGradient: boolean;
    readonly noPhenomenonDup: boolean;
    readonly noChromeTint: boolean;
  };
  /** null until Slice 8 measures the preview route. */
  readonly measured: null | {
    readonly commit: string;
    readonly lcp: number;
    readonly inp: number;
    readonly cls: number;
    readonly contrast: number;
  };
  readonly waivers: readonly WorldWaiver[];
}

/** Swan default budget envelope (CLAUDE.md rules 3/7 + perf budget charter). */
const DEFAULT_BUDGET: WorldBudget = Object.freeze({
  contrastMin: 4.5,
  minTouchPx: 44,
  lcpMs: 2500,
  inpMs: 200,
  cls: 0.1,
  worldChunkMaxKb: 60,
  maxLuminanceDeltaPerSec: 0.2,
});

const ALL_TIERS: readonly FidelityTier[] = ['full', 'reduced', 'poster'];

/** The ONE impossible phenomenon per world (master build prompt §1). Uniqueness
 *  is CI-checked — editing one to collide with another fails the build. */
const PHENOMENON: Readonly<Record<WorldId, string>> = Object.freeze({
  'candy-glass-arcade': 'neon refracts through solid glass and arrives before it is emitted',
  'kinetic-kanban': 'tiles cast shadows in the direction they will move next',
  'signal-garden': 'flora lit cooler than the dark around it',
  'tempo-forge': 'cold sparks freeze mid-air into glass filings',
  'orbit-atlas': 'lensed starlight blooming into orbit rings',
  'modular-harbor': 'reflections that lag their source by half a second',
  'kintsugi-circuit': 'fractures heal forward — gold flows into cracks not yet formed',
  'quiet-meridian': 'a shadow that retreats toward the light',
  'recovery-cloister': 'caustic nets projected onto air',
  'monastic-grid': 'a spotlight with no source; objects lit from inside',
  'lunar-stack': 'condensation that blooms warm on cold glass',
  'prism-terminal': 'white light splits to rainbow before the prism',
  'blueprint-fold': 'folds that cast the shadow of the finished object',
  'analog-flight-recorder': 'needles that read the value one tick in the future',
  'chronograph-board': 'escapements tick between frames — seen only as blur',
  'terrain-console': 'elevation lines that cast height as colored shadow',
  'coach-ledger': 'ink that glows brighter the more it is verified',
  'crystalline-cathedral': 'rose-window caustics projected onto air, not floor',
  'carbon-atelier': 'threads of light casting colored shadows',
  'meridian-magazine': 'lens flares that cast shadows',
  'glass-rail': 'reflections that show the room one second in the future',
  'aurora-index': 'light that falls upward from the horizon',
  'tidal-columns': 'each raindrop projects a tiny inverted image of the sky',
  'split-horizon': 'a garden of lensed starlight blooming at the ridge',
  'cedar-workshop': 'dust motes that orbit the beam like planets',
});

const buildLedgerEntry = (id: WorldId): WorldLedgerEntry =>
  Object.freeze({
    worldId: id,
    family: WORLD_FAMILY[id],
    phenomenon: PHENOMENON[id],
    status: WORLD_REGISTRY[id].status,
    budgets: DEFAULT_BUDGET,
    fidelityTiers: ALL_TIERS,
    sanctionedColorways: [],
    antiCheese: Object.freeze({
      noCreatures: true,
      noClipartGradient: true,
      noPhenomenonDup: true,
      noChromeTint: true,
    }),
    measured: null,
    waivers: [],
  });

/** Exhaustive over WorldId — the completeness guarantee CI layer-1 leans on. */
export const WORLD_LEDGER: Readonly<Record<WorldId, WorldLedgerEntry>> = Object.freeze(
  Object.fromEntries(WORLD_IDS.map((id) => [id, buildLedgerEntry(id)])) as Record<
    WorldId,
    WorldLedgerEntry
  >,
);

export const worldLedgerEntry = (id: WorldId): WorldLedgerEntry => WORLD_LEDGER[id];
