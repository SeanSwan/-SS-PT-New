# Synthesis 2 — Gaming Mode review + Suspend Watchdog design

**Seats:** Ox Alpha (`stealth/ox-alpha`, high, **$0.00**, 8469 out) · GLM 5.3 (`glm-5.3`, 22544 out incl. 17908 reasoning) · HY3 (`tencent/hy3`, **$0.0046**, 7870 out — **remit locked to UI/UX**, not a systems vote).
**Total spend: ~$0.005.**
**Verdicts:** Ox = **REVISE, do not build the watchdog on these scripts.** GLM = same conclusion, arrived at independently, with a full design.
**Attribution check (gotcha #3):** GLM did not ventriloquise other seats. HY3 self-declared its UI/UX remit in its first line — its systems commentary is out-of-lane and is treated as such.

---

## 1. Defects in the code I shipped tonight (owned)

| # | Defect | Found by |
|---|---|---|
| **D1** | `$ErrorActionPreference='SilentlyContinue'` **globally** → every failure path still ends `"ready"`. Logs record **intent, not outcome**. `power cap -> 260W` is logged even when `nvidia-smi` fails. No exit-code checks, no read-back. | Both |
| **D2** | **I understated limitation #3 and got the mechanism backwards.** `powercfg /change standby-timeout-ac 0` **is persistent**; `nvidia-smi -pl` is **not**. Reboot-in-gaming-mode = 320 W cap + auto-sleep disabled forever + a flag nothing reads. Ox: "the worst reachable state in the whole design." GLM's concrete path: Windows Update reboots at 03:00 (gaming mode disabled sleep, so the box is up for maintenance) → kid games next day at 320 W while the owner believes 260. | Both |
| **D3** | Flag written with `Set-Content` — **not atomic**. Reader mid-write sees a partial file. | GLM |
| **D4** | Flag has **no schema, no writer identity, no memory** → `OFF` restores an *assumed* state, not the prior state. Root cause of limitations #3/#4/#5 together: "scripts assert absolute end-state with no memory and no reconciliation." | GLM |
| **D5** | Double-click race — non-atomic `Test-Path`/`Set-Content`; interleaved `Add-Content` corrupts the log. | Both |
| **D6** | `'ollama_llama_server'` likely not a real process name in current builds → **silent no-op** under `SilentlyContinue`. | Ox |
| **D7** | ON logs `STILL ON GPU: <pid>` and **declares gaming mode anyway**. A training job holding the GPU at 300 W under the kid's session is exactly what the mode exists to prevent. | GLM |
| **D8** | **"VERIFIED WORKING" for WoL at n=1 is overstated → "verified once."** Needs `powercfg /devicequery wake_armed` audit + 3-night soak. | Ox |
| **D9** | Unauthenticated control surfaces: any process writing the flag holds the box awake; any LAN device can defeat the sleep plan with magic packets (unauthenticated by protocol). | Ox |
| **D10** | Log is unbounded free text (`Add-Content` forever) — unparseable, slow disk-fill. Q7's instrumentation cannot be met by grepping it. | Both |

---

## 2. Convergence — high confidence, both systems seats

1. **Watchdog runs LOCALLY on Box B.** A remote poller makes the heat plan a function of network uptime, recreates the lost-job race, dies with the A→Pi migration, and adds sshd/SMB/credentials as new failure surfaces.
2. **Fail toward sleep.** **S3 preserves RAM** — a job running when the box sleeps *freezes and resumes*, it does not die. So a false-positive sleep costs wall-clock, never data. This inverts the previous panel's assumption and mine.
3. **Never kill, always freeze.** Because sleep is non-destructive, the watchdog is *allowed to be aggressive*.
4. **The fix for the non-persistent power cap is NOT persistence** (`nvidia-smi -pl` has no persistent mode on Windows; NVIDIA Control Panel doesn't expose it) — it is a **reconcile loop** that re-derives the cap from the flag at boot and every 5 min. Three lines, free.
5. **Flag-as-contract = right pattern, wrong enforcement.** GLM's three rules make it sound: **single writer** (humans/ON/OFF only, never auto-cleared), **atomic replace**, **everything derived from it re-derived continuously**. "Drop the third and it's a mutable global with a nice name."
6. **Scheduled Task, SYSTEM, highest privileges** — AtStartup + repeating. Not a service (build/deploy friction), not a bare loop (dies with the session). Fresh process per run; cross-run state in JSON.
7. **Instrumentation = Windows event log.** Kernel-Power **ID 42** (entered sleep) paired with Power-Troubleshooter **ID 1** (resumed, carries wake source). `powercfg /sleepstudy` is **Modern-Standby-only — dead on this S3 box.**
8. **State divergence is the core disease** — reached independently by Ox (systems) and HY3 (UX).

---

## 3. Divergence — genuine, and it changes the build

### 3a. Is `powercfg /requests` authoritative? **GLM wins.**

- **Ox:** components assert `PowerSetRequest(PowerRequestSystemRequired)` and release; the watchdog verifies via `powercfg /requests`.
- **GLM:** **do not honor `powercfg /requests` as blocking.** Chrome with one audio tab holds a `SYSTEM: PROCESS` request forever; updaters leak them. Read it, log it as context, **ignore unless corroborated by a measured condition.** Invariant: *"Claims never block sleep; only measurements do."*

**Resolution:** GLM is right, and its reasoning generalizes tonight's actual bug. GLM: *"the monitor must never perturb the system it monitors — your TCP probe was that bug; `powercfg /requests` honoring and 0-threshold NIC counters are its software descendants."* **Adopt:** use `PowerSetRequest` for components *we* author (well-behaved by construction); make **measurement** the authority for the sleep decision.

### 3b. Should the gaming-mode flag have a TTL? **Unresolved — needs Sean.**

- **Ox:** flag needs TTL; expired = absent. Otherwise a crash between ON and OFF leaves a permanent stand-down heater.
- **GLM:** gaming mode is `Test-Path` — **unconditional, no timeout**; and the flag must be **never auto-cleared** (single-writer invariant).

**Note:** the reconciler defuses most of Ox's fear — with it, a stale flag means "capped at 260 W and awake," not "uncapped and awake." Residual harm is sleep staying disabled indefinitely.
**Recommendation:** no auto-clear (honors GLM's single-writer rule), but **alert on flag age > 12 h**. Surfaces Ox's concern without a background process mutating a human-owned contract.

### 3c. UAC. **GLM wins.**

- Ox: test the interactive path once.
- GLM: **sidestep it** — register ON/OFF as SYSTEM Scheduled Tasks; the `.cmd` calls `schtasks /run /tn GamingModeOn`. No UAC at all. Trade-off: any local user can flip mode — *fine, arguably desirable* (kids can flip it themselves).

---

## 4. Unique insights worth keeping

**Ox only:**
- **Thermal sentinel — the largest hole.** Heat is the binding constraint and **nothing in the plan measures temperature.** GLM did not cover this. ~30 lines: GPU + CPU temp to JSON-lines every 60 s; exceedance → drop cap to 200 W → force sleep.
- `powercfg /devicequery wake_armed` audit — an armed USB device undoes the WoL work.
- Magic packets are unauthenticated: any LAN device (IoT bulb, kid's phone) sending one every 19 min means B never sustains sleep. Mitigation is monitoring wake frequency, not prevention.

**GLM only:**
- **Named mutex** `Global\SwanWatchdog`, shared by ON/OFF *and* the watchdog — one mechanism fixes the double-click race **and** single-instances the watchdog.
- **Monotonic counter, not heartbeat existence:** *"A hung process has a frozen heartbeat; existence proves nothing."* Require the **value to change** over the window.
- **Tier-3 zombie rule:** GPU ≥95% continuously with no progress delta for ~6 h → declare hung → **suspend anyway** (safe because freeze ≠ kill).
- **A's deadman auditor:** every 10 min, if B is TCP-reachable **and** heartbeat stale >30 min → alert + SSH in and force-suspend. External witness; heat fails toward sleep even when B's watchdog is dead.
- **INTENT protocol:** A writes `INTENT-<jobid>` **always, even if B looks awake**; job written `.part` then renamed (atomic); **60 s post-write verification** re-wakes B if it slept. Orphaning now requires A to violate two independent steps.
- **Settle gate:** on decision to suspend → `SUSPENDING` marker → wait 10 s → re-read every condition → any hit aborts.
- **Sample-level vs process-level failure must be split.** A broken probe that under-reports utilization would sleep through real work nightly — "bias toward sleep" must not become "random DoS when a probe breaks." Sample failure → treat as *not idle* + alert. Process death → task restart → A's deadman → OS timeout.
- **Driver updates reset NIC power management** — tonight's `WakeOnPattern` fix **can silently regress** on the next Realtek/NVIDIA update and the box never sleeps again. The reconciler must re-assert it every run.
- **Power loss during S3 = box OFF, not asleep.** WoL from S5 is a different BIOS setting, often disabled; set "restore on AC power loss → Power On/Last State." Test: full shutdown → magic packet → does it wake?
- **`swan-status.cmd`** — owner-facing: flag state, *actual* power cap, last wake cause, last sleep duration, and **what is currently blocking sleep.**
- **Write A's deadman in Python/POSIX**, not PowerShell — it migrates to the Pi.
- **"The real watt prize is A's retirement."** The watchdog manages B's heat; Box A being always-on is the room's biggest single load.

**HY3 (UX lens — diagnosis kept, prescription rejected):**
- **Silent state divergence** ranked #1: the user sees the flag, believes 260 W, and bakes heat with no surface showing truth. Converges with Ox's reconciler and GLM's `swan-status.cmd`.
- Watchdog has **no cancellation surface** — will sleep the box mid-RDP with no way to say "not now."
- *Rejected:* a React/Victory web console, responsive 320→3840, for what is a two-icon toggle. Also its "Crystalline Swan tokens" are **invented** (`#4FD1C5` is not in the palette) — do not trust its compliance claims.

---

## 5. Merged ship order

**Slice 1 — make the shipped scripts honest (~1 hour).** Fixes D1, D3, D4, D5, D6, D7 + limitations #1, #4, #6.
- Remove global `SilentlyContinue`; scoped try/catch on the three load-bearing ops; check `$LASTEXITCODE`; **read back** `--query-gpu=power.limit` and log `VERIFIED 260W`
- Structured flag v1: `{set_at, set_by, ollama_was_running, sleep_timeout_was}`, written temp-then-rename (atomic on NTFS)
- Named mutex shared by ON/OFF
- ON records prior ollama state; OFF restores *that*, not an assumption
- Verify the real ollama process name
- ON refuses (or warns to the console session) if a compute app still holds the GPU
- `swan-status.cmd`
- Register ON/OFF as SYSTEM tasks; `.cmd` → `schtasks /run` (**kills the UAC limitation entirely**)

**Slice 2 — reconciler + thermal sentinel (~1 evening).** Fixes D2, limitation #3, and the driver-regression risk.
- Scheduled Task, SYSTEM, AtStartup + every 5 min
- Re-derive from flag: power cap, sleep timeout, **NIC wake settings**
- Thermal sentinel → JSON-lines; exceedance → drop cap → force sleep
- Heartbeat file

**Slice 3 — the watchdog proper (~1 evening).**
- GLM's measured-condition table (**not** `powercfg /requests`)
- 15 min all-clear (3 × 5-min samples) → settle gate → `SetSuspendState 0,1,0`
- Tier 1/2/3 crashed-job handling
- Reason codes both directions; event-42/event-1 sleep report

**Slice 4 — A's waker + deadman + alerting (~1 evening).** Python/POSIX for Pi portability.

**Then the queue**, inheriting the INTENT protocol and heartbeat contract it must honor.

---

## 6. Open items for Sean

1. **Flag TTL** (§3b) — recommendation: no auto-clear, alert at >12 h.
2. **UAC sidestep** (§3c) — makes gaming mode flippable by any local user, kids included. Confirm that's acceptable/desired.
3. **S5 wake test** — full shutdown → magic packet. Determines whether a power blip orphans the fleet.
4. Still outstanding from Synthesis 1: **EXPO in BIOS** (free ~25% memory bandwidth), Pi storage fix, power meter, GPU Tweak III fan back to auto.
5. **WaveBrowser** (adware) found running on Box B — uninstall.
