---
surface: vs-claude
utc: 20260717T203000Z
topic: Prereq slice SHIPPED (local) — a rule-26 receipt invalidated 5 of the Village's 6 prerequisites; token enforcement + M0-M3 licence map built instead
tags: [design-infra, tokens, motion-tiers, rule-26, village-correction, toolchain-gap]
---

## What I did / learned
- **The receipt beat the Village.** Village prescribed 6 prerequisites; a rule-26 Canonical Surface Receipt against origin/main proved **5 already exist**: `styles/tokens.css` (canonical, App.tsx:66), `utils/theme/themeUtils.ts:115-331` (sole semantic injector), `LensPlanFrame.tsx` + `makeLensFrame` (IS the World/Chrome boundary — the file forbids hand-written frames), `recipeV2.ts` (token allowlist + 44px floor + required reduced-motion), `progressProofSummary.ts:86` (already computes ONE proof number per screen, mounted client+admin). Building as prescribed = 5 competing surfaces. Corrected plan: `docs/ai-workflow/AI-HANDOFF/PREREQ-SLICE-CORRECTED-2026-07-16.md`. **Durable lesson: never let a panel verdict reach a builder without a rule-26 receipt in between.**
- **BUILT (commit fd2a691d6, worktree branch, NOT pushed):** (1) `frontend/src/styles/tokenDiscipline.contract.test.ts` — repo-wide enforcement; Stylelint is NOT installed in this repo, and a vitest contract test needs zero new deps AND covers styled-components template literals Stylelint can't. Locks retired-hex ban + tokens.css sole dark-trio declarer + themeUtils sole injector + two importer ratchets. (2) `frontend/src/core/motion/surfaceMotionTiers.ts` + contract test — the missing **M0–M3 LICENCE map**; `resolveMotionTier = min(licence, capability)`; a policy layer OVER the existing `useAnimationTier` detector (the receipt found FOUR disconnected motion concepts already — adding a 5th would be malpractice). Unlisted surfaces fail SAFE at M0; `essential` capability freezes every surface (reduced-motion law); checkout/waiver/admin-finance/coach-assistant frozen at M0 by test.
- **FIXED:** `styles/aaa-enhancements.css:56` — the ONE live retired Galaxy-Swan hex (`#7851a9`), live via App.tsx:73. Red/green proven with `git show HEAD`. Retired-hex remediation surface was 1 line, not a campaign.
- **FOUND (the test caught what the receipt got wrong):** `styles/universal-theme-styles.css` declares `--bg-surface`/`--bg-elevated`(#1A1F2E)/`--text-primary`(#E6EDF3) on `:root` **and IS imported at App.tsx:78** — a SECOND live owner of themeUtils' vars. Crystalline only wins by runtime-injection document order; pre-injection/first-paint the GitHub greys paint. Ratcheted; ruled **P1 for the token-cleanup slice** (rule 37). Also latent: `theme/tokens.ts` (141 ln, 7 importers) is static + theme-blind — anything styled from it ignores all 18 themes; importer ratchet set at 7.

## Why it matters to Hermes
- **TOOLCHAIN GAP (blocks Tier-A everywhere):** `vitest@^4.0.18` is in `frontend/package.json` but **missing from node_modules** — the frontend suite cannot run in this environment at all. I did NOT `npm install` (three other Claude sessions + Codex are live in that checkout). Any agent claiming "tests pass" in this environment right now is claiming something it cannot have verified.
- **COORDINATION PROTOCOL GAP:** **three Claude sessions ran simultaneously** sharing ONE `claude.lane.md` (Coach CC v2 · this design-infra session · "Aurora Console" — which rewrote the lane mid-read). Rule 67 assumes 1 Claude + 1 Codex; with N Claude sessions the lane file is itself a collision surface (last-writer-wins destroys a live claim). I did NOT write the lane (zero file overlap proven by receipt) and report the gap. **Recommended: per-session lane files (`claude.<slug>.lane.md`) or an append-only claims block.**
- Worktree gotcha reconfirmed: worktrees need a `node_modules` junction; Vite still resolves `.vite-temp` up into the main checkout, so pure-Node verification is the reliable path for fs-based contract tests in a worktree.

## State right now
- Commit fd2a691d6 on `worktree-unified-world-gallery-2026-07-16` (5 files, +362/-1), secret-scan clean, **NOT pushed**. Production untouched.
- Verification honestly scoped: all 5 token contracts executed and PASS via node (4947 files scanned); motion map verified by direct read; **[UNVERIFIED] vitest** (see toolchain gap).

## Sean owes / blockers
- Token-cleanup slice decision (remove the App.tsx:78 second owner; migrate `theme/tokens.ts`'s 7 importers).
- `npm install` in frontend to restore the test suite (needs a quiet moment — other sessions are live).
- Still open from earlier: gallery walk / aesthetic confirm; the two legal slices (Coach DPA; FDA-MHMDA disclaimer); Codex review of the ratification.
