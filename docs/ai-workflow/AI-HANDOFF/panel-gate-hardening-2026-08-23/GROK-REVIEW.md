# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/GATE-HARDENING-SESSION-REVIEW-PACKET-2026-08-23.md
**Seed:** (none)
**Tokens:** 2484 in / 11066 out · **Cost:** ~$0.0712 · **Wall:** 245.0s · **finish:** stop

---

**REVISE.** Rule 42 does not enforce “the SHA Render will boot”; it enforces “this laptop’s `backend/` is clean.” Those predicates diverge immediately, and only the first one matches the crash-loop you cited.

---

## What breaks first

**Rule 42 fails open on a clean worktree that is still undeployable**, and nobody looks because the hook is green.

The incident class is `ERR_MODULE_NOT_FOUND` / missing-export on `main`. The hook checks dirtiness of the pusher’s tree. It does not import the backend from a clean checkout of the pushed SHA. So it misses:

- the file that never existed in this worktree (other agent, other session — you already said `main` moved twice while 4–8 agents ran)
- the file that was committed incomplete, then “fixed” only on disk and later discarded
- any push that never ran the hook: fresh clone without `core.hooksPath`, GitHub merge, CI, `--no-verify`

Second-quietest failure: **Rule 6’s cache was hardened only against false blocks.** A deleted or renamed token-definition file that drops out of a per-file cache map leaves stale definitions in memory; the added-line check sees a hit, skips the rebuild, and the commit goes through. You advertised “cannot cause a false block.” That is the wrong direction to be proud of. Undefined tokens are how this gate dies without a sound.

Rule 59 will not be the first *noticed* break. It is already broken in a way the dashboard cannot see: it denylists the verbs from the last incident (`Read`, `Grep output_mode=content`, `cat .env`, `printenv`, `echo $*_KEY`). The next leak is `python -c`, `rg`, `awk`, `head`, `source`, `node -p process.env`, or whatever tool you forget to add to PreToolUse the way you already had to add Read and Grep after Bash.

---

## The five questions

**1. The 42/6 asymmetry**

The *rationale* is defensible. Incremental lint is the only way Rule 6 stays on given 831 inherited hits; a gate that cannot remain enabled is not a gate. Rule 42 should not copy that incrementalism — “only new untracked files” is a nonsense predicate for a completeness check.

The *implementation* is still wrong. Rule 42 is over-broad in one axis and under-broad in the other: any dirty `backend/` file blocks *every* push to `main` (docs-only included), which is how you train `--no-verify` across 4–8 parallel agents with scratch files; and a clean tree that does not boot is allowed. Do not scope 42 like 6. Scope it to pushes that touch the deploy surface if you keep the hook at all — and put the real invariant on the SHA.

**2. Catalog health signal**

Pending count is a write-rate metric pretending to be a control. The catalog’s job is “grep is not silent.” Measure **time-to-visibility**: age of the oldest *eligible* unindexed doc (existed before the last regen window), plus coverage of docs older than N hours. A row that appeared this session is expected; a row that has been invisible across a week of agents is the 231-doc failure happening again.

Split the label you already know is a lie: `UNINDEXED` (pipeline miss / batch yield) vs `NEEDS DISTILLATION` (a judgement about the document). You watched batch size 10 drop 30 rows and stamp them as a content verdict. A count built on that stamp is not a health signal; it is a bug report about the classifier.

**3. Bypassability**

Named hatches are not theatre. Implicit ones are.

`SWAN_RULE45_OK=1` is the honest design: you cannot know whether the human wanted the rebase, so you force a greppable marker instead of guessing. `swan-guard-allow-hex` is the same idea at line grain. `--no-verify` is a git fact; you cannot close it from inside a hook.

What *is* theatre:

- counting a hook as 1/83 when `core.hooksPath` is optional
- calling the runner fail-closed while shipping `--force-branch`
- Rule 59 as a command-shape denylist against agents that invent adjacent commands for a living
- zero measurement of how often any hatch fires

Against a determined agent the whole layer is bypassable. That is the wrong threat model. Against 4–8 sloppy agents, hooks that make the compliant path easier and the bypass *visible* are real. You built the hatches and no ledger. An unmeasured bypass is not an escape hatch. It is a hole you pre-authorized.

**4. 17/83 and grep-shaped proxies**

Hold the line. A blocking gate that scores an adjacent property certifies the failure and then Goodharts it. “Commit message contains a plan” will produce commit messages that contain the word plan.

The fraction is also theatre. The denominator includes rules that will never be mechanical. Maximizing 17→N is how you end up shipping the proxies you just refused. Re-audit the 66 periodically for rules that *became* deterministic. Do not raise the numerator for its own sake.

The missing third option (you posed a false binary): **sampled retrospective review**, advisory, never a merge gate, never reported as “Rule X enforced.” Judgement rules get a review sample, not a regex.

**5. What nobody is proposing**

See the last section. Short version: stop hardening the laptop; change how `main` moves.

---

## What next, ranked

1. **CI/deploy probe on the pushed SHA** — clean checkout, resolve imports, boot the backend far enough to catch `ERR_MODULE_NOT_FOUND` and missing exports *before* `migrate:production`. This is Rule 42’s actual predicate. The hook can stay as a courtesy.
2. **Bypass ledger** — every `SWAN_RULE45_OK`, `swan-guard-allow-hex`, `--force-branch`, `--no-verify` (from transcripts / hook logs). Review it like you review the gates. If Rule 45 is marked through 30 times a week the rule is wrong or the marker is free.
3. **Rule 59 as a path class, not a verb list** — deny secret-bearing paths at the tool router for Read / Grep / Bash / whatever ships next week. You already had to widen the tool list once. That will keep happening.
4. **Catalog: max eligible age + `UNINDEXED` vs `NEEDS DISTILLATION`.** Kill pending-count as a health number. Then a scheduled runner means something.
5. **Prove hooks are installed** in every worktree, or stop counting Rule 42 as enforced. A gate that is not in the execution path is a written trap with a file path.
6. **Mutation-test false allows** on Rule 6 (deleted registry file, same-size rewrite, new registry path pattern) and a contract test on the closeout discriminator (last-entry type). You coupled a merge gate to transcript internals and a 500ms settle; the next format change will fail quiet or cry wolf.
7. **Do not spend the empty backlog on 18/83.** Re-classify the 66 into mechanical / reviewable / aspiration. Publish that. Then stop.

---

## Nobody is proposing

**Stop treating `main` as a multi-agent working branch.**

Every incident in this packet is trunk contention papered over with a client-side hook. Dirty backend trees, catalog state that is correct-for-this-branch and poisonous on merge, regen that must be on clean current `main`, `main` moving twice mid-session, a review checkout 2,170 commits behind, four to eight agents. You responded by adding more local gates to a shared trunk.

A merge queue — agents land on integration branches; `main` advances only via a green clean-checkout probe — makes the crash-loop structurally impossible and makes catalog regen a CI job instead of a ritual that refuses to run. That is past “add four more rules” and past “cron the runner.”

The session’s own design asymmetry is the tell: you hardened the commit/push path on the laptop while the deploy path and the concurrency model stayed untouched. That is the theatre.
