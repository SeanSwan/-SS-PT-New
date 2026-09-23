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
