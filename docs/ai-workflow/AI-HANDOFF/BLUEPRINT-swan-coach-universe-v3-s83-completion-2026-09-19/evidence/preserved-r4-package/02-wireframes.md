# Existing surfaces: completion acceptance

No new screen, navigation item, design system or Session Desk mount is authorized.

## Exact styling contract

Use the supplied theme contracts:

```css
background: var(--bg-base, #030712);
color: var(--text-primary, #E0ECF4);
border-color: var(--accent-primary, #60C0F0);
outline-color: var(--accent-primary, #60C0F0);
```

`--bg-base` and `--accent-primary` are supplied project tokens. `--text-primary` is the explicit package text-token choice with the supplied Frost White fallback; do not redefine it globally. If an existing component uses a different canonical text token, C0 must supply that declaration and the package must bind it before a styling edit.

No raw palette literals outside token fallbacks. Use existing styled-components; shared interpolated style fragments require `css`. Minimum controls: **44×44 CSS px**. Verify 4.5:1 text contrast at the actual computed colors.

All layouts below use these tokens. Overlay surfaces may use the same background; no additional invented elevation token is required.

## A. Coach selection and conversation

```text
DESKTOP 1440×900
┌────────────────────────────────────────────────────────────┐
│ Existing sidebar │ Coach                                   │
│                  │ Now coaching                            │
│                  │ [Client 42 ▾] [New chat] [Tools]          │
│                  │ [Talk] [Review] [History]                │
│                  │ {SELECTION STATUS}                      │
│                  │                                         │
│                  │ Existing transcript                     │
│                  │                                         │
│                  │ [Message Coach                       ]   │
│                  │ [More] [Mic] [Send]                      │
└────────────────────────────────────────────────────────────┘

MOBILE 375×812
┌─────────────────────────────────┐
│ Existing header / safe area     │
│ [Open dashboard menu] [Back]    │
│ Reserved chrome band + gap      │
├─────────────────────────────────┤
│ Coach                           │
│ Now coaching                    │
│ [Client 42 ▾                  ] │
│ [New chat] [Tools]               │
│ [Talk] [Review] [History]        │
│ {SELECTION STATUS}              │
│ Existing transcript             │
│ [Message Coach                ] │
│ [More] [Mic] [Send]              │
│ Bottom safe area                │
└─────────────────────────────────┘
```

The menu’s actual role-specific accessible name remains unchanged. “Open dashboard menu” is the common wireframe label, not an instruction to rename role-specific controls.

| State | Exact status / controls |
|---|---|
| Unscoped | `No main client` |
| Checking | `Checking selection…` — Send disabled; prior target content masked |
| Committing/settlement wait | `Finishing selection…` — Send disabled |
| Invalid | `This selection link is invalid.` `[Return to original]` `[Leave Coach]` |
| Denied | `You do not have access to this selection.` `[Return to original]` `[Leave Coach]` |
| Recoverable failure | `The selection could not settle.` `[Retry selection]` `[Return to original]` `[Leave Coach]` |
| Failure before discard | `Your draft is still available in this session.` |
| Failure after confirmed discard | `The draft was discarded, but the selection could not settle.` |
| Ready new thread | Existing exact role copy: `New Coach Chat ready` or `New Coach Thread ready` |
| Adoption pending | `Finishing the new conversation…` |
| Adoption failure | `The new conversation could not be opened. Your message was not sent.` |
| Retired actor | Close private overlays and mask old target content; do not announce old success |

The adoption failure copy is permitted only when the trace proves the follow-on message was not transmitted. Ambiguous transmission uses `The message result could not be confirmed.` and requires the existing reconciliation contract.

## B. Dirty selection decision and blocked navigation

```text
DESKTOP — centered existing modal
┌─────────────────────────────────────────────────────┐
│ Keep your current work?                             │
│ From: Client 42                                     │
│ To: Client 43                                       │
│ {DECISION NOTICE}                                   │
│ [Return] [Discard draft and switch]                  │
│ [Leave Coach and keep draft]                        │
└─────────────────────────────────────────────────────┘

MOBILE 375px — scrollable within viewport
┌─────────────────────────────────┐
│ Keep your current work?         │
│ From: Client 42                 │
│ To: Client 43                   │
│ {DECISION NOTICE}               │
│ [Return                       ] │
│ [Discard draft and switch     ] │
│ [Leave Coach and keep draft    ] │
└─────────────────────────────────┘
```

Exact existing refusal strings:

- `That draft changed while this decision was open. Nothing was discarded — Return, or choose Leave.`
- `The draft could not be discarded. Nothing was changed — Return, or choose Leave.`

During owner decision: `Checking whether this switch is allowed…`.

Initial focus: **Return**. Escape invokes Return, never Discard. After a refused Discard, disable that transition’s destructive action while retaining Return and Leave. Reset/proceed are mutually exclusive.

Selection-owner Return may require fresh admission. **Blocked-router Return calls the existing blocker reset only**, preserving pathname, search and hash exactly.

Draft retention is limited to the existing shell lifecycle. No claim of survival after hard reload or off-origin departure.

## C. Memory inspect, correction and forget

```text
DESKTOP — existing drawer
┌─────────────────────────────────────────────────────┐
│ Coach memory — Client 42                    [Close] │
│ [Active] [History] [Category ▾]                      │
│ {MEMORY STATUS}                                     │
│ Injury constraint · Active                          │
│ Synthetic statement wraps within drawer.            │
│ [Correct] [Forget this version]                     │
│ [Load more]                                         │
└─────────────────────────────────────────────────────┘

MOBILE 375px
┌─────────────────────────────────┐
│ Coach memory — Client 42        │
│ [Close]                         │
│ [Active] [History]              │
│ [Category ▾                   ] │
│ {MEMORY STATUS}                 │
│ Injury constraint · Active      │
│ Synthetic statement wraps.      │
│ [Correct                      ] │
│ [Forget this version          ] │
│ [Load more                    ] │
└─────────────────────────────────┘
```

```text
CORRECTION — desktop content / mobile stacked
┌─────────────────────────────────┐
│ Correct this version            │
│ Category [                    ▾]│
│ Statement                       │
│ [                             ] │
│ [                             ] │
│ Valid from [YYYY-MM-DD          ]│
│ Valid to, optional [           ]│
│ {CORRECTION STATUS}             │
│ [Save correction] [Cancel]      │
└─────────────────────────────────┘

FORGET — desktop modal / mobile stacked
┌─────────────────────────────────┐
│ Forget this version?            │
│ This removes this version from  │
│ Coach retrieval.                │
│ Other versions are unchanged.   │
│ [Cancel]                        │
│ [Forget this version]           │
└─────────────────────────────────┘
```

| State | Exact copy / action |
|---|---|
| Initial loading | `Loading Coach memory…` |
| Empty filter | `No memory matches this filter.` |
| Next page loading | `Loading more…` — preserve current rows |
| Page failure | `More memory could not be loaded.` `[Retry loading]` |
| Initial failure | `Coach memory could not be loaded.` `[Retry loading]` |
| Denied | `You do not have access to this memory.` `[Close]` |
| Waiver required | `Complete the required waiver to view this memory.` `[Close]`; add waiver link only when its route is supplied |
| Correction pending | `Saving correction…` |
| Correction committed | `Correction saved.` |
| Ambiguous correction response | `The save result could not be confirmed. Retry to check this correction.` `[Retry correction]` |
| Known validation failure | Server-approved field error, mapped through a finite C0-supplied error table; preserve input |
| Conflict | `This version changed. Reload it before making another correction.` `[Reload version]` |
| Forget pending | `Forgetting this version…` |
| Forget success | `This version was removed from Coach retrieval.` |
| Forget failure | `This version could not be forgotten.` `[Retry]` `[Cancel]` |
| Retired scope | Clear/mask old private content immediately; close editor/drawer |

No statement is copied to logs, URL, localStorage or review artifacts. A response-loss correction retry uses the **same key and body**.

## D. Self consent

```text
DESKTOP — Settings / Notifications
┌─────────────────────────────────────────────────────┐
│ Coach progress nudges                    [Off / On] │
│ Pause until [date and time                      ]   │
│ [Save pause] [Resume now]                           │
│ {CONSENT STATUS}                                    │
└─────────────────────────────────────────────────────┘

MOBILE 375px
┌─────────────────────────────────┐
│ Coach progress nudges           │
│ [Off / On]                      │
│ Pause until                     │
│ [date and time                ] │
│ [Save pause                   ] │
│ [Resume now                   ] │
│ {CONSENT STATUS}                │
└─────────────────────────────────┘
```

States: `Loading preferences…`, `Saving…`, `Preferences saved.`, `Preferences could not be saved.` with `[Retry]`.

Loading failure: `Preferences could not be loaded.` with `[Retry]`; disable writes until authority and current values are established. Never render an unknown server opt-in as a confirmed On state.

Snooze controls change only snooze. Toggle changes only opt-in. Actor change retires old reads/writes/results.

## E. Existing Logger

```text
DESKTOP — existing Logger
┌─────────────────────────────────────────────────────┐
│ Existing workout and set controls                   │
│ Rest timer  [01:00]   [existing manual controls]     │
│ [Type a command                                 ]  │
│ [Send command]                                      │
│ {COMMAND STATUS}                                    │
└─────────────────────────────────────────────────────┘

MOBILE 375px
┌─────────────────────────────────┐
│ Existing workout controls       │
│ Rest timer [01:00]              │
│ [existing manual controls]      │
│ [Type a command               ] │
│ [Send command                 ] │
│ {COMMAND STATUS}                │
└─────────────────────────────────┘
```

Exact receipts:

- Pending: `Working…`
- Applied: `Rest timer adjusted.`
- Declined: `Rest adjustment was not applied. Check the active timer and adjustment limits.`

Current failure retains the current command for retry. Retired operations emit no receipt, error, clear or stale submitting-state update. This wireframe does not authorize enabling a disabled legacy dictation lane.

## Cross-surface acceptance

Test **375×812** and **1440×900**, plus 320×568, 390×844, 414×896, 768×1024, 2560×1440 and 3840×2160. Cover 200% zoom, short landscape, keyboard inset and reduced motion.

Require focus trap/restoration for modal surfaces; polite status announcements; no hover-only controls; scrollable forms with reachable submit controls. Test closed-overlay geometry separately from intentional open overlays.

**N/A:** new database-harness screens and S90 extraction screens—neither introduces rendered UI.
