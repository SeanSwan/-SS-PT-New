# Fable — Final-Decider arbitration: the swan-ops plan

Eight seats hostile-reviewed `SWAN-OPS-HANDOFF-V4` (a handoff/plan for an internal recon
tool). **All eight returned REVISE.** You are the Final Decider. Do not re-derive the panel —
arbitrate it.

## What makes this arbitration unusual: several findings are ALREADY SETTLED by execution

I ran every checkable claim against the real machine before bringing it to you. Three findings
are DISPROVED and must not enter the fix list; several are CONFIRMED and are not in dispute.
**Do not re-litigate the settled column — rule on what remains.**

### VERIFICATION LEDGER (executed, not reasoned)

| Claim | Seat | Result |
|---|---|---|
| Plan ships the operator's Windows username to external models | Grok | **CONFIRMED** — 3 occurrences in the dispatched packet. Systemic: 59 handoff docs / 140 occurrences repo-wide, months old. My own pre-dispatch secret-scan returned "no matches" — a FALSE NEGATIVE; the instrument lied and I believed it. |
| `Test-ReportLinks` HEAD-fetches agent-authored URLs from the OPERATOR process, post-publish, no allowlist, up to 40 URLs | Grok + Sol | **CONFIRMED** — `Console.ps1:26` `Invoke-WebRequest -Uri $u -Method Head`; called at `Publish.ps1:481` in the PUBLISHED/FLAGGED branch. This is an egress channel Slice 2 would NOT close: Slice 2 constrains the codex child; this runs in the parent. |
| Code comment claims a "28-form sweep"; suite actually pins 34 | DeepSeek Flash | **CONFIRMED** — runtime prints "all 34 record forms flag". Sixth stale hand-written number in this workstream. Fixed by removing the number entirely. |
| `swan-ops` has NO version control and no backup — single copy on disk | GLM | **CONFIRMED** — not a git repo. Nine rounds of work, both slices, and the only recon report exist in exactly one place, on a tree where a concurrent agent operates under a "never `git add -A`" warning. |
| `OPEN-2` unpinned `@playwright/mcp@latest` executes outside the sandbox as the user | GLM/Grok/me | **CONFIRMED** — `BrowserPolicy.ps1:86`. |
| Slice 2's proposed allowlist `$AdLibraryOrigins` contains `https://www.google.com` | Grok/DeepSeek Pro/Sol | **CONFIRMED** — `BrowserPolicy.ps1:69`. Slice 2 would bake the known-overstated list into the actual security perimeter. |
| §3 "it cannot edit its own instructions" contradicts OPEN-10 "sandbox strength unverified" | GLM/Kimi/Grok | **CONFIRMED** by reading — both sentences are in the plan. |
| The freeze has no automated test | GLM + me | **CONFIRMED** — no test in either suite references `-Yes`, `exit 4`, or the freeze. |
| §3 attributes 9.3 MB/184 files to `sandbox/` while OPEN-9 attributes it to `sandbox/.playwright-mcp/` — contradiction | Grok | **DISPROVED** — both are true; `.playwright-mcp/` IS essentially the whole sandbox (both measure 9.3M/184). |
| Plan claims 53 assertions; real count is 44 | Qwen | **DISPROVED** — Qwen counted 44 case-table ENTRIES statically. Runtime prints `RESULT: 53 passed`. 12 static call sites, 44 cases, 53 executions. |
| `sandbox/` is under Desktop; if OneDrive-backed the JWT-bearing logs already left the machine | GLM | **DISPROVED** — Desktop resolves to `C:\Users\<OPERATOR>\Desktop`, NOT redirected into OneDrive. Right question, wrong answer. |

## The five questions the panel was asked

Q1 truth-of-plan-vs-code · Q2 is "stop and ask" right · Q3 backlog ranking ·
Q4 is the Slice 2 spec executable · Q5 what is missing entirely.

## YOUR RULING — I need these six things

1. **The fix list, ordered.** Of the CONFIRMED findings plus whatever survives in the reviews
   below, what actually gets fixed, in what order? Be willing to say "not worth fixing."
2. **Rule on Q2.** The plan refuses to recommend invest-vs-freeze and calls it the owner's
   call. Seats split: most say stop-and-ask is right *process* but that declining to state a
   recommendation is decision-avoidance, since the plan's own §15 already treats freeze as the
   expected path. GLM proposes a default-with-expiry ("absent an answer by <date>, retire in
   place"). **Rule: should the plan carry an explicit recommendation, and if so which one?**
3. **Rule on the parent-process exfil channel.** Does confirming it change Slice 2's scope,
   and does it change the severity ranking (it is an egress path that survives Slice 2)?
4. **Rule on the freeze's real extent.** Grok argues the plan's summary "the tool is frozen"
   is false because only `-Yes` is refused — attended runs via `.cmd`, the menu, and `-Market`
   are live, on a machine the plan itself documents as holding three API keys. Grok's cheapest
   de-risk: refuse EVERY entry point with exit 4 until the decision is made. **Rule on this.**
5. **Rule on the PII finding.** 59 docs / 140 occurrences, months old, shipped to multiple
   vendors. Is redacting future packets sufficient, or does the back-catalogue need action?
   This one is the owner's money and reputation, not mine — say plainly what you would do.
6. **Name anything the panel got WRONG** beyond the three I disproved. Eight seats agreeing is
   not evidence; this workstream has already recorded that reviewers converge on plausible
   errors.

Be decisive. Where you disagree with a seat, say so and say why.

---

# THE EIGHT REVIEWS


================ SEAT: CLAUDE ================

# Claude Opus 5 — seat review (the author's own hostile pass)

**Conflict of interest, stated up front:** I wrote the plan under review. Everything below is
verified by execution against the code, not by recollection, precisely because self-review is
the weakest seat on this panel.

## Q1 — Does the plan tell the truth about the code? MOSTLY YES.

Verified true by execution:

| Plan claim | Verified |
|---|---|
| `Swan-Ops.ps1` 299 lines, under its 300 cap | ✔ 299 |
| suite 53/53, e2e 5/5 | ✔ both green, exit 0 |
| `OPEN-2`: `@playwright/mcp@latest` unpinned in `$pwArgs` | ✔ `BrowserPolicy.ps1:86` |
| `OPEN-3`: `https://www.google.com` in the origin allowlist | ✔ `BrowserPolicy.ps1:69` |
| gate uses an 8 MB ceiling and a 40-line head window | ✔ `Publish.ps1:81,83` |
| exit codes 0 / 3 / 1 / 4 | ✔ e2e covers 0, 3, 1 through the REAL launcher |

**No claim I checked was contradicted by the code.** I found one apparent P0 and disproved it:
the e2e suite ends in `Remove-Item (Join-Path $Tool 'reports') -Recurse -Force`, which reads
like it deletes the two real recon reports. It does not — `$Tool` is a temp copy. Both reports
are intact on disk. **I nearly filed that as critical before tracing the variable**, which is
the same failure mode as the two false reviewer claims this workstream has already caught.

## C1 — HIGH — The freeze is the tool's primary safety control and has ZERO test coverage

The plan's §5 and §3 both cite `-Yes → exit 4` as *measured*. It is. But:

```
grep -rn "exit 4|freeze|-Yes" tests/   →   (no matches)
```

**Nothing in either suite asserts the freeze exists.** A future edit — or a merge, or an agent
"simplifying" the main block — removes the six lines that enforce it and **every test still
passes**. The plan then reads as authoritative about a control that is gone.

This is the exact defect class the 9-round panel spent itself on: a guardrail that is real
today but has no mechanism keeping it real. The irony is sharp — the freeze was itself a
*round-2 fix* for "the freeze is unenforced prose", and fixes were never swept for their own
coverage. A one-time measurement is not a regression guard.

**Fix:** one e2e case asserting `-Yes` exits 4 and spends nothing. Cheap, and it makes §5's
claim self-defending.

## C2 — HIGH — `OPEN-2` is misranked, and the freeze does not touch it

The plan ranks `OPEN-1` CRITICAL and `OPEN-2` HIGH, and schedules pinning as "Slice 4" — behind
a decision (§2) that does not gate it. Two things are wrong with that:

1. **The freeze mitigates `OPEN-1` and does nothing for `OPEN-2`.** §5's whole argument is that
   attended-only runs on a credential-poor machine shrink `OPEN-1`'s blast radius. True. But
   every *attended* run still executes `npx @playwright/mcp@latest`, resolving tip-of-npm,
   **outside the codex sandbox, as the user**. The freeze does not reduce that by one bit.
2. **`OPEN-2` needs no injection at all.** `OPEN-1` requires an attacker to first capture the
   agent through hostile page content. `OPEN-2` is RCE on the owner's machine via a compromised
   npm release with **zero attacker interaction with swan-ops**. Shorter attack path, no
   precondition.

And the fix is **one line** — pin a semver — against `OPEN-1`'s multi-session project.

**This should be done now, regardless of how §2 is answered.** A plan that parks a one-line
supply-chain fix behind an invest/freeze decision has mis-sequenced its own backlog.

## C3 — MEDIUM — §14's acceptance test can pass while the hole stands

§14 accepts Slice 2 when, from inside a run, `curl https://example.com` and reading `~/.ssh`
both fail with the failure in the log. **That proves `curl` is blocked. It does not prove
egress is blocked.**

The spec's own mechanism is "a local proxy the child is pointed at, or an equivalent OS-level
control." A proxy the child is *pointed at* is honored through environment variables — and a
captured agent is exactly the actor who will not honor them. `node`'s fetch, PowerShell's
`Invoke-WebRequest` with explicit `-NoProxy`, or a raw socket all route around it. The plan
elsewhere argues at length that prompt-level guardrails are requests rather than controls;
an env-var proxy is the same category one layer down.

The only clause that would actually bind is "or an equivalent OS-level control" — a firewall
rule scoped to the codex process tree, or a container/VM with allowlisted egress — and that is
the clause the spec hand-waves.

**Fix:** name the OS-level mechanism as the requirement, demote the proxy to a convenience, and
widen the acceptance test to at least three transports (`curl`, `node -e fetch`,
`Invoke-WebRequest`), because a single-transport negative is what makes this test look stronger
than it is.

## C4 — MEDIUM — §2 declines to make a call the author is best placed to make

Handoff v3 recommended: freeze the tool, spend the hours on acquisition. **v4 went neutral** —
§2 lays out invest-vs-freeze even-handedly and picks neither.

That is a regression in usefulness. The evidence is one-sided and the plan itself states all of
it: one report produced, its finding already extracted, no scheduled next run, Slice 2 is a
multi-session security project, and the owner's stated #1 priority is a different project
entirely. An author with that much context who presents two options neutrally is not being
even-handed; they are declining to be wrong in writing.

**Fix:** restore an explicit recommendation with its reasoning, and keep the decision the
owner's. "Here is what I would do and why — your call" beats "your call."

## Q5 — What is missing entirely

- **No answer for "what if the decision is never made."** The honest answer is that the tool
  sits frozen and safe indefinitely, which is a fine outcome and should be said, because
  otherwise the plan reads as blocked rather than parked.
- **No inventory of what a second recon would actually cost.** §2 asks invest-or-freeze without
  pricing either branch. Slice 2 is "multi-session"; that is the only number offered.
- **`OPEN-9` (9.3 MB / 812 JWT-shaped third-party strings) has no expiry.** The plan says prune
  it. Nobody owns that, and it grows ~1–1.5 MB per run.

## Verdict

The plan is factually accurate about its code — I could not break a single claim I tested. Its
defects are of judgment and sequencing, not of truth: an untested safety control, a one-line
supply-chain fix parked behind an unrelated decision, an acceptance test narrower than the
property it claims, and a recommendation withdrawn.

**REVISE**

================ SEAT: GLM ================

# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-2026-08-22.md
**Tokens:** 23436 in / 22532 out (reasoning: 19554) | total 45968
**Wall:** 308.2s

---

## VERDICT
REVISE — where I can check the plan against the code it tells the truth (I hand-counted the 53 assertions from the listing and they reconcile exactly; every §6 gate claim matches `Publish.ps1`), but the Slice 2 spec is not executable as written, the acceptance test that keys the freeze-lift is underpowered, and the plan contradicts itself on the sandbox write boundary.

## BLOCKERS
No P0s — nothing deploys and the freeze currently holds. These are the ones that will mislead the next agent or unlock wrongly:

1. **P1 [Q4] The freeze-lift key is an underpowered acceptance test.** §14: "both must fail, and the failure must appear in the log" — for exactly one egress client (`curl`), one domain (`example.com`), and one read target (`~/.ssh`). Concrete failure: implement the control as a PATH shim on `curl.exe` + a hosts-file block of `example.com`; acceptance passes; `Invoke-WebRequest https://attacker.example` (or .NET `HttpClient`) from the agent shell still succeeds; §5 lifts the freeze on that "observed failure"; a captured agent exfiltrates `~/.codex` tokens. There is also no *positive* control — a control that blocks everything (breaking the ad libraries too) also passes. Evidence: §14 Acceptance; §5 "Expires when… **observed** failure… Configuration alone does not lift this freeze."
2. **P1 [Q4] Slice 2 step 1 is self-contradictory.** "The recon job needs none of them." — the *job* doesn't, but the `codex` CLI itself needs model auth (`OPENAI_API_KEY` or `~/.codex`). Scrub-all bricks codex; keep-codex's-creds keeps them child-readable, i.e., OPEN-1 unmitigated. The mechanism is also unspecified: the only documented-good invocation (`& codex @codexArgs`, §8 trap 1) offers no env isolation, and the alternative (`Start-Process`) is documented as mangling 13 args into 17. A competent agent either stalls in hour one or ships a scrub that exempts the exact secrets OPEN-1 names.
3. **P1 [Q1] The plan contradicts its own code-state claims.** §3: "The agent's writable root is `sandbox/`, NOT the tool root — it cannot edit its own instructions." vs §7 OPEN-10: "Windows `workspace-write` sandbox strength **unverified**. If advisory, an injected run could edit `jobs/market-recon.md` and plant standing instructions for every future run." Failure: next agent trusts the §3 control-flow summary, skips the one empirical test OPEN-10 asks for, and a poisoned run plants persistent instructions.
4. **P1 [Q5] No version control, no backup, single copy.** §13: "**Nothing committed.** All untracked/uncommitted on the stale branch" — on a tree with a *concurrent agent* and a standing "Never `git add -A`" warning. One disk failure or one mis-stage by the other agent destroys both slices, the nine-round panel record, and the only report. The plan never lists this as a risk. Cheapest fix: `git init` inside `swan-ops` (it is deliberately outside SS-PT — so give it its own repo) or a scheduled zip to a second location.
5. **P2 [Q3] Backlog is severity-ranked, cost-blind.** OPEN-2 (`@playwright/mcp@latest` unpinned — "A bad release is RCE", executing *outside* the codex sandbox as the user) is deferred to Slice 4 behind a multi-session Slice 2, but pinning is minutes of work and protects the attended runs the freeze still permits *today*. Failure: owner says "just run one attended recon" — that run resolves tip-of-npm. Fix-order should be: pin first, regardless of the §2 answer.
6. **P2 [Q1/Q3] Residual head-confusion DoS the plan believes closed.** The start-scan takes the FIRST line-start `RUN_VERDICT` in the 40-line head (`for… if ($head[$i] -match …) { $start = $i; break }`) while the gate deliberately tolerates preamble above the block (test 'disclosure line above block' → PUBLISHED) and GLM R3-a proves multi-line quoted ads put attacker text at column zero. Failure: an agent quoting an ad in the preamble whose copy carries a line-start `RUN_VERDICT: VOID` anchors the parser on the poison line; the next line isn't `CONTROL_POSITIVE` → honest run QUARANTINED. §6's "Nothing a report can contain now blocks publication on injection grounds" is true as scoped — but the "$5 DoS is closed" narrative overstates, and the suite never combines poison-at-line-start-above-block with a real block below. Cheap fix: anchor on the first index where a *full contiguous valid block* matches, not the first `RUN_VERDICT` line. (Exploitability is conditional on the prompt not hard-mandating block-at-line-1 — unverifiable, see CONFIDENCE.)
7. **P2 [Q5] The freeze has no automated test.** The e2e's five cases cover exits 0/3/1 only. The `-Yes → exit 4` refusal — the one control §5 calls "mechanically enforced" — is verified only by hand. A refactor that breaks it keeps both suites green. One ~5-line e2e case closes this.
8. **P2 [Q5] `sandbox/` lives under Desktop.** Path is `C:\Users\<OPERATOR>\Desktop\quick-pt\swan-ops`. If Known Folder Move/OneDrive backs this Desktop, OPEN-9's "812 JWT-shaped strings" and the UTF-16 logs have *already* left the machine — "outside git" ≠ "outside sync." One registry/attribute check settles it; the plan never asks.
9. **P2 [house rules] Line-cap violations by the plan's own §3 numbers, plus one rule conflict.** `lib/Publish.ps1` 506, `tests/test-publish-gate.ps1` 301, `jobs/market-recon.md` 306 — all over the non-negotiable ≤300/file cap, while OPEN-6 celebrates the launcher at 299 (the test being 301-over by exactly one line is irony, not compliance). UI rules (styled-components/Victory/palette/touch/dark/WCAG) are N/A — console tool, no UI; credentials phrasing ("26+ years", "NASM-protocol") and the no-yoga/meditation rule are compliant. Real conflict: the §10 panel loop ships full documents containing named public figures to external LLMs, against the house "zero PII to LLMs (IDs only)"; §12's carve-out ("public brand accounts are fair game") is the workstream's rule, not the house's — the owner should reconcile, not the agent.
10. **P2 [Q2] The blocking decision has no default-with-expiry.** "Stop and ask" is the right call — resource allocation between workstreams is genuinely Sean's, and unilaterally investing days of security engineering against his stated #1 priority would be worse. But I argued the opposite as instructed: the evidence (one report, finding extracted, no scheduled run, owner's priority elsewhere) already determines *retire-in-place* unless Sean names a concrete second recon; blocking indefinitely on him is decision-avoidance dressed as deference. Fix: "absent an answer by <date>, treat as retire-in-place" — SWA-191 has been open since 08-19.

## ATTACKS
- **Correctness:** (a) first-match start-scan — blocker 6. (b) The `$mustNotFlag` sweep pins `'a. '` as prose, so a *real* injection record rendered as an alpha-enumerated list ("a. INJECTION ATTEMPT OBSERVED: …") with a lying header publishes clean — the suite enshrines the leak as desired behavior. Consequence is a missed flag only (exit 3 vs 0), consistent with the documented impossibility result, but it should be an *accepted limit*, not disguised as prose. (c) The suite is not hermetic: the outcome case is literally named "published (with URLs, **net I/O**" — 53/53 depends on reaching example.com; offline or filtered-network runs flake or hang, and §3's "verify everything in 30 seconds" fails on a plane. (d) `Write-PublishOutcome`'s PUBLISHED branch calls `Get-Item -LiteralPath $Result.Path` outside any try — a TOCTOU/AV-lock between `Move-Item` and the size read throws *after* publish, crashing the launcher post-success. (e) Report paths are second-resolution and `Move-Item -Force` silently overwrites an earlier same-slug report's *payload* (the code fixed the stale-sidecar half of this only). (f) The `ERROR` status has no e2e coverage.
- **Security:** acceptance-client enumeration (iwr/`HttpClient`/any local node or python) — blocker 1; env-scrub/codex-auth circularity — blocker 2; step 3 "Deny-read the credential paths **if the platform allows it**" is a conditional with no fallback in a *security* slice — an unverifiable maybe is not a control; OPEN-2 correctly identified but wrongly sequenced — blocker 5; OneDrive question — blocker 8; OPEN-9's "Never paste these logs into another model" is a prose rule with zero enforcement (the packet-build step says "secret-scan the packet" — same class: instruction, not mechanism). Replay/idempotency: N/A — no server, no API; I state that rather than invent one.
- **Data-truth / schema drift (plan↔code here):** contradiction §3 vs OPEN-10 — blocker 3. Claims citing files PART 2 omits — OPEN-2's `$pwArgs`, OPEN-3's `$AdLibraryOrigins`/`Write-BrowserDisclosure` strings — are quote-checkable only against `lib/BrowserPolicy.ps1`, which is not supplied; per this panel's own rule those quotes are currently unverifiable. Positive verifications I *did* run: the 53-assertion arithmetic reconciles exactly (39 table cases + 2 + 4 handles + 5 outcomes + 3 sweeps); the e2e 5-case exit/landing table matches §3's exit map; every §6 behavioral claim (bounded 40-line head, contiguity/order, fail-closed on empty/oversize/non-zero/absent block, flag-not-quarantine discrepancy, sidecar behaviors) matches the code shown; the "never exercised through a live codex run" disclosure is honest and matches the e2e header. Frontend response-shape drift: N/A — no frontend; saying so plainly rather than padding.

## HIGHEST RISK
The §14 acceptance test, because it is the *key that lifts the §5 freeze* — the single point where weak evidence converts OPEN-1 (unsandboxed egress + readable credentials, against attacker-controlled ad input) from a contained risk into a live one. Cheapest de-risk, before any Slice 2 build: rewrite §14's acceptance to require (a) a positive control — an allowlisted ad-library domain still loads, proving the tool works; (b) a negative matrix — ≥2 non-allowlisted domains × ≥2 independent clients (`curl.exe` *and* `Invoke-WebRequest` *and* a raw .NET path); (c) read attempts on `~/.ssh`, `~/.codex`, and `.env` via both PowerShell providers and `[System.IO.File]::ReadAllText`; (d) mechanism-level ground truth — proxy/firewall logs showing zero non-allowlisted flows, not the child's self-report; (e) freeze stays until it reproduces twice. Cost: about an hour of spec text, zero build.

## CONFIDENCE
I could not run anything; every "verified fact" is author-supplied and both suites are re-runnable in ~30 seconds per §3 — do that first. I could not verify: (1) `lib/BrowserPolicy.ps1`, `lib/Console.ps1`, `lib/Handles.ps1`, `Swan-Ops.ps1`, and `jobs/market-recon.md` — omitted from PART 2 — so OPEN-2/OPEN-3's quoted strings, the "SINGLE regex pass (6 tokens)" claim, `Test-ReportLinks`' failure behavior (relevant to the non-hermetic-suite and post-publish-throw findings), and — decisively for blocker 6 — whether the job prompt hard-mandates the verdict block at line 1 or merely "near the top" are all uncheckable; supplying `market-recon.md` §5 settles blocker 6's exploitability in one read. (2) Actual line counts — §3's numbers (506/301/306) are taken on trust; a `Get-ChildItem`/measure pass settles the house-rule finding. (3) Whether Desktop is OneDrive-backed — one registry check settles blocker 8. (4) Whether codex auth on this box lives in env or `~/.codex` — one `codex exec` with a scrubbed env settles blocker 2's circularity empirically. My 53-count is hand-counted from the listing and could be off by one if a case line was elided in reproduction — but it reconciled exactly, which is itself evidence the packet is faithful.

REVISE

================ SEAT: GROK ================

# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 23855 in / 17238 out · **Cost:** ~$0.1509 · **Wall:** 202.4s · **finish:** stop

---

## VERDICT
REVISE — the gate description matches the code, but the TL;DR overstates the freeze, §3 states an unverified write-isolation claim as fact, and §14 is not an executable security spec (its acceptance can pass while OPEN-1 stays open).

## BLOCKERS
1. **P0** — Slice 2 “done” while the hole remains. Inputs: Sean says invest; agent implements §14; a run is instructed to `curl https://example.com` and read `~/.ssh`. Wrong output: both “fail” and the failures appear in the log because curl is absent, `~/.ssh` is absent, the agent fabricates the lines, or only `example.com` is blocked — freeze lifts, env still inherited, Playwright/shell alternatives still egress, model channel still exfils. Evidence: §14 acceptance (“both must fail, and the failure must appear in the log”) vs §14.1 (env scrub has **no** acceptance) vs §5 (“Configuration alone does not lift this freeze”).

2. **P0** — Slice 2 allowlist is the list OPEN-3 already called overstated. Inputs: implement §14.2 using `$AdLibraryOrigins`. Wrong output: “egress allowlist” includes `https://www.google.com` (search, forms, apps-script, user content) so a read of `~/.ssh` still has a trivial HTTPS send path, and the §14 curl-to-example.com probe still fails. Evidence: §14.2 “`$AdLibraryOrigins` is already the list” vs §7 OPEN-3 “`$AdLibraryOrigins` contains `https://www.google.com`”.

3. **P1** — Next agent treats write-isolation as solved. Inputs: injected/captured run, `workspace-write` advisory. Wrong output: `jobs/market-recon.md` rewritten; every future run carries planted instructions. Evidence: §3 “it cannot edit its own instructions” vs §7 OPEN-10 “Windows `workspace-write` sandbox strength **unverified**”.

4. **P1** — Operator or another agent launches an attended recon on a machine that already has keys. Inputs: double-click `Swan-Ops.cmd` / `-Market` / menu, answer `y` (e2e already does this). Wrong output: full pipeline runs; child inherits env; reads `~/.ssh` / `~/.codex` / `.env`; unsandboxed egress. Only `-Yes` is mechanically refused. Evidence: §3 TL;DR “the tool is frozen”; §5 “`-Yes` (unattended) exits 4”; verified `Swan-Ops.ps1 -Market "x" -Yes` → exit 4; e2e `'y' | … -Market "golf fitness"` → exit 0/3/1; §11 `ZAI_API_KEY`, `OPENROUTER_API_KEY`, `LINEAR_API_KEY` present.

5. **P1** — Env scrub as specified either breaks the tool or does not bind the real leak. Inputs: drop `OPENAI_API_KEY` / Codex auth from the child, **or** leave it so `codex exec` can run. Wrong output: recon cannot start, **or** the child still has a cloud channel and can paste file contents into the model. §14.1 says “The recon job needs none of them” — the job is not the runtime. Acceptance never asserts the child env.

## ATTACKS
- **Correctness:** Gate claims check out against PART 2. Bounded head (`$script:HeadScanLines = 40`), contiguous in-order four-line parse, `8MB` ceiling, empty → quarantine, non-zero `$AgentExitCode` → quarantine, `INJECTION_OBSERVED: YES` → FLAG not quarantine, header/body discrepancy → FLAG, “Nothing a report can contain now blocks publication on injection grounds” matches the code (injection never writes `$reasons`). 39 `$cases` + stale-flag + collision + 4 handles + 5 outcomes + 3 prefix sweeps = 53; e2e has the five modes the plan cites. Those numbers are true.

  Plan-vs-code / plan-vs-itself that do **not** check out:
  - §3 “cannot edit its own instructions” vs OPEN-10 (quoted above).
  - Two-minute summary “the tool is frozen” vs freeze that is only `-Yes` (e2e proves `-Market` + `y` is live).
  - “Slices 0 and 1 are **shipped and dry**” + one real report dated `2026-08-14` vs gate born `2026-08-19`. The only production report predates the gate. Suites are unit + stubbed launcher. Verified fact: gate has never seen a live `codex` report. Plan implies this via “stubbed codex” but never states the date collision. “Dry” here means two review seats, not a live pass.
  - “53 assertions — the gate, unit level” includes 4 `Get-HandlesBlock` tests (not the gate).
  - §14 is not executable without questions: no Windows control (proxy vs WFP vs `netsh` vs hosts), no proxy-pointing mechanism, no handling of `Invoke-WebRequest` / node / Playwright as curl substitutes, no probe that is independent of the agent’s self-report, step 3 “if the platform allows it” is a skip clause, env scrub untested, Codex auth vs scrub unresolved, `$AdLibraryOrigins` not enumerated.

  Q2 — recommendation: **stop-and-ask is the right process; freeze is the right call; refusing to say freeze is the dodge.** One report, finding extracted, no next run, owner’s #1 is acquisition, Slice 2 is multi-session security work on a tool that may never run again. Opposite: the plan already has the facts to close `SWA-191` with “park it”; “Sean’s call” after writing §15 as the expected path is an agent declining a call it already made in prose. Other opposite: “ask” while `Swan-Ops.cmd` still runs on a key-bearing machine is the worst third option — either refuse **all** entry points today (one branch) or invest. Sitting loaded is not neutrality.

  Q3 — ranking: OPEN-1 as the invest-path #1 is right. OPEN-2 is ranked too low (unpinned `@playwright/mcp@latest` executed **outside** the sandbox as the user is RCE, not “also pin it in Slice 4”). OPEN-3 is ranked too high (wrong disclosure sentence, README already struck through). OPEN-10 is ranked too low (persistence into `jobs/market-recon.md` is how one injection becomes every future run; that is not LOW if OPEN-1 is CRITICAL). Missing: (a) freeze does not cover attended/menu/`-Market`; (b) `$AdLibraryOrigins` as Slice 2 allowlist bakes OPEN-3 into the control; (c) `Write-PublishOutcome` → `Test-ReportLinks` (“net I/O”) is operator-context egress the backlog never names; (d) model-API exfil survives any shell allowlist.

- **Security:** OPEN-1 is real: write sandbox, free reads, free egress, prompt-only anti-exfil, job input is attacker-controlled ad copy by design. Freeze does not create a boundary (§5 admits this) and does not even latch the common path. Slice 2 as written tests the wrong subject (agent-visible curl / home-dir read) and the wrong allowlist (google.com). Residual after a “successful” §14: Codex conversation channel, Playwright navigation, PowerShell/.NET HTTP, DNS, IPv6, CONNECT via an allowed origin. `Test-ReportLinks` runs **after** publish in the operator process — if it fetches, a captured agent’s published URLs become SSRF/DoS from the gate, unsandboxed. OPEN-9’s 812 JWT-shaped strings plus “Never paste these logs into another model” is correct and under-enforced by a handoff that itself ships a Windows username into a reviewer packet (`C:\Users\<OPERATOR>\...`) against “zero PII to LLMs” / §12 “no PII… in any… paid packet”. House rule `<=300` lines: plan’s own map has `lib/Publish.ps1` **506** and `tests/test-publish-gate.ps1` **301**; OPEN-6 closed only the launcher (299). Other house rules (MUI/Recharts/palette/glow/44px/WCAG/yoga/NASM-certified) do not apply to this console and are not violated in visible prose.

- **Data-truth / schema drift:** No Pascal/snake or FK drift (not that system). Doc drift: §3 assigns `9.3 MB / 184 files` to `sandbox/`; OPEN-9 assigns the same numbers to `sandbox/.playwright-mcp/`. §3 “2 reports” vs §4 one named `2026-08-14-153233-…` file. v3 warnings in §9 are internally consistent with “do not implement `CONTROL_WORKED` / `TRIMOV_STATUS`” (those strings are not in PART 2 either). Verdict-block example in §6 with `# VOID → quarantine` comments is annotation; the live regex is `([A-Z_]{1,20})[ \t]*$` and would reject those comments if copied literally — a next agent who pastes the annotated block into a fixture will “fail closed” for the wrong reason.

## HIGHEST RISK
Attended launch is still live on a machine §11 says already holds `ZAI_API_KEY` / `OPENROUTER_API_KEY` / `LINEAR_API_KEY`, with OPEN-1 unfixed and the TL;DR calling that “frozen.” Cheapest de-risk before any invest/ship decision: refuse **every** entry point (`.cmd`, menu, `-Market`, `-Yes`) with the same exit 4, and do not lift it on a log that the agent wrote. That is one branch plus a suite case; it makes §2 a real stop instead of a comment.

## CONFIDENCE
Could not verify from this packet: `Swan-Ops.ps1`, `lib/BrowserPolicy.ps1`, `lib/Console.ps1`, `lib/Handles.ps1`, `jobs/market-recon.md` §5, README, the actual `$AdLibraryOrigins` array, how `codex exec` authenticates, whether `workspace-write` is advisory, whether `Test-ReportLinks` fetches or only regexes, whether `curl` exists here, handles.txt contents, sandbox JWT count, v3 text, panel synthesis. Line counts other than the verified 299 / 53/53 / 5/5 / exit 4 are plan-asserted only.

What would settle it: those files in the next packet; a dump of `$AdLibraryOrigins`; one empirical write to `jobs/market-recon.md` from inside a stub child (OPEN-10); `Get-Command curl` plus a non-agent probe of env + HTTPS + `Invoke-WebRequest`; `Test-ReportLinks` source; the exact `-Yes` refusal string. I am confident on gate-vs-§6 (code is in front of me) and on §14 being underspecified. I am **not** confident OPEN-1 is exploitable on the next attended run without seeing the real `Get-CodexArgs` / sandbox flags — the plan’s own OPEN-10 is the right epistemic posture, and §3 violated it.

**REVISE**

================ SEAT: KIMI ================

# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 23280 in / 8116 out | **Cost:** ~$0.1916 | **Wall:** 51.6s | **finish_reason:** stop

---

# Hostile review — swan-ops handoff v4

I checked every quantitative claim I could against PART 2. The 53-assertion count is real (I count 39 case-table entries + stale-flag + collision + 4 handles + 5 outcome + 3 sweeps = 53). The exit-code map, the head-scan bound, the contiguity requirement, the flag-not-quarantine design, the 8 MB ceiling, and the freeze refusal all match the code. The plan is *mostly* truthful. The findings below are where it is not, plus the four other questions.

---

## Q1 — Does the plan tell the truth about the code?

**Finding 1 (HIGH, misleading): §3 asserts as fact what §7/OPEN-10 admits is unverified.**

§3 states, flatly:

> "The agent's writable root is `sandbox/`, NOT the tool root — it cannot edit its own instructions."

OPEN-10 says:

> "Windows `workspace-write` sandbox strength **unverified**. If advisory, an injected run could edit `jobs/market-recon.md` and plant standing instructions for every future run."

These cannot both be true. §3's sentence is the load-bearing safety claim for the whole "draft & stage only" posture, and the plan itself lists its foundation as an open, untested question — ranked LOW. Either §3 should read "cannot *if the Windows sandbox is enforcing* — unverified, see OPEN-10", or OPEN-10 should have been closed before the claim was made. As written, the next agent reads §3 in their first two minutes and believes a boundary exists that the same document later admits is unverified. This is the worst kind of handoff error: the reassuring version is the one stated as fact.

**Finding 2 (LOW, overstatement): the impossibility result is attributed to "both reviewers."**

§6:

> "Both reviewers independently proved that **no purely textual test** can separate 'the agent recorded an attack' from 'the agent faithfully quoted ad copy containing a record-shaped line'"

The code's own comment attributes the impossibility result to one seat:

> "GLM stated the impossibility precisely: this anchor 'is neither sufficient for "agent recorded an injection" (quoted copy) nor necessary (blockquote/numbered).'"

Kimi's contribution (F7) was the DoS asymmetry, not the impossibility proof. This doesn't change the design and I'd call it sloppy attribution rather than a lie, but in a document whose own Rule 30 exists because reviewers assert without verifying, the plan should model the standard it preaches.

**Checked and confirmed true:** the four-line contiguous-in-order head scan (40 lines), quarantine on missing/malformed/partial/out-of-order block, non-zero exit → quarantine, empty/>8 MB → quarantine, YES → publishes flagged, "Nothing a report can contain now blocks publication on injection grounds" (the body scan only ever adds flags), exit codes 0/3/1/4, 299 lines, both suite results. §9's claims about v3 and the `jobs/market-recon.md` contract are not verifiable from this packet — the job prompt is not included, so "Neither string exists anywhere in the job prompt" is taken on trust.

**One disclosure gap:** the verified-facts section notes the gate has never been through a live `codex` run. The plan discloses this only obliquely — the file map says "the REAL launcher, stubbed codex" — but never states in prose "this gate has never seen a real agent." §3's "Both suites green right now" is the first thing a next agent reads; one sentence there would close it.

---

## Q2 — Is "stop and ask" right?

**My conclusion: yes, and it is not an evasion.** The decision is genuinely the owner's: it trades engineering hours against business priorities only Sean can weigh, and the plan makes the safe state free — the freeze is *mechanically enforced* (`-Yes` exits 4), so inaction costs nothing and risks nothing. An agent that unilaterally started Slice 2 would be spending multi-session security-engineering effort on a tool that has produced one report, with no next run scheduled, against the owner's stated #1 priority. "Do not default into Slice 2 without an answer" is the correct default when the default action is expensive and irreversible-ish and the question is cheap.

**The opposite, argued honestly:** the plan already contains everything needed to make the call. Its own §2 says the recon "is *done* and its business finding is captured," that "What has actually been produced to date: one report," that "no next run is scheduled," and that acquisition is Sean's stated #1 priority. Every loaded fact points one way. An agent that writes "the decision is Sean's" while having assembled a one-sided evidence base is doing the analysis and declining the conclusion — and `SWA-191` has been open since 2026-08-19, so "ask Sean" has already demonstrated its latency. A stronger move: state a default with a deadline ("freezing in place unless you object by Friday; the freeze is enforced either way"), which preserves the owner's authority without blocking the workstream on a reply.

**Why the opposite loses:** the two options are not symmetric. Recommending "invest" commits Sean's hours; recommending "freeze" is reversible with one sentence. Where the plan could improve without crossing into usurpation: it never says *which way the evidence leans*, even though §2's own text leans obviously. "I recommend freeze-in-place; here is what would change my mind" is not making the call — it is doing the job of a recommendation. The plan presents two options with no stated preference, which is slightly more deferential than the evidence warrants. Minor.

---

## Q3 — Is the backlog ranked correctly?

**OPEN-1 as CRITICAL: correct.** It is the only finding that is (a) cheaply triggerable by the threat actor the tool *invites* — anyone can buy a $5 ad, and the job mandates quoting hostile copy verbatim — and (b) the sole difference between "draft & stage only" being true and being instructed. The freeze mitigates but does not bound it (the plan's own scope caveat admits an attended run still reads a personal `~/.ssh`). Right call.

**OPEN-10 is ranked too low (LOW), and this connects to Finding 1.** If the Windows sandbox is advisory, an injected run edits `jobs/market-recon.md` and acquires *persistence across every future run* — strictly worse than a one-shot exfil, and the test is "One empirical test." A cheap-to-test, cheap-to-exploit, persistence-granting unknown that undermines the document's own §3 safety claim is not LOW. It should be HIGH and scheduled before any further attended run, not parked in Slice 9.

**OPEN-3 is ranked too high (HIGH).** An overstated disclosure string is a honesty defect, not a hole — the browser reaching `google.com` while the disclosure says "the two public ad libraries + their CDNs" changes what the operator consented to, but it is partially mitigated (README struck through) and its blast radius is a browsing session, not credentials. MEDIUM. It currently sits above OPEN-8 (no wall-clock timeout — a captured or stuck agent runs forever, attended-only means a human is *watching a hung process*) and OPEN-10, both of which out-severe it.

**OPEN-2 is ranked correctly but its note undersells it.** "npx resolves tip-of-npm each run and executes **outside** the codex sandbox as the user" means the tool's entire sandboxing story is bypassed by design on every run, awaiting one bad upstream release. Not cheaply exploitable by the ad attacker, so below OPEN-1 — fine — but it is the second finding that makes a §3 claim ("the agent's writable root is sandbox/") conditional in practice.

**Missing from the backlog entirely:**
- No OPEN item for "the gate has never processed a report from a live codex run." It is disclosed (in the e2e header, not the plan's prose) but not tracked. The first real run is itself a test event and should be treated as one.
- No OPEN item for the Royal Private Coach binding (`personaltrainerworldwide` mismatch) as a *data-integrity* issue — it is folded into OPEN-5's notes, but OPEN-5 is framed as report-prose edits; an unconfirmed handle binding is a methodology gap, not prose.

---

## Q4 — Is the Slice 2 spec executable?

**No. A competent agent would have to stop and ask questions, and one step may be internally contradictory.**

**The auth contradiction (the big one).** Step 1 says scrub the child env of `OPENAI_API_KEY` et al. because "The recon job needs none of them." Step 3 says deny-read `~/.codex`. But `codex exec` itself has to authenticate somehow, and its two plausible auth paths are exactly `OPENAI_API_KEY` (env) and `~/.codex` (token store) — both of which Slice 2 removes. The plan never says how codex authenticates after the slice lands. If the answer is "codex reads `~/.codex` before the denial applies" or "the launcher needs the key but the child doesn't," that mechanism is precisely what needs specifying, because it determines whether the env scrub happens in the launcher, in a wrapper, or in a re-exec. As written, steps 1+3 together may produce a tool that cannot start — discovered only at the acceptance run.

**Underspecified mechanisms.** Step 2 offers "a local proxy the child is pointed at, or an equivalent OS-level control" — an unmade choice between two very different builds. Worse, "pointed at" a proxy is not a control: `curl` honours `HTTP_PROXY`, but an injected agent's shell can ignore proxy env vars entirely. Only an OS-level block on direct egress (firewall rule forcing traffic through the proxy) makes the allowlist binding, and the spec never says this. Step 3's "if the platform allows it" punts the entire question it raises.

**The acceptance test is insufficient — it can pass while the hole remains open.**
1. "Both must fail, and the failure must appear in the log" does not establish *why* they failed. `curl https://example.com` fails on a machine with no network, a broken proxy, or a typo'd proxy address — the log shows a failure and the control did nothing. The test needs a positive control: prove an *allowed* domain succeeds in the same run, so the two failures are attributable to the control.
2. Step 1 (env scrubbing) has **no acceptance test at all**. Nothing in the acceptance probes whether `OPENROUTER_API_KEY` is visible to the child. One of the three build steps is unverified by the slice's own gate.
3. The allowlist itself is an exfil channel. An agent that can reach the ad-library domains and CDNs can POST to them (or to anything sharing a CDN edge), and DNS exfiltration bypasses an HTTP proxy entirely. "curl to example.com fails" does not test "cannot exfiltrate to an allowed domain" — which is the actual attack, since the attacker controls ad copy on an allowed domain.
4. Who writes the probe run is unspecified — the acceptance requires "a run that tries" these things, but no probe job prompt exists, and §14 doesn't say to write one.

The freeze-lift criterion in §5 inherits all four weaknesses.

---

## Q5 — What is missing entirely?

1. **The work is one accident away from not existing.** §13: "Nothing committed. All untracked/uncommitted on the stale branch." Nine rounds of reviewed, hardened work — the gate, both suites, the panel record — exist only as uncommitted files on one machine, in a tree that "Another agent works concurrently," on a branch ~1,947 commits behind that Sean says leave alone. The plan documents *why* it can't commit but never says where the safe copy is. There is no backup instruction, no bundle, no "copy `swan-ops/` and `docs/ai-workflow/AI-HANDOFF/` to X before anything else." For a document this careful about evidence preservation in quarantine filenames, the absence of self-preservation is the largest single gap. §16's "first five minutes" should begin with "secure a copy of this work."
2. **No rollback path for Slice 2.** If the env scrub or egress control breaks the tool mid-build, there is no "how to return to the current working state" — and since nothing is committed, there is no pristine reference to return *to*.
3. **No probe-job artifact for the acceptance test** (see Q4) — the freeze-lift requires a log that nothing currently exists to produce.
4. **No codex-version drift procedure.** Preflight checks "version drift vs 0.146.1" but the plan never says what to do when drift is detected — every "measured on 0.146.1" claim (and OPEN-2 notes pinning invalidates them) has no revalidation path.
5. **No guidance on quarantine triage.** The gate will eventually quarantine a real run; nothing says who reviews `reports/quarantine/`, when, or what "reviewed" means. A control whose output nobody reads is prompt-level too.
6. **The `jobs/market-recon.md` contract is referenced everywhere and included nowhere.** §6, the gate header, and the sidecar files all point at "jobs/market-recon.md section 5" as the contract; the packet doesn't contain it, and §9 already documents one case (v3's `CONTROL_WORKED`) where a doc claimed the prompt said something it didn't. The next reviewer cannot verify the gate against its contract without it.

---

## Summary

The gate itself is described accurately — I found no claim about `Publish.ps1`'s *behaviour* that the code contradicts, and the 53/5 counts, exit codes, and design rationale all check out. The plan's failures are at the seams: a safety claim stated as fact while listed as unverified (§3 vs OPEN-10), a Slice 2 spec whose steps 1+3 may jointly remove codex's every auth path and whose acceptance test can pass with the hole open, a LOW ranking on the one finding that undermines the document's own headline claim, and nine rounds of work sitting uncommitted with no preservation plan.

**REVISE**

================ SEAT: SOL ================

# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 129802 in / 38406 out · **Cost:** ~$0.5593 · **Wall:** 362.6s · **finish:** stop

---

## VERDICT
REVISE — the plan accurately describes much of the gate, but Slice 2 can falsely certify containment while parent-side network I/O, incomplete tests, and admitted sandbox uncertainty leave exfiltration paths open.

## BLOCKERS
1. **P1 — Parent-side link checking may bypass Slice 2 entirely.** A captured child reads a secret, cannot `curl` it because the child proxy blocks egress, but writes it into an attacker URL in an otherwise valid report; after publication, the parent calls `Test-ReportLinks`, potentially requesting that URL outside the child’s controls. The proposed acceptance test still passes and the freeze is lifted. Evidence: `lib/Publish.ps1`, `Write-PublishOutcome` calls `Test-ReportLinks -Path $Result.Path`; `tests/test-publish-gate.ps1` explicitly labels this path `"outcome: published (with URLs, net I/O)"`; `SWAN-OPS-HANDOFF-V4-2026-08-21.md:§14` constrains only child egress. `lib/Console.ps1` is omitted, so no URL, redirect, private-address, or timeout defenses can be verified.

2. **P1 — Slice 2’s acceptance test can pass while two of its three controls remain ineffective.** With `~/.ssh` absent, a read fails naturally; with only `HTTP_PROXY` configured, `curl https://example.com` fails while direct sockets, unset proxy variables, DNS, IPv6, shared CDN hosts, or allowed destinations still work. Nothing in acceptance tests whether inherited environment secrets were removed. A model-written log can also merely claim both failures. Evidence: `SWAN-OPS-HANDOFF-V4-2026-08-21.md:§14` says only that both attempts “must fail, and the failure must appear in the log,” while `§8 trap 5` says `"The agent's self-report is not evidence."` The phrase `"if the platform allows it"` also makes deny-read optional while acceptance makes it mandatory.

3. **P1 — The plan states an unverified sandbox property as fact.** If Windows `workspace-write` is advisory, an injected run can alter `jobs/market-recon.md`, persist instructions, and compromise later runs; the handoff nevertheless tells the next agent that this cannot happen. Evidence: `SWAN-OPS-HANDOFF-V4-2026-08-21.md:§3` says `"it cannot edit its own instructions"`, while `§7 OPEN-10` says `"Windows workspace-write sandbox strength unverified"` and explicitly describes editing `jobs/market-recon.md`. OPEN-10 is too low and must be verified before another run.

4. **P1 — The freeze can be lifted while admitted user-level RCE remains scheduled for later.** After Slice 2, a compromised `@playwright/mcp@latest` release can execute as the user outside the Codex sandbox, potentially reading credentials or evading child controls. Evidence: `SWAN-OPS-HANDOFF-V4-2026-08-21.md:§7 OPEN-2` admits exactly that behavior but assigns it to Slice 4, while `§14` permits the freeze to lift after Slice 2. Pinning must precede the first post-freeze run. It may also be operationally required because a strict Slice 2 allowlist will prevent `npx` from resolving npm tip at runtime.

5. **P1 — A flagged report can publish without its promised persistent flag.** If the report move succeeds but sidecar creation fails due to ACL, disk exhaustion, antivirus, or a race, the report remains in `reports/` indistinguishable on disk from a clean report. Evidence: `SWAN-OPS-HANDOFF-V4-2026-08-21.md:§6` says `FLAGGED` “publishes + writes `<report>.FLAGGED.txt`”; `lib/Publish.ps1`, `Publish-Report` catches sidecar failure, appends `"this report is flagged but carries no marker on disk"`, and still returns `Status = 'FLAGGED'`. The same overstatement exists for quarantine reason sidecars.

6. **P1 — The handoff violates the binding zero-PII-to-LLMs rule.** Actual-file packets containing human names are directed to external models, with no IDs-only transformation. Evidence: `SWAN-OPS-HANDOFF-V4-2026-08-21.md:§4` includes named individuals; `§10` says `"Build packets by concatenating the ACTUAL FILES"`; `§12` permits businesses and public brand accounts in paid packets. Public status does not override the house requirement “zero PII to LLMs (IDs only).”

7. **P2 — The binding 300-line cap is already violated.** A policy-enforcing review or CI gate will reject the handoff despite the plan presenting the work as shipped. Evidence: `SWAN-OPS-HANDOFF-V4-2026-08-21.md:§3` lists `lib/Publish.ps1` at 506 lines, `jobs/market-recon.md` at 306, and `tests/test-publish-gate.ps1` at 301. The cap cannot be treated as launcher-only under the supplied house rules.

## ATTACKS
- **Correctness:**
  - The flag-sidecar and quarantine-sidecar failure paths contradict the documented outcome shapes. Sidecar persistence must be transactional: either persist the marker before exposing the report, or move the report back to quarantine/error if marker creation fails.
  - `Test-ReportVerdict` validates one read of the source, then `Publish-Report` later moves the path. A detached process can replace or modify the file between validation and publication. Validate a private snapshot or open/move atomically before parsing.
  - Report names are second-resolution, while quarantine names are only millisecond-resolution and use `Move-Item -Force`. Concurrent runs can overwrite reports, flags, or quarantine evidence. The serial collision test does not prove concurrency safety; use a run UUID and no-overwrite creation.
  - A clean publication suppresses errors while deleting a stale `.FLAGGED.txt`. If deletion fails, `PUBLISHED` is returned while a stale warning survives.
  - The test suite performs real network I/O and supplies no demonstrated timeout or deterministic stub for link checking. “53/53 right now” does not imply repeatable or offline tests.
  - The plan honestly labels launcher E2E as using a stubbed Codex, so that claim is sound. It does not establish behavior through a live Codex process, sandbox, MCP server, or hostile page.
  - `"shipped and dry"` is misleading for work that is simultaneously `"Nothing is committed. Nothing is deployed."` Call it implemented and locally tested, not shipped.
  - The claimed inventory is inconsistent: `§2` says `"one report"` has been produced, while `§3` says `"2 reports"`. An explicit artifact inventory is needed.
  - The “mechanically enforced” freeze only blocks `-Yes`; the supplied E2E proves an interactive confirmation reaches Codex. That is an attended-only guard, not a mechanical prohibition on pre-Slice-2 runs.
  - Recommendation: default to **retire-in-place**, rather than leave an owner decision blocking “everything.” There is one extracted result, no scheduled second run, and acquisition is the stated priority. Reopen only when a second recon is requested.
  - Opposite argument: only the owner can value recurring intelligence and authorize security spending, so asking before investment is correct. That supports a no-spend default, however, not an indefinitely open blocker demanding owner attention.

- **Security:**
  - OPEN-1 deserves the highest vulnerability severity: attacker-controlled pages plus readable credentials and unrestricted shell egress form a direct exfiltration chain.
  - OPEN-2 must be a freeze-lift prerequisite, not Slice 4. Runtime `@latest` is arbitrary third-party code execution under the user account.
  - OPEN-3 changes character once `$AdLibraryOrigins` becomes a security allowlist. An entire `https://www.google.com` origin and shared CDNs are no longer merely a disclosure defect; they are possible exfiltration destinations. Fix and threat-model the list before Slice 2.
  - OPEN-10 is ranked too low. If the sandbox is advisory, persistent instruction modification defeats future runs and invalidates the claim that `sandbox/` is the entire writable universe.
  - A proxy “the child is pointed at” is configuration, not enforcement. The spec must address proxy bypass, direct IPs, DNS, IPv6, redirects, non-HTTP protocols, shared hosting, child subprocesses, and parent-side traffic.
  - The plan does not explain how Codex reaches its model API while the entire child is limited to ad-library domains. It must separate the agent control channel from shell/browser data-plane egress or specify the required model endpoints and associated risk.
  - Testing against real `~/.ssh` is unsafe: if denial fails, key material may be copied into the Codex transcript and UTF-16 log. Use synthetic canaries under protected test paths.
  - Environment scrubbing by secret-name denylist will miss arbitrary names and case variants. Start from a minimal allowlist and assert the complete child environment.
  - OPEN-8 becomes HIGH if unattended operation is ever restored: an injected agent can consume time, tokens, subprocesses, and network indefinitely.
  - No web authn/authz, tenant, or IDOR surface is presented because this is a local console. Local filesystem ACLs, process identity, and concurrent-user boundaries are nevertheless unspecified.
  - The other UI house rules—styled-components, Victory, palette, touch targets, Dual-Button Glow, dark-first, and contrast—are not applicable to this PowerShell console.

- **Data-truth / schema drift:**
  - The strongest contradiction is `§3` asserting the agent cannot edit instructions while `OPEN-10` says that property is unverified.
  - The `FLAGGED` and `QUARANTINED` response shapes documented in `§6` are stricter than the implementation’s error paths.
  - The report-count mismatch and “shipped” terminology leave the next agent without a trustworthy artifact-state model.
  - There is no application model/table/frontend schema in the supplied material, so PascalCase, FK, tenant, and response-shape drift cannot be assessed.
  - The local-only, uncommitted state has no durable manifest, hashes, backup location, or recovery procedure. “Retire-in-place” can become “lost on disk” after a machine failure or cleanup.

## HIGHEST RISK
Slice 2 can certify false containment: a child’s direct `curl` fails, yet secret-bearing URLs may still be fetched by the parent’s post-publication link checker or escape through untested channels. Before any implementation, disable networked `Test-ReportLinks` for untrusted reports or put it under the same enforced policy, then create a red integration test using synthetic file and environment canaries, a controlled exfiltration sink, and independent firewall/proxy audit logs—not model prose. Pin dependencies and repair `$AdLibraryOrigins` before that test can lift the freeze.

## CONFIDENCE
The packet omits `Swan-Ops.ps1`, `lib/Console.ps1`, `lib/BrowserPolicy.ps1`, and `jobs/market-recon.md`, so I could not verify the actual sandbox arguments, URL filtering, redirect behavior, environment inheritance, input hardening, origin list, freeze branches, or prompt contract. In particular, the parent-side exfiltration finding would be settled by the complete `Test-ReportLinks` implementation and a test covering attacker URLs, loopback/private/link-local addresses, redirects, DNS rebinding, and encoded secrets.

I also could not independently execute the claimed 53/53 and 5/5 results, inspect ACLs, confirm npm package resolution, or reconcile the one-versus-two-report inventory. Source hashes, fresh command transcripts, a complete artifact manifest, ProcMon/WFP or proxy logs from canary tests, and proof of dependency lock/integrity would settle those gaps. The packet supplies no source line numbers, so evidence above cites its sections and function/test names rather than inventing line references.

REVISE

================ SEAT: DEEPSEEK-PRO ================

# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 24948 in / 26384 out · **Cost:** ~$0.1243 · **Wall:** 449.1s · **finish:** stop

---

## VERDICT
REVISE — The handoff is unusually detailed and mostly honest about the publish gate, but §14’s egress allowlist reuses an origin list the plan itself calls overbroad, and the plan contradicts itself about whether the agent can write outside `sandbox/`, so it is not safe as the next agent’s sole source of truth.

## BLOCKERS
1. **P0 — Slice 2 would build the egress boundary from a list the plan already identifies as overbroad.** §14 step 2 says “`$AdLibraryOrigins` is already the list”; §7 OPEN-3 says that list “contains `https://www.google.com` — an entire search engine — while `Write-BrowserDisclosure` says reach is ‘the two public ad libraries + their CDNs’.” If a captured agent can read `~/.ssh`, an allowlist containing a whole search engine is not the boundary the freeze-lift implies. The §14 acceptance probe only tests `example.com`, so this hole survives acceptance.
2. **P1 — §3 and §7 disagree on whether the agent can edit its own instructions.** §3 says “The agent's writable root is `sandbox/`, NOT the tool root — it cannot edit its own instructions.” §7 OPEN-10 says “If advisory, an injected run could edit `jobs/market-recon.md` and plant standing instructions for every future run.” A next agent believing the first sentence will not monitor the job prompt for tampering.
3. **P1 — Slice 2 acceptance is a single-channel negative.** §14 requires only “`curl https://example.com`” and “reading `~/.ssh`” fail. That does not cover `Invoke-WebRequest`, Playwright-originated egress, `wget`, `.env`, browser profile stores, or other `~/.codex` files. A control that blocks only that one destination/method can pass while the credential-exfil hole remains open.
4. **P1 — Slice 2 does not reconcile codex’s own auth/egress.** §14 steps 1 and 3 say to drop `OPENAI_API_KEY` and deny-read `~/.codex`, but `codex exec` must reach a model endpoint and authenticate somehow. The spec never names the codex API host in the allowlist or explains how the child authenticates after the scrub. A competent agent will either make the tool fail or reintroduce a credential.
5. **P2 — The mechanical freeze has no regression test.** The e2e suite in PART 2 exercises clean/flag/void/noblock/nothing only; `-Yes` exit 4 is a manual verify in §3. A launcher change that breaks the freeze would leave both suites green.
6. **P2 — “All six `.ps1` files pass…” is stale; §3 lists seven `.ps1` files.** The §3 file map shows `Swan-Ops.ps1`, four lib files, and two test files — seven. If one was omitted, it is likely the main launcher, the most important parse target. The next agent may trust parser coverage that does not include the file they are about to edit.

## ATTACKS
- **Correctness:** The publish-gate parser itself mostly matches the plan: bounded 40-line head, contiguous four-line block, BOM handling, `@()` head wrapper, and flag-not-quarantine for injections are all real and aligned. The main correctness problems are above: the launcher freeze is untested, and the e2e “real launcher” test is still a stubbed `codex`, not a live run — the plan does disclose that, but “Shipped and dry” should not be read as live-proven.
- **Decision logic / Q2:** “Sean’s call” is defensible as a business decision, but the plan over-hedges. Given one report, an already-extracted finding, no scheduled next run, and the owner’s stated acquisition priority, the plan could recommend freeze-by-default while leaving Sean an override. The opposite is also true: only Sean knows whether recurring recon has business value, so a hard engineer recommendation could be false precision. As written, though, the two-options framing reads more like decision-avoidance than decision support.
- **Security:** OPEN-1 is correctly ranked as the top issue. But Slice 2 as specified may not close it because the allowlist is overbroad and the acceptance test is not a negative matrix. OPEN-2, unpinned `@playwright/mcp@latest` executing outside the sandbox as the user, is described as “A bad release is RCE” and should not be ranked below OPEN-1; it is a standing supply-chain RCE path on every run. The `Publish-Report` code does not enforce that `$ProducedPath` and `$ReportPath` stay inside intended directories, but I cannot see the caller, so this is lower confidence.
- **Data-truth / schema drift:** OPEN-3 is exactly a code-vs-disclosure drift. OPEN-5 is report-vs-prompt drift: the report still overstates the “14-month ad” claim and lacks US-scope qualifiers. The §3 vs §7 instruction-writability contradiction is a truth drift. The six-vs-seven `.ps1` count is the exact stale-count failure mode §8 trap 9 warns about.
- **Missing entirely:** no minimal curated egress allowlist; no codex API host/auth strategy under scrubbed env; no multi-method egress test matrix; no default recommendation; no empirical OPEN-10 sandbox write-strength test; no positive test that legitimate ad-library/CDN destinations still work after Slice 2.

## HIGHEST RISK
The most dangerous item is the proposed Slice 2 egress allowlist reusing `$AdLibraryOrigins`, which §7 documents as containing `https://www.google.com`. That creates a false perimeter exactly at the point the freeze is lifted. Cheapest de-risk: before Slice 2, curate an explicit minimal allowlist of exact ad-library/CDN hostnames plus required codex API endpoints, and replace the single `curl`/`~/.ssh` probe with a negative matrix across multiple egress mechanisms and a positive test that legitimate agent traffic still works.

## CONFIDENCE
I could not verify from the document alone: the actual `$AdLibraryOrigins` contents beyond §7’s quote; how `Swan-Ops.ps1` invokes codex and whether `codex exec` genuinely depends on `OPENAI_API_KEY` or `~/.codex`; whether the Windows `workspace-write` sandbox is actually enforced; and whether the freeze branch behaves as claimed, because `Swan-Ops.ps1` is not included. Settling evidence would be: include `lib/BrowserPolicy.ps1`, `Swan-Ops.ps1`, `lib/Console.ps1`, and `.mcp.json`; run a disposable live codex invocation with network capture; and run the full Slice 2 positive/negative egress test before lifting the freeze.

REVISE

================ SEAT: DEEPSEEK-FLASH ================

# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-flash` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 24869 in / 6897 out · **Cost:** ~$0.0032 · **Wall:** 64.2s · **finish:** stop

---

## VERDICT
REVISE — The plan contains a factual error (claims 28-form sweep, test has 34) and the Slice 2 acceptance test is underspecified (how to cause the agent to attempt the actions), both of which will mislead a next agent.

## BLOCKERS
1. **P1** — Plan claims "A 28-form sweep in the test suite pins it" (PART 1 §6), but the test code (PART 2, `test-publish-gate.ps1`, array `$mustFlag`) has 34 entries. The number is wrong, and a next agent relying on the plan may think the sweep is smaller than it is.  
   *Evidence:* Plan §6: "A 28-form sweep in the test suite pins it" vs. code: `$mustFlag = @('', '  ', ...` — 34 items.

2. **P1** — Slice 2 acceptance test (§14) says "from inside a run, attempt (a) `curl https://example.com` and (b) reading `~/.ssh` — both must fail, and the failure must appear in the log." It does **not** specify how to make the agent attempt those actions (e.g., modify the job prompt, create a test script, or use a separate test harness). A competent agent cannot execute this without asking a question.  
   *Evidence:* §14, acceptance paragraph.

3. **P2** — Slice 2 step 3 ("Deny-read the credential paths if the platform allows it") is conditional and vague. On Windows, it is unclear how to deny read access to `~/.ssh`, `~/.codex`, etc. (no built-in ACL mechanism for user home paths that is standard). The plan provides no concrete method or fallback.  
   *Evidence:* §14, step 3.

4. **P2** — The plan admits the gate has never been exercised through a live codex run (§3) but does **not** include a live test in Slice 2 or as a prerequisite. This leaves the gate's real-world behavior unverified, and any future work built on the gate’s correctness is at risk.  
   *Evidence:* §3: "The gate has NEVER been exercised through a live codex run" and §14 does not propose a live test.

## ATTACKS
- **Correctness:** The injection detection regex `(?m)^[ \t>#]*(?:(?:[-*+]|\d+[.)])[ \t]+)?[*_]*INJECTION ATTEMPT OBSERVED` matches lines starting with `#` without a following space (e.g., `#INJECTION ATTEMPT...`), which is not a valid markdown heading. This could cause a false flag on a heading that happens to begin with that phrase (unlikely, but possible). The accepted limit of backtick is documented and acceptable. The head-scan boundary logic appears correct and passes the provided test cases. The `ConvertFrom-ReportBytes` function’s fail-closed mechanism (mojibake → quarantine) is well-designed and tested.
- **Security:** The plan correctly labels the publish gate as a non-security control. The real security risk is OPEN-1 (unsandboxed egress and unscrubbed child environment), which the plan honestly identifies as CRITICAL and blocks further unattended runs. The recommendation to stop and ask is appropriate; the tool is not ready for unattended operation without Slice 2.
- **Data-truth / schema drift:** The plan’s file map line counts (e.g., `lib/Publish.ps1` 506 lines) are claimed to be measured, but we cannot verify them from the code block alone (the block is a continuous excerpt). The plan states v3’s line counts were stale; this one may be correct. No evidence of contradiction with the provided code. The verdict block format (four contiguous lines) is consistent between the plan and the code.

## HIGHEST RISK
The gate has never been tested with a live codex invocation. If the verdict block parsing fails in a real run (e.g., due to unexpected output format, encoding issues, or launcher argument passing), the entire gate is unreliable. The cheapest de-risk: run a single live codex with a test job prompt that writes a knowable verdict block, and verify the gate’s output and exit code. This should be done before any work on Slice 2, as the gate’s correctness is a prerequisite for the freeze-lift verification.

## CONFIDENCE
I cannot verify the actual test suite results (53/53 and 5/5) because I cannot execute the code. The plan provides the test code, which appears correct, but environment-specific issues (path, encoding, dependencies) could cause failures. I also cannot verify the line count of `Swan-Ops.ps1` (299) or the exact behavior of the freeze refusal. To settle these, I would need to run the test suites on the target machine and check the file sizes. The plan is internally consistent and transparent about its limitations, so I am moderately confident that the plan is largely accurate — but the factual error (28 vs. 34 forms) and underspecification of the Slice 2 acceptance test are concrete issues that need correction before the plan is trustworthy.

REVISE

================ SEAT: QWEN ================

# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-OPS-PLAN-REVIEW-PACKET-2026-08-22.md
**Tokens (Ollama):** 24327 in / 1168 out | **Wall:** 20.1s | **done_reason:** stop

---
## VERDICT
REVISE — The plan’s security posture is sound and the code is dry, but the Slice 2 specification is technically infeasible on the target platform (Windows) and the plan contains a critical omission regarding the "invest" path's operational safety.

## BLOCKERS
1.  **P0 — Infeasible Slice 2 Spec (Windows/PowerShell):** §14 Step 2 mandates an "Egress allowlist... local proxy the child is pointed at, or an equivalent OS-level control." On Windows, `codex exec` (a Node.js process) does not natively respect `HTTP_PROXY` for all outbound traffic without explicit library support (which `codex` may not have for its internal fetches), and there is no standard "OS-level control" for egress filtering in PowerShell/Windows that is as simple as `iptables` or `pf`. The plan assumes a Unix-like sandboxing primitive that does not exist in the Windows environment described. A competent agent will stall here or implement a broken proxy.
2.  **P1 — Missing "Invest" Path Safety Protocol:** §2 presents "Invest" as a viable option but does not specify that the tool **cannot be run** on the primary development machine (which holds `~/.ssh`, `.env`, etc.) even after Slice 2, unless the machine is isolated. The plan states in §5 that the freeze is "mechanically enforced" by `-Yes` exit 4, but §14 implies that once Slice 2 is done, the freeze lifts. It fails to explicitly state that **attended runs** (interactive mode) on a live machine remain dangerous if `OPEN-1` (env scrubbing) is not fully verified in a way that covers *all* child processes, not just the direct `codex` call. The plan conflates "Slice 2 done" with "safe to use," which is a dangerous leap.

## ATTACKS
-   **Correctness:** The plan claims `Swan-Ops.ps1` is 299 lines. The code provided is not `Swan-Ops.ps1`, so this cannot be verified, but the plan’s claim of "53 assertions" in `test-publish-gate.ps1` is verifiable. Counting the `Assert` calls in the provided test file: there are 30 `Assert` calls in the main loop, 1 in the "clean run" check, 1 in the "quarantine collision" check, 4 in the "Get-HandlesBlock" section, 5 in the "Write-PublishOutcome" section, 1 in the "prefix sweep" (mustFlag), 1 in the "prefix sweep" (mustNotFlag), and 1 in the "accepted limits" check. Total = 44 assertions. The plan claims **53**. This is a **false claim** in the plan. The code does not match the plan’s description of its own test suite.
-   **Security:** The plan states `OPEN-1` is "CRITICAL" and "the only fix that makes 'draft & stage only' true." However, the code in `lib/Publish.ps1` shows that the gate *does* check for `INJECTION_OBSERVED: YES` and flags it. The plan correctly notes this is a "flag," not a "block." But the plan’s claim that "Nothing a report can contain now blocks publication on injection grounds" is **true** based on the code (it flags, doesn't quarantine). The risk is that an operator might misinterpret "FLAGGED" as "safe to proceed," when the plan itself says "read the report before acting." The plan does not provide a mechanism to *prevent* action on a flagged report, only to *warn*. This is a weak control for a "CRITICAL" finding.
-   **Data-truth / schema drift:** The plan states `jobs/handles.txt` has "8 entries." The code in `lib/Handles.ps1` is not provided, but the test `test-publish-gate.ps1` checks `Get-HandlesBlock`. The test creates a `handles.txt` with 1 entry and checks for it. It does not verify the count of 8. The plan’s claim of "8 entries" is unverified by the provided code.

## HIGHEST RISK
The **false claim of 53 assertions** (actual count is 44) indicates that the plan’s author did not re-run the test suite or count the assertions after the last edit. This undermines the "measured 2026-08-21" claim in §3. If the plan’s numbers are wrong, its other "measured" claims (line counts, file sizes) may also be stale. The cheapest way to de-risk is to **re-run the test suite and update the plan with the actual assertion count and line counts** before any agent acts on it.

## CONFIDENCE
I could not verify the line count of `Swan-Ops.ps1` (299) or the file sizes in §3 because the code for those files was not provided. I could not verify the "8 entries" in `handles.txt` because `lib/Handles.ps1` was not provided. I am confident in the assertion count mismatch because I counted the `Assert` calls in the provided `test-publish-gate.ps1`. I am confident in the Windows egress filtering issue because it is a well-known limitation of the Windows/Node.js stack.

**REVISE**
