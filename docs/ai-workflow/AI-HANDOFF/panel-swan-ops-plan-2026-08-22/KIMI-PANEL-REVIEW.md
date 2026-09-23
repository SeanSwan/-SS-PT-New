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
