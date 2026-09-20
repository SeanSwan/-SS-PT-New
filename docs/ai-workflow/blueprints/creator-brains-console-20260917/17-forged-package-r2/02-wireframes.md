**Exact tokens**

| Role | Token |
|---|---|
| Page | `var(--bg-base, #030712)` |
| Card / drawer | `var(--carbon, #141419)` / `var(--graphite, #1A1A24)` |
| Elevated surface | `var(--royal-depth, #003080)` |
| Required text | `var(--frost-white, #E0ECF4)` |
| Primary control | `var(--midnight-sapphire, #002060)` |
| Focus / primary glow | `var(--wing-purple, #8B5CF6)` |
| Secondary glow / enabled | `var(--ice-wing, #60C0F0)` |
| Warning / stale | `var(--gilded-fern, #C6A84B)` |
| Disabled marker | `var(--swan-lavender, #4070C0)` |
| Error accent | `var(--danger, #E5484D)` |
| Chart data only | `var(--arctic-cyan, #50A0F0)` |

Use existing spacing tokens 4/8/12/16/24/32/48/72px and radii 12/20/24px. Required text uses Frost White, including labels on warning/error surfaces. Measure contrast; do not infer it from token names.

**Desktop, 1440×900**

```text
+-----------------------------------------------------------------------+
| Creator Brains Console                         Last checked: {time}    |
| {global refusal or stale notice}                                       |
+----------------------------+------------------------------------------+
| BRAINS                     | STATUS                                   |
|                            | yt-dlp: {verdict, source, age, note}      |
| {static preview / scene}   | Creators | Coverage and states | Budget  |
|                            | Backlog | Throttle | Census | Lock       |
| [View creators]            | Last run | Last good | Documents         |
|                            | Published brains | Recent runs           |
|                            +------------------------------------------+
|                            | CREATORS                    [Add creator] |
|                            | {title}  Enabled: {Yes/No} {fetched}/{all} |
|                            | [Open brain]                [Enable/Disable]|
|                            +------------------------------------------+
|                            | ASK THE BRAINS                           |
|                            | Search terms [________________________]   |
|                            | Creator [All creators v]          [Ask]  |
|                            | {query state/results}                    |
|                            +------------------------------------------+
|                            | RUN THE DAILY PASS                       |
|                            | Operations per hour [20]      [Run pass] |
|                            | {phase, journal, budget, throttle, lock} |
|                            +------------------------------------------+
|                            | OPERATIONS                               |
|                            | [Check canary] [Repair] [Backup disabled]|
|                            | {result / blocked explanation}           |
|                            | Restore T4 · Rollback T4 · Authorize T3  |
|                            | CLI only                                 |
+----------------------------+------------------------------------------+
```

≥1280px: 40% scene, 60% deck; deck minimum 640px. At 768–1279px: preview above deck. At ≤767px: static 96px preview, no three.js download.

**Mobile, 375×812**

```text
+-----------------------------------+
| Creator Brains Console             |
| Last checked: {time}               |
| {global notice}                   |
+-----------------------------------+
| BRAINS                            |
| {static preview, 96px}             |
| [View creators]                   |
+-----------------------------------+
| STATUS                            |
| yt-dlp                            |
| {verdict / provenance / age}       |
| {each remaining instrument stacked}|
+-----------------------------------+
| CREATORS                          |
| [Add creator]                     |
| {title, wraps}                    |
| Enabled: {Yes/No}                 |
| Videos: {count/Unavailable}        |
| Fetched: {count/Unavailable}       |
| [Open brain] [Enable/Disable]      |
+-----------------------------------+
| ASK THE BRAINS                    |
| Search terms                      |
| [_______________________________] |
| Creator [All creators          v] |
| [Ask]                             |
| {query state/results}             |
+-----------------------------------+
| RUN THE DAILY PASS                |
| Operations per hour [20]          |
| [Run pass]                        |
| {phase and instruments}           |
+-----------------------------------+
| OPERATIONS                        |
| [Check canary] [Repair]            |
| [Backup disabled]                 |
| {result / blocked explanation}    |
| Restore T4 — CLI only             |
| Rollback T4 — CLI only            |
| Authorize T3 — CLI only           |
+-----------------------------------+
```

The same stacked structure works at 320px and 414px. No unspecified hamburger, MORE panel or hidden mobile action set.

**Add dialog, desktop 560px / mobile 375px**

```text
+----------------------------------------+
| Add creator                    [Close] |
| Handle, channel URL, or ID              |
| [____________________________________] |
| New creators start disabled.            |
| Existing creators keep their settings. |
| {validation / progress / result}        |
| [Cancel]                 [Add creator] |
+----------------------------------------+
```

At 375px, the dialog becomes a full-width sheet with 16px padding and vertically stacked controls when needed. During submission: “Resolving creator…” and “This request continues if you close this form.” Disable duplicate submission; Close remains available.

Success: **“Creator saved. Enabled: {Yes/No}.”**

**Drawer, desktop 640px / mobile full screen**

```text
+------------------------------------------------+
| {creator title}                        [Close] |
| {channelId}                                    |
| Published generation: {generation/None}         |
| [Index] [Topics] [Timeline] [Claims]             |
| {document or state frame}                      |
|                                                |
| {keyPhrase}                                    |
| {statement}                                    |
| {creatorTitle} · {timestamp}      [Watch video] |
| {N} items could not be read.                    |
| [Show details]                                 |
+------------------------------------------------+
```

At 375px, tabs wrap to two rows and citations stack. Documents are escaped plain text preserving line breaks; no HTML interpretation or remote embeds.

**Query results, desktop panel / mobile stacked card**

```text
+------------------------------------------------+
| Results for “{submitted terms}”                |
| {keyPhrase}                                    |
| {statement}                                    |
| {creatorTitle} · {timestamp}      [Watch video] |
| {N} items could not be searched.                |
| [Show details]                                 |
+------------------------------------------------+
```

**State frames used in every panel at both widths**

```text
LOADING / EMPTY                  PARTIAL / STALE
+----------------------------+  +----------------------------+
| {exact state copy below}   |  | {last confirmed content}   |
| {static skeleton or CTA}   |  | {notice and timestamp}     |
+----------------------------+  | [Show details] [Refresh]   |
                                +----------------------------+

ERROR / DENIED / VALIDATION       SUCCESS
+----------------------------+  +----------------------------+
| {named reason}             |  | {authoritative result}     |
| {inline field explanation} |  | {permitted next action}    |
| [Retry, when appropriate]  |  +----------------------------+
+----------------------------+
```

| Surface | Loading / empty | Partial, error or denied | Success / recovery |
|---|---|---|---|
| Status | “Reading engine status…” / “No creators yet — add your first creator.” | “Unable to read {file}.” / “Showing the last confirmed reading from {time}.” | Show all readable instruments; `[Refresh]` |
| Health | “Checking yt-dlp…” / “No recorded canary result.” | “Live probe failed. Recorded result from {time}.” / “Health is unknown.” | “yt-dlp resolved · {version} · checked {time}” |
| Roster | “Loading creators…” / “No creators yet — add one.” | “Counts unavailable.” / “Creator change confirmed. Roster refresh failed.” | “Creator is now enabled.” / “Creator is now disabled.” |
| Drawer | “Loading published brain…” / “No published brain for this creator.” | “{N} items could not be read.” / “Unable to read {file}.” | Documents and claims; `[Retry]` after read failure |
| Query | “Searching published brains…” / “No matching claims for “{terms}”.” | “{N} items could not be searched.” | Show submitted terms and citations; `[Ask]` |
| Run | “Reading run state…” / “The daily pass has not run yet.” | “Another run owns this store: PID {pid}, host {host}.” / “Run outcome unknown. Check engine records before retrying.” | “Starting…”, “Running”, “Completed”, “Failed”, “Interrupted”, “Outcome unknown” |
| Repair | “Repair is running…” / “No repair has been requested.” | “Repair outcome unknown. Check engine records before retrying.” | “Repair completed.” or “Repair failed.” plus four counts |
| Backup | No request or loading state | “Backup is unavailable until the private-backup boundary is approved.” | Disabled, explanatory copy always visible |
| Scene | “Brain overview is loading…” / “No creators yet — add your first creator.” | “Interactive view unavailable. Use the creator list.” | Roster-equivalent data |

Validation strings:

- “Enter a creator handle, channel URL, or channel ID.”
- “Use 200 characters or fewer.”
- “Enter search terms.”
- “Use 300 characters or fewer.”
- “Enter a positive whole number.”

Unknown holder fields show “unknown”. Cancel before dispatch sends nothing. A lost mutation response offers **“Refresh to check outcome”**, never an automatic retry.

All controls are ≥44×44px. Dialogs trap focus; Escape restores the invoking DOM control. Canvas clicks select the same creator as the roster; canvas is not a separate required keyboard workflow. Use polite live announcements for results, alert semantics for refusals, and static loading indicators under reduced motion.
