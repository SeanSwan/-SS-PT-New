# register-daily-task.ps1 - Delivery Quartet Q-3: the INTERIM clock (7* UX-2).
# Registers ONE Windows Task Scheduler job that runs the daily T0/T1 chain at
# 06:00: doctor -> health-sweep -> digest -> briefing. Every command re-reads its
# kill switches fresh (fail closed), so this dumb clock inherits the governance
# for free. This is explicitly NOT the slice-5 headless runner (no retries, no
# dead-letter, no auto-demotion) - the runner replaces it and this task is then
# deleted. Remove anytime:  schtasks /Delete /TN "HermesOS-Daily" /F
#
# Run once from an elevated-or-not PowerShell (user-level task, runs as Sean):
#   powershell -ExecutionPolicy Bypass -File scripts/hermes/register-daily-task.ps1
#
# Requires: node on PATH for the logged-in user; HERMES_* env vars set at USER
# scope (setx) so the task's environment sees them (doc 170 ?E step 5 sets the
# Ollama ones; HERMES_ANCHOR_KEY per the E4C runbook ?2).

$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$log = Join-Path $env:USERPROFILE ".hermes\daily-task.log"
$cmd = "cd /d `"$repo`" && (node scripts\hermes\hermes-doctor.mjs & node scripts\hermes\health-sweep.mjs & node scripts\hermes\receipt-digest.mjs & node scripts\hermes\morning-briefing.mjs) >> `"$log`" 2>&1"

schtasks /Create /F /TN "HermesOS-Daily" /SC DAILY /ST 06:00 /TR "cmd /c $cmd"
if ($LASTEXITCODE -eq 0) {
  Write-Host "Registered 'HermesOS-Daily' @ 06:00 (interim clock - slice-5 runner replaces it)."
  Write-Host "Log: $log   Verify now:  schtasks /Run /TN `"HermesOS-Daily`""
} else {
  Write-Host "schtasks failed ($LASTEXITCODE) - run from a normal user PowerShell; no admin needed for a user task."
}
