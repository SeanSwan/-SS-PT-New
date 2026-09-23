# ADDENDUM — required lookups the panel asked for, now RESOLVED

Every panel seat listed open lookups under CONFIDENCE. These were executed
against the audited commit `66ffde607` **after** the packet was sent, so no seat
had them. They change several verdicts. Fable must weigh these over any panel
statement they contradict.

---

## A1. RESOLVED — The messaging gate is enforced SERVER-SIDE, not UI-only
Kimi, GLM, DeepSeek-Pro and Sol all flagged this as `[UNCERTAIN]`.

`backend/routes/messagingRoutes.mjs`:
```
24: import { protect } from '../middleware/auth.mjs';
25: import { requireTier } from '../middleware/requireTier.mjs';
28: const messagingTier = requireTier('elite', 'trainer.messaging');
33: router.get   ('/conversations',                       protect, messagingTier, getConversations);
36: router.post  ('/conversations',                       protect, messagingTier, ...);
44: router.patch ('/conversations/:id',                   protect, messagingTier, ...);
50: router.post  ('/conversations/:id/participants',      protect, messagingTier, ...);
57: router.patch ('/conversations/:id/participants/:userId', protect, messagingTier, ...);
64: router.delete('/conversations/:id/participants/:userId', protect, messagingTier, ...);
70: router.delete('/conversations/:id',                   protect, messagingTier, deleteConversation);
73: router.get   ('/conversations/:id/messages',          protect, messagingTier, getMessagesForConversation);
76: router.post  ('/conversations/:id/messages',          protect, messagingTier, sendMessage);
79: router.get   ('/users/search',                        protect, searchUsers);   // <- only ungated route
```

**Consequences:**
1. The fix is **three layers**, not one line: backend middleware +
   `MessagingView.tsx:30` + the contract test. Any estimate treating P0.2 as a
   frontend one-liner is wrong.
2. **The permission key is literally `'trainer.messaging'`.** A capability named
   for the coaching relationship is gated on the billing tier. The semantic
   drift the audit alleges is not inferred — it is spelled out in the code.
3. **No relationship check exists anywhere on the messaging path.** Not
   frontend, not backend. `requireTier` is the only gate.

## A2. RESOLVED — Training packages do NOT grant `tier`. My claim is now cited.
GLM's Blocker 1 correctly called my "$8.4k packages don't set tier" claim
uncited and load-bearing. Executed repo-wide.

Every non-test runtime write of subscription tier:
```
12  backend/routes/subscriptionRoutes.mjs      <- subscription checkout / donation / trial ONLY
 2  backend/middleware/requireSubscription.mjs
 1  backend/middleware/requireTier.mjs
 4  backend/scripts/backfill-video-catalog.mjs (script, not a request path)
 1  backend/migrations/retired-mjs-.../...     (retired migration)
```
Then every controller handling package/session purchase was checked for a tier
write — `orderController`, `sessionPackageController`, `creditsController`,
`userCreditsController`, `sessionController`, `sessionSyncController`,
`adminClientController`, `achPaymentRoutes`, `renewalAlertController`,
`userManagementController`: **zero write `tier`.**

**CONFIRMED:** buying a $33,600 training package leaves `tier === 'free'`, which
fails `requireTier('elite')`, which **403/402s the client out of messaging their
trainer server-side.** GLM's "if packages DO grant a tier, severity drops"
branch is closed — severity stands at the higher reading.

## A3. RESOLVED — The relationship-aware primitives the audit says to BUILD already exist
This is the single largest cost correction in the review.

| Primitive the audit prescribes building | What already exists at `66ffde607` |
|---|---|
| Relationship-derived capability | `checkTrainerClientRelationship()` in `backend/middleware/authMiddleware.mjs` |
| Ownership-or-trainer gate | `requireOwnershipOrTrainer` — already applied across ~19 analytics chart routes (`analyticsRoutes.mjs:162-183`) |
| Relationship entity | `backend/models/ClientTrainerAssignment.mjs` (junction table; `authMiddleware.mjs:156` documents it "enforces trainer-client scope") |
| Feature-key capability registry | `FEATURE_GATES` + `backend/config/tierCatalog.mjs`, keys like `'trainer.messaging'`, `'charts.full'` |
| Audited read-only impersonation | `viewAsGuard.mjs` (fail-closed) + `adminImpersonationService.mjs` + audit-log migration |
| IDOR sweep tooling | `backend/scripts/audit-idor-surface.mjs` |

**Therefore the correct framing of P0.1/P0.2 is composition, not greenfield.**
`requireOwnershipOrTrainer` is the exact pattern the audit's
`DashboardCapabilityPolicy` describes — it is simply not applied to messaging.
A plan that says "build DashboardActorContext + DashboardCapabilityPolicy +
DashboardActionRouter" as new architecture is pricing work the repo has already
paid for, and risks a 22nd competing context (GLM Blocker 5).

## A4. RESOLVED — `requireTier` treats a live trial as elite; the FRONTEND does not
`backend/middleware/requireTier.mjs`:
```
const TRIAL_EFFECTIVE_TIER = 'elite';
// "A live trial intentionally receives an elite-equivalent effective tier"
```
Frontend `MessagingView.tsx:30` = `isStaffRole || isElite` — **excludes `isTrial`**,
while `useSubscription.ts:183` defines `hasCrystallineAccess = isElite || isTrial`.

**A trialing user is permitted by the API and blocked by the UI.** A confirmed
frontend/backend entitlement divergence, in the opposite direction from the
paying-client bug. Both are symptoms of one disease: entitlement is computed
independently in two places from two different rules.

Also note: `requireTier` has an emergency kill-switch env `TIER_GATING_ENABLED`,
falls back to the JWT claim on DB error, and **admin/trainer always bypass**.

## A5. RESOLVED — GitHub rulesets are ALSO paywalled. The escape hatch is closed.
Kimi and GLM both proposed rulesets as a possible substitute for branch protection.
```
GET /repos/SeanSwan/-SS-PT-New/rulesets
-> 403 "Upgrade to GitHub Pro or make this repository public"
```
Same 403 as branch protection. **Neither mechanism is available on this plan.**
GLM's "just buy GitHub Pro for ~$4/month, day one, non-blocking" is therefore
the only remedy that actually restores an enforceable gate. Pre-push hooks are
bypassable with `--no-verify` and are not a substitute.

## A6. RESOLVED — Citation drift check: all packet citations remain valid
`git diff --name-only 66ffde607..origin/main` = **47 files**. **None** is a file
cited in the packet. Citations stand.

**But the diff carries a planning-relevant signal:** the changed files include
`Social/Feed/PostCard.tsx`, `Social/Feed/components/PostContent.tsx`,
`PostHeader.tsx`, `PostWorkoutDetailsModal.tsx`, `hooks/usePostCardModeration.ts`,
`styles/PostCardStyles.ts`, `types/PostCardTypes.ts`.

**The canonical feed is under active development right now.** That is decisive
against the audit's stage-1 "temporarily mount the canonical feed in Client
Community": it is a moving target this week. It strengthens the panel consensus
to extract the canonical post *card* later, not mount the whole feed now.

## A7. NEW — House-rule (300-line) violations in the consent surfaces
GLM inferred these from interior line numbers I cited. Confirmed and worse:

| File | Lines | Cap |
|---|---|---|
| `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx` | **789** | 300 |
| `frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx` | **770** | 300 |
| `frontend/src/pages/onboarding/components/ConsentSection.tsx` | **304** | 300 |
| `frontend/src/components/Social/Messaging/MessagingView.tsx` | 269 | ok |
| `frontend/src/hooks/useSubscription.ts` | 235 | ok |
| `frontend/src/context/GlobalClientContext.tsx` | 172 | ok |

The two worst offenders are **exactly the two consent surfaces** that must be
edited for the highest-ranked P0. Consent copy work and a file split land in the
same commit whether planned or not.

---

## What Fable must decide, given A1-A7

1. Does A3 (primitives already exist) collapse the audit's stage-2
   "architecture consolidation" from a program into a wiring task? Price it.
2. Does A1 + A2 make the messaging fix the #1 item, or does consent still lead?
   Five of seven seats named consent highest-risk **without knowing A1/A2**.
3. Does A6 kill the community item from stage 1 entirely, and to when?
4. Is A5 enough to move branch gates to "buy Pro, day one, non-blocking," and
   what enforces the gate suite until then?
5. What is the final ordered, executable slice list — each slice independently
   shippable, with acceptance criteria a worker-bot can satisfy with zero
   further questions?
