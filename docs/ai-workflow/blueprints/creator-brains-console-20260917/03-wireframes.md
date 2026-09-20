# 03 — Wireframes — Creator Brains Console (CD3 "Vault Observatory" drawn; CD1/CD2 deltas noted)

ASCII, desktop-first. Mobile (414px) below. CD1 removes the right ops deck (dock floats over the full-viewport constellation); CD2 replaces the constellation half with a header orb over a full-width board.

## Desktop 1440 (primary operator width)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◆ CREATOR BRAINS        store: healthy · yt-dlp: ok · last good: 2d ago       │
│                                   [T0] badges: status query canary            │
├───────────────────────────────────────────────┬──────────────────────────────┤
│                                               │  OPERATIONS DECK             │
│                                               │ ┌──────────────────────────┐ │
│           B R A I N   C O N S T E L L A T I O N               │ │ RUN THE DAILY PASS  [T2] │ │
│                                               │ │ ops/hour [20] (RUN)      │ │
│      ✦ photographer-brain ●███░░ 412/979      │ │ throttle: clear · 20/h   │ │
│         (hover: tooltip — click: drawer)      │ │ lock: free · census: 1   │ │
│   ✦ seo-brain ●█░░░ 88/979   ✦ copy-brain ON  │ └──────────────────────────┘ │
│                                               │ ┌──────────────────────────┐ │
│   (node size = videos · arc = fetched %       │ │ CREATORS  [T2]  (+ add)  │ │
│    color: ON=ice · off=lavender · throttle=   │ │ 1 ON  412(410) photographer│
│    gold · stale=danger)                       │ │ 2 off  979(88) seo        │
│                                               │ │ … numbered pick rows      │
│                                               │ └──────────────────────────┘ │
│                                               │ ┌──────────────────────────┐ │
│                                               │ │ ASK THE BRAINS [T0]      │ │
│                                               │ │ ( "shadow lift" )  (ASK) │ │
│                                               │ └──────────────────────────┘ │
│                                               │  canary [T0] repair [T2]     │
│                                               │  backup [T2] · CLI-only:     │
│                                               │  restore↩ rollback↩ auth↩    │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

## Brain drawer (opens from node click or roster row; Graphite glass, 24px radius, ESC/focus-return)

```
┌─ photographer-brain ────────────────────────────── [T0] ─┐
│ videos 979 · fetched 412 (42%) · last fetch 2d ago        │
│ [index] [topics] [timeline] [claims]                      │
│ claims:                                                   │
│  • "never blur the tear trough crease" — 14:22 ▶watch [T0]│
│  • "always shoot at f/8 for groups"   — 31:05 ▶watch      │
│  ⚠ 3 skipped rows in rules.jsonl (shown, not hidden)      │
└───────────────────────────────────────────────────────────┘
```

## Mobile 414 (constellation collapses; roster is the interface)

```
┌──────────────────────────────┐
│ ◆ CREATOR BRAINS   ☰         │
│ [mini orb 96px · static-cap] │
│ store healthy · yt-dlp ok    │
│ last good 2d ago ⚠(>3d red)  │
├──────────────────────────────┤
│ STATUS (stacked cards)       │
│ coverage 42% ▓▓▓░░ backlog…  │
├──────────────────────────────┤
│ CREATORS (stacked cards,     │
│ 44px rows, enable toggle)    │
│ [photographer-brain  ON ▢]   │
│ [seo-brain           off  ]   │
├──────────────────────────────┤
│ (ASK) (RUN) (MORE)  44px tabs│
└──────────────────────────────┘
```

## State matrix (every data-bearing panel ships all four + refusals)

| State | Status board | Roster | Query | Run console | Constellation |
|---|---|---|---|---|---|
| Loading | skeleton matching final geometry (shimmer; reduced-motion → static) | skeleton rows | inline "searching…" (≤400ms) | poll indicator | static placeholder ring |
| Empty | first-run copy: *"No brains yet — add your first creator."* + Add CTA (Cormorant italic) | "No creators yet — add one." + Add CTA | honest no-match naming searched terms | "never run — the daily job has not run yet" (real journal truth) | empty-space message + CTA to roster |
| Error | panel-level: what failed + Retry; one `--danger` accent max | row keeps data, badge on failed action | refused → engine reason string | run FAIL verdict + digest pointer | WebGL fail → static fallback list (roster remains) |
| Success | values render; delta beats are response-tier | inline "added/… is now ON" toast | hits with ▶watch deep links | verdict from journal; never fake COMPLETED | node pulse ≤1 beat |
| Damaged store | **refusal banner naming the file** (409 mapped) — never zeros/empty | same | same | same | static + banner |
| Denied (lock held) | lock row shows holder pid/host | — | — | second start refused: `RUN_LOCKED` + holder | — |
| Validation error | — | add: invalid ref → inline reason (engine's) | — | ops/hour 0/NaN/fraction refused client+server | — |

## Keyboard / focus / a11y

- Full tab order: status strip → constellation (arrow-key node walking + Enter opens drawer; roster is the always-present equal) → ops deck → drawer (focus-trapped, ESC, focus returns to trigger).
- Node focus shows the same tooltip as hover; every action also exists as a DOM control (never hover-only).
- Contrast: Frost White on Graphite/Carbon ≥ 7:1; badge text uses lightened tints per design.md §15; color never sole signal (ON/off/throttle carry text labels).
