---
surface: swan-lens
slug: wave1-4-worlds
utc: 20260729T141500Z
author: vs-claude (Opus-tier, lead orchestrator)
kind: implementation
privacy: IDs/roles only — no PII, no secrets
---

# Swan Lens Wave 1 — 4 worlds authored (6 built / 19 planned)

Commit `8681ea6f9` on `claude/build-swan-lens` (batch cadence, not pushed). Zero live-user risk (v2 renders
Lab-only; resolver gate closed).

**Shipped:** aurora-index (atmospheric/default athlete), crystalline-cathedral (luxe/marketing hero), coach-ledger
(technical/evidence), quiet-meridian (calm/morning). Each = a verified-distinct structural codeword from the W0
vocabulary + Law-A tokens (accent/action = var(--swan-token,#fallback); panels = dark color-mix; no retired hex).
Wired into `registry.ts` BUILT_RECIPES + `catalogV2Map.ts` (dashboardChrome:true — all 25 ids ship a v1 chrome
lens in LENS_STYLE_ALLOWLIST, so true is required; v2 still Lab-only).

**Transferable technique — codeword design:** distinctness = the 6 variant/template axes only. Design each world's
codeword by hand so it differs on ≥3 axes from EVERY other world (colors/fonts carry family feel but count 0). I
hand-verified all 15 pairs before authoring; the registry + catalog distinctness tests then confirmed via the real
gate. The tight pairs to watch: same-family worlds (coach-ledger vs quiet-meridian = exactly 3 axes; aurora vs
crystalline = 4 sharing collection+template).

**Transferable gotcha — promoting a lens to v2 breaks chrome-vs-v2 tests:** `WorkoutDesignLab.styleAxis.test.tsx`
hardcoded specific ids (quiet-meridian, etc.) as its CHROME-ONLY examples. Promoting them to v2 flipped their
badge/behavior → 4 failing tests (the CODE was right; the test's chosen ids were stale). Fix: a `CHROME_ONLY_ID`
constant + a LOUD guard test (`expect(V2_RECIPE_BY_CATALOG_ID).not.toHaveProperty(CHROME_ONLY_ID)`) that fails
clearly when a future wave promotes it, telling the next builder to pick a fresh chrome id. **Architectural
boundary:** when ALL 25 are v2 (Slice 15), the chrome-only concept RETIRES — those tests fundamentally change. So
the full 25-world build cannot complete without the Sean-gated Slice-15 rollout transition; leave ≥1 chrome id
until then.

**PROOF:** distinctness gate green on all 6 built worlds; 212/212 across 22 suites (incl. palette-matrix contrast
min 12.17:1); standalone tsc exit 0. recipeResolution gate UNTOUCHED. DRY-LOOP CLEAN×2 (rounds 3).

**Next:** waves 2–4 (author more worlds, keeping ≥1 chrome id for the tests). GATED (Sean): theme-collapse track
(live palette), Slice 15 gate flip (all-25 go-live), Render push. Issue: SWA-69.