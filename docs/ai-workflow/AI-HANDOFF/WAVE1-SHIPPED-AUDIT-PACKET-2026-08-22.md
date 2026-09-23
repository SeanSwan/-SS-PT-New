---
title: "Client Dashboard Wave 1 — post-ship audit packet"
decision: "Is anything in this SHIPPED diff a live production defect that needs a follow-up fix?"
status: open
supersedes: none
originating_model: claude-opus-5
---

# POST-SHIP AUDIT — this code is LIVE in production right now

Ten commits shipped to `main` and deployed. The running server reports
`{"status":"healthy","commit":"ba5111a","branch":"main","ready":true}`.

**This is not a pre-merge review.** Anything you find is a defect currently
running against live paying clients of a personal-training SaaS. Severity should
be judged accordingly: a finding here costs a hotfix deploy, so tell me plainly
which things are worth one and which are not.

## What this change does

Replaced a subscription gate on messaging with a relationship gate, corrected
consent disclosure copy, added an enforced control around health-data egress to
an LLM provider, and contained focus in a mobile navigation drawer.

## Review history — do NOT re-find these, attack past them

This diff has already survived:
- a 5-round self-directed hostile loop (rounds 2 and 3 found real defects);
- a 7-model external panel on the code, which found **8 defects the self-loop
  missed**, all fixed;
- 4 further verification rounds ending CLEAN×2.

Defects already found and fixed, listed so you don't spend effort re-deriving
them:
1. `POST /conversations/:id/participants` validated existing thread members but
   not `req.body.participantIds` — a client could add a stranger to a trainer
   thread. Fixed; `adminIds` covered too.
2. `lifestyle.sleepHours` forwarded while copy said sleep was withheld.
3. Gating was an enumerated path list while the copy made a category claim.
4. `list` scope widened access to legacy community-thread previews.
5. `consentVersion` displayed as 2.0 but never sent, so grants recorded as 1.0.
6. Re-consent prompt defined but never rendered.
7. An inline consent disclosure that contradicted itself in adjacent sentences.
8. The health-field env flag was advisory, not enforced.

**Your value is in what all of that still missed.**

## Known-and-accepted (argue only if you think the acceptance is wrong)

- The de-identification layer is a **denylist**, so an unrecognised field or a
  name typed into a free-text note is still forwarded. Copy was reworded to stop
  promising otherwise. An outbound allowlist DTO is the real fix, unbuilt.
- Authorization checks and the writes they authorize are separated in time
  (TOCTOU). Pre-existing pattern across this codebase.
- Six touched files exceed the 300-line house cap; all six were already over on
  baseline. Zero new violations introduced.
- Staff (admin/trainer) bypass the gate entirely, as they did before.
- No authenticated browser pass was possible.

## Domain facts

- `tier` is written ONLY by subscription checkout. No package/order/credits
  controller writes it, so a client on a large training package has `tier:'free'`.
- `requireTier` treats a live trial as elite-equivalent server-side.
- `ClientTrainerAssignment.status` ∈ {active, inactive, pending}; table is
  `client_trainer_assignments`, QUOTED camelCase columns.
- `conversation_participants` is snake_case throughout. A Sequelize model
  declaring `ConversationParticipants` exists but is drifted and unused at runtime.
- `protect` stores `req.user.id` as a STRING.
- Owner rulings: community DMs stay subscription-gated; injuries, pain,
  measurements and medical conditions are TRAINING-SAFETY data that must keep
  flowing to the coach model; supplements/sleep/stress are withheld.

## What I want from you

1. **Live defects.** Anything currently broken or exploitable in production.
2. **Anything that fails only under real conditions** — concurrency, revoked
   assignments mid-session, socket paths, soft-deleted rows, role changes.
3. **Where the fix itself introduced a worse problem than the bug.**
4. **Whether any accepted item above should not have been accepted.**

## Output format

```
## VERDICT: <NO ACTION | FOLLOW-UP FIXES | HOTFIX NOW>
## LIVE DEFECTS (worth a hotfix deploy)
## FOLLOW-UPS (real, not urgent)
## WHAT I TRIED AND COULD NOT BREAK
## CONFIDENCE + WHAT WOULD CHANGE MY MIND
```

A finding without a concrete failure path is noise. If you need a file not in
this packet, list it as a required lookup rather than guessing.

---

# THE SHIPPED DIFF

diff --git a/backend/controllers/aiConsentController.mjs b/backend/controllers/aiConsentController.mjs
index 4f883c518..99e75b34a 100644
--- a/backend/controllers/aiConsentController.mjs
+++ b/backend/controllers/aiConsentController.mjs
@@ -14,8 +14,16 @@ import { getAllModels } from '../models/index.mjs';
 import logger from '../utils/logger.mjs';
 import { evaluateWaiverVersionEligibility } from '../services/waivers/waiverVersionEligibilityService.mjs';
 
-const CURRENT_CONSENT_VERSION = '1.0';
-const VALID_CONSENT_VERSIONS = ['1.0'];
+// 2026-08-22 — v2.0 corrects the disclosure: v1.0 told users their identity was
+// "hidden" and they were "anonymous", while de-identification assigns a STABLE
+// pseudonym and forwards training, injury and medical-condition data. v1.0
+// consents were therefore captured under a materially inaccurate description of
+// processing. Both versions stay VALID so existing grants keep working, but
+// CURRENT advances so a stored 1.0 is detectable as stale and can be re-prompted
+// (owner decision Q5: re-consent all). Frontend copy lives in
+// frontend/src/content/aiConsentCopy.ts — the two MUST be bumped together.
+const CURRENT_CONSENT_VERSION = '2.0';
+const VALID_CONSENT_VERSIONS = ['1.0', '2.0'];
 
 function parsePositiveUserId(value) {
   const parsed = Number(value);
diff --git a/backend/controllers/messaging/conversationController.mjs b/backend/controllers/messaging/conversationController.mjs
index dbf38503a..984af0bf6 100644
--- a/backend/controllers/messaging/conversationController.mjs
+++ b/backend/controllers/messaging/conversationController.mjs
@@ -57,7 +57,23 @@ export const getConversations = async (req, res) => {
   try {
     await ensureMessagingTables();
     await ensureAdminConversation(userId);
-    const conversations = await getConversationsForViewer(userId);
+    let conversations = await getConversationsForViewer(userId);
+
+    // A relationship-only viewer (no community entitlement) sees ONLY threads
+    // whose other members are all assigned counterparties. Without this they
+    // would keep seeing previews and participant names for legacy community
+    // threads they can no longer open -- see requireMessagingAccess, list scope.
+    if (req.messagingAccessLane === 'relationship' && req.messagingCounterparties) {
+      const allowed = req.messagingCounterparties;
+      const viewerId = Number(userId);
+      conversations = conversations.filter((conversation) => {
+        const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
+        const others = participants
+          .map((participant) => Number(participant?.id))
+          .filter((id) => Number.isInteger(id) && id !== viewerId);
+        return others.length > 0 && others.every((id) => allowed.has(id));
+      });
+    }
     return res.json(conversations);
   } catch (error) {
     console.error('Error fetching conversations:', error);
diff --git a/backend/middleware/requireMessagingAccess.mjs b/backend/middleware/requireMessagingAccess.mjs
new file mode 100644
index 000000000..c5e6960b9
--- /dev/null
+++ b/backend/middleware/requireMessagingAccess.mjs
@@ -0,0 +1,259 @@
+/**
+ * ============================================================================
+ * FILE: requireMessagingAccess.mjs
+ * PURPOSE: Messaging authorization — relationship lane OR subscription lane
+ * CREATED: 2026-08-21 · Wave 1 Slice 1 (client-dashboard remediation)
+ * ============================================================================
+ *
+ * WHAT THIS FILE DOES
+ * Replaces the blanket `requireTier('elite','trainer.messaging')` gate on
+ * /api/messaging. That gate conflated a COACHING capability with a BILLING
+ * tier: `tier` is written only by subscription checkout, and no package or
+ * session-purchase controller writes it — so a client on a $33,600 training
+ * package stays `tier: 'free'` and was 402'd out of contacting the trainer
+ * they are paying. The permission key itself is named `trainer.messaging`.
+ *
+ * TWO LANES, evaluated in this order:
+ *
+ *   1. COMMUNITY lane  — `requireTier('elite')` semantics, unchanged.
+ *      Elite/premium (and live trials, per requireTier's TRIAL_EFFECTIVE_TIER)
+ *      keep FULL messaging: any participant, any conversation. The social-DM
+ *      monetization rule is preserved exactly as-is (owner decision Q1: Yes).
+ *
+ *   2. RELATIONSHIP lane — NEW. A user with an active ClientTrainerAssignment
+ *      may message ONLY their assigned counterparties, regardless of tier.
+ *      Scoped deliberately: this is an accountability and safety channel
+ *      (pain, injury, schedule), not a free pass into community DMs.
+ *
+ * Staff (admin/trainer) bypass first, matching requireTier's existing
+ * behavior, so no trainer-side workflow changes.
+ *
+ * FAIL-CLOSED: any error resolving the relationship denies the relationship
+ * lane. It never falls through to "allow". The community lane keeps
+ * requireTier's own JWT-claim fallback for transient DB trouble.
+ *
+ * SCHEMA NOTE (verified against the tree, not memory — CLAUDE.md rule 58):
+ *   client_trainer_assignments : snake_case TABLE, camelCase QUOTED columns
+ *                                ("clientId", "trainerId"), status text.
+ *   conversation_participants  : snake_case table AND columns
+ *                                (conversation_id, user_id, deleted_at).
+ *   The Sequelize model declares tableName 'ConversationParticipants' with
+ *   camelCase columns — that model is DRIFTED. Every runtime query in this
+ *   codebase (19 references) uses the snake_case form used here.
+ *
+ * ID NOTE: `protect` stores req.user.id as a STRING (authMiddleware toStringId).
+ * Every comparison here goes through toId() so string/number mismatches cannot
+ * silently deny a legitimate user — the exact bug fixed in
+ * checkTrainerClientRelationship on 2026-04-18.
+ */
+
+import logger from '../utils/logger.mjs';
+import {
+  toId,
+  loadAssignedCounterpartyIds,
+  loadConversationMembers,
+} from '../services/messagingAccessRepository.mjs';
+import { meetsMinimumTier, tierDisplayName, featureLabel } from '../config/tierCatalog.mjs';
+import { isGatingEnabled, resolveCurrentEntitlement } from './requireTier.mjs';
+
+const COMMUNITY_MIN_TIER = 'elite';
+const FEATURE_KEY = 'trainer.messaging';
+
+/**
+ * True when every participant id in the request body is an assigned
+ * counterparty. Vacuously true when the body carries none.
+ *
+ * Used by BOTH the create and conversation scopes: "who may I put in a thread"
+ * must be one rule, or the stricter scope is bypassable via the looser one.
+ */
+function assertRequestedParticipantsAllowed(req, counterparties, actorId) {
+  // adminIds is included deliberately: promoting an unrelated user to admin of a
+  // coach thread is the same escalation as adding them (Sol, pre-push panel).
+  const requested = [
+    ...(Array.isArray(req.body?.participantIds) ? req.body.participantIds : []),
+    ...(Array.isArray(req.body?.adminIds) ? req.body.adminIds : []),
+  ];
+  const ids = requested.map(toId).filter((id) => id && id !== actorId);
+  if (ids.length === 0) return true;
+  return ids.every((id) => counterparties.has(id));
+}
+
+/** requireTier-compatible 402 so the frontend paywall interceptor is unchanged. */
+function sendTierRequired(res, entitlement) {
+  const { actualTier = 'free', effectiveTier = 'free', isTrial = false } = entitlement || {};
+  return res.status(402).json({
+    success: false,
+    message: `This feature requires ${tierDisplayName(COMMUNITY_MIN_TIER)} or higher.`,
+    code: 'TIER_REQUIRED',
+    featureName: featureLabel(FEATURE_KEY),
+    feature: FEATURE_KEY,
+    requiredTier: COMMUNITY_MIN_TIER,
+    currentTier: actualTier,
+    effectiveTier,
+    isTrial,
+    upgradeUrl: '/ascension',
+  });
+}
+
+/** 403 for a relationship user reaching outside their assigned counterparties. */
+function sendOutsideRelationship(res) {
+  return res.status(403).json({
+    success: false,
+    message: 'You can message your assigned trainer here. Upgrade to message other members.',
+    code: 'OUTSIDE_COACHING_RELATIONSHIP',
+    feature: FEATURE_KEY,
+    upgradeUrl: '/ascension',
+  });
+}
+
+/**
+ * @param {Object}  options
+ * @param {'list'|'create'|'conversation'} options.scope
+ *   list         — GET /conversations. Already self-scoped by the controller,
+ *                  so any active assignment is sufficient.
+ *   create       — POST /conversations. body.participantIds must be a subset
+ *                  of the actor's assigned counterparties.
+ *   conversation — routes carrying :id. Every OTHER active participant must be
+ *                  an assigned counterparty.
+ */
+export function requireMessagingAccess({ scope = 'conversation' } = {}) {
+  return async (req, res, next) => {
+    // Lane 0 — staff bypass, identical to requireTier's.
+    if (req.user?.role === 'admin' || req.user?.role === 'trainer') return next();
+
+    // Emergency kill switch, identical to requireTier's.
+    if (!isGatingEnabled()) return next();
+
+    if (!req.user) {
+      return res.status(401).json({
+        success: false,
+        message: 'Authentication required',
+        code: 'AUTH_REQUIRED',
+      });
+    }
+
+    // Lane 1 — COMMUNITY. Unchanged elite/trial semantics; full access.
+    let entitlement = null;
+    try {
+      entitlement = await resolveCurrentEntitlement(req);
+      if (meetsMinimumTier(entitlement.effectiveTier, COMMUNITY_MIN_TIER)) return next();
+    } catch (error) {
+      // resolveCurrentEntitlement already falls back to the JWT claim
+      // internally; a throw here means something worse. Fall through to the
+      // relationship lane rather than 500 — a paying client with an active
+      // assignment must still reach their trainer.
+      logger.warn('[MessagingAccess] entitlement resolution threw — trying relationship lane', {
+        userId: req.user?.id,
+        errorName: error instanceof Error ? error.name : typeof error,
+      });
+    }
+
+    // Lane 2 — RELATIONSHIP. Tier is irrelevant from here down.
+    const actorId = toId(req.user.id);
+    const counterparties = await loadAssignedCounterpartyIds(actorId);
+
+    // null = lookup failed (fail closed). Empty set = genuinely no assignment.
+    if (!counterparties || counterparties.size === 0) {
+      return sendTierRequired(res, entitlement);
+    }
+
+    if (scope === 'list') {
+      // Relationship-only viewers must not see legacy community threads.
+      //
+      // Pre-push panel (GLM 5.3 and Sol, independently): the list response
+      // carries last-message preview text and participant names/photos. Passing
+      // the gate on "has any assignment" therefore widened access for a
+      // downgraded subscriber who kept a trainer -- previously 402 and nothing,
+      // now previews of threads whose read endpoints 403. Hand the controller
+      // the counterparty set so it can narrow the result to relationship
+      // threads. The gate decides access; the controller decides scope.
+      req.messagingAccessLane = 'relationship';
+      req.messagingCounterparties = counterparties;
+      return next();
+    }
+
+    if (scope === 'create') {
+      const requested = Array.isArray(req.body?.participantIds) ? req.body.participantIds : [];
+      const ids = requested.map(toId).filter((id) => id && id !== actorId);
+      if (ids.length === 0) {
+        return res.status(400).json({
+          success: false,
+          message: 'At least one participant is required.',
+        });
+      }
+      if (!assertRequestedParticipantsAllowed(req, counterparties, actorId)) {
+        return sendOutsideRelationship(res);
+      }
+      req.messagingAccessLane = 'relationship';
+      return next();
+    }
+
+    // scope === 'conversation'
+    const membership = await loadConversationMembers(req.params?.id, actorId);
+    if (membership === null) return sendOutsideRelationship(res); // fail closed
+
+    // The actor must actually be in the thread, and it must not be an empty or
+    // unknown conversation. Both are denied through the relationship lane.
+    if (!membership.actorIsMember) return sendOutsideRelationship(res);
+    if (membership.others.length === 0) return sendOutsideRelationship(res);
+
+    const allInside = membership.others.every((id) => counterparties.has(id));
+    if (!allInside) return sendOutsideRelationship(res);
+
+    // Validate anyone being ADDED, not just who is already here.
+    //
+    // Found by the pre-push panel (DeepSeek v4 Flash and Qwen 3.8 independently).
+    // POST /conversations/:id/participants carries new users in the body. Without
+    // this check the membership test above passes trivially — the thread's only
+    // other member IS your assigned trainer — and the controller then adds an
+    // arbitrary stranger, handing them the full message history. Creating such a
+    // thread was already blocked by the `create` scope; adding to one was not,
+    // which made the create-scope restriction bypassable in two steps.
+    if (!assertRequestedParticipantsAllowed(req, counterparties, actorId)) {
+      return sendOutsideRelationship(res);
+    }
+
+    req.messagingAccessLane = 'relationship';
+    return next();
+  };
+}
+
+/**
+ * Resolve the two messaging capabilities for the authenticated actor, using the
+ * SAME rules the middleware enforces. Exported so `GET /api/messaging/
+ * capabilities` cannot drift from the gate it describes — a frontend that
+ * recomputes entitlement locally is how the original bug survived (the server
+ * treats a live trial as elite, the UI did not).
+ *
+ * @returns {Promise<{canMessageAssignedCoach:boolean, canUseCommunityDirectMessages:boolean}>}
+ */
+export async function resolveMessagingCapabilities(req) {
+  if (req.user?.role === 'admin' || req.user?.role === 'trainer') {
+    return { canMessageAssignedCoach: true, canUseCommunityDirectMessages: true };
+  }
+  if (!isGatingEnabled()) {
+    return { canMessageAssignedCoach: true, canUseCommunityDirectMessages: true };
+  }
+  if (!req.user) {
+    return { canMessageAssignedCoach: false, canUseCommunityDirectMessages: false };
+  }
+
+  let community = false;
+  try {
+    const entitlement = await resolveCurrentEntitlement(req);
+    community = meetsMinimumTier(entitlement.effectiveTier, COMMUNITY_MIN_TIER);
+  } catch {
+    community = false;
+  }
+
+  const counterparties = await loadAssignedCounterpartyIds(toId(req.user.id));
+  const hasRelationship = !!counterparties && counterparties.size > 0;
+
+  return {
+    // Community access implies the coach thread too.
+    canMessageAssignedCoach: community || hasRelationship,
+    canUseCommunityDirectMessages: community,
+  };
+}
+
+export default requireMessagingAccess;
diff --git a/backend/middleware/requireTier.mjs b/backend/middleware/requireTier.mjs
index bc2b5f074..0d256616f 100644
--- a/backend/middleware/requireTier.mjs
+++ b/backend/middleware/requireTier.mjs
@@ -45,7 +45,7 @@ const isActiveTrialSubscription = (subscription) => {
  * the Ascension copy promises a 30-day trial of premium features. The actual tier
  * is still returned in 402 responses for transparency and debugging.
  */
-async function resolveCurrentEntitlement(req) {
+export async function resolveCurrentEntitlement(req) {
   if (req._resolvedEntitlement) return req._resolvedEntitlement;
 
   let actualTier = req.user?.subscriptionTier || 'free';
@@ -90,7 +90,7 @@ async function resolveCurrentEntitlement(req) {
  * Defaults to enabled so premium promises are enforced by the backend. Set
  * TIER_GATING_ENABLED=false only as an emergency rollback switch.
  */
-function isGatingEnabled() {
+export function isGatingEnabled() {
   const flag = String(process.env.TIER_GATING_ENABLED || '').trim().toLowerCase();
   return !['false', '0', 'off', 'disabled'].includes(flag);
 }
diff --git a/backend/routes/messagingRoutes.mjs b/backend/routes/messagingRoutes.mjs
index 7432c516d..4de400e07 100644
--- a/backend/routes/messagingRoutes.mjs
+++ b/backend/routes/messagingRoutes.mjs
@@ -22,18 +22,26 @@ import {
   searchUsers,
 } from '../controllers/messagingController.mjs';
 import { protect } from '../middleware/auth.mjs';
-import { requireTier } from '../middleware/requireTier.mjs';
+import {
+  requireMessagingAccess,
+  resolveMessagingCapabilities,
+} from '../middleware/requireMessagingAccess.mjs';
 
 const router = Router();
-const messagingTier = requireTier('elite', 'trainer.messaging');
+// Wave 1 Slice 1: relationship lane OR community (elite) lane.
+// `list` is self-scoped by the controller; `create` validates requested
+// participantIds; `conversation` validates the thread's other participants.
+const messagingList = requireMessagingAccess({ scope: 'list' });
+const messagingCreate = requireMessagingAccess({ scope: 'create' });
+const messagingThread = requireMessagingAccess({ scope: 'conversation' });
 const conversationIdParam = param('id').isInt({ min: 1 }).withMessage('Valid conversation ID is required.');
 const participantUserIdParam = param('userId').isInt({ min: 1 }).withMessage('Valid participant ID is required.');
 
 // Get all conversations for the authenticated user (Crystalline+)
-router.get('/conversations', protect, messagingTier, getConversations);
+router.get('/conversations', protect, messagingList, getConversations);
 
 // Create a new direct or group conversation (Crystalline+)
-router.post('/conversations', protect, messagingTier, [
+router.post('/conversations', protect, messagingCreate, [
   body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
   body('type').optional().isIn(['direct', 'group']).withMessage('Conversation type must be direct or group.'),
   body('name').optional().isString().isLength({ max: 80 }).withMessage('Group name must be 80 characters or fewer.'),
@@ -41,39 +49,47 @@ router.post('/conversations', protect, messagingTier, [
 ], createConversation);
 
 // Rename a group conversation (group owner/admin only)
-router.patch('/conversations/:id', protect, messagingTier, [
+router.patch('/conversations/:id', protect, messagingThread, [
   conversationIdParam,
   body('name').isString().isLength({ min: 1, max: 80 }).withMessage('Group name is required.'),
 ], updateConversation);
 
 // Add group participants (group owner/admin only)
-router.post('/conversations/:id/participants', protect, messagingTier, [
+router.post('/conversations/:id/participants', protect, messagingThread, [
   conversationIdParam,
   body('participantIds').isArray({ min: 1 }).withMessage('At least one participant is required.'),
   body('adminIds').optional().isArray().withMessage('Admin IDs must be an array.'),
 ], addConversationParticipants);
 
 // Promote/demote group participants (owner only)
-router.patch('/conversations/:id/participants/:userId', protect, messagingTier, [
+router.patch('/conversations/:id/participants/:userId', protect, messagingThread, [
   conversationIdParam,
   participantUserIdParam,
   body('role').isIn(['admin', 'member']).withMessage('Participant role must be admin or member.'),
 ], updateParticipantRole);
 
 // Remove a group participant or leave a group
-router.delete('/conversations/:id/participants/:userId', protect, messagingTier, [
+router.delete('/conversations/:id/participants/:userId', protect, messagingThread, [
   conversationIdParam,
   participantUserIdParam,
 ], removeConversationParticipant);
 
 // Delete (hide) a conversation for the authenticated user (Crystalline+)
-router.delete('/conversations/:id', protect, messagingTier, deleteConversation);
+router.delete('/conversations/:id', protect, messagingThread, deleteConversation);
 
 // Get messages for a specific conversation (Crystalline+)
-router.get('/conversations/:id/messages', protect, messagingTier, getMessagesForConversation);
+router.get('/conversations/:id/messages', protect, messagingThread, getMessagesForConversation);
 
 // Send a message to a conversation (Crystalline+)
-router.post('/conversations/:id/messages', protect, messagingTier, sendMessage);
+router.post('/conversations/:id/messages', protect, messagingThread, sendMessage);
+
+// What this user may do. The frontend consumes this instead of recomputing
+// entitlement locally — recomputation is how the trial/paying-client
+// divergence survived. Intentionally ungated: it reports access, never grants.
+router.get('/capabilities', protect, async (req, res) => {
+  const capabilities = await resolveMessagingCapabilities(req);
+  return res.json({ success: true, ...capabilities });
+});
 
 // Search for users (open to all authenticated users)
 router.get('/users/search', protect, searchUsers);
diff --git a/backend/services/deIdentificationService.mjs b/backend/services/deIdentificationService.mjs
index aa9167e0a..05890f6af 100644
--- a/backend/services/deIdentificationService.mjs
+++ b/backend/services/deIdentificationService.mjs
@@ -58,6 +58,94 @@ const DIRECT_IDENTIFIER_PATHS = [
   'health.insuranceProvider',
 ];
 
+/**
+ * NON-TRAINING HEALTH FIELDS — default-DENIED (Wave 1 Slice 5).
+ *
+ * Owner decision Q2 (2026-08-22): health fields do not reach the LLM provider
+ * until counsel approves the list in writing. Owner decision (same day) then
+ * SPLIT the set Fable had grouped together, because denying it wholesale would
+ * have removed the inputs that make coaching safe:
+ *
+ *   DENIED here      — supplements, sleep, stress. Sensitive, and not required
+ *                      to program a session safely. Matched by KEY NAME at any
+ *                      depth (GATED_KEY_PATTERN), not by an enumerated path
+ *                      list — a path list cannot keep the category claim in the
+ *                      consent copy true, and let medicalConditions slip once
+ *                      already.
+ *   NOT denied       — injuries, pain, measurements, medical conditions. These
+ *                      are TRAINING-SAFETY data: without them Swan Coach cannot
+ *                      avoid a movement that is contraindicated for this client. Removing them
+ *                      would trade a privacy risk for a physical one. They are
+ *                      disclosed to the user in aiConsentCopy.ts instead.
+ *
+ * Set COACH_HEALTH_FIELDS_ENABLED=true to forward the denied set once counsel
+ * signs off. Doing so CHANGES WHAT USERS WERE TOLD — bump AI_CONSENT_VERSION in
+ * frontend/src/content/aiConsentCopy.ts and re-consent before enabling.
+ */
+/**
+ * Training-safety paths that must NEVER be gated, whatever the category
+ * matcher would otherwise do to them.
+ * Documented as an explicit list so a future edit has to argue with it.
+ */
+export const TRAINING_SAFETY_PATHS = Object.freeze([
+  'painAndInjuries',
+  'health.injuries',
+  'health.pain',
+  'health.currentPain',
+  // Medical conditions joined this list on 2026-08-22 after the dry loop caught
+  // the first cut of this gate stripping them. `aiPrivacy.test.mjs` had already
+  // labelled them "safety-critical" with a `mild asthma` fixture, and it is
+  // right: asthma, cardiac conditions and diabetes change what can be safely
+  // programmed. Gating them was the same mistake as gating injuries would have
+  // been — a privacy risk traded for a physical one.
+  'health.conditions',
+  'health.medicalConditions',
+  'clientProfile.medicalConditions',
+  'measurements',
+  'clientProfile.measurements',
+]);
+
+/**
+ * Consent version that must be LIVE before the gated categories may be
+ * forwarded. Enabling them changes what users were told, so a new disclosure
+ * has to exist first. Bumping this is a code change, reviewed like any other.
+ */
+export const GATED_FIELDS_REQUIRE_CONSENT_VERSION = '3.0';
+
+/**
+ * Escape hatch for the gated categories — deliberately hard to open.
+ *
+ * The first cut of this was a bare env flag with a comment saying "bump
+ * AI_CONSENT_VERSION and re-consent before enabling". DeepSeek v4 Pro flagged
+ * that on the pre-push panel and was right: a caution is not a control. An
+ * operator flipping COACH_HEALTH_FIELDS_ENABLED in production would have made
+ * every consent surface false the instant it was set, with nothing stopping it.
+ *
+ * The coupling is now structural. The operator must ALSO declare which consent
+ * version they are enabling under, and it must match the version this code
+ * requires. A mismatch fails CLOSED and logs critical, so the failure mode of
+ * getting it wrong is "Coach sees less than it could", never "users were lied
+ * to". Enabling therefore takes a deliberate code change plus a deliberate
+ * deploy-time declaration, which is what the comment only asked for politely.
+ */
+export function areGatedHealthFieldsEnabled() {
+  const flag = String(process.env.COACH_HEALTH_FIELDS_ENABLED || '').trim().toLowerCase();
+  if (!['true', '1', 'on', 'enabled'].includes(flag)) return false;
+
+  const declared = String(process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION || '').trim();
+  if (declared !== GATED_FIELDS_REQUIRE_CONSENT_VERSION) {
+    logger.error(
+      '[DeIdentification] COACH_HEALTH_FIELDS_ENABLED is set but the declared consent '
+      + 'version does not match the version this build requires. Gated health fields '
+      + 'remain WITHHELD. Ship the new disclosure, then set '
+      + 'COACH_HEALTH_FIELDS_CONSENT_VERSION to the required value.',
+      { required: GATED_FIELDS_REQUIRE_CONSENT_VERSION, declared: declared || '(unset)' },
+    );
+    return false;
+  }
+  return true;
+}
+
 /**
  * Fields that are safe to keep for workout generation context
  */
@@ -158,6 +246,54 @@ export function hashPayload(payload) {
  * @returns {{ deIdentified: Object, strippedFields: string[] } | null}
  *   Returns null if the payload is empty/unsafe after stripping (fail-closed).
  */
+
+/**
+ * Key-name matcher for the gated categories.
+ *
+ * The first cut of this gate was an enumerated PATH list. The consent copy,
+ * however, makes a CATEGORY claim ("sleep, stress and supplement data are
+ * withheld"). A path list cannot keep a category claim true: an unlisted
+ * variant such as `clientProfile.sleep`, `health.sleepQuality` or
+ * `wellness.stressLevel` flows while the copy says it does not. GLM 5.3 flagged
+ * this on the pre-push panel and correctly identified it as the SAME drift
+ * class that had already bitten once in this wave, when `health.medicalConditions`
+ * slipped through an enumerated list.
+ *
+ * Matching on the key NAME at any depth makes the code enforce the category the
+ * copy promises, so new field spellings are covered by default instead of
+ * silently escaping.
+ *
+ * TRAINING-SAFETY OVERRIDE: injuries, pain, measurements and medical conditions
+ * are never gated no matter where they appear — see TRAINING_SAFETY_PATHS.
+ */
+const GATED_KEY_PATTERN = /(sleep|stress|supplement)/i;
+const SAFETY_KEY_PATTERN = /(injur|pain|measurement|condition)/i;
+
+/**
+ * Walk the payload and delete any key whose NAME matches a gated category.
+ * Logs the path only — never the value (rules 8/44/59).
+ */
+function stripGatedHealthFields(node, strippedFields, prefix = '') {
+  if (!node || typeof node !== 'object') return;
+
+  for (const key of Object.keys(node)) {
+    const path = prefix ? `${prefix}.${key}` : key;
+
+    if (GATED_KEY_PATTERN.test(key) && !SAFETY_KEY_PATTERN.test(key)) {
+      delete node[key];
+      strippedFields.push(path);
+      logger.info('[DeIdentification] gated health field withheld', { field: path });
+      continue;
+    }
+
+    const value = node[key];
+    if (value && typeof value === 'object' && !Array.isArray(value)) {
+      stripGatedHealthFields(value, strippedFields, path);
+    }
+  }
+}
+
+
 export function deIdentify(masterPromptJson, options = {}) {
   if (!masterPromptJson || typeof masterPromptJson !== 'object') {
     logger.warn('[DeIdentification] Received null/invalid masterPromptJson — fail closed');
@@ -182,7 +318,11 @@ export function deIdentify(masterPromptJson, options = {}) {
   const anonymousLabel = normalizedSpiritName || (clientId ? `Client #${clientId}` : 'Client');
   const aliasLabel = normalizedSpiritName || normalizedExistingAlias || anonymousLabel;
 
-  // 1. Replace name fields with anonymous client ID
+  // 1. Replace name fields with the STABLE pseudonymous client label.
+  //    NOTE: this is de-identification, not anonymization — the label is
+  //    stable across sessions and travels with injury/measurement data.
+  //    User-facing copy must say "pseudonymized", never "anonymous":
+  //    see frontend/src/content/aiConsentCopy.ts (Wave 1 Slice 3).
   const originalName = getNestedValue(payload, 'client.name');
   if (originalName !== undefined) {
     setNestedValue(payload, 'client.name', anonymousLabel);
@@ -226,6 +366,13 @@ export function deIdentify(masterPromptJson, options = {}) {
     }
   }
 
+  // 2b. Gated non-training health fields — removed unless counsel has signed
+  //     off and COACH_HEALTH_FIELDS_ENABLED is set. Only the field NAME is
+  //     logged, never the value (rules 8/44/59).
+  if (!areGatedHealthFieldsEnabled()) {
+    stripGatedHealthFields(payload, strippedFields);
+  }
+
   // 3. Deep PII scan: search all string values for email/phone patterns and redact
   scanAndRedactPII(payload, strippedFields);
 
diff --git a/backend/services/messagingAccessRepository.mjs b/backend/services/messagingAccessRepository.mjs
new file mode 100644
index 000000000..df9a21734
--- /dev/null
+++ b/backend/services/messagingAccessRepository.mjs
@@ -0,0 +1,99 @@
+/**
+ * FILE: messagingAccessRepository.mjs
+ * PURPOSE: SQL the messaging authorization gate needs, kept out of the gate.
+ * CREATED: 2026-08-22 · extracted so requireMessagingAccess stays under the
+ *          300-line cap after the pre-push panel fixes, and to match this
+ *          codebase's convention of keeping raw SQL in a repository module
+ *          (see messagingParticipantRepository.mjs).
+ *
+ * SCHEMA NOTE (verified against the tree, not memory):
+ *   client_trainer_assignments : snake_case TABLE, camelCase QUOTED columns
+ *                                ("clientId", "trainerId"), status text.
+ *   conversation_participants  : snake_case table AND columns.
+ *   The Sequelize model declaring 'ConversationParticipants' with camelCase
+ *   columns is DRIFTED; every runtime query uses the snake_case form here.
+ */
+
+import { QueryTypes } from 'sequelize';
+import sequelize from '../database.mjs';
+import logger from '../utils/logger.mjs';
+
+/** Strict positive-integer coercion. Returns null for anything else. */
+export
+function toId(value) {
+  if (value === null || value === undefined) return null;
+  const n = Number.parseInt(String(value), 10);
+  return Number.isSafeInteger(n) && n > 0 ? n : null;
+}
+
+/**
+ * Every user id this actor has an ACTIVE assignment with, in either direction:
+ * clients get their trainers, trainers get their clients.
+ *
+ * @param {number} userId
+ * @returns {Promise<Set<number>|null>} null signals a lookup failure (deny).
+ */
+export async function loadAssignedCounterpartyIds(userId) {
+  const id = toId(userId);
+  if (!id) return null;
+
+  try {
+    const rows = await sequelize.query(
+      `SELECT "trainerId" AS counterparty
+         FROM client_trainer_assignments
+        WHERE "clientId" = :id AND status = 'active'
+        UNION
+       SELECT "clientId" AS counterparty
+         FROM client_trainer_assignments
+        WHERE "trainerId" = :id AND status = 'active'`,
+      { replacements: { id }, type: QueryTypes.SELECT },
+    );
+    return new Set(rows.map((r) => toId(r.counterparty)).filter(Boolean));
+  } catch (error) {
+    logger.warn('[MessagingAccess] assignment lookup failed — denying relationship lane', {
+      userId: id,
+      errorName: error instanceof Error ? error.name : typeof error,
+    });
+    return null;
+  }
+}
+
+/**
+ * Active membership of a conversation, from the actor's point of view.
+ *
+ * Returns BOTH whether the actor is themselves an active participant and who
+ * the other participants are. The membership half matters: without it, a
+ * conversation whose only other member happened to be the actor's assigned
+ * trainer would satisfy the subset test even though the actor is not in the
+ * thread at all. Controllers do enforce membership downstream, but a gate that
+ * depends on a later gate is authorization by luck.
+ *
+ * @returns {Promise<{actorIsMember:boolean, others:number[]}|null>}
+ *          null signals a lookup failure (deny).
+ */
+export async function loadConversationMembers(conversationId, actorId) {
+  const convId = toId(conversationId);
+  const actor = toId(actorId);
+  if (!convId || !actor) return null;
+
+  try {
+    const rows = await sequelize.query(
+      `SELECT user_id AS "userId"
+         FROM conversation_participants
+        WHERE conversation_id = :convId
+          AND deleted_at IS NULL`,
+      { replacements: { convId }, type: QueryTypes.SELECT },
+    );
+    const all = rows.map((r) => toId(r.userId)).filter(Boolean);
+    return {
+      actorIsMember: all.includes(actor),
+      others: all.filter((uid) => uid !== actor),
+    };
+  } catch (error) {
+    logger.warn('[MessagingAccess] participant lookup failed — denying relationship lane', {
+      conversationId: convId,
+      errorName: error instanceof Error ? error.name : typeof error,
+    });
+    return null;
+  }
+}
diff --git a/backend/tests/api/aiPrivacy.test.mjs b/backend/tests/api/aiPrivacy.test.mjs
index 513dea3bd..e5fdc094b 100644
--- a/backend/tests/api/aiPrivacy.test.mjs
+++ b/backend/tests/api/aiPrivacy.test.mjs
@@ -13,7 +13,11 @@ import { describe, it, expect, beforeEach, vi } from 'vitest';
 // ─── De-Identification Service Tests ────────────────────────────────────────
 
 // Import the service directly (no DB dependency)
-import { deIdentify, hashPayload } from '../../services/deIdentificationService.mjs';
+import {
+  deIdentify,
+  hashPayload,
+  GATED_FIELDS_REQUIRE_CONSENT_VERSION,
+} from '../../services/deIdentificationService.mjs';
 
 /**
  * Realistic masterPromptJson fixture matching the v3.0 schema
@@ -218,14 +222,48 @@ describe('De-Identification Service', () => {
       expect(result.deIdentified.health.injuries).toEqual(['left knee ACL repair 2023']);
     });
 
-    it('should preserve safe lifestyle fields', () => {
+    it('should preserve safe lifestyle fields, minus the owner-gated ones', () => {
+      // 2026-08-22 (Wave 1 Slice 5) — RE-ANCHORED, deliberately narrowed.
+      //
+      // sleepQuality and stressLevel are now default-DENIED behind
+      // COACH_HEALTH_FIELDS_ENABLED (owner decision Q2: no health fields to the
+      // LLM provider until counsel signs off). They are recovery-relevant but
+      // not acutely safety-critical, so unlike injuries, pain and medical
+      // conditions they did NOT survive the split.
+      //
+      // COST, recorded so it is not rediscovered as a bug: Swan Coach can no
+      // longer see sleep or stress, which degrades recovery-aware programming
+      // and readiness inference. Flip the env flag to restore, and bump
+      // AI_CONSENT_VERSION when doing so — enabling it changes what users were
+      // told. sleepHours is NOT gated and is asserted below unchanged.
       const input = createMasterPromptFixture();
       const result = deIdentify(input);
 
       expect(result).not.toBeNull();
-      expect(result.deIdentified.lifestyle.sleepHours).toBe(7);
-      expect(result.deIdentified.lifestyle.sleepQuality).toBe('good');
-      expect(result.deIdentified.lifestyle.stressLevel).toBe('moderate');
+      // sleepHours joined the gated set on 2026-08-22 after the pre-push panel
+      // (Sol) caught the consent copy claiming sleep is withheld while this
+      // field still shipped. Copy and code now agree: no sleep data is sent.
+      expect(result.deIdentified.lifestyle.sleepHours).toBeUndefined();
+      expect(result.deIdentified.lifestyle.sleepQuality).toBeUndefined();
+      expect(result.deIdentified.lifestyle.stressLevel).toBeUndefined();
+    });
+
+    it('restores the gated lifestyle fields when counsel has signed off', () => {
+      // The flag alone is deliberately not enough: enabling these fields also
+      // requires declaring the consent version they are disclosed under, so the
+      // disclosure cannot silently fall out of date. See
+      // areGatedHealthFieldsEnabled.
+      process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
+      process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = GATED_FIELDS_REQUIRE_CONSENT_VERSION;
+      try {
+        const result = deIdentify(createMasterPromptFixture());
+        expect(result.deIdentified.lifestyle.sleepHours).toBe(7);
+        expect(result.deIdentified.lifestyle.sleepQuality).toBe('good');
+        expect(result.deIdentified.lifestyle.stressLevel).toBe('moderate');
+      } finally {
+        delete process.env.COACH_HEALTH_FIELDS_ENABLED;
+        delete process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION;
+      }
     });
 
     it('should not mutate the original input', () => {
diff --git a/backend/tests/api/groupParticipantAuthzExecution.test.mjs b/backend/tests/api/groupParticipantAuthzExecution.test.mjs
index 780f65589..2695f1bdf 100644
--- a/backend/tests/api/groupParticipantAuthzExecution.test.mjs
+++ b/backend/tests/api/groupParticipantAuthzExecution.test.mjs
@@ -65,11 +65,25 @@ vi.mock('../../middleware/auth.mjs', () => ({
   authorize: () => (_req, _res, next) => next(),
 }));
 
-// The tier gate is scaffold, not subject. Leaving it live would make every
-// assertion below a test of requireTier instead of a test of group policy.
+// The entitlement gate is scaffold, not subject. Leaving it live would make
+// every assertion below a test of the gate instead of a test of group policy.
+//
+// 2026-08-22 (Wave 1 Slice 1): messagingRoutes swapped requireTier for
+// requireMessagingAccess, so the old requireTier stub no longer intercepted
+// anything and the real middleware ran against a mocked DB. Re-anchored to the
+// middleware the routes actually mount. requireTier is still stubbed because
+// other modules in this graph import it. Coverage of the gate itself lives in
+// messagingRelationshipLane.test.mjs — nothing is being silenced here.
+vi.mock('../../middleware/requireMessagingAccess.mjs', () => ({
+  requireMessagingAccess: () => (_req, _res, next) => next(),
+  default: () => (_req, _res, next) => next(),
+}));
+
 vi.mock('../../middleware/requireTier.mjs', () => ({
   requireTier: () => (_req, _res, next) => next(),
   requireFeature: () => (_req, _res, next) => next(),
+  isGatingEnabled: () => true,
+  resolveCurrentEntitlement: async () => ({ actualTier: 'elite', effectiveTier: 'elite', isTrial: false }),
 }));
 
 const messagingRoutes = (await import('../../routes/messagingRoutes.mjs')).default;
diff --git a/backend/tests/api/messagingCapabilities.test.mjs b/backend/tests/api/messagingCapabilities.test.mjs
new file mode 100644
index 000000000..4d656ba7a
--- /dev/null
+++ b/backend/tests/api/messagingCapabilities.test.mjs
@@ -0,0 +1,177 @@
+/**
+ * Wave 1 Slice 2 — messaging capabilities endpoint
+ * ================================================
+ * Split out of messagingRelationshipLane.test.mjs on 2026-08-22 to stay under
+ * the 300-line file cap (flagged by the pre-push panel). Same fixtures, same
+ * mocks; this half covers the endpoint that REPORTS access, while the other
+ * half covers the middleware that ENFORCES it. The agreement test below is the
+ * seam between them.
+ *
+ * Original context
+ * ----------------
+ * Proves the fix for the P0 found by the client-dashboard hostile review:
+ * `requireTier('elite','trainer.messaging')` gated a COACHING capability on a
+ * BILLING tier, so a client on a training package (tier stays 'free' — no
+ * purchase controller writes `tier`) was 402'd out of contacting their trainer.
+ *
+ * Acceptance criteria under test (Fable ruling §4, slice 1):
+ *   AC1  free tier + active assignment  -> 200 on list / create / send
+ *   AC2  same user, unrelated recipient -> 403 OUTSIDE_COACHING_RELATIONSHIP
+ *   AC3  elite, no assignment           -> 200 community DMs (UNCHANGED)
+ *   AC4  free tier, no assignment       -> 402 everywhere (UNCHANGED)
+ *   AC5  live trial                     -> permitted (UNCHANGED, matches API)
+ *   AC6  assignment lookup throws       -> denied (FAIL CLOSED)
+ *
+ * The middleware is mounted on a bare express app; controllers are stubs.
+ * Only authorization wiring is under test.
+ */
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+import express from 'express';
+import request from 'supertest';
+
+const { queryMock, resolveEntitlementMock, gatingEnabledMock } = vi.hoisted(() => ({
+  queryMock: vi.fn(),
+  resolveEntitlementMock: vi.fn(),
+  gatingEnabledMock: vi.fn(() => true),
+}));
+
+vi.mock('../../database.mjs', () => ({
+  default: { query: queryMock },
+}));
+
+vi.mock('../../utils/logger.mjs', () => ({
+  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
+}));
+
+vi.mock('../../middleware/requireTier.mjs', () => ({
+  resolveCurrentEntitlement: resolveEntitlementMock,
+  isGatingEnabled: gatingEnabledMock,
+}));
+
+vi.mock('../../config/tierCatalog.mjs', () => ({
+  // Minimal ordering that mirrors the real catalog for the tiers we exercise.
+  meetsMinimumTier: (effective, minimum) => {
+    const rank = { free: 0, pro: 1, elite: 2, premium: 2 };
+    return (rank[effective] ?? 0) >= (rank[minimum] ?? 0);
+  },
+  tierDisplayName: (t) => t,
+  featureLabel: (k) => k,
+}));
+
+const { requireMessagingAccess, resolveMessagingCapabilities } =
+  await import('../../middleware/requireMessagingAccess.mjs');
+
+const CLIENT_ID = 501;
+const TRAINER_ID = 900;
+const STRANGER_ID = 777;
+
+/** `protect` stores req.user.id as a STRING — reproduce that faithfully. */
+function appWith(user, scope) {
+  const app = express();
+  app.use(express.json());
+  app.use((req, _res, next) => { req.user = user; next(); });
+  const mw = requireMessagingAccess({ scope });
+  if (scope === 'conversation') {
+    app.post('/conversations/:id/messages', mw, (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
+  } else if (scope === 'addParticipants') {
+    app.post('/conversations/:id/participants', requireMessagingAccess({ scope: 'conversation' }),
+      (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
+  } else if (scope === 'create') {
+    app.post('/conversations', mw, (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
+  } else {
+    app.get('/conversations', mw, (_req, res) => res.status(200).json({ ok: true }));
+  }
+  return app;
+}
+
+const freeClient = { id: String(CLIENT_ID), role: 'client' };
+
+/**
+ * Route the two SQL shapes this middleware issues.
+ * @param {number[]} counterparties assignment rows
+ * @param {number[]} participants   other participants of the conversation
+ */
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
+beforeEach(() => {
+  vi.clearAllMocks();
+  gatingEnabledMock.mockReturnValue(true);
+});
+
+describe('resolveMessagingCapabilities (GET /api/messaging/capabilities)', () => {
+  // The endpoint must be computed by the SAME rules the gate enforces —
+  // a separately-derived answer is how the original divergence survived.
+  const req = (user) => ({ user });
+
+  it('reports the coach lane open and the community lane closed for a free client with a trainer', async () => {
+    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+    mockSql({ counterparties: [TRAINER_ID] });
+    await expect(resolveMessagingCapabilities(req(freeClient))).resolves.toEqual({
+      canMessageAssignedCoach: true,
+      canUseCommunityDirectMessages: false,
+    });
+  });
+
+  it('reports both lanes open for a subscriber with no assignment', async () => {
+    resolveEntitlementMock.mockResolvedValue({ actualTier: 'elite', effectiveTier: 'elite', isTrial: false });
+    mockSql({ counterparties: [] });
+    await expect(resolveMessagingCapabilities(req(freeClient))).resolves.toEqual({
+      canMessageAssignedCoach: true,
+      canUseCommunityDirectMessages: true,
+    });
+  });
+
+  it('reports both lanes open for a live trial, matching what the gate allows', async () => {
+    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'elite', isTrial: true });
+    mockSql({ counterparties: [] });
+    await expect(resolveMessagingCapabilities(req(freeClient))).resolves.toEqual({
+      canMessageAssignedCoach: true,
+      canUseCommunityDirectMessages: true,
+    });
+  });
+
+  it('reports both closed for a free client with no assignment', async () => {
+    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+    mockSql({ counterparties: [] });
+    await expect(resolveMessagingCapabilities(req(freeClient))).resolves.toEqual({
+      canMessageAssignedCoach: false,
+      canUseCommunityDirectMessages: false,
+    });
+  });
+
+  it('reports both open for staff without touching the DB', async () => {
+    await expect(resolveMessagingCapabilities(req({ id: '900', role: 'trainer' }))).resolves.toEqual({
+      canMessageAssignedCoach: true,
+      canUseCommunityDirectMessages: true,
+    });
+    expect(queryMock).not.toHaveBeenCalled();
+  });
+
+  it('reports both closed when unauthenticated', async () => {
+    await expect(resolveMessagingCapabilities({ user: undefined })).resolves.toEqual({
+      canMessageAssignedCoach: false,
+      canUseCommunityDirectMessages: false,
+    });
+  });
+
+  it('agrees with the gate: capabilities false implies the gate denies', async () => {
+    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+    mockSql({ counterparties: [] });
+    const caps = await resolveMessagingCapabilities(req(freeClient));
+    const res = await request(appWith(freeClient, 'list')).get('/conversations');
+    expect(caps.canMessageAssignedCoach).toBe(false);
+    expect(res.status).toBe(402);
+  });
+});
diff --git a/backend/tests/api/messagingListScopeNarrowing.test.mjs b/backend/tests/api/messagingListScopeNarrowing.test.mjs
new file mode 100644
index 000000000..912b78fcb
--- /dev/null
+++ b/backend/tests/api/messagingListScopeNarrowing.test.mjs
@@ -0,0 +1,104 @@
+/**
+ * Wave 1 — relationship-only viewers do not see legacy community threads
+ * =====================================================================
+ * Pre-push panel (GLM 5.3 and Sol 5.6 Pro, independently): opening the list
+ * gate to anyone with an active assignment widened access. The list response
+ * carries last-message preview `content` and participant names/photos, so a
+ * subscriber who downgraded but kept a trainer went from 402-and-nothing to
+ * seeing previews of community threads whose read endpoints now 403.
+ *
+ * The gate decides ACCESS; the controller decides SCOPE. These tests pin the
+ * scope half.
+ */
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+
+const { getConversationsForViewerMock, ensureAdminConversationMock } = vi.hoisted(() => ({
+  getConversationsForViewerMock: vi.fn(),
+  ensureAdminConversationMock: vi.fn(),
+}));
+
+vi.mock('../../services/messagingRepository.mjs', () => ({
+  getConversationsForViewer: getConversationsForViewerMock,
+  ensureAdminConversation: ensureAdminConversationMock,
+  ensureMessagingTables: vi.fn().mockResolvedValue(undefined),
+  normalizeParticipantIds: vi.fn(),
+  normalizeAdminIds: vi.fn(),
+  fetchActiveUserIds: vi.fn(),
+  upsertConversationParticipant: vi.fn(),
+  reviveParticipant: vi.fn(),
+  softDeleteParticipant: vi.fn(),
+  getConversationMembership: vi.fn(),
+  getActiveParticipant: vi.fn(),
+  updateParticipantRoleRecord: vi.fn(),
+  findDirectConversation: vi.fn(),
+  sequelize: { transaction: vi.fn() },
+}));
+
+vi.mock('../../utils/logger.mjs', () => ({
+  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
+}));
+
+const { getConversations } = await import('../../controllers/messaging/conversationController.mjs');
+
+const VIEWER = 501;
+const TRAINER = 900;
+const STRANGER = 777;
+
+const thread = (id, otherIds) => ({
+  id,
+  participants: [{ id: VIEWER }, ...otherIds.map((uid) => ({ id: uid }))],
+});
+
+function res() {
+  const r = { statusCode: 200, body: null };
+  r.status = (code) => { r.statusCode = code; return r; };
+  r.json = (payload) => { r.body = payload; return r; };
+  return r;
+}
+
+beforeEach(() => {
+  vi.clearAllMocks();
+  ensureAdminConversationMock.mockResolvedValue(undefined);
+});
+
+describe('relationship-only list narrowing', () => {
+  it('hides a legacy community thread while keeping the trainer thread', async () => {
+    getConversationsForViewerMock.mockResolvedValue([
+      thread(1, [TRAINER]),
+      thread(2, [STRANGER]),
+    ]);
+
+    const r = res();
+    await getConversations(
+      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
+      r,
+    );
+
+    expect(r.body.map((c) => c.id)).toEqual([1]);
+  });
+
+  it('hides a group that mixes the trainer with a stranger', async () => {
+    getConversationsForViewerMock.mockResolvedValue([thread(3, [TRAINER, STRANGER])]);
+
+    const r = res();
+    await getConversations(
+      { user: { id: VIEWER }, messagingAccessLane: 'relationship', messagingCounterparties: new Set([TRAINER]) },
+      r,
+    );
+
+    expect(r.body).toHaveLength(0);
+  });
+
+  it('does NOT narrow for a community-entitled viewer', async () => {
+    getConversationsForViewerMock.mockResolvedValue([
+      thread(1, [TRAINER]),
+      thread(2, [STRANGER]),
+    ]);
+
+    // No relationship lane set — the community lane passed the gate.
+    const r = res();
+    await getConversations({ user: { id: VIEWER } }, r);
+
+    expect(r.body.map((c) => c.id)).toEqual([1, 2]);
+  });
+});
diff --git a/backend/tests/api/messagingParticipantEscalation.test.mjs b/backend/tests/api/messagingParticipantEscalation.test.mjs
new file mode 100644
index 000000000..d12dbf84d
--- /dev/null
+++ b/backend/tests/api/messagingParticipantEscalation.test.mjs
@@ -0,0 +1,165 @@
+/**
+ * Wave 1 — participant-escalation regression suite
+ * ================================================
+ * The pre-push panel (DeepSeek v4 Flash and Qwen 3.8, independently; Sol also
+ * flagged the adminIds variant) found that the conversation scope validated the
+ * thread's EXISTING members but never req.body.participantIds. Because the
+ * membership test passes trivially when the only other member IS your assigned
+ * trainer, a relationship-only client could create a legitimate trainer thread
+ * and then add an arbitrary stranger to it, exposing message history — making
+ * the create-scope restriction bypassable in two steps.
+ *
+ * These are the regressions for that fix. Kept in their own file so the attack
+ * they encode stays legible.
+ *
+ * Original context
+ * ----------------
+ * Proves the fix for the P0 found by the client-dashboard hostile review:
+ * `requireTier('elite','trainer.messaging')` gated a COACHING capability on a
+ * BILLING tier, so a client on a training package (tier stays 'free' — no
+ * purchase controller writes `tier`) was 402'd out of contacting their trainer.
+ *
+ * Acceptance criteria under test (Fable ruling §4, slice 1):
+ *   AC1  free tier + active assignment  -> 200 on list / create / send
+ *   AC2  same user, unrelated recipient -> 403 OUTSIDE_COACHING_RELATIONSHIP
+ *   AC3  elite, no assignment           -> 200 community DMs (UNCHANGED)
+ *   AC4  free tier, no assignment       -> 402 everywhere (UNCHANGED)
+ *   AC5  live trial                     -> permitted (UNCHANGED, matches API)
+ *   AC6  assignment lookup throws       -> denied (FAIL CLOSED)
+ *
+ * The middleware is mounted on a bare express app; controllers are stubs.
+ * Only authorization wiring is under test.
+ */
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+import express from 'express';
+import request from 'supertest';
+
+const { queryMock, resolveEntitlementMock, gatingEnabledMock } = vi.hoisted(() => ({
+  queryMock: vi.fn(),
+  resolveEntitlementMock: vi.fn(),
+  gatingEnabledMock: vi.fn(() => true),
+}));
+
+vi.mock('../../database.mjs', () => ({
+  default: { query: queryMock },
+}));
+
+vi.mock('../../utils/logger.mjs', () => ({
+  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
+}));
+
+vi.mock('../../middleware/requireTier.mjs', () => ({
+  resolveCurrentEntitlement: resolveEntitlementMock,
+  isGatingEnabled: gatingEnabledMock,
+}));
+
+vi.mock('../../config/tierCatalog.mjs', () => ({
+  // Minimal ordering that mirrors the real catalog for the tiers we exercise.
+  meetsMinimumTier: (effective, minimum) => {
+    const rank = { free: 0, pro: 1, elite: 2, premium: 2 };
+    return (rank[effective] ?? 0) >= (rank[minimum] ?? 0);
+  },
+  tierDisplayName: (t) => t,
+  featureLabel: (k) => k,
+}));
+
+const { requireMessagingAccess, resolveMessagingCapabilities } =
+  await import('../../middleware/requireMessagingAccess.mjs');
+
+const CLIENT_ID = 501;
+const TRAINER_ID = 900;
+const STRANGER_ID = 777;
+
+/** `protect` stores req.user.id as a STRING — reproduce that faithfully. */
+function appWith(user, scope) {
+  const app = express();
+  app.use(express.json());
+  app.use((req, _res, next) => { req.user = user; next(); });
+  const mw = requireMessagingAccess({ scope });
+  if (scope === 'conversation') {
+    app.post('/conversations/:id/messages', mw, (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
+  } else if (scope === 'addParticipants') {
+    app.post('/conversations/:id/participants', requireMessagingAccess({ scope: 'conversation' }),
+      (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
+  } else if (scope === 'create') {
+    app.post('/conversations', mw, (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
+  } else {
+    app.get('/conversations', mw, (_req, res) => res.status(200).json({ ok: true }));
+  }
+  return app;
+}
+
+const freeClient = { id: String(CLIENT_ID), role: 'client' };
+
+/**
+ * Route the two SQL shapes this middleware issues.
+ * @param {number[]} counterparties assignment rows
+ * @param {number[]} participants   other participants of the conversation
+ */
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
+beforeEach(() => {
+  vi.clearAllMocks();
+  gatingEnabledMock.mockReturnValue(true);
+});
+
+describe('P0 — participants being ADDED are validated, not just existing members', () => {
+  // Found by the pre-push panel (DeepSeek v4 Flash + Qwen 3.8, independently).
+  // The membership check passes trivially when the thread's only other member IS
+  // the assigned trainer, so without validating req.body.participantIds the
+  // controller would add an arbitrary stranger and hand them the full history.
+  // This made the create-scope restriction bypassable in two steps: create a
+  // legitimate thread with your trainer, then add anyone to it.
+  beforeEach(() => {
+    resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+  });
+
+  it('403s adding a stranger to a legitimate trainer thread', async () => {
+    mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, TRAINER_ID] });
+    const res = await request(appWith(freeClient, 'addParticipants'))
+      .post('/conversations/42/participants').send({ participantIds: [STRANGER_ID] });
+    expect(res.status).toBe(403);
+    expect(res.body.code).toBe('OUTSIDE_COACHING_RELATIONSHIP');
+  });
+
+  it('403s when a stranger is smuggled in alongside an allowed counterparty', async () => {
+    mockSql({ counterparties: [TRAINER_ID, 901], participants: [CLIENT_ID, TRAINER_ID] });
+    const res = await request(appWith(freeClient, 'addParticipants'))
+      .post('/conversations/42/participants').send({ participantIds: [901, STRANGER_ID] });
+    expect(res.status).toBe(403);
+  });
+
+  it('allows adding a second assigned counterparty', async () => {
+    mockSql({ counterparties: [TRAINER_ID, 901], participants: [CLIENT_ID, TRAINER_ID] });
+    const res = await request(appWith(freeClient, 'addParticipants'))
+      .post('/conversations/42/participants').send({ participantIds: [901] });
+    expect(res.status).toBe(200);
+  });
+
+  it('still allows participant-free thread operations', async () => {
+    mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, TRAINER_ID] });
+    const res = await request(appWith(freeClient, 'conversation'))
+      .post('/conversations/42/messages').send({ content: 'hi' });
+    expect(res.status).toBe(200);
+  });
+
+  it('a subscriber is unaffected — community lane still adds anyone', async () => {
+    resolveEntitlementMock.mockResolvedValue({ actualTier: 'elite', effectiveTier: 'elite', isTrial: false });
+    mockSql({ counterparties: [] });
+    const res = await request(appWith(freeClient, 'addParticipants'))
+      .post('/conversations/42/participants').send({ participantIds: [STRANGER_ID] });
+    expect(res.status).toBe(200);
+  });
+});
diff --git a/backend/tests/api/messagingRelationshipLane.test.mjs b/backend/tests/api/messagingRelationshipLane.test.mjs
new file mode 100644
index 000000000..9cb2e815a
--- /dev/null
+++ b/backend/tests/api/messagingRelationshipLane.test.mjs
@@ -0,0 +1,280 @@
+/**
+ * Wave 1 Slice 1 — messaging relationship lane
+ * ============================================
+ * Proves the fix for the P0 found by the client-dashboard hostile review:
+ * `requireTier('elite','trainer.messaging')` gated a COACHING capability on a
+ * BILLING tier, so a client on a training package (tier stays 'free' — no
+ * purchase controller writes `tier`) was 402'd out of contacting their trainer.
+ *
+ * Acceptance criteria under test (Fable ruling §4, slice 1):
+ *   AC1  free tier + active assignment  -> 200 on list / create / send
+ *   AC2  same user, unrelated recipient -> 403 OUTSIDE_COACHING_RELATIONSHIP
+ *   AC3  elite, no assignment           -> 200 community DMs (UNCHANGED)
+ *   AC4  free tier, no assignment       -> 402 everywhere (UNCHANGED)
+ *   AC5  live trial                     -> permitted (UNCHANGED, matches API)
+ *   AC6  assignment lookup throws       -> denied (FAIL CLOSED)
+ *
+ * The middleware is mounted on a bare express app; controllers are stubs.
+ * Only authorization wiring is under test.
+ */
+import { beforeEach, describe, expect, it, vi } from 'vitest';
+import express from 'express';
+import request from 'supertest';
+
+const { queryMock, resolveEntitlementMock, gatingEnabledMock } = vi.hoisted(() => ({
+  queryMock: vi.fn(),
+  resolveEntitlementMock: vi.fn(),
+  gatingEnabledMock: vi.fn(() => true),
+}));
+
+vi.mock('../../database.mjs', () => ({
+  default: { query: queryMock },
+}));
+
+vi.mock('../../utils/logger.mjs', () => ({
+  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
+}));
+
+vi.mock('../../middleware/requireTier.mjs', () => ({
+  resolveCurrentEntitlement: resolveEntitlementMock,
+  isGatingEnabled: gatingEnabledMock,
+}));
+
+vi.mock('../../config/tierCatalog.mjs', () => ({
+  // Minimal ordering that mirrors the real catalog for the tiers we exercise.
+  meetsMinimumTier: (effective, minimum) => {
+    const rank = { free: 0, pro: 1, elite: 2, premium: 2 };
+    return (rank[effective] ?? 0) >= (rank[minimum] ?? 0);
+  },
+  tierDisplayName: (t) => t,
+  featureLabel: (k) => k,
+}));
+
+const { requireMessagingAccess, resolveMessagingCapabilities } =
+  await import('../../middleware/requireMessagingAccess.mjs');
+
+const CLIENT_ID = 501;
+const TRAINER_ID = 900;
+const STRANGER_ID = 777;
+
+/** `protect` stores req.user.id as a STRING — reproduce that faithfully. */
+function appWith(user, scope) {
+  const app = express();
+  app.use(express.json());
+  app.use((req, _res, next) => { req.user = user; next(); });
+  const mw = requireMessagingAccess({ scope });
+  if (scope === 'conversation') {
+    app.post('/conversations/:id/messages', mw, (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
+  } else if (scope === 'addParticipants') {
+    app.post('/conversations/:id/participants', requireMessagingAccess({ scope: 'conversation' }),
+      (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
+  } else if (scope === 'create') {
+    app.post('/conversations', mw, (req, res) => res.status(200).json({ ok: true, lane: req.messagingAccessLane }));
+  } else {
+    app.get('/conversations', mw, (_req, res) => res.status(200).json({ ok: true }));
+  }
+  return app;
+}
+
+const freeClient = { id: String(CLIENT_ID), role: 'client' };
+
+/**
+ * Route the two SQL shapes this middleware issues.
+ * @param {number[]} counterparties assignment rows
+ * @param {number[]} participants   other participants of the conversation
+ */
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
+beforeEach(() => {
+  vi.clearAllMocks();
+  gatingEnabledMock.mockReturnValue(true);
+});
+
+describe('requireMessagingAccess', () => {
+  describe('AC1 — free tier WITH an active assignment reaches the trainer', () => {
+    beforeEach(() => {
+      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+    });
+
+    it('allows listing conversations', async () => {
+      mockSql({ counterparties: [TRAINER_ID] });
+      const res = await request(appWith(freeClient, 'list')).get('/conversations');
+      expect(res.status).toBe(200);
+    });
+
+    it('allows creating a conversation with the assigned trainer', async () => {
+      mockSql({ counterparties: [TRAINER_ID] });
+      const res = await request(appWith(freeClient, 'create'))
+        .post('/conversations').send({ participantIds: [TRAINER_ID] });
+      expect(res.status).toBe(200);
+      expect(res.body.lane).toBe('relationship');
+    });
+
+    it('allows sending into a thread whose only other member is the trainer', async () => {
+      mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, TRAINER_ID] });
+      const res = await request(appWith(freeClient, 'conversation'))
+        .post('/conversations/42/messages').send({ content: 'my knee hurts' });
+      expect(res.status).toBe(200);
+      expect(res.body.lane).toBe('relationship');
+    });
+  });
+
+  describe('AC2 — the relationship lane does NOT open community DMs', () => {
+    beforeEach(() => {
+      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+    });
+
+    it('403s creating a conversation with an unrelated member', async () => {
+      mockSql({ counterparties: [TRAINER_ID] });
+      const res = await request(appWith(freeClient, 'create'))
+        .post('/conversations').send({ participantIds: [STRANGER_ID] });
+      expect(res.status).toBe(403);
+      expect(res.body.code).toBe('OUTSIDE_COACHING_RELATIONSHIP');
+    });
+
+    it('403s a group that mixes the trainer with an unrelated member', async () => {
+      mockSql({ counterparties: [TRAINER_ID] });
+      const res = await request(appWith(freeClient, 'create'))
+        .post('/conversations').send({ participantIds: [TRAINER_ID, STRANGER_ID] });
+      expect(res.status).toBe(403);
+    });
+
+    it('403s sending into a thread containing an unrelated member', async () => {
+      mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID, STRANGER_ID] });
+      const res = await request(appWith(freeClient, 'conversation'))
+        .post('/conversations/42/messages').send({ content: 'hi' });
+      expect(res.status).toBe(403);
+    });
+  });
+
+  describe('AC3 — elite with NO assignment keeps full community messaging', () => {
+    it('allows an unrelated recipient and never queries assignments', async () => {
+      resolveEntitlementMock.mockResolvedValue({ actualTier: 'elite', effectiveTier: 'elite', isTrial: false });
+      mockSql({ counterparties: [] });
+      const res = await request(appWith({ id: '601', role: 'client' }, 'create'))
+        .post('/conversations').send({ participantIds: [STRANGER_ID] });
+      expect(res.status).toBe(200);
+      expect(queryMock).not.toHaveBeenCalled();
+    });
+  });
+
+  describe('AC4 — free tier with NO assignment is still gated', () => {
+    it('402s with the requireTier-compatible payload', async () => {
+      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+      mockSql({ counterparties: [] });
+      const res = await request(appWith(freeClient, 'list')).get('/conversations');
+      expect(res.status).toBe(402);
+      expect(res.body.code).toBe('TIER_REQUIRED');
+      expect(res.body.upgradeUrl).toBe('/ascension');
+    });
+  });
+
+  describe('AC5 — a live trial is permitted, unchanged', () => {
+    it('allows community DMs on the elite-equivalent effective tier', async () => {
+      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'elite', isTrial: true });
+      mockSql({ counterparties: [] });
+      const res = await request(appWith(freeClient, 'create'))
+        .post('/conversations').send({ participantIds: [STRANGER_ID] });
+      expect(res.status).toBe(200);
+    });
+  });
+
+  describe('AC6 — fail closed', () => {
+    beforeEach(() => {
+      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+    });
+
+    it('denies when the assignment lookup throws', async () => {
+      mockSql({ throwOn: 'assignments' });
+      const res = await request(appWith(freeClient, 'list')).get('/conversations');
+      expect(res.status).toBe(402);
+    });
+
+    it('denies when the participant lookup throws', async () => {
+      mockSql({ counterparties: [TRAINER_ID], throwOn: 'participants' });
+      const res = await request(appWith(freeClient, 'conversation'))
+        .post('/conversations/42/messages').send({ content: 'hi' });
+      expect(res.status).toBe(403);
+    });
+
+    it('denies a thread the actor is NOT a member of, even if the only other member is their trainer', async () => {
+      // Self-hostile-review finding: without an explicit membership check, a
+      // conversation containing only the assigned trainer satisfies the subset
+      // test while the actor is not in the thread at all.
+      mockSql({ counterparties: [TRAINER_ID], participants: [TRAINER_ID] });
+      const res = await request(appWith(freeClient, 'conversation'))
+        .post('/conversations/42/messages').send({ content: 'hi' });
+      expect(res.status).toBe(403);
+      expect(res.body.code).toBe('OUTSIDE_COACHING_RELATIONSHIP');
+    });
+
+    it('denies a trainer-to-other-client thread the actor is not in', async () => {
+      mockSql({ counterparties: [TRAINER_ID], participants: [TRAINER_ID, STRANGER_ID] });
+      const res = await request(appWith(freeClient, 'conversation'))
+        .post('/conversations/42/messages').send({ content: 'hi' });
+      expect(res.status).toBe(403);
+    });
+
+    it('denies a thread with no resolvable other participants', async () => {
+      mockSql({ counterparties: [TRAINER_ID], participants: [CLIENT_ID] });
+      const res = await request(appWith(freeClient, 'conversation'))
+        .post('/conversations/42/messages').send({ content: 'hi' });
+      expect(res.status).toBe(403);
+    });
+  });
+
+  describe('preserved behavior', () => {
+    it('staff bypass short-circuits before any entitlement or SQL work', async () => {
+      const res = await request(appWith({ id: '900', role: 'trainer' }, 'create'))
+        .post('/conversations').send({ participantIds: [STRANGER_ID] });
+      expect(res.status).toBe(200);
+      expect(resolveEntitlementMock).not.toHaveBeenCalled();
+      expect(queryMock).not.toHaveBeenCalled();
+    });
+
+    it('the TIER_GATING_ENABLED kill switch still opens everything', async () => {
+      gatingEnabledMock.mockReturnValue(false);
+      const res = await request(appWith(freeClient, 'create'))
+        .post('/conversations').send({ participantIds: [STRANGER_ID] });
+      expect(res.status).toBe(200);
+      expect(queryMock).not.toHaveBeenCalled();
+    });
+
+    it('unauthenticated requests 401 before any lookup', async () => {
+      const app = express();
+      app.use(express.json());
+      app.use((req, _res, next) => { req.user = undefined; next(); });
+      app.get('/conversations', requireMessagingAccess({ scope: 'list' }), (_r, res) => res.json({ ok: true }));
+      const res = await request(app).get('/conversations');
+      expect(res.status).toBe(401);
+    });
+  });
+
+  describe('string/number id safety', () => {
+    it('matches a counterparty returned as a string against a string req.user.id', async () => {
+      resolveEntitlementMock.mockResolvedValue({ actualTier: 'free', effectiveTier: 'free', isTrial: false });
+      queryMock.mockImplementation(async (sql) => {
+        if (sql.includes('client_trainer_assignments')) return [{ counterparty: String(TRAINER_ID) }];
+        if (sql.includes('conversation_participants')) {
+          return [{ userId: String(CLIENT_ID) }, { userId: String(TRAINER_ID) }];
+        }
+        return [];
+      });
+      const res = await request(appWith(freeClient, 'conversation'))
+        .post('/conversations/42/messages').send({ content: 'hi' });
+      expect(res.status).toBe(200);
+    });
+  });
+});
diff --git a/backend/tests/unit/deIdentifierGatedHealthFields.test.mjs b/backend/tests/unit/deIdentifierGatedHealthFields.test.mjs
new file mode 100644
index 000000000..b1456bc53
--- /dev/null
+++ b/backend/tests/unit/deIdentifierGatedHealthFields.test.mjs
@@ -0,0 +1,252 @@
+/**
+ * Wave 1 Slice 5 — gated non-training health fields
+ * =================================================
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
+describe('gated non-training health fields', () => {
+  it('is default-OFF so the gate applies without configuration', () => {
+    expect(areGatedHealthFieldsEnabled()).toBe(false);
+  });
+
+  it('withholds supplements, sleep and stress by default', () => {
+    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });
+
+    expect(deIdentified.health.supplements).toBeUndefined();
+    expect(deIdentified.health.sleep).toBeUndefined();
+    expect(deIdentified.lifestyle?.sleepHours).toBeUndefined();
+    expect(deIdentified.health.stress).toBeUndefined();
+    expect(deIdentified.lifestyle?.stressLevel).toBeUndefined();
+    expect(deIdentified.lifestyle?.sleepQuality).toBeUndefined();
+  });
+
+  it('logs the withheld FIELD NAME only, never the value', () => {
+    deIdentify(fullClientPayload(), { clientId: 501 });
+
+    const calls = logger.info.mock.calls.filter(
+      ([msg]) => typeof msg === 'string' && msg.includes('gated health field withheld'),
+    );
+    expect(calls.length).toBeGreaterThan(0);
+    for (const [, meta] of calls) {
+      expect(Object.keys(meta)).toEqual(['field']);
+      expect(JSON.stringify(meta)).not.toMatch(/hypertension|creatine|high|poor/i);
+    }
+  });
+
+  it('forwards the gated set when counsel has signed off and the flag is on', () => {
+    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
+    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = GATED_FIELDS_REQUIRE_CONSENT_VERSION;
+    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });
+
+    expect(deIdentified.health.supplements).toEqual(['creatine']);
+  });
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
+describe('pre-existing protections still hold', () => {
+  it('still strips direct identifiers, medications and surgeries', () => {
+    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });
+
+    expect(deIdentified.client.name).toBe('Client #501');
+    expect(deIdentified.client.contact).toBeUndefined();
+    expect(deIdentified.health.medications).toBeUndefined();
+    expect(deIdentified.health.surgeries).toBeUndefined();
+    expect(deIdentified.lifestyle?.occupation).toBeUndefined();
+  });
+
+  it('leaves training context intact so the fail-closed check still passes', () => {
+    const result = deIdentify(fullClientPayload(), { clientId: 501 });
+    expect(result).not.toBeNull();
+    expect(result.deIdentified.training).toEqual({ level: 'intermediate', daysPerWeek: 3 });
+    expect(result.deIdentified.client.goals).toEqual(['build lower-body strength']);
+  });
+
+  it('records gated removals in strippedFields for the audit trail', () => {
+    const { strippedFields } = deIdentify(fullClientPayload(), { clientId: 501 });
+    expect(strippedFields).toContain('health.supplements');
+    expect(strippedFields).toContain('lifestyle.sleepQuality');
+  });
+});
+
+describe('category gating covers unlisted field spellings', () => {
+  // GLM 5.3, pre-push panel: the consent copy makes a CATEGORY claim while the
+  // first implementation enumerated PATHS. An unlisted variant would flow while
+  // the copy said it did not — the same drift class that let
+  // health.medicalConditions slip through earlier in this wave. Matching on key
+  // NAME at any depth is what actually keeps the category claim true.
+  it('strips sleep/stress/supplement keys the original path list never named', () => {
+    const { deIdentified } = deIdentify({
+      client: { id: 501, goals: ['x'] },
+      training: { level: 'intermediate' },
+      clientProfile: { sleep: 'poor', stress: 'high', supplements: ['zma'] },
+      wellness: { sleepQuality: 'bad', stressLevel: 9 },
+      health: { sleepHours: 4, stressScore: 8, supplementStack: ['creatine'] },
+      recovery: { nested: { sleepDebtHours: 12 } },
+    }, { clientId: 501 });
+
+    expect(deIdentified.clientProfile.sleep).toBeUndefined();
+    expect(deIdentified.clientProfile.stress).toBeUndefined();
+    expect(deIdentified.clientProfile.supplements).toBeUndefined();
+    expect(deIdentified.wellness.sleepQuality).toBeUndefined();
+    expect(deIdentified.wellness.stressLevel).toBeUndefined();
+    expect(deIdentified.health.sleepHours).toBeUndefined();
+    expect(deIdentified.health.stressScore).toBeUndefined();
+    expect(deIdentified.health.supplementStack).toBeUndefined();
+    expect(deIdentified.recovery.nested.sleepDebtHours).toBeUndefined();
+  });
+
+  it('never lets the category matcher eat training-safety data', () => {
+    const { deIdentified } = deIdentify({
+      client: { id: 501, goals: ['x'] },
+      training: { level: 'intermediate' },
+      health: {
+        injuries: ['left knee'],
+        currentPain: 7,
+        conditions: ['asthma'],
+        medicalConditions: ['hypertension'],
+      },
+      measurements: { weightKg: 82 },
+      painAndInjuries: [{ area: 'knee' }],
+    }, { clientId: 501 });
+
+    expect(deIdentified.health.injuries).toEqual(['left knee']);
+    expect(deIdentified.health.currentPain).toBe(7);
+    expect(deIdentified.health.conditions).toEqual(['asthma']);
+    expect(deIdentified.health.medicalConditions).toEqual(['hypertension']);
+    expect(deIdentified.measurements).toEqual({ weightKg: 82 });
+    expect(deIdentified.painAndInjuries).toEqual([{ area: 'knee' }]);
+  });
+});
+
+describe('the escape hatch is a control, not a caution', () => {
+  // DeepSeek v4 Pro, pre-push panel: a bare env flag plus a comment saying
+  // "bump the consent version first" is advisory. An operator flipping it in
+  // production would have made every consent surface false instantly. The
+  // coupling is now enforced, and the failure mode is fail-CLOSED.
+  it('stays closed when the flag is set but no consent version is declared', () => {
+    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
+    expect(areGatedHealthFieldsEnabled()).toBe(false);
+    const { deIdentified } = deIdentify(fullClientPayload(), { clientId: 501 });
+    expect(deIdentified.health.supplements).toBeUndefined();
+  });
+
+  it('stays closed when the declared consent version is the wrong one', () => {
+    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
+    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = '2.0';
+    expect(areGatedHealthFieldsEnabled()).toBe(false);
+  });
+
+  it('logs critical rather than failing silently', () => {
+    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
+    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = '2.0';
+    areGatedHealthFieldsEnabled();
+    expect(logger.error).toHaveBeenCalled();
+  });
+
+  it('opens only when the declared version matches what this build requires', () => {
+    process.env.COACH_HEALTH_FIELDS_ENABLED = 'true';
+    process.env.COACH_HEALTH_FIELDS_CONSENT_VERSION = GATED_FIELDS_REQUIRE_CONSENT_VERSION;
+    expect(areGatedHealthFieldsEnabled()).toBe(true);
+  });
+
+  it('requires a consent version NEWER than the one currently shipped', () => {
+    // Enabling must not be possible under the disclosure users already saw.
+    expect(GATED_FIELDS_REQUIRE_CONSENT_VERSION).not.toBe('2.0');
+  });
+});
diff --git a/frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx b/frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx
index c71addc47..23138c6fe 100644
--- a/frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx
+++ b/frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx
@@ -14,6 +14,11 @@ import React, { useState, useEffect, useCallback } from 'react';
 import styled, { keyframes } from 'styled-components';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Shield, ShieldCheck, ShieldOff, Brain, Lock, Eye, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
+import {
+  AI_CONSENT_DISCLOSURE,
+  AI_CONSENT_RECONSENT_PROMPT,
+  AI_CONSENT_VERSION,
+} from '../../../../content/aiConsentCopy';
 import {
   getConsentStatus,
   grantConsent,
@@ -21,6 +26,22 @@ import {
   type ConsentStatusResponse,
 } from '../../../../services/aiConsentService';
 
+const ReconsentNotice = styled.div`
+  display: flex;
+  gap: 12px;
+  align-items: flex-start;
+  margin: 16px 0;
+  padding: 14px 16px;
+  border-radius: 10px;
+  border: 1px solid var(--warning-border, rgba(198, 168, 75, 0.4));
+  background: var(--warning-surface, rgba(198, 168, 75, 0.1));
+  color: var(--text-primary, #E0ECF4);
+  font-size: 0.9375rem;
+  line-height: 1.55;
+
+  svg { color: var(--warning-accent, #C6A84B); flex-shrink: 0; margin-top: 2px; }
+`;
+
 // ── Animations ──────────────────────────────────────────────────────────────
 
 const coachPulse = keyframes`
@@ -457,7 +478,11 @@ const AiConsentScreen: React.FC = () => {
     try {
       setActionLoading(true);
       setError(null);
-      await grantConsent();
+      // Record the version of the disclosure the user actually read. Without
+      // this the backend defaults to its own CURRENT, so a grant against the
+      // corrected v2.0 text would have been stored indistinguishably from a
+      // v1.0 grant -- defeating the point of correcting the copy.
+      await grantConsent(AI_CONSENT_VERSION);
       await fetchStatus();
       showToast('Swan Coach consent granted successfully.');
     } catch (err: unknown) {
@@ -494,6 +519,14 @@ const AiConsentScreen: React.FC = () => {
 
   const consentState = getConsentState();
 
+  // Owner decision Q5: v1.0 consents were captured under a description that
+  // overstated anonymity, so they are re-prompted rather than silently carried
+  // forward. Detection is a version comparison against the stored grant.
+  const needsReconsent =
+    consentState === 'granted'
+    && !!status?.profile?.consentVersion
+    && status.profile.consentVersion !== AI_CONSENT_VERSION;
+
   const formatDate = (dateStr: string | null | undefined): string => {
     if (!dateStr) return '—';
     return new Date(dateStr).toLocaleDateString('en-US', {
@@ -585,6 +618,13 @@ const AiConsentScreen: React.FC = () => {
           </StatusBadge>
         </StatusRow>
 
+        {needsReconsent && (
+          <ReconsentNotice role="status">
+            <AlertTriangle size={18} />
+            <div>{AI_CONSENT_RECONSENT_PROMPT}</div>
+          </ReconsentNotice>
+        )}
+
         {status?.profile && (
           <MetaGrid>
             <MetaItem>
@@ -648,7 +688,7 @@ const AiConsentScreen: React.FC = () => {
           </PrivacyItem>
           <PrivacyItem>
             <PrivacyIcon $color="#10b981"><Eye size={18} /></PrivacyIcon>
-            <div><strong>Training data only.</strong> Only fitness-relevant information (goals, measurements, exercise preferences, injury history) is shared. Medical details like medications, surgeries, and occupation are never sent.</div>
+            <div><strong>What is shared.</strong> Training-relevant information only — goals, fitness level, measurements, training history, exercise preferences, injury and pain history, and medical conditions that affect exercise, so Swan Coach can avoid programming that could hurt you. Medications, surgeries, occupation, date of birth, insurance details, supplements, sleep, and stress data are never sent.</div>
           </PrivacyItem>
           <PrivacyItem>
             <PrivacyIcon $color="#10b981"><Lock size={18} /></PrivacyIcon>
@@ -656,7 +696,7 @@ const AiConsentScreen: React.FC = () => {
           </PrivacyItem>
           <PrivacyItem>
             <PrivacyIcon $color="#10b981"><ShieldCheck size={18} /></PrivacyIcon>
-            <div><strong>Your identity is hidden.</strong> Swan Coach only knows you by an anonymous client ID — your real name and personal details stay private.</div>
+            <div><strong>Pseudonymized, not anonymous.</strong> Swan Coach knows you by a stable client ID rather than your name. Because that ID stays the same across sessions, this is de-identification — not full anonymity.</div>
           </PrivacyItem>
         </PrivacyList>
       </Card>
@@ -665,18 +705,9 @@ const AiConsentScreen: React.FC = () => {
       <ConsentDisclosure>
         <ConsentDisclosureTitle>
           <Shield size={18} />
-          Consent Disclosure (v1.0)
+          Consent Disclosure (v{AI_CONSENT_VERSION})
         </ConsentDisclosureTitle>
-        By granting consent, you agree that SwanStudios may process your de-identified fitness profile
-        through a Swan Coach provider to generate personalized workout plans. Your personal
-        identifiers (name, email, phone, medical details) are never shared with the Swan Coach provider. Only
-        fitness-relevant data — goals, measurements, training preferences, and safety-critical information
-        (injuries, medical conditions) — is used, and only after stripping all identifying information.
-        <br /><br />
-        You may withdraw consent at any time. Withdrawal immediately disables all Swan Coach features.
-        Previously generated workout plans remain in your account but no new Swan Coach requests will be made.
-        <br /><br />
-        This consent applies to Swan Coach workout generation (Consent Version 1.0).
+        {AI_CONSENT_DISCLOSURE}
       </ConsentDisclosure>
 
       {/* Action Buttons */}
diff --git a/frontend/src/components/DashBoard/Pages/client-dashboard/ClientStellarSidebar.tsx b/frontend/src/components/DashBoard/Pages/client-dashboard/ClientStellarSidebar.tsx
index 709de75d3..6d435dca0 100644
--- a/frontend/src/components/DashBoard/Pages/client-dashboard/ClientStellarSidebar.tsx
+++ b/frontend/src/components/DashBoard/Pages/client-dashboard/ClientStellarSidebar.tsx
@@ -46,6 +46,7 @@ import { isNonDeductingClientSource } from '../../workspaces/clients-team/client
 import { resolveBrandIdentity } from '../../../../services/pdf/brandIdentity';
 import { CANONICAL_SURFACES } from '../../../../config/canonical-surface-names';
 import { StyledBox } from '@/components/ui/StyledBox';
+import { useFocusTrap } from '../../../../hooks/useFocusTrap';
 
 // ─────────────────────────────────────────────────────────────
 // SECTION: Animations
@@ -141,14 +142,15 @@ const ClientStellarSidebar: React.FC<ClientStellarSidebarProps> = ({
     return () => document.body.classList.remove('mobile-sidebar-open');
   }, [isMobileOpen, isMobile]);
 
-  useEffect(() => {
-    if (!isMobileOpen) return;
-    const onKey = (e: KeyboardEvent) => {
-      if (e.key === 'Escape' && onToggleMobile) onToggleMobile();
-    };
-    document.addEventListener('keydown', onKey);
-    return () => document.removeEventListener('keydown', onKey);
-  }, [isMobileOpen, onToggleMobile]);
+  // Escape + Tab containment + initial focus + focus restore. Previously this
+  // was Escape only, so a keyboard user could Tab straight out of the open
+  // drawer into the page behind it and had no way back. Scroll-lock stays in
+  // the effect above; the hook deliberately does not own it.
+  const handleEscape = useCallback(() => {
+    if (onToggleMobile) onToggleMobile();
+  }, [onToggleMobile]);
+
+  useFocusTrap(sidebarRef, isMobileOpen && isMobile, { onEscape: handleEscape });
 
   const handleNav = useCallback((route: string) => {
     navigate(route);
@@ -189,8 +191,10 @@ const ClientStellarSidebar: React.FC<ClientStellarSidebarProps> = ({
         ref={sidebarRef}
         $collapsed={collapsed}
         $mobileOpen={isMobileOpen}
-        role="navigation"
+        role={isMobile && isMobileOpen ? 'dialog' : 'navigation'}
+        aria-modal={isMobile && isMobileOpen ? true : undefined}
         aria-label="Client navigation"
+        tabIndex={-1}
       >
         <SidebarHeader $collapsed={collapsed}>
           <LogoBrand>
diff --git a/frontend/src/components/Social/Messaging/MessagingView.composeTo.test.tsx b/frontend/src/components/Social/Messaging/MessagingView.composeTo.test.tsx
index e7e70a7c0..b1798f3ce 100644
--- a/frontend/src/components/Social/Messaging/MessagingView.composeTo.test.tsx
+++ b/frontend/src/components/Social/Messaging/MessagingView.composeTo.test.tsx
@@ -46,6 +46,22 @@ vi.mock('react-redux', () => ({ useSelector: () => null }));
 vi.mock('../../../context/AuthContext', () => ({
   useAuth: () => ({ user: { id: 7, role: 'admin' } }),
 }));
+// 2026-08-22 (Wave 1 Slice 2) — RE-ANCHORED. MessagingView no longer computes
+// entitlement from useSubscription; it reads server-issued capabilities. The
+// old stub returned isElite:false, which under the new wiring left the view
+// permanently in its loading branch and the composeTo effect never ran. This
+// stub grants access so these tests stay about ?composeTo= handling, which is
+// their actual subject. Access itself is covered by
+// useMessaging.capabilities.test.tsx and messagingRelationshipLane.test.mjs.
+vi.mock('./useMessagingCapabilities', () => ({
+  useMessagingCapabilities: () => ({
+    capabilities: { canMessageAssignedCoach: true, canUseCommunityDirectMessages: true },
+    loading: false,
+    error: null,
+    refresh: vi.fn(),
+  }),
+}));
+
 vi.mock('../../../hooks/useSubscription', () => ({
   useSubscription: () => ({ isElite: false, loading: false }),
 }));
diff --git a/frontend/src/components/Social/Messaging/MessagingView.tsx b/frontend/src/components/Social/Messaging/MessagingView.tsx
index 13be04895..d6db31ca8 100644
--- a/frontend/src/components/Social/Messaging/MessagingView.tsx
+++ b/frontend/src/components/Social/Messaging/MessagingView.tsx
@@ -7,7 +7,7 @@ import { useSearchParams } from 'react-router-dom';
 import { useSelector } from 'react-redux';
 import styled from 'styled-components';
 import { useAuth } from '../../../context/AuthContext';
-import { useSubscription } from '../../../hooks/useSubscription';
+import { useMessagingCapabilities } from './useMessagingCapabilities';
 import { MessagingContainer } from './MessagingStyles';
 import ConversationListPanel from './ConversationListPanel';
 import MessageThread from './MessageThread';
@@ -23,11 +23,15 @@ const MessagingView: React.FC = () => {
 
   const reduxUser = useSelector((state: any) => state.auth?.user || state.user?.user);
   const { user: authUser } = useAuth();
-  const { isElite, loading: subscriptionLoading } = useSubscription();
   const user = authUser || reduxUser;
   const currentUserId = user?.id || null;
-  const isStaffRole = user?.role === 'admin' || user?.role === 'trainer';
-  const messagingEnabled = isStaffRole || isElite;
+  // Server truth, not a local recomputation. The previous expression tested a
+  // subscription tier as a stand-in for a coaching relationship and disagreed
+  // with the API in both directions — see useMessagingCapabilities for the
+  // full account. A guard in useMessaging.tierGate.test.ts prevents that
+  // expression from being reintroduced, so do not name it here verbatim.
+  const { capabilities, loading: capabilitiesLoading } = useMessagingCapabilities(!!currentUserId);
+  const messagingEnabled = capabilities.canMessageAssignedCoach;
 
   const {
     conversations,
@@ -52,7 +56,7 @@ const MessagingView: React.FC = () => {
     emitTyping,
     dismissError,
     pendingMessages,
-  } = useMessaging(currentUserId, { enabled: messagingEnabled && !subscriptionLoading });
+  } = useMessaging(currentUserId, { enabled: messagingEnabled && !capabilitiesLoading });
 
 
   // Auto-start or switch to conversation if ?composeTo= is in the URL
@@ -99,7 +103,7 @@ const MessagingView: React.FC = () => {
     await createConversation(request);
   }, [createConversation]);
 
-  if (!currentUserId || (subscriptionLoading && !isStaffRole)) {
+  if (!currentUserId || capabilitiesLoading) {
     return (
       <MessagingShell>
         <MessagingContainer>
@@ -113,7 +117,10 @@ const MessagingView: React.FC = () => {
     return (
       <MessagingShell>
         <MessagingContainer>
-          <CenteredMessage>SwanStudios messaging is available with Crystalline Swan access.</CenteredMessage>
+          <CenteredMessage>
+            Messaging opens up when you have an active trainer, or with
+            Crystalline Swan access for member-to-member chat.
+          </CenteredMessage>
         </MessagingContainer>
       </MessagingShell>
     );
diff --git a/frontend/src/components/Social/Messaging/useMessaging.capabilities.test.tsx b/frontend/src/components/Social/Messaging/useMessaging.capabilities.test.tsx
new file mode 100644
index 000000000..ad7f872d7
--- /dev/null
+++ b/frontend/src/components/Social/Messaging/useMessaging.capabilities.test.tsx
@@ -0,0 +1,100 @@
+/**
+ * Wave 1 Slice 2 — messaging capabilities come from the server
+ * ============================================================
+ * Behavioral coverage for the decision the retired tier-gate string assertion
+ * used to freeze. The defect it froze: `isElite` is a SUBSCRIPTION tier used as
+ * a stand-in for a COACHING relationship, so a client on a training package
+ * (tier stays 'free' — no purchase controller writes it) was walled off from
+ * the trainer they pay, while a live trial was allowed by the API and blocked
+ * by the UI.
+ *
+ * These tests assert the two lanes and the fail-closed default.
+ */
+import { describe, expect, it, vi, beforeEach } from 'vitest';
+import { renderHook, waitFor } from '@testing-library/react';
+
+const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));
+
+vi.mock('../../../services/api.service', () => ({
+  default: { get: getMock, post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
+}));
+
+const { useMessagingCapabilities } = await import('./useMessagingCapabilities');
+
+beforeEach(() => { vi.clearAllMocks(); });
+
+describe('useMessagingCapabilities', () => {
+  it('grants the coach thread to a free-tier client with an active trainer', async () => {
+    getMock.mockResolvedValue({
+      data: { success: true, canMessageAssignedCoach: true, canUseCommunityDirectMessages: false },
+    });
+
+    const { result } = renderHook(() => useMessagingCapabilities(true));
+    await waitFor(() => expect(result.current.loading).toBe(false));
+
+    // The whole point of the slice: reachable trainer, no subscription.
+    expect(result.current.capabilities.canMessageAssignedCoach).toBe(true);
+    // And the monetization rule for member-to-member chat is untouched.
+    expect(result.current.capabilities.canUseCommunityDirectMessages).toBe(false);
+    expect(getMock).toHaveBeenCalledWith('/api/messaging/capabilities');
+  });
+
+  it('grants both lanes to a subscriber', async () => {
+    getMock.mockResolvedValue({
+      data: { success: true, canMessageAssignedCoach: true, canUseCommunityDirectMessages: true },
+    });
+
+    const { result } = renderHook(() => useMessagingCapabilities(true));
+    await waitFor(() => expect(result.current.loading).toBe(false));
+
+    expect(result.current.capabilities).toEqual({
+      canMessageAssignedCoach: true,
+      canUseCommunityDirectMessages: true,
+    });
+  });
+
+  it('denies both lanes for a user with neither a trainer nor a subscription', async () => {
+    getMock.mockResolvedValue({
+      data: { success: true, canMessageAssignedCoach: false, canUseCommunityDirectMessages: false },
+    });
+
+    const { result } = renderHook(() => useMessagingCapabilities(true));
+    await waitFor(() => expect(result.current.loading).toBe(false));
+
+    expect(result.current.capabilities.canMessageAssignedCoach).toBe(false);
+  });
+
+  it('fails closed when the request errors', async () => {
+    getMock.mockRejectedValue(new Error('network down'));
+
+    const { result } = renderHook(() => useMessagingCapabilities(true));
+    await waitFor(() => expect(result.current.loading).toBe(false));
+
+    expect(result.current.capabilities).toEqual({
+      canMessageAssignedCoach: false,
+      canUseCommunityDirectMessages: false,
+    });
+    expect(result.current.error).toBeTruthy();
+  });
+
+  it('treats a truthy-but-not-true payload as denied', async () => {
+    // A shape change upstream must not be read as permission.
+    getMock.mockResolvedValue({
+      data: { canMessageAssignedCoach: 'yes', canUseCommunityDirectMessages: 1 },
+    });
+
+    const { result } = renderHook(() => useMessagingCapabilities(true));
+    await waitFor(() => expect(result.current.loading).toBe(false));
+
+    expect(result.current.capabilities.canMessageAssignedCoach).toBe(false);
+    expect(result.current.capabilities.canUseCommunityDirectMessages).toBe(false);
+  });
+
+  it('does not call the API when disabled', async () => {
+    const { result } = renderHook(() => useMessagingCapabilities(false));
+    await waitFor(() => expect(result.current.loading).toBe(false));
+
+    expect(getMock).not.toHaveBeenCalled();
+    expect(result.current.capabilities.canMessageAssignedCoach).toBe(false);
+  });
+});
diff --git a/frontend/src/components/Social/Messaging/useMessaging.tierGate.test.ts b/frontend/src/components/Social/Messaging/useMessaging.tierGate.test.ts
index 773349976..4cb8c1616 100644
--- a/frontend/src/components/Social/Messaging/useMessaging.tierGate.test.ts
+++ b/frontend/src/components/Social/Messaging/useMessaging.tierGate.test.ts
@@ -32,7 +32,7 @@ vi.mock('../../../hooks/useSocket', () => ({
 
 const source = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');
 
-describe('useMessaging tier gate', () => {
+describe('useMessaging access gate', () => {
   beforeEach(() => {
     Object.values(apiServiceMocks).forEach((mock) => mock.mockReset());
     socketMocks.emit.mockClear();
@@ -50,11 +50,29 @@ describe('useMessaging tier gate', () => {
     expect(socketMocks.emit).not.toHaveBeenCalled();
   });
 
-  it('passes the page-level tier decision into the live messaging hook', () => {
+  it('passes the page-level access decision into the live messaging hook', () => {
+    // 2026-08-22 (Wave 1 Slice 2) — RE-ANCHORED, not relaxed.
+    //
+    // This previously pinned the literal string
+    //   `const messagingEnabled = isStaffRole || isElite;`
+    // which froze the defect: `isElite` is a SUBSCRIPTION tier standing in for
+    // a COACHING relationship, so clients on training packages (tier stays
+    // 'free') were walled off from their trainer, while live trials were
+    // allowed by the API and blocked by the UI.
+    //
+    // The invariant this test actually exists to protect is the WIRING: the
+    // page-level decision must flow into useMessaging rather than the hook
+    // deciding for itself. That invariant is asserted below, now against the
+    // server-issued capability. Behavioral coverage of the decision itself is
+    // in useMessaging.capabilities.test.tsx and, server-side, in
+    // backend/tests/api/messagingRelationshipLane.test.mjs.
     const messagingViewSource = source('./MessagingView.tsx');
 
-    expect(messagingViewSource).toContain('const messagingEnabled = isStaffRole || isElite;');
-    expect(messagingViewSource).toContain('useMessaging(currentUserId, { enabled: messagingEnabled && !subscriptionLoading })');
+    expect(messagingViewSource).toContain('const messagingEnabled = capabilities.canMessageAssignedCoach;');
+    expect(messagingViewSource).toContain('useMessaging(currentUserId, { enabled: messagingEnabled && !capabilitiesLoading })');
+    // The frontend must not recompute entitlement locally ever again.
+    expect(messagingViewSource).not.toContain('isStaffRole || isElite');
+    expect(messagingViewSource).not.toContain("from '../../../hooks/useSubscription'");
   });
 
   it('returns raw live search arrays from the mounted hook as visible users', async () => {
diff --git a/frontend/src/components/Social/Messaging/useMessagingCapabilities.ts b/frontend/src/components/Social/Messaging/useMessagingCapabilities.ts
new file mode 100644
index 000000000..46a6e58e5
--- /dev/null
+++ b/frontend/src/components/Social/Messaging/useMessagingCapabilities.ts
@@ -0,0 +1,73 @@
+/**
+ * FILE: useMessagingCapabilities.ts
+ * PURPOSE: Read messaging access from the server instead of recomputing it.
+ * CREATED: 2026-08-22 · Wave 1 Slice 2 (client-dashboard remediation)
+ *
+ * WHY THIS EXISTS
+ * MessagingView computed `isStaffRole || isElite` locally. That expression is a
+ * SUBSCRIPTION test standing in for a COACHING relationship, and it disagreed
+ * with the server in both directions:
+ *
+ *   - a client on a training package has tier 'free' (no purchase controller
+ *     writes `tier`), so the UI hid messaging from the people paying most;
+ *   - `requireTier` treats a live trial as elite-equivalent, but the local
+ *     expression excluded `isTrial`, so trials were allowed by the API and
+ *     blocked by the UI.
+ *
+ * Two oracles will always drift. There is now one: the server. This hook reads
+ * `GET /api/messaging/capabilities`, which is computed by the same code that
+ * enforces the gate.
+ *
+ * FAIL-CLOSED: on error, both capabilities are false. A user who should have
+ * access sees the upsell rather than a broken composer, and the API would have
+ * refused the write anyway.
+ */
+import { useCallback, useEffect, useState } from 'react';
+import apiService from '../../../services/api.service';
+
+export interface MessagingCapabilities {
+  /** Reach the assigned trainer. True via relationship OR community access. */
+  canMessageAssignedCoach: boolean;
+  /** Message other members. Subscription-gated; unchanged monetization rule. */
+  canUseCommunityDirectMessages: boolean;
+}
+
+const DENY_ALL: MessagingCapabilities = {
+  canMessageAssignedCoach: false,
+  canUseCommunityDirectMessages: false,
+};
+
+export function useMessagingCapabilities(enabled: boolean = true) {
+  const [capabilities, setCapabilities] = useState<MessagingCapabilities>(DENY_ALL);
+  const [loading, setLoading] = useState<boolean>(enabled);
+  const [error, setError] = useState<string | null>(null);
+
+  const load = useCallback(async () => {
+    if (!enabled) {
+      setCapabilities(DENY_ALL);
+      setLoading(false);
+      return;
+    }
+    setLoading(true);
+    try {
+      const response = await apiService.get('/api/messaging/capabilities');
+      const data = response?.data ?? {};
+      setCapabilities({
+        canMessageAssignedCoach: data.canMessageAssignedCoach === true,
+        canUseCommunityDirectMessages: data.canUseCommunityDirectMessages === true,
+      });
+      setError(null);
+    } catch (err: any) {
+      setCapabilities(DENY_ALL);
+      setError(err?.message || 'Could not load messaging access.');
+    } finally {
+      setLoading(false);
+    }
+  }, [enabled]);
+
+  useEffect(() => { load(); }, [load]);
+
+  return { capabilities, loading, error, refresh: load };
+}
+
+export default useMessagingCapabilities;
diff --git a/frontend/src/content/aiConsentCopy.ts b/frontend/src/content/aiConsentCopy.ts
new file mode 100644
index 000000000..0888319aa
--- /dev/null
+++ b/frontend/src/content/aiConsentCopy.ts
@@ -0,0 +1,156 @@
+/**
+ * ============================================================================
+ * FILE: aiConsentCopy.ts
+ * PURPOSE: Single source of truth for Swan Coach privacy & consent copy
+ * CREATED: 2026-08-22 · Wave 1 Slice 3 (client-dashboard remediation)
+ * ============================================================================
+ *
+ * WHY THIS FILE EXISTS
+ * The consent language lived inline in four components and drifted from what
+ * the backend actually does. Three surfaces told users their "identity is
+ * hidden" and that they "stay anonymous" while `deIdentificationService`
+ * assigns a STABLE `Client #<id>` pseudonym and forwards injury, pain,
+ * measurement and goal data unchanged. That is pseudonymized processing, not
+ * anonymity — and it was being claimed at the moment consent is legally
+ * captured (the onboarding wizard), not just on a settings screen.
+ *
+ * Consent copy is a compliance surface. It lives in one module so it cannot
+ * drift per-component again, and so a future change is a single diff to review.
+ *
+ * SCOPE OF THAT CLAIM, stated honestly (Grok, pre-push panel): the long-form
+ * AI_CONSENT_DISCLOSURE and AI_CONSENT_SUBTITLE are rendered from here. The
+ * short bullet lists are still authored inline in AiConsentScreen and
+ * ConsentSection because each styles them differently. AI_CONSENT_PROTECTIONS
+ * exists so those can converge, and a test asserts the inline bullets stay
+ * consistent with it. Until they render from it, "single source of truth"
+ * describes the disclosure, not every bullet — do not read it more broadly.
+ *
+ * ── ACCURACY CONTRACT ──────────────────────────────────────────────────────
+ * Every claim below was verified against
+ * `backend/services/deIdentificationService.mjs` (DIRECT_IDENTIFIER_PATHS +
+ * scanAndRedactPII). Do NOT edit this copy without re-reading that file.
+ *
+ * That service is a DENYLIST: it removes the paths below and regex-redacts
+ * email/phone patterns anywhere in the payload. Everything else the caller
+ * includes is forwarded.
+ *
+ * CONSEQUENCE, and why the copy below is worded carefully: a denylist cannot
+ * promise "training-relevant data only". An unrecognised field, or a name typed
+ * into a free-text note, is forwarded. The copy therefore describes what IS
+ * sent and warns about notes, rather than claiming a guarantee the architecture
+ * does not provide. Replacing this with an outbound ALLOWLIST DTO is the real
+ * fix and is tracked separately -- until then, do not restore "only" wording.
+ *
+ * REMOVED before anything leaves the server:
+ *   supplements, sleep, stress  (GATED_HEALTH_PATHS, owner decision Q2 —
+ *     restored only when COACH_HEALTH_FIELDS_ENABLED is set, which requires a
+ *     consent-version bump because it changes what users were told)
+ *   name / preferredName / firstName / lastName / fullName
+ *   contact block — email, phone, address, city, state, zip, emergency contact
+ *   dateOfBirth / dob, bloodType, ssn, insuranceId, insuranceProvider
+ *   occupation, employer, workplace, stressSources
+ *   medications, surgeries, doctorName / physician
+ *   plus any email- or phone-shaped string found anywhere in the payload
+ *
+ * FORWARDED (this is the honest part the old copy omitted):
+ *   a stable `Client #<id>` label, goals, fitness level, measurements,
+ *   training history, exercise preferences, injury / pain history, and
+ *   exercise-relevant medical conditions
+ *
+ * The stability of the pseudonym is the material fact: sessions link to one
+ * another, so this is de-identification, not anonymization.
+ */
+
+/** Bumped whenever the substance of the disclosure changes. See CONSENT_VERSION_NOTES. */
+export const AI_CONSENT_VERSION = '2.0';
+
+export const CONSENT_VERSION_NOTES =
+  'v2.0 (2026-08-22) — corrected anonymity language to pseudonymization; ' +
+  'enumerated forwarded fields. v1.0 consents were captured under a ' +
+  'description that overstated anonymity and require re-consent.';
+
+/** One-line summary used as a section subtitle. */
+export const AI_CONSENT_SUBTITLE =
+  'SwanStudios uses Swan Coach to create personalized workout plans. Your data is ' +
+  'pseudonymized — Swan Coach sees a stable client ID instead of your name or ' +
+  'contact details. Review exactly what is and is not shared below.';
+
+/** Ordered privacy bullets. `tone` lets each surface pick its own icon/color. */
+export const AI_CONSENT_PROTECTIONS: ReadonlyArray<{
+  key: string;
+  title: string;
+  body: string;
+  tone: 'protect' | 'disclose';
+}> = [
+  {
+    key: 'pseudonymized',
+    title: 'Pseudonymized, not anonymous.',
+    body:
+      'Swan Coach sees a stable client ID rather than your name. Because the ID stays ' +
+      'the same across sessions, this is de-identification — not full anonymity.',
+    tone: 'disclose',
+  },
+  {
+    key: 'removed',
+    title: 'Removed before sending.',
+    body:
+      'Your name, email, phone, address, date of birth, blood type, insurance details, ' +
+      'occupation and employer, medications, surgeries, and any doctor names are ' +
+      'stripped before anything reaches the Swan Coach provider. Supplements, sleep ' +
+      'and stress data are also withheld.',
+    tone: 'protect',
+  },
+  {
+    key: 'shared',
+    title: 'What is shared.',
+    body:
+      'Your goals, fitness level, measurements, training history, exercise ' +
+      'preferences, injury and pain history, and any medical conditions you have ' +
+      'recorded — the last two so Swan Coach can avoid programming that could ' +
+      'hurt you. Anything else you enter in a free-text note travels with it, so ' +
+      'avoid putting names, addresses or ID numbers in notes.',
+    tone: 'disclose',
+  },
+  {
+    key: 'audit',
+    title: 'Full audit trail.',
+    body:
+      'Every Swan Coach interaction is logged with a cryptographic hash, never your ' +
+      'raw data.',
+    tone: 'protect',
+  },
+  {
+    key: 'withdraw',
+    title: 'Withdraw anytime.',
+    body:
+      'You can turn Swan Coach off from your dashboard at any time. Withdrawal stops ' +
+      'all future processing; plans already generated remain in your account.',
+    tone: 'protect',
+  },
+];
+
+/** Long-form legal disclosure. Rendered verbatim. */
+export const AI_CONSENT_DISCLOSURE =
+  'By granting consent, you agree that SwanStudios may process your pseudonymized ' +
+  'fitness profile through a Swan Coach provider to generate personalized workout ' +
+  'plans. Direct identifiers — your name, contact details, date of birth, insurance ' +
+  'information, medications, surgeries, and physician names — are removed before ' +
+  'transmission. Training-relevant data, including your goals, measurements, ' +
+  'injury and pain history, and medical conditions that affect exercise, is sent ' +
+  'alongside a stable client ID. Because that ' +
+  'identifier is stable, this is de-identified processing rather than anonymous ' +
+  'processing. You may withdraw consent at any time from the Swan Coach Privacy & ' +
+  'Consent page in your dashboard; withdrawal stops future processing but does not ' +
+  'delete plans already generated.';
+
+/** Shown where the client ID is first revealed (onboarding success). */
+export const AI_CONSENT_CLIENT_ID_NOTE =
+  'Your client ID has been assigned. Swan Coach identifies you by this ID instead of ' +
+  'your name:';
+
+/** Re-consent prompt for users who granted under v1.0 (owner decision Q5). */
+export const AI_CONSENT_RECONSENT_PROMPT =
+  'We have corrected our description of how Swan Coach uses your data. The previous ' +
+  'wording said your identity was hidden; in fact Swan Coach receives a stable client ' +
+  'ID along with your training and injury history. Nothing about the data itself has ' +
+  'changed. Please review the updated disclosure and confirm to keep using Swan Coach.';
diff --git a/frontend/src/hooks/useFocusTrap.test.tsx b/frontend/src/hooks/useFocusTrap.test.tsx
new file mode 100644
index 000000000..9b9d335a2
--- /dev/null
+++ b/frontend/src/hooks/useFocusTrap.test.tsx
@@ -0,0 +1,123 @@
+/**
+ * Wave 1 Slice 9 — modal focus contract
+ * =====================================
+ * The client mobile navigation drawer locked body scroll and closed on Escape,
+ * but never contained Tab. A keyboard or screen-reader user could tab straight
+ * out of the open drawer into the page behind it, with nothing bringing focus
+ * back. These tests pin the contract the extracted hook now provides.
+ */
+import { describe, expect, it, vi, beforeEach } from 'vitest';
+import React, { useRef } from 'react';
+import { render, screen, cleanup } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { useFocusTrap } from './useFocusTrap';
+
+function Harness({ open, onEscape }: { open: boolean; onEscape?: () => void }) {
+  const ref = useRef<HTMLDivElement>(null);
+  useFocusTrap(ref, open, { onEscape });
+  return (
+    <div>
+      <button type="button">outside-before</button>
+      {open && (
+        <div ref={ref} role="dialog" aria-modal tabIndex={-1}>
+          <button type="button">first</button>
+          <button type="button">middle</button>
+          <button type="button">last</button>
+        </div>
+      )}
+      <button type="button">outside-after</button>
+    </div>
+  );
+}
+
+beforeEach(() => { cleanup(); vi.clearAllMocks(); });
+
+describe('useFocusTrap', () => {
+  it('moves focus into the container on open', async () => {
+    render(<Harness open />);
+    await vi.waitFor(() => {
+      expect(document.activeElement).toBe(screen.getByText('first'));
+    });
+  });
+
+  it('wraps Tab from the last element back to the first', async () => {
+    const user = userEvent.setup();
+    render(<Harness open />);
+    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));
+
+    screen.getByText('last').focus();
+    await user.tab();
+
+    expect(document.activeElement).toBe(screen.getByText('first'));
+  });
+
+  it('wraps Shift+Tab from the first element back to the last', async () => {
+    const user = userEvent.setup();
+    render(<Harness open />);
+    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));
+
+    screen.getByText('first').focus();
+    await user.tab({ shift: true });
+
+    expect(document.activeElement).toBe(screen.getByText('last'));
+  });
+
+  it('never lands on an element outside the container', async () => {
+    const user = userEvent.setup();
+    render(<Harness open />);
+    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));
+
+    // Walk further than there are focusables inside; focus must stay contained.
+    for (let i = 0; i < 6; i += 1) await user.tab();
+
+    expect(document.activeElement).not.toBe(screen.getByText('outside-before'));
+    expect(document.activeElement).not.toBe(screen.getByText('outside-after'));
+  });
+
+  it('pulls focus back in if it somehow starts outside', async () => {
+    const user = userEvent.setup();
+    render(<Harness open />);
+    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));
+
+    screen.getByText('outside-before').focus();
+    await user.tab();
+
+    expect(document.activeElement).toBe(screen.getByText('first'));
+  });
+
+  it('invokes onEscape', async () => {
+    const user = userEvent.setup();
+    const onEscape = vi.fn();
+    render(<Harness open onEscape={onEscape} />);
+    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));
+
+    await user.keyboard('{Escape}');
+
+    expect(onEscape).toHaveBeenCalledTimes(1);
+  });
+
+  it('restores focus to the opener when it closes', async () => {
+    const { rerender } = render(<Harness open={false} />);
+    const opener = screen.getByText('outside-before');
+    opener.focus();
+    expect(document.activeElement).toBe(opener);
+
+    rerender(<Harness open />);
+    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByText('first')));
+
+    rerender(<Harness open={false} />);
+
+    expect(document.activeElement).toBe(opener);
+  });
+
+  it('does nothing while inactive', async () => {
+    const user = userEvent.setup();
+    render(<Harness open={false} />);
+
+    screen.getByText('outside-before').focus();
+    await user.tab();
+
+    // Free traversal — the trap must not interfere when closed.
+    expect(document.activeElement).toBe(screen.getByText('outside-after'));
+  });
+});
diff --git a/frontend/src/hooks/useFocusTrap.ts b/frontend/src/hooks/useFocusTrap.ts
new file mode 100644
index 000000000..df9f2d354
--- /dev/null
+++ b/frontend/src/hooks/useFocusTrap.ts
@@ -0,0 +1,135 @@
+/**
+ * FILE: useFocusTrap.ts
+ * PURPOSE: Shared modal focus contract — initial focus, Tab containment, restore.
+ * CREATED: 2026-08-22 · Wave 1 Slice 9 (client-dashboard remediation)
+ *
+ * WHY THIS EXISTS
+ * `focus-trap-react` is not installed, so this contract has been hand-rolled at
+ * least three times (PdfApprovalVault, ClientPlanDetailModal, PostSaveHandoff)
+ * and was missing entirely from the client mobile navigation drawer — which
+ * locked body scroll and closed on Escape but let Tab walk straight out into
+ * the page behind it. A keyboard or screen-reader user could not reliably
+ * operate the drawer.
+ *
+ * The behavior here is extracted from the existing PdfApprovalVault
+ * implementation so the app has one contract rather than four dialects. The
+ * three existing modals are intentionally NOT refactored in this slice — they
+ * work, and rewriting them is unrelated to the drawer defect. They are the
+ * obvious follow-up.
+ *
+ * WHAT IT GUARANTEES while `active` is true:
+ *   - focus moves into the container on open (preferring `initialFocusRef`)
+ *   - Tab and Shift+Tab cycle within the container
+ *   - Escape invokes `onEscape`
+ *   - focus returns to whatever was focused before opening
+ *
+ * WHAT IT DOES NOT DO: scroll-lock or `inert` on the background. Callers own
+ * those, because they differ per surface (the drawer uses a body class).
+ *
+ * Honors `active` changing at any time; every listener is removed on cleanup.
+ */
+import { useEffect, type RefObject } from 'react';
+
+/** Matches the selector already used by the in-house modals. */
+export const FOCUSABLE_SELECTOR =
+  'button:not([disabled]), [href], iframe, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
+
+interface FocusTrapOptions {
+  /** Element to focus on open. Falls back to the first focusable child. */
+  initialFocusRef?: RefObject<HTMLElement | null>;
+  /** Called on Escape. Omit to leave Escape handling to the caller. */
+  onEscape?: () => void;
+  /** Restore focus to the previously focused element on close. Default true. */
+  restoreFocus?: boolean;
+}
+
+export function useFocusTrap(
+  containerRef: RefObject<HTMLElement | null>,
+  active: boolean,
+  { initialFocusRef, onEscape, restoreFocus = true }: FocusTrapOptions = {},
+): void {
+  useEffect(() => {
+    if (!active) return;
+    const container = containerRef.current;
+    if (!container) return;
+
+    const opener = document.activeElement;
+
+    // Visibility filtering is deliberately two-tier.
+    //
+    // The in-house modals this was extracted from filtered on
+    // `el.offsetParent !== null`. That reads as a visibility test but is really
+    // a LAYOUT test, and it returns null in any environment that does not do
+    // layout — every element in jsdom, so the list came back empty and the trap
+    // silently did nothing under test. It is also null for position:fixed
+    // elements in real browsers.
+    //
+    // So: always apply the attribute checks, and apply the layout check only
+    // when the environment demonstrably reports layout. Where it does not, the
+    // trap degrades to attribute-only rather than to nothing.
+    const hasLayout = container.getClientRects?.().length > 0;
+
+    const visibleFocusables = (): HTMLElement[] =>
+      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
+        if (el === document.activeElement) return true;
+        if (el.hasAttribute('hidden')) return false;
+        if (el.getAttribute('aria-hidden') === 'true') return false;
+        if ((el as HTMLButtonElement).disabled) return false;
+        if (hasLayout) return el.offsetParent !== null || el.getClientRects().length > 0;
+        return true;
+      });
+
+    // Move focus in. rAF lets an entrance transition mount its children first —
+    // focusing a not-yet-painted element is a no-op and would leave focus behind.
+    const frame = requestAnimationFrame(() => {
+      const target = initialFocusRef?.current ?? visibleFocusables()[0] ?? container;
+      target.focus?.();
+    });
+
+    const onKeyDown = (event: KeyboardEvent) => {
+      if (event.key === 'Escape' && onEscape) {
+        onEscape();
+        return;
+      }
+      if (event.key !== 'Tab') return;
+
+      const focusables = visibleFocusables();
+      if (focusables.length === 0) {
+        // Nothing to land on — keep focus from escaping the container.
+        event.preventDefault();
+        return;
+      }
+
+      const first = focusables[0];
+      const last = focusables[focusables.length - 1];
+      const activeEl = document.activeElement;
+
+      // Focus outside the container (or on the container itself) re-enters at
+      // the correct end rather than continuing into the page behind.
+      if (!container.contains(activeEl) || activeEl === container) {
+        event.preventDefault();
+        (event.shiftKey ? last : first).focus();
+        return;
+      }
+      if (event.shiftKey && activeEl === first) {
+        event.preventDefault();
+        last.focus();
+      } else if (!event.shiftKey && activeEl === last) {
+        event.preventDefault();
+        first.focus();
+      }
+    };
+
+    document.addEventListener('keydown', onKeyDown);
+
+    return () => {
+      cancelAnimationFrame(frame);
+      document.removeEventListener('keydown', onKeyDown);
+      if (restoreFocus && opener instanceof HTMLElement && document.contains(opener)) {
+        opener.focus();
+      }
+    };
+  }, [active, containerRef, initialFocusRef, onEscape, restoreFocus]);
+}
+
+export default useFocusTrap;
diff --git a/frontend/src/pages/onboarding/ClientOnboardingWizard.tsx b/frontend/src/pages/onboarding/ClientOnboardingWizard.tsx
index 0d2a5bcf2..aac88a1c5 100644
--- a/frontend/src/pages/onboarding/ClientOnboardingWizard.tsx
+++ b/frontend/src/pages/onboarding/ClientOnboardingWizard.tsx
@@ -14,6 +14,7 @@ import {
 import { StyledBox } from '@/components/ui/StyledBox';
 import { useAuth } from "../../context/AuthContext";
 import { readDraft, writeDraft, clearDraft } from "./useOnboardingDraft";
+import { AI_CONSENT_CLIENT_ID_NOTE } from '../../content/aiConsentCopy';
 
 /* ── Lazy-loaded wizard sections (code-split for FCP) ── */
 const BasicInfo = React.lazy(() => import("./components/BasicInfoSection"));
@@ -732,7 +733,7 @@ const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
               <ModalTitle id="client-onboarding-success-title">Welcome to SwanStudios!</ModalTitle>
 
               <ModalText>
-                Your onboarding is complete. Your anonymous client ID has been assigned:
+                Your onboarding is complete. {AI_CONSENT_CLIENT_ID_NOTE}
               </ModalText>
 
               <HighlightText>
diff --git a/frontend/src/pages/onboarding/components/ConsentSection.tsx b/frontend/src/pages/onboarding/components/ConsentSection.tsx
index 61192343c..870dec0fa 100644
--- a/frontend/src/pages/onboarding/components/ConsentSection.tsx
+++ b/frontend/src/pages/onboarding/components/ConsentSection.tsx
@@ -12,6 +12,11 @@ import React from 'react';
 import styled from 'styled-components';
 import { Shield, ShieldCheck, Eye, Lock, Brain, Info } from 'lucide-react';
 import { StyledBox } from '@/components/ui/StyledBox';
+import {
+  AI_CONSENT_DISCLOSURE,
+  AI_CONSENT_SUBTITLE,
+  AI_CONSENT_VERSION,
+} from '../../../content/aiConsentCopy';
 
 // ── Theme tokens (matching wizard) ──────────────────────────────────────────
 
@@ -205,9 +210,7 @@ const ConsentSection: React.FC<ConsentSectionProps> = ({ data, updateData }) =>
       </SectionHeader>
 
       <SectionSubtitle>
-        SwanStudios uses Swan Coach to create personalized workout plans. Your identity is
-        never shared — Swan Coach only receives your anonymous client ID. Review the
-        details below.
+        {AI_CONSENT_SUBTITLE}
       </SectionSubtitle>
 
       {/* What AI does */}
@@ -229,15 +232,15 @@ const ConsentSection: React.FC<ConsentSectionProps> = ({ data, updateData }) =>
         <ProtectionsList>
           <ProtectionItem>
             <ProtectionIcon><ShieldCheck size={16} /></ProtectionIcon>
-            <div><strong>Identity hidden.</strong> Your name, email, and personal details are never sent. Swan Coach only receives your anonymous client ID.</div>
+            <div><strong>Pseudonymized, not anonymous.</strong> Swan Coach sees a stable client ID rather than your name. Because the ID stays the same across sessions, this is de-identification — not full anonymity.</div>
           </ProtectionItem>
           <ProtectionItem>
             <ProtectionIcon><Eye size={16} /></ProtectionIcon>
-            <div><strong>Training data only.</strong> Only fitness-relevant information is shared. Medical details like medications are never sent.</div>
+            <div><strong>Removed before sending.</strong> Your name, email, phone, address, date of birth, insurance details, occupation, medications, surgeries, doctor names, supplements, sleep, and stress data are stripped before anything reaches the provider.</div>
           </ProtectionItem>
           <ProtectionItem>
             <ProtectionIcon><Lock size={16} /></ProtectionIcon>
-            <div><strong>You stay anonymous.</strong> Swan Coach has no way to identify who you are — it only sees a numeric client ID and your fitness profile.</div>
+            <div><strong>What is shared.</strong> Training-relevant information only: goals, fitness level, measurements, training history, exercise preferences, injury and pain history, and medical conditions that affect exercise — so Swan Coach can avoid programming that could hurt you.</div>
           </ProtectionItem>
           <ProtectionItem>
             <ProtectionIcon><ShieldCheck size={16} /></ProtectionIcon>
@@ -250,14 +253,9 @@ const ConsentSection: React.FC<ConsentSectionProps> = ({ data, updateData }) =>
       <ConsentDisclosure>
         <ConsentDisclosureTitle>
           <Shield size={16} />
-          Consent Disclosure (v1.0)
+          Consent Disclosure (v{AI_CONSENT_VERSION})
         </ConsentDisclosureTitle>
-        By enabling Swan Coach features, you agree that SwanStudios may process your
-        fitness profile through a Swan Coach provider to generate
-        personalized workout plans. Only your anonymous client ID and fitness data
-        are shared — your name, email, and personal identifiers are never sent to
-        the Swan Coach provider. You may withdraw consent at any time from the Swan Coach Privacy
-        &amp; Consent page in your dashboard.
+        {AI_CONSENT_DISCLOSURE}
       </ConsentDisclosure>
 
       {/* Toggle */}
