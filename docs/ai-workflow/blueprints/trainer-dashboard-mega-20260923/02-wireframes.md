**Candidate r3 — 2026-09-24. Owner: Astra document repair. Design contract only; implementation and product tests NOT RUN.**

Supersedes the r2 text only in this candidate. Hash-verified originals remain in the review preservation set.

**Visual direction**

Use an editorial coaching workspace: an open heading area, a prominent next action, compact information bands, and deliberately varied panel widths. Avoid a uniform wall of equally sized KPI boxes.

Static quality comes from spacing, typography, surface contrast, chrome edges, restrained gradients, and clear data hierarchy. Effects are enhancement only.

**Exact proposed token contract**

These are **new centrally emitted aliases**, pending binding to the actual theme emitter under B-02. They are not asserted existing tokens.

| Element | Required CSS reference |
|---|---|
| Page | `var(--td-bg, #0A0A0F)` |
| Main surface | `var(--td-surface, #002060)` |
| Raised surface | `var(--td-raised, #003080)` |
| Primary text | `var(--td-text, #E0ECF4)` |
| Secondary text | `var(--td-muted, #B5C6D8)` |
| Chrome border | `var(--td-border, #7993B5)` |
| Primary control | `var(--td-action, #002060)` |
| Control text | `var(--td-on-action, #E0ECF4)` |
| Focus ring | `var(--td-focus, #8B5CF6)` |
| Decorative glow | `var(--td-glow, #60C0F0)` |
| Data visualization | `var(--td-data, #50A0F0)` |

Each alias must resolve through the active global palette, including non-default palettes. Fallback values are proposed design defaults, not proof of theme integration. Destructive actions use the verified production `danger` button theme after contrast testing; no additional red token is invented here.

**Geometry**

- One `WorkspaceShell`; maximum content width 1,760px.
- Content padding: 16px below 768px; 24px otherwise.
- Grid: 4 columns below 768px, 8 below 1,200px, 12 thereafter; gaps 16/20/24px respectively.
- Surface radius 20px; feature surface 28px; inputs 12px; status pills fully rounded.
- Buttons, tabs, menu items, and icon hit areas: minimum 44×44px.
- Body 16px/24px; secondary text 14px/20px; heading 28px/34px mobile and 36px/42px desktop.
- Use the verified global font stack. No new font download.
- Tables become labeled row cards at 375px; no page-level horizontal scrolling.
- Shared states use the same dimensions as the successful content they replace.

All bracketed controls below are real 44px-minimum controls. `{value}` denotes authoritative data, never seeded production content.

**Home — desktop**

```text
┌──────────────────────────────────────────────────────────────────┐
│ Home                                      [Effects: Auto ▾]      │
│ Your coaching day                                                │
│ Updated {time}                                                   │
├──────────────────────────────────────────┬───────────────────────┤
│ NEXT SESSION                             │ NEEDS ATTENTION       │
│ {time} · {client display name}            │ {reason}              │
│ {session type}                            │ {client} [View client]│
│ [Log workout] [View client]               │ [View all]            │
├──────────────────────────────────────────┴───────────────────────┤
│ Completed sessions {n}   Active clients {n}   Awaiting review {n} │
├──────────────────────────────────────────┬───────────────────────┤
│ Training activity                        │ Recent progress       │
│ {Victory chart + accessible data table}   │ {verified milestones} │
│ [7 days] [30 days]                        │ [View progress]       │
└──────────────────────────────────────────┴───────────────────────┘
```

**Home — 375px**

```text
┌─────────────────────────────────┐
│ Home                 [Effects ▾]│
│ Your coaching day               │
│ Updated {time}                  │
│ NEXT SESSION                    │
│ {time} · {client}                │
│ [Log workout] [View client]      │
│ Completed {n} · Active {n}       │
│ Awaiting review {n}              │
│ NEEDS ATTENTION                  │
│ {reason}         [View client]  │
│ Training activity               │
│ [7 days] [30 days]               │
│ {chart} [View data table]        │
│ Recent progress                 │
│ {milestone} [View progress]      │
└─────────────────────────────────┘
```

**My Clients / Clients and Team — desktop**

```text
┌──────────────────────────────────────────────────────────────────┐
│ {My Clients | Clients and Team}                                  │
│ {admin only: [Clients] [Team]}                                   │
│ [Search clients________________] [Status ▾] [Sort ▾]              │
├─────────────────────┬─────────────────────┬──────────────────────┤
│ {avatar} {name}      │ {same card}         │ {same card}          │
│ {status}            │                     │                      │
│ Last workout {date} │                     │                      │
│ Sessions left {n/—} │                     │                      │
│ {real progress}     │                     │                      │
│ [Log workout]       │                     │                      │
│ [View client] […]   │                     │                      │
└─────────────────────┴─────────────────────┴──────────────────────┘
```

**My Clients / Clients and Team — 375px**

```text
┌─────────────────────────────────┐
│ {role-specific title}           │
│ {admin: [Clients] [Team]}        │
│ [Search clients_______________] │
│ [Status ▾] [Sort ▾]              │
│ {avatar} {name}          {status}│
│ Last workout {date}             │
│ Sessions remaining {n/—}        │
│ {progress + source period}      │
│ [Log workout] [View client] […] │
│ {next card}                     │
│ [Load more]                     │
└─────────────────────────────────┘
```

Team uses the same shell but a distinct staff row: `{name}`, `{role}`, `{assigned client count}`, and `[View team member]`. Team does not reuse client health metrics.

**Equipment Manager — desktop**

```text
┌──────────────────────────────────────────────────────────────────┐
│ Equipment Manager                             [Add profile]      │
│ Know what is available before you build a session.                │
├───────────────────┬──────────────────────────────────────────────┤
│ [Search profiles] │ {Profile name} [Edit profile]                 │
│ {profile list}    │ {location type} · Updated {time}              │
│                   │ Total {n} · Available {n} · Needs review {n} │
│                   │ [Search equipment____] [Category ▾]          │
│                   │ Name | Category | Availability | Updated     │
│                   │ {item}                  [View equipment]     │
│                   │ [Add equipment]                              │
└───────────────────┴──────────────────────────────────────────────┘
```

**Equipment Manager — 375px**

```text
┌─────────────────────────────────┐
│ Equipment Manager               │
│ [Profile ▾] [Add profile]        │
│ {Profile name} [Edit profile]   │
│ Total {n} · Available {n}        │
│ Needs review {n}                │
│ [Search equipment_____________] │
│ [Category ▾] [Add equipment]    │
│ {Item name}                     │
│ {category} · {availability}      │
│ Updated {time} [View equipment] │
└─────────────────────────────────┘
```

Equipment detail/edit is a right drawer, 480px desktop; a full-height sheet at 375px:

```text
Desktop                              375px
┌──────────────────────────────┐     ┌─────────────────────────────┐
│ Equipment details        [×] │     │ [Back] Equipment details    │
│ {photo or "No photo"}        │     │ {photo or "No photo"}       │
│ Name [____________________]  │     │ Name [___________________]  │
│ Category [_______________▾]  │     │ Category [______________▾]  │
│ Availability [___________▾]  │     │ Availability [__________▾]  │
│ Quantity [__]                │     │ Quantity [__]               │
│ Notes [___________________]  │     │ Notes [__________________]  │
│ Supported exercises {list}   │     │ Supported exercises {list}  │
│ Source {source} · {time}     │     │ Source {source} · {time}    │
│ [Cancel] [Save equipment]    │     │ [Cancel] [Save equipment]   │
└──────────────────────────────┘     └─────────────────────────────┘
```

Unbound fields display “Not recorded” and remain non-editable until backend storage is verified. “Supported exercises” is informational; this slice does not generate variations.

**Sprint Planner — desktop**

```text
┌──────────────────────────────────────────────────────────────────┐
│ Sprint Planner                                  [Create sprint] │
│ Plan a block of bootcamp classes, then review each session.       │
├───────────────────┬──────────────────────────────────────────────┤
│ {sprint list}     │ {Sprint name} · {date range}                  │
│                   │ [Weeks] [Calendar]                           │
│                   │ Generated {n}/{total} · Taught {n}/{total}   │
│                   │ Week {n} {Deload when recorded}               │
│                   │ {date} {class} {status} [View session]        │
│                   │ [Generate sessions]                          │
└───────────────────┴──────────────────────────────────────────────┘
```

**Sprint Planner — 375px**

```text
┌─────────────────────────────────┐
│ Sprint Planner                  │
│ Plan a block of bootcamp classes│
│ [Sprint ▾] [Create sprint]      │
│ {name} · {date range}           │
│ [Weeks] [Calendar]               │
│ Generated {n}/{total}           │
│ Week {n} · {Deload if recorded} │
│ {date} {class} {status}         │
│ [View session]                  │
│ [Generate sessions]             │
└─────────────────────────────────┘
```

Create/detail forms expose only settings proven by the current sprint contract. No superseded field is silently added. During generation show “Generating sessions — {done} of {total}”; on interruption show “Connection interrupted. Checking generation status…” before offering retry.

**Mandatory remaining wireframes**

- [Video, Intake & Devices, Coach review, and Earnings](02-specialist-wireframes.md).
- [All screen states, mutation dialogs, recovery, and accessibility](02-state-wireframes.md).

All layouts remain required at desktop and 375px; these companions are part of this entry, not optional references.
