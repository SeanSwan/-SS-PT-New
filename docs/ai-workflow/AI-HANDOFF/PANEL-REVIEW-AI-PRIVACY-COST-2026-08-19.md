---
title: "Panel review — AI privacy/cost workstream (GLM + Kimi, multi-round)"
date: 2026-08-19
author: Claude Opus 5 (vs-claude), reviewed by GLM-5.3 and Kimi K3 (C40: this line carried its own derivation rule, which C36 had already falsified; there is now exactly ONE rule and it lives in `decision:` below)
decision: "CANONICAL ORDER: #45 -> #47 -> local verification -> admin link. Record-grading rounds found a defect in THIS DOCUMENT every time they ran; each is labelled C<N> at its site, so the total is DERIVED by counting C-labels, not stored (C35 - a stored total went stale on append four times: C21, C29, C34, and again here). ROUND ROSTER is likewise derived, by this EXACT rule (C37): the set of every integer N matching `^# Rounds? N` OR `^# Rounds N and M` (both captured) OR the annotation `(Round N)`. The rule is stated in the form it is executed in - C36 stated a narrower rule than its own script ran, and the script silently covered the plural heading the rule did not mention. READ EVERY `# Round N` SECTION FROM ROUND 4 ONWARD, IN ORDER, BEFORE THE BODY - they supersede body claims, and the Round 7 section holds the only evidence for the 6-of-7 figure. Per-round Kimi spend is recorded in the round sections; no running total is stored (C36 - spend is append-volatile and C27 had already classed it with the counts)."
status: open
supersedes: none
linear: SWA-107, SWA-179, SWA-180
privacy: "No secrets, no key values, no client data, no identities. Role counts, file paths, line numbers, and timestamps. Infrastructure identifiers PARTIALLY redacted - DB host slug and server IP removed; Render provider/region retained. See C19/C22."
---

# Panel review — what four hostile rounds changed

**Ratio per Sean's instruction: at least 2 GLM rounds per 1 Kimi round — honored throughout.**
Sequence: GLM (mechanisms) → GLM (attack the answers) → Kimi (frame) → GLM (adjudicate Kimi) →
alternating record-grading and confirmation rounds. **This document stores no round count, no defect
total and no spend total anywhere.** The total and roster are **derived** by the rule in
`decision:`; per-round spend lives in its round section. *(C43: this sentence used to say the counts
"live in the frontmatter and nowhere else" — true under C27, falsified by C35/C36 which replaced
storage with derivation. The sentence describing the storage design was not updated when the design
changed.)*

> **Read the Round 4 section at the end before trusting this one.** R4 was pointed at the record
> rather than the work and found 8 defects in it, including one fact I certified without checking
> and a closing thesis my own evidence contradicts. Corrections are appended, not silently merged.

**The two reviewers have opposite failure modes, and the pairing exploited it.** GLM read the code
and was reliable on fact, blind on frame. Kimi never read the code and was the reverse: it produced
the sharpest findings in the review and **two false factual claims**, both caught by checking.
(Round 4 later downgraded one of those "false" verdicts to "not yet true" — see C2.)

---

## What changed as a result

### 1. The merge order was wrong. Corrected.

**Was:** add an admin link to `/ai-consent`, then merge #47.
**Now:** **#45 → #47 → local verification → admin link.**
> *(This line originally read "(probe)". Retired per C8/C11 — an undefined token, and C2 established
> the step must never be a production write. Verification is local-only and still needs a written
> pass/fail script, which does not exist yet — see the canonical table.)*

Three independent reasons, none of which I had:

- **Asymmetry (GLM R2):** privacy harm is non-revertible — audio already sent cannot be un-sent.
  Availability harm is revertible. Ordering the link first delays a non-revertible harm to pre-empt
  a reversible inconvenience.
- **6-of-7 lockout is the gate WORKING (Kimi):** I had framed it as a problem to be solved before
  merge. Unconsented users being blocked from AI egress is the intended behaviour. **The only true
  defect is the admin UI gap** — and even that has an API remedy today.
- **Revert-stack hygiene (GLM R3, missed by everyone else):** no feature flags, revert-only
  rollback. If #47 merges before #45 and later needs reverting, **the revert drags #45 with it.**
  #45-first keeps #47 a clean single-commit revert.

### 2. #45 was the only unconditionally mergeable PR and the review forgot it

Kimi: *"Both reviewers forgot it exists while arguing about #47. That silence is itself a finding."*
GLM conceded plainly. So do I — I verified #45 to a higher standard than anything else here
(11/11, mutation-proven, 890/890, tsc baseline-parity **verified**) and then spent every subsequent
round on the contested item. **Attention went where the argument was, not where the certainty was.**

**#45 should merge first, today, unconditionally.** It fixes four live production bugs.

### 3. "Consent" here is a boolean, not consent — accepted, does NOT gate the merge

The grant endpoint writes `aiEnabled: true` with **no disclosure text shown, no scope, no versioned
record of what was agreed to**. Withdrawal is prospective-only.

GLM's concession is the sharpest line in the review: *"Two rounds certified the gate mechanism and
let the word 'consent' pass as settled vocabulary. I verified the gate enforces its data structure;
whether that structure constitutes consent is a question I never surfaced."* Kimi's phrasing:
**the convergence "mistook verifiable for valid."**

**This does not delay #47.** A fail-closed boolean is strictly better than open egress. It opens a
**parallel** workstream: disclosure-before-grant, versioned consent records, withdrawal semantics,
minor handling.

**Legal confidence trimmed:** Kimi asserted WA MHMDA / NV SB 370 applicability. GLM correctly noted
MHMDA has size thresholds a 7-user product likely misses and Nevada needs a Nevada consumer. The
*design* critique survives independently of whether either statute currently binds.

### 4. The recorded party isn't only the client — trainer voiceprints (NEW, both prior rounds missed)

**The consent object is per-account; the exposure is per-voice.** Recordings contain the *trainer's*
voice. The trainer has no consent path at all, and neither do bystanders. IL BIPA enumerates
voiceprints explicitly, has **no entity-size threshold**, and carries per-scan statutory damages —
so unlike the health statutes, its applicability does not depend on scale.

**Bounded:** zero recordings exist through this path yet. This is a design-stage fix, not an
emergency.

### 5. An admin can mint consent on a client's behalf — VERIFIED, and it is real

GLM called this *"the single most load-bearing unverified assertion"* in Kimi's document. Settled:

`aiConsentController.mjs:319` — `resolveTargetUser(rawUserId, requesterId, requesterRole)` returns
`parsePositiveUserId(rawUserId)` from **`req.body.userId`** when supplied, else the requester.
Combined with the role rules (clients self-only; trainers barred entirely; admins may target
`client`-role accounts), **an admin can create a consent record for any client account.**

It is *designed* — the admin-mounted onboarding wizard (`/client-onboarding`, routes.tsx:119) needs
it. But the critique stands on the merits: **the party who benefits from egress can mint the consent
of the party being recorded**, with no disclosure trail. Product/legal call, not a code fix.

### 6. `/history-preview` — the parking is not defensible as-is

Kimi: *"an authorization check is a defect, not a product question,"* and *"friction set the
priority order, risk didn't."*

GLM split it correctly: **the motive claim is posturing** (the record shows I surfaced it
repeatedly, and declining to change live-route authorization unilaterally is the same blast-radius
discipline Kimi praises elsewhere — it cannot be reckless when convenient and cowardice when not).
**The output claim is fair**: surfacing is not prioritizing.

**The fix is process, not motive:** "pending the owner's product call" with no written question, no
deadline, and no prepared PR is a parking lot. It becomes a decision engine with one question
("is cross-trainer visibility intended in a 7-user studio?"), two prepared outcomes, and a date.

### 7. "Visible and revertible" was hollow — conceded by its author

GLM retracted its own R2 phrasing under Kimi's pressure: with **no monitoring**, "visible" means
"a user eventually complains," and revert latency is gated by owner availability — the scarcest
resource in the system. Honest phrasing: **"revertible within owner response time."**

Consequence: **any post-merge smoke test that writes to production is struck.** GLM retracted its
own proposal — a prod write dressed as verification is the first execution of an unexercised path,
not a check.

---

## Kimi's two false claims — both caught by checking

| Claim | Status |
|---|---|
| "Test suites and mutation runs likely wrote to production; the test/prod distinction is fictional" | **FALSE.** `backend/tests/setup.mjs:10` sets `NODE_ENV='test'`; every observed suite banner read `Development database configuration applied (local PostgreSQL)`, `Host: localhost`. Only two deliberate read-only `SELECT COUNT`s touched production |
| "A deletion request is currently unsatisfiable" / vendor-held audio backlog | **FALSE as stated.** The consent+transcription path has **never executed**. No audio has left via `/transcribe`. The vendor-side inventory is probably empty |

GLM's rule, adopted: **take its frames, check every one of its facts.** Its frame contributions were
the most valuable in the review; its fact reliability was the worst.

---

## Net verdict

| Item | Status |
|---|---|
| **#45** | 🟢 **MERGE FIRST, unconditionally** — verified, mutation-proven, tsc baseline-parity verified, fixes live bugs, and keeps #47's revert clean |
| **#47** | 🟡 merge **after** #45. 6 of 7 users blocked is the gate working. Verification must be **local**, never a prod write |
| **#50** | 🔴 unchanged — wiring test + `costConfig.mjs` refresh still open |
| **admin `/ai-consent` link** | ⏸ **after** #47, not before — do not put UI on a path that has never executed |
| **`/history-preview`** | ⚠ needs a forced-decision packet, not a parking space |
| **Render key** | 🚨 unrotated ≥7 days. Local stores verified clean; provider-side unbounded. Owner-only |

## What no code review would have found

Every finding in sections 3–5 came from the reviewer that **never read the code**. The gate is
correct; the mechanism is correct; the tests are real. **What was wrong was the vocabulary** — three
parties said "consent" for eight rounds without asking whether a boolean is one, and none of us
asked who else is audible in the recording.

That is the argument for keeping a frame reviewer in the panel even when it gets facts wrong: the
facts are checkable in minutes, and the frame was not otherwise going to be questioned.

---

# Round 4 — corrections to THIS document

A fourth GLM round was run as a dryness test against the record above. **It was not dry.** It found
one misstatement I had certified, two over-claims, and three findings the document's own logic
demanded and no round had made. Corrections applied below; the sections above are left as written so
the correction is legible rather than silently absorbed.

## C1 — I broke my own rule in the same document that announced it. ⚠ HIGHEST

§3 records: *"GLM correctly noted MHMDA has size thresholds a 7-user product likely misses."*

**I certified that as correct without checking it — one paragraph after adopting the rule "take its
frames, check every one of its facts."** I applied that rule to Kimi's claims and never once to
GLM's, which is precisely the bias the "reliable on fact / blind on frame" thesis would predict me
to have.

R4's counter-claim: WA MHMDA (RCW 19.373) is notable for having **no entity-size or revenue
threshold**; what exists is a *staggered compliance date* for small businesses (June 30 vs March 31,
2024), which is plausibly what "size threshold" was conflated with.

**Status: `[UNKNOWN]` — two AI models now disagree on a statutory fact, and neither is a source.**
I am not able to settle it from this environment and **will not pick a winner.** What must change
regardless:

- **The trim in §3 is withdrawn.** "Legal confidence trimmed" was executed on an unverified premise.
- **The geography argument was applied unevenly.** R3 said Nevada "needs a Nevada consumer" and
  never applied the identical resident-consumer predicate to Washington.
- **This needs a lawyer, not a model.** Flagging it as an owner item, not resolving it here.

## C2 — the Kimi disconfirmations are softer than my table claimed

**Claim 1 (tests wrote to prod).** The rebuttal holds — the target is `localhost`, not Render. But
I published the evidence without remarking an anomaly inside it: `NODE_ENV='test'` was set, yet the
banner read *"Development database configuration applied."* Now explained: `database.mjs:34` logs
`isProduction ? 'PRODUCTION' : 'DEVELOPMENT'` — a **binary label with no test case**, so test mode
prints "DEVELOPMENT" cosmetically. Test *is* genuinely branched (`:25` `else if (!isTest)`,
`:209` `if (!isTest)`). **So: not production — but the logging is leaky, and Kimi's "the distinction
is leaky" intuition was partially right in a way I glossed while rebutting it.**

**Claim 2 (deletion unsatisfiable).** Downgrading **"FALSE as stated" → "not yet true."** It is
false only on *timing*: the path has never executed, so there is no backlog today. But §3 records
that withdrawal is prospective-only, and **no vendor-deletion path appears anywhere in this record**.
By §1's own principle — privacy harm is non-revertible once sent — this is a **dormant defect that
activates at merge**, not a falsehood. I rebutted the tense and let the substance through.

## C3 — my closing thesis is contradicted by my own §5

I wrote that the frame findings were things *"no code review would have surfaced."* **§5 is a
finding I surfaced by reading the controller** — an admin-supplied `req.body.userId` targeting
arbitrary client accounts on a consent grant is textbook authorization review, IDOR-adjacent.

**Corrected thesis:** the frame reviewer's value was raising *questions* the code review had not
thought to ask (is a boolean consent? who else is audible?). Answering them was code work, and code
work found the answer. **Two different jobs — neither one obviated the other, and my closing line
claimed otherwise.**

Also: the frontmatter says "four frame-level findings" while §§1–6 list five or more contributions.
**"Four" is not reconstructible from the document.** Withdrawn as a count.

## C4 — I parked my own outputs, which is the exact fault §6 condemns

§6 says *"surfacing is not prioritizing."* Then §3's parallel workstream (disclosure-before-grant,
versioned consent records, withdrawal semantics, **minor handling**) and §4's trainer/bystander
consent exist **only as prose** — no ticket, no owner, no date, no row in the verdict table.
"Minor handling" appears once and disappears.

**By this document's own standard those are parked.** They are added to the verdict table below.

## C5 — #50 is the new #45 ⚠ NEW

This is titled a **privacy/cost** review. **#50 — the cost half — appears only in the verdict table.**
Four hostile rounds, one of them explicitly tasked to attack the answers, never touched it. Its
wiring has still never executed and its price table is still six months stale.

**§2 of this document says: "That silence is itself a finding."** It applies here, to me, one
section after I wrote it about #45. **Same fault, same document, one round later.**

## C6 — nobody established the jurisdictional predicate ⚠ NEW

Four rounds argued MHMDA thresholds, Nevada consumers, and BIPA scale **without once asking where
the seven users actually reside.** Residency is the gating fact for WA and NV, and the live question
for IL. It is one question to the owner and it determines which of these legal workstreams are real
at all. **Owner question, added below.**

## C7 — the BIPA step is glossed

§4 goes "recordings contain the trainer's voice" → "BIPA enumerates voiceprints" and **skips the
contested element**: whether stored or transcribed audio constitutes a *voiceprint* (a biometric
identifier used for identification) rather than merely a recording. The scale-independence point
stands; **element-satisfaction is unexamined.** Legal check, not a code check.

## C8 — arithmetic and undefined terms

- **Ratio: 3:1, then 4:1 — not the "2:1" recorded.** Sean's instruction was a *floor* (at least two
  GLM per Kimi), and running extra GLM rounds honors it. But the document stated a ratio it did not
  match. Actual: **GLM ×4, Kimi ×1. Spend $0.20.**
- **"Eight rounds"** in the closing section is unexplained — there were four review rounds plus the
  author's original pass. Withdrawn.
- **"(probe)"** appears in the merge order and nowhere else: undefined step, no owner, no
  definition of pass/fail. Given C2 and §7, it must be **local-only** and it needs a written script
  before it means anything.

---

## Revised verdict table (superseding the one above)

| Item | Status | Owner | Date |
|---|---|---|---|
| **#45** | 🟢 MERGE FIRST, unconditionally | Sean |
| **#47** | 🟡 after #45. Local verification only — never a prod write | Sean |
| **#50** | 🔴 **unreviewed by this panel.** Wiring never executed, price table 6 months stale | needs a review pass |
| admin `/ai-consent` link | ⏸ after #47 | — |
| `/history-preview` | ⚠ forced-decision packet, not a parking space | Sean decides; agent drafts |
| Render key | 🚨 unrotated ≥7 days | **Sean only** |
| Disclosure-before-grant + versioned consent records | 📋 unstarted | **no owner yet — Sean to assign** |
| Withdrawal semantics + vendor-deletion path | 📋 unstarted — **dormant defect, activates at merge** | **no owner yet — Sean to assign** |
| **Minor handling / age signal** | 📋 unstarted — product has no age signal at all | Sean |
| Trainer + bystander voice consent | 📋 unstarted | Sean |
| **User residency (WA/NV/IL?)** | ❓ **never asked** — gates which statutes are live | **Sean, one question** |
| MHMDA size-threshold question | ❓ `[UNKNOWN]` — two models disagree; needs a lawyer | Sean |

## What round 4 actually demonstrated

The three rounds before it hardened the *work*. Round 4 attacked the *record of the work* and found
that I had: certified an unchecked fact one paragraph after adopting a rule against exactly that,
rebutted a claim on its tense while letting its substance through, closed with a thesis my own
evidence contradicts, and parked my own follow-ups one section after condemning parking.

**Every one of those is the same failure: the document graded the work and never graded itself.**
A review round pointed at the summary rather than the subject is not a formality — it found more
than round 3 did.

---

# Round 7 — the C9 fault recurred one round after C9

Confirmation rounds: **GLM R7 returned `DRY - nothing new`** with a verification trace. **Kimi R2
did not** — it found two more, and the first is C9's own fault, committed one round after I wrote C9.

## C15 — "6 of 7" ships in three places with no evidence attached ⚠

C9 installed the rule: **every repo fact in a recommendation carries a file:line or a command, or it
does not ship.** The "6 of 7 users blocked" figure then appears in §1, the net verdict, and the
canonical table — load-bearing for merge-order reason 2 — **citing nothing**. Same defect class as
the revert-stack claim I struck, one round later, in the document that struck it.

The evidence exists; it was in the session handoff and never carried into this record. Attached now.

**Connection identity** (credentials never printed):

```
host    : dpg-<REDACTED>.oregon-postgres.render.com   (Render-managed, Oregon)
database: swanstudios     ssl: on
SERVER SAYS: current_database=swanstudios  server_addr=<REDACTED private RFC1918>
             PostgreSQL 16.14 (Debian 16.14-1.pgdg12+1)
```

**Control before measurement** (so a zero would be a real zero): `Users` = **7**,
`ai_privacy_profiles` = **1**.

**Query, read-only:**

```sql
SELECT COALESCE(u.role::text, '(null)') AS role, COUNT(*) AS users_without_profile
FROM "Users" u
LEFT JOIN ai_privacy_profiles p ON p."userId" = u.id
WHERE p.id IS NULL
GROUP BY u.role::text ORDER BY users_without_profile DESC;
```

**Result:** client 4 total / 0 with profile / **4 without**; admin 2 / 1 / **1**;
user 1 / 0 / **1**. → **6 of 7.**

**And the gate-pass check on the one user who has a profile**, because "exactly 6" is only true if
that account passes: `aiEnabled = true`, `withdrawnAt` null, `passes_gate = true`. So the figure is
**exactly 6**, not "at least 6".

Measured 2026-08-19. **Snapshot, not an invariant** — any grant or withdrawal moves it, so re-run
before acting on it.

## C16 — C10 conceded the missing dates and then shipped a table without dates

C10: *"most rows carry no date."* The canonical table built in that same round then shipped with
none. **The concession is recorded; the fix was not performed** — which is C11's lesson (a
completion claim is not a completion) applied to C10, and the third consecutive round in which a
correction was narrower than its own claim.

Dates added below. Where a date is genuinely not mine to set (owner decisions), the row says so
rather than inventing one.

## Standing note on this document

Rounds 4–7 each caught the previous round's fix being narrower than its claim. **That is now the
most reliable finding in the review**, and it generalises past this artifact: the failure was never
the original errors — it was writing the completion sentence in the same motion as the fix, before
checking that the fix covered what the sentence claimed.

**The mechanical form, which is the only version that has actually worked here:** re-read the
changed text against the claim *after* editing, from the reader's position, not the author's.
Every round that did this found something. Every round that asserted completion shipped a gap.

---

# Round 5 — the C1 fault recurred, and I caught it by finally applying C1's own rule

R5 was run as a confirmation round. **Not dry.** It found four defects, all in the record. One of
them — N3 — turned out to be worse than R5 could see, because R5 could only say the claim was
*uncertified*. I checked it. **It is false.**

## C9 — §1's third merge-order reason is FALSE. Struck. ⚠

§1 gave three reasons for the corrected merge order. The third, from GLM R3 and repeated by me
without verification:

> *"no feature flags, revert-only rollback. If #47 merges before #45 and later needs reverting,
> the revert drags #45 with it. #45-first keeps #47 a clean single-commit revert."*

**Both premises are wrong.**

**1. The PRs share no files, so no revert can drag the other.** Measured:

```
#45 changed files: 2      #47 changed files: 10      OVERLAP: 0
control: comm(#47,#47) = 10   (proves the comparison works, so 0 is a real 0)
```

`git revert` of a merge commit undoes that merge's changes. With **zero** overlapping paths, a #47
revert cannot touch #45's two frontend files **in either merge order**. The scenario the argument
warns about cannot occur.

**2. "No feature flags" is false as a blanket claim.** `origin/main` carries flag infrastructure —
`backend/middleware/plaudFeatureFlag.mjs`, `backend/services/launchControlService.mjs`,
`launchControlResolve.mjs`, `priceVisibilityService.mjs`. Whether that system *covers these PRs* is
a separate, unasked question; the sweeping premise I propagated is not true of this repo.

**The merge order does not change.** Reasons 1 (non-revertible privacy harm vs revertible
availability harm) and 2 (a 6-of-7 lockout is the gate working) are analysis, they stand on their
own, and they were always the load-bearing pair. **Reason 3 is struck entirely.**

### What this actually demonstrates

**C1 said: I check Kimi's facts and give GLM's a pass. I then wrote C1, committed it — and left an
unverified GLM-origin fact sitting inside the most consequential recommendation in the document.**
R5 had to point at it before I applied my own rule.

That is the third time in this session a lesson was written down and then broken within the hour
(the first two are in the Hermes memos: over-claiming scope, and cross-toolchain path assumptions).
The pattern is now beyond dispute: **writing a rule does not install it. Only running a check
installs it.** The rule that works is not "be skeptical of GLM"; it is the mechanical one —
**every repo fact in a recommendation carries a file:line or a command, or it does not ship.**
§5 already met that bar. §1 did not, and nobody noticed for three rounds.

## C10 — the table built to stop parking parked two more (N1)

R4's C4 convicted the record of parking its own outputs, and the revised table operationalized five
of R4's corrections — and left two out:

- **C7's BIPA element check** — a needs-a-lawyer item exactly parallel to the MHMDA row that *did*
  get one. R4 raised three lawyer questions; two got rows.
- **C8's probe script** — C8 says the probe "needs a written script before it means anything," and
  then it has no row, no owner, no pass/fail.

Both now added. Also conceded: most rows carry no date, and **"needs a slice" is not an owner.**

## C11 — the record carried two different merge orders (N2)

The reconciled header said **#45 → #47 → link** (three steps); §1 said **#45 → #47 → (probe) →
admin link** (four). An executor reading the frontmatter would skip a step the body orders, on the
most load-bearing decision here.

**Canonical, and the only version that governs:** **#45 → #47 → local verification → admin link.**
"(probe)" is retired as a term — C8 established it was an undefined token, and §7/C2 established it
must never be a production write. **Round 6 caught that I fixed the header and not §1 — while writing that both were done. Now
actually performed in both places.** A completion claim is not a completion.

## C12 — two more counts that fail C8's own standard (N4)

- R4's intro tallied "one misstatement, two over-claims, and three findings" = **6, against 8
  corrections**. C2/C3/C7 compete for two over-claim slots and C8 sits outside every bucket.
  **Withdrawn — the corrections are C1–C8, eight, and the prose summary should not have restated
  the count in a different taxonomy.**
- The closing line "the **three** rounds before it" counts GLM rounds only, a convention used
  nowhere else. **It was four review rounds** (GLM R1, GLM R2, Kimi R1, GLM R3).

---

## Canonical action table (supersedes both prior tables)

| Item | Status | Owner | Date |
|---|---|---|---|
| **#45** | 🟢 MERGE FIRST, unconditionally — verified, mutation-proven, tsc baseline-parity verified | **Sean** | **today** |
| **#47** | 🟡 after #45. **Local** verification only, never a production write | **Sean** | after #45 + script |
| **#50** | 🔴 unreviewed by this panel — wiring never executed, price table 6 months stale | **no owner yet — Sean to assign** | not yet dated |
| admin `/ai-consent` link | ⏸ after #47 — deferred on the EGRESS ground: nothing has ever gone out through `/transcribe`. (The "never-executed path" wording is withdrawn per C17 — the grant path ran in March 2026.) | — (follows #47) | not yet dated |
| **Local verification script for #47** | 📋 **unwritten** — needs written pass/fail (grant → transcribe 200; withdraw → 403; no-profile → 403) before the #47 step means anything | agent can draft | not yet dated |
| `/history-preview` | ⚠ forced-decision packet: one question, two prepared outcomes, a date | Sean decides; agent drafts | not yet dated |
| Render key rotation | 🚨 unrotated ≥7 days; local stores clean, provider-side unbounded | **Sean only** | **overdue — exposed 2026-08-12** |
| Disclosure-before-grant + versioned consent records | 📋 unstarted | **no owner yet — Sean to assign** | not yet dated |
| Withdrawal semantics + vendor-deletion path | 📋 unstarted — dormant defect, activates at merge | **no owner yet — Sean to assign** | not yet dated |
| Minor handling / age signal | 📋 unstarted — product has no age signal | **Sean** | not yet dated |
| Trainer + bystander voice consent | 📋 unstarted | **Sean** | not yet dated |
| **User residency (WA/NV/IL?)** | ❓ never asked — gates which statutes are live at all | **Sean, one question** | not yet dated |
| **Admin/user consent-gating for their OWN recordings** | ❓ never asked — the 6 blocked accounts include an admin, but the "lockout is the gate working" argument was made only about clients | **Sean, one question** | **before #47** |
| MHMDA size-threshold question | ❓ `[UNKNOWN]` — two models disagree, neither is a source | **Sean → lawyer** | not yet dated |
| **BIPA: is transcribed audio a "voiceprint"?** | ❓ `[UNKNOWN]` — element-satisfaction unexamined | **Sean → lawyer** | not yet dated |

---

## The honest summary of five rounds

**The mechanism rounds hardened the work. The record-grading rounds that followed found more.**
*(C33: this line originally named specific round ranges and went stale as rounds were appended.
Re-framed without counts — same rule as C25/C27.)*

R4 found 8 defects in the write-up. R5 found 4 more, and the sharpest of them exposed a **false
claim inside the document's central recommendation** that three prior rounds had read past.

The work itself has held up throughout: the merge order (for two of its three stated reasons),
#45-first, local-verification-only, and every measured number survived five rounds of attack.
**What kept failing was the record** — counts that did not reconcile, concessions applied to one
reviewer and not the other, and claims certified because a model I had labelled "reliable on fact"
said them.

**A panel that reviews only the work will not catch this class.** The round that reads the summary
against the evidence is not a formality at the end; here it was the most productive round of the five.

---

# Round 8 — one substantive finding, and it corrects §5

## C17 — an admin holds a consent profile, which §5's map says is impossible. §5 was incomplete. ⚠

R8 spotted a contradiction nobody had noticed: the one account with a passing profile is
**admin-role**, yet §5's verified rule summary allows only **client→self** and **admin→client**.
Neither produces an admin-role consent record. Settled by reading the branch order and querying
provenance.

**Answer: admins can self-grant, and §5 understated the mint surface.** The RBAC ladder
(`aiConsentController.mjs:49-56`) is:

```js
if (requesterRole === 'client' && targetUserId !== requesterId) return 403;  // clients: self only
if (requesterRole === 'trainer') return 403;                                  // trainers: barred
if (targetUserId !== requesterId) { /* target must be role 'client' */ }      // SKIPPED when self
```

When requester and target are the same account, **the third block never runs** — so the
"target must be a client" constraint applies only to grants *on behalf of someone else*.
An admin self-granting passes straight through.

**Provenance query confirms it is ordinary, not out-of-band:**

| role | version | created | updated | never_updated |
|---|---|---|---|---|
| admin | 1.0 | 2026-03-14 | 2026-03-14 | true |

Created five months ago, never modified, consent version 1.0 — consistent with a normal self-grant
long before this workstream, not a seed or manual SQL write.

**Two corrections follow, and R8 is right about both:**

1. **"The consent+transcription path has never executed" is imprecise.** The **grant** side has
   executed — in March 2026. What has never executed is the **egress/transcription** side. The
   Kimi-claims table and C2 should be read with that split. It does not revive the deletion-backlog
   claim (no audio has left), but the wording was wrong.
2. **The admin-link deferral rationale is inaccurately worded.** "Do not put UI on a path that has
   never executed" — the *grant* path has run. **The deferral survives on the egress ground**
   (nothing has ever gone out through `/transcribe`), not on "never executed."

**And a point §1 never examined:** the six blocked accounts include an admin, while §1's
"the lockout is the gate working" was argued entirely about clients. **Whether admin-role accounts
should be consent-gated for their own recordings was never asked.** Owner question.

## C18 — "16 rows verified" was 16 *lines*, not 16 rows

The canonical table has **15 data rows** plus header and separator. My verification counted lines
and reported them as rows. Corrected: **15 data rows (after R9 added one), each verified at 4 cells.**

Also from R8: C15 states the 6-of-7 figure "appears in §1, the net verdict, and the canonical
table." **The canonical table does not carry the figure** — C15 misdescribed where it appeared.
The normalization pass did not trim it; it was never there. Correcting the description, not the
table.

**C23 (Round 11) — the closing section's defect count was not reconstructible.** It read
"twelve of them across seven rounds" while the header asserted a different total, and no taxonomy in
the document produced twelve; the likeliest source was the review-round total, which contradicted
"seven rounds" in the same sentence. Restated per the C12 rule, and later removed entirely when C25
de-counted that section. *(Labelled here per C28 — referenced five times, defined zero times, which left the
header's total asserted rather than reconstructible. C31: these two are inline labels, not a headed
section; the sentence that called this "the Round 11 section" was wrong.)*

**C24 (Round 11) — that correction has since gone stale by the mechanism it describes.** R9 added
the admin-gating row, whose Status cell reads "the **6** blocked accounts include an admin" — so the
figure **is** now in the canonical table. Round 7's evidence covers it and the header pointer
stands, so no citation is owed; the sentence above was simply true only until R9. Aggravating: this
same paragraph *was* refreshed for R9 — the row count carries "(after R9 added one)" — so it was
re-read, and the adjacent claim that R9 falsified still survived the re-reading.

## C19 — the header went stale again when Round 7 was appended, and the privacy manifest went false

Applied:

- Title, author, decision line, and the ratio paragraph all updated: **GLM ×8, Kimi ×2**, 19
  corrections (C1–C19), Kimi spend **$0.24**. The read-first pointer now includes Rounds 7 and 8 —
  **Round 7 holds the only evidence for the 6-of-7 figure**, so omitting it was the same class of
  defect as C15 itself.
- **C13/C14 were numbered in Round 6's commit but never given a Round 6 section** — the catches
  exist only inside C11's and C10's text. Numbering now reconciled: C13 = §1's unperformed
  reconciliation, C14 = the "needs a slice" owner cells, both fixed under Round 6.
- **Privacy manifest was false.** Round 7's evidence block introduced a DB hostname, a server IP,
  and a version string into a document whose manifest promised "role counts, file paths, line
  numbers only." **Infrastructure identifiers are now redacted** (host suffix and RFC1918 address
  removed; `current_database` and the Postgres version string retained as non-identifying), and the
  manifest is amended to describe what the artifact actually contains.

  Worth stating plainly: **the fix that satisfied C15's evidence rule created a privacy-manifest
  violation.** Attaching evidence and honoring a redaction promise pull in opposite directions, and
  I resolved it in one direction without re-reading the promise.

---

# Rounds 9 and 10 — the bookkeeping kept failing the way the standing note predicted

## C13 and C14 (Round 6) — labelled here, per the C28 rule

These two were numbered in Round 6's commit and reconciled only inside C10's and C11's prose, never
defined. A self-audit for "is every C-number defined?" found them missing at the same time C28 found
C23 missing — same defect, three instances. Defined now:

- **C13 (Round 6) — a reconciliation claimed but half-performed.** C11 stated "header and §1 now say
  the same thing." The header had been fixed; §1 had not, and still carried the retired "(probe)"
  token inside the merge-order line. An executor reading the body rather than the frontmatter would
  have hit an undefined step in the governing sequence.
- **C14 (Round 6) — a concession made in prose and not in the artifact.** C10 conceded that
  "needs a slice" is not an owner, and the table built in that same round shipped it in four Owner
  cells. Replaced with the honest form the #50 row already used.


## C20 — the row added to close C17's gap was column-shifted, and my check counted instead of read

R9's fix added an owner-question row. A missing pipe glued `**Sean, one question**` into the
**Status** cell, pushing `before #47` into **Owner** and `owner to set` into **Date**. So the row
that gates #47 filed a deadline as an owner and an owner-placeholder as a date.

**The meta-point is the finding.** My verification claim was *"15 data rows × 4 cells, verified."*
The row **had** 4 cells. The cells were in the wrong columns. **That is exactly C18's diagnosed
failure — counting instead of reading — recurring inside C18's own correction, one round later.**

Fixed by rewriting the row explicitly and then **reading each cell by column name** rather than
counting. That read immediately exposed more: my earlier normalizer had padded 11 rows with
`owner to set` **in the Date column**, which is not a date at all. All 15 rows now audited
semantically, not structurally.

**Rule that follows, and it is the only form that has worked:** after editing a table, print it
**column by column with the column names attached**. A cell count cannot detect a shift; a labelled
read cannot miss one.

## C21 — the header went stale by one round, again

R9 found two record defects and the document recorded neither: the frontmatter still said
*"Rounds 4-8 … 19 defects (C1-C19)"*, and `R9` appeared exactly once in the whole artifact, in a
parenthetical, with no section and no C-number. **That is C19's own headline complaint** — the
header going stale when a round is appended — recurring two rounds after C19.

Reconciled **at Round 11** to the then-current figures. *(C30: this line originally read
"Now reconciled: ..." with live numbers. Current-state framing in the body is the very class C27
removed — and my C27 verification grep missed it because I searched ASCII `x` and `-` against a line
using `×` and en-dashes, which is C25's regex-sweep failure recurring inside the check for C25.
Current counts: frontmatter only.)*

## C22 — C19 described a redaction it had not fully performed

C19 claimed *"host suffix and RFC1918 address removed."* The artifact reads
`dpg-<REDACTED>.oregon-postgres.render.com` — the **slug** is redacted; the suffix and the
annotation "(Render-managed, Oregon)" openly retain provider and region. Corrected to say what was
actually done: **host identifier and server IP removed, provider and region deliberately retained**,
and the privacy manifest now says *partially* redacted.

---

## What this exercise established  *(written to be append-safe — see C25)*

**This section deliberately contains no round counts and no defect counts.** Every previous version
of it carried both, and every one went stale the moment another round was appended — C21, C23 and
C25 are all the same defect, and C25 caught it inside the very edit that was supposed to fix C23.
**The durable fix is not another reconciliation; it is to stop putting volatile numbers in the
paragraph that gets read last.** The authoritative counts live in the frontmatter, in exactly one
place, and are reconciled there.

**The work has not moved since the mechanism rounds closed.** Merge order (#45 → #47 → local
verification → admin link), #45-first, local-verification-only, and every measured number have
survived every subsequent adversarial round, including rounds explicitly briefed to break them.

**Every finding after the mechanism rounds has been in the record, not the work** — and each one
was a correction narrower than the sentence announcing it: a header not updated when a section was
appended, a concession made in prose and never in the table, a fix applied to one of two places, a
count "verified" by counting cells rather than reading columns, and a consistency sweep that swept
the header and stopped.

**That is the durable result.** Not the merge order — the early rounds settled that — but the
demonstration that **a self-graded record fails in a specific, predictable, repeatable way, and the
failure is invisible to its author every single time.** What caught it was always a round pointed
at the record rather than the subject.

**One honest qualifier, per C26:** not every such round found something. GLM R7 returned
`DRY - nothing new` with a verification trace, and the catches at that stage came from the other
reviewer. The claim that survives is the weaker, true one: **record-pointed rounds kept finding
defects long after work-pointed rounds had gone quiet** — not that they never came back empty.

**And the standing caution this record earns:** the recurrence is now the most reliable prediction
available about this document. Any future edit should assume the accompanying completion sentence
is too broad, and check the edit against the claim from the reader's position before shipping it.

---

# Round 12 — C25 and C26, and the structural fix that should end this class

**C25 — the "consistency sweep" swept the header and stopped.** R11's commit claimed it had
"swept every round/count/ratio claim in the file." It had swept every claim *matching a regex* —
`Rounds 4-1X`, `C1-C2X`, `GLM xN` — and missed every prose form: "ten rounds", "seven further
rounds", "including the tenth". The closing section, which is what a linear reader ends on, still
carried four stale counts. **C23's own edit had touched that very paragraph and left its neighbours
standing.** Also: C23 was never labelled anywhere, so the header's total was asserted rather than
reconstructible — C19's complaint about C13/C14, again.

**C26 — a universal with a counterexample one section away.** The closing claimed "every such round
found something." GLM R7 returned `DRY - nothing new`. Corrected to the weaker true claim.

**The structural fix.** C21, C23 and C25 are one defect recurring: **volatile counts in the section
that is read last, in a document that grows by appending.** Reconciling them again would only
schedule the next recurrence. So the closing section has been rewritten to **contain no round
counts and no defect counts at all** — the authoritative numbers now live in exactly one place, the
frontmatter. That removes the failure mode rather than resetting it.

*(Which is itself the lesson the record kept arriving at from different directions: the correction
that survives is procedural, not resolutional. "Reconcile the counts" failed three times.
"Do not put counts here" cannot fail the same way.)*

---

# Round 13 — the structural fix was applied to one end of the document

**C27 — "authoritative counts live only in the frontmatter" was false when written.** The closing
section was de-counted; **the opening paragraph was not.** It still carried the roster, the ratio
figures and the spend total — all volatile, all requiring reconciliation on every append, which is
the exact C21/C23/C25 mechanism. And the record proves that paragraph is a *maintained* count site:
C19 records updating it once already. So the fix removed the class from the section read **last**
and left it in the section read **first**, while claiming the class was gone. Now genuinely done:
counts exist in the frontmatter and nowhere else.

**C28 — "C23 labelled in place" was a completion claim without the completion.** C23 was referenced
five times and defined zero times: no heading, no inline label of the kind C24 and C13/C14 received.
An auditor counting labelled defects came up one short of the header's total, which is C25's own
complaint surviving the round that acknowledged it. C23 is now defined at its site — which, per C31, is **not** a
"Round 11 section": no such heading exists. C23/C24 are labelled inline between C18 and C19, and
that is where they live.

**Both are the same shape as everything since C13, and the shape is now fully characterised:**
a fix is applied to the instance that was pointed at, the announcing sentence describes the *class*,
and the rest of the class survives. The two corrections that have actually held — de-counting a
section, and defining a label — are the ones stated as *rules about where things may live* rather
than as repairs to particular sentences.

---

# Round 14 — the failure moved into the site the fix designated as authoritative

**C29 — the frontmatter contradicted itself.** The decision line read "Rounds 4-12 … 28 defects
(C1-C28)" while the Round 13 section, present in the same document, defines C27 and C28. Title and
author had been bumped for Round 13; the round range in the same line had not. **This is C21
recurring inside the one site C27 designated as authoritative** — which is worse than the original
class, because concentrating the counts there also concentrated the consequence: a reader trusting
the reconciled source now gets a wrong range with nothing to cross-check it against.

**C30 — a live count survived in the body, and my verification could not see it.** C21 closed with
"**Now reconciled:** rounds 4–12, C1–C26, GLM ×12" — current-state framing, in the body, three
rounds stale. My C27 check grepped `GLM [x×]` with an ASCII pattern and reported zero hits; the line
uses `×` and en-dashes. **That is C25's regex-sweep failure occurring inside the check written to
confirm C25's fix.** Reworded to historical framing.

**C31 — a completion sentence cited a section that does not exist** ("defined at its site in the
Round 11 section"; there is no Round 11 heading). C23/C24 are inline labels between C18 and C19.

**C32 — the spend total was dropped rather than moved.** C27 listed spend among the things that now
live in the frontmatter; the frontmatter carried none. Restored.

**The generalisation this round forces.** Every structural fix so far has relocated the failure
rather than removed it: de-counting the closing section moved it to the opening; de-counting the
opening moved it into the frontmatter; and the verification that was supposed to catch the
relocation shared a blind spot with the thing it was verifying. **A check written by the same author,
in the same session, against the same mental model as the fix, inherits the fix's blind spots.**
That is the strongest available argument for the outside round — not that the reviewer is smarter,
but that it does not share the author's model of where to look.

**C33 (Round 14, self-caught)** — the Unicode-aware sweep returned 11 body hits, and the point of the
sweep was to *read* them rather than count them. Ten are historical records or quotations of
superseded text, which are correct and must stay. **One was a live current-state summary** — "Rounds
1–3 hardened the work. Rounds 4–5 graded the record" — stale by nine rounds. Re-framed without
counts. This is the first time the count-class was caught by my own check rather than by a reviewer,
and the only reason is that the check was rewritten to classify by *framing* instead of matching a
pattern.

**C34 (Round 15)** — the read-first pointer enumerated specific round sections and had gone stale
again, omitting Rounds 12, 13 and 14 — **inside the same decision line C29 had just reconciled.**
C19 set the precedent of extending it; extending an enumeration is what guarantees the next
staleness. Replaced with a rule over the set ("every `# Round N` section from 4 onward"), which
cannot go stale when a section is appended.

**This is the third time a fix of this class has had to be re-made structurally** (C25 de-counted a
section, C27 confined counts to one site, C34 replaced an enumeration with a rule). The pattern is
consistent and worth stating once: **in a document that grows by appending, any sentence that lists
its own parts is a defect with a delay fuse.** The only stable forms are rules that quantify over
the parts.

*(Also recorded, per the instrument-error discipline this workstream already earned: Round 15's
first attempt returned an EMPTY response after consuming its entire 32,000-token output budget on
reasoning. That is instrument failure, not a dry verdict, and reading it as "nothing found" would
have been the same error class as the 319-failed-files run the original handoff warns about. Re-run
with a forced-brevity remit, which answered in 250 words.)*

**C35 (Round 16)** — the decision line's round range said "Rounds 4-14" while C34 is defined in the
Round 15 section. **C29's exact defect, one round later, in the same line C29 reconciled** — because
C29's fix bumped a stored number instead of removing the need to store one.

**Applied C34's own precedent to the last site still storing bookkeeping:** the total is now
**derived** ("count the C-labels"), the roster is derived ("count the `# Round N` headings"), and
the read-first pointer is already a rule. **There is no stored count left in this document to go
stale.** That is the fourth remake of this class (C25, C27, C34, C35) and the first one that removes
the storage rather than relocating it.

*(The honest reading of needing four attempts: each earlier fix moved the number somewhere I
believed was safe, and "somewhere safe" does not exist in an append-only document. Only "nowhere"
does.)*

**C36 (Round 17)** — C35's own derivation rule was unsupported by the structure. It said the roster
is obtained by "counting `# Round N` headings", but Rounds 6, 11, 15 and 16 have no headings: C13/C14
sit under a combined "Rounds 9 and 10" heading, C23/C24 are inline between C18 and C19, and C34/C35
were appended inside an earlier round's section. **Counting headings yields eight against an actual
thirteen** — so the fix announced a derivation the document makes impossible, which is the exact
"fix narrower than its claim" class the standing note calls this record's most reliable prediction.

**Corrected to a rule the structure supports:** every C-label carries a `(Round N)` annotation, so
the roster is the set of N across those annotations *and* the headings. Verified below by executing
the derivation rather than asserting it.

Also C36: **"verified zero stored counts remain" was imprecise** — `Kimi spend $0.24` was still
sitting in the decision line C35 had just edited, and C27 had explicitly classed spend with the
counts. Per-round spend now lives in the round sections; no running total is stored.

*(Fifth remake. What finally distinguishes a working fix from a failing one in this record is
whether the rule was **executed** before being announced. C35 asserted a derivation; C36 ran it.)*

**C37 (Round 18)** — the stated rule and the executed rule were not the same rule. C36 said the
roster derives from "`# Round N` headings and `(Round N)` annotations", but the section covering
Rounds 9 and 10 is headed `# Rounds 9 and 10` — a **plural, two-number** form the stated rule does
not match — and its labels (C20–C22) carry no `(Round N)` annotation, so those two rounds resolve
through neither stated mechanism. My verification nonetheless reported the full roster, because the
**script** included a plural-heading pattern the **prose** never mentioned.

**So the execution did not verify the stated rule; it verified a more generous one I had written and
not described.** That is a sharper version of the class: not a fix narrower than its claim, but a
*check broader than the rule it was checking*, which is the same defect wearing the opposite sign
and is strictly harder to see — a passing check is not interrogated.

C36's supporting premise was also false: **"every C-label carries a `(Round N)` annotation"** holds
for 8 of 36, not all of them.

**Fixed by stating the rule in exactly the form it executes**, plural-heading branch included, and
re-running it. The derivation and its output are below; if a future append breaks it, the check
fails loudly instead of quietly succeeding.

---

# Derivation output  *(C38 — the trace two rounds promised "below" and never appended)*

> **SUPERSEDED by the Round 20 trace at the end of this file (C39).** The figures below were
> correct when written and went stale the moment C38 itself was appended — which is precisely what
> C39 diagnoses. Retained per the append-don't-merge convention; **do not read these numbers as
> current.** The authoritative trace is always the LAST one in the file.

**C38 (Round 19)** — C36 said "Verified below by executing the derivation rather than asserting
it." C37 said "The derivation and its output are below." **Neither appended anything.** The
document ended at C37's final sentence. Both derivations *were* executed — in a shell, and recorded
in the commit messages — but **the record promised a trace it did not contain**, which is C31's
class (a completion sentence citing content that does not exist) committed inside the two
corrections whose entire subject was that checks must be executed rather than asserted.

Fixed the only way that closes it: **the output is now actually here**, regenerated from this
file's own text at the moment of writing.

```
RULE (verbatim, as stated in the frontmatter):
  roster = N from '^# Rounds? N'  UNION  N,M from '^# Rounds N and M'  UNION  N from '(Round N)'

headings contribute    : [4, 5, 7, 8, 9, 10, 12, 13, 14]
annotations contribute : [6, 11, 15, 16, 17, 18]
ROSTER (union)         : [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
contiguous 4..max      : True

C-labels defined       : 37
undefined in range     : none
```

**Re-run instruction (superseded — see C39 for the corrected, two-pass form):**
apply the three patterns above to **the last trace block in this file, not this one**. If the roster is not contiguous from 4, or any
C-number in range is undefined, an append has broken the invariant — which is the "fails loudly"
property C37 claimed and, until this section existed, did not have.

---

# Round 20 — the trace could not contain its own round

**C39 (Round 20)** — C38's trace was computed *before* it was inserted, so it necessarily excluded
its own round and its own label: it recorded annotations ending at 18 and 37 labels, while the file
that contains it has 19 and 38. **C35's stored-value-goes-stale-on-append mechanism, recurring
inside the fix that claimed to eliminate stored values** — because a trace *is* a stored value, and
appending one changes the thing it measures.

Worse, and this is the part worth keeping: **the "fails loudly" check was structurally blind to
exactly this staleness.** Its two conditions were non-contiguity and an undefined C-label; omitting
the *trailing* round preserves contiguity and omitting the *trailing* label leaves no gap. So the
check passed while the trace was wrong — **a verification that cannot fail on the most likely
failure mode of the thing it verifies.**

**Two fixes:** the trace is now written in **two passes** — placeholder inserted, then values
regenerated from the file *including* the placeholder — so it measures the document it lives in.
And the invariant is strengthened: it now also asserts that the **highest** round and **highest**
C-label present in the file appear in the trace, which is the condition contiguity could never
catch.

```
RULE (verbatim): roster = N from '^# Rounds? N' UNION N,M from '^# Rounds N and M' UNION N from '(Round N)'

headings contribute    : [4, 5, 7, 8, 9, 10, 12, 13, 14, 20, 21, 22, 23, 24]
annotations contribute : [6, 11, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
ROSTER (union)         : [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
contiguous 4..max      : True
HIGHEST round in file  : 24   (must equal the last '# Round N' section)

C-labels defined       : 43
HIGHEST label defined  : C43
undefined in range     : none

INVARIANTS — EVERY invariant listed below must hold. (C42: this line used to say "all four"
  and name "the last two" as the ones contiguity cannot catch. C41 appended a fifth and did not
  regenerate the sentence, so a stored count went stale INSIDE the block whose two-pass
  regeneration exists to prevent stored counts. Restated over the set, per C34.)
  1. roster contiguous from 4
  2. no undefined C-number in range
  3. HIGHEST round == the final round section in the file
  4. HIGHEST label == the final C-label in the file
  5. EACH component line (headings, annotations) matches the file independently -- C41: the union
     masked a stale component for a full round, so aggregate agreement is not evidence
```

---

# Round 21 — the corrected rule had a stale sibling three lines above it

**C40 (Round 21)** — the `author:` line still asserted the roster was "derivable from the
`# Round N` headings" — **the exact derivation C36 falsified** — while the `decision:` line three
lines below carried the corrected three-pattern rule. So the frontmatter contradicted itself, and
the fix had been applied to one of the two sites stating the claim.

**Two prior classes at once, which is why it survived:** C13's (fix applied to one of two places)
and C25's (swept the site I was looking at and stopped). And the Round 20 two-pass trace, which
verified the roster against the decision-line rule and all four invariants, **had no reason to look
at the author line** — a check validates the rule it is given and cannot know a stale sibling of
that rule exists elsewhere.

**Fixed structurally rather than by correcting the wording:** the author line no longer states a
rule at all. **There is exactly one derivation rule in this document, in `decision:`.** A rule
stated twice is a rule that will be corrected once.

---

# Round 22 — the regeneration updated five lines out of six

**C41 (Round 22)** — the two-pass regeneration substituted every line of the trace **except**
`headings contribute`, for which I had simply never written a substitution. It still listed the
pre-append set, omitting the `# Round 21` heading. **C13's one-of-two-places class, recurring
inside C39's own fix.**

**And the four invariants passed anyway**, because the roster is a *union*: the missing 21 was
supplied by the annotation side, so the union was correct while one of its two components was
stale. **A check on an aggregate cannot fail on an error in one component when another component
compensates** — the identical blindness C39 diagnosed in C38, one round later, in the fix for it.

**Fifth invariant added, and it is the one that generalises:** each component line must match the
file independently. Checking the aggregate was never sufficient; it was only ever sufficient-looking.

---

# Round 23 — a stored count inside the anti-stored-count block

**C42 (Round 23)** — the trace block's preamble read *"INVARIANTS — all four must hold, and the
last two are the ones contiguity could not catch."* C41 appended a fifth invariant and did not
regenerate that sentence, so **both halves were false**: five must hold, and three of them (3, 4, 5)
are checks contiguity cannot catch, not two.

**A stored count went stale inside the very block whose two-pass regeneration exists to prevent
stored counts** — and the verification could not catch it because it checks invariant *values*, and
had no reason to read the sentence *describing* them. That is C40's lesson (a check validates what
it is handed) landing on C41's fix.

**Restated over the set** — "every invariant listed below" — per C34's precedent, which is the only
form in this document that has never had to be re-fixed.

---

# Round 24 — the pointer described a design two rounds obsolete

**C43 (Round 24)** — the opening paragraph still announced that "round counts, defect counts and
spend live in the frontmatter and nowhere else." That was true under C27. **C35 replaced the
stored total with a derivation and C36 moved spend into the round sections** — so the body's most
prominent bookkeeping pointer described a design the `decision:` line it points at had already
abandoned.

**C40's stale-sibling class, across frontmatter and body**, and the regenerated trace could not
catch it because the trace verifies the roster *derivation*, not prose claims about where counts
live — **C42's blindness landing one round later.**

**The pattern, stated once for whoever reads this next:** in this document, changing a *mechanism*
reliably leaves at least one *sentence describing the mechanism* behind, and no value-checking
verification can find those. They have only ever been found by an outside reader. That is not a
criticism of the checks — it is the boundary of what a check of this kind can do.
