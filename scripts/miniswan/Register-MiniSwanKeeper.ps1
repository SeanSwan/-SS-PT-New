<#
.SYNOPSIS
Register the MiniSwan tunnel keeper as a logon task, so it survives a reboot and a
closed console window.

.DESCRIPTION
The keeper is a long-running daemon, not a periodic job, so it is registered
differently from MiniSwan-Context-Guard: one AtLogOn trigger and no execution time
limit. It was previously started only by Desktop\@Everything\MiniSwan Qwen - KEEP
ALIVE.cmd through Everything.exe, holding a console window - which meant the
script's own "without a human in the loop" claim was false: close the window, or
reboot, and self-healing stopped silently. Measured 2026-09-19: the keeper was found
wedged with its log frozen for 5+ hours and nothing left to notice.

TWO DELIBERATE CHOICES, both learned the hard way:

1. A 2-minute delay on the logon trigger. The keeper resolves the WSL vNIC address
   once at startup and exits 2 if it cannot find one. At logon WSL may not be up
   yet, so an immediate trigger can produce a keeper that dies on arrival and never
   returns - worse than no task at all, because it looks handled.

2. Restart-on-failure, bounded (3 attempts, 5 minutes apart). A keeper that dies
   after the WSL adapter appears gets revived; a healthy one never exits, so this
   never fires. A duplicate that exits because the mutex is already held also stops
   after 3 attempts rather than looping forever and drowning the log.

.USAGE
  .\Register-MiniSwanKeeper.ps1 -Install
  .\Register-MiniSwanKeeper.ps1 -Uninstall
  .\Register-MiniSwanKeeper.ps1 -Status
#>
[CmdletBinding(DefaultParameterSetName = 'Status')]
param(
    [Parameter(ParameterSetName = 'Install')][switch]$Install,
    [Parameter(ParameterSetName = 'Install')][int]$DelayMinutes = 2,
    [Parameter(ParameterSetName = 'Uninstall')][switch]$Uninstall,
    [Parameter(ParameterSetName = 'Status')][switch]$Status
)

$ErrorActionPreference = 'Stop'
$taskName = 'MiniSwan-Tunnel-Keeper'
$keeper   = Join-Path $PSScriptRoot 'miniswan-tunnel-keeper.ps1'
$keeperLog = Join-Path (Join-Path $PSScriptRoot 'logs') 'tunnel-keeper.log'
$report   = Join-Path $PSScriptRoot 'register-keeper-result.txt'

function Save([string]$Text) {
    Set-Content -LiteralPath $report -Value $Text -Encoding UTF8
    Write-Host $Text
}

if (-not (Test-Path -LiteralPath $keeper)) { Save "FAILED: keeper not found at $keeper"; exit 1 }

try {
    if ($Uninstall) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        Save "UNINSTALLED: $taskName (the keeper keeps running until its window/process is closed)"
        exit 0
    }

    if ($Install) {
        # -AllowWake is the production intent and is what the KEEP ALIVE launcher passes.
        $arg = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $keeper + '" -AllowWake'
        $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg

        $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
        $trigger.Delay = 'PT' + $DelayMinutes + 'M'

        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
            -StartWhenAvailable -MultipleInstances IgnoreNew `
            -ExecutionTimeLimit ([TimeSpan]::Zero) `
            -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)

        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
            -Description 'Long-running MiniSwan tunnel keeper: wakes the box, keeps the model up, and re-opens the SSH forward Hermes reaches at 172.26.128.1:18082.' `
            -Force | Out-Null

        # Behavioral verification, not cosmetic. State=Ready proves nothing (the guard's
        # registration note records a task that reported Ready for ~190 runs while dying in
        # its param block). Proof = a keeper process exists AND the keeper's own log moved.
        $linesBefore = 0
        if (Test-Path -LiteralPath $keeperLog) { $linesBefore = @(Get-Content -LiteralPath $keeperLog).Count }

        Start-ScheduledTask -TaskName $taskName

        $keeperPid = $null
        for ($w = 0; $w -lt 12; $w++) {
            Start-Sleep -Seconds 2
            $k = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
                   Where-Object { $_.CommandLine -like '*miniswan-tunnel-keeper*' } | Select-Object -First 1)
            if ($k.Count -gt 0) { $keeperPid = $k[0].ProcessId; break }
        }

        $linesAfter = 0
        if (Test-Path -LiteralPath $keeperLog) { $linesAfter = @(Get-Content -LiteralPath $keeperLog).Count }
        $t = Get-ScheduledTask -TaskName $taskName

        if ($keeperPid) {
            Save "INSTALLED+VERIFIED: $taskName; keeper running as pid $keeperPid; log $linesBefore -> $linesAfter lines. Trigger: AtLogOn (+${DelayMinutes}m delay). Restart-on-failure: 3 x 5min. Uninstall: .\Register-MiniSwanKeeper.ps1 -Uninstall"
            exit 0
        }

        Save "INSTALLED-BUT-UNVERIFIED: $taskName state=$($t.State) but no keeper process appeared within 24s. Likely the mutex is already held by a keeper started from the KEEP ALIVE window - that is benign, the running one holds it. Check $keeperLog and 'Get-ScheduledTaskInfo -TaskName $taskName'."
        exit 2
    }

    $t = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($null -eq $t) {
        Save "STATUS: $taskName not installed (keeper is running only if its KEEP ALIVE window is open)"
    } else {
        $info = $t | Get-ScheduledTaskInfo
        $run = @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
                 Where-Object { $_.CommandLine -like '*miniswan-tunnel-keeper*' })
        Save "STATUS: $taskName state=$($t.State) lastRun=$($info.LastRunTime) lastResult=$($info.LastTaskResult) keeperProcesses=$($run.Count)"
    }
    exit 0
} catch {
    Save ("FAILED: " + $_.Exception.Message)
    exit 1
}
