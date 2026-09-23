<#
.SYNOPSIS
Stops a running MiniSwan tunnel keeper so the current script can take over.

.DESCRIPTION
The keeper takes a global mutex (Global\MiniSwanTunnelKeeper-v1 on port 18082),
so a keeper that is already running makes a second one exit immediately with
"another keeper instance is already running". That refusal is deliberate - two
keepers would fight over the same SSH forward - but it has a consequence that
cost real time on 2026-09-19: after the keeper SCRIPT is updated, the running
copy stays the OLD one indefinitely. Clicking "KEEP ALIVE" does not swap it. The
launcher window prints a reassuring banner and exits 0, so the only evidence is
one line in the keeper log.

This script does the missing half: find the running keeper, stop it, wait for the
mutex to actually release, and report. The caller then starts the current script.

Every run appends a record to logs\keeper-restart.log. That is deliberate: a
restart that leaves no artifact is a restart nobody can prove happened, and the
whole reason this script exists is that a silent no-op was mistaken for a
successful swap.

The SSH forward is deliberately left alone by default. Killing the keeper does
not kill its ssh child (Windows does not cascade), so the endpoint never blips,
and the new keeper adopts the orphan on its next repair pass - Stop-StaleForwards
falls back to a command-line sweep for :<port> when the state file is absent.
Pass -StopForwardToo to tear the forward down as well and make the new keeper
build it from scratch; that is the cleaner end state but it costs a few seconds
of downtime, so it is opt-in.

.PARAMETER KeeperScript
Full path to the keeper. Defaults to miniswan-tunnel-keeper.ps1 beside this
script. Resolved in the body, not the param block: $PSScriptRoot is empty at
param-bind time under -File on PS 5.1.

.PARAMETER Port
Local forward port, used for the -StopForwardToo sweep and the mutex name.

.PARAMETER StopForwardToo
Also stop the ssh process holding the forward, so the next keeper owns it.

.PARAMETER WaitSeconds
How long to wait for the mutex to release after stopping the keeper.

.PARAMETER ReportPath
Where to append the run record. Defaults to logs\keeper-restart.log beside this
script. Resolved in the body for the same reason as KeeperScript.

.PARAMETER DryRun
Report what would be stopped, change nothing.

.EXAMPLE
.\Restart-MiniSwanKeeper.ps1 -DryRun

.EXAMPLE
.\Restart-MiniSwanKeeper.ps1 -StopForwardToo
#>
[CmdletBinding()]
param(
  [string]$KeeperScript = '',

  [ValidateRange(1024, 65535)]
  [int]$Port = 18082,

  [switch]$StopForwardToo,

  [ValidateRange(1, 60)]
  [int]$WaitSeconds = 10,

  [string]$ReportPath = '',

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($KeeperScript)) {
  $KeeperScript = Join-Path $PSScriptRoot 'miniswan-tunnel-keeper.ps1'
}
if ([string]::IsNullOrWhiteSpace($ReportPath)) {
  $ReportPath = Join-Path (Join-Path $PSScriptRoot 'logs') 'keeper-restart.log'
}

$scriptName = Split-Path -Leaf $KeeperScript
$mutexName  = 'Global\MiniSwanTunnelKeeper-v1'
if ($Port -ne 18082) { $mutexName = "$mutexName-$Port" }

$reportDir = Split-Path -Parent $ReportPath
if ($reportDir -and -not (Test-Path -LiteralPath $reportDir)) {
  New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

# Echo to the console AND to the record. Write-Host alone was not enough: the
# first version of this script produced no capturable evidence, which is exactly
# the failure mode it is meant to eliminate.
function Say([string]$Text) {
  Write-Host $Text
  try { Add-Content -LiteralPath $ReportPath -Value $Text -Encoding utf8 } catch { }
}

Say ''
Say "=== keeper restart requested $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
Say "  keeper script : $KeeperScript"
Say "  mutex         : $mutexName"
Say "  dry run       : $($DryRun.IsPresent)"
Say "  stop forward  : $($StopForwardToo.IsPresent)"
Say ''

if (-not (Test-Path -LiteralPath $KeeperScript)) {
  Say "  ERROR: keeper script not found: $KeeperScript"
  exit 1
}

function Get-RunningKeeper {
  # Match on the leaf name so it catches a keeper launched through either the
  # Desktop wrapper or the @Everything launcher.
  #
  # Exclude anything with CODEBUDDY_ in its command line: WorkBuddy's tool
  # sandbox spawns helper processes whose command line echoes the script text it
  # is running, and those match on the name while not being keepers. Measured
  # 2026-09-19 - a naive name match reported 2 keepers when only 1 existed.
  #
  # NOTE: the @() here is NOT enough. PowerShell unrolls an array on return, so a
  # single match arrives at the caller as a bare CimInstance with no .Count, and
  # a zero-match result arrives as $null. Callers must wrap the CALL in @() too
  # (see $running below). Measured 2026-09-19: the first version printed an empty
  # "running keepers :" and would have taken the wrong branch on zero matches.
  @(
    Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
      Where-Object {
        $_.ProcessId -ne $PID -and
        $_.CommandLine -like "*$scriptName*" -and
        $_.CommandLine -notlike '*CODEBUDDY_*'
      }
  )
}

function Test-MutexHeld {
  param([string]$Name)
  $created = $false
  $m = New-Object System.Threading.Mutex($false, $Name, [ref]$created)
  try {
    if ($m.WaitOne(0)) { $m.ReleaseMutex(); return $false }
    return $true
  } catch [Threading.AbandonedMutexException] {
    # Previous holder died without releasing. Nobody holds it now.
    return $false
  } finally {
    $m.Dispose()
  }
}

# Wrap the CALL in @(): PowerShell unrolls the array the function returns, so a
# single match arrives at the caller as a bare CimInstance and a zero-match
# result arrives as $null. Measured 2026-09-19 - without this the count printed
# blank and, worse, the zero-match branch below never fired.
$running = @(Get-RunningKeeper)
$held    = Test-MutexHeld -Name $mutexName

Say "  running keepers : $(@($running).Count)"
foreach ($p in $running) {
  Say "    pid $($p.ProcessId)  started $($p.CreationDate)"
}
Say "  mutex held      : $held"
Say ''

if ($running.Count -eq 0 -and -not $held) {
  Say '  Nothing to stop - no keeper is running and the mutex is free.'
  Say '  The caller should now start the current keeper.'
  exit 0
}

if ($running.Count -eq 0 -and $held) {
  # A holder exists that this sweep could not identify. Refuse rather than
  # pretend success: the next keeper would refuse to start, and that refusal
  # would look like a mystery unless this line is in the record.
  Say '  WARNING: the mutex is held but no keeper process matched.'
  Say '  Not stopping anything - an unidentified process owns it. If the next'
  Say '  keeper refuses to start, find the holder by hand.'
  exit 2
}

if ($DryRun) {
  Say '  DRY RUN - would stop the process(es) listed above.'
  if ($StopForwardToo) {
    Say "  DRY RUN - would also stop ssh holding :$Port"
  }
  Say '  DRY RUN - nothing was changed.'
  exit 0
}

$stoppedPids = @()
foreach ($p in $running) {
  Say "  stopping pid $($p.ProcessId) ..."
  $stoppedPids += [int]$p.ProcessId
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

# Wait for the SPECIFIC pids we stopped to disappear - NOT for "no keeper at all".
# Those two differ the moment a replacement keeper is already starting, and the
# first version tested the latter. Measured 2026-09-19 01:18: the helper printed
# "WARNING: still not released after 10s. The next keeper may refuse to start" on a
# run that had SUCCEEDED - old pid 61408 was gone and new pid 53820 was running.
# Reporting a success as a possible failure is the same defect class this whole
# script exists to fix, so the two facts are now reported separately.
$deadline = (Get-Date).AddSeconds($WaitSeconds)
$pidsGone = $false
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 250
  $stillAlive = @($stoppedPids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
  if ($stillAlive.Count -eq 0) { $pidsGone = $true; break }
}

$mutexFree = -not (Test-MutexHeld -Name $mutexName)
$replaced  = (@(Get-RunningKeeper).Count -gt 0)

if ($pidsGone) {
  Say "  stopped process(es) are gone: $($stoppedPids -join ', ')"
} else {
  Say "  WARNING: pid(s) $($stoppedPids -join ', ') still alive after ${WaitSeconds}s."
  Say '  Re-run this, or raise -WaitSeconds.'
}

if ($mutexFree) {
  Say '  mutex is free.'
} elseif ($replaced) {
  Say '  mutex is held and a keeper is running - a replacement already took it.'
  Say '  That is the expected end state when the new keeper was started during this run.'
} else {
  Say '  WARNING: mutex is still held and no keeper process matches it.'
  Say '  The next keeper will refuse to start; find the holder by hand.'
}

if ($StopForwardToo) {
  $forwards = @(
    Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -match [regex]::Escape(":$Port`:") }
  )
  if ($forwards.Count -eq 0) {
    Say "  no ssh forward on :$Port to stop"
  } else {
    foreach ($f in $forwards) {
      Say "  stopping ssh forward pid $($f.ProcessId)"
      Stop-Process -Id $f.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Say '  forward stopped - the next keeper will rebuild it.'
  }
} else {
  Say "  ssh forward on :$Port left running (endpoint stays up); the next keeper"
  Say '  adopts it on its next repair pass. Use -StopForwardToo for clean ownership.'
}

Say "=== done $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
Say ''
exit 0
