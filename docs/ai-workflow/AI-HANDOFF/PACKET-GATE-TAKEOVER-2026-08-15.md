# Packet-gate takeover — full handoff

**Repository evidence outranks this document.** If anything here disagrees with the code, the code
is right and this is stale — say so rather than working around it. This document was written by the
agent that did the work, so it is exactly the kind of description the tool it describes exists to
distrust.

---

## 1. Where the work lives

| | |
|---|---|
| Worktree | `C:/tmp/ss-coachv3-packet-20260814` |
| Branch | `claude/coach-v3-packet-skill-20260814` (cut from `origin/main` @ `a10bad922`) |
| Commits | `2da9dd9c2` build · `997a1755b` round-1 fixes · `bd2b7035d` round-3 fixes · `90b4fbe63` GLM |
| Pushed? | **NO.** All four commits are local only. Nothing has reached `main` or Render. |
| Tree state | clean at handoff |

**Do not work in `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`** — that tree is ~1,947 commits
behind `origin/main` with 400+ dirty files, and several other agents hold locks in it.

---

## 2. What was built

A **zero-call preflight gate** for the `consult-*.mjs --document` lane — the path where a
hand-authored markdown file reaches a paid model with nothing mechanical between typed-from-memory
code and the wire. It makes **no model calls**, prints an approval view, and stops. Spend approval
stays human.

`scripts/context-gateway/` already governs the *compiled* lane and is byte-exact by construction;
this deliberately does not re-check it. **Do not build a second packet compiler.**

```
scripts/packet-gate.mjs              CLI + orchestration
scripts/packet-gate/checks.mjs       R1 R3 R4 R5 R6 (pure; I/O injected so canaries can drive them red)
scripts/packet-gate/canary.mjs       R15
scripts/packet-gate/fences.mjs       fence parsing + isUnverifiedFence
scripts/packet-gate/repo-io.mjs      git/fs touchpoints, GateUnavailable
scripts/packet-gate/report.mjs       rendering only — must never change a verdict
scripts/packet-gate/refusal.mjs      the six codes, one source of truth
scripts/packet-gate/source-hash.mjs  binds a canary record to the code it certified
scripts/packet-gate/build-packet.mjs builds packets with extracted (never typed) code
scripts/packet-gate/selftest.mjs     45 canaries → out/packet-gate/selftest.json (gitignored)
scripts/packet-gate/tests/packet-gate.test.mjs
.claude/skills/external-packet/SKILL.md
```

Six refusals: **R1** oversize · **R3** provenance (byte re-extraction) · **R4** no-artifact ·
**R5** phantom-premise · **R6** hygiene · **R15** canary-freshness.
Exit `0` cleared · `1` refused · `2` gate could not run (fail-closed).
Escape hatches, both explicit and auditable: `--allow-uncited`, `--allow-missing <path>`.

### Verification at handoff — all verified in-session, not asserted
- **45/45 canaries green** — `node scripts/packet-gate/selftest.mjs`
- **31/31 tests green** — `node --test scripts/packet-gate/tests/packet-gate.test.mjs`
- Secret scan clean, Rule 42 clean, all files under the 300-line cap.

**TEST-DELTA DISCLOSURE.** That 31/31 includes **two assertions I re-anchored at handoff**, and a
pass count containing assertions you just rewrote is not proof. Both are classed **RE-ANCHOR**, not
SILENCE, and the behaviour was verified *before* either assertion was touched:

| Test | Was | Now | Why |
|---|---|---|---|
| "uncited fences alongside a cited one" | asserted a WARNING + exit 0 | asserts **exit 2 refusal** + that `--allow-uncited` still works | round 3 changed warn→refuse; the packet now exits 2 where it exited 0. **Stricter.** |
| "anchor-free remit + code fences" | exit 2 + `/unevaluable/` | exit 2 + `/not byte-verified\|unevaluable/` | **exit-code assertion unchanged and still passing.** Only the message moved: the `!aboutCode` guard was removed as subsumed. |

Neither was relaxed to turn a red test green.

---

## 3. The review loop — state and the pattern that matters

Reviewers get the **source**, never a description. That is the whole lesson of the programme
(four earlier paid reviews: source packets returned verified findings; a prose packet returned 1
of 3).

| Round | Findings | Criticals | Cost |
|---|---|---|---|
| 1 | 8 | 2 | $0.122 (Kimi + HY3) |
| 2 | 10 | 1 | $0.096 |
| 3 | 7 | 2 | $0.131 |
| 4 | 8 | **0** | Kimi done; GLM was still running |

**Total paid spend ≈ $0.35 across nine calls.**

> **The pattern, stated plainly: every critical after round 1 was introduced by the fix for the
> previous round's critical.** Round 1's fix reopened the hole via bare fences. Round 2's fix bound
> to the wrong anchor subset. Round 3's entry-guard fix could have made every check a silent no-op.
> Round 4's two HIGHs are again round-3 fixes. **Treat the previous round's diff as the next
> round's primary attack surface** — that is not a platitude here, it is the measured behaviour of
> this specific file.

Round 4 is the first round with zero criticals, so the loop is converging.

### Round-4 findings — OPEN, none fixed
From `out/packet-gate/reviews/KIMI-R4.md` (read it; these are one-line summaries):
1. **HIGH, new from round-3 fix** — a CRLF-authored packet false-refuses every cited block, with no printed remedy.
2. **HIGH, new from round-3 fix** — the uncited-fence refusal `return 2`s directly, bypassing `report()`, so it masks every later check.
3. MEDIUM — R4 path binding still satisfiable by the wrong file (residual of the H2 fix).
4. MEDIUM — R4 content binding is a bare substring match; common symbol names trivialise it.
5. MEDIUM — `--allow-missing` is exact-string and strips the path from R4 binding, which can vacate the binding entirely.
6. LOW — unknown flags are silently ignored.
7. LOW — scanner exit >1 (not 127) is reported as an R6 hygiene hit.
8. LOW — a cited range ending in two or more trailing blank lines can never match.

### GLM-5.3's first run returned NOTHING — read this before re-running it
`out/packet-gate/reviews/GLM-R4.md` landed **empty**: 14,570 in / 32,000 out, of which
**31,995 were invisible reasoning tokens**. It spent the entire output budget thinking and emitted
no answer. 271s wall, and the run still exits 0 — so a careless reader records "GLM reviewed it."

`consult-glm.mjs` defaults `--max-tokens` to 32000. **Raise it substantially** (start at
`--max-tokens 96000`) so there is budget left for an answer after the reasoning. This is the same
class as the documented Kimi gotcha (pair high max-tokens with `--effort medium`), but far more
extreme — 99.98% reasoning versus Kimi's ~73%.

**GLM has therefore contributed no findings yet.** Round 4's eight findings are all Kimi's. Do not
report GLM as having reviewed anything until it returns non-empty output.

**Verify every finding by running the code before changing anything.** Every one of the ~25 fixed so
far was confirmed that way first, and one round-3 claim (the symlink entry-guard vector) could
**not** be reproduced on Windows (EPERM) and is marked `[LIKELY]`, not `[VERIFIED]`, in the source.

---

## 4. Sean's standing instruction

> Run hostile reviews **until all files run dry** — rounds repeat until one finds nothing fixable,
> then one more confirmation round (two consecutive clean = dry).

Reviewers he named: **GLM-5.3 + Kimi K3 + Claude/Opus 5**. **NOT Fable — too expensive.**

He was also offered, and has not yet answered, a faster bar: **ship at zero CRITICAL/HIGH**, with
surviving MEDIUM/LOW captured to Linear instead of fixed in-loop. Round 4 already has zero
criticals, so that bar is close. **Ask him before choosing it.**

### How to run each reviewer

```bash
# build the packet — never hand-assemble one; the gate will catch you, and it did
node scripts/packet-gate/build-packet.mjs --out out/packet-gate/R5-PACKET.md \
  --remit-file out/packet-gate/r5-remit.txt \
  --file scripts/packet-gate.mjs --file scripts/packet-gate/checks.mjs \
  --file scripts/packet-gate/fences.mjs --file scripts/packet-gate/repo-io.mjs \
  --file scripts/packet-gate/canary.mjs

# ALWAYS gate it before sending (raise --budget-chars deliberately; state why)
node scripts/packet-gate.mjs --document out/packet-gate/R5-PACKET.md --budget-chars 60000

# Kimi K3 — key from the MAIN tree's .env, loaded into env, NEVER echoed (Rule 59)
export OPENROUTER_API_KEY=$(grep '^OPENROUTER_API_KEY=' "/c/Users/BigotSmasher/Desktop/quick-pt/SS-PT/.env" | cut -d= -f2-)
export SWAN_CONTEXT_MAX_USD=3
node scripts/consult-kimi.mjs --document <p> --out <o> --effort medium --max-tokens 60000 --remit "$(cat <remit>)"

# GLM-5.3 — uses ZAI_API_KEY (user-scope Windows env var)
node scripts/consult-glm.mjs --document <p> --out <o> --remit "$(cat <remit>)"

# HY3 (used rounds 1-3; cheapest of the three, and it found things Kimi missed)
node scripts/consult-hy3-design.mjs --document <p> --out <o> --confirm-spend --effort high --remit "$(cat <remit>)"
```

**Gotchas that will cost you time:**
- Each review takes 80–350s. **Run them in the background** or they hit the 120s tool timeout.
- Kimi: pair a high `--max-tokens` with `--effort medium`. At high effort it can spend the whole
  budget on reasoning and emit an empty final message.
- GLM: streaming is mandatory (already implemented) — a plain fetch dies with
  `UND_ERR_HEADERS_TIMEOUT` before the first token. `ZAI_API_KEY` is **user-scope**; a shell started
  before it was set will not see it. It was visible in the handoff shell.
- GLM works **only** on `api.z.ai/api/coding/paas/v4`. The pay-as-you-go endpoint answers
  "Insufficient balance" — that is the wrong door, not a broken plan.
- `consult-kimi.mjs` / `consult-glm.mjs` are **design-ceiling** (Chinese providers, Rule 8). The
  gateway screens the *document path*: avoid `auth|billing|payment|stripe|secret|credential|pii|
  medical|…` in packet filenames or the call is refused by design.

---

## 5. The second task Sean asked for — the anti-recurrence skill

He wants a comprehensive skill preventing this failure:

> I checked only my worktree — which is cut from `origin/main` — and concluded GLM was "not wired."
> It was available the whole time on `wip/comms-notifications-2026-07-05`.

**Read this before building anything.** `.claude/skills/cross-env-verify/SKILL.md` **already
exists** (89 lines) and its trigger list literally contains *"not found"*, *"does not exist"*,
*"missing"*. Its worked example is an agent that concluded a healthy repo was broken because git
failed from WSL against a Windows path — the identical error shape.

**So the gap is not a missing skill. The gap is that an existing skill did not fire.** A second
prose skill covering the same ground would be duplication (Rule 63) and would not have fired either.

Diagnose before building. The honest options, roughly in order of expected value:

1. **A deterministic trigger.** The skills that reliably fire in this repo have hooks; the ones that
   rely on the model remembering do not. Same lesson as the Hermes outbox at n=443 and the dual-tier
   gate. This is likely the real fix.
2. **Amend `cross-env-verify`** with the specific absence-claim-about-a-repo-asset case and its
   one-command check — a claim that a file/script/tool is missing must be checked against
   `git ls-tree -r --name-only <every local branch and origin/main>` before it is believed.
3. **Only then** consider a new skill, and say explicitly what it does that the existing two
   (`cross-env-verify`, `drift-check`) do not.

Two mechanical facts worth encoding either way:
- Git Bash silently mangles `<rev>:<path>` and leading-slash arguments via MSYS path conversion.
  Use `MSYS_NO_PATHCONV=1`. This produced a **false ABSENT** during this very session.
- The session-start drift check reports on the **main tree**, not your worktree. It said the AGENTS
  mirror had drifted; in the worktree it was in sync. Check the tree you are actually in.

---

## 6. Constraints that bit me — read before editing

- **Never edit `CLAUDE.md` or `AGENTS.md` without Sean's explicit approval.** He rejected that edit
  once; the second one was made only after he delegated the call. A pre-commit guard blocks a commit
  that installs a skill without naming it in `CLAUDE.md` (an unadvertised skill never fires).
- **Mirror divergence: investigate, never blindly regenerate.** `sync-agents-mirror.mjs` copies
  CLAUDE.md *over* AGENTS.md and destroys the newer side if AGENTS.md is newer. I verified the two
  matched at `HEAD` first, so the sync was provably additive (+1 line, 0 deletions). Do the same.
- **Do not run the Python heredoc trick for JS edits.** It mangled `\n` escapes three times in this
  session. Use the editor tool.
- **Commit per slice, push once at the end** (Rule 70). Nothing here is pushed yet.
- Other agents hold locks — check `.ai-workflow/coordination/` before editing shared files.
- `out/` is gitignored: packets, reviews, and `selftest.json` do **not** travel with the branch.
  Anything worth keeping must be copied somewhere tracked.

---

## 7. Mistakes I made — the highest-signal part of this document

- **I reintroduced the same critical three times.** Each fix changed the attack surface and I did
  not re-attack the fix before shipping it. The measured lesson: attack your own diff first.
- **I claimed GLM was "not wired" after checking one branch.** A skill built for exactly that error
  exists and I did not invoke it.
- **I used a duplicated security predicate twice**, and both times the two copies drifted and the
  bypass produced neither a refusal nor a warning. There is now one predicate; keep it that way.
- **I named phantom routes literally in a comment**, which made `git grep` resolve them and silently
  switched R5 off — the comment explaining the bug caused the bug. Never spell a phantom.
- **I trusted a bash probe that lied.** MSYS path conversion reported a string absent that occurs
  413 times. Validate the instrument before believing a negative.
- **I let a gate print "no code fences present"** over a packet full of fabricated code, because my
  filter required a language tag and a bare fence has none.

---

## 8. Do not do without Sean's approval

Any migration or schema change · enabling a feature flag · pushing to `main` · editing
`CLAUDE.md`/`AGENTS.md` · re-recording the test baseline · deleting or archiving anything ·
overriding the repo's configured `user.email` (doing so got a push rejected and forced a 12-commit
rewrite).

`backend/scripts/test-baseline-gate.mjs` compares failing test *files* against a baseline recording
9; current `main` reports 36. `origin/main` itself fails that gate — the baseline is stale, and
re-recording it is a separate decision. **When any gate reports a regression, run the identical gate
on the base commit before believing it.**
