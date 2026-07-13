/**
 * FILE: surfaceManifests.ts (Swan adapter, Recipe v2)
 * PURPOSE: Per-surface capability manifests for the Lane-1 Lens rollout.
 * Each production surface publishes what it can wear; the compiler stays
 * fail-closed against these. The shared slot/template vocabulary matches
 * labRecipes.ts so the shipped Golden Pair recipes compile against every
 * rollout surface; per-surface divergence is expressed as an explicit
 * override when it actually appears — never by copy-pasting the base.
 * LAW: set-row grids, critical actions, and write paths are HOST-FIXED —
 * manifests never expose them as lens-controllable slots.
 * chart.progress is intentionally ABSENT from both manifests: neither
 * surface has a chart slot yet, so recipes carrying an optional chart
 * degrade cleanly instead of failing.
 */
import { CONTAINER_PROFILES } from '../../../core/style-lens-os/v2/recipeV2';
import type { SurfaceCapabilityManifest } from '../../../core/style-lens-os/v2/capability-manifest.schema';

const SWAN_SURFACE_SLOTS: SurfaceCapabilityManifest['slots'] = {
  'text.display': { required: false, supportedVariants: ['rounded-athletic', 'compact-technical-mono', 'vaulted-editorial'] },
  'text.body': { required: false, supportedVariants: ['soft-sans', 'terminal-mono'] },
  'surface.card': { required: true, supportedVariants: ['floating-candy', 'faceted-console'] },
  'collection.exercise': { required: true, supportedVariants: ['arcade-cards', 'command-rows'] },
  'action.primary': { required: true, supportedVariants: ['glass-dock', 'command-rail'] },
};

const SWAN_SURFACE_TEMPLATES: SurfaceCapabilityManifest['templates'] = {
  'playfield-stack': { supportedProfiles: CONTAINER_PROFILES },
  'operator-grid': { supportedProfiles: ['tablet', 'desktop-enhanced'] },
};

/**
 * Workout Logger (canonical id: log-workout — client, trainer, Client Hub,
 * and admin-personal mounts all render the same shared WorkoutLogger).
 */
export const WORKOUT_LOGGER_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'log-workout',
  hostId: 'workout-logger',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: SWAN_SURFACE_SLOTS,
  templates: SWAN_SURFACE_TEMPLATES,
};

/** Workout Planner (canonical id: workout-planner — admin + trainer mounts). */
export const WORKOUT_PLANNER_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'workout-planner',
  hostId: 'workout-planner',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: SWAN_SURFACE_SLOTS,
  templates: SWAN_SURFACE_TEMPLATES,
};
