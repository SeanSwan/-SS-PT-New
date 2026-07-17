---
surface: vs-claude
utc: 20260717T073600Z
topic: Design-infra prereq slice SHIPPED to main (0ecbb28ff) — gates real, prod healthy; frontend/node_modules was EMPTY and is now restored
tags: [design-infra, tokens, motion-tiers, shipped, toolchain-fixed]
---

## What I did / learned
- **SHIPPED to origin/main `0ecbb28ff`** (merged 39 commits of main in first, no conflicts, no collisions on my files; used MERGE not rebase per rule 45). Render deploying; prod verified healthy after push: `/api/health` 200 `{"status":"healthy","checks":{"store":"ready"}}`, `/` 200.
- **Toolchain fixed (this was blocking EVERY agent's Tier-A):** `frontend/node_modules` was **completely EMPTY** in the main checkout — vitest/vite/plugin-react all absent, so no frontend test or build could run at all. Ran `npm ci` (lockfile present, no install in progress, zero node processes running → safe). Toolchain restored.
- **Worktree test recipe (reusable):** a worktree can't run vitest because Vite resolves `.vite-temp` UP past the worktree root into `SS-PT/node_modules` (which lacks vitest). Fix that works: junction BOTH `worktree/frontend/node_modules` AND `worktree/node_modules` → `SS-PT/frontend/node_modules`. Also: vitest 4 has NO `basic` reporter (`--reporter basic` dies with a confusing RunnerError) — use the default.
- **Hostile review of my own slice found 2 real defects + 1 self-inflicted:** (1) **a bypass in my own ban** — exemptions were substring matches, so any path containing `archive` (incl. a real component named `ArchiveEditorial.tsx`, which this very design program has as a candidate) was silently exempt; now whole-path-segment matching + extension-based test detection. (2) ambiguous `||`/`&&` precedence in the ratchet → split into named predicates. (3) my header comment contained `--accent-*/--text-*` whose `*/` **closed the block comment early** and broke the esbuild transform.

## Why it matters to Hermes
- The design guardrails are now LIVE on main: retired-hex ban, tokens.css sole-declarer lock, themeUtils sole-injector lock, two competing-owner ratchets, and the M0–M3 motion licence map (checkout/waiver/admin-finance/coach frozen at M0 by contract; unlisted surfaces fail safe to M0; reduced-motion freezes everything). Any agent that reintroduces a retired hex or a second token owner now fails a test instead of shipping it.
- Nothing user-visible changed except one gradient (`aaa-enhancements.css:56`, the last live retired hex `#7851a9` → Crystalline tokens). **Track A design work has NOT started** — do not tell Sean the site looks different.

## State right now
- Gates (real, post-merge): tokenDiscipline 5/5 + surfaceMotionTiers 6/6 = **11/11 PASS**; credentialPhrasing + TrainerHomeResponsiveContract **13/13 PASS**; ShoppingCart.themeContract + swanStyleLensRegistry **40/40 PASS**; `tsc --noEmit` zero errors on both new files; Rule 42 backend audit clean (no untracked, no modified backend). Secret scans clean on every commit.
- Wave 2 gallery complete: 12/12 dashboard mocks, all QA PASS, gallery browsable at `experiments/world-factory/2026-07-16/unified-gallery-01/gallery/index.html`.

## Sean owes / blockers
- **Token-cleanup slice (next):** remove the second token owner (`App.tsx:78` imports `universal-theme-styles.css`, which declares `--bg-surface`/`--bg-elevated` #1A1F2E/`--text-primary` #E6EDF3 — GitHub greys — on `:root`, competing with themeUtils; Crystalline only wins on runtime-injection document order, so first paint can flash wrong). Then migrate `theme/tokens.ts`'s 7 theme-blind importers.
- Gallery walk / aesthetic confirm of the ratified assignment (his eye is final).
- Two legal slices from the Village: Swan Coach DPA/retention; FDA-MHMDA wellness disclaimer + biometric consent.
- Codex hostile review of the ratification + this slice.
