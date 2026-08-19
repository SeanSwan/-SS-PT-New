# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SESSION-HANDOFF-AI-PRIVACY-COST-2026-08-19.md
**Tokens:** 3724 in / 13734 out (reasoning: 11554) | total 17458
**Wall:** 192.5s

---

# Hostile review: this document fails its own test at step 1 of its own "start here"

The failure mode isn't sloppiness — it's that the doc doesn't operationalize its own warnings. It tells me the instrument lies, then hands me instrument-derived baselines with no versions attached. It tells me "green" is meaningless, then says "green" in the frontmatter. A zero-context agent absorbs the summary before the retraction.

## The contradiction that stops hour one

"**Do not attempt backend test work until it is cleared**" and "confirm with him before running an install" — followed immediately by "**THE NEXT SLICE — start here: 1. `cd backend && npm install`**."

The first executable step of the prescribed work is the action the blocker section fences behind a human. There is no contact channel for Sean, no SLA, no fallback ("if Sean is unreachable, do X instead"). By construction, the correct first action for a fresh agent is to ask a question — the exact thing this doc claims to prevent. It should say so explicitly and front-load the pre-S Sean work: author the step-6 test, run the two self-contained 15/15 suites (which allegedly need zero packages), run #45's frontend tests, prep the escalation brief.

## The blocker diagnosis is probably wrong, and the fix guidance inherits the error

"`npx vitest` still *appears* to work because it resolves a **global** vitest" — npx does not resolve globals. It walks up to `node_modules/.bin`, then falls back to fetching from the registry. A version that **increased** mid-session (4.0.18 → 4.1.11) is the signature of npx downloading current-latest into its cache, not of a global mutating. Consequences the doc misses:

- After install, `npx vitest` can still silently run an unpinned cache version. The guidance should be: use `npm test` or `./node_modules/.bin/vitest`.
- Step 2 says "confirm the toolchain: check the banner version" — **against what?** The expected/pinned vitest version appears nowhere in the document. That's an unfalsifiable check.
- The doc warns the install "may change lockfiles" — then recommends the one command that can. `package-lock.json` is present; say `npm ci`.
- Nobody addresses *why* `backend/node_modules` is empty. The landmine section shows the previous session was symlinking `node_modules` junctions around. Did the author's own experiments cause this? If it's a stray junction or a sync tool, the install won't stick. "Static across a 20-second recheck" is not evidence of anything.

## The baselines cannot do the job they're assigned

- "Measured on `origin/main`, in a separate worktree" — **how?** The blocker says backend tests are unrunnable and worktree junctions are broken. Either the author ran an install somewhere (in which case that's the proven unblock recipe and you should say so) or these numbers came from a different environment and aren't a baseline for this one. The doc is unreconcilable on this point.
- No commit SHA, no vitest version, no node version, no date-of-measurement beyond implication. If Sean merges anything, main moves and "parity" drifts silently.
- **Parity is defined by counts, not by test identity.** "3 failed tests" is only parity if it's the *same* 3 tests. "Mostly `No test suite found` in Forge specs" — "mostly" is doing enormous work; which are the others? No failing-test names, no log path in "Where the record lives." A fresh agent can hit 3 completely different failures and honestly report parity.

## What "green" lets me wrongly assume

- Frontmatter: "Four PRs open and green." PR table: "CodeRabbit ✅, GitGuardian ✅." Doctrine #3, buried 60 lines later: those badges are **not the test suite** and "I cited them as evidence twice before noticing." The doc opens with the exact overclaim it confesses to. And GitGuardian ✅ coexists with item 7, an exposed Render API key — was it in-repo? If so the ✅ is false comfort; the doc doesn't say where it was exposed, so I can't brief Sean on why rotation matters.
- **PR #45 has zero verification evidence.** Four live microphone leaks, described as shipping to production `main`, and not one test run is cited — while the frontend has 732 packages installed and was fully runnable. The baselines are backend-only; no frontend baseline exists anywhere in this document. The next slice proves #50 (an unmerged feature) and ignores #45 (live bugs) entirely.
- "**The failover mechanism already exists**" — overstated by the doc's own standard. Two sections later: `sendChatMessage`'s new wiring is "syntax-checked only, never executed." The failover walk and `failoverTrace` recording in the current branch state are equally unexecuted. "Exists in code" ≠ works.
- **The #47 detector is unproven by the doc's own doctrine.** #2: "a test that has never failed on purpose is not evidence," and the confessed failure was a grep lock "blind to untracked files — the exact case it existed to catch." Is the new detector grep-based? Was it mutation-tested by adding an unlisted caller, in an untracked file? Only `aiUsageMeter` is described as mutation-proven. #47's headline deliverable may share the exact blind spot the doc confesses to.

## The next-slice sequence: right instinct, wrong scoping, buries the urgent thing

Closing the execution gap on un-executed wiring is correct. But:

1. **Step 6 embeds product decisions the doc doesn't make.** `sendChatMessage` walks providers on failover. When A fails and B answers: is usage metered per-attempt, per-success, or both? Does a failed attempt record? The doc says "assert success path and provider-failure path" without defining expected meter semantics — the test author has to *invent* them. Also: no file path for `aiChatService.mjs`, no hint whether providers are constructed from env at import time (which makes naive `vi.mock` fail). For the single prescribed task, the doc gives me the least guidance of any section.
2. **The failover failure matrix (timeout/429/5xx/malformed/auth) is deferred to item 3 behind "second hosted provider configured" — but only the second provider is Sean-gated.** Mocked-provider failure evidence is achievable *now*, in the same harness as step 6. The split defers immediately-doable verification behind a human dependency.
3. **Item 1 is blocked on Sean; item 2 is not.** A literal reading parks the agent. Sequencing should be by blockedness, with "ask Sean now, work while waiting."
4. **costConfig is pre-merge-critical for #50 and the doc doesn't connect its own facts.** Pricing last verified 2026-02-24 (six months stale), two known-unpriced models, and the miss signal (`usage.unpricedModels`) lives in an in-memory summary that "resets on deploy" until SWA-179 lands. That is precisely doctrine #4's "under-reporting is worse than none": #50 ships muted costs with an ephemeral miss counter. Refresh before merge, or surface it in the merge note. Also unstated: where correct prices come from, and how to "confirm the prefixes" with zero traffic.
5. **The genuinely urgent items are present but diffuse.** Live mic leaks (unmerged #45), a live trainer/client authz gap on `history-preview`, an exposed production key seven days old, missing DMARC. The Sean list ranks key rotation #7 — **below a `.env.example` entry**. My hour-one deliverable is a severity-ranked escalation brief the doc never assembles, because it sorted Sean's items by workstream, not by blast radius.

## Smaller holes that will cost an hour each

- No mention of what `tests/api` needs to run — sequelize against what? SQLite in-memory, PG env vars? A second blocker may be waiting behind the first.
- #46's fate after #47 merges: auto-close, manual close, or a zombie PR with an empty diff? "Contained" is undefined — commits present, or reimplemented? Only #50-on-#47 was trial-merged.
- "Fail-open-on-missing-profile" — missing vs. explicitly-`false` semantics never defined. One clause for the load-bearing privacy asymmetry, no artifact for the ratification.
- "the `AI_API_KEY` alias that makes OpenAI invisible to a naive `OPENAI_API_KEY` check" — mechanism unexplained, no file/line. I can't verify or brief it.
- "Hermes memos (gitignored, **drain at session start**)" — drain how? No procedure.
- "Rule 45" implies a rules document that is never linked.
- "Fix: `npm install`" — has anyone run it in this state? The doc's trap section exists because the author trusted unexecuted fixes before.

## What I'd actually do in hour one (what the doc should have said)

1. Write the Sean brief: severity-ranked — merge #45 (live leaks), run the pre-merge SQL, rotate the Render key, `npm ci` in `backend/`, rule on `history-preview`, DMARC. One message, everything critical.
2. While waiting: run #45's frontend suite (runnable now, zero evidence exists).
3. Mutation-test the #47 detector with an untracked-file caller — the doc's own standard demands it and nobody has done it.
4. Author the step-6 test, including the full failover mock matrix, flagging metering-per-attempt as an open decision for Sean rather than inventing it.
5. Refresh costConfig before #50 merges; record which tests fail by *name*, not count, as the new baseline — with SHA and vitest version.
