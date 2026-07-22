---
status: RENDERED
date: 2026-07-21
reviewer: claude-fable-5 (in-session, Sean's subscription — satisfies the manual-gate constraint; no API/Village used)
branch: codex/degate-design-overhaul-20260721 @ 42fb7f575 + uncommitted S5
linear: SWA-30
---

# Fable Final Decider Verdict — De-gate Release

## 1. VERDICT: REVISE → repaired in-session → commit-gate APPROVED pending CLEAN×2

Per the packet's own rule ("REVISE if a bounded correction or missing test is required"), the review
found one bounded P2 defect. As Fable is also the executing builder in this loop (Sean's 2026-07-21
takeover directive), the correction was applied test-first immediately. With F1 repaired and green,
no uncorrected P0/P1/P2 remains: the branch is commit-gate approved subject to the mandatory
post-repair CLEAN×2 and Gate C main-drift integration.

## 2. BLOCKERS
None remaining. (F1 was the sole blocker; repaired and verified.)

## 3. FINDINGS
- **F1 (P2, CONFIRMED, repaired):** `backend/services/launchControlService.mjs` `deleteOverride()` —
  DELETE and its `flag_audit` INSERT ran outside any transaction, with no `FOR UPDATE`. Consequence:
  a crash between them leaves an unaudited flip back to env baseline; concurrent clears can record a
  stale before-state. This is the exact bug class `upsertOverride` fixed for itself (its comment: "a
  crash between them left an unaudited flip") — sibling path missed (Rule 20). Repair: wrapped in
  `sequelize.transaction` with `SELECT ... FOR UPDATE`, mirroring upsert. Evidence: RED test
  reproduced (retry x1, failed), repair applied, backend suite 21/21 green.
  Test: `launchControlServiceWhitelist.test.mjs` — "clears an approved override and writes its audit
  row in ONE transaction".
- **Optional polish (non-blocking):** none promoted; retained-behavior items are judged below.

## 4. FALSE OR STALE CLAIMS
- None material. One reviewer-side trap documented for successors: diffing against *current*
  origin/main (45 ahead) instead of baseline `eb4bbdd63` shows phantom deletions (e.g.
  `speedToLeadService.mjs`, `.claude/skills/swan-gate`) that are drift artifacts, not branch changes.
  The receipts' claims all validated against the baseline diff.
- Migration FK-order concern investigated and DISPROVED: `flags.parent_flag` is plain `TEXT NULL`
  (no FK), and `flag_overrides.flag REFERENCES flags(flag) ON DELETE CASCADE` is real — deleting the
  seven rows cascades overrides and cannot violate a parent constraint.

## 5. REQUIRED TESTS (all executed fresh this session)
- Frontend release suite: 22 files / **83 passed**. Backend de-gate suite: 3 files / **21 passed**
  (20 prior + 1 new F1 regression). `tsc --noEmit` (12 GB heap): **exit 0**. Vite build: **exit 0**.
  `lint:swan-lens`: clean (94 files de-galaxy, 93 token-discipline). Changed-file secret scan:
  **78 files, 0 hits** (excludes .png screenshots). Retired-key grep: zero runtime hits.
  `node --check` on all 9 changed backend .mjs: OK. `git diff --check` vs baseline: line-ending
  notices only.

## 6. RELEASE SEQUENCE
Post-verdict CLEAN×2 (fresh vantages) → fetch/rebase onto origin/main (45 ahead — new pre-commit
frontend-guards apply) → full gate re-run on rebased tree → stage explicit paths → commit S5 →
rule-42 backend audits empty → non-force push → monitor swanstudios-main + swanstudios-frontend to
the exact commit → migration/boot log inspection → Gate E owner env checklist (Sean) → Gate F live
verification → SWA-30 evidence + close.

## 7. RESIDUAL RISK
- Sean-owned: authenticated 34-entry admin click-pass post-deploy; Render env cleanup (S4 checklist)
  on both frontend-building services.
- Accepted retained behavior (judged NOT a blocker): `postSaveHandoff` consumes DB overrides end to
  end; PRISM UI consumes its override while the POST route reads `PRISM_CAPTURE_ENABLED`; dashboard
  finance dormant reading `DASHBOARD_V2_FINANCE`. Rationale: the env reads are fail-safe route-level
  gates on features that are dark or default-off; unifying them onto the override cascade is a
  behavior change outside this release's surgical scope, and the board copy no longer overclaims
  instant/no-redeploy behavior (S5 fix). A separately reviewed enforcement slice may follow.
- Local passes do not prove production: Render deploy, live assets, and migration state are Gate D/F.

## 8. FINAL DECIDER ATTESTATION
All mandatory gates were inspected against the live worktree, not receipts alone: routing closure
(gate imports deleted, direct JSX mounts verified at main-routes lines 337–529; `/design-previews/:id`
behind `ProtectedRoute requiredRole="admin"`), registry isolation (playgroundRegistry is the sole
importer of vNext modules; canonical routes never consume it), preview boundary (native inert +
capture-phase listeners + CSS fallback; 6/6 runtime contracts), whitelist enforcement at resolver /
service (set via flagExists, clear via isApprovedFeatureFlag pre-SQL) / route error propagation /
public-config (3-key envBaseline), migration integrity (transactional, cascade-clean, audit
untouched, down = metadata only), header/footer suppression and analytics exclusion on
`/design-previews/*`. The branch is commit-gate approved contingent on CLEAN×2 + rebased-tree gates.
