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
import {
  actionVariants,
  bodyVariants,
  buildTemplateManifest,
  chartVariants,
  collectionVariants,
  displayVariants,
  surfaceVariants,
} from '../worlds/variantVocabulary';

// Vocabulary is the single source of truth (variantVocabulary.ts, Slice W0): the
// surface slots draw the SAME variant lists as the Lab host so the Golden Pair —
// and every future world — compiles against every rollout surface. chart.progress
// stays ABSENT here (surfaces without a chart slot degrade it cleanly); only
// CLIENT_PROGRESS_MANIFEST below publishes a chart slot.
const SWAN_SURFACE_SLOTS: SurfaceCapabilityManifest['slots'] = {
  'text.display': { required: false, supportedVariants: displayVariants() },
  'text.body': { required: false, supportedVariants: bodyVariants() },
  'surface.card': { required: true, supportedVariants: surfaceVariants() },
  'collection.exercise': { required: true, supportedVariants: collectionVariants() },
  'action.primary': { required: true, supportedVariants: actionVariants() },
};

const SWAN_SURFACE_TEMPLATES: SurfaceCapabilityManifest['templates'] = buildTemplateManifest();

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

/** Universal Master Schedule (admin master-schedule + trainer/client schedule mounts). */
export const MASTER_SCHEDULE_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'master-schedule',
  hostId: 'universal-master-schedule',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: SWAN_SURFACE_SLOTS,
  templates: SWAN_SURFACE_TEMPLATES,
};

/** Clients & Team hub (admin client-management + trainer clients mounts). */
export const CLIENTS_WORKSPACE_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'clients-team',
  hostId: 'clients-workspace',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: SWAN_SURFACE_SLOTS,
  templates: SWAN_SURFACE_TEMPLATES,
};

/** Bootcamp Creator (admin + trainer bootcamp mounts). */
export const BOOTCAMP_BUILDER_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'bootcamp-creator',
  hostId: 'bootcamp-builder',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: SWAN_SURFACE_SLOTS,
  templates: SWAN_SURFACE_TEMPLATES,
};

/**
 * Client progress dashboard (/dashboard/client/progress). Adds the
 * chart.progress slot — the Golden Pair's chart variants become REAL here
 * (the canonical grid is the first chart-bearing host).
 */
export const CLIENT_PROGRESS_MANIFEST: SurfaceCapabilityManifest = {
  surfaceId: 'client-progress',
  hostId: 'client-progress-dashboard',
  version: '1.0.0',
  profiles: CONTAINER_PROFILES,
  slots: {
    ...SWAN_SURFACE_SLOTS,
    'chart.progress': { required: false, supportedVariants: chartVariants() },
  },
  templates: SWAN_SURFACE_TEMPLATES,
};
