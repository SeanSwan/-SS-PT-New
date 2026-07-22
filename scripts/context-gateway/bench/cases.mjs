/**
 * cases.mjs — the historical retrieval benchmark (Phase 0 §4) as executable data.
 * ================================================================================
 * Each case = a question the gateway will really be asked + the evidence a competent
 * engineer NEEDED for that incident. `required` / `requiredTests` are case-insensitive
 * substrings matched against evidence paths in the compiled packet. Ground-truth paths
 * were verified tracked on origin/main @ eb4bbdd63 (2026-07-21); the harness re-verifies
 * every matcher against the tracked universe and reports INVALID (fixture drift) rather
 * than scoring a case whose ground truth no longer exists.
 *
 * `kind: 'retrieval'` scores recall. `kind: 'policy'` asserts a behavior (authority win,
 * freshness rejection, egress ceiling); policy cases not yet mechanizable in a dry-run
 * carry `deferred` with the phase that will activate them — visible, never silently skipped.
 *
 * @module context-gateway/bench/cases
 */

export const CASES = [
  { id: 1, kind: 'retrieval', name: 'gummy scroll', question: 'Scrolling feels gummy app-wide, the body seems to be the scroller — where is the unscoped height 100% global CSS?', required: ['frontend/src/index.css', 'GlobalStyle'], requiredTests: [] },
  { id: 2, kind: 'retrieval', name: 'trainer-permission schema drift', question: 'Trainer assignment endpoints return 403/500 — check TrainerPermissions field mappings against the real DB columns', required: ['backend/models/TrainerPermissions.mjs'], requiredTests: [] },
  { id: 3, kind: 'retrieval', name: 'client list empty', question: 'MyClientsView renders an empty client list — the assignment filter may use the wrong field', required: ['MyClientsView'], requiredTests: [] },
  { id: 4, kind: 'retrieval', name: 'styled-components #12', question: 'Admin dashboard crashes at mount with styled-components error #12 — check AdminOverviewPanel animation composition', required: ['AdminOverviewPanel'], requiredTests: ['AdminOverviewPanel.'] },
  { id: 5, kind: 'retrieval', name: 'render boot crash', question: 'Render crash-loops with ERR_MODULE_NOT_FOUND after deploy — which pre-push backend audit commands catch untracked module drift?', required: ['BUILD-HARDENING'], requiredTests: [] },
  { id: 6, kind: 'retrieval', name: 'express params reset', question: 'chartDataController reads an empty userId — clientAnalyticsRoutes sets req.params in router.use and Express resets it', required: ['backend/routes/clientAnalyticsRoutes.mjs', 'backend/controllers/chartDataController.mjs'], requiredTests: [] },
  { id: 7, kind: 'retrieval', name: 'workout route shadowing', question: 'Which handler actually serves /api/workout/sessions — check mount order for overlapping workout route files', required: ['workoutSessionRoutes|workoutRoutes|server.mjs|app.mjs'], requiredTests: [] },
  { id: 8, kind: 'retrieval', name: 'cart 404', question: 'POST /api/cart/add returns 404 in production — find the cart route mount', required: ['cartRoutes|cartHelpers'], requiredTests: [] },
  { id: 9, kind: 'retrieval', name: 'credential remediation', question: 'Did we ever leak credentials into a handoff doc and what was the remediation?', required: ['SECURITY-REMEDIATION'], requiredTests: [] },
  { id: 10, kind: 'retrieval', name: 'consult-gemini argv', question: 'consult-gemini reviewed the wrong content — the --review --file argument parser fed the flag as the document', required: ['scripts/consult-gemini.mjs'], requiredTests: ['consult-gemini.parseArgs'] },
  { id: 12, kind: 'retrieval', name: 'wrong-client draft', question: 'Coach composer draft appears under the wrong client — check coachDraftKey scoping in useCoachComposerDraft', required: ['useCoachComposerDraft.ts'], requiredTests: ['actorScope|useCoachComposerDraft.test'] },
  { id: 13, kind: 'retrieval', name: 'console skin leak', question: 'The aurora console skin leaks outside the console surface — how is data-console-root scoped and where does the token bridge mount?', required: ['data-console-root|ConsoleAtmosphere'], requiredTests: [] },
  { id: 14, kind: 'retrieval', name: 'point self-award', question: 'Can a user grant themselves gamification points — where is the award endpoint authorization?', required: ['gamification'], requiredTests: [] },
  { id: 15, kind: 'retrieval', name: 'ACH double-grant', question: 'Sessions were granted twice on an ACH payment — check webhook idempotency for session grants', required: ['webhook|sessionAllocation|paymentEvent'], requiredTests: [] },
  { id: 16, kind: 'retrieval', name: 'trainer isolation', question: 'A trainer can see other trainers clients — where are assignment-scoped trainer queries enforced?', required: ['authMiddleware|ClientTrainerAssignment|trainerPermission'], requiredTests: [] },
  { id: 17, kind: 'retrieval', name: 'PII in logs', question: 'Client emails are appearing in production logs — where is PII sanitization applied to logging?', required: ['piiSanitization|piiSafeLogging'], requiredTests: ['pii'] },
  { id: 18, kind: 'retrieval', name: 'dual Users table', question: 'Insert fails with an FK violation referencing the users table — we have dual users/Users tables, which must FKs reference?', required: ['migrations'], requiredTests: [] },
  { id: 19, kind: 'retrieval', name: 'storefront prices', question: 'What are the canonical storefront training package prices and where are they seeded?', required: ['seed-storefront'], requiredTests: [] },
  { id: 20, kind: 'retrieval', name: 'tsc OOM lying gate', question: 'The frontend type-check "passed" but tsc never actually ran to completion — the tsc OOM lying gate from the coach command center rebuild', required: ['NEXT-CHAT-PROMPT-coach-command-center|W3|tsc'], requiredTests: [] },
  { id: 21, kind: 'retrieval', name: 'catalog regen', question: 'How is the Rule 72 catalog regenerated deterministically and what makes a row stale?', required: ['scripts/catalog-regen.mjs'], requiredTests: [] },

  // --- policy cases ---
  { id: 22, kind: 'policy', name: 'authority: REALITY beats registry', question: 'Is the Obsidian or Graphify infrastructure actually implemented and live?', policy: 'authorityWin', mustInclude: ['docs/brain/REALITY.md'], mustRankBelowOrExclude: ['SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY'] },
  { id: 23, kind: 'policy', name: 'freshness: stale row rejected', policy: 'unitCovered', deferred: 'covered by authority.test (stale sha voids status); end-to-end fixture activates with the receipt-writer slice' },
  { id: 24, kind: 'policy', name: 'egress: Kimi sensitivity ceiling', policy: 'deferred', deferred: 'Phase 2 provider adapters — ceiling enforcement is an adapter-compile concern' },
];

/** Release-gate thresholds (Phase 0 §release-gates). */
export const GATES = { surfaceRecall: 0.9, testRecall: 0.85 };
