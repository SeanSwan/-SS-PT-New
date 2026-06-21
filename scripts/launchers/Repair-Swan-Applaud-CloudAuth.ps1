# SwanStudios Applaud Cloud Auth Repair
# Opens Plaud Web through Applaud's local watcher and completes local setup
# after a fresh Plaud browser token is detected and accepted.

param(
  [int]$Port = 44471,
  [int]$WaitSeconds = 300,
  [string]$RecordingsDir,
  [switch]$DoNotOpenBrowser
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message, [string]$Level = "INFO")
  Write-Host "[Swan Applaud Auth][$Level] $Message"
}

function Get-DefaultRecordingsDir {
  $candidate = Join-Path $env:USERPROFILE "Documents\Plaud Recordings"
  if (Test-Path -LiteralPath $candidate) { return $candidate }
  return (Join-Path $env:USERPROFILE "Documents\APPLAUD")
}

function Invoke-ApplaudJson {
  param(
    [string]$Path,
    [object]$Body = @{}
  )

  $base = "http://127.0.0.1:$Port"
  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method Post -Uri "$base$Path" -ContentType "application/json" -Body $json -TimeoutSec 45
}

function Get-TokenMetadata {
  param([string]$Token)
  if ([string]::IsNullOrWhiteSpace($Token)) { return $null }
  try {
    $jwt = ($Token -replace '^bearer\s+', '').Trim()
    $payload = $jwt.Split('.')[1].Replace('-', '+').Replace('_', '/')
    switch ($payload.Length % 4) {
      2 { $payload += '==' }
      3 { $payload += '=' }
    }
    $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
    return [pscustomobject]@{
      issuedAt = [int64]$json.iat
      issuedAtUtc = ([DateTimeOffset]::FromUnixTimeSeconds([int64]$json.iat).UtcDateTime.ToString('s') + 'Z')
      expiresAtUtc = ([DateTimeOffset]::FromUnixTimeSeconds([int64]$json.exp).UtcDateTime.ToString('s') + 'Z')
      region = $json.region
    }
  } catch {
    return $null
  }
}

function Complete-ApplaudSetup {
  param(
    [string]$Token,
    [string]$Email,
    [string]$TargetDir
  )

  try {
    $acceptBody = if ($Email) { @{ token = $Token; email = $Email } } else { @{ token = $Token } }
    $accept = Invoke-ApplaudJson -Path "/api/auth/accept" -Body $acceptBody
    if (-not $accept.ok) { return $false }

    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
    $configBody = @{
      recordingsDir = $TargetDir
      webhook = $null
      pollIntervalMinutes = 1
      bind = @{ host = "127.0.0.1"; port = $Port }
      importPlaudDeleted = $false
    }
    Invoke-ApplaudJson -Path "/api/config" -Body $configBody | Out-Null
    $complete = Invoke-ApplaudJson -Path "/api/config/complete-setup" -Body @{}
    return [bool]$complete.ok
  } catch {
    Write-Step "Plaud rejected the detected token: $($_.Exception.Message)" "WARN"
    return $false
  }
}

$targetDir = if ($RecordingsDir) { $RecordingsDir } else { Get-DefaultRecordingsDir }
$deadline = (Get-Date).AddSeconds($WaitSeconds)
$attemptedTokens = New-Object 'System.Collections.Generic.HashSet[string]'

Write-Step "Checking current Plaud browser token."
$current = Invoke-ApplaudJson -Path "/api/auth/detect"
if ($current.found -and $current.token) {
  $attemptedTokens.Add([string]$current.token) | Out-Null
  $meta = Get-TokenMetadata -Token $current.token
  if ($meta) {
    Write-Step "Current token metadata: issued $($meta.issuedAtUtc), expires $($meta.expiresAtUtc), region $($meta.region)."
  }
  if (Complete-ApplaudSetup -Token $current.token -Email $current.email -TargetDir $targetDir) {
    Write-Step "Applaud setup repaired with the current browser token."
    exit 0
  }
}

if (-not $DoNotOpenBrowser) {
  Write-Step "Opening Plaud Web and waiting up to $WaitSeconds seconds for a fresh token."
  Invoke-ApplaudJson -Path "/api/auth/watch" | Out-Null
} else {
  Write-Step "Waiting up to $WaitSeconds seconds for a fresh Plaud token without opening a browser."
}

while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 5
  $detected = Invoke-ApplaudJson -Path "/api/auth/detect"
  if (-not $detected.found -or -not $detected.token) { continue }
  if ($attemptedTokens.Contains([string]$detected.token)) { continue }
  $attemptedTokens.Add([string]$detected.token) | Out-Null

  $meta = Get-TokenMetadata -Token $detected.token
  if ($meta) {
    Write-Step "Detected fresh token metadata: issued $($meta.issuedAtUtc), expires $($meta.expiresAtUtc), region $($meta.region)."
  } else {
    Write-Step "Detected fresh token metadata but could not decode it." "WARN"
  }

  if (Complete-ApplaudSetup -Token $detected.token -Email $detected.email -TargetDir $targetDir) {
    Write-Step "Applaud setup repaired and local polling is ready."
    exit 0
  }
}

throw "No fresh Plaud token was accepted before timeout. Sign into Plaud Web in the opened browser, then rerun this repair launcher."
