# SwanStudios Applaud Automation Supervisor
# Starts the full Applaud cloud poller plus the Swan local uploader bridge.
# Intended for Windows Startup or Task Scheduler; writes logs under LOCALAPPDATA.

param(
  # Defaults derive from this script's own location (it lives at <repo>\scripts\launchers),
  # so the launcher works on any checkout, on any machine. Pass -SwanRepoRoot to override.
  [string]$SwanRepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')),
  [string]$ApplaudRepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\applaud')),
  [switch]$SkipApplaudPoller,
  [switch]$SkipSwanUploader,
  [switch]$Visible
)

$ErrorActionPreference = "Stop"

function New-Dir {
  param([string]$Path)
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Write-AutomationLog {
  param([string]$Message, [string]$Level = "INFO")
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$stamp] [$Level] $Message" | Add-Content -LiteralPath $script:LogPath -Encoding UTF8
}

function Test-ProcessCommandLine {
  param([string]$Pattern)
  $matches = Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -and $_.CommandLine -match $Pattern }
  return @($matches).Count -gt 0
}

function Get-ApplaudSettings {
  $settingsPath = Join-Path $env:APPDATA "applaud\settings.json"
  if (-not (Test-Path -LiteralPath $settingsPath)) { return $null }
  try {
    return Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
  } catch {
    Write-AutomationLog "Could not parse Applaud settings: $($_.Exception.Message)" "WARN"
    return $null
  }
}

function Test-PortListening {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  return @($conn).Count -gt 0
}

function Resolve-PnpmCommand {
  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($pnpm) { return "pnpm" }
  $corepack = Get-Command corepack -ErrorAction SilentlyContinue
  if ($corepack) { return "corepack pnpm" }
  throw "Neither pnpm nor corepack is available on PATH."
}

function Start-ApplaudPoller {
  if (-not (Test-Path -LiteralPath $ApplaudRepoRoot)) {
    throw "Applaud repo not found at $ApplaudRepoRoot"
  }

  $settings = Get-ApplaudSettings
  $port = if ($settings -and $settings.bind -and $settings.bind.port) { [int]$settings.bind.port } else { 44471 }

  if (Test-PortListening -Port $port) {
    Write-AutomationLog "Applaud already listening on port $port"
    return
  }

  if (Test-ProcessCommandLine "quick-pt\\applaud[\s\S]*server\\dist\\index\.js") {
    Write-AutomationLog "Applaud process appears to already be running"
    return
  }

  $dist = Join-Path $ApplaudRepoRoot "server\dist\index.js"
  $scriptName = if (Test-Path -LiteralPath $dist) { "start:nobuild" } else { "start" }
  $pnpmCommand = Resolve-PnpmCommand
  $outLog = Join-Path $script:LogRoot "applaud-poller.out.log"
  $errLog = Join-Path $script:LogRoot "applaud-poller.err.log"
  $cmd = "$pnpmCommand $scriptName >> `"$outLog`" 2>> `"$errLog`""
  $window = if ($Visible) { "Normal" } else { "Hidden" }

  Write-AutomationLog "Starting Applaud poller with $pnpmCommand $scriptName"
  Start-Process -FilePath "cmd.exe" `
    -ArgumentList @("/d", "/c", $cmd) `
    -WorkingDirectory $ApplaudRepoRoot `
    -WindowStyle $window | Out-Null

  Start-Sleep -Seconds 5
  if (Test-PortListening -Port $port) {
    Write-AutomationLog "Applaud poller is listening on port $port"
  } else {
    Write-AutomationLog "Applaud poller did not open port $port yet; inspect $errLog" "WARN"
  }
}

function Get-SwanUploaderConfig {
  $configPath = Join-Path $env:LOCALAPPDATA "SwanStudios\applaud-sync\config.json"
  if (-not (Test-Path -LiteralPath $configPath)) { return $null }
  try {
    return Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
  } catch {
    Write-AutomationLog "Could not parse Swan uploader config: $($_.Exception.Message)" "WARN"
    return $null
  }
}

function Write-DuplicatePathWarning {
  $settings = Get-ApplaudSettings
  if ($settings -and $settings.webhook -and $settings.webhook.enabled) {
    Write-AutomationLog "Applaud webhook is enabled while Swan local uploader is active. Disable one path to avoid duplicate clips." "WARN"
  }
}

function Start-SwanUploader {
  $launcher = Join-Path $SwanRepoRoot "scripts\launchers\Start-Swan-Applaud-Sync.ps1"
  if (-not (Test-Path -LiteralPath $launcher)) {
    throw "Swan uploader launcher not found at $launcher"
  }

  if (Test-ProcessCommandLine "swan-applaud-sync\.mjs") {
    Write-AutomationLog "Swan local uploader already running"
    return
  }

  $config = Get-SwanUploaderConfig
  $watchDir = if ($config -and $config.watchDir) {
    $config.watchDir
  } else {
    $settings = Get-ApplaudSettings
    if ($settings -and $settings.recordingsDir) {
      $settings.recordingsDir
    } else {
      Join-Path $env:USERPROFILE "Documents\Plaud Recordings"
    }
  }

  Write-DuplicatePathWarning
  $window = if ($Visible) { "Normal" } else { "Hidden" }
  $args = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "`"$launcher`"",
    "-Headless",
    "-NoLoginPrompt",
    "-WatchDir",
    "`"$watchDir`""
  )

  Write-AutomationLog "Starting Swan local uploader for $watchDir"
  Start-Process -FilePath "powershell.exe" `
    -ArgumentList $args `
    -WorkingDirectory $SwanRepoRoot `
    -WindowStyle $window | Out-Null
}

try {
  $script:LogRoot = Join-Path $env:LOCALAPPDATA "SwanStudios\applaud-automation"
  New-Dir -Path $script:LogRoot
  $script:LogPath = Join-Path $script:LogRoot "automation.log"
  Write-AutomationLog "Supervisor start"

  if (-not $SkipApplaudPoller) {
    Start-ApplaudPoller
  }

  if (-not $SkipSwanUploader) {
    Start-SwanUploader
  }

  Write-AutomationLog "Supervisor complete"
} catch {
  Write-AutomationLog "Supervisor failed: $($_.Exception.Message)" "ERROR"
  if ($Visible) {
    Write-Host "Swan Applaud automation failed: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to close"
  }
  exit 1
}
