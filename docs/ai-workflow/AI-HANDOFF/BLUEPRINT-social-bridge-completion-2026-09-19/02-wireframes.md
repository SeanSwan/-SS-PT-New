# 02 — Wireframes: desktop and 375px states

**Scope:** every new surface in S5–S8, drawn at 1440×900 and 375×812, including empty, loading and
error states.
**Hard rules:** no interactive target below 44×44 CSS pixels; no motion-only information; no
horizontal document overflow at either width.
**Tokens:** styled-components only, palette tokens with fallbacks. Never `#0a0a1a`, `#00FFFF`, or
`#7851A9`. Gold = earned recognition only; purple = AI coach only; editorial Spotlight uses ice-cyan.

---

#### Tokens

```css
--studio-bg: var(--midnight-sapphire, #002060);
--studio-surface: var(--obsidian-black, #0A0A0F);
--studio-text: var(--frost-white, #E0ECF4);
--studio-editorial: var(--ice-wing, #60C0F0);
--studio-earned: var(--gilded-fern, #C6A84B);
```

All functional controls are at least 44×44 CSS pixels. Focus indication uses the editorial token plus an outline; status never depends on color alone. No purple appears in these surfaces.

#### SwanGuard: separate operator page

Route: `/operator/studio-spotlight`.

Desktop, 1440×900:

```text
+------------------------------------------------------------------+
| Studio Spotlight                  [Pause publishing] [Refresh]    |
| Publishing active                                                |
+----------------------+-------------------------------------------+
| Queue                | Selected item                             |
| [All statuses v]     | Headline                                  |
| [Search items     ]  | [                                        ]|
|                      | Member preview                            |
| Headline             | +---------------------------------------+ |
| Draft                | | Positive perspective                  | |
|                      | | Headline                              | |
| Headline             | | Editorial summary                     | |
| Delivered            | +---------------------------------------+ |
|                      | [Save draft] [Review for publishing]      |
|                      | [Retract from SwanStudios]                |
+----------------------+-------------------------------------------+
| Delivery receipts                                                |
| Revision | State | Last attempt | [View receipt]                  |
+------------------------------------------------------------------+
```

375×812:

```text
+-----------------------------------+
| Studio Spotlight                  |
| Publishing active                 |
| [Pause publishing] [Refresh]      |
| [All statuses v]                  |
| [Search items                  ]  |
| Queue                             |
| [Headline                      >] |
| Draft                             |
+-----------------------------------+
```

Selecting an item opens a full-width detail route with `[Back to queue]`; it does not mutate `StorySheet.tsx`.

#### Publication ceremony

Desktop modal and mobile full-screen dialog:

```text
+-----------------------------------+
| Review for publishing     [Close] |
| Confirm every statement.          |
| [ ] No politics                   |
| [ ] No negativity or ragebait     |
| [ ] Image rights cleared         |
| [ ] Headline is in Sean's voice   |
|                                   |
| Publishing sends this preview     |
| to SwanStudios.                   |
| [Cancel] [Publish to SwanStudios]  |
+-----------------------------------+
```

- Publish disabled until all four boxes are checked and validation passes.
- With no image, rights confirmation means no uncleared image is being sent.
- Changing any published field after opening the dialog resets all four boxes.
- Server binds attestations to the content hash; browser checkboxes are not authority.
- Modal focus is trapped and restored. Escape closes only while no request is pending.

Retraction confirmation:

```text
+-----------------------------------+
| Retract Spotlight         [Close] |
| Remove this item from             |
| SwanStudios?                      |
| [Cancel] [Retract item]            |
+-----------------------------------+
```

#### SwanStudios admin

Route: `/admin/studio-spotlight`.

```text
DESKTOP 1440x900
+------------------------------------------------------------------+
| Studio Spotlight                                      [Refresh]  |
| Spotlight disabled                                               |
| Live items: 0                                                    |
| Headline | Revision | Received | Image | Receipt                  |
+------------------------------------------------------------------+

MOBILE 375x812
+-----------------------------------+
| Studio Spotlight       [Refresh]  |
| Spotlight disabled                |
| Live items: 0                     |
| No live Spotlight items.          |
+-----------------------------------+
```

No publish, edit, or direct-delete button exists here.

#### Studio Pulse tile

```text
DESKTOP                              MOBILE 375px
+--------------------------------+   +-----------------------------------+
| Studio Pulse         [Refresh] |   | Studio Pulse            [Refresh] |
| Updated 2 minutes ago          |   | Updated 2 minutes ago             |
| Spotlight active               |   | Spotlight active                  |
| Live items                 3   |   | Live items: 3                     |
| Impressions              240   |   | Impressions: 240                  |
| Dismissal rate           25%   |   | Dismissal rate: 25%               |
| Placement review not needed    |   | Placement review not needed       |
+--------------------------------+   +-----------------------------------+
```

When sample size is insufficient: `"Not enough activity to assess placement."`

#### Faction ceremony

```text
DESKTOP RIGHT RAIL                    MOBILE 375px
+------------------------------+     +-----------------------------------+
| This week's faction honors   |     | This week's faction honors       |
| [bounded crystal scene]      |     | [static crystal illustration]    |
| Winner: resolved faction     |     | Winner: resolved faction         |
| MVP: resolved member         |     | MVP: resolved member             |
| Next week: resolved modifier |     | Next week: resolved modifier     |
| [Continue]                   |     | [Continue]                       |
+------------------------------+     +-----------------------------------+
```

Gold is limited to earned recognition. Scene backdrop and system labels remain ice-cyan.

#### Weekly digest

```text
DESKTOP                              MOBILE 375px
+--------------------------------+   +-----------------------------------+
| Your week at SwanStudios        |   | Your week at SwanStudios          |
| XP earned: 120                  |   | XP earned: 120                    |
| Current streak: 4 days          |   | Current streak: 4 days            |
| Friend highlight               |   | Friend highlight                  |
| A friend completed a challenge.|   | A friend completed a challenge.   |
| Faction rank: 2                |   | Faction rank: 2                   |
| [Read Spotlight]               |   | [Read Spotlight]                  |
| [Weekly digest: On]            |   | [Weekly digest: On]               |
+--------------------------------+   +-----------------------------------+
```

Names replace `"A friend"` only after authorized client-side resolution.

#### Exact shared states

Use the same state layout on desktop and mobile; no layout-only inaccessible spinner.

```text
LOADING
+-----------------------------------+
| Loading Studio Spotlight...       |
+-----------------------------------+

EMPTY QUEUE
+-----------------------------------+
| No items in this queue.           |
| Save a draft to get started.      |
+-----------------------------------+

ERROR
+-----------------------------------+
| Studio Spotlight could not load.  |
| [Try again]                       |
+-----------------------------------+

PAUSED
+-----------------------------------+
| Publishing paused.                |
| Queued items will not be sent.    |
| [Resume publishing]               |
+-----------------------------------+
```

Surface-specific replacements:

| Surface | Loading | Empty | Error |
|---|---|---|---|
| Admin | `Loading live items...` | `No live Spotlight items.` | `Live items could not load.` |
| Pulse | `Loading Studio Pulse...` | `No activity yet.` | `Studio Pulse is unavailable.` |
| Ceremony | No placeholder | Render nothing | Render nothing; local diagnostic only |
| Digest | `Loading your weekly digest...` | `Your next weekly digest is on its way.` | `Your weekly digest could not load.` |
| Receipts | `Loading delivery receipts...` | `No delivery attempts yet.` | `Delivery receipts could not load.` |

Digest opt-out state: `"Weekly digest is off."` and `[Turn on weekly digest]`.

Pulse stale state: `"Studio Pulse is out of date."`; keep last verified values with their timestamp, never relabel them current.

#### Three.js boundary

- Exists **only inside the faction ceremony**.
- One decorative crystalline swan-like silhouette assembled from at most 24 low-poly shards.
- No simulation, particles, physics, audio, postprocessing, shadows, remote assets, text rendering, or additional canvas.
- Lazy import only after the member receives a non-null ceremony claim and passes motion/device checks.
- Animation lasts 2.5 seconds, then renders one static frame and stops.
- Cap at 30 fps and device-pixel ratio 1.5.
- At widths below 600px, including 375px: static CSS/SVG illustration, **no Three.js import**.
- `prefers-reduced-motion`, Save-Data, hidden tab, unavailable WebGL, or detected low-memory device: same static fallback.
- Incremental lazy chunk budget: **180 KiB gzip maximum**, with **0 bytes of Three.js in the initial social route chunk**. This is a build gate, not a claimed measurement.
- If the measured build exceeds budget, reduce the Three.js import surface or stop for checkpoint review. Do not silently remove the required desktop spectacle.
- The canvas is `aria-hidden`; the card’s text contains all information.

---
