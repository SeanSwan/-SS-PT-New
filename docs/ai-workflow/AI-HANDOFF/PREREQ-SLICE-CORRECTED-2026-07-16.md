# PREREQUISITE SLICE — CORRECTED BY GROUND TRUTH (Decider amendment to the Village verdict)

- **Date:** 2026-07-17 · **Author:** Opus 4.8 (fallback Final Decider) · **Amends:** `DESIGN-RATIFICATION-FINAL-2026-07-16.md` §2
- **Why this exists:** the ratification record's own §6 warned *"nobody in the chain saw the pixels — they ratified a strategy, not a design."* A rule-26 Canonical Surface Receipt against origin/main now proves that warning was concrete: **five of the Village's six prerequisites already exist in the codebase.** Building them as prescribed would have created five competing surfaces — the exact failure rules 26/27 exist to prevent.

## 1. Receipt verdict: what the Village prescribed vs. what is already there

| Village prerequisite | Ground truth (file:line) | Ruling |
|---|---|---|
| "Ship a canonical `tokens.ts`/`tokens.css`" | **`frontend/src/styles/tokens.css` (176 ln) already exists**, self-declares "Canonical source of truth for the Enchanted Apex theme" at :2-4, imported by `App.tsx:66`. Owns `--obsidian-black:122`, `--carbon:123`, `--graphite:124` — the `#0A0A0F/#141419/#1A1A24` trio is single-owner and clean. | **ALREADY EXISTS — do not create.** Extend + lock it. |
| "Semantic token owner" | **`frontend/src/utils/theme/themeUtils.ts:115-331`** `generateCSSVariables()` is the SOLE injector of `--bg-base:207`, `--accent-primary:217`, `--accent-secondary:218`, `--accent-gold:219`, `--text-primary:191,211`; injected via `injectThemeVariables():337-359` into `<style id="theme-variables">` + `data-theme` on `:root`. | **ALREADY EXISTS — do not add a second injector.** |
| "`<WorldLayer>`/`<ChromeLayer>` boundary, snapshot-tested" | **`LensPlanFrame.tsx` (117 ln) IS the boundary** — header: *"the only place plan → DOM happens… fail-closed, never guesses"*; maps `lens2-*` → `--world-*` at :93-95. Bound in production via `makeLensFrame()` (`SurfaceLensGate.tsx:55-67`) on logger/bootcamp/clients. `lensRepresentationStyles.ts:7-11` already draws the tokens-vs-representation line. | **ALREADY EXISTS — do not hand-write frames** (the file explicitly forbids it). Bind via `makeLensFrame`. |
| "Token allowlist / discipline" | **`recipeV2.ts`** already enforces name regex :94, value allowlist :68 (bans `url()`, `;`, `{}`, backslashes, angle brackets), **44px floor :115-117**, **required reduced-motion :118-120**. | **ALREADY EXISTS — extend, never fork.** |
| "Resolve the Evidence Lens data contract" | **`progressProofSummary.ts:86-119` already computes one proof number per screen** — `populated/12` charts, `readinessPercent:94`, `proofLevel` :62-68, `tone` :41-46 — with an explicit truth rule at :115-116 (*"Only verified logged workouts count… AI-estimated historical imports should be reviewed and saved before they count"*). Mounted by `CanonicalProgressChartsGrid` (client) + `AdminProgressChartsGrid` (admin) via `ProgressProofCockpit.tsx` (197 ln). | **THE DEVICE EXISTS — reuse it.** Only the *marketing* zero-state is genuinely unsolved (see §3.4). |
| "Stylelint ban on retired hexes" | **Stylelint is NOT installed** — no dependency, no `.stylelintrc*`, no CSS linting anywhere. ESLint exists (`frontend/.eslintrc.cjs`). | **GENUINELY NET-NEW — build it.** |

## 2. What the receipt found that NOBODY in the chain knew

1. **The retired-hex problem is 1 line, not a campaign.** Only **`frontend/src/styles/aaa-enhancements.css:56`** (`linear-gradient(to right, #46cdcf, #7851a9)`) is live retired-brand code (imported at `App.tsx:73`). `SwanGalaxyLuxuryButton.tsx:33` holds `#0A0A1A` but has zero consumers. The other 8 hits are guard tests asserting absence. **Remediation surface: one line.**
2. **`frontend/src/theme/tokens.ts` (141 ln, 7 importers) is the real competing surface** — a full parallel palette (`#60c0f0`, `#8b5cf6`, `#002060`, `#c6a84b`) that is **static, never reaches CSS vars, and is invisible to the theme changer**. Any surface styled from it silently ignores all 18 themes. This is the thing that will break the dimmer switch.
3. **`frontend/src/styles/universal-theme-styles.css` (426 ln) is an orphaned second owner** of `--bg-surface:28`, `--bg-elevated:29`, `--text-primary:31,243` with GitHub-grey values. Zero importers today = inert, but importing it anywhere re-forks token ownership. **Landmine.**
4. **FOUR disconnected motion concepts already exist:** `useAnimationTier` (bare hook, no context, 4 consumers, re-detects per consumer), `PerformanceTierProvider` (a real provider, unlinked), `motionEnabled` in `UniversalThemeContext:1630`, and `motionMode` in `ScopedLensFrame:27`. **Nothing encodes M0–M3 budgets.** Adding a fifth detector would be malpractice.
5. **The `--world-*` contract (14 vars) is duplicated across 25 concept files** in `workout-design-lab/concepts/` — each re-declares all 14 locally. *This* is the actual duplication surface a "unified world" program should close, and no one named it.
6. **18 themes exist** (`UniversalThemeContext.tsx:1576-1594`), including `cyberpunk-edgerunners` — the Lens style blueprint's #5 must not collide with it.

## 3. THE CORRECTED SLICE (build only what is genuinely missing)

### 3.1 Stylelint + the retired-hex ban — **BUILD** (net-new, cheap, high value)
Install Stylelint in `frontend/`, config banning `#00FFFF`, `#7851A9`, `#0a0a1a` (case-insensitive) in CSS + styled-components template literals; wire `lint:css` + add to the Tier-A gate. **Fix the one live violation** (`aaa-enhancements.css:56` → Crystalline tokens). A ban without enforcement is a comment — the Village was right about the principle, and the enforcement is the only part missing.

### 3.2 Motion budgets — **BUILD as a POLICY LAYER, not a fifth detector**
`SURFACE_MOTION_TIERS` map (surface → M0–M3 license) + a `useSurfaceMotion(surface)` hook that **composes** the existing `useAnimationTier()` device capability with the surface's licence and returns the *minimum* of the two. Guarantees waiver/checkout/admin-finance = M0 regardless of device. Does **not** replace or compete with the existing four concepts; it is the missing policy layer above them. Unifying those four is a **separate, larger slice** — flagged, not smuggled in here.

### 3.3 Token-ownership lock — **BUILD as a TEST, not a new file**
A contract test asserting: (a) `tokens.css` remains the sole declarer of the dark trio; (b) `themeUtils.ts` remains the sole injector of `--bg-base`/`--accent-*`/`--text-*`; (c) `universal-theme-styles.css` has zero importers (landmine tripwire); (d) `theme/tokens.ts` gains no new importers (deprecation ratchet). This delivers the Village's *intent* (enforceable single source) without forking the source.

### 3.4 Evidence Lens — **REUSE the device; contract ONLY the marketing gap**
`progressProofSummary` already answers "one real proof number" for logged-in dashboards. The genuinely unsolved question is **marketing**: a logged-out visitor has no proof. Contract: marketing's Evidence Lens shows a **labelled platform aggregate** (e.g. "402 sessions logged this month — platform-wide"), never a personal number, never "0", never optimistic, with a skeleton on load and the lens simply **absent** if the aggregate endpoint fails (honest omission beats a fake circle). Requires one read-only aggregate endpoint — which is why the "no backend changes" claim was correctly narrowed to "no IA/interaction-contract changes."

### 3.5 Deprecation ratchet for `theme/tokens.ts` — **PLAN, don't execute here**
7 importers; migrating them is its own slice with its own receipt (rule 37: cleanup is a separate pass). Ratchet test (§3.3d) freezes the bleeding now.

## 4. What this amendment proves about the process

The Village's $0.74 bought genuinely valuable things — the legal flags (Swan Coach DPA, FDA/MHMDA), the rollout economics, the "ban without enforcement is a comment" principle, the never-optimistic proof rule. It could not buy accuracy about a codebase it never read. **The receipt is what converts a strategy verdict into a build.** Any future chain that skips rule 26 between "the panel decided" and "the agent builds" will ship five competing surfaces and call it consensus.

## 5. Coordination finding (protocol gap — flag to Sean)

**THREE Claude sessions are live simultaneously**, all sharing ONE `.ai-workflow/coordination/claude.lane.md`: (A) Coach CC v2 hostile verification, (B) this design-infra session, (C) "Aurora Console finish" — which rewrote the lane mid-read. Rule 67's ledger assumes **one** Claude + **one** Codex; with N Claude sessions the lane file is itself a collision surface (last-writer-wins destroys an active claim). This session therefore did **not** write the lane — the receipt proved zero file overlap with Codex's coach/finance lease and with sessions A/C — and reports the gap instead. **Recommended fix:** per-session lane files (`claude.<session-slug>.lane.md`) or an append-only claims block. Independent corroboration also landed: session A hit the same `fusion-triangle.mjs` failure (`synthesized=false brains=[]`, exit 0, Gemini CLI auth-dead) that broke this program's triangle pass — the tooling debt is real and reproducible.
