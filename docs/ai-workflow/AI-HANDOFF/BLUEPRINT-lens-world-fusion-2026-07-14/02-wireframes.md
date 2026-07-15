# 02 — WIREFRAMES + EXACT COPY

All tokens `var(--token, #fallback)` with Crystalline Swan fallbacks (Obsidian `#0A0A0F`, Carbon
`#141419`, Graphite `#1A1A24`, Ice Wing `#60C0F0`, Wing Purple `#8B5CF6`, Gilded Fern `#C6A84B`,
Frost White `#E0ECF4`, Midnight Sapphire `#002060`). Dual-Button Glow law everywhere. 44px targets.

## 1. Crown Header (F2) — user dashboard, top of Home, desktop ≥1024

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ≈≈≈ ATMOSPHERE BAND (aria-hidden, from current look; static under Still) ≈≈≈ │
│                                                                              │
│  YOUR LOOK                                                    [⚙ Fine-tune]  │  <- Fira Code kicker, Ice Wing
│  Candy Glass Arcade                                                          │  <- Plus Jakarta Sans, clamp(24px,3vw,40px)
│  Playful glass depth, bold action docks, and crisp reward feedback.          │  <- lens description, muted
│                                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    ◄  ►        │
│  │ ● WORN  │ │ Prism   │ │ Glacier │ │ Evergreen│ │ Nebula │   carousel     │
│  │ Candy   │ │ Terminal│ │ Cathedral│ │ Dominion│ │ Drift  │   (scroll-snap)│
│  │ Glass   │ │  v2     │ │  v2 NEW │ │  v2 NEW │ │  v2 NEW│                 │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘                │
│   Tap a look to preview it here · nothing changes until you wear it.         │
└──────────────────────────────────────────────────────────────────────────────┘
```
(Caption is the single exact string in the "Copy under carousel" bullet below — L3.)

- The BAND is the preview stage: tapping a card re-skins THE HEADER ITSELF (scoped frame — the
  dashboard below does not change until "Wear this"). Least-clicks: preview = 1 tap, wear = 2.
- Card anatomy: lens swatch (reuse `LensDot`), name, `v2` mini-tag when map entry exists (reuse
  the Lab's `V2MiniTag` pattern), `● WORN` badge on the committed look (exact copy: `WORN`).
- `NEW` tag: styles added within 14 days (compare `visuals` receipt entry date — F5 adds
  `addedOn` — absent field = never NEW).
- Carousel: native scroll + `scroll-snap-type: x mandatory`, buttons ◄ ► for keyboard/desktop
  (44px, aria-labels "Previous looks" / "Next looks"), NO new carousel library (ban).
- Order: committed look first, then v2-capable styles by mood-family order, then chrome styles.
- `[⚙ Fine-tune]` opens the Style Studio (F4). Hidden (not disabled) until F4 ships.
- Copy under carousel, exact: `Tap a look to preview it here · nothing changes until you wear it.`
- "Wear this" button: blue bg → purple glow (Dual-Button Glow), exact label `Wear this`.
  Confirmation chip copy on success, exact: `<Name> is now your look everywhere.`
  Offline/failed sync receipt, exact: `Saved on this device — will sync when you're back online.`

## 2. Crown Header — 375px mobile

```
┌───────────────────────────────┐
│ ≈ ATMOSPHERE BAND (short) ≈   │
│ YOUR LOOK            [⚙]      │
│ Candy Glass Arcade            │
│ ┌──────┐ ┌──────┐ ┌──────┐ →  │   <- swipe, snap; cards 148px wide,
│ │● WORN│ │Prism │ │Glacie│    │      partial 3rd card = scroll affordance
│ └──────┘ └──────┘ └──────┘    │
│ [Wear this]  (only in preview)│
└───────────────────────────────┘
```
- Band height: `clamp(148px, 26vh, 220px)` mobile, `clamp(180px, 24vh, 260px)` desktop.
- The header NEVER pushes core content below the fold on 667px-tall phones: at ≤700px viewport
  height, band collapses to its 148px minimum. Home's next-best-action module stays visible.

## 3. Style Studio (F4) — bottom sheet on mobile, right drawer ≥1024

```
┌ FINE-TUNE YOUR LOOK ────────────────────────────── [✕] ┐
│ Base look: Candy Glass Arcade            [Change look] │  <- Change look scrolls to carousel
│                                                        │
│ ACCENT          ○ Ice Wing  ● Wing Purple  ○ Gilded    │  <- radio row; ONLY validated pairs
│                 ○ Aurora    ○ Tide         (5 choices) │     (03-contracts §4 table)
│ FONT PAIRING    ● Swan default  ○ Editorial  ○ Mono    │  <- 3 allowlisted pairings
│ PATTERN         ○ None ● Frost weave ○ Orbit ○ Grain   │  <- atmosphere pattern catalog ids
│ DENSITY         ○ Comfortable   ● Compact              │
│ MOTION          ● Auto  ○ Reduced  ○ Off               │  <- writes profile.motionMode (auto|reduced|off)
│                                                        │
│ ── PREVIEW updates live above (header band) ──         │
│ [Save my style]                [Reset to look default] │
│ 🔒 <per-row upgrade line, table below>                 │  <- only when tier-locked
└────────────────────────────────────────────────────────┘
```

- **MOTION row writes the REAL enum `auto | reduced | off`** (NOT lean/still — B1).
- Tier gates map to canonical ids (03-contracts §4): FREE=`free`, GUARDIAN=`pro`, CRYSTALLINE=`elite`.
  FREE = carousel only, whole Studio locked. GUARDIAN(`pro`) = ACCENT + PATTERN + DENSITY + MOTION.
  CRYSTALLINE(`elite`) = all rows incl. FONT PAIRING. Locked rows render disabled with a 🔒 and the
  upgrade line — never hidden (the locked state IS the ascension surface). Upgrade routes to
  **`/ascension`** (the canonical paywall route — not "the store page").
- **Exact locked-row upgrade copy (M4 — one string per case, no ambiguity):**

  | Viewer tier | What's locked | Exact 🔒 line |
  |---|---|---|
  | `free` | the whole Studio | `Fine-tuning is a Guardian perk — Upgrade to unlock` |
  | `pro` (Guardian) | the FONT PAIRING row only | `Font pairing is a Crystalline dial — Upgrade to unlock` |
  | `elite` (Crystalline) | nothing | (no 🔒 line rendered) |
- `Save my style` = blue/purple glow; `Reset to look default` = ghost. Save chip copy, exact:
  `Your style is saved — it's yours on every device.`
- Every control 44px; radios are real inputs; the sheet gets `padding-bottom:
  env(safe-area-inset-bottom, 16px)`; focus trap while open; Esc + ✕ close; `aria-modal="true"`.

## 4. States (all surfaces)

- **Loading (F1 profile fetch):** header renders instantly from localStorage; server profile
  reconciles silently (no spinner in the band; a 1-line receipt ONLY if it changed the look:
  exact copy `Synced your look from your account.`).
- **Anonymous:** carousel works, wearing persists locally; footer line, exact: `Sign in to keep
  your look on every device.`
- **Error (PUT fails):** the offline receipt above; retry silently on next commit; NEVER block UI.
- **Empty (no v2 styles yet — pre-F5):** carousel shows the 2 shipped v2 + chrome styles; no
  empty state needed.
- **Reduced motion:** atmosphere static poster; carousel snap without smooth-scroll animation;
  chip appears without slide-up (pattern already shipped in `LabConfirmationChip`).
