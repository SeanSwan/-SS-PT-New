<!-- GENERATED from website-archetypes.md @ 4fb0805d87dd — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 7. AI app website

- **Use when:** marketing an AI-powered product (Swan Coach as a public capability, an AI tool launch). Danger zone: every AI site looks identical in 2026.
- **Feel:** intelligence you can SEE working — show the product thinking, not orbs and sparkle emojis.
- **Arc:** Mkt 4-act. **Hero:** C1 + a live-demo panel (real or faithfully-scripted product interaction as co-lead). **Motion:** M2.
- **Sections in order:** hero + demo panel → Act 2: capability walk (C3) where each capability shows an actual in/out exchange + honest-limits line + privacy/trust block (zero-PII posture is a FEATURE — state it) → Act 3: workflow-transformation story (before/after time saved, C9 with media) → Act 4: tier gating (`FrostedPaywall` / `CrystallineLockOverlay` semantics if tiered) + signup CTA.
- **Conversion goal:** signup/waitlist. **Trust:** real product transcripts, privacy posture ("client data as IDs only"), what it does NOT do, human-in-the-loop framing (proposals, approval gates).
- **Mobile:** demo panel becomes a scripted autoplay-on-scroll (poster fallback); exchanges readable at 320px.
- **A11y:** simulated typing effects respect reduced-motion (show final state instantly); demo content is real text, not images of text.
- **Components:** `GlassPanel`, `GlowButton`, chat/proposal-card patterns from `components.md` (same family as #20 so marketing matches product truth), `FrostedPaywall` for tier boundaries.
- **Anti-patterns:** floating gradient orbs; sparkles/✨ iconography; "powered by AI" as the value prop; fake typing animations over fake answers; overpromising autonomy the T-tier model forbids.
- **Fable brief:** "AI app page for [capability]. The demo moment that sells it: [X]. Directions: demo-panel mechanics, honesty/limits framing, how Act 2 avoids the generic-AI-site look."
- **Builder brief:** "Direction [n]. Demo content sourced from real product transcripts (scrubbed to IDs/roles); reuse #20 conversational components so marketing == product; tier gates reuse existing paywall components."
- **Harness QA:**
  - [ ] demo panel plays + falls back to poster
  - [ ] no PII in any demo string
  - [ ] reduced-motion shows complete demo state
  - [ ] signup path ≤2 clicks
  - [ ] lighthouse-class perf on demo section
- **Village questions:**
  - Does the demo show a REAL differentiated capability?
  - Is the privacy story load-bearing or decorative?
  - Would this page survive the "every AI landing page looks the same" screenshot lineup?
