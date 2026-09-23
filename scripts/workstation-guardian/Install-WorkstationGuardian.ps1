param([int]$IntervalMinutes = 60)

$ErrorActionPreference = 'Stop'
if ($IntervalMinutes -lt 15) { throw 'IntervalMinutes must be at least 15.' }

$target = 'C:\tmp\SwanWorkstationGuardian'
New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach ($name in @('WorkstationGuardian.psm1', 'Invoke-WorkstationGuardian.ps1', 'Run.ps1', 'config.json')) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $target $name) -Force
}

$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { throw "C# compiler not found: $compiler" }
$runnerExe = Join-Path $target 'HiddenRunner.exe'
& $compiler /nologo /target:winexe /optimize+ "/out:$runnerExe" (Join-Path $PSScriptRoot 'HiddenRunner.cs')
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $runnerExe)) {
  throw 'Failed to compile HiddenRunner.exe.'
}

$taskName = 'Swan Workstation Guardian'
$runner = Join-Path $target 'Run.ps1'
$powershell = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$taskCommand = "`"$runnerExe`" `"$powershell`" -NoP -NonI -EP Bypass -F `"$runner`""
& schtasks.exe /Create /TN $taskName /TR $taskCommand /SC MINUTE /MO $IntervalMinutes /RL LIMITED /F | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Failed to create scheduled task '$taskName'." }
& schtasks.exe /Run /TN $taskName | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Failed to start scheduled task '$taskName'." }

Write-Host "Installed $taskName at $target (every $IntervalMinutes minutes, hidden window)."
