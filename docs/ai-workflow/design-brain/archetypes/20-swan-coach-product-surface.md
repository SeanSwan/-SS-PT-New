<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 20. Swan Coach product surface (client-facing assistant)

- **Use when:** the in-app coaching assistant clients talk to — chat, workout-log drafts, proposals. Public product feature, governed by subscription tiers + approval gates (T1 ceiling: drafts/proposals; writes only through approval-gated endpoints). Never raw Hermes; never marketed as "AI" first — it's "Swan Coach".
- **Feel:** a knowledgeable coach in the room — warm precision, glass-panel calm; assistant presence without mascot cuteness.
- **Arc:** Dash 4-phase, conversational: Phase 1 = greeting with context ("since last time…"), Phase 2 = the conversation + capability affordances, Phase 3 = proposal cards (drafted workout logs, plan suggestions) with clear DRAFT labeling, Phase 4 = approve/edit/dismiss actions. **Hero:** chat surface + suggestion chips. **Motion:** M1 (message entrance, typing indicator honest to actual latency, reduced-motion shows instant final state).
- **Sections in order:** context greeting → conversation stream (user right / coach left, `GlassPanel` bubbles) → inline proposal cards (structured: exercises, sets, reps — editable before approval) → capability chips (what Coach can do at the user's tier) → tier boundary via `FrostedPaywall`/`CrystallineLockOverlay` when a locked capability is invoked.
- **Conversion goal:** proposal approved / action logged through the assistant; secondary: tier upgrade at genuine capability boundaries (never nagware).
- **Trust:** every write is a visible proposal the user approves (T1 → approval-gated endpoint); zero-PII posture (IDs client-side mapped); honest failure states ("I can't do that on your plan" / "that didn't save — retry"); no fake confidence.
- **Mobile:** chat is inherently mobile-first; input above keyboard; proposal cards approve-able one-thumb; 44px chips.
- **A11y:** stream is a proper log (aria-live polite); proposal cards fully keyboard-operable; typing indicator not the only progress signal; no yoga/meditation language in any Coach copy — stretching/flexibility.
- **Components:** chat bubble + proposal-card + suggestion-chip patterns from `components.md`, `GlowButton` on approve (Dual-Button Glow), `FrostedPaywall`, `CrystallineLockOverlay`, `GlassPanel`.
- **Anti-patterns:** sparkle-emoji AI branding; fake typing theater; silent writes without approval; burying the edit affordance on proposals; tier-gating mid-conversation without a graceful path back.
- **Fable brief:** "Swan Coach [surface/slice]. The assist moment: [X, e.g., post-workout log draft]. Directions: proposal-card anatomy, tier-boundary choreography, how trust is visible in the UI."
- **Builder brief:** "Direction [n]. All writes through approval-gated product endpoints (verify the command-lane registry — 20 live commands as of v14); tier gates reuse existing paywall components; conversation state survives refresh; rule 26 receipt on the mounted Coach route."
- **Harness QA:**
  - [ ] proposal → approve → verified backend write → rendered confirmation
  - [ ] locked capability shows the gate gracefully
  - [ ] refresh mid-conversation preserves stream
  - [ ] keyboard-open input visible at 375px
  - [ ] PII grep on rendered payloads
- **Village questions:**
  - Is the approval gate legible to a non-technical client?
  - Does the tier boundary feel like a door or a wall?
  - What happens on a hallucinated/unregistered command (must render as "can't do that", never a fake success)?
