Set-StrictMode -Version Latest

function ConvertTo-GuardianProcessName {
  param([Parameter(Mandatory)][string]$Name)

  $leaf = [System.IO.Path]::GetFileName($Name)
  return [System.IO.Path]::GetFileNameWithoutExtension($leaf).ToLowerInvariant()
}

function Test-GuardianBusyState {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)][string[]]$RunningProcessNames,
    [Parameter(Mandatory)][double]$GpuUtilizationPct,
    [Parameter(Mandatory)][double]$CpuUtilizationPct,
    [Parameter(Mandatory)]$Config
  )

  $running = @($RunningProcessNames | ForEach-Object { ConvertTo-GuardianProcessName $_ })
  $reasons = [System.Collections.Generic.List[string]]::new()

  foreach ($name in @($Config.busyGate.gameProcesses)) {
    $normalized = ConvertTo-GuardianProcessName $name
    if ($running -contains $normalized) { $reasons.Add("game:$normalized") }
  }
  foreach ($name in @($Config.busyGate.renderProcesses)) {
    $normalized = ConvertTo-GuardianProcessName $name
    if ($running -contains $normalized) { $reasons.Add("render:$normalized") }
  }
  if ($GpuUtilizationPct -ge [double]$Config.busyGate.gpuUtilizationPercent) {
    $reasons.Add("gpu:$([math]::Round($GpuUtilizationPct, 1))")
  }
  if ($CpuUtilizationPct -ge [double]$Config.busyGate.cpuUtilizationPercent) {
    $reasons.Add("cpu:$([math]::Round($CpuUtilizationPct, 1))")
  }

  [pscustomobject]@{
    Busy = $reasons.Count -gt 0
    Reasons = @($reasons)
    GpuUtilizationPct = $GpuUtilizationPct
    CpuUtilizationPct = $CpuUtilizationPct
  }
}

function Test-SafeOrphanCandidate {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]$Candidate,
    [Parameter(Mandatory)]$Config
  )

  if (-not [bool]$Config.orphanPolicy.enabled) { return $false }
  $name = ConvertTo-GuardianProcessName ([string]$Candidate.Name)
  $allowed = @($Config.orphanPolicy.allowedProcessNames | ForEach-Object {
    ConvertTo-GuardianProcessName ([string]$_)
  })

  return (
    $allowed -contains $name -and
    [string]$Candidate.ParentState -eq 'Missing' -and
    [int]$Candidate.ChildCount -eq 0 -and
    [double]$Candidate.AgeMinutes -ge [double]$Config.orphanPolicy.minimumAgeMinutes
  )
}

function Get-GuardianDecision {
  [CmdletBinding()]
  param([Parameter(Mandatory)]$BusyState)

  if ([bool]$BusyState.Busy) {
    return [pscustomobject]@{ Action = 'Defer'; Reasons = @($BusyState.Reasons) }
  }
  return [pscustomobject]@{ Action = 'Inspect'; Reasons = @() }
}

function Get-GuardianGpuUtilization {
  $candidates = @(@(
      (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
      "$env:ProgramFiles\NVIDIA Corporation\NVSMI\nvidia-smi.exe"
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) })

  if ($candidates.Count -eq 0) { return $null }
  try {
    $raw = & $candidates[0] --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>$null
    $values = @($raw | ForEach-Object {
      $number = 0.0
      if ([double]::TryParse(([string]$_).Trim(), [ref]$number)) { $number }
    })
    if ($values.Count -eq 0) { return $null }
    return [math]::Round(($values | Measure-Object -Average).Average, 1)
  } catch {
    return $null
  }
}

function Get-CurrentGuardianBusyState {
  [CmdletBinding()]
  param([Parameter(Mandatory)]$Config)

  $processNames = @(Get-Process -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessName)
  $cpu = 0.0
  try {
    $cpu = [double](Get-CimInstance Win32_Processor -ErrorAction Stop |
      Measure-Object -Property LoadPercentage -Average).Average
  } catch {
    $cpu = 0.0
  }
  $gpu = Get-GuardianGpuUtilization
  if ($null -eq $gpu) { $gpu = 0.0 }

  return Test-GuardianBusyState -RunningProcessNames $processNames `
    -GpuUtilizationPct $gpu -CpuUtilizationPct $cpu -Config $Config
}

Export-ModuleMember -Function Test-GuardianBusyState, Test-SafeOrphanCandidate, `
  Get-GuardianDecision, Get-CurrentGuardianBusyState
