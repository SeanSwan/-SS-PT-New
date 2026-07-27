# Swan Design Brain Visual Ledger Upgrade - Historical Build Plan
> **SUPERSEDED / NON-OPERATIONAL (2026-07-26):** This pre-hardening plan is retained as review history only. Its P/I/S/D/X, H/T/L, Mobbin-informed SDIR, source-reference, and Mode L instructions MUST NOT be executed. The active contract is `docs/ai-workflow/design-brain/external-reference-mcp.md`: P/S/D/X only, Inspect and legacy aliases refused, Spec disabled and task-local, no durable Mobbin-informed output, and X blocked.
**Date:** 2026-07-25
**Status:** Fable `LOCK-WITH-CHANGES`; golden visual fixture approval pending
**Branch:** `codex/mobbin-protocol-v3-20260725`
**Owner:** Sean
**Builder:** Codex
**Review chain:** Kimi visual attack → Fable final ruling → Sean golden-fixture approval → TDD implementation → hostile verification

## 1. Goal and Success Contract

Upgrade the shipped `scripts/design-brain` MVE from text-only recall into a multimodal, outcome-calibrated learning ledger without storing Mobbin image bytes, copying source layouts, auto-promoting doctrine, or reviving the superseded 47-file engine.
The slice succeeds only when:
1. an agent can attach one validated Swan-owned visual specification to a real claim;
2. the engine deterministically renders that specification as an accessible SVG pattern card;
3. proposed and trial claims can show draft cards in the adjudication packet;
4. accepted claims emit their Swan-owned SVG cards beside recall-tier vault documents;
5. source screenshot bytes, image URLs, HTML, embedded SVG, connector URLs, and nested aliases are refused;
6. a verified Swan implementation trial is required for `doctrine-ready=true`;
7. every card conforms to one authored Crystalline visual composition and a machine-checked contrast contract;
8. the generated index is a visual contact sheet, not a flat list of text links;
9. no script can promote a claim into canon;
10. every new behavior is proven by a test that failed before implementation.

## 2. Governing Decisions

- **Visuals explain; they never corroborate.** Product-count confidence remains derived only from independent shipped products.
- **One card per claim, append-authoritative revisions.** `visual-cards.jsonl` folds to the latest `rev` per `claimId`; prior revisions remain auditable.
- **Claim lifecycle controls card visibility.** Proposed, trial, and accepted cards appear in active views; rejected and merged cards remain in the ledger but are excluded from the active index.
- **Mobbin evidence is reference-only.** Store product, surface, platform, observation date, and a bounded lookup hint. Store no screenshot bytes, image URL, deep link, HTML, or copied page text.
- **Mobbin Mode L is paused.** H/T research may inform the current task, but no Mobbin-derived corpus receipt is appended until the explicit terms-clearance artifact in `external-reference-mcp.md` exists. This visual-ledger design may be built and tested with synthetic/non-Mobbin fixtures while that gate remains closed.
- **No licensed-image archive in this slice.** The capability remains prohibited until Sean records written Mobbin permission or a governing agreement. A warning overlay cannot substitute for permission.
- **Trial gate, not auto-canon.** A passing trial makes an accepted claim eligible for a separate human doctrine review. It does not edit `config/doctrine.md` or any Design Brain canon file.
- **Deterministic SVG first.** No stochastic image generation, browser dependency, external font, remote asset, or new package. Richer artwork is a later earned slice.
- **Recall remains useful before doctrine readiness.** Accepted claims may still emit to the vault, but their document states `DOCTRINE READY: no` until the trial gate passes.
- **One authored visual composition.** The builder does not improvise card layout, color, or hierarchy.
- **Non-interactive artifact.** Cards contain no links, controls, scripts, animation, `style` block/attribute, `foreignObject`, or remote resource.
- **One visual identity per claim.** Folding refuses two distinct `visualId` values for one `claimId`; revisions increment the same identity.
- **Newest trial controls readiness.** The newest appended trial receipt controls readiness; a newer mixed, fail, revise, or reject receipt makes readiness false even when an older passing receipt was approved.
- **Sean's verdict is explicit, not inferred.** `seanTasteVerdict` remains the single approval field, but agents may not infer or author Sean's verdict. A trial draft waits for Sean's direct adjudication before append; no second approval channel is added.
- **Claim provenance controls corroboration.** The two-product test reads `claim.products`, never visual-card `sourceReferences`.
- **Identity fields are non-human.** `createdBy` and `verifiedBy` accept only `^(agent|role):[a-z0-9][a-z0-9._-]{2,63}$`, never personal names.

### 2.1 Crystalline visual-card contract

Every full evidence SVG uses `viewBox="0 0 1200 900"`, `preserveAspectRatio="xMidYMid meet"`, and the relative pair `width="100vw"` / `height="75vw"`; it omits fixed pixel dimensions. The full card is not legible evidence below 960 CSS pixels. A contact-sheet consumer must pair its preview with a substantive text summary and an **open full-size card** link; at phone widths the summary carries the readable content, so a scaled thumbnail is never the sole evidence surface.
1. **Card surface:** an opaque Obsidian/Graphite frame that guarantees contrast regardless of the viewer background.
2. **Header zone (top 110):** direction name, claim/visual IDs, lifecycle badge, and external-versus-Swan confidence labels.
3. **Hierarchy ladder (left upper):** levels are rendered as visibly different bar widths and type sizes. The card must demonstrate hierarchy, not describe it as bullets.
4. **Evidence/translation rail (right upper):** emotional goal, cross-product count, Swan transformations, rejected source-specific details, and the crystalline signature mark.
5. **State strip (middle):** ordered state cells with compact behavior summaries.
6. **Responsive mini-frame grid (lower):** all eight house widths—320, 375, 414, 768, 1024, 1440, 2560, 3840—rendered as labeled miniature frames with their behavior cue.
7. **Motion notation:** a static arrow/phase notation plus reduced-motion replacement text. No SVG/CSS/SMIL animation.
8. **Signature:** one abstract crystalline record-facet seam. Kimi's suggested literal swan geometry is rejected under LAW 4 (optics, not creatures).
The sole raw-color source for renderer source modules is `visual-tokens.mjs`; all other renderer modules import named values. Generated and fixture SVGs may contain only allowlisted token values exported by that module, including the canonical danger accent for error semantics. Primary text/background pairs must be at least 4.5:1; non-text structural boundaries at least 3:1. Minimum body size in the 1200-unit viewBox is 18; headings are 24 or larger. The renderer emits `<title>`, `<desc>`, `role="img"`, and deterministic reading order.

## 3. Data Contracts

### 3.1 `visual-card/1`

Stored in `visual-cards.jsonl` as a full append-authoritative record:
- `schemaVersion`: exactly `visual-card/1`
- `visualId`: engine-derived `VIS-<claim suffix>`
- `claimId`: existing proposed/adjudicated `CLM-*`
- `rev`: positive integer, engine-managed
- `directionName`: 3–80 characters
- `emotionalGoal`: 15–180 characters
- `hierarchy`: 2–6 ordered items `{ level, label, purpose }`
- `states`: exactly five ordered `{ name, behavior }` items: `DEFAULT → LOADING → EMPTY → SUCCESS → ERROR`; each behavior is 3–80 characters
- `responsive`: exactly eight ordered `{ width, behavior }` entries for 320, 375, 414, 768, 1024, 1440, 2560, 3840; widths are unique and each behavior is 3–80 characters
- `motion`: `{ intent, reducedMotion }`
- `accessibility`: 1–8 substantive strings
- `swanTranslation`: `{ cPatterns, tokens, signatureMoment, antiCopyNotes }`
- `originality`: structured arrays:
  - `convergedPrinciples`: 1–6 abstract principles;
  - `swanTransformations`: 2–6 ways the card changes external conventions into Swan grammar;
  - `rejectedSourceSpecifics`: 1–6 source-specific layout/copy/asset choices that must not be reproduced;
- `sourceReferences`: 1–8 `{ provider, product, refType, surface, platform, observedAtUtc, lookupHint }`;
  - `refType`: `screen | flow | section`;
  - `lookupHint`: at most 120 characters;
- `createdBy`: `agent:<id> | role:<id>`; exact pattern `^(agent|role):[a-z0-9][a-z0-9._-]{2,63}$`;
- `createdUtc`, `updatedUtc`
The input draft omits engine-owned `visualId`, `rev`, and `updatedUtc`.

### 3.2 `trial-receipt/1`

Stored append-only in `trial-receipts.jsonl`:
- `schemaVersion`: exactly `trial-receipt/1`
- `trialId`: unique `TRL-*`
- `claimId`: existing accepted or trial claim
- `surface`: named Swan surface; no PII or client identifiers
- `hypothesis`: what the pattern was expected to improve
- `outcome`: `pass | mixed | fail`
- `responsive`: `pass | fail`
- `accessibility`: `pass | fail`
- `hostileReview`: `pass | fail`
- `seanTasteVerdict`: `approve | revise | reject`
- `observations`: substantive, PII-free result
- `verifiedBy`: `agent:<id> | role:<id>`; same exact identity pattern as `createdBy`
- `verifiedUtc`
`doctrine-ready=true` requires: accepted claim; at least two independent products from `claim.products`; and the newest appended trial has `outcome: pass`, every trial gate passing, and Sean-provided `seanTasteVerdict: approve`; complete originality; and zero unresolved claim contradictions. Append order, not `verifiedUtc`, is authoritative; duplicate `trialId` values are refused.

### 3.3 Universal refusal law

All nested objects and arrays are scanned case-insensitively after key normalization. Any key stem containing `img`, `image`, `screenshot`, `src`, `href`, `url`, `html`, `base64`, `data`, or `thumb` is refused. Any string over 500 characters or base64-alphabet run over 200 characters is refused. Visual and trial fields also refuse PII, credential-like material, and the banned product-language lexicon (`yoga`, `meditation`, and the credential claim formed by `NASM` + `-certified`). Tests construct the credential phrase from fragments so the forbidden source literal is never introduced.

## 4. Files and Functions

### New

1. `scripts/design-brain/schemas/visual-card.schema.json`
   - documented `visual-card/1` contract;
   - `additionalProperties:false`;
   - exact role/agent identity pattern;
   - exact five-state and eight-width tuple contracts;
   - bounded `refType` enum and `lookupHint`.
2. `scripts/design-brain/schemas/trial-receipt.schema.json`
   - documented `trial-receipt/1` contract;
   - no inferred owner verdict and no duplicate `trialId`.
3. `scripts/design-brain/src/refusal.mjs`
   - `scanRefusedContent(value)`
   - recursive normalized-key, payload-bound, PII-pattern, credential-pattern, and banned-lexicon refusal;
   - zero write, render, packet, or vault dependencies.
4. `scripts/design-brain/src/visual-contract.mjs`
   - `validateVisualDraft(draft)`
   - `visualIdForClaim(claimId)`
   - `upsertVisualCard(existing, draft, claim, nowIso)`
   - `loadVisualCards(path)`
   - shape validation in S1; refusal composition only after S1.5 is green.
5. `scripts/design-brain/src/trial-contract.mjs`
   - `validateTrialReceipt(receipt)`
   - `assessDoctrineReadiness(claim, trials)`
   - `latestTrialsByClaim(trials)`
   - readiness reads `claim.products` and the newest appended receipt only.
6. `scripts/design-brain/src/visual-tokens.mjs`
   - the only raw color values in renderer source modules;
   - token names and resolved fallbacks mirror `frontend/src/styles/tokens.css`, including RGB-composed canonical tokens;
   - exports an allowlist used to validate generated/fixture SVG literals;
   - exports named Crystalline values plus `contrastRatio`;
   - module-load assertions fail closed if required contrast drops below policy.
7. `scripts/design-brain/src/visual-card-svg.mjs`
   - `escapeXml(value)`
   - `renderVisualCardSvg(card, claim, readiness)`
   - renders the fixed zone grid from §2.1;
   - no network, links, `style`, `foreignObject`, animation, source pixels, or unescaped interpolation.
8. `scripts/design-brain/src/visual-index.mjs`
   - `renderVisualIndex(cards, claims, trials)`
   - emits lifecycle/domain groups with a readable text summary, preview, and open-full-size link;
   - below 960 CSS pixels, the text summary is authoritative and the preview is illustrative only;
   - rejected/merged cards remain auditable but disappear from the active sheet.
9. `scripts/design-brain/src/log-visual-card.mjs`
   - reads JSON from file/stdin;
   - validates draft;
   - refuses unknown claim IDs;
   - appends `rev+1` record;
   - regenerates `visuals/<visualId>.svg` and `VISUAL-INDEX.md`.
10. `scripts/design-brain/src/log-trial.mjs`
   - reads JSON from file/stdin;
   - validates receipt;
   - refuses an agent-inferred owner verdict and waits for direct Sean adjudication;
   - refuses duplicate `trialId` or ineligible claim lifecycle;
   - appends trial;
   - regenerates visual artifacts so readiness updates immediately.
11. `scripts/design-brain/tests/visual-ledger.test.mjs`
   - focused red/green acceptance suite using a fixed `nowIso`.
12. `scripts/design-brain/tests/fixtures/visual-card-golden.svg`
   - Sean-approved hand-authored composition contract and renderer-conformance fixture.

### Modified

M1. `scripts/design-brain/src/packet.mjs` — add `visual:`; at eight lines compact `exceptions:` to `exceptions: see claim ledger`, preserving header, principle, provenance, contradictions, visual, and `DECIDE`.
M2. `scripts/design-brain/src/emit-vault.mjs` — emit accepted-card assets and readiness reasons; never emit proposed/trial/rejected cards.
M3. `scripts/design-brain/src/adjudicate.mjs` — derive `visual` and `doctrine-ready`; do not change human-letter-only status behavior.
M4. `scripts/design-brain/README.md` — document commands/prohibitions and update test count after proof.
M5. `docs/ai-workflow/design-brain/external-reference-mcp.md` — make Mobbin images inspect-only and on-demand.
M6. `.claude/skills/swan-design-router/SKILL.md` — consult cards without treating them as evidence.
M7. `docs/ai-workflow/brainstorms/design-brain-visual-learning-ledger-2026-07-25.md` — record decisions and reviews.

## 5. TDD Sequence

### S0 — Golden fixture approval

Hand-author one synthetic `visual-card-golden.svg`, render it, and obtain Sean's explicit `approve` or revision. No GREEN implementation begins before approval.

### RED 0 — Renderer conformance

Prove the intended renderer API is absent, then pin:
- exact zone IDs and order;
- the hierarchy ladder uses different bar widths and type sizes;
- all eight responsive mini-frame labels exist;
- `<title>`, `<desc>`, `role="img"`, viewBox, relative `width="100vw"` / `height="75vw"`, and reading order exist;
- output omits fixed numeric height, scripts, links, `style`, `foreignObject`, `<image>`, `<animate>`, and `@keyframes`;
- the contact-sheet contract provides a substantive text summary and open-full-size link instead of relying on a scaled thumbnail below 960 CSS pixels;
- timestamps never appear in SVG output;
- renderer source raw colors exist only in `visual-tokens.mjs`; generated and fixture SVG literals are a subset of its exported allowlist; canonical token-name parity and contrast pass.

### RED 1 — Contract shape

Tests must fail because the modules do not exist, then prove:
- valid visual draft passes;
- source references accept only bounded lookup text and known enum values;
- role/agent identities match the exact pinned pattern;
- states are exactly `DEFAULT → LOADING → EMPTY → SUCCESS → ERROR`;
- responsive entries are exactly the eight ordered `{ width, behavior }` tuples;
- renderer escapes markup.

### GREEN 1

Implement schemas, shape-only `visual-contract.mjs`, `visual-tokens.mjs`, and the authored static SVG template. Do not implement recursive refusal inside this slice.

### S1.5 — Refusal backbone

This is an independent micro-slice. Nothing downstream builds until GREEN 1.5 passes.

### RED 1.5 — Recursive refusal scanner

Tests must fail because `refusal.mjs` does not exist, then prove:
- screenshot/image/imageUrl/src/url/connectorUrl/html/pageCopy keys fail after normalized-key scanning at every nesting depth;
- `data:image`, `<img`, `<svg`, remote URLs, strings over 500 characters, and base64-alphabet payloads over 200 characters fail;
- objects and arrays receive the same recursive checks;
- the lexicon gate refuses `yoga`, `meditation`, and the exact credential phrase constructed from `NASM` plus `-certified`;
- PII-pattern and credential-like values fail, including `createdBy` and `verifiedBy` misuse;
- the scanner returns every deterministic error and performs no write, render, packet, or vault action.

### GREEN 1.5

Implement `refusal.mjs` and compose it into `validateVisualDraft`. Export the same scanner for mandatory reuse by `validateTrialReceipt` in GREEN 3. Run the full refusal matrix independently; no append, rendering, packet, or vault integration is permitted in this slice.

### RED 2 — Append-authoritative visual identity

Prove:
- unknown claim refuses;
- first log creates `VIS-*`, `rev:1`;
- second log for the same claim appends `rev:2`;
- fold returns only rev 2 while preserving both ledger lines;
- fold refuses two visual IDs for one claim;
- same draft plus fixed `nowIso` renders byte-identical SVG;
- timestamps never render into SVG;
- source product names appear only as provenance text, never as copied visuals.

### GREEN 2

Implement visual logging, fold, deterministic SVG, and index generation.

### RED 3 — Trial accuracy gate

Prove:
- accepted claim without trial is not doctrine-ready;
- proposed claim cannot become doctrine-ready;
- mixed/fail trials do not qualify;
- the newest appended trial receipt controls readiness; an older pass cannot outrank a newer mixed/fail result;
- Sean-provided `seanTasteVerdict: approve` is required, and agents cannot infer that field;
- two-product confidence reads `claim.products`, not card references;
- unresolved contradiction blocks readiness;
- passing trial changes readiness only, never claim status or canon.

### GREEN 3

Implement trial validation, logging, and readiness calculation.

### RED 4 — Packet and vault integration

Prove:
- packet links a proposed card and remains at or below eight lines;
- vault emits only accepted cards;
- vault text distinguishes external confidence from Swan trial readiness;
- vault contains no Mobbin image bytes, image URLs, or source HTML;
- re-emission remains delete-and-rewrite and leaves no obsolete asset batch.

### GREEN 4

Integrate packet, index, vault, README, protocol, and router.

## 6. Failure Modes and Defenses

- **Input safety:** strict schemas plus recursive normalized-key, payload, PII, secret, and lexicon scans.
- **Visual safety:** escaped fixed-vocabulary SVG with no executable, remote, image, link, or style surface.
- **Fidelity:** golden-zone assertions, hierarchy geometry, mini-frames, facet seam, token parity, and contrast tests.
- **Evidence integrity:** visuals never enter confidence; provenance comes from claims; rejected/merged cards leave the active index.
- **Governance:** no doctrine writer; only the newest appended passing trial with Sean's explicit approval creates readiness for separate review; Mobbin-derived Mode L stays paused until its terms gate is cleared.
- **Durability:** append-authoritative identity, exact claim gate, deterministic rendering, full baseline, and sub-300-line source files.
- **Scope:** no source-image archive without written permission; contact sheet embeds only Swan-owned SVGs.

## 7. Verification

1. Capture each expected RED failure before its implementation.
2. Obtain Sean approval of the golden SVG before GREEN 1.
3. Run focused tests after each green, then the full serial 39-test baseline plus additions.
4. Run `node --check` on all design-brain source modules.
5. Run exact-file secret, PII, banned-language, and forbidden-payload scans.
6. Verify visual-token names against `frontend/src/styles/tokens.css`.
7. Inspect the full SVG at 1200 CSS pixels and the contact-sheet consumer at 320, 375, 414, 768, 1024, 1440, 2560, and 3840; below 960, verify the readable summary and open-full-size path rather than thumbnail text.
8. Run `git diff --check`, line-cap, and raw-color scans.
9. Apply Kimi's card-quality rubric on each hostile round.
10. Run two clean hostile rounds; any repair resets the clean count.
11. Report catalog staleness separately from slice correctness.

## 8. Deferred, Not Forgotten

Deferred: original Mobbin image archive pending written permission; Mobbin-derived Mode-L intake and scheduling pending the explicit terms-clearance artifact; Swan-card embeddings; browser gallery; production-metric ingestion; and stochastic illustration.
