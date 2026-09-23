# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/panel-homelab-heat-2026-08-25/PACKET-3-WATCHDOG-POLICY.md
**Seed:** (none)
**Tokens:** 3700 in / 7496 out · **Cost:** ~$0.0000 · **Wall:** 258.8s · **finish:** stop

---

# GATE REVIEW — Packet 3 (Watchdog observe-mode + ToD policy)

---

## (a) VERDICT

**REVISE** — the instrumentation culture in §2 is genuinely good (self-perturbing monitor caught, impossible sensor gated, PS 5.1 API traps documented), but §3 has at least one blocker that will produce a *permanent false-block* (`DISK_BUSY` at `<90%` idle, §3 `Get-Counter '\PhysicalDisk(_Total)\% Idle Time' ... -lt 90`), §4 violates the system's own fail-toward-sleep invariant, and the arming checklist is not yet satisfiable. Do not create `watchdog-armed` until items F1–F4 below land.

---

## (b) Correctness attacks

**B1 — `DISK_BUSY` will block forever (highest-confidence bug).**
`\PhysicalDisk(_Total)\% Idle Time` sampled once (default `Get-Counter` = 1 sample) reads "not idle" if *any* IO occurred in the sample interval. On a normal Win11 desktop: Defender, Search Indexer, telemetry, browser cache flushes, and NVMe queue behavior routinely push a single sample below 90%. Your own first observed cycle (§3) logged `DISK_BUSY` — you attribute it to "an admin was connected," but that's inference, not evidence; you cannot distinguish real load from noise with this instrument. This is a standing false-block, and see D5: it is *unbounded* — the zombie ceiling only covers `JOB_RUNNING`.

**B2 — Single-sample `CPU_BUSY > 30%`.**
Same disease as the MAX-of-3 GPU samples you already killed in §2. One cooked sample of `\Processor(_Total)\% Processor Time` spikes past 30% on background tasks constantly. You fixed the GPU detector's sampling pathology and shipped the identical pathology in the CPU detector.

**B3 — Sentinel collision: `$act.gpu_min_draw -lt 0`.**
If `Test-GamingActivity` ever returns `$null` for `gpu_min_draw` (property missing vs. explicitly negative), PowerShell coerces `$null → 0`, and `$null -lt 0` is `$true` — so a *missing* field silently classifies as probe-fail. That happens to be the safe direction today, but it's accidental, not designed. Use an explicit `$null -eq` check.

**B4 — `HungJobHours` duplication drift.**
§3 defines `$HungJobHours = 6`; §4's `Test-SwanWorkActive` hardcodes `((Get-Date) - $_.LastWriteTime).TotalHours -lt 6`. Change one, forget the other, and the watchdog's zombie ceiling and the policy's "work in flight" definition diverge — a 6.5-hour-old running-job marker stops protecting via policy but still blocks via watchdog, or vice versa. Same for paths: §3 uses `$QueueIn`/`$QueueRun`; §4 hardcodes `'C:\swan\queue\incoming'` / `'...\running'`.

**B5 — `INTENT_FRESH` 120-second window.**
An intent file written at T whose job lands in `incoming` at T+130 s falls out of both `INTENT_FRESH` and `JOB_QUEUED` for one cycle. If that cycle is the third idle cycle, the settle gate passes and the box suspends between intent and job start. Narrow, but it's exactly the "sleep before using it" failure the owner forbade.

**B6 — Stale `SUSPENDING` marker on abort.**
The settle gate writes a marker, waits 10 s, re-evaluates, "aborts on any hit." Nothing in the doc clears the marker on the abort path, nor on a suspend that the kernel rejects (user input arriving mid-transition can abort an S3 entry). Next cycle inherits stale state; anything downstream reading `SUSPENDING` (your heartbeat/status tooling) now lies.

**B7 — `SetSuspendState 0,1,0` — the middle argument is wrong.**
Signature: `PowerState, Force, DisableWake`. `Force = $true` bypasses application veto. A kid sitting down at the box without the gaming flag, or any app holding an execution veto, gets hard-frozen mid-write. Use `Force = 0` and let vetoes work — the watchdog retries next cycle anyway. `DisableWake = 0` is correct for WoL.

**B8 — Q6 trace (00:55 → 03:00 job), answered directly:**
- 00:55: work active → `os_timeout=0`, watchdog blocked (`JOB_RUNNING`/`GPU_COMPUTE`). Correct.
- 01:00 boundary crosses *mid-job*: `Test-SwanWorkActive` is evaluated before the night branch in `Get-SwanPolicy`, so work protection wins. Correct.
- 03:00 job ends: next cycle → not gaming, work inactive, night → 5-min OS timer + 1 cycle → sleeps ~03:05–03:10. Correct outcome.
The trace passes. The *untraced* case is what fails — see C3.

---

## (c) Security attacks

Homelab context lowers severity, but:

**C1 — `Get-SmbOpenFile` scope.** Requires elevation (fine, task is SYSTEM) but the filter `-like 'C:\swan*'` means an SMB client streaming a large file from any *other* path (media share, NAS staging) does not block. Conversely, a stale leaked handle under `C:\swan` blocks forever. Both directions wrong; decide which you mean.

**C2 — `SSH_ACTIVE` on port 22.** If OpenSSH Server isn't installed on this box, this blocker is dead code giving false confidence. And your actual remote-admin vector on Windows is more likely RDP — which has **no corresponding blocker**. An admin RDP'd in at 1 AM gets the box suspended under them unless `user_present` catches RDP sessions — unstated, unverified.

**C3 — The OS timer ignores all twelve blockers (this is the big one).**
The policy table conflates watchdog authority with OS authority. `powercfg`'s idle timer is **input-only and knows nothing about your blockers**. Concretely: 1:30 AM, a PC-game download / Windows Update / NAS backup is running. No swan queue job, no compute apps → `night + idle` → OS timeout 5 min → **the OS suspends mid-download**, and no blocker prevents it because blockers only gate the watchdog. Your §4 gap statement ("Windows' idle timer does not know a GPU job is running") is fixed only for work *you recognize*. This is also the answer to Q2's "name a concrete scenario."

**C4 — Reconciler-death with timer zeroed (Q1, direct answer).**
`powercfg` changes persist across reboots. If the reconciler writes `os_timeout=0` and then the task breaks (corrupt state file, profile issue, task XML edit), the machine is **permanently never-sleep** with no self-healing path short of a human noticing. That is fail-toward-*awake*, violating your own §1 invariant. Fix: never write 0; write a *bounded* ceiling equal to the job budget (`$HungJobHours` + margin, i.e., ~360 min). A dead reconciler then degrades to "sleeps eventually," which is the correct failure direction. `SetThreadExecutionState`: your rejection is **correct for a task that exits** — `ES_CONTINUOUS | ES_SYSTEM_REQUIRED` dies with the thread. The pattern that works is a resident helper process spawned by the task that holds the flag and exits on work completion — but the bounded-`powercfg` fix is simpler and strictly better here.

**C5 — Three-writer flag (Q10, direct answer).**
Atomic rename gives you *file-level* serialization, not *logical* serialization. Human runs `gaming-mode-off.ps1` (reads flag, writes cleared version) while the reconciler is mid-renewal (read old → extend `expires_at` → rename). Rename order decides: renewal lands last → **flag resurrects after the human turned it off**. Safe *only if* all three writers take the mutex in `swan-common.ps1` — the doc claims the reconciler is field-restricted but never states the human scripts acquire the lock. Verify or route the human OFF path through the reconciler too.

---

## (d) Data-truth / schema-drift (Rule 58 analogues)

- **D1:** `$HungJobHours` (§3) vs literal `6` (§4) — constant drift, guaranteed future bug.
- **D2:** `$QueueIn`/`$QueueRun` (§3) vs hardcoded `'C:\swan\queue\...'` (§4) — path drift.
- **D3:** `GAMING_MODE.flag` schema (`expires_at`, `renewals`, `grace_started`) is asserted nowhere in this packet — no documented types, timezone convention, or monotonicity rule. The reconciler's "restricted to these fields" claim is unverifiable without the schema in the contract.
- **D4:** Policy table's "~5 min / ~15 min" assumes the 5-minute task cadence as an invariant but nothing enforces cadence and watchdog; if someone changes the trigger interval, the table silently lies.
- **D5:** The zombie ceiling bounds only `JOB_RUNNING`. `GPU_BUSY`, `CPU_BUSY`, `DISK_BUSY`, `SMB_OPEN` have **no time bound at all**. §4's claim "the Tier-3 zombie ceiling prevents [a] stuck-awake heater" is false as written — a flapping `DISK_BUSY` (see B1) is an unbounded stay-awake with no ceiling. This is speculative-success language with no verified path.

---

## (e) House-rule violations & speculative language

- Web-stack rules (styled-components/Victory/palette/touch targets) — N/A, no frontend in packet. Terminology rules ("stretching" not "yoga", credentials phrasing) — no violations found.
- **"Correct — an admin was connected"** (§3): inference presented as fact; `DISK_BUSY` in the same event is unexplained and, per B1, likely noise.
- **"The Tier-3 zombie ceiling prevents that from becoming a stuck-awake heater"** (§4): refuted by D5.
- **"Watchdog becomes the only suspend authority during work"**: undermined by C3 — during *unrecognized* work the OS timer remains an unblockable suspend authority.
- **Renewable lease vs. stated requirement**: owner said *"an hour a day max"*; the implemented lease renews indefinitely while anyone plays. There is no daily cap anywhere in the packet. Either this is an approved requirement change (document it) or the kids have discovered infinity.

---

## (f) SINGLE highest-risk item & de-risk

**F1 (the item): `DISK_BUSY` + unbounded non-JOB blockers = the box never sleeps, starting night one after arming.** This is also my answer to Q7 ("what breaks first"): the very first armed night, background disk/CPU noise holds a blocker, the watchdog never reaches 3 cycles, and the owner — whose explicit requirement was *"I don't want the computer on when I'm asleep"* — wakes to a glowing heater. It fails the primary requirement immediately and destroys trust in the whole system.

**De-risk before arming:**
1. Replace `DISK_BUSY` with a sustained signal: e.g., avg `% Idle Time` over ≥3 samples at 2 s intervals, threshold tightened (block only if avg idle < 50%), or drop it in favor of disk *queue depth*. Apply the same multi-sample treatment to `CPU_BUSY`.
2. Add a time-bound to *every* blocker (any blocker older than N hours stops counting), making the fail-toward-sleep invariant structural rather than hoped-for.
3. Change `os_timeout=0` → bounded ceiling (~360 min) per C4.
4. `SetSuspendState 0,1,0` → `0,0,0`; add marker cleanup on all abort paths (B6/B7).

**Arming checklist (Q5) — refuse to arm without ALL of:**
- 7 consecutive observe-nights with zero `watchdog_would_sleep` events that contradict ground truth (cross-check against Event 42/1 history and known usage);
- one *deliberate* armed cycle performed in daylight with the owner present, followed by a verified WoL round-trip;
- injected-failure drills: delete `watchdog-state.json` mid-soak; simulate probe failure (break `nvidia-smi` path) and confirm behavior is deliberate, not accidental;
- confirmed mutex adoption by all three flag writers (C5);
- `SUSPENDING` marker lifecycle proven on both the success and abort paths;
- RDP/session coverage of `SESSION_ACTIVE` verified, and `SSH_ACTIVE` either proven live or deleted.

**Remaining direct answers, briefly:** Q3 missing blockers — RDP session, pending wake timers (`powercfg /waketimers`), Windows Update/DownloadFile transfer activity; redundant — `GPU_COMPUTE` largely subsumed by a sound `GPU_BUSY` if the power detector is fixed. Q8 — yes, the ≥50 W minimum-draw detector has a real false-negative class: frame-capped indies, emulators, menu screens, and turn-based titles can sit at 15–40 W on a 4080 Super; MIN-across-5-samples makes it worse (one dip kills the window). Use median or k-of-N above threshold, and lower the floor to ~15 W given the measured 4.5–6 W idle baseline. Q9 missing entirely — no notification/alerting path (every failure mode above is silent), no watchdog self-watch (heartbeat coverage of the watchdog task's `lastResult` is unstated), no unit tests for `Test-SwanNight` boundary hours, and no defense against local clock manipulation — which, given the lease governs kids' screen time, is not a hypothetical threat model.
