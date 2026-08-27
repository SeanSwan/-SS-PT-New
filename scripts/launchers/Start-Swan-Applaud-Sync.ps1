# SwanStudios APPLAUD Sync Launcher
# Starts the local folder watcher that uploads stable Plaud/Applaud audio files
# to SwanStudios. Tokens are stored with Windows user-bound encryption.

param(
  [switch]$Headless,
  [switch]$NoLoginPrompt,
  [string]$WatchDir,
  [string]$ApiBaseUrl,
  [string]$ApplaudAppPath,
  [int]$StableSeconds = 15,
  [int]$LookbackHours = 36,
  [int]$ScanSeconds = 15
)

$ErrorActionPreference = "Stop"

function Resolve-SwanRepoRoot {
  # Script-relative only. The hardcoded absolute path was one machine's account,
  # was never reached even there (the relative candidate always won), and was wrong
  # everywhere else. SWAN_REPO_ROOT is the override.
  $candidates = @(
    (Join-Path $PSScriptRoot "..\.."),
    $env:SWAN_REPO_ROOT
  ) | Where-Object { $_ }

  foreach ($candidate in $candidates) {
    $resolved = Resolve-Path $candidate -ErrorAction SilentlyContinue
    if ($resolved) {
      $agent = Join-Path $resolved.Path "scripts\applaud-sync\swan-applaud-sync.mjs"
      if (Test-Path -LiteralPath $agent) {
        return $resolved.Path
      }
    }
  }

  throw "Could not find SwanStudios repo root."
}

function Write-LauncherLog {
  param([string]$Message, [string]$Level = "INFO")
  if (-not $script:LogPath) { return }
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$stamp] [$Level] $Message" | Add-Content -LiteralPath $script:LogPath -Encoding UTF8
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

function Save-EncryptedSecret {
  param([string]$Secret, [string]$Path)
  if ([string]::IsNullOrWhiteSpace($Secret)) { return }
  $secure = ConvertTo-SecureString $Secret -AsPlainText -Force
  $secure | ConvertFrom-SecureString | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Read-EncryptedSecret {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  try {
    $secure = Get-Content -LiteralPath $Path -Raw | ConvertTo-SecureString
    return Convert-SecureStringToPlainText $secure
  } catch {
    Write-LauncherLog "Could not read encrypted secret at $Path" "WARN"
    return $null
  }
}

function Get-DefaultWatchDir {
  $plaudDir = Join-Path $env:USERPROFILE "Documents\Plaud Recordings"
  if (Test-Path -LiteralPath $plaudDir) { return $plaudDir }
  return (Join-Path $env:USERPROFILE "Documents\APPLAUD")
}

function Get-DefaultPlaudAppPath {
  $candidate = Join-Path $env:LOCALAPPDATA "Programs\Plaud\Plaud.exe"
  if (Test-Path -LiteralPath $candidate) { return $candidate }
  return ""
}

function New-DefaultConfig {
  $chosenWatchDir = if ($WatchDir) { $WatchDir } else { Get-DefaultWatchDir }
  $chosenApiBaseUrl = if ($ApiBaseUrl) { $ApiBaseUrl } else { "https://sswanstudios.com" }
  $chosenAppPath = if ($ApplaudAppPath) { $ApplaudAppPath } else { Get-DefaultPlaudAppPath }
  return [pscustomobject]@{
    watchDir = $chosenWatchDir
    apiBaseUrl = $chosenApiBaseUrl
    applaudAppPath = $chosenAppPath
    stableSeconds = $StableSeconds
    lookbackHours = $LookbackHours
    scanSeconds = $ScanSeconds
  }
}

function Read-OrCreateConfig {
  param([string]$ConfigPath)

  if (Test-Path -LiteralPath $ConfigPath) {
    $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
    if ($WatchDir) { $config.watchDir = $WatchDir }
    if ($ApiBaseUrl) { $config.apiBaseUrl = $ApiBaseUrl }
    if ($ApplaudAppPath) { $config.applaudAppPath = $ApplaudAppPath }
    return $config
  }

  if ($Headless) {
    $config = New-DefaultConfig
    $config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
    Write-LauncherLog "Created headless config for $($config.watchDir)"
    return $config
  }

  $defaultConfig = New-DefaultConfig
  $watchDirInput = Read-Host "APPLAUD/Plaud recordings folder [$($defaultConfig.watchDir)]"
  if (-not [string]::IsNullOrWhiteSpace($watchDirInput)) { $defaultConfig.watchDir = $watchDirInput }

  $apiInput = Read-Host "Swan Studios API base [$($defaultConfig.apiBaseUrl)]"
  if (-not [string]::IsNullOrWhiteSpace($apiInput)) { $defaultConfig.apiBaseUrl = $apiInput }

  $appInput = Read-Host "Optional Plaud app .exe path [$($defaultConfig.applaudAppPath)]"
  if (-not [string]::IsNullOrWhiteSpace($appInput)) { $defaultConfig.applaudAppPath = $appInput }

  $defaultConfig | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
  return $defaultConfig
}

function Test-SwanToken {
  param([string]$ApiBaseUrl, [string]$Token)
  if ([string]::IsNullOrWhiteSpace($Token)) { return $false }
  try {
    $headers = @{ Authorization = "Bearer $Token" }
    $response = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/auth/validate-token" -Headers $headers -TimeoutSec 15
    return [bool]($response.success -or $response.valid -or $response.user)
  } catch {
    return $false
  }
}

function Refresh-AndStoreToken {
  param([string]$ApiBaseUrl, [string]$RefreshToken, [string]$TokenPath, [string]$RefreshTokenPath)
  if ([string]::IsNullOrWhiteSpace($RefreshToken)) { return $null }
  try {
    $body = @{ refreshToken = $RefreshToken } | ConvertTo-Json
    $response = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/api/auth/refresh-token" -ContentType "application/json" -Body $body -TimeoutSec 30
    if ($response.token) {
      Save-EncryptedSecret -Secret $response.token -Path $TokenPath
      if ($response.refreshToken) {
        Save-EncryptedSecret -Secret $response.refreshToken -Path $RefreshTokenPath
      }
      Write-LauncherLog "Refreshed Swan access token"
      return $response.token
    }
  } catch {
    Write-LauncherLog "Refresh token failed: $($_.Exception.Message)" "WARN"
  }
  return $null
}

function Get-QaAuthStateSecrets {
  param([string]$RepoRoot)
  $path = Join-Path $RepoRoot ".auth\sswan-prod-admin.json"
  if (-not (Test-Path -LiteralPath $path)) { return $null }
  try {
    $state = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    $origin = $state.origins | Where-Object { $_.origin -eq "https://sswanstudios.com" } | Select-Object -First 1
    if (-not $origin) { return $null }
    $token = ($origin.localStorage | Where-Object { $_.name -eq "token" } | Select-Object -First 1).value
    $refresh = ($origin.localStorage | Where-Object { $_.name -eq "refreshToken" } | Select-Object -First 1).value
    return [pscustomobject]@{ token = $token; refreshToken = $refresh }
  } catch {
    Write-LauncherLog "Could not read QA auth state: $($_.Exception.Message)" "WARN"
    return $null
  }
}

function Request-AndStoreToken {
  param([string]$ApiBaseUrl, [string]$TokenPath, [string]$RefreshTokenPath)

  if ($NoLoginPrompt -or $Headless) {
    throw "No valid Swan token available. Run this launcher once without -Headless, or refresh .auth\sswan-prod-admin.json."
  }

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

    Save-EncryptedSecret -Secret $response.token -Path $TokenPath
    if ($response.refreshToken) {
      Save-EncryptedSecret -Secret $response.refreshToken -Path $RefreshTokenPath
    }
    return $response.token
  } finally {
    $password = $null
  }
}

function Get-UsableToken {
  param(
    [string]$RepoRoot,
    [string]$ApiBaseUrl,
    [string]$TokenPath,
    [string]$RefreshTokenPath
  )

  $token = Read-EncryptedSecret -Path $TokenPath
  if (Test-SwanToken -ApiBaseUrl $ApiBaseUrl -Token $token) { return $token }

  $refreshToken = Read-EncryptedSecret -Path $RefreshTokenPath
  $token = Refresh-AndStoreToken -ApiBaseUrl $ApiBaseUrl -RefreshToken $refreshToken -TokenPath $TokenPath -RefreshTokenPath $RefreshTokenPath
  if (Test-SwanToken -ApiBaseUrl $ApiBaseUrl -Token $token) { return $token }

  $qaSecrets = Get-QaAuthStateSecrets -RepoRoot $RepoRoot
  if ($qaSecrets) {
    if (Test-SwanToken -ApiBaseUrl $ApiBaseUrl -Token $qaSecrets.token) {
      Save-EncryptedSecret -Secret $qaSecrets.token -Path $TokenPath
      if ($qaSecrets.refreshToken) { Save-EncryptedSecret -Secret $qaSecrets.refreshToken -Path $RefreshTokenPath }
      return $qaSecrets.token
    }
    $token = Refresh-AndStoreToken -ApiBaseUrl $ApiBaseUrl -RefreshToken $qaSecrets.refreshToken -TokenPath $TokenPath -RefreshTokenPath $RefreshTokenPath
    if (Test-SwanToken -ApiBaseUrl $ApiBaseUrl -Token $token) { return $token }
  }

  return Request-AndStoreToken -ApiBaseUrl $ApiBaseUrl -TokenPath $TokenPath -RefreshTokenPath $RefreshTokenPath
}

try {
  $repoRoot = Resolve-SwanRepoRoot
  $agentPath = Join-Path $repoRoot "scripts\applaud-sync\swan-applaud-sync.mjs"
  $localRoot = Join-Path $env:LOCALAPPDATA "SwanStudios\applaud-sync"
  $configPath = Join-Path $localRoot "config.json"
  $tokenPath = Join-Path $localRoot "swan-token.txt"
  $refreshTokenPath = Join-Path $localRoot "swan-refresh-token.txt"
  $statePath = Join-Path $localRoot "state.json"
  $script:LogPath = Join-Path $localRoot "launcher.log"

  New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
  Write-LauncherLog "Launcher start (headless=$Headless)"
  $config = Read-OrCreateConfig -ConfigPath $configPath

  if (-not (Test-Path -LiteralPath $config.watchDir)) {
    New-Item -ItemType Directory -Force -Path $config.watchDir | Out-Null
    Write-LauncherLog "Created watch folder: $($config.watchDir)" "WARN"
  }

  if (-not $Headless -and $config.applaudAppPath -and (Test-Path -LiteralPath $config.applaudAppPath)) {
    Write-Host "Opening Plaud app..." -ForegroundColor Cyan
    Start-Process -FilePath $config.applaudAppPath
  }

  $token = Get-UsableToken -RepoRoot $repoRoot -ApiBaseUrl $config.apiBaseUrl -TokenPath $tokenPath -RefreshTokenPath $refreshTokenPath
  $node = Get-Command node -ErrorAction Stop
  $env:SWAN_AUTH_TOKEN = $token
  $env:SWAN_API_BASE_URL = $config.apiBaseUrl
  $env:APPLAUD_SYNC_DIR = $config.watchDir

  Write-LauncherLog "Starting local upload bridge for $($config.watchDir)"
  if (-not $Headless) {
    Write-Host "Starting Swan APPLAUD sync bridge..." -ForegroundColor Green
    Write-Host "Watch folder: $($config.watchDir)"
    Write-Host "Nothing is deleted locally. Close this window or press Ctrl+C to stop."
  }

  & $node.Source $agentPath `
    --watch-dir $config.watchDir `
    --api-base-url $config.apiBaseUrl `
    --state-path $statePath `
    --stable-ms ([int]$config.stableSeconds * 1000) `
    --lookback-hours $config.lookbackHours `
    --scan-interval-ms ([int]$config.scanSeconds * 1000)
} catch {
  Write-LauncherLog "Swan APPLAUD sync could not start: $($_.Exception.Message)" "ERROR"
  if (-not $Headless) {
    Write-Host ""
    Write-Host "Swan APPLAUD sync could not start:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close"
  }
  exit 1
}
