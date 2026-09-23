# Hostile Review Packet 3 — Watchdog shipped (observe-mode) + time-of-day sleep policy

**Date:** 2026-08-26 · **Remit:** Adversarial. Two prior panels already ran on this system; their findings were implemented. Review what was actually built, then attack the NEW time-of-day policy before it is armed. Concrete fixes only. **This is about to be armed on a live machine that will suspend itself — say what breaks first.**

---

## 1. Context

Three-box homelab, **9 ft × 12 ft room**, heat is the binding constraint, owner cash-constrained. **Box B** (`miniswan`) = RTX 4080 Super 16 GB / Ryzen 7 7800X3D / Gigabyte B850M, Windows 11, **PowerShell 5.1**, S3 only (no Modern Standby), Wake-on-LAN **verified working** (3 successful cycles incl. 2 unplanned). Box A = RTX 5090, always-on, **WoL permanently dead** (firmware). A Raspberry Pi will later replace Box A as the always-on controller.

**Prior panel findings already implemented:** measurement-over-claims (`powercfg /requests` deliberately NOT honored); fail-toward-sleep (S3 preserves RAM, suspend freezes rather than kills); flag-as-contract with atomic write + continuous reconciliation; Scheduled Task as SYSTEM; Event 42/Event 1 for sleep accounting; no `-WakeToRun`.

### Owner requirements, verbatim
- *"my kids are really really supposed to be playing for an hour a day max... just give it four hours"* → later revised to **2.5 h**, with: *"after that they should do a check, see if someone's actually playing games... then it'll wait for another [2.5 hours]"* → **renewable lease**.
- *"I don't want the computer on when I'm asleep. It has a light, and it's annoying."*
- *"we can't be having it going to sleep before using it"* → **never suspend mid-job**.
- *"after [one] o'clock I'm usually sleep. So if it's late, then the AI should be able to decide whether to sleep it or not if it's not doing anything... it's a secondary computer... most of the times it's not doing nothing."*

---

## 2. What is SHIPPED and PROVEN (Slices 1–2)

`C:\swan\` — `swan-common.ps1` (helpers, atomic flag, mutex, verified power-cap setter), `swan-sense.ps1` (GPU/CPU/session sensing), `reconcile.ps1` (SYSTEM task, AtStartup + every 5 min), `gaming-mode-{on,off}.ps1`, `swan-status.ps1`, `logs\swan-events.jsonl`, `heartbeat`.

**Proven this session (executed, logged):**
- Round trip: cap `320→260→320`, flag written atomically then cleared, exit 0 both directions.
- **Drift repair:** cap forced to 320 behind the flag's back → reconciler logged `reconciled_cap was=320 now=260` and `reconciled_sleep was=20 now=0`.
- **Lease lifecycle:** backdated expiry → `lease_grace` (one-cycle reprieve) → `lease_expired` → flag cleared → cap `260→320`, sleep `0→20`.
- **Unattended execution:** task fired at 23:56:58, `lastResult=0`.
- Reconciler also re-asserts NIC wake settings each cycle (a driver update silently reverts them).
- Thermal sentinel: GPU ≥85 °C → cap to 200 W; ≥92 °C → suspend regardless of mode.

**Instrument failures caught and corrected (all real, all this session):**
1. Board reports **CPU temp 16.9 °C** — below ambient, impossible. ACPI zone is not a CPU sensor. Now gated to `$null` outside 20–110 °C rather than feeding a fake number into a thermal safety decision.
2. First activity detector took **MAX of 3 GPU-utilisation samples at a 10% threshold** and **renewed a lease with nobody playing** (`gpu_util=20` from background browser rendering + the script's own `nvidia-smi` calls). Same disease as the earlier `WakeOnPattern` bug: *the monitor perturbed what it measured.* Replaced with **sustained power draw** (idle 4.5–6 W vs 100 W+ under load) using the **MINIMUM** across 5 samples.
3. `nvidia-smi --query-compute-apps` returns **27 processes** on this consumer card (Brave, Edge, shell) and `used_memory` reads `[N/A]` — a raw count is a useless "is work running" signal. Now regex-filtered to actual compute workloads (0 vs 27).
4. `[System.IO.File]::Move($a,$b,$true)` — no 3-arg overload in PS 5.1. Then `Replace($a,$b,$null)` — PS coerces `$null` to `''`, rejected as "not of a legal form". Now `Replace` with a real `.bak` path, removed after.
5. Orphaned `.tmp` on failed atomic write — now a `finally` cleanup.

---

## 3. Slice 3 — the watchdog (DEPLOYED, OBSERVE-ONLY, currently soaking)

Arming is opt-in via presence of `C:\swan\watchdog-armed`. Absent = evaluate and log only.

```powershell
$IdleCyclesToSleep = 3       # x 5 min cadence
$HungJobHours      = 6       # Tier-3 zombie ceiling

function Get-SwanBlockers {
  $b = @(); $probeFail = $false
  if (Test-Path $SwanFlag) { $b += 'GAMING_MODE' }
  $act = Test-GamingActivity -Samples 3
  if ($act.gpu_min_draw -lt 0) { $probeFail = $true } elseif ($act.gpu_busy) { $b += 'GPU_BUSY' }
  if ($act.user_present) { $b += 'SESSION_ACTIVE' }
  if ((Get-GpuComputeApps).Count -gt 0) { $b += 'GPU_COMPUTE' }
  try { if ((Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples[0].CookedValue -gt 30) { $b += 'CPU_BUSY' } } catch { $probeFail = $true }
  try { if ((Get-Counter '\PhysicalDisk(_Total)\% Idle Time').CounterSamples[0].CookedValue -lt 90) { $b += 'DISK_BUSY' } } catch { $probeFail = $true }
  try { if (@(Get-NetTCPConnection -LocalPort 22 -State Established -EA SilentlyContinue).Count -gt 0) { $b += 'SSH_ACTIVE' } } catch { }
  if (@(Get-ChildItem $QueueIn -File -EA SilentlyContinue).Count -gt 0) { $b += 'JOB_QUEUED' }
  $intent = @(Get-ChildItem $QueueIn -Filter 'INTENT-*' -File -EA SilentlyContinue |
              Where-Object { ((Get-Date) - $_.LastWriteTime).TotalSeconds -lt 120 })
  if ($intent.Count -gt 0) { $b += 'INTENT_FRESH' }
  foreach ($j in @(Get-ChildItem $QueueRun -File -EA SilentlyContinue)) {
    if (((Get-Date) - $j.LastWriteTime).TotalHours -lt $HungJobHours) { $b += 'JOB_RUNNING'; break }
  }
  try { if (@(Get-SmbOpenFile -EA SilentlyContinue | Where-Object { $_.Path -like 'C:\swan*' }).Count -gt 0) { $b += 'SMB_OPEN' } } catch { }
  if ($probeFail) { $b += 'PROBE_FAILED' }
  return ,@($b | Select-Object -Unique)
}
```

Decision loop: blockers → reset counter, log `watchdog_awake` with reasons. All clear → increment; at `$IdleCyclesToSleep` → **settle gate** (write `SUSPENDING` marker, wait 10 s, re-evaluate all blockers, abort on any hit) → then `watchdog_would_sleep` (observe) or `SetSuspendState 0,1,0` (armed). Cross-run state in `watchdog-state.json`.

**First observed cycle:** `watchdog_awake`, reason `DISK_BUSY,SSH_ACTIVE`, `armed:false`, `idle_cycles:0`. Correct — an admin was connected.

---

## 4. THE NEW THING — time-of-day + workload sleep policy (WRITTEN, NOT YET DEPLOYED)

**The gap this fixes:** Windows' idle timer is **input-only**. It does not know a GPU job is running, so a 3-hour unattended render with no keyboard input gets suspended partway. Survivable (S3 freezes, resumes on wake) but wrong. Owner: *"we can't be having it going to sleep before using it."*

**Approach:** stop treating the OS timer as a constant. Set it every reconcile cycle from policy — `0` (disabled) whenever work is in flight, so the **watchdog becomes the only suspend authority** during work. The Tier-3 zombie ceiling prevents that from becoming a stuck-awake heater.

```powershell
$NightStartHour = 1    # inclusive - 1am
$NightEndHour   = 8    # exclusive
$DayTimeoutMin   = 20 ; $NightTimeoutMin = 5
$DayIdleCycles   = 3  ; $NightIdleCycles = 1

function Test-SwanNight {
  $h = (Get-Date).Hour
  if ($NightStartHour -lt $NightEndHour) { return ($h -ge $NightStartHour -and $h -lt $NightEndHour) }
  return ($h -ge $NightStartHour -or $h -lt $NightEndHour)
}

function Test-SwanWorkActive {
  $queued  = @(Get-ChildItem 'C:\swan\queue\incoming' -File -EA SilentlyContinue | Where-Object { $_.Name -notlike 'INTENT-*' }).Count
  $running = @(Get-ChildItem 'C:\swan\queue\running' -File -EA SilentlyContinue | Where-Object { ((Get-Date) - $_.LastWriteTime).TotalHours -lt 6 }).Count
  $compute = (Get-GpuComputeApps).Count
  return @{ active = (($queued + $running + $compute) -gt 0); queued=$queued; running=$running; compute=$compute }
}

function Get-SwanPolicy {
  $night = Test-SwanNight; $gaming = Test-Path $SwanFlag; $work = Test-SwanWorkActive
  if ($gaming)      { return @{ os_timeout=0; idle_cycles=$DayIdleCycles;   night=$night; reason='gaming - never auto-sleep' } }
  if ($work.active) { return @{ os_timeout=0; idle_cycles=$DayIdleCycles;   night=$night; reason='work in flight - OS timer disabled' } }
  if ($night)       { return @{ os_timeout=$NightTimeoutMin; idle_cycles=$NightIdleCycles; night=$true;  reason='night + idle - aggressive' } }
  return              @{ os_timeout=$DayTimeoutMin;   idle_cycles=$DayIdleCycles;   night=$false; reason='day + idle - normal' }
}
```

| Situation | OS timer | Watchdog cycles |
|---|---|---|
| Gaming mode | 0 (off) | won't sleep (GAMING_MODE blocker) |
| Work in flight | **0 (off)** | only suspend authority |
| Night (01:00–08:00) + idle | 5 min | **1** (~5 min) |
| Day + idle | 20 min | 3 (~15 min) |

---

## 5. Questions — answer each directly

1. **Attack the `os_timeout=0` during work.** Is dynamically zeroing Windows' idle timer the right mechanism, or is there a better one available to a 5-minute Scheduled Task in PS 5.1? (`SetThreadExecutionState` was rejected: it is per-process and dies when the task exits — confirm or refute.) What is the failure mode if the reconciler dies while the timer is zeroed?
2. **Attack night mode.** 5-minute OS timeout + 1 idle cycle after 1 AM. Too aggressive? Name a concrete scenario where this bites the owner. Note WoL works, so a wrong sleep costs ~30 s to undo remotely — but he is asleep.
3. **The 12 blockers in §3** — any missing that will matter in the next month? Any that are wrong, redundant, or will produce a permanent false-block? Specifically assess `SSH_ACTIVE` (added so it will not suspend under an admin session) and `DISK_BUSY` at `<90% idle` — is that threshold going to block forever on a normal Windows desktop?
4. **The settle gate** (marker → 10 s → re-evaluate → abort) — sufficient? What still races?
5. **Arming sequence.** What specifically must be verified before creating `watchdog-armed` on a live machine? Give a checklist. What would you refuse to arm without?
6. **The night/day boundary is evaluated per-cycle.** What happens to a job that starts at 00:55 and runs until 03:00? Trace it through the policy table and say whether the outcome is correct.
7. **What breaks FIRST in production?** One answer, most probable.
8. **Errors in §2/§3/§4** — including in the instrument-failure fixes themselves. Is sustained-minimum power draw ≥50 W actually a sound gaming detector on a 4080 Super, or does it have a false-negative class (e.g. a light indie game, an emulator, a menu screen, a frame-capped title)?
9. **What is missing entirely** from this whole system as of tonight?
10. This system now has three writers to `GAMING_MODE.flag`: human ON, human OFF, and the reconciler (lease renew/expire only, restricted to `expires_at`/`renewals`/`grace_started`). A prior panel's invariant was **single writer, never auto-cleared**. Is that departure safe as implemented, or does it need a different mechanism?
