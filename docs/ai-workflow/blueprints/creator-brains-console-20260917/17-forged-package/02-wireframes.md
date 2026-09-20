**Exact presentation tokens**

| Role | Required value |
|---|---|
| Page | `var(--bg-base, #030712)` |
| Panel | `var(--carbon, #141419)` |
| Drawer | `var(--graphite, #1A1A24)` |
| Elevated panel | `var(--royal-depth, #003080)` |
| Main text | `var(--frost-white, #E0ECF4)` |
| Primary button | `var(--midnight-sapphire, #002060)` |
| Focus/glow | `var(--wing-purple, #8B5CF6)` |
| Success/enabled | `var(--ice-wing, #60C0F0)` |
| Warning/stale | `var(--gilded-fern, #C6A84B)` |
| Disabled-state marker | `var(--swan-lavender, #4070C0)` |
| Error accent | `var(--danger, #E5484D)` |
| Data graphics only | `var(--arctic-cyan, #50A0F0)` |

Text remains Frost White; state color accompanies text, never replaces it. Do not use faint text for required content. Tokens do not substitute for measured contrast.

**Desktop — 1440×900**

```text
+------------------------------------------------------------------------+
| Creator Brains Console                         Last checked: {time}      |
| {global warning/refusal, only when applicable}                           |
+-----------------------------+------------------------------------------+
| BRAINS                      | STATUS                                   |
|                             | yt-dlp | Creators | Coverage | Budget     |
| {static preview or scene}   | Backlog | Throttle | Census | Lock        |
|                             | Last run | Last good | Documents          |
| [View creators]             | Published brains | Recent runs            |
|                             +------------------------------------------+
|                             | CREATORS                    [Add creator] |
|                             | {title}  Enabled  {fetched}/{videos}       |
|                             | [Open brain] [Disable]                    |
|                             +------------------------------------------+
|                             | ASK THE BRAINS                            |
|                             | Search terms [________________________]    |
|                             | Creator [All creators v]          [Ask]  |
|                             | {results / state frame}                   |
|                             +------------------------------------------+
|                             | RUN THE DAILY PASS                        |
|                             | Operations per hour [20]       [Run pass]|
|                             | {journal, budget, throttle, lock}         |
|                             +------------------------------------------+
|                             | OPERATIONS                               |
|                             | [Check canary] [Repair] [Backup disabled] |
|                             | Restore T4 / Rollback T4 / Authorize T3   |
|                             | CLI only                                  |
+-----------------------------+------------------------------------------+
```

At widths ≥1280px, constellation/deck use 40%/60%; deck minimum 640px. At 768–1279px, the enhancement sits above the deck. At ≤767px, no three.js download; show the compact static representation.

**Mobile — 375×812; same structure applies at 320px and 414px**

```text
+-----------------------------------+
| Creator Brains Console             |
| Last checked: {time}               |
| {warning/refusal}                  |
+-----------------------------------+
| BRAINS                            |
| [static preview, 96px high]        |
| [View creators]                   |
+-----------------------------------+
| STATUS                            |
| {label}                           |
| {value or named refusal}          |
| ... all instruments, stacked      |
+-----------------------------------+
| CREATORS              [Add creator]|
| {title, wraps}                    |
| Enabled | {fetched}/{videos}       |
| [Open brain]          [Disable]    |
+-----------------------------------+
| ASK THE BRAINS                    |
| Search terms                      |
| [_______________________________] |
| Creator [All creators          v] |
| [Ask]                             |
| {results / state frame}           |
+-----------------------------------+
| RUN THE DAILY PASS                |
| Operations per hour               |
| [20]                   [Run pass] |
| {run state}                       |
+-----------------------------------+
| OPERATIONS                        |
| [Check canary] [Repair]            |
| [Backup disabled]                 |
| {blocked explanation}             |
| Restore T4 — CLI only             |
| Rollback T4 — CLI only            |
| Authorize T3 — CLI only           |
+-----------------------------------+
```

No mobile-only action menu or hidden tab is introduced. All working surfaces remain reachable by scrolling.

**Add form — desktop dialog / mobile full-width sheet**

```text
Desktop 560px                          Mobile 375px
+--------------------------------+    +-------------------------------+
| Add creator              [Close]|    | Add creator            [Close]|
| Handle, channel URL, or ID      |    | Handle, channel URL, or ID    |
| [____________________________] |    | [___________________________] |
| New creators start disabled.   |    | New creators start disabled.  |
| {validation / progress}        |    | {validation / progress}       |
| [Cancel]          [Add creator]|    | [Cancel]        [Add creator]|
+--------------------------------+    +-------------------------------+
```

During submission: “Resolving creator…”. Disable another submission. Close remains available, with “This request continues if you close this form.” No cancellation claim after dispatch.

**Brain drawer — desktop 640px / mobile full-screen**

```text
+---------------------------------------------------+
| {creator title}                           [Close] |
| {channelId}                                      |
| Published generation: {generation}                |
| [Index] [Topics] [Timeline] [Claims]               |
| {state frame or derived document}                 |
|                                                   |
| Claims:                                           |
| {keyPhrase}                                       |
| {creatorTitle} · {timestamp}          [Watch video]|
| {N} items could not be read                       |
| [Show details]                                    |
+---------------------------------------------------+
```

Mobile tabs wrap into two rows; they do not horizontally clip. Markdown is displayed as escaped plain text with preserved line breaks in v1. No HTML, embedded media, remote images, or raw HTML rendering.

**Query results**

```text
+---------------------------------------------------+
| Results for “{submitted terms}”                    |
| {keyPhrase}                                       |
| {creatorTitle} · {timestamp}          [Watch video]|
| {N} items could not be searched                    |
| [Show details]                                    |
+---------------------------------------------------+
```

Use submitted terms, not the current unsubmitted input. Watch links use `rel="noopener noreferrer"` and a validated YouTube URL.

**Reusable state frames — drawn inside every panel on both widths**

```text
LOADING                 EMPTY
+-------------------+   +------------------------------------+
| {loading copy}    |   | {panel-specific empty copy}        |
| [static skeleton]|   | {permitted CTA}                    |
+-------------------+   +------------------------------------+

PARTIAL / STALE                    ERROR / DENIED
+------------------------------+  +------------------------------------+
| {last confirmed content}     |  | {file/reason or lock holder}       |
| {partial/stale copy}         |  | {Retry or appropriate next action} |
| [Show details]               |  |                                    |
+------------------------------+  +------------------------------------+

SUCCESS / VALIDATION
+----------------------------------------------------------+
| {authoritative content or inline validation below input}  |
| {enabled action controls appropriate to this state}       |
+----------------------------------------------------------+
```

**Exact state copy**

| Surface | Loading | Empty | Partial/stale/error |
|---|---|---|---|
| Status | “Reading engine status…” | “No creators yet — add your first creator.” | “Unable to read {file}.” / “Showing the last confirmed reading from {time}.” |
| Roster | “Loading creators…” | “No creators yet — add one.” | “Counts unavailable.” / “Creator change confirmed. Roster refresh failed.” |
| Drawer | “Loading published brain…” | “No published brain for this creator.” | “{N} items could not be read.” |
| Query | “Searching published brains…” | “No matching claims for “{terms}”.” | “{N} items could not be searched.” |
| Run | “Reading run state…” | “The daily pass has not run yet.” | “Run outcome unknown. Check engine records before retrying.” |
| Canary | “Checking yt-dlp…” | “No recorded canary result.” | “Live probe failed. Showing a recorded result from {time}.” |
| Repair | “Repair is running…” | “No repair has been requested.” | “Repair outcome unknown. Check engine records before retrying.” |
| Backup | N/A: no request | N/A: blocked action | “Backup is unavailable until the private-backup boundary is approved.” |
| Constellation | “Brain overview is loading…” | “No creators yet — add your first creator.” | “Interactive view unavailable. Use the creator list.” |

Run states use “Starting…”, “Running”, “Completed”, “Failed”, “Interrupted”, and “Outcome unknown”. Lock refusal: “Another run owns this store: PID {pid}, host {host}.” Missing holder fields render “unknown”, not invented identifiers.

Validation copy: “Enter a creator handle, channel URL, or channel ID.”; “Use 200 characters or fewer.”; “Enter search terms.”; “Use 300 characters or fewer.”; “Enter a positive whole number.”

Success copy: “Creator added — disabled.” or “Creator already exists — settings preserved.”; “Creator is now enabled.” / “Creator is now disabled.” Never report enabled state from an optimistic toggle.

Focus traps apply only to open dialogs. Escape closes and restores the initiating DOM control. Scene canvas is an enhancement; the roster provides the full keyboard path. All controls are ≥44×44px. Loading indicators stop under reduced motion.
