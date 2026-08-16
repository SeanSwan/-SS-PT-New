# Packet-gate — rounds 4→8, and why the loop has not run dry

**Repository evidence outranks this document.** Supersedes `PACKET-GATE-ROUND5-STATUS-2026-08-16.md`.

| | |
|---|---|
| Worktree | `C:/tmp/ss-coachv3-packet-20260814` |
| Branch | `claude/coach-v3-packet-skill-20260814` — 18 commits, **none pushed** |
| Suites | 62/62 packet-gate tests · 55/55 canaries · 10/10 absence-gate · 7 sibling hook suites |
| Linear | SWA-161 |

---

## 1. The headline: seven rounds, seven rounds with findings

Sean's bar is two consecutive clean rounds. **We have had zero.** Every round, including the two run
as explicit *confirmation* rounds, found real defects verified by execution.

| Round | Reviewers | Found | Critical | Who introduced it |
|---|---|---|---|---|
| 4 | Kimi | 8 (1 disproven) | **1** (mis-ranked HIGH by Kimi) | round-3 fix |
| 5 | Kimi + GLM + me | 12 | **2** | **round-4 fix (mine)** |
| 6 | Kimi + GLM + me | 14 | **1** | **round-5 fix (mine)** |
| 7 | Kimi + GLM + me | 14 | **1** | **standing since round 1** |
| 8 | in flight | — | — | — |

## 2. The pattern, now measured seven times

> Every critical after round 1 was introduced by the fix for the previous round's critical.

It held again in rounds 5 and 6, both times through *my* fixes:
- **R5:** splitting `checks.mjs` to satisfy the 300-line cap moved R3 and R4 out of the three files
  the canary hashed. Proof: neuter `checkArtifact` → R15 silent → decoy packet, **zero findings**.
- **R6:** deriving the hash from *one directory* when the gate's logic lives in two. `extractAnchors`
  decides whether R4 runs at all and was never hashed.
- **R6 again:** folding case in `normPath` to fix a macOS false-refusal created a **Linux fail-open**
  (`src/Config.mjs` vs `src/config.mjs` are two real files on ext4).
- **R6 again:** the inline-remit fix let `## Remit-to-pay …` hijack extraction, leaving a non-empty
  garbage remit that names nothing — R4 and R5 both inert, empty-remit guard silent.

## 3. Round 7's critical had been open since round 1

**A packet could cite ITSELF.** R3 proves "these bytes exist in a repo file at this line range" — not
"these bytes are the source they claim to be." A packet under ROOT citing its own path at the exact
lines its fabricated fence body occupies is byte-identical *by construction*.

Verified before the fix: `PACKET READY`, exit 0, approval view printing **"2 cited block(s), all
byte-verified against the repo [ok]"** over `export function isAdmin(){ return true; }`.

Six rounds of hostile review missed it because every round attacked the *checks*. GLM-5.3 was the
first to ask what R3 actually proves. **The generalized form is still open** (§5).

## 4. Reviewer calibration, measured across five rounds

| Reviewer | Rounds | Findings | Disproven / mis-ranked | Verdict |
|---|---|---|---|---|
| **GLM-5.3** | 4–8 | 0, 9, 9, 9 | 0 | **Strongest.** Its r4 emptiness was a token-budget artifact (31,995/32,000 reasoning tokens); at `--max-tokens 96000` it produced the programme's two best findings — the R15 scope note and the self-citation critical. |
| **Kimi K3** | 4–8 | 8, 8, 5, 5 | 1 disproven, 1 mis-ranked 2 levels | Finds real defects; **ranks by reasoning, not execution.** Re-derive its severities. |
| **Me** | 4–8 | found U+2028 independently; found my own false refusal; caught the case-fold regression | — | Attacking my own diff repeatedly found what reviewers hadn't yet. |

Independent agreement between the two models (the `--seed` hole, the R15 scope gap, the heading
hijack) has been the highest-precision signal available — higher than either model's own ranking.

**Cost:** ~$0.85 across 9 paid calls.

## 5. OPEN — where round 9 starts

1. **The generalized self-citation** (GLM r7 F1, partially closed). Citing any *other* in-repo prose
   file containing the fabricated text launders identically. Requires committing the payload first —
   a far higher bar — but it is not closed, and R3's guarantee is narrower than its name suggests.
2. **`--document` has no containment while `--seed` does.** Adding it failed 21 of the suite's own
   tests (packets are normally authored in a scratch dir), so the constraint is wrong for that
   channel and the seed's rationale is the overstated half. **Owner decision** — recorded in
   `seed.mjs`. Do not silently resolve either way.
3. **Route-only remits** bind to any real non-test file containing the route string (a client SDK, a
   router table). Inherent to substring matching; documented, not closed.
4. **`mentions()` binds a symbol named in a comment or string literal** — documented residual.
5. Round-8 findings, pending.

## 6. What is genuinely solid now

The invariant survives every attack tried since round 4: CRLF, lone CR, U+2028/U+2029, BOM, NBSP,
vertical tab, fabricated seed, out-of-repo seed, self-citation, decoy paths, decoy symbols, test-file
decoys, misspelled flags, flag-swallowed values, remit truncation, remit hijack, and a neutered
check. Each has a canary or a regression test, and a legitimate packet still clears at exit 0 in
every one of those configurations — the fixes are not "refuse everything".
