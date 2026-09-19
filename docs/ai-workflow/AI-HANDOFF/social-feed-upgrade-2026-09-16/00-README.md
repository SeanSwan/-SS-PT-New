# 00 — README / Builder Contract

**Workstream:** Social Dashboard Upgrade + SwanGuard↔SwanStudios Spotlight Bridge
**Package:** `docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/`
**Doctrine:** `fable-blueprint-forge` — every builder decision is pre-made in `MEGA-BLUEPRINT.md`.
**Last updated:** 2026-09-18

---

## What this is

The build package for the social-side upgrade of SwanStudios plus the curated positive-news
bridge from SwanGuard. `MEGA-BLUEPRINT.md` is the authority for decisions. This file is the
contract for whoever builds the remaining slices.

## Read order

1. `MEGA-BLUEPRINT.md` — §1 panel synthesis, §2 locked decisions, §4 contracts, §6 slice plan,
   §7 bans. **This is the authority.**
2. `HOSTILE-REVIEW-5X.md` — five adversarial passes over S1 and this blueprint, with file:line
   evidence. Read this before building, so you do not re-introduce a fixed defect.
3. `FIX-LOG-5X.md` — what was changed because of that review, and the verification receipts.
4. `AUDIT-SSPT-SOCIAL-DASHBOARD.md` — the canonical-surface audit.
5. `07-checkpoints.md` — the per-slice review protocol.
6. `reply-*.md` — the five consult seats' raw replies (evidence chain, not instructions).

## Builder Contract

> You are the builder, not the architect. Follow the package to the letter. Where the package
> decides, you do not re-decide — even if you would do it differently. Where the package is silent
> on something that matters, STOP and return the question; do not improvise. Build ONE slice at a
> time; after each slice, output the diff plus the acceptance-criteria evidence (test output, curl
> results) and WAIT for the checkpoint verdict before continuing. Never claim a criterion passed
> without pasting its output.

## House rules a context-free builder must not violate

- Styled-components only (no MUI). Victory for charts. `css` helper for shared fragments.
- Dark-first. Tokens, never hardcoded colors: `var(--token, #fallback)`.
- **Gold `#C6A84B` = earned recognition. Purple `#8B5CF6` = AI coach. Ice-cyan `#60C0F0` = system
  chrome.** Spotlight is ice-cyan only.
- 44px minimum touch targets. `prefers-reduced-motion` static fallbacks.
- Files stay **<300 lines**.
- FKs reference PascalCase canonical tables (`"Users"`, `"SocialPosts"`).
- Zero PII to any LLM or bridge payload — aggregates and IDs only (rule 8).
- Migrations go in the **top-level** `backend/migrations/` only; `backend/scripts/safe-migrate.mjs:146`
  reads non-recursively, so a subdirectory migration never runs.
- No `git add -A`. No push to main without Sean.
- Verify with: `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` — **the 8 GB heap is
  required**; the plain command OOMs, and piping to `tail` hides the exit code.

## Status at 2026-09-18 (test counts measured from disk)

| Slice | State |
|---|---|
| Phase 1 (audit, 5-seat panel, blueprint) | ✅ complete |
| S1 Coach Signal (+ S1.5 wiring) | ✅ complete, hostile-reviewed ×5 — 34 tests |
| S2 Proof Card (+ S2.5 live entry point) | ✅ complete — 31 tests |
| S3 Spotlight receive side | ✅ built — 31 tests. **Admin view of live items not built.** |
| S4 prompt chips + Comeback Moment | ✅ complete — 37 tests |
| S5 SwanGuard publisher | ⛔ **BLOCKED** — see `MEGA-BLUEPRINT.md` §6 S5 ⚠️ (no version control in that repo) |
| S6 Faction War ceremony | ⬜ not started |
| S7 operator pulse + manifest poll | ⬜ manifest endpoint exists; pulse + SwanGuard tile not started |
| S8 weekly digest | ⬜ not started |

Full sweep: backend **72/72** (5 files) · frontend **551/551** (108 files) · `tsc --noEmit` **exit 0** · secret scan clean.

## Known open items (do not silently "fix")

- **Nothing is committed.** Rule 42 hazard: `routes/social/index.mjs` (modified, tracked) imports
  15 **untracked** new files. A partial landing crash-loops the backend with
  `ERR_MODULE_NOT_FOUND`. Sean's call.
- **S5 cannot start safely.** `Desktop/@Everything/SwanGuard-Newsroom` has a dangling gitfile
  (`.git` → a deleted `family-first-intelligence-command-center` worktree parent). No history, no
  diff, no revert — and S5 must *modify* existing files there. Backup or re-clone first.
- **"Spotlight" already means a view filter** in SwanGuard's Intelligence Wiki
  (`wiki.spotlight-graph-source`). Namespace new S5 identifiers (`StudioSpotlight*`).
- `UNIQUE (coachId, postId)` on `CoachSignals` stops protecting once `postId` goes NULL
  (Postgres treats NULLs as distinct). Needs a partial index when session-targeted signals land.
- `InlineSignalPicker`'s candidate source is the coach's own feed, which can legitimately yield
  zero candidates.
- `SPOTLIGHT_ENABLED` defaults **off**. Nothing renders until it is set to `true`.
