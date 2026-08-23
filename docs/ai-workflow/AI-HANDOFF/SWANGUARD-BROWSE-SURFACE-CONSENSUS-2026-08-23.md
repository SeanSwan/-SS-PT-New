---
title: "SwanGuard Browse surface — 4-round panel consensus (build-ready)"
decision: "YouTube-subscriptions MECHANICS with Netflix-grade PRESENTATION. Link-out tiles, strict reverse-chronological, no hero row, no og:image fetch ever. Phone rail is a persistent sticky top ticker, not a bottom sheet. One <ul>, 5s announce debounce."
status: open
supersedes: none
date: 2026-08-23
---

# SwanGuard Browse surface — panel consensus

**Seats:** GLM 5.3, Grok 4.6, DeepSeek V4 Pro, Qwen (+ Ox Alpha, rate-limited out of rounds
2–4 — see reliability note). **4 rounds. ~$0.50 total.** Raw reviews under
`panel-2026-08-23-swanguard/{,round2,round3,round4}/`.

Sean asked for "a Netflix slash YouTube type page" — creator videos as browsable tiles, forms
in a sidebar, and a news rail "going up towards the sky."

---

## The ruling (round 3, unanimous 4/4 UPHOLD-WITH-AMENDMENT)

**YouTube-subscriptions *mechanics*, Netflix-grade *presentation*.**

The distinction is the whole finding. GLM demonstrated that two of the three original arguments
against Netflix did not actually discriminate between shapes:

- The **legal** leg convicts *playback*, not poster presentation. A grid of whole-tile link-out
  `<a>` elements with 16:9 media satisfies `rss_headline_snippet_linkout` trivially.
- The **default-off** leg is shape-neutral — a subscriptions grid with zero subscriptions is
  exactly as empty as a catalogue with zero titles.
- Only the **ranking** leg discriminates, and it convicts *ranking*, not tiles.

So Sean gets the Netflix look. What he cannot have is playback, engagement ranking, or a hero
that promises a catalogue which is 0/51 creators and 0/39 sources enabled.

**Binding concessions from Grok (the defendant), round 3:**

- Its own R2 rationale *"management is rare"* — **withdrawn**, false under default-off.
- **"Watch" is withdrawn as a name.** There is no Watch under a link-out posture; a Watch pane
  is an embed waiting to happen. The surface is **Browse**.
- **Layout breaks at 1024** by its own arithmetic: `200 + 280 = 480`, main `544`, three tiles
  ≈163px, snippet ~16ch — unreadable.
- **Ultrawide gutter bug**: `2560 − 240 − 1440 − 360 = 520px` dead zone detaching the rail.
- **Reduced-motion was a logic bug**: "mount at bottom" vs "appear at top" are two orderings.

**Struck as disproven:** DeepSeek claimed the 300-line ceiling makes this unbuildable. The rule
is 300 lines *per file* and its own text says *"extract hooks, utils, styles, types when
approaching limit."* Multi-file is the intended solution. Do not re-raise.

---

## Round 4 — the three disputes, settled

| Dispute | Outcome | Vote |
|---|---|---|
| **D1** phone rail (320–767) | **1B — persistent sticky top ticker**, not a bottom sheet | 3–1 (Grok, GLM, Qwen; DeepSeek dissents) |
| **D2** SR announcement + DOM | **2C — 5000ms debounce, ONE `<ul>`, same DOM nodes** | **4/4** |
| **D3** Netflix presentation | **3C — GLM's card contract, NO hero row** | **4/4** |
| **og:image** | **Fetching it is a BREACH** — never | **4/4** |

**Grok overruled its own D1 position.** Its round-3 answer was the 48px peek bar; in round 4 it
voted against itself: *"a 48px control → 70vh sheet buries the monitoring surface (two taps) …
persistence is the fix."*

### D1 — phone rail (320–767px)

Sticky top strip, always visible, grid flows below it. Not a sheet, not a marquee (a moving 44px
target on a phone stays a defect). Cost at 320px: ~44px of chrome (~8% of a 568px SE viewport),
one headline ≈18ch + count, remainder `overflow-x: auto`.

```css
/* PhoneRail — 320–767 only */
.phone-rail {
  position: sticky; top: 0; z-index: 2;
  display: flex; align-items: center; gap: var(--space-2, 8px);
}
```

### D2 — the rail's accessibility model

DeepSeek's decorative-layer-plus-real-list was **overruled**: two representations drift, and
that is two UIs. The moving layer and the focusable list are the **same DOM nodes**.

```js
const ANNOUNCE_DEBOUNCE_MS = 5000;
const BURST_COALESCE_AT = 5;      // >5 items in <2000ms → one utterance
// <ul> carries NO aria-live; a sibling does:
// <div aria-live="polite" aria-atomic="true" class="sr-only">
```

One `<ul>`; new `<li>` **prepended to the DOM** (not merely moved visually); focus is **never**
stolen; the live region holds a string only, never a second list. Grok's 8000ms was overruled
in favour of 5000ms — 30s (its round-2 value) was rejected by every seat as "compliant, not
accessible" for a monitor.

### D3 — the tile contract (GLM's, adopted verbatim)

- Whole tile is one `<a href={item.link} target="_blank" rel="noopener noreferrer">`.
- 16:9 media area **only** when the feed item itself carries `enclosure` / `media:content`.
  **Never a fetched `og:image`** — that leaves the RSS posture.
  ```js
  const media = item.enclosure?.url ?? item.mediaContent?.[0]?.url ?? null; // feed-declared ONLY
  ```
- Fallback: typographic card, `aspect-ratio: 16/9`, publisher wordmark on
  `var(--surface-2, #1c1f26)`.
- Headline `-webkit-line-clamp: 2`; snippet `summary.replace(/\s+/g,' ').slice(0,140) + '…'`.
- Hover `translateY(-2px)` + border token swap, inside
  `@media (prefers-reduced-motion: no-preference)`.
- Ordered `pubDate` **desc**. Never engagement, never "because you watched."
- **No hero row.** A hero editorializes one item visually, and since many text feeds carry no
  media it would mostly render as oversized typographic cards — "dishonest spectacle."

**Why og:image is a breach (unanimous):** the posture licenses headline + snippet + link *as
declared by the feed*. `og:image` requires fetching the article page beyond the feed and
repurposing an asset the publisher did not put in it.

---

## Layout (amended)

```
>=1280   [56px topbar]
         [240 SideNav+Forms] [1fr main, content max 1440] [320 rail (360 @1440+)]
```

| bp | nav | rail | tiles/row | notes |
|---|---|---|---|---|
| 320 / 414 | drawer | **sticky top ticker (D1)** | 1 | rail always visible |
| 768 | drawer | 280 overlay | 2 | |
| **1024** | drawer | 280 overlay | 2 | **keeps the 768 pattern** — 3-col here was unreadable |
| **1280** | 220 | 280 | 3 | 3-col shell begins |
| 1440 | 240 | 320 | 4 | forms overlay 360 |
| 2560 / ultra | 240 | 360 | 5 | gutter **outside** the shell (below) |

```css
@media (min-width: 2560px) {
  .shell { display: grid;
           grid-template-columns: 1fr 240px minmax(0, 1440px) 360px 1fr; }
}
```

Collapse order stays forms → rail → tiles **on width only**; the "management is rare" rationale
is withdrawn. Empty main must mount enablement, never a blank grid:

```jsx
{enabledCount === 0 && <EnableEmpty onOpenNav={() => setDrawer('forms')} />}
```

Tokens: `--shell-nav-w: 240px; --shell-nav-w-narrow: 220px; --shell-rail-w: 320px;
--shell-rail-w-wide: 360px; --shell-topbar-h: 56px; --gutter: 16px; --gutter-lg: 24px;
--tile-gap: 12px; --tile-min: 168px; --touch: 44px; --rail-item-h: 96px;`

---

## Still open (not decided by the panel)

- **`/api/feed` (F3) does not exist.** Cursor-based pagination, freshness, separate shapes for
  creator rows vs story rail. Full contract in round 2's Grok review.
- **Source health / staleness / withdrawal** — panel ranked this #3 by value left on the table.
  A rail showing a dead feed or a pulled headline as live is worse than empty. No
  `lastSuccessAt`, no tombstone today.
- **Track C source expansion** — Black-owned / Black-audience outlets and English-language
  international. Paste-ready JSON exists in round 2, but **every feed URL must be verified live
  before it lands**; the panel marked its own list `[UNVERIFIED]`.

## Seat reliability (calibration)

| Seat | Rounds returned | Note |
|---|---|---|
| Grok 4.6 | 4/4 | Highest volume and the only full implementation. Twice overruled its own prior position when shown arithmetic — the most useful behaviour on the panel. |
| DeepSeek V4 Pro | 4/4 | Sharp on a11y; one disproven finding (300-line ceiling); dissented alone on D1. |
| Qwen (local, free) | 4/4 | Won D2 outright — its model was adopted unanimously over both paid seats'. |
| GLM 5.3 | 3/4 | **Round 2 returned EMPTY after spending all 32k output tokens on reasoning.** When it did answer, it landed the round's decisive argument. |
| Ox Alpha | 1/4 | Rate-limited (shared-pool) out of rounds 2, 3 and 4. |
