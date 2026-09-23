# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/WAVE1-SHIPPED-AUDIT-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 34241 in / 12466 out · **Cost:** ~$0.0000 · **Wall:** 438.4s · **finish:** stop

---

## VERDICT

REJECT (maps to HOTFIX NOW pending three 30-minute lookups) — the diff's core logic is sound and clearly battle-hardened, but it shipped with **zero authenticated end-to-end verification** ("No authenticated browser pass was possible"), and three unverified assumptions — the list-narrowing participant shape, the frontend API prefix, and array-shaped LLM payloads — would each convert this from "fixed" to "newly broken for the exact users it was meant to serve."

## BLOCKERS

1. **P1 — Array-valued payloads bypass the gated-health-field stripper entirely.**
   `backend/services/deIdentificationService.mjs`, `stripGatedHealthFields`: the recursion guard is `if (value && typeof value === 'object' && !Array.isArray(value))`. Arrays are never walked. Failure scenario: `contextBuilder` (not in packet) emits `recoveryLogs: [{ date: '...', sleepHours: 5, stressLevel: 8 }]` → both fields reach the LLM provider while every consent surface — the bullets, `AI_CONSENT_PROTECTIONS`, the disclosure — says sleep and stress are withheld. This is a *recurrence of the exact copy/code drift class (prior defects #2 and #3) this wave exists to kill*, reintroduced by the fix itself. The test fixtures (`fullClientPayload`, the "unlisted spellings" test) are all plain nested objects, so the suite cannot catch it. Fix is one line: recurse into array elements. Hotfix-grade if `contextBuilder` emits arrays — that file is a required lookup.

2. **P1 — The list-narrowing filter trusts an unverified participant shape; worst case it empties the inbox for every package-paying client.**
   `backend/controllers/messaging/conversationController.mjs` (narrowing block): `Number(participant?.id)` assumes `participants[]` elements expose `.id`. If `getConversationsForViewer` returns `{ userId }` or `{ user: { id } }` (the packet itself documents shape drift as a live failure mode in this codebase — the drifted `ConversationParticipants` model), every id maps to `NaN`, `others.length === 0`, and **every thread is filtered out**. Failure state: a client on a $33,600 package — the population this wave was built for — goes from a clear 402 wall to a silently empty inbox implying nobody has messaged them. The test (`messagingListScopeNarrowing.test.mjs`) mocks the fixture shape, not the repository's real return. Combined with blocker 3 below, this is why "no authenticated browser pass" is disqualifying, not incidental.

3. **P1 — Frontend capabilities URL prefix is unverified; a double-prefix 404 takes messaging down for everyone, including staff and elites.**
   `frontend/src/components/Social/Messaging/useMessagingCapabilities.ts`: `apiService.get('/api/messaging/capabilities')`. If `api.service` carries a baseURL of `/api` (extremely common), the real request is `/api/api/messaging/capabilities` → 404 → the hook's fail-closed path sets `DENY_ALL` → `MessagingView` renders the upsell for **all** roles. Every test mocks `apiService`, so the prefix convention is asserted nowhere. Required lookup: `services/api.service` baseURL plus one sibling service call for convention. If wrong, this is a site-wide messaging outage running right now.

4. **P2 — Re-consent (owner decision Q5) is display-only; nothing server-side enforces it.**
   `VALID_CONSENT_VERSIONS = ['1.0','2.0']` keeps stale grants fully functional forever, and no code path shown (or referenced) checks `consentVersion` at the point of AI processing. A user who dismisses the `ReconsentNotice` banner continues generating plans under the materially inaccurate v1.0 description indefinitely. Additionally, the guard `!!status?.profile?.consentVersion` means a profile with a null/missing version **skips the prompt entirely** — fail-open on precisely the records most likely to be legacy. Q5's stated intent ("re-consent all") is not met in production.

5. **P2 — `grantConsent(AI_CONSENT_VERSION)` signature change is unverified.**
   `AiConsentScreen.tsx` now passes the version; `services/aiConsentService.grantConsent` is not in the packet. If the service ignores arguments, the fix is a no-op (currently masked because the backend defaults to its own `CURRENT = '2.0'` — but it silently breaks the moment either side moves to 3.0). Related structural gap: the comment demands frontend `aiConsentCopy.ts` and backend `CURRENT_CONSENT_VERSION` "MUST be bumped together," yet **no test enforces the coupling across the two files** — the exact drift it guards against is one forgetful PR away.

6. **P2 — The realtime/socket path is untouched by this diff.**
   Ten commits rewire every REST route, and the packet says nothing about the socket layer. Two opposite failure modes, both live: (a) if clients send messages primarily over socket.io and that path retains the old elite check, the headline fix (package-paying clients reaching their trainer) doesn't work on the main path; (b) if the socket path has weaker/no scoping, the relationship containment is bypassable there. Required lookup: the messaging socket gateway/handlers.

7. **P2 — Binding house-rule conflict, accepted silently: "zero PII to LLMs (IDs only)" vs. the shipped denylist design.**
   The known-and-accepted item forwards measurements, injury/pain history, medical conditions, and any free-text note — keyed to a *stable* client ID — to an external provider. That is a standing violation of a rule marked non-negotiable, reconciled by owner rulings but never surfaced *as a rule conflict*. The acceptance should be an explicit, dated owner exception against the house rule, not panel silence. I am flagging the acceptance itself as wrong-in-process even if the owner decisions are right-in-substance.

8. **P3 — `ensureAdminConversation` now runs for relationship viewers, creating rows they can never see.**
   `conversationController.mjs`: it executes *before* narrowing; the admin thread's other member (admin) is not a counterparty, so the filter hides it. Net effect: a DB write per list request for free-tier clients, plus a phantom admin-side conversation. Wasteful, confusing, not dangerous.

9. **P3 — Staff bypass can silently lock a client out of their own safety channel.**
   A trainer (bypassing the gate) adds a stranger to a coaching thread → the thread now contains a non-counterparty → the client gets 403 on every operation and the thread vanishes from their narrowed list, with no notification. Access control is correct; the operational failure mode is not handled anywhere.

10. **P3 — The kill switch's blast radius quietly grew.** `TIER_GATING_ENABLED=false` now disables not just monetization gating but the relationship containment itself (documented as "identical to requireTier's" — technically true, materially different). Acceptable as an emergency lever; should be recorded as an accepted-risk expansion.

11. **P3 — Log flood on misconfiguration:** `areGatedHealthFieldsEnabled()` logs `logger.error` on *every* `deIdentify` call while misconfigured, not once.

12. **P3 — The long-form `AI_CONSENT_DISCLOSURE` never mentions supplements, sleep, or stress.** Only the inline bullets carry the category claim. Not a contradiction (under-disclosing removals is the safe direction), but given prior defect #7 was an adjacent-sentence contradiction in exactly this artifact, the legal text and bullets should be reconciled in one pass.

## ATTACKS

**Correctness**
- `stripGatedHealthFields` deletes keys during `for...of` over `Object.keys()` — safe (snapshot), no bug there. The array gap is blocker 1.
- `SAFETY_KEY_PATTERN` overrides `GATED_KEY_PATTERN`, so a compound key like `painSleepCorrelation` or `stressMeasurements` is forwarded wholesale despite carrying gated-category data. Contrived today; the override is regex-on-key-name, so it scales badly as fields accrete.
- `TRAINING_SAFETY_PATHS` is exported, frozen, tested… and **never referenced by any runtime code**. Enforcement is purely the regex. The "explicit list a future edit has to argue with" argues with nothing — it's documentation wearing a const's clothes. Either consume it in the matcher or demote it to a comment honestly.
- `useFocusTrap`: `hasLayout` is computed **once at effect setup**. If the drawer mounts hidden/zero-size and expands later (animated drawers commonly do), the trap degrades to attribute-only filtering for its whole lifetime — stale-state class bug. Also `aria-modal="true"` without `inert`/`aria-hidden` on the background means SR virtual cursors still roam the page behind; the trap solves keyboard, not the modal semantics it declares.
- `needsReconsent` uses strict `!==` on `consentVersion` — a numeric `2` vs `'2.0'` string from the backend silently disables re-prompting. Shape unverified (lookup: consent status response).
- `useMessagingCapabilities` never refetches on assignment creation or window focus; a client assigned mid-session sees stale `DENY_ALL` until remount. `refresh` is exported but no caller is shown.

**Security**
- Authz core is genuinely tight: fail-closed lookups, membership + subset + body-participant validation, string/number id normalization, parameterized SQL, quoted identifiers matching the verified schema. I could not defeat the REST gate itself.
- Routes validate `:id`/`:userId` **after** the middleware runs (validator chains are positioned last), so `loadConversationMembers` receives raw params — saved only by `toId()` returning null → 403. Fragile ordering, currently safe.
- `PATCH/DELETE /conversations/:id/participants/:userId` target the **param**, which `assertRequestedParticipantsAllowed` never inspects (body-only). Contained today because the membership precondition forces all-counterparty threads, but it's one controller change away from a hole; the gate and the param-validation live in different layers with nothing pinning them together.
- `GET /users/search` remains open to all authenticated users — a free-tier relationship client can enumerate the full member directory (names/photos). Pre-existing, but the new gate makes "free-tier but authenticated" a larger population than before.
- `GET /capabilities` is uncached and uncapped, two DB round-trips per call, mounted on every MessagingView render — trivially amplifiable, low impact.
- Kill-switch and env-flag behaviors: see blockers 7/10.

**Data-truth / schema drift**
- The packet's own schema notes are the best part of the document and appear correct (snake_case `conversation_participants`, quoted camelCase assignment columns, drifted Sequelize model avoided). The SQL is consistent with them.
- Remaining drift surfaces are exactly the ones the packet cannot self-certify: `getConversationsForViewer`'s participant shape (blocker 2), the capabilities response envelope vs. `apiService` envelope unwrapping (`response?.data ?? {}` assumes axios-style; if the service already unwraps, `data` is undefined → DENY_ALL — same outage as blocker 3, different mechanism), and `grantConsent`'s signature (blocker 5).

## HIGHEST RISK

The cluster of **unverified integrations behind "No authenticated browser pass was possible"** — blockers 2 and 3 in particular share a property: each converts the wave's target population (paying package clients) or the entire feature base into a silently broken state, and each is invisible to every test in the packet because the tests mock the boundary being guessed at. Cheapest de-risk, ~30 minutes, before anything else: (1) one authenticated request as a `tier:'free'` client with an active assignment against `GET /api/messaging/capabilities` and `GET /api/messaging/conversations`, inspecting the raw JSON envelopes and the participant array shape; (2) one `deIdentify()` call in a REPL with an array-wrapped `{sleepHours}` payload. Three responses settle four blockers.

## CONFIDENCE

Could **not** verify from the packet, with the evidence that would settle each:
- `getConversationsForViewer` return shape → its source in `messagingRepository.mjs`.
- `apiService` baseURL and envelope convention → `services/api.service.ts` + one sibling consumer.
- Whether messages flow over sockets and what authz that path applies → the messaging socket gateway.
- `grantConsent` signature and the backend grant endpoint's body handling → `aiConsentService.ts` + `aiConsentController.mjs` grant handler.
- Whether `contextBuilder` emits array-wrapped health/lifestyle data → `contextBuilder` source. This single file decides whether blocker 1 is a hotfix or a hardening note.
- Whether any code path checks `consentVersion` before processing → grep for `consentVersion` consumers outside the controller.
- House-rule conformance I could not assess from a backend-heavy diff: Dual-Button Glow styling, 44px targets, WCAG ratios on the warning tokens (the gold `#C6A84B` icon on the tinted surface is decorative, but the token pair should be measured once).

I am deliberately **not** claiming the REST gate is bypassable — I attacked lane ordering, the vacuous-true body check, the param-vs-body gap, string/number coercion, soft-deleted participants, and the union query, and found it holding. My uncertainty is concentrated in the integration seams, and I want that on the record rather than laundered into false confidence about the parts I did verify.
