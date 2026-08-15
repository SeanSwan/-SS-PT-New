# Hostile Review Packet — Constitution Hardening, ROUND 2 (2026-08-15)

**Scope:** process/tooling mechanics ONLY. Every category of sensitive content in the
real documents — commercial, personal, health-related, client data architecture,
infrastructure identifiers, credentials — is excluded and grep-verified absent.

**You reviewed round 1 and returned SHIP-WITH-CHANGES with 7 findings.** This is what
was done about each, plus new work. **Your primary attack surface is the FIXES
THEMSELVES** — by your own round-1 reasoning, code written in response to a review is
where the next defect lives. Round 1 proved that: your D1 fix immediately caught a
regression the author had introduced in the very merge D1 was about.

---

## 1. Disposition of your round-1 findings

| # | Your finding | Disposition |
|---|---|---|
| D1 | Guard misses body rewrites — the incident's own mechanism | **FIXED.** Check 3 added: blocks a rule whose body shrinks >15%, drops the `MANDATORY` token, or loses amendment markers. Tuned to *reversion*, not change, so honest amendment stays quiet. **It immediately caught a real regression: the author had omitted rule 71 from the merge splice list, which would have deleted a provenance correction.** |
| D2 | Escape hatch never expires; persistent bypass credential | **PARTIALLY FIXED.** Hatch use now prints a loud OVERRIDE banner, and entries that matched nothing print a "stale override left set" warning. Still keyed by number, still not commit-scoped. Your commit-trailer proposal was **not** implemented — see Q1 below, and attack that decision. |
| D3 | Fail-open on git errors contradicts the purpose | **FIXED.** Fails CLOSED on every git error. Exactly one sanctioned fail-open remains: no HEAD (initial commit). |
| D4 | Mirror-parity is satisfied by the clobber itself | **ACCEPTED, documented, not counted.** The file header now states parity is a consistency check, catches partial commits only, and is NOT one of the clobber defenses. |
| D5 | "7/7 pass" unsupported in the packet | **ACCEPTED.** Evidence is in §4 below and in commit bodies. |
| D6 | No per-hunk merge rationale artifact | **FIXED.** A 17-row decision log with per-hunk winner + reason is committed. |
| D7 | Skill table has no persistence mechanism | **FIXED.** `validate-skill-registry.mjs --check` fails on set-inequality between installed and advertised skills. Wired into pre-commit. |

---

## 2. New work since round 1

**B1 — the guard was committed but never executed.** `core.hooksPath` was an *absolute*
path into the main working tree's `.githooks`. Every worktree in the repo ran that one
copy regardless of its own branch, and that tree sits ~1939 commits behind main with a
`pre-commit` that predates the guard. So the guard from round 1 protected nothing for
its entire existence. Fixed by setting `core.hooksPath` to the relative `.githooks`;
proven by a real commit emitting a line the stale hook does not contain.

Consequence handled: a checkout older than the guard has the hook file but not the
script. Both new checks now **announce absence** rather than assume presence — except
when a constitution file is staged in such a checkout, which **blocks**, on the reasoning
that editing the constitution from a tree too old to verify it is precisely how the
original incident happened.

**B2 — the drift hook prescribed the destructive remedy.** On divergence it advised
running the mirror sync, which copies CLAUDE.md over AGENTS.md — the command that would
have made the original 9-rule loss permanent. Rewritten to prescribe investigation
(diff by NAME, decide newer per rule, note that it can be bidirectional). The same
advice was found and corrected in the skill doc that documents the hook.

**Q2 — rename is now a first-class operation.** Per your round-1 answer: a rule renamed
in place reads as removal+addition, and the only way through was the generic removal
hatch, which trains bypass. `SWAN_RULE_RENAME="46=46"` declares it and is **verified
against a real addition at the target number** rather than accepted on faith; a claim
that lands nowhere is rejected. An undeclared removal+addition now prints the exact
command to declare it instead of only refusing.

**Q6 — reference resolution.** Your answer was that prose contradiction cannot be
mechanized in general, but the document's externally-verifiable assertions can be
resolved against ground truth. Implemented for cited paths.

Result on first run: **8 unresolvable pointers. Five named documents that have never
existed in git at any point in history — two of them marked MANDATORY in the reference
table.** Agents have been directed for months to read files that were never written.
They were corrected truthfully (marked NEVER WRITTEN, pointed at what does exist)
rather than deleted, since a silent deletion loses the information that the need was real.

Deliberately scoped to repo-rooted paths: the naive version flags 63 items in this
document (bare filenames used as prose, `<placeholder>` templates, gitignored runtime
state). A check with 63 false positives is one people learn to bypass.

**Its own test found dead code in it:** an exemption for `.ai-workflow/` could never
fire, because those paths were filtered before the exemption stage ran.

---

## 3. What was NOT done — attack these decisions

1. **Q1 body-change commit trailer.** You proposed hashing each rule body and requiring
   a `Rule-Change: 46` trailer on any MANDATORY body edit. Implemented only the
   reversion-signature heuristic instead. Rationale: `pre-commit` does not reliably see
   the commit message, so the trailer belongs in `commit-msg`, which is a second hook and
   a second bypass surface; and blocking *every* body edit was judged noise that would
   train `--no-verify`. **Is that reasoning wrong?** A 14% shrink slips under the
   threshold today.
2. **Q3 CI enforcement.** Not implemented. Pre-commit is client-side and `--no-verify`
   bypasses everything here. Complication you should weigh: per this repo's own audit,
   all 30 most recent CI workflow runs ended in `startup_failure` — CI has never
   successfully run — and branch protection returns 403 on the current plan. So "add a
   required status check" may not be executable. What is the cheapest thing that
   actually closes the bypass in that environment?
3. **Q4 per-rule provenance ledger.** Not implemented. You argued one-shot merges of
   diverged mirrors recur as long as two writable copies exist. Only the decision log
   (a record, not a mechanism) was produced.
4. **Q5 / your highest-impact recommendation — AGENTS.md as a non-committed build
   artifact.** Only half done: it carries a DO-NOT-EDIT header and the hook no longer
   prescribes regeneration, but it is still committed and still writable. **Is the
   half-measure worse than either extreme** — does a DO-NOT-EDIT banner on a writable
   committed file create false confidence?

---

## 4. Evidence (addressing your D5)

- `constitution-guard.test.mjs` — **15/15**. Eight assert the guard BLOCKS (clobber,
  renumber, mirror drift, body reversion, MANDATORY downgrade, git-unavailable,
  undeclared rename, rename-claim-with-no-destination). Seven assert it PASSES
  (honest edit, honest body expansion, declared removal, declared renumber, declared
  rename, stale-override warning, non-applicable commit) so a block is known to be
  caused by the defect rather than an always-red harness.
- `constitution-references.test.mjs` — **5/5**, including one asserting a real miss
  still surfaces when exempt paths sit alongside it, because an exemption list that
  swallows findings is worse than no list.
- Full hook suite — **99/99**.
- Live-fire on the actual commit: guard PASS, references PASS (136 citations checked,
  28 exempt, 0 unresolvable), advertising PASS (0 undocumented, 0 phantom).
- Constitution state: 81 rules in both files, 0 missing either direction, 0 number
  collisions, 0 body deltas, mirror `--check` OK.

---

## 5. Attack list

1. **What still passes all four checks and changes the law?** Name the specific mutation.
2. **The 15% shrink threshold** — is it defensible, or is it a number chosen to make the
   author's own test pass? What is the principled way to set it?
3. **The rename hatch** — can it be abused to launder a deletion as a rename? It requires
   an addition at the target number, but the addition's *content* is never compared to
   the removed rule.
4. **`core.hooksPath` relative** — what breaks? Old worktrees, submodules, CI checkouts,
   `git worktree` on detached HEAD, Windows path semantics.
5. **The absence-announcing branch.** It blocks when a constitution file is staged
   without a guard script, and announces otherwise. Is the non-blocking branch a hole?
6. **The reference lint's exemption list** — argue it is already too permissive.
7. **Ordering.** Guard runs before references, which runs before advertising. Does any
   ordering hide a finding, or leave the tree in a state a later check misreads?

## 6. Limits of this packet

Sanitized; rule *contents* are not included, only identity, counts, and mechanism.
Reviewer output is advisory — repository truth and owner approval remain authoritative.
