**Candidate r3 — 2026-09-24. Owner: Astra document repair. Design contract only; implementation and product tests NOT RUN.**

Mandatory companion to [02-wireframes.md](02-wireframes.md); same scope, bindings, and pending approvals.

**Per-screen state drawings**

Each cell below is a literal replacement body inside that screen’s shell. Desktop preserves the shown horizontal grouping; mobile stacks each `|` segment. Exact strings are quoted.

| Screen/state | Desktop body | 375px body |
|---|---|---|
| Home/loading | `[Home] [Loading your coaching day…] [static skeleton]` | `[Home] / [Loading your coaching day…] / [skeleton]` |
| Home/empty | `[No sessions today.] [View clients]` | `[No sessions today.] / [View clients]` |
| Home/error | `[Your coaching day could not be loaded.] [Retry]` | `[Your coaching day could not be loaded.] / [Retry]` |
| Home/denied | `[You do not have access to this workspace.] [Return to dashboard]` | `[Access message] / [Return to dashboard]` |
| Clients/loading | `[Search disabled] [Loading clients…] [card skeletons]` | `[Loading clients…] / [card skeleton]` |
| Clients/empty | `[No clients match these filters.] [Clear filters]` | `[No clients match these filters.] / [Clear filters]` |
| Clients/error | `[Clients could not be loaded.] [Retry]` | `[Clients could not be loaded.] / [Retry]` |
| Clients/denied | `[You do not have access to these clients.] [Return to dashboard]` | `[You do not have access to these clients.] / [Return to dashboard]` |
| Team/loading | `[Loading team…] [row skeletons]` | `[Loading team…] / [row skeleton]` |
| Team/empty | `[No team members to display.]` | `[No team members to display.]` |
| Team/error | `[Team members could not be loaded.] [Retry]` | `[Team members could not be loaded.] / [Retry]` |
| Team/denied | `[You do not have access to team management.] [Back to clients]` | `[You do not have access to team management.] / [Back to clients]` |
| Equipment/loading | `[Profiles skeleton] [Loading equipment…]` | `[Loading equipment…] / [item skeleton]` |
| Equipment/empty | `[No equipment in this profile.] [Add equipment]` | `[No equipment in this profile.] / [Add equipment]` |
| Equipment/error | `[Equipment could not be loaded.] [Retry]` | `[Equipment could not be loaded.] / [Retry]` |
| Equipment/denied | `[You do not have access to this equipment profile.] [Back to profiles]` | `[You do not have access to this equipment profile.] / [Back to profiles]` |
| Sprint/loading | `[Sprint list skeleton] [Loading sprint…]` | `[Loading sprint…] / [week skeleton]` |
| Sprint/empty | `[No sprints yet.] [Create sprint]` | `[No sprints yet.] / [Create sprint]` |
| Sprint/error | `[Sprint could not be loaded.] [Retry]` | `[Sprint could not be loaded.] / [Retry]` |
| Sprint/denied | `[You do not have access to this sprint.] [Back to sprints]` | `[You do not have access to this sprint.] / [Back to sprints]` |
| Video/loading | `[Loading assessment…] [camera off]` | `[Loading assessment…] / [camera off]` |
| Video/empty | `[No assessment is ready to join.] [Return to dashboard]` | `[No assessment is ready to join.] / [Return to dashboard]` |
| Video/error | `[Connection lost. Your camera is off.] [Reconnect] [Leave assessment]` | `[Connection lost. Your camera is off.] / [Reconnect] / [Leave assessment]` |
| Video/denied | `[You cannot join this assessment.] [Return to dashboard]` | `[You cannot join this assessment.] / [Return to dashboard]` |
| Intake/loading | `[Loading intake and devices…] [source skeleton]` | `[Loading intake and devices…] / [source skeleton]` |
| Intake/empty | `[No device connected.] [Import device export]` | `[No device connected.] / [Import device export]` |
| Intake/error | `[Device data could not be loaded.] [Retry]` | `[Device data could not be loaded.] / [Retry]` |
| Intake/denied | `[You do not have access to this intake.] [Return to dashboard]` | `[You do not have access to this intake.] / [Return to dashboard]` |
| Earnings/loading | `[Loading earnings…] [amount skeletons]` | `[Loading earnings…] / [amount skeletons]` |
| Earnings/empty | `[No earnings in this period.] [Change period]` | `[No earnings in this period.] / [Change period]` |
| Earnings/error | `[Earnings could not be loaded.] [Retry]` | `[Earnings could not be loaded.] / [Retry]` |
| Earnings/denied | `[You do not have access to this statement.] [Return to dashboard]` | `[You do not have access to this statement.] / [Return to dashboard]` |
| Earnings/policy pending | `[Earnings terms are being configured.] [amounts omitted]` | `[Earnings terms are being configured.] / [amounts omitted]` |

In the Home denied mobile drawing, `[Access message]` is exactly “You do not have access to this workspace.”

**Mutation and dialog states — both widths**

```text
Desktop: [Existing content] [Saving… disabled] [Cancel disabled during commit]
375px:   [Existing content]
         [Saving… disabled]

Desktop: [Existing edits] [Changes were not saved.] [Retry] [Cancel]
375px:   [Existing edits]
         [Changes were not saved.]
         [Retry] [Cancel]

Desktop: [Field] [Enter a valid value.] [Save disabled]
375px:   [Field]
         [Enter a valid value.]
         [Save disabled]

Desktop: [Saved.] [Authoritative refreshed content]
375px:   [Saved.]
         [Authoritative refreshed content]

Desktop: [Unsaved changes] [Keep editing] [Discard changes]
375px:   [Unsaved changes]
         [Keep editing]
         [Discard changes]
```

Cancelling an unsent edit sends no mutation. Discarding an already uploaded import invokes the explicit discard operation. Once a commit is accepted, the UI may close but must reconcile the operation rather than imply rollback.

**Partial/stale states**

Keep valid sections visible. Put “Some information could not be loaded” beside the failed section, with its own Retry. Show “Last updated {time}” for cached data. Never convert a failed request into zero counts.

**Accessibility and focus**

Focus order: heading → page filters → primary action → content → pagination. Dialogs move focus to their heading, trap focus, close with Escape unless a non-cancellable commit is in progress, and return focus to the opener. Use a 2px `--td-focus` outline with 2px offset. Static focus indication remains enabled at every effects tier.
