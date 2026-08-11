# B7 — Typography, Grid & Spacing: the Swan substrate

- **Date:** 2026-08-11 · **Author:** Opus 5 · **Status:** CANONICAL (contract) — token module follows
- **Standing:** This is a **substrate, not a module.** Every other surface renders onto it. Two independent reviewers (Kimi K3, HY3) independently demanded it be built *before* any Forge/Create surface, on the grounds that UI built before it gets rebuilt after it.
- **Why it exists:** for a $100k bar, type scale and spatial rhythm determine perceived quality more than hero art. A generated plate over a weak grid still reads cheap.

---

## LAW 0 — This file is consumed, not read

B7 fails if it is only a doc. The acceptance test is mechanical:

> **If a builder cannot consume these values programmatically, B7 is not done.**

Every value below ships as a CSS custom property with a fallback (`var(--token, #fallback)`), per LAW 9. No raw hex, no magic numbers, outside the one token source.

---

## 1. Breakpoints — ⚠ THREE-WAY CONFLICT, UNRESOLVED

**B7 does NOT define breakpoints.** `frontend/src/styles/breakpoints.ts` already exists and is the canonical module. Writing a second set here would make B7 a fourth competing source — the exact drift disease this whole workstream exists to kill.

**What I found instead `[VERIFIED]` — three sources disagree:**

| Source | Phone tier | Full set |
|---|---|---|
| `frontend/src/styles/breakpoints.ts` (shipped, canonical) | **430** | 320 · 375 · **430** · 576 · 768 · 1024 · 1280 · 1440 · 1920 · 2560 · 3840 |
| Creator Claude's landed matrix (`bd80bee13`) | **414** | 414 · 768 · 1024 |
| CLAUDE.md rule 24 responsive audit matrix | **414** | 320 · 375 · **414** · 768 · 1024 · 1280 · 1440 · 1920 · 2560 · 3440 · 3840 |

**The conflict is real and load-bearing:** CLAUDE.md rule 24 *mandates* 414 (iPhone XR / Plus-class portrait). The shipped `breakpoints.ts` has **no 414 at all** — it jumps 375 → 430. So every surface built against `breakpoints.ts` has been silently skipping a viewport the house rules require testing.

`breakpoints.ts` also carries **3440** in neither direction consistently (rule 24 lists ultrawide 3440; `breakpoints.ts` does not).

**Resolution required before B7 ships tokens.** Options:
1. **Add 414 to `breakpoints.ts`** as a new tier, keep 430 (both are real device classes — XR/Plus at 414, Pro Max at 430). Additive, breaks nothing. **Recommended.**
2. Change 430 → 414. Breaks any component keyed to `size.s`.
3. Declare 430 close enough and amend rule 24. Requires Sean.

**Nothing in B7 consumes a breakpoint until this is resolved.** Everything below (type, spacing, grid, elevation) is breakpoint-independent and proceeds.

**Rule 20 sibling-sweep note:** `frontend/src/styles/` also contains **four** global-style modules — `GlobalStyle.ts`, `GlobalStyles.ts`, `ImprovedGlobalStyle.ts`, `CosmicEleganceGlobalStyle.ts` — plus `crystallineSwanTheme.ts` and eight CSS files defining custom properties. Which is canonical is `[UNKNOWN]`. B7 must bind to exactly one; a canonical-surface receipt (rule 26) is required before the token module lands. **Flagged, not resolved.**

---

## 2. Type scale — one ratio, no exceptions

**Ratio: 1.25 (major third).** Chosen over 1.333 because Swan runs dense data surfaces; a wider ratio starves the middle of the scale where tables, labels, and metrics live.

Base is **16px** and never smaller — 14px body is the most common "looks cheap" tell in dark UIs, where lower contrast already costs legibility.

| Token | rem | px @16 | Use |
|---|---:|---:|---|
| `--type-2xs` | 0.64 | 10.2 | Legal/attribution only. Never body. |
| `--type-xs` | 0.8 | 12.8 | Metadata, timestamps, chip labels |
| `--type-sm` | 0.9 | 14.4 | Secondary body, table cells |
| `--type-base` | 1.0 | 16 | **Body. The default.** |
| `--type-md` | 1.25 | 20 | Lead paragraph, card titles |
| `--type-lg` | 1.563 | 25 | Section headings |
| `--type-xl` | 1.953 | 31.3 | Page headings |
| `--type-2xl` | 2.441 | 39 | Hero secondary |
| `--type-3xl` | 3.052 | 48.8 | Hero primary (in-app ceiling) |
| `--type-display` | `clamp(3.05rem, 8vw, 7.45rem)` | — | **Public/marketing only.** Never in-app. |

### Families (from the active palette)
| Token | Stack | Job |
|---|---|---|
| `--font-heading` | Plus Jakarta Sans | Headings, UI titles |
| `--font-ui` | Sora | Controls, nav, gaming/XP surfaces |
| `--font-body` | Plus Jakarta Sans | Body copy |
| `--font-data` | Fira Code | **Numerals, metrics, code, IDs** |
| `--font-drama` | Cormorant Garamond Italic | **One** editorial moment per surface, max |

### Numerals — non-negotiable
```css
font-variant-numeric: tabular-nums;
```
on every metric, counter, timer, price, and table column. Proportional digits make numbers jitter as they update — the cheapest possible tell on a data product. This is already law for the Crystallize; B7 generalizes it.

### Line height + measure
| Token | Value | Applies to |
|---|---:|---|
| `--leading-tight` | 1.1 | `--type-2xl` and up |
| `--leading-snug` | 1.25 | `--type-lg` / `--type-xl` |
| `--leading-normal` | 1.5 | Body |
| `--leading-relaxed` | 1.65 | Long-form reading |
| `--measure` | 66ch | Max line length for body |
| `--measure-narrow` | 45ch | Cards, sidebars |

**Optical rule:** as size goes up, leading comes down and letter-spacing goes negative. `--tracking-display: -0.02em`. Headings set at body leading are the second-most-common amateur tell.

---

## 3. Spacing — 4px base, 8px rhythm

Base unit **4px**; the visual rhythm is **8px**. 4px exists for optical correction (icon nudges, border compensation), not for layout.

| Token | px | Use |
|---|---:|---|
| `--space-0` | 0 | — |
| `--space-1` | 4 | Optical correction only |
| `--space-2` | 8 | Tight pairs — icon↔label |
| `--space-3` | 12 | Inside controls |
| `--space-4` | 16 | **Default gap** |
| `--space-5` | 24 | Card padding |
| `--space-6` | 32 | Between groups |
| `--space-8` | 48 | Between sections |
| `--space-10` | 64 | Section breathing |
| `--space-12` | 96 | Public-surface section rhythm |
| `--space-16` | 128 | Hero padding, public only |

**Proximity law:** related elements sit at `--space-2`/`--space-3`; unrelated groups get `--space-6` or more. Uniform spacing everywhere is what makes a layout read as "engineer-built" — the exact failure LAW 11 names. Spacing must *encode* relationship.

---

## 4. Grid

**12 columns**, gutter `--space-5` (24px) desktop / `--space-4` (16px) handset, page margin `--space-5` → `--space-10` by breakpoint.

| Token | Value | Use |
|---|---|---|
| `--grid-cols` | 12 | Desktop/laptop |
| `--grid-cols-tablet` | 8 | 768 |
| `--grid-cols-handset` | 4 | 414 and below |
| `--content-max` | 1280px | Body content ceiling |
| `--content-max-prose` | 66ch | Long-form |
| `--content-max-wide` | 1600px | Dashboards/tables only |

At `--bp-wide` and `--bp-uhd` the **max-widths hold** and margins absorb the extra — content never stretches. HY3's asymmetric-12 proposal for the homepage is a valid *composition* on this grid, not a different grid.

---

## 5. Elevation & radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Chips, inputs |
| `--radius-md` | 10px | Buttons, small cards |
| `--radius-lg` | 16px | Cards, sheets |
| `--radius-xl` | 24px | Modals, feature panels |
| `--radius-full` | 9999px | Pills, avatars |

Elevation is **one system**: a border + a shadow, never shadow alone (invisible on dark) and never glass-on-glass (LAW 3).
`--elev-1` resting card · `--elev-2` hover/active · `--elev-3` modal/sheet.

---

## 6. Touch, focus, motion — where B7 meets the LAWs

- **44px minimum** on every interactive element: `--target-min: 44px`. Applies to the visual box *or* an expanded hit area — a 32px chip with 6px invisible padding passes; a 32px chip alone does not. (Creator Claude already lifted Chips 32→44px; this codifies it.)
- **Focus** is a token, not a default: `--focus-ring: 0 0 0 2px var(--focus-color, #8B5CF6)`, offset 2px. Never `outline: none` without a replacement.
- **Motion** on typographic surfaces obeys LAW 6: in-app durations 120–240ms, opacity + transform only. `--dur-fast: 120ms`, `--dur-base: 200ms`, `--dur-slow: 320ms`, `--ease-standard: cubic-bezier(.2,0,0,1)`.
- **Reduced motion is a JS concern** (LAW 5 R1). Consumers read a `useReducedMotion()` hook and seed state to the settled frame; the CSS media query alone is a lie for JS-driven animation.

---

## 7. Contrast — the rule that outranks aesthetics

Every pairing meets **WCAG AA: 4.5:1** body, **3:1** large text (≥`--type-lg` bold or ≥`--type-xl`) and UI boundaries.

Dark-first hazard, stated plainly: `--text-secondary` on `--surface-elevated` is where AA dies in practice. Any secondary-text token must be contrast-checked against **every** surface it can land on, not just the base background. `colorScience.ts` already exists in-repo and does WCAG + OKLab audit — **reuse it; do not write a second checker.**

---

## 8. Acceptance criteria (B7 is done when all pass)

1. Every value above exists as a CSS custom property with a fallback; **zero raw hex or magic numbers** outside the token source.
2. A contract test asserts token *names* match the canonical Crystalline source — or the palettes fork silently (Fable's ruling #10, same failure class).
3. A contrast test runs every text token against every surface token it can pair with, via `colorScience.ts`, and fails the build on AA violation.
4. `--target-min` is consumed by at least one shipped control; not aspirational.
5. Breakpoints are byte-identical to creator Claude's landed 414/768/1024.
6. Every file under the 300-line cap.
7. A builder can construct a Forge/Create surface **without inventing a single spacing, size, or type value.** That is the real test.

---

## 9. Non-goals

Not a component library (`components.md` owns that) · not colors (`design.md` owns the palette; B7 governs *relationships*) · not motion choreography (`motion.md`) · not the world/lens token contract (LAW 8, Lane-A owns emission — B7 is a pure consumer).
