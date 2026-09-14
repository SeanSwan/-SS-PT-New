# SwanStudios Official PLAUD Autostart Installer
# Wires Windows Startup to the official @plaud-ai/cli sync launcher.

param(
  # Defaults derive from this script's own location (it lives at <repo>\scripts\launchers),
  # so the launcher works on any checkout, on any machine. Pass -SwanRepoRoot to override.
  [string]$SwanRepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')),
  [string]$ApiBaseUrl = "https://sswanstudios.com",
  [int]$Days = 7,
  [int]$PollSeconds = 300,
  [switch]$KeepApplaudFallback,
  [switch]$StartNow
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[Swan Plaud Official] $Message"
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

function Normalize-ApiBaseUrl {
  param([AllowNull()][string]$Value)
  $raw = if ([string]::IsNullOrWhiteSpace($Value)) { "https://sswanstudios.com" } else { $Value.Trim() }
  try { $uri = [System.Uri]::new($raw) } catch { throw "apiBaseUrl must be a valid absolute URL." }
  $apiHost = $uri.Host.ToLowerInvariant()
  $isLocalhostHost = $apiHost -eq "localhost"
  $isSwanHost = $apiHost -eq "sswanstudios.com"
  $isLocalhostHttp = $uri.Scheme -eq "http" -and $isLocalhostHost
  if ($uri.UserInfo -or $uri.Query -or $uri.Fragment -or ($uri.AbsolutePath -and $uri.AbsolutePath -ne "/")) {
    throw "apiBaseUrl must be an origin URL."
  }
  if ($uri.Scheme -ne "https" -and -not $isLocalhostHttp) {
    throw "apiBaseUrl must be HTTPS, except localhost development."
  }
  if (-not $isLocalhostHost -and -not $isSwanHost) {
    throw "apiBaseUrl host must be sswanstudios.com or localhost."
  }
  if ($isSwanHost -and $uri.Port -ne 443) {
    throw "apiBaseUrl production origin must use the default HTTPS port."
  }
  return $uri.GetLeftPart([System.UriPartial]::Authority)
}

function Write-Config {
  $localRoot = Join-Path $env:LOCALAPPDATA "SwanStudios\plaud-official-sync"
  Ensure-Directory -Path $localRoot
  $configPath = Join-Path $localRoot "config.json"
  $config = [pscustomobject]@{
    apiBaseUrl = $ApiBaseUrl
    days = $Days
    pollSeconds = $PollSeconds
    source = "plaud_official_sync"
  }
  Write-Utf8NoBom -Path $configPath -Value ($config | ConvertTo-Json -Depth 4)
  Write-Step "Wrote official PLAUD sync config: $configPath"
}

function Disable-ApplaudFallbackStartup {
  if ($KeepApplaudFallback) {
    Write-Step "Keeping Applaud fallback Startup entry by request."
    return
  }
  $startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
  $names = @("Start-Swan-Applaud-Automation.cmd", "Start-Swan-Applaud-Sync.lnk")
  foreach ($name in $names) {
    $path = Join-Path $startup $name
    if (-not (Test-Path -LiteralPath $path)) { continue }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $disabled = Join-Path $startup "$name.disabled-$stamp"
    Move-Item -LiteralPath $path -Destination $disabled
    Write-Step "Disabled Applaud fallback Startup entry: $disabled"
  }
}

function Write-StartupCommand {
  $startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
  Ensure-Directory -Path $startup
  $launcher = Join-Path $SwanRepoRoot "scripts\launchers\Start-Swan-Plaud-Official-Sync.ps1"
  if (-not (Test-Path -LiteralPath $launcher)) { throw "Official PLAUD launcher not found at $launcher" }

  $cmdPath = Join-Path $startup "Start-Swan-Plaud-Official-Sync.cmd"
  $lines = @(
    "@echo off",
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$launcher`" -Headless -NoLoginPrompt -ApiBaseUrl `"$ApiBaseUrl`" -Days $Days -PollSeconds $PollSeconds"
  )
  $lines | Set-Content -LiteralPath $cmdPath -Encoding ASCII
  Write-Step "Installed Windows Startup command: $cmdPath"
}

function Start-OfficialSyncNow {
  if (-not $StartNow) { return }
  $launcher = Join-Path $SwanRepoRoot "scripts\launchers\Start-Swan-Plaud-Official-Sync.ps1"
  Write-Step "Starting official PLAUD sync now."
  $arguments = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "`"$launcher`"",
    "-Headless",
    "-NoLoginPrompt",
    "-ApiBaseUrl",
    "`"$ApiBaseUrl`"",
    "-Days",
    "$Days",
    "-PollSeconds",
    "$PollSeconds"
  )
  Start-Process -FilePath "powershell.exe" `
    -ArgumentList $arguments `
    -WorkingDirectory $SwanRepoRoot `
    -WindowStyle Hidden | Out-Null
}

if (-not (Test-Path -LiteralPath $SwanRepoRoot)) { throw "Swan repo not found: $SwanRepoRoot" }
$ApiBaseUrl = Normalize-ApiBaseUrl -Value $ApiBaseUrl
Write-Config
Disable-ApplaudFallbackStartup
Write-StartupCommand
Start-OfficialSyncNow
Write-Step "Official PLAUD autostart installation complete."
