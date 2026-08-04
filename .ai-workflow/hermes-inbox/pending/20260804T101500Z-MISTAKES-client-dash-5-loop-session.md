# MISTAKES REPORT — client-dash 5-loop session (Opus 5 + Kimi) — 2026-08-04

**Why this memo exists:** Sean 2026-08-04 — prior memos recorded *lessons* but soft-pedaled **my own errors**. Hermes needs the errors themselves, so the same failure isn't repeated by the next agent. Every item below is a mistake I actually made in this session, not a hypothetical.

---

## M1 — I wrote a security test that could not fail, then "hardened" it and made the SAME mistake again
- **Loop 3:** wrote a probe for the trainer endpoint whose PII assertion sat inside `if (trainer)`. The test environment has no DB rows, so that branch never ran. Adding `email` to the handler passed 4/4. **A security test that cannot fail is not a security test.**
- **Loop 5:** after "fixing" it, my replacement was a **deny-list** (`expect(handler).not.toMatch(/email/)`). Kimi caught it; mutation proved it — swapping the response for `trainer.toJSON()` leaks every column while the assertion stays green.
- **Root cause of the repeat:** I fixed the *instance* (the `if` branch) and not the *class* (assert the shape, not the spelling). I recorded the lesson in a memo and still repeated it one loop later — recording a lesson is not the same as applying it.
- **Rule now:** assert **allowlist equality** (exact key set / field-by-field construction) and forbid the leak *shapes* (`toJSON()`, `.get({plain:true})`, spreads, extra includes). Never `not.toMatch(<one word>)`.

## M2 — I shipped five fixes with no test that could catch them breaking
Mutation testing found **three** of my own fixes completely unprotected: the plan-target truth (regressing it to a fabricated goal passed 316/316), the profile refresh-on-save (removing it passed 280/280), and the active-only trainer predicate (no test at all, while production holds 7 inactive assignments). I had reported those fixes as done with passing suites — the suites were green because nothing tested them.
- **Rule now:** after any fix, mutate it and watch a test go red *before* calling it done.

## M3 — I fixed a bug in one place and left its twin live one function away
The "Up 3 vs last week" hollow comparison against an empty prior week: fixed in the coach recap (loop 2), still live in the insights tile until loop 4 — including a literal "Up 0 vs last week". I had even *cited* rule 20 (sibling sweep) in that same session.
- **Rule now:** when fixing a phrasing/logic class, grep the class across the surface in the same slice, not just the reported instance.

## M4 — I reported "tsc 0 errors" from a command that never compiled anything
Ran `npx tsc --noEmit` in a tree with no `node_modules`. npm's decoy stub printed "This is not the tsc command you are looking for" and **exited 0**. I read exit 0 as clean. Only caught it when a follow-up run behaved oddly.
- **Rule now:** verify the tool actually ran (binary exists / version prints), not just the exit code. Prefer `node_modules/.bin/<tool>` over `npx` for verification claims.

## M5 — I let my own parallel jobs corrupt a test run, then nearly reported the result
Ran the full suite while a dependency install and a build were running; 6 files failed, environment time 8,688s vs 2,934s clean-room. Several failures were starvation flake, not real.
- **Rule now:** confirmation suites run **clean-room** — nothing else executing.

## M6 — I used the wrong git command to check for collisions with other agents
Compared `git diff --name-only HEAD origin/main` (a symmetric diff that includes *my own* files) instead of diffing from the **merge-base**. It reported overlap where there was none. Under 5 parallel agents this could have caused me to skip a legitimate rebase or panic over a phantom conflict.
- **Rule now:** overlap = `git diff --name-only $(git merge-base HEAD origin/main) HEAD` vs the same range on their side.

## M7 — I declared a live feature "missing" from a deploy on a bad grep
Grepped the deployed bundle for `Sessions Completed This Month` → 0 hits, and briefly treated it as a shipping failure. The string is built by a template literal (`Session${n===1?'':'s'} Completed...`) so it never appears whole. The feature was live the entire time.
- **Rule now:** verify bundle presence by **fragment** (and by `data-testid`), never by a whole interpolated sentence.

## M8 — I trusted a subagent's severity ranking and had to walk it back
A subagent reported a sidebar link as a defect; on my own read the destination handled the case correctly and the severity was wrong. Separately, the recovered surface-map agent's "role-home drift" finding was a legacy-bookmark redirect, not a drift bug.
- **Rule now (already doctrine, violated anyway):** subagent/model output is a **hypothesis**. Verify before it enters a report at any severity.

---

## The Kimi calibration — important for future paid reviews
Kimi returned 12 findings, several labeled P0. On verification against real code and the real DB:
- **4 were dead** — role `user` walking the guards (all three guards are allow-list), onboarding mass-assignment (explicit destructure + hardcoded role + admin-gated), array coercion through the ownership gate (strict parser rejects non-scalars), analytics `body.userId` injection (zero consumption sites).
- **1 was false in production** — 0 sessions with `status='available' AND userId IS NOT NULL`.
- **2 were real and mine** (M1's deny-list; the untested active-only predicate).
- **1 was real and cross-lane** — `sessions` has only a primary key, no unique constraint → double-book / credit-overspend (filed SWA-126).
**Calibration for Hermes: ~25% of a paid model's security findings were actionable. Its value was concentrated in critiquing MY test quality, not in finding app vulnerabilities. Budget accordingly and NEVER act on a model's P0 without independent verification.**

---

## What went right (so the correction isn't over-applied)
The mutation-testing discipline itself, the live-DB verification pass, and verifying every Kimi claim before acting are what caught all of the above. The app's actual security posture held up under all five loops: 0 client-to-client IDOR across ~95 endpoints, all guards allow-list shaped, 170/172 models clean against the production DB.

---

## ADDENDUM — three more mistakes, made while building the mistakes-reporting gate itself

## M9 — I edited STALE copies and ported them over newer main files (near-miss regression)
The shared tree is ~1,500 commits behind main. I edited `CLAUDE.md`, `AGENTS.md`, the hermes-inbox SKILL and the Stop hook **there**, then copied them into my worktree over main's current versions. Diffs: `CLAUDE.md` **+105 / −249** — it would have DELETED ~249 lines of newer operating doctrine; the SKILL would have deleted main's Pi-retired / desktop-5090 reader posture; the hook would have reverted main's `git -C <path> commit|push` detection.
- **Caught by:** main's own hook test suite (10 cases vs the stale tree's 9 — the stale tree reported 9/0 green while the worktree exposed a failure), then an explicit `git diff --stat origin/main HEAD` per file.
- **Rule:** never edit a file in a stale tree and port it forward. `git checkout origin/main -- <file>`, re-apply ONLY the delta, then prove `git diff origin/main` shows insertions and no unintended deletions.

## M10 — A shell heredoc silently injected a BACKSPACE (0x08) into the regex, so the guard matched nothing
Writing `\b` through a python heredoc produced a literal control character: the guard read `Mistakes<BS>` and could never match — meaning the gate I built to enforce mistakes reporting would have **blocked every memo, including compliant ones**. It looked correct in every normal read; `cat -A` exposed it.
- **Sub-mistake:** my first "5/5 behavioral PASS" was run against the shared-tree copy (written with the Edit tool, correct) while the broken copy sat in the worktree — **I proved the wrong file**.
- **Rule:** never write regex/escape sequences through a shell heredoc — use the editor tool. Verify a guard with a real test file, not shell one-liners, and confirm which copy you actually exercised.

## M11 — I ran a mutation, printed "MUTATED", and believed it without checking it applied
The first mutation of the new guard reported success and the suite stayed green — I nearly recorded "the guard bites" from a **no-op mutation** (the anchor string never matched). Only re-running with an explicit `if (!s.includes(anchor)) exit(1)` proved the real result (test 11 red).
- **Rule:** a mutation is not applied until asserted — check the anchor exists before writing, and confirm the marker is present in the file afterward.

**Net:** the gate now passes 16/16 with 6 new contract tests and is mutation-proven — but three of these four errors came from *how I edited*, not from the design. Tooling discipline is the weak link, not intent.

**No PII, no secrets.** Board: SWA-111 (ledger), SWA-126 (new), SWA-124 (main's red test).
