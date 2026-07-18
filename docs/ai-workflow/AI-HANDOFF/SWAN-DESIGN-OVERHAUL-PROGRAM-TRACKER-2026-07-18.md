# Swan Design-Overhaul Program — 14-surface build tracker (resumable)

**Purpose:** Sean directed (2026-07-18) "build ALL 14 blueprints autonomously in sequence." This is the
load-bearing tracker so any session resumes the next surface cheaply. Authoritative order:
`PANEL-SYNTHESIS-CORRECTED-BUILD-PLAN-2026-07-17.md`. Branch: `claude/build-swan-lens` off origin/main.

## The discipline (per surface — non-negotiable, it caught 5 real bugs on the lens)
1. **Reground** the blind blueprint via `consult-kimi.mjs` with a REAL-substrate seed (relative paths — the
   consult scripts mangle absolute Windows paths). Serialize consults (concurrency truncates responses).
2. **Fidelity-verify** the reground against real code before building; build VERBATIM (Kimi=architect, zero
   design decisions from the builder). Ambiguity → re-consult, don't improvise.
3. **Build** additive + reversible (new-version dir + feature flag + fail-closed; V1 untouched; Lane-A files
   untouched; money/PII paths untouched or runtime-config reversible).
4. **Hostile-review until dry** (Rule 61) + **triangle** (Claude+Codex+Gemini via consult-gemini/codex on a
   repo-RELATIVE packet) before any push. Fix all confirmed findings + regression-test.
5. **Gate the production push with Sean** (frontend/tsc/eslint/de-Galaxy clean + Vite build passes + fast-forward).
6. Commit per slice; Hermes memo + this tracker updated per surface.

## The SHIPPED keystone (surface #1 — DONE, live main cba39192b)
Swan Lens: `frontend/src/adapters/style-lens-swan/` — value spine + design guard, monolith split (27 lens files,
console skin preserved), Crystallize (`useCrystallizeTransition`/`CrystallizeOverlay`), `useLensViewport`,
`lensViewportCss`/`lensSurfaceCss`, `resolveLensVictoryTheme`. Real `--world-*` names only; `--world-data-*`/
`--world-z-*` are Lane-A/Chart-Charter PROPOSALS (not emitted). All the other 13 surfaces CONSUME this.

## Status board
| # | Surface | Blueprint | Reground | Build | Triangle | Pushed |
|---|---|---|---|---|---|---|
| 1 | Swan Lens (keystone) | — | ✅ x4 | ✅ | ✅ (5 bugs fixed) | ✅ cba39192b |
| 2 | **Dashboards** (4 roles + backend) | KIMI-DASHBOARDS | 🔄 running (b7w4nb2rv → KIMI-DASHBOARDS-CORRECTED) | — | — | — |
| 3 | Store (StoreV4, money-path UNTOUCHED) | KIMI-STORE | — | — | — | — |
| 4 | Home (SEND-BACK, full re-pass, RF backup hero) | KIMI-HOME | — | — | — | — |
| 5 | About (SEND-BACK, light-caustic swan mark) | KIMI-ABOUT | — | — | — | — |
| 6 | Video (SEND-BACK, refraction system) | KIMI-VIDEO | — | — | — | — |
| 7 | Contact (ship-with-changes, decompose 1193L) | KIMI-CONTACT | — | — | — | — |
| 8 | Cover/Gallery (SEND-BACK, Core-Loop rewire) | KIMI-COVER-GALLERY | — | — | — | — |
| 9 | Photography (decompose 2219L, rename Cosmic Gate) | KIMI-PHOTOGRAPHY | — | — | — | — |
| 10 | Design Skill redo (swap on Sean confirm) | KIMI-DESIGN-SKILL-REDO | — | review+propose only | — | — |
| 11 | Design Brain enhance (swap on Sean confirm) | KIMI-DESIGN-BRAIN-ENHANCED | — | review+propose only | — | — |

## Cross-cutting DEFERRED (need Sean/Lane-A rulings; do not block surfaces)
- Lane-A wiring of the lens (Crystallize into Apply handler; viewport/surface CSS mounts; motion licences).
- Chart Charter multi-series `--world-data-*` tokens; `--world-z-*` promotion.
- Deferred Playwright pass (computed-cascade/flicker/forced-colors).

## Gotchas (inherit)
- consult-*.mjs mangle absolute Windows paths → RELATIVE only. Serialize consults. Background-task "exit 0" can be
  the wrapper's echo — read the real redirected output. Worktree node_modules junction via PowerShell not mklink.
  Honest tsc = real exit code. styled-components speedy insertRule hides CSS text in jsdom (test the contract).

## Resume procedure (fresh session)
Read this tracker → find the first surface not ✅-pushed → follow "the discipline" above → update the board + Hermes.
