# SwanStudios Official PLAUD Sync Launcher
# Runs @plaud-ai/cli backed polling and uploads recordings to SwanStudios.

param(
  [switch]$Headless,
  [switch]$NoLoginPrompt,
  [switch]$Once,
  [switch]$DryRun,
  [string]$ApiBaseUrl = "https://sswanstudios.com",
  [int]$Days = 7,
  [int]$PollSeconds = 300
)

$ErrorActionPreference = "Stop"

function Resolve-SwanRepoRoot {
  # Script-relative first; SWAN_REPO_ROOT as the only override. The former hardcoded
  # absolute path was one machine's account and was never reached even there.
  $candidates = @((Join-Path $PSScriptRoot "..\.."), $env:SWAN_REPO_ROOT) | Where-Object { $_ }
  foreach ($candidate in $candidates) {
    $resolved = Resolve-Path $candidate -ErrorAction SilentlyContinue
    if ($resolved -and (Test-Path -LiteralPath (Join-Path $resolved.Path "scripts\plaud-official-sync\swan-plaud-official-sync.mjs"))) {
      return $resolved.Path
    }
  }
  throw "Could not find SwanStudios repo root."
}

function Write-LauncherLog {
  param([string]$Message, [string]$Level = "INFO")
  if (-not $script:LogPath) { return }
  $logDir = Split-Path -Parent $script:LogPath
  if ($logDir -and -not (Test-Path -LiteralPath $logDir)) {
    [System.IO.Directory]::CreateDirectory($logDir) | Out-Null
  }
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$stamp] [$Level] $Message" | Add-Content -LiteralPath $script:LogPath -Encoding UTF8
}

function Redact-LauncherText {
  param([AllowNull()][string]$Value)
  $text = [string]$Value
  $text = $text -replace '(https?://[^\s?"'']+)\?[^\s"'']+', '$1?[redacted]'
  $text = $text -replace '(https?://)[^/\s?#"'']+@', '$1[redacted]@'
  $text = $text -replace '\bBearer\s+[A-Za-z0-9._~+/=-]+', 'Bearer [redacted]'
  $text = $text -replace '\b(token|access_token|accessToken|refresh_token|refreshToken|secret|password)=([^\s&]+)', '$1=[redacted]'
  $text = $text -replace '(?i)("?(?:token|access_token|accessToken|refresh_token|refreshToken|secret|password)"?\s*[:=]\s*"?)[^",\s}]+', '${1}[redacted]'
  $text = $text -replace '\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b', '[redacted-token]'
  return $text
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

function Invoke-NativeCommand {
  param([string]$FilePath, [string[]]$Arguments)
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = @(& $FilePath @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    return [pscustomobject]@{
      Output = @($output | ForEach-Object { [string]$_ })
      ExitCode = $exitCode
    }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Convert-SecureStringToPlainText {
  param([System.Security.SecureString]$Secure)
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
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
    Write-LauncherLog "Could not read encrypted token at $Path" "WARN"
    return $null
  }
}

function Test-SwanToken {
  param([string]$Token)
  if ([string]::IsNullOrWhiteSpace($Token)) { return $false }
  try {
    $headers = @{ Authorization = "Bearer $Token" }
    $response = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/auth/validate-token" -Headers $headers -TimeoutSec 15
    return [bool]($response.success -or $response.valid -or $response.user)
  } catch { return $false }
}

function Refresh-AndStoreToken {
  param([string]$RefreshToken, [string]$TokenPath, [string]$RefreshTokenPath)
  if ([string]::IsNullOrWhiteSpace($RefreshToken)) { return $null }
  try {
    $body = @{ refreshToken = $RefreshToken } | ConvertTo-Json
    $response = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/api/auth/refresh-token" -ContentType "application/json" -Body $body -TimeoutSec 30
    if (-not $response.token) { return $null }
    Save-EncryptedSecret -Secret $response.token -Path $TokenPath
    if ($response.refreshToken) { Save-EncryptedSecret -Secret $response.refreshToken -Path $RefreshTokenPath }
    return $response.token
  } catch {
    Write-LauncherLog "Refresh token failed: $(Redact-LauncherText -Value $_.Exception.Message)" "WARN"
    return $null
  }
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
    Write-LauncherLog "Could not read QA auth state: $(Redact-LauncherText -Value $_.Exception.Message)" "WARN"
    return $null
  }
}

function Request-AndStoreToken {
  param([string]$TokenPath, [string]$RefreshTokenPath)
  if ($Headless -or $NoLoginPrompt) {
    throw "No valid Swan token available. Run this launcher once visibly, or refresh .auth\sswan-prod-admin.json."
  }
  Write-Host "Swan login is needed once so official PLAUD sync can upload as you." -ForegroundColor Cyan
  $username = Read-Host "Swan username/email"
  $passwordSecure = Read-Host "Swan password" -AsSecureString
  $password = Convert-SecureStringToPlainText $passwordSecure
  try {
    $body = @{ username = $username; password = $password } | ConvertTo-Json
    $response = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/api/auth/login" -ContentType "application/json" -Body $body -TimeoutSec 30
    if (-not $response.success -or -not $response.token -or $response.forcePasswordChange) {
      throw "Login did not return a usable upload token."
    }
    Save-EncryptedSecret -Secret $response.token -Path $TokenPath
    if ($response.refreshToken) { Save-EncryptedSecret -Secret $response.refreshToken -Path $RefreshTokenPath }
    return $response.token
  } finally { $password = $null }
}

function Get-UsableToken {
  param([string]$RepoRoot, [string]$TokenPath, [string]$RefreshTokenPath)
  $legacyRoot = Join-Path $env:LOCALAPPDATA "SwanStudios\applaud-sync"
  $tokenFiles = @($TokenPath, (Join-Path $legacyRoot "swan-token.txt"))
  foreach ($path in $tokenFiles) {
    $token = Read-EncryptedSecret -Path $path
    if (Test-SwanToken -Token $token) {
      if ($path -ne $TokenPath) { Save-EncryptedSecret -Secret $token -Path $TokenPath }
      return $token
    }
  }
  $refreshFiles = @($RefreshTokenPath, (Join-Path $legacyRoot "swan-refresh-token.txt"))
  foreach ($path in $refreshFiles) {
    $token = Refresh-AndStoreToken -RefreshToken (Read-EncryptedSecret -Path $path) -TokenPath $TokenPath -RefreshTokenPath $RefreshTokenPath
    if (Test-SwanToken -Token $token) { return $token }
  }
  $qaSecrets = Get-QaAuthStateSecrets -RepoRoot $RepoRoot
  if ($qaSecrets -and (Test-SwanToken -Token $qaSecrets.token)) {
    Save-EncryptedSecret -Secret $qaSecrets.token -Path $TokenPath
    if ($qaSecrets.refreshToken) { Save-EncryptedSecret -Secret $qaSecrets.refreshToken -Path $RefreshTokenPath }
    return $qaSecrets.token
  }
  if ($qaSecrets) {
    $token = Refresh-AndStoreToken -RefreshToken $qaSecrets.refreshToken -TokenPath $TokenPath -RefreshTokenPath $RefreshTokenPath
    if (Test-SwanToken -Token $token) { return $token }
  }
  return Request-AndStoreToken -TokenPath $TokenPath -RefreshTokenPath $RefreshTokenPath
}

function Test-PlaudCliAuth {
  $npx = Get-Command npx -ErrorAction Stop
  $result = Invoke-NativeCommand -FilePath $npx.Source -Arguments @("--yes", "@plaud-ai/cli", "me")
  if ($result.ExitCode -ne 0) {
    $output = $result.Output
    $safeOutput = Redact-LauncherText -Value ($output -join ' ')
    Write-LauncherLog "Plaud CLI auth check failed: $safeOutput" "WARN"
    throw "Plaud CLI is not authenticated. Run: npx --yes @plaud-ai/cli login"
  }
}

try {
  $repoRoot = Resolve-SwanRepoRoot
  $localRoot = Join-Path $env:LOCALAPPDATA "SwanStudios\plaud-official-sync"
  $tokenPath = Join-Path $localRoot "swan-token.txt"
  $refreshTokenPath = Join-Path $localRoot "swan-refresh-token.txt"
  $statePath = Join-Path $localRoot "state.json"
  $script:LogPath = Join-Path $localRoot "launcher.log"
  [System.IO.Directory]::CreateDirectory($localRoot) | Out-Null

  $ApiBaseUrl = Normalize-ApiBaseUrl -Value $ApiBaseUrl
  $agentPath = Join-Path $repoRoot "scripts\plaud-official-sync\swan-plaud-official-sync.mjs"
  Write-LauncherLog "Official PLAUD launcher start (headless=$Headless, once=$Once, dryRun=$DryRun)"
  Test-PlaudCliAuth
  $node = Get-Command node -ErrorAction Stop
  if (-not $DryRun) {
    $token = Get-UsableToken -RepoRoot $repoRoot -TokenPath $tokenPath -RefreshTokenPath $refreshTokenPath
    $env:SWAN_AUTH_TOKEN = $token
  }
  $env:SWAN_API_BASE_URL = $ApiBaseUrl
  $env:SWAN_PLAUD_CLI_COMMAND = "npx --yes @plaud-ai/cli"

  if (-not $Headless) {
    Write-Host "Starting official PLAUD sync..." -ForegroundColor Green
    Write-Host "Source: @plaud-ai/cli"
    if ($DryRun) { Write-Host "Dry run: recordings will be discovered only, not downloaded or uploaded." -ForegroundColor Yellow }
    Write-Host "Nothing is deleted from PLAUD or Swan. Press Ctrl+C to stop."
  }

  $args = @($agentPath, "--api-base-url", $ApiBaseUrl, "--state-path", $statePath, "--days", $Days, "--poll-interval-ms", ([int]$PollSeconds * 1000))
  if ($Once) { $args += "--once" }
  if ($DryRun) { $args += "--dry-run" }
  & $node.Source @args
  $nodeExitCode = $LASTEXITCODE
  if ($nodeExitCode -ne 0) { exit $nodeExitCode }
} catch {
  $safeError = Redact-LauncherText -Value $_.Exception.Message
  Write-LauncherLog "Official PLAUD sync could not start: $safeError" "ERROR"
  if (-not $Headless) {
    Write-Host ""
    Write-Host "Official PLAUD sync could not start:" -ForegroundColor Red
    Write-Host $safeError -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close"
  }
  exit 1
}
