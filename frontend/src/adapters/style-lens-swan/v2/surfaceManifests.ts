/**
 * FILE: surfaceManifests.ts (Swan adapter, Recipe v2)
 * PURPOSE: Per-surface capability manifests for the Lane-1 Lens rollout.
 * Each production surface publishes what it can wear; the compiler stays
 * fail-closed against these. Variant vocabulary matches labRecipes.ts so
 * the shipped Golden Pair recipes compile against every rollout surface.
 * LAW: set-row grids, critical actions, and write paths are HOST-FIXED —
 * manifests never expose them as lens-controllable slots.
 */
import type { SurfaceCapabilityManifest } from '../../../core/style-lens-os/v2/capability-manifest.schema';

const ALL_PROFILES = ['mobile-minimal', 'tablet', 'desktop-enhanced'] as const;

/**
 * Workout Logger (canonical id: log-workout — client, trainer, Client Hub,
 * and admin-personal mounts all render the same shared WorkoutLogger).
 * chart.progress is intentionally ABSENT: the logger has no chart slot, so
 * recipes carrying an optional chart degrade cleanly instead of failing.
 */
export const WORKOUT_LOGGER_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'log-workout',
  hostId: 'workout-logger',
  version: '1.0.0',
  profiles: ALL_PROFILES,
  slots: {
    'text.display': { required: false, supportedVariants: ['rounded-athletic', 'compact-technical-mono', 'vaulted-editorial'] },
    'text.body': { required: false, supportedVariants: ['soft-sans', 'terminal-mono'] },
    'surface.card': { required: true, supportedVariants: ['floating-candy', 'faceted-console'] },
    'collection.exercise': { required: true, supportedVariants: ['arcade-cards', 'command-rows'] },
    'action.primary': { required: true, supportedVariants: ['glass-dock', 'command-rail'] },
  },
  templates: {
    'playfield-stack': { supportedProfiles: ALL_PROFILES },
    'operator-grid': { supportedProfiles: ['tablet', 'desktop-enhanced'] },
  },
};

/**
 * Workout Planner (canonical id: workout-planner — admin + trainer mounts).
 * Same host-fixed law: generation/save/PDF actions and panel wiring stay
 * host-owned; lenses restyle presentation only.
 */
export const WORKOUT_PLANNER_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'workout-planner',
  hostId: 'workout-planner',
  version: '1.0.0',
  profiles: ALL_PROFILES,
  slots: {
    'text.display': { required: false, supportedVariants: ['rounded-athletic', 'compact-technical-mono', 'vaulted-editorial'] },
    'text.body': { required: false, supportedVariants: ['soft-sans', 'terminal-mono'] },
    'surface.card': { required: true, supportedVariants: ['floating-candy', 'faceted-console'] },
    'collection.exercise': { required: true, supportedVariants: ['arcade-cards', 'command-rows'] },
    'action.primary': { required: true, supportedVariants: ['glass-dock', 'command-rail'] },
  },
  templates: {
    'playfield-stack': { supportedProfiles: ALL_PROFILES },
    'operator-grid': { supportedProfiles: ['tablet', 'desktop-enhanced'] },
  },
};
