# Design Specification Consensus

> Phase 2C: GLM 5.2 (Lead Designer) ↔ Gemini 3.1 Pro (Reviewer)
> Consensus: YES

---

# CONSENSUS REACHED

All four disputes from Gemini 3.1 Pro are technically valid and I ratify each fix. Below are the merged, binding corrections to the Foundation specification.

---

## MERGED FINDINGS — Foundation Ratification (Round 2)

### FIX 1 — Evidence Lens Ring Color Conflict (§0.2 amended)

**Accepted.** The Gradient Law application list in §0.2 is corrected. Remove "Evidence Lens ring" from the allowed Gradient Law surfaces.

**§0.2 — Gradient Law, amended allowed list:**
- Applied ONLY to: logo mark, primary CTA surface sheen, facet-plane card top-edge hairline (1px).
- **REMOVED:** Evidence Lens ring — this surface is exclusively `--ss-gold` per §1.2.

The Evidence Lens retains its semantic exclusivity as the *gold proof ring* grafted from Swan Deep Field. No gradient dilution.

---

### FIX 2 — Facet-Plane Card Rendering (§1.1 amended)

**Accepted.** `border-image` does not respect `border-radius` in WebKit/Blink/Gecko. The asymmetric `8px 8px 4px 4px` is also rejected as visually ambiguous. The pseudo-element approach is the correct implementation.

**§1.1 — Facet-Plane Card, amended CSS (file: `components/FacetCard.css`):**

```css
.facet-card {
  background: var(--ss-surface-1, #141419);
  border: 1px solid color-mix(in srgb, var(--ss-surface-2, #1A1A24) 80%, transparent);
  border-radius: 8px; /* uniform, deliberate facet */
  padding: 16px; /* mobile; 24px desktop+; 32px ultrawide */
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.4);
  transition: background 200ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.facet-card::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    var(--ss-text, #E0ECF4) 0%,
    var(--ss-ice, #60C0F0) 35%,
    var(--ss-lavender, #4070C0) 65%,
    var(--ss-purple, #8B5CF6) 100%);
  pointer-events: none;
}

.facet-card:hover {
  background: var(--ss-surface-2, #1A1A24);
  box-shadow: 0 4px 16px -4px rgba(0,0,0,0.6);
}

.facet-card:focus-visible {
  outline: 3px solid var(--ss-ice, #60C0F0);
  outline-offset: 2px;
}

.facet-card[data-state="loading"]::before {
  animation: facet-shimmer 1200ms linear infinite;
  background-size: 200% 100%;
}

@keyframes facet-shimmer {
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .facet-card[data-state="loading"]::before { animation: none; }
}
```

The `::before` hairline now curves correctly with the 8px radius. Loading state animates the gradient-law hairline itself (left→right), preserving the original intent.

---

### FIX 3 — Rule of ONE Scoped by Track (§1.2 amended)

**Accepted.** The blanket "one per screen" rule was marketing-thinking applied to a utility surface. Dashboards legitimately require parallel proof verification.

**§1.2 — Evidence Lens, amended "Rule of ONE":**

| Track | Max Evidence Lenses | Constraint |
|---|---|---|
| **Track A — Marketing** | **1** per screen view | Focal-point discipline intact. Two = violation. |
| **Track B — Dashboards** | **Up to 3** per screen view | Must be grouped in a dedicated **Proof Row** (horizontal flex, `gap: 24px`, wraps on mobile to vertical stack). M1 idle pulses must be **staggered** (0ms / 2600ms / 5200ms offsets) or **disabled** if the screen contains a calm-zone lane (data/money/legal). |
| **Checkout + Waiver** | **0** | Behavior-frozen surfaces. No proof chrome. |

Layout test updated: assert `count <= trackLimit` per Track A/B mapping, not a global `=== 1`.

---

### FIX 4 — Monospace Numeric Truth Completion (§1.6 amended)

**Accepted.** My spec was truncated. Gemini's completion is ratified with one addition — `font-feature-settings: "tnum"` for broader engine support alongside `font-variant-numeric`.

**§1.6 — Monospace Numeric Truth, complete spec:**

```css
.ss-numeric-truth {
  font-family: var(--ss-font-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  letter-spacing: -0.02em; /* tightens mono for data-lane density */
  font-weight: 500;
}
```

Applied to: workout stats, proof numbers, finance values, chart axis labels, table cells containing quantities. Never applied to: headings, body copy, button labels, marketing headlines.

---

## FOUNDATION STATUS: LOCKED

§0.1–§0.7 and §1.1–§1.6 are now internally consistent and implementation-ready. No outstanding contradictions.

**Proposing next scope:** Proceed to §2 — surface-specific specifications, beginning with **Track A Marketing (landing, pricing, proof gallery)** and **Track B Dashboard (post-workout summary, progress, membership circle)**. I will lead with the post-workout Proof Row layout since it now carries the highest interaction complexity (3 Evidence Lenses, calm-zone adjacency, mobile wrap behavior).

Awaiting Gemini 3.1 Pro's confirmation to advance to §2.
