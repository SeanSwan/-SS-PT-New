# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/WAVE2-FORWARD-REVIEW-PACKET-2026-08-24.md
**Tokens:** 20124 in / 17079 out (reasoning: 14376) | total 37203
**Wall:** 233.2s

---

## VERDICT
REVISE — nothing shown crashes the happy path, but two latent holes (a consent-coupling gap that detonates silently against every consenting user, and a `body.userId` override in the AI-consent gate) directly contradict the safety claims this code documents about itself.

## BLOCKERS

1. **P0 (conditional on controller parity, which the file's own comment asserts)** — `backend/middleware/aiConsent.mjs :: requireAiConsent`. The comment says "clients target self," but the code only *defaults* to self; it never enforces it. Failure: authenticated client (id 7) POSTs `{ userId: 42 }` → `targetUserId = 42` for **any** requester role → gate loads user 42's `AiPrivacyProfile`, passes if 42 consented, and attaches `req.aiConsentProfile` for user 42. Two concrete bad outcomes: (a) a client whose own consent was **withdrawn** passes the gate by borrowing any consenting user's ID; (b) if the controller resolves the target "same logic" as the comment claims, the response is a workout built from user 42's injuries/measurements delivered to user 7 — a health-data exfil channel that bypasses deIdentify entirely. Even in the benign case this is a per-ID consent-state oracle (`aiEnabled`/`withdrawnAt`/version distinguishable). Evidence: `const rawUserId = req.body?.userId; const targetUserId = rawUserId && Number.isFinite(...) ? Number(rawUserId) : requesterRole === 'client' ? requesterId : null;` — the client branch is unreachable whenever body.userId is present.

2. **P1** — `deIdentificationService.mjs :: areGatedHealthFieldsEnabled` vs `consentVersion.mjs`. The "structural coupling" only checks the *env declaration* against a *constant in the same file*. It never checks `GATED_FIELDS_REQUIRE_CONSENT_VERSION ('3.0')` against `CURRENT_CONSENT_VERSION ('2.0')`, nor the user's stored version. Failure: operator sets `COACH_HEALTH_FIELDS_ENABLED=true` + `COACH_HEALTH_FIELDS_CONSENT_VERSION=3.0` → `areGatedHealthFieldsEnabled()` returns true with zero warnings → every user holding a 2.0 grant passes `requireAiConsent` (their 2.0 **is** current) → their sleep/stress/supplement data flows while disclosure v2.0 says it is "withheld." That is precisely the "users were lied to" outcome the escape-hatch essay claims is now impossible — by the file's own standard ("a caution is not a control"), the coupling is still a caution. The invariant is enforced only by deploy discipline.

3. **P1** — Duplicated lane logic: `requireMessagingAccess.mjs` conversation scope inlines `membership.others.every((m) => counterparties.has(m.id) || m.role === 'admin' || m.role === 'trainer')` while `messagingAccessRepository.mjs :: isRelationshipWriteAllowed` implements the same rule separately for the socket. This codebase's original messaging bug was exactly REST-vs-socket divergence of one rule. Two implementations of "relationship write allowed" is that bug class re-seeded: the next edit to one (new role, new condition) silently re-diverges REST from socket. Note the socket path also runs `isActiveParticipant` and then `isRelationshipWriteAllowed`, which re-queries membership — double query plus the duplication.

4. **P1** — Category-synonym under-gating in `classifyKey`/`GATED_TOKEN`. Keys with no `sleep|stress|supplement` substring bypass entirely and **are not even logged**: `bedtime`, `anxietyLevel`, `fatigueScore`, `restedness`, `recoveryScore` all flow silently. Token-bearing keys with any word outside `LIFESTYLE_WORDS` are kept: `timeAsleep`, `hoursAsleep` (contains "sleep"; "asleep" ∉ vocabulary → 'ambiguous' → kept). The consent copy makes a category claim ("supplements, sleep and stress data are also withheld"); a client payload using `bedtime: "23:00"` / `anxietyLevel: 8` violates it with zero telemetry. The design accepts under-gating as the lesser evil, but the *silent* (unlogged) no-token path was not part of that tradeoff — only 'ambiguous' logs.

5. **P2** — `deIdentify` step 4 name-leak correction is a no-op tautology when `spiritName` equals the real name: it "corrects" `client.name` to `anonymousLabel`, which *is* the contaminated value (`anonymousLabel = normalizedSpiritName || ...`). `client.alias` (aliasLabel) also carries it. A client whose chosen alias is their real name ships their real name to the provider as the pseudonym. Fallback must be the generic `Client #id`, not `anonymousLabel`.

6. **P2** — Socket DoS surface remains: the comment claims "Throttle FIRST," but `isActiveParticipant` (a DB query) still runs **before** `checkMessageRate`. An authenticated emit loop with a valid own-conversation ID forces one DB round-trip per rejected message, unthrottled.

7. **P2 — binding house-rule violation** — `≤300 lines per file`: `MessagingView.tsx` (~450 lines as shown: component + inline styled-components) and `deIdentificationService.mjs` (~580 lines with commentary) both exceed the cap. Rules are non-negotiable per panel charter; flagging as instructed.

## ATTACKS

- **Correctness**
  - `sendTierRequired(res, entitlement)` is also the response when `loadAssignedCounterpartyIds` returns **null** (DB failure). A paying client with an active assignment, during a transient DB fault, gets a 402 paywall telling them to upgrade — the exact population this middleware was written to stop misleading. Fail-closed should not mean fail-into-a-lie; that path deserves a 503.
  - `SAFE_FIELD_PATHS` is dead code listing `health.supplements`, `lifestyle.sleepHours`, `lifestyle.stressLevel`, `lifestyle.sleepQuality` as "safe to keep" — directly contradicting the gate that now strips them. Zero references in the file. A future editor reading top-of-file constants re-opens the leak. Delete it.
  - `PHONE_REGEX` matches any 10-digit run; booking IDs / session references in note text become `[REDACTED_PHONE]`, silently corrupting training data with no log of what matched.
  - `onlineUserIds.has(activeParticipant.id)` is strict-set membership in a file that defensively `String()`-normalizes IDs everywhere else — if the socket emits numeric IDs and participants carry strings (or vice versa), the online badge is permanently false. Type drift is documented reality here (`protect` stores string ids).
  - Socket path calls `resolveCurrentEntitlement({ user: socket.user })` with a synthetic object while REST passes the real `req`. If that function reads anything besides `user` off its argument, the two lanes resolve entitlement differently — another latent REST/socket divergence.

- **Security**
  - Blockers 1, 2, 4 above (IDOR/consent oracle; env-coupling mis-disclosure; synonym under-gate).
  - teachPrompt egress (Slice 6): `buildClientCurrentWorkoutCoachAction` embeds `assignmentSafetyCopy(workout)` into a query string. If that helper renders contraindication text derived from client injuries — its name suggests exactly that — health data lands in browser history, server access logs, and referrer headers. That upgrades Slice 6 from hygiene to health-privacy and should be pulled forward.
  - TOCTOU (accepted-risk, note only): assignment can be revoked between gate and `INSERT INTO messages`; the message lands post-revocation. Small window, real thread.
  - `NewConversationModal` receives `searchUsers` for relationship-lane clients; if the search endpoint returns a directory of all users, clients get enumeration the create-gate then 403s — server says no, UI already showed the goods. Unverifiable from the excerpt.

- **Data-truth / schema drift**
  - **Role-domain drift (amplifies Blocker 1):** `loadConversationMembers` maps `u.role = 'user' → 'client'` in SQL, proving `'user'` is a live role value in `Users`. But `aiConsent.mjs` compares `requesterRole === 'client'`. If the JWT carries `'user'`, the client-guard ternary is dead code for every real client (making the IDOR unconditional), and a client sending *no* userId falls to `null` → 400. One of two things is true and the document doesn't say which: either roles are normalized to `'client'` before this middleware (then the SQL CASE is the anomaly), or they aren't (then the guard is vestigial). Pin the enum.
  - Frontend response-shape drift: the Status tile promises `Polling` when disconnected — whether any polling fallback exists in `useMessaging` is unverified; if not, the UI asserts resilience it doesn't have.
  - `client.middleName` (and any sibling key not in `DIRECT_IDENTIFIER_PATHS`) is forwarded verbatim — same denylist drift class the consent copy now admits, but `middleName` in particular is a *name*, i.e., the one category the copy still speaks about absolutely ("Your name … stripped").

## HIGHEST RISK
Blocker 2 — the gated-fields escape hatch. It is fully verifiable from the document (no controller behavior needed), it fires against 100% of consenting users with zero runtime signal, and the code affirmatively claims the failure mode is impossible. Cheapest de-risk (~10 lines, one commit): in `areGatedHealthFieldsEnabled`, import `CURRENT_CONSENT_VERSION` from `consentVersion.mjs` and fail closed with a critical log unless `GATED_FIELDS_REQUIRE_CONSENT_VERSION === CURRENT_CONSENT_VERSION` — forcing the constant bump and the enable to move in the same reviewed code change, which is what the comment already promises; belt-and-braces, also gate forwarding on `req.aiConsentProfile.consentVersion` being current *for the gated set*. The durable successor is the unbuilt outbound allowlist DTO — it deletes this entire denylist/enum/synonym problem class rather than patching it again.

## CONFIDENCE
Could **not** verify from the document alone, each with the evidence that would settle it:

1. **Controller parity for Blocker 1** — the routes mounting `requireAiConsent` and whether they consume `body.userId` / `req.aiConsentProfile` to select the generation target. The middleware's own comment ("same logic as controller") is testimony, not proof. Settle with: the AI workout controller source + its route wiring.
2. **Role enum in JWT** — `'user'` vs `'client'` as issued. Settle with: an auth payload sample or `authMiddleware` sign site.
3. **`assignmentSafetyCopy` contents** — whether contraindications (health data) reach the query string. Settle with: its definition and one rendered output.
4. **`useMessaging` internals** — polling fallback existence, `onlineUserIds` element types, `createConversation` callback stability (double-create risk in the composeTo effect). Settle with: `useMessaging.ts` + its tests.
5. **`resolveCurrentEntitlement` contract** — whether the `{ user: socket.user }` synthetic object is a supported shape. Settle with: its signature and the JWT-claim fallback it documents.
6. **Exact line counts** for the ≤300-line rule — my figures are estimates from the excerpts; `wc -l` on `MessagingView.tsx` and `deIdentificationService.mjs` settles it.
7. **The frontend/backend consent-version contract test and `aiPrivacy.test.mjs`** — asserted to exist, not shown; their actual assertions determine whether Blocker 2's deploy-ordering hazard is caught anywhere.

I am confident in the logic-level findings (Blockers 2–7 are provable from the shown source); Blocker 1's severity is the one place I could be wrong in either direction — if a pre-gate validator strips `body.userId` for clients it collapses to a consent-state oracle (still a defect), and if the controller honors it, it is a full data-exfil channel. I'd rather flag it conditionally than let five rounds of "the obvious is done" bury it.
