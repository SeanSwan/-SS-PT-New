# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** <HOME>\AppData\Local\Temp\claude\<SCRATCH-KEY>\5ee4c5b4-4b1c-41c6-ad8f-580ad41df9e6\scratchpad\kimi-blueprints-cosign-consult.md
**Seed:** C:\tmp\ss-arcb-batch1-20260722\docs\ai-workflow\AI-HANDOFF\ELEGANCE-BLUEPRINT-ARC-L-LOGGER-2026-07-22.md
**Tokens:** 2856 in / 5747 out · **Cost:** ~$0.0948 · **Wall:** 237.9s

---

# KIMI K3 — HOSTILE DESIGN + FRONT-END REVIEW
## Arc L (Logger) + Arc C (Charts) Elegance Blueprints

---

## (a) VERDICT

**SHIP-WITH-CHANGES** — both blueprints are structurally executable, but Arc L ships a premium *plumbing* job with zero *premium surface*, and Arc C's drill container will read as a generic analytics add-on unless the deltas below land verbatim. Neither is a send-back; both are one missed-motion-spec away from feeling like Hevy-with-a-dark-theme.

---

## (b) Design weaknesses, most-severe first

**1. No signature moment anywhere (Arc L — fatal to "best it can possibly be").**
The mandate is Mobbin 1.1 *full contract*, and the highest-frequency interaction in the entire app — ghost-tap-accept — is spec'd as "tap → inputs filled." Nothing. No transition, no brand flash, no sound/haptic decision. A cheaper worker will implement an instantaneous value swap and the single most-repeated gesture in the logger will feel like a form autofill from 2014. The rest-timer "ambient pulse" is the only atmosphere in the whole arc and it's the *least* important surface. This is backwards.

**2. "Tap to use" is cheap SaaS microcopy at an unreadable size.**
0.72rem Sora in `--text-secondary` is ~11.5px — below my 12px floor for anything interactive-adjacent, and small text has the *same* 4.5:1 obligation as body text. Worse, the copy is template-grade. This is the brand's core loop — last session vs. this session — and the affordance says "Tap to use" like a settings page. It should carry the competitive frame: ghost rows are the *opponent*.

**3. Hierarchy collision: L1 turns metadata into a button.**
Today GhostDataRow is whisper-quiet context. Slapping `role=button` + full-width 44px on it makes a *secondary* action compete with the Log Set CTA — the actual primary. Two full-width tappable rows stacked per exercise card = ambiguous CTA priority on 320px. The blueprint never resolves which element owns the visual apex of the card. (Resolution: ghost row stays visually subordinate — dashed/hairline crystalline border, no fill; Log button keeps the only solid/glow treatment. And yes — **the Dual-Button Glow law is never invoked in either blueprint**. The keypad's Done and the drill sheet's primary CTA will get styled flat by a worker unless the law is quoted at them.)

**4. The keypad is visually under-specified to the point of being unbuildable-with-taste.**
One line of visual spec: "Graphite surface + scale feedback." Nothing about numeral typography (digits should be a display face, not body Sora), key separation strategy (gaps vs. hairlines — gaps, 8px, with glass keys), pressed-state color, Done-button treatment, or the sheet's top-handle/title composition. A worker will ship a flat gray calculator grid — calculator-core, the exact generic feel we're supposed to be killing. Also: "Graphite `var(--surface-dark, #1A1A24)`" — the word *Graphite* smells like a legacy token alias. Verify that token name exists in the Crystalline registry; if the worker invents it, we've got a hardcode in a trench coat.

**5. Arc C: 9 charts wired "chart-by-chart" is a template-feel factory.**
The blueprint mandates ONE shared drill system, then describes wiring it nine times with per-chart copy. What it does *not* specify is the drill sheet's **layout contract** — the slots every chart fills identically (hero metric → sparkline/context → WHY copy → data table → CTA). Without that, you get nine sheets that are 80% the same and 20% drifted, which is worse than nine different ones: it reads as a component library demo, not a designed system.

**6. Rest-timer aria-live at 30/10/0 is fine, but the pulse is spec'd as a border pulse — flat-depthless risk.**
A border-color pulse on a dark surface at low luminance is nearly invisible *or* garish; there's no middle. Specify it as a `box-shadow`/`filter: drop-shadow` glow on a `transform: scale` ring, opacity-only keyframes, GPU-safe. And under reduced-motion, "static ring + text" is correct — good — but say the ring uses the countdown *progress* (a conic ring that depletes) so even the static version carries information.

---

## (c) Implementation-fidelity attacks

- **Focus management is the biggest hole in L2.** Portal bottom sheet with no focus-trap spec, no return-focus spec, and on Done we *deliberately move focus* to the next field. That's three WCAG 2.4.3 / focus-order decisions a worker must invent. Spec: trap inside sheet while open; on Done → `focus()` next field + `aria-live` polite announcement of the move ("Weight saved — reps"); on Esc/backdrop → return focus to the invoking input.
- **Backdrop-tap discards typed digits.** "Esc/backdrop closes without commit" means an accidental scrim tap destroys entered work with zero recovery. Either commit-if-dirty on close or an explicit dirty-guard. A worker *will* ask.
- **`inputMode="none"` + `readOnly` is a real SR hazard** (see Q1) — and `readOnly` inputs are announced as "dimmed" by some SRs, which miscommunicates editability on a *logger*. The escape hatch isn't optional.
- **Auto-advance into the RPE slider is an over-automation trap.** Moving focus onto a slider on mobile drops the user into an arrow-key/drag interaction they didn't request, mid-flow, with the keypad now closed. If the RPE row is visible, *scroll it into view and announce it* — don't steal focus. Auto-focus only weight→reps; RPE and Log are user-initiated.
- **48px keys ✓, 44px everywhere ✓** — but `victoryDrillEvents` "enlarged hit areas" on dense charts: 44px hit targets on adjacent data points *will overlap* on 320px (9 charts, some with 30+ points). Spec a min-separation rule and a collision behavior (nearest-point-wins within radius), or the drill is untappable precisely where the data is richest.
- **±2.5 steppers on the keypad are misplaced.** Steppers belong on the field chrome; on a keypad they're redundant with digits and eat two key slots. Kill them, give the slots to a `←` backspace and a quick-chip row of *last session's value* (which reinforces the ghost narrative).
- **Responsive matrix:** nothing addresses 320px logger row density (weight input + reps input + RPE slider + Log in one card), landscape phones (a bottom sheet at 100vh-landscape = full-screen modal — cap at 70dvh + internal scroll), `safe-area-inset-bottom` for the home indicator (Done sits at the screen bottom — without the inset it's a 44px target clipped to 28px effective), or 2560/3840 for Arc C (side panel needs a max-width ~420px or it becomes a billboard).
- **≤300 lines:** `ExerciseHistoryChart` at 473ln with "net ≤+20 via imports only" — the worker must decide *what to extract*. That's a re-decision, i.e., a blueprint defect. Name the extraction (move drill wiring into a sibling hook file, leave render intact).
- **Invalid DOM watch:** L1 converts a display row to `<button>` — verify GhostDataRow isn't currently rendered inside any other interactive wrapper in the trainer card, or you've got nested-interactive. And ChartDataTable row-buttons must be `<button>` inside `<td>`, never `<tr onClick>`.
- **L4 is the cleanest slice** — chip-over-error-wall is correct, on-brand, and the only place the blueprint already sounds like us.

---

## (d) THE one highest-impact change

**Make ghost-tap-accept the signature crystalline moment.** It's the highest-frequency gesture in the product and the emotional core of the brand — *you versus last you*. Spec it verbatim:

> On accept: ghost values flow into the inputs with a 300ms count-up (weight/reps numerals tick from current → ghost value), the row flashes a cyan→purple gradient sweep along its hairline border (`background-position` / `opacity` keyframes only, GPU-safe), a subtle haptic tick on coarse pointers, and the affordance copy changes from "Tap to use" to **"Beat this — 135 × 10"** (icon + label, 0.8rem minimum). Under `prefers-reduced-motion`: instant fill, border state change only. Zero motion decisions left to the worker.

One gesture, and every client *feels* the product's thesis dozens of times per session. That's what Hevy and Strong don't have — their repeat-set is a button; ours is a challenge. Everything else in both arcs is competence; this is identity.

---

## (e) What a design-savvy competitor out-builds here

- **Swipe-to-accept** on the ghost row (Hevy's gesture language) — tap is one gesture, but swipe-right-to-accept with a reveal-under animation is *zero-aim* one gesture, and it photographs better in App Store screenshots.
- **Quick-chips above the keypad** — last value, +2.5, round-number presets — so common commits are one tap, not four.
- **A rest timer that behaves like a Live Activity** — depleting conic ring visible from anywhere in the logger, not a floating widget you hunt for.
- **Cross-linked drill-downs** — tap an e1RM point → the panel lists the *contributing sets inline* with a jump-link back into the logger session. Our Arc C panel, as spec'd, is a dead-end read-only summary. That's the gap a competitor exploits: our drill *informs*, theirs *connects*.
- **Haptic vocabulary** — we spec one haptic nowhere in either arc; best-in-class fitness apps have a whole haptic register (key tick, commit thud, timer-end pulse).

---

## Answers to the six questions

**Q1 — AGREE-WITH-CHANGES.**
1. `inputMode="none"` + `readOnly` ships, but the sheet MUST contain a "Use system keyboard" tertiary button (44px) that flips the field to native input for that session — VoiceOver/TalkBack users on coarse pointers are a real population, and `readOnly` announces as "dimmed," falsely signaling the field is locked.
2. Auto-advance is cut from 3 hops to 1: weight→reps auto-focus only. RPE gets scroll-into-view + polite announcement, never focus theft; Log is always user-initiated.
3. Backdrop/Esc on a dirty field commits, doesn't discard (or dirty-guards — pick one, worker doesn't).

**Q2 — AGREE-WITH-CHANGES.**
1. Ship the ±15/Skip buttons this arc — non-negotiable, they're the 90% case.
2. Voice ships this arc too, but NOT as new FRONTEND_DISPATCH registry surface: add `rest_skip`/`rest_adjust` as two intents in the *existing* Coach dictation parser that already handles "Added Goblet Squat — 3×12". A parallel registry for two commands is duplicate ack-contract surface and a second place where voice can silently rot.

**Q3 — AGREE-WITH-CHANGES.**
1. Bottom sheet <768px; **persistent side panel ≥768px** (not 1024 — tablets deserve it), max-width 420px, layout-pushing not overlaying at ≥1440, overlaying with scrim 768–1439.
2. Kill sheet-per-datum tap fatigue with **selection-driven persistence**: the panel/sheet never closes between points — tapping point B while viewing point A *swaps content in place* (crossfade, 150ms opacity). Close is explicit only. This is the single biggest UX correction to Arc C.
3. Inline expansion under the card: rejected — it shoves sibling charts down and breaks scroll position; panel wins.

**Q4 — Register guidance:** plain-language first sentence (what it is, why you care), technical second tier behind "How it's calculated." No jargon in tier one; numbers always framed as *you vs. you*.
1. e1RM: *"Your estimated one-rep max — the heaviest you could lift once, today, based on your recent work. Watch it climb."*
2. RecoverySignalBars: *"How ready your body is to train hard. Tall bars mean go; short bars mean today is a stretching-and-technique day."*

**Q5 — Blueprint defects (worker questions), named:**
1. Which fields pass `allowDecimal` (weight yes, reps no — never stated).
2. Done with an empty field: commit 0, reject, or revert? Unspecified.
3. L1 vs. `useGhostPreFill` conflict — both target set 0; does tap-accept overwrite prefilled values without confirm?
4. Keypad safe-area-inset-bottom, landscape max-height, portal root id, focus trap — all unspecified.
5. Arc C: panel width, 768–1023 behavior, WHY_COPY max length, chart empty-states (<2 points), and the *exact copy + destination* of the "honest CTA line" on aggregate-only charts.
6. ExerciseHistoryChart: which 473 lines get extracted to hit net ≤+20.

**Q6 — Lens-law seams where a worker breaks reactivity:**
1. **The big one:** Victory needs JS color values, not CSS classes. A worker will write `const palette = lensChartPalette()` at **module scope** → theme frozen at import. Law: palette resolution happens inside the component body or a `useMemo` keyed on lens version, or `fill: 'var(--accent, #fallback)'` passed straight through Victory's style prop (inline-style var() works in SVG) — never a resolved-at-import hex.
2. `React.memo` on chart wrappers: if colors are resolved in JS from a context/store, a memo that ignores the lens version blocks re-theme. Memo deps must include the lens token version.
3. Arc L's keypad: the `var(--surface-dark, #1A1A24)` fallback — confirm `#1A1A24` is the **Crystalline** surface fallback, not a Galaxy-adjacent value that slipped through; and confirm `--surface-dark` is a registered lens token. Any keyframe/gradient authored in a JS template literal with a captured color value has the same freezing bug — gradient stops must be var() references or re-derived per theme change.
4. ChartDataTable row-buttons: styled-components + tokens is safe; the risk is a worker "optimizing" by reading `getComputedStyle` once into a JS constant for row striping. Ban it explicitly.

---

**Bottom line:** both arcs are 85% worker-proof. The missing 15% is exactly the 15% a user can see: the accept moment, the keypad's face, the drill panel's layout contract, and the Dual-Button Glow law quoted where CTAs get built. Land the deltas and I'll co-sign.
