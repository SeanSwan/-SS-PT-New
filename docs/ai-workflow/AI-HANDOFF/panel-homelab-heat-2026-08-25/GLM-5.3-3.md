# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-homelab-heat-2026-08-25/PACKET-3-WATCHDOG-POLICY.md
**Tokens:** 3213 in / 27457 out (reasoning: 23823) | total 30670
**Wall:** 586.8s

---

## Q1 — `os_timeout=0`: right mechanism, wrong constant

**SetThreadExecutionState rejection: confirmed.** `ES_CONTINUOUS` is thread-scoped and cleared when the calling thread/process exits — a 5-minute task holds the assertion for ~0 useful seconds. The standard workaround is a detached resident holder process (spawn `powershell` holding the state, PID file, reap at job end). That works — it's how browsers do it — but it's an unsupervised immortal process, the exact object class this codebase exists to eliminate. Reject it too. `PowerCreateRequest` has the same lifetime story.

The mechanism itself — timer-as-reconciled-value — is idiomatic for this architecture (you already re-assert caps and NIC wake settings every cycle). The bug is the value. `powercfg /change` is a **persistent write to the active plan**. Reconciler dies with timer=0 → the plan says never-sleep → survives reboot → fail-awake forever, inverting your own fail-toward-sleep doctrine, in the room where heat is the binding constraint. And if watchdog and reconciler share a task process, they die together, so nothing recovers it.

**Fixes:**
1. Never write `0`. Write a finite ceiling (360–390 min, just above the 6 h zombie ceiling so the OS backstop fires slightly *after* the gated watchdog would). Healthy behavior identical; dead reconciler self-heals within ~6 h.
2. You're only setting `standby-timeout-ac`. The **hidden `UNATTENDSLEEP` timeout** (~60–120 s default) governs after *unattended* wakes — i.e., every WoL wake in the Pi era, and every Windows Update wake timer. It will re-sleep the box before your first post-wake reconcile can even see the INTENT file. `powercfg /setacvalueindex SCHEME_CURRENT SUB_SLEEP UNATTENDSLEEP <ceiling>` + `/setactive`. This is the sleeper bug in all of §4.

Note: the watchdog's explicit `SetSuspendState` bypasses every execution-state assertion anyway. Blockers, not the timer, are the real mid-job guard — the timer only closes the *idle* path. Correct division of labor; keep it.

## Q2 — Night mode bites

1. **Falling-asleep audio.** Browser/Spotify at 01:10: GPU 20–40 W (under your threshold), CPU <30%, no input 5 min. The audio engine holds a SYSTEM power request, so Windows' own timer would *not* sleep this box — but the watchdog deliberately doesn't honor requests and cannot see audio. 1 idle cycle → music dies in ~5 min. Fix: AUDIO blocker — P/Invoke `IAudioMeterInformation` (~30 lines), or narrowly parse `powercfg /requests` for a SYSTEM request held by `audiodg` (one known-good holder is measurement, not claims).
2. **His own late session, unflagged.** Paused game / cutscene / reading at 01:20, GPU dips, box sleeps. `NightIdleCycles` 1→2. Ten extra minutes of idle heat is nothing; one wrong sleep costs owner trust in the whole system.
3. **Overnight downloads.** Steam/game updates default to starting after midnight: GPU idle, CPU light, NVMe active often <10%. Sleep 5 min in; the kid's 8 AM slot inherits a half-downloaded 80 GB patch. Accept + document, but the morning experience is the cost.

Also: at 01:00 sharp the policy writes 5 min against an input-idle clock already hours old → near-instant sleep on the boundary (see Q4.3 — this is sometimes a bug, here it's intended; say so in the code).

## Q3 — The blockers

- **`DISK_BUSY` <90% idle, single 1-s sample: wrong as built.** Defender, Search, browser-cache bursts trip it constantly → counter resets → watchdog effectively never reaches 3 clear cycles while a browser is open. It's redundant during work (JOB_* covers) and masked at night (the OS timer doesn't consult your blockers — two authorities disagreeing, see Q4.2). Fix: require 2 consecutive cycles, or threshold ≥25% busy, or drop it — disk-only activity with no CPU/GPU/session signature is the class the OS timer already handles.
- **`SSH_ACTIVE`: right instinct, wrong shape.** The moment the Pi arrives with an autossh tunnel or keepalive, port 22 Established = permanent false-block = silent never-sleeps. Fix: block only on interactive sessions — enumerate `sshd.exe` child processes; a shell child = interactive, `-N` tunnel spawns none. Or exclude the controller's IP.
- **`SMB_OPEN C:\swan*`**: same trap — a Pi holding a directory watch on `queue\incoming` is a permanent blocker. Exclude by client name or count file handles only.
- **§3 `JOB_QUEUED` is missing the `-notlike 'INTENT-*'` filter §4 has.** A stale INTENT file trips it forever (and double-counts as INTENT_FRESH). And nothing has an age bound — see Q7.
- **`INTENT_FRESH` 120 s < 300 s cadence.** An INTENT written just after a cycle is stale before the next one looks. Guaranteed intermittent miss. Fix: ≥660 s or renewed by the writer.
- **`CPU_BUSY` >30%**: misses single-threaded work entirely (~6% of 16 threads on the 7800X3D). Fine if you know it only catches multithreaded load — say so.
- **`JOB_RUNNING`** keyed on file mtime silently requires a runner contract ("touch the file"). Document it or key on the heartbeat you already run.
- **Missing:** RDP (admin reading logs over RDP at 01:30 with no keystrokes — same class you added SSH for; parse `qwinsta` for `rdp-tcp#*` Active), audio (Q2), and post-resume grace (Q4.4 — this one is mandatory).

## Q4 — Settle gate: four surviving races

1. **Check-then-suspend TOCTOU** — job lands 0.5 s after final re-eval. Unfixable by re-checking; acceptable *only* because your doctrine is suspend-freezes-not-kills. State that explicitly and make the runner idempotent on resume.
2. **The OS timer is a second, ungated suspend authority firing *during* your 10 s wait.** At night both are ~5 min; the OS path has no INTENT check and no settle gate. Fix: on entering settle, raise standby-timeout to ~15 min; next cycle's policy heals it. Quiesce the other authority before deciding.
3. **Shrink-on-transition instant sleep.** `powercfg` writes take effect against current input-idle *age*. Job ends 03:00, last input 22:00, policy writes 5 → OS can sleep within ~a minute, ungated, possibly before the next reconcile sees a just-arrived job. Fix: read `GetLastInputInfo` before writing; if idle_age > new timeout, **skip the write** and let the gated watchdog own the transition.
4. **Wake-then-re-sleep.** S3 resume does not reset input idle, and nothing in `watchdog-state.json` resets `idle_cycles`. Owner presses power at 07:50 (still night), doesn't touch the mouse for 6 minutes → the box sleeps again under him. Fix: each cycle, if a resume event (Power-Troubleshooter Event 1) is newer than state mtime → zero counters + 10-min post-resume grace.

Also: confirm the mutex spans probe→settle→suspend (not just the state write); log the sleep event **before** calling `SetSuspendState` (the call may never return); verify the thermal sentinel suspends directly and is **not** routed through the gate — a 92 °C GPU with JOB_RUNNING present must not be aborted by the settle re-check.

## Q5 — Arming checklist

Refuse to arm without:

1. **A rehearsed remote disarm** — from another box: delete `watchdog-armed`, force `powercfg` restore (standby + UNATTENDSLEEP), confirm via `swan-status`, under 30 s. This is the safety; it gets tested once, by hand, before arming.
2. **One full daytime rehearsal with a human present:** forced idle → armed would_sleep → real `SetSuspendState` → WoL wake → reconcile re-asserts caps/NIC within one cycle → idle counter reset verified (Q4.4). Until that arc exists in the log, "armed" is a theory.
3. Q4.2, Q4.3, Q4.4 fixes in code — these are the "it sleeps the second I wake it" bugs, and they're what make an owner rip the whole system out.
4. INTENT window ≥ 2× cadence; queue GC (Q7); thermal-bypass verified.
5. **Reconciler/watchdog failure independence** — separate tasks or the finite os_timeout ceiling, so one dead process can't leave timer=0 forever.
6. At least one observed `would_sleep` per branch (night-idle, day-idle, post-job). An observe soak that never produced a night would_sleep hasn't tested the branch you're arming.
7. Arm mid-morning, day policy, human present for the first cycles. Never at 00:55.

## Q6 — 00:55→03:00 trace

| Time | Policy | OS timer | Watchdog |
|---|---|---|---|
| 00:55 job queued | `work in flight` (queued>0) | 0 | JOB_QUEUED, awake |
| 01:00–03:00 each cycle | work outranks night (correct precedence in `Get-SwanPolicy`) | 0 re-asserted | JOB_RUNNING, awake |
| 03:05 first cycle after end | night branch | 5 | 1 cycle → clear → suspend ~03:10 |

**No mid-job suspend — the actual requirement — holds.** Two defects surface: (a) if the runner doesn't remove/mark the running file, `JOB_RUNNING` blocks until mtime+6 h = 09:00, while the OS timer sleeps the box anyway at ~03:05 — log says `watchdog_awake` while the box is asleep, accounting garbage, and an awake-on-paper/heater-in-fact ambiguity for hours; (b) the 03:05 sleep comes via the ungated shrink-on-transition path from Q4.3, racing the job's own cleanup. Outcome correct, mechanism partly accidental.

## Q7 — What breaks FIRST

**The queue has no garbage collection.** First aborted SMB copy, partial upload, or crashed-runner artifact in `queue\incoming` (non-INTENT) makes `work.active` true forever → `os_timeout=0` written every cycle, watchdog `JOB_QUEUED` forever → **the box silently stops sleeping at all** — the exact requirement this system exists for — discovered days later as "why is this room warm," because every component logs success. SMB into `C:\swan` is already an accepted access path, so this is a *when*, not an *if*. Everything else on this page needs a coincidence; this needs one untidy file. Fix: age ceiling on queued (30 min with no runner heartbeat → log poison, alert, stop blocking) + runner completion contract.

## Q8 — Errors, including in the fixes

- **50 W min-draw is not a sound *kids* detector.** Sound for AAA/uncapped (100 W+ vs 5 W idle). False-negative class: Minecraft vanilla (30–50 W on a 4080S), Roblox, 2D indie, emulators (RPCS3 is CPU-bound, GPU ~20 W), frame-capped/vsync titles, menus. And this detector is the **lease renewal signal** — false negative = `lease_expired` → flag cleared **mid-session while a kid is playing**. The fix for the monitor-perturbs-measurement bug imported an AAA-tuned threshold into a budget-enforcement role. Fix: hybrid renewal — renew if (min-draw ≥ 25–30 W over ≥30 s) OR (input idle < 60 s in an unlocked session). Input is free and unperturbable.
- **§3 `-Samples 3` vs §2 "5 samples"** — drift or regression; 3 samples over ~3 s also catches shader-compile/loading draw dips in real games. Min-of-5 spanning ≥30 s.
- **`JOB_QUEUED` INTENT filter inconsistency** (§3 vs §4) — Q3.
- **Locale-dependent counter paths.** `'\Processor(_Total)\% Processor Time'` throws on non-English Windows → `probeFail` → permanent `PROBE_FAILED` fail-awake. Use `Win32_PerfFormattedData_PerfOS_Processor` or `(Get-CimInstance Win32_Processor).LoadPercentage`; and a probeFail persisting > N cycles should *alert*, not just block.
- **`user_present` is never defined.** Unlock-state → forgotten unlocked session = fail-awake all night; input-recency → movies/music die (Q2). Pick (unlocked AND input-idle < 45 min) and write it down.
- **`nvidia-smi` has no timeout** — a wedged driver call serializes everything behind the mutex. Add a timeout.
- **Two sources of truth for idle cycles** (`$IdleCyclesToSleep=3` vs policy `idle_cycles`) — delete the constant.
- §4 missing UNATTENDSLEEP entirely (Q1).

## Q9 — Missing entirely

1. **The wake half of the lifecycle.** This system only sleeps. No wake path, no morning pre-wake, no Pi-side design beyond a paragraph — and the Pi inherits the SSH/SMB permanent-block traps from Q3.
2. **Alerting.** probeFail persistence, poison queue, lease_expired, thermal trips — all logged, nothing notifies. Every fail-awake mode is a silent heater.
3. **Queue GC + runner contract** (Q7).
4. **The kids' daily budget.** "An hour a day max" became 2.5 h renewable with *unbounded* renewals — a ceiling of nothing. A daily cumulative cap across leases, derived from the event log you already keep, is an afternoon of work and is the original requirement.
5. **Security model.** SYSTEM task executing from `C:\swan`, queue dirs SMB-exposed, kids are local users. Any write to a `.ps1` = SYSTEM. ACL the script dir to SYSTEM/Administrators; grant kids write on exactly the paths the design says.
6. **The policy has no observe mode.** §4's `powercfg` writes go live on deployment regardless of `watchdog-armed`. Gate the timer policy behind the same arming flag, or you've armed half the system with a file copy.

## Q10 — Three writers

The departure is defensible; the implementation as described is not sufficient. **Atomic write fixes torn files, not lost updates.** Human OFF and reconciler-renew are both read-modify-write; interleave them and the reconciler writes its fields back into a file the human just cleared — flag resurrects with a live lease. Field restriction doesn't prevent that; it makes the resurrection partial. Required:

1. The swan-common mutex held across the **entire RMW** by all three writers — not just around the file write.
2. **CAS via a `rev` field**: every writer bumps rev; the reconciler aborts its write if rev moved since its read. Makes the restricted-writer contract enforceable instead of aspirational.
3. The **hybrid renewal signal from Q8** — auto-clear is only as safe as renewal is false-negative-free. Today it isn't, so auto-expiry fires mid-session on the kids' actual games.
4. `lease_expired` must be owner-visible, not just in the JSONL — otherwise the kids will discover it before he does.

And note writer #4 is already scheduled: the Pi. Design the flag protocol for an external writer now (rev + lock file), or this question comes back as Packet 5.

---

**If you fix nothing else before arming:** finite OS-timeout ceiling + UNATTENDSLEEP (Q1), queue GC (Q7), resume counter-reset + timer quiesce (Q4), rehearsed remote disarm (Q5). Those four are the difference between "occasionally wrong" and "owner finds it warm at 3 AM with a dead flag file."
