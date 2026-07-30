# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/RUNNER-STYLES-DESIGN-BRIEF-2026-07-30.md
**Seed:** (none)
**Tokens:** 1960 in / 5394 out | **Cost:** ~$0.0868 | **Wall:** 224.6s

---

# KIMI K3 — HOSTILE REVIEW: Session Runner 10-Skin Brief

**Verdict up front:** The architecture law (one engine, ten skins) is correct. The execution plan as written will drown you. You are speccing 10 motion-first signatures with zero contract for the things that actually break in production: backgrounded timers, undo, offline, a11y announcements, and a conformance harness. Ten skins × 8 breakpoints × reduced-motion × world palettes is not a design system — it's a QA avalanche with a branding problem.

---

## 1. Weaknesses, Ranked by Severity

| # | Sev | Weakness |
|---|-----|----------|
| W1 | **S1** | **Contract is missing production-critical state.** No undo, no offline/sync status, no timestamp-based rest timer, no announcer channel, no sheet-stack manager, no keypad input buffer. Every gap forces a skin-level hack — which violates your own architecture law on day one. |
| W2 | **S1** | **No skin-conformance harness.** "Flawlessly, ten skins" with zero automated enforcement mechanism. Without a fixture-driven contract suite, skins 4–10 will silently rot every time the engine changes. |
| W3 | **S2** | **State colors already lie, in your own brief.** Stadium HUD's "PR sirens in gold" collides with `logged = earned gold`. You wrote "no skin may make a state color lie" and then specced a skin that does. Also: `pending = dim Frost` will fail 4.5:1 the moment "dim" means <70% opacity on deep navy, and color-only state violates WCAG 1.4.1 regardless of contrast. |
| W4 | **S2** | **Every signature is motion.** Pulse, particles, parallax, ring-snap, scrolling now-line, waveform. "Reduced-motion variant per skin" is one sentence with no defined static fallback per signature. World Immersion parallax is a vestibular risk (WCAG 2.3.3-adjacent) and its glass cards over world media will fail contrast without a mandated scrim token. |
| W5 | **S2** | **iPhone-X keypad reality is unaddressed.** With the L2 numeric sheet open, viewport height on an 812px device collapses to ~400px. Focus Flow's card, Split Zen's viewport-width numerals, and Command Deck's NOW hero all blow out. No skin spec mentions keypad-open layout. |
| W6 | **S2** | **Rest timer as specced will die in the gym.** iOS throttles `setInterval` in background; a tick-based timer drifts or stalls when the user checks a text mid-rest. The contract says "rest timer (running/skip/±15s)" — no `endAt` timestamp, no `visibilitychange` reconciliation, no Live Activity handoff. This is the single most gym-critical piece of behavior and it's one line. |
| W7 | **S3** | **Duplication.** Focus Flow, Command Deck (mobile), and Split Zen are three skins solving "one thing at a time." Ring Runner and Timeline Pulse are both progress-visualization gimmicks. World Immersion isn't a runner idiom at all — it's a backdrop setting that belongs in Lens world recipes, not the skin slot. |
| W8 | **S3** | **Victory is mandated and never mentioned.** Ring Runner's rings, session volume, elapsed stats — no chart spec. Left alone, builders will hand-roll SVG rings (untested, unanimated under reduced-motion, duplicated ×10) instead of `VictoryPie`. |
| W9 | **S3** | **No file/bundle budgets.** 300-line cap × 10 skins with no mandated folder anatomy means inconsistent decomposition. No per-skin gzip budget means World Immersion ships 2MB of parallax media to a gym with one bar of signal. |
| W10 | **S3** | **Stadium HUD is a tone and safety problem.** A combo meter on consecutive logged sets financially incentivizes rushing between sets in a product with safety gates and pain check-ins. That's not gamification; that's a liability wearing Sora type. |

---

## 2. Single Highest-Impact Improvement

**Freeze an extended engine contract + build the skin-conformance harness before a single skin is styled.**

Every S1/S2 weakness traces to the contract being under-specified. If the contract is complete and the harness enforces it, ten skins is ambitious. Without them, ten skins is ten forks.

---

## 3. Builder-Exact Corrections

### 3.1 Contract additions (blocking — add all before skin work)

```ts
// useSessionRunner — required additions
{
  undoLogSet: (setId: string) => void;          // snackbar, 5s window
  syncStatus: 'saved' | 'pending' | 'offline' | 'error';
  rest: { endAt: number | null; remainingMs: number }; // NEVER ticks
  keypadBuffer: string;                          // partial input "13."
  announce: (msg: string, priority: 'polite'|'assertive') => void; // aria-live
  sheetStack: { push(id, opts), pop(id), topId };// one z-index/modal owner
  reorderExercise: (id, toIndex) => void;
  pauseSession / resumeSession;
  validation: Record<setId, string | null>;
  units: 'lb'|'kg'; incrementPrefs: Record<liftType, number>;
}
```

Rest timer implementation (mandatory pattern):

```ts
// engine — timestamp-based, survives backgrounding
const startRest = (seconds: number) =>
  setRest({ endAt: Date.now() + seconds * 1000 });

useEffect(() => {
  const sync = () => setRest(r => r.endAt
    ? { ...r, remainingMs: Math.max(0, r.endAt - Date.now()) } : r);
  document.addEventListener('visibilitychange', sync);
  return () => document.removeEventListener('visibilitychange', sync);
}, []);
```

### 3.2 State tokens (fix W3)

```ts
// theme/tokens.ts — states must be color + non-color, never dim-below-contrast
export const runnerStates = {
  pending: { color: 'var(--swan-frost-100)', indicator: 'hollow-ring' },   // 100, not "dim"
  active:  { color: 'var(--world-accent)',   indicator: 'filled-outline' },
  logged:  { color: 'var(--swan-gold-400)',  indicator: 'checkmark' },
  coach:   { color: 'var(--swan-wing-purple-300)', indicator: 'sparkle' },
} as const;
```

Rules: every state ships a shape/icon indicator (WCAG 1.4.1); verify 4.5:1 against `--swan-navy-900` in CI via token-pair test, not by eye. **Stadium HUD PR siren moves to Wing Purple with a distinct icon. Gold is logged-state only. Non-negotiable.**

### 3.3 Reduced-motion fallbacks (per signature, defined now)

```ts
// Every skin exports this — the harness tests it
export const reducedMotionFallback = {
  FocusFlow:    'static Ice-Wing 2px outline, no pulse',
  RingRunner:   'ring fills instantly, no snap animation',
  WorldImmersion: 'parallax layers frozen (transform: none), particle → instant gold checkmark',
  TimelinePulse: 'now-line static, no scroll-hijack — EVER, motion or not',
  StadiumHUD:   'combo increments as instant numeral change',
};
```

Scroll-hijacking the now-line (Timeline Pulse) is cut in all modes — it breaks scroll position restoration on skin swap.

### 3.4 Victory mandate (fix W8)

```tsx
// Ring Runner rings
import { VictoryPie } from 'victory'; // subpath imports for tree-shaking
<VictoryPie data={ringData} innerRadius={88} padAngle={2}
  animate={reducedMotion ? false : { duration: 300 }}
  style={{ data: { fill: ({ datum }) => datum.logged
    ? 'var(--swan-gold-400)' : 'var(--swan-navy-600)' } }} />
// Session stats strip: VictoryBar for volume-by-exercise. No hand-rolled SVG charts. Anywhere.
```

### 3.5 Skin file anatomy (fix W9, ≤300 lines)

```
src/skins/<SkinName>/
  index.tsx            # contract binding only, ≤80 lines
  <SkinName>.styles.ts # styled-components, tokenized only, zero hex
  components/          # one presentational component per file
  reducedMotion.ts     # the fallback export the harness imports
```
Budget: **≤40KB gz per skin, lazy via `React.lazy`, prefetched on Lens-picker open.** World Immersion media: responsive `srcset`, `loading="lazy"`, hard cap 300KB total, and it must not block skin mount.

### 3.6 Conformance harness (fix W2 — the actual ship gate)

```
tests/skins/conformance/
  fixture.session.ts        # canonical 5-exercise session incl. edge cases
  contract.test.tsx         # every engine action renders & fires per skin
  a11y.test.tsx             # axe per skin; 44px audit via getBoundingClientRect
  breakpoints.test.ts       # 320/375/414/768/1024/1440/2560/3840 — top 3 skins CI, rest nightly
  reducedMotion.test.ts     # matchMedia mocked, assert fallback export honored
  keypadOpen.test.tsx       # viewport forced to 375×400, assert Log button in thumb zone
  swap.test.tsx             # mid-workout skin swap: state, scroll, focus all preserved
```
**A skin that fails the harness does not ship in the Lens picker. This is the entire QA strategy for "ten, flawlessly."**

### 3.7 iPhone-X floors (applies to all skins)

```css
padding-bottom: calc(env(safe-area-inset-bottom) + 8px);
```
- Primary Log action bottom-anchored, ≥44×44px (Steppers in Ladder Dense Pro rows ≥44px row height — dense tables are where 44px goes to die; the harness measures).
- No horizontal swipe within 20px of either screen edge (iOS swipe-back).
- Keypad open = active set auto-scrolled above sheet via `visualViewport` listener.
- Tabular numerals: `font-feature-settings: 'tnum'` on Fira Code; line-locked so "NOW: SET 2 OF 3" doesn't jitter at 1m glance.

---

## 4. Consultant Questions — Answered, Ranked

**Q1 — Attack the 10:**
1. **Cut Stadium HUD** (W3 + W10: gold lie, rush incentive, tone). If gamification survives review, it's PR celebration only, Wing Purple, post-save — not mid-set.
2. **Merge Focus Flow + Command Deck mobile + Split Zen → "Focus Deck"**: one-card deck, swipe with edge-inset, tap-hold enters Zen glance mode (giant weight×reps pair) as a *mode*, not a skin.
3. **Cut World Immersion as a skin.** It's a backdrop; fold parallax atmosphere into Lens world recipes so *any* skin can float on it. Keeps the magic, kills a duplicate.
4. **Cut Timeline Pulse** (scroll-hijack + weakest idiom). Rings survive in Ring Runner.
5. **Result: 6 skins** — Focus Deck, Command Deck (desktop-first), Ladder Dense Pro, Coach Voice-First, Ring Runner, Sheet Stack. Ship 3 at launch, flag the rest.

**Q2 — Top 3 for iPhone-X one-hand:**
1. **Sheet Stack** — true iOS mental model, everything in thumb arc, reuses the existing L2 keypad sheet idiom. **← DEFAULT.**
2. **Coach Voice-First** — sweaty-thumb-proof; dictation beats typing with chalk on your hands.
3. **Focus Deck** — best glanceable NOW state; Zen mode is the between-sets killer feature.

**Q3 — Contract gaps:** See §3.1. The ones that would *force* skin hacks first: `announce()` (every skin needs aria-live for set-logged), `sheetStack` (ten skins × modal z-index = war), `keypadBuffer`, timestamp-based `rest`, `undoLogSet`, `syncStatus`.

**Q4 — Architecture risks + mandated mitigations:**
1. **State loss on swap** → engine mounted above skin boundary; skin swap is a `React.lazy` child swap only; swap.test.tsx asserts state/scroll/focus survive.
2. **Focus/a11y on swap** → FocusScope; after swap, focus moves to the semantically equivalent control (active set's Log button) + `announce('Style changed to Focus Deck', 'polite')`.
3. **Bundle cost** → ≤40KB gz/skin enforced in CI, shared `skin-primitives` package (SetRow, Stepper, GhostChip) so styled code isn't duplicated ×10, prefetch on picker intent.
4. **Test explosion** → the conformance harness (§3.6) is the mitigation; full breakpoint matrix in CI for the default + top 2 only, others nightly.

**Q5 — iPhone-X traps per top 3:**
- **Sheet Stack:** lowest detent collides with home indicator (mandate `env(safe-area-inset-bottom)` padding); swipe-to-dismiss gesture conflicts with sheet scroll — restrict dismiss to grabber only; sheet must never cover the set it edits.
- **Coach Voice-First:** mic strip must pin via `visualViewport` when the keyboard opens or it slides under; waveform is transform/opacity only (GPU-safe) and freezes under reduced-motion; mic strip min 44px, never in the bottom 8px.
- **Focus Deck:** horizontal swipe within 20px of edges triggers iOS back — inset peek edges; with keypad open (375×~400 effective), the hero numerals + Log button must both stay visible — this is an explicit harness test, not a hope.

**Q6 — The missing 11th:** **Lock-Screen Runner** — the rest timer and "SET 2 OF 3 · 135×8" as an iOS Live Activity / Dynamic Island surface, fed by the same timestamp-based `rest.endAt`. This is the real between-sets glance: screen off, phone on the bench, countdown visible at arm's length without unlocking. It's why the timestamp timer (W6) matters doubly — Live Activity *requires* an end-time model. Ship it as the first engine consumer that isn't a skin, and it validates the entire contract.

---

**Bottom line:** Fix the contract (§3.1), build the harness (§3.6), ship Sheet Stack + Coach Voice-First + Focus Deck, flag the rest. Ten skins is a marketing line; a conformance-tested engine with three flawless skins is a product.
