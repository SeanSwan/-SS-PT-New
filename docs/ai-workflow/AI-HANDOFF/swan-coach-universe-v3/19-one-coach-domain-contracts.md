# SCU-ONE-COACH — domain integration contracts for all dashboards

Owner: Astra. Version: 3.2, 2026-09-06 UTC.
Status: architecture and source-audit disposition; activation requires per-domain proof.
Supersedes: the idea that one shared chat component already constitutes a unified brain.
Read with the 127-row route inventory in 18-dashboard-tab-audit.md.
The deeper mounted Client Hub/Nutrition/Content Studio walk is in
21-nested-workspace-audit.md; current local checks are in29/30, with Gwen's
execution order in31/32. The older22 verification remains historical evidence.

## Core design

One Coach shares task context, interpretation, permissions, receipts and recovery.
It uses separate domain adapters because a workout save, waiver, schedule booking
and published video have different authorities and consequences. One model cannot
replace those authorities. Domain state stays in its current authoritative store.

A surface adapter declares:
{surfaceKey,routePattern,role,targetSource,entitySources,contextDomains,capabilities,
refreshKeys,privacyClass,activationFlag,manualFallbackRoute}.
The server validates surfaceKey/role/target and computes permissions itself.
Browser declarations describe context, not grants. Unknown surface => explain only.

An action adapter declares:
{commandKey,domain,resolveOwner,authorize,validateRevision,preview,approveProtocol,
executeExistingWriter,readEffect,receiptProjection,refreshEvents,compensationPolicy}.
No generic SQL writer; no arbitrary API URL supplied by the model.
A catalog name is not proof an adapter works. Event dispatch must have a mounted
receiver that updates the same draft and returns an acknowledged revision.

## Domain map

API families below are observed mounts/caller strings, not proof every endpoint or
mutation has been audited. Each domain's first write requires its own narrow route
shadow walk and actual-model field map. Commands are observed registry examples.

| ID / tabs | Source/API authority to trace | Existing Coach foothold | Required integration and boundary |
|---|---|---|---|
| D01 Coach/PLAUD | /api/ai-command; /api/ai-chat; /api/coach/intake; /api/coach/proposals | Command Center, shared sheet, intake commands | One task identity; proposal review distinct from command confirmation; no raw transcript egress |
| D02 Workout Planner/build-plan aliases | /api/workout-plans and /api/workout/plans; /api/workout-builder; /api/exercises/library | planner_add/swap/remove/update/generate; sequence commands | Canonical library IDs, revision-bound patch; existing plan writer/reviewer; event ACK means draft |
| D03 Log My Workout/log-client/my-workouts | /api/workout-forms; /api/workout/sessions; proposal daily-form writer | log_workout, submit_workout_form, update_set_data | S4 exact-once save; unit/date preservation; form/session/log coherence; native manual parity |
| D04 Bootcamp/sprint | /api/bootcamp then /api/bootcamp/sprints | bootcamp_set_structure/duration/format, dock | Class structure/equipment/time constraints in one editable draft; template save and performed log are different outcomes |
| D05 Clients & Team/My Clients/view-as | /api/admin/clients; /api/assignments and client-trainer-assignments | brief_client/view_client_profile | Target resolved to Users PK; read-only view-as stays read-only; staff/private notes filtered |
| D06 Onboarding | /api/onboarding, /api/clients/onboard, /api/orientation; consent routes | start/view/submit_onboarding | Read completeness and propose missing fields; preserve waiver, readiness, identity and explicit consent |
| D07 Waivers | /api/admin/waivers; /api/public/waivers | No complete Coach authority proved | Clearance/status metadata only; signatures/documents remain in human review; no AI signing/linking/revocation |
| D08 Scheduling/session location | /api/sessions; /api/schedule; /api/availability; /api/session-types | view slots/schedule/availability; schedule/cancel/reschedule | Resolve client/trainer/location ownership, IANA time, slot conflict and credit policy at confirm |
| D09 Trainers/Assignments/Permissions | /api/admin/trainers; /api/assignments; /api/trainer-permissions | list_trainers/view_trainer_clients/assign commands | Current assignment controls every domain; staff changes use existing deliberate admin review |
| D10 Session Allocation/store/deals/orders/revenue/payouts | /api/sessions/add-to-user; finance/order/commission families | billing overview/revenue reads | Explain and navigate; no new refunds, credits, payouts or impersonation via inference |
| D11 Pain charts | /api/pain-entries; profile body-map media | add/view/update/resolve_pain_entry; region selection dock | User report != diagnosis; unresolved/unavailable pain blocks dependent unsafe suggestions |
| D12 Nutrition/Nutrition Planner | /api/nutrition; /api/macros; /api/meal-plans; hydration/supplements/food-scanner | log_meals/view_nutrition_log/create_nutrition_plan | Separate meal evidence from macro-target plan; quantities/units/allergies not invented |
| D13 Equipment/My Equipment | /api/equipment-profiles; /api/equipment-insights | list profiles/items/gap_report/add_item | Location/profile owner check; scanner results are drafts; substitutions use actual available gear |
| D14 Form assessment/video call | /api/movement-analysis; /api/form-analysis; /api/video-sessions | No full reviewed adapter proved | Capture consent; source-linked assessment summary; no biometric/diagnostic inference or background capture |
| D15 Gamification/rewards/challenges/home/olympics/badges | /api/v1/gamification alias /api/gamification; badges/avatar-home/olympics | view_xp_streaks/leaderboard/my_xp | Explain earned events; logging must not award twice; badge generation cost/award authority separate |
| D16 Content Studio/photos/gallery/videos/live/creators | /api/content-studio caller strings; /api/v2/videos; gallery/live-stream/creator mounts | No complete upload/publish adapter proved | Find entitled media; captions/metadata draft; explicit upload/publish/audience approvals; passcodes stay private |
| D17 Account access/security/launch/feature flags/user management | /api/auth/admin; /api/admin; /api/feature-flags; public config | Registry has account/admin commands, not a blanket grant | Human security workflow; no tokens, impersonation or permission escalation in model context/tools |
| D18 Messages/support/automation/SMS/marketing/notifications | /api/messaging; /api/notifications; /api/automation; /api/admin/support/issues; publishing | notify_client and moderation footholds | Audience preview + explicit send approval; no automatic contact from a workout/support discussion |
| D19 Client/progress analytics | /api/client/analytics; /api/client-progress; /api/workout-summaries | my_progress/view_workout_statistics | S8 deterministic metrics and provenance; entitlement and edit/delete invalidation |
| D20 Community/groups/friends/profile/about/activity | /api/social; /api/profile; UserDashboard tab services | Read/moderation commands | Visibility filter; user's own posts vs staff moderation distinguished; no automatic publishing |
| D21 Notes | /api/notes | Selected-client context only | ACL/source/freshness; imported instruction text remains data; no staff-note leak |
| D22 Design Studio/style guide/workout design/immigration | Existing route component and own domain APIs | Some terminal mounts; not product training authority | Explain/navigation only; no public Hermes/system execution, vendor calls or unrelated legal advice |
| D23 Home/overview | Role dashboard APIs and existing training evidence consumers | scan_command_center/brief_my_day | One useful next training action; unavailable data remains unavailable; no decorative mock progress |
| D24 AI consent | /api/ai/consent/status, grant, withdraw | Existing consent screen | Inspect/change through existing explicit consent UI; revocation cancels inference/pending extraction |

## Shared target and nested-tab rules

Clients & Team is the canonical client hub, with nested training/logger/planner,
progress, nutrition, biometrics, profile and team views. Their selected-client IDs
must be converted once to the actual Users PK before Coach context is requested.
Switching a nested view does not clear a draft; switching target invalidates its
preview and discards late prior-target asynchronous results.

Schedule location is not Session Allocation. Location belongs to the booked session
and equipment context; allocation changes session credits and uses money safeguards.
Resolve both explicitly when a request mentions "sessions"; ask only if ambiguous.

Content Studio and Photo Gallery are different authorities. A private progress photo
is not automatically public gallery content, and a gallery passcode is not a model
input. Video library entitlement and content publishing permission are distinct.

Nutrition intelligence and Nutrition Plan Builder are separate producer/consumer
flows. Logging food must not silently replace prescribed targets. Macro progress
must use same date/unit/source records as the nutrition tab.

Default Workout Logger dictation, Coach Command Center, embedded docks, client
training bar and any mounted older assistant all feed the same provenance contract.
The inventory records discovered producers; completing their caller walks remains
required. No hook may turn missing origin into typed authority.

## Four-role authority matrix

| Role | Context | Mutation scope | Prohibited inference |
|---|---|---|---|
| Admin | Current authorized client or explicitly own task | Existing admin domain permissions + deliberate review | Admin page means every model tool is allowed |
| Trainer | Current assignment and explicit capability permission | Assigned client operations; own schedule/earnings policy | Selected roster row proves assignment |
| Client | Self; entitlement-gated training records | Own approved self-service domain action | Shared staff proposal route automatically supports client |
| User | Own general dashboard and purchased/enabled features | Existing permitted self-service only | User aliases client for every backend action |

Current proposal route is admin/trainer only. Keep that restriction until a
purpose-built self-workout policy is implemented: actor==target, WORKOUT_LOG only,
own eligible session, current onboarding/waiver/consent, same domain accounting,
reviewToken and stale/version checks. Never add client to the whole staff router.
General user gets navigation/explanation until an existing self-service policy
explicitly authorizes that feature; no fabricated trainer relationship.

## Domain acceptance template (applies to every row)

DA-{domain}-01: permitted read returns only scoped source refs, current time/quality.
DA-{domain}-02: wrong owner, revoked assignment and role/entitlement mismatch deny.
DA-{domain}-03: malicious imported text cannot alter actor, target, tool or policy.
DA-{domain}-04: preview shows actual material diff, target, version and consequences.
DA-{domain}-05: confirmed write uses existing authority once; repeat returns receipt.
DA-{domain}-06: lost response uses lookup; never "no changes" without rollback proof.
DA-{domain}-07: actual consuming tab refetches correct domain data; reload agrees.
DA-{domain}-08: absent adapter/flag/vendor renders a working manual fallback.

Read-only/UI-only rows mark write tests NOT_APPLICABLE with reason, never fake green.
Receipt trace records domain, exact handler/writer/model columns, inverse policy,
privacy class and tests. This becomes the server capability manifest's evidence.

## Build order after the shared foundation

Wave 1: D01/D02/D03/D05/D11/D13/D19 training loop.
Wave 2: D04/D08/D12/D14 trainer workflow and scheduling.
Wave 3: D06/D15/D20/D21/D24 continuity and consent.
Wave 4: D16/D18 reviewed content/communication.
D07/D09/D10/D17/D22 initially explain/navigate existing human workflows.
Their inclusion in the context audit does not authorize autonomous legal, financial,
publishing, account-security or operator effects.

A domain only joins the active manifest when its owner and caller receipts exist.
All 127 routes get explain/navigation context after role visibility validation;
a missing write adapter is explicitly displayed, not silently pretended.
