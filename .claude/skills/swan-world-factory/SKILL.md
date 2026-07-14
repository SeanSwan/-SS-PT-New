---
name: swan-world-factory
description: Manual-only batch orchestrator for generating and hostile-reviewing licensed M4 Swan World Engine experiments. Use only when Sean explicitly asks for a multi-world run, gallery, or proof batch. Writes ignored experiment artifacts and never promotes output into production.
---

# Swan World Factory

## Role and authority

This skill is a thin, manual-only batch orchestrator. It creates multiple complete, independent M4 experience experiments from the Swan World Engine, asks each experiment to critique and repair itself three times, verifies the outputs in a real browser, and builds a review gallery.

It does not invent a second site generator. Each single-site worker delegates composition law to:

- `docs/ai-workflow/design-brain/adapters/cinematic-site-generator.md`
- `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`
- `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`

The operator registry classifies this skill as T1 planning and T2 bounded internal writes. It cannot publish, deploy, merge, send externally, spend paid AI Village budget, or edit production code.

## Activation gate

Run only when Sean explicitly initiates a World Factory batch. The request must establish:

- purpose and audience;
- requested count `N`;
- deterministic seed or permission to generate and record one;
- time and asset budget;
- whether Law A Swan-native or Law B world-native non-Swan outputs are allowed;
- whether this is a proof run, concept gallery, campaign exploration, or approved implementation experiment.

If any missing value is low-risk, choose the conservative default and record it:

- proof run;
- `N = 5`;
- one eligible world per family;
- Law A only;
- free/local tools only;
- no external publication;
- no production promotion.

Paid Village, Fable API calls, external sends, production writes, and deployment remain separately approval-gated.

## Required reading

Read in this order:

1. `docs/ai-workflow/AI-HANDOFF/SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12.md`
2. `docs/ai-workflow/design-brain/worlds.md` metadata and suitability fields
3. the selected full world entries only
4. `docs/ai-workflow/design-brain/techniques.md` for selected WFX IDs
5. `docs/ai-workflow/design-brain/psychology.md` for selected PSY hypotheses
6. `docs/ai-workflow/design-brain/experience-mode.md`
7. `docs/ai-workflow/design-brain/qa-gates.md`
8. `docs/ai-workflow/design-brain/adapters/reviewers.md`
9. `docs/ai-workflow/design-brain/adapters/cinematic-site-generator.md`
10. `docs/ai-workflow/design-brain/external-reference-mcp.md` when its gate applies

Do not load every full world entry into every worker. Progressive disclosure is required.

## Filesystem boundary

All generated files live under:

`experiments/world-factory/YYYY-MM-DD/<run-id>/`

Before writing, run:

`git check-ignore -q experiments/world-factory/`

If the path is not ignored, stop. Do not generate until the exact ignore rule is approved and added. Never write factory output into `frontend/`, `backend/`, canonical design-brain docs, or a deployable static directory.

Permitted run contents:

- `run-manifest.json`
- `gallery/index.html`
- `gallery/gallery.css`
- `gallery/gallery.js`
- `sites/<site-id>/index.html`
- `sites/<site-id>/styles.css`
- `sites/<site-id>/experience.js`
- `sites/<site-id>/site-manifest.json`
- `sites/<site-id>/qa-report.json`
- local screenshots and traces under `qa/`

No secrets, customer data, private IDs, private infrastructure, generated credentials, or environment contents may enter a run.

## Deterministic selection

Selection is suitability-filtered before it is random. Every draw uses the exact `world-roulette.v1` algorithm and replay receipt in `worlds.md`; no worker may substitute a platform PRNG, locale sort, seed interpretation, or alternate tie-break.

1. Filter by host licence, audience, content density, emotional job, proof/action need, available assets, runtime budget, Palette Law, and accessibility constraints.
2. Reject any world whose anti-fit or anti-cheese constraints conflict with the assignment.
3. If a five-family proof is requested, require exactly one eligible world from each family.
4. Apply a seeded, documented selection only to the eligible set.
5. Record catalog version, eligible IDs, rejected IDs with reasons, seed, selection algorithm version, and chosen IDs.
6. If no world survives, use no world and report the mismatch. Never force spectacle.

## Worker contract

Use a worker pool no larger than `min(N, 3)`. Each worker owns at most one site directory at a time, may take another unowned site only after releasing the first, and never edits another worker's output; each manifest records its actual final author.

Each worker receives:

- one complete world entry;
- one audience and one primary action;
- one Palette Law;
- one M4 licence receipt;
- selected WFX contracts;
- selected PSY hypotheses with signals and falsifiers;
- B0-B3 renderer obligations;
- Full, Lean, Still, and Reduced Motion behavior;
- the single-site cinematic generator contract;
- the three-pass repair rubric below.

Each site must be a complete vertical slice, not a hero mockup. It needs a semantic story arc, one unique primary action that may repeat consistently, meaningful proof, a conclusion, and a working B0 experience without canvas.

## Required site manifest

Every site records:

- the run's predeclared `reviewPolicy` with exact schema `swan-world-factory.review-policy.v2`, canonical NFC stable IDs, approved independent reviewers, `workerAssignments`, and one distinct `browserQaWorker`; `authorship` exactly copies that policy core plus the site's assigned worker;

- run ID and site ID;
- world ID, family, catalog version, and content hash;
- selection seed and algorithm version;
- Palette Law and Swan-brand eligibility;
- M4 licence receipt;
- WFX IDs and maturity states;
- PSY hypotheses, expected signals, falsifiers, and ethical guardrails;
- B0, B1, B2, and B3 implementation status;
- Full, Lean, Still, and Reduced Motion status;
- primary action and proof artifact;
- asset provenance, font licences, trademark review, and generated-media notes;
- known constraints and honest omissions;
- three repair-pass results;
- browser matrix, successful-response inventory, raw field metrics, and hashed screenshot receipts inside the canonical browser-evidence artifact;
- independent reviewer identity, UTC review timestamp, findings, verdict, and the exact `reviewedArtifact` and `reviewedBrowserEvidence` receipts below;
- final verdict: PASS, REVISE, or BLOCKED.

## Artifact-bound independent review

An independent verdict is valid only for the exact material artifact the reviewer inspected. `independentReview.reviewedArtifact` is a deterministic object with:

- `algorithm: sha256-canonical-reviewed-artifact.v1`;
- `contentSha256`: SHA-256 of canonical JSON (UTF-8, sorted keys, compact separators) for the entire site manifest after the complete recursive runtime-build receipt is attached;
- `excludedFields: ["browser", "independentReview", "finalVerdict"]`, the only excluded fields, because browser currency and review state have their own fail-closed gates.

The runtime-build receipt inside that projection must hash every recursively referenced local HTML, CSS, JavaScript, image, font, shader, model, JSON, and other asset.
The reviewer records identity, UTC timestamp, findings, verdict, that exact receipt, and the current `reviewedBrowserEvidence`. PASS requires empty findings; REVISE or REJECT requires at least one non-empty finding.

The independent reviewer must be an approved stable ID from the predeclared `reviewPolicy`, differ from both the site's assigned worker and `browserQaWorker`, and never be invented after output exists. Site authorship must match `workerAssignments`.
The review timestamp must be at or after the current browser completion time and no later than the verifier's current UTC time.

Current browser evidence uses `sha256-canonical-site-browser-evidence.v1`; only the predeclared `browserQaWorker` may create or refresh it.
Its canonical hash includes that QA worker's stable ID/version, start and completion timestamps, exact matrix and flows, recursive tested bundle, successful response-body inventory, raw LCP/layout-shift entries, computed metrics, and every canonical screenshot receipt (relative path, SHA-256, bytes, decoded PNG dimensions).
Only the evidence artifact field itself is excluded. Browser QA must use a runner-owned ephemeral loopback server, prove each successful response body matches the allowlisted local bytes, reject redirects/off-origin traffic/errors, and exact-match the canonical screenshot set.
A decoy or remote server, missing raw metric, stale/extra screenshot, or summary-only claim is automatic REVISE.

Any material change to runtime bytes, recursive dependencies, world/catalog truth, palette, action, WFX/PSY selection, modes/backends, provenance, constraints, repair history, or site browser-evidence hash **automatically invalidates** the prior independent review.
Reset every review field to the canonical PENDING shape, including both reviewed receipts, then obtain a new independent verdict. Browser evidence remains separate from `reviewedArtifact`, but Final PASS requires exact equality with `reviewedBrowserEvidence`.

The fail-closed sequence is: the predeclared QA worker runs full real-browser QA while reviews are PENDING; independent inspection and stamps those exact site artifacts; that same QA worker runs one real-browser `gallery-only` finalizer against the promoted review summary.
The finalizer may update gallery evidence only and must preserve every site browser artifact byte-for-byte. `--sync-existing`, a manifest-only shortcut, or a builder-authored PASS cannot promote a run.

## Three hostile repair passes

The three named passes are the minimum cycle, never a terminal count. After independent review, every P0/P1 restarts the relevant repair and browser gates until none remain; only a genuine external, legal, licensing, or authority constraint may block recursion.

### Pass 1 — story, action, and psychology

Challenge:

- Is there a coherent four-act story instead of a visual pile?
- Is the primary action unmistakable and consistent?
- Does proof arrive before persuasion becomes empty?
- Is each PSY item an ethical, falsifiable hypothesis rather than a conversion claim?
- Does the page still make sense as semantic HTML with effects disabled?
- Does the anti-cheese line identify and remove the likely tacky failure?

Fix every REVISE finding before continuing.

### Pass 2 — accessibility, resilience, and performance

Challenge:

- Are keyboard order, landmarks, headings, labels, contrast, focus, and 44px targets correct?
- Is Pause Effects persistent and available without hunting?
- Does Reduced Motion remove non-essential motion without hiding meaning?
- Do Still mode and B0 keep the action and proof usable?
- Do renderer loss, context loss, asset failure, and device downgrade recover honestly?
- Are long tasks, draw calls, pixel budget, memory, and frame budget within `experience-mode.md`?
- Are Full, Lean, and Still manually selectable and persisted?

Fix every REVISE finding before continuing.

### Pass 3 — originality, restraint, and fidelity

Challenge:

- Would the page still be identifiable if its colors were removed?
- Is there exactly one dominant signature moment per section?
- Is the world specific, or merely schema-compliant and bland?
- Does any effect exist only to prove technical cleverness?
- Is the final result less powerful after subtraction? If not, subtract.
- Did Law A preserve Swan or Law B avoid falsely presenting itself as Swan?
- Does the build meet the gold-exemplar level in `worlds.md`?

Anything schema-compliant but bland is REVISE, not PASS.

## Browser verification

Every site must be opened in a real browser. At minimum verify:

- 320×800, 375×812, 414×896, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080, 2560×1440, 3440×1440, and 3840×2160 viewports;
- keyboard-only navigation;
- Reduced Motion;
- Full, Lean, and Still controls;
- Pause Effects persistence;
- forced backend-loss matrix: B3 unavailable/init/device loss → B2; B2 unavailable/WebGL context loss → B1/B0; worker failure; B1 image/video decode failure; and B0 with enhancement scripts disabled;
- JavaScript-disabled semantic poster, essential links/forms where applicable, and no canvas-owned meaning;
- no horizontal overflow;
- primary action operability;
- console errors and failed local assets;
- screenshot stability under the recorded seed and deterministic clock.
- every success-status request is allowlisted, response-body hashed, byte-counted,
  and bound to the corresponding recursively hashed local artifact;
- raw LCP entries and layout-shift entries are retained and recomputed, with
  finite nonnegative derived metrics;
- selected matrix/action/gallery PNGs exist, decode, match their recorded
  dimensions and hashes, and exactly match the canonical screenshot inventory.

Use the repository's existing browser tooling. Do not install a new framework just for the run.

The full matrix applies to every proof-run site. For later exploratory batches, every site gets the core matrix and finalists get the full matrix; the run manifest must state which policy was used.

## Gallery contract

The gallery is a local review surface, not a deployment.

Default filtering shows PASS only. A reviewer may explicitly reveal REVISE and BLOCKED entries. Each card shows:

- world and family;
- still preview;
- Palette Law and Swan-brand eligibility;
- primary action;
- WFX and PSY IDs;
- runtime backends and modes;
- browser verdict;
- repair history;
- known constraints;
- direct local link to the site and its manifest.

The gallery must not hide failures or convert missing checks into green badges.

## Completion gate

A run is complete only when:

- every selected family requirement is satisfied;
- every site has all required files and receipts;
- every site completed at least three repair passes and repeated the relevant passes after every finding;
- the predeclared identity policy, assignments, authorship, QA-worker binding, and temporal ordering
  validate without post-hoc identities;
- an approved independent reviewer (neither site worker nor browser QA worker) reviewed manifests,
  current browser evidence, and all P0/P1 findings, then bound the verdict to
  exact current `reviewedArtifact` and `reviewedBrowserEvidence` receipts;
- every site passed the full owned-loopback browser run and retained raw metrics,
  response-body receipts, and hashed screenshots;
- the post-review gallery-only real-browser finalizer passed without changing any
  site evidence;
- no unresolved P0 or P1 finding remains;
- the gallery accurately reflects PASS, REVISE, and BLOCKED states;
- `git status` confirms all run output is ignored;
- no production file changed as a side effect.

A clean manifest is not permission to promote.

## Promotion prohibition

Factory output never moves itself into production. Promotion requires a separate task, new surface receipt, explicit Sean approval, product-owner review, legal/provenance review where applicable, and the normal test/deploy gates. Law B output cannot be promoted as Swan without a deliberate palette and brand re-licensing review.

## Stop conditions

Stop and report BLOCKED if:

- the output root is not ignored;
- source doctrine conflicts;
- an external reference gate is required but cannot be honestly receipted;
- the assignment would place live M4 on a product or Hermes operations surface;
- B0 cannot preserve meaning and action;
- a renderer or asset licence is unknown;
- a worker tries to edit outside its owned site directory;
- browser verification cannot be executed;
- an unresolved P0/P1 cannot be repaired because of a genuine external, legal, licensing, or authority constraint.

Never convert a stop condition into a silent downgrade.
