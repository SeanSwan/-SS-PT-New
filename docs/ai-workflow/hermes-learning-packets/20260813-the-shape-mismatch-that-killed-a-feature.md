---
originating_model: claude-opus-5
co_reviewers: none (no external or paid model consulted this turn)
captured: 2026-08-13
surface: backend model registry (associations.mjs) + renewal-alert churn-risk feature
boards: SWA-157 (commented — tripwire + the dead feature it found)
status: shipped (3dc7be425 on claude/qa-harness-slice0-20260811 — committed, not pushed)
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer + final decider
    did: built the model-registry drift tripwire, validated its instrument through three false
      findings, discovered renewal alerts had never worked in production, got the fix wrong once,
      caught that itself by diffing against a working sibling, then verified the corrected model
      at runtime
    cost: subscription (flat rate)
skills_touched:
  - id: backend/utils/modelRegistryAudit.mjs + tests/unit/modelRegistryDrift.test.mjs
    change: created
    motivating_failure: RenewalAlert shipped a model, migration, service, controller, mounted
      routes and a cron tick, and threw on every call because nothing registered it. Nothing in
      CI could see that, because absence has no test.
  - id: backend/models/dormantModels.mjs
    change: created
    motivating_failure: "unregistered" was indistinguishable from "forgotten". 23 models sat in
      that ambiguity; one of them was a dead production feature.
  - id: feedback_validate_probe_before_absence_claim (memory)
    change: reinforced — and self-caught this time
    motivating_failure: the tripwire's own parser produced three false findings before it was
      trustworthy. Same class as the prior session's probe failures, but caught before reporting.
---

# The shape mismatch that killed a feature

Durable lessons from building a model-registry drift tripwire and discovering, on its first run,
that a production retention feature had never executed successfully. Privacy: IDs and roles only.

---

## 1. A convention deviation can make a whole feature unable to run, with every part present

`RenewalAlert` had all of it: a model file, a migration, a service, a controller, routes mounted at
`/api/renewal-alerts`, and an automation cron tick calling it on a timer. Every piece correct in
isolation.

The model file exported a **factory** — `export default (sequelize) => {...}` — while ~150 sibling
models import sequelize themselves and export the model instance. The loader
(`associations.mjs`) only knows the instance form. So the model was **structurally
unregisterable**, was never registered, and `getModel()` — which throws on an unknown key — threw
on every call.

Nothing was broken. One file was merely *shaped* differently from the thing that had to consume it.

**Rule: when a loader consumes files by convention, a file that deviates is not a style problem —
it is invisible. Any registry populated by convention needs an assertion that every candidate file
was actually picked up, because the failure mode is silence, not error.**

---

## 2. Catch-and-log around scheduled work converts a hard failure into permanent silence

The cron tick wrapped the call in `try/catch` and logged the error. So instead of a crash on day
one, the feature failed quietly on **every single run** since it shipped, indefinitely.

A crash would have been found in a day. The log line was never read.

**Rule: swallowing an exception in unattended work (cron, queue consumer, background job) buys
uptime at the price of permanent invisibility. If the handler cannot do something better than log
and continue, the failure needs to reach a surface a human actually watches — a counter, an alert,
a health field — or it will run broken forever.**

---

## 3. Validate the instrument before believing its output — including your own new gate

The tripwire produced **three false findings** before it was trustworthy:

- A block terminator that never matched the real indentation. Worse, a throwaway earlier version
  used `slice(at, -1)` on the `indexOf` miss, which reads to end-of-file instead of failing — so it
  emitted confident nonsense (10 "registry entries with no file", 27 "imported but unregistered")
  rather than an error. Every one was a parser artifact and I nearly reported them.
- A scanner that matched **its own documentation**: the audit module quotes the failing
  `getModel('RenewalAlert')` call in its header, and reported a call site that does not exist.
- An enumeration keyed off **filename** rather than declared `modelName`, which reported
  `models/contact.mjs` as unregistered even though it declares `"Contact"` and is registered.

**Rule: a new gate's first output is a claim about the gate, not about the codebase. Confirm each
finding against the source before believing any of them — and make a failed parse THROW, never
degrade into a default that keeps running.** A silent fallback in an audit tool is the worst
possible failure, because its output still looks like evidence.

---

## 4. Comparing against a known-good sibling is the cheapest check on a fix

My first fix was **worse than the bug**. I assigned `RenewalAlertModule.default` — which is the
factory *function*, not the model — and wired `.belongsTo()` onto it. That throws at boot.

The static tripwire went green on the broken fix, because registration is a name-level check and
the name was present.

What caught it: opening an already-registered sibling model and diffing the two files. Thirty
seconds, no tooling.

**Rule: when wiring something into an existing registry, read a working entry first and diff
against it. "My test passes" says the name is right; it does not say the value is the right kind of
thing.**

---

## 5. Acknowledgement registries convert invisible into merely undone

23 models were unregistered. Before this, "unregistered" and "forgotten" were the same state, and a
dead production feature was hiding in that ambiguity. They are now split explicitly: **7 with no
caller anywhere** (quarantine candidates, access-log evidence required before any drop) and **16
consumed by direct import** — which still bypasses the codebase's own stated rule and is recorded
as acknowledged debt, not endorsement.

The registry refuses one combination outright: a model named by any `getModel()` call site may
never be acknowledged as dormant, because that pairing is a guaranteed runtime throw.

**Rule: an exceptions list with mandatory reasons turns an unbounded invisible set into a bounded
reviewable one. The value is not the exceptions — it is that anything NOT on the list now fails.**

---

## Who did what

- **claude-opus-5 (me)** — everything: built the tripwire, debugged its three false findings,
  traced the RenewalAlert failure from `getModel` through the mounted route and the cron, produced
  a wrong fix, caught the wrong fix myself by sibling comparison, and verified the corrected model
  at runtime (`modelName: RenewalAlert`, `tableName: renewal_alerts`, `belongsTo` present).
- **No external model was consulted.** Every claim was executed, not read.
- **Where I was wrong:** see mistakes. The most serious is that my first fix would have crashed
  production boot, and the gate I had just written passed it.

## Skills created or changed

- **`modelRegistryAudit.mjs` + `modelRegistryDrift.test.mjs`** — created against the RenewalAlert
  failure. Diffs enumeration vs registry statically, so it runs in CI in milliseconds without a DB.
- **`models/dormantModels.mjs`** — created because "unregistered" and "forgotten" were the same
  state, and a dead feature lived in that gap.
- **No new prose skill.** The doctrine that would have prevented this (validate the instrument,
  proof-before-done, sibling sweep) already exists. The correction that will actually hold is the
  committed test, not another document.

## Mistakes I made

- **Produced a fix that would have crashed boot** — factory function assigned where a model
  instance was required, with `.belongsTo()` called on it. My own new gate passed it.
- **Wrote a probe that failed silently and reported nonsense** — `slice(at, -1)` on an `indexOf`
  miss read to end-of-file instead of erroring; the resulting numbers were entirely parser
  artifacts and I came close to reporting them as findings.
- **Keyed an enumeration off filename instead of the declared model name**, inventing an
  unregistered model that was registered all along.
- **Wrote a scanner that matched its own prose**, inventing a call site.
- **Repeated a documented class.** "A feature can be structurally incapable of working while every
  test passes" is lesson 1 of the 2026-08-11 packet. It recurred here in a different subsystem,
  two days later.

## Error → fix → repeat ledger

| Error class | Times this turn | Previously written up? | What finally stopped it |
|---|---|---|---|
| Feature fully built but structurally unable to run | 1 (found in prod) | **Yes — 2026-08-11 packet, lesson 1** | A committed CI tripwire. The prior write-up was prose and the class recurred two days later in another subsystem. |
| Trusting a new probe's first output | 3 false findings | **Yes — 2026-08-13 earlier packet** | Confirmed each finding against source before believing it; caught all three pre-report this time (an improvement over the previous session, where the operator had to catch it). |
| Silent fallback in an audit tool | 1 | No | Parses now THROW on failure; the throwaway `slice(at, -1)` pattern is the specific thing to never repeat. |
| Fix worse than the bug | 1 (caught pre-commit) | No | Diff against a known-good sibling before wiring into any registry. |

The first row is the one that matters. That class was documented on 2026-08-11, and on 2026-08-13
it recurred in a completely different subsystem — which is evidence that **writing a lesson down
does not prevent its recurrence.** The only thing that changed the outcome here was executable:
a test that fails when the class reappears. Prefer building the tripwire over recording the lesson;
where both are possible, the lesson exists to explain the tripwire, not to replace it.

## External-model calibration

No external or paid model was consulted this turn. Recording the absence deliberately: the dead
feature was found by a 200-line static parser reading files already in the repo. One Kimi review is
authorised for after the remaining slices land, and its findings should be calibrated then —
including how many of them a cheap deterministic check would have found first.
