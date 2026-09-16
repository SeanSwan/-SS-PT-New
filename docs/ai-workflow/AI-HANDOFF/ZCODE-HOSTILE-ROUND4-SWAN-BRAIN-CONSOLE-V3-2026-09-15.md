# ZCode (GLM) Hostile Review — ROUND 4 — Swan Brain Console V3

- **Date:** 2026-09-15 · **Seat:** ZCode (GLM 5.3-Flash class, Z.ai coding plan, $0 marginal) · **Mode:** builder-reviewer dual pass on Sean's direct order ("hostile review, then fix, slice by slice")
- **Worktree:** `tmp/worktrees/brain-console-20260913` · **Branch:** `feat/swan-brain-console-20260913` (all work uncommitted — the rule-46 Kimi K3 gate has NOT run)
- **Inputs reviewed:** every file under `frontend/src/pages/HomePage/three-worlds/`, `scripts/swan-brain-console/`, `frontend/qa-worlds.*`, `.github/workflows/three-worlds-fleet.yml`, the blueprint, the readiness receipt (rounds 1–3), and the three round-3 review packets.
- **Companion docs:** receipt §15 (this round), `SWAN-BRAIN-CONSOLE-V3-REVIEW-PREPARATION-2026-09-15.md` (mega-blueprint packet + upgrade proposals).

---

## 1. Verdict

**REVISE — satisfied in-session.** The round-3 state had one claim that was false in code (the slot hand-off), one Tier-A claim that was false as stated (tsc "0 errors"), one unresolved reviewer dispute that was settled by geometry and tests (FIX E), and a copy pack that violated the house credentials rule it was written to protect. All are fixed in this round with regression tests. **The work is NOT committed: Kimi K3 review is still owed, and the Astra mega-blueprint pass is pending by Sean's sequencing.**

## 2. Verification ledger — what round 3's claims reproduced, in this environment

| Check | Round-3 claim | Round-4 re-run | Agreement |
|---|---|---|---|
| `tsc --noEmit` | 0 errors | **1 error (TS2774, tokens.ts:135)**; full-tree tsc needs **>8GB heap** (Node 24) — crashes at default and at 8GB, passes at 14GB | **DISAGREES** |
| fleet contract | 13/13 | 13/13 | agrees |
| runtime contract | 37/37 | 37/37 | agrees |
| engine contract | 12/12 | 12/12 | agrees |
| `gallery-verify.mjs` | 65/65 | 65/65 | agrees |
| `console-verify.mjs` | 17/17 | 17/17 | agrees |
| rule 4 | max 300 lines | held (and caught this reviewer's own first draft at 353 — the gate works) | agrees |

The tsc disagreement is a finding, not a flake: the error is real (fixed below), and the heap requirement means the round-3 "CI wiring DONE" claim was **unexecuted and infeasible as authored** — GitHub-hosted runners cannot satisfy a >8GB type check, so the contracts job would have died red on first push.

## 3. Findings and dispositions

### F1 — BLOCKER (claim false in code): the slot hand-off did not exist
**Claim:** receipt §13 and Sean's round-3 summary: "off-screen scenes hand their slot to the ones you're looking at."
**Code truth:** `releaseSlot()` was called only on unmount (and in one error path); the IntersectionObserver only started/stopped the RAF loop. On the all-20 page the **first four mounted worlds held their slots forever**; worlds 5–20 showed posters even while on screen. The verifier asserted only `live <= cap`, which passes forever in that dead state — a guard that cannot fail guarding a claim nobody implemented.
**Fix:** `runtime.ts` now owns a real hand-off — going off-screen (12% hysteresis margin) tears the world down through the normal effect cleanup (context destroyed, canvas removed, slot released); coming on-screen rebuilds it and re-acquires. Priority inversion falls out of the same change: slot-less on-screen worlds, not off-screen ones, win freed slots.
**Proof:** new browser assertion `context budget: slots hand off to newly visible worlds` — the live set must CHANGE when the viewport moves, no off-screen world may hold a slot, and every live world must have presented frames. Plus `context budget: DOM canvas count equals live worlds` — since the canvas is created per slot-holding world, 20 canvases can no longer sit in the DOM while 4 animate.

### F2 — HIGH (resource leak): builder-throw path leaked the slot AND the context
`runtime.ts` caught a throwing scene builder with `renderer.dispose()` only — no `forceContextLoss()`, no `releaseSlot()`, and **no cleanup function returned**, so the slot was never released: four throwing mounts would permanently exhaust the pool for the whole session. The renderer-constructor catch released the slot but left an orphan canvas in the DOM. Both paths now destroy the context, sweep the canvas, and release the slot.

### F3 — SETTLED: FIX E (the Fable-vs-GLM dispute) — Fable was right
The dispute: `if (top >= 0) return 0` — GLM judged CORRECT, Fable judged "a section below the fold sits at progress 0 for its whole readable life."
**Ruling:** both were half right, because the rule is hero-specific but was applied universally. A served front page's host sits at `rect.top = 0` on load and MUST open on its authored pose (progress 0) — the load rule is correct *for that host*. A host the reader scrolls TO (every gallery variant below the first, any mid-page section) spends its entire approach at top > 0, so under the load rule its dolly did nothing while it was read and only played as it exited. Fable's geometry was correct; GLM's verdict ignored the non-hero case.
**Resolution:** `scrollProgressFor(rect, vh, anchor)` now takes an explicit anchor. `'load'` keeps the hero contract (0 at load, span = host height). `'travel'` spans the host's whole readable life: 0 when its top enters at the viewport bottom, 1 when its bottom leaves the viewport top — `(vh − top) / (vh + height)`. `observeHost` classifies each host ONCE at attach time from the scroll-invariant document offset (`scrollAnchorFor`, ±2px tolerance): the page-opening host is load-anchored, everything else travel-anchored. A reload mid-page stays load-anchored for the hero because the classifier uses `rect.top + scrollY`, not `rect.top`.
**Proof:** 9 new unit tests, including the exact Fable case (`top = vh/2, fully on screen → progress > 0.3`, which the old universal rule returned 0 for) and a guard that the travel fix did not reintroduce the round-2 "hero loads mid-dolly" bug.

### F4 — HIGH (Tier-A claim false + CI infeasible): tsc had a real error and needs >8GB
`tokens.ts:135` — `TS2774: This condition will always return true` (`document.createElement` tested for truth instead of called). **Fixed** (`typeof document.createElement === 'function'`). The round-3 "slice-clean AND baseline-clean" statement was therefore false as written; with the fix the slice is clean, but the full-tree baseline on THIS machine needs a 14GB heap to complete at all.
**CI consequence:** the authored workflow's `npx tsc --noEmit` would OOM on any hosted runner. **Fixed** with `frontend/tsconfig.three-worlds.json` — a scoped strict config covering three-worlds + DesignPlayground + qa-worlds + their hooks/content dependencies, with ambient declarations retained (first cut dropped `vite-env.d.ts` and produced 31 phantom errors — the scoped config must carry the ambient `files`). Verified: exit 0 at a 4GB heap. The workflow now type-checks THE FLEET (what its step name always claimed) with the full-tree check remaining a local gate; `npm run verify` sets the 14GB heap explicitly.

### F5 — HIGH (copy): the pack violated the house credentials rule it existed to protect
`pack.ts` SHARED.sub read **"NASM-certified coaching"** — banned by the house credentials rule (rule 65: 26+ years / NASM-protocol, never "NASM-certified"). The round-3 open item "copy-gate vocabulary" turned out to point at the pack itself.
**Fix (RED→GREEN):** three new gate classes/tests, all observed failing first — stem inflections (`empowers`/`unlocks`/`delving` now caught; e-drop inflections handled correctly — the first cut matched only the impossible "delveing"), unhyphenated intensifiers (`world class`, `cutting edge`, `state of the art`, `best in class`, `game changing`), and house vocabulary (`NASM-certified` / `NASM certified`, with a negative test that the NASM OPT model and NASM overhead squat assessment — named METHODS — stay legal). Pack copy corrected to "NASM-protocol coaching."

### F6 — LOW (telemetry race): React overwrote the live frame counter
`WorldPage` rendered `data-frames={frames}` from the hook's return — a render-time snapshot that re-froze the attribute on every re-render, racing the runtime's 250ms diagnostics publisher. The runtime now solely owns that attribute (WorldPage no longer renders it), and the hook's `frames` return is documented as render-time-only.

### F7 — LOW (latent): `toColor` rejected legitimate semi-transparent whites
The white-failure check's exemption regex matched only opaque whites, so `rgba(255,255,255,0.5)` — a legitimate resolved token — fell back to the hardcoded default. Widened to alpha-carrying whites. (Latent: no house token currently uses it.)

### F8 — PROCESS: the review-preparation packet claimed in the prior session does not exist
The prior seat reported creating `outputs/REVIEW-PREPARATION.md`; no such file exists anywhere on the reachable filesystem (searched the main repo, the worktree, and parent roots). Recreated per protocol as `SWAN-BRAIN-CONSOLE-V3-REVIEW-PREPARATION-2026-09-15.md` in AI-HANDOFF (repo-root `outputs/` would also have violated the root-minimalism rule). **Treat any prior-session claim of that file as unfulfilled.**

### F9 — RULE 53 WORDING SWEEP: the withdrawn SwiftShader attribution survived in code comments
Round 2 recorded "the SwiftShader attribution is withdrawn… cause not established," but two file headers still taught the old story as fact (`gallery-verify.mjs`, `qa-worlds.tsx`) — the exact wording-class cluster rule 53 exists for, in the files future agents will read first. Both rewritten to the corrected attribution, with the "no control experiment has been run" caveat preserved.

### F10 — RULE 4 SELF-CATCH
This reviewer's first runtime.ts draft hit 353 lines and the fleet suite's line-cap test rejected it before any human saw it. Extraction per the codebase's own doctrine: `loop.ts` (frame loop factory), `worldBoot.ts` (canvas+renderer bootstrap), `attachContextLossListeners` into `contextLoss.ts`, `startDiagTimer` into `diagnostics.ts`. Final: 299 lines.

## 4. Round-4 evidence (re-run after all fixes)

| Check | Result |
|---|---|
| `tsc --noEmit -p tsconfig.three-worlds.json` (4GB heap) | 0 errors |
| `tsc --noEmit` full tree (14GB heap, local) | 0 errors |
| fleet contract (now 17 tests) | 17/17 |
| runtime contract (now 47 tests) | 47/47 |
| engine contract | 12/12 |
| `gallery-verify.mjs` (now 109 checks: +2 hand-off, +40 contrast/44px, +2 reduced-motion) | 109/109 |
| `console-verify.mjs` | 17/17 |
| rule 4 | max 299 lines (runtime.ts) |
| `npm run verify` (aggregate, cross-platform) | passes — see receipt §15 for the final run |

Measured house-rule numbers worth keeping: worst text contrast **8.72:1** (nav buttons) against the declared surface, smallest rendered control **44px** exactly, reduced-motion renders **0 canvases, 0 frames** with the poster present on v01 and v18.

## 5. Not done, named

- **No commit, no push.** The rule-46 Kimi K3 review is still owed and is Sean's paid-seat gate; nothing here should land before it.
- **Astra mega-blueprint pass** deliberately deferred to after this review, per Sean's sequencing — the upgrade/enhancement proposals live in the review-preparation packet for that pass to consume.
- Contrast is measured against the DECLARED surface, not every composited canvas pixel (the honest, stable part; the canvas-sample extension is proposed, not built).
- The hand-off rebuilds a world's context on re-entry (~tens of ms + shader compile); hysteresis makes this invisible at normal scroll, but it is a real cost by design — the alternative is holding 20 contexts, which is the crash.
- `VERIFIED_BLOCKED` remains unreachable by design (no engine probe exists); the console still honestly reports `DECLARED_BLOCKED`.

## 6. Review-chain status

Builder+reviewer this round: ZCode/GLM seat (dual pass, rule 17/61). Round-3 seats' verdicts consumed and dispositioned above. **Pending gates:** Kimi K3 (commit gate, Sean-authorized spend), Fable (Final Decider), Astra (mega-blueprint + enhancements). This verdict is ADVISORY to the Final Decider.
