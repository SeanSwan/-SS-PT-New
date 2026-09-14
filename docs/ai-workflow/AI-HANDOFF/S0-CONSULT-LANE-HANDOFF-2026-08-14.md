---
decision: S0 (consult-lane receipts) is MERGED to main. The next agent runs a full hostile review of this work through BOTH Kimi K3 and HY3, then works the prioritised list — starting with a P1 CI outage that is not mine.
status: open
supersedes: none
---

# S0 CONSULT-LANE HANDOFF — 2026-08-14

**Author:** Opus 5, session `319bef07`, worktree `.claude/worktrees/s0-receipt-v1`.
**Scope:** the consult lane / receipts slice. **This is not the repo-wide handoff** — read
`SWAN-CONTINUATION-HANDOFF-2026-08-14.md` for that; this file goes deep on one slice and on the
review discipline that produced it.
**Delivery state:** `merged-to-main` at `5b2aa5030` (PR #42). Verified from a fresh checkout of
main, not just from the branch.

---

## 0. FIVE THINGS THAT WILL BITE YOU IN THE FIRST TEN MINUTES

1. **🔴 CI HAS BEEN DEAD FOR TWO DAYS, AND IT IS NOT FROM THIS WORK.** `gh run list --limit 100`
   returns `{"startup_failure": 100}` — **zero successes**, oldest sampled `2026-08-12T17:42:35Z`.
   Every run dies at 0s before executing a step. `actions/permissions` is `{"enabled":true,
   "allowed_actions":"all"}`, all four workflow YAMLs parse, no leading tabs, and the last
   `.github/workflows/` commit predates the outage. **Consequence: `ai-eval-gate`, `docs-check`,
   `swan-lens-guards` and `bodymap-validation` have not gated a single merge to main in ~2 days.**
   Diagnosing it needs repo-settings or billing access an agent does not have. **This outranks
   everything else in this document.**

2. **A push to `main` is a production deploy AND runs migrations.** `render.yaml:66` —
   `buildCommand: cd backend && npm install && npm run migrate:production`. "It's only docs"
   describes the diff, not the consequence. *(I got this partly wrong in-session: I told Sean the S0
   merge would deploy "an identical app" because no `backend/`, `frontend/` or `package.json` files
   changed. True of the app code, but the deploy still ran `migrate:production` against the
   production database. Risk was nil only because the slice contained **0** migration/seeder files —
   verified, not assumed. Do not repeat my framing; state the migration consequence explicitly.)*

3. **Work in a worktree on `main`.** The primary checkout
   `<REPO>` is on `wip/comms-notifications-2026-07-05`, ~1885
   commits behind. Edits there never reach production and tooling that exists will look missing.

4. **A branch created from `origin/main` inherits `origin/main` as its UPSTREAM.** A bare
   `git push` then puts your commits directly on the deploy branch. This nearly happened here.
   Always: `git rev-parse --abbrev-ref --symbolic-full-name @{u}` → `git push --dry-run origin
   <src>:<dst>` → push with the explicit refspec and `-u`.

5. **Linear is unreachable and has been for five sessions.** `node scripts/check-mcp-health.mjs
   linear` → exit 1, `CONFIGURED BUT TOKEN REJECTED`. The server IS declared at **USER scope in
   `~/.claude.json`** — not `.mcp.json`, not `.env`, which are the only two places agents check. An
   expired token registers ZERO tools, which is indistinguishable from "not configured". **Do not
   conclude Linear is unconfigured. Never fabricate an SWA id.** Sean must rotate the token and
   fully restart Claude Code.

---

# PART 1 — WHERE THIS STARTED

## 1.1 The original defect

`receipt.mjs` carried a header stating *"Every provider call leaves a receipt."* `writeReceipt` had
**zero production callers**. Every consult to a paid model was redacted, spend-gated, and then
**completely unrecorded**. The system documented an audit trail it did not have.

That is the defining failure class of this codebase and of this session: **a claim the code does not
support.** Not a bug in the ordinary sense — the code ran fine. It just wasn't true.

## 1.2 What S0 set out to build

One thing: make the consult lane's spend auditable, so the question *"what did we pay for and what
did it produce?"* has an answer that is a record rather than a memory.

---

# PART 2 — WHAT EXISTS NOW (all merged, all verified from main)

## 2.1 Files

| File | What it does |
|---|---|
| `scripts/context-gateway/src/receiptV1.mjs` | Allowlisted audit record per call: model, effort, tokens, cost, outcome, error code, spend cap/estimate, redaction counts, doc SHA + byte length. Append-only, never deduplicated. |
| `scripts/context-gateway/src/paths.mjs` | **The ONE owner of "never emit an OS username."** `escapes` / `escapesFrom` / `shortPath` / `relativizePath` / `finalSegment` / `isWindowsAbsolute` / `collapseHome`. |
| `scripts/context-gateway/src/transport.mjs` | `interpretCompletion(data)` — pure, exported: decides whether a completion actually contains anything. |
| `scripts/lib/read-capped.mjs` | Bounded response read — cancels rather than drains. |
| `scripts/lib/mcp-verdict.mjs` | `diagnose()` + `BUCKETS`. Tells an expired token from a missing config. |
| `scripts/check-mcp-health.mjs` | One command that settles MCP availability. Exit 0 verified / 1 unhealthy / 2 nothing verified / 3 nothing declared. |
| `scripts/__tests__/mcp-health/` | Four suites + `index.test.mjs`, a runner that FAILS if any sibling is unwired. |

## 2.2 The contracts worth knowing

- **A paid call that returns nothing is not `ok`.** Empty content ⇒ `outcome: 'error'` +
  `errorCode: 'EMPTY_RESPONSE'`, **cost still recorded**, non-zero exit, a loud stderr warning, and
  a ⚠ banner written *into the artifact* (verdict files get pasted into later prompts).
- **`finish_reason` is captured.** The receipt schema had always read `result.finishReason` and
  transport never set it — *every receipt ever written recorded null*.
- **Redaction is platform-independent.** Three Windows-absolute shapes escape on every OS:
  drive-qualified (`C:\`), UNC (`\\server\share\`), and drive-less rooted (`\Users\`).
- **Buckets are returned, not parsed.** `diagnose()` returns its own bucket; the router reads it.
  An unrecognized bucket counts as UNHEALTHY.
- **Test membership is the FOLDER.** No enumeration exists anywhere to drift.

## 2.3 Verification (from a fresh `origin/main` worktree at `5b2aa5030`)

```
node --test "scripts/context-gateway/tests/*.test.mjs"     → 148 tests, 147 pass, 0 fail, 1 skipped
node --test scripts/__tests__/mcp-health/index.test.mjs    → 36/36
node --test "scripts/hooks/*.test.mjs"                     → 79/79
node scripts/check-mcp-health.mjs linear                   → exit 1 (token rejected, expected)
```

Baseline at fork was 88/87/0/1. The 1 skip is pre-existing. **Every new assertion was
mutation-tested with the break confirmed PRESENT in the file before the result was read.**

## 2.4 What is UNPROVEN

- The paid **success** path was proven exactly **once**, live (`saved ->`, `receipt ->`, redaction
  intact). Once is not a lot.
- `EMPTY_RESPONSE` was proven live once, on a real Kimi failure.
- **HY3 bypasses the receipt lane entirely** — `consult-hy3-design.mjs` is an older standalone
  script with its own spend cap. Its spend never reaches the ledger, and it prints an absolute path
  to console. **The ledger only sees providers routed through `context-gateway`.**

---

# PART 3 — THE REVIEW HISTORY (read before reviewing anything)

## 3.1 What happened, in order

| Round | Reviewer | Cost | Outcome |
|---|---|---|---|
| 16 | Kimi K3 | ~$0.25 (prior session) | REVISE, 5 findings; S1 fixed before this session |
| — | **self** | $0 | S1 verified rather than trusted → **found S1b**, then 3 more of the same class |
| 17 | Kimi K3 | $0.0812 | STRONG; 3 findings (2 real, 1 overstated) |
| 18 | Kimi K3 | $0.0843 | **EMPTY RESPONSE** — 4354 tokens billed, no content |
| 18b | Kimi K3 | $0.0317 | **`finish_reason: error`** |
| 18c | HY3 | $0.0060 | 5 findings, S1 High — **same packet Kimi failed on** |
| 19 | HY3 | $0.0046 | NOT CLEAN — W1/W2/W3 |
| 20 | HY3 | $0.0033 | W1+W3 CONFIRMED CLOSED, **+1 new real defect** |

**Kimi: 3 attempts, 1 usable, $0.197.** **HY3: 3 attempts, 3 usable, $0.014.**

## 3.2 Model calibration — act on this

- **HY3 (`tencent/hy3`) is materially better at implementation review than its "design-only" label
  suggests, and ~40× cheaper per usable review.** It refused to manufacture UI findings against Node
  tooling three times running; traced one defect's evolution across four fix attempts; and caught a
  fail-open **inside my fix for its own previous finding**. **Recommend promoting it to a
  first-class implementation reviewer.**
- **HY3's proposed CODE was wrong twice while its DIRECTION was right both times** (a separator
  normalization that would misreport Windows paths; an import-everything runner that would claim
  eleven unrelated suites). **Take the finding, write the fix yourself.**
- **Kimi K3 is currently unreliable on this lane** — two silent failures in a row on a packet HY3
  handled fine. Its historical record is strong (~57/58 real findings) and its edge is catching
  claims the code does not support. Its failures were *invisible* until the empty-response fix made
  them legible.
- **A reviewer's finding is only as good as the diff you hand it.** HY3's highest-severity finding
  (W1) was already fixed; I had sent `HEAD~1..HEAD`, excluding the fix commit, and it read my prose
  description of the bug as current state. **My error, and it cost a full round.**

## 3.3 The defect class that dominated everything

**A fix named for its instance leaves the class alive.** It happened *six times*:

1. Escape *detection* fixed; the redaction *output* (`basename`) still platform-relative.
2. Fixed that; a repo grep found `consult.mjs` hand-rolling the same redaction **twice**.
3. Fixed the seed-collision by hashing the *relativized* seed — every external path collapses to
   `<external>`, so external seeds still collided.
4. Taught the predicate `C:\` and stopped; UNC and rooted paths still leaked.
5. Test discovery: a comment → an array vs a constant → a regex naming four files. Each fix deleted
   one hand-written list and introduced another.
6. Fixed a fail-open with a default parameter — which fires only on `undefined`, so explicit `null`
   sailed past it and redaction silently did nothing.

**The move that works:** after fixing, grep the repo for the **mechanism** (`basename`,
`startsWith`, "a redacted constant used as an identity"), not the symptom. That converted one
reviewer finding into four real fixes at zero cost.

## 3.4 The other trap: tests that cannot fail

Three assertions passed against deliberately broken code, because on Windows `basename` and
`isAbsolute` already behave correctly for unrelated reasons. **That is why the original defect
survived fifteen review rounds — every one ran on the same Windows box.** The fix is structural:
export the platform-independent primitive (`finalSegment`, `isWindowsAbsolute`) and assert *that*.
Testing the composed function tests your platform, not your contract.

---

# PART 4 — 🔴 MANDATORY: HOSTILE REVIEW OF THIS WORK (Sean's explicit instruction)

**Sean, 2026-08-14: run a hostile review on all the work done here, with Kimi (K3) AND HY3.**

This is not optional and it is the first task after the CI outage is reported.

## 4.1 Scope of the review

Everything PR #42 introduced, which is the **merge's first-parent diff**:

```bash
git diff 5b2aa5030^1..5b2aa5030 -- scripts/     # 21 files, +2347/-18
```

**Use exactly that range.** Not `4993c7ef0..5b2aa5030` — that spans 55 commits and pulls in other
agents' work merged into main during the same window, so the reviewer would attribute their code to
this slice. (I wrote the wrong range into the first draft of this file and caught it only by running
the command instead of trusting it. The whole PR is 34 files; the 21 above are the `scripts/` subset
that is worth reviewing — the rest are docs and inbox memos.)

Both reviewers get **the same packet**, independently, without seeing each other's output.
Independence is the entire point; models that see each other converge.

## 4.2 Build the packet

```bash
cd <worktree-on-main>
{ cat <<'HDR'
# HOSTILE REVIEW — S0 consult-lane receipts, post-merge

This shipped to main at 5b2aa5030 after Kimi rounds 16-18 and HY3 x3. Your remit is to find what
BOTH of those reviews missed. Assume the prior reviews were insufficient; they closed on two clean
rounds, which is a floor, not proof.

Attack specifically:
1. The empty-response contract. A paid call that returns nothing is recorded outcome:error +
   EMPTY_RESPONSE with cost retained and a non-zero exit. Is there another way a paid call can
   report success while producing nothing?
2. The redaction policy in paths.mjs. It claims to be THE one owner of "never emit an OS username"
   and to be platform-independent. Find a path shape that still leaks, on any OS.
3. The receipt record itself. Can it overclaim? Is any field unpopulated, wrong, or unfalsifiable?
4. The bucket routing in mcp-verdict.mjs — nine verdicts, one bucket each, unknown counts unhealthy.
5. The test suite. Which assertions would still pass if the code they cover were deleted or
   inverted? Name them.
6. Any claim in a header or comment that the code does not support (Rule 75).

Design-system axes are NOT APPLICABLE (no UI surface). The 300-line cap DOES apply. Do not
manufacture UI findings against Node tooling.
HDR
echo; echo '```diff'; git diff 5b2aa5030^1..5b2aa5030 -- scripts/; echo '```'; } > c:/tmp/s0-hostile.md

bash scripts/scan-secrets.sh c:/tmp/s0-hostile.md   # MUST be CLEAN before any egress
```

**Use `c:/tmp/`, not `/tmp/`.** On this machine bash's `/tmp` is
`C:/Users/<user>/AppData/Local/Temp` while node resolves `/tmp/…` to `C:\tmp\…` — two different
real directories. A packet bash writes to `/tmp/x` is then **not found** by the consult script, which
reads its `--document` argument through node. Verified by running it: the first draft of this file
had `/tmp/` and would have failed for you.

**Verified dry-run of the exact commands above:** packet = 2583 lines, 21 files, secret scan CLEAN,
154 KB ≈ **38.6k prompt tokens** — roughly **$0.02 for Kimi**, well under a $1 cap. Both reviewers
handle a packet this size comfortably (round 16 was 27.7k in).

## 4.3 Run both

```bash
# Kimi K3 — routes through the receipt lane, so this call IS auditable
OPENROUTER_API_KEY=$(grep '^OPENROUTER_API_KEY=' <repo>/.env | cut -d= -f2- | tr -d '\r"') \
SWAN_CONTEXT_MAX_USD=1.00 \
node scripts/consult-kimi.mjs --document c:/tmp/s0-hostile.md --out c:/tmp/kimi-hostile.md --effort high

# HY3 — standalone script, NOT in the receipt lane (see 2.4)
OPENROUTER_API_KEY=$(grep '^OPENROUTER_API_KEY=' <repo>/.env | cut -d= -f2- | tr -d '\r"') \
node scripts/consult-hy3-design.mjs --document c:/tmp/s0-hostile.md --out c:/tmp/hy3-hostile.md \
  --confirm-spend --max-tokens 20000
```

**Operational notes that will save you money and time:**
- **NEVER `grep`/`cat` the key to stdout.** The form above loads it into the process env only
  (Rule 59). No `echo`, no `set -x`.
- **Kimi wall time reached 318s in round 16.** Allow ≥560s. A 2-minute timeout killed a call
  mid-flight in this session and may have billed for nothing — unobservable locally.
- **If Kimi returns empty, the lane now TELLS you** (stderr warning + `EMPTY_RESPONSE` + exit 1).
  That is the fix working, not a new bug. Retry once; if it fails again, **HY3 carries the round**
  and you record Kimi as unavailable rather than burning more calls.
- Spend so far on this lane: **~$3.25 cumulative across 20 rounds.**

## 4.4 Adjudicate the results

1. **Verify every finding against the code before acting.** Two of three HY3 findings landed as
   stated; one was disproved by a probe and acting on it verbatim would have produced a worse
   design.
2. **Verify dismissals too.** In 16 Kimi rounds the single error was an *exoneration* — "pre-
   existing, not yours" for a defect that had just been introduced.
3. Where the two reviewers **disagree**, that disagreement is the most informative output — work it
   rather than averaging it.
4. Fix what is real, then run **your own** hostile rounds until two consecutive come back dry. A
   paid round is not a substitute for the dry-loop.

---

# PART 5 — OPEN ITEMS, PRIORITISED

| # | Item | Why it is here | Owner |
|---|---|---|---|
| **P1** | **CI dead — 100/100 startup_failure since 2026-08-12** | Every merge to main is ungated. Needs repo-settings/billing access. | **Sean** |
| **P1** | Rotate the Linear token, then fully restart Claude Code | Board unreachable for 5 sessions; 6 items are queued and unfilable | **Sean** |
| P2 | Hostile review per PART 4 | Sean's explicit instruction | next agent |
| P2 | Sol price drift in `providers.mjs` | Declares `$5/$30`; **measured ~$0.83/M input (~6× cheaper)**. The spend gate estimates from the stale figure and may be **refusing calls it should allow**. | next agent |
| P2 | Route HY3 through the receipt lane | Its spend is invisible to the ledger the slice exists to provide | next agent |
| P3 | Repo-wide test runner | No CI, no npm script — **all eleven unrelated suites in `scripts/__tests__/` never run automatically.** A stray suite outside `mcp-health/` is invisible. HY3 correctly noted node supports recursive globbing, so this needs no name enumeration. | Sean (scope call) |
| P3 | Reconcile the duplicate `consult-kimi` fix | Agent `s9ae724a6` fixed the **request** side (reasoning budget eating the call) while this slice fixed the **record** side. Zero shared files; they should land aware of each other. | next agent |
| P3 | Decide whether `auth\|login\|privacy` leave the Kimi ceiling | Sean's open call; removing them is a one-word change that broke 9 tests when attempted unilaterally | **Sean** |
| P4 | `.ai-workflow/hermes-inbox/pending/` at ~130 memos | Real drain backlog | Hermes |

---

# PART 6 — WHAT I RECOMMEND

1. **Fix CI before writing another line of code.** Two days of ungated merges to a branch that
   deploys and migrates is a larger exposure than anything this slice fixed. Everything else on the
   list assumes gates that currently do not exist.
2. **Run the PART 4 hostile review next, and give HY3 equal standing with Kimi.** The evidence from
   this session is unambiguous: 3-for-3 usable at $0.014 versus 1-for-3 at $0.197. Cost does not
   predict review quality.
3. **Fix the Sol price drift early.** It is a one-line correction with a live consequence — the
   spend gate is estimating ~6× high and may already be refusing calls it should allow.
4. **Do not build more receipt features until the success path has more than one live proof.**
   The refusal and error paths are well covered; the paid-success path has been exercised exactly
   once.
5. **Adopt the procedural corrections from the packets, not the prose.** Four durable packets were
   written today and they converge on one conclusion, which the ledgers demonstrate rather than
   assert: **a lesson that is only written down does not change behaviour.** The classes that kept
   recurring (shell-escaped fixtures ×5, fail-open ×6, lying instruments ×6) were all already
   documented. The ones that did not recur were prevented by a *procedure* running before the risky
   action. Mine the corpus for procedures to adopt:
   - String fixtures go in a **file** via the editor with `String.raw` — never through a shell heredoc.
   - Every mutation test **confirms the break is present in the file** before the result is read.
   - Every probe **reads the value under test from source** and fails loudly if it cannot.
   - Before any push: resolve `@{u}`, `--dry-run` the refspec, verify with `merge-base` after.
   - After any fix: grep the repo for the **mechanism**, not the symptom.

---

# PART 7 — ARTIFACTS THIS SESSION PRODUCED

**Durable learning packets** (`docs/ai-workflow/hermes-learning-packets/`):
- `20260814-a-fix-named-for-its-instance-leaves-the-class-alive.md`
- `20260814-a-control-enforced-by-prose-is-not-a-control.md`
- `20260814-a-ledger-that-records-nothing-as-ok.md`
- `20260814-ask-where-the-push-lands-not-whether-the-work-is-good.md`

**Inbox memos** (`.ai-workflow/hermes-inbox/pending/`): four, dated `20260814T05`–`T08`.

**Superseded:** `MASTER-HANDOFF-2026-08-14.md` — its "nothing is pushed / dry-loop open" state is
resolved. Its model-stack table (§3) and mistake list (§7) remain accurate and useful.

**Companion:** `SWAN-CONTINUATION-HANDOFF-2026-08-14.md` (repo-wide, different author, same day).
This file is the slice-deep view; that one is the map. Read both.

---

**Sign-off:** Opus 5, session `319bef07`. S0 merged at `5b2aa5030`, verified from main.
DRY-LOOP closed CLEAN×2 (16 rounds cumulative). LINEAR: N/A — token 401, re-verified live.
