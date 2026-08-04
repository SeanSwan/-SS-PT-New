# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs/ai-workflow/brainstorms/jarvis-coach-planner-superprompt-2026-07-31.md
**Seed:** docs/ai-workflow/AI-HANDOFF/JARVIS-VILLAGE-DIGEST-2026-07-31.md
**Tokens:** 14377 in / 2253 out · **Cost:** ~$0.0769 · **Wall:** 76.2s

---

# KIMI K3 — HOSTILE DESIGN + FRONT-END REVIEW

**(a) VERDICT: SHIP-WITH-CHANGES** — the brief itself is elite (ground-truth receipts, hard laws, slice discipline). But the Village's "consensus" design spec is where it rots: token discipline is violated in the very spec that mandates it, the signature moment is under-designed, and two "consensus" outputs are corrupted slop that must not reach a builder agent.

---

**(b) Design weaknesses, most-severe first**

1. **The Village spec hardcodes hex everywhere — instant rejection per house rules.** `background: #002060`, `border: 2px solid #4070C0`, `outline: 3px solid #60C0F0`, the entire `.btn-primary` block in the Gemini response — bare hex, zero `var(--token, #fallback)`. The 2C spec body does it right; the "Design Recommendations" appendix does it wrong on every rule. A builder agent (Codex) executing slice-by-slice will copy whichever block is nearest. **Strip or rewrite every bare-hex block before handoff; the lint rule (`no-hardcoded-colors`) must be `error`, not `warning` — "warning during transition" is how you ship a two-token-system codebase forever.**

2. **Missing signature moment.** This is Jarvis — the brand-defining surface — and the voice overlay spec is a waveform + state text. That's Tolan/Alan pastiche, not Swan. Nothing crystalline, nothing swan. The state ladder (listening→recognizing→thinking→speaking) is competently borrowed but has zero brand fingerprint. See (d).

3. **Flat, depthless surfaces.** Cards are `var(--graphite)` + `1px solid midnight-sapphire` — a near-invisible border (#002060 on #1A1A24 is ~1.1:1; it'll read as a smudge, not a boundary). No elevation system, no glass, no inner highlight. The spec even *names* "Omni-Glass `backdrop-filter: blur(12px)`" in the agreements table but never applies it to any of the four surfaces. The review sheet and voice overlay are the two highest-emotion surfaces and both are flat dark rectangles.

4. **Purple-on-purple confusion in the voice overlay.** The mic FAB is `wing-purple` bg with `arctic-cyan` glow (correct per Dual-Button Glow), but "Thinking" text is *also* wing-purple and the reduced-motion fallback circle is wing-purple with a pulse. Purple = Coach identity, fine — but using the same purple for the button, a state label, AND the static fallback erases state distinction. State color grammar needs one hue per state, and gold (#C6A84B) being reused for *both* "pain flag" and "error" and "failed" is a semantic collision — pain is a data flag, error is a system failure. Give error its own treatment (outline + icon, not the earned-gold hue).

5. **CTA hierarchy on mobile planner is muddy.** Builder/Exercises tab bar (48px, sticky bottom) + Coach FAB (56px, bottom: 72px) + Next-Best-Action in a 56px top nav + Generate somewhere in the builder. Four competing actions within thumb range. The FAB overlapping the tab bar zone by 72px will occlude the last builder card's actions — no safe-area-inset or scroll-padding-bottom is specified. That's the #1 mechanical defect a finisher will hit on day one.

6. **Style-switcher carousel: `flex: 0 0 80%` cards + pagination dots `aria-hidden="true"`.** Dots that are hidden from AT but convey position visually = a11y lie. Either make them real `role="tablist"` indicators or drop them. Also 80%-width cards at 320px = 256px card with a title + description + checkmark — cramped; 85% with 12px gap reads better and peeks the next card harder.

7. **Dead/noisy motion risk:** the "cosmicPulse" animated `border-image` gradient (3s infinite) is GPU-hostile (border-image animation repaints, doesn't composite) and was correctly flagged in-debate — but it's still *in the merged spec*. Kill it; a static 2px gradient border with a one-shot 600ms shimmer on state change is premium; an infinite pulsing border is a 2018 crypto dashboard.

**(c) Implementation-fidelity attacks**

- **Two consensus transcripts are corrupted.** The Architecture digest contains Nemotron's raw chain-of-thought ("But wait: the rules say… let me read the rule again…") for ~80 lines and never actually produces findings; the Security plan consensus is one paragraph of zero content. If this digest feeds Codex as context, it poisons the builder with meta-debate noise and fabricated agreement. **Clean the digest before any builder slice consumes it.**
- **Responsive math fails at 375/414:** Exercises tab spec = 56px search + horizontal chip rows + virtualized list — but the current Rolodex has FIVE chip filter rows. The spec says "horizontally scrollable filter chips" without saying whether five rows become one scrollable row, a "Filters" disclosure, or two rows. Unspecified = builder invents it = inconsistent. Also no spec for 768 landscape Rolodex-in-bottom-sheet vs 320px-column tablet mode conflict (375–1279 two-column says Rolodex is a 320px left rail; the Rolodex bottom-sheet spec from the debate says it's a drawer — which is it at 768?).
- **2560/3840:** `auto-fit minmax(320px, 1fr)` correctly flagged and fixed with the 12-col grid + `max-width: 1440px` — but the *planner desktop* spec caps nothing. ThreePanel at 3840 = 320px rolodex + ~3000px builder. Add `max-width: 1920px` + `margin: auto` to the planner shell.
- **44px targets:** Style cards' checkmark, tab bar 48px (ok), FAB 56px (ok) — but row-input editable cells in the review surface have no min-height specified; at 6px radius and transparent bg they'll render ~32px. Specify `min-height: 44px; padding: 8px 12px`.
- **Focus trap + nested interactives:** Voice overlay traps focus, contains a "Type instead" button that reveals a text input *inside* the same trap — fine — but the review sheet opens *from* the voice overlay: dialog-over-dialog. Spec names no z-index or focus-restore chain (overlay z-9999, FAB z-9000, sheet unspecified). Define the stack: FAB 9000 < overlay 9999 < review sheet 10000, with focus returning overlay→sheet→overlay.
- **Reduced-motion:** mostly covered and good (instant tab switch, keyboard DnD, static orb) — but the waveform's replacement is a "box-shadow pulse every 2s," which is *still animation*. Reduced-motion means static. Fixed circle, opacity-change-only state indicator (opacity is compositor-safe and vestibular-safe).
- **≤300 lines:** acknowledged via F-01/F-09 splits — good. Add the review surface and voice overlay as two files each (container + waveform/states) preemptively; waveform + state machine + fallback input in one file will blow 300 fast.
- **Styled-components vs `tokens.css` files:** the component tree shows `tokens.css` per component — that's a CSS-file pattern, not styled-components. Minor, but the tree contradicts the hard law's spirit; co-locate as `Component.styles.ts`.

**(d) THE one highest-impact change**

**Make the voice overlay's orb the Crystalline Swan signature: a faceted crystal swan-wing form, not a waveform.** Five vertical bars is what every voice app shipped in 2023. Replace with: a center orb built from layered `clip-path` crystal facets (two overlapping polygons, `transform: rotate/scale` only — GPU-safe), idle = slow facet shimmer via `opacity` crossfade between two pre-rendered gradient layers; listening = facets breathe outward 1.0→1.06 scale synced to mic amplitude (amplitude drives `scale`, one `requestAnimationFrame` writing a CSS custom property — zero React re-renders); speaking = facet rotation ±3°. Recognizing = facets collapse to a single horizontal line (matches the spec's "waveform compresses" beat, but it's *the crystal* collapsing — continuity of object, not a different widget per state). One object, four states, all transform/opacity, reduced-motion = static crystal with state text only. This is the screenshot Sean shows a prospect. A waveform is not.

**(e) What a design-savvy competitor out-builds here**

- **Amplitude-reactive anything.** The spec's waveform is a canned `0.8s ease-in-out infinite alternate` loop — it animates *whether or not you're speaking*. Competitors (and the real Jarvis fantasy) drive visuals off live mic amplitude. Fake motion is instantly readable as fake to anyone who's used ChatGPT voice mode. The custom-property scale trick above costs ~20 lines.
- **Interruption/barge-in visual.** §5A mandates barge-in but the spec has no visual for "user talked over the Coach" — speaking state needs a kill transition (facets snap to listening in 150ms, not a crossfade).
- **Haptics.** Mid-session, gloved/sweaty, eyes-busy: `navigator.vibrate(10)` on state transitions (logged-confirmation double-pulse) is the premium tell on the exact device this is for. Spec is silent on it.
- **The review surface's confidence rendering.** Parser emits per-field confidence — spec shows a generic gold error row. Competitor renders low-confidence *fields* tinted at the input level (lavender border = confident, gold border = verify me), so the trainer's eye goes straight to the one misheard weight. That's the trust feature; the current spec buries it.

**Fix order:** (1) purge corrupted consensus + bare-hex blocks, (2) crystal-orb signature, (3) z-index/focus-stack + safe-area math, (4) per-field confidence in the review sheet. Then ship slices.
