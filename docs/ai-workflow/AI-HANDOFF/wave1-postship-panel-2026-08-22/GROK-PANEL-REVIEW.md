# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/WAVE1-SHIPPED-AUDIT-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 36855 in / 19001 out · **Cost:** ~$0.1875 · **Wall:** 389.6s · **finish:** stop

---

## VERDICT: FOLLOW-UP FIXES
REVISE — not a crash-class ship-killer in the files provided, but this is not clean. One confirmed authorization inversion is live; two money-path items are unverified because this packet has no browser pass and no socket/list-DTO files.

---

## LIVE DEFECTS (worth a hotfix deploy)

None I would page a deploy for **from this packet alone**.

Two items are **live-until-disproven**. If either lookup confirms, that is a same-day hotfix:

1. **List narrowing can drop every relationship thread** — `conversationController.mjs` filter assumes `conversations` is an `Array` and each member looks like `{ participants: [{ id }] }`. It uses `Number(participant?.id)` against a `Set<number>`. There is no guard that `getConversationsForViewer` actually returns that shape. A `{ userId }` / `{ user: { id } }` DTO, or a wrapped `{ conversations: [...] }`, either empties the inbox or 500s **only** for the free+assignment clients this ship exists to serve. Community lane never hits the filter, so it would look fine. Tests mock the assumed shape. Packet admits no authenticated browser pass.

2. **Socket/membership path can undo the relationship lane** — REST `create` / `conversation` now require counterparties. Sockets are not in this packet. `useMessaging` turns on for `canMessageAssignedCoach === true`. The exact user the list-scope fix describes (downgraded elite, still assigned a trainer, still a `deleted_at IS NULL` row on old community threads) is now in the live socket client. If join/send is still “are you a participant?”, they can keep writing community threads the REST gate just 403’d. That is the same defect class as the already-fixed add-participant bypass.

**Required lookups before you close this audit:**
- `getConversationsForViewer` return DTO (participant field name, array vs wrapper)
- messaging socket join/send/typing authorization
- how `ClientTrainerAssignment` is revoked (`status` vs `deletedAt`)
- whether `grantConsent` / generation endpoints require `consentVersion === CURRENT` or any `VALID` grant

---

## FOLLOW-UPS (real, not urgent)

**1. Confirmed: trainer/staff adding a third body ejects the paying client from their own coaching thread.**

`requireMessagingAccess` conversation scope (`requireMessagingAccess.mjs`, conversation branch): `membership.others.every((id) => counterparties.has(id))`, then list filter uses the same rule.

Failure path:
- Client C, `tier:'free'`, active assignment to trainer T. 1:1 send works (AC1).
- T is staff, bypasses the gate, `POST /conversations/:id/participants` with a second trainer, admin, or specialist.
- C’s next `POST .../messages`: `others = [T, T2]`, T2 ∉ counterparties → **403 `OUTSIDE_COACHING_RELATIONSHIP`**.
- C’s list filter hides the thread (`others.every` fails on mixed groups — this is tested and intentional).
- Copy says “Upgrade to message other members.” C is trying to message their paid trainer.

You hardened the client-adds-stranger history leak (correct) and left the complementary inversion: **staff can poison the client’s only legal channel**. Group participant routes are first-class in this same diff. Not theoretical.

Fix: treat `admin`/`trainer` (or any `client_trainer_assignments` trainer for that client) as inside the relationship. Do not make “every other member is my assigned counterparty” a hard equality when staff are present.

**2. Confirmed: owner “re-consent all” was implemented as an optional banner, not a gate.**

- Backend: `VALID_CONSENT_VERSIONS = ['1.0','2.0']`, comment says existing 1.0 grants keep working.
- UI: `needsReconsent` only on `AiConsentScreen`, and only when `status.profile.consentVersion` is truthy **and** ≠ `2.0`.
- NULL/missing `consentVersion` → **no prompt**.
- Users who never open that screen keep sending injury/medical data under a disclosure you just called materially inaccurate.

That is not “re-consent all”. Do not cowboy-block Coach in a hotfix (product/revenue). Do escalate to owner/counsel: generation path should reject stale versions after a forced interstitial, not a settings banner.

**3. Confirmed: v2.0 bullets re-introduced the “only” overclaim on the legal capture surfaces.**

`aiConsentCopy.ts` accuracy contract: denylist cannot promise “training-relevant data only”; do not restore “only”.

Then:
- `ConsentSection.tsx` (onboarding grant): “Training-relevant information only: …”
- `AiConsentScreen.tsx`: “Training-relevant information only — …”

Long-form disclosure is honest; adjacent bullets lie. Same class as already-fixed defect 7. You burned 2.0 on this. Next copy fix is 2.1/3.0. The comment claims “a test asserts the inline bullets stay consistent with `AI_CONSENT_PROTECTIONS`” — **that test is not in this diff**.

**4. Confirmed: `canUseCommunityDirectMessages` is fetched and then ignored.**

`MessagingView.tsx`: `messagingEnabled = capabilities.canMessageAssignedCoach` only. Search stays `protect`-only (`GET /users/search`). Relationship-only clients get a full composer, pick strangers, eat 403s. API is safe; UI is not the gate you told yourselves you built.

**5. Confirmed: `ensureAdminConversation` then relationship-filter hides/403s it.**

Every relationship list call creates/ensures an admin thread, then drops it because admin ∉ counterparties, then 403s it on open. Free+assignment clients still cannot reach support messaging; you now also insert rows they cannot use.

**6. Health strip is still a category claim with holes the tests do not pin.**

`stripGatedHealthFields` (`deIdentificationService.mjs`):
- Does not recurse arrays. `{ recovery: [{ sleepDebt: 12, stressLoad: 8 }] }` forwards sleep/stress. Nested objects are tested; arrays are not.
- Dual-match keeps the key: `GATED_KEY_PATTERN && !SAFETY_KEY_PATTERN`. `sleepConditions`, `painSupplements`, `conditionStress` are **kept**. `sleepConditions` is a realistic form key.
- Exported `TRAINING_SAFETY_PATHS` is **not consulted**. Protection is the regex. The frozen list is documentation that a future edit will trust.

Accepted denylist covers unknown fields and free-text names. It does not cover “we skip arrays” or “sleep*+*condition survives”. Copy still says sleep/stress/supplements are never sent.

**7. Smaller, still real**
- `GET /capabilities` has no try/catch. Current callee is unlikely to throw; still an unhandled-rejection footgun on a new public authenticated route.
- `needsReconsent` / backend `CURRENT_CONSENT_VERSION` / frontend `AI_CONSENT_VERSION` are coupled by comment only. No cross-stack lock test.
- Capabilities are not refetched on assignment change (stale deny after a new assignment; stale allow after revoke — UI only).
- `areGatedHealthFieldsEnabled` error-logs on every `deIdentify` if the flag is half-set.
- `useFocusTrap`: keydown-only, one rAF, no retry if `sidebarRef.current` is null. Fine for this always-mounted drawer; not a general modal contract. `tabIndex={-1}` is applied on desktop nav too.

---

## WHAT I TRIED AND COULD NOT BREAK

- **String/number IDs on the HTTP gate.** `toId` + tests cover `protect`’s string `req.user.id` vs numeric SQL. This is solid.
- **Client-driven stranger add / `adminIds` smuggle.** `assertRequestedParticipantsAllowed` is on both `create` and `conversation`. Regression tests are the right attack. HTTP path holds.
- **Community monetization lane.** Elite/trial short-circuit before assignment SQL. Free + no assignment still 402 with the old payload. Kill-switch and staff bypass preserved.
- **Fail-closed SQL.** Assignment/participant lookup throw → deny. Empty/unknown thread → deny. Actor not a member → deny. Good.
- **Schema quoting on the new SQL.** `client_trainer_assignments` + quoted `"clientId"`/`"trainerId"`; `conversation_participants` snake_case + `deleted_at IS NULL`. Matches the domain note; they did not use the drifted `ConversationParticipants` model.
- **Health escape hatch.** Flag without `COACH_HEALTH_FIELDS_CONSENT_VERSION=3.0` stays closed. That part is a real control, not a comment.
- **Capabilities client parsing.** `=== true` fail-closed; error → `DENY_ALL`. No local `isElite` recomputation in `MessagingView`.
- **Focus trap contract in the harness.** Tab wrap, Escape, restore, inactive passthrough. Drawer a11y hole they named is actually fixed for keyboard Tab.
- **Injection on the new queries.** Bound replacements only.
- **House visual stack on new UI.** styled-components, `var(--token, #fallback)`, no MUI/Recharts, no yoga/NASM wording, no new PII-to-LLM path.

---

## CONFIDENCE + WHAT WOULD CHANGE MY MIND

**Confidence: 74.** High on the in-diff logic bugs (mixed-membership lockout, unused community flag, “only” copy, array/dual-match strip, re-consent not enforced). Medium on severity-to-hotfix, because the two things that would make me say **HOTFIX NOW** are files you did not include.

**Flip to HOTFIX NOW if:**
- `getConversationsForViewer` does not return `participants[].id` on an array, or
- socket send/join is membership-only, or
- production has package-client group threads with a second staff member.

**Flip to NO ACTION if:**
- a real list payload shows `{ id }` and the filter keeps trainer 1:1s,
- socket send applies the same counterparty rule (or does not join non-relationship rooms),
- trainers never add a third participant to client threads (and you will keep it that way in the controller, not by hope),
- counsel explicitly accepts v1.0 grants as remaining lawful basis.

**Acceptance I reject:** “No authenticated browser pass was possible” is not an accepted risk on a live filter that decides whether paying clients see their trainer. That is an unverified money path, not a known limitation.

---

### (a) VERDICT
**REVISE** — `backend/middleware/requireMessagingAccess.mjs` conversation `others.every(counterparties.has)` (lockout); `backend/controllers/messaging/conversationController.mjs` list filter (unverified DTO); `frontend/src/components/Social/Messaging/MessagingView.tsx` (`canUseCommunityDirectMessages` unused); `ConsentSection.tsx` / `AiConsentScreen.tsx` (“only”); `deIdentificationService.mjs` `stripGatedHealthFields` (no array walk; `TRAINING_SAFETY_PATHS` dead).

### (b) Correctness
Happy-path 1:1 trainer thread is tested and works. Gaps: mixed groups, list DTO, sockets, capabilities stale state, `conversations.filter` assumes Array, re-consent skipped on NULL version, health walker skips arrays. No off-by-one. Create empty-after-`toId` correctly 400s. `parseInt("900abc")` can desync gate vs controller; fails closed in practice.

### (c) Security
Authz/IDOR on REST add-participant is fixed. Remaining: socket IDOR into legacy community threads; staff-bypass → client lockout; `/users/search` still global (pre-existing, now reachable); capabilities info-leak is intentional and fine; no injection/SSRF/secret issues in-diff; relationship SQL is not tenant-scoped (fine if single-tenant); extra SELECT per messaging request is not DoS-interesting.

### (d) Data-truth / Rule 58
New SQL matches the stated schema. Drift risk is **frontend/list response shape**, not table names: filter keys `participant.id` while the unused Sequelize model and `conversation_participants.user_id` show this codebase already has that exact drift class. Consent version 2.0 is aligned in the files shown; grant/generation persistence is not. Capabilities JSON shape matches the hook.

### (e) House rules / speculative success
No MUI/Recharts/yoga/NASM violations in-diff. New files are ≤300; they kept growing already-over files (accepted, still a smell). Palette tokens on `ReconsentNotice` are correct. “A test asserts inline bullets stay consistent” is speculative-success — test not shipped. “Single source of truth” is explicitly not true for the bullets, which is where onboarding users actually read the claim.

### (f) Single highest-risk item
**Relationship-lane list + conversation rules are REST-only and DTO-shaped, while the live client now opens sockets for the exact downgrade/package user this wave targeted.**

De-risk before you call this done:
1. Print one production `GET /conversations` payload for a free+assignment client; assert trainer thread survives the filter.
2. Read the socket send/join handler; apply `loadAssignedCounterpartyIds` + the same `others` rule, or do not join rooms outside that set.
3. In the same change, allow staff/admin (or any assigned trainer) in `others` so a trainer cannot 403 their own client by adding a colleague.
