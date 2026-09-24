# SCU-EXPERIENCE — S6–S10 and One Coach integration

Owner: Astra. Version: 3.2, 2026-09-06 UTC. Status: authorized local implementation.
Supersedes: open design choice in 05/09; preserves their R/T references.
User expansion: audit all four dashboards and integrate their domain context;
the route inventory and capability map must precede broad tool activation.

## S6 — Session Desk B, with Floor Mode

Existing page/controller/docks remain the entry. New view components live under
frontend/src/components/DashBoard/Pages/coach-assistant. Reuse existing primitives
from Swan Forge where available. No new UI framework, store library or chart stack.

Components and ownership:
| Component | Responsibility / props |
|---|---|
| CoachSessionDesk | Presentation of current task; task, activeView, callbacks |
| useCoachSessionDraft | One in-memory draft per actor/target; revision, origin, dirty |
| CoachContextStatus | Permission-filtered source quality; no self-reported freshness |
| CoachIntentTimeline | Server receipts; bounded pagination; read/check/open only |
| CoachWorkoutDraft | Editable canonical exercise instances/sets; validation errors |
| CoachSessionDeskGate | Capability flag + ErrorBoundary; fallback to existing page |
| useCoachSurfaceContext | Registered route, target, selected entity IDs, generation |

Draft identity: actorId + targetUserId + taskId UUID. Mutable draft has revision,
sourceRefs, origin and exercise instances. Increment revision on every semantic
edit; mark preview stale. Rendering, tab switch and output speech never change it.
Once submitted, freeze submitted revision in a separate receipt view. New edits
create a new draft, never mutate the submitted payload behind its approval.

Use existing dashboard shell lifetime for shared task state. Docks and Logger
receive a reference to this draft, not a copied array. Open in Logger emits only
an allowlisted bridge payload and acknowledged revision; event ACK is draft-only.
On target switch, offer return-to-original or discard explicitly. No auto-submit.

Layout:
- 320–767: Talk / Workout / Results tablist, single content scroller, sticky composer.
  Header target and date remain visible. Floor Mode shows one exercise and large
  set rows; transcript remains reachable via Talk.
- 768–1023: stacked conversation + draft; Results drawer. No three narrow columns.
- 1024–1919: two columns, conversation min 320px, draft min 400px; results below.
- 1920–3840: center desk max 1760px; evidence detail occupies extra width;
  transcript prose max 68ch. Verify 2560×1440 and 3840×2160 explicitly.
- 200% zoom reflows to smaller layout; safe-area/visualViewport protects composer.
  Every control >=44px. Keyboard input while IME-composing never submits.

Visual contract: consume existing world/lens tokens; sapphire/obsidian substrate,
frost text, blue-button/purple focus discipline. One signature moment: existing
Crystallize transition only when persisted state becomes verified; respect its
reduced-motion JS and CSS behavior. No animation announces a mere draft as saved.
No charts until the real source adapter exists. All data cards stay low-motion.

Interaction and copy:
| State | Copy | Allowed actions |
|---|---|---|
| Empty | What are we working on? | Log workout / Review progress / Ask |
| Draft | Draft — not saved | Edit / Review and save / Open in Logger |
| Unavailable safety data | Current pain information is unavailable. | Retry / manual review |
| Review | Review this workout | Edit draft / Cancel preview / Confirm |
| Executing | Saving… | Stop response (only generation); inspect task |
| Committed | Saved; checking result. | Check result / Open record if authorized |
| Unknown | Checking whether it saved. | Check result / Close |
| Verified | Saved and checked. | Open record / approved correction |
| Known rollback | Nothing was saved. | Review retry |
| Offline | Offline. This draft is open in this tab only. | Edit / copy manually |
| Access revoked | This record is no longer available. | Close / choose permitted target |

Do not display Cancel as a working control in terminal states. Do not erase a
terminal receipt by closing its sheet; hide the view and retain timeline entry.
Dialog traps/restores focus; embedded region does not trap the page. One live
region per active task; don't announce each streamed token.

Persist only nonsensitive metadata if existing privacy policy permits it.
No health/free-text localStorage/IndexedDB persistence. Tab close loses in-memory
content with an honest unsaved-change warning. Reload queries server receipts;
reconnect never posts a write. Logout purges all local scope and stops capture.
Exit T26–T29 plus source-switch, background-response and mounted retry journeys.

## S7 — one voice lifecycle

Compose existing browser speech, recorder overlay, transcription route and TTS.
useCoachVoiceSession owns states idle/requesting_permission/listening/transcribing/
reviewing/speaking/interrupted/error; it does not own domain execution state.
Transcript segments carry captureSessionId, sequence, final, origin and generation.
Only one final segment per (captureSessionId,sequence). No interim auto-submit.

Explicit gesture starts capture. Stop all tracks/output on background, close,
logout and target switch. Barge-in stops speech output; action remains tracked.
An ambiguous spoken "stop" stops audio; cancellation requires its separate control.
Mic permission denial leaves typed entry and a named retry. No hot-mic monitoring.
Use existing upload size/type limits; no browser credentials or new provider.

Streaming is optional capability behind existing supported transport. If unavailable,
do not render live-streaming claims; recorder/dictation remain the complete first
release. Audio payloads must comply with existing provider privacy policy before
transmission; a claimed "deidentified" label cannot sanitize raw speech.
Deliberate/cross-client approval stays physical. Do not revive the inert spoken nonce.
Exit T30–T32 with actual audio-device fixture and lost-response recovery.

## S8 — explain training evidence, never invent it

Connect authoritative workout/progress readers, then coachProgressEvidence.
Known successful query with zero workouts => empty, count 0, no trend.
Failed query => unavailable, counts null in presentation. Partial units/data =>
partial with explicit missing inputs. Missing load is not numeric zero.
Deduplicate sessions by source ID/revision; count actual completed non-voided logs.

Volume: exact sum of reps×load per comparable exercise instance/unit, with source
date range/timezone and included set types stated. Bodyweight/isometrics do not
get invented external-load volume. Do not normalize lb/kg without a tested rule.
Adherence requires matching completed scheduled-session IDs to eligible schedule
IDs in the same period. Walk-in/extra training increases total completion count,
not scheduled denominator/numerator. Zero eligible schedule => null rate.
Legacy count-only helper may compute a bounded unambiguous fraction; impossible
counts return null and scheduled_session_matches missing input (AR06).

Substitution is a draft: canonical source/replacement IDs, equipment availability,
constraint evidence, alternatives, current readiness and reviewer. Hard conflicts
block. Missing required safety data asks for review; no invented clearance.
Change only selected movement/sets; preserve planned order and unaffected metadata.
Nutrition explanations use existing meal/plan data; no invented calories/allergies.
Domain-specific adapters retain existing trainer review and client readiness gates.

Verified milestone may offer a share draft. Posting is a separate external-visible
workflow with audience preview and explicit approval; no send inherited from save.
Exit T33/T34/T48, source-linked chart parity, plus trainer review of 15 synthetic cases.

## S9 — visible memory

Before schema work resolve actual CoachFact authority from S0. Required behavior
is more important than a new table name. Implement storage/retrieval under that
authority using existing encrypted value/consent conventions.

Memory may store an explicitly approved preference, goal, equipment choice or a
reference to an authoritative constraint. It never replaces the clinical/training
record. No automatic sensitive extraction or inference-based psychological profile.
Scope: personal / assigned_coach_shared / staff_restricted, checked server-side.
A trainer's convenience memory about a client cannot become client-visible by default.

Drawer row: displayed authorized value, source, scope, as-of, expiry, edit, forget.
Edit creates a superseding version with expected-version check. Unit-preference
change invalidates unsaved drafts that defaulted that unit; never rewrites old logs.
Forget tombstones immediately. Cache invalidation event is transactional/outbox-backed;
retrieval also checks tombstones after cache hit so a failed consumer cannot leak.
Purge value ciphertext within 24h; backup lifecycle is disclosed separately.

Private chat turns OFF retrieval and extraction for that task. Do not promise
no conversation retention unless the conversation service actually honors that.
Pause prevents new memory creation; delete controls remain reachable when OFF.
Exit T35–T37, revocation between retrieval and send, failed cache invalidation,
two users same key, tombstone restore, measured purge deadline.

## S10 — quiet in-app briefing

Inventory existing notification jobs; reuse them. No second scheduler or email/SMS.
New capability defaults OFF. Opt-in stores consentVersion, timezone, selected weekday,
quiet start/end, snoozedUntil and max one/day. Defaults 20:00–08:00 local.
Weekly-progress trigger key: subject + capability + local ISO week + consent version.
Keep dedupe for seven days; uniqueness prevents concurrent worker duplication.

At delivery re-read consent/current assignment/data freshness. Opt-out or forget
removes pending content. Quiet hours schedule at next allowed local instant; test
nonexistent and repeated DST hours. Daily cap uses local date, not UTC midnight.
Content from verified evidence only: one useful observation + one optional action.
Dismiss/snooze/disable work without opening a chat. No shame or pressure.
Exit T38–T39 with frozen clock, two workers, DST boundaries and opt-out race.

## One Coach across every dashboard

A route context adapter supplies surfaceKey, role, target, selected entity/version
and permitted capabilities. It does not dump all tab data into model context.
Fetch only needed domains under fresh authorization. A client never inherits the
admin view merely because the same component is mounted in both dashboards.

Every inventoried tab gets a capability row: context read, explain/navigation,
draft, reviewed write, or intentionally UI-only. Distinguish actual command adapter
from a catalog label; commands whose dispatcher emits an event need receiver proof.
Cross-tab changes invalidate the actual consuming query/cache and return a receipt.
Account access, waivers, money, publishing and broad admin permissions retain their
existing human workflow; Coach may explain or navigate, not gain blanket authority.

The dashboard audit annex will enumerate mounts/subtabs, domain sources, owner
checks and coverage gaps. No broad capability is activated from an unverified row.
