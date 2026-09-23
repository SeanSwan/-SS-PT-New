param(
  [string]$BackupRoot = 'Z:\HermesBackups\portable',
  [string]$CredentialPath = "$env:APPDATA\Hermes2\backup-passphrase.dpapi",
  [int]$RetentionDays = 14,
  [string]$Distro = 'Ubuntu-22.04'
)
$ErrorActionPreference = 'Stop'
$GuardianRoot = 'C:\tmp\SwanWorkstationGuardian'
$GateLog = 'C:\tmp\hermes2-scheduled-backup-gate.log'
$GatewayProcessPattern = '(hermes gateway run|hermes_cli\.main gateway run)'

try {
  Import-Module (Join-Path $GuardianRoot 'WorkstationGuardian.psm1') -Force
  $guardianConfig = Get-Content -Raw -LiteralPath (Join-Path $GuardianRoot 'config.json') | ConvertFrom-Json
  $busyState = Get-CurrentGuardianBusyState -Config $guardianConfig
  if ($busyState.Busy) {
    "$(Get-Date -Format o) deferred reasons=$($busyState.Reasons -join ',')" | Add-Content -LiteralPath $GateLog
    exit 0
  }
} catch {
  "$(Get-Date -Format o) blocked gateError=$($_.Exception.Message)" | Add-Content -LiteralPath $GateLog
  exit 0
}

function Convert-ToWslPath([string]$Path) {
  $full = [IO.Path]::GetFullPath($Path)
  if ($full -notmatch '^([A-Za-z]):\\(.*)$') { throw "Only Windows drive paths are supported: $full" }
  return "/mnt/$($matches[1].ToLowerInvariant())/$($matches[2] -replace '\\','/')"
}

function SecureToPlain([securestring]$Secure) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

if (-not (Test-Path -LiteralPath $CredentialPath)) {
  throw 'Missing DPAPI backup passphrase. Run C:\tmp\hermes2-save-backup-passphrase.ps1 first.'
}
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$logRoot = Join-Path $BackupRoot 'scheduled-logs'
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $logRoot "hermes2-scheduled-state-$stamp.log"
Start-Transcript -Path $logFile -Force | Out-Null

$gatewayWasRunning = $false
$pass = $null
$payload = $null
try {
  Write-Host "Started: $(Get-Date -Format o)"
  $probe = & wsl.exe -d $Distro -- bash /mnt/c/tmp/hermes2-gateway-process-check.sh
  if ($LASTEXITCODE -ne 0) { throw 'Failed to inspect Hermes gateway before backup.' }
  $gatewayWasRunning = ($probe -match $GatewayProcessPattern)

  if ($gatewayWasRunning) {
    & wsl.exe -d $Distro -- bash /mnt/c/tmp/hermes2-gateway-bg-stop.sh | Write-Host
    if ($LASTEXITCODE -ne 0) { throw 'Failed to stop Hermes gateway for backup.' }

    $postStopProbe = & wsl.exe -d $Distro -- bash /mnt/c/tmp/hermes2-gateway-process-check.sh
    if ($LASTEXITCODE -ne 0) { throw 'Failed to verify Hermes gateway stopped for backup.' }
    if ($postStopProbe -match $GatewayProcessPattern) {
      throw 'Hermes gateway remained active after the backup stop request.'
    }
    Write-Host 'Hermes gateway quiesced; interactive WSL sessions were left running.'
  }

  $secure = Get-Content -Raw -LiteralPath $CredentialPath | ConvertTo-SecureString
  $pass = SecureToPlain $secure
  if ([string]::IsNullOrWhiteSpace($pass)) { throw 'Recovered DPAPI passphrase was empty.' }

  $destination = Join-Path $BackupRoot "hermes2-state-$stamp"
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  $payload = $pass + "`n" + (Convert-ToWslPath $destination) + "`nfalse`n`n"
  $payload | & wsl.exe -d $Distro -- bash /mnt/c/tmp/hermes2-portable-backup.sh
  if ($LASTEXITCODE -ne 0) { throw 'Scheduled Hermes state backup failed.' }

  if ($RetentionDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -LiteralPath $BackupRoot -Directory -Filter 'hermes2-state-*' -ErrorAction SilentlyContinue |
      Where-Object { $_.LastWriteTime -lt $cutoff } |
      ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
  }
  Write-Host "Scheduled backup completed: $destination"
} finally {
  if ($gatewayWasRunning) {
    & wsl.exe -d $Distro -- bash /mnt/c/tmp/hermes2-gateway-bg-start.sh | Write-Host
    if ($LASTEXITCODE -ne 0) { throw 'Failed to restart Hermes gateway after backup.' }

    $postStartProbe = & wsl.exe -d $Distro -- bash /mnt/c/tmp/hermes2-gateway-process-check.sh
    if ($LASTEXITCODE -ne 0) { throw 'Failed to verify Hermes gateway restart after backup.' }
    if ($postStartProbe -notmatch $GatewayProcessPattern) {
      throw 'Hermes gateway restart verification failed after backup.'
    }
  }
  $pass = $null
  $payload = $null
  Write-Host "Finished: $(Get-Date -Format o)"
  Stop-Transcript | Out-Null
}
