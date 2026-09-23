# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/panel-homelab-heat-2026-08-25/PACKET-2-WATCHDOG.md
**Seed:** (none)
**Tokens:** 3033 in / 8469 out · **Cost:** ~$0.0000 · **Wall:** 299.5s · **finish:** stop

---

# Hostile Review — Packet 2 (Gaming Mode / Suspend Watchdog)

---

## (a) VERDICT

**REVISE** — the WoL work in §2a is genuinely evidenced and the honest UNTESTED label on the UAC path is correct discipline, but the shipped scripts have a global silent-failure configuration, the flag contract has no schema/TTL/atomicity, and the doc materially understates its own limitation #3 (see below: reboot-in-gaming-mode is worse than stated). Do not build the watchdog on these scripts as-is.

Note for the record: the binding house rules (styled-components, Victory, Dual-Button Glow, 44px targets, terminology bans, credentials phrasing) have **no applicable surface** in this document — there is no frontend, no LLM call, and no credential-bearing text. Zero-PIT-to-LLMs is satisfied (logs carry PIDs/process names only). Panel should not score those rows; scoring them would be theater.

---

## (b) Correctness attacks

**B1. `$ErrorActionPreference = 'SilentlyContinue'` makes both scripts unfalsifiable.** Every failure path — flag write fails, `nvidia-smi` missing, `-pl` rejected by driver, `C:\swan` unwritable — produces a script that ends by logging `"ready"` / `"back to work mode"`. You cannot distinguish success from total failure by exit code or final log line. This directly contradicts the verification culture §2a demonstrates. Minimum fix: scoped try/catch around the three *load-bearing* operations (flag create, power cap, sleep timer), non-zero exit on failure.

**B2. Reboot-in-gaming-mode is worse than the doc claims.** §3.3 says "GPU returns to 320 W with the flag still raised." True, but incomplete: `powercfg /change standby-timeout-ac 0` **is persistent**. So reboot-in-gaming-mode yields: 320 W cap + auto-sleep permanently disabled + a flag nothing reads. That is maximum heat, indefinitely, in the sealed room, with zero telemetry. The doc ranks this as limitation #3 and half-dismisses it; it's actually the worst reachable state in the whole design.

**B3. Stale flag = permanent heater once consumers exist.** The flag has no expiry, no writer identity, no schema — just a timestamp string. Crash or power loss between ON and OFF leaves `GAMING_MODE.flag` on disk forever. The moment the watchdog ships and honors the contract, a stale flag is a permanent stand-down. This is the same class of bug as the crashed-job trap §4 warns about — introduced by §2 itself.

**B4. Double-click race.** Two ON invocations both pass `Test-Path`/`Set-Content` non-atomically; interleaved `Add-Content` lines corrupt the log. Worse: ON→ON→OFF leaves the box restored once, which happens to be fine today, but the same pattern with a future consumer is last-writer-wins chaos. Fix now, it's three lines: create the lock/flag with `[System.IO.File]::Open($flag,'CreateNew',...)` — `CreateNew` fails atomically if the file exists.

**B5. Unverified process name.** `'ollama_llama_server'` — current Ollama builds run the inference server inside `ollama.exe` subprocesses, not a separately-named executable. Under `SilentlyContinue`, a wrong name is a silent no-op: the script logs nothing, kills nothing, and the GPU-clear check (`--query-compute-apps`) then reports "STILL ON GPU" — which the script logs but does not act on. The kill step can fail and the script still declares "ready."

**B6. TOCTOU in the GPU-clear check.** Between `Stop-Process` and `--query-compute-apps`, a queued job can respawn onto the GPU. Point-in-time check presented as a guarantee. Acceptable for tonight; not acceptable as a contract for the watchdog.

**B7. "VERIFIED WORKING" for WoL is overstated.** One successful S3 cycle is not verification. S3 has well-known flaky modes (spurious wakes from armed USB devices, resume hangs). Required before trusting it overnight: `powercfg /devicequery wake_armed` audit + a 3-night soak with the instrumentation from Q7. Label it "verified once."

**B8. OFF's ollama start has no health check.** `Start-Service` succeeding ≠ server listening. Nothing probes the port afterward. Silent partial restoration.

---

## (c) Security attacks

**S1. The flag is an unauthenticated control channel.** Any process that can write `C:\swan\GAMING_MODE.flag` can hold the box awake forever (or, post-watchdog, force sleep during work). No ACL hardening, no writer SID, no content token. On a single-user homelab this is low severity, but say it out loud: the "contract" has no authenticity mechanism. Minimum: restrict the folder ACL to the admin account, and put a writer token in the flag body.

**S2. Anyone on the LAN can defeat the entire heat plan.** Magic packets are unauthenticated by protocol design. Any device — an IoT bulb, a kid's phone — can send a magic packet every 19 minutes and Box B never sustains sleep. This is the DoS vector on the whole thesis and the doc doesn't mention it. Accepted risk probably, but it belongs in the doc with a mitigation note (switch-port ACL or "wake only from Box A's MAC" is not enforceable at WoL layer — mitigation is monitoring wake frequency and alerting).

**S3. Self-elevating CMD launchers on the Desktop.** If any other account or malware can write the Desktop, swapping the `.cmd` yields arbitrary elevated execution on next double-click. Standard homelab-accepted risk; note it, move on.

**S4. UAC-over-SSH correctly identified as impossible** — `Start-Process -Verb RunAs` from a non-interactive session fails with no UI. The doc knows this. But also: UAC decline is swallowed by `SilentlyContinue`, so the launcher will appear to do nothing with no diagnostic. Have the launcher log elevation success/failure explicitly.

No injection surface (fixed arguments, no interpolation into shells), no secrets, no multi-tenancy. Replay/idempotency is a *job-dispatch* concern — see Q4.

---

## (d) Data-truth / schema-drift (Rule 58 analog)

The Rule 58 failure mode here is **state-vs-reality drift across four unowned sources of truth**: the flag file, the live GPU power cap, the persistent `standby-timeout-ac` value, and the ollama service state. Each is mutated independently; nothing reconciles them; nothing observes them. Limitation #3 is one instance; B2 is a second; B3 is a third. The design answer is a single **boot-time and periodic reconciler** (see §f) that reads reality (`nvidia-smi -q`, `powercfg /query`, service status) and either matches it to the flag or repairs it — never trusts the flag alone.

Secondary drift: the log is free text, unparseable, unbounded (`Add-Content` forever — slow disk-fill DoS). Q7's instrumentation requirement cannot be met by grepping this log. Move to JSON-lines or Windows Event Log with fixed event IDs.

---

## (e) House-rule violations & speculative-success language

- No applicable styling/terminology/credential violations (see (a)).
- **Speculative-success language:** "VERIFIED WORKING" on WoL after n=1 cycles (B7). "GPU clear of compute apps" logged as an outcome when it's a point-in-time observation that triggers no action (B6). §4's framing "turns 'can sleep' into 'does sleep'" is aspirational but acceptable in a design brief. The honest `UNTESTED` tag on the UAC path is the best-labeled item in the doc — more of that, less of "verified."

---

## Answers to §4's ten questions (the design)

**Q1 — Where it runs: on Box B, locally, using assert/release — not a remote suspender.**
The correct Windows primitive is not "something decides to suspend B," it's "**nothing holds B awake**." Components that need the box awake call `PowerSetRequest(PowerRequestSystemRequired)` and release it when done; the OS idle timer does the sleeping. The watchdog's job shrinks to: (1) verify no illegitimate blocker via `powercfg /requests`, (2) force-sleep only on policy violation (e.g., idle > N min with all requests released but a stuck driver holding the bus — rare). Failure mode of the wrong choice (Box A/Pi remote poller issuing suspend): it recreates the exact lost-job race the prior panel found, it suspends B mid-disk-write, and if the poller dies, B never sleeps again — a remote single point of failure for the heat thesis. Box A/Pi's role is reduced to what it's provably good at: sending magic packets and monitoring.

**Q2 — Stay-awake conditions, concretely measured:**

| Condition | Measurement |
|---|---|
| GPU busy | `nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader` every 30–60 s; awake if util >5% or mem >500 MB |
| Active job | Job file exists in inbox OR claimed-job's **heartbeat file mtime < 5 min old** (see Q3) |
| Interactive session | `qwinsta` — `rdp-tcp#N` Established or active `console` session with a logged-in user |
| File transfer in flight | `Get-SmbOpenFile` / `Get-SmbSession` (elevated), or any file in watched shares with mtime < 120 s and growing size |
| Gaming mode | `Test-Path` flag **AND flag age < TTL** (expired flag ≠ gaming mode — fixes B3) |

**Q3 — Crashed-job trap: progress heartbeats, never utilization heuristics.** Contract: every batch job must touch a per-job heartbeat (file mtime or one appended line) at least every 5 minutes — a tokens/sec counter, a checkpoint notice, anything. Jobs that genuinely can't (multi-hour silent MoE runs) must register an explicit **lease**: expected duration declared up front, renewable by the job, honored blindly by the watchdog. Liveness is *declared*, never inferred. Backstop: absolute max-awake ceiling (e.g., 8 h) after which the box sleeps regardless — a hung lease then costs one interrupted job, not a burned night.

**Q4 — Dispatch/suspend handshake.** Key realization the doc misses: **S3 preserves RAM and disk.** A job claimed before suspend does not die; it freezes and resumes on wake. The only true loss is an *unclaimed* job file written after B's last inbox scan. Protocol: (1) B claims jobs by **atomic rename** out of the inbox — the rename is the exactly-once boundary; (2) before suspending, B writes a `SUSPENDING` tombstone with ETA, waits a 60 s grace window, re-scans inbox; (3) Box A, after writing a job, sends a magic packet and TCP-probes with retries until B is awake, then confirms the claim-rename; no ack within K tries → alert, retry later. Job filenames carry GUIDs so A-side retries are idempotent. The orphan case is eliminated by making A responsible for delivery confirmation, not B responsible for staying up on a guess.

**Q5 — Form: Scheduled Task, not a bare loop, not (yet) a service.** Task: trigger *At startup*, run whether user logged on or not, highest privileges, "restart on failure, every 1 minute," executing `powershell -ExecutionPolicy Bypass -File C:\swan\watchdog.ps1` which internally loops with 30–60 s sleep. Bare looping script dies with the SSH/RDP session — rejected. A compiled service is more robust (service-recovery semantics) but adds build/deploy friction unjustified at this stage; the Task Scheduler restart settings cover crash-recovery adequately. Add a watchdog-of-the-watchdog: Box A alerts if B's heartbeat file goes stale >15 min while B is TCP-reachable.

**Q6 — Fail-safe direction: fail toward sleep, decisively.** This follows from Q4's insight: with S3, sleeping during work costs latency, not jobs — work resumes on wake. Staying awake costs watts all night in the sealed room, which is the thing the entire project exists to prevent. The prior panel's fear is answered by leases and heartbeats (making work *explicitly visible*), not by a conservative fail-direction that keeps the heater on when visibility fails. Dead watchdog → no assertions held → OS idle timer sleeps the box. Correct.

**Q7 — Instrumentation.** Structured JSON-lines event log (`{ts, event, reason, blockers[]}`) for `sleep_initiated`, `sleep_blocked`, `wake_source`, `lease_granted`, `thermal_exceedance`, plus a daily rollup line with `asleep_minutes_24h`. Correlate with Windows' own records: **Kernel-Power event ID 42** (sleep, with reason) and **Power-Troubleshooter event ID 1** (resume, with wake source) — these work on S3 where SleepStudy does not. When sleep is denied >30 min, snapshot `powercfg /requests` into the log so "why didn't it sleep last Tuesday" is answerable in one grep. Paired with the plug-in meter, owner gets kWh-per-awake-hour directly.

**Q8 — §3 ranked by real risk:**
1. **#6 races** — fix now, three lines (B4). Blocking for the watchdog.
2. **#3 non-persistent cap** — **real, and understated** (see B2). The killer combo is reboot-in-gaming-mode: cap resets to 320 W *while the persistent sleep-disable survives*. Fix is one boot-triggered Scheduled Task: if flag exists, reapply `-pl 260`. Do it before the watchdog.
3. **Stale flag / no TTL** (doc's #2 adjacent) — becomes critical the instant any consumer ships.
4. **#4 unconditional ollama start** — minor; snapshot service status in ON, restore it in OFF. Cheap, do it.
5. **#1 UAC path** — must be tested once interactively before owner relies on it; low technical risk, high UX-blocking risk.
6. **#5 live 20-min sleep change** — informational; make the idle timeout a deliberate config value, not a side effect of a test run.
Cosmetic: none worth deleting, but #4 and #5 are near-cosmetic.

**Q9 — Missing entirely:**
- **Thermal feedback.** The binding constraint is heat and *nothing in the plan measures temperature*. This is the largest hole (see §f).
- Wake-source audit: `powercfg /devicequery wake_armed` — an armed USB device undoes §2a.
- Overnight S3 soak (B7).
- Auto-expiry of gaming mode: owner forgets OFF → 260 W cap + sleep disabled forever. Flag TTL with logged expiry.
- Log rotation/disk bounds.
- Windows Update forced restarts interacting with gaming mode (feeds #3).
- Post-topology check: when the Pi replaces Box A, confirm magic packets still traverse (subnet/AP isolation).

**Q10 — Errors in §2.** Beyond B1–B7: the flag-as-contract abstraction is the **right direction, wrongly implemented** — a single stand-down signal is correct; a schemaless, TTL-less, non-atomically-created, unauthenticated file is a shared-mutable-state trap. Fix: JSON body `{since, pid, expiry, token}`, created via `CreateNew` (atomic), readers treat expired flags as absent. Minor precision nit: `WakeOnPattern` wakes on pattern-matched frames, not literally "any stray LAN traffic" — the observed behavior was real, the mechanism description is loose.

---

## (f) SINGLE highest-risk item and de-risking

**The unreconciled divergence stack with zero thermal observability.** Multiple independent mechanisms each disable sleep or mask state (persistent `standby-timeout-ac 0`, resettable power cap, immortal flag file, scripts that cannot report failure), all operating in a thermally sealed room, with no sensor anywhere in the plan measuring the actual constraint. Any one bug in this stack presents as "the plan is working" while the box heats all night — precisely the failure §4's warning describes, reached without the watchdog even existing.

**De-risk before building the watchdog (~80 lines total, one evening):**
1. **Thermal sentinel** (30 lines): log `nvidia-smi --query-gpu=temperature.gpu` + CPU temp every 60 s to JSON-lines; defined exceedance threshold triggers a logged action (drop cap to 200 W, then force sleep). Now the binding constraint is measured, and every future component inherits the tripwire.
2. **Boot-time reconciler** (30 lines): at startup and every 15 min, read the flag; if present and unexpired, reapply `-pl 260`; if absent, ensure cap = 320 W and restore the deliberate idle timeout. Reality is repaired from one source of truth; B2 and #3 collapse.
3. **Flag v2** (20 lines): JSON body with TTL, atomic `CreateNew`.

Ship these three first. The watchdog then builds on a system that can observe itself and fail toward sleep — instead of on scripts that end with `"ready"` no matter what happened.
