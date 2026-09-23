# VERIFICATION NOTES — read this FIRST

**Package:** `BLUEPRINT-cinematic-frontend-2026-09-19`
**Consult:** `gpt-6-astra` over the ChatGPT subscription (Codex CLI transport) · 634.8s ·
346,604 in / 19,974 out · exit 0
**Adjudicated by:** Sable (WorkBuddy / deepseek-v4.1-flash) · 2026-09-19
**Reply:** `ASTRA-REPLY.md` · **split:** 12 files, exit 0

---

## 0. Run identity — NOT fully verified

`ASTRA-REPLY.meta.json` records:

```json
{ "model": "gpt-6-astra", "servedModel": null, "provider": "openai-codex",
  "billing": "chatgpt-subscription", "authMode": "chatgpt_subscription",
  "transport": "codex-cli", "megaBlueprint": true, "megaBlueprintArmedBy": ["document"] }
```

Transport, billing, auth mode and the **requested** model are all provable.
**`servedModel` is `null`.** Per the consult skill §8.4 this run must be recorded as
**"requested `gpt-6-astra`, served identity unverified."** Do not treat the requested model as
the served one. Listed under §4 Unproven below.

Reasoning effort: isolated `CODEX_HOME=C:\tmp\codex-xhigh` at `model_reasoning_effort = "xhigh"`.
The global `~/.codex/config.toml` was **not** edited (it still reads `low`). Acceptance and
application of `xhigh` were probed before the run: 204 reasoning tokens on a 264-token reply.

## 0.1 The reviewer could not see the repo

The reply states plainly: *"Local read commands were rejected by execution policy."* Its
`[VERIFIED]` tag therefore means **"supported by the excerpt I was given"** — NOT independently
verified against the working tree. Every finding below was re-checked by me against the real
files. This is the expected shape for a repo-blind reviewer and Astra was honest about it.

**This package is INSTRUCTIONS, not merely architecture** — with the exceptions listed in §3.

---

## 1. Adjudication — A1 findings

| ID | Astra's claim | Verdict | Evidence / correction |
|---|---|---|---|
| **A1-01** | Capability policy has no single implementation contract | **CONFIRMED** | Matches my packet §6.1. Three vocabularies verified: `motion.md` §3 `full/lean/reduced`; `useAnimationTier.ts` `full/balanced/essential`; `PerformanceTierProvider.tsx` `enhanced/standard/minimal`. Astra's fix — provider becomes sole detector, `useAnimationTier` becomes a consumer adapter — is adopted. |
| **A1-02** | "In the same file" conflicts with the shared-hook architecture + 300-line cap | **CONFIRMED** | My packet §6.9 raised the contradiction; Astra supplies the resolution I lacked: *surface-local fallback ownership over one shared capability source.* Better than my framing. Adopted. |
| **A1-03** | Tokens named but implementation and unit conversion unspecified | **CONFIRMED** | Matches §6.3 (0 occurrences of `--motion-*` / `--ease-*` in `src/`). Adopted, including its restraint: adopt only in changed components + real helper consumers, not repo-wide. |
| **A1-04** | Shared stagger is 100ms, exceeding the 80ms ceiling | **CONFIRMED** | `motion-helpers.tsx:125` `staggerChildren: 0.1`. Astra adds a distinction I **missed**: stagger compliance ≠ concurrency compliance. `motion.md` §7 imposes a ≤80ms stagger ceiling *and* a ≤3-simultaneously-animating-elements cap; satisfying one does not satisfy the other. Genuine insight. |
| **A1-05** | The reduced-motion gate does not by itself enforce the static outcome | **CONFIRMED — new finding I missed** | `motion.md` §3 says reduced motion must yield a *static poster*; `cinematic-pages.md` §7 says the static composition preserves all content and CTAs. Framer's `MotionConfig reducedMotion` disables transform/layout animation but **permits opacity animation**. So a surface can satisfy the letter of the JS gate and still animate, violating the doctrine's intent. The doctrine as written is under-specified. Astra cited primary docs. **Highest-value new finding in the review.** |
| **A1-06** | The claimed 390-consumer blast radius is unsupported | **CONFIRMED AGAINST MY PACKET — and worse than stated** | Verified directly: **`motion-helpers.tsx` has ZERO importers.** Not one file in `src/` imports it. My §3.3/§5 claim that "390 files inherit it" counted imports of `framer-motion`, not imports of the helper. Consequence: my packet defects **§6.4, §6.5, §6.6, §6.7 are findings about DEAD CODE** — literally true, but with **zero runtime blast radius**. They are delete-or-revive decisions, not urgent fixes. Astra's fix (inventory actual consumers; do not claim a helper fix secures every Framer consumer) is adopted. See §2. |
| **A1-07** | `withMotion` forwards props without creating a motion component | **CONFIRMED but MOOT** | My §6.6 is correct on the code (`motion-helpers.tsx:153-160`). Given A1-06, there are no callers to inspect. Astra's caution — *do not delete a public export during this workstream* — still applies. |
| **A1-08** | GSAP cleanup ownership is missing; **actual leakage not proven** | **MY FINDING REFUTED IN PART** | I read `PremiumParallax.tsx:466-580`. The GSAP effect **does** clean up: `card.removeEventListener` for both handlers at lines 549-552. My §6.8 claim that the component "leaks ScrollTriggers" was **WRONG** — it never creates one. `ScrollTrigger` is imported (line 6) and registered (line 14) but **never used**: no `ScrollTrigger.create()`, no `scrollTrigger:` property anywhere. Astra's downgrade to `[HYPOTHESIS]` was correct and its slice A6 ("reproduce and fix") honours that. **Real, smaller defects found instead:** (a) `ScrollTrigger` import + module-scope `registerPlugin` are dead weight; (b) the particle effect at lines 472-516 appends 50 DOM nodes with **no cleanup function**, so React 18/19 StrictMode double-invoke yields 100 particles on mount. |
| **A1-09** | The 8–14 viewport-height prescription lacks an accessibility/content exception | **CONFIRMED — new** | `website-archetypes.md` #2 states the range flatly with no exception. Astra's guard (never force page height, clipping, spacer panels, or fixed mobile text containers to satisfy it) is a legitimate doctrine gap. Adopted. |
| **A1-10** | Perf thresholds lack reproducible measurement conditions | **CONFIRMED — new** | `cinematic-pages.md` §7's `<3ms/frame` specifies no renderer, hardware, sampling, or CPU-vs-GPU basis. Astra's line — *"a 60fps observation is not evidence of a 3ms scene cost"* — is correct. Adopted. |
| **A1-11** | R3F is a React-version dependency absent from the six-item migration table | **CONFIRMED — real gap in my packet** | Verified: `@react-three/fiber@8.18.0` peers `react >=18 <19`; `9.7.0` peers `^19.0.0`. My §5.1 table lists only *installed* blockers, so R3F is absent — but it is a forthcoming dependency. Astra's fix (pin R3F 8 for Workstream A; move React, DOM, types, R3F and Leaflet together in Stage 2) is adopted. |
| **A1-12** | Occurrence counts are presented as migration work counts | **CONFIRMED AGAINST MY PACKET** | Correct. My "162 type hits" was a **sum of regex matches across three overlapping categories**, not a count of files needing edits. A `useRef` occurrence does not prove a missing argument. Astra's fix — build the manifest from `tsc` diagnostics and resolved peer metadata, require both type-check and runtime caller tests — is adopted. My packet did label these "hits" not "files", but the manifest must come from the compiler. |
| **A1-13** | Replacing `framer-motion` with `motion` is not merely a version pin | **CONFIRMED — Astra's alternative VERIFIED BETTER than my plan** | Verified: **`framer-motion@11.18.2` peers `^18.0.0 \|\| ^19.0.0`.** So a dual-compatible `framer-motion` release exists, and Astra's recommendation to keep the package name and import paths is **verified correct**. My packet's Stage-1 proposal to move to `motion@13.4.0` would have forced a package rename plus import churn across **390 files** for **zero React-19 benefit**. Astra's fix is strictly better and is adopted. |
| **A1-14** | Canonical surface receipt is incomplete | **CONFIRMED** | My §2 gave `main-routes.tsx:58-61` and `:319` but omitted the surrounding route declaration, the hero CTA handler, the `OrientationForm` API, and any backend match. Astra correctly refuses to invent an orientation endpoint or form schema. Adopted — intake must capture the CTA chain. |
| **A1-15** | Existing wireframes and runnable test plans were not supplied; the higher-authority cinematic doc not supplied in full | **CONFIRMED** | My §4 supplied doctrine *excerpts*. `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (which **outranks** `design.md` per its own authority chain) was not supplied at all, nor were any existing wireframes. Astra correctly declines to claim it reviewed unseen documents. This is the consult skill §4 lesson landing exactly as documented: send excerpts, get honest `[UNVERIFIED]` labels; send names, get a conditional reply. |

## 2. Corrections to my own packet (self-inflicted, recorded not buried)

Two findings in the packet I sent were **overstated**, and Astra caught both. Both are corrected
above and the packet on disk carries an appended correction.

1. **§6.8 GSAP leak — REFUTED.** I inferred leakage from the absence of `gsap.context()` in a
   grep. Reading the file showed the listeners are cleaned up and no ScrollTrigger is ever
   created. I stated a conclusion from a truncated grep instead of reading the code. The real
   defects are an unused `ScrollTrigger` import and a StrictMode-unsafe particle effect.
2. **§3.3/§5 "390 files inherit motion-helpers" — FALSE.** Zero importers. I counted the wrong
   thing (imports of `framer-motion`) and attributed the count to the helper. Four packet
   defects (§6.4–§6.7) consequently describe dead code.

Net effect on the plan: **four of nine packet defects drop in priority from "fix now" to
"delete or revive"**, and slice A5 ("helper repair") collapses to near-trivial. The package's
slice ordering survives this, because Astra scoped A5 to *"actual callers only"*.

## 3. Adjudication — A2 findings (the self-review pass)

A2-01…A2-08 each name a draft defect and the correction incorporated. Spot-checked against the
emitted `05-slices.md` and `09-tests.md`:

- A2-01 (poster beneath scene, error boundary, context-loss fallback) → consistent with slice A9.
- A2-03 (adapters, ≤8-file batches, final sweep) → consistent with slices A3.n and B1b/B2a.
- A2-05 (rendered-scene assertion, CPU+GPU, inconclusive on missing instrumentation) →
  consistent with slice A11's "no waived thresholds disguised as passes".
- A2-07 (freeze exact resolved versions; confine unavailable-version blockers to B) →
  consistent with slice B1a and B2b.
- A2-08 (scoped rollback, never reset the shared tree) → consistent with slice B2c.

**Verified: the A2 pass visibly changed the package** — the mandate requires this, and the
slices carry the corrections rather than the draft. A2 ran.

## 4. UNPROVEN — do not build on these

1. **Served model identity.** `servedModel: null`. Requested `gpt-6-astra`; identity unverified.
2. **A1-05 runtime behaviour.** Framer's `reducedMotion` opacity-permissiveness is asserted from
   primary docs, not reproduced in this repo. Confirm with a runtime fixture before relying on it.
3. **A1-08's remaining hypothesis.** Whether `PremiumParallax`'s unused `ScrollTrigger`
   registration costs measurable bundle/runtime weight is untested.
4. **A1-10's perf budget.** No measurement apparatus exists yet; `<3ms/frame` remains undefined.
5. **A1-12's real type surface.** The compiler-derived manifest does not exist. The true count of
   files needing edits for React 19 is **unknown** — only regex occurrence counts exist, and they
   overstate.
6. **A1-14's CTA chain.** The hero handler and `OrientationForm` API were not read. Slice A0 must
   capture them.

## 5. Verdict

**Package state: INSTRUCTIONS — usable, with the corrections in §2 applied.**

Astra's three headline decisions are all adopted and all survive verification:

1. **One capability authority** — `PerformanceTierProvider` is the detector; canonical
   vocabulary `full / lean / reduced`; `useAnimationTier` becomes a consumer adapter. This
   resolves the collision I identified but did not solve.
2. **One signature moment** — a single SwanMark reveal, static Act 1 complete without it.
3. **React 19 stays a separate migration** with its own rollback, and Workstream A stays on
   React 18 with a verified R3F 8 pin.

The strongest single improvement over my packet: **keeping `framer-motion` at a dual-compatible
release instead of renaming to `motion`** — verified correct, and it removes 390 files of
avoidable churn from the plan.

**Do not proceed past slice A0 without the intake receipt** — six of the sixteen A1 findings
trace to evidence that was missing from my packet, not to defects in the repo.
