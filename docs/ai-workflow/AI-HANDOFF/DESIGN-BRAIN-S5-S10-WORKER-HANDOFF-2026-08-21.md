# Design Brain S5–S10 — Worker Handoff (Fable-authored, 2026-08-21)

- **Author:** Fable 5 (Final Decider). **Executor:** the next agent (any tier — this document is written so you need to ask ZERO questions to build).
- **Board:** SWA-185 (update it at every slice close — unprompted).
- **decision:** continue the panel-hardened blueprint slice-by-slice until S10, then the closing hostile panel
- **status:** open
- **supersedes:** none — companion to `panel-2026-08-20-design-brain/DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21.md` (the spec of record, committed beside this file; read it FIRST, then this)

---

## 0. Where you are standing

- **Branch:** `claude/design-brain-s1-20260821`, worktree `C:/tmp/ss-designbrain-s1`, based on origin/main @ `66ffde607`. Work HERE. Never in the shared SS-PT checkout (2158 commits behind).
- **Shipped and verified (do not rebuild, do not "improve"):**
  - S1 `8cb4c7d31` — 10-state loop (`scripts/design-brain/loop/`), typed gates, receipts, ledger READER, hand-seeded taste profile that provably drives selection.
  - S2 `e226bb7eb` — LayoutIR v2, structural fingerprint + pairwise distance, slop denylist (data predicates in `slop-skeletons.json`), divergence gate w/ logged bounded resampling.
  - S4 `3deb91631` — content-truth: `{text, source}` facts, specificity linter (`content-lint.mjs`), content-shape → section-type compatibility.
  - S3 `6d5684918` — real-browser lane (`capture.mjs`): overflow/tap/CTA-fold/computed-contrast/min-font at 375+1440, screenshots beside receipts, fail-closed degradation.
- **Proof commands (run these FIRST; if either fails, STOP and report — do not build on red):**
  - `npm run brain:loop:test` → 33/33 (browser tests skip visibly if playwright unresolvable).
  - `npm run brain:loop` → `[loop] CLOSED`, 17 meters, `runs/<id>/RECEIPT.json` + `screenshots/`.
- **Machine-local scaffolding:** playwright is junction-linked into this worktree's gitignored `node_modules` (→ main tree's `frontend/node_modules`). If junctions break: recreate via PowerShell `New-Item -ItemType Junction` (cmd mklink through git-bash mangles targets — verified failure mode).
- **The panel docs** (six seat reviews + synthesis + blueprint) are committed at `docs/ai-workflow/AI-HANDOFF/panel-2026-08-20-design-brain/`.

## 1. Laws that bind every slice (non-negotiable)

1. **No writer without a reader in the same commit.** Every new module has a runtime caller + a test in the commit that introduces it.
2. **Receipt or it didn't happen.** Artifacts, meters, screenshots, spend — hash-pinned into the run receipt. Prose is a failing state.
3. **Adjectives are not code.** Generator-facing prompts may not contain doctrine adjectives (cinematic/crystalline/awe/premium). Exemplars, budgets, denylists carry the intent.
4. **Deterministic tier stays LLM-free.** An LLM call inside contracts/ir/diverge/content-lint/capture/inspect is a build failure.
5. **Fail-closed degradation.** Any skipped lane is a RECORDED meter; unavailability while required = red run.
6. **Spend gates.** ANY paid call (image generation, paid LLM seats) requires Sean's explicit go IN CHAT for that slice, with a worst-case estimate first, hard cap, no auto-retry. GLM (Z.ai plan) and Qwen (local) are the free lanes. If Sean has not said yes in your session, you do not spend.
7. **Privacy.** Zero client PII anywhere in briefs/plates/prompts/packets. IDs and roles only. Secret scan runs pre-commit — keep it green.
8. **Per-slice protocol:** build → run ALL suites (`npm run brain:loop:test`) + real CLI → hostile dry-loop rounds until CLEAN×2 (each round a NEW vantage; log the rounds) → dedupe your demo appends in `docs/ai-workflow/design-brain/rejection-log.jsonl` to one final pending line (`head -2` committed lines + `tail -1`) → commit (explicit paths, `type(scope): description`, end with `Co-Authored-By:` your model) → push → update SWA-185 → Hermes inbox memo WITH `## Mistakes I made` → dual-tier closeout (plain-English first). File cap 300 lines. Match existing style exactly.
9. **When genuinely blocked** (a contract in this doc contradicts reality, a dependency is missing, a test cannot be made honest): STOP, write findings to the lane file + chat, ask Sean. Never fake a pass, never soften an assertion to get green.

## 2. Slice specs

> The blueprint §S5–§S10 is the spec of record. This section adds the build-level detail it doesn't carry. Build in this order: **S5 → S6 → S7 → S8 → S9 → S10.**

### S5 — Exemplar vault + image-model bake-off + surface-typed materials
**Goal:** "good" becomes pictures, not adjectives; the Forge feeds material slots per surface policy.
1. **Vault schema + harness (build now, no spend):** `scripts/design-brain/loop/vault/` — `vault.mjs` (reader/validator) + `exemplars/swan/{win,fail,borderline}/` where each exemplar = image file (png/jpg) + sidecar YAML/JSON: `{id, verdict: win|fail|borderline, skeleton_family, signature_moment, why, source: first-party|licensed, ranked_by: sean, ranked_at}`. Validator: every image has a sidecar, every sidecar's fields present, `source` never `scraped`. **Sean's ranking pass is the ONE human step** — prepare a ranking worksheet (N-up contact sheet or simple numbered list) from existing repo assets (`frontend/src/assets`, R2 exports Sean provides, prior QA screenshots) and ASK him to rank 15–30. Vault may ship sparsely populated; the validator + consumers land regardless.
2. **Bake-off harness (PAID — Sean-gated):** `scripts/design-brain/loop/bakeoff.mjs` — takes a model list + 10 fixed plate briefs, generates via the EXISTING `scripts/forge.mjs` primitives (do NOT reinvent generation/lineage/spend tracking — extend), emits a blind contact sheet + a ranking sheet for Sean, records cost/latency per model. Estimate spend first; do not fire without his yes.
3. **Materials stage upgrade:** `stages/materials.mjs` — `awe_photo` strategy resolves slots from (a) vault exemplars or (b) Forge pack lineage ids, keeping the S1 fail-loud path when neither exists. Gray-box co-evolution per the blueprint: IR first, plates fitted to the chosen direction's focal geometry; **never one plate world skinned N ways**. Two different IRs must never ship the same hero crop id (test).
**Acceptance:** vault validator green on a seeded fixture vault (commit tiny placeholder images you generate locally as fixtures, clearly marked `source: fixture` and excluded from real consumption); `awe_photo` run with an empty vault still fails loudly; with a fixture vault, material slots resolve to exemplar/lineage ids and ride the receipt; blind-sort test deferred until real anchors exist (mark `ASPIRATIONAL(S5b)` in the doc — do NOT fake it).

### S6 — Calibrated pairwise critic + motion lane
**Goal:** the LLM tier — reliable because it is caged, pairwise-only, and calibrated before trusted.
1. **Critic transport:** `scripts/design-brain/loop/critic.mjs` — takes two artifacts (render screenshots + IR summaries), returns a forced-choice verdict `{winner, reasons[], cited_regions[]}` via a consult transport. Dev/default seat: **Qwen local** (free, `scripts/consult-qwen.mjs` pattern) — the critic MUST be a different model family from the generator (the generator is whatever agent authored the render — record `generator_model` in the receipt and refuse critic==generator). Paid seats (GLM plan-credit is acceptable without new spend; Kimi/Grok need Sean's yes) are config, not code.
2. **Cage:** pairwise ONLY (A/B, randomized order, no absolute scores); findings must cite a screenshot region or selector, validator drops dangling citations; self-consistency 3× — only persistent findings survive; per-finding `metricAgreement` (does a deterministic meter corroborate?) replaces confidence.
3. **Calibration harness before trust:** `scripts/design-brain/loop/tests/critic-calibration.test.mjs` — planted-defect pairs (use the S3 fixture generators: overflow page vs clean page, low-contrast vs clean, card-sprawl vs ledger) — the critic must pick the clean one ≥90% across the set, order-swapped. Until calibration passes IN THE RUN, critic output is `advisory: true` and cannot gate. CRITIQUE stage integrates the critic ONLY in that caged form; the deterministic lanes stay untouched.
4. **Motion lane (deterministic, no LLM):** scroll capture in `capture.mjs` — 6 stills at 0/20/40/60/80/100% scroll composited per viewport + `prefers-reduced-motion` dual-run + motion lint (no layout-property animation, no infinite above-fold loops; parse for `animation`/`transition` in computed styles). Meters ride inspect like the rest.
**Acceptance:** calibration ≥90% on planted pairs or critic stays advisory (test proves the gate); critique artifact carries pairwise verdicts with validated citations; motion meters catch a seeded infinite-loop fixture; generator==critic family is refused (test).

### S7 — Taste distiller (the loop LEARNS)
**Goal:** ledger events → versioned, Sean-editable profile deltas.
1. `scripts/design-brain/loop/taste/distill.mjs` — reads the ledger via the EXISTING `read-ledger.mjs` (last-line-wins, pending excluded), quarantines `reason_code: unknown`, aggregates per (domain, project, artifact-type) scope; emits **proposed profile deltas** as a diff against `taste-profile.seed.json` → written to `taste/proposals/<date>.json`, NEVER auto-applied to the profile. Sean applies by editing the profile file (git-reviewed, per blueprint S7 — the profile stays hand-editable).
2. Confidence tiers: 1 consistent event = hypothesis (recorded, never proposed); 3+ consistent = proposed active lever with provenance event ids; contradictions supersede with both rows kept; recency decay field (`observed_last`).
3. **Scope isolation test (poison test):** 20 fixture classroom-scope rejections of dark backgrounds → the swan_product proposal file is byte-identical to a no-classroom-fixture run.
**Acceptance:** the money test from the blueprint — apply a proposed delta to a copy of the profile, run the loop: IR hash + screenshot hash change; empty/1-event fixtures propose nothing; poison test green; proposals carry event-id provenance.

### S8 — Production fidelity gate + site coherence
**Goal:** what ships matches what won.
1. **Direction artifact format:** freeze `{skeleton_id, plate lineage ids, content refs, token map, motion spec}` as the compile contract (schema + validator in `contracts.mjs`).
2. **Fidelity check:** `scripts/design-brain/loop/fidelity.mjs` — captures a PRODUCTION route (real URL via the S3 capture lane) and the winning direction's render; recomputes the structural fingerprint from the production DOM (zones→section landmarks mapping will be approximate: match on landmark sequence + card counts + hero family; document the mapping); pairwise-compares via the S6 critic (advisory until calibrated). A production page whose fingerprint diverges from its chosen skeleton = red receipt.
3. **Site coherence pass:** across N routes' IRs: shared nav/footer constants + one-signature-moment budget (count `signature` markers; >1 per site = fail).
**Acceptance:** fixture "production" page matching its direction passes; a mutated one (different section order) fails; coherence test catches two conflicting hero grammars. Do NOT wire to live sswanstudios.com routes yet — fixtures only; live wiring is a Sean-gated follow-up.

### S9 — Studio annotation surface (cheap lane first)
**Goal:** structured human verdicts, minimum UI.
1. **Cheap lane (build):** `scripts/design-brain/loop/studio.mjs` — takes a run dir, emits ONE self-contained `studio.html`: N-up fold screenshots of the fleet (S2's DirectionSet gives you the directions; render each — extend `run.mjs` with `--render-fleet` to render all four, browserInspect once each), numbered regions, and a plain textarea protocol: Sean replies in chat `2 keep · 4 kill:structure · 7 more-like-this`. A parser (`studio-parse.mjs`) converts that reply syntax into a VALID resolved atelier session (via the canonical `validate()`) and appends — closing the loop Sean-side with zero new infra.
2. Region locking + JSON-Patch chips are S9b — mark `ASPIRATIONAL(S9b)`, do not stub them as fake UI.
**Acceptance:** `--render-fleet` produces 4 renders + studio.html with all fold shots; parser round-trips `"v1 keep · v2 kill:style · v3 winner"` into a session that passes `validate()` with correct kill_rank permutation; malformed reply → named parse error, nothing appended.

### S10 — Learning Experience pack (schema + contamination proof ONLY)
**Goal:** prove the kernel/pack seam; build no classroom product.
1. `scripts/design-brain/loop/packs/` — `pack.schema.mjs` (validator: {domain, rubric, lexicon+banned-lexicon, skeleton subset, exemplar namespace, content rules, material_strategy default, taste namespace}) + `swan-product.pack.json` (extracted from what the loop already hardcodes — refactor constants INTO the pack, loop reads the pack) + `learning-experience.pack.json` (rubric fields per blueprint §S10, `print_none`, empty exemplars).
2. **Contamination tests:** kernel files contain zero pack tokens (grep test: `crystalline|sapphire|vault` absent from `scripts/design-brain/loop/{state-machine,ir,diverge,contracts}.mjs`); loading the LXS pack + running a Swan brief under pinned inputs → byte-identical IR to pre-pack refactor; classroom taste namespace cannot inject into swan runs (extends S7 poison test).
**Acceptance:** loop runs green with packs loaded; both contamination tests green; NO classroom briefs in any benchmark or demo.

## 3. Closing protocol (after S10 — do not skip, do not reorder)

1. **Full verification:** all suites + real CLI + `cd frontend && npx tsc --noEmit` true-exit if any frontend files were touched (they should NOT be — this workstream is scripts/docs only; if you touched frontend, you drifted).
2. **Write the completion packet:** `docs/ai-workflow/AI-HANDOFF/DESIGN-BRAIN-S5-S10-COMPLETION-2026-XX-XX.md` — per slice: files, commits, test counts, what was deferred with ASPIRATIONAL tags, residual risks, and the honest-gaps section. This is the panel's review target.
3. **Hostile panel (Sean already authorized THIS closing run — the standing yes covers it):**
   `node scripts/consult-panel.mjs --document docs/ai-workflow/AI-HANDOFF/DESIGN-BRAIN-S5-S10-COMPLETION-<date>.md --seed docs/ai-workflow/AI-HANDOFF/panel-2026-08-20-design-brain/DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21.md --seats glm,kimi,grok,qwen --confirm-spend --out-dir docs/ai-workflow/AI-HANDOFF/panel-s5-s10-close`
   (Kimi note: ONE review per topic stands — this close is its one review. Caps: Kimi $0.40, total well under $1.)
4. **Fable final seat:** leave the panel replies + INDEX in place and END YOUR RUN with a closeout that says the panel is complete and Fable's arbitration is the remaining step. Do NOT write the Fable synthesis yourself — Sean brings Fable back for the verdict and the merge decision. Merge to main is Sean+Fable-gated; you never merge.
5. Rule 48 audit record accompanies the completion packet (same file may serve both if it carries the 12 required sections).

## 4. Honest state / known gaps you inherit

- The rendered pages are deliberately plain — S5 materials + (later, post-merge) the S8-consumer production compiler are the beauty layers. Do not "pretty up" the render compiler ad hoc; every visual change must trace to a slice spec.
- Browser-lane auto-fix whitelist is deliberately empty; only static `contrast:` fixes auto-apply. Leave it so until S6's calibration exists.
- `SF6-table-first` hero renders h1+CTA regardless of its `data-table` section type (S1 crudeness, disclosed). Acceptable until S8's compiler.
- The vault ships sparse until Sean ranks; blind-sort acceptance is ASPIRATIONAL(S5b) — keep it tagged, never fake it.
- Codex holds a separate lane (dashboard trust repair + charts) in other worktrees — you share nothing with them; stay inside `scripts/design-brain/loop/` + docs.

## 5. Definition of DONE for this handoff

Every slice S5–S10 committed + pushed on this branch with green suites and CLEAN×2 dry-loops; SWA-185 carries per-slice notes; completion packet written; closing panel run with all four seats returned; Hermes memos per slice; final closeout names Fable arbitration + Sean merge as the remaining human steps. Nothing merged to main.
