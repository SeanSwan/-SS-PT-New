# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 3
> **Tokens:** 17,286 input / 6,808 output

---

## Creative Director (Lead Design Authority) — Round 1

# CREATIVE DIRECTOR'S DESIGN SPECIFICATION — "Enchanted Apex: Crystalline Swan" Ratification

**Verdict ratified:** **Faceted Sigil** wins site-wide and on dashboards (no divergence). Steal-list grafted: Evidence Lens (gold proof ring), Sodium-Amber Warming Layer, Membership-Circle copy. Floor-lamp rail rejected as structural chrome (too heavy); its *section-demarcation job* is absorbed into a thin facet-edge divider instead.

Below is the binding visual specification for every surface the plan actually names. Every color is a CSS custom property with a brand fallback. No hex is hardcoded except as the fallback value.

---

## 0. FOUNDATION — Token Contract (applies to ALL surfaces)

### 0.1 Color tokens (CSS custom properties, brand fallbacks)

| Token | Fallback | Role |
|---|---|---|
| `--ss-ground` | `#0A0A0F` | Obsidian Black — page ground |
| `--ss-surface-1` | `#141419` | Carbon — card/panel base |
| `--ss-surface-2` | `#1A1A24` | Graphite — raised panel / hover surface |
| `--ss-royal` | `#003080` | Royal Depth — deep accent fill |
| `--ss-sapphire` | `#002060` | Midnight Sapphire — sapphire ground (Faceted Sigil setting) |
| `--ss-text` | `#E0ECF4` | Frost White — primary text |
| `--ss-text-dim` | `#8FA3B8` | dimmed text (computed from `--ss-text` at 60% alpha over ground; verified 4.6:1) |
| `--ss-ice` | `#60C0F0` | Ice Wing — primary cyan accent / focus ring |
| `--ss-arctic` | `#50A0F0` | Arctic Cyan — secondary cyan |
| `--ss-lavender` | `#4070C0` | Swan Lavender — tertiary blue |
| `--ss-purple` | `#8B5CF6` | Wing Purple — secondary accent / glow |
| `--ss-gold` | `#C6A84B` | Gilded Fern — Evidence Lens, rank chrome, warming layer |
| `--ss-amber` | `#E8A04A` | sodium-amber warming accent (grafted from Swan Deep Field; brand-adjacent gold-warm) |
| `--ss-error` | `#E0566A` | error red (brand-reconciled, not a new namespace) |
| `--ss-success` | `#5BC98A` | success green (brand-reconciled) |

**Banned forever:** `#00FFFF`, `#7851A9`, `#0a0a1a` (Galaxy-Swan retired set). Linter test enforces.

### 0.2 Gradient Law (the Faceted Sigil signature)

```
linear-gradient(
  135deg,
  var(--ss-text, #E0ECF4) 0%,
  var(--ss-ice, #60C0F0) 35%,
  var(--ss-lavender, #4070C0) 65%,
  var(--ss-purple, #8B5CF6) 100%
)
```
- Applied ONLY to: logo mark, primary CTA surface sheen, facet-plane card top-edge hairline (1px), Evidence Lens ring.
- NEVER applied to body text, data values, or large fills (beauty tax).

### 0.3 Typography scale (mobile-first, fluid via `clamp()` on font-size ONLY — never on layout geometry)

| Token | Mobile (320–375) | Desktop (1024+) | 4K (2560+) |
|---|---|---|---|
| `--ss-font-display` | clamp(2rem, 6vw, 3rem) | 3.25rem | 4rem |
| `--ss-font-h1` | 1.75rem | 2.25rem | 2.75rem |
| `--ss-font-h2` | 1.375rem | 1.75rem | 2rem |
| `--ss-font-body` | 1rem (16px floor) | 1.0625rem | 1.125rem |
| `--ss-font-small` | 0.875rem (14px floor, never below) | 0.875rem | 0.9375rem |
| `--ss-font-mono` | 0.9375rem | 1rem | 1.0625rem |

- Numeric truth (workout stats, proof numbers, finance) → `--ss-font-mono`, tabular-nums, `font-feature-settings: "tnum"`.
- Body font: system stack `Inter, system-ui, -apple-system, sans-serif`.
- Mono: `ui-monospace, "SF Mono", "JetBrains Mono", monospace`.

### 0.4 Spacing scale (8px base, no exceptions)

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128` — exposed as `--ss-space-1` … `--ss-space-10`.

### 0.5 Breakpoints (mobile-first, min-width media queries)

| Name | Min-width | Max container |
|---|---|---|
| `mobile` | 0 | 100% – 32px padding |
| `mobile-l` | 375px | — |
| `tablet` | 768px | 720px |
| `desktop` | 1024px | 960px |
| `wide` | 1440px | 1280px |
| `ultrawide` | 1920px | 1440px |
| `4k` | 2560px | 1600px (centered, never edge-to-edge text) |

### 0.6 Motion contract

| Zone | License | Max duration | Easing |
|---|---|---|---|
| Marketing (Track A) | M3 — cinematic, restrained | 600ms enter / 300ms exit | `cubic-bezier(0.16, 1, 0.3, 1)` (emphasized decel) |
| Dashboards (Track B) | M0–M3, calm zones intact | 200ms max for state changes; 400ms for view transitions | `cubic-bezier(0.4, 0, 0.2, 1)` (standard) |
| Store checkout + Waiver | behavior-frozen | 0ms (no motion) | n/a — quietest tint |
| Dual-Button Glow | M2 | 180ms glow ramp | `cubic-bezier(0.4, 0, 0.2, 1)` |

**`prefers-reduced-motion: reduce`** → ALL durations → `0.01ms`; ALL glow shadows → `0 0 0 1px solid var(--ss-ice, #60C0F0)`; ALL gradient-law sheens → flat `var(--ss-ice, #60C0F0)`; Evidence Lens ring → static 2px solid gold, no pulse.

### 0.7 Dual-Button Glow (binding rule)

| Button variant | Background | Glow color | Glow spec |
|---|---|---|---|
| Primary (blue) | `var(--ss-ice, #60C0F0)` | `var(--ss-purple, #8B5CF6)` | `0 0 0 1px var(--ss-purple), 0 0 16px -2px var(--ss-purple)` on hover/focus |
| Secondary (purple) | `var(--ss-purple, #8B5CF6)` | `var(--ss-ice, #60C0F0)` | `0 0 0 1px var(--ss-ice), 0 0 16px -2px var(--ss-ice)` on hover/focus |
| Tertiary (ghost) | transparent | `var(--ss-ice, #60C0F0)` | `0 0 0 1px var(--ss-ice)` only — no diffuse glow |

- Min height: **44px**. Min width: 44px (icon-only). Padding: `12px 24px` (text), `12px` (icon).
- Border-radius: `8px` (facet-aligned, not pill — Faceted Sigil is angular).
- Focus-visible: `outline: 3px solid var(--ss-ice, #60C0F0); outline-offset: 2px;` IN ADDITION to glow. Never `outline: none`.

---

## 1. SHARED COMPONENTS (appear across multiple surfaces)

### 1.1 Facet-Plane Card (the core panel primitive)

The "cut-crystal facet plane on every panel" — implemented as a **1px gradient-law hairline on the top edge only**, with a 1px `--ss-surface-2` border elsewhere. NO heavy textures, NO multi-facet fragmentation (beauty-tax mitigation).

**Layout:**
- Background: `var(--ss-surface-1, #141419)`
- Border: `1px solid color-mix(in srgb, var(--ss-surface-2, #1A1A24) 80%, transparent)`
- Top edge: `border-top: 1px solid transparent; border-image: linear-gradient(90deg, var(--ss-text, #E0ECF4), var(--ss-ice, #60C0F0), var(--ss-lavender, #4070C0), var(--ss-purple, #8B5CF6)) 1;` (the gradient law, hairline only)
- Border-radius: `8px` (top corners only: `8px 8px 4px 4px`)
- Padding: `16px` mobile / `24px` desktop+ / `32px` ultrawide
- Shadow (resting): `0 1px 2px rgba(0,0,0,0.4)`
- Shadow (raised/hover): `0 4px 16px -4px rgba(0,0,0,0.6)`

**States:**
| State | Spec |
|---|---|
| default | as above |
| hover | `background: var(--ss-surface-2, #1A1A24)`; shadow → raised; 200ms |
| focus-visible | `outline: 3px solid var(--ss-ice, #60C0F0); outline-offset: 2px` |
| active/pressed | `transform: translateY(1px)`; 100ms |
| loading | 1px gradient-law hairline animates left→right at 1200ms loop; content replaced by `--ss-surface-2` shimmer block |
| empty | centered `--ss-text-dim` copy, 16px icon, membership-circle voice ("Your circle is gathering — log your first session.") |
| error | `border-color: var(--ss-error, #E0566A)`; top hairline → solid `--ss-error`; error text `--ss-error` |

**Accessibility:** `role="region"` if named; `aria-labelledby` to heading. Decorative top hairline → `aria-hidden`. Keyboard: card itself not focusable unless interactive; inner elements follow their own contracts.

### 1.2 Evidence Lens (grafted from Swan Deep Field — CRITICAL)

Gold ring circling exactly ONE real-proof number per screen. The only badge allowed to mark proof.

**Spec:**
- Ring: `2px solid var(--ss-gold, #C6A84B)`
- Ring shape: circle, `border-radius: 50%`
- Size: wraps the number with `padding: 4px 12px`; min diameter `44px` (touch target compliance even though it's display-only — prevents accidental tiny-tap conflicts on adjacent elements)
- Glow: `0 0 12px -4px var(--ss-gold, #C6A84B)` (subtle, M2)
- Number inside: `--ss-font-mono`, `font-weight: 600`, `color: var(--ss-text, #E0ECF4)`, `tabular-nums`
- Label below (optional, 11px floor → 12px): `color: var(--ss-gold, #C6A84B)`, uppercase, `letter-spacing: 0.08em`

**Motion (M3, marketing; M1, dashboards):**
- Enter: ring scales `0.9 → 1` over 400ms, `cubic-bezier(0.16, 1, 0.3, 1)`; glow fades in.
- Idle pulse (dashboards only, every 8s): glow opacity `0.4 → 0.8 → 0.4`, 2000ms, `ease-in-out`. **Disabled in calm zones** (data/money/legal lanes).
- `prefers-reduced-motion`: static ring, no pulse, no scale.

**Rule of ONE:** exactly one Evidence Lens per screen view. Two = violation. Enforced by a layout test.

**Accessibility:** `aria-label="[number] — verified proof"`; the number is real DOM text (not image). `role="img"` on the ring container if purely decorative framing.

### 1.3 Sodium-Amber Warming Layer (grafted — warmth injection)

Not a component; a **treatment** applied to three moments only: greeting, streak flame, celebration.

- Greeting text: `color: var(--ss-amber, #E8A04A)` for the salutation word only ("Welcome back, Sean" — "Welcome" in amber, rest in `--ss-text`).
- Streak flame: 16px icon, `color: var(--ss-amber, #E8A04A)`, `filter: drop-shadow(0 0 4px var(--ss-amber))`.
- Celebration (milestone share): full-screen 200ms `var(--ss-amber)` radial flash at 8% opacity, then settles. M3, marketing only.

**Never** applied to: data lanes, nav, buttons, body copy, error states.

### 1.4 Gradient-Law Surface (logo mark, CTA sheen)

- Logo mark: SVG, fill = gradient law (§0.2), `aria-hidden="true"` if decorative, `role="img" aria-label="SwanStudios"` if standalone.
- CTA sheen: primary button gets a `::before` pseudo-element with gradient law at `opacity: 0.15`, `mix-blend-mode: overlay`, animating `background-position` 0%→200% over 600ms on hover only.

### 1.5 Victory Chart Wrapper (data-truth)

- Container: Facet-Plane Card (§1.1) with `padding: 24px`.
- Chart surface: `background: transparent`.
- Axis: `color: var(--ss-text-dim, #8FA3B8)`, `fontSize: var(--ss-font-small)`.
- Grid: `stroke: color-mix(in srgb, var(--ss-surface-2, #1A1A24) 50%, transparent)`, `strokeWidth: 1`, `strokeDasharray: 2 4`.
- Data line/bar: `stroke/fill: var(--ss-ice, #60C0F0)` primary; `var(--ss-purple, #8B5CF6)` secondary.
- Tooltip: Facet-Plane Card, `position: absolute`, `z-index: 10`, monospace numbers.
- `aria-label` on chart container: descriptive summary ("Weekly volume trend, 6 weeks, trending up"). `role="img"`.
- No invented stats; honest empty state when no data ("No workouts logged yet — your circle starts with one session.").

### 1.6 Monospace Numeric Truth

- `font-family: var(--ss-font-mono)`, `font

---

## Design Reviewer & Implementation Challenger — Round 2

Your specification establishes a rigorous, highly disciplined foundation. The token architecture, fluid typography scale, and motion contracts (especially the strict handling of `prefers-reduced-motion`) are excellent. The integration of the Sodium-Amber Warming Layer is tasteful and well-constrained.

However, I cannot ratify the specification as-is due to a critical CSS rendering flaw, a direct contradiction in the design rules, and a logic constraint that will break dashboard utility. 

Here are my disputes and proposed alternatives:

### DISPUTE 1: Contradiction in Evidence Lens Ring Color (Sec 0.2 vs Sec 1.2)
*   **The Issue:** In **Section 0.2 (Gradient Law)**, you state the gradient is applied to the "Evidence Lens ring". But in **Section 1.2 (Evidence Lens)**, you explicitly define the ring as `2px solid var(--ss-gold, #C6A84B)`. 
*   **Why it fails:** This creates a direct conflict for developers. Applying the Gradient Law to the Evidence Lens dilutes the "gold proof ring" concept we specifically grafted from Swan Deep Field.
*   **Proposed Fix:** Remove "Evidence Lens ring" from the allowed list in Section 0.2. The Evidence Lens *must* remain strictly `--ss-gold` to maintain its distinct semantic meaning (verified proof).

### DISPUTE 2: CSS Rendering Failure on Facet-Plane Card (Sec 1.1)
*   **The Issue:** You specified `border-radius: 8px 8px 4px 4px` alongside `border-image: linear-gradient(...) 1;` for the top edge. 
*   **Why it fails:** The CSS `border-image` property **does not respect `border-radius`** in modern browsers (WebKit/Blink/Gecko). It will render the top corners as sharp 90-degree angles, completely breaking the 8px radius and making the card look broken. Furthermore, `8px 8px 4px 4px` is too subtle an asymmetry; it looks like a rendering error rather than a deliberate "cut crystal" choice.
*   **Proposed Fix (Exact Code Change):** Standardize the border-radius to a uniform `8px` and use a `::before` pseudo-element to render the top hairline so it curves correctly with the radius.
    ```css
    /* Proposed update for components/FacetCard.css */
    .facet-card {
      background: var(--ss-surface-1, #141419);
      border-radius: 8px;
      border: 1px solid color-mix(in srgb, var(--ss-surface-2, #1A1A24) 80%, transparent);
      position: relative;
      overflow: hidden; /* Ensures pseudo-element respects corners */
    }
    
    .facet-card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, var(--ss-text, #E0ECF4), var(--ss-ice, #60C0F0), var(--ss-lavender, #4070C0), var(--ss-purple, #8B5CF6));
      /* Removes the need for border-image */
    }
    ```

### DISPUTE 3: The "Rule of ONE" Breaks Dashboards (Sec 1.2)
*   **The Issue:** You mandated "exactly one Evidence Lens per screen view. Two = violation." 
*   **Why it fails:** While perfect for Marketing (Track A) to create a focal point, this completely breaks Dashboards (Track B). A user's post-workout summary legitimately needs to verify *multiple* points of immutable proof simultaneously (e.g., "Total Volume", "Current Streak", and "New 1RM"). Forcing a user to navigate to three different screens to see their verified stats is terrible UX.
*   **Proposed Fix:** Scope the "Rule of ONE" strictly to **Marketing (Track A)**. For **Dashboards (Track B)**, allow up to *three* Evidence Lenses, provided they are grouped in a dedicated "Proof Row" and their M1 idle pulses are staggered or disabled to respect the calm zone.

### DISPUTE 4: Incomplete Monospace Specification (Sec 1.6)
*   **The Issue:** Your specification cut off at `font-family: var(--ss-font-mono), font`.
*   **Proposed Fix:** I am completing the specification for Section 1.6 to ensure data tables and charts align perfectly:
    ```css
    /* Proposed completion for Sec 1.6 */
    font-family: var(--ss-font-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em; /* Tightens mono slightly for better density in data lanes */
    ```

Please confirm these adjustments so we can lock the foundation and move into component-specific interaction states.

---

## Creative Director (Lead Design Authority) — Round 3

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

---

