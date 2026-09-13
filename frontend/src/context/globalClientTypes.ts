/**
 * ============================================================================
 * FILE: globalClientTypes.ts
 * PURPOSE: The public shapes of the existing GlobalClientProvider.
 * ============================================================================
 * Extracted from GlobalClientContext.tsx (Rule 4 cap). Pure type declarations
 * only — no runtime values, so the whole module is erased at build time.
 * GlobalClientContext.tsx re-exports both, so every existing import path keeps
 * working unchanged.
 */
import type {
  ClientReferenceCommit,
  ClientReferenceOrigin,
  SelectionInterceptor,
} from './globalClientPin';

export interface ActiveClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  bodyMapHeadPhoto?: string;
  gender?: string;
  role?: string;
  availableSessions?: number;
  clientSource?: 'swanstudios' | 'move_fitness' | 'external';
  membershipLevel?: 'basic' | 'premium' | 'elite';
  totalWorkouts?: number;
  lastWorkoutDate?: string;
  nextSessionDate?: string;
}

export interface GlobalClientContextType {
  activeClient: ActiveClient | null;
  setActiveClient: (client: ActiveClient | null) => void;
  clearActiveClient: () => void;
  clientList: ActiveClient[];
  loadingClients: boolean;
  refreshClients: () => Promise<void>;
  /**
   * Plan 55 §3 C1 / §4 — the ID-only selection reference. `pinnedClientId` is
   * the currently exposed reference (null for an unusable or retired actor);
   * `activeClient` above stays null until a CURRENT roster row exists, so no
   * blank name/email object is ever manufactured from a bare id.
   */
  pinnedClientId: number | null;
  referenceOrigin: ClientReferenceOrigin | null;
  /** Monotonic per actor epoch. Stale setters and stale commits are refused. */
  actorGeneration: number;
  /** The adapter's validated, one-use commit port. Bypasses its own interceptor. */
  commitClientReference: (commit: ClientReferenceCommit) => boolean;
  /** At most ONE live interceptor. Returns a remover that only detaches its own. */
  registerSelectionInterceptor: (interceptor: SelectionInterceptor) => () => void;
}
