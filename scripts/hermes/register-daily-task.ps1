# register-daily-task.ps1 - Delivery Quartet Q-3: the INTERIM clock (7-star UX-2).
# Registers ONE Windows Task Scheduler job for the daily 06:00 chain (doctor ->
# health-sweep -> digest -> briefing -> status page). The /TR action is a tiny
# wrapper (daily-chain.cmd, beside this file) because schtasks caps /TR at 261
# characters - a long inline cmd chain fails to register (caught live 2026-07-07).
# Every command re-reads its kill switches fresh (fail closed), so this dumb
# clock inherits the governance for free. This is explicitly NOT the slice-5
# headless runner (no retries, no dead-letter, no auto-demotion) - the runner
# replaces it and this task is then deleted:
#   schtasks /Delete /TN "HermesOS-Daily" /F
#
# Run once from a normal user PowerShell (no admin needed):
#   powershell -ExecutionPolicy Bypass -File scripts/hermes/register-daily-task.ps1
# Requires: node on PATH; HERMES_* env at User scope so the task sees them.

$action = Join-Path $PSScriptRoot 'daily-chain.cmd'
if (-not (Test-Path $action)) { Write-Host "[!] daily-chain.cmd not found beside this script - aborting."; exit 1 }
if ($action.Length -gt 250) { Write-Host "[!] action path too long for schtasks /TR ($($action.Length) chars): $action"; exit 1 }

schtasks /Create /F /TN "HermesOS-Daily" /SC DAILY /ST 06:00 /TR "$action"
if ($LASTEXITCODE -eq 0) {
  Write-Host "Registered 'HermesOS-Daily' @ 06:00 (interim clock - the slice-5 runner replaces it)."
  Write-Host "Action: $action"
  Write-Host "Log:    $env:USERPROFILE\.hermes\daily-task.log"
  Write-Host "Try now:  schtasks /Run /TN HermesOS-Daily"
} else {
  Write-Host "schtasks failed ($LASTEXITCODE) - run from a normal user PowerShell; no admin needed for a user task."
  exit 1
}
