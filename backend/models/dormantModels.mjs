/**
 * FILE: dormantModels.mjs
 * PURPOSE: The explicit, justified registry of model files that define a model
 * but are deliberately NOT wired into associations.mjs.
 * OWNER: SwanStudios QA.
 *
 * Same doctrine as the QA suppressions registry: leaving a model unregistered is
 * a choice, and the choice has to be written down and defended. Before this
 * existed, "unregistered" was indistinguishable from "forgotten" — which is how
 * RenewalAlert shipped a model, a migration, a service, a controller, mounted
 * routes and a cron tick, and still threw on every call because nothing
 * registered it.
 *
 * TWO LEGITIMATE REASONS ONLY:
 *   dormant  — no caller anywhere. Not yet wired, or awaiting Rule-34 quarantine.
 *   direct   — consumed by direct `import` rather than getModel(), and needs no
 *              Sequelize associations. NOTE this still bypasses the index.mjs
 *              rule ("All route files MUST import models from this index"), so
 *              it is technical debt being acknowledged, not endorsed.
 *
 * A model referenced by any `getModel('X')` call site may NEVER appear here.
 * getModel throws on an unknown key, so that combination is a guaranteed
 * runtime failure and the drift test refuses to let it be acknowledged away.
 */

export const DORMANT_MODELS = [
  // --- No caller anywhere. Candidates for the Rule-34 quarantine pass. ---
  { name: 'AcquisitionEvent', kind: 'dormant', reason: 'No caller in routes/controllers/services. Funnel telemetry writes through acquisitionTelemetry service tables instead.' },
  { name: 'CommunicationDraft', kind: 'dormant', reason: 'No caller. Drafting surface was never wired; awaiting Rule-34 disposition with access-log evidence.' },
  { name: 'HermesTask', kind: 'dormant', reason: 'No caller. Hermes task queue is file/inbox-based today; the model predates that decision.' },
  { name: 'PageView', kind: 'dormant', reason: 'No caller. Pageview counting goes through the pageViewCache service, not this model.' },
  { name: 'ProgressReport', kind: 'dormant', reason: 'No caller. Progress reporting is served from workout/session analytics rather than a stored report row.' },
  { name: 'Subscriber', kind: 'dormant', reason: 'No caller. Marketing list membership lives on the Lead model; this predates it.' },
  { name: 'WorkoutTemplate', kind: 'dormant', reason: 'No caller. Templates are served by the training-plan chain, not this model.' },

  // --- Consumed by direct import; no associations required. ---
  { name: 'AuthIdentity', kind: 'direct', reason: 'Direct import in services/auth/federatedAccountService.mjs; federated identity rows are queried standalone.' },
  { name: 'Badge', kind: 'direct', reason: 'Direct import in controllers/adminBadgeController.mjs; badge CRUD needs no association graph.' },
  { name: 'BodyMapEvidence', kind: 'direct', reason: 'Direct import in controllers/bodyMapEvidenceController.mjs; evidence rows are read by explicit id.' },
  { name: 'CustomPackage', kind: 'direct', reason: 'Direct import in services/sessionPackageCheckoutFulfillmentService.mjs during checkout fulfilment.' },
  { name: 'MagicLoginToken', kind: 'direct', reason: 'Direct import in services/auth/magicLinkService.mjs; tokens are looked up by value, never joined.' },
  { name: 'MediaAsset', kind: 'direct', reason: 'Direct import in services/videoRenderJobService.mjs alongside VideoRenderJob.' },
  { name: 'NutritionLogRevision', kind: 'direct', reason: 'Direct import in services/nutrition/nutritionLogRevisionService.mjs; revision history is append-only.' },
  { name: 'NutritionSourceRecord', kind: 'direct', reason: 'Direct import in services/nutrition/reviewedNutritionDraftService.mjs.' },
  { name: 'NutritionTarget', kind: 'direct', reason: 'Direct import in routes/clientNutritionRoutes.mjs and services/nutrition/nutritionTargetService.mjs.' },
  { name: 'SmsSuppression', kind: 'direct', reason: 'Direct import in services/smsSuppressionService.mjs; suppression list is queried by phone value.' },
  { name: 'TaxConfig', kind: 'direct', reason: 'Direct import in utils/taxCalculator.mjs; single-row config lookup.' },
  { name: 'UserAppearanceProfile', kind: 'direct', reason: 'Direct import in controllers/appearanceProfileController.mjs; keyed by userId, no join needed.' },
  { name: 'UserDietaryIdentity', kind: 'direct', reason: 'Direct import in services/nutrition/dietaryIdentityService.mjs.' },
  { name: 'UserFeatureFlag', kind: 'direct', reason: 'Direct import in controllers/challengeSubmissionController.mjs for per-user gating.' },
  { name: 'VideoRenderJob', kind: 'direct', reason: 'Direct import in services/videoRenderJobService.mjs; job rows are polled by id.' },
];

export const DORMANT_MODEL_NAMES = new Set(DORMANT_MODELS.map((entry) => entry.name));

export default DORMANT_MODELS;
