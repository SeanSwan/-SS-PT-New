# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-homelab-heat-2026-08-25/PACKET-2-WATCHDOG.md
**Tokens:** 2546 in / 22544 out (reasoning: 17908) | total 25090
**Wall:** 482.4s

---

# Suspend Watchdog — design + adversarial pass on tonight's ship

## Design summary (the whole thing in six invariants)

1. **Box B owns its own sleep.** The watchdog runs *on B*, decides locally, suspends locally. Nothing sleeps B remotely except one documented last resort.
2. **Box A owns waking.** Only A (later the Pi) ever sends magic packets. One waker, ever.
3. **Claims never block sleep; only measurements do.** Flags, locks, and heartbeats can *extend* tolerance but a claim with no measured activity for the full window loses.
4. **Suspend is non-destructive by policy.** S3 preserves RAM; the watchdog never kills a process. A false-positive sleep costs wall-clock, never data.
5. **Declared state is reconciled to reality every 5 minutes.** Power cap, NIC wake settings, sleep timeouts — all re-derived from `GAMING_MODE.flag` each cycle.
6. **Every awake minute has a logged reason code.** "Why was it awake at 03:00" must be a one-line lookup a month from now.

---

## 1. Where the watchdog runs

**Local on B (decider + executor), A as waker + deadman auditor. Split.**

Failure mode of remote-only (A issues the suspend): the switch reboots at 01:00, A takes a Windows Update patch reboot, or sshd on B hiccups → poller can't reach B → B never gets the suspend command → 100 W into a sealed room until morning. That is the *exact* catastrophe this project exists to prevent, and you'd have made it a function of network uptime. Also every suspend decision now rides on credentials, the SMB path, and sshd — three new failure surfaces. And the design dies with the A→Pi migration unless rewritten.

Failure mode of local-only: watchdog process dies → nothing suspends → same heater outcome, but with no external witness.

So: local watchdog suspends; A's deadman checks every 10 min — *B reachable (TCP 22) AND heartbeat file stale > 30 min* → alert + SSH in and force-suspend. Heat safety then fails toward sleep even when B's own watchdog is dead, without depending on the LAN for the common case.

## 2. Stay-awake conditions — concrete measurements

| Condition | Command / API | Stay awake if |
|---|---|---|
| GPU busy | `nvidia-smi --query-gpu=utilization.gpu,power.draw,utilization.encoder,utilization.decoder --format=csv,noheader,nounits` | util > 10% **or** power.draw > ~60 W in any sample |
| GPU held | `nvidia-smi --query-compute-apps=pid,process_name --format=csv,noheader` | non-empty (bounded by hang ceiling, Q3) |
| CPU busy | `(Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples[0].CookedValue` | > 30% sustained |
| Disk busy | `\PhysicalDisk(_Total)\% Idle Time` | < 90% sustained |
| Interactive session | `quser` — state **and** IDLE TIME column | any session `Active` with idle < 20 min |
| Job present | `Get-ChildItem C:\swan\queue\incoming -File` (dir skeleton now, worker later) | any file |
| Dispatch intent | `INTENT-*` in incoming, mtime < 120 s | exists |
| Transfer in flight | `Get-SmbOpenFile \| Where-Object Path -like 'C:\swan\*'` (server side, needs admin — SYSTEM task has it); secondary: aggregate NIC throughput | open handle in job paths, or RX+TX > ~200 KB/s sustained |
| Gaming mode | `Test-Path C:\swan\GAMING_MODE.flag` | unconditional, no timeout |

Notes on the traps in this table:

- **Do not honor `powercfg /requests` as blocking.** Chrome with one audio tab holds a `SYSTEM: PROCESS` request forever; some updaters leak them. Read it, log it as context, ignore it unless corroborated by a measured condition. This is the same bug class as `WakeOnPattern` — a "helpful" mechanism that silently keeps the box at 100 W.
- **NIC throughput needs a floor.** SSDP/broadcast chatter is real; a 0-threshold RX condition = never sleeps. 200 KB/s sustained is safely above noise, below any real transfer.
- **`quser` IDLE TIME is the whole answer for sessions** — no `GetLastInputInfo` P/Invoke, which lies when called from session 0. Idle time is keyboard/mouse only; a kid on a controller shows idle — but the GPU-util condition covers controller gaming, which is exactly why the session condition can be conservative.
- A locked console still shows `Active`; its idle clock still ticks. Correct behavior.

**Decision:** all conditions clear for 15 min (3 × 5-min samples) → settle gate (Q4) → `rundll32.exe powrprof.dll,SetSuspendState 0,1,0` — S3 specifically because `powercfg /hibernate off` is already done (that command hibernates if hibernation is enabled; your config makes it safe).

## 3. The crashed-job trap

Three tiers:

- **Tier 1 — measured activity only.** A real multi-hour MoE run *always* shows one of: GPU util, CPU (tokenization/dataloading/MoE expert routing setup), disk (model load), or network. Fifteen minutes of all-zero is not a quiet job; it's a dead one. Trust the meters, not the claims.
- **Tier 2 — progress, not liveness.** When the worker ships, it writes `queue\running\<job>.progress` containing a **monotonic counter** (tokens, batches, files). The watchdog requires the *value to change* over the window. A hung process has a frozen heartbeat; existence proves nothing.
- **Tier 3 — the 100%-util zombie.** A deadlocked CUDA kernel spins the GPU at 99% utilization forever; utilization is not progress. Ceiling rule: GPU ≥ 95% continuously with no progress-file delta for N hours (I'd set 6) → declare hung → **suspend anyway**. This is safe *because* S3 freezes rather than kills: the process resumes on wake, hung as ever, and the owner investigates with zero data loss. Same for compute-apps-present + everything-else-idle for > 30 min.

The general principle: because sleep is non-destructive here, the watchdog is allowed to be *aggressive*. Never kill, always freeze.

## 4. Idempotency and the dispatch race

The lost-job race (B polls empty → A writes at N−ε → B suspends → orphan) is closed at both ends:

**Dispatcher protocol (A):**
1. Write `INTENT-<jobid>` into `\\B\swan$\queue\incoming\` (timestamped). **Always, even if B looks awake.** This is one rule in one place.
2. If TCP 22 closed → WoL loop: send, wait 20 s, re-check, ×5, else alert. WoL is idempotent; never send-once-and-hope.
3. Write the job as `<jobid>.part`, then rename into place — atomic appearance, B never sees a partial file.
4. **Post-write verification:** 60 s later, confirm B still awake; if not, WoL. This backstop means even a protocol violation can't strand a job on a sleeping box with a controller that thinks it's running. "Orphaned forever" requires A to both skip INTENT *and* skip verification.

**Watchdog settle gate (B):** on decision to suspend → create `SUSPENDING` marker → wait 10 s → **re-read every condition** (flag, queue, INTENT, SMB, sessions) → any hit = abort, clear marker, reset timer. A's write landing inside the settle window aborts the suspend. The residual sub-second window requires A to violate step 1 *and* step 4. (If you want it airtight: attempt `Rename-Item incoming incoming.gate` — the rename fails if any SMB handle is open, which *is* the activity signal — but I'd ship the protocol + gate first; the rename trick has its own crash-leaves-dir-renamed failure mode.)

**Concurrency:** single instance via named mutex (`New-Object System.Threading.Mutex($false,'Global\SwanWatchdog')` + `WaitOne(0)`), and the gaming-mode scripts take the *same* mutex — that also fixes §3-#6. A resume-trigger task (event: `Microsoft-Windows-Power-Troubleshooter`, ID 1) clears the marker and rescans the queue.

## 5. Implementation form

**Scheduled Task, SYSTEM, every 5 min, plus AtStartup and resume-event triggers.** Not a service, not a loop.

```powershell
Register-ScheduledTask -TaskName 'SwanWatchdog' -User 'SYSTEM' -RunLevel Highest `
  -Action (New-ScheduledTaskAction powershell.exe '-NoProfile -ExecutionPolicy Bypass -File C:\swan\watchdog\watchdog.ps1') `
  -Trigger @((New-ScheduledTaskTrigger -AtStartup),
             (New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Min 5) -RepetitionDuration ([TimeSpan]::MaxValue)))`
  -Settings (New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable `
             -RestartCount 3 -RestartInterval (New-TimeSpan -Min 5) -ExecutionTimeLimit (New-TimeSpan -Min 15))
```

Why: runs before/without login; Task Scheduler gives free restart-on-failure and run-when-missed (a service needs `sc failure` config or NSSM); each run is a fresh process so a crash can't leak state across days — cross-run state (consecutive idle count) lives in a JSON file; 5-min granularity is fine when the failure mode being prevented is "all night."

Explicit settings that will burn you if defaulted: **do not set `-WakeToRun`** (a watchdog that wakes the box is the anti-thesis), and enable Task Scheduler operational history (`wevtutil sl Microsoft-Windows-TaskScheduler/Operational /e:true`) or you'll have no forensic trail. Do **not** use Task Scheduler's "run when idle" trigger — its idle detection is input-only and flaky.

## 6. Fail-safe direction

Split the question, because "the watchdog dies" has two distinct meanings:

- **Sample-level failure** (nvidia-smi exits nonzero, WMI query throws): treat the sample as *not idle* and alert. Reason: a systematically broken probe that under-reports utilization would sleep through real work every night — "bias toward sleep" must not become "random DoS when a path breaks."
- **Process-level death:** a dead process can't sleep anything, so B stays awake — the wrong steady state. Compensated by three independent layers: task restart-on-failure → A's deadman (heartbeat stale + B reachable → force-suspend + alert) → the OS's own `standby-timeout-ac` as a crude final path for the no-session case.

Which failure is *correct* to tolerate: **lose the job, not the room.** Heat failure is continuous, physical, and the stated binding constraint; job failure is bounded and recoverable — S3 preserves RAM, A re-wakes in 60 s, batch work re-runs. Never let correctness of the heat plan depend on any single process being alive; the design above doesn't.

## 7. Instrumentation

The event log is the source of truth — sleep is not a guess, it's two timestamps:

```powershell
# Event 42 (Kernel-Power) = entered sleep; Event 1 (Power-Troubleshooter) = resumed.
# duration = resume.TimeCreated - enter.TimeCreated; sum for the month = hours actually asleep.
Get-WinEvent -FilterHashtable @{LogName='System';ProviderName='Microsoft-Windows-Kernel-Power';Id=42}
Get-WinEvent -FilterHashtable @{LogName='System';ProviderName='Microsoft-Windows-Power-Troubleshooter';Id=1}
```

Ship a `sleep-report.ps1` that pairs these for the last 30 days: total sleep hours, session count, longest continuous awake stretch, wake source per resume. Note `powercfg /sleepstudy` is Modern-Standby-only — dead on this S3 box; the event walker is the tool. The resume event also carries the wake source, which doubles as your rogue-wake audit.

Plus:
- **Every evaluation logs all condition values + decision + reason code** (`SLEPT_ALL_CLEAR`, `ABORT_INTENT_SEEN`, `AWAKE_SESSION_ACTIVE`, `AWAKE_FLAG_SET`, `PROBE_FAILED`). Both directions — blocking reasons and sleep reasons.
- **Heartbeat file** `C:\swan\watchdog\heartbeat` (mtime) — the deadman's input.
- **Wake-cause audit:** on every resume, log `powercfg /lastwake`; periodically dump `powercfg /waketimers`.
- **One-time plug-meter calibration:** measure asleep (~3–6 W expected) and awake-idle, write the two numbers on the inside of the case, then never need the meter again — event log gives hours, calibration gives watts.
- Rotate logs in `C:\swan\logs` and mirror summaries to A — a sleeping/offline B must not hide its own history.

## 8. §3 limitations, ranked by real risk

| Rank | Item | Verdict |
|---|---|---|
| 1 | **#2 nothing reads the flag** | Not a limitation, a *prerequisite*: ship a watchdog that ignores the flag and it will sleep the box mid-game the first night. Fixed by this slice. |
| 2 | **#5 unrequested 20-min sleep** | Live **tonight**, unrequested. It's also literally the thesis working — keep it, but tell the owner today, and know the hazard until the watchdog ships: a 40-min unattended download/Steam update gets frozen mid-flight. |
| 3 | **#3 non-persistent power cap** | **Real, not cosmetic.** Windows Update reboots at 03:00 while the flag is up (gaming mode disables auto-sleep, so the box is awake for maintenance) → kid games the next day at 320 W in a sealed room with the owner believing 260. That's the exact fire gaming mode exists to put out. But the fix is not persistence — `nvidia-smi -pl` has no persistent mode on Windows and NVIDIA Control Panel doesn't expose power limit. The fix is the **reconcile loop**: the watchdog re-derives the cap from the flag every 5 min and at boot. Three lines, free. |
| 4 | **#1 UAC path untested** | Untested interactive paths fail at the worst moment — i.e., in front of the kid. Either spend 10 minutes testing in person, or sidestep: register ON/OFF as SYSTEM tasks and have the `.cmd` call `schtasks /run /tn GamingModeOn` — no UAC at all. Trade-off (any local user can flip mode) is fine in this household. |
| 5 | **#6 script races** | Low frequency, bounded damage *today* (operations are near-idempotent). Becomes real the day the watchdog coexists with them. Fix with the shared mutex from Q4 as part of this slice. |
| 6 | **#4 unconditional ollama start** | Design smell — "restores an assumed state." Fix is free when you touch the scripts anyway: ON records prior service state *inside* the flag, OFF restores it. |

Root cause of #3/#4/#5 is one thing: **scripts assert absolute end-state with no memory and no reconciliation.** Flag-as-truth + reconciler kills all three at once.

## 9. What's missing entirely

1. **Power loss during S3 = box OFF, not asleep.** WoL from S5 is a different BIOS setting and often off; plus "restore on AC power loss" should be *Power On / Last State*. One blink on a stormy night otherwise orphans the fleet until a human presses a button. Test: full shutdown, magic packet, wake?
2. **Windows Update as a rogue waker.** Audit `powercfg /waketimers`; disable wake timers on AC (`powercfg /setacvalueindex scheme_current sub_sleep RTCWAKE 0` + `setactive`). Revisit when you want scheduled nightly jobs.
3. **Driver updates reset NIC power management** — your `WakeOnPattern` fix can silently regress on the next Realtek/NVIDIA driver update, and the box never stays asleep again. The reconcile loop re-asserts `Set-NetAdapterPowerManagement -WakeOnPattern Disabled -WakeOnMagicPacket Enabled` every run.
4. **The contract has no off-box reader.** A's deadman needs the flag + heartbeat; today they're local-only. Share `C:\swan` as read-only `swan$` with a low-priv controller account. Otherwise the flag is a contract with one party.
5. **No alerting channel.** A deadman that alerts into the void is decoration. Pick one (Telegram bot / SMTP from A) and wire it in week one.
6. **Addressing.** The whole control plane assumes B at `.92` — make it a DHCP reservation or static, and verify sshd Startup=Automatic (it's now load-bearing control-plane infrastructure, pin its host key on A).
7. **Owner-facing `swan-status.cmd`:** prints flag state, actual power cap, last wake cause, last sleep duration, and *currently blocking sleep condition*. Trust in an autonomous sleeper = the owner can see why, without you.
8. **Pi portability:** write A's deadman in Python/POSIX, no PowerShell-isms. And keep the Pi storage fix on the critical path — A always-on is itself the room's biggest single load; the watchdog manages B's heat, but the real watt prize is A's retirement.

## 10. Errors in §2

- **`$ErrorActionPreference = 'SilentlyContinue'` in an ops script whose entire job is state mutation** — the one thing you must not swallow. Combined with zero `$LASTEXITCODE` checks, `power cap -> 260W` gets *logged even when nvidia-smi fails*. Your logs record intent, not outcome. Fix: check exit codes, then read back `--query-gpu=power.limit` and log `VERIFIED 260W`. Your own evidence table demanded read-back proof; the script should too.
- **ON logs `STILL ON GPU: <python pid>` and proceeds to declare gaming mode anyway.** A training job holding the GPU at 300 W under the kid's session is precisely the scenario the mode exists to prevent. At minimum `msg *` the console session; better, refuse until cleared or make ON's precondition explicit with the owner.
- **`Set-Content` on the flag is not atomic** — a reader mid-write sees a partial file. One line today, but write temp + rename (atomic on NTFS) now, and make the flag structured v1 while you're in there: `set_at`, `set_by`, `ollama_was_running`, `sleep_timeout_was` — which fixes #4 and gives the reconciler its inputs.
- **Flag-as-contract verdict: right pattern, wrong enforcement — currently it's shared-mutable-state theater.** A sentinel file is the correct *mechanism* at this scale: cross-language, cross-host via SMB, survives reboot, human-inspectable. It becomes a trap under exactly one condition — if derived state (power cap, sleep timeout, NIC settings) diverges from the flag with no reconciler, which is the *current shipped state* (reboot in gaming mode = flag says GAMING, GPU says 320 W). Rules that make it sound: **single writer** (humans and ON/OFF only, never auto-cleared), **atomic replace**, **everything derived from it is re-derived continuously**. Hold those three and it's a contract; drop the third and it's a mutable global with a nice name.
- Minor: the `255.255.255.255:9` WoL target is frequently dropped by APs — harmless redundancy; the directed broadcast `.50.255:9` is your reliable path, keep it primary. `powercfg /lastwake` shows only the *most recent* cause, but since pattern-match was already disabled when you ran it, the attribution stands. And the WakeOnPattern discovery deserves the generalization it implies: **the monitor must never perturb the system it monitors** — your TCP probe was that bug; `powercfg /requests` honoring and 0-threshold NIC counters are its software descendants. The watchdog above is built to that rule.

**Ship order:** mutex + structured flag + status cmd (an hour) → watchdog task with conditions, settle gate, reconcile, logging (an evening) → A's waker/deadman + alerting (an evening) → then the queue, inheriting the INTENT protocol and heartbeat contract it must honor.
