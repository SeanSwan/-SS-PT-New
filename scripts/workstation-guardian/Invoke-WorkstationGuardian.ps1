param(
  [switch]$Enforce,
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'config.json'),
  [string]$LogPath = (Join-Path $env:LOCALAPPDATA 'WorkstationGuardian\guardian.log')
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'WorkstationGuardian.psm1') -Force
$config = Get-Content -Raw -LiteralPath $ConfigPath | ConvertFrom-Json
$logRoot = Split-Path -Parent $LogPath
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

if ((Test-Path -LiteralPath $LogPath) -and (Get-Item -LiteralPath $LogPath).Length -gt 2MB) {
  Move-Item -LiteralPath $LogPath -Destination "$LogPath.old" -Force
}

function Write-GuardianLog([string]$Message) {
  "$(Get-Date -Format o) $Message" | Add-Content -LiteralPath $LogPath
}

$mutex = [Threading.Mutex]::new($false, 'Local\SwanWorkstationGuardian')
$ownsMutex = $false
try {
  $ownsMutex = $mutex.WaitOne(0)
  if (-not $ownsMutex) { exit 0 }

  $busyState = Get-CurrentGuardianBusyState -Config $config
  $decision = Get-GuardianDecision -BusyState $busyState
  if ($decision.Action -eq 'Defer') {
    Write-GuardianLog "deferred reasons=$($decision.Reasons -join ',')"
    exit 0
  }

  $processes = @(Get-CimInstance Win32_Process -ErrorAction Stop)
  $byId = @{}
  $childCount = @{}
  foreach ($process in $processes) {
    $byId[[int]$process.ProcessId] = $process
    $parentId = [int]$process.ParentProcessId
    if (-not $childCount.ContainsKey($parentId)) { $childCount[$parentId] = 0 }
    $childCount[$parentId]++
  }

  $reaped = 0
  $candidates = 0
  foreach ($process in $processes) {
    $name = [IO.Path]::GetFileNameWithoutExtension([string]$process.Name)
    if (@($config.orphanPolicy.allowedProcessNames) -notcontains $name) { continue }

    $parent = $byId[[int]$process.ParentProcessId]
    $parentState = 'Live'
    if ($null -eq $parent) {
      $parentState = 'Missing'
    } elseif ($process.CreationDate -and $parent.CreationDate -and
      ([datetime]$parent.CreationDate -gt [datetime]$process.CreationDate)) {
      $parentState = 'Missing'
    }
    $created = if ($process.CreationDate) { [datetime]$process.CreationDate } else { Get-Date }
    $candidate = [pscustomobject]@{
      Name = $name
      ParentState = $parentState
      ChildCount = [int]($childCount[[int]$process.ProcessId])
      AgeMinutes = ((Get-Date) - $created).TotalMinutes
    }
    if (-not (Test-SafeOrphanCandidate -Candidate $candidate -Config $config)) { continue }
    $candidates++
    if ($Enforce) {
      Stop-Process -Id ([int]$process.ProcessId) -Force -ErrorAction Stop
      $reaped++
      Write-GuardianLog "reaped allowlisted orphan name=$name pid=$($process.ProcessId) ageMinutes=$([math]::Round($candidate.AgeMinutes))"
    } else {
      Write-GuardianLog "observed allowlisted orphan name=$name pid=$($process.ProcessId) ageMinutes=$([math]::Round($candidate.AgeMinutes))"
    }
  }

  $memory = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
  $freeGb = if ($memory) { [math]::Round($memory.FreePhysicalMemory / 1MB, 1) } else { -1 }
  Write-GuardianLog "complete enforce=$Enforce gpu=$($busyState.GpuUtilizationPct) cpu=$($busyState.CpuUtilizationPct) freeGB=$freeGb candidates=$candidates reaped=$reaped"
} catch {
  Write-GuardianLog "error=$($_.Exception.Message)"
  exit 1
} finally {
  if ($ownsMutex) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
