# Coach Command Center — Declutter Brainstorm

Status: built — Slice 1 implemented + verified, pending Codex/Oracle review + Sean's push
Date: 2026-06-13

## Build outcome (Slice 1 — Command Bridge)
Picked direction **Command Bridge** (recent-client rail always visible, collapses to chat). Built chat-first single-column terminal: client switcher (focal) + tabs (Chat default / Intake / PLAUD / History) + chat transcript (logs as bubbles, autoscroll) + voice-forward command dock (next-action chip, quick-intent chips, big mic + send) + slide-in Ops drawer. Controller/actions/voice/command-exec/intake/PLAUD reused unchanged. New files: CoachClientBar, CoachCommandTabBar, CoachConsoleDock, CoachChatTranscript, CoachCommandCenter.bridgeStyles + bridgeDockStyles. Edited: CoachCommandCenterPage (rewrite), CoachCommandLogEntry.styles (chat bubbles + bigger floor-legible body), CoachCommandCenter.data (clean welcome). 5 test files updated to the new DOM. **Verified:** tsc 0 errors; 525/527 coach tests (2 = pre-existing baseline, untouched old hook). NOT pushed. Residual: layout not visually QA'd (auth wall); recent rail = threads not true client entities (binding = later slice); old Composer/LogPanel/Overview orphaned (cleanup pending).
Owner: Claude (Sean-assigned; Coach is normally Codex's lane — cross-lane reservation in `.ai-workflow/coordination/claude.lane.md`, Codex hostile review to follow)
Surface: ADMIN `/dashboard/admin/coach-assistant` → `CoachCommandCenterPage`

## 2026-06-24 UX repair addendum - History + Teach Me compact mode
Status: built in isolated Codex worktree, verified locally, pending review/commit.

Flow contract now enforced:
- Recent-thread chips and History thread rows are open-thread controls, not prompt templates. Selecting a thread loads `/api/ai-chat/conversations/:id`, switches back to Chat, marks the thread active, and leaves the composer empty.
- Loaded `useAIChat` messages render inside the conversation transcript via `CoachCommandCenter.chatLogs.ts`, so a remembered thread is visible instead of silently updating hidden hook state.
- Always-visible quick prompt chips were removed from `CoachConsoleDock`; the `Next:` item is now a non-clickable recommendation chip, and the dock holds only real route/actions plus the primary composer.
- The shared `DashboardTeachMeGuide` keeps only the `Open guide` toggle while closed. The 1-2-3 path, Start Now, and Ask Coach shortcuts render only inside the opened guide panel.

Minimal wireframe:

```text
[Teach Me: Open guide]        (closed, no Start Now / Ask Coach strip)
[Coach header: current scope, real route actions, recent thread chips]
[Chat | Intake | PLAUD | History]
[Conversation transcript: command logs + loaded thread messages]
[Next action chip] [Logger] [Planner]
[Composer: Attach / PLAUD / Readback / Mic / Send]
```

Verification for this addendum:
- `npx vitest run src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.shell.test.tsx --reporter verbose` - 18/18 pass.
- `npx vitest run src/components/Shared/DashboardTeachMeGuide.test.tsx --reporter verbose` - 6/6 pass.
- `npx tsc --noEmit` - pass.
- `npm run build` - pass.

## 2026-06-24 Pro review follow-up - thread identity + history provenance
Status: built and verified in isolated Codex worktree, pending review/merge.

Flow contract added:
- Active thread identity is now visible above the transcript. Empty state says no thread is selected; loaded state shows thread title, bound client id, message count, status, and last-activity summary.
- History and recent-thread selection now preserve `threadId` in the URL alongside safe `clientId`, so a copied or refreshed Coach Command Center route can reopen the same conversation.
- Direct `?threadId=<id>` routes load the matching conversation into the chat stream once, without rewriting the composer or relying on hidden hook state.
- Loaded history bubbles carry a small `Loaded thread history` provenance label so remembered conversation context is visually separate from brand-new commands.

Minimal wireframe:

```text
[Teach Me: Open guide]
[Coach header + recent threads]
[Chat | Intake | PLAUD | History]
[Active thread: title | Client #id | History count | Status | Last activity]
[Transcript: live command bubbles + loaded-history bubbles]
[Next action chip] [Logger] [Planner]
[Composer]
```

Verification for this addendum:
- `npx vitest run src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.logic.test.ts src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.shell.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.threadIdentity.test.tsx --reporter verbose` - 30/30 pass.
- `npm run type-check` - pass.
- `npm run build` - pass.

Next planned slices:
- Thread search/filter should become an operations inbox with unread/follow-up state, not just a list.
- Client-bound thread labels should use safe client display names once the backend returns an explicit client-thread binding.
- Draft command recovery belongs near the active-thread header, but only after the composer has a real saved-draft contract.

## Summary
Sean reports the admin Coach Command Center is overloaded with unnecessary buttons. Prior declutter work done "with Codex" never landed in git (verified: not on any branch, worktree, stash, or reflog). The current admin page IS the newest version and must be re-decluttered from scratch. This doc captures the intent pass + the agreed cut list before any rebuild.

## Diagnosis (VERIFIED)
- Admin route mounts the NEW `CoachCommandCenterPage` — `UniversalDashboardLayout.tsx:583`. Trainer/client still mount the OLD `SwanCoachAssistantPage` (lines 692/717) — out of scope unless Sean expands.
- `origin/main` (production) is identical on this mount. The 3 unpushed commits are storefront/coordination, not coach.
- No decluttered variant exists anywhere in git → the fix is a rebuild, not a "switch the right file on."

## Architecture Notes — current control inventory (source-derived, exhaustive)
3-column shell: Left Rail · Main Stage · Right Ops Rail (+ mobile drawers).

**Left rail (`CoachCommandLeftRail`)**: route chip · brand title "Swan Coach Command Center" (TITLE #1) · [+ New Coach Thread] · [search threads] · Selected-client card + "approval gate" pill · context tiles · Threads list (buttons) / empty state.

**Composer (`CoachCommandComposer` + Parts)**: chip "Command input" + "One reviewed instruction at a time" copy · [Import PLAUD] · workflow return link (conditional) · `<textarea>` · actions: [Attach] [Mic] [Readback] [Prepare review] · status line. Mobile command strip ([Threads]/[Ops]).

**Command log (`CoachCommandLogPanel`)**: "Command log" + [Reset] · per-entry Cancel/Confirm buttons.

**Overview (`CoachCommandOverview` + Panels)**:
- CommandBanner (hero): chips "review-gated operator console" + "final writes require approval" · H1 "Swan Coach Command Center" (TITLE #2, duplicate) · paragraph · [Readback dossier] (READBACK #2) · [Teach Mode] (TEACH #1) · next-workflow aside + [Stage next review].
- QueueSummary metric cards.
- IntakeContextGrid: Active intake dossier (tiles + progress) | Intake holds (state list).
- Live-intake-grid: "Unified PLAUD and Coach intake queue" → **CoachIntakeWorkspace (large embed)** + **PLAUD/audio merge review → PlaudMergeWorkspace (large embed)** + "operator approval required" pill.

**Right ops rail (`CoachCommandOpsRail` + Panels)**: Operator controls + Teach Mode toggle (TEACH #2, duplicate) · Quick client capture (name + source select + [Create stub client]) · Queue snapshot (health rows + "Ready drafts and holds" list).

## Flagged redundancies (objective)
- Title "Swan Coach Command Center" renders 2× on desktop (left-rail brand + banner H1), 3× counting mobile topbar.
- Teach Mode control appears 2× (banner ghost button + ops-rail toggle).
- Readback appears 2× (composer "Readback" + banner "Readback dossier").
- Approval-gating reassurance copy repeated 4–5× (pill "approval gate"; "review-gated command console"; "One reviewed instruction at a time / waits for operator approval"; banner "review-gated operator console" + "final writes require approval"; "operator approval required" pill).
- Two large embedded workspaces stacked in the overview (CoachIntakeWorkspace + PlaudMergeWorkspace) — likely the bulk of visual weight.
- Three columns compete for attention on first load.

## Key Decisions
- **D1 (framing): FOCUSED CONSOLE + ON-DEMAND OPS.** Default view = command composer + command log + client target. Threads, intake queue, PLAUD merge review, and ops controls move into on-demand tabs/drawers. Most aggressive declutter. (Sean, 2026-06-13.)
- **Auto-cuts (objective, no taste needed):** remove duplicate title (one only), remove duplicate Teach Mode control, remove duplicate Readback, delete hero CommandBanner, collapse repeated approval-reassurance copy to one slim status line. Keep a compact client-target selector at top (a command needs a target).

## Q&A Log
- Q1 (framing): focused console / ops dashboard / hybrid? → recommended: focused console. → **Sean: Focused console + on-demand ops.**
- Q2 (mechanism / reach-for-often / next-action): → mechanism **Hybrid** (big workspaces=tabs, light stuff=drawers); next-action **keep slim**. → **BIG REFRAME from Sean's answer:** he doesn't want an ops dashboard at all — he wants a **ChatGPT-style coach terminal** he talks to on the gym floor, on his phone. Verbatim intent below.

## Sean's core vision (Q2 reframe, 2026-06-13)
SwanStudios Coach should be his GO-TO. Primary interaction = **dictate/talk to it like a chatbot**: log a client's workout, onboard a brand-new client ("onboard this client now"), update a client's info/workout log, and **go back to a previous conversation to pull a client's workout context**. He expects a **ChatGPT-style terminal that remembers previous conversations** (it's already wired for conversation memory via `useAIChat`). Context: he's a **trainer on the floor, on his phone**; phones are discouraged on the floor, so **PLAUD records his voice** and (when he gets home) the **3rd-party PLAUD app auto-uploads** to the ingestion pipeline — but "**the server needs to be started and I forgot how to start it.**" If he does use the phone, **talking to it looks better** than tapping. Current page has "so much stuff to look at I don't even try or want to use it." He also wants me to **look into the best workflow** (presentable to another trainer) and **route the work through AI Village / ChatGPT-5.5 (Oracle) review before push/commit.**

## Key Decisions (cont.)
- **D2: Default surface = chat-first terminal.** The "console" is a CHAT TRANSCRIPT (messages + memory + big input + prominent voice), NOT a command composer + separate log. Merge "command log" INTO the conversation (inline confirmable action cards).
- **D3: Conversation memory is first-class.** History/threads accessible (1-tap), each thread bindable to a client so he can resume "client X's workout conversation."
- **D4: Mobile-first, voice-first, discreet.** One-handed, big mic, live transcription/readback; looks like he's talking to it.
- **D5: Hybrid on-demand ops.** Intake queue + PLAUD review = tabs; ops controls/quick-client = drawer. Off the default view.
- **D6: Slim next-best-action chip** retained above the input.
- **Amplifications (proposed, surgical):** (a) client-scoped threads + "recent clients" 1-tap switcher; (b) quick-intent chips under input (Log workout / Onboard client / Update log / Recall client); (c) inline confirmable action cards in chat (= least-tap safe writes); (d) PLAUD status pill + 1-tap "start ingestion / how-to" addressing the forgotten server start.
- **D7: FLOOR-LEGIBILITY IS A HARD CONSTRAINT (Sean, 2026-06-13).** "Very hard to see on the floor." Glanceable in gym lighting, fast. Requirements: large type (client name ~22–24px bold; body ~17–18px), high contrast (Frost White on Obsidian/Carbon — NO faint <0.85-opacity grays for anything that matters; current design over-uses 0.7 subtitles), primary touch targets ≥56px (exceeds Rule 2's 44px min), minimal content per screen, strong hierarchy (current client + input + one next-action dominate). Optional "High-visibility" boost toggle (bigger + higher contrast) in Ops. Stays dark-first Crystalline Swan + premium (Rule 22) — this is a FLAGSHIP FOCAL POINT of the whole app, not a utility patch.
- **D8: FAST CLIENT-SWITCHING IS THE FOCAL POINT (Sean, 2026-06-13).** "Switching to different clients on the go really fast is of major importance… easily jump to a new client OR start a new conversation for a new client." Client switcher is co-primary with the input, top of screen: big current-client header + [⇄ Switch] + [+ New client]. Horizontal recent-client chips for 0-glance/1-tap jump. Fast-switcher overlay = search + big client rows (1 tap = jump) + "Start NEW client conversation". Switching client == switching conversation context (ties to D3 client-scoped memory).

## Side threads (don't lose)
- **PLAUD ingestion server start** — Sean forgot how. Runbook: `docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md`. Surface the start command.
- **Best-workflow research** — design the canonical trainer-on-floor flow (dictate → confirm → logged → remembered), presentable to another trainer.
- **Pre-push review** — Oracle / ChatGPT-5.5 (swan-oracle) + rule-46 chain before commit/push. Plus Codex hostile review (Rule 67 R7).
- **Trainer/client surfaces** still on OLD `SwanCoachAssistantPage` — unify later so he can show another trainer the same workflow.

## Open Flags
- Pixel screenshot of the live page needs a one-time admin login (Claude will not handle Sean's password). Source-derived map used as the shared anchor instead.
- Trainer/client coach surfaces still on OLD `SwanCoachAssistantPage` — separate decision whether to unify later.
