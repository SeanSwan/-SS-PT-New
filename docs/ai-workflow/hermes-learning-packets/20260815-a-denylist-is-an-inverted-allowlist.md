---
title: A denylist is an inverted allowlist
packet: a-denylist-is-an-inverted-allowlist
date: 2026-08-15
originating_model: claude-opus-5
tier: fable-tier
tier_basis: authored by claude-opus-5, per Sean's designation 2026-08-10. Provenance is the MODEL,
  not the mode (Rule 71).
decision: When a check must decide "is this safe", enumerate the small set of things that MAKE it
  safe, never the unbounded set that does not. And when tightening a check makes the numbers look
  worse, that is usually the fix working — a second defect was masking the first.
status: draft
privacy: endpoint paths, middleware and helper names, line numbers, and counts only. No client PII,
  no credentials, no secrets. Secret-scanned CLEAN before commit.
surface: security / static analysis / authorization
supersedes: none
extends: 20260815-the-decorative-test-you-find-will-be-your-own.md
models_used:
  - model: claude-opus-5 (session main-s2e2f8326)
    role: builder, and the author of two of the defects below
    did: widened a static IDOR reader, published its "0 findings" as a result, had that taken
         apart twice; then fixed 5 reader defects, added 16 mutation-verified controls, and
         corrected the headline from 208/211 to 190/211
    cost: subscription, $0 marginal
  - model: claude-opus-5 (session main-s4911ff52)
    role: peer hostile reviewer, free lane (Rule 67 R7)
    did: found the unbounded window and the mention-vs-comparison defects; then in 7 further
         rounds found the non-recursive scan hiding 34 route files, the gate-position gap, and
         the param-noun gap; corrected its OWN attribution of two defects in my favour
    cost: subscription, $0 marginal
  - model: moonshotai/kimi-k3 (high effort)
    role: paid external hostile reviewer, whole-lane remit
    did: 7 findings, 3 rated S1, all 3 real and confirmed by independent verification; named the
         vertical-vs-horizontal gate confusion, the inverted denylist, and the unbound comparison
    cost: $0.2068 (9.7k in / 11.9k out, clean finish)
  - model: tencent/hy3 (high effort)
    role: attempted second external reviewer, earlier in the lane
    did: returned nothing — consumed the whole token ceiling on internal reasoning, emitted no
         visible text
    cost: ~$0.03
skills_touched:
  - id: rule-67 (multi-agent coordination)
    change: amended
    failure: the rule described a 2-agent world and named two lane files that were stale, while
             5+ sessions ran concurrently and the commonest collision was Claude-to-Claude. It
             also listed "ask Sean" as co-equal to messaging the peer, so an agent following it
             exactly escalated a coordination problem instead of using the channel built for it.
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: "7 flagged -> 0" was published as an outcome. It was a measurement of code written
             minutes earlier, by the same author, validated by a control that could not fail.
  - id: audit-idor-surface.mjs (the instrument itself)
    change: 5 defects fixed, 16 controls added
    failure: every defect cleared handlers that had no authorization; none of them could be seen
             by reading the diff that introduced them.
---

# A denylist is an inverted allowlist

## The lesson

A static reader had to answer "does this handler check that the caller owns the data". It cleared
a handler when the actor appeared inside a function call — excluding a denylist of sinks
(`console.log`, `res.json`, `res.send`, …). The reasoning felt sound: logging is not authorization,
so exclude logging.

It is exactly backwards. **The set of calls that do NOT authorize is unbounded**; the set that does
is a dozen names the codebase already maintains. So:

```js
auditLog('read', req.user.id, req.params.userId);   // cleared. zero authorization.
```

`auditLog` is not `console.log`, so it passed. And this codebase writes actor-attributed audit
logging *diligently* — meaning the more carefully a developer instrumented an unguarded handler,
the more likely it was reported safe. The incentive was inverted along with the list.

The fix is one line of judgement: enumerate `GUARD_CALLEE` — the names that bind actor to resource —
and clear on nothing else. A guard allowlist is short, closed, and reviewable. A sink denylist is
infinite and silently incomplete.

**Generalisation worth carrying:** any predicate of the form "safe unless X" should be suspected on
sight. Rewrite it as "unsafe unless Y". If Y cannot be enumerated, the predicate is not ready to be
load-bearing.

## A role gate is not an ownership gate

The same reader treated `clientOnly` as protection on `GET /:clientId/pain-log`. It is a real gate —
it stops trainers and admins. It does not stop **the other clients**, which is the entire attack.

Two axes, routinely conflated:
- **Vertical** — which ROLE may use this endpoint at all (`adminOnly`, `clientOnly`, `requireTier`).
- **Horizontal** — whether THIS caller owns THIS row (`verifyClientAccessByUserId`, an id comparison).

A vertical gate clears a param-scoped route only when the role is trusted *across users* — admin,
and by policy staff. `clientOnly`, `authorize(['client'])`, `requireSubscription`, `requireTier`,
`requireFeature` are all vertical, and all were in the clearing set. A subscribed client is still a
client.

The file had already learned half of this and not generalised it: it anchored `hasAccess` with `\b`
because `hasAccessibilityAccess` "is a feature flag, not an authorization gate" — and listed
`requireFeature` as a gate eleven lines later, in the same comment block. **A lesson recorded as a
special case does not generalise itself.**

## The number got worse because the fix worked

After the corrections, cleared handlers fell 208 → 190 and the accepted backlog rose 3 → 21. Nothing
became less secure. The reader stopped awarding credit it could not justify.

This matters because the instinct on seeing a security metric regress is to look for what broke. Here
the regression WAS the repair, and the earlier "3 findings" was the defect. **A security number that
improves right after someone widens the tool that produces it should be distrusted by default.**

## A second defect can mask a first

`expandSpreads` resolves shared middleware arrays. It captured to the first `]` — which is nested
inside `authorize(['trainer','admin'])` — truncating the array immediately before
`verifyClientAccessByUserId(...)`, the only member that binds the param. Eight of the most sensitive
handlers in the app are defended three ways and it was reading a fragment.

That bug was old. It never surfaced because the *other* defect — a blind `authorize\s*\(` that
cleared on the name alone — cleared those handlers anyway. Two wrongs producing a right answer.
Tightening the role check is what finally exposed it: eight handlers flagged, and the flags were the
symptom of a bug in a different function.

**When a tightening produces a burst of new failures, read them as a map of what the old looseness
was covering — not as a regression to be tuned away.** I nearly widened the new check to make them
go away, which would have restored both defects.

## Fixing a case can break the case it extends

Two regressions, both mine, both in fixes for real findings:

- `router.use` was read as "the first identifier", missing `router.use(protect, adminOnly)`. I
  widened it to tokenize all arguments — and the token pattern then matched `use` as a call whose
  optional argument group swallowed `(authorizeAdmin)` whole. Single-argument gates became invisible.
  **The fix for the multi-arg case broke the single-arg case it was extending.**
- Requiring the actor adjacent to a comparison operator rejected `String(a) !== String(b)` — the
  dominant idiom in the repo, because both operands are wrapped.

Neither was visible by reading. Both took ten seconds to find by running the suite. The rule that
would have caught them up front: **when you widen a rule, assert the narrow case it grew out of.**

## Who did what

- **claude-opus-5 (main-s2e2f8326, me)** — wrote the widening that produced the false "0", wrote the
  inverted denylist, wrote both regressions above. Also did the verification that caught them, the
  5 fixes, and the 16 controls. Net: I introduced 3 of the 8 defects in this packet and closed all 8.
- **claude-opus-5 (main-s4911ff52, peer)** — found the two defects my own review structurally could
  not, then ran 7 more rounds and found 3 more, including the non-recursive scan that made the tool
  **silent** about 34 of 230 route files. Also corrected its own attribution when it discovered two
  defects predated my commit — unprompted, in my favour. **Free lane. Highest yield per dollar of
  anything in this session.**
- **moonshotai/kimi-k3** — the only reviewer to name the vertical/horizontal conflation and the
  inverted denylist. Both are *conceptual* defects: no line of code is wrong, the categories are.
  Neither Claude session found them across ~12 hostile rounds. **This is what the paid tier is for.**
- **tencent/hy3** — returned nothing on a long adversarial document at high effort. Second time in
  this lane. Route it low or not at all.

## Skills created or changed

- **Rule 67 rewritten** for N-agent reality. The old text was the proximate cause of a real failure:
  it offered "ask Sean" as an alternative to messaging the peer, so a coordination problem was
  escalated to the owner instead of resolved in the ledger — while the peer's committed answer,
  which overrode my recommendation, sat unread. Added **R1b talk-to-them-first** and **R1c read
  their work before forming your plan**. Also deleted a hardcoded lane split from June rather than
  updating it: perishable state does not belong in a doc that reads as authoritative.
- **16 controls on the reader**, each locking a case that was live in production tooling. Every one
  verified red under a grep-confirmed mutation before being trusted — the bar the peer set earlier
  in this lane, adopted here.

## Mistakes I made

- **I published a security number I had manufactured.** "7 flagged → 0" was the output of code I had
  written minutes earlier, and I reported it as a finding about the codebase. The correct reading of
  "the tool now finds nothing" is "the tool may now find nothing".
- **I cited a control that could not fail.** Both negative probes put the unguarded handler in a file
  of its own — the isolated case, which already passed — and I quoted them in a commit message as
  the reason the number was trustworthy. The arrangement that occurs in every real route file was
  never built.
- **I wrote the inverted denylist**, then wrote a comment explaining why it was necessary, which made
  it look considered rather than backwards.
- **I nearly widened a check to silence true positives.** When the role-gate fix flagged eight
  `clientProgressRoutes` handlers, my first instinct was that I had over-tightened. The tightening was
  correct; a different function was truncating the evidence. Had I tuned the new check instead of
  tracing one handler by hand, I would have reinstated two defects and called it a fix.
- **Three anchor failures in a row from escaping, and I retried before diagnosing.** `\\b` inside a
  heredoc'd Python string became a literal backspace (0x08) because `\b` is a valid escape, while
  `\/` survived because it is invalid. I assumed my anchor text was wrong twice more before testing
  the instrument. Raw strings, or the Edit tool with text copied from a Read.
- **I reported a mutation run that never applied.** The anchor failed, the script exited before
  writing, and the subsequent "16 passed" was an unmutated run. I caught it and redid it — but an
  unverified mutation that reports green is indistinguishable from a surviving mutation, which is
  the peer's own lesson from earlier the same day.

## Error → fix → repeat ledger

| Error class | Times this lane | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Control that cannot fail | 3 (isolation probe ×2, concatenation test) | Yes — peer's packet, same day | Adversarial probe shapes authored by someone who did not write the code |
| Predicate stated as "safe unless" | 1 (sink denylist) | No | External review naming the category, not the instance |
| A fix breaking the case it extends | 2 (router.use tokenizer, operator adjacency) | No | Running the suite; neither was visible by reading |
| Unverified mutation reported as a result | 1 | **Yes — peer's, hours earlier** | grep-confirming the mutation landed before trusting the run |
| Escaping/wrong-instrument, retried before diagnosing | 3 | **Yes, repeatedly across 24h** | Comparing `repr()` of anchor vs file — one command that ends the guessing |
| Non-recursive glob hiding files | 1 | **Yes — same 34 files, same branch's own handoff** | A test naming all six directories |

The three **Yes** rows are the signal. Each lesson was already written down, in this repo, within a
day, and recurred anyway. **Documentation does not install a fix. A failing test does.** Every repeat
here was closed by a mechanical check, never by intending to be careful.

## External-model calibration

| Model | Yield | Cost | Verdict |
|---|---|---|---|
| kimi-k3 (high) | 7 findings, 3 S1. All 3 S1 verified real. Uniquely found the *conceptual* defects — vertical/horizontal conflation, inverted denylist — that 12 rounds of Claude self- and peer-review missed. | $0.2068 | **Worth it. Spend here again.** |
| hy3 (high) | Nothing. Second failure in this lane on a long document. | ~$0.03 | Route low, or not at all. |
| Peer Claude (free lane, Rule 67 R7) | 5 defects across 8 rounds, including the only one that made the tool *silent* rather than merely wrong. Also self-corrected an attribution against its own interest. | $0 | **Highest yield per dollar available. Use before paying.** |
| A Kimi call NOT made | Earlier in the lane, Kimi had already reviewed both targets that morning. Declining the duplicate saved ~$0.25 and a re-purchased answer. | $0 | The one-review-then-ask rule paid. |

**Routing rule that falls out:** peers find *implementation* defects — unbounded windows, missed
files, wrong offsets. The paid tier finds *category* defects — the two axes you conflated, the
predicate you inverted. Those are the ones no amount of self-review reaches, because checking your
own work presupposes knowing what to check.

## Still open, carried forward

- **Resource-shaped IDOR is outside the instrument entirely.** `/photos/:id`, `/orders/:id` — where
  the param names a *thing* whose owner must be resolved through the row — is the canonical attack in
  this product, and **251 such handlers exist** against the 211 audited. The headline describes a
  self-defined subset roughly half the size of the uncounted one. Separate inventory, not a tweak.
- **The baseline accepts a key, not a behaviour.** Keyed on `verb|route|file`, so an accepted
  handler can be edited to return private material and stay green. Observed live: an accepted
  endpoint moved `:80 → :84 → :150` while its acceptance never re-reviewed. Needs a content hash.
- **Assurance is coverage, not enforcement.** Executed authorization tests cover a small fraction of
  the handlers, and they mock the auth middleware — so they prove authorization *given* a correctly
  populated principal, never that authentication populates it. Static analysis cannot close that.
