# SCU-UX — Session Desk and role wireframes

Owner: Sean/Codex. Version: 3.0. Status: design proposal; no UI implementation.
Supersedes: v2 static Lane-only wireframes. Uses Swan design-router principles.

## Three directions and recommendation

| Direction | Structure and signature | Tradeoff |
|---|---|---|
| A. Quiet Coach | Existing chat with compact inline result cards and a dock | Lowest change; complex workouts stay text-heavy |
| B. Session Desk — recommended | Conversation + editable task workspace + verified result timeline | More coordination work; clearest training loop |
| C. Floor Mode | Large set-entry controls, minimal speech transcript, rest display | Best during workouts; insufficient as the whole admin assistant |

Plan B as the full workspace; C is an explicit mode of the same task, not another
chatbot. Keep A’s restraint on small screens. Final visual direction requires
Sean’s design selection before UI implementation; foundation contracts do not.
Static `wireframes.html` visualizes B for review; synthetic data only.

Surface: working dashboard. Emotional job: orientation, confidence, momentum.
Stack: React/styled-components, Victory for real progress, existing design tokens.
Signature: editable workout draft becomes a verified saved record on the timeline.
No orb/personality animation should compete with client identity or set data.
Use existing typography and token fallbacks; blue controls/purple focus glow,
44px minimum targets, 4.5:1 body contrast, reduced-motion static borders.

## Desktop — shared shell, role-specific content

```text
┌ App navigation ┬ Coach / Current task ────────────────────────────────┐
│ Home           │ [Client-101 ▾]  Session: Today  [Data checked 10:42]   │
│ Workouts       ├ Conversation ────────┬ Session workspace ─────────────┤
│ Progress       │ You: Log bench…    │ DRAFT · not yet saved           │
│ Coach          │ Coach: 3 × 8?      │ Exercise   Sets Reps Load Unit  │
│                │                    │ Bench       3     8   135 lb    │
│                │ source/why links   │ [Edit row] [Add set]            │
│                │                    │ [Review and save]               │
│                ├ Verified results ──┴─────────────────────────────────┤
│                │ 10:38 Warmup saved · Open record · Correction         │
│                │ Pending: bench workout · 0 verified effects           │
│                ├ [Voice] Ask or act…                    [Send]         │
│                │ [History] [Memory] [Capabilities] [Private chat]       │
└────────────────┴──────────────────────────────────────────────────────┘
```

At 1440px the workspace is two columns. At 2560×1440 / 3840×2160 use a fluid
two-column desk with a readable transcript width and additional record detail;
never stretch prose across the monitor. Tool rows wrap, not truncate critical IDs.

## Mobile 320/390/414px

```text
┌ Coach                 [History] ┐
│ Client-101 ▾ · Today            │
│ [Talk] [Workout · 1] [Results]  │
│ DRAFT · not saved              │
│ Bench press                    │
│ 3 sets · 8 reps · 135 lb        │
│ [Edit] [Review and save]        │
│                                │
│ Coach: Confirm the load unit.  │
│ [Pounds] [Kilograms]            │
├────────────────────────────────┤
│ [Mic] Ask or act…       [Send]  │
└────────────────────────────────┘
```

Tabs switch projections of the same draft/intent; never fork its state. Mobile
composer respects safe-area and visualViewport keyboard height. Exactly one
content scroll owner per tab. 200% text zoom reflows, with no horizontal scrolling.
Cmd/Ctrl+K focuses the visible surface’s input; Escape closes suggestions before
canceling an idle preview; never cancels an in-flight write or confirms anything.

## Four roles — desktop and phone differences

| Role | Desktop workspace | Phone first view | Must not show |
|---|---|---|---|
| Admin | Authorized roster selection; next session; stale-client evidence; pending reviews | Selected client + one current task; roster drawer | Unscoped bulk “do everything”; secrets; implicit payment authority |
| Trainer | Assigned clients only; plan constraints; last session comparison | Active session, sets, rest; change-client action deliberate | Other trainers’ unassigned client data or admin account tools |
| Client | Self pinned; today’s plan, own draft, personal progress | Own workout draft and quick correction | Roster picker, staff-only notes or cross-client actions |
| User | General guidance and enabled self-service capabilities | Ask Coach; explain unavailable training features | Pretend assigned trainer, invented plan or admin tools |

Generic user route/mount is an S1 verification gate. If absent, keep the existing
entry and do not create `/dashboard/user/coach-assistant` by assumption.

## Review card — all paths use the same stored policy

```text
Review workout for Client-101
Source: today’s draft, revision 4 · Voice originated
Bench press: 3 × 8 @ 135 lb
Save to: today’s workout diary / existing session
Session accounting: from existing domain preview, never model-generated
Reversibility: Correction available only if verified by domain
[Change draft] [Cancel] [Confirm save]
```

No false “Affects 0 records” when count is unknown: show “Count checked on save.”
Names may display only through authorized local mapping; spoken output defaults
to “your selected client.” Preview must show exercise identity, units, dates,
target and material consequences, not just a command key.

## Required states and exact meaning

| State | Copy / primary action | Focus and side effects |
|---|---|---|
| Empty | “What are we working on?” + Log workout / Review progress / Ask | No auto-created workout |
| Loading context | “Checking this client’s records…” | Composer usable for general questions |
| Missing pain data | “Pain information is unavailable.” / Retry or manual review | Do not imply pain-free |
| Draft | “Draft — not saved” / Review | Editing invalidates old approval |
| Ambiguous | One question with explicit options | Preserve raw numbers and units |
| Cross-client | “This request names a different client.” / Re-anchor | Show only accessible target choices; no write |
| Refused | Specific safe reason / eligible manual alternative | No confirm control |
| Arming | “Review the details before confirming.” | Time-bound disabled confirm; no auto-focus while reading |
| Submitting | “Saving…” | Disable repeat and cancel-write; keep response-stop separate |
| Unknown | “Checking whether it saved.” / Check result | No reissue button |
| Verified | “Saved and checked.” / Open record | Offer correction only with valid inverse contract |
| Known failed | “Nothing was saved.” only with rollback evidence / Review retry | New approval, stable intent identity |
| Offline | “Draft kept on this device; not saved.” | No silent sync of writes on reconnect |
| Memory forgotten | “Removed from Coach memory.” | Do not imply medical/business records were deleted |

Dialogs trap focus, restore the invoking control, and expose a named close action.
Embedded dock sheets use region semantics; do not trap the whole page. Announce
state changes once with aria-live; convey status in text as well as color.
Test realistic long exercise names, large font, soft keyboard, reduced motion,
screen reader, keyboard-only, touch-only and IME composition.

## Manual parity

The same draft remains editable in native workout forms. Model outage leaves
manual logging usable. “Open in Logger” carries draft identity and revision, not
a second copy that can accidentally submit twice. Navigating back preserves it.
