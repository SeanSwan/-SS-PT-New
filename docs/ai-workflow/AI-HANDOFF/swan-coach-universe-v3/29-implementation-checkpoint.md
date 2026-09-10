# Swan Coach — Astra implementation checkpoint,2026-09-06

## Plain-English Summary

Astra implemented the atomic workout/proposal transaction, strict read-back and
the versioned proposal-to-intent connection. In local tests, Coach can prepare a
real library-backed workout draft, review it, save through the canonical writer,
verify the stored result and recover the same receipt without saving twice.

This is a local implementation checkpoint. The new versioned entry flag defaults
OFF. Nothing was committed, pushed, deployed or migrated in production. The full
Coach upgrade remains IN PROGRESS. Session Desk/Floor Mode and the broader
dashboard connections are next; their existing designs are not finished runtime.

## Technical Summary

Builder: Astra, explicitly authorized to take over. Do not transfer to Luna unless
Sean asks. Owned worktree:
C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906
Branch codex/swan-coach-astra-owned-20260906; HEAD b88dd9e5c894908d9f193411fe66117294d190ef.
Locally observed origin/main53120649f356c3efccee32872b530096d386642f is27 commits ahead
on its separate side. No fresh fetch/live-state assertion is implied.

Read11 for the complete build contract;28 for this latest integration,25/26 for
prior transaction/read-back proof,24/27 for historical takeover/checkpoint details.
Use13/14/19/21 for remaining implementation. Do not repeat completed foundations.
The additional narrow S1 input-default repair is documented in30.

## Completed locally

- Proposal claim, canonical workout/form/log, existing credit/attendance/plan
  effects, APPLIED result and the v2 intent receipt commit in one transaction.
- The existing signed review protocol binds encrypted material; current access,
  immutable input and expiry are rechecked after lock waits. Rejection is atomic.
- New v2 drafts resolve actual Exercise UUID/key/name and active eligibility.
  Explicit reps, loads, units and instances survive into the form. Unknown or
  conflicting data refuses. Kilograms cannot silently become pounds in charts.
- Persisted values and actual row identities are checked before commit, then
  independently read from a real PostgreSQL read-only repeatable-read snapshot.
- Verified receipt promotion locks intent/proposal/authority and rechecks their
  current binding before CAS. Concurrent proposal mutation cannot pass that lock.
- Same-proposal retries recover receipts without workout/credit/award replay.
  Known-save lookup failure and unknown COMMIT have distinct honest responses.
- The server-controlled COACH_VERIFIED_WORKOUTS_ENABLED switch selects new drafts
  only when exactly true. Default-off keeps legacy behavior. Stored v2 proposals
  retain recovery/detail access with the switch off; fresh v2 execution refuses.
- The shared command transport defaults missing input provenance to unknown.
  Explicit text/voice/ui modes remain intact; existing server confirmation policy
  remains authoritative. This is a narrow S1 repair, not full input/confirmation parity.

## Latest verification

Real PostgreSQL: new intent integration24/24 (independently rerun), legacy atomic
writer13/13, semantic read-back15/15. Existing focused regressions90/90 and registered
Node suites225/225. Frozen independent gates49/49,24/24 and76/76; packet runtime50/50
and planning9/9. Counts overlap and are not a coverage percentage.

Independent hostile review: scoped APPROVE, with fresh 25/25 and 27/27 clean rounds.
The builder reran 27/27 and matched all 17 reviewed runtime hashes. See28 and its
evidence manifest for exact source/gate hashes, failures, repairs and adjudication.
No paid external/model review was run. Frontend was unchanged in these slices;
earlier build/typecheck evidence is historical, not authenticated-browser proof.

Additional S1 repair: frozen gate36/36, frontend regression42/42 and existing server
channel-policy19/19 passed. A fresh complete frontend TypeScript check exited0.
The page/Logger suites use synthetic fixtures; no authenticated browser is implied.
See30 for the scoped independent review and immutable evidence.
That review returned APPROVE after two45/45 hostile runs; the builder reproduced
45/45 and matched the two reviewed source hashes. All17 integration runtime hashes
also remain unchanged from the preceding approved receipt.

## Exact next work

1. Finish S1/S2 provenance and stored confirmation presentation. The shared missing
   inputMode default is now unknown; finish producer/focus/generation parity.
   Keep existing proposal reviewToken and command signatures as separate protocols.
2. Complete S3 at the user-task boundary: stable client draft/request identity,
   immutable submitted revision, changed-content/new-intent handling, explicit
   reviewed rearming after known rollback and terminal/unknown lookup UX. Current
   v2 retry proof is per persisted proposal, not upstream chat-message deduplication.
3. Build Session Desk B and Floor Mode from14 in the existing page/controller and
   dashboard shell. Talk/Workout/Results share one actor/target/task draft. Use the
   real bounded receipt API, canonical Logger bridge and verified-only celebration.
   Add frontend presentation for WORKOUT_RESULT_UNAVAILABLE/saved:true before
   enabling the new write flag. Do not turn an event ACK into save proof.
   Reconcile the existing draft-only Session Desk in the earlier Universe lane and
   the separate "Audit Swan Command Centers" task's local UI refinement. That task
   reports layout/tool-menu/trainer-label/admin-briefing changes; it does not prove
   the full draft-to-save workflow. Preserve its source and wireframe addendum.
4. Connect the24 domain contracts in19 using127 top-level routes from18 and nested
   workspaces21. Preserve per-role/entity/current-access authority. An audited tab
   is not automatically an enabled mutation tool.
5. Reconcile the current-main candidate before release: preserve dependency/test
   upgrades, startup reconciliation and shared UI changes; use a clean dependency
   install. Current node_modules junctions still point to the older universe lane.
6. CoachFact commit21ed0554ba is on feat/coach-facts-s1, absent from this worktree and
   local main. Adjudicate/reuse that existing schema when memory work begins;
   do not create a duplicate fact store. Continue S5/S7–S10 provider, voice,
   training-evidence, visible-memory and quiet-check-in work.
7. Finish S11: real DB/Redis failure modes, authenticated all-role/browser viewport
   matrix, provider evaluations under an authorized budget, current-main release
   review and Sean's explicit production-push approval.

## Preservation and test operation

Shared runtime and earlier worktree source were not edited. Owned source snapshots:
tmp/coach-atomic-before-20260906, tmp/coach-semantic-before-20260906,
tmp/coach-intent-integration-before-20260906. Do not overwrite historical manifests
with later hashes. New evidence is under this packet's evidence/ and diagnostics
under tmp/coach-intent-hostile. No cleanup/deletion/continuity closeout was performed.
Prior11/29 checkpoint bytes are preserved in tmp/coach-input-origin-before-20260906
before this update. The intent manifest describes its preceding revision; the
input-origin manifest captures the updated checkpoint and unchanged integration sources.

Disposable database: owned cached postgres:17-alpine, fixed synthetic database/user,
loopback-only publication and label com.swan.test=coach-atomic-20260906. Never load
application .env for these tests. Dedicated helpers:
backend/tests/helpers/coachWorkout{Intent,Atomic,Readback}.postgres.config.mjs.
Set NODE_ENV=test and SWAN_COACH_TEST_PORT to the current owned-container port;
run the configs sequentially from backend with node node_modules/vitest/vitest.mjs.
The disposable container was identity/label-checked and stopped after all tests.
Its auto-remove configuration removed that test database. Recreate an isolated
synthetic database for future PostgreSQL runs; no production database was touched.
