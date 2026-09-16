/**
 * playgroundTypes — the parked-surface contract, shared by the registry and its imports.
 * @module pages/DesignPlayground/playgroundTypes
 *
 * WHY THIS FILE EXISTS
 * `threeWorldEntries.ts` needs the `PlaygroundEntry` type, and
 * `playgroundRegistry.ts` needs the entries. Declaring the type in the registry
 * would make those two modules import each other — a cycle that Vite tolerates but
 * that breaks the moment either module runs top-level code. The type lives here so
 * both sides depend on a leaf module instead of on each other.
 */
import type { ComponentType } from 'react';

export type PlaygroundStatus = 'parked' | 'iterating' | 'approved';

export interface PlaygroundEntry {
  id: string;
  title: string;
  lazyImport: () => Promise<{ default: ComponentType }>;
  status: PlaygroundStatus;
  sourceRoute: string;
  mobbinRefs: string[];
  notes: string;
}
