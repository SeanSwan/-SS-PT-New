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

- **Security:** OPEN-1 is real: write sandbox, free reads, free egress, prompt-only anti-exfil, job input is attacker-controlled ad copy by design. Freeze does not create a boundary (§5 admits this) and does not even latch the common path. Slice 2 as written tests the wrong subject (agent-visible curl / home-dir read) and the wrong allowlist (google.com). Residual after a “successful” §14: Codex conversation channel, Playwright navigation, PowerShell/.NET HTTP, DNS, IPv6, CONNECT via an allowed origin. `Test-ReportLinks` runs **after** publish in the operator process — if it fetches, a captured agent’s published URLs become SSRF/DoS from the gate, unsandboxed. OPEN-9’s 812 JWT-shaped strings plus “Never paste these logs into another model” is correct and under-enforced by a handoff that itself ships a Windows username into a reviewer packet (`C:\Users\BigotSmasher\...`) against “zero PII to LLMs” / §12 “no PII… in any… paid packet”. House rule `<=300` lines: plan’s own map has `lib/Publish.ps1` **506** and `tests/test-publish-gate.ps1` **301**; OPEN-6 closed only the launcher (299). Other house rules (MUI/Recharts/palette/glow/44px/WCAG/yoga/NASM-certified) do not apply to this console and are not violated in visible prose.

- **Data-truth / schema drift:** No Pascal/snake or FK drift (not that system). Doc drift: §3 assigns `9.3 MB / 184 files` to `sandbox/`; OPEN-9 assigns the same numbers to `sandbox/.playwright-mcp/`. §3 “2 reports” vs §4 one named `2026-08-14-153233-…` file. v3 warnings in §9 are internally consistent with “do not implement `CONTROL_WORKED` / `TRIMOV_STATUS`” (those strings are not in PART 2 either). Verdict-block example in §6 with `# VOID → quarantine` comments is annotation; the live regex is `([A-Z_]{1,20})[ \t]*$` and would reject those comments if copied literally — a next agent who pastes the annotated block into a fixture will “fail closed” for the wrong reason.

## HIGHEST RISK
Attended launch is still live on a machine §11 says already holds `ZAI_API_KEY` / `OPENROUTER_API_KEY` / `LINEAR_API_KEY`, with OPEN-1 unfixed and the TL;DR calling that “frozen.” Cheapest de-risk before any invest/ship decision: refuse **every** entry point (`.cmd`, menu, `-Market`, `-Yes`) with the same exit 4, and do not lift it on a log that the agent wrote. That is one branch plus a suite case; it makes §2 a real stop instead of a comment.

## CONFIDENCE
Could not verify from this packet: `Swan-Ops.ps1`, `lib/BrowserPolicy.ps1`, `lib/Console.ps1`, `lib/Handles.ps1`, `jobs/market-recon.md` §5, README, the actual `$AdLibraryOrigins` array, how `codex exec` authenticates, whether `workspace-write` is advisory, whether `Test-ReportLinks` fetches or only regexes, whether `curl` exists here, handles.txt contents, sandbox JWT count, v3 text, panel synthesis. Line counts other than the verified 299 / 53/53 / 5/5 / exit 4 are plan-asserted only.

What would settle it: those files in the next packet; a dump of `$AdLibraryOrigins`; one empirical write to `jobs/market-recon.md` from inside a stub child (OPEN-10); `Get-Command curl` plus a non-agent probe of env + HTTPS + `Invoke-WebRequest`; `Test-ReportLinks` source; the exact `-Yes` refusal string. I am confident on gate-vs-§6 (code is in front of me) and on §14 being underspecified. I am **not** confident OPEN-1 is exploitable on the next attended run without seeing the real `Get-CodexArgs` / sandbox flags — the plan’s own OPEN-10 is the right epistemic posture, and §3 violated it.

**REVISE**
