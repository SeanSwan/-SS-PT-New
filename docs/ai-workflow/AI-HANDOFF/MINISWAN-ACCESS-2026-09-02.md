---
decision: MiniSwan is SSH-drivable from any Windows terminal via `ssh miniswan` (LAN) or `ssh miniswan-net` (Tailscale); the Windows lock screen does not gate SSH. Access details moved out of a single laptop's ~/.ssh/config into this doc.
status: shipped
supersedes: none
---

# MiniSwan — access, hardware, and the traps

**Written 2026-09-02.** Recovered from session `ab973c36` (2026-08-26) and re-verified live
tonight. Before this doc, the only record of how to reach this box was one laptop's untracked
`~/.ssh/config` plus an August transcript.

## 1. What this machine is

| | |
|---|---|
| Hostname | `MiniSwan` |
| GPU | **NVIDIA GeForce RTX 4080 SUPER** (16 GB VRAM) |
| RAM | **111 GB** usable |
| Free on C: | ~498 GB |
| OS | Windows |
| Role | Big-RAM CPU-offload inference worker + staging box for the portable radar product |

Hardware read directly over SSH 2026-09-02, not inferred from notes.

## 2. How to get in

```bash
ssh miniswan       # LAN     192.168.50.92
ssh miniswan-net   # Tailnet 100.72.20.72   <- PREFER THIS
```

Both defined in `~/.ssh/config` on the primary Windows box.

| field | value |
|---|---|
| User | `ogpsw` (a local **Administrator**) |
| Key | `~/.ssh/id_ed25519` (the DEFAULT key — *not* `id_ed25519_radar`) |
| MAC | `10-ff-e0-85-27-89` |

**Prefer `miniswan-net`.** The LAN address is DHCP-assigned ("dynamic" in ARP). If the lease
moves, `ssh miniswan` could reach a different machine. The Tailscale IP is pinned to the node.
A DHCP reservation for `.92` on the router would close this permanently.

### The authorized-key location is not the obvious one
`ogpsw` is an Administrator, so Windows OpenSSH **ignores** `~/.ssh/authorized_keys` and reads
only:

```
C:\ProgramData\ssh\administrators_authorized_keys
```

That file simply not existing is what blocked the original Aug-26 setup for an hour. If key auth
ever breaks, check this file first — and check its ACL (must be readable by Administrators and
SYSTEM only, or sshd refuses it).

## 3. The lock screen does not gate SSH — verified by observation

`sshd` and `tailscaled` are both **LocalSystem, StartMode=Auto**, and both came up **14 seconds
after boot**:

```
os_booted          = 21:12:12
sshd_started       = 21:12:26
tailscaled_started = 21:12:26
```

Neither waits for a human. Proven on 2026-09-02 by locking the console over SSH and continuing to
work: with `LogonUI` present (lock screen up), an SSH session still ran `whoami`, queried hardware,
and completed a full write→read→delete cycle on `C:\Windows\Temp`. **From power-on, the box is
usable remotely whether or not anyone ever types a password.**

## 4. Traps that cost time — read before debugging

1. **ICMP is firewalled.** `ping miniswan` returns 100% loss on a perfectly healthy box while
   ARP resolves and port 22 answers. **Never diagnose with ping.** Use
   `Test-NetConnection -Port 22`, or just try SSH.
2. **LAN comes up before Tailscale.** After a cold boot the LAN path answers in ~15s while the
   tailnet still reports `offline, last seen …` for a minute or two — the daemon is running, the
   mesh just has not re-established and the local node has a stale netmap. **Wait, do not debug.**
3. **`rundll32 user32.dll,LockWorkStation` over SSH silently does nothing.** SSH runs in
   **session 0**; the desktop is session 1, and that call cannot cross sessions. It returns
   success and has no effect. To act on the interactive desktop from SSH, use a scheduled task
   created with `/IT` (runs inside the user's session), then delete it. Generalises: **check the
   effect, never the return code.**
4. **No ARP entry ≠ asleep.** A sleeping MiniSwan keeps its NIC powered and holds an ARP entry.
   No ARP entry at all means powered off (S5) or unplugged.

## 5. Wake-on-LAN — proven from sleep, UNPROVEN from off

`c:/tmp/miniswan/wol.ps1` (MAC baked in, broadcasts to four targets) **woke the box from sleep**
in the Aug-26 test — that is why the $12 smart-plug fallback was dropped.

**It did NOT wake the box from full-off on 2026-09-02.** The machine was powered on by hand.
Waking from S5 additionally requires BIOS *Power On by Onboard LAN / PCI-E* with ErP disabled,
which has never been checked on this board. **Open question — do not assume remote power-on works.**

## 6. The toolkit

`c:/tmp/miniswan/` — 15 files, copied byte-for-byte (md5-verified) out of a temp scratchpad that
was one cleanup away from being lost:

`swan-common.ps1` · `swan-sense.ps1` · `swan-policy.ps1` · `swan-watchdog.ps1` · `reconcile.ps1` ·
`swan-status.ps1` · `gaming-mode-on.ps1` / `-off.ps1` · `GAMING MODE ON/OFF.cmd` · `SWAN STATUS.cmd` ·
`wol.ps1` · `prep-sleep.ps1` · `miniswan-probe.ps1` · `probe2.ps1`

These implement the gaming-mode lease system (GPU power cap + sleep timeout, auto-reverting) built
Aug-26. `c:/tmp` is not a durable location either — moving these into a tracked `scripts/`
directory is worth doing.

## 7. Known open items

- **EXPO is off in BIOS.** DIMMs are `F5-6000J3040G32G` (DDR5-6000 CL30) running at **4800**.
  ~25% memory bandwidth left on the table — and memory bandwidth is the exact bottleneck for the
  big-RAM inference role. Requires a reboot; Sean's action.
- **WoL from S5 unverified** (§5).
- **DHCP reservation** for `.92` not set (§2).
- **Toolkit lives in `c:/tmp`** (§6).

## 8. Related

- `RADAR-SWANGUARD-SESSION-HANDOFF-2026-08-27.md` — the other box; different hardware, different job.
- `RADAR-CONSOLE-ACCESS-2026-08-27.md` — same shape of doc for radar.
- Source session: `ab973c36-77a9-419c-b7df-9db232ba5391` (2026-08-26).
