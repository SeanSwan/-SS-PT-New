# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-BLUEPRINT-SET-MASTER-REVIEW-REPORT-2026-07-17.md
**Seed:** (none)
**Tokens:** 4408 in / 1121 out · **Cost:** ~$0.1001 · **Wall:** 19.6s

---

GO-WITH-CHANGES

**(1) Keystone strategy — YES, correct.** Lens-first is right. Do NOT fold tokens into a standalone artifact first — that adds a coordination layer with no consumer to validate it. The Lens is the token sheet's first consumer; building it proves the tokens work before 14 surfaces depend on them. The Crystallize built once in `SL/motion/` and consumed everywhere is the only way six surfaces produce one signature instead of six dialects. Re-pass of the 4 SEND-BACKs with token sheet + Crystallize spec as input is the correct unblock — they refused to invent the brand for good reason; give them the brand.

**(2) BLOCKERS — three, all cheap, all before first commit:**

- **B1 — Text-legal token declaration.** The token sheet must ship with an explicit text-legal vs decorative-only column (§3C) BEFORE the Lens builds. The 3.3:1 wing-purple failure recurs across surfaces; if the sheet doesn't prevent it by construction, every downstream surface re-litigates AA. This is a token-sheet amendment, not a redesign.
- **B2 — De-Galaxy CI gate lands FIRST, repo-wide.** The regex gate (hex + rgba/hsl channel literals + var() fallbacks + codename strings "Galaxy/Cosmic/Observatory/Gate") must be in CI before Lens work starts, or new code inherits residue and the gate becomes a retrofit fight. One PR, day zero.
- **B3 — Reversibility standard ratified now.** Adopt Store's gate pattern (lazy() + flag + ErrorBoundary fail-closed) as the house standard in writing, with the Vite build-time caveat documented and runtime-config required on money-adjacent surfaces (Store, Contact backend). Deciding this per-surface later = five divergent revert stories.

None of these are NO-GO material; all are pre-flight.

**(3) Build order — sound, one adjustment.** Order 1→6 stands, with:

- **Pull the SEND-BACK re-pass (step 5's brief work) forward in parallel with step 2.** The moment the Lens token sheet freezes, hand it to the Home/About/Video re-pass — don't serialize brief-work behind Dashboard/Store *builds*. Design and build are different pipelines; parallelize them. Home is the front door; it shouldn't ship last by accident of sequencing.
- Within step 4, sequence **Contact first** (smallest surface, exercises the backend-flag pattern end-to-end and validates the house gate standard on a full-stack slice before Cover/Gallery's heavier upload work).
- Step 6 (Skill/Brain swap) correctly held for Sean. No change.

**Rulings on §6:** Q1 yes, Lens-first, no standalone token artifact. Q2 yes — Store's gate is the house standard, per B3. Q3 — the one inconsistency the synthesis under-weights: the Crystallize *contract* (props, reduced-motion frame, duration budget) must be published as an interface spec alongside the token sheet, or consumers will wrap it divergently. Q4 — no house-rule violations found; two-speed law is enforced at the right layer (the shared hook). Q5 — green-light per above.

Build.
