/**
 * slots.tsx — S19 (JARVIS blueprint §5.4). The slot contract every Planner
 * Lens receives. Lenses arrange these; they NEVER fetch (L1), never declare
 * writes, and never change scope/endpoint/duration/category (L6). The
 * SafetyGateModal and SaveBar mount OUTSIDE the lens region in the layout,
 * so the 409 ack-retry flow (L2) and the 7-state save matrix (L3) are
 * IDENTICAL across all lenses by construction — a lens cannot even reach
 * them to diverge.
 */
import type React from 'react';

export interface PlannerLensSlots {
  /** Exercise Rolodex panel — must be reachable in ≤1 interaction (L4). */
  rolodex: React.ReactNode;
  /** The builder panel (rows, generated plan, guided candidates). */
  builder: React.ReactNode;
  /** Teach-mode sidebar — null when teach mode is off. */
  teach: React.ReactNode;
  /** Coach dock — false/null for client self-planner viewers (R1). */
  coachDock: React.ReactNode;
  /** True while the teach sidebar is open (affects grid columns). */
  teachModeOpen: boolean;
}

export type PlannerLensComponent = React.FC<PlannerLensSlots>;
