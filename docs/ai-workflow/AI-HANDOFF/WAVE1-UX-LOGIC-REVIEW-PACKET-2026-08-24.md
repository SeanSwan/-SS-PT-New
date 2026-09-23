---
title: "Client Dashboard Wave 1 — UX, logic and enhancement review"
decision: "Where can this be made better — UX, logic, product — beyond being merely correct?"
status: open
supersedes: none
originating_model: claude-opus-5
---

# REVIEW — this time for QUALITY, not just correctness

This diff has already been through three hostile passes for security and
correctness (7-seat plan panel, 7-seat code panel, 5-seat post-ship panel) and a
6-round dry loop. Those found and fixed real defects and are DONE.

**This pass is a different question.** Sean's remit: *"ways that we can make
enhancements, updates, UI/UX enhancements and updates, better logic."*

So: assume it is correct. Tell me where it is **mediocre**.

## What I want

1. **UI/UX.** These are screens real paying clients hit. Where is the experience
   thin, confusing, or a dead end? What state is unhandled, ugly, or misleading?
2. **Better logic.** Where is the implementation clumsy, over-complicated, or
   structured in a way that will hurt the next person to touch it?
3. **Product enhancement.** What is obviously missing that a client, trainer or
   admin would expect here?
4. **Where a fix made something WORSE** than the bug it fixed.

Rank by value-to-the-business, not by severity. A dead-end screen on the surface
where someone decides whether to pay is worth more than a tidy refactor.

## Context: what this code does

SwanStudios is a trainer-led personal-training SaaS. Clients buy sessions
($175/session) or packages ($8.4k-$33.6k), NOT subscriptions. A separate
subscription tier (Crystalline/elite) gates social features.

The change: messaging used to be gated on the SUBSCRIPTION tier, so clients on
large training packages — the highest payers — were blocked from contacting the
trainer they were paying. It is now gated on an active trainer RELATIONSHIP,
with community/member-to-member DMs still subscription-gated. Consent copy that
overstated anonymity was corrected. Health data egress to the LLM provider is
gated. A mobile drawer got focus containment.

## My own UX findings — attack PAST these, they are known

I reviewed my own work before sending and found four. Do not spend effort
re-deriving them; find what I missed.

1. **The messaging wall is a dead end.** A client with no trainer and no
   subscription reads one sentence and has nothing to do. No "find a trainer"
   path, no upgrade path. This is the screen where someone decides whether to
   pay, and it converts nobody.
2. **The error state is a LIE.** `useMessagingCapabilities` exposes `error`;
   `MessagingView` ignores it. A network failure renders the upsell wall — so a
   paying client with an active trainer is told they need a trainer. Fail-closed
   was right for access; rendering the denial reason as "you lack access" is not.
3. **`canUseCommunityDirectMessages` is fetched and never used.** A
   relationship-only client gets the full compose + user-search surface and
   discovers the restriction by hitting a 403. The UI should scope the surface
   to what the server will actually allow.
4. **`Loading...` is bare text** on the first thing every user of this screen
   sees.

## Known-and-accepted — challenge the ACCEPTANCE if you think it is wrong

- The de-identification layer is a DENYLIST: an unrecognised field, or a name
  typed into a free-text note, is forwarded. Copy was reworded to stop promising
  otherwise. An outbound allowlist DTO is the real fix and is unbuilt.
- Authorization and the writes it authorizes are separated in time (TOCTOU).
- Six touched files exceed a 300-line house cap; all six were already over
  before this work. Zero new violations.
- Staff (admin/trainer) bypass the messaging gate entirely.
- No authenticated browser pass was possible, so nothing here is verified
  against a real rendered page.

## Owner rulings that are NOT up for debate (design around them)

- Community/member-to-member DMs stay subscription-gated.
- Injuries, pain, measurements and medical conditions MUST keep flowing to the
  coach model — they are exercise contraindications. Supplements, sleep and
  stress are withheld.
- Clients whose consent predates the corrected disclosure must re-consent.

## Output format

```
## VERDICT: <SHIP AS IS | SHIP WITH ENHANCEMENTS | HOLD>
## UX FINDINGS (ranked by business value)
## LOGIC / MAINTAINABILITY
## MISSING PRODUCT CAPABILITY
## WHERE A FIX MADE THINGS WORSE
## WHAT I WOULD NOT CHANGE
```

Be concrete. "Add loading states" is noise; "the wall on line X should offer
<specific action> because <specific user is stuck>" is signal. If you need a
file not included, list it as a required lookup rather than guessing.

---

# THE DIFF (8 commits, rebased onto current main, unpushed)

diff --git a/backend/config/consentVersion.mjs b/backend/config/consentVersion.mjs
new file mode 100644
index 000000000..df0609c0e
--- /dev/null
+++ b/backend/config/consentVersion.mjs
@@ -0,0 +1,43 @@
+/**
+ * FILE: consentVersion.mjs
+ * PURPOSE: One source of truth for the AI consent version, server-side.
+ * CREATED: 2026-08-22 — post-ship panel (ox-alpha, GLM 5.3)
+ *
+ * WHY THIS FILE EXISTS
+ * The version lived as a private constant in aiConsentController while the
+ * enforcement middleware never referenced it at all. Two consequences, both
+ * flagged by the post-ship panel:
+ *
+ *   1. Owner decision Q5 ("re-consent all — block Coach until re-granted") was
+ *      never implemented. The gate checked aiEnabled and withdrawnAt and no
+ *      version, so every v1.0 grant kept working and the corrected disclosure
+ *      was cosmetic for existing users — the exact population it was written
+ *      for.
+ *   2. Nothing tied the two declaration sites together, so a future bump in one
+ *      place would silently diverge from the other.
+ *
+ * The frontend counterpart is frontend/src/content/aiConsentCopy.ts
+ * (AI_CONSENT_VERSION). These MUST move together — a contract test asserts it.
+ */
+
+/** The version of the disclosure currently shown to users. */
+export const CURRENT_CONSENT_VERSION = '2.0';
+
+/**
+ * Versions the API will ACCEPT on a grant. Older versions stay acceptable as
+ * historical records; they are simply no longer CURRENT, which is what the
+ * enforcement gate keys on.
+ */
+export const VALID_CONSENT_VERSIONS = ['1.0', '2.0'];
+
+/**
+ * True when a stored grant was captured under the disclosure now in force.
+ *
+ * A missing/null version counts as STALE. The frontend's first cut required a
+ * truthy version before prompting, which skipped re-consent for exactly the
+ * legacy records most likely to predate the correction — fail-open on the wrong
+ * population.
+ */
+export function isConsentVersionCurrent(storedVersion) {
+  return (storedVersion ?? null) === CURRENT_CONSENT_VERSION;
+}
diff --git a/backend/controllers/aiConsentController.mjs b/backend/controllers/aiConsentController.mjs
index 99e75b34a..9254ed6e3 100644
--- a/backend/controllers/aiConsentController.mjs
+++ b/backend/controllers/aiConsentController.mjs
@@ -13,17 +13,13 @@
 import { getAllModels } from '../models/index.mjs';
 import logger from '../utils/logger.mjs';
 import { evaluateWaiverVersionEligibility } from '../services/waivers/waiverVersionEligibilityService.mjs';
+import {
+  CURRENT_CONSENT_VERSION,
+  VALID_CONSENT_VERSIONS,
+} from '../config/consentVersion.mjs';
 
-// 2026-08-22 — v2.0 corrects the disclosure: v1.0 told users their identity was
-// "hidden" and they were "anonymous", while de-identification assigns a STABLE
-// pseudonym and forwards training, injury and medical-condition data. v1.0
-// consents were therefore captured under a materially inaccurate description of
-// processing. Both versions stay VALID so existing grants keep working, but
-// CURRENT advances so a stored 1.0 is detectable as stale and can be re-prompted
-// (owner decision Q5: re-consent all). Frontend copy lives in
-// frontend/src/content/aiConsentCopy.ts — the two MUST be bumped together.
-const CURRENT_CONSENT_VERSION = '2.0';
-const VALID_CONSENT_VERSIONS = ['1.0', '2.0'];
+// Version constants live in config/consentVersion.mjs so the enforcement
+// middleware and this controller cannot drift apart. See that file.
 
 function parsePositiveUserId(value) {
   const parsed = Number(value);
diff --git a/backend/controllers/messaging/conversationController.mjs b/backend/controllers/messaging/conversationController.mjs
index 984af0bf6..b2078af8f 100644
--- a/backend/controllers/messaging/conversationController.mjs
+++ b/backend/controllers/messaging/conversationController.mjs
@@ -4,6 +4,7 @@
  */
 
 import { validationResult } from 'express-validator';
+import logger from '../../utils/logger.mjs';
 import {
   normalizeAdminIds,
   normalizeGroupName,
@@ -66,13 +67,60 @@ export const getConversations = async (req, res) => {
     if (req.messagingAccessLane === 'relationship' && req.messagingCounterparties) {
       const allowed = req.messagingCounterparties;
       const viewerId = Number(userId);
+
+      // `participants` is a json_agg column. The driver normally hands it back
+      // parsed, but if it ever arrives as a string every id becomes NaN, every
+      // thread is filtered, and the inbox silently EMPTIES — for precisely the
+      // package-paying clients this lane exists to serve, with no error anywhere.
+      // Two post-ship reviewers (ox-alpha, grok) flagged the shape assumption
+      // independently. Rather than assume, normalize and make the unparseable
+      // case loud instead of silent.
+      const readParticipants = (conversation) => {
+        const raw = conversation?.participants;
+        if (Array.isArray(raw)) return raw;
+        if (typeof raw === 'string') {
+          try {
+            const parsed = JSON.parse(raw);
+            if (Array.isArray(parsed)) return parsed;
+          } catch { /* fall through to the loud path */ }
+        }
+        return null;
+      };
+
+      let unreadable = 0;
       conversations = conversations.filter((conversation) => {
-        const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
+        const participants = readParticipants(conversation);
+        if (participants === null) {
+          unreadable += 1;
+          // Cannot prove this is a relationship thread, so it stays hidden —
+          // the same direction the gate fails. The count below makes it visible.
+          return false;
+        }
         const others = participants
-          .map((participant) => Number(participant?.id))
-          .filter((id) => Number.isInteger(id) && id !== viewerId);
-        return others.length > 0 && others.every((id) => allowed.has(id));
+          .map((participant) => ({
+            id: Number(participant?.id ?? participant?.userId),
+            role: participant?.role,
+          }))
+          .filter((p) => Number.isInteger(p.id) && p.id !== viewerId);
+
+        // Staff count as reachable. ensureAdminConversation creates a direct
+        // support thread with the default admin for every viewer; the admin is
+        // not a TRAINING counterparty, so narrowing on assignments alone hid
+        // that thread from exactly the clients it exists for — the system
+        // created a support channel they could never see (GLM 5.3, post-ship
+        // panel). This lane exists to hide COMMUNITY threads, not staff.
+        return others.length > 0 && others.every(
+          (p) => allowed.has(p.id) || p.role === 'admin' || p.role === 'trainer',
+        );
       });
+
+      if (unreadable > 0) {
+        logger.error(
+          '[messaging] conversation participants column was unreadable; those threads '
+          + 'were hidden from a relationship-lane viewer. Check the json_agg shape.',
+          { unreadable, viewerId },
+        );
+      }
     }
     return res.json(conversations);
   } catch (error) {
diff --git a/backend/middleware/aiConsent.mjs b/backend/middleware/aiConsent.mjs
index 1cd56fcce..0fa1d4a18 100644
--- a/backend/middleware/aiConsent.mjs
+++ b/backend/middleware/aiConsent.mjs
@@ -8,6 +8,10 @@
  * Phase 1 — Privacy Foundation (Smart Workout Logger)
  */
 import logger from '../utils/logger.mjs';
+import {
+  CURRENT_CONSENT_VERSION,
+  isConsentVersionCurrent,
+} from '../config/consentVersion.mjs';
 
 /**
  * Kill switch middleware.
@@ -95,6 +99,29 @@ export function requireAiConsent(getAiPrivacyProfile) {
         });
       }
 
+      // Owner decision Q5: a grant captured under a superseded disclosure does
+      // not authorize processing. v1.0 told users their identity was "hidden"
+      // and that they stayed "anonymous", while a STABLE pseudonym travelled
+      // with their training, injury and medical-condition data. That
+      // description was materially inaccurate, so the grant it produced cannot
+      // stand in for informed consent.
+      //
+      // Until this landed, the gate checked aiEnabled and withdrawnAt and no
+      // version, so every legacy grant kept working and the corrected
+      // disclosure was cosmetic for exactly the population it was written for
+      // (ox-alpha and GLM 5.3, post-ship panel). A null/missing version counts
+      // as stale — those records are the most likely to predate the fix.
+      if (!isConsentVersionCurrent(profile.consentVersion)) {
+        return res.status(403).json({
+          success: false,
+          message: 'Our description of how Swan Coach uses your data has been corrected. '
+            + 'Please review the updated disclosure and confirm to continue.',
+          code: 'AI_CONSENT_STALE_VERSION',
+          storedVersion: profile.consentVersion ?? null,
+          requiredVersion: CURRENT_CONSENT_VERSION,
+        });
+      }
+
       // Attach profile to request for downstream use
       req.aiConsentProfile = profile;
       next();
diff --git a/backend/services/deIdentificationService.mjs b/backend/services/deIdentificationService.mjs
index 05890f6af..fd6275489 100644
--- a/backend/services/deIdentificationService.mjs
+++ b/backend/services/deIdentificationService.mjs
@@ -112,6 +112,14 @@ export const TRAINING_SAFETY_PATHS = Object.freeze([
  */
 export const GATED_FIELDS_REQUIRE_CONSENT_VERSION = '3.0';
 
+/**
+ * Remembers the last mismatching value we warned about, so a misconfiguration
+ * logs once rather than once per request — but a CHANGED value warns again.
+ * A boolean would have silenced the second, different misconfiguration, which
+ * is the one an operator most needs to see.
+ */
+let lastWarnedConsentVersion = null;
+
 /**
  * Escape hatch for the gated categories — deliberately hard to open.
  *
@@ -134,13 +142,19 @@ export function areGatedHealthFieldsEnabled() {
 
   const declared = String(process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION || '').trim();
   if (declared !== GATED_FIELDS_REQUIRE_CONSENT_VERSION) {
-    logger.error(
+    // Log ONCE per process, not once per deIdentify call. A misconfigured flag
+    // would otherwise emit an error line on every Coach request and bury the
+    // signal it exists to raise (ox-alpha, post-ship panel).
+    if (lastWarnedConsentVersion !== declared) {
+      lastWarnedConsentVersion = declared;
+      logger.error(
       '[DeIdentification] COACH_HEALTH_FIELDS_ENABLED is set but the declared consent '
       + 'version does not match the version this build requires. Gated health fields '
       + 'remain WITHHELD. Ship the new disclosure, then set '
       + 'COACH_HEALTH_FIELDS_CONSENT_VERSION to the required value.',
-      { required: GATED_FIELDS_REQUIRE_CONSENT_VERSION, declared: declared || '(unset)' },
-    );
+        { required: GATED_FIELDS_REQUIRE_CONSENT_VERSION, declared: declared || '(unset)' },
+      );
+    }
     return false;
   }
   return true;
@@ -266,8 +280,54 @@ export function hashPayload(payload) {
  * TRAINING-SAFETY OVERRIDE: injuries, pain, measurements and medical conditions
  * are never gated no matter where they appear — see TRAINING_SAFETY_PATHS.
  */
-const GATED_KEY_PATTERN = /(sleep|stress|supplement)/i;
-const SAFETY_KEY_PATTERN = /(injur|pain|measurement|condition)/i;
+/**
+ * A key is gated only when it is RECOGNISABLY A LIFESTYLE METRIC — the gated
+ * concept, optionally followed by a measurement word.
+ *
+ * This default is inverted on purpose, and it is the most important decision in
+ * this file. The first cut gated anything containing sleep/stress/supplement and
+ * exempted a list of clinical words. That stripped `stressFracture`,
+ * `sleepApnea` and `supplementalOxygenNeeded` — a tibial stress fracture,
+ * moderate apnea and an oxygen requirement, every one an exercise
+ * contraindication (GLM 5.3, post-ship panel). Widening the clinical exemption
+ * list then missed `stressEchocardiogram`, caught by our own test. Clinical
+ * vocabulary cannot be enumerated; that is the same trap that already produced
+ * three defects in this workstream.
+ *
+ * THE ASYMMETRY: over-gating removes what keeps programming safe and can hurt
+ * someone. Under-gating leaks a lifestyle metric, which the consent copy can
+ * disclose honestly. Those are not equivalent, so an unrecognised key is KEPT.
+ *
+ *   gated  — sleep, sleepHours, sleepQuality, sleepDebtHours, stress,
+ *            stressLevel, stressScore, supplements, supplementStack
+ *   kept   — stressFracture, sleepApnea, supplementalOxygenNeeded,
+ *            stressEchocardiogram, and any clinical term we never thought of
+ */
+const GATED_CONCEPT = /^(sleep|stress|supplement)/i;
+const METRIC_SUFFIX = /^(s|es)?$|(hour|hr|quality|level|score|rating|debt|duration|minute|night|intake|taken|stack|count|avg|average|per)/i;
+
+/** Last path segment of every protected path, so the exported list is LOAD-BEARING. */
+const SAFETY_KEY_NAMES = new Set(
+  TRAINING_SAFETY_PATHS.map((p) => p.split('.').pop().toLowerCase()),
+);
+
+/**
+ * True when this key is a gated lifestyle metric.
+ *
+ * TRAINING_SAFETY_PATHS is consulted here by name. That export previously
+ * described itself as the protective list and was asserted by a test, while the
+ * stripper decided purely on a regex and never read it — so the documented
+ * procedure ("add a path here to protect it") changed nothing. It is now
+ * actually consulted, which is the difference between a comment and a control.
+ */
+function isGatedLifestyleKey(key) {
+  const name = String(key);
+  if (SAFETY_KEY_NAMES.has(name.toLowerCase())) return false;
+  const m = name.match(GATED_CONCEPT);
+  if (!m) return false;
+  const remainder = name.slice(m[0].length);
+  return METRIC_SUFFIX.test(remainder);
+}
 
 /**
  * Walk the payload and delete any key whose NAME matches a gated category.
@@ -279,7 +339,7 @@ function stripGatedHealthFields(node, strippedFields, prefix = '') {
   for (const key of Object.keys(node)) {
     const path = prefix ? `${prefix}.${key}` : key;
 
-    if (GATED_KEY_PATTERN.test(key) && !SAFETY_KEY_PATTERN.test(key)) {
+    if (isGatedLifestyleKey(key)) {
       delete node[key];
       strippedFields.push(path);
       logger.info('[DeIdentification] gated health field withheld', { field: path });
@@ -287,9 +347,29 @@ function stripGatedHealthFields(node, strippedFields, prefix = '') {
     }
 
     const value = node[key];
-    if (value && typeof value === 'object' && !Array.isArray(value)) {
-      stripGatedHealthFields(value, strippedFields, path);
+    if (!value || typeof value !== 'object') continue;
+
+    // Arrays MUST be walked. The first cut guarded with `!Array.isArray(value)`,
+    // which meant a payload like `recoveryLogs: [{ sleepHours, stressLevel }]`
+    // sailed straight through the gate while every consent surface said those
+    // fields were withheld. Found by the post-ship panel (ox-alpha) and
+    // reproduced before fixing.
+    //
+    // This is the THIRD appearance of one drift class in this workstream:
+    // an enumerated path list missed medicalConditions, then the category
+    // matcher missed array-nested keys. Each fix narrowed the hole without
+    // closing the shape. Recursing into every container closes it by shape
+    // rather than by enumeration.
+    if (Array.isArray(value)) {
+      value.forEach((item, i) => {
+        if (item && typeof item === 'object') {
+          stripGatedHealthFields(item, strippedFields, `${path}[${i}]`);
+        }
+      });
+      continue;
     }
+
+    stripGatedHealthFields(value, strippedFields, path);
   }
 }
 
diff --git a/backend/services/messagingAccessRepository.mjs b/backend/services/messagingAccessRepository.mjs
index df9a21734..f2be25463 100644
--- a/backend/services/messagingAccessRepository.mjs
+++ b/backend/services/messagingAccessRepository.mjs
@@ -21,9 +21,24 @@ import logger from '../utils/logger.mjs';
 /** Strict positive-integer coercion. Returns null for anything else. */
 export
 function toId(value) {
-  if (value === null || value === undefined) return null;
-  const n = Number.parseInt(String(value), 10);
-  return Number.isSafeInteger(n) && n > 0 ? n : null;
+  // Deliberately IDENTICAL to the messaging controller's toStrictPositiveInt
+  // (services/messagingGroupPolicy.mjs).
+  //
+  // The first cut used Number.parseInt, which is lenient: '900abc', '0900' and
+  // 900.9 all became 900, while the controller's strict test rejected them. A
+  // probe found four divergent inputs. That particular differential happened to
+  // fail safe — the gate authorized an id the controller then dropped — but a
+  // gate and the code it guards parsing their inputs differently is a latent
+  // bypass waiting for someone to relax the other side. GLM 5.3 flagged the
+  // class on the post-ship panel; the direction was the reverse of its guess,
+  // and the fix is the same either way: ONE parse rule, so "the id the gate
+  // approved" and "the id the controller acts on" cannot diverge.
+  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null;
+  if (typeof value !== 'string') return null;
+  const trimmed = value.trim();
+  if (!/^[1-9]\d*$/.test(trimmed)) return null;
+  const parsed = Number(trimmed);
+  return Number.isSafeInteger(parsed) ? parsed : null;
 }
 
 /**
@@ -97,3 +112,43 @@ export async function loadConversationMembers(conversationId, actorId) {
     return null;
   }
 }
+
+
+/**
+ * Is this actor allowed to write into this conversation under the RELATIONSHIP
+ * lane? Shared by the REST middleware and the websocket handler.
+ *
+ * WHY THIS EXISTS. The relationship lane shipped as Express middleware on
+ * messagingRoutes only. `socket/socket.mjs` is a complete second way to send a
+ * message and checked membership alone, so a free-tier client with an active
+ * assignment could be 403'd by REST on an old community thread and still write
+ * to it over the socket. Two post-ship reviewers (ox-alpha, GLM 5.3) flagged the
+ * socket path independently, and that file's OWN comment already says it:
+ * "Fixing only REST would have been a false fix — this socket handler is a
+ * complete second way to send." The lane fix reproduced the exact mistake the
+ * file warns about.
+ *
+ * Returns true when the write is permitted. FAIL-CLOSED: any lookup failure
+ * denies, matching the middleware.
+ *
+ * @param {{id:*, role?:string}} actor
+ * @param {number} conversationId
+ * @param {boolean} hasCommunityAccess  already-resolved entitlement
+ */
+export async function isRelationshipWriteAllowed(actor, conversationId, hasCommunityAccess) {
+  if (actor?.role === 'admin' || actor?.role === 'trainer') return true;
+  if (hasCommunityAccess) return true;
+
+  const actorId = toId(actor?.id);
+  if (!actorId) return false;
+
+  const counterparties = await loadAssignedCounterpartyIds(actorId);
+  if (!counterparties || counterparties.size === 0) return false;
+
+  const membership = await loadConversationMembers(conversationId, actorId);
+  if (membership === null) return false;
+  if (!membership.actorIsMember) return false;
+  if (membership.others.length === 0) return false;
+
+  return membership.others.every((id) => counterparties.has(id));
+}
diff --git a/backend/socket/socket.mjs b/backend/socket/socket.mjs
index b268dbc51..e6b25aefd 100644
--- a/backend/socket/socket.mjs
+++ b/backend/socket/socket.mjs
@@ -13,6 +13,9 @@ import { getIO as getManagedSocketIO } from './socketManager.mjs';
 import { getJwtSecret, isJwtSecretConfigurationError } from '../utils/jwtSecretGuard.mjs';
 import { canSendToConversation, BLOCKED_MESSAGE } from '../services/messaging/blockGuard.mjs';
 import { checkMessageRate, MESSAGE_RATE_LIMITED } from '../services/messaging/messageRateLimit.mjs';
+import { isRelationshipWriteAllowed } from '../services/messagingAccessRepository.mjs';
+import { resolveCurrentEntitlement, isGatingEnabled } from '../middleware/requireTier.mjs';
+import { meetsMinimumTier } from '../config/tierCatalog.mjs';
 
 const onlineUsers = new Map();
 const MAX_MESSAGE_LENGTH = 5000;
@@ -126,6 +129,25 @@ export const initializeSocket = () => {
           return;
         }
 
+        // Same RELATIONSHIP lane as the REST path. The lane shipped as Express
+        // middleware only, so a free-tier client with an active assignment was
+        // 403'd by REST on an old community thread and could still write to it
+        // here — exactly the failure this file's next comment warns about, and
+        // flagged independently by two post-ship reviewers.
+        let hasCommunityAccess = false;
+        try {
+          const entitlement = await resolveCurrentEntitlement({ user: socket.user });
+          hasCommunityAccess = meetsMinimumTier(entitlement.effectiveTier, 'elite');
+        } catch {
+          hasCommunityAccess = false; // fail closed, same as the middleware
+        }
+        if (!isGatingEnabled()) hasCommunityAccess = true;
+
+        if (!(await isRelationshipWriteAllowed(socket.user, normalizedConversationId, hasCommunityAccess))) {
+          socket.emit('error', { message: 'You can message your assigned trainer here.' });
+          return;
+        }
+
         // Same block check as the REST path. Fixing only REST would have been a
         // false fix — this socket handler is a complete second way to send.
         const blockCheck = await canSendToConversation(normalizedConversationId, socket.user.id);
diff --git a/backend/tests/api/aiPrivacy.test.mjs b/backend/tests/api/aiPrivacy.test.mjs
index e5fdc094b..1f896a75a 100644
--- a/backend/tests/api/aiPrivacy.test.mjs
+++ b/backend/tests/api/aiPrivacy.test.mjs
@@ -374,6 +374,7 @@ describe('De-Identification Service', () => {
 // ─── AI Consent Middleware Tests ─────────────────────────────────────────────
 
 import { aiKillSwitch, requireAiConsent } from '../../middleware/aiConsent.mjs';
+import { CURRENT_CONSENT_VERSION } from '../../config/consentVersion.mjs';
 
 const createMockReq = (overrides = {}) => ({
   user: { id: 3, role: 'client' },
@@ -493,7 +494,10 @@ describe('AI Consent Middleware', () => {
   });
 
   it('should call next() and attach profile when consent is active', async () => {
-    const profile = { aiEnabled: true, withdrawnAt: null };
+    // RE-ANCHORED 2026-08-22: 'active consent' now also requires a CURRENT
+    // version. Owner decision Q5 — a grant captured under the superseded v1.0
+    // disclosure no longer authorizes processing. Fixtures predate that rule.
+    const profile = { aiEnabled: true, withdrawnAt: null, consentVersion: CURRENT_CONSENT_VERSION };
     mockFindOne.mockResolvedValue(profile);
     const req = createMockReq({ body: { userId: 3 } });
     const res = createMockRes();
@@ -506,7 +510,10 @@ describe('AI Consent Middleware', () => {
   });
 
   it('should resolve targetUserId from req.user.id for client role', async () => {
-    const profile = { aiEnabled: true, withdrawnAt: null };
+    // RE-ANCHORED 2026-08-22: 'active consent' now also requires a CURRENT
+    // version. Owner decision Q5 — a grant captured under the superseded v1.0
+    // disclosure no longer authorizes processing. Fixtures predate that rule.
+    const profile = { aiEnabled: true, withdrawnAt: null, consentVersion: CURRENT_CONSENT_VERSION };
     mockFindOne.mockResolvedValue(profile);
     const req = createMockReq({ body: {} }); // no explicit userId
     const res = createMockRes();
@@ -528,6 +535,51 @@ describe('AI Consent Middleware', () => {
     expect(next).not.toHaveBeenCalled();
     expect(res.statusCode).toBe(401);
   });
+
+  describe('stale consent version — owner decision Q5', () => {
+    // Until this landed the gate checked aiEnabled and withdrawnAt and no
+    // version, so every v1.0 grant kept working and the corrected disclosure
+    // was cosmetic for exactly the users it was written for (ox-alpha, GLM 5.3,
+    // post-ship panel).
+    it('403s a grant captured under the superseded disclosure', async () => {
+      mockFindOne.mockResolvedValue({ aiEnabled: true, withdrawnAt: null, consentVersion: '1.0' });
+      const req = createMockReq({ body: { userId: 3 } });
+      const res = createMockRes();
+      const next = vi.fn();
+
+      await middleware(req, res, next);
+
+      expect(next).not.toHaveBeenCalled();
+      expect(res.statusCode).toBe(403);
+      expect(res.body.code).toBe('AI_CONSENT_STALE_VERSION');
+    });
+
+    it('403s a grant with NO stored version — legacy records are not exempt', async () => {
+      // Fail-open here would skip precisely the records most likely to predate
+      // the correction.
+      mockFindOne.mockResolvedValue({ aiEnabled: true, withdrawnAt: null, consentVersion: null });
+      const req = createMockReq({ body: { userId: 3 } });
+      const res = createMockRes();
+      const next = vi.fn();
+
+      await middleware(req, res, next);
+
+      expect(next).not.toHaveBeenCalled();
+      expect(res.statusCode).toBe(403);
+      expect(res.body.code).toBe('AI_CONSENT_STALE_VERSION');
+    });
+
+    it('tells the client which version it needs, so the UI can prompt precisely', async () => {
+      mockFindOne.mockResolvedValue({ aiEnabled: true, withdrawnAt: null, consentVersion: '1.0' });
+      const req = createMockReq({ body: { userId: 3 } });
+      const res = createMockRes();
+
+      await middleware(req, res, vi.fn());
+
+      expect(res.body.requiredVersion).toBe(CURRENT_CONSENT_VERSION);
+      expect(res.body.storedVersion).toBe('1.0');
+    });
+  });
 });
 
 // ─── Integration: Provider payload must be de-identified ─────────────────────
@@ -592,4 +644,5 @@ describe('Provider Payload Safety', () => {
     expect(serialized).toContain('weight_loss');
     expect(serialized).toContain('squats');
   });
+
 });
diff --git a/backend/tests/api/messagingListScopeNarrowing.test.mjs b/backend/tests/api/messagingListScopeNarrowing.test.mjs
index 912b78fcb..a2256f8f8 100644
--- a/backend/tests/api/messagingListScopeNarrowing.test.mjs
+++ b/backend/tests/api/messagingListScopeNarrowing.test.mjs
@@ -49,6 +49,12 @@ const thread = (id, otherIds) => ({
   participants: [{ id: VIEWER }, ...otherIds.map((uid) => ({ id: uid }))],
 });
 
+/** A thread whose other member is staff, e.g. the auto-created admin channel. */
+const staffThread = (id, staffId, role = 'admin') => ({
+  id,
+  participants: [{ id: VIEWER }, { id: staffId, role }],
+});
+
 function res() {
   const r = { statusCode: 200, body: null };
   r.status = (code) => { r.statusCode = code; return r; };
@@ -102,3 +108,45 @@ describe('relationship-only list narrowing', () => {
     expect(r.body.map((c) => c.id)).toEqual([1, 2]);
   });
 });
+
+describe('staff threads stay visible to relationship-only viewers', () => {
+  // ensureAdminConversation creates a direct admin support thread for every
+  // viewer. The admin is not a training counterparty, so narrowing on
+  // assignments alone hid a channel the system had just created for them
+  // (GLM 5.3, post-ship panel). The lane hides COMMUNITY threads, not staff.
+  it('keeps the auto-created admin support thread', async () => {
+    getConversationsForViewerMock.mockResolvedValue([
+      staffThread(9, 1, 'admin'),
+      thread(2, [STRANGER]),
+    ]);
+    const r = res();
+    await getConversations(
+      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
+      r,
+    );
+    expect(r.body.map((c) => c.id)).toEqual([9]);
+  });
+
+  it('keeps a trainer-role thread even when that trainer is not an assigned counterparty', async () => {
+    getConversationsForViewerMock.mockResolvedValue([staffThread(11, 950, 'trainer')]);
+    const r = res();
+    await getConversations(
+      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
+      r,
+    );
+    expect(r.body.map((c) => c.id)).toEqual([11]);
+  });
+
+  it('still hides a thread mixing staff with a stranger', async () => {
+    getConversationsForViewerMock.mockResolvedValue([{
+      id: 12,
+      participants: [{ id: VIEWER }, { id: 1, role: 'admin' }, { id: STRANGER, role: 'client' }],
+    }]);
+    const r = res();
+    await getConversations(
+      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
+      r,
+    );
+    expect(r.body).toHaveLength(0);
+  });
+});
diff --git a/backend/tests/api/messagingParticipantEscalation.test.mjs b/backend/tests/api/messagingParticipantEscalation.test.mjs
index d12dbf84d..ec74a09dd 100644
--- a/backend/tests/api/messagingParticipantEscalation.test.mjs
+++ b/backend/tests/api/messagingParticipantEscalation.test.mjs
@@ -163,3 +163,35 @@ describe('P0 — participants being ADDED are validated, not just existing membe
     expect(res.status).toBe(200);
   });
 });
+
+describe('adminIds is validated in BOTH scopes, not just conversation', () => {
+  // Qwen 3.8 (post-ship panel) read the create scope as validating only
+  // participantIds — the manual extraction above the check is for the empty-body
+  // 400, and the authorization itself delegates to the shared helper. Disproven
+  // by reading, then pinned here so it can never become true.
+  beforeEach(() => {
+    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+  });
+
+  it('403s creating a thread that smuggles a stranger in via adminIds', async () => {
+    mockSql({ counterparties: [TRAINER_ID] });
+    const res = await request(appWith(freeClient, 'create'))
+      .post('/conversations').send({ participantIds: [TRAINER_ID], adminIds: [STRANGER_ID] });
+    expect(res.status).toBe(403);
+    expect(res.body.code).toBe('OUTSIDE_COACHING_RELATIONSHIP');
+  });
+
+  it('403s adding a stranger as admin to an existing trainer thread', async () => {
+    mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, TRAINER_ID] });
+    const res = await request(appWith(freeClient, 'addParticipants'))
+      .post('/conversations/42/participants').send({ participantIds: [TRAINER_ID], adminIds: [STRANGER_ID] });
+    expect(res.status).toBe(403);
+  });
+
+  it('allows adminIds when every id is an assigned counterparty', async () => {
+    mockSql({ counterparties: [TRAINER_ID] });
+    const res = await request(appWith(freeClient, 'create'))
+      .post('/conversations').send({ participantIds: [TRAINER_ID], adminIds: [TRAINER_ID] });
+    expect(res.status).toBe(200);
+  });
+});
diff --git a/backend/tests/api/messagingSocketRelationshipLane.test.mjs b/backend/tests/api/messagingSocketRelationshipLane.test.mjs
new file mode 100644
index 000000000..88de6302c
--- /dev/null
+++ b/backend/tests/api/messagingSocketRelationshipLane.test.mjs
@@ -0,0 +1,108 @@
+/**
+ * Wave 1 — the relationship lane applies to the SOCKET path too
+ * ============================================================
+ * The lane shipped as Express middleware on messagingRoutes only.
+ * `socket/socket.mjs` is a complete second way to send a message and checked
+ * membership alone, so a free-tier client with an active assignment was 403'd
+ * by REST on an old community thread and could still write to it over the
+ * websocket.
+ *
+ * Two post-ship reviewers (ox-alpha, GLM 5.3) flagged the socket path
+ * independently. That file's OWN comment already stated the principle —
+ * "Fixing only REST would have been a false fix" — about the block check and
+ * rate limiter. The lane reproduced the exact mistake the file warns about.
+ *
+ * These tests pin the shared check both paths now call.
+ */
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+
+const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
+
+vi.mock('../../database.mjs', () => ({ default: { query: queryMock } }));
+vi.mock('../../utils/logger.mjs', () => ({
+  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
+}));
+
+const { isRelationshipWriteAllowed } = await import('../../services/messagingAccessRepository.mjs');
+
+const CLIENT = 501;
+const TRAINER = 900;
+const STRANGER = 777;
+
+function mockSql({ counterparties = [], participants = [], throwOn = null } = {}) {
+  queryMock.mockImplementation(async (sql) => {
+    if (sql.includes('client_trainer_assignments')) {
+      if (throwOn === 'assignments') throw new Error('db down');
+      return counterparties.map((c) => ({ counterparty: c }));
+    }
+    if (sql.includes('conversation_participants')) {
+      if (throwOn === 'participants') throw new Error('db down');
+      return participants.map((u) => ({ userId: u }));
+    }
+    return [];
+  });
+}
+
+const freeClient = { id: String(CLIENT), role: 'client' };
+
+beforeEach(() => vi.clearAllMocks());
+
+describe('isRelationshipWriteAllowed — the socket/REST shared seam', () => {
+  it('allows writing to the assigned trainer thread on a free tier', async () => {
+    mockSql({ counterparties: [TRAINER], participants: [CLIENT, TRAINER] });
+    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(true);
+  });
+
+  it('BLOCKS writing to a legacy community thread the client still sits in', async () => {
+    // The exact bypass: membership alone used to be enough over the socket.
+    mockSql({ counterparties: [TRAINER], participants: [CLIENT, STRANGER] });
+    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
+  });
+
+  it('blocks a thread mixing the trainer with a stranger', async () => {
+    mockSql({ counterparties: [TRAINER], participants: [CLIENT, TRAINER, STRANGER] });
+    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
+  });
+
+  it('blocks a thread the actor is not a member of', async () => {
+    mockSql({ counterparties: [TRAINER], participants: [TRAINER] });
+    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
+  });
+
+  it('allows anything for a community-entitled sender, without touching the DB', async () => {
+    mockSql({ counterparties: [] });
+    await expect(isRelationshipWriteAllowed(freeClient, 42, true)).resolves.toBe(true);
+    expect(queryMock).not.toHaveBeenCalled();
+  });
+
+  it('allows staff without touching the DB', async () => {
+    await expect(isRelationshipWriteAllowed({ id: '900', role: 'trainer' }, 42, false)).resolves.toBe(true);
+    expect(queryMock).not.toHaveBeenCalled();
+  });
+
+  it('denies a client with no assignment at all', async () => {
+    mockSql({ counterparties: [], participants: [CLIENT, TRAINER] });
+    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
+  });
+
+  it('fails CLOSED when the assignment lookup throws', async () => {
+    mockSql({ throwOn: 'assignments' });
+    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
+  });
+
+  it('fails CLOSED when the participant lookup throws', async () => {
+    mockSql({ counterparties: [TRAINER], throwOn: 'participants' });
+    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(false);
+  });
+
+  it('matches string-shaped ids from either side', async () => {
+    queryMock.mockImplementation(async (sql) => {
+      if (sql.includes('client_trainer_assignments')) return [{ counterparty: String(TRAINER) }];
+      if (sql.includes('conversation_participants')) {
+        return [{ userId: String(CLIENT) }, { userId: String(TRAINER) }];
+      }
+      return [];
+    });
+    await expect(isRelationshipWriteAllowed(freeClient, 42, false)).resolves.toBe(true);
+  });
+});
diff --git a/backend/tests/unit/consentVersionCoupling.test.mjs b/backend/tests/unit/consentVersionCoupling.test.mjs
new file mode 100644
index 000000000..cbd82be43
--- /dev/null
+++ b/backend/tests/unit/consentVersionCoupling.test.mjs
@@ -0,0 +1,61 @@
+/**
+ * The frontend and backend consent versions MUST move together
+ * ============================================================
+ * GLM 5.3, post-ship panel: the code demanded that
+ * frontend/src/content/aiConsentCopy.ts and the backend constant "MUST be
+ * bumped together" — in a COMMENT, with no test enforcing it. The exact drift
+ * it guards against was one forgetful PR away, and this workstream has already
+ * produced four defects of precisely that shape.
+ *
+ * This is the control the comment was standing in for.
+ */
+import { describe, expect, it } from 'vitest';
+import { readFileSync } from 'node:fs';
+import { resolve } from 'node:path';
+import {
+  CURRENT_CONSENT_VERSION,
+  VALID_CONSENT_VERSIONS,
+  isConsentVersionCurrent,
+} from '../../config/consentVersion.mjs';
+
+const frontendCopy = readFileSync(
+  resolve(process.cwd(), '../frontend/src/content/aiConsentCopy.ts'),
+  'utf8',
+);
+
+describe('consent version coupling', () => {
+  it('frontend AI_CONSENT_VERSION equals the backend CURRENT_CONSENT_VERSION', () => {
+    const m = frontendCopy.match(/AI_CONSENT_VERSION\s*=\s*'([^']+)'/);
+    expect(m, 'AI_CONSENT_VERSION not found in aiConsentCopy.ts').toBeTruthy();
+    expect(m[1]).toBe(CURRENT_CONSENT_VERSION);
+  });
+
+  it('the current version is accepted on a grant', () => {
+    expect(VALID_CONSENT_VERSIONS).toContain(CURRENT_CONSENT_VERSION);
+  });
+
+  it('a superseded version is still ACCEPTED as a record but is not CURRENT', () => {
+    // Historical grants remain readable; they simply no longer authorize.
+    expect(VALID_CONSENT_VERSIONS).toContain('1.0');
+    expect(isConsentVersionCurrent('1.0')).toBe(false);
+  });
+
+  it('a missing version counts as stale, not as current', () => {
+    // Fail-open here would exempt exactly the legacy records that need the prompt.
+    expect(isConsentVersionCurrent(null)).toBe(false);
+    expect(isConsentVersionCurrent(undefined)).toBe(false);
+    expect(isConsentVersionCurrent('')).toBe(false);
+  });
+
+  it('the current version is current', () => {
+    expect(isConsentVersionCurrent(CURRENT_CONSENT_VERSION)).toBe(true);
+  });
+
+  it('enabling gated health fields requires a version NEWER than the one shipping', async () => {
+    // Cross-file invariant: the health-field escape hatch must not be openable
+    // under the disclosure users have already seen.
+    const { GATED_FIELDS_REQUIRE_CONSENT_VERSION } =
+      await import('../../services/deIdentificationService.mjs');
+    expect(GATED_FIELDS_REQUIRE_CONSENT_VERSION).not.toBe(CURRENT_CONSENT_VERSION);
+  });
+});
diff --git a/backend/tests/unit/deIdentifierGatedHealthFields.test.mjs b/backend/tests/unit/deIdentifierGatedHealthFields.test.mjs
index b1456bc53..5cf4fde83 100644
--- a/backend/tests/unit/deIdentifierGatedHealthFields.test.mjs
+++ b/backend/tests/unit/deIdentifierGatedHealthFields.test.mjs
@@ -113,32 +113,6 @@ describe('gated non-training health fields', () => {
   });
 });
 
-describe('training-safety data is NOT gated', () => {
-  it('keeps injuries, pain and measurements with the gate active', () => {
-    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });
-
-    expect(deIdentified.painAndInjuries).toEqual([
-      { area: 'left knee', severity: 7, note: 'post-surgical' },
-    ]);
-    expect(deIdentified.health.injuries).toEqual(['left knee']);
-    expect(deIdentified.health.currentPain).toBe(7);
-    expect(deIdentified.measurements).toEqual({ weightKg: 82, bodyFatPct: 18 });
-    // Safety-critical: asthma/cardiac/diabetes change what can be programmed.
-    expect(deIdentified.health.conditions).toEqual(['hypertension']);
-  });
-
-  it('declares the protected paths so a future edit has to argue with the list', () => {
-    expect(TRAINING_SAFETY_PATHS).toContain('painAndInjuries');
-    expect(TRAINING_SAFETY_PATHS).toContain('health.injuries');
-    expect(TRAINING_SAFETY_PATHS).toContain('health.currentPain');
-    expect(TRAINING_SAFETY_PATHS).toContain('measurements');
-    // Added after the dry loop caught the first cut stripping them.
-    expect(TRAINING_SAFETY_PATHS).toContain('health.medicalConditions');
-    expect(TRAINING_SAFETY_PATHS).toContain('health.conditions');
-    expect(Object.isFrozen(TRAINING_SAFETY_PATHS)).toBe(true);
-  });
-});
-
 describe('pre-existing protections still hold', () => {
   it('still strips direct identifiers, medications and surgeries', () => {
     const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });
@@ -234,7 +208,11 @@ describe('the escape hatch is a control, not a caution', () => {
 
   it('logs critical rather than failing silently', () => {
     process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
-    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = '2.0';
+    // A value unique to this test: the warning is deduped per declared value,
+    // so reusing '2.0' here would assert against a warning an earlier test
+    // already consumed.
+    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = 'wrong-log-probe';
+    logger.error.mockClear();
     areGatedHealthFieldsEnabled();
     expect(logger.error).toHaveBeenCalled();
   });
diff --git a/backend/tests/unit/deIdentifierTrainingSafety.test.mjs b/backend/tests/unit/deIdentifierTrainingSafety.test.mjs
new file mode 100644
index 000000000..f3970225b
--- /dev/null
+++ b/backend/tests/unit/deIdentifierTrainingSafety.test.mjs
@@ -0,0 +1,237 @@
+/**
+ * Training-safety data must survive the health gate
+ * =================================================
+ * Split out of deIdentifierGatedHealthFields.test.mjs on 2026-08-22 to stay
+ * under the 300-line cap. Same fixtures and mocks; this half owns the direction
+ * that can HURT someone if it regresses — over-gating removes the inputs that
+ * keep programming safe, while the other half owns under-gating, which leaks a
+ * lifestyle metric the consent copy can disclose honestly. Those are not
+ * equivalent, which is why they now live apart.
+ *
+ * Original context
+ * ----------------
+ * `deIdentify` is a DENYLIST: it strips known direct identifiers and regex-
+ * redacts email/phone shapes, then forwards everything else the caller packed
+ * into the payload. That meant sensitive non-training health data reached the
+ * Swan Coach provider simply by being present.
+ *
+ * Owner decision Q2 (2026-08-22): health fields stay off until counsel signs
+ * off. Owner decision, same day: SPLIT the set rather than deny it wholesale.
+ *
+ *   DENIED by default  — supplements, sleep, stress
+ *   NEVER denied       — injuries, pain, measurements, medical conditions
+ *                        (training safety: without them Coach cannot avoid a
+ *                        contraindicated movement)
+ *
+ * Medical conditions moved to the protected side on 2026-08-22, during the dry
+ * loop. The first cut of this gate denied them, which broke an assertion in
+ * aiPrivacy.test.mjs that had already labelled them "safety-critical" with a
+ * `mild asthma` fixture. That test was right: asthma, cardiac conditions and
+ * diabetes change what can be safely programmed. Gating them was the same
+ * mistake as gating injuries would have been.
+ *
+ * These tests pin BOTH halves. The second half matters most: a future edit that
+ * "tightens privacy" by adding injuries or conditions to the gated list would
+ * silently make Swan Coach unsafe, and must fail here instead.
+ */
+import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
+
+vi.mock('../../utils/logger.mjs', () => ({
+  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
+}));
+
+const { deIdentify, TRAINING_SAFETY_PATHS, areGatedHealthFieldsEnabled,
+  GATED_FIELDS_REQUIRE_CONSENT_VERSION } =
+  await import('../../services/deIdentificationService.mjs');
+const logger = (await import('../../utils/logger.mjs')).default;
+
+/** A payload shaped like what contextBuilder assembles for a real client. */
+function fullClientPayload() {
+  return {
+    client: {
+      id: 501,
+      name: 'Real Name',
+      contact: { email: 'real@example.com', phone: '555-123-4567' },
+      goals: ['build lower-body strength'],
+    },
+    training: { level: 'intermediate', daysPerWeek: 3 },
+    measurements: { weightKg: 82, bodyFatPct: 18 },
+    painAndInjuries: [{ area: 'left knee', severity: 7, note: 'post-surgical' }],
+    health: {
+      injuries: ['left knee'],
+      currentPain: 7,
+      conditions: ['hypertension'],
+      medications: ['lisinopril'],
+      surgeries: ['ACL repair 2019'],
+      supplements: ['creatine'],
+      sleep: { hoursPerNight: 5 },
+      stress: 'high',
+    },
+    lifestyle: { occupation: 'nurse', stressLevel: 8, sleepQuality: 'poor' },
+  };
+}
+
+const ORIGINAL_FLAG = process.env.COACH_HEALTH_FIELDS_ENABLED;
+
+beforeEach(() => {
+  vi.clearAllMocks();
+  delete process.env.COACH_HEALTH_FIELDS_ENABLED;
+  delete process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION;
+});
+
+afterEach(() => {
+  if (ORIGINAL_FLAG === undefined) delete process.env.COACH_HEALTH_FIELDS_ENABLED;
+  else process.env.COACH_HEALTH_FIELDS_ENABLED = ORIGINAL_FLAG;
+});
+
+describe('training-safety data is NOT gated', () => {
+  it('keeps injuries, pain and measurements with the gate active', () => {
+    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });
+
+    expect(deIdentified.painAndInjuries).toEqual([
+      { area: 'left knee', severity: 7, note: 'post-surgical' },
+    ]);
+    expect(deIdentified.health.injuries).toEqual(['left knee']);
+    expect(deIdentified.health.currentPain).toBe(7);
+    expect(deIdentified.measurements).toEqual({ weightKg: 82, bodyFatPct: 18 });
+    // Safety-critical: asthma/cardiac/diabetes change what can be programmed.
+    expect(deIdentified.health.conditions).toEqual(['hypertension']);
+  });
+
+  it('declares the protected paths so a future edit has to argue with the list', () => {
+    expect(TRAINING_SAFETY_PATHS).toContain('painAndInjuries');
+    expect(TRAINING_SAFETY_PATHS).toContain('health.injuries');
+    expect(TRAINING_SAFETY_PATHS).toContain('health.currentPain');
+    expect(TRAINING_SAFETY_PATHS).toContain('measurements');
+    // Added after the dry loop caught the first cut stripping them.
+    expect(TRAINING_SAFETY_PATHS).toContain('health.medicalConditions');
+    expect(TRAINING_SAFETY_PATHS).toContain('health.conditions');
+    expect(Object.isFrozen(TRAINING_SAFETY_PATHS)).toBe(true);
+  });
+});
+
+describe('arrays are walked — the third appearance of one drift class', () => {
+  // Post-ship panel (ox-alpha) found the category matcher guarded recursion with
+  // `!Array.isArray(value)`, so array-nested keys sailed through while every
+  // consent surface said they were withheld. Reproduced live before fixing.
+  //
+  // Sequence worth remembering: an enumerated PATH list missed medicalConditions;
+  // the category matcher that replaced it missed ARRAY-nested keys. Each fix
+  // narrowed the hole without closing the SHAPE. These tests pin the shape.
+  it('strips gated keys nested inside arrays of objects', () => {
+    const { deIdentified } = deIdentify({
+      client: { id: 501, goals: ['x'] },
+      training: { level: 'intermediate' },
+      recoveryLogs: [{ date: '2026-08-01', sleepHours: 5, stressLevel: 8 }],
+      weeklyCheckins: [{ supplements: ['creatine'], sleepQuality: 'poor' }],
+    }, { clientId: 501 });
+
+    expect(deIdentified.recoveryLogs[0].sleepHours).toBeUndefined();
+    expect(deIdentified.recoveryLogs[0].stressLevel).toBeUndefined();
+    expect(deIdentified.weeklyCheckins[0].supplements).toBeUndefined();
+    expect(deIdentified.weeklyCheckins[0].sleepQuality).toBeUndefined();
+    // Non-gated siblings inside the same array element survive.
+    expect(deIdentified.recoveryLogs[0].date).toBe('2026-08-01');
+  });
+
+  it('strips through arrays nested inside arrays', () => {
+    const { deIdentified } = deIdentify({
+      client: { id: 501, goals: ['x'] },
+      training: { level: 'intermediate' },
+      blocks: [{ weeks: [{ sleepDebtHours: 12, notes: 'keep' }] }],
+    }, { clientId: 501 });
+
+    expect(deIdentified.blocks[0].weeks[0].sleepDebtHours).toBeUndefined();
+    expect(deIdentified.blocks[0].weeks[0].notes).toBe('keep');
+  });
+
+  it('records the array path in strippedFields so the audit trail is precise', () => {
+    const { strippedFields } = deIdentify({
+      client: { id: 501, goals: ['x'] },
+      training: { level: 'intermediate' },
+      recoveryLogs: [{ sleepHours: 5 }],
+    }, { clientId: 501 });
+
+    expect(strippedFields).toContain('recoveryLogs[0].sleepHours');
+  });
+
+  it('never strips training-safety data out of arrays', () => {
+    const { deIdentified } = deIdentify({
+      client: { id: 501, goals: ['x'] },
+      training: { level: 'intermediate' },
+      painAndInjuries: [{ area: 'left knee', severity: 7 }],
+      history: [{ injuries: ['ACL'], conditions: ['asthma'] }],
+    }, { clientId: 501 });
+
+    expect(deIdentified.painAndInjuries[0]).toEqual({ area: 'left knee', severity: 7 });
+    expect(deIdentified.history[0].injuries).toEqual(['ACL']);
+    expect(deIdentified.history[0].conditions).toEqual(['asthma']);
+  });
+
+  it('warns once per process about a consent-version mismatch, not once per call', () => {
+    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
+    // A distinct value, so this exercises the once-per-VALUE guard rather than
+    // inheriting a warning another test already emitted.
+    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = 'wrong-flood-probe';
+    logger.error.mockClear();
+    areGatedHealthFieldsEnabled();
+    areGatedHealthFieldsEnabled();
+    areGatedHealthFieldsEnabled();
+    expect(logger.error.mock.calls.length).toBeLessThanOrEqual(1);
+  });
+});
+
+describe('clinical terms survive the category matcher', () => {
+  // GLM 5.3 (post-ship panel): the matcher gated any key containing
+  // sleep/stress/supplement, so `stressFracture`, `sleepApnea` and
+  // `supplementalOxygenNeeded` were stripped — a tibial stress fracture,
+  // moderate apnea and an oxygen requirement removed from what Coach can see.
+  // All three are exercise contraindications. Reproduced before fixing.
+  //
+  // The asymmetry these tests defend: over-gating can hurt someone,
+  // under-gating leaks a lifestyle metric. Ambiguity resolves toward KEEPING.
+  const clinical = {
+    stressFracture: 'left tibia 2024',
+    sleepApnea: 'moderate, uses CPAP',
+    supplementalOxygenNeeded: true,
+    stressEchocardiogram: 'normal',
+    sleepDisorderDiagnosis: 'insomnia',
+  };
+
+  it('keeps clinical keys even though they contain gated tokens', () => {
+    const { deIdentified } = deIdentify({
+      client: { id: 501, goals: ['x'] }, training: { level: 'i' }, health: { ...clinical },
+    }, { clientId: 501 });
+
+    for (const [key, value] of Object.entries(clinical)) {
+      expect(deIdentified.health[key]).toEqual(value);
+    }
+  });
+
+  it('still gates the lifestyle metrics in the same payload', () => {
+    const { deIdentified } = deIdentify({
+      client: { id: 501, goals: ['x'] }, training: { level: 'i' },
+      health: { ...clinical, sleepHours: 5, stressLevel: 8, supplements: ['creatine'] },
+    }, { clientId: 501 });
+
+    expect(deIdentified.health.sleepHours).toBeUndefined();
+    expect(deIdentified.health.stressLevel).toBeUndefined();
+    expect(deIdentified.health.supplements).toBeUndefined();
+    expect(deIdentified.health.stressFracture).toBe('left tibia 2024');
+  });
+
+  it('TRAINING_SAFETY_PATHS is LOAD-BEARING, not decorative', () => {
+    // It previously described itself as the protective list, was asserted by a
+    // test, and was never read by the stripper. Adding a path did nothing. This
+    // proves the list is actually consulted: every protected leaf name survives
+    // even when it also matches a gated token.
+    for (const path of TRAINING_SAFETY_PATHS) {
+      const leaf = path.split('.').pop();
+      const { deIdentified } = deIdentify({
+        client: { id: 501, goals: ['x'] }, training: { level: 'i' },
+        health: { [leaf]: 'protected-value' },
+      }, { clientId: 501 });
+      expect(deIdentified.health[leaf]).toBe('protected-value');
+    }
+  });
+});
diff --git a/frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx b/frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx
index 23138c6fe..605fcfaa2 100644
--- a/frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx
+++ b/frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx
@@ -522,10 +522,14 @@ const AiConsentScreen: React.FC = () => {
   // Owner decision Q5: v1.0 consents were captured under a description that
   // overstated anonymity, so they are re-prompted rather than silently carried
   // forward. Detection is a version comparison against the stored grant.
+  // A missing stored version must COUNT as stale, not skip the prompt. The first
+  // cut required a truthy consentVersion, which meant legacy records with a null
+  // version — the ones most likely to predate the corrected disclosure — silently
+  // skipped re-consent. Fail-open on precisely the wrong population (ox-alpha,
+  // post-ship panel).
   const needsReconsent =
     consentState === 'granted'
-    && !!status?.profile?.consentVersion
-    && status.profile.consentVersion !== AI_CONSENT_VERSION;
+    && (status?.profile?.consentVersion ?? null) !== AI_CONSENT_VERSION;
 
   const formatDate = (dateStr: string | null | undefined): string => {
     if (!dateStr) return '—';
diff --git a/frontend/src/content/aiConsentCopy.contract.test.ts b/frontend/src/content/aiConsentCopy.contract.test.ts
new file mode 100644
index 000000000..b1b61db03
--- /dev/null
+++ b/frontend/src/content/aiConsentCopy.contract.test.ts
@@ -0,0 +1,83 @@
+/**
+ * The inline consent bullets must agree with the shared copy module
+ * =================================================================
+ * The module's own docblock claimed "a test asserts the inline bullets stay
+ * consistent with it." That test did not exist — a speculative-success claim
+ * written INTO the file whose entire purpose is removing inaccurate claims
+ * (caught by Grok 4.6, post-ship panel).
+ *
+ * This is that test. It does not force the components to render from
+ * AI_CONSENT_PROTECTIONS — each styles its bullets differently — but it does
+ * make the constant load-bearing: if the shared copy and the inline bullets
+ * disagree about what is withheld or shared, this fails.
+ */
+import { describe, expect, it } from 'vitest';
+import { readFileSync } from 'node:fs';
+import { resolve } from 'node:path';
+import {
+  AI_CONSENT_PROTECTIONS,
+  AI_CONSENT_DISCLOSURE,
+  AI_CONSENT_VERSION,
+} from './aiConsentCopy';
+
+const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');
+const consentScreen = read('../components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx');
+const onboardingSection = read('../pages/onboarding/components/ConsentSection.tsx');
+const surfaces = [
+  ['AiConsentScreen', consentScreen],
+  ['ConsentSection', onboardingSection],
+] as const;
+
+/** Categories the code withholds. Must never be described as shared. */
+const WITHHELD = ['supplement', 'sleep', 'stress'];
+/** Categories the code forwards. Must never be described as removed. */
+const SHARED = ['injury', 'medical condition'];
+
+describe('consent copy contract', () => {
+  it('the shared module names every withheld category', () => {
+    const removedBullet = AI_CONSENT_PROTECTIONS.find((p) => p.key === 'removed');
+    expect(removedBullet).toBeTruthy();
+    for (const term of WITHHELD) {
+      expect(removedBullet!.body.toLowerCase()).toContain(term);
+    }
+  });
+
+  it('the long-form disclosure agrees with the bullets on what is withheld', () => {
+    // The prior defect in this artifact was an adjacent-sentence contradiction.
+    for (const term of WITHHELD) {
+      expect(AI_CONSENT_DISCLOSURE.toLowerCase()).toContain(term);
+    }
+  });
+
+  it('the disclosure names what IS shared, including the safety data', () => {
+    for (const term of SHARED) {
+      expect(AI_CONSENT_DISCLOSURE.toLowerCase()).toContain(term);
+    }
+  });
+
+  it.each(surfaces)('%s never claims anonymity', (_name, source) => {
+    // The exact wording class this whole wave existed to remove.
+    expect(source).not.toMatch(/stay anonymous/i);
+    expect(source).not.toMatch(/identity is hidden/i);
+    expect(source).not.toMatch(/no way to identify/i);
+    expect(source).not.toMatch(/anonymous client ID/i);
+  });
+
+  it.each(surfaces)('%s describes the withheld categories as withheld', (_name, source) => {
+    const lower = source.toLowerCase();
+    for (const term of WITHHELD) {
+      expect(lower).toContain(term);
+    }
+  });
+
+  it.each(surfaces)('%s renders the version from the shared module, not a literal', (_name, source) => {
+    // A hardcoded "Consent Version 1.0" under a v2.0 heading is exactly how the
+    // previous contradiction shipped.
+    expect(source).toContain('AI_CONSENT_VERSION');
+    expect(source).not.toMatch(/Consent Version \d+\.\d+/);
+  });
+
+  it('the version is a plain semver-ish string the backend can compare', () => {
+    expect(AI_CONSENT_VERSION).toMatch(/^\d+\.\d+$/);
+  });
+});
diff --git a/frontend/src/content/aiConsentCopy.ts b/frontend/src/content/aiConsentCopy.ts
index 0888319aa..e93845b68 100644
--- a/frontend/src/content/aiConsentCopy.ts
+++ b/frontend/src/content/aiConsentCopy.ts
@@ -135,7 +135,8 @@ export const AI_CONSENT_DISCLOSURE =
   'fitness profile through a Swan Coach provider to generate personalized workout ' +
   'plans. Direct identifiers — your name, contact details, date of birth, insurance ' +
   'information, medications, surgeries, and physician names — are removed before ' +
-  'transmission. Training-relevant data, including your goals, measurements, ' +
+  'transmission, as are your supplement, sleep and stress data. ' +
+  'Training-relevant data, including your goals, measurements, ' +
   'injury and pain history, and medical conditions that affect exercise, is sent ' +
   'alongside a stable client ID. Because that ' +
   'identifier is stable, this is de-identified processing rather than anonymous ' +
diff --git a/frontend/src/hooks/useFocusTrap.ts b/frontend/src/hooks/useFocusTrap.ts
index df9f2d354..1e09db0ff 100644
--- a/frontend/src/hooks/useFocusTrap.ts
+++ b/frontend/src/hooks/useFocusTrap.ts
@@ -26,6 +26,16 @@
  * WHAT IT DOES NOT DO: scroll-lock or `inert` on the background. Callers own
  * those, because they differ per surface (the drawer uses a body class).
  *
+ * ONE ACTIVE TRAP AT A TIME. The keydown listener is document-global, so two
+ * simultaneously-active traps would each pull focus back on every Tab — a focus
+ * war with no winner. Today the drawer is the only caller and the closed drawer
+ * sets `visibility: hidden`, which removes it from the tab order, so there is no
+ * live conflict. Before migrating the three in-house modals onto this hook
+ * (PdfApprovalVault, ClientPlanDetailModal, PostSaveHandoff), add a stack so the
+ * most recently activated trap is the only one that acts. Raised by GLM 5.3 on
+ * the post-ship panel; recorded here rather than built speculatively for a
+ * second caller that does not yet exist.
+ *
  * Honors `active` changing at any time; every listener is removed on cleanup.
  */
 import { useEffect, type RefObject } from 'react';

# FULL TEXT OF THE PRIMARY USER-FACING SURFACE

```tsx
﻿/**
 * FILE: MessagingView.tsx
 * PURPOSE: Mounted SwanStudios messaging surface for direct and group chats.
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useAuth } from '../../../context/AuthContext';
import { useMessagingCapabilities } from './useMessagingCapabilities';
import { MessagingContainer } from './MessagingStyles';
import ConversationListPanel from './ConversationListPanel';
import MessageThread from './MessageThread';
import NewConversationModal from './NewConversationModal';
import { useMessaging } from './useMessaging';
import type { CreateConversationRequest } from './MessagingTypes';

const MessagingView: React.FC = () => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const composeTo = searchParams.get('composeTo');


  const reduxUser = useSelector((state: any) => state.auth?.user || state.user?.user);
  const { user: authUser } = useAuth();
  const user = authUser || reduxUser;
  const currentUserId = user?.id || null;
  // Server truth, not a local recomputation. The previous expression tested a
  // subscription tier as a stand-in for a coaching relationship and disagreed
  // with the API in both directions — see useMessagingCapabilities for the
  // full account. A guard in useMessaging.tierGate.test.ts prevents that
  // expression from being reintroduced, so do not name it here verbatim.
  const { capabilities, loading: capabilitiesLoading } = useMessagingCapabilities(!!currentUserId);
  const messagingEnabled = capabilities.canMessageAssignedCoach;

  const {
    conversations,
    activeConversationId,
    messages,
    loading,
    messagesLoading,
    error,
    sendMessage,
    createConversation,
    renameConversation,
    addConversationParticipants,
    updateParticipantRole,
    removeConversationParticipant,
    selectConversation,
    searchUsers,
    getOtherParticipant,
    setActiveConversationId,
    typingUsers,
    onlineUserIds,
    connected,
    emitTyping,
    dismissError,
    pendingMessages,
  } = useMessaging(currentUserId, { enabled: messagingEnabled && !capabilitiesLoading });


  // Auto-start or switch to conversation if ?composeTo= is in the URL
  useEffect(() => {
    if (composeTo && messagingEnabled && currentUserId && !loading) {
      const targetId = parseInt(composeTo, 10);
      if (targetId && targetId !== currentUserId) {
        createConversation(targetId).catch(() => {});
      }
      setSearchParams(params => {
        params.delete('composeTo');
        return params;
      }, { replace: true });
    }
  }, [composeTo, messagingEnabled, currentUserId, loading, createConversation, setSearchParams]);

  const activeConversation = useMemo(
    () => conversations.find(c => String(c.id) === String(activeConversationId)) || null,
    [conversations, activeConversationId]
  );

  const activeParticipant = useMemo(
    () => (activeConversation ? getOtherParticipant(activeConversation) : null),
    [activeConversation, getOtherParticipant]
  );

  const unreadCount = useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    [conversations]
  );

  const isParticipantOnline = useMemo(
    () => activeParticipant ? onlineUserIds.has(activeParticipant.id) : false,
    [activeParticipant, onlineUserIds]
  );

  const hasMobileThread = !!activeConversationId;

  const handleBack = useCallback(() => {
    setActiveConversationId(null);
  }, [setActiveConversationId]);

  const handleNewConversation = useCallback(async (request: number | CreateConversationRequest) => {
    await createConversation(request);
  }, [createConversation]);

  if (!currentUserId || capabilitiesLoading) {
    return (
      <MessagingShell>
        <MessagingContainer>
          <CenteredMessage>Loading...</CenteredMessage>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  if (!messagingEnabled) {
    return (
      <MessagingShell>
        <MessagingContainer>
          <CenteredMessage>
            Messaging opens up when you have an active trainer, or with
            Crystalline Swan access for member-to-member chat.
          </CenteredMessage>
        </MessagingContainer>
      </MessagingShell>
    );
  }

  return (
    <MessagingShell>
      <MessagingSummary>
        <SummaryCopy>
          <SummaryKicker>Communication Hub</SummaryKicker>
          <SummaryTitle>Messages</SummaryTitle>
        </SummaryCopy>
        <SummaryMetrics aria-label="Messaging status">
          <SummaryMetric><strong>{conversations.length}</strong><span>Threads</span></SummaryMetric>
          <SummaryMetric $accent={unreadCount > 0}><strong>{unreadCount}</strong><span>Unread</span></SummaryMetric>
          <SummaryMetric $live={connected}><strong>{connected ? 'Live' : 'Polling'}</strong><span>Status</span></SummaryMetric>
        </SummaryMetrics>
      </MessagingSummary>

      <MessagingContainer>
        <ConversationListPanel
          conversations={conversations}
          activeConversationId={activeConversationId}
          currentUserId={currentUserId}
          onSelectConversation={selectConversation}
          onNewConversation={() => setShowNewModal(true)}
          loading={loading}
          mobileHidden={hasMobileThread}
        />

        <MessageThread
          messages={messages}
          currentUserId={currentUserId}
          participant={activeParticipant}
          conversation={activeConversation}
          onSend={sendMessage}
          onBack={handleBack}
          onTyping={emitTyping}
          onDismissError={dismissError}
          loading={messagesLoading}
          mobileHidden={!hasMobileThread}
          hasConversation={!!activeConversationId}
          typingUsers={typingUsers}
          isParticipantOnline={isParticipantOnline}
          connected={connected}
          conversationId={activeConversationId}
          error={error}
          pendingMessages={pendingMessages}
          searchUsers={searchUsers}
          onRenameConversation={renameConversation}
          onAddParticipants={addConversationParticipants}
          onUpdateParticipantRole={updateParticipantRole}
          onRemoveParticipant={removeConversationParticipant}
        />

        <NewConversationModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
          onStartConversation={handleNewConversation}
          searchUsers={searchUsers}
        />
      </MessagingContainer>
    </MessagingShell>
  );
};

export default MessagingView;

const MessagingShell = styled.div`
  display: flex;
  min-height: min(840px, calc(100vh - 96px));
  flex-direction: column;
  gap: 1rem;
`;

const CenteredMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-muted, rgba(224, 236, 244, 0.68));
  font-size: 0.95rem;
  padding: 2rem;
  text-align: center;
`;

const MessagingSummary = styled.header`
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SummaryCopy = styled.div`
  min-width: 0;
`;

const SummaryKicker = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
`;

const SummaryTitle = styled.h1`
  margin: 0.15rem 0 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.85rem;

  @media (max-width: 520px) {
    font-size: 1.45rem;
  }
`;

const SummaryMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(96px, 1fr));
  gap: 0.65rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryMetric = styled.div<{ $accent?: boolean; $live?: boolean }>`
  min-height: 56px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, var(--accent-primary, #60C0F0) 8%),
    var(--bg-base, #0A0A0F));
  padding: 0.7rem 0.85rem;

  strong {
    display: block;
    color: ${({ $accent, $live }) => ($accent
      ? 'var(--accent-secondary, #8B5CF6)'
      : $live
        ? 'var(--success, #4ECDC4)'
        : 'var(--text-primary, #E0ECF4)')};
    font-family: 'Sora', sans-serif;
    font-size: 1rem;
  }

  span {
    color: var(--text-muted, rgba(224, 236, 244, 0.68));
    font-size: 0.72rem;
  }
`;
```
