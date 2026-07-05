param(
  [string]$ReceiptDir,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$InputPaths
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
$estimator = Join-Path $scriptDir 'fable-context-compression-estimate.mjs'
$receiptRoot = if ($ReceiptDir) { $ReceiptDir } else { Join-Path $repoRoot 'docs\ai-workflow\FABLE-HERMES-WORKFLOW-UPGRADE\context-receipts' }

function Normalize-InputPath {
  param([string]$Value)
  $clean = $Value.Trim().Trim('"')
  if ($clean -eq '') {
    return $null
  }
  if ([System.IO.Path]::IsPathRooted($clean)) {
    return $clean
  }
  return (Join-Path $repoRoot $clean)
}

Set-Location $repoRoot

Write-Host ''
Write-Host 'Fable Context Compression Estimator' -ForegroundColor Cyan
Write-Host 'Drag files/folders onto the desktop button, or paste paths when prompted.'
Write-Host 'This only estimates and saves a receipt. It does not call Fable or install a proxy.'
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js was not found on PATH. Open this from the normal SwanStudios dev environment or install Node.js.'
}

if (-not (Test-Path -LiteralPath $estimator)) {
  throw "Estimator script not found: $estimator"
}

$paths = @()
if ($InputPaths -and $InputPaths.Count -gt 0) {
  foreach ($path in $InputPaths) {
    $normalized = Normalize-InputPath $path
    if ($normalized) {
      $paths += $normalized
    }
  }
} else {
  Write-Host 'Paste one or more file/folder paths. Use semicolons to separate multiple paths.'
  Write-Host 'Press Enter with nothing typed to run the default protocol sanity check.'
  $entered = Read-Host 'Paths'
  if ($entered.Trim() -eq '') {
    $paths = @(Join-Path $repoRoot 'docs\ai-workflow\references\FABLE-CONTEXT-COMPRESSION-PROTOCOL.md')
  } else {
    foreach ($path in ($entered -split ';')) {
      $normalized = Normalize-InputPath $path
      if ($normalized) {
        $paths += $normalized
      }
    }
  }
}

$missing = @()
foreach ($path in $paths) {
  if (-not (Test-Path -LiteralPath $path)) {
    $missing += $path
  }
}
if ($missing.Count -gt 0) {
  throw "Missing path(s):`n$($missing -join "`n")"
}

New-Item -ItemType Directory -Force -Path $receiptRoot | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$receiptJson = Join-Path $receiptRoot "$stamp-fable-context-estimate.json"
$receiptText = Join-Path $receiptRoot "$stamp-fable-context-estimate.txt"

$jsonOutput = & node $estimator --json @paths
if ($LASTEXITCODE -ne 0) {
  throw "Estimator JSON run failed with exit code $LASTEXITCODE"
}
[System.IO.File]::WriteAllText($receiptJson, ($jsonOutput -join [Environment]::NewLine) + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

$textOutput = & node $estimator @paths
if ($LASTEXITCODE -ne 0) {
  throw "Estimator summary run failed with exit code $LASTEXITCODE"
}
[System.IO.File]::WriteAllText($receiptText, ($textOutput -join [Environment]::NewLine) + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

Write-Host ''
$textOutput | ForEach-Object { Write-Host $_ }
Write-Host ''
Write-Host "Saved JSON receipt: $receiptJson" -ForegroundColor Green
Write-Host "Saved text receipt: $receiptText" -ForegroundColor Green
Write-Host ''
Write-Host 'Next step: paste the receipt into Codex/Claude/Fable if it says image context is a candidate.'
