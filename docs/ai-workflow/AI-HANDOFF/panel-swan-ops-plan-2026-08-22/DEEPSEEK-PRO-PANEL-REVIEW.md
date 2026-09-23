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
