# SwanStudios APPLAUD Sync Launcher
# Double-click/run this launcher to open APPLAUD and start the Swan Coach sync bridge.
# The Swan token is stored with Windows user-bound encryption, not plaintext.

$ErrorActionPreference = "Stop"

function Resolve-SwanRepoRoot {
  $candidates = @(
    (Join-Path $PSScriptRoot "..\.."),
    "C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT"
  )

  foreach ($candidate in $candidates) {
    $resolved = Resolve-Path $candidate -ErrorAction SilentlyContinue
    if ($resolved) {
      $agent = Join-Path $resolved.Path "scripts\applaud-sync\swan-applaud-sync.mjs"
      if (Test-Path -LiteralPath $agent) {
        return $resolved.Path
      }
    }
  }

  throw "Could not find SwanStudios repo root. Keep this launcher inside the repo or update Resolve-SwanRepoRoot."
}

function Convert-SecureStringToPlainText {
  param([System.Security.SecureString]$Secure)
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Read-OrCreateConfig {
  param([string]$ConfigPath)

  if (Test-Path -LiteralPath $ConfigPath) {
    return Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
  }

  $defaultWatchDir = Join-Path $env:USERPROFILE "Documents\APPLAUD"
  $watchDir = Read-Host "APPLAUD synced recordings folder [$defaultWatchDir]"
  if ([string]::IsNullOrWhiteSpace($watchDir)) { $watchDir = $defaultWatchDir }

  $apiBaseUrl = Read-Host "Swan Studios API base [https://sswanstudios.com]"
  if ([string]::IsNullOrWhiteSpace($apiBaseUrl)) { $apiBaseUrl = "https://sswanstudios.com" }

  $applaudAppPath = Read-Host "Optional APPLAUD app .exe path (blank to skip auto-open)"

  $config = [pscustomobject]@{
    watchDir = $watchDir
    apiBaseUrl = $apiBaseUrl
    applaudAppPath = $applaudAppPath
    stableSeconds = 15
    lookbackHours = 36
    scanSeconds = 15
  }
  $config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
  return $config
}

function Test-SwanToken {
  param([string]$ApiBaseUrl, [string]$Token)
  try {
    $headers = @{ Authorization = "Bearer $Token" }
    $response = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/auth/validate-token" -Headers $headers -TimeoutSec 15
    return [bool]($response.success -or $response.valid -or $response.user)
  } catch {
    return $false
  }
}

function Request-AndStoreToken {
  param([string]$ApiBaseUrl, [string]$TokenPath)

  Write-Host "Swan login is needed once so the sync bridge can upload as you." -ForegroundColor Cyan
  $username = Read-Host "Swan username/email"
  $passwordSecure = Read-Host "Swan password" -AsSecureString
  $password = Convert-SecureStringToPlainText $passwordSecure

  try {
    $body = @{ username = $username; password = $password } | ConvertTo-Json
    $response = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/api/auth/login" -ContentType "application/json" -Body $body -TimeoutSec 30
    if (-not $response.success -or -not $response.token) {
      throw "Login did not return a usable access token."
    }
    if ($response.forcePasswordChange) {
      throw "This account requires a password change before local sync can run."
    }

    $secureToken = ConvertTo-SecureString $response.token -AsPlainText -Force
    $secureToken | ConvertFrom-SecureString | Set-Content -LiteralPath $TokenPath -Encoding UTF8
    return $response.token
  } finally {
    $password = $null
  }
}

function Read-StoredToken {
  param([string]$TokenPath)
  if (-not (Test-Path -LiteralPath $TokenPath)) { return $null }
  try {
    $secure = Get-Content -LiteralPath $TokenPath -Raw | ConvertTo-SecureString
    return Convert-SecureStringToPlainText $secure
  } catch {
    return $null
  }
}

try {
  $repoRoot = Resolve-SwanRepoRoot
  $agentPath = Join-Path $repoRoot "scripts\applaud-sync\swan-applaud-sync.mjs"
  $localRoot = Join-Path $env:LOCALAPPDATA "SwanStudios\applaud-sync"
  $configPath = Join-Path $localRoot "config.json"
  $tokenPath = Join-Path $localRoot "swan-token.txt"
  $statePath = Join-Path $localRoot "state.json"

  New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
  $config = Read-OrCreateConfig -ConfigPath $configPath

  if (-not (Test-Path -LiteralPath $config.watchDir)) {
    New-Item -ItemType Directory -Force -Path $config.watchDir | Out-Null
    Write-Host "Created watch folder: $($config.watchDir)" -ForegroundColor Yellow
  }

  if ($config.applaudAppPath -and (Test-Path -LiteralPath $config.applaudAppPath)) {
    Write-Host "Opening APPLAUD app..." -ForegroundColor Cyan
    Start-Process -FilePath $config.applaudAppPath
  } elseif ($config.applaudAppPath) {
    Write-Host "Configured APPLAUD app path was not found: $($config.applaudAppPath)" -ForegroundColor Yellow
  }

  $token = Read-StoredToken -TokenPath $tokenPath
  if (-not $token -or -not (Test-SwanToken -ApiBaseUrl $config.apiBaseUrl -Token $token)) {
    $token = Request-AndStoreToken -ApiBaseUrl $config.apiBaseUrl -TokenPath $tokenPath
  }

  $node = Get-Command node -ErrorAction Stop
  $env:SWAN_AUTH_TOKEN = $token
  $env:SWAN_API_BASE_URL = $config.apiBaseUrl
  $env:APPLAUD_SYNC_DIR = $config.watchDir

  Write-Host "Starting Swan APPLAUD sync bridge..." -ForegroundColor Green
  Write-Host "Watch folder: $($config.watchDir)"
  Write-Host "Nothing is deleted locally. Close this window or press Ctrl+C to stop."

  & $node.Source $agentPath `
    --watch-dir $config.watchDir `
    --api-base-url $config.apiBaseUrl `
    --state-path $statePath `
    --stable-ms ([int]$config.stableSeconds * 1000) `
    --lookback-hours $config.lookbackHours `
    --scan-interval-ms ([int]$config.scanSeconds * 1000)
} catch {
  Write-Host ""
  Write-Host "Swan APPLAUD sync could not start:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ""
  Read-Host "Press Enter to close"
}
