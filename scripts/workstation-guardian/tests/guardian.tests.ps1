$ErrorActionPreference = 'Stop'

$modulePath = Join-Path $PSScriptRoot '..\WorkstationGuardian.psm1'
$configPath = Join-Path $PSScriptRoot '..\config.json'

Import-Module $modulePath -Force
$config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw "ASSERT TRUE FAILED: $Message" }
}

function Assert-False([bool]$Condition, [string]$Message) {
  if ($Condition) { throw "ASSERT FALSE FAILED: $Message" }
}

function Assert-Equal($Actual, $Expected, [string]$Message) {
  if ($Actual -ne $Expected) {
    throw "ASSERT EQUAL FAILED: $Message. Expected '$Expected', got '$Actual'."
  }
}

Assert-Equal $config.glm.maxOutputTokens 34000 'GLM output ceiling is fail-closed at 34K'
Assert-Equal $config.glm.preferredModels[0] 'glm-5.3-flash' 'Flash is the first GLM seat'
Assert-Equal $config.glm.preferredModels[1] 'glm-5.3' 'Full GLM is the secondary seat'
Assert-Equal $config.glm.reviewRoundLimit 15 'GLM owner checkpoint is measured in review rounds'

$scheduledBackupPath = Join-Path $PSScriptRoot '..\hermes2-scheduled-state-backup.ps1'
$scheduledBackup = Get-Content -Raw -LiteralPath $scheduledBackupPath
Assert-False ([regex]::IsMatch($scheduledBackup, '(?im)&\s*wsl\.exe\s+--terminate')) 'nightly backup never terminates the entire WSL distro'
Assert-True ($scheduledBackup -match 'hermes2-gateway-bg-stop\.sh') 'nightly backup quiesces only the Hermes gateway'
Assert-True ($scheduledBackup -match 'hermes_cli\\\.main gateway run') 'nightly backup recognizes the alternate Hermes gateway command form'

$idle = Test-GuardianBusyState -RunningProcessNames @('explorer', 'brave') -GpuUtilizationPct 8 -CpuUtilizationPct 22 -Config $config
Assert-False $idle.Busy 'ordinary desktop use is not classified as gaming/rendering'

$game = Test-GuardianBusyState -RunningProcessNames @('Overwatch', 'Battle.net') -GpuUtilizationPct 12 -CpuUtilizationPct 30 -Config $config
Assert-True $game.Busy 'known game process defers maintenance'
Assert-True ($game.Reasons -contains 'game:overwatch') 'game reason is recorded'

$gpu = Test-GuardianBusyState -RunningProcessNames @('explorer') -GpuUtilizationPct 76 -CpuUtilizationPct 20 -Config $config
Assert-True $gpu.Busy 'high GPU usage defers maintenance'

$render = Test-GuardianBusyState -RunningProcessNames @('ComfyUI') -GpuUtilizationPct 20 -CpuUtilizationPct 20 -Config $config
Assert-True $render.Busy 'known rendering process defers maintenance'

$orphan = [pscustomobject]@{
  Name = 'tail'
  ParentState = 'Missing'
  ChildCount = 0
  AgeMinutes = 300
}
Assert-True (Test-SafeOrphanCandidate -Candidate $orphan -Config $config) 'old childless allowlisted orphan is remediable'

$liveParent = $orphan.PSObject.Copy()
$liveParent.ParentState = 'Live'
Assert-False (Test-SafeOrphanCandidate -Candidate $liveParent -Config $config) 'live-parent process is never reaped'

$hasChild = $orphan.PSObject.Copy()
$hasChild.ChildCount = 1
Assert-False (Test-SafeOrphanCandidate -Candidate $hasChild -Config $config) 'process with a child is never reaped'

$tooYoung = $orphan.PSObject.Copy()
$tooYoung.AgeMinutes = 5
Assert-False (Test-SafeOrphanCandidate -Candidate $tooYoung -Config $config) 'young process is never reaped'

$notAllowlisted = $orphan.PSObject.Copy()
$notAllowlisted.Name = 'node'
Assert-False (Test-SafeOrphanCandidate -Candidate $notAllowlisted -Config $config) 'non-allowlisted process is never reaped'

Assert-Equal (Get-GuardianDecision -BusyState $game).Action 'Defer' 'busy state blocks maintenance'
Assert-Equal (Get-GuardianDecision -BusyState $idle).Action 'Inspect' 'idle state permits inspection'

Write-Host 'guardian.tests.ps1: PASS'
