# SwanStudios Applaud Autostart Installer
# Wires Windows Startup to the non-interactive automation supervisor.
# It does not store Swan credentials; run the sync launcher once if no token exists.

param(
  # Defaults derive from this script's own location (it lives at <repo>\scripts\launchers),
  # so the launcher works on any checkout, on any machine. Pass -SwanRepoRoot to override.
  [string]$SwanRepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')),
  [string]$ApplaudRepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\applaud')),
  [string]$WatchDir,
  [string]$ApiBaseUrl = "https://sswanstudios.com",
  [switch]$KeepApplaudWebhook,
  [switch]$StopLegacySync,
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[Swan Applaud] $Message"
}

function Ensure-Directory {
  param([string]$Path)
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Write-Utf8NoBom {
  param([string]$Path, [string]$Value)
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Value, $encoding)
}

function Get-DefaultWatchDir {
  $candidate = Join-Path $env:USERPROFILE "Documents\Plaud Recordings"
  if (Test-Path -LiteralPath $candidate) { return $candidate }
  return (Join-Path $env:USERPROFILE "Documents\APPLAUD")
}

function Get-PlaudAppPath {
  $candidate = Join-Path $env:LOCALAPPDATA "Programs\Plaud\Plaud.exe"
  if (Test-Path -LiteralPath $candidate) { return $candidate }
  return ""
}

function Write-SwanUploaderConfig {
  param([string]$TargetWatchDir)

  $syncRoot = Join-Path $env:LOCALAPPDATA "SwanStudios\applaud-sync"
  Ensure-Directory -Path $syncRoot
  Ensure-Directory -Path $TargetWatchDir

  $configPath = Join-Path $syncRoot "config.json"
  $existing = $null
  if (Test-Path -LiteralPath $configPath) {
    try { $existing = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json } catch { $existing = $null }
  }

  $config = [pscustomobject]@{
    watchDir = $TargetWatchDir
    apiBaseUrl = $ApiBaseUrl
    applaudAppPath = if ($existing -and $existing.applaudAppPath) { $existing.applaudAppPath } else { Get-PlaudAppPath }
    stableSeconds = if ($existing -and $existing.stableSeconds) { $existing.stableSeconds } else { 15 }
    lookbackHours = if ($existing -and $existing.lookbackHours) { $existing.lookbackHours } else { 36 }
    scanSeconds = if ($existing -and $existing.scanSeconds) { $existing.scanSeconds } else { 15 }
  }

  Write-Utf8NoBom -Path $configPath -Value ($config | ConvertTo-Json -Depth 4)
  Write-Step "Wrote Swan uploader config: $configPath"
}

function Disable-ApplaudWebhookIfNeeded {
  if ($KeepApplaudWebhook) {
    Write-Step "Keeping Applaud webhook enabled by request."
    return
  }

  $settingsPath = Join-Path $env:APPDATA "applaud\settings.json"
  if (-not (Test-Path -LiteralPath $settingsPath)) {
    Write-Step "Applaud settings not found; skipping webhook toggle."
    return
  }

  $settingsRaw = Get-Content -LiteralPath $settingsPath -Raw
  $backupPath = "$settingsPath.autostart-backup"
  if (-not (Test-Path -LiteralPath $backupPath)) {
    Copy-Item -LiteralPath $settingsPath -Destination $backupPath
  }
  $settings = $settingsRaw | ConvertFrom-Json
  if (-not $settings.setupComplete -or -not $settings.token) {
    throw "Refusing to modify Applaud settings because setup/token is missing. Open Applaud setup first."
  }
  if ($settings.webhook -and $settings.webhook.enabled) {
    $settings.webhook.enabled = $false
    Write-Utf8NoBom -Path $settingsPath -Value ($settings | ConvertTo-Json -Depth 20)
    Write-Step "Disabled Applaud direct webhook to avoid duplicate Swan clips."
  } else {
    Write-Step "Applaud direct webhook already disabled."
  }
}

function Disable-LegacyStartupShortcut {
  $startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
  $legacy = Join-Path $startup "Start-Swan-Applaud-Sync.lnk"
  if (-not (Test-Path -LiteralPath $legacy)) { return }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $disabled = Join-Path $startup "Start-Swan-Applaud-Sync.disabled-$stamp.lnk"
  Move-Item -LiteralPath $legacy -Destination $disabled
  Write-Step "Disabled old prompt-blocking Startup shortcut: $disabled"
}

function Stop-LegacySyncProcesses {
  if (-not $StopLegacySync) { return }
  $procs = Get-CimInstance Win32_Process |
    Where-Object {
      $_.CommandLine -and
      $_.CommandLine -match "Start-Swan-Applaud-Sync\.ps1" -and
      $_.CommandLine -notmatch "Start-Swan-Applaud-Automation"
    }

  foreach ($proc in $procs) {
    Write-Step "Stopping stale sync launcher process PID $($proc.ProcessId)."
    Stop-Process -Id $proc.ProcessId -Force
  }
}

function Write-StartupCommand {
  $startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
  Ensure-Directory -Path $startup
  $supervisor = Join-Path $SwanRepoRoot "scripts\launchers\Start-Swan-Applaud-Automation.ps1"
  if (-not (Test-Path -LiteralPath $supervisor)) {
    throw "Automation supervisor not found at $supervisor"
  }

  $cmdPath = Join-Path $startup "Start-Swan-Applaud-Automation.cmd"
  $lines = @(
    "@echo off",
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$supervisor`" -SwanRepoRoot `"$SwanRepoRoot`" -ApplaudRepoRoot `"$ApplaudRepoRoot`""
  )
  $lines | Set-Content -LiteralPath $cmdPath -Encoding ASCII
  Write-Step "Installed Windows Startup command: $cmdPath"
}

function Start-SupervisorNow {
  if (-not $StartNow) { return }
  $supervisor = Join-Path $SwanRepoRoot "scripts\launchers\Start-Swan-Applaud-Automation.ps1"
  Write-Step "Starting supervisor now."
  Start-Process -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$supervisor`"") `
    -WorkingDirectory $SwanRepoRoot `
    -WindowStyle Hidden | Out-Null
}

$targetWatchDir = if ($WatchDir) { $WatchDir } else { Get-DefaultWatchDir }
if (-not (Test-Path -LiteralPath $SwanRepoRoot)) { throw "Swan repo not found: $SwanRepoRoot" }
if (-not (Test-Path -LiteralPath $ApplaudRepoRoot)) { throw "Applaud repo not found: $ApplaudRepoRoot" }

Write-SwanUploaderConfig -TargetWatchDir $targetWatchDir
Disable-ApplaudWebhookIfNeeded
Disable-LegacyStartupShortcut
Stop-LegacySyncProcesses
Write-StartupCommand
Start-SupervisorNow
Write-Step "Autostart installation complete."
