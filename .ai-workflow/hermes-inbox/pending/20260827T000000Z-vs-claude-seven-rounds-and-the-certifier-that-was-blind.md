---
surface: vs-claude
utc: 20260827T000000Z
topic: Swan Coach ownership — seven hostile-review rounds, the verification harness that could not see its own baseline, and a panel that was less independent than its seat names
tags: [swan-coach, authorization, hostile-review, verification, panel-independence]
---

## What I did / learned

- **Seven rounds of hostile review** on the Swan Coach authorization workstream, three seats
  (GLM 5.3, GLM 5.3 Flash, Qwen 3.8 local; Gemini substituted for two rounds). ~45 findings.
  Roughly twenty were real and fixed; the rest were disproved with evidence, and the
  disproofs were upheld when the seats re-examined them.
- **Most of the real findings were in the FIXES and the TESTS, not the original code.** By
  round 4 the original defects were closed and the panel was finding defects in the closures:
  a tautological test, a brittle source scan, a guard that was half a guard, an assertion
  verified only to a mock.
- **Ox Alpha died mid-review and turned out to be GLM-5.3 Flash** — a sibling tier of the GLM
  seat already in the panel. Every "two seats independently converged" conclusion from the
  early rounds was one lab answering twice. Nothing broke, because each finding was verified
  against the code anyway, but the reasoning was wrong for half the panel and no seat name
  could have revealed it.
- **The panel overruled my next-slice pick, unanimously and correctly.** I proposed more
  handler hardening; all three picked something else. The argument I could not rebut: every
  "done-when" for any later slice is a claim routed through the verification harness, so if
  the harness can lie, later work regresses invisibly.
- **The harness could lie.** It compared the set of failing FILE NAMES against a baseline, so
  a file already failing could start failing for a completely new reason and the set stayed
  identical. Three sessions of security work were certified by a comparison blind to a whole
  class of regression in the work it certified. Rewritten to compare tests and reasons.
- **Measuring it changed the number.** "23 failing files" was really 6 failed assertions plus
  **19 files that never collect at all** — import crashes it could not tell apart from test
  failures. A file that stops collecting reports ZERO failing tests, so a naive assertion
  count would have read a total import crash as an improvement.

## Why it matters to Hermes

- **Count panel agreement by LAB, not by seat name.** Stealth listings exist to hide the lab.
  Two tiers of one vendor agreeing is one prior sampled twice, and it feels exactly like
  corroboration. When a report says "both seats found X", ask whose labs they came from.
- **Verify the certifier before trusting anything it certifies.** This is the cheapest
  high-leverage check available and it had been flagged in two prior handoffs without being
  closed, because it was always less interesting than the security item next to it.
- **"Verified to the mock" is not "verified to the row."** Several assertions stopped at the
  value handed to a mocked dependency, leaving the join to the real behaviour unpinned. A
  test can be non-vacuous and still measure one layer short of the thing it claims.
- **A guard that depends on another module's internals is borrowed, not owned.** Three
  separate fixes this session applied the same correction: enforce the invariant at the call
  site rather than trusting the callee's contract to hold.

## State right now

- Branch `claude/coach-endpoint-truth-v2-20260824`, **19 commits**, clean tree, NOT pushed.
- 5 ownership contracts + 3 unit suites; **46 committed mutations**, all firing, re-runnable
  via `node scripts/mutation-harness.mjs backend/tests/mutations/ownership.mutations.mjs`.
- Full backend 9757 passed; 25 known-failing tests across 23 files, now baselined per TEST
  and per REASON rather than per file name.
- Three live cross-tenant holes closed earlier in the workstream; two more found by the
  enhancement hunt (a resolver that fail-OPENED on an uncomputable scope, and a denial that
  left no server-side record).
- **No CI has ever run any of it** — the account's GitHub Actions are billing-blocked.
- Next slice, chosen on panel advice over my own: a required registry field declaring how each
  id-taking command derives ownership, plus an enumeration contract whose failing list is the
  residual-risk inventory.

## Mistakes I made

- **Shipped a tautology as a security test.** Written to answer a finding about role
  carve-outs, it read `roleRequired` on both sides and compared it to itself. It would have
  passed no matter what either gate did.
- **Replaced it with a brittle source scan** that banned the literal string `'admin'`, which a
  harmless `const ADMIN_ROLE = 'admin'` would break while changing nothing. The same assertion
  was wrong twice, in opposite directions, before it tested behaviour.
- **Wrapped a fire-and-forget audit in `.catch()` and called it guarded.** A synchronous throw
  happens during argument evaluation, before `Promise.resolve` is reached — so it escaped. My
  own test caught it, and only because a reviewer had named the synchronous case specifically.
- **Fixed a finding halfway and believed it closed.** Round 1 unified two client-id sources
  into one field; round 2 found that field is null for exactly the command that motivated the
  fix. I had verified the plumbing and not the values flowing through it.
- **Applied a panel suggestion without testing it.** A proposed regex widening flagged three
  commands, all false positives. A good suggestion, taken rather than tested, would have
  shipped an exception list — and a check with an exception list is one people learn to add
  exceptions to.
- **Recorded a bystander's client id in a security log** on the strength of an attacker's
  guess that happened to collide. Caught by a reviewer arguing from the file's own stated
  minimization doctrine, not from invented regulation.
- **Read exit code 0 from three consults that had failed** — two on MODULE_NOT_FOUND (the
  scripts live on main, not on this branch), one on a path bug. Only reading the output caught
  them.
- **Hit the shell-escaping trap twice more**, after writing it up twice today. Backticks in a
  `node -e` comment were eaten by command substitution, mangling a comment I had just written
  about a different mistake. The guard I built covers the mutation harness; it does not cover
  shell heredocs, and the mechanism was narrower than the mistake.
- **Left a hardcoded count in a test I wrote hours earlier**, which the gate I built this
  session then caught. Exact counts fail every time a set grows, which trains the next person
  to edit the number without reading why it moved.

## Error → fix → repeat ledger

| error class | times this session | written up before? | what stopped it |
|---|---|---|---|
| assertion that cannot fail | 4 | **yes — twice in my own packets today** | reviewers, twice. Mutation caught the mechanical ones; it cannot catch an assertion that is internally consistent and asks a trivially-true question |
| shell/`node -e` escaping | 4 | **yes, eleven-plus times across six sessions** | switching to the Write/Edit tool. The harness guard I built does not reach shell contexts |
| exit code 0 on a failed call | 3 | **yes — "validate the instrument"** | reading output instead of status |
| verified to the mock, not to the row | 2 | no | a reviewer naming the seam explicitly |
| borrowed invariant (trusting a callee's internals) | 3 | no, but it is now the session's most repeated correction | applying the same fix three times until it became a stated principle |
| fixed the plumbing, not the values | 1 | no | a second review round |

The pattern worth carrying: **three of six classes were caught by someone other than me.**
Mutation testing catches mechanical vacuity reliably and has never once caught an assertion
that was internally consistent and asking the wrong question. That needs a reader who does not
already believe the answer — which is the argument for panels, with seats from different labs.

## External-model calibration

| seat | rounds | findings | real | verdict |
|---|---|---|---|---|
| GLM 5.3 | 1-7 | ~20 | ~9 | Highest signal per finding. Its one-line catch of my tautology and its next-slice argument were the two highest-value outputs of the whole panel. Returns DRY and means it. |
| GLM 5.3 Flash (was "Ox Alpha") | 1, 5-7 | ~20 | ~8 | Sharp, and the source of the best structural idea (ownership derivation as a declared registry field). Not an independent seat from GLM. |
| Qwen 3.8 (local, $0) | 1-4 | ~11 | 3 | Thinks out loud and reverses itself mid-finding, which makes it noisy — but found the null-client fall-through nobody else did. Worth its zero cost many times over. |
| Gemini 3.1 Pro | 2-3 | 4 | 1 | Reviews as Design Authority regardless of the remit given. Brief it for design, not for security. |

Cost across all seven rounds: **$0.00** — subscription seats and one local model.

## Sean owes / blockers

- **19 commits unpushed, and no CI has ever run any of this.** Both surviving seats named the
  same thing in their closing line: 9757 passing tests have never been observed outside this
  machine. github.com/settings/billing.
- Before the first deploy: the new denials CONSUME the single-use pending operation, and
  adding `clientId` to the HMAC payload invalidates every in-flight signature. Flush the
  pending store during deploy rather than generating signature failures in the first hour.
- Admin name resolution breaks past 50 clients (`LIMIT 50` on the fuzzy path) — needs a
  product call: raise the limit, or move to database-side similarity.
