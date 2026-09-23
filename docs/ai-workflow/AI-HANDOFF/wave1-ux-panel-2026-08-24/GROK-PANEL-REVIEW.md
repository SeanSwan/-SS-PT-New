# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/WAVE1-UX-LOGIC-REVIEW-PACKET-2026-08-24.md
**Seed:** (none)
**Tokens:** 20540 in / 15354 out · **Cost:** ~$0.1330 · **Wall:** 325.7s · **finish:** stop

---

## VERDICT: REVISE
Quality-map: **HOLD** the messaging surface as a client-facing ship; the consent/de-id backend can land once the Coach re-consent path is a named, verified screen — not a 403. Evidence: `MessagingView` wall + ignored hook error (full surface, ~L31–32, L108–126); list/write split in `conversationController.mjs` (staff `role` keep) vs `messagingAccessRepository.mjs` `isRelationshipWriteAllowed` (no staff exception); `aiConsent.mjs` stale-version 403 with only `AiConsentScreen.tsx` needsReconsent wired; **no authenticated browser pass**.

---

## (a) VERDICT
**REVISE.** Do not treat this as a quality-only polish pass. The security work is real. The client-facing messaging screen is still a conversion dead-end, a liar on the error path, and now a *visible* support channel that the write path does not obviously allow. Ship the backend gates after the lookups below; do not ship the wall.

---

## (b) Correctness attacks

**Happy-path-only / error-path gaps**
- `MessagingView` destructures `{ capabilities, loading }` and drops `error` (`useMessagingCapabilities`). A capabilities fetch failure keeps `canMessageAssignedCoach` false and renders the trainer/Crystalline wall. Fail-closed for access is correct; rendering that failure as “you lack a trainer” is a product lie to the exact package buyers this wave exists to serve. Known, **unfixed in this diff**, still ship-blocking.
- `composeTo` (`MessagingView` effect): `parseInt(composeTo, 10)` is lenient (`900abc` → 900) against the new strict `toId` (`/^[1-9]\d*$/`). Then `.catch(() => {})` and the query param is deleted *regardless of success*. Trainer-sent deep links fail with a clean URL and no toast. Strict Mode will double-fire `createConversation` before the param is gone.
- `unreadCount` is `reduce((t, c) => t + c.unreadCount, 0)`. Missing `unreadCount` → `NaN` in the summary metric. No default.
- Relationship-lane list filter: `others.length > 0 && others.every(...)`. A 1:1 thread whose other participant is a raw scalar id (not `{id|userId}`) maps to `NaN`, drops from `others`, and the thread disappears with no error. They hardened string-JSON; they did not harden id-array shape.
- `isRelationshipWriteAllowed(..., hasCommunityAccess=true)` returns true **without membership**. Tests pin that as intended (`messagingSocketRelationshipLane.test.mjs`, “without touching the DB”). If `socket.mjs` does not still membership-check *after* this block, elite users can write any `conversationId`. **Required lookup:** remainder of `socket.mjs` send handler.

**Null / type / stale / race**
- Dual identity: `authUser || reduxUser`. Either source stale → `currentUserId` flip → `useMessaging` rebind. Classic “inbox reloads / wrong sender id” race. Not touched.
- `isConsentVersionCurrent` is `=== CURRENT`. Good for null. Frontend `needsReconsent` only runs when `consentState === 'granted'`. If status classifies a v1.0/null grant as anything other than `granted`, the screen will not prompt and Coach still 403s with `AI_CONSENT_STALE_VERSION`. **Required lookup:** consent status → `consentState` mapping.
- Module global `lastWarnedConsentVersion` in `deIdentificationService.mjs`: process-lifetime, test-hostile, and after log rotation the misconfig is silent for the life of the process.

**Off-by-one / matcher bugs (de-id)**
- `METRIC_SUFFIX` is `/^(s|es)?$|(hour|hr|...|count|...|per)/i`. The second alternative is **unanchored**. Any key starting `sleep|stress|supplement` that later contains `per` or `count` is stripped: `sleepPeriodization`, `stressEncounter`, `stressPercentage`. Periodization is training data. The clinical-keep fix over-corrected with a leaky regex.
- Inverse: `sleepHygiene`, `sleeping`, `stressResponse`, `supplementUse` do **not** match the suffix list and are now forwarded. The old `/sleep|stress|supplement/` would have held them. This is a fix that widened lifestyle egress.

**List vs write (the new correctness hole this diff introduced)**
- List (`conversationController.mjs`): keep thread if every other participant is an assigned id **or** `role === 'admin'|'trainer'`.
- Write (`isRelationshipWriteAllowed`): `membership.others.every((id) => counterparties.has(id))` — **no staff exception**.
- Tests prove a relationship-only viewer *sees* an unassigned trainer-role thread (`messagingListScopeNarrowing.test.mjs`). Nothing in this diff proves they can *send*. The post-ship bug was “support channel they could never see.” This makes it a support channel they can see and then bounce off with “You can message your assigned trainer here.”

---

## (c) Security attacks

**Authz / IDOR**
- Participant `role` is read off the `json_agg` blob, not a current `users.role` join. If `updateParticipantRole` / create-conversation can persist `role: 'admin'` on a client participant, the relationship-lane list keep-rule treats that thread as staff and shows it. Write path may still 403 — or REST and socket may disagree. **Required lookup:** where `participants.role` is written and whether it is denormalized at insert time.
- `hasCommunityAccess` short-circuit is a second authorization function that does not authorize. Name says “write allowed”; body says “lane policy skipped.” Next caller will use it as a complete gate.
- Staff bypass (`admin`/`trainer` → true) is accepted. It is still a socket-connect-time role. Revoke-without-disconnect = lingering staff write. Same class as the TOCTOU they already accepted.
- `composeTo` is an unauthenticated-to-the-UI IDOR probe surface (any numeric id). Server should 403; UI swallows it, so you get no signal and a possible duplicate-create on retries.

**Injection / SSRF / secrets**
- None new. `JSON.parse` on `participants` is on DB output, not request text. No secret movement.

**Replay / idempotency**
- `composeTo` → `createConversation` is not idempotent in this file. Two effect runs = two threads with the same trainer.

**Multi-tenant / scope**
- Relationship lane hides community threads on REST list and now on socket write. Community *compose + user-search* still mounted (`NewConversationModal` always gets `searchUsers`). Restriction discovered by 403. Known, unfixed, and it is an authz-UX hole: the UI invites a write the server will refuse.

**Rate-limit / DoS**
- Every socket message now: `resolveCurrentEntitlement` + (on fail-closed path) assignments + members. Entitlement on the hot path is an amplification lever. No cache, no mention of the existing `checkMessageRate` covering this extra work. **Required lookup:** cost of `resolveCurrentEntitlement`.

---

## (d) Data-truth / schema-drift (Rule 58)

| Drift | Where | What breaks |
|---|---|---|
| `participant.id` vs `participant.userId` vs scalar id | List filter now accepts `id ?? userId`; write-path tests mock `{ userId }`. Scalar ids still die. | Inbox empty for one driver shape |
| `participants` as array vs JSON string vs object | String parsed; object → `null` → hidden + `logger.error` | Fail-closed, good; still a shape the query must not emit |
| `role` on aggregated participants vs `users.role` | List trusts blob; write ignores role | See-but-not-send, or spoofed keep |
| `toId` vs `toStrictPositiveInt` | Comment says “deliberately IDENTICAL” to `messagingGroupPolicy.mjs` — **not imported, no coupling test** | Same defect class they just fixed for consent versions |
| `CURRENT_CONSENT_VERSION` vs `AI_CONSENT_VERSION` | Coupling test added | Good, but path is `resolve(process.cwd(), '../frontend/...')` — cwd-dependent. Breaks if vitest root is repo root |
| `GATED_FIELDS_REQUIRE_CONSENT_VERSION = '3.0'` vs current `'2.0'` | Test asserts inequality only | Does not assert the hatch is closed in prod env |
| `TRAINING_SAFETY_PATHS` “load-bearing” | Stripper uses **leaf name only** (`split('.').pop()`) | Adding `health.sleep` un-gates **every** key named `sleep`, not that path. Path list is not a path control |
| Frontend capabilities vs server lane | `canMessageAssignedCoach` used; `canUseCommunityDirectMessages` fetched and unused | UI surface ≠ server allow-set |
| Socket error `{ message }` vs REST `{ success, code, message }` | `socket.emit('error', { message: 'You can message your assigned trainer here.' })` | No `code`; UI cannot branch stale-consent / outside-relationship / rate-limit |
| Consent 403 body `{ code, storedVersion, requiredVersion }` | Middleware well-shaped | **No frontend consumer in this diff** except the consent screen’s local version compare |

---

## (e) House-rule violations / speculative-success

**House rules**
- **Dual-Button Glow: absent** on the only screen that decides whether a non-assigned client pays. The wall is a centered `<div>`. No 44px CTA, no glow pair, no route to find-a-trainer or packages. This is the highest-value surface in the remit.
- styled-components / CSS vars with fallbacks / dark-first: `MessagingView` complies (`var(--text-muted,#…)`, etc.).
- `<=300` lines: `AiConsentScreen.tsx` still edited at L522 (accepted pre-existing). New files are inside the cap. Do not treat “already over” as a license to keep piling on that screen.
- Zero-PII-to-LLMs: still a denylist. Accepted, but copy now *names* withheld categories while free-text notes and unmatched keys still egress. Honest copy ≠ closed control.
- No MUI / Recharts / yoga language / “NASM-certified”: clean in this diff.

**Speculative-success language (kill it)**
- “Same RELATIONSHIP lane as the REST path” (`socket.mjs` comment) — **false**. List has a staff-role keep; shared write helper does not.
- “`TRAINING_SAFETY_PATHS` is LOAD-BEARING” — **half-true**. Leaves are consulted; paths are not.
- “ONE parse rule” for ids — **not one symbol**. Two functions, a comment, no test.
- Review preamble: “three hostile passes … are DONE” + “assume it is correct” + “no authenticated browser pass.” That is an instruction to rubber-stamp unverified UI. I am not doing that.
- `aiConsentCopy.ts` previously claimed a test that did not exist; the new contract test only asserts substrings (`'sleep'` appears), not polarity. “We never withhold sleep” would still pass the withheld-term check.

---

## (f) SINGLE highest-risk item

**Relationship-lane list policy and write policy are not the same product, and the conversion/error wall will present the wrong story to the people who pay.**

Concretely, de-risk **before build/ship** in this order:

1. **Unify staff reachability (named path, not a comment).**  
   Either: `isRelationshipWriteAllowed` treats assigned **or** current staff the same way the list does (lookup `users.role` now, not json_agg), **or** stop showing staff threads the writer will reject. Add one test that creates the `ensureAdminConversation` thread as a relationship-only client and **POSTs a message** (REST *and* socket). Green list + red write is a support outage you just made visible.

2. **Capabilities error ≠ upsell.**  
   `const { capabilities, loading, error } = useMessagingCapabilities(...)`. If `error`, render a retry panel (Dual-Button Glow: Retry / Contact support). Never the trainer wall. Pin with a test that mocks the hook error and forbids the wall copy.

3. **Wall is a sales surface, not a sentence.**  
   Two 44px Dual-Button Glow actions: “Find a trainer” (assignment / matching route — **required lookup** for the real path name) and “View training packages” (the $8.4k–$33.6k catalog, not Crystalline, unless `canUseCommunityDirectMessages` is the only missing bit). Third state: package purchased / assignment pending — do not reuse the no-trainer sentence.

4. **Coach re-consent is an interstitial, not a status code.**  
   `AI_CONSENT_STALE_VERSION` must route every Coach caller to `AiConsentScreen` (or a shared modal). **Required lookup:** workout-logger / Coach client error handler. If that path is “generic toast,” this deploy bricks Coach for every v1.0/null grant on day one. That is the owner Q5 ruling with no recovery.

Until (1) and (2) are tested and (4) is a named route, this is not a quality enhancement list — it is an incomplete gate.

---

## UX FINDINGS (ranked by business value)
*Past the four already named. Those four remain open and still outrank most of this list; I am not re-deriving them.*

1. **Un-hidden admin thread is a new dead-end (money + support).** List keep for `role === 'admin'|'trainer'` (`conversationController.mjs`) without a matching write allow in `isRelationshipWriteAllowed`. Highest-intent surface after purchase is “message the studio.” You just showed it and left send unauthorized. Confirm `json_agg` even *has* `role` in prod SQL — if it does not, the new tests are green on a fixture the query never returns (**required lookup:** conversation list query).

2. **No “assignment pending” state.** Packages are $8.4k–$33.6k and not self-serve subscriptions. The hours between Stripe success and `client_trainer_assignments` row still render the same wall as a tire-kicker. That is where a paying client decides the product is broken.

3. **`?composeTo=` is a trainer-to-client handoff that cannot fail loudly.** Effect swallows rejection, strips the param, uses lenient parse. A trainer texting a link is a conversion tool; this implementation turns a 403 into “nothing happened.”

4. **Socket denial copy is an affirmation.** `'You can message your assigned trainer here.'` reads as help text, not “this thread is forbidden.” No `code`. The user who just tapped the admin channel they can now *see* gets a sentence that does not name the failure.

5. **“Polling” is engineer-facing status on a luxury inbox.** Summary metric `$live={connected}` shows `Polling` to a client who paid five figures. That is a trust hit, not a status. Show nothing, or “Connecting…”, never “Polling.”

6. **Stale `activeConversationId` after lane filter.** `hasMobileThread = !!activeConversationId` while `activeConversation` is `find` on the *filtered* list. A previously-open community thread becomes a thread pane with `hasConversation=true` and `conversation=null`. Empty, back-button-only, no explanation.

7. **Mobile chrome before content.** Kicker + H1 + three 56px metric cards, then the list. On `max-width: 520px` metrics go to one column. First viewport is branding, not messages. Collapse metrics into the header or hide on small screens.

8. **Re-consent is not in the Coach flow in this diff.** Backend will 403 processing for every stale/null grant. If the user is mid-workout-log, the only recovery shown here is a different dashboard page. That is a brick, not a prompt.

9. **A11y:** `Loading...` and the wall are inert `div`s, no `role="status"` / `aria-live`. Focus trap comment correctly refuses a second caller — fine — but the first thing every user sees is still unannounced bare text (known #4, still true).

10. **Wall copy names two products and does not say which the user is missing.** Relationship-only vs Crystalline-only vs both vs error vs pending assignment are one sentence. The UI has the bits (`canUseCommunityDirectMessages`) and does not use them (known #3, still the right fix).

## LOGIC / MAINTAINABILITY
- **Two id parsers, one comment.** Extract `toStrictPositiveInt` to a single module and import it from controller + repository. Add the coupling test they wrote for consent versions. Comments are not controls — they already learned this.
- **Two relationship policies.** List filter (roles + ids) vs `isRelationshipWriteAllowed` (ids only) vs REST middleware (not in diff). Collapse to one function used by list, REST write, and socket. The socket/REST “shared seam” test only covers the write helper.
- **Socket imports middleware** (`requireTier.mjs`, `tierCatalog.mjs`). Layering will rot. Entitlement resolve belongs in a service both call.
- **`isGatedLifestyleKey` is a science project.** Unanchored `per`/`count`, suffix enumeration, leaf-only safety set. Replace with: exact gated key set + prefix `sleep`/`stress`/`supplement` *only when the remainder is empty or a known metric suffix anchored at `^` and `$`*. Keep the “unknown → keep” asymmetry; stop pretending a regex can do clinical NLP.
- **`TRAINING_SAFETY_PATHS` should match full paths** during the walk (`prefix` is already built) or be renamed to `TRAINING_SAFETY_LEAF_NAMES`. Current export is a lie to the next editor.
- **Consent coupling test cwd** and **frontend contract substring checks** will pass on contradictory copy. Assert polarity (“withheld” / “not sent” within N characters of each term) or render from `AI_CONSENT_PROTECTIONS` and drop the duplicate bullets.
- **`lastWarnedConsentVersion`:** log on a 1/min sampler or increment a metric. Once-per-process is how misconfig disappears after the first hour.

## MISSING PRODUCT CAPABILITY
- Find-a-trainer + package CTA on the wall (house Dual-Button Glow).
- Pending-assignment inbox (“Your trainer will be attached — you can already reach studio support”) with a write-enabled staff thread.
- Scope `NewConversationModal` / user search to assigned counterparties when `!canUseCommunityDirectMessages`; hide member search entirely.
- In-flow stale-consent modal on any `AI_CONSENT_STALE_VERSION`.
- `composeTo` toast: success opens thread; 403 explains “you can only message your assigned trainer”; invalid id ignored without stripping until resolved.
- Trainer-side: “this client cannot message you until assignment is active.”
- Do not upsell Crystalline on a relationship failure. Upsell Crystalline only when the user tried a member-to-member action.

## WHERE A FIX MADE THINGS WORSE
- **Staff-thread visibility without write parity** — hidden channel → visible tease. Worse than the original bug for anyone who opens it.
- **Clinical-term regex inversion** — `stressFracture` lives; `sleepHygiene` / `supplementUse` / unanchored `per` now mis-fire in both directions. Third appearance of “narrow the hole, don’t close the shape,” now inside the matcher they wrote to escape that class.
- **Socket copy** replaced a hard 403 with a sentence that sounds like permission.
- **Log-once mismatch** — first error is the only error; after rotation the hatch looks healthy.
- **Community short-circuit in the “shared” write helper** — tests now lock in “elite → no DB, allow.” That is a future IDOR if a caller treats the helper as authorization.
- **Capabilities fail-closed rendered as upsell** (pre-existing, still here) — the lane fix increased the number of people who *should* get messaging, which makes the false wall more expensive.

## WHAT I WOULD NOT CHANGE
- Single `CURRENT_CONSENT_VERSION` + `isConsentVersionCurrent` treating null as stale. Direction is right.
- Fail-closed hide + loud log when `participants` is unparseable.
- Putting the relationship lane on the socket at all. That was the real hole.
- Walking arrays in the stripper. That was a real hole.
- Owner split: injuries/pain/measurements/conditions flow; supplements/sleep/stress withheld. Do not flip it back to a wholesale deny.
- Re-consent for pre-v2 grants. Do not grandfather v1.0.
- Community DMs remaining subscription-gated (owner ruling).
- Not building a focus-trap stack for a second caller that does not exist.

**Required lookups (do not guess):**
1. Conversation list SQL — does `json_agg` include `role`?
2. REST send/create middleware — can a relationship-only client write the `ensureAdminConversation` thread?
3. `socket.mjs` after the new block — membership check still runs for `hasCommunityAccess === true`?
4. Coach / workout-logger client — handler for `AI_CONSENT_STALE_VERSION`.
5. Real route names for find-a-trainer and package catalog (for the wall CTAs).
6. `useMessagingCapabilities` default `capabilities` on error.
7. `toStrictPositiveInt` body vs `toId` — actually identical?
8. `NewConversationModal` / `searchUsers` server filter for relationship-lane.

Until 1–4 are answered with code, “SHIP WITH ENHANCEMENTS” is wishful. **REVISE:** fix list/write parity + error-wall + re-consent interstitial, then enhance the wall into a Dual-Button Glow sales surface.
