# 02 — Wireframes: Admin Knowledge Console

One admin page, route `/dashboard/admin/knowledge` (registration pattern in 04). Dark-first,
Crystalline Swan tokens. Copy strings below are EXACT — use verbatim.

Tokens (always `var(--token, #fallback)`): bg `var(--bg-base, #030712)` · card
`var(--surface-dark, #1A1A24)` / `var(--card-dark, #141419)` · text `var(--text-primary, #E0ECF4)` ·
accent `var(--accent-primary, #60C0F0)` · purple glow `var(--glow-accent, #8B5CF6)` · gold
`var(--luxury-accent, #C6A84B)` · data cyan (charts/badges only) `#50A0F0`.
Buttons ≥44px; blue bg → purple glow, purple bg → cyan glow. Low-motion (this is a data surface):
no pointer tracking, no hover-only actions.

## Screen 1 — Console home (tab: Rules)

Desktop (≥1024px):
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Knowledge Console                                    [ + New Rule ]      │
│  SWAN Training Cortex · knowledge spine                [ + New Source ]   │
│  ┌─────────┬─────────┬───────────┬───────────┐                            │
│  │ Sources │ RULES ▣ │ Conflicts │ Review Due│   ← tabs (44px)            │
│  └─────────┴─────────┴───────────┴───────────┘                            │
│  Stats row: [ 12 Sources ] [ 3 Approved ] [ 7 Awaiting Review ]           │
│            [ 1 Open Conflict ] [ 2 Review Due ]      ← pill cards, gold   │
│                                                        number, Fira Code  │
│  Filters: [Status ▾] [Domain ▾] [Type ▾] [Search rules…        ] (44px)   │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ ● needs_sean_review   core-training · contraindication          │    │
│  │ Regress unstable movements before increasing intensity           │    │
│  │ Sources: 2 · v3 · confidence: likely      [ Review ]  [ Edit ]   │    │
│  ├──────────────────────────────────────────────────────────────────┤    │
│  │ ● sean_approved   pain-response · stop_condition        (gold ●) │    │
│  │ Stop lower-body loading when client reports sharp joint pain     │    │
│  │ Sources: 1 · v1 · confidence: verified    [ View ]   [ Edit ]    │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│  [ ‹ Prev ]  Page 1 of 3  [ Next › ]                                      │
└──────────────────────────────────────────────────────────────────────────┘
```
Status dot colors: draft/extracted = Swan Lavender `#4070C0`; needs_* = Ice Wing `#60C0F0`;
sean_approved = Gilded Fern `#C6A84B`; deprecated/superseded/archived = 50% muted text; prohibited
= `#E0ECF4` on red-tinted pill `rgba(220,60,60,.18)`.

States: **Loading** = 3 skeleton rows (pulse, respects reduced-motion). **Empty** = centered
"No rules yet. Extract Sean's first rule from a source, or create one manually." + `[ + New Rule ]`.
**Error** = "Couldn't load the knowledge base. [ Retry ]". **Flag off** = full-page notice
"Cortex knowledge layer is disabled. Set ENABLE_CORTEX_KNOWLEDGE=true to activate." (no controls).

Mobile 375px: tabs become horizontal scroll chips; stats wrap 2-per-row; rule cards stack
full-width; `[ Review ]`/`[ Edit ]` become full-width 44px stacked buttons. Nothing hover-only.

## Screen 2 — Rule detail / review drawer (right drawer desktop · full-screen sheet mobile)

```
┌ Rule · v3 ─────────────────────────────── [✕] ┐
│ Regress unstable movements before             │
│ increasing intensity                          │
│ STATUS: ● needs_sean_review                   │
│ domain: core-training · type: contraindication│
│ confidence: likely · strength: level3         │
│───────────────────────────────────────────────│
│ Plain rule        <plainLanguageRule text>    │
│ Operational logic <pretty JSON, Fira Code>    │
│ Sean's take       <seanInterpretation>        │
│ Explanations      tabs: Client / Trainer /    │
│                   Technical                   │
│ Citations                                     │
│   • NASM OPT textbook — ch.7 (level2)         │
│   • ~2000 NASM workshop (level5) ⚠ unverified │
│ Version history   v3 ‹current› · v2 · v1      │
│ Conflicts (0)                                 │
│───────────────────────────────────────────────│
│ Change note (required):                       │
│ [______________________________________]     │
│ [ Approve ✓ ]  [ Send back ]  [ Archive ]     │
│   gold bg        blue bg        ghost         │
└───────────────────────────────────────────────┘
```
`[ Approve ✓ ]` → PUT status `sean_approved`. `[ Send back ]` → status `draft`. Both disabled
until change note ≥5 chars (helper text: "Add a change note first — every status change is
recorded."). Success toast: "Rule approved — live for generation within 5 minutes." Level-5
citations always show the ⚠ badge with title text "Unverified recollection — verify before this
rule governs safety decisions."

## Screen 3 — Sources tab

Card grid (2-col desktop / 1-col mobile). Card: title, category chip, org, year,
historicalStatus badge ("Historical" = lavender chip), `Rules citing: n`, copyright chip
(`restricted` = gold outline), `[ Open ]`. New/Edit source = same drawer pattern as Screen 2 with
form fields from 3.2; `storageLocation` helper text: "External pointer only (hermes-vault:// or
r2-private://). Never upload the file here." Empty state: "No sources yet. Add Sean's first
knowledge source — books, certifications, workshops."

## Screen 4 — Conflicts tab

List rows: `Rule A ⚡ Rule B` names + conflictDescription + status chip; `[ Resolve ]` opens
drawer with side-by-side plain rules (stacked on mobile), radio: "A wins / B wins / Merged /
Defer", rationale textarea (required), `[ Save resolution ]` (44px, blue). Empty: "No open
conflicts. The knowledge base is consistent."

## Screen 5 — Review Due tab

Same row layout as Rules, filtered `reviewDueAt <= today`, sorted oldest first, each row shows
"Review due <date>" in gold. Empty: "Nothing due for review."
