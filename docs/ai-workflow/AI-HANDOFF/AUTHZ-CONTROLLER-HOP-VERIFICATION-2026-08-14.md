---
decision: The 3 remaining authz handlers are guarded; the IDOR reader that cleared them has two
  defects that make its 199/199 headline non-evidence. No vulnerability found; the instrument needs
  a bounded window and a comparison test.
status: open
supersedes: none
---

# Authz controller-hop verification + two defects in the reader that cleared them

**Date:** 2026-08-14 · **Author:** Claude Opus 5 (session 4911ff52) · **Surface:** vs-claude
**Branch:** `claude/qa-harness-slice0-20260811` (worktree `C:/tmp/ss-qa-harness-slice0`)
**Follows:** `SESSION-HANDOFF-AUTHZ-AND-CORPUS-2026-08-14.md` §8 item 1
**Reviews:** commit `6b3f5f7be` (session `main-s2e2f8326`)

---

## 1. Why this exists

Session `s2e2f8326` widened `audit-idor-surface.mjs` to follow `router.use()` and one controller
hop. The audit went from **7 unguarded → 0**, and the baseline was re-recorded at **0 accepted
findings**.

A security instrument that goes to zero immediately after someone widens it is the exact shape this
repo's corpus says to distrust: *a source of truth that reports success while describing a world
that may not exist.* The tool's own footer says it — **"a passing one is NOT proven safe."**

So this pass asked two questions, not one:

1. Are the 3 handlers it now clears actually guarded? *(the handoff's question)*
2. **Can the reader still fail at all?** *(the question the 7→0 forces)*

---

## 2. Answer to Q1 — all three are genuinely guarded

| Handler | Verdict | Evidence |
|---|---|---|
| `PUT /user/:userId/:badgeId/display` → `badgeController.mjs:368` | **GUARDED** | `canEditDisplay = req.user?.role === 'admin' \|\| isOwnProfile`; 403 otherwise (:374, :378). Both IDs pass `parsePositiveInteger` → both `number`, so `===` is type-safe. |
| `PATCH /conversations/:id/participants/:userId` → `groupController.mjs:129` | **GUARDED** | `requireGroupManager(convId, actorId)` → 404 if actor not a member; `canManageParticipantRole` → **owner only**, else 403 (:144). Target must be an active participant (:147); owners cannot be demoted (:148). |
| `DELETE /conversations/:id/participants/:userId` → `groupController.mjs:160` | **GUARDED** | `getConversationMembership(convId, actorId)` → 404 if actor not a member (:173); `canRemoveParticipant` → 403 (:181). |

**The crossing the handoff flagged — "can user A remove user B from a conversation A does not own?"
— is closed at every branch:**

- A is not a member → `getConversationMembership` returns `null` → **404**.
- A is a plain member → `canRemoveParticipant({actor:'member', target:'member', sameUser:false})`
  → **false** → 403.
- A is admin, target is admin → `actor==='admin' && target==='member'` is false → **403**.
- Target is the owner → `false` unconditionally → **403**.
- A removes themself → `sameUser` → allowed (leave group). Correct.

**Why the guards hold under adversarial input** (`services/messagingParticipantRepository.mjs`):
both `getConversationMembership` (:48) and `getActiveParticipant` (:62) scope in SQL with
`AND cp.user_id = :userId AND cp.deleted_at IS NULL`, parameterized via `replacements`. They really
do scope by the actor; they are not membership-shaped functions that return rows regardless.

**`normalizeGroupRole` fails CLOSED** (`messagingGroupPolicy.mjs:27-30`): any unrecognised, null, or
corrupt role normalizes to `member` — least privilege. Had it defaulted to `owner`, every helper
above would invert. It does not.

**ID parser is strict** (`badgeController.mjs:39-50`) — behavioral probe, with a positive control so
the probe cannot be blind:

```
POSITIVE (must parse):  "5"→5   5→5   "42"→42
NEGATIVE (must reject): "5abc" "0" "-1" "1e1" "0x5" "5.0" "007" "+5" "٥" true ['5'] {} null undefined → all null
TRIM-ONLY (safe):       " 5 "→5   "5\n"→5     (normalize to the same integer; no crossing possible)
```

Leading zeros, hex, exponent, float, and non-ASCII digit forms are all rejected. Both sides of the
`===` go through it and yield `number`, so the string-vs-number drift class does not apply here.

---

## 3. Answer to Q2 — the reader has two defects. Both proved by probe.

### Defect A — the handler window is a fixed 2200-character slice

`audit-idor-surface.mjs:113-117`:

```js
function handlerBody(src, from) {
  return src.slice(from, from + 2200);
}
```

There is no handler boundary. **Any guard-shaped string within 2200 characters *after* a route
declaration clears it — including text belonging to entirely different, later handlers.**

**Probe (positive control for the tool itself):**

| Probe | Content | Expected | Actual |
|---|---|---|---|
| A alone | `:userId`, no middleware, no check | FLAG | **FLAGGED** ✅ (`NO visible check: 1`, `NEW`) |
| A + one guarded sibling handler in the same file | identical A | FLAG | **CLEARED as `[route]`** ❌ |

So the reader is not blind — it fails correctly in isolation, which is why the sibling session's
negative controls passed. It fails only when an unguarded handler sits *above* a guarded one, which
is the arrangement that actually occurs in real route files.

**Measured blast radius** (second instrument, window bounded at the next `router.<verb>(`
declaration — `scratchpad/window-bleed.mjs`):

```
user-scoped handlers         : 199
cleared by CHECK, 2200-win   : 182
cleared by CHECK, bounded    : 170
CLEARED ONLY BY WINDOW BLEED :  12   (6.6% of clearances)
```

The clearing text is sometimes a **log line from another handler**:

```
DELETE /clients/:clientId       adminClientRoutes.mjs:301
       own body 140 chars | check found at +1049 | "req.user.id} uploaded profile photo for client"
GET    /keys/:userId            encryptionRoutes.mjs:80
       own body 781 chars | check found at +968  | "req.user.id;"
```

**All 12 were traced. None is a vulnerability** — see §4. But their `why: 'route'` label is false in
all 12 cases, and that label exists specifically so "a human can falsify any one of them."

### Defect B — CHECK matches a *mention*, not a *comparison* (window-independent)

`CHECK` includes `/req\.user\??\.(id|userId)/` and `/req\.user\??\.role/`. These match any
occurrence — including logging, response payloads, and audit trails.

**Probe C** — a handler that reads any user's record by `:userId`, with **zero** authorization,
whose only `req.user.id` is inside a `console.log`:

```js
router.get('/mention/:userId/record', async (req, res) => {
  const record = await lookup(req.params.userId);
  console.log(`actor ${req.user.id} read record for ${req.params.userId}`);
  return res.json({ record });
});
```

→ **CLEARED as `[route]`.** `NO visible check: 0`.

Fixing Defect A does not fix this. And it carries a perverse incentive: **the more diligently a
developer writes actor-attributed audit logging, the more likely their unguarded handler is
cleared.**

Measured: **4 handlers** currently rest on a `req.user` mention with no comparison in their own
bounded body. All 4 checked, all fine (§4) — 2 of them are false positives of *my* detector (§5).

---

## 4. Security verdict: no vulnerability found

Roughly 17 handlers examined by hand this session (3 from the handoff + 12 bleed + 4 mention-only,
with overlap). **Zero confirmed authorization defects.**

| Handler(s) | Why it is fine |
|---|---|
| 6× `adminClientRoutes` (:297-346) | `router.use(protect)` + `router.use(authorize(['admin']))` at **:290-291**, before every one of them. Admin-gated. Tool's verdict right, its stated *reason* wrong. |
| `GET /keys/:userId` `encryptionRoutes:80` | Returns **public** E2EE material only — identity public key, signed prekey + signature, registrationId, deviceId, public one-time prekey (`keyStoreService.mjs:225-232`). A Signal-style prekey bundle is *designed* to be fetched by other users. No private key material. |
| `GET /safety-number/:userId` `encryptionRoutes:146` | Derived from `req.user.id` + target. A pair fingerprint; nothing to authorize. |
| `GET /consent/status/:userId` `aiRoutes:72` | `resolveTargetUser(pathUserId, requesterId, requesterRole)` + role gates — client 403'd cross-user, trainer assignment-gated, admin trusted. Already hardened (REV 3, Village CRITICAL-01). |
| `POST /clients/:clientId/photo` `profileRoutes:76` | `checkClientAccess(req.user, clientId, …)` with a **fail-closed 403 before touching storage or DB** (`profileController.mjs:46-52`). |
| `GET /:trainerId`, `GET /:trainerId/slots` `availability:44,64` | Trainer booking availability. An authenticated client must read it to book. By design. |
| `GET /client/:clientId/progress` `dailyWorkoutFormRoutes:1655` | Real check present: `requestingUserRole === 'client'` → `String(requestingUserId) !== String(parsedClientId)` → denied. |

**One observation, not a finding:** `GET /keys/:userId` consumes a one-time prekey per call
(`keyStoreService.mjs:221-223`) and carries no rate limiter on its route line. Any authenticated
user can exhaust another user's one-time prekey pool. Standard E2EE availability concern, normally
answered with rate limiting. **Low severity — worth a ticket, not a launch blocker.**

---

## 5. What my own instrument got wrong

My mention-only detector flagged 4; **2 were false positives.** Its `COMPARES` regex requires
`req.user.x` adjacent to the operator, so it cannot follow the actor through a local alias:

```js
const requestingUserId = req.user.id;              // aliased here…
if (String(requestingUserId) !== String(parsedClientId))   // …compared here. Missed.
```

Same defect class I am reporting — a reader whose vocabulary is narrower than the codebase's.
Recorded deliberately: it is the argument for **two instruments of different shape, required to
agree**, rather than for trusting either alone. Disagreement was the finding both times.

Also: the `checkAt` offsets printed by `window-bleed.mjs` are the position of the first *listed*
matching pattern, not the earliest match in the string. Diagnostic only — the bleed count of 12 is
computed with `.some()` on both windows and is unaffected.

---

## 6. Recommended fix — NOT applied (file is lane-locked)

`backend/scripts/audit-idor-surface.mjs` is held by session `main-s2e2f8326` (Rule 67 R1). Handing
this over rather than editing it. Two changes:

**A. Bound the window at the next route declaration.**

```js
function handlerBody(src, from, nextDecl) {
  return src.slice(from, nextDecl === undefined ? from + 2200 : Math.min(nextDecl, from + 2200));
}
```
Caller collects declaration offsets once per file. Removes 12 false clearances.

**B. Require a comparison, not a mention, for the two `req.user` patterns.**
Keep them as clearance evidence only when the body also matches something like:
```js
/req\.user\??\.\w+\s*(===|!==|==|!=)|(===|!==|==|!=)\s*req\.user\??\.\w+|\b\w+\(\s*req\.user\b/
```
…**and** follow one level of local aliasing (`const x = req.user.id`) so §5's false-positive class
does not simply move into the audit script. A mention with no comparison should degrade to
`sensitive: true` in the review queue, not to a clearance.

**C. Add both probes as permanent negative controls.** The existing controls test an unguarded
handler *in isolation*, which is the case that already passes. The two that matter:
- unguarded handler positioned **above** a guarded one in the same file → must FLAG
- unguarded handler whose only `req.user.id` is **in a log line** → must FLAG

**D. Re-run `--update-baseline` only after A-C.** The baseline currently records **0 accepted
findings** against a reader that clears both probe shapes. A ratchet anchored to an over-clearing
reader will never fire.

---

## 7. Proof state

**Established (current session, reproducible):**
- 3 handoff handlers guarded — traced to policy helpers with file:line, including the SQL that
  scopes by actor and the fail-closed role default.
- ID parser behavior — probe run with positive **and** negative controls.
- Defect A — probe A flagged alone, cleared beside a guarded sibling; root cause read at
  `audit-idor-surface.mjs:113-117`; blast radius measured at 12/182 by an independent instrument.
- Defect B — probe C cleared with zero authorization; 4 handlers measured on that footing.
- All 12 bleed + 4 mention-only clearances traced to a real guard or a by-design public surface.

**NOT established:**
- **No test has hit a live endpoint.** Everything here is static analysis and code reading. A
  two-user negative test is the only thing that proves an authz claim either way; none has run.
- The other 170 clearances were not individually traced — only the 16 whose clearance rested on a
  defect were.
- Whether `--update-baseline` was run before or after these defects existed (it re-recorded 0).

**Probe hygiene:** all three probe files were written to `backend/routes/`, run, and deleted inside
a single shell invocation with an `EXIT` trap; absence verified by `ls` after each and by
`git status` at the end. `--update-baseline` was never invoked from this session, so the committed
baseline is untouched.

---

## 8. Hostile rounds 1-6 — corrections and three further findings

Sections 1-7 were written after the tracing pass. Six hostile rounds then ran, each from a vantage
not previously used. They corrected two claims above and found three more defects.

### CORRECTION 1 — Defects A and B are inherited from `origin/main`, NOT introduced by `6b3f5f7be`

Round 1 vantage: a different branch. `origin/main`'s copy of the reader has the **identical**
`handlerBody` (`src.slice(from, from + 2200)`, at `:107-111` there) and the **same** bare-mention
CHECK patterns (`/req\.user\.(id|userId)/`, `/req\.user\.role/`). Both defects predate the widening.

What `6b3f5f7be` actually changed: added `controllerHop` (0→2), `routerUseGate` (0→2), and
optional-chaining `req\.user\??\.` (0→2). Main's reader is **blind to `req.user?.id` entirely** —
the form used in 89 files against 143 for the dot form. **The widening is a genuine improvement.**
§3 and the review-queue entry framed both defects as that session's; that attribution was wrong and
is withdrawn.

Sharper framing of Defect B: main's own header at `:22` documents the intent as *"a comparison
against `req.user.id`"*. The implementation has always been a bare match. This is a
**contract-vs-implementation gap**, not a design choice — which makes it a straightforward fix
rather than a debate.

Also confirmed Round 1: `backend/routes/` is **byte-identical to `origin/main`**
(`git diff --stat origin/main HEAD -- backend/routes/` → empty). Branch position drifts every
commit — re-derive with `git rev-list --left-right --count origin/main...HEAD` rather than trusting
any number written here; it was 19 ahead at this line's writing and 27 by session end. So
every count in this document describes the real production route surface.

### CORRECTION 2 — §7's "no test has hit a live endpoint" was too broad

Round 2 vantage: executed behavior. Seven security suites exist and **pass: 7 files, 57 tests,
1.38s**, zero skipped.

`clientResourceIdorExecution.test.mjs` mounts **real routers** (`photoRoutes`, `noteRoutes`,
`nutritionRoutes`) on a real express app via supertest; models and `authMiddleware` are mocked so
identity can be controlled. It is 8 `it.each` tables (which is why 37 tests come from 11 `expect`
lines — not fake-green), and it **ships positive controls**: *"client A reading their OWN record
succeeds (control)"*, *"an ASSIGNED trainer is allowed (control)"*, *"an ASSIGNED trainer CAN write
(control: the denials above are not blanket)"*. It also asserts non-disclosure, not just status:
`expect(JSON.stringify(res.body)).not.toContain(String(CLIENT_B_ID))`.

That is the F2 defect Kimi found in the matrix *design*, already correctly solved in the *existing*
tests — further support for §5's "do not build the matrix."

**Honest scope:** these cover **3 surfaces of 199**. And because `authMiddleware` is mocked, they
prove authorization given a correctly-populated `req.user`; they do not prove `protect` populates it
correctly. **196 handlers have no executed authz test.** That, not the static audit, is the true
state of authorization assurance.

### FINDING — Defect C: `routerUseGate` ignores position (latent, 0 live instances)

Round 3 vantage: ordering. `routerUseGate(src)` at `:221-230` receives the whole file and **never
receives the handler's offset**. Express applies `router.use` only to handlers declared *after* it,
so a gate at the bottom of a file would clear handlers above it that are genuinely unprotected.

Measured across all 20 files that carry a `router.use` role gate: **0 user-scoped handlers are
declared before their gate.** Latent, same as Defect A — it bites the first time someone adds a
handler above the gate.

### FINDING — the audit never scans 34 route files, including 6 whole subdirectories

Round 4 vantage: what the instrument does not look at. `fs.readdirSync(ROUTES)` is **non-recursive**.

```
files the audit scans      : 196
route .mjs files that exist: 230
unscanned                  :  34   (routes/{admin,dashboard,masterPrompt,plaud,print,social})
```

Four unscanned files carry **7 user-scoped handlers** absent from the 199 entirely:
`masterPrompt/privacy.mjs:177` (`GET /user-data/:userId`), `social/friendships.mjs:343,408`,
`social/groupMembership.mjs:166,197,227`, `social/posts.mjs:615`.

**All 7 traced, all guarded** — `privacy.mjs` via `requirePermissionWithAccessibility(
'personal_data_access')` plus an explicit self-or-admin 403; the group-membership writes via
`groups.mjs:44 router.use(protect)` (mounted at `:279`) plus `getGroupWithMembership(groupId,
req.user.id)` → 404 and `canModerateGroup` / `isGroupOwner` → 403; `posts.mjs` via `protect` at
`:56` plus a friendship gate.

**This is the most important finding in the document.** "199/199 guarded" is not merely
over-clearing — it is silent about an entire class of routes. And `SESSION-HANDOFF §10` already
records a non-recursive glob hiding *these same 34 files including the `social/` family* as a past
instrument failure. **The lesson was written down, and the same class then recurred inside the
security tool.** Documenting a defect does not install the fix.

### FINDING — `USER_PARAM` misses 5 user-scoped handlers that use `:id`

Round 5 vantage: the parameter vocabulary. `USER_PARAM` lists `:userId|clientId|trainerId|…` but not
the `/users/:id` shape:

| Handler | Gate | Verdict |
|---|---|---|
| `PUT /users/:id` `adminRoutes:35` | `router.use(authenticateToken)` + `router.use(authorizeAdmin)` `:30-31` | GUARDED |
| `GET /users/:id` `authRoutes:855` | `isAdmin \|\| isSameUser \|\| assigned-trainer` → 403; role-tiered attribute exclusion | GUARDED |
| `PUT /users/:id` `authRoutes:925` | `protect, adminOnly` | GUARDED |
| `PUT /user/:id` `userManagementRoutes:562` | `protect, adminOnly` | GUARDED |
| `DELETE /user/:id` `userManagementRoutes:692` | `protect, adminOnly` | GUARDED |

`authRoutes:855` is worth reading as a model: it documents *why* it coerces
(`String(req.user.id) === String(userId)` — `req.user.id` is a string per `authMiddleware:631`, so
strict `===` against a `parseInt` was locking users out of their own profile). That is the corpus's
type-drift class, already found and fixed with the reason recorded.

### Round 6 — CLEAN

Vantage: the declaration vocabulary. No `router.route()` chains carry a user param; the four
`router.all()` uses are retired/disabled stubs (`retiredMcpManagementResponse`,
`disabledMasterPromptMcpRoute`) with no user params; no dynamic or loop registration. No user-scoped
handler hides in an alternate declaration form.

### Revised totals

| | |
|---|---|
| Handlers hand-traced across all rounds | **~29** |
| Confirmed authorization vulnerabilities | **0** |
| Reader defects found | **4** (A window, B mention, C position, D non-recursive scan) + 1 vocabulary gap |
| Live instances of A / C | 12 mis-attributed / 0 |
| Handlers structurally invisible to the audit | **12** (7 in unscanned dirs + 5 via `:id`) |

---

## 9. Next slice

**Hand Defects A-D to `main-s2e2f8326`** (they hold the file). Priority order changed by the rounds:

1. **D — recurse into subdirectories.** One-line fix, largest blind spot: 34 files, 12% of the route
   surface, currently unaudited.
2. **B — require a comparison, not a mention.** Honors the header's own documented contract.
3. **A — bound the window** at the next declaration. Removes 12 false attributions.
4. **C — pass the handler offset to `routerUseGate`** and require the gate to precede it.
5. **Widen `USER_PARAM`** to the `/users/:id` shape.
6. **Then** re-baseline, with the two probes from §3 plus an unscanned-subdir probe as permanent
   negative controls.

Until then, treat **"199/199 guarded" as "199 of the 211 handlers it can see contain a guard-shaped
string near the declaration."** A review queue, not a verdict — which is what the script's own
footer says, and is now measured rather than asserted.

**Standing:** authorization posture is genuinely good. Across ~29 handlers traced by hand and 57
executed tests, zero vulnerabilities. The gap is instrumentation and test coverage (3 surfaces of
199), not enforcement.

---

## 10. ADDENDUM (round 7) — the reader changed underneath this document

Round 7 re-derived the headline numbers with a second instrument and re-ran both suites. The audit's
output had **changed mid-session**: `NO visible check` went `0 → 3`. Session `main-s2e2f8326` is
actively fixing the reader in this shared worktree — `backend/scripts/audit-idor-surface.mjs` and
`baselines/idor-surface.json` are modified-uncommitted, with a new
`backend/tests/api/idorAuditReaderControls.test.mjs`.

**Sections 1-8 describe the PRE-FIX reader.** Current state, verified just now:

| Defect | Status |
|---|---|
| **A** — 2200-char window | **FIXED** — `handlerBody(src, from, nextDecl)` at `:142-144`, bounded at the next declaration |
| **B** — mention vs comparison | **FIXED** — a dedicated "does the body actually COMPARE the actor" pass at `:146+` |
| **C** — `routerUseGate` position | **FIXED** *(later, in `ea70a8290`)* — now `routerUseGate(src, beforeOffset)`. Was OPEN when this section was first written. |
| **D** — non-recursive scan | **FIXED** *(later, in `ea70a8290`)* — recursive walk; audit went 196 → **230** files and 199 → **211** handlers. Was OPEN when this section was first written. |
| **E** — `USER_PARAM` missed `/users/:id` | **FIXED** *(later, in `ea70a8290`)* — `\/users?\/:id\b` added. |

> **Status as of session end: all five FIXED**, baseline committed at `scanned: 211, accepted: 3`,
> and **10** permanent negative controls passing. This table was written mid-flight and its C/D rows
> said OPEN for about twenty minutes — corrected here rather than deleted, because the drift is the
> point: a status column is a timestamp, not a fact. **Current source of truth for status is
> `SESSION-HANDOFF-AUTHZ-CLOSED-2026-08-14-B.md` §5**, and above that, the audit itself:
> `node backend/scripts/audit-idor-surface.mjs`.

Their negative controls are **better than what §6 proposed**: 7 tests, all passing, covering both of
my probe arrangements *plus* `'an aliased comparison still clears — the dominant in-repo idiom'` —
which is precisely the false-positive class my own detector suffered from in §5. They fixed my bug
as well as theirs.

**The 3 handlers the fixed reader now flags are already answered in §4** — all three are by-design
public and were traced this session:
`availability.mjs:44,64` (trainer booking availability an authenticated client must read) and
`encryptionRoutes.mjs:80` (Signal-style **public** prekey bundle; `keyStoreService.mjs:225-232`
returns no private material). They belong in the accepted baseline, with the prekey-exhaustion
rate-limit note from §4 as a separate low-severity ticket.

**Highest-value remaining item is D**, unchanged: one line, and it is the only defect that makes the
audit silent rather than merely imprecise.
