# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R5-2026-08-23.md
**Seed:** (none)
**Tokens:** 2759 in / 2474 out | **Cost:** ~$0.0454 | **Wall:** 28.8s | **finish_reason:** stop

---

## VERDICT
REVISE — the totality invariant is real and correctly implemented, but the check asserts relative paths against `SS_PT` without evidence the harness executes hooks with that cwd, so it can still both phantom (MISSING on a healthy hook) and false-OK (OK on a dead one) — the two failure modes the document explicitly asks about.

## BLOCKERS

1. **P1 — Relative-path resolution assumes cwd = SS_PT, unverified.** `const abs = isAbs ? tok : join(SS_PT, tok);` resolves every relative candidate against `SS_PT`. If the hook harness spawns commands with any other working directory (user's project root, the settings file's directory, `$HOME`), then: a healthy registration (`node hooks/x.mjs` valid relative to harness cwd but not SS_PT) → **MISSING phantom**; a dead registration (file exists under SS_PT but not under the real cwd) → **false OK**, which is byte-identical-to-clean at runtime — the original outage, re-laundered through the fix. The document never establishes the harness's cwd; it only asserts the invariant over *classification*, not over *resolution correctness*. Evidence: `join(SS_PT, tok)` line and the `isAbs` branch.

2. **P2 — Dead code proves an untested path.** `SHELL_META` includes `\\` (`|\\/`), so any command containing a backslash returns UNVERIFIED before reaching the candidate logic. Therefore `const tok = candidate.replace(/\\/g, '/');` is unreachable — the Windows-path normalization it exists for can never execute. Either the meta-regex is too broad (blocking legitimate `C:\…` paths that the very next line tries to handle) or the replace is vestigial. One of them is wrong; the fuzz test can't tell because it only asserts *a* verdict was returned, not the *correct* one.

3. **P2 — Asymmetric absolute-path handling.** `if (isAbs && !existsSync(tok))` → UNVERIFIED, but an absolute path that *does* exist on this machine falls through to `statSync` and can be asserted OK/MISSING. The stated rationale ("meaningful only on the machine it names") applies equally to present paths — presence here says nothing about the target host. The branch judges exactly half the cases it claims it can't judge.

## ATTACKS

- **Correctness:** The fuzz test asserts totality (every input → a verdict), never correctness (input → *right* verdict). A `classifyCommand` that returned UNVERIFIED for everything would pass 11/11 fuzz. The "13/13 real registrations OK" claim is the only correctness evidence, and it's a single-machine snapshot — exactly the host-dependence the code itself flags for absolute paths.
- **Correctness:** First-script-arg heuristic: `node --require ./setup.mjs scripts/main.mjs` asserts `setup.mjs` and never examines `main.mjs`; a missing `main.mjs` reads as OK. Documented as deliberate, but it is a live silent-clean channel the invariant banner claims to close.
- **Correctness:** Dedup key `${event}:${verdict.key}` collapses a MISSING file registered under two events into one finding, reporting only the first `where` — the second registration's phantom goes unmentioned.
- **Correctness:** `SCRIPT_EXT.test(w)` anchoring is unverifiable from the snippet; if not end-anchored, `foo.mjs.bak` or `--out=dist.mjs` (an output, not a script) becomes the asserted candidate.
- **Security:** `join(SS_PT, tok)` with `../` segments walks outside the project root (`node ../../etc/x.mjs`); read-only `statSync`, so impact is nil, but the check will happily assert on files outside its scope.
- **Data-truth / schema drift:** `hook?.command` assumes the Claude settings schema (`hooks[event][].hooks[].command`). A `type: 'prompt'` hook or a schema revision with a different field name yields `command: undefined` → UNVERIFIED with the misleading "registers nothing" reason — it may register plenty, just not under that key.
- **House rules:** No violations in scope (backend script; no UI, no LLM, no forbidden language, no credential claims).

## HIGHEST RISK
Blocker 1: unverified cwd assumption — it reopens both failure modes the round-4 redesign exists to kill, and the fuzz harness structurally cannot detect it. Cheapest de-risk: one runtime probe — have the check log `process.cwd()` and the harness's actual hook cwd once (or add a relative-path registration with a known sentinel file and confirm which root resolves it). If cwd ≠ SS_PT, either resolve against the real root or demote all relative candidates to UNVERIFIED until the root is known. That's a one-line change plus one log line.

## CONFIDENCE
I could not verify: (a) the definitions of `SCRIPT_EXT`, `URL_SCHEME`, `SS_PT`, `read`, and `findings` — anchoring of `SCRIPT_EXT` changes attack #4 from hypothetical to real; (b) the actual cwd the Claude hook harness uses, which is the entire basis of Blocker 1 — if a spec or prior round established cwd = project root = SS_PT, Blocker 1 downgrades to P2; (c) whether the fuzz corpus includes cwd/host variation or only string-shape variation; (d) the 13 real registrations' contents, so I can't confirm none of them hit the first-script-arg or relative-path traps. Evidence that would settle it: the harness hook-execution documentation or an instrumented run printing cwd, plus the full file including the regex/constant definitions.
