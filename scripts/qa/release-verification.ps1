Param(
  [switch]$Fast
)

$ErrorActionPreference = "Continue"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackendDir = Join-Path $RepoRoot "backend"
$FrontendDir = Join-Path $RepoRoot "frontend"
$Failures = New-Object System.Collections.Generic.List[string]

function Redact-Line {
  param([string]$Line)
  $Value = $Line
  $Value = $Value -replace '\b(sk|rk)_(live|test)_[A-Za-z0-9_]+', '$1_$2_<REDACTED>'
  $Value = $Value -replace '\bpk_(live|test)_[A-Za-z0-9_]+', 'pk_$1_<REDACTED>'
  $Value = $Value -replace '\bwhsec_[A-Za-z0-9_]+', 'whsec_<REDACTED>'
  $Value = $Value -replace '\bAIza[0-9A-Za-z_-]+', 'AIza<REDACTED>'
  $Value = $Value -replace '\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b', '<REDACTED-JWT>'
  $Value = $Value -replace '(DATABASE_URL\s*=\s*)\S+', '$1<REDACTED>'
  return $Value
}

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Script,
    [string]$WorkingDirectory
  )

  Write-Host ""
  Write-Host "== $Name =="

  Push-Location $WorkingDirectory
  try {
    $Output = & $Script 2>&1
    $ExitCode = $LASTEXITCODE
    foreach ($Line in $Output) {
      Write-Host (Redact-Line ([string]$Line))
    }
    if ($ExitCode -ne 0) {
      $Failures.Add("$Name exited $ExitCode")
    }
  } finally {
    Pop-Location
  }
}

Write-Host "SwanStudios release verification ($(if ($Fast) { 'fast' } else { 'full' }))"
Write-Host "No files are staged, committed, pushed, archived, or deleted by this script."

Invoke-Step "staging area is empty" { git diff --cached --name-only } $RepoRoot
Invoke-Step "diff whitespace check" { git diff --check } $RepoRoot
Invoke-Step "Render/payment local preflight" { node scripts/qa/render-payment-preflight.mjs } $RepoRoot
Invoke-Step "native secret scan" { node scripts/qa/secret-scan-lite.mjs } $RepoRoot

if (-not $Fast) {
  Invoke-Step "backend test suite" { npm test } $BackendDir
  Invoke-Step "frontend type-check" { npm run type-check } $FrontendDir
  Invoke-Step "frontend production build" { npm run build } $FrontendDir
  Invoke-Step "frontend sharded tests" { npm run test:run } $FrontendDir
}

Write-Host ""
Write-Host "== Release Verification Summary =="
if ($Failures.Count -gt 0) {
  foreach ($Failure in $Failures) {
    Write-Host "FAIL $Failure"
  }
  exit 1
}

Write-Host "PASS all selected automated gates completed successfully"
exit 0
