**Palette contract**

```css
--midnight-sapphire: #002060;
--ice-wing: #60C0F0;
--gilded-fern: #C6A84B;
--frost-white: #E0ECF4;
--wing-purple: #8B5CF6;
--obsidian-black: #0A0A0F;
```

Use `var(--token, #fallback)` everywhere. Semantic surfaces may alias these tokens or use their transparent mixtures; they may not introduce another pigment.

- Canvas: obsidian-black.
- Panels/buttons: midnight-sapphire; text: frost-white.
- Focus/data selection: ice-wing.
- Warning/staleness: gilded-fern plus text/icon.
- Purple is an accent/focus/glow pigment; do not assume white-on-purple meets normal-text contrast.
- Error: frost-white text, explicit error icon/label, gilded-fern border. No unapproved red.
- Buttons: ≥44×44 CSS px. Primary sapphire with purple glow; purple accent controls use ice-wing glow only where contrast passes.
- Typography: existing locally available Sora for UI, Plus Jakarta Sans headings, Cormorant Garamond italic empty-state emphasis, Fira Code identifiers. System fallbacks must remain legible; no new remote font request.

**Layout decisions**

At ≥1024px use CD3’s 44% constellation / 56% operations split, minimum deck width 480px. At narrower widths use the operations deck with the accessible roster; do not squeeze the desktop layout. At 2560/3840px let the working area expand to a maximum 3200px with proportional gutters. Below 480px use 16px gutters and stacked controls.

**Desktop shell, 1440px**

```text
┌ CREATOR BRAINS CONSOLE ───────────────────────────────────────────────┐
│ Store: Healthy   Last successful run: {age}   Reading: {observedAt}    │
├─────────────────────────────┬────────────────────────────────────────┤
│                             │ [Status] [Creators] [Wire] [Run]       │
│   EXISTING CONSTELLATION    │ [Operations] [Verification]            │
│                             │                                        │
│   Creator selection         │       ACTIVE OPERATIONS PANEL          │
│   reflects roster focus     │                                        │
│                             │                                        │
│ [Open creator list]         │                                        │
└─────────────────────────────┴────────────────────────────────────────┘
```

**375px shell**

```text
┌─────────────────────────────────┐
│ CREATOR BRAINS CONSOLE           │
│ Store: Healthy                  │
│ Last successful run: {age}       │
│ Reading: {observedAt}            │
│ [Status]    [Creators]           │
│ [Wire]      [Run]                │
│ [Operations][Verification]       │
├─────────────────────────────────┤
│ ACTIVE PANEL                    │
│                                 │
└─────────────────────────────────┘
```

Navigation wraps as a two-column grid at 375px. All labels remain visible. No hover-only menu.

**Status panel**

```text
Desktop
┌ STATUS ─────────────────────────────────────────────────────────────┐
│ [Store: Healthy] [yt-dlp: {verdict}] [Last success: {age}]            │
│ Creators {total} / Enabled {enabled}     Videos {total}              │
│ Fetched {fetched}    Published brains {count}    Documents {count}    │
│ Budget {used}/{perHour} {unit}    Throttle {text}                     │
│ Backlog                                                             │
│ {engine-formatted line}                                             │
│ Lock {holder-or-free}   Census {measured-or-unavailable}              │
│ Recent runs: {journal-backed rows}                         [Refresh] │
└─────────────────────────────────────────────────────────────────────┘

375px
┌ STATUS ─────────────────────────┐
│ Store: Healthy                  │
│ yt-dlp: {verdict}                │
│ Source: {probe/history/unknown}  │
│ Checked: {age-or-not-checked}    │
│ Creators {total}                │
│ Enabled {enabled}              │
│ Videos {total} / Fetched {n}     │
│ Budget {used}/{perHour} {unit}   │
│ Backlog                         │
│ {wrapped engine line}           │
│ [Refresh]                       │
└─────────────────────────────────┘
```

Do not attach `%` to `coverage` until its source unit is bound. Roster-derived percentage, if used, is explicitly `100*fetched/videos` with `videos=0 → unavailable`, and is labeled as that projection.

**Creators and add form**

```text
Desktop
┌ CREATORS ─────────────────────────────────────────────── [Add creator]┐
│ Creator              Consent      Videos    Fetched       Brain      │
│ {title}              Enabled      {n/—}     {n/—}         [Open]     │
│ {channelId}          [Disable]                                      │
│ {title}              Disabled     {n/—}     {n/—}         [Open]     │
│ {channelId}          [Enable]                                       │
└──────────────────────────────────────────────────────────────────────┘
┌ ADD CREATOR ─────────────────────────────────────────────────────────┐
│ Handle, channel URL, or channel ID                                   │
│ [_______________________________________________________________]   │
│ New creators start disabled. Re-adding preserves existing consent.   │
│ [Cancel]                                              [Add creator] │
└──────────────────────────────────────────────────────────────────────┘

375px
┌ CREATORS ───────────────────────┐
│ [Add creator]                   │
│ {title, wraps}                  │
│ {channelId, wraps}              │
│ Consent: Enabled               │
│ Videos {n/—} · Fetched {n/—}     │
│ [Open brain] [Disable]          │
├─────────────────────────────────┤
│ ADD CREATOR                     │
│ Handle, channel URL,            │
│ or channel ID                   │
│ [___________________________]   │
│ New creators start disabled.    │
│ [Cancel]       [Add creator]    │
└─────────────────────────────────┘
```

Pending add: **“Adding creator… Other panels remain available.”**  
Pending PATCH: **“Saving consent…”** Keep the last confirmed consent visible.  
Busy refusal: **“Another creator change is still running. Nothing was submitted.”**  
Unknown outcome: **“The outcome is unknown. Refresh creators before trying again.”**  
Dismiss pending panel: **“Closing this panel does not stop the creator change.”**

**Brain drawer**

```text
Desktop right drawer, width min(640px, 48vw)
┌ {title} ─────────────────────────────────────────────── [Close] ┐
│ Derived · Not fact-checked                                     │
│ Channel {channelId}   Generation {generation-or-unpublished}    │
│ Observed {time}    [Copy publication reference]                 │
│ [Index] [Topics] [Timeline] [Claims]                            │
│ {inert Markdown OR cited claim rows}                           │
│ {statement}                                                   │
│ Topic: {topic}      [Watch at {mm:ss}]                          │
│ {skipped-count} items could not be read. [Show details]         │
│ [Evidence list] [Evidence map]                                 │
└───────────────────────────────────────────────────────────────┘

375px full-screen dialog
┌ {title, wraps}         [Close] ┐
│ Derived · Not fact-checked     │
│ Generation {generation}       │
│ [Copy publication reference]  │
│ [Index]       [Topics]        │
│ [Timeline]    [Claims]        │
│ {content wraps}              │
│ [Watch at {mm:ss}]            │
│ [Evidence list]              │
│ [Evidence map]               │
└──────────────────────────────┘
```

Focus traps in the dialog; Escape closes; return to the actual invoking roster button, query row, or constellation DOM control. Removed trigger → focus the Creators heading.

**Wire/query**

```text
Desktop
┌ WIRE — SEARCH PUBLISHED BRAINS ────────────────────────────────────┐
│ Search terms [____________________] Creator [All creators v] [Search]│
│ Published derived evidence · Not fact-checked                       │
│ {N} matches for “{q}”                                               │
│ {statement}                                                        │
│ {creatorTitle} · {topic} · [Watch at {mm:ss}] [Open brain]           │
│ Partial search: {N} sources could not be read. [Show details]        │
└─────────────────────────────────────────────────────────────────────┘

375px
┌ WIRE ──────────────────────────┐
│ SEARCH PUBLISHED BRAINS         │
│ Search terms                   │
│ [___________________________]  │
│ Creator [All creators v]       │
│ [Search]                       │
│ {N} matches for “{q}”          │
│ {statement, wraps}             │
│ [Watch at {mm:ss}]             │
│ [Open brain]                   │
└────────────────────────────────┘
```

**Run and operations**

```text
Desktop
┌ RUN THE DAILY PASS ─────────────────────────────────────────────────┐
│ Operations per hour [20]                         [Run daily pass]  │
│ State: {Idle/Accepted/Running/Completed/Failed/Outcome unknown}      │
│ Request {requestId}   Engine run {runId-or-not-yet-assigned}        │
│ Budget {reading}   Throttle {reading}   Lock {holder-or-free}        │
│ {journal-backed phase/result}                         [Refresh]    │
└────────────────────────────────────────────────────────────────────┘
┌ OPERATIONS ────────────────────────────────────────────────────────┐
│ [Check yt-dlp] T0                 [Repair derived outputs] T2       │
│ Backup — awaiting privacy decision                                │
│ [Backup unavailable]                                              │
│ CLI only: Authorize · Restore · Rollback                           │
└────────────────────────────────────────────────────────────────────┘

375px
┌ RUN THE DAILY PASS ─────────────┐
│ Operations per hour [20]       │
│ [Run daily pass]               │
│ State: {state}                 │
│ Request {wrapped-id}           │
│ Engine run {id-or-unassigned}  │
│ {journal-backed result}        │
│ [Refresh]                      │
├ OPERATIONS ────────────────────┤
│ [Check yt-dlp]                 │
│ [Repair derived outputs]      │
│ Backup                        │
│ Awaiting privacy decision     │
│ [Backup unavailable]          │
│ CLI only: Authorize           │
│ Restore · Rollback            │
└────────────────────────────────┘
```

The pre-dispatch confirmation repeats the operation and budget; buttons are **“Cancel”** and **“Run daily pass”**. There is no misleading post-dispatch cancel button.

**Software verification**

```text
Desktop
┌ SOFTWARE VERIFICATION ─────────────────────────────────────────────┐
│ Candidate {digest-prefix}                                          │
│ State: {Candidate/Review pending/Verified/Stale/Revoked/Inconclusive}│
│ Evidence {passed}/{applicable}    Blocking findings {count}         │
│ Ledger integrity: {Consistent/Invalid/Unanchored}                    │
│ Scope: Software behavior. Creator claims are not fact-checked.     │
│ {requirement}  {test receipt}  {review ID}  {decision}               │
└────────────────────────────────────────────────────────────────────┘

375px
┌ SOFTWARE VERIFICATION ─────────┐
│ Candidate {wrapped-prefix}     │
│ State: {state}                 │
│ Evidence {passed}/{applicable} │
│ Blocking findings {count}      │
│ Ledger: {integrity}            │
│ Creator claims are not         │
│ fact-checked.                 │
│ {stacked receipt rows}         │
└────────────────────────────────┘
```

This panel consumes an injected sanitized summary. No review-writing action, private filesystem link, or new bridge endpoint.

**Evidence map**

```text
Desktop
┌ EVIDENCE ──────────────────────────────────────────────────────────┐
│ {creatorTitle} · Generation {generation} · Derived, not fact-checked │
│ [List] [Evidence map]   Topic [All topics v]                         │
│ Topic              Source video              Cited rows            │
│ {exact topic} ───── {videoId} ───────────────── {claim links}        │
│ Connections show shared recorded labels, not causality.            │
│ Coverage: {registry/state observation, separately timestamped}      │
└────────────────────────────────────────────────────────────────────┘

375px
┌ EVIDENCE ──────────────────────┐
│ {creatorTitle}                 │
│ [List] [Evidence map]          │
│ Topic [All topics v]           │
│ {topic}                       │
│   {videoId}                   │
│   [Watch at {mm:ss}]          │
│ Shared labels, not causality. │
└────────────────────────────────┘
```

**State overlays apply to every data panel**

| State | Exact copy/action |
|---|---|
| Loading, no prior data | “Loading {panel}…”; static geometry-preserving skeleton |
| Refreshing prior reading | “Refreshing… Showing the last reading from {time}.” |
| Empty roster | “No creators yet. Add your first creator.” / **Add creator** |
| No publication | “No published brain is available for this creator.” |
| Published empty content | “This publication contains no {section}.” |
| Zero query hits | “No matches for “{q}” in the readable published evidence.” |
| Partial query | “Some published evidence could not be read. These results are incomplete.” |
| Damaged store | “Cannot read {safeFileName}. Repair or recover the store before continuing.” |
| Transport failure | “Cannot reach the local bridge.” / **Retry read** |
| Invalid payload | “The bridge returned an incompatible {panel} response: {path}.” / **Retry read** |
| Run locked | “Another run holds the engine lock: {safeHolder}.” |
| Stale | “Stale reading from {time}.” / **Refresh** |
| Map unavailable | “Map unavailable. Evidence list remains available.” |
| Verification absent | “No software verification receipt was supplied for this build.” |
| Unexpected render fault | “This panel could not be displayed.” / **Reload panel**; shell survives |

**Visual acceptance:** all listed widths; explicit 2560×1440 and 3840×2160; no clipped controls or page overflow; drawer focus tests; automated token/contrast checks; screenshot review of healthy, damaged, pending-write, stale, partial, and unknown-outcome states. S5’s aesthetic acceptance remains its real-render census plus human review, not timing alone.
