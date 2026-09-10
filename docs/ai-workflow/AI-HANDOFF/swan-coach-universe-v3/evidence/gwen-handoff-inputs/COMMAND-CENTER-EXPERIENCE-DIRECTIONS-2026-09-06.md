# Command Center experience — proposed directions and wireframes

Owner: Sean / Astra / Codex. Version: 1.1, 2026-09-06. Status: SELECTED FOR IMPLEMENTATION; Direction B Session Desk with Direction C briefing hierarchy on admin home.
Companion to [the audit and blueprint integration packet](COMMAND-CENTER-EXPERIENCE-DECISION-PACKET-2026-09-06.md). Supersedes: v1.0 metadata only.

## Three directions for Sean to choose

### Direction A — Focused Conversation (restrained)

NAME: Focused Conversation.
PAGE STORY ARC: orientation = compact client/task line; current state = conversation;
insight = concise source-backed answer; next action = one inline proposal.
SECTION PATTERN STACK: C12 -> C12 -> C11 when evidence warrants -> C12 review sheet.
EMOTIONAL JOBS: clarity -> calm -> trust -> confidence.
SIGNATURE MOMENT: static refracted state seam; response transition only.
ASSETS: A5 optical divider; A8 only for real progress. No generated media required.
MOTION TIER: tier 3 baseline; optional response-tier movement.
WHY IT FITS: fastest everyday chat and lowest navigation burden. Work opens in a sheet.
WHY IT COULD BE WRONG: repeated comparison/edit tasks require more opening and closing.

### Direction B — Session Desk, conversation first (recommended)

NAME: Session Desk.
PAGE STORY ARC: orientation = client + task + date; current state = conversation with
working draft when relevant; insight = source-linked comparison; next action = review
the changed record, then open its verified result.
SECTION PATTERN STACK: C12 -> weighted C12 workspace -> C11 -> C12 result detail.
EMOTIONAL JOBS: clarity -> momentum -> trust -> completion.
SIGNATURE MOMENT: draft-to-record state seam; reuse sanctioned verified-save feedback,
with instant/static calm-zone fallback. No novel celebration or motion under data.
ASSETS: A5 optical material; A8 progress; one optional A6 contextual 3D scene.
MOTION TIER: tier 2 overall; tier 3 for reduced motion and Floor Mode.
WHY IT FITS: retains a beautiful, spacious chat while real coaching work stays editable
beside it. Extends the existing S6 direction and collapses to one mobile task surface.
WHY IT COULD BE WRONG: an always-open empty work panel would recreate today's clutter;
open it for real content, preserve drafts, and let expert users explicitly pin it.

### Direction C — Coaching Briefing (dashboard first)

NAME: Coaching Briefing.
PAGE STORY ARC: orientation = today's sessions; current state = people needing action;
insight = training evidence; next action = launch contextual conversation or review.
SECTION PATTERN STACK: C12 briefing -> C12 priority list -> C11 -> C12 Coach drawer.
EMOTIONAL JOBS: clarity -> urgency without alarm -> trust -> momentum.
SIGNATURE MOMENT: real progress evidence resolves into the next coaching action.
ASSETS: A8 primary; optional single A6 evidence visualization with equivalent 2D values.
MOTION TIER: tier 2; all operational lists stay static.
WHY IT FITS: best admin/trainer morning scan and cross-client triage.
WHY IT COULD BE WRONG: less satisfying as the primary destination for sustained chat.

Recommendation: B for Command Center, C's briefing hierarchy for existing dashboard
home. This combination remains a proposed choice; no layout decision is approved yet.

## Proposed wireframes (synthetic, information architecture only)

```text
DESKTOP: Session Desk; work panel closed until relevant
+ navigation + Client [choose] | Session/date | Thread title | History +
|            +-------------------------------------------------------+
|            | Conversation, readable 60-72ch | WORKOUT DRAFT         |
|            | Coach: concise answer         | only when relevant    |
|            | [Show detail] [View source]    | Exercise / sets / load |
|            |                               | [Edit] [Review]       |
|            +-------------------------------------------------------+
|            | [Attach] Type a message...           [Mic] [Send]      |
+------------+-------------------------------------------------------+
 Context drawer: sources, notes and task history. Operational setup lives in tools.

PHONE: same task, one active view
+ Client [choose] | Today | More --+
| [Conversation] [Workout]         |
| Concise answer / active draft    |
| [Expand detail]                  |
| Review exact change when ready   |
+---------------------------------+
| [+] Message...     [Mic] [Send]   |
+---------------------------------+
 Pending review badge opens the same review sheet; history is a drawer.

DASHBOARD: briefing before navigation blocks
+ Today / next session ------------------+ Needs attention ----------+
| Client + time + useful next action     | Source-backed priority    |
| [Open session]                         | [Review]                  |
+ Training progress / missing evidence --+---------------------------+
| Read useful change or honest unavailable state | Ask Swan Coach    |
+-------------------------------------------------------------------+
 Admin: authorized roster + business exceptions. Trainer: assigned clients + sessions.
```


