# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-AESTHETIC-UPGRADE-MASTER-2026-07-18.md
**Seed:** AI-Village-Documentation/kimi-consults/design-brain-upgrade-round2.md
**Tokens:** 19356 in / 5619 out · **Cost:** ~$0.4745 · **Wall:** 77.1s

---

# FABLE 5 — SECONDARY RATIFICATION RULING
**Workstream:** Design-Brain Aesthetic Upgrade · **Authority:** Kimi K3 (not overridden here) · **Gate:** final pre-build

## VERDICT: **RATIFY-WITH-NOTES**

The spec is buildable as written, internally consistent, and does not violate the CLAUDE.md floor. One narrow compliance item must be closed before **asset ingestion** (not before code build). Everything else is advisory input to Kimi.

---

## 1. CLAUDE.md hard-rule compliance — PASS
- Tokens: `var(--token, #fallback)` mandated; inline hex in world components = QA fail. ✓
- Galaxy-Swan: banned-hex scan in world-gate covers assets **and prompts** (correctly — generation prompts are a leak vector others miss). ✓
- No MUI/Tailwind: styled-components throughout; SHIP gate forces translation. ✓
- 4.5:1: composite (image+scrim) measurement, not raw asset — this is the right measurement discipline. Dev-warn + CI-fail confirmed by Sean (Q6). ✓
- Reduced-motion: `motionMode` ladder, ≤200ms settle, scroll-parallax banned as a class. ✓
- PII: identifiable-face scan in world-gate. ✓ (refinements below)

## 2. Ranked concerns

**C1 — HARD-BLOCKER (close before asset ingestion): "NASA/ESA public domain" is factually incomplete.** NASA imagery is generally PD; **ESA/Webb and ESA/Hubble imagery is typically CC BY(-SA), requiring attribution.** Sean's Q5 answer ("free path") was made on a premise the spec doesn't correct. Fix is one amendment to the provenance law: either (a) restrict Epic cosmos sourcing to NASA-credited PD only, or (b) add a mandatory **credit manifest** (per-asset source + license + attribution string) checked by world-gate. Cheap fix; shipping without it is a license breach, which sits on the safety floor, not the taste layer.

**C2 — ADVISORY (strong): EXPLORE mode is declared exempt from budgets and token floor, but is silent on PII/provenance.** Sandbox captures land in a repo gallery. State explicitly: **the zero-PII, no-identifiable-likeness, and provenance laws bind EXPLORE too** — only budgets/tokens are waived. One sentence in `adapters/world-generator.md`.

**C3 — ADVISORY: tiny-faces rule needs a mechanical definition.** "PII/identifiable-face scan" is right in spirit; give the gate a testable threshold (e.g., rendered face ≤ N px or occluded/averted; no real-person likeness in generated figures; never seeded from client photos). Otherwise the scan is a judgment call, and judgment calls drift.

**C4 — ADVISORY: contrast-matrix dual-home drift.** Canonical table in `world-atmosphere.md §5` mirrored into Lane A's runtime data file, "brain wins conflicts" — hand-mirroring guarantees eventual divergence. Recommend the runtime file be **generated** from the brain table (or vice versa) so there is one authored source. Kimi's ownership rule is sound; the sync mechanism is the gap.

**C5 — ADVISORY: runtime grade perf.** `--world-grade-filter` (saturate/brightness) + 2px blur applied via CSS to full-viewport hero imagery is GPU-costly on low-end mobile. Recommend baking GR-1 into delivered assets for L0/L1 tiers and reserving the CSS var for L2 synthetic tiers. The fallback ladder contains the blast radius, so this is optimization, not redesign. Budgets otherwise realistic: hero ≤160KB is tight for NatGeo-grade but achievable with AVIF + the srcset ladder; L0 ≤2.5MB is sane for a short ambient loop.

**C6 — ADVISORY: a11y gaps, all small.** (a) Scale-Reveal needs a defined **focus + announcement** behavior (aria-live for the milestone; SR users must perceive the celebration, not just sighted users). (b) 44px targets not restated in world-gate — any interactive affordance riding a world surface (share, level-up CTA) inherits the rule; say so. (c) No `forced-colors`/Windows High Contrast statement for world layers (likely: layers drop to ground tier). Vestibular risk is otherwise well-handled — the reduced-motion settle and parallax ban are correct for a zoom-class mechanic.

**C7 — ADVISORY: photo-reference MCP (Sean's Q1 "yes").** Steer procurement to **Unsplash/Pexels official APIs** (license metadata in-band). Pinterest has no sanctioned reference API; wiring it invites exactly the scraping posture §6 forbids. Inherit the external-reference-mcp gate wholesale, as the spec already says.

**C8 — ADVISORY: CI composite-contrast measurement requires headless rendering.** Feasible via the already-live Playwright MCP, but budget the CI time and define the sampled slots (per `worldId × slot` row) so the gate is deterministic, not screenshot-roulette.

## 3. What is genuinely strong (for the record)
The Lane A reconciliation is the best part of the spec: explicit name-vs-value authority split, the Rosetta framing ("adopt their identifiers, keep these semantics"), one-primitive-two-names documented so nobody builds a duplicate, and `useWorldTier()` folding into `motionMode` rather than forking it. The translation gate's **soul-mechanic invariant as acceptance test** is a real mechanism, not vibes. The append-only taste ledger with `anti` entries auto-compiling into negative blocks closes the loop most systems leave open. Lens bounds (grade clamps, ≤2 lenses, 70/30 dominance, luminance floors immutable) prevent the era dimension from becoming a token fork.

---

**Disposition:** RATIFY-WITH-NOTES. C1 must be amended before any Epic asset is ingested; C2–C8 are advisory inputs to Kimi, who decides their disposition. No redesign requested; nothing here touches Kimi's aesthetic authority. Clear to proceed to full AI Village ratification and build in Kimi's view.

— Fable 5, secondary reviewer
