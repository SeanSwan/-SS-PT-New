# Packet-gate — round 5 status, and what round 6 inherits

**Repository evidence outranks this document.** If the code disagrees, the code is right.
Supersedes the round-4 sections of `PACKET-GATE-TAKEOVER-2026-08-15.md`; everything else there
(worktree, transport gotchas, do-not-without-Sean list) still stands.

| | |
|---|---|
| Worktree | `C:/tmp/ss-coachv3-packet-20260814` |
| Branch | `claude/coach-v3-packet-skill-20260814` |
| Commits | 9 local, **none pushed** |
| Suites | 55/55 canaries · 45/45 packet-gate tests · 10/10 absence-gate tests · 7 sibling hook suites green |
| Linear | SWA-161 (relates SWA-52, SWA-154) |

---

## 1. The loop is NOT dry. Round 4's "converging" read was wrong.

Round 4 was reported as the first round with **zero criticals**. Running its findings rather than
reading them showed that was false twice over:

- Kimi's round-4 **F1, ranked HIGH as a false-refusal, was a CRITICAL fail-open.** A CRLF document
  made `parseFences` return `[]`, so there were no *uncited* blocks either — and that is what the
  fabrication guard filters on. Byte-identical content: LF refused, CRLF printed `PACKET READY / no
  fences present / exit 0` over hand-typed code. Kimi reasoned about `norm()` and never ran the
  parser. **Not theoretical:** `core.autocrlf=true` here and every tracked `.md` in this worktree is
  CRLF, so any packet stored where the handoff says to store it arrives CRLF. Four rounds missed it
  because packets were only ever run from gitignored `out/`.
- Kimi's round-4 **F8 was wrong** and was disproven by execution — `norm` strips one trailing
  newline from *both* sides, and a fence body *can* represent trailing blanks. It is now pinned as a
  NOT-A-BUG test so a later round does not "fix" a non-bug.

Round 5 then produced **1 CRITICAL + 2 HIGH**, so the two-consecutive-clean bar is not close.

## 2. The pattern held a fifth time, and the critical was mine

> Every critical after round 1 was introduced by the fix for the previous round's critical.

Round 5's critical was created by my own round-4 fix. Splitting `checks.mjs` for the 300-line cap
moved R3, R4 and both normalizers out of the three files `GATE_SOURCES` hand-listed, so **R15 no
longer certified the checks it exists to certify.** Measured: replace `checkArtifact` with
`return []` — R4 fully neutered — and the canary record still certified the gate, R15 stayed silent,
and the decoy packet produced **zero** findings. `GATE_SOURCES` is now derived from the directory,
because a hand-maintained list is guaranteed to drift the moment the line cap forces another split.

**Treat commit `2a136199c`'s diff as round 6's primary attack surface.** That is not a platitude
here; it is the measured behaviour of this file five rounds running.

## 3. Fixed in round 5 (all verified by execution BEFORE the fix)

| Sev | Finding | Fix |
|---|---|---|
| CRITICAL | R15 unbound from R3/R4/normalizers after the round-4 split | `GATE_SOURCES` derived from the directory; 14 files covered |
| CRITICAL | Hidden characters hide a fence from the gate but not the model — `\r` (r4), U+2028/U+2029 (mine), BOM + NBSP (GLM) | `fenceParseAnomalies`: refuse when a *lenient* reading finds a fence-like line the strict parser did not consume. Kills the class, both faces |
| HIGH | `--seed` measured for R1 and scanned for R6 but **never parsed** — fabricated fences rode along behind "all byte-verified" | seed now gets parse-integrity + uncited + provenance checks, and realpath containment |
| HIGH | a subheading truncated the remit, silently disabling R4 **and** R5 | stop only at a heading of level ≤ the Remit heading's; both tests trim |

Round 4's eight (one disproven) were fixed in `5bff968a1`.

## 4. OPEN — round 6 starts here

None are CRITICAL or HIGH. All were verified as real by the reviewers' own reproductions; **re-verify
by running them before changing anything.**

1. **R4 binding, third consecutive round of residue** (Kimi F3 + GLM F4). A cited block still binds
   via a mention in a *comment or string literal*; a remit naming two paths is satisfied by either;
   a path+symbol remit is satisfied by any file mentioning the symbol; and a **test file** can serve
   as the artifact for a remit about a handler. GLM's direction: bind by the strictest anchor kind
   present, and treat the resolver's own test/fixture excludes as non-binding for R4.
2. **`normPath` vs the filesystem** (Kimi F7 + GLM F5). No case-fold on win32 (false refusal where
   `readCitedFile` already folds); mid-path `./` never equals its clean form; on POSIX a literal
   backslash filename is a *different real file* that normPath folds together — that one binds the
   wrong artifact.
3. **`lines= 40-118`** (space after `=`, GLM F6) drops the attribute, so R3 silently compares against
   the **whole file** and prints a whole-file diff for a correctly-cited range.
4. **Value-flags swallow a following flag** (Kimi F8 + GLM F8): `--remit --json` sets the remit to
   the literal `"--json"` and disables JSON, at exit 0.
5. **Route remits have no `--allow-missing`** (Kimi F4): "add route POST /api/x, here is the handler"
   is a dead end, while the path-shaped version of the same packet clears via one flag.
6. **`PROSE_EXT` vs `RESOLUTION_EXCLUDES`** (GLM F7) are two vocabularies for one concept and already
   disagree (`.markdown`, `.rst`, `.adoc`).
7. **Arg-level exits discard computed findings** (GLM F9): unknown-provider and seed errors print
   two lines and drop everything else — the one-refusal-at-a-time ladder, one rung earlier.

## 5. Reviewer calibration, measured

| Reviewer | Round 5 | Verdict |
|---|---|---|
| **GLM-5.3** | 9 findings, incl. the BOM/NBSP generalization and the R15-coverage scope note that led to the critical | **Now the strongest reviewer.** Its round-4 emptiness was a token-budget artifact, not capability — `--max-tokens 96000` fixed it (33,706 reasoning tokens, 882s). Do not drop it. |
| **Kimi K3** | 8 findings, 1 of which it ranked two levels too low, plus the seed hole | Still valuable; **ranks by reasoning, not execution.** Its severities need re-deriving, not trusting. |
| **Me** | found the U+2028 fail-open independently before either review returned | Attacking my own diff produced the same finding Kimi did and one neither had yet. |

Both models found the `--seed` hole independently — the strongest agreement the round produced, and
it was real.

## 6. Cost

Round 5: Kimi $0.3618 (431s) + GLM (bundled sub) — programme total still well under $1.50 across
eleven calls.

## 7. Sean's outstanding decision

He chose **loop to dry** (fix HIGHs, keep looping) over the faster zero-CRITICAL/HIGH bar, and
**retry GLM once at high max-tokens** — both honoured. Round 5 closed at zero CRITICAL/HIGH open, so
if he now prefers the faster bar, the seven items in §4 become Linear issues and the branch ships.
Otherwise round 6 runs on the §4 list plus the `2a136199c` diff.
