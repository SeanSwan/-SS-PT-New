# Hostile Review Packet 2 — Gaming Mode shipped; design the Suspend Watchdog

**Date:** 2026-08-25 · **Remit:** Adversarial. Attack the code that shipped tonight, then design the next slice. Be concrete. Prefer "this breaks when X, do Y" over principles.

---

## 1. Context (one paragraph)

Three-box homelab in a **9 ft × 12 ft room**; heat is the binding constraint, owner is cash-constrained. **Box A** = RTX 5090 / Gigabyte X870E, always-awake controller, **Wake-on-LAN confirmed permanently dead** (firmware cuts NIC standby power). **Box B** = `miniswan`, RTX 4080 Super 16 GB / Ryzen 7 7800X3D / Gigabyte B850M AORUS ELITE, 64 GB DDR5 (4 slots, 2 filled), intended as the sleep-by-default batch worker. **Box C** = radar, always-on Ubuntu money-agent box, slated for retirement onto a Raspberry Pi. A prior panel established the governing thesis: **the 24/7 idle baseline is the prize, not load-time undervolting.**

---

## 2. What shipped tonight, with proof

### 2a. Wake-on-LAN on Box B — VERIFIED WORKING

Full cycle, current session:

| Step | Evidence |
|---|---|
| Detector validated **while awake** | `TcpTestSucceeded = True` on `192.168.50.92:22` |
| Slept (S3) | `TcpTestSucceeded = False`, twice, 10 s apart |
| Stayed asleep under repeated probing | only after `WakeOnPattern=Disabled` |
| Magic packet sent | 4 targets: `.50.255:9`, `255.255.255.255:9`, `.50.255:7`, `.50.92:9` |
| Woke | `TcpTestSucceeded = True` |
| Cause confirmed | `powercfg /lastwake` → **Realtek PCIe 2.5GbE Family Controller** |
| Human witness | owner watched it power down, stay off, and come back unaided |

**Critical discovered defect (now fixed):** `WakeOnPattern` was `Enabled`. The reviewer's own TCP status probe woke the machine 25 s after it slept. Left unfixed, the box would have woken on **any** stray LAN traffic and never stayed asleep — presenting as "sleep works" while silently running ~100 W all night. Now `WakeOnPattern=Disabled`, `WakeOnMagicPacket=Enabled`.

**Config changes made (both reversible):** `powercfg /hibernate off` (removes Fast Startup, guarantees clean S3); the NIC wake settings above.

### 2b. Gaming Mode — VERIFIED WORKING (scripts), UAC path UNTESTED

Owner's ask, verbatim: *"I could just a CMD file on the desktop. I could double click just to put into, like, kid gaming mode so, like, everything kinda tells everything that it's in gaming mode and in a pause. So that it's not running all hard while my kids playing games. especially the heat."*

Design decision: **the CMD does not do the work — it raises a flag file.** `C:\swan\GAMING_MODE.flag` is a *contract*; every future component (queue, wake controller, suspend watchdog) reads that one file and stands down. Kids do not toggle it — the owner does, when handing the machine over, so a UAC prompt is acceptable.

Proof: GPU power limit `320 W → 260 W → 320 W`; flag created with timestamp then cleared; `C:\swan\gaming-mode.log` recorded every transition with `nvidia-smi` echoing its own state change.

**`C:\swan\gaming-mode-on.ps1`:**
```powershell
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\swan'
$flag = Join-Path $root 'GAMING_MODE.flag'
$log  = Join-Path $root 'gaming-mode.log'
New-Item -ItemType Directory -Path $root -Force | Out-Null
function Log($m){ "{0}  {1}" -f (Get-Date -f 'yyyy-MM-dd HH:mm:ss'), $m | Add-Content -Path $log }

$GamingWatts = 260   # of 320 stock

Log "=== GAMING MODE ON ==="
Set-Content -Path $flag -Value ("ON since {0}" -f (Get-Date -f 'yyyy-MM-dd HH:mm:ss')) -Encoding ascii

$svc = Get-Service -Name 'ollama' -EA SilentlyContinue
if ($svc -and $svc.Status -eq 'Running') { Stop-Service ollama -Force; Log "stopped service: ollama" }
Get-Process -Name 'ollama','ollama_llama_server' -EA SilentlyContinue | ForEach-Object {
  Log ("stopped process: {0} pid={1}" -f $_.ProcessName, $_.Id); Stop-Process -Id $_.Id -Force
}

$held = & nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader 2>$null
if ($held) { foreach ($h in $held) { Log "STILL ON GPU: $h" } } else { Log "GPU clear of compute apps" }

$r = & nvidia-smi -pl $GamingWatts 2>&1; Log "power cap -> ${GamingWatts}W : $r"
powercfg /change standby-timeout-ac 0 | Out-Null; Log "auto-sleep disabled"
Log "ready"
```

**`C:\swan\gaming-mode-off.ps1`:**
```powershell
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\swan'; $flag = Join-Path $root 'GAMING_MODE.flag'; $log = Join-Path $root 'gaming-mode.log'
New-Item -ItemType Directory -Path $root -Force | Out-Null
function Log($m){ "{0}  {1}" -f (Get-Date -f 'yyyy-MM-dd HH:mm:ss'), $m | Add-Content -Path $log }

$StockWatts = 320
$SleepMinutes = 20

Log "=== GAMING MODE OFF ==="
if (Test-Path $flag) { Remove-Item $flag -Force; Log "flag cleared" } else { Log "flag was not set" }
$r = & nvidia-smi -pl $StockWatts 2>&1; Log "power cap -> ${StockWatts}W : $r"
$svc = Get-Service -Name 'ollama' -EA SilentlyContinue
if ($svc -and $svc.Status -ne 'Running') { Start-Service ollama; Log "restarted service: ollama" }
powercfg /change standby-timeout-ac $SleepMinutes | Out-Null; Log "auto-sleep -> ${SleepMinutes} min"
Log "back to work mode"
```

Desktop launchers at `C:\Users\Public\Desktop\GAMING MODE {ON,OFF}.cmd` self-elevate via `Start-Process -Verb RunAs` then re-invoke themselves.

---

## 3. Known limitations — the owner wants these FIXED. Rank and design each.

1. **UAC elevation path untested.** Cannot trigger interactive consent over SSH.
2. **Nothing reads the flag yet.** The contract exists; no consumer honors it. The flag's only current effect is the power cap and sleep-timeout change.
3. **The power cap does not survive reboot.** `nvidia-smi -pl` is not persistent. Reboot while in gaming mode → GPU returns to 320 W with the flag still raised. State and reality diverge silently.
4. **`OFF` starts `ollama` unconditionally** even if the owner had deliberately stopped it before entering gaming mode. It restores an assumed state, not the prior state.
5. **Live behavior change not explicitly requested:** Box B now sleeps after 20 min idle, because the test run of `OFF` set it.
6. **No guard against the scripts racing** each other or themselves (double-click twice, or ON while OFF is mid-run).

---

## 4. The next slice to design: the SUSPEND WATCHDOG

The prior panel's warning, verbatim: *"a crashed job that never releases the 'stay awake' condition means a 100+ W box running all night into a sealed hot room. Queue empty + 0% GPU for N minutes → sleep, regardless of job state."*

This is the component that turns "**can** sleep" into "**does** sleep." It is the difference between a working heat plan and a silent heater. **Design it.**

Known ground truth to design against:
- Box B: Windows 11, S3 only (no Modern Standby), WoL proven from Box A.
- Box A cannot be woken remotely — it is always-on by necessity, so it can host a poller.
- `C:\swan\GAMING_MODE.flag` is the existing stand-down contract.
- No queue exists yet. The eventual pattern is a shared-folder job watcher (the owner already uses folder-polling watchers elsewhere).
- The Raspberry Pi is intended to become the always-on controller (~4 W) replacing Box A in that role, but is currently offline pending a storage fix.

### Questions — answer each directly

1. **Where does the watchdog run** — on Box B itself (local timer/service), on Box A (remote poller that issues the suspend), or split? Name the failure mode of the wrong choice.
2. **What exactly are the "stay awake" conditions**, and how is each measured on Windows? Cover at minimum: GPU utilization, an active job, an interactive user session (RDP or local), a file transfer in flight, and gaming mode. Give the concrete command or API for each.
3. **How do you avoid the crashed-job trap** — a job that never releases its lock — without killing legitimately long-running batch work? A multi-hour MoE inference run looks identical to a hung process by most naive metrics.
4. **Idempotency and races:** what happens when the watchdog decides to suspend at the same moment Box A dispatches a job? Design the handshake. (A prior review already found a lost-job race in the queue design: B polls empty → starts suspend countdown → A writes job at N−ε → B suspends → job orphaned forever.)
5. **Implementation form on Windows** — Scheduled Task, Windows Service, or a looping script? Justify against reliability, restart-after-crash, and running before/without an interactive login.
6. **How does the watchdog itself fail safely?** If the watchdog dies, does the box stay awake forever (heat) or sleep during work (lost jobs)? Which failure is correct here, and why?
7. **What instrumentation** must ship with it so that a month from now the owner can answer "did it actually sleep, and for how many hours?" without guessing. Note: the owner is buying a plug-in power meter; assume no smart-plug telemetry.
8. **Attack the limitations in §3** — rank them by real risk, and say which are genuinely worth fixing versus which are cosmetic. Specifically: is limitation #3 (non-persistent power cap) a real problem or a non-issue?
9. **What is missing entirely** from this plan that will bite in the next month?
10. **Call out any factual or design error** in §2 — including the flag-file-as-contract pattern itself. Is that the right abstraction, or is it a shared-mutable-state trap?
