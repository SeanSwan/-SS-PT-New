# Swan Workstation Guardian

This package keeps background maintenance quiet and conservative on Sean's
gaming/coding workstation. It does not clear Windows caches, kill live MCP
servers, modify fan/RGB control, flash BIOS, or terminate processes merely for
using memory.

## Installed behavior

- `Swan Workstation Guardian` runs hourly through a locally compiled Windows
  GUI-subsystem helper that creates no console window, waits for the real child,
  and returns that child's exit code to Task Scheduler.
- Any known game/render process, GPU load at or above 45%, or CPU load at or
  above 70% defers maintenance.
- Enforcement is limited to `tail.exe` processes that are at least four hours
  old, have no live parent, and have no children.
- `Hermes2-InboxHeartbeat` runs every four hours, has a single-instance lock,
  exits before WSL when the inbox is empty, and refuses model work unless the
  configured provider is verified as `local-ollama`.
- The nightly Hermes backup uses the same busy gate, quiesces and restarts only
  the background gateway, and verifies the restart. It never terminates the
  `Ubuntu-22.04` distro, so interactive Hermes desktop/TUI sessions stay alive.
- WSL is capped at 16 GB RAM with 8 GB swap and gradual memory reclaim.
- GLM transport policy is separate in `scripts/lib/glm-consumption-guard.mjs`:
  34K hard output ceiling, Flash-first ordering, a 15-review-round owner
  checkpoint, single-flight locking, a no-secret local ledger, and no automatic
  provider retry. Both GLM seats in one panel share one round ID, so they consume
  one review round together; round 16 is blocked until Sean explicitly approves
  the next batch of 15.

## Verification

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\guardian.tests.ps1
schtasks.exe /Query /TN "Swan Workstation Guardian" /V /FO LIST
schtasks.exe /Query /TN "Hermes2-InboxHeartbeat" /V /FO LIST
Get-Content C:\tmp\SwanWorkstationGuardian\guardian.log -Tail 20
Get-Content C:\tmp\hermes2-inbox-heartbeat.log -Tail 20
```

## Rollback

The pre-change bundle is `C:\tmp\workstation-maintenance-20260830`. It contains
power, network, startup, task, driver, and Hermes-script snapshots. Disabled
HKCU startup values are also stored under
`HKCU\Software\SwanWorkstationGuardian\DisabledStartup\HKCU-Run`; moved startup
shortcuts are in the bundle's `startup-disabled` folder.

The installed runner, policy, and guardian receipts live at
`C:\tmp\SwanWorkstationGuardian`.

The elevated settings stage remains intentionally separate. Run
`Apply-GamingSystemSettings.ps1` only after approving UAC; it disables the
Parsec virtual display, turns off two Realtek power-saving properties, and
records the resulting state. `Apply-StartupCleanup.ps1` performs the remaining
machine-level startup cleanup while preserving GPU Tweak, cooling/RGB,
security, Tailscale, PostgreSQL, and coding agents.
